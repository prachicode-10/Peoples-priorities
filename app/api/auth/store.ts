export interface OTPSession {
  otp: string;
  expiresAt: number;
  attemptsLeft: number;
  resendCount: number;
  action: "register" | "login";
  password?: string; // stored during signup to write to DB once verified
}

// Prevent HMR from wiping the in-memory session store during dev
const globalForAuth = globalThis as unknown as {
  otpSessions: Map<string, OTPSession>;
};

export const otpSessions = globalForAuth.otpSessions ?? new Map<string, OTPSession>();

if (process.env.NODE_ENV !== "production") {
  globalForAuth.otpSessions = otpSessions;
}
