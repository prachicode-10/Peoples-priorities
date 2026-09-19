"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { calculatePriority } from "@/lib/priority";
import {
  classifyIssue,
  analyzeIssueContext,
  CATEGORY_ICONS,
  type IssueCategory,
  type ContextualIssueAnalysis,
} from "@/lib/issueClassifier";
import { useLanguage } from "@/lib/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

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
  language?: string;
  voiceLanguage?: string;
  voiceAudioUrl?: string;
  voiceTranslatedText?: string;
  writingLanguages?: Record<string, string>;
  classification?: ContextualIssueAnalysis;
};

type Category = {
  name: IssueCategory;
  count: number;
  icon: string;
  priority: number;
  level: "Low" | "Medium" | "High" | "Critical";
  reasons: string[];
  breakdown: {
    frequency: number;
    severity: number;
    geographicConcentration: number;
    evidence: number;
    recency: number;
  };
};

const getSeverity = (category: IssueCategory) => {
  switch (category) {
    case "Healthcare":
      return 90;
    case "Food Safety":
      return 88;
    case "Health & Hygiene":
      return 85;
    case "Flooding":
    case "Public Safety":
    case "Safety":
      return 90;
    case "Water & Sanitation":
    case "Electricity":
      return 85;
    case "Roads & Infrastructure":
    case "Roads & Transport":
      return 75;
    case "Waste Management":
      return 72;
    case "Agriculture":
    case "Housing":
      return 70;
    case "Employment":
      return 68;
    case "Education":
      return 65;
    case "Government Services":
      return 60;
    case "Internet & Connectivity":
      return 55;
    case "Environment":
      return 65;
    default:
      return 55;
  }
};

