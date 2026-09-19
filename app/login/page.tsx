"use client";

import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";
  const { t } = useLanguage();

  // Tabs: "signin" | "signup"
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");

  // Form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Custom states
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
      setError(t.login.fillAllError);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t.login.validEmailError);
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

  const handleOtpChange = (index: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;

    const newOtp = [...otpValues];
    newOtp[index] = val;
    setOtpValues(newOtp);

    if (val && index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1]?.focus();
    }

    const fullOtp = newOtp.join("");
    if (fullOtp.length === 6) {
      triggerOtpVerification(fullOtp);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0 && otpRefs.current[index - 1]) {
      otpRefs.current[index - 1]?.focus();
    }
  };

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
            setTimeout(() => {
              setActiveTab("signin");
              setShowOtpScreen(false);
              setPassword("");
              setSuccessMessage("Account created! Please sign in with your password.");
            }, 1200);
          } else {
            localStorage.setItem("admin-auth-token", data.token);
            localStorage.setItem("admin-email", email);
            setTimeout(() => {
              router.push(redirectPath);
            }, 800);
          }
        } else {
          setError(data.message || "Invalid OTP code.");
          setAttemptsLeft((prev) => {
            const next = prev - 1;
            if (next <= 0) {
              setShowOtpScreen(false);
              setError("Maximum verification attempts exceeded. Please restart login.");
            }
            return next;
          });
        }
      } catch (err) {
        setError("Verification failed. Check network.");
      }
    });
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0 || resendCount >= 3) return;

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
    <main className="min-h-screen bg-[#f8faf5] text-[#17221b] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Top right language selector */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSwitcher compact />
      </div>

      <div className="relative w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 border border-[#d9e2da] shadow-sm transition-all duration-300">
        {/* Logo and Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#173f2a] text-white text-xl font-extrabold mb-3">
            PP
          </Link>
          <h2 className="text-lg font-black tracking-wider text-[#173f2a]">
            {t.common.siteName}
          </h2>
          <p className="text-xs text-[#556458] font-bold mt-1">
            {t.login.badge}
          </p>
        </div>

        {/* Validation Errors & Success Messages */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold leading-relaxed flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#edf5ee] border border-[#28623c]/20 text-[#28623c] text-xs font-semibold leading-relaxed flex items-start gap-2">
            <span>✅</span>
            <span>{successMessage}</span>
          </div>
        )}

        {!showOtpScreen ? (
          <div>
            {/* Tab Toggle */}
            <div className="flex bg-[#f8faf5] rounded-xl p-1 border border-[#e2e8df] mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signin");
                  setError("");
                  setSuccessMessage("");
                }}
                className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition-all ${
                  activeTab === "signin"
                    ? "bg-white text-[#173f2a] shadow-xs"
                    : "text-[#556458] hover:text-[#173f2a]"
                }`}
              >
                {t.login.tabSignIn}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signup");
                  setError("");
                  setSuccessMessage("");
                }}
                className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition-all ${
                  activeTab === "signup"
                    ? "bg-white text-[#173f2a] shadow-xs"
                    : "text-[#556458] hover:text-[#173f2a]"
                }`}
              >
                {t.login.tabSignUp}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="block text-xs font-bold text-[#173f2a] mb-1.5">
                  {t.login.emailLabel}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.login.emailPlaceholder}
                  required
                  disabled={isPending}
                  className="w-full px-4 py-3 rounded-xl bg-white text-xs sm:text-sm text-[#17221b] placeholder-[#8ea093] border border-[#d5ded6] outline-none focus:border-[#28623c] transition disabled:opacity-60"
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-bold text-[#173f2a] mb-1.5">
                  {t.login.passwordLabel}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.login.passwordPlaceholder}
                    required
                    disabled={isPending}
                    className="w-full pl-4 pr-11 py-3 rounded-xl bg-white text-xs sm:text-sm text-[#17221b] placeholder-[#8ea093] border border-[#d5ded6] outline-none focus:border-[#28623c] transition disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#556458] hover:text-[#173f2a]"
                  >
                    {showPassword ? t.login.hidePassword : t.login.showPassword}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs font-bold text-[#556458] px-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#d5ded6] text-[#173f2a] focus:ring-0"
                  />
                  <span>{t.login.rememberMe}</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl py-3.5 text-white bg-[#173f2a] hover:bg-[#0f2a1c] transition font-bold text-xs sm:text-sm shadow-sm disabled:opacity-60"
              >
                {isPending
                  ? "Processing..."
                  : activeTab === "signin"
                  ? t.login.sendOtpBtn
                  : t.login.createAccountBtn}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-[#556458]">
              <Link href="/" className="hover:text-[#173f2a] underline font-bold">
                ← {t.common.backToHome}
              </Link>
            </div>
          </div>
        ) : (
          /* OTP SCREEN */
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-base font-bold text-[#17221b]">
                {t.login.otpScreenTitle}
              </h3>
              <p className="text-xs text-[#556458] mt-1.5 leading-relaxed">
                {t.login.otpScreenDesc} <span className="font-bold text-[#173f2a]">{email}</span>
              </p>
            </div>

            {/* OTP Inputs */}
            <div className="flex justify-center gap-2">
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
                  className="w-10 h-12 bg-[#f8faf5] rounded-xl text-center text-lg font-bold text-[#173f2a] border border-[#d5ded6] outline-none focus:border-[#28623c] transition disabled:opacity-50"
                />
              ))}
            </div>

            <div className="space-y-3 text-center text-xs">
              <div className="flex justify-between text-[#556458] font-semibold border-y border-[#e2e8df] py-2 px-1">
                <span>Attempts: <strong className="text-red-600">{attemptsLeft}</strong></span>
                <span>Resends: <strong>{resendCount}/3</strong></span>
              </div>

              <div className="flex flex-col items-center gap-2">
                {otpTimer > 0 ? (
                  <span className="text-[#28623c] font-bold bg-[#edf5ee] px-3 py-1 rounded-full text-[11px]">
                    {t.login.otpExpiresIn} {otpTimer}s
                  </span>
                ) : (
                  <span className="text-red-500 font-bold bg-red-50 px-3 py-1 rounded-full text-[11px]">
                    Code expired
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpTimer > 0 || resendCount >= 3 || isPending}
                  className="text-xs font-bold text-[#173f2a] hover:underline disabled:opacity-40 disabled:no-underline"
                >
                  {t.login.resendOtpBtn}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowOtpScreen(false);
                setError("");
                setSuccessMessage("");
              }}
              className="w-full text-center text-xs font-bold text-[#556458] hover:text-[#17221b] transition py-1"
            >
              {t.login.backToLoginBtn}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8faf5] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#173f2a] mx-auto"></div>
            <p className="mt-3 text-xs text-[#556458] font-bold">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
