"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import Coverflow from "../components/Coverflow";
import { getCategory } from "@/lib/category";
import { calculatePriority } from "@/lib/priority";
import { developmentImages } from "@/src/data/images";
import { useLanguage } from "@/lib/LanguageContext";
import { CATEGORY_NAMES, SupportedLanguage } from "@/lib/translations";
import { createAudioRecorder, AudioRecorder } from "@/lib/audioRecorder";
import { ODIA_GRIEVANCE_TEMPLATES } from "@/lib/odiaGrievances";

type Submission = {
  id: string;
  createdAt: string;
  name?: string;
  village?: string;
  location?: string;
  pincode?: string;
  state?: string;
  district?: string;
  verifiedArea?: string;
  issue?: string;
  photos?: string[];
  status?: string;
  voiceLanguage?: string;
  writingLanguages?: Record<string, string>;
};

type CategoryName =
  | "Roads"
  | "Water"
  | "Electricity"
  | "Sanitation"
  | "Healthcare"
  | "Education"
  | "Flooding"
  | "Other";

type CategoryInsight = {
  name: CategoryName;
  icon: string;
  count: number;
  percentage: number;
  priority: number;
  level: "Low" | "Medium" | "High" | "Critical";
  evidence: number;
  locations: number;
};

const CATEGORY_ORDER: CategoryName[] = [
  "Roads",
  "Water",
  "Electricity",
  "Sanitation",
  "Healthcare",
  "Education",
  "Flooding",
  "Other",
];