const getPriorityColor = (level: Category["level"]) => {
  switch (level) {
    case "Critical":
      return "bg-red-100 text-red-700 border-red-200";
    case "High":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "Medium":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const { t, getCategoryName, getStatusName } = useLanguage();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    const token = localStorage.getItem("admin-auth-token");
    if (!token) {
      router.replace("/login?redirect=/dashboard");
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  const seedDemoCases = () => {
    const demoItems: Submission[] = [
      {
        id: "PP-DEMO-01",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        name: "Subrat Sahoo",
        village: "Pipili",
        district: "Puri",
        pincode: "752104",
        issue: "The food quality in our area is very poor and contaminated food is causing malaria and typhoid.",
        language: "en",
        status: "Submitted",
      },
      {
        id: "PP-DEMO-02",
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        name: "Ramesh Jena",
        village: "Nimapada",
        district: "Puri",
        pincode: "752106",
        issue: "Dirty water is causing diarrhea in our village.",
        language: "en",
        status: "Under Review",
      },
      {
        id: "PP-DEMO-03",
        createdAt: new Date(Date.now() - 10800000).toISOString(),
        name: "Sunita Behera",
        village: "Bhubaneswar",
        district: "Khordha",
        pincode: "751001",
        issue: "Garbage is not collected and mosquitoes are increasing.",
        language: "en",
        status: "Submitted",
      },
      {
        id: "PP-DEMO-04",
        createdAt: new Date(Date.now() - 14400000).toISOString(),
        name: "Prabhat Nayak",
        village: "Chandanpur",
        district: "Puri",
        pincode: "752012",
        issue: "There is no doctor in our village.",
        language: "en",
        status: "Verified",
      },
      {
        id: "PP-DEMO-05",
        createdAt: new Date(Date.now() - 18000000).toISOString(),
        name: "Minati Mohanty",
        village: "Jatni",
        district: "Khordha",
        pincode: "752050",
        issue: "The hospital has no medicines.",
        language: "en",
        status: "Submitted",
      },
      {
        id: "PP-DEMO-06",
        createdAt: new Date(Date.now() - 21600000).toISOString(),
        name: "Bikram Das",
        village: "Delanga",
        district: "Puri",
        pincode: "752015",
        issue: "The road is broken and ambulances cannot reach the village.",
        language: "en",
        status: "Under Review",
      },
      {
        id: "PP-DEMO-07",
        createdAt: new Date(Date.now() - 25200000).toISOString(),
        name: "Sarojini Panda",
        village: "Khordha",
        district: "Khordha",
        pincode: "752055",
        issue: "School food is stale and children are becoming sick.",
        language: "en",
        status: "Submitted",
      },
      {
        id: "PP-DEMO-08",
        createdAt: new Date(Date.now() - 28800000).toISOString(),
        name: "Kailash Mishra",
        village: "Gop",
        district: "Puri",
        pincode: "752110",
        issue: "There is no clean drinking water near our school.",
        language: "en",
        status: "Verified",
      },
      {
        id: "PP-DEMO-09",
        createdAt: new Date(Date.now() - 32400000).toISOString(),
        name: "Arati Sethi",
        village: "Puri Town",
        district: "Puri",
        pincode: "752001",
        issue: "Garbage near the market is causing bad smell and illness.",
        language: "en",
        status: "Submitted",
      },
      {
        id: "PP-DEMO-10",
        createdAt: new Date(Date.now() - 36000000).toISOString(),
        name: "Dhiren Pradhan",
        village: "Brahmagiri",
        district: "Puri",
        pincode: "752011",
        issue: "Our village has no water and no garbage collection.",
        language: "en",
        status: "Under Review",
      },
      {
        id: "PP-DEMO-11",
        createdAt: new Date(Date.now() - 39600000).toISOString(),
        name: "Manorama Devi",
        village: "Khandagiri",
        district: "Khordha",
        pincode: "751030",
        issue: "ଗାଁରେ ପିଇବା ପାଣି ଦୂଷିତ ଅଛି ଏବଂ ଝାଡାବାନ୍ତି ବ୍ୟାପୁଛି।",
        language: "or",
        status: "Submitted",
      },
    ];

    try {
      localStorage.setItem("peoples-priorities-submissions", JSON.stringify(demoItems));
      setSubmissions(demoItems);
    } catch {
      setSubmissions(demoItems);
    }
  };

  const loadSubmissions = () => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("peoples-priorities-submissions") || "[]"
      );
      if (Array.isArray(saved) && saved.length > 0) {
        setSubmissions(saved);
      } else {
        seedDemoCases();
      }
    } catch {
      seedDemoCases();
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admin-auth-token");
    localStorage.removeItem("admin-email");
    router.replace("/");
  };

  /* CATEGORY & PRIORITY ENGINE */
  const categories = useMemo(() => {
    const grouped: Record<string, Submission[]> = {};

    submissions.forEach((submission) => {
      const analysis =
        submission.classification ||
        analyzeIssueContext(submission.issue || "", submission.language);
      const category = analysis.primaryCategory;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(submission);
    });

    const result: Category[] = Object.entries(grouped).map(
      ([name, categorySubmissions]) => {
        const category = name as IssueCategory;
        const count = categorySubmissions.length;

        const frequency =
          submissions.length > 0
            ? Math.round((count / submissions.length) * 100)
            : 0;

        const locationCounts: Record<string, number> = {};
        categorySubmissions.forEach((submission) => {
          const location =
            submission.district?.trim() ||
            submission.state?.trim() ||
            submission.village?.trim() ||
            submission.location?.trim() ||
            "Unknown";
          const normalized = location.toLowerCase();
          locationCounts[normalized] = (locationCounts[normalized] || 0) + 1;
        });

        const highestLocationCount = Math.max(0, ...Object.values(locationCounts));
        const geographicConcentration =
          count > 0 ? Math.round((highestLocationCount / count) * 100) : 0;

        const reportsWithPhotos = categorySubmissions.filter(
          (submission) =>
            Array.isArray(submission.photos) && submission.photos.length > 0
        ).length;
        const evidence =
          count > 0 ? Math.round((reportsWithPhotos / count) * 100) : 0;

        const now = Date.now();
        const recentReports = categorySubmissions.filter((submission) => {
          const created = new Date(submission.createdAt).getTime();
          if (Number.isNaN(created)) return false;
          const days = (now - created) / (1000 * 60 * 60 * 24);
          return days <= 7;
        }).length;

        const recency =
          count > 0 ? Math.round((recentReports / count) * 100) : 0;
        const severity = getSeverity(category);

        const priority = calculatePriority({
          frequency,
          severity,
          geographicConcentration,
          evidence,
          recency,
        });

        return {
          name: category,
          count,
          icon: CATEGORY_ICONS[category] || "📌",
          priority: priority.score,
          level: priority.level,
          reasons: priority.reasons,
          breakdown: priority.breakdown,
        };
      }
    );

    return result.sort((a, b) => b.priority - a.priority);
  }, [submissions]);

  /* GEOGRAPHIC HOTSPOTS */
  const locations = useMemo(() => {
    const counts: Record<string, number> = {};

    submissions.forEach((submission) => {
      const location =
        submission.district?.trim() ||
        submission.state?.trim() ||
        submission.village?.trim() ||
        submission.location?.trim() ||
        "Unknown";
      counts[location] = (counts[location] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [submissions]);

  /* FILTER SUBMISSIONS */
  const filteredSubmissions =
    selectedCategory === "All"
      ? submissions
      : submissions.filter((submission) => {
          const analysis =
            submission.classification ||
            analyzeIssueContext(submission.issue || "", submission.language);
          return (
            analysis.primaryCategory === selectedCategory ||
            analysis.secondaryCategories.includes(selectedCategory as IssueCategory)
          );
        });

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#f8faf5] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#173f2a] mx-auto"></div>
          <p className="mt-4 text-sm text-[#556458] font-bold">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8faf5] text-[#17221b]">
      {/* HEADER */}
      <header className="border-b border-[#e2e8df] bg-white sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="text-sm font-black tracking-wider text-[#173f2a] flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-[#173f2a] text-white text-xs font-bold">PP</span>
            {t.common.siteName}
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitcher compact />
            <Link
              href="/citizen"
              className="rounded-lg border border-[#28623c] bg-white px-3.5 py-1.5 text-xs font-bold text-[#173f2a] hover:bg-[#edf5ee] transition"
            >
              + {t.common.shareNeed}
            </Link>
            <Link
              href="/track"
              className="rounded-lg border border-[#28623c] bg-white px-3.5 py-1.5 text-xs font-bold text-[#173f2a] hover:bg-[#edf5ee] transition"
            >
              🔎 {t.common.track}
            </Link>
            <Link
              href="/admin"
              className="rounded-lg bg-[#173f2a] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0f2a1c] transition"
            >
              🛠 {t.common.admin}
            </Link>
            <button
              onClick={loadSubmissions}
              className="rounded-lg border border-[#cbd8cd] bg-white px-3 py-1.5 text-xs font-bold text-[#28623c] hover:bg-[#edf5ee] transition"
            >
              {t.dashboard.refreshBtn}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 transition"
            >
              {t.dashboard.logoutBtn}
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTENT */}
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        {/* TITLE */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#28623c]">
              {t.dashboard.badge}
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-[#173f2a]">
              {t.dashboard.heading}
            </h1>
            <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed text-[#556458]">
              {t.dashboard.description}
            </p>
          </div>

          <div className="rounded-2xl border border-[#cfe0d1] bg-white px-4 py-3 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#556458]">
              {t.dashboard.sourceTitle}
            </p>
            <p className="mt-0.5 text-xs font-bold text-[#28623c]">
              {t.dashboard.sourceText}
            </p>
          </div>
        </div>

        {/* STATS OVERVIEW */}
        <div className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#d9e2da] bg-white p-5 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-[#556458]">
              {t.dashboard.totalSubmissions}
            </p>
            <p className="mt-2 text-3xl sm:text-4xl font-black text-[#173f2a]">
              {submissions.length}
            </p>
            <p className="mt-1 text-xs text-[#556458]">Citizen Submissions</p>
          </div>

          <div className="rounded-2xl border border-[#d9e2da] bg-white p-5 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-[#556458]">
              Issue Types
            </p>
            <p className="mt-2 text-3xl sm:text-4xl font-black text-[#173f2a]">
              {categories.length}
            </p>
            <p className="mt-1 text-xs text-[#556458]">Automatically Classified</p>
          </div>

          <div className="rounded-2xl border border-[#d9e2da] bg-white p-5 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-[#556458]">
              {t.dashboard.uniqueLocations}
            </p>
            <p className="mt-2 text-3xl sm:text-4xl font-black text-[#173f2a]">
              {locations.length}
            </p>
            <p className="mt-1 text-xs text-[#556458]">Represented Areas</p>
          </div>

          <div className="rounded-2xl border border-[#d9e2da] bg-white p-5 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-[#556458]">
              {t.dashboard.highestPriorityTitle}
            </p>
            <p className="mt-2 text-xl font-bold text-[#28623c] truncate">
              {categories[0] ? `${categories[0].icon} ${getCategoryName(categories[0].name)}` : "—"}
            </p>
            {categories[0] && (
              <p className="mt-1 text-xs font-bold text-[#28623c]">
                {categories[0].priority}/100
              </p>
            )}
          </div>
        </div>

        {/* EMPTY STATE */}
        {submissions.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[#cbd8cd] bg-white p-12 text-center">
            <span className="text-5xl">📊</span>
            <h2 className="mt-4 text-xl font-black text-[#173f2a]">
              No Community Data Yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#556458]">
              Submit community needs from the citizen portal and this dashboard will automatically analyze them.
            </p>
            <Link
              href="/citizen"
              className="mt-6 inline-block rounded-xl bg-[#173f2a] px-6 py-3 text-xs font-bold text-white hover:bg-[#0f2a1c] transition"
            >
              + {t.common.shareNeed}
            </Link>
          </div>
        ) : (
          <>
            {/* EXPLAINABLE PRIORITY SECTORS */}
            <div className="mt-8 rounded-3xl border border-[#d9e2da] bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-[#e2e8df] pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#28623c]">
                    Explainable Priority Engine
                  </p>
                  <h2 className="mt-1 text-xl sm:text-2xl font-black text-[#173f2a]">
                    Transparent Community Priority Ranking
                  </h2>
                </div>
                <p className="text-xs text-[#556458]">
                  Score = frequency + severity + location + evidence + recency
                </p>
              </div>

              <div className="mt-6 space-y-4">
                {categories.map((cat, index) => (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`w-full rounded-2xl border p-5 text-left transition ${
                      selectedCategory === cat.name
                        ? "border-[#28623c] bg-[#edf5ee]"
                        : "border-[#e2e8df] bg-[#f8faf5] hover:bg-[#edf5ee]/70"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-xs">
                        {cat.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-[#28623c]">
                              #{index + 1}
                            </span>
                            <span className="text-base font-bold text-[#173f2a]">
                              {getCategoryName(cat.name)}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#28623c] border border-[#d9e2da]">
                              {cat.count} reports
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getPriorityColor(
                                cat.level
                              )}`}
                            >
                              {cat.level}
                            </span>
                          </div>

                          <span className="text-xl font-black text-[#173f2a]">
                            {cat.priority}
                            <span className="text-xs text-[#556458]">/100</span>
                          </span>
                        </div>

                        {/* Priority Bar */}
                        <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-[#e2e8df]">
                          <div
                            className="h-full rounded-full bg-[#28623c] transition-all"
                            style={{ width: `${Math.max(cat.priority, 5)}%` }}
                          />
                        </div>

                        {/* Breakdown */}
                        <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs text-[#556458] sm:grid-cols-5">
                          <span>
                            Frequency: <strong>{cat.breakdown.frequency}%</strong>
                          </span>
                          <span>
                            Severity: <strong>{cat.breakdown.severity}%</strong>
                          </span>
                          <span>
                            Location: <strong>{cat.breakdown.geographicConcentration}%</strong>
                          </span>
                          <span>
                            Evidence: <strong>{cat.breakdown.evidence}%</strong>
                          </span>
                          <span>
                            Recency: <strong>{cat.breakdown.recency}%</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Explanations */}
                    <div className="mt-3 rounded-xl bg-white border border-[#e2e8df] p-3 text-xs">
                      <p className="font-bold uppercase tracking-wider text-[#28623c] text-[10px]">
                        Why this score?
                      </p>
                      <ul className="mt-1.5 space-y-1 text-[#556458]">
                        {cat.reasons.map((reason) => (
                          <li key={reason}>✓ {reason}</li>
                        ))}
                      </ul>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* HOTSPOTS & DECISION SUPPORT */}
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {/* HOTSPOTS */}
              <div className="rounded-3xl border border-[#d9e2da] bg-white p-6 shadow-sm sm:p-8">
                <p className="text-xs font-bold uppercase tracking-wider text-[#28623c]">
                  Location Clusters
                </p>
                <h2 className="mt-1 text-xl font-black text-[#173f2a]">
                  {t.dashboard.hotspotsTitle}
                </h2>
                <p className="mt-1 text-xs text-[#556458]">
                  {t.dashboard.hotspotsDesc}
                </p>

                <div className="mt-5 space-y-3">
                  {locations.slice(0, 5).map((loc, idx) => {
                    const percentage = submissions.length
                      ? Math.round((loc.count / submissions.length) * 100)
                      : 0;

                    return (
                      <div key={loc.name} className="rounded-xl bg-[#f8faf5] border border-[#e2e8df] p-3.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#edf5ee] text-xs font-bold text-[#28623c]">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-[#173f2a]">
                              📍 {loc.name}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-[#28623c]">
                            {loc.count} {loc.count === 1 ? "report" : "reports"}
                          </span>
                        </div>

                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e2e8df]">
                          <div
                            className="h-full rounded-full bg-[#28623c]"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DECISION SUPPORT */}
              <div className="rounded-3xl bg-[#173f2a] p-6 text-white shadow-sm sm:p-8">
                <p className="text-xs font-bold uppercase tracking-wider text-[#b8d8bd]">
                  {t.dashboard.decisionSupportBadge}
                </p>
                <h2 className="mt-1 text-xl font-black">
                  Recommended Action
                </h2>

                {categories[0] && (
                  <div className="mt-5">
                    <div className="rounded-2xl bg-white/10 p-5 border border-white/15">
                      <p className="text-3xl">{categories[0].icon}</p>
                      <p className="mt-2 text-2xl font-black">
                        {getCategoryName(categories[0].name)}
                      </p>
                      <p className="mt-1 text-xs text-[#d7e7d9]">
                        Priority Index: <strong className="text-white">{categories[0].priority}/100</strong>
                      </p>
                      <span className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                        {categories[0].level}
                      </span>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/20 p-4 text-xs leading-relaxed text-[#d7e7d9]">
                      Immediate deployment recommended in verified clusters experiencing multiple submissions in{" "}
                      <strong className="text-white">{getCategoryName(categories[0].name)}</strong>.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CITIZEN SUBMISSIONS LIST (PRESERVES RAW REPORT LANGUAGE) */}
            <div className="mt-8 rounded-3xl border border-[#d9e2da] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-[#e2e8df] pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#28623c]">
                    Verified Citizen Feedback
                  </p>
                  <h2 className="mt-1 text-xl font-black text-[#173f2a]">
                    {selectedCategory === "All"
                      ? t.dashboard.citizenReportsTitle
                      : `${getCategoryName(selectedCategory)} (${t.dashboard.citizenReportsTitle})`}
                  </h2>
                </div>

                {selectedCategory !== "All" && (
                  <button
                    onClick={() => setSelectedCategory("All")}
                    className="text-xs font-bold text-[#28623c] hover:underline"
                  >
                    {t.dashboard.showAllBtn}
                  </button>
                )}
              </div>

              <div className="mt-6 space-y-4">
                {filteredSubmissions.slice().reverse().map((sub) => {
                  const analysis =
                    sub.classification ||
                    analyzeIssueContext(sub.issue || "", sub.language);
                  const icon = CATEGORY_ICONS[analysis.primaryCategory] || "📌";
                  const confidencePct = Math.round(analysis.confidence * 100);

                  return (
                    <div
                      key={sub.id}
                      className="rounded-2xl border border-[#d9e2da] bg-[#fbfdfa] p-4 sm:p-5 shadow-xs transition hover:border-[#28623c]/40"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white border border-[#e2e8df] text-xl shadow-xs">
                            {icon}
                          </div>

                          <div className="min-w-0 flex-1">
                            {/* Badges: Category, Multi-Issue, Status, Language, Confidence */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black text-[#173f2a]">
                                {getCategoryName(analysis.primaryCategory)}
                              </span>

                              {analysis.isMultiIssue && analysis.secondaryCategories.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {analysis.secondaryCategories.map((sec) => (
                                    <span
                                      key={sec}
                                      className="rounded-full bg-[#f0f4ee] border border-[#d5ded6] px-2 py-0.5 text-[10px] font-bold text-[#2d503b]"
                                    >
                                      + {CATEGORY_ICONS[sec] || ""} {getCategoryName(sec)}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <span className="rounded-full bg-[#edf5ee] px-2 py-0.5 text-[10px] font-bold text-[#28623c]">
                                {getStatusName(sub.status || "Submitted")}
                              </span>

                              {sub.language && (
                                <span className="rounded-full border border-[#d5ded6] bg-white px-2 py-0.5 text-[10px] font-bold text-[#556458]">
                                  {sub.language.toUpperCase()}
                                </span>
                              )}

                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                  confidencePct >= 85
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : confidencePct >= 70
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-slate-50 text-slate-700 border-slate-200"
                                }`}
                              >
                                {confidencePct}% Confidence
                              </span>
                            </div>

                            {/* Raw transcript preserved */}
                            <p className="mt-2.5 text-xs sm:text-sm font-medium leading-relaxed text-[#17221b]">
                              &ldquo;{sub.issue}&rdquo;
                            </p>

                            {/* Audio player if recorded */}
                            {sub.voiceAudioUrl && (
                              <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-white border border-[#e2e8df] p-2">
                                <span className="text-xs font-bold text-[#28623c]">🎙️ Spoken Recording:</span>
                                <audio
                                  controls
                                  src={sub.voiceAudioUrl}
                                  className="h-7 max-w-[260px]"
                                />
                              </div>
                            )}

                            {/* Structured AI Contextual Classification Panel */}
                            <div className="mt-3.5 rounded-xl border border-[#e0e9e1] bg-white p-3.5 space-y-2 text-xs shadow-2xs">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] border-b border-[#f0f4ef] pb-2">
                                <div>
                                  <span className="font-bold text-[#556458]">Category: </span>
                                  <span className="font-extrabold text-[#173f2a]">
                                    {getCategoryName(analysis.primaryCategory)}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-bold text-[#556458]">Theme: </span>
                                  <span className="rounded-md bg-[#edf5ee] px-1.5 py-0.5 font-bold text-[#28623c]">
                                    {analysis.theme}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-bold text-[#556458]">Root Issue: </span>
                                  <span className="font-medium text-[#17221b]">
                                    {analysis.rootIssues.join("; ")}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-bold text-[#556458]">Impact: </span>
                                  <span className="font-medium text-[#c04b36]">
                                    {analysis.impacts.length > 0 ? analysis.impacts.join("; ") : "Community Inconvenience"}
                                  </span>
                                </div>
                              </div>

                              <div className="pt-0.5 text-[11px] leading-relaxed text-[#556458]">
                                <strong className="font-bold text-[#28623c]">Reason: </strong>
                                <span className="text-[#324036]">{analysis.reason}</span>
                              </div>
                            </div>

                            <p className="mt-2 text-[11px] text-[#556458]">
                              📍 {sub.village || "—"}, {sub.district || sub.location || "—"} • PIN {sub.pincode || "—"}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-mono font-bold text-[#28623c] self-start">
                          {sub.id}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}