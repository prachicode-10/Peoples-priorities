"use client";

import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  // Tabs: "signin" | "signup"
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");

  // Form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // OTP flow states
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
  const [otpTimer, setOtpTimer] = useState(60);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [resendCount, setResendCount] = useState(0);

  const [isPending, startTransition] = useTransition();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Count down the OTP timer
  useEffect(() => {
    if (!showOtpScreen || otpTimer <= 0) return;

    const timer = setInterval(() => {
      setOtpTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [showOtpScreen, otpTimer]);

  // Focus helper for OTP inputs
  useEffect(() => {
    if (showOtpScreen && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [showOtpScreen]);

  // Handle standard registration/login request (sending OTP)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!email || !password) {
      setError("Please fill out all fields.");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send-otp",
            email,
            password,
            type: activeTab === "signin" ? "login" : "register",
          }),
        });

        const data = await res.json();

        if (data.success) {
          setShowOtpScreen(true);
          setOtpTimer(60);
          setAttemptsLeft(3);
          setOtpValues(Array(6).fill(""));
          setSuccessMessage(data.message);
        } else {
          setError(data.message || "Something went wrong.");
        }
      } catch (err: any) {
        setError("Failed to send request. Check your connection.");
      }
    });
  };

  // Handle individual OTP input changes (shifting focus)
  const handleOtpChange = (index: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return; // Allow digits only

    const newOtp = [...otpValues];
    newOtp[index] = val;
    setOtpValues(newOtp);

    // Auto-focus next input
    if (val && index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1]?.focus();
    }

    // Attempt submission if full
    const fullOtp = newOtp.join("");
    if (fullOtp.length === 6) {
      triggerOtpVerification(fullOtp);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace: clear and focus previous
    if (e.key === "Backspace" && !otpValues[index] && index > 0 && otpRefs.current[index - 1]) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Trigger OTP check
  const triggerOtpVerification = async (enteredOtp: string) => {
    setError("");
    setSuccessMessage("");

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "verify-otp",
            email,
            otp: enteredOtp,
          }),
        });

        const data = await res.json();

        if (data.success) {
          setSuccessMessage(data.message);
          
          // Save mock auth token
          localStorage.setItem("admin-auth-token", data.token);
          localStorage.setItem("admin-email", data.email);

          // Clear sessions and redirect
          setTimeout(() => {
            router.push(redirectPath);
          }, 1500);
        } else {
          setError(data.message || "Invalid OTP.");
          setAttemptsLeft(data.attemptsLeft ?? 3);
          
          // Clear inputs on wrong OTP
          setOtpValues(Array(6).fill(""));
          otpRefs.current[0]?.focus();

          if (data.attemptsLeft === 0) {
            // Terminate verification screen
            setTimeout(() => {
              setShowOtpScreen(false);
              setError("Session terminated due to max wrong attempts. Please request a new OTP.");
            }, 2000);
          }
        }
      } catch (err) {
        setError("Verification request failed.");
      }
    });
  };

  // Handle OTP resending
  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    if (resendCount >= 3) {
      setError("Max resends reached. Please start over.");
      setShowOtpScreen(false);
      return;
    }

    setError("");
    setSuccessMessage("");

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "resend-otp",
            email,
          }),
        });

        const data = await res.json();

        if (data.success) {
          setOtpTimer(60);
          setAttemptsLeft(3);
          setResendCount(data.resendCount);
          setOtpValues(Array(6).fill(""));
          setSuccessMessage(data.message);
        } else {
          setError(data.message || "Failed to resend OTP.");
          if (data.message.includes("Max resends reached")) {
            setShowOtpScreen(false);
          }
        }
      } catch (err) {
        setError("Resend request failed.");
      }
    });
  };

  return (
    <main className="min-h-screen bg-[#f5f7f4] text-[#17221b] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#dcebdd] blur-3xl opacity-60" />
      <div className="absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-[#e5eee4] blur-3xl opacity-60" />

      <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#dce3dc] shadow-[0_20px_60px_rgba(23,63,42,0.06)] overflow-hidden transition-all duration-300">
        
        {/* Header Branding */}
        <div className="bg-[#173f2a] px-8 py-8 text-center text-white relative">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl font-bold mb-4">
            P
          </div>
          <h2 className="text-xl font-extrabold tracking-[0.2em] uppercase">
            People&apos;s Priorities
          </h2>
          <p className="text-xs text-white/70 font-semibold tracking-wider mt-1">
            Admin Auth Panel
          </p>
        </div>

        {/* Form Body */}
        <div className="px-8 py-8">
          
          {/* Main error or success states */}
          {error && (
            <div className="mb-5 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold transition-all">
              ⚠️ {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-5 p-4 rounded-2xl border border-green-200 bg-green-50 text-green-700 text-sm font-semibold transition-all">
              ✅ {successMessage}
            </div>
          )}

          {!showOtpScreen ? (
            // ==========================================
            // REGISTER / LOGIN FORM SCREEN
            // ==========================================
            <div>
              {/* Tab Toggles */}
              <div className="flex border border-[#dce3dc] rounded-full p-1 mb-8 bg-[#f5f7f4]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("signin");
                    setError("");
                    setSuccessMessage("");
                  }}
                  className={`flex-1 text-xs font-bold py-2.5 rounded-full transition-all duration-200 ${
                    activeTab === "signin"
                      ? "bg-[#173f2a] text-white shadow-sm"
                      : "text-[#536058] hover:text-[#173f2a]"
                  }`}
                >
                  Admin Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("signup");
                    setError("");
                    setSuccessMessage("");
                  }}
                  className={`flex-1 text-xs font-bold py-2.5 rounded-full transition-all duration-200 ${
                    activeTab === "signup"
                      ? "bg-[#173f2a] text-white shadow-sm"
                      : "text-[#536058] hover:text-[#173f2a]"
                  }`}
                >
                  Admin Register
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-[#536058] uppercase tracking-wider mb-2">
                    Official Email ID
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    disabled={isPending}
                    className="w-full px-4 py-3 rounded-xl border border-[#cbd5cc] bg-white text-sm text-[#17221b] outline-none transition focus:border-[#173f2a] focus:ring-1 focus:ring-[#173f2a]/20 disabled:bg-[#f5f7f4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#536058] uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isPending}
                    className="w-full px-4 py-3 rounded-xl border border-[#cbd5cc] bg-white text-sm text-[#17221b] outline-none transition focus:border-[#173f2a] focus:ring-1 focus:ring-[#173f2a]/20 disabled:bg-[#f5f7f4]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-full bg-[#173f2a] py-3.5 text-center text-sm font-bold text-white shadow-md transition hover:bg-[#0f2f1e] active:scale-[0.98] disabled:opacity-55"
                >
                  {isPending
                    ? "Processing..."
                    : activeTab === "signin"
                    ? "Generate 2FA OTP"
                    : "Register Admin Account"}
                </button>
              </form>
            </div>
          ) : (
            // ==========================================
            // OTP VERIFICATION SCREEN
            // ==========================================
            <div className="space-y-8">
              <div className="text-center">
                <h3 className="text-lg font-bold text-[#17221b]">Verify your email</h3>
                <p className="text-xs text-[#66736a] mt-2 leading-relaxed">
                  We sent a 6-digit verification code to <span className="font-semibold text-[#173f2a]">{email}</span>.
                </p>
              </div>

              {/* OTP Code Input Slots */}
              <div className="flex justify-between gap-2 max-w-xs mx-auto">
                {otpValues.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={digit}
                    ref={(el) => {
                      otpRefs.current[idx] = el;
                    }}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    disabled={isPending}
                    className="w-12 h-14 border border-[#cbd5cc] rounded-xl text-center text-xl font-bold text-[#173f2a] bg-white outline-none focus:border-[#173f2a] focus:ring-2 focus:ring-[#173f2a]/10 disabled:bg-[#f5f7f4]"
                  />
                ))}
              </div>

              {/* Information / Status */}
              <div className="space-y-4 text-center text-xs">
                <div className="flex justify-between text-[#66736a] font-semibold border-t border-b border-[#f0f3f0] py-3 px-1">
                  <span>Attempts left: <strong className="text-red-600">{attemptsLeft}</strong></span>
                  <span>Resends used: <strong>{resendCount}/3</strong></span>
                </div>

                <div className="flex flex-col items-center gap-3">
                  {otpTimer > 0 ? (
                    <span className="text-[#397149] font-bold bg-[#e9f4ea] px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#397149] animate-pulse" />
                      OTP expires in {otpTimer}s
                    </span>
                  ) : (
                    <span className="text-red-500 font-bold bg-red-50 px-3.5 py-1.5 rounded-full">
                      ⏳ OTP has expired
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpTimer > 0 || resendCount >= 3 || isPending}
                    className="text-sm font-bold text-[#173f2a] hover:text-[#0f2f1e] underline transition disabled:no-underline disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Resend Verification Code
                  </button>
                </div>
              </div>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => {
                  setShowOtpScreen(false);
                  setError("");
                  setSuccessMessage("");
                }}
                className="w-full text-center text-xs font-bold text-[#536058] hover:text-[#17221b] transition py-2"
              >
                ← Back to Login / Register
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f7f4] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#173f2a] mx-auto animate-pulse"></div>
          <p className="mt-4 text-sm text-[#536058] font-bold">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
