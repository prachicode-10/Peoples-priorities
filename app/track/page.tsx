"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { analyzeIssueContext, CATEGORY_ICONS } from "@/lib/issueClassifier";

type Submission = {
  id: string;
  createdAt: string;
  name: string;
  village: string;
  location: string;
  pincode?: string;
  state?: string;
  district?: string;
  verifiedArea?: string;
  issue: string;
  photos?: string[];
  status?: string;
  language?: string;
  voiceLanguage?: string;
  voiceAudioUrl?: string;
  voiceTranslatedText?: string;
  writingLanguages?: {
    name: string;
    village: string;
    location: string;
    issue: string;
  };
};

type CategoryInfo = {
  name: string;
  icon: string;
};

const STORAGE_KEY = "peoples-priorities-submissions";

/* CATEGORY DETECTION */
function getCategory(issue: string): CategoryInfo {
  const analysis = analyzeIssueContext(issue);
  return {
    name: analysis.primaryCategory,
    icon: CATEGORY_ICONS[analysis.primaryCategory] || "📌",
  };
}

function getStatusStep(status?: string) {
  if (!status) return 0;
  const normalized = status.trim().toLowerCase();

  if (normalized === "resolved" || normalized === "completed" || normalized.includes("resolved")) {
    return 3;
  }
  if (normalized === "verified" || normalized.includes("verified")) {
    return 2;
  }
  if (normalized === "under review" || normalized.includes("review") || normalized.includes("progress")) {
    return 1;
  }
  return 0;
}

