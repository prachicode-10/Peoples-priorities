"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calculatePriority } from "@/lib/priority";
import {
  classifyIssue,
  type IssueCategory,
} from "@/lib/issueClassifier";

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

type Category = {
  name: IssueCategory;
  count: number;
  icon: string;
  priority: number;
  level:
    | "Low"
    | "Medium"
    | "High"
    | "Critical";
  reasons: string[];
  breakdown: {
    frequency: number;
    severity: number;
    geographicConcentration: number;
    evidence: number;
    recency: number;
  };
};

/*
 * ============================================================
 * SEVERITY
 * ============================================================
 *
 * Transparent prototype rule.
 *
 * Later this can be replaced by a more advanced
 * AI/public-data assisted severity model.
 * ============================================================
 */

const getSeverity = (
  category: IssueCategory
) => {
  switch (category) {
    case "Healthcare":
    case "Flooding":
    case "Safety":
      return 90;

    case "Water & Sanitation":
    case "Electricity":
      return 85;

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

/*
 * ============================================================
 * PRIORITY COLORS
 * ============================================================
 */

const getPriorityColor = (
  level: Category["level"]
) => {
  switch (level) {
    case "Critical":
      return "bg-red-100 text-red-700 border-red-200";

    case "High":
      return "bg-orange-100 text-orange-700 border-orange-200";

    case "Medium":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";

    default:
      return "bg-green-100 text-green-700 border-green-200";
  }
};

/*
 * ============================================================
 * LANGUAGE LABEL
 * ============================================================
 */

const getLanguageLabel = (
  language?: string
) => {
  switch (language) {
    case "Hindi":
      return "हिन्दी";

    case "Odia":
      return "ଓଡ଼ିଆ";

    case "English":
      return "English";

    case "Mixed":
      return "Mixed";

    default:
      return "Unknown";
  }
};

/*
 * ============================================================
 * DASHBOARD
 * ============================================================
 */

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("admin-auth-token");
    if (!token) {
      router.replace("/login?redirect=/dashboard");
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("All");

  /*
   * ==========================================================
   * LOAD DATA
   * ==========================================================
   */

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(
          "peoples-priorities-submissions"
        ) || "[]"
      );

      if (Array.isArray(saved)) {
        setSubmissions(saved);
      }
    } catch {
      setSubmissions([]);
    }
  }, []);

  /*
   * ==========================================================
   * REFRESH
   * ==========================================================
   */

  const refreshDashboard = () => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(
          "peoples-priorities-submissions"
        ) || "[]"
      );

      if (Array.isArray(saved)) {
        setSubmissions(saved);
      }
    } catch {
      setSubmissions([]);
    }
  };

  /*
   * ==========================================================
   * CATEGORY + PRIORITY ENGINE
   * ==========================================================
   */

  const categories = useMemo(() => {
    const grouped: Record<
      string,
      Submission[]
    > = {};

    /*
     * First classify every submission.
     */

    submissions.forEach((submission) => {
      const classification =
        classifyIssue(
          submission.issue || ""
        );

      const category =
        classification.category;

      if (!grouped[category]) {
        grouped[category] = [];
      }

      grouped[category].push(
        submission
      );
    });

    /*
     * Build category intelligence.
     */

    const result: Category[] =
      Object.entries(grouped).map(
        ([name, categorySubmissions]) => {
          const category =
            name as IssueCategory;

          const firstClassification =
            classifyIssue(
              categorySubmissions[0]
                ?.issue || ""
            );

          const count =
            categorySubmissions.length;

          /*
           * --------------------------------------------------
           * FREQUENCY
           * --------------------------------------------------
           */

          const frequency =
            submissions.length > 0
              ? Math.round(
                  (count /
                    submissions.length) *
                    100
                )
              : 0;

          /*
           * --------------------------------------------------
           * GEOGRAPHIC CONCENTRATION
           * --------------------------------------------------
           *
           * We use the verified district/state when
           * available, otherwise village/location.
           *
           * This keeps the system India-wide.
           */

          const locationCounts: Record<
            string,
            number
          > = {};

          categorySubmissions.forEach(
            (submission) => {
              const location =
                submission.district?.trim() ||
                submission.state?.trim() ||
                submission.village?.trim() ||
                submission.location?.trim() ||
                "Unknown";

              const normalized =
                location.toLowerCase();

              locationCounts[
                normalized
              ] =
                (locationCounts[
                  normalized
                ] || 0) + 1;
            }
          );

          const highestLocationCount =
            Math.max(
              0,
              ...Object.values(
                locationCounts
              )
            );

          const geographicConcentration =
            count > 0
              ? Math.round(
                  (highestLocationCount /
                    count) *
                    100
                )
              : 0;

          /*
           * --------------------------------------------------
           * PHOTO EVIDENCE
           * --------------------------------------------------
           */

          const reportsWithPhotos =
            categorySubmissions.filter(
              (submission) =>
                Array.isArray(
                  submission.photos
                ) &&
                submission.photos.length >
                  0
            ).length;

          const evidence =
            count > 0
              ? Math.round(
                  (reportsWithPhotos /
                    count) *
                    100
                )
              : 0;

          /*
           * --------------------------------------------------
           * RECENCY
           * --------------------------------------------------
           */

          const now = Date.now();

          const recentReports =
            categorySubmissions.filter(
              (submission) => {
                const created =
                  new Date(
                    submission.createdAt
                  ).getTime();

                if (
                  Number.isNaN(created)
                ) {
                  return false;
                }

                const days =
                  (now - created) /
                  (1000 *
                    60 *
                    60 *
                    24);

                return days <= 7;
              }
            ).length;

          const recency =
            count > 0
              ? Math.round(
                  (recentReports /
                    count) *
                    100
                )
              : 0;

          /*
           * --------------------------------------------------
           * SEVERITY
           * --------------------------------------------------
           */

          const severity =
            getSeverity(category);

          /*
           * --------------------------------------------------
           * PRIORITY
           * --------------------------------------------------
           */

          const priority =
            calculatePriority({
              frequency,
              severity,
              geographicConcentration,
              evidence,
              recency,
            });

          return {
            name: category,
            count,
            icon: firstClassification.icon,
            priority: priority.score,
            level: priority.level,
            reasons: priority.reasons,
            breakdown:
              priority.breakdown,
          };
        }
      );

    /*
     * Highest priority first.
     */

    return result.sort(
      (a, b) =>
        b.priority - a.priority
    );
  }, [submissions]);

  /*
   * ==========================================================
   * LOCATION ANALYSIS
   * ==========================================================
   */

  const locations = useMemo(() => {
    const counts: Record<
      string,
      number
    > = {};

    submissions.forEach(
      (submission) => {
        const location =
          submission.district?.trim() ||
          submission.state?.trim() ||
          submission.village?.trim() ||
          submission.location?.trim() ||
          "Unknown";

        counts[location] =
          (counts[location] || 0) + 1;
      }
    );

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort(
        (a, b) =>
          b.count - a.count
      );
  }, [submissions]);

  /*
   * ==========================================================
   * FILTER
   * ==========================================================
   */

  const filteredSubmissions =
    selectedCategory === "All"
      ? submissions
      : submissions.filter(
          (submission) =>
            classifyIssue(
              submission.issue || ""
            ).category ===
            selectedCategory
        );

  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#f5f7f4] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#173f2a] mx-auto animate-pulse"></div>
          <p className="mt-4 text-sm text-[#536058] font-bold">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7f4] text-[#17221b]">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="border-b border-[#dce3dc] bg-white">

        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">

          <a
            href="/"
            className="text-sm font-bold tracking-[0.18em] text-[#173f2a]"
          >
            PEOPLE'S PRIORITIES
          </a>

          <div className="flex flex-wrap items-center gap-3">

            <a
              href="/citizen"
              className="rounded-full border border-[#397149] bg-white px-4 py-2 text-xs font-bold text-[#397149] transition hover:bg-[#f0f8f1]"
            >
              + Share a Need
            </a>

            <a
              href="/track"
              className="rounded-full border border-[#397149] bg-white px-4 py-2 text-xs font-bold text-[#397149] transition hover:bg-[#f0f8f1]"
            >
              🔎 Track
            </a>

            <a
              href="/admin"
              className="rounded-full bg-[#173f2a] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#0f2f1e]"
            >
              🛠 Admin
            </a>

            <button
              onClick={
                refreshDashboard
              }
              className="rounded-full border border-[#cbd8cd] bg-white px-4 py-2 text-xs font-bold text-[#397149] transition hover:bg-[#f0f8f1]"
            >
              ↻ Refresh
            </button>

          </div>

        </div>

      </header>

      {/* =====================================================
          MAIN
          ===================================================== */}

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">

        {/* ===================================================
            TITLE
            =================================================== */}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#397149]">
              Community Intelligence
            </p>

            <h1 className="mt-3 text-3xl font-bold text-[#173f2a] sm:text-4xl">
              People's Priorities Dashboard
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#66736a]">
              Transforming citizen voices
              from across India into
              transparent, evidence-based
              community priorities.
            </p>

          </div>

          <div className="rounded-2xl border border-[#cfe0d1] bg-white px-5 py-4">

            <p className="text-xs font-bold text-[#66736a]">
              DATA SOURCE
            </p>

            <p className="mt-1 text-sm font-bold text-[#397149]">
              🇮🇳 India-wide Citizen
              Submissions
            </p>

          </div>

        </div>

        {/* ===================================================
            STAT CARDS
            =================================================== */}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-[#d9e2da] bg-white p-5 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
              Total Needs
            </p>

            <p className="mt-3 text-4xl font-bold text-[#173f2a]">
              {submissions.length}
            </p>

            <p className="mt-2 text-xs text-[#66736a]">
              Citizen submissions
            </p>

          </div>

          <div className="rounded-2xl border border-[#d9e2da] bg-white p-5 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
              Issue Types
            </p>

            <p className="mt-3 text-4xl font-bold text-[#173f2a]">
              {categories.length}
            </p>

            <p className="mt-2 text-xs text-[#66736a]">
              Automatically classified
            </p>

          </div>

          <div className="rounded-2xl border border-[#d9e2da] bg-white p-5 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
              Locations
            </p>

            <p className="mt-3 text-4xl font-bold text-[#173f2a]">
              {locations.length}
            </p>

            <p className="mt-2 text-xs text-[#66736a]">
              Districts / areas represented
            </p>

          </div>

          <div className="rounded-2xl border border-[#d9e2da] bg-white p-5 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
              Highest Priority
            </p>

            <p className="mt-3 text-xl font-bold text-[#397149]">
              {categories[0]
                ? `${categories[0].icon} ${categories[0].name}`
                : "No data"}
            </p>

            {categories[0] && (
              <p className="mt-2 text-xs font-bold text-[#397149]">
                {categories[0].priority}
                /100
              </p>
            )}

          </div>

        </div>

        {/* ===================================================
            EMPTY STATE
            =================================================== */}

        {submissions.length === 0 ? (

          <div className="mt-8 rounded-3xl border border-dashed border-[#cbd8cd] bg-white p-14 text-center">

            <div className="text-6xl">
              📊
            </div>

            <h2 className="mt-5 text-2xl font-bold text-[#173f2a]">
              No community data yet
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#66736a]">
              Submit community needs
              from the citizen portal and
              this dashboard will
              automatically classify and
              analyse them.
            </p>

            <a
              href="/citizen"
              className="mt-6 inline-block rounded-xl bg-[#173f2a] px-6 py-3 text-sm font-bold text-white"
            >
              Share a Need
            </a>

          </div>

        ) : (

          <>

            {/* =================================================
                MULTILINGUAL CLASSIFICATION
                ================================================= */}

            <div className="mt-8 rounded-3xl border border-[#d9e2da] bg-white p-6 shadow-sm sm:p-8">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                    Multilingual Issue Intelligence
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-[#173f2a]">
                    Citizen problems are automatically classified
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736a]">
                    English, हिन्दी and
                    ଓଡ଼ିଆ complaints are
                    analysed using the same
                    classification engine.
                  </p>

                </div>

                <div className="rounded-xl bg-[#f0f8f1] px-4 py-3 text-xs font-bold text-[#397149]">
                  🇮🇳 India-wide
                </div>

              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">

                <div className="rounded-2xl bg-[#f8faf8] p-5">

                  <p className="text-2xl">
                    🇬🇧
                  </p>

                  <p className="mt-3 text-sm font-bold text-[#173f2a]">
                    English
                  </p>

                  <p className="mt-1 text-xs text-[#66736a]">
                    Roads, water,
                    electricity and more.
                  </p>

                </div>

                <div className="rounded-2xl bg-[#f8faf8] p-5">

                  <p className="text-2xl">
                    हिन्दी
                  </p>

                  <p className="mt-3 text-sm font-bold text-[#173f2a]">
                    Hindi
                  </p>

                  <p className="mt-1 text-xs text-[#66736a]">
                    हिन्दी complaints are
                    classified automatically.
                  </p>

                </div>

                <div className="rounded-2xl bg-[#f8faf8] p-5">

                  <p className="text-2xl">
                    ଓଡ଼ିଆ
                  </p>

                  <p className="mt-3 text-sm font-bold text-[#173f2a]">
                    Odia
                  </p>

                  <p className="mt-1 text-xs text-[#66736a]">
                    ଓଡ଼ିଆ complaints are
                    classified automatically.
                  </p>

                </div>

              </div>

            </div>

            {/* =================================================
                PRIORITY ANALYSIS
                ================================================= */}

            <div className="mt-8 rounded-3xl border border-[#d9e2da] bg-white p-6 shadow-sm sm:p-8">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                    Explainable Priority Engine
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-[#173f2a]">
                    What should be prioritised?
                  </h2>

                </div>

                <p className="text-xs text-[#66736a]">
                  Score = frequency +
                  severity + location +
                  evidence + recency
                </p>

              </div>

              <div className="mt-6 space-y-5">

                {categories.map(
                  (
                    category,
                    index
                  ) => (

                    <button
                      key={
                        category.name
                      }
                      onClick={() =>
                        setSelectedCategory(
                          category.name
                        )
                      }
                      className={`w-full rounded-2xl border p-5 text-left transition ${
                        selectedCategory ===
                        category.name
                          ? "border-[#397149] bg-[#f0f8f1]"
                          : "border-[#e1e8e2] bg-[#f8faf8] hover:bg-[#f0f8f1]"
                      }`}
                    >

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-white text-2xl">
                          {
                            category.icon
                          }
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-wrap items-center justify-between gap-3">

                            <div className="flex flex-wrap items-center gap-3">

                              <span className="text-xs font-bold text-[#397149]">
                                #{index +
                                  1}
                              </span>

                              <span className="text-base font-bold text-[#173f2a]">
                                {
                                  category.name
                                }
                              </span>

                              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#397149]">
                                {
                                  category.count
                                }{" "}
                                reports
                              </span>

                              <span
                                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getPriorityColor(
                                  category.level
                                )}`}
                              >
                                {
                                  category.level
                                }
                              </span>

                            </div>

                            <span className="text-2xl font-bold text-[#173f2a]">
                              {
                                category.priority
                              }
                              <span className="text-xs text-[#66736a]">
                                /100
                              </span>
                            </span>

                          </div>

                          <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#dce6de]">

                            <div
                              className="h-full rounded-full bg-[#397149] transition-all"
                              style={{
                                width: `${Math.max(
                                  category.priority,
                                  3
                                )}%`,
                              }}
                            />

                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#66736a] sm:grid-cols-5">

                            <span>
                              Frequency{" "}
                              <strong>
                                {
                                  category
                                    .breakdown
                                    .frequency
                                }
                              </strong>
                            </span>

                            <span>
                              Severity{" "}
                              <strong>
                                {
                                  category
                                    .breakdown
                                    .severity
                                }
                              </strong>
                            </span>

                            <span>
                              Location{" "}
                              <strong>
                                {
                                  category
                                    .breakdown
                                    .geographicConcentration
                                }
                              </strong>
                            </span>

                            <span>
                              Evidence{" "}
                              <strong>
                                {
                                  category
                                    .breakdown
                                    .evidence
                                }
                              </strong>
                            </span>

                            <span>
                              Recency{" "}
                              <strong>
                                {
                                  category
                                    .breakdown
                                    .recency
                                }
                              </strong>
                            </span>

                          </div>

                        </div>

                      </div>

                      <div className="mt-4 rounded-xl bg-white p-4">

                        <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                          Why this score?
                        </p>

                        <ul className="mt-2 space-y-1">

                          {category.reasons.map(
                            (reason) => (
                              <li
                                key={
                                  reason
                                }
                                className="text-xs leading-5 text-[#66736a]"
                              >
                                ✓{" "}
                                {
                                  reason
                                }
                              </li>
                            )
                          )}

                        </ul>

                      </div>

                    </button>

                  )
                )}

              </div>

            </div>

            {/* =================================================
                LOCATION ANALYSIS + TOP PRIORITY
                ================================================= */}

            <div className="mt-8 grid gap-8 lg:grid-cols-2">

              {/* LOCATION */}

              <div className="rounded-3xl border border-[#d9e2da] bg-white p-6 shadow-sm sm:p-8">

                <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                  India-wide Location Analysis
                </p>

                <h2 className="mt-2 text-2xl font-bold text-[#173f2a]">
                  Community hotspots
                </h2>

                <p className="mt-2 text-sm text-[#66736a]">
                  Areas with the highest
                  concentration of
                  reported needs.
                </p>

                <div className="mt-6 space-y-4">

                  {locations
                    .slice(0, 6)
                    .map(
                      (
                        location,
                        index
                      ) => {

                        const percentage =
                          submissions.length
                            ? Math.round(
                                (location.count /
                                  submissions.length) *
                                  100
                              )
                            : 0;

                        return (
                          <div
                            key={
                              location.name
                            }
                            className="rounded-xl bg-[#f8faf8] p-4"
                          >

                            <div className="flex items-center justify-between">

                              <div className="flex items-center gap-3">

                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e9f4ea] text-xs font-bold text-[#397149]">
                                  {index +
                                    1}
                                </span>

                                <span className="text-sm font-bold text-[#173f2a]">
                                  📍{" "}
                                  {
                                    location.name
                                  }
                                </span>

                              </div>

                              <span className="text-sm font-bold text-[#397149]">
                                {
                                  location.count
                                }
                              </span>

                            </div>

                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dce6de]">

                              <div
                                className="h-full rounded-full bg-[#397149]"
                                style={{
                                  width: `${Math.max(
                                    percentage,
                                    5
                                  )}%`,
                                }}
                              />

                            </div>

                            <p className="mt-2 text-xs text-[#66736a]">
                              {
                                percentage
                              }
                              % of all
                              reports
                            </p>

                          </div>
                        );
                      }
                    )}

                </div>

              </div>

              {/* TOP PRIORITY */}

              <div className="rounded-3xl bg-[#173f2a] p-6 text-white shadow-sm sm:p-8">

                <p className="text-xs font-bold uppercase tracking-wider text-[#b8d8bd]">
                  Decision Support
                </p>

                <h2 className="mt-3 text-2xl font-bold">
                  Highest priority
                </h2>

                {categories[0] && (

                  <div className="mt-6">

                    <div className="rounded-2xl bg-white/10 p-6">

                      <p className="text-4xl">
                        {
                          categories[0]
                            .icon
                        }
                      </p>

                      <p className="mt-4 text-3xl font-bold">
                        {
                          categories[0]
                            .name
                        }
                      </p>

                      <div className="mt-4 flex items-end gap-2">

                        <span className="text-5xl font-bold">
                          {
                            categories[0]
                              .priority
                          }
                        </span>

                        <span className="mb-2 text-sm text-[#c7dfca]">
                          /100 priority
                        </span>

                      </div>

                      <span
                        className={`mt-4 inline-block rounded-full border px-3 py-1 text-xs font-bold ${
                          categories[0]
                            .level ===
                          "Critical"
                            ? "border-red-300 bg-red-100 text-red-700"
                            : categories[0]
                                .level ===
                              "High"
                            ? "border-orange-300 bg-orange-100 text-orange-700"
                            : "border-white/20 bg-white/10 text-white"
                        }`}
                      >
                        {
                          categories[0]
                            .level
                        }
                      </span>

                    </div>

                    <div className="mt-4 rounded-2xl border border-white/20 p-5">

                      <p className="text-sm font-bold">
                        Recommended action
                      </p>

                      <p className="mt-2 text-sm leading-6 text-[#d7e7d9]">
                        Review{" "}
                        <strong>
                          {
                            categories[0]
                              .name
                          }
                        </strong>{" "}
                        issues first,
                        verify affected
                        locations, and
                        consider this
                        category for
                        priority
                        intervention.
                      </p>

                    </div>

                  </div>

                )}

              </div>

            </div>

            {/* =================================================
                CITIZEN REPORTS
                ================================================= */}

            <div className="mt-8 rounded-3xl border border-[#d9e2da] bg-white p-6 shadow-sm sm:p-8">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                    Citizen Reports
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-[#173f2a]">
                    {selectedCategory ===
                    "All"
                      ? "All community needs"
                      : `${selectedCategory} needs`}
                  </h2>

                </div>

                {selectedCategory !==
                  "All" && (

                  <button
                    onClick={() =>
                      setSelectedCategory(
                        "All"
                      )
                    }
                    className="text-xs font-bold text-[#397149]"
                  >
                    ← Show all
                  </button>

                )}

              </div>

              <div className="mt-6 space-y-3">

                {filteredSubmissions
                  .slice()
                  .reverse()
                  .map(
                    (submission) => {

                      const classification =
                        classifyIssue(
                          submission.issue ||
                            ""
                        );

                      return (
                        <div
                          key={
                            submission.id
                          }
                          className="rounded-2xl border border-[#e1e8e2] bg-[#f8faf8] p-5"
                        >

                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                            <div className="flex gap-4">

                              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white text-xl">
                                {
                                  classification.icon
                                }
                              </div>

                              <div className="min-w-0">

                                <div className="flex flex-wrap items-center gap-2">

                                  <span className="text-sm font-bold text-[#173f2a]">
                                    {
                                      classification.category
                                    }
                                  </span>

                                  <span className="rounded-full bg-[#e9f4ea] px-2 py-1 text-[10px] font-bold text-[#397149]">
                                    {
                                      submission.status ||
                                      "Submitted"
                                    }
                                  </span>

                                  <span className="rounded-full border border-[#d5ded6] bg-white px-2 py-1 text-[10px] font-bold text-[#66736a]">
                                    {
                                      getLanguageLabel(
                                        classification.language
                                      )
                                    }
                                  </span>

                                  {classification.confidence >
                                    0 && (
                                    <span className="rounded-full border border-[#d5ded6] bg-white px-2 py-1 text-[10px] font-bold text-[#66736a]">
                                      {
                                        classification.confidence
                                      }
                                      % match
                                    </span>
                                  )}

                                </div>

                                <p className="mt-3 text-sm leading-6 text-[#39463d]">
                                  {
                                    submission.issue
                                  }
                                </p>

                                <p className="mt-2 text-xs text-[#66736a]">
                                  📍{" "}
                                  {submission.village ||
                                    "Unknown"}
                                  {" • "}
                                  {submission.location ||
                                    "Unknown"}
                                </p>

                                {(submission.district ||
                                  submission.state) && (
                                  <p className="mt-1 text-xs font-semibold text-[#397149]">
                                    🇮🇳{" "}
                                    {submission.district ||
                                      ""}
                                    {submission.district &&
                                    submission.state
                                      ? ", "
                                      : ""}
                                    {submission.state ||
                                      ""}
                                    {submission.pincode
                                      ? ` • PIN ${submission.pincode}`
                                      : ""}
                                  </p>
                                )}

                                {classification
                                  .matchedKeywords
                                  .length >
                                  0 && (
                                  <p className="mt-2 text-[11px] text-[#7b877f]">
                                    Detected:
                                    {" "}
                                    {classification.matchedKeywords
                                      .slice(
                                        0,
                                        3
                                      )
                                      .join(
                                        ", "
                                      )}
                                  </p>
                                )}

                              </div>

                            </div>

                            <p className="text-xs font-bold text-[#397149]">
                              {
                                submission.id
                              }
                            </p>

                          </div>

                        </div>
                      );
                    }
                  )}

              </div>

            </div>

            {/* =================================================
                HOW IT WORKS
                ================================================= */}

            <div className="mt-8 rounded-3xl border border-[#d9e2da] bg-white p-6 shadow-sm sm:p-8">

              <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                People's Priorities
              </p>

              <h2 className="mt-2 text-2xl font-bold text-[#173f2a]">
                From citizen voice to action
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-5">

                <div className="rounded-2xl bg-[#f8faf8] p-5">
                  <div className="text-2xl">
                    🗣️
                  </div>

                  <p className="mt-3 text-sm font-bold text-[#173f2a]">
                    1. Collect
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[#66736a]">
                    Citizens report
                    problems in
                    their own
                    language.
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8faf8] p-5">
                  <div className="text-2xl">
                    📷
                  </div>

                  <p className="mt-3 text-sm font-bold text-[#173f2a]">
                    2. Evidence
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[#66736a]">
                    Photos provide
                    supporting
                    evidence.
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8faf8] p-5">
                  <div className="text-2xl">
                    🧠
                  </div>

                  <p className="mt-3 text-sm font-bold text-[#173f2a]">
                    3. Understand
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[#66736a]">
                    English, Hindi
                    and Odia
                    issues are
                    classified.
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8faf8] p-5">
                  <div className="text-2xl">
                    📊
                  </div>

                  <p className="mt-3 text-sm font-bold text-[#173f2a]">
                    4. Score
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[#66736a]">
                    Transparent
                    factors create
                    a priority
                    score.
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8faf8] p-5">
                  <div className="text-2xl">
                    🎯
                  </div>

                  <p className="mt-3 text-sm font-bold text-[#173f2a]">
                    5. Prioritise
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[#66736a]">
                    Decision-makers
                    see where
                    attention is
                    needed.
                  </p>
                </div>

              </div>

            </div>

          </>

        )}

      </section>

    </main>
  );
}