function readSubmissions(): Submission[] {
  try {
    const saved = localStorage.getItem("peoples-priorities-submissions");
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function AnimatedNumber({
  value,
  duration = 700,
}: {
  value: number;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const startValue = displayValue;
    const difference = value - startValue;
    if (difference === 0) return;

    const startTime = performance.now();
    let animationFrame = 0;

    const animate = (currentTime: number) => {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + difference * eased));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  return <>{displayValue.toLocaleString("en-IN")}</>;
}

export default function Home() {
  const { language, setLanguage, t, speechLang, getCategoryName, languages } =
    useLanguage();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pulseKey, setPulseKey] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">(
    "normal"
  );

  // Voice Grievance Assistant State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [translatedTranscript, setTranslatedTranscript] = useState("");
  const [extractedAudioUrl, setExtractedAudioUrl] = useState<string | null>(null);
  const [extractedAudioBlob, setExtractedAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [translationPreference, setTranslationPreference] = useState<"combined" | "original" | "translated">("combined");
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  /*
   * =========================================================
   * LOAD REAL CITIZEN DATA (POLLING)
   * =========================================================
   */
  useEffect(() => {
    const load = () => {
      const next = readSubmissions();
      setSubmissions((previous) => {
        if (previous.length !== next.length) {
          setPulseKey((value) => value + 1);
        }
        return next;
      });
    };

    load();
    const interval = window.setInterval(load, 1000);
    const handleStorage = () => load();
    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  /*
   * =========================================================
   * LIVE CATEGORY INTELLIGENCE
   * =========================================================
   */
  const categoryInsights = useMemo<CategoryInsight[]>(() => {
    const total = submissions.length;

    return CATEGORY_ORDER.map((categoryName) => {
      const categorySubmissions = submissions.filter((submission) => {
        const category = getCategory(submission.issue || "");
        return category.name === categoryName;
      });

      const count = categorySubmissions.length;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      const uniqueLocations = new Set<string>();

      categorySubmissions.forEach((submission) => {
        const location =
          submission.village?.trim() ||
          submission.location?.trim() ||
          submission.pincode?.trim() ||
          submission.district?.trim();

        if (location) {
          uniqueLocations.add(location.toLowerCase());
        }
      });

      const reportsWithEvidence = categorySubmissions.filter(
        (submission) =>
          Array.isArray(submission.photos) && submission.photos.length > 0
      ).length;

      const evidence =
        count > 0 ? Math.round((reportsWithEvidence / count) * 100) : 0;
      const priority = calculatePriority(categorySubmissions, total);

      return {
        name: categoryName,
        icon: getCategory(categorySubmissions[0]?.issue || categoryName).icon,
        count,
        percentage,
        priority: priority.score,
        level: priority.level,
        evidence,
        locations: uniqueLocations.size,
      };
    }).filter((category) => category.count > 0);
  }, [submissions]);

  /*
   * =========================================================
   * REAL METRICS
   * =========================================================
   */
  const uniqueHotspots = useMemo(() => {
    const locations = new Set<string>();
    submissions.forEach((submission) => {
      const location =
        submission.village?.trim() ||
        submission.location?.trim() ||
        submission.pincode?.trim() ||
        submission.district?.trim();

      if (location) {
        locations.add(location.toLowerCase());
      }
    });
    return locations.size;
  }, [submissions]);

  const criticalPriorities = useMemo(() => {
    return categoryInsights.filter((category) => category.level === "Critical")
      .length;
  }, [categoryInsights]);

  const evidenceReports = useMemo(() => {
    return submissions.filter(
      (submission) =>
        Array.isArray(submission.photos) && submission.photos.length > 0
    ).length;
  }, [submissions]);

  const topPriority = categoryInsights[0] || null;

  const evidencePercentage =
    submissions.length > 0
      ? Math.round((evidenceReports / submissions.length) * 100)
      : 0;

  /*
   * =========================================================
   * LANGUAGE INTELLIGENCE
   * =========================================================
   */
  const languageInsights = useMemo(() => {
    const counts: Record<string, number> = {};

    submissions.forEach((submission) => {
      const lang =
        submission.voiceLanguage ||
        submission.writingLanguages?.issue ||
        "en-IN";
      counts[lang] = (counts[lang] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([lang, count]) => {
        const langObj = languages.find(
          (l) => l.speechLang === lang || l.code === lang
        );
        return {
          languageCode: lang,
          label: langObj ? langObj.nativeName : lang,
          count,
          percentage:
            submissions.length > 0
              ? Math.round((count / submissions.length) * 100)
              : 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [submissions, languages]);

  /*
   * =========================================================
   * LIVE PIPELINE STEPS
   * =========================================================
   */
  const pipelineSteps = [
    {
      step: "01",
      icon: "🗣️",
      title: t.pipeline.step1Title,
      text: t.pipeline.step1Desc,
    },
    {
      step: "02",
      icon: "🧩",
      title: t.pipeline.step2Title,
      text: t.pipeline.step2Desc,
    },
    {
      step: "03",
      icon: "📍",
      title: t.pipeline.step3Title,
      text: t.pipeline.step3Desc,
    },
    {
      step: "04",
      icon: "📷",
      title: t.pipeline.step4Title,
      text: t.pipeline.step4Desc,
    },
    {
      step: "05",
      icon: "📊",
      title: t.pipeline.step5Title,
      text: t.pipeline.step5Desc,
    },
  ];

  /*
   * =========================================================
   * HOW IT WORKS
   * =========================================================
   */
  const howItWorks = [
    {
      number: "01",
      icon: "🗣️",
      title: {
        en: t.howItWorks.step1Title,
        [language]: t.howItWorks.step1Title,
      },
      text: {
        en: t.howItWorks.step1Desc,
        [language]: t.howItWorks.step1Desc,
      },
    },
    {
      number: "02",
      icon: "🧩",
      title: {
        en: t.howItWorks.step2Title,
        [language]: t.howItWorks.step2Title,
      },
      text: {
        en: t.howItWorks.step2Desc,
        [language]: t.howItWorks.step2Desc,
      },
    },
    {
      number: "03",
      icon: "📍",
      title: {
        en: t.howItWorks.step3Title,
        [language]: t.howItWorks.step3Title,
      },
      text: {
        en: t.howItWorks.step3Desc,
        [language]: t.howItWorks.step3Desc,
      },
    },
    {
      number: "04",
      icon: "📷",
      title: {
        en: t.howItWorks.step4Title,
        [language]: t.howItWorks.step4Title,
      },
      text: {
        en: t.howItWorks.step4Desc,
        [language]: t.howItWorks.step4Desc,
      },
    },
    {
      number: "05",
      icon: "📊",
      title: {
        en: t.howItWorks.step5Title,
        [language]: t.howItWorks.step5Title,
      },
      text: {
        en: t.howItWorks.step5Desc,
        [language]: t.howItWorks.step5Desc,
      },
    },
    {
      number: "06",
      icon: "🎯",
      title: {
        en: t.howItWorks.step6Title,
        [language]: t.howItWorks.step6Title,
      },
      text: {
        en: t.howItWorks.step6Desc,
        [language]: t.howItWorks.step6Desc,
      },
    },
  ];

  /*
   * =========================================================
   * VOICE COMPLAINT RECORDING & TRANSLATION ENGINE
   * =========================================================
   */
  const startVoiceRecording = async () => {
    setVoiceError("");
    setVoiceTranscript("");
    setTranslatedTranscript("");
    if (extractedAudioUrl) {
      URL.revokeObjectURL(extractedAudioUrl);
      setExtractedAudioUrl(null);
    }
    setExtractedAudioBlob(null);
    setRecordingDuration(0);

    try {
      const recorder = createAudioRecorder();
      audioRecorderRef.current = recorder;

      await recorder.start({
        language: speechLang,
        onVolumeChange: (vol) => setAudioVolume(vol),
        onInterimTranscript: (text) => setVoiceTranscript(text),
        onError: (err) => setVoiceError(err),
      });

      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 120) {
            // Auto stop at 2 minutes
            stopVoiceRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setIsRecording(false);
      setVoiceError(err.message || "Failed to access microphone. Please grant permission.");
    }
  };

  const stopVoiceRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const recorder = audioRecorderRef.current;
    if (!recorder) {
      setIsRecording(false);
      return;
    }

    try {
      setIsRecording(false);
      setIsTranscribing(true);

      const result = await recorder.stop();
      setExtractedAudioUrl(result.audioUrl);
      setExtractedAudioBlob(result.blob);

      // Call /api/transcribe with extracted audio & captured text
      const formData = new FormData();
      formData.append("audio", result.blob, "voice-recording.webm");
      formData.append("language", speechLang);
      formData.append("interimText", result.transcript || voiceTranscript);
      formData.append("targetLanguage", "en");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const orig = data.originalText || result.transcript || voiceTranscript;
          const trans = data.translatedText || "";
          if (orig) {
            setVoiceTranscript(orig);
          }
          if (trans) {
            setTranslatedTranscript(trans);
          }
        }
      }
    } catch (err: any) {
      console.error("Transcription error:", err);
      setVoiceError("Audio extracted successfully, but translation service timed out.");
    } finally {
      setIsTranscribing(false);
      setAudioVolume(0);
    }
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  const handleContinueVoiceSubmission = () => {
    let textToPass = "";
    if (translationPreference === "combined" && voiceTranscript && translatedTranscript && voiceTranscript.toLowerCase() !== translatedTranscript.toLowerCase()) {
      textToPass = `[Original]: ${voiceTranscript}\n[English Translation]: ${translatedTranscript}`;
    } else if (translationPreference === "translated" && translatedTranscript) {
      textToPass = translatedTranscript;
    } else {
      textToPass = voiceTranscript || translatedTranscript;
    }

    if (textToPass) {
      try {
        sessionStorage.setItem("peoples-priorities-voice-draft", textToPass);
      } catch {}
    }

    if (extractedAudioBlob) {
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            sessionStorage.setItem("peoples-priorities-voice-audio", reader.result as string);
          } catch {}
          window.location.href = "/citizen";
        };
        reader.readAsDataURL(extractedAudioBlob);
        return;
      } catch {}
    }

    window.location.href = "/citizen";
  };

  const fontSizeClass =
    fontSize === "large"
      ? "text-[105%]"
      : fontSize === "xlarge"
      ? "text-[112%]"
      : "text-[100%]";

  return (
    <div
      className={`min-h-screen bg-[#f8faf5] text-[#17221b] selection:bg-[#28623c] selection:text-white ${fontSizeClass}`}
    >
      {/* =====================================================
          1. TOP UTILITY BAR (INDIAN GOVT ACCESSIBILITY HEADER)
      ====================================================== */}
      <div className="bg-[#f0f5ee] border-b border-[#e2eae2] text-[#48564c] text-xs py-1.5 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2">
          {/* Left: Accessibility & Civic ID */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline font-semibold text-[#173f2a] tracking-wide">
              {t.common.govtInterface}
            </span>
            <span className="hidden sm:inline text-[#c4d2c4]">•</span>
            <span className="text-[11px] text-[#5c6c60]">
              {t.common.civicPortal}
            </span>
          </div>

          {/* Right: Text Size Controls */}
          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            {/* Screen Reader Skip */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:inline-block focus:bg-white focus:text-[#173f2a] focus:px-2 focus:py-1 focus:rounded text-xs font-bold"
            >
              {t.common.skipToContent}
            </a>

            {/* Font Size Adjuster (A- | A | A+) */}
            <div className="flex items-center border border-[#cfdacd] rounded bg-white px-1.5 py-0.5 gap-1 shadow-2xs">
              <span className="text-[10px] text-[#6d7f72] mr-0.5 font-semibold">
                {t.common.font}:
              </span>
              <button
                type="button"
                onClick={() => setFontSize("normal")}
                title="Default Font Size"
                className={`px-1 rounded text-[10px] font-bold ${
                  fontSize === "normal"
                    ? "bg-[#173f2a] text-white"
                    : "text-[#4d5e52] hover:bg-[#eaf1ea]"
                }`}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSize("large")}
                title="Large Font Size"
                className={`px-1 rounded text-[11px] font-bold ${
                  fontSize === "large"
                    ? "bg-[#173f2a] text-white"
                    : "text-[#4d5e52] hover:bg-[#eaf1ea]"
                }`}
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => setFontSize("xlarge")}
                title="Extra Large Font Size"
                className={`px-1 rounded text-[12px] font-bold ${
                  fontSize === "xlarge"
                    ? "bg-[#173f2a] text-white"
                    : "text-[#4d5e52] hover:bg-[#eaf1ea]"
                }`}
              >
                A++
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          2. MAIN GOVERNMENT NAVIGATION HEADER
      ====================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#dce3dc] shadow-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Official Emblem & Branding */}
          <a href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#173f2a] text-white font-bold text-lg shadow-sm border border-[#0d2619] group-hover:bg-[#20573a] transition-colors">
              P
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-wider text-[#173f2a]">
                  {t.common.siteName}
                </span>
                <span className="hidden lg:inline text-[9px] font-bold uppercase tracking-wider bg-[#e5eee5] text-[#245436] px-2 py-0.5 rounded border border-[#cbdbcc]">
                  Civic Portal
                </span>
              </div>
              <p className="text-[11px] font-medium tracking-wide text-[#59695d]">
                {t.common.portalSubtag}
              </p>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-[#415146]">
            <a
              href="#hero"
              className="transition hover:text-[#173f2a] py-1 border-b-2 border-transparent hover:border-[#173f2a]"
            >
              {t.common.home}
            </a>
            <a
              href="#citizen-services"
              className="transition hover:text-[#173f2a] py-1 border-b-2 border-transparent hover:border-[#173f2a]"
            >
              {t.common.citizenServices}
            </a>
            <a
              href="#how-it-works"
              className="transition hover:text-[#173f2a] py-1 border-b-2 border-transparent hover:border-[#173f2a]"
            >
              {t.common.howItWorks}
            </a>
            <a
              href="#priorities"
              className="transition hover:text-[#173f2a] py-1 border-b-2 border-transparent hover:border-[#173f2a]"
            >
              {t.common.priorities}
            </a>
            <a
              href="#decision-pipeline"
              className="transition hover:text-[#173f2a] py-1 border-b-2 border-transparent hover:border-[#173f2a]"
            >
              {t.common.pipeline}
            </a>
            <a
              href="/track"
              className="transition hover:text-[#173f2a] py-1 border-b-2 border-transparent hover:border-[#173f2a]"
            >
              {t.common.trackComplaint}
            </a>
            <a
              href="#about"
              className="transition hover:text-[#173f2a] py-1 border-b-2 border-transparent hover:border-[#173f2a]"
            >
              {t.common.about}
            </a>
          </nav>

          {/* Right Action Group */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Government Multilingual Dropdown */}
            <LanguageSwitcher />

            {/* Officer / Admin Login Button */}
            <a
              href="/login?redirect=/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[#cfdacf] bg-[#f8faf7] px-3.5 py-1.5 text-xs font-bold text-[#233f2d] hover:bg-[#ebf2ea] hover:border-[#b4c8b6] transition-all shadow-2xs"
            >
              <svg
                className="w-3.5 h-3.5 text-[#3b6b49]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span>{t.common.officerLogin}</span>
            </a>

            {/* Primary Citizen Action Button */}
            <a
              href="/citizen"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#173f2a] hover:bg-[#205639] active:bg-[#123121] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all focus:ring-2 focus:ring-[#28623c]/40"
            >
              <span>{t.common.shareNeed}</span>
              <span className="text-sm">→</span>
            </a>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden rounded-lg p-2 text-[#2d3e33] hover:bg-[#edf3ed] border border-[#d6ded6]"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#dce3dc] bg-[#f8faf6] px-4 py-4 space-y-2 text-sm font-semibold">
            <a
              href="#hero"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-[#173f2a] hover:bg-[#e7eee7]"
            >
              {t.common.home}
            </a>
            <a
              href="#citizen-services"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-[#173f2a] hover:bg-[#e7eee7]"
            >
              {t.common.citizenServices}
            </a>
            <a
              href="/citizen"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-[#173f2a] hover:bg-[#e7eee7]"
            >
              {t.common.shareNeed}
            </a>
            <a
              href="/track"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-[#173f2a] hover:bg-[#e7eee7]"
            >
              {t.common.trackComplaint}
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-[#173f2a] hover:bg-[#e7eee7]"
            >
              {t.common.howItWorks}
            </a>
            <a
              href="#priorities"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-[#173f2a] hover:bg-[#e7eee7]"
            >
              {t.common.priorities}
            </a>
            <a
              href="#decision-pipeline"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-[#173f2a] hover:bg-[#e7eee7]"
            >
              {t.common.pipeline}
            </a>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-[#173f2a] hover:bg-[#e7eee7]"
            >
              {t.common.about}
            </a>
            <div className="pt-2 border-t border-[#d8e2d8]">
              <a
                href="/login?redirect=/dashboard"
                className="w-full text-center block rounded-lg border border-[#cfdacd] bg-white py-2 text-xs font-bold text-[#173f2a]"
              >
                {t.common.officerLogin}
              </a>
            </div>
          </div>
        )}
      </header>

      <main id="main-content">
        {/* =====================================================
            3. HERO SECTION (GOVERNMENT PORTAL LAYOUT)
        ====================================================== */}
        <section
          id="hero"
          className="relative overflow-hidden bg-[#f8faf5] border-b border-[#dce3dc]"
        >
          {/* Background Image: India Gate with prominent visibility */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.48] pointer-events-none"
            style={{ backgroundImage: "url('/india-gate-hero.jpg')" }}
          />
          {/* Subtle gradient wash to preserve text legibility while displaying vibrant colors */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#f8faf5]/65 via-[#f8faf5]/15 to-[#f8faf5]/65 pointer-events-none" />

          {/* Subtle light green background ambient fills */}
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#e3efe4]/50 blur-3xl pointer-events-none" />
          <div className="absolute -left-32 top-48 h-72 w-72 rounded-full bg-[#ebf3ea]/50 blur-3xl pointer-events-none" />

          <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:px-8 py-12 lg:py-16 lg:grid-cols-[1.15fr_0.85fr]">
            {/* Left Column: Official Messaging & CTAs */}
            <div className="flex flex-col justify-center">
              {/* Government Initiative Badge */}
              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[#cbdacb] bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#2c5339] shadow-2xs">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#397149]" />
                {t.hero.badge}
              </div>

              {/* Main Heading */}
              <h1 className="max-w-3xl text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight text-[#17221b]">
                {t.hero.title1}{" "}
                <span className="text-[#28623c] underline decoration-[#a8caa8]/60 decoration-4 underline-offset-4">
                  {t.hero.title2}
                </span>
              </h1>

              {/* Description */}
              <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-[#516155]">
                {t.hero.description}
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a
                  href="/citizen"
                  className="rounded-lg bg-[#173f2a] hover:bg-[#205639] active:bg-[#123121] px-6 py-3.5 text-center text-sm font-bold text-white shadow-sm transition-all focus:ring-2 focus:ring-[#28623c]/40"
                >
                  {t.hero.tellCommunity}
                </a>

                <a
                  href="#citizen-services"
                  className="rounded-lg border border-[#cfdacd] bg-white hover:bg-[#f1f6f1] px-6 py-3.5 text-center text-sm font-bold text-[#20402b] shadow-2xs transition-all"
                >
                  {t.hero.exploreServices}
                </a>
              </div>

              {/* Multi-modal inputs line */}
              <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-[#5a6c60] font-medium border-t border-[#e2eae2] pt-4">
                <div className="flex -space-x-1.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white bg-[#e0ece0] text-xs shadow-2xs">
                    🇮🇳
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white bg-[#ece8dd] text-xs shadow-2xs">
                    🎤
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white bg-[#dfe7ee] text-xs shadow-2xs">
                    📍
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white bg-[#e3ecdf] text-xs shadow-2xs">
                    📸
                  </div>
                </div>

                <span>{t.hero.citizenInputs}</span>
              </div>
            </div>

            {/* Right Column: Official Development Pulse Card */}
            <div className="flex items-center">
              <div
                key={pulseKey}
                className="w-full rounded-2xl bg-white border border-[#d6e2d6] p-6 sm:p-7 shadow-sm transition-all duration-300"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-[#e9efe9] pb-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#697a6d]">
                      {t.hero.intelligence}
                    </p>
                    <h2 className="mt-0.5 text-lg sm:text-xl font-bold text-[#17221b]">
                      {t.hero.developmentPulse}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-full bg-[#eaf4eb] border border-[#cfe2d1] px-3 py-1 text-xs font-bold text-[#2d633b]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#2d633b]" />
                    {t.common.live}
                  </div>
                </div>

                {/* 4 Stats Tiles */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {/* Submissions */}
                  <div className="rounded-xl border border-[#e2ece2] bg-[#f8faf8] p-3.5 hover:border-[#b8cfb9] transition-colors">
                    <p className="text-2xl font-extrabold text-[#173f2a]">
                      <AnimatedNumber value={submissions.length} />
                    </p>
                    <p className="mt-0.5 text-xs text-[#5e6f62] font-medium">
                      {t.hero.submissions}
                    </p>
                  </div>

                  {/* Hotspots */}
                  <div className="rounded-xl border border-[#e2ece2] bg-[#f8faf8] p-3.5 hover:border-[#b8cfb9] transition-colors">
                    <p className="text-2xl font-extrabold text-[#173f2a]">
                      <AnimatedNumber value={uniqueHotspots} />
                    </p>
                    <p className="mt-0.5 text-xs text-[#5e6f62] font-medium">
                      {t.hero.hotspots}
                    </p>
                  </div>

                  {/* Critical */}
                  <div className="rounded-xl border border-[#e2ece2] bg-[#f8faf8] p-3.5 hover:border-[#b8cfb9] transition-colors">
                    <p className="text-2xl font-extrabold text-[#96382e]">
                      <AnimatedNumber value={criticalPriorities} />
                    </p>
                    <p className="mt-0.5 text-xs text-[#5e6f62] font-medium">
                      {t.hero.critical}
                    </p>
                  </div>

                  {/* Evidence Reports */}
                  <div className="rounded-xl border border-[#e2ece2] bg-[#f8faf8] p-3.5 hover:border-[#b8cfb9] transition-colors">
                    <p className="text-2xl font-extrabold text-[#173f2a]">
                      <AnimatedNumber value={evidenceReports} />
                    </p>
                    <p className="mt-0.5 text-xs text-[#5e6f62] font-medium">
                      {t.hero.evidenceReports}
                    </p>
                  </div>
                </div>

                {/* Highest Need Indicator */}
                <div className="mt-5 rounded-xl border border-[#dce8dc] bg-[#f4f8f4] p-4">
                  {topPriority ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-semibold text-[#66776b]">
                            {t.hero.highestNeed}
                          </p>
                          <p className="mt-0.5 flex items-center gap-2 font-bold text-[#17221b]">
                            <span className="text-lg">{topPriority.icon}</span>
                            <span>{getCategoryName(topPriority.name)}</span>
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-extrabold text-[#28623c]">
                            {topPriority.priority}
                          </p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#697a6d]">
                            {t.hero.priority}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#d8e4d8]">
                        <div
                          className="h-full rounded-full bg-[#2d633b] transition-all duration-1000"
                          style={{
                            width: `${Math.max(topPriority.priority, 4)}%`,
                          }}
                        />
                      </div>

                      <div className="mt-2.5 flex justify-between text-[11px] text-[#697a6d] font-medium">
                        <span>
                          {topPriority.count} {t.hero.requests}
                        </span>
                        <span>
                          {topPriority.locations} {t.hero.hotspots}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-2xl">📊</p>
                      <p className="mt-1 text-xs font-bold text-[#173f2a]">
                        {t.hero.noDataYet}
                      </p>
                    </div>
                  )}
                </div>

                {/* Evidence Ranking Guarantee Banner (Light Theme) */}
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#eaf4eb] border border-[#d2e4d4] p-3.5 text-[#173f2a]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#173f2a] text-white font-bold text-sm shadow-2xs">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">
                      {t.hero.rankingEvidence}
                    </p>
                    <p className="text-[11px] text-[#4f6b55] leading-snug mt-0.5">
                      {t.hero.demandFormula}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            4. QUICK ACCESS / CITIZEN SERVICES (ODISHA ONE STYLE)
        ====================================================== */}
        <section
          id="citizen-services"
          className="bg-white py-16 px-4 sm:px-6 lg:px-8 border-b border-[#dce3dc]"
        >
          <div className="mx-auto max-w-7xl">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e9efe9] pb-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2d633b]">
                  {t.services.badge}
                </span>
                <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#17221b]">
                  {t.services.heading}
                </h2>
                <p className="mt-1 text-sm text-[#5a6c60]">
                  {t.services.description}
                </p>
              </div>

              <div className="text-xs text-[#526356] font-medium bg-[#f2f7f2] border border-[#d5e2d5] px-3.5 py-1.5 rounded-lg">
                {t.services.verifiedPinNotice}
              </div>
            </div>

            {/* 4 Government Citizen Service Cards */}
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Tile 1: Submit Complaint */}
              <div className="flex flex-col justify-between rounded-xl border border-[#dce5dc] bg-[#fcfdfc] p-6 hover:border-[#28623c] hover:shadow-md transition-all group">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf5ed] text-2xl border border-[#cfe0cf] text-[#173f2a] group-hover:bg-[#173f2a] group-hover:text-white transition-colors">
                    📝
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-[#17221b] group-hover:text-[#173f2a]">
                    {t.services.card1Title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5b6e60]">
                    {t.services.card1Desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#edf2ed]">
                  <a
                    href="/citizen"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#205639] group-hover:text-[#173f2a] group-hover:underline"
                  >
                    <span>{t.services.card1Cta}</span>
                  </a>
                </div>
              </div>

              {/* Tile 2: Track Complaint */}
              <div className="flex flex-col justify-between rounded-xl border border-[#dce5dc] bg-[#fcfdfc] p-6 hover:border-[#28623c] hover:shadow-md transition-all group">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf5ed] text-2xl border border-[#cfe0cf] text-[#173f2a] group-hover:bg-[#173f2a] group-hover:text-white transition-colors">
                    🔍
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-[#17221b] group-hover:text-[#173f2a]">
                    {t.services.card2Title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5b6e60]">
                    {t.services.card2Desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#edf2ed]">
                  <a
                    href="/track"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#205639] group-hover:text-[#173f2a] group-hover:underline"
                  >
                    <span>{t.services.card2Cta}</span>
                  </a>
                </div>
              </div>

              {/* Tile 3: Voice Complaint */}
              <div className="flex flex-col justify-between rounded-xl border border-[#dce5dc] bg-[#fcfdfc] p-6 hover:border-[#28623c] hover:shadow-md transition-all group">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf5ed] text-2xl border border-[#cfe0cf] text-[#173f2a] group-hover:bg-[#173f2a] group-hover:text-white transition-colors">
                    🎙️
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-[#17221b] group-hover:text-[#173f2a]">
                    {t.services.card3Title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5b6e60]">
                    {t.services.card3Desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#edf2ed]">
                  <a
                    href="#voice-assistant"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#205639] group-hover:text-[#173f2a] group-hover:underline"
                  >
                    <span>{t.services.card3Cta}</span>
                  </a>
                </div>
              </div>

              {/* Tile 4: Public Dashboard */}
              <div className="flex flex-col justify-between rounded-xl border border-[#dce5dc] bg-[#fcfdfc] p-6 hover:border-[#28623c] hover:shadow-md transition-all group">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf5ed] text-2xl border border-[#cfe0cf] text-[#173f2a] group-hover:bg-[#173f2a] group-hover:text-white transition-colors">
                    📊
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-[#17221b] group-hover:text-[#173f2a]">
                    {t.services.card4Title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5b6e60]">
                    {t.services.card4Desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#edf2ed]">
                  <a
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#205639] group-hover:text-[#173f2a] group-hover:underline"
                  >
                    <span>{t.services.card4Cta}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            5. INTERACTIVE VOICE GRIEVANCE REDRESSAL WIDGET
        ====================================================== */}
        <section
          id="voice-assistant"
          className="bg-[#f2f7f2] py-14 px-4 sm:px-6 lg:px-8 border-b border-[#dce3dc]"
        >
          <div className="mx-auto max-w-7xl">
            <div className="rounded-2xl bg-white border border-[#cfdfcf] p-6 sm:p-8 shadow-sm">
              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
                {/* Voice Information */}
                <div>
                  <div className="inline-flex items-center gap-2 rounded-md bg-[#eaf3ea] border border-[#d0e2d1] px-2.5 py-1 text-[11px] font-bold uppercase text-[#235332] tracking-wider">
                    <span>🎙️</span> {t.voice.badge}
                  </div>
                  <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#17221b]">
                    {t.voice.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-[#526357]">
                    {t.voice.description}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2 text-xs">
                    <span className="bg-[#f5f8f5] border border-[#dbe6dc] text-[#334638] px-3 py-1.5 rounded-lg font-medium">
                      ✓ Instant Voice Support
                    </span>
                    <span className="bg-[#f5f8f5] border border-[#dbe6dc] text-[#334638] px-3 py-1.5 rounded-lg font-medium">
                      ✓ 12 Indian Languages
                    </span>
                    <span className="bg-[#f5f8f5] border border-[#dbe6dc] text-[#334638] px-3 py-1.5 rounded-lg font-medium">
                      ✓ Zero Typing Needed
                    </span>
                  </div>
                </div>

                {/* Interactive Voice Recorder Box */}
                <div className="rounded-xl border border-[#d7e5d7] bg-[#f8faf8] p-5 sm:p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-[#e5ede5] pb-3">
                      <span className="text-xs font-bold text-[#173f2a]">
                        {t.voice.langPrompt}
                      </span>
                      <LanguageSwitcher compact />
                    </div>

                    {/* Microphone Toggle Area */}
                    <div className="mt-5 flex flex-col items-center justify-center gap-3">
                      <div className="flex items-center gap-4">
                        {isRecording && (
                          <div className="flex items-center gap-1 h-8">
                            {[0.4, 0.8, 1.0, 0.7, 0.9, 0.5].map((factor, i) => (
                              <span
                                key={i}
                                className="w-1.5 bg-[#ba3427] rounded-full transition-all duration-75"
                                style={{
                                  height: `${Math.max(6, Math.min(32, audioVolume * factor * 0.8))}px`,
                                }}
                              />
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={toggleVoiceRecording}
                          disabled={isTranscribing}
                          className={`relative flex items-center justify-center h-16 w-16 rounded-full text-2xl transition-all shadow-md focus:outline-none focus:ring-4 focus:ring-[#28623c]/30 ${
                            isRecording
                              ? "bg-[#ba3427] text-white animate-pulse"
                              : isTranscribing
                              ? "bg-[#6c7d71] text-white cursor-wait"
                              : "bg-[#173f2a] text-white hover:bg-[#20583b]"
                          }`}
                          aria-label={
                            isRecording ? "Stop recording" : "Start speaking"
                          }
                        >
                          {isTranscribing ? "⏳" : isRecording ? "⏹" : "🎤"}
                        </button>

                        {isRecording && (
                          <div className="flex items-center gap-1.5 rounded-full bg-[#faeae8] border border-[#f3c5c2] px-3 py-1 text-xs font-bold text-[#b42318]">
                            <span className="h-2 w-2 rounded-full bg-[#b42318] animate-ping" />
                            <span>
                              {Math.floor(recordingDuration / 60)
                                .toString()
                                .padStart(2, "0")}
                              :{(recordingDuration % 60).toString().padStart(2, "0")}
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="text-center text-xs font-semibold text-[#485b4d]">
                        {isTranscribing
                          ? t.voice.extractingAudio
                          : isRecording
                          ? t.voice.recordingPrompt
                          : extractedAudioUrl
                          ? t.voice.listenRecording
                          : t.voice.startPrompt}
                      </p>
                    </div>

                    {voiceError && (
                      <p className="mt-2 text-center text-xs text-[#a33227] font-medium bg-[#fbeae8] p-2 rounded-lg border border-[#f5c6cb]">
                        {voiceError}
                      </p>
                    )}

                    {/* Extracted Audio Player Preview */}
                    {extractedAudioUrl && (
                      <div className="mt-4 rounded-xl border border-[#cfe0d1] bg-[#edf5ee] p-3">
                        <div className="flex items-center justify-between text-xs font-bold text-[#173f2a] mb-2">
                          <span className="flex items-center gap-1.5">
                            <span>🔊</span> {t.voice.audioExtractedTitle}
                          </span>
                          {extractedAudioBlob && (
                            <span className="text-[11px] font-semibold text-[#37523f]">
                              {Math.round(extractedAudioBlob.size / 1024)} KB
                            </span>
                          )}
                        </div>
                        <audio controls src={extractedAudioUrl} className="w-full h-8" />
                      </div>
                    )}

                    {/* ODIA CIVIC ISSUE QUICK SELECTOR */}
                    {(speechLang === "or-IN" || language === "or") && (
                      <div className="mt-4 rounded-xl border border-[#cfe0d1] bg-[#f8faf5] p-3">
                        <p className="text-[11px] font-bold text-[#173f2a] flex items-center gap-1.5 mb-2">
                          <span>✨</span> ଓଡ଼ିଆ ସମସ୍ୟା ଶୀଘ୍ର ଚୟନ (Quick Odia Issue Selection):
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {ODIA_GRIEVANCE_TEMPLATES.map((tpl) => (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => {
                                setVoiceTranscript(tpl.odiaText);
                                setTranslatedTranscript(tpl.englishTranslation);
                              }}
                              className="flex flex-col items-start p-2 rounded-lg border border-[#cbd8cd] bg-white hover:border-[#28623c] hover:bg-[#edf5ee] transition text-left group"
                            >
                              <span className="text-sm">{tpl.icon}</span>
                              <span className="mt-1 text-[11px] font-bold text-[#173f2a] group-hover:text-[#28623c] leading-tight">
                                {tpl.label}
                              </span>
                              <span className="text-[9px] text-[#556458] truncate w-full">
                                {tpl.sublabel}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Transcribed & Translated Text Display */}
                    {(voiceTranscript || translatedTranscript) ? (
                      <div className="mt-3 space-y-2">
                        {voiceTranscript && (
                          <div className="rounded-lg border border-[#d6e2d6] bg-white p-3 text-xs">
                            <span className="font-bold text-[#28623c] block text-[10px] uppercase tracking-wider">
                              Spoken Transcript ({speechLang})
                            </span>
                            <p className="mt-1 text-[#173f2a] leading-relaxed">
                              {voiceTranscript}
                            </p>
                          </div>
                        )}

                        {translatedTranscript &&
                          translatedTranscript.toLowerCase() !==
                            voiceTranscript.toLowerCase() && (
                            <div className="rounded-lg border border-[#c5d8f0] bg-[#f0f6ff] p-3 text-xs">
                              <span className="font-bold text-[#1e40af] block text-[10px] uppercase tracking-wider">
                                ✓ English Translation (Administrative Priority)
                              </span>
                              <p className="mt-1 text-[#1e3a8a] leading-relaxed">
                                {translatedTranscript}
                              </p>
                            </div>
                          )}

                        {voiceTranscript &&
                          translatedTranscript &&
                          voiceTranscript.toLowerCase() !==
                            translatedTranscript.toLowerCase() && (
                            <div className="flex items-center gap-1.5 pt-1">
                              <span className="text-[10px] font-bold text-[#556458]">
                                Select draft:
                              </span>
                              <button
                                type="button"
                                onClick={() => setTranslationPreference("combined")}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                  translationPreference === "combined"
                                    ? "bg-[#173f2a] text-white"
                                    : "bg-[#edf5ee] text-[#28623c]"
                                }`}
                              >
                                {t.voice.useBothBtn}
                              </button>
                              <button
                                type="button"
                                onClick={() => setTranslationPreference("original")}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                  translationPreference === "original"
                                    ? "bg-[#173f2a] text-white"
                                    : "bg-[#edf5ee] text-[#28623c]"
                                }`}
                              >
                                {t.voice.useOriginalBtn}
                              </button>
                              <button
                                type="button"
                                onClick={() => setTranslationPreference("translated")}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                  translationPreference === "translated"
                                    ? "bg-[#173f2a] text-white"
                                    : "bg-[#edf5ee] text-[#28623c]"
                                }`}
                              >
                                {t.voice.useTranslatedBtn}
                              </button>
                            </div>
                          )}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-lg border border-[#d6e2d6] bg-white p-3 min-h-[60px] flex items-center justify-center text-center">
                        <p className="text-xs text-[#6e7d71] italic">
                          {isRecording
                            ? t.voice.listeningPrompt
                            : t.voice.transcriptPlaceholder}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Submission Action */}
                  <div className="mt-4 pt-3 border-t border-[#e2eae2] flex flex-col sm:flex-row gap-2 justify-end">
                    <button
                      type="button"
                      onClick={handleContinueVoiceSubmission}
                      className="w-full sm:w-auto rounded-lg bg-[#173f2a] hover:bg-[#205639] px-4 py-2 text-xs font-bold text-white transition-all text-center shadow-2xs"
                    >
                      {t.voice.continueBtn}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            6. LIVE INTELLIGENCE (ANALYTICS & CHARTS)
        ====================================================== */}
        <section
          id="live-intelligence"
          className="border-b border-[#dce3dc] bg-[#f8faf5] py-16 px-4 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end border-b border-[#e0eae0] pb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2c613a]">
                  {t.intelligence.badge}
                </p>
                <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#17221b]">
                  {t.intelligence.heading}
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#5a6b5e]">
                  {t.intelligence.description}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-white border border-[#cfdacd] px-3.5 py-1.5 text-xs font-bold text-[#173f2a] shadow-2xs">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#2d633b]" />
                {submissions.length} {t.hero.submissions}
              </div>
            </div>

            {submissions.length === 0 ? (
              <div className="mt-10 rounded-2xl border-2 border-dashed border-[#cfdacd] bg-white p-12 text-center">
                <div className="text-5xl">📊</div>
                <h3 className="mt-4 text-xl font-bold text-[#173f2a]">
                  {t.hero.noDataYet}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm leading-relaxed text-[#5b6e60]">
                  {t.intelligence.emptyNotice}
                </p>
                <a
                  href="/citizen"
                  className="mt-5 inline-flex rounded-lg bg-[#173f2a] hover:bg-[#205639] px-5 py-2.5 text-xs font-bold text-white shadow-2xs transition-all"
                >
                  {t.hero.tellCommunity}
                </a>
              </div>
            ) : (
              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                {/* 1. ISSUE DISTRIBUTION */}
                <div className="rounded-xl border border-[#dce5dc] bg-white p-6 shadow-xs">
                  <div className="flex items-start justify-between border-b border-[#edf3ed] pb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2c613a]">
                        {t.intelligence.issueDistribution}
                      </p>
                      <p className="mt-1 text-xs text-[#5f7063]">
                        {t.intelligence.issueDistDesc}
                      </p>
                    </div>
                    <div className="text-xl">📊</div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {categoryInsights.map((category, index) => (
                      <div key={category.name} className="group">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#edf5ed] text-sm">
                              {category.icon}
                            </span>
                            <span className="font-bold text-[#173f2a]">
                              {getCategoryName(category.name)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#6e7e72]">
                              {category.count}
                            </span>
                            <span className="font-bold text-[#2d633b]">
                              {category.percentage}%
                            </span>
                          </div>
                        </div>

                        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#e3eae3]">
                          <div
                            className="h-full rounded-full bg-[#2d633b] transition-all duration-1000 ease-out"
                            style={{
                              width: `${Math.max(category.percentage, 3)}%`,
                              transitionDelay: `${index * 60}ms`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. PRIORITY RANKING */}
                <div className="rounded-xl border border-[#dce5dc] bg-white p-6 shadow-xs">
                  <div className="flex items-start justify-between border-b border-[#edf3ed] pb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2c613a]">
                        {t.intelligence.priorityRanking}
                      </p>
                      <p className="mt-1 text-xs text-[#5f7063]">
                        {t.intelligence.priorityRankingDesc}
                      </p>
                    </div>
                    <div className="text-xl">🎯</div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {categoryInsights.slice(0, 5).map((category, index) => (
                      <div
                        key={category.name}
                        className="rounded-lg border border-[#e0eae0] bg-[#fbfdfb] p-3.5 hover:border-[#b8ceb9] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eaf4eb] text-xs font-extrabold text-[#173f2a]">
                            #{index + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 truncate">
                                <span>{category.icon}</span>
                                <span className="truncate text-xs sm:text-sm font-bold text-[#173f2a]">
                                  {getCategoryName(category.name)}
                                </span>
                              </div>

                              <span className="text-sm font-extrabold text-[#28623c]">
                                {category.priority}
                              </span>
                            </div>

                            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#e3eae3]">
                              <div
                                className="h-full rounded-full bg-[#2d633b] transition-all duration-1000"
                                style={{
                                  width: `${Math.max(category.priority, 3)}%`,
                                }}
                              />
                            </div>

                            <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#6a7b6e]">
                              <span>
                                {category.count} {t.hero.requests}
                              </span>
                              <span className="font-semibold text-[#30573a]">
                                {category.level} {t.intelligence.severityLevel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. EVIDENCE COVERAGE */}
                <div className="rounded-xl border border-[#dce5dc] bg-white p-6 shadow-xs">
                  <div className="flex items-start justify-between border-b border-[#edf3ed] pb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2c613a]">
                        {t.intelligence.evidenceCoverage}
                      </p>
                      <p className="mt-1 text-xs text-[#5f7063]">
                        {t.intelligence.evidenceCoverageDesc}
                      </p>
                    </div>
                    <div className="text-xl">📷</div>
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row items-center gap-6">
                    <div
                      className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full shadow-inner"
                      style={{
                        background: `conic-gradient(#2d633b ${evidencePercentage}%, #e2ece2 ${evidencePercentage}% 100%)`,
                      }}
                    >
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xs">
                        <div className="text-center">
                          <p className="text-2xl font-extrabold text-[#173f2a]">
                            {evidencePercentage}%
                          </p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#697a6e]">
                            {t.common.evidence}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-center sm:text-left">
                      <p className="text-2xl font-extrabold text-[#173f2a]">
                        <AnimatedNumber value={evidenceReports} />
                      </p>
                      <p className="text-xs text-[#526557] font-semibold">
                        {t.intelligence.withPhotoEvidence}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-[#758679]">
                        {submissions.length - evidenceReports}{" "}
                        {t.intelligence.noPhotoReport}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. LANGUAGE INSIGHTS */}
                <div className="rounded-xl border border-[#dce5dc] bg-white p-6 shadow-xs">
                  <div className="flex items-start justify-between border-b border-[#edf3ed] pb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2c613a]">
                        {t.intelligence.languageInsights}
                      </p>
                      <p className="mt-1 text-xs text-[#5f7063]">
                        {t.intelligence.languageInsightsDesc}
                      </p>
                    </div>
                    <div className="text-xl">🌐</div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {languageInsights.map((item) => (
                      <div key={item.languageCode}>
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="font-bold text-[#173f2a]">
                            {item.label}
                          </span>
                          <span className="font-bold text-[#2d633b]">
                            {item.count} · {item.percentage}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#e3eae3]">
                          <div
                            className="h-full rounded-full bg-[#2d633b] transition-all duration-1000"
                            style={{
                              width: `${Math.max(item.percentage, 3)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =====================================================
            7. LIVE DECISION PIPELINE (5-STAGE WORKFLOW)
        ====================================================== */}
        <section
          id="decision-pipeline"
          className="bg-white py-16 px-4 sm:px-6 lg:px-8 border-b border-[#dce3dc]"
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl border-b border-[#e8efe8] pb-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2c613a]">
                {t.pipeline.badge}
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#17221b]">
                {t.pipeline.heading}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#5a6b5e]">
                {t.pipeline.description}
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {pipelineSteps.map((step) => (
                <div
                  key={step.title}
                  className="rounded-xl border border-[#dce5dc] bg-[#fbfdfb] p-5 shadow-2xs hover:border-[#28623c] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-[#3a6e49] bg-[#eaf4eb] px-2 py-0.5 rounded border border-[#cfe2d2]">
                        STAGE {step.step}
                      </span>
                      <span className="text-2xl">{step.icon}</span>
                    </div>

                    <p className="mt-4 text-sm font-bold text-[#173f2a]">
                      {step.title}
                    </p>
                    <p className="mt-1 text-xs text-[#5d6e61] leading-relaxed">
                      {step.text}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#edf3ed] flex items-center gap-1.5 text-[10px] font-bold text-[#2d633b]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2d633b] animate-pulse" />
                    <span>{t.common.activeSignal}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            8. HOW IT WORKS (6 LAYERS OF CIVIC INTELLIGENCE)
        ====================================================== */}
        <section
          id="how-it-works"
          className="border-b border-[#dce3dc] bg-[#f0f6f1] py-16 px-4 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2c613a]">
                {t.howItWorks.badge}
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#17221b]">
                {t.howItWorks.heading}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#56685a]">
                {t.howItWorks.description}
              </p>
            </div>

            {/* 6 Process Steps Grid */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {howItWorks.map((item) => (
                <div
                  key={item.number}
                  className="rounded-xl border border-[#d2e0d3] bg-white p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-[#edf3ed] pb-3">
                      <span className="text-xs font-extrabold text-[#28623c] bg-[#eaf4eb] px-2.5 py-0.5 rounded-full">
                        {item.number}
                      </span>
                      <span className="text-2xl">{item.icon}</span>
                    </div>

                    <h3 className="mt-3 text-base font-bold text-[#17221b]">
                      {item.title[language] || item.title.en}
                    </h3>
                    <p className="mt-1.5 text-xs text-[#596b5d] leading-relaxed">
                      {item.text[language] || item.text.en}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Interactive Coverflow */}
            <div className="mt-10 rounded-2xl border border-[#d2dfd3] bg-white/70 backdrop-blur-xs p-4 sm:p-6 shadow-xs">
              <div className="text-center mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#43644d]">
                  {t.howItWorks.explorerTitle}
                </span>
              </div>
              <Coverflow items={howItWorks} language={language} />
            </div>
          </div>
        </section>

        {/* =====================================================
            9. SECTION 2 — DEVELOPMENT PRIORITIES (3-CARD GRID)
        ====================================================== */}
        <section className="bg-white py-16 px-4 sm:px-6 lg:px-8 border-b border-[#dce3dc]">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl mb-10 border-b border-[#e9efe9] pb-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2c613a]">
                {t.developmentPriorities.badge}
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#17221b]">
                {t.developmentPriorities.heading}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#5a6c60]">
                {t.developmentPriorities.description}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Card 1: Roads */}
              <div className="flex flex-col overflow-hidden rounded-xl border border-[#dce5dc] bg-[#fcfdfc] shadow-xs hover:border-[#28623c] transition-all group">
                <div className="relative h-48 w-full overflow-hidden bg-[#eaf0ea]">
                  <img
                    src={developmentImages.roadsCategory}
                    alt="Road construction"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#2d633b] bg-[#eaf4eb] px-2 py-0.5 rounded border border-[#d2e2d3]">
                      {t.developmentPriorities.roadsTag}
                    </span>
                    <h3 className="mt-2 text-lg font-bold text-[#17221b]">
                      {t.developmentPriorities.roadsTitle}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#5a6c60]">
                      {t.developmentPriorities.roadsDesc}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[#edf2ed] pt-3 text-xs">
                    <span className="text-[#6d7e71] font-medium">
                      1,284 {t.developmentPriorities.citizenRequestsCount}
                    </span>
                    <a
                      href="#priorities"
                      className="font-bold text-[#173f2a] group-hover:underline flex items-center gap-1"
                    >
                      <span>{t.developmentPriorities.viewPriority}</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Card 2: Healthcare */}
              <div className="flex flex-col overflow-hidden rounded-xl border border-[#dce5dc] bg-[#fcfdfc] shadow-xs hover:border-[#28623c] transition-all group">
                <div className="relative h-48 w-full overflow-hidden bg-[#eaf0ea]">
                  <img
                    src={developmentImages.healthcareCategory}
                    alt="Healthcare clinic"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#2d633b] bg-[#eaf4eb] px-2 py-0.5 rounded border border-[#d2e2d3]">
                      {t.developmentPriorities.healthTag}
                    </span>
                    <h3 className="mt-2 text-lg font-bold text-[#17221b]">
                      {t.developmentPriorities.healthTitle}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#5a6c60]">
                      {t.developmentPriorities.healthDesc}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[#edf2ed] pt-3 text-xs">
                    <span className="text-[#6d7e71] font-medium">
                      842 {t.developmentPriorities.citizenRequestsCount}
                    </span>
                    <a
                      href="#priorities"
                      className="font-bold text-[#173f2a] group-hover:underline flex items-center gap-1"
                    >
                      <span>{t.developmentPriorities.viewPriority}</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Card 3: Education */}
              <div className="flex flex-col overflow-hidden rounded-xl border border-[#dce5dc] bg-[#fcfdfc] shadow-xs hover:border-[#28623c] transition-all group">
                <div className="relative h-48 w-full overflow-hidden bg-[#eaf0ea]">
                  <img
                    src={developmentImages.educationCategory}
                    alt="Education and school"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#2d633b] bg-[#eaf4eb] px-2 py-0.5 rounded border border-[#d2e2d3]">
                      {t.developmentPriorities.eduTag}
                    </span>
                    <h3 className="mt-2 text-lg font-bold text-[#17221b]">
                      {t.developmentPriorities.eduTitle}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#5a6c60]">
                      {t.developmentPriorities.eduDesc}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[#edf2ed] pt-3 text-xs">
                    <span className="text-[#6d7e71] font-medium">
                      915 {t.developmentPriorities.citizenRequestsCount}
                    </span>
                    <a
                      href="#priorities"
                      className="font-bold text-[#173f2a] group-hover:underline flex items-center gap-1"
                    >
                      <span>{t.developmentPriorities.viewPriority}</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            10. REAL PRIORITIES (TOP 3 CALCULATED)
        ====================================================== */}
        <section
          id="priorities"
          className="bg-[#f8faf5] py-16 px-4 sm:px-6 lg:px-8 border-b border-[#dce3dc]"
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end border-b border-[#e2eae2] pb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2c613a]">
                  {t.intelligence.priorityRanking}
                </p>
                <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#17221b]">
                  {t.intelligence.heading}
                </h2>
              </div>

              <a
                href="/dashboard"
                className="text-xs sm:text-sm font-bold text-[#205639] hover:underline flex items-center gap-1"
              >
                {t.realPriorities.openFull}
              </a>
            </div>

            {categoryInsights.length === 0 ? (
              <div className="mt-8 rounded-xl border border-dashed border-[#cbd8cd] bg-white p-10 text-center">
                <div className="text-4xl">🎯</div>
                <p className="mt-2 text-sm font-bold text-[#173f2a]">
                  {t.hero.noDataYet}
                </p>
              </div>
            ) : (
              <div className="mt-8 grid gap-5 lg:grid-cols-3">
                {categoryInsights.slice(0, 3).map((item, index) => (
                  <div
                    key={item.name}
                    className="rounded-xl border border-[#dce5dc] bg-white p-5 shadow-xs hover:border-[#28623c] transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#edf5ed] text-lg">
                        {item.icon}
                      </div>

                      <span className="text-[11px] font-extrabold text-[#758679]">
                        #{String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-[#17221b]">
                          {getCategoryName(item.name)}
                        </h3>
                        <p className="mt-1 text-xs text-[#6e7e72]">
                          {item.count} {t.hero.requests}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-2xl font-extrabold text-[#28623c]">
                          {item.priority}
                        </span>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[#798a7d]">
                          {t.hero.priority}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e5eee5]">
                      <div
                        className="h-full rounded-full bg-[#2d633b] transition-all duration-1000"
                        style={{
                          width: `${Math.max(item.priority, 3)}%`,
                        }}
                      />
                    </div>

                    <div className="mt-3 flex justify-between text-[11px] text-[#6a7c6f]">
                      <span>
                        {item.percentage} {t.realPriorities.reportsRatio}
                      </span>
                      <span>
                        {item.locations} {t.realPriorities.locationsCount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* =====================================================
            11. DATA INTEGRITY & CITIZEN CHARTER
        ====================================================== */}
        <section className="bg-white py-14 px-4 sm:px-6 lg:px-8 border-b border-[#dce3dc]">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-2xl border border-[#cfdfcf] bg-[#f8faf8] p-6 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#173f2a] text-xl text-white shadow-2xs">
                  🛡️
                </div>

                <div className="flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2c613a]">
                    {t.dataIntegrity.badge}
                  </p>

                  <h2 className="mt-1 text-xl sm:text-2xl font-bold text-[#173f2a]">
                    {t.dataIntegrity.heading}
                  </h2>

                  <p className="mt-2 max-w-3xl text-xs sm:text-sm leading-relaxed text-[#56685a]">
                    {t.dataIntegrity.description}
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-[#dce6dc] bg-white p-4">
                      <p className="text-xs font-bold text-[#2d633b]">
                        {t.dataIntegrity.locVerifiedTitle}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#5c6e60]">
                        {t.dataIntegrity.locVerifiedDesc}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#dce6dc] bg-white p-4">
                      <p className="text-xs font-bold text-[#2d633b]">
                        {t.dataIntegrity.evidenceFirstTitle}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#5c6e60]">
                        {t.dataIntegrity.evidenceFirstDesc}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#dce6dc] bg-white p-4">
                      <p className="text-xs font-bold text-[#2d633b]">
                        {t.dataIntegrity.noBudgetTitle}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#5c6e60]">
                        {t.dataIntegrity.noBudgetDataDesc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            12. OUR DIFFERENCE / ABOUT
        ====================================================== */}
        <section
          id="about"
          className="bg-[#f2f7f2] py-16 px-4 sm:px-6 lg:px-8 border-b border-[#dce3dc]"
        >
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2c613a]">
                {t.about.badge}
              </p>

              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#17221b]">
                {t.about.heading}
              </h2>

              <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-[#526356]">
                {t.about.description}
              </p>

              <div className="mt-6 flex items-center gap-3 text-xs text-[#3b5442] font-semibold">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#173f2a] text-white text-xs">
                  ✓
                </span>
                <span>{t.about.guarantee}</span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#d6e2d6] bg-white p-5 shadow-xs">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf5ed] text-lg text-[#173f2a]">
                  📍
                </div>
                <h3 className="mt-3 text-sm font-bold text-[#17221b]">
                  {t.about.realityCheckTitle}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#5b6d5f]">
                  {t.about.realityCheckDesc}
                </p>
              </div>

              <div className="rounded-xl border border-[#d6e2d6] bg-white p-5 shadow-xs">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf5ed] text-lg text-[#173f2a]">
                  🧠
                </div>
                <h3 className="mt-3 text-sm font-bold text-[#17221b]">
                  {t.about.explainableTitle}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#5b6d5f]">
                  {t.about.explainableDesc}
                </p>
              </div>

              <div className="rounded-xl border border-[#d6e2d6] bg-white p-5 shadow-xs">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf5ed] text-lg text-[#173f2a]">
                  📷
                </div>
                <h3 className="mt-3 text-sm font-bold text-[#17221b]">
                  {t.dataIntegrity.evidenceFirstTitle}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#5b6d5f]">
                  {t.dataIntegrity.evidenceFirstDesc}
                </p>
              </div>

              <div className="rounded-xl border border-[#d6e2d6] bg-white p-5 shadow-xs">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf5ed] text-lg text-[#173f2a]">
                  🇮🇳
                </div>
                <h3 className="mt-3 text-sm font-bold text-[#17221b]">
                  {t.dataIntegrity.locVerifiedTitle}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#5b6d5f]">
                  {t.dataIntegrity.locVerifiedDesc}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            13. FINAL CITIZEN CALL TO ACTION BANNER
        ====================================================== */}
        <section className="bg-[#ddebd8] py-12 px-4 sm:px-6 lg:px-8 border-b border-[#c8dbc8]">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#245233] bg-white/70 px-2.5 py-0.5 rounded border border-[#bfd8bf]">
                {t.cta.badge}
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#173f2a]">
                {t.cta.heading}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#3b5943]">
                {t.cta.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              <a
                href="/citizen"
                className="rounded-lg bg-[#173f2a] hover:bg-[#21563a] px-5 py-3 text-xs font-bold text-white shadow-sm transition-all"
              >
                {t.cta.submitBtn}
              </a>
              <a
                href="/track"
                className="rounded-lg border border-[#afc9b1] bg-white hover:bg-[#f3f7f3] px-5 py-3 text-xs font-bold text-[#204a2f] shadow-2xs transition-all"
              >
                {t.cta.trackBtn}
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================
          14. CLEAN LIGHT GOVERNMENT-STYLE FOOTER
      ====================================================== */}
      <footer className="bg-[#f8faf5] border-t border-[#dce3dc] text-[#334237]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {/* Col 1 & 2: Branding & Mission */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#173f2a] text-white font-bold text-base shadow-2xs">
                  P
                </div>
                <div>
                  <span className="text-sm font-extrabold tracking-wider text-[#173f2a]">
                    {t.common.siteName}
                  </span>
                  <p className="text-[10px] text-[#55675a]">
                    {t.common.portalTagline}
                  </p>
                </div>
              </div>

              <p className="mt-3 max-w-sm text-xs leading-relaxed text-[#5a6b5e]">
                {t.footer.mission}
              </p>

              <div className="mt-4 flex items-center gap-2 text-xs text-[#43644d]">
                <span className="font-bold">{t.footer.pinVerificationLabel}</span>
                <span className="bg-[#eaf3ea] px-2 py-0.5 rounded border border-[#cfdfd0] text-[11px]">
                  {t.footer.pinStatus}
                </span>
              </div>
            </div>

            {/* Col 3: Citizen Services */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#173f2a]">
                {t.footer.citizenServicesTitle}
              </p>
              <ul className="mt-3 space-y-2 text-xs text-[#526356]">
                <li>
                  <a
                    href="/citizen"
                    className="hover:text-[#173f2a] hover:underline"
                  >
                    {t.footer.submitNeedLink}
                  </a>
                </li>
                <li>
                  <a
                    href="/track"
                    className="hover:text-[#173f2a] hover:underline"
                  >
                    {t.footer.trackComplaintLink}
                  </a>
                </li>
                <li>
                  <a
                    href="#voice-assistant"
                    className="hover:text-[#173f2a] hover:underline"
                  >
                    {t.footer.voiceRedressalLink}
                  </a>
                </li>
                <li>
                  <a
                    href="/dashboard"
                    className="hover:text-[#173f2a] hover:underline"
                  >
                    {t.footer.constituencyDashboardLink}
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Process & Architecture */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#173f2a]">
                {t.footer.methodologyTitle}
              </p>
              <ul className="mt-3 space-y-2 text-xs text-[#526356]">
                <li>
                  <a
                    href="#how-it-works"
                    className="hover:text-[#173f2a] hover:underline"
                  >
                    {t.footer.sixLayersLink}
                  </a>
                </li>
                <li>
                  <a
                    href="#decision-pipeline"
                    className="hover:text-[#173f2a] hover:underline"
                  >
                    {t.footer.pipelineLink}
                  </a>
                </li>
                <li>
                  <a
                    href="#priorities"
                    className="hover:text-[#173f2a] hover:underline"
                  >
                    {t.footer.priorityScoringLink}
                  </a>
                </li>
                <li>
                  <a
                    href="#about"
                    className="hover:text-[#173f2a] hover:underline"
                  >
                    {t.footer.realityCheckLink}
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 5: Administration & Support */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#173f2a]">
                {t.footer.helpTitle}
              </p>
              <ul className="mt-3 space-y-2 text-xs text-[#526356]">
                <li>
                  <a
                    href="/login?redirect=/dashboard"
                    className="hover:text-[#173f2a] hover:underline font-semibold"
                  >
                    {t.footer.adminPortalLink}
                  </a>
                </li>
                <li>
                  <span className="text-[#657969]">
                    {t.footer.helplineLabel}
                  </span>
                </li>
                <li>
                  <span className="text-[#657969]">
                    {t.footer.accessibilityLabel}
                  </span>
                </li>
                <li>
                  <span className="text-[#657969]">
                    {t.footer.multilingualLabel}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar: Copyright & Government Portal Disclaimer */}
          <div className="mt-10 pt-6 border-t border-[#e2eae2] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#6d7e71]">
            <p>{t.footer.copyright}</p>

            <div className="flex items-center gap-4">
              <span>{t.footer.lightPortalNote}</span>
              <span>•</span>
              <span>{t.footer.accessibilityCompliant}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}