function getStatusColor(status?: string) {
  switch (status) {
    case "Verified":
      return "bg-green-100 text-green-700";
    case "Resolved":
      return "bg-blue-100 text-blue-700";
    case "Under Review":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-[#edf5ee] text-[#28623c]";
  }
}

function formatDate(date?: string) {
  if (!date) return "Unknown date";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function calculateLocalPriority(submission: Submission, allSubmissions: Submission[]) {
  let score = 25;
  const category = getCategory(submission.issue || "");

  const sameCategoryCount = allSubmissions.filter(
    (item) => getCategory(item.issue || "").name === category.name
  ).length;

  if (allSubmissions.length > 0) {
    const frequencyRatio = sameCategoryCount / allSubmissions.length;
    score += Math.round(frequencyRatio * 30);
  }

  if (submission.photos && submission.photos.length > 0) {
    score += 15;
  }

  const issue = (submission.issue || "").toLowerCase();
  const seriousWords = [
    "emergency", "danger", "dangerous", "death", "accident", "hospital",
    "ambulance", "flood", "fire", "unsafe", "critical", "आपात", "खतरा",
    "दुर्घटना", "अस्पताल", "बाढ़", "ଜରୁରୀ", "ବିପଦ", "ଦୁର୍ଘଟଣା",
  ];

  if (seriousWords.some((word) => issue.includes(word))) {
    score += 20;
  }

  score = Math.min(score, 98);
  const level = score >= 75 ? "High" : score >= 50 ? "Medium" : "Low";

  return { score, level, category, sameCategoryCount };
}

export default function TrackPage() {
  const { t, getCategoryName, getStatusName } = useLanguage();

  const [searchId, setSearchId] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const loadSubmissions = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved || "[]");
      if (Array.isArray(parsed)) {
        setSubmissions(parsed);
      }
    } catch {
      setSubmissions([]);
    }
  };

  useEffect(() => {
    loadSubmissions();

    if (typeof window !== "undefined") {
      const parameters = new URLSearchParams(window.location.search);
      const idParameter = parameters.get("id");
      if (idParameter) {
        setSearchId(idParameter);
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        loadSubmissions();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const findSubmission = () => {
    const cleaned = searchId.trim().toUpperCase();
    setError("");
    setSelectedSubmission(null);

    if (!cleaned) {
      setError(t.track.errorEmpty);
      return;
    }

    const found = submissions.find(
      (submission) => submission.id.toUpperCase() === cleaned
    );

    if (!found) {
      setError(t.track.errorNotFound);
      return;
    }

    setSelectedSubmission(found);
    window.history.replaceState(null, "", `/track?id=${encodeURIComponent(found.id)}`);
  };

  const resetSearch = () => {
    setSearchId("");
    setSelectedSubmission(null);
    setError("");
    window.history.replaceState(null, "", "/track");
  };

  useEffect(() => {
    if (searchId && submissions.length > 0 && !selectedSubmission) {
      const cleaned = searchId.trim().toUpperCase();
      const found = submissions.find(
        (submission) => submission.id.toUpperCase() === cleaned
      );
      if (found) {
        setSelectedSubmission(found);
        setError("");
      }
    }
  }, [searchId, submissions, selectedSubmission]);

  useEffect(() => {
    if (!selectedSubmission) return;
    const latest = submissions.find((s) => s.id === selectedSubmission.id);
    if (latest) {
      setSelectedSubmission(latest);
    }
  }, [submissions]);

  const priority = useMemo(() => {
    if (!selectedSubmission) return null;
    return calculateLocalPriority(selectedSubmission, submissions);
  }, [selectedSubmission, submissions]);

  const currentStatus = selectedSubmission?.status || "Submitted";
  const currentStep = getStatusStep(currentStatus);

  const statusSteps = [
    {
      key: "Submitted",
      title: t.track.step1,
      description: "Community need recorded in the system.",
    },
    {
      key: "Under Review",
      title: t.track.step2,
      description: "Indian PIN code and locality verified.",
    },
    {
      key: "Verified",
      title: t.track.step3,
      description: "Sector classification and evidence confirmed.",
    },
    {
      key: "Resolved",
      title: t.track.step4,
      description: "Priority scoring applied for administrative intervention.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f8faf5] text-[#17221b]">
      {/* HEADER */}
      <header className="border-b border-[#e2e8df] bg-white sticky top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="text-sm font-black tracking-wider text-[#173f2a] flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-[#173f2a] text-white text-xs font-bold">PP</span>
            {t.common.siteName}
          </Link>

          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <Link
              href="/citizen"
              className="rounded-lg bg-[#173f2a] px-4 py-2 text-xs font-bold text-white hover:bg-[#0f2a1c] transition"
            >
              + {t.common.shareNeed}
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <section className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        {/* TITLE */}
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#28623c]">
            {t.common.citizenServices}
          </p>
          <h1 className="mt-2 text-3xl font-black text-[#173f2a] sm:text-4xl">
            {t.track.heading}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#556458]">
            {t.track.description}
          </p>
        </div>

        {/* SEARCH BOX */}
        {!selectedSubmission && (
          <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-[#d9e2da] bg-white p-6 sm:p-8 shadow-sm">
            <label className="text-sm font-bold text-[#173f2a] block">
              {t.track.inputLabel}
            </label>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={searchId}
                onChange={(event) => {
                  setSearchId(event.target.value);
                  setError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") findSubmission();
                }}
                placeholder={t.track.inputPlaceholder}
                className="min-w-0 flex-1 rounded-xl border border-[#d5ded6] bg-white px-4 py-3.5 text-sm font-semibold uppercase tracking-wider text-[#173f2a] outline-none focus:border-[#28623c]"
              />

              <button
                type="button"
                onClick={findSubmission}
                className="rounded-xl bg-[#173f2a] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#0f2a1c]"
              >
                🔎 {t.track.checkBtn}
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                ⚠ {error}
              </div>
            )}

            <div className="mt-5 rounded-xl bg-[#f8faf5] border border-[#e2e8df] p-3.5">
              <p className="text-xs leading-relaxed text-[#556458]">
                {t.track.description}
              </p>
            </div>
          </div>
        )}

        {/* RESULT CARD */}
        {selectedSubmission && (
          <div className="mt-8 rounded-3xl border border-[#d9e2da] bg-white p-6 sm:p-10 shadow-sm">
            {/* CARD HEADER */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-[#e2e8df] pb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#28623c]">
                  ✓ {t.track.foundBadge}
                </p>
                <h2 className="mt-1 text-2xl font-black text-[#173f2a]">
                  {selectedSubmission.id}
                </h2>
                <p className="text-xs text-[#556458] mt-1">
                  Recorded: {formatDate(selectedSubmission.createdAt)}
                </p>
              </div>

              <span className={`self-start rounded-full px-4 py-1.5 text-xs font-bold ${getStatusColor(currentStatus)}`}>
                ✓ {getStatusName(currentStatus)}
              </span>
            </div>

            {/* CITIZEN & GEOGRAPHY */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl bg-[#f8faf5] border border-[#e2e8df] p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#556458]">Citizen</p>
                <p className="mt-1 text-sm font-bold text-[#173f2a]">{selectedSubmission.name || "Anonymous"}</p>
              </div>

              <div className="rounded-xl bg-[#f8faf5] border border-[#e2e8df] p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#556458]">Locality / PIN</p>
                <p className="mt-1 text-sm font-bold text-[#173f2a]">
                  {selectedSubmission.village || "—"} ({selectedSubmission.pincode || "—"})
                </p>
              </div>

              <div className="rounded-xl bg-[#f8faf5] border border-[#e2e8df] p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#556458]">District / State</p>
                <p className="mt-1 text-sm font-bold text-[#173f2a]">
                  {selectedSubmission.district || "—"}, {selectedSubmission.state || "India"}
                </p>
              </div>
            </div>

            {/* DETECTED CATEGORY & PRIORITY */}
            {priority && (
              <div className="mt-6 rounded-2xl border border-[#cfe0d1] bg-[#f8faf5] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#28623c]">
                      {t.track.categoryTitle}
                    </p>
                    <p className="mt-1 text-lg font-bold text-[#173f2a] flex items-center gap-2">
                      <span>{priority.category.icon}</span>
                      <span>{getCategoryName(priority.category.name)}</span>
                    </p>
                    <p className="mt-1 text-xs text-[#556458]">
                      {priority.sameCategoryCount} reports cluster in this sector
                    </p>
                  </div>

                  <div className="rounded-xl bg-white border border-[#d9e2da] px-4 py-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#556458]">
                      {t.track.priorityScoreTitle}
                    </p>
                    <p className="mt-0.5 text-base font-black text-[#28623c]">
                      {priority.level} ({priority.score}/100)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* RAW REPORTED TEXT */}
            <div className="mt-6 rounded-2xl border border-[#e2e8df] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#28623c]">
                Reported Problem (Original Citizen Transcript)
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#17221b]">
                {selectedSubmission.issue || "No description provided."}
              </p>
            </div>

            {/* RECORDED VOICE EVIDENCE AUDIO */}
            {selectedSubmission.voiceAudioUrl && (
              <div className="mt-6 rounded-2xl border border-[#cfe0d1] bg-[#edf5ee] p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#28623c] mb-2 flex items-center gap-1.5">
                  <span>🎙️</span> Recorded Voice Evidence
                  {selectedSubmission.voiceLanguage && (
                    <span className="text-[11px] font-medium text-[#485b4d]">
                      ({selectedSubmission.voiceLanguage})
                    </span>
                  )}
                </p>
                <audio controls src={selectedSubmission.voiceAudioUrl} className="w-full h-9" />
              </div>
            )}

            {/* EVIDENCE PHOTOS */}
            {selectedSubmission.photos && selectedSubmission.photos.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wider text-[#28623c]">
                  {t.track.evidenceTitle} ({selectedSubmission.photos.length})
                </p>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedSubmission.photos.map((photo, index) => (
                    <div key={`${photo}-${index}`} className="overflow-hidden rounded-xl border border-[#d9e2da]">
                      <img src={photo} alt={`Evidence ${index + 1}`} className="h-32 w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PROGRESS TIMELINE */}
            <div className="mt-8 border-t border-[#e2e8df] pt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[#28623c]">
                {t.track.timelineTitle}
              </p>

              <div className="mt-6 space-y-6">
                {statusSteps.map((step, index) => {
                  const completed = index <= currentStep;
                  const active = index === currentStep;

                  return (
                    <div key={step.key} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            completed ? "bg-[#edf5ee] text-[#28623c] ring-2 ring-[#28623c]/20" : "bg-[#f0f2f0] text-[#718276]"
                          }`}
                        >
                          {completed ? "✓" : index + 1}
                        </div>
                        {index < statusSteps.length - 1 && (
                          <div className={`mt-2 h-8 w-0.5 ${index < currentStep ? "bg-[#28623c]" : "bg-[#e2e8df]"}`} />
                        )}
                      </div>

                      <div className="pb-1">
                        <p className={`text-sm font-bold ${active || completed ? "text-[#173f2a]" : "text-[#718276]"}`}>
                          {step.title}
                          {active && (
                            <span className="ml-2 rounded-full bg-[#edf5ee] px-2 py-0.5 text-[10px] font-bold text-[#28623c]">
                              ACTIVE
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-[#556458] leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row border-t border-[#e2e8df] pt-6">
              <button
                type="button"
                onClick={resetSearch}
                className="rounded-xl border border-[#28623c] px-5 py-3 text-xs font-bold text-[#173f2a] hover:bg-[#edf5ee] transition"
              >
                {t.track.backBtn}
              </button>

              <button
                type="button"
                onClick={loadSubmissions}
                className="rounded-xl border border-[#cbd8cd] bg-white px-5 py-3 text-xs font-bold text-[#28623c] hover:bg-[#edf5ee] transition"
              >
                ↻ {t.common.refresh}
              </button>

              <Link
                href="/citizen"
                className="rounded-xl bg-[#173f2a] px-5 py-3 text-center text-xs font-bold text-white hover:bg-[#0f2a1c] transition sm:ml-auto"
              >
                + {t.common.shareNeed}
              </Link>
            </div>
          </div>
        )}

        {/* EMPTY BROWSER STATE */}
        {!selectedSubmission && submissions.length === 0 && (
          <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-dashed border-[#cbd8cd] bg-white p-8 text-center">
            <span className="text-4xl">📋</span>
            <h2 className="mt-3 text-lg font-black text-[#173f2a]">
              No submissions on this browser
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#556458]">
              {t.track.description}
            </p>
            <Link
              href="/citizen"
              className="mt-5 inline-block rounded-xl bg-[#173f2a] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#0f2a1c] transition"
            >
              + {t.common.shareNeed}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}