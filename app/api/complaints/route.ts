import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "phone-complaints.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
  }
}

function readComplaints() {
  ensureFile();

  try {
    const data = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveComplaints(complaints: any[]) {
  ensureFile();

  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(complaints, null, 2),
    "utf8"
  );
}

export async function GET() {
  return NextResponse.json({
    success: true,
    complaints: readComplaints(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.issue) {
      return NextResponse.json(
        {
          success: false,
          error: "Issue is required",
        },
        { status: 400 }
      );
    }

    const complaints = readComplaints();

    const complaint = {
      ...body,
      id:
        body.id ||
        `PP-${Date.now().toString(36).toUpperCase()}`,
      source: "phone",
      status: body.status || "Submitted",
      submittedAt:
        body.submittedAt || new Date().toISOString(),
    };

    complaints.push(complaint);
    saveComplaints(complaints);

    console.log("?? PHONE COMPLAINT SAVED:", complaint);

    return NextResponse.json({
      success: true,
      complaint,
    });
  } catch (error) {
    console.error("? Complaint save error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save complaint",
      },
      { status: 500 }
    );
  }
}
