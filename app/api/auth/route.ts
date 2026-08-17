import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";
import { otpSessions } from "./store";

const SENDER_EMAIL = "prachisharma5232@gmail.com";
const APP_PASSWORD = "qnzfpocpuugiadxv";
const OTP_TTL_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 3;
const MAX_RESENDS = 3;

// Path to users.json at the project root
const USERS_FILE_PATH = path.join(process.cwd(), "users.json");

// Helper to read users from JSON file
async function readUsersDb(): Promise<Record<string, string>> {
  try {
    const data = await fs.readFile(USERS_FILE_PATH, "utf-8");
    return JSON.parse(data || "{}");
  } catch (error) {
    // If the file doesn't exist, create it with empty object
    await fs.writeFile(USERS_FILE_PATH, JSON.stringify({}), "utf-8");
    return {};
  }
}

// Helper to write users to JSON file
async function writeUsersDb(db: Record<string, string>): Promise<void> {
  await fs.writeFile(USERS_FILE_PATH, JSON.stringify(db, null, 2), "utf-8");
}

// Nodemailer transport setup
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for port 465, false for other ports
  auth: {
    user: SENDER_EMAIL,
    pass: APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // Helps bypass local TLS issues if any
  },
});

// Helper to send OTP email
async function sendOtpEmail(toEmail: string, otp: string): Promise<void> {
  const mailOptions = {
    from: `"People's Priorities Auth" <${SENDER_EMAIL}>`,
    to: toEmail,
    subject: "OTP Verification",
    text: `Your OTP is ${otp}\nIt will expire in 60 seconds.\n`,
  };

  await transporter.sendMail(mailOptions);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, password, type, otp } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ==========================================
    // ACTION: SEND OTP
    // ==========================================
    if (action === "send-otp") {
      if (!type || (type !== "register" && type !== "login")) {
        return NextResponse.json(
          { success: false, message: "Invalid auth type specified." },
          { status: 400 }
        );
      }

      if (!password) {
        return NextResponse.json(
          { success: false, message: "Password is required." },
          { status: 400 }
        );
      }

      const usersDb = await readUsersDb();

      if (type === "register") {
        if (usersDb[normalizedEmail]) {
          return NextResponse.json(
            { success: false, message: "User already exists. Please login instead." },
            { status: 400 }
          );
        }
      } else if (type === "login") {
        if (!usersDb[normalizedEmail]) {
          return NextResponse.json(
            { success: false, message: "Email not found. Please register first." },
            { status: 404 }
          );
        }

        if (usersDb[normalizedEmail] !== password) {
          return NextResponse.json(
            { success: false, message: "Incorrect password." },
            { status: 401 }
          );
        }
      }

      // Generate 6-digit OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`[AUTH DEBUG] Generated OTP for ${normalizedEmail}: ${generatedOtp}`);

      // Create session
      otpSessions.set(normalizedEmail, {
        otp: generatedOtp,
        expiresAt: Date.now() + OTP_TTL_MS,
        attemptsLeft: MAX_VERIFY_ATTEMPTS,
        resendCount: 0,
        action: type,
        password: type === "register" ? password : undefined,
      });

      // Send the email
      try {
        await sendOtpEmail(normalizedEmail, generatedOtp);
      } catch (err: any) {
        console.error("SMTP send error:", err);
        return NextResponse.json(
          { success: false, message: `Failed to send email. Check credentials or network. Error: ${err.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "OTP sent to your email.",
      });
    }

    // ==========================================
    // ACTION: RESEND OTP
    // ==========================================
    if (action === "resend-otp") {
      const session = otpSessions.get(normalizedEmail);

      if (!session) {
        return NextResponse.json(
          { success: false, message: "No active OTP session found. Please request a new OTP." },
          { status: 400 }
        );
      }

      if (session.resendCount >= MAX_RESENDS) {
        otpSessions.delete(normalizedEmail);
        return NextResponse.json(
          { success: false, message: "Max resends reached. Please try registering or logging in again." },
          { status: 400 }
        );
      }

      // Generate new OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`[AUTH DEBUG] Resent OTP for ${normalizedEmail}: ${generatedOtp}`);

      // Update session details
      session.otp = generatedOtp;
      session.expiresAt = Date.now() + OTP_TTL_MS;
      session.attemptsLeft = MAX_VERIFY_ATTEMPTS;
      session.resendCount += 1;
      otpSessions.set(normalizedEmail, session);

      // Send the email
      try {
        await sendOtpEmail(normalizedEmail, generatedOtp);
      } catch (err: any) {
        return NextResponse.json(
          { success: false, message: `Failed to send email. Error: ${err.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "New OTP sent!",
        resendCount: session.resendCount,
      });
    }

    // ==========================================
    // ACTION: VERIFY OTP
    // ==========================================
    if (action === "verify-otp") {
      if (!otp) {
        return NextResponse.json(
          { success: false, message: "OTP is required." },
          { status: 400 }
        );
      }

      const session = otpSessions.get(normalizedEmail);

      if (!session) {
        return NextResponse.json(
          { success: false, message: "No active OTP session found or expired. Please start over." },
          { status: 400 }
        );
      }

      if (Date.now() > session.expiresAt) {
        return NextResponse.json(
          { success: false, message: "OTP expired. Please resend or try again." },
          { status: 400 }
        );
      }

      if (otp.trim() === session.otp) {
        // Success path
        if (session.action === "register" && session.password) {
          const usersDb = await readUsersDb();
          usersDb[normalizedEmail] = session.password;
          await writeUsersDb(usersDb);
        }

        // Remove OTP session
        otpSessions.delete(normalizedEmail);

        // Generate token and user info
        const mockToken = `admin_tok_${Buffer.from(normalizedEmail + ":" + Date.now()).toString("base64")}`;

        return NextResponse.json({
          success: true,
          message: session.action === "register" ? "Registration Successful! You can now login." : "Login Successful!",
          token: mockToken,
          email: normalizedEmail,
        });
      } else {
        // Failed attempt path
        session.attemptsLeft -= 1;

        if (session.attemptsLeft <= 0) {
          otpSessions.delete(normalizedEmail);
          return NextResponse.json(
            { success: false, attemptsLeft: 0, message: "Wrong OTP. Max attempts exceeded. Session terminated." },
            { status: 400 }
          );
        }

        otpSessions.set(normalizedEmail, session);
        return NextResponse.json(
          {
            success: false,
            attemptsLeft: session.attemptsLeft,
            message: `Wrong OTP. Attempts left: ${session.attemptsLeft}`,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, message: "Invalid action." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Auth API Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}
