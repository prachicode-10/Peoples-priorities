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
  
  // Custom states for neumorphic layout
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
          
          if (activeTab === "signup") {
            // Redirect newly registered user back to Sign In tab
            setTimeout(() => {
              setShowOtpScreen(false);
              setActiveTab("signin");
              setPassword(""); // clear password field
              setSuccessMessage("Registration successful! Please login to complete 2-Step Verification.");
            }, 2000);
          } else {
            // Save mock auth token for login
            localStorage.setItem("admin-auth-token", data.token);
            localStorage.setItem("admin-email", data.email);

            // Clear sessions and redirect
            setTimeout(() => {
              router.push(redirectPath);
            }, 1500);
          }
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
      {/* Decorative Neumorphic Background Elements */}
      <div className="absolute top-12 left-12 w-32 h-32 rounded-full bg-[#f5f7f4] shadow-[10px_10px_20px_#d2d7d1,-10px_-10px_20px_#ffffff] opacity-40 pointer-events-none" />
      <div className="absolute bottom-12 right-12 w-48 h-48 rounded-full bg-[#f5f7f4] shadow-[inset_10px_10px_20px_#d2d7d1,inset_-10px_-10px_20px_#ffffff] opacity-40 pointer-events-none" />

      <div className="relative w-full max-w-md bg-[#f5f7f4] rounded-[36px] p-8 sm:p-10 shadow-[16px_16px_32px_#d2d7d1,-16px_-16px_32px_#ffffff] transition-all duration-300">
        
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f5f7f4] shadow-[6px_6px_12px_#d2d7d1,-6px_-6px_12px_#ffffff] text-2xl font-extrabold text-[#173f2a] mb-5 mx-auto">
            P
          </div>
          <h2 className="text-xl font-extrabold tracking-[0.18em] uppercase text-[#173f2a]">
            People&apos;s Priorities
          </h2>
          <p className="text-xs text-[#66736a] font-bold tracking-wider mt-1.5">
            Admin Auth Panel
          </p>
        </div>

        {/* Validation Errors & Success Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-[#fdf2f2] border border-[#fbd5d5] text-[#b81d1d] text-xs font-bold leading-relaxed flex items-start gap-2 shadow-sm animate-fade-in">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-[#f3faf4] border border-[#def7ec] text-[#03543f] text-xs font-bold leading-relaxed flex items-start gap-2 shadow-sm animate-fade-in">
            <span>✅</span>
            <span>{successMessage}</span>
          </div>
        )}

        {!showOtpScreen ? (
          <div>
            {/* Neumorphic Tab Toggle */}
            <div className="flex bg-[#f5f7f4] rounded-full p-2.5 shadow-[inset_4px_4px_8px_#d2d7d1,inset_-4px_-4px_8px_#ffffff] mb-8">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signin");
                  setError("");
                  setSuccessMessage("");
                }}
                className={`flex-1 text-xs font-extrabold py-3 rounded-full transition-all duration-300 ${
                  activeTab === "signin"
                    ? "bg-[#f5f7f4] text-[#173f2a] shadow-[4px_4px_8px_#d2d7d1,-4px_-4px_8px_#ffffff]"
                    : "text-[#66736a] hover:text-[#173f2a]"
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
                className={`flex-1 text-xs font-extrabold py-3 rounded-full transition-all duration-300 ${
                  activeTab === "signup"
                    ? "bg-[#f5f7f4] text-[#173f2a] shadow-[4px_4px_8px_#d2d7d1,-4px_-4px_8px_#ffffff]"
                    : "text-[#66736a] hover:text-[#173f2a]"
                }`}
              >
                Admin Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-xs font-extrabold text-[#536058] uppercase tracking-wider mb-2.5">
                  Official Email ID
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  disabled={isPending}
                  className="w-full px-5 py-3.5 rounded-2xl bg-[#f5f7f4] text-sm text-[#17221b] placeholder-[#8ea093]/70 border-0 outline-none shadow-[inset_4px_4px_8px_#d2d7d1,inset_-4px_-4px_8px_#ffffff] transition-all duration-300 focus:shadow-[inset_6px_6px_10px_#cbd0ca,inset_-6px_-6px_10px_#ffffff] focus:ring-1 focus:ring-[#173f2a]/15 disabled:opacity-60"
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-extrabold text-[#536058] uppercase tracking-wider mb-2.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isPending}
                    className="w-full pl-5 pr-12 py-3.5 rounded-2xl bg-[#f5f7f4] text-sm text-[#17221b] placeholder-[#8ea093]/70 border-0 outline-none shadow-[inset_4px_4px_8px_#d2d7d1,inset_-4px_-4px_8px_#ffffff] transition-all duration-300 focus:shadow-[inset_6px_6px_10px_#cbd0ca,inset_-6px_-6px_10px_#ffffff] focus:ring-1 focus:ring-[#173f2a]/15 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#66736a] hover:text-[#173f2a] transition-colors focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      // Eye Off Icon
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      // Eye Icon
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs font-bold text-[#66736a] px-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`h-5 w-5 rounded-md flex items-center justify-center bg-[#f5f7f4] transition-all duration-200 ${
                    rememberMe 
                      ? "shadow-[inset_2px_2px_4px_#d2d7d1,inset_-2px_-2px_4px_#ffffff] text-[#173f2a]" 
                      : "shadow-[inset_4px_4px_8px_#d2d7d1,inset_-4px_-4px_8px_#ffffff]"
                  }`}>
                    {rememberMe && (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span>Remember me</span>
                </label>

                <a href="#forgot" onClick={(e) => { e.preventDefault(); setError("Password recovery flow is localized to system admins. Please contact site developers."); }} className="hover:text-[#173f2a] transition-colors underline">
                  Forgot password?
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full py-4 text-[#173f2a] bg-[#f5f7f4] shadow-[6px_6px_12px_#d2d7d1,-6px_-6px_12px_#ffffff] transition-all duration-300 hover:shadow-[4px_4px_8px_#d2d7d1,-4px_-4px_8px_#ffffff] active:shadow-[inset_4px_4px_8px_#d2d7d1,inset_-4px_-4px_8px_#ffffff] hover:text-[#1c4d33] disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2 text-sm font-extrabold"
              >
                {isPending ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-[#173f2a]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </>
                ) : activeTab === "signin" ? (
                  "Generate 2FA OTP"
                ) : (
                  "Register Admin Account"
                )}
              </button>
            </form>

            {/* Alternating tab footer links */}
            <div className="mt-8 text-center text-xs font-bold text-[#66736a]">
              {activeTab === "signin" ? (
                <p>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => setActiveTab("signup")}
                    className="text-[#173f2a] hover:text-[#1c4d33] transition-colors underline focus:outline-none"
                  >
                    Create an account
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button
                    onClick={() => setActiveTab("signin")}
                    className="text-[#173f2a] hover:text-[#1c4d33] transition-colors underline focus:outline-none"
                  >
                    Sign in instead
                  </button>
                </p>
              )}
            </div>
          </div>
        ) : (
          // ==========================================
          // OTP VERIFICATION SCREEN
          // ==========================================
          <div className="space-y-8">
            <div className="text-center">
              <h3 className="text-lg font-bold text-[#17221b]">Verify your email</h3>
              <p className="text-xs text-[#66736a] mt-2 leading-relaxed">
                We sent a 6-digit verification code to <span className="font-extrabold text-[#173f2a]">{email}</span>.
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
                  className="w-12 h-14 bg-[#f5f7f4] rounded-2xl text-center text-xl font-extrabold text-[#173f2a] border-0 outline-none shadow-[inset_4px_4px_8px_#d2d7d1,inset_-4px_-4px_8px_#ffffff] transition-all duration-300 focus:shadow-[inset_6px_6px_10px_#cbd0ca,inset_-6px_-6px_10px_#ffffff] disabled:opacity-50"
                />
              ))}
            </div>

            {/* Information / Status */}
            <div className="space-y-4 text-center text-xs">
              <div className="flex justify-between text-[#66736a] font-bold border-t border-b border-[#dce3dc]/50 py-3 px-1">
                <span>Attempts left: <strong className="text-red-600">{attemptsLeft}</strong></span>
                <span>Resends used: <strong>{resendCount}/3</strong></span>
              </div>

              <div className="flex flex-col items-center gap-3">
                {otpTimer > 0 ? (
                  <span className="text-[#397149] font-bold bg-[#e9f4ea] px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-[2px_2px_5px_rgba(0,0,0,0.02)]">
                    <span className="w-2 h-2 rounded-full bg-[#397149] animate-pulse" />
                    OTP expires in {otpTimer}s
                  </span>
                ) : (
                  <span className="text-red-500 font-bold bg-red-50 px-3.5 py-1.5 rounded-full shadow-[2px_2px_5px_rgba(0,0,0,0.02)]">
                    ⏳ OTP has expired
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpTimer > 0 || resendCount >= 3 || isPending}
                  className="text-sm font-extrabold text-[#173f2a] hover:text-[#1c4d33] underline transition disabled:no-underline disabled:opacity-40 disabled:cursor-not-allowed"
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
