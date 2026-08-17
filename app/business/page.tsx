"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  buildBusinessCategories,
  formatCrores,
  optimizeBudget,
  readCitizenSubmissions,
  type BusinessCategory,
  type BusinessSubmission,
} from "@/lib/businessData";

const MIN_BUDGET_CR = 1;
const MAX_BUDGET_CR = 100;
const DEFAULT_BUDGET_CR = 10;

function formatNumber(value: number) {
  return value.toLocaleString("en-IN");
}

function getLevelStyle(
  level: BusinessCategory["level"]
) {
  switch (level) {
    case "Critical":
      return "border-red-200 bg-red-50 text-red-700";

    case "High":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "Medium":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";

    default:
      return "border-green-200 bg-green-50 text-green-700";
  }
}

function getBarWidth(value: number) {
  return `${Math.min(100, Math.max(0, value))}%`;
}

export default function BusinessPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin-auth-token");
    if (!token) {
      router.replace("/login?redirect=/business");
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  const [submissions, setSubmissions] =
    useState<BusinessSubmission[]>([]);

  const [budgetCr, setBudgetCr] =
    useState(DEFAULT_BUDGET_CR);

  const loadData = () => {
    setSubmissions(readCitizenSubmissions());
  };

  /*
   * =========================================================
   * LOAD REAL CITIZEN DATA
   * =========================================================
   */

  useEffect(() => {
    loadData();

    const handleStorage = (
      event: StorageEvent
    ) => {
      if (
        event.key ===
        "peoples-priorities-submissions"
      ) {
        loadData();
      }
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      loadData();
    };

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, []);

  /*
   * =========================================================
   * BUILD REAL BUSINESS CATEGORIES
   * =========================================================
   */

  const categories = useMemo(
    () =>
      buildBusinessCategories(
        submissions
      ),
    [submissions]
  );

  /*
   * =========================================================
   * BUDGET
   * =========================================================
   */

  const budgetRupees =
    budgetCr * 10000000;

  const allocations = useMemo(
    () =>
      optimizeBudget(
        categories,
        budgetRupees
      ),
    [categories, budgetRupees]
  );

  const totalAllocated =
    allocations.reduce(
      (total, item) =>
        total + item.allocation,
      0
    );

  const remaining = Math.max(
    0,
    budgetRupees - totalAllocated
  );

  /*
   * =========================================================
   * REAL DATA METRICS
   * =========================================================
   */

  const totalReports =
    submissions.length;

  const evidenceReports =
    submissions.filter(
      (submission) =>
        Array.isArray(
          submission.photos
        ) &&
        submission.photos.length > 0
    ).length;

  const uniqueLocations =
    useMemo(() => {
      const locations =
        new Set<string>();

      submissions.forEach(
        (submission) => {
          const location =
            submission.village?.trim() ||
            submission.location?.trim() ||
            submission.pincode?.trim() ||
            submission.district?.trim();

          if (location) {
            locations.add(
              location.toLowerCase()
            );
          }
        }
      );

      return locations.size;
    }, [submissions]);

  /*
   * =========================================================
   * HIGHEST PRIORITY
   * =========================================================
   */

  const highestPriority =
    allocations[0] || null;

  /*
   * =========================================================
   * TOTAL PRIORITY
   * =========================================================
   */

  const totalPriority =
    categories.reduce(
      (total, category) =>
        total + category.priority,
      0
    );

  /*
   * =========================================================
   * PRIORITY ALIGNMENT INDEX
   *
   * Not economic ROI.
   * =========================================================
   */

  const priorityAlignment =
    allocations.length > 0
      ? Math.round(
          allocations.reduce(
            (total, item) =>
              total + item.benefitIndex,
            0
          )
        )
      : 0;

  /*
   * =========================================================
   * DYNAMIC INSIGHTS
   * =========================================================
   */

  const insights = useMemo(() => {
    if (categories.length === 0) {
      return [];
    }

    const result: string[] = [];

    const top = categories[0];

    if (top) {
      result.push(
        `${top.icon} ${top.name} currently has the highest planning priority with a score of ${top.priority}/100.`
      );
    }

    const highestDemand =
      [...categories].sort(
        (a, b) =>
          b.reports - a.reports
      )[0];

    if (highestDemand) {
      result.push(
        `📈 ${highestDemand.name} represents ${highestDemand.percentage}% of all citizen reports.`
      );
    }

    const highestEvidence =
      [...categories].sort(
        (a, b) =>
          b.evidence - a.evidence
      )[0];

    if (
      highestEvidence &&
      highestEvidence.evidence > 0
    ) {
      result.push(
        `📷 ${highestEvidence.name} has the strongest evidence coverage at ${highestEvidence.evidence}%.`
      );
    }

    const highestRecent =
      [...categories].sort(
        (a, b) =>
          b.recentReports -
          a.recentReports
      )[0];

    if (
      highestRecent &&
      highestRecent.recentReports > 0
    ) {
      result.push(
        `🕒 ${highestRecent.name} has the highest number of reports from the last 30 days (${highestRecent.recentReports}).`
      );
    }

    if (highestPriority) {
      result.push(
        `💰 With a ₹${budgetCr} Cr planning budget, approximately ${highestPriority.allocationPercentage.toFixed(
          1
        )}% is currently recommended for ${highestPriority.name}.`
      );
    }

    result.push(
      `🛡️ All demand figures on this page are calculated from the citizen submissions currently stored by the platform.`
    );

    return result;
  }, [
    categories,
    budgetCr,
    highestPriority,
  ]);

  /*
   * =========================================================
   * WHAT-IF BUDGETS
   * =========================================================
   */

  const whatIfBudgets = [5, 10, 20, 50];

  /*
   * =========================================================
   * NO DATA
   * =========================================================
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

  if (submissions.length === 0) {
    return (
      <main className="min-h-screen bg-[#f5f7f4] text-[#17221b]">

        <header className="border-b border-[#dce3dc] bg-white">

          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">

            <div>
              <a
                href="/"
                className="text-sm font-bold tracking-[0.18em] text-[#173f2a]"
              >
                PEOPLE'S PRIORITIES
              </a>

              <p className="mt-1 text-xs text-[#66736a]">
                Government Planning & Business Intelligence
              </p>
            </div>

            <a
              href="/citizen"
              className="rounded-full bg-[#173f2a] px-5 py-2 text-xs font-bold text-white"
            >
              + Citizen
            </a>

          </div>

        </header>

        <section className="mx-auto max-w-4xl px-5 py-16 sm:px-8">

          <div className="rounded-[2rem] border-2 border-dashed border-[#cbd8cd] bg-white p-12 text-center">

            <div className="text-6xl">
              📊
            </div>

            <h1 className="mt-5 text-3xl font-bold text-[#173f2a]">
              No citizen data available
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#66736a]">
              The Business Intelligence module uses
              actual citizen submissions. Submit a
              community need first and return here to
              generate the planning analysis.
            </p>

            <a
              href="/citizen"
              className="mt-7 inline-block rounded-2xl bg-[#173f2a] px-7 py-4 text-sm font-bold text-white"
            >
              + Submit a Community Need
            </a>

          </div>

        </section>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7f4] text-[#17221b]">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="border-b border-[#dce3dc] bg-white">

        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">

          <div>

            <a
              href="/"
              className="text-sm font-bold tracking-[0.18em] text-[#173f2a]"
            >
              PEOPLE'S PRIORITIES
            </a>

            <p className="mt-1 text-xs text-[#66736a]">
              Government Planning & Business Intelligence
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <a
              href="/dashboard"
              className="rounded-full border border-[#397149] bg-white px-4 py-2 text-xs font-bold text-[#397149] hover:bg-[#f0f8f1]"
            >
              📊 Dashboard
            </a>

            <a
              href="/admin"
              className="rounded-full border border-[#397149] bg-white px-4 py-2 text-xs font-bold text-[#397149] hover:bg-[#f0f8f1]"
            >
              🛠 Admin
            </a>

            <a
              href="/citizen"
              className="rounded-full bg-[#173f2a] px-4 py-2 text-xs font-bold text-white hover:bg-[#0f2f1e]"
            >
              + Citizen
            </a>

            <button
              type="button"
              onClick={loadData}
              className="rounded-full border border-[#397149] bg-white px-4 py-2 text-xs font-bold text-[#397149] hover:bg-[#f0f8f1]"
            >
              ↻ Refresh
            </button>

          </div>

        </div>

      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">

        {/* ===================================================
            TITLE
        =================================================== */}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#397149]">
              Decision Support
            </p>

            <h1 className="mt-3 text-3xl font-bold text-[#173f2a] sm:text-5xl">
              Budget & Development Optimizer
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#66736a]">
              Transform actual citizen reports into
              transparent development priorities,
              budget recommendations and planning
              insights.
            </p>

          </div>

          <div className="rounded-2xl border border-[#cfe0d1] bg-white px-5 py-4">

            <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
              DATA SOURCE
            </p>

            <p className="mt-1 text-sm font-bold text-[#397149]">
              Live citizen submissions
            </p>

          </div>

        </div>

        {/* ===================================================
            SUMMARY CARDS
        =================================================== */}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-[#d9e2da] bg-white p-5 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
              Citizen Reports
            </p>

            <p className="mt-3 text-4xl font-bold text-[#173f2a]">
              {formatNumber(totalReports)}
            </p>

            <p className="mt-2 text-xs text-[#66736a]">
              Actual submissions
            </p>

          </div>

          <div className="rounded-2xl border border-[#d9e2da] bg-white p-5 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
              Categories
            </p>

            <p className="mt-3 text-4xl font-bold text-[#173f2a]">
              {categories.length}
            </p>

            <p className="mt-2 text-xs text-[#66736a]">
              Detected from reports
            </p>

          </div>

          <div className="rounded-2xl border border-[#d9e2da] bg-white p-5 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
              Locations
            </p>

            <p className="mt-3 text-4xl font-bold text-[#173f2a]">
              {uniqueLocations}
            </p>

            <p className="mt-2 text-xs text-[#66736a]">
              Reported areas
            </p>

          </div>

          <div className="rounded-2xl border border-[#d9e2da] bg-white p-5 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
              Evidence Reports
            </p>

            <p className="mt-3 text-4xl font-bold text-[#397149]">
              {evidenceReports}
            </p>

            <p className="mt-2 text-xs text-[#66736a]">
              Reports with photographs
            </p>

          </div>

        </div>

        {/* ===================================================
            BUDGET CONTROL
        =================================================== */}

        <div className="mt-8 rounded-[2rem] border border-[#cfe0d1] bg-white p-6 shadow-sm sm:p-8">

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

            <div>

              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#397149]">
                Government Budget Controller
              </p>

              <h2 className="mt-2 text-2xl font-bold text-[#173f2a]">
                Dynamically allocate development funds
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736a]">
                Move the slider. Every allocation,
                graph and planning insight updates
                automatically.
              </p>

            </div>

            <div className="rounded-2xl bg-[#173f2a] px-6 py-4 text-white">

              <p className="text-xs font-semibold text-white/70">
                AVAILABLE BUDGET
              </p>

              <p className="mt-1 text-3xl font-bold">
                ₹{budgetCr} Cr
              </p>

            </div>

          </div>

          <div className="mt-8">

            <div className="flex justify-between text-xs font-bold text-[#66736a]">

              <span>
                ₹{MIN_BUDGET_CR} Cr
              </span>

              <span>
                ₹{MAX_BUDGET_CR} Cr
              </span>

            </div>

            <input
              type="range"
              min={MIN_BUDGET_CR}
              max={MAX_BUDGET_CR}
              step={1}
              value={budgetCr}
              onChange={(event) =>
                setBudgetCr(
                  Number(event.target.value)
                )
              }
              className="mt-4 h-3 w-full cursor-pointer appearance-none rounded-full bg-[#dce6de] accent-[#173f2a]"
            />

            <div className="mt-4 flex flex-wrap gap-2">

              {[5, 10, 20, 30, 50].map(
                (value) => (

                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setBudgetCr(value)
                    }
                    className={`rounded-full px-4 py-2 text-xs font-bold ${
                      budgetCr === value
                        ? "bg-[#173f2a] text-white"
                        : "border border-[#cbd8cd] bg-white text-[#397149]"
                    }`}
                  >
                    ₹{value} Cr
                  </button>

                )
              )}

            </div>

          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">

            <div className="rounded-2xl bg-[#f5faf5] p-5">

              <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
                Planning Budget
              </p>

              <p className="mt-2 text-2xl font-bold text-[#173f2a]">
                {formatCrores(
                  budgetRupees
                )}
              </p>

            </div>

            <div className="rounded-2xl bg-[#f5faf5] p-5">

              <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
                Recommended Allocation
              </p>

              <p className="mt-2 text-2xl font-bold text-[#397149]">
                {formatCrores(
                  totalAllocated
                )}
              </p>

            </div>

            <div className="rounded-2xl bg-[#f5faf5] p-5">

              <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
                Remaining
              </p>

              <p className="mt-2 text-2xl font-bold text-[#173f2a]">
                {formatCrores(
                  remaining
                )}
              </p>

            </div>

          </div>

        </div>

        {/* ===================================================
            HIGHEST PRIORITY
        =================================================== */}

        {highestPriority && (

          <div className="mt-8 rounded-[2rem] bg-[#173f2a] p-6 text-white sm:p-8">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">
                  Highest Current Priority
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  {highestPriority.icon}{" "}
                  {highestPriority.name}
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
                  Based on the platform's transparent
                  demand, severity, geography, evidence
                  and recency calculation.
                </p>

              </div>

              <div className="rounded-2xl bg-white/10 p-6 text-center">

                <p className="text-4xl font-bold">
                  {highestPriority.priority}
                </p>

                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/60">
                  Priority / 100
                </p>

              </div>

            </div>

          </div>

        )}

        {/* ===================================================
            DYNAMIC GRAPHS
        =================================================== */}

        <div className="mt-8">

          <div>

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#397149]">
              Live Analytics
            </p>

            <h2 className="mt-2 text-3xl font-bold text-[#173f2a]">
              Dynamic graphs & insights
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66736a]">
              These visualisations are calculated directly
              from current citizen submissions and the
              selected government budget.
            </p>

          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">

            {/* =============================================
                DEMAND GRAPH
            ============================================= */}

            <div className="rounded-3xl border border-[#d9e2da] bg-white p-6 shadow-sm sm:p-8">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                    Citizen Demand
                  </p>

                  <h3 className="mt-2 text-xl font-bold text-[#173f2a]">
                    Reports by category
                  </h3>

                </div>

                <span className="rounded-full bg-[#f0f8f1] px-3 py-2 text-xs font-bold text-[#397149]">
                  {totalReports} reports
                </span>

              </div>

              <div className="mt-7 space-y-5">

                {categories.map(
                  (category) => (

                    <div
                      key={category.name}
                    >

                      <div className="flex items-center justify-between gap-4">

                        <div className="flex min-w-0 items-center gap-2">

                          <span>
                            {category.icon}
                          </span>

                          <span className="truncate text-sm font-bold text-[#173f2a]">
                            {category.name}
                          </span>

                        </div>

                        <span className="shrink-0 text-sm font-bold text-[#397149]">
                          {category.reports}
                        </span>

                      </div>

                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#e7ece8]">

                        <div
                          className="h-full rounded-full bg-[#397149] transition-all duration-500"
                          style={{
                            width:
                              getBarWidth(
                                category.percentage
                              ),
                          }}
                        />

                      </div>

                      <div className="mt-1 flex justify-between text-[10px] text-[#66736a]">

                        <span>
                          {category.percentage}% of reports
                        </span>

                        <span>
                          {category.locations} locations
                        </span>

                      </div>

                    </div>

                  )
                )}

              </div>

            </div>

            {/* =============================================
                BUDGET GRAPH
            ============================================= */}

            <div className="rounded-3xl border border-[#d9e2da] bg-white p-6 shadow-sm sm:p-8">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                    Budget Allocation
                  </p>

                  <h3 className="mt-2 text-xl font-bold text-[#173f2a]">
                    ₹{budgetCr} Cr portfolio
                  </h3>

                </div>

                <span className="rounded-full bg-[#f0f8f1] px-3 py-2 text-xs font-bold text-[#397149]">
                  Live
                </span>

              </div>

              <div className="mt-7 space-y-5">

                {allocations.map(
                  (item) => (

                    <div
                      key={item.name}
                    >

                      <div className="flex items-center justify-between gap-4">

                        <div className="flex min-w-0 items-center gap-2">

                          <span>
                            {item.icon}
                          </span>

                          <span className="truncate text-sm font-bold text-[#173f2a]">
                            {item.name}
                          </span>

                        </div>

                        <span className="shrink-0 text-sm font-bold text-[#397149]">
                          {formatCrores(
                            item.allocation
                          )}
                        </span>

                      </div>

                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#e7ece8]">

                        <div
                          className="h-full rounded-full bg-[#173f2a] transition-all duration-500"
                          style={{
                            width:
                              getBarWidth(
                                item.allocationPercentage
                              ),
                          }}
                        />

                      </div>

                      <div className="mt-1 flex justify-between text-[10px] text-[#66736a]">

                        <span>
                          {item.allocationPercentage.toFixed(
                            1
                          )}
                          % of budget
                        </span>

                        <span>
                          Priority {item.priority}/100
                        </span>

                      </div>

                    </div>

                  )
                )}

              </div>

            </div>

            {/* =============================================
                PRIORITY GRAPH
            ============================================= */}

            <div className="rounded-3xl border border-[#d9e2da] bg-white p-6 shadow-sm sm:p-8">

              <div>

                <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                  Priority Analysis
                </p>

                <h3 className="mt-2 text-xl font-bold text-[#173f2a]">
                  Priority vs demand
                </h3>

              </div>

              <div className="mt-7 space-y-6">

                {categories.map(
                  (category) => (

                    <div
                      key={category.name}
                    >

                      <div className="flex items-center justify-between">

                        <span className="text-sm font-bold text-[#173f2a]">
                          {category.icon}{" "}
                          {category.name}
                        </span>

                        <span className="text-xs font-bold text-[#397149]">
                          {category.priority}/100
                        </span>

                      </div>

                      <div className="relative mt-3 h-5 overflow-hidden rounded-full bg-[#edf0ed]">

                        <div
                          className="absolute left-0 top-0 h-full rounded-full bg-[#397149]"
                          style={{
                            width:
                              getBarWidth(
                                category.priority
                              ),
                          }}
                        />

                        <div
                          className="absolute left-0 top-0 h-full border-r-2 border-[#173f2a]"
                          style={{
                            width:
                              getBarWidth(
                                category.percentage
                              ),
                          }}
                        />

                      </div>

                      <div className="mt-2 flex justify-between text-[10px] text-[#66736a]">

                        <span>
                          Demand: {category.percentage}%
                        </span>

                        <span>
                          Priority: {category.priority}
                        </span>

                      </div>

                    </div>

                  )
                )}

              </div>

              <div className="mt-6 rounded-2xl bg-[#f5faf5] p-4">

                <p className="text-xs leading-5 text-[#66736a]">
                  <strong className="text-[#173f2a]">
                    Reading this graph:
                  </strong>{" "}
                  the green bar represents the calculated
                  priority score. The marker represents the
                  category's share of citizen reports.
                </p>

              </div>

            </div>

            {/* =============================================
                EVIDENCE / RECENCY GRAPH
            ============================================= */}

            <div className="rounded-3xl border border-[#d9e2da] bg-white p-6 shadow-sm sm:p-8">

              <div>

                <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                  Evidence & Recency
                </p>

                <h3 className="mt-2 text-xl font-bold text-[#173f2a]">
                  Strength of current signals
                </h3>

              </div>

              <div className="mt-7 space-y-6">

                {categories.map(
                  (category) => (

                    <div
                      key={category.name}
                    >

                      <div className="flex items-center justify-between">

                        <span className="text-sm font-bold text-[#173f2a]">
                          {category.icon}{" "}
                          {category.name}
                        </span>

                        <span className="text-xs text-[#66736a]">
                          {category.recentReports} recent
                        </span>

                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">

                        <div>

                          <div className="flex justify-between text-[10px] font-bold text-[#66736a]">

                            <span>
                              Evidence
                            </span>

                            <span>
                              {category.evidence}%
                            </span>

                          </div>

                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e7ece8]">

                            <div
                              className="h-full rounded-full bg-[#397149]"
                              style={{
                                width:
                                  getBarWidth(
                                    category.evidence
                                  ),
                              }}
                            />

                          </div>

                        </div>

                        <div>

                          <div className="flex justify-between text-[10px] font-bold text-[#66736a]">

                            <span>
                              Recency
                            </span>

                            <span>
                              {category.reports > 0
                                ? Math.round(
                                    (category.recentReports /
                                      category.reports) *
                                      100
                                  )
                                : 0}
                              %
                            </span>

                          </div>

                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e7ece8]">

                            <div
                              className="h-full rounded-full bg-[#173f2a]"
                              style={{
                                width:
                                  getBarWidth(
                                    category.reports >
                                      0
                                      ? Math.round(
                                          (category.recentReports /
                                            category.reports) *
                                            100
                                        )
                                      : 0
                                  ),
                              }}
                            />

                          </div>

                        </div>

                      </div>

                    </div>

                  )
                )}

              </div>

            </div>

          </div>

        </div>

        {/* ===================================================
            DYNAMIC INSIGHTS
        =================================================== */}

        <div className="mt-8 rounded-[2rem] border border-[#cfe0d1] bg-[#f0f8f1] p-6 sm:p-8">

          <div className="flex flex-col gap-5 sm:flex-row">

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#173f2a] text-2xl text-white">
              💡
            </div>

            <div className="flex-1">

              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#397149]">
                Dynamic Planning Insights
              </p>

              <h2 className="mt-2 text-2xl font-bold text-[#173f2a]">
                What the current data says
              </h2>

              <div className="mt-6 grid gap-3">

                {insights.map(
                  (insight, index) => (

                    <div
                      key={`${insight}-${index}`}
                      className="rounded-2xl bg-white p-4"
                    >
                      <p className="text-sm leading-6 text-[#39463d]">
                        {insight}
                      </p>
                    </div>

                  )
                )}

              </div>

            </div>

          </div>

        </div>

        {/* ===================================================
            OPTIMIZED PORTFOLIO
        =================================================== */}

        <div className="mt-10">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#397149]">
                Optimized Portfolio
              </p>

              <h2 className="mt-2 text-3xl font-bold text-[#173f2a]">
                Recommended investment allocation
              </h2>

            </div>

            <div className="rounded-full border border-[#cfe0d1] bg-white px-4 py-2 text-xs font-bold text-[#397149]">
              {categories.length} active categories
            </div>

          </div>

          <div className="mt-6 space-y-4">

            {allocations.map(
              (item, index) => (

                <div
                  key={item.name}
                  className="rounded-3xl border border-[#d9e2da] bg-white p-5 shadow-sm sm:p-6"
                >

                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center">

                    <div className="flex min-w-0 flex-1 items-center gap-4">

                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f0f8f1] text-2xl">
                        {item.icon}
                      </div>

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <span className="text-xs font-bold text-[#397149]">
                            #{index + 1}
                          </span>

                          <h3 className="text-lg font-bold text-[#173f2a]">
                            {item.name}
                          </h3>

                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] font-bold ${getLevelStyle(
                              item.level
                            )}`}
                          >
                            {item.level}
                          </span>

                        </div>

                        <p className="mt-1 text-xs text-[#66736a]">
                          {item.reports} citizen report
                          {item.reports === 1
                            ? ""
                            : "s"}{" "}
                          • {item.locations} location
                          {item.locations === 1
                            ? ""
                            : "s"}
                        </p>

                      </div>

                    </div>

                    <div className="lg:w-72">

                      <div className="flex items-end justify-between">

                        <div>

                          <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
                            Recommended
                          </p>

                          <p className="mt-1 text-2xl font-bold text-[#173f2a]">
                            {formatCrores(
                              item.allocation
                            )}
                          </p>

                        </div>

                        <p className="text-sm font-bold text-[#397149]">
                          {item.allocationPercentage.toFixed(
                            1
                          )}
                          %
                        </p>

                      </div>

                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#e5ebe6]">

                        <div
                          className="h-full rounded-full bg-[#397149] transition-all duration-300"
                          style={{
                            width:
                              getBarWidth(
                                item.allocationPercentage
                              ),
                          }}
                        />

                      </div>

                    </div>

                  </div>

                  <div className="mt-5 grid gap-3 border-t border-[#e5eae5] pt-5 sm:grid-cols-4">

                    <div className="rounded-xl bg-[#f8faf8] p-4">

                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#66736a]">
                        Priority
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#173f2a]">
                        {item.priority}/100
                      </p>

                    </div>

                    <div className="rounded-xl bg-[#f8faf8] p-4">

                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#66736a]">
                        Demand
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#173f2a]">
                        {item.percentage}%
                      </p>

                    </div>

                    <div className="rounded-xl bg-[#f8faf8] p-4">

                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#66736a]">
                        Evidence
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#173f2a]">
                        {item.evidence}%
                      </p>

                    </div>

                    <div className="rounded-xl bg-[#f8faf8] p-4">

                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#66736a]">
                        Recent
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#173f2a]">
                        {item.recentReports}
                      </p>

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        </div>

        {/* ===================================================
            WHAT-IF ANALYSIS
        =================================================== */}

        <div className="mt-10 rounded-3xl border border-[#d9e2da] bg-white p-6 shadow-sm sm:p-8">

          <div>

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#397149]">
              Scenario Analysis
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#173f2a]">
              What happens at different budget levels?
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66736a]">
              These scenarios use the same citizen-derived
              priority weights. They do not introduce
              artificial demand or assumed project costs.
            </p>

          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {whatIfBudgets.map(
              (scenarioBudget) => {

                const scenario =
                  optimizeBudget(
                    categories,
                    scenarioBudget *
                      10000000
                  );

                const topScenario =
                  scenario[0];

                return (

                  <button
                    key={scenarioBudget}
                    type="button"
                    onClick={() =>
                      setBudgetCr(
                        scenarioBudget
                      )
                    }
                    className={`rounded-2xl border p-5 text-left transition ${
                      budgetCr ===
                      scenarioBudget
                        ? "border-[#397149] bg-[#f0f8f1]"
                        : "border-[#d9e2da] bg-[#fafcfa] hover:border-[#397149]"
                    }`}
                  >

                    <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
                      Scenario
                    </p>

                    <p className="mt-2 text-2xl font-bold text-[#173f2a]">
                      ₹{scenarioBudget} Cr
                    </p>

                    {topScenario && (

                      <div className="mt-4">

                        <p className="text-xs text-[#66736a]">
                          Highest allocation
                        </p>

                        <p className="mt-1 text-sm font-bold text-[#397149]">
                          {topScenario.icon}{" "}
                          {topScenario.name}
                        </p>

                        <p className="mt-1 text-xs text-[#66736a]">
                          {formatCrores(
                            topScenario.allocation
                          )}
                        </p>

                      </div>

                    )}

                  </button>

                );
              }
            )}

          </div>

        </div>

        {/* ===================================================
            PLANNING SUMMARY
        =================================================== */}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">

          <div className="rounded-3xl border border-[#d9e2da] bg-white p-6 sm:p-8">

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#397149]">
              Decision Logic
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#173f2a]">
              How the portfolio is calculated
            </h2>

            <div className="mt-6 space-y-5">

              <div className="flex gap-4">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e9f4ea] font-bold text-[#397149]">
                  1
                </div>

                <div>

                  <p className="font-bold text-[#173f2a]">
                    Citizen demand — 35%
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#66736a]">
                    More citizen reports increase the
                    category's demand component.
                  </p>

                </div>

              </div>

              <div className="flex gap-4">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e9f4ea] font-bold text-[#397149]">
                  2
                </div>

                <div>

                  <p className="font-bold text-[#173f2a]">
                    Category severity — 20%
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#66736a]">
                    The existing category severity
                    weights contribute to prioritisation.
                  </p>

                </div>

              </div>

              <div className="flex gap-4">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e9f4ea] font-bold text-[#397149]">
                  3
                </div>

                <div>

                  <p className="font-bold text-[#173f2a]">
                    Geographic spread — 15%
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#66736a]">
                    Reports appearing across different
                    locations increase the geographic signal.
                  </p>

                </div>

              </div>

              <div className="flex gap-4">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e9f4ea] font-bold text-[#397149]">
                  4
                </div>

                <div>

                  <p className="font-bold text-[#173f2a]">
                    Evidence + recency — 30%
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#66736a]">
                    Reports containing evidence and reports
                    from the last 30 days contribute to the
                    current planning signal.
                  </p>

                </div>

              </div>

            </div>

          </div>

          <div className="rounded-3xl border border-[#cfe0d1] bg-[#f0f8f1] p-6 sm:p-8">

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#397149]">
              Planning Summary
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#173f2a]">
              Current portfolio
            </h2>

            <div className="mt-6 space-y-4">

              <div className="flex items-center justify-between border-b border-[#d5e3d7] pb-4">

                <span className="text-sm text-[#66736a]">
                  Available budget
                </span>

                <strong className="text-[#173f2a]">
                  {formatCrores(
                    budgetRupees
                  )}
                </strong>

              </div>

              <div className="flex items-center justify-between border-b border-[#d5e3d7] pb-4">

                <span className="text-sm text-[#66736a]">
                  Recommended allocation
                </span>

                <strong className="text-[#397149]">
                  {formatCrores(
                    totalAllocated
                  )}
                </strong>

              </div>

              <div className="flex items-center justify-between border-b border-[#d5e3d7] pb-4">

                <span className="text-sm text-[#66736a]">
                  Categories funded
                </span>

                <strong className="text-[#173f2a]">
                  {allocations.length}
                </strong>

              </div>

              <div className="flex items-center justify-between border-b border-[#d5e3d7] pb-4">

                <span className="text-sm text-[#66736a]">
                  Total priority points
                </span>

                <strong className="text-[#173f2a]">
                  {totalPriority}
                </strong>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-sm text-[#66736a]">
                  Priority alignment index
                </span>

                <strong className="text-2xl text-[#397149]">
                  {priorityAlignment}
                </strong>

              </div>

            </div>

            <div className="mt-6 rounded-2xl bg-white p-4">

              <p className="text-xs leading-6 text-[#66736a]">

                <strong className="text-[#173f2a]">
                  Important:
                </strong>{" "}
                The priority alignment index is an internal
                planning metric. It is not an economic ROI
                prediction and does not claim actual project
                costs, savings or financial returns.

              </p>

            </div>

          </div>

        </div>

        {/* ===================================================
            DATA INTEGRITY
        =================================================== */}

        <div className="mt-8 rounded-3xl border border-[#cfe0d1] bg-white p-6 sm:p-8">

          <div className="flex flex-col gap-5 sm:flex-row">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#173f2a] text-xl text-white">
              🛡️
            </div>

            <div>

              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#397149]">
                DATA INTEGRITY
              </p>

              <h2 className="mt-2 text-xl font-bold text-[#173f2a]">
                No fabricated citizen demand
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66736a]">
                Report counts, locations, evidence,
                category demand and recency are calculated
                from the citizen submissions currently stored
                by the platform. The budget optimizer only
                changes how the selected budget is distributed;
                it does not manufacture citizen reports.
              </p>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}