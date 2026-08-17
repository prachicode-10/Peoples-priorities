"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  classifyIssue,
  type IssueCategory,
} from "@/lib/issueClassifier";

import BusinessPage from "@/app/business/page";

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
  verifiedAreas?: string[];

  issue?: string;
  photos?: string[];

  status?: string;

  voiceLanguage?: string;
  writingLanguages?: Record<string, string>;

  /*
   * REAL BROWSER LOCATION
   */
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  locationCapturedAt?: string;
};

const STORAGE_KEY =
  "peoples-priorities-submissions";

const STATUS_OPTIONS = [
  "Submitted",
  "Under Review",
  "Verified",
  "Resolved",
] as const;

type Status =
  (typeof STATUS_OPTIONS)[number];

/*
 * =========================================================
 * STATUS COLOR
 * =========================================================
 */

function getStatusColor(status?: string) {
  switch (status) {
    case "Verified":
      return "border-green-200 bg-green-100 text-green-700";

    case "Resolved":
      return "border-blue-200 bg-blue-100 text-blue-700";

    case "Under Review":
      return "border-yellow-200 bg-yellow-100 text-yellow-700";

    default:
      return "border-gray-200 bg-gray-100 text-gray-700";
  }
}

/*
 * =========================================================
 * PRIORITY COLOR
 * =========================================================
 */

function getPriorityColor(
  category: IssueCategory
) {
  switch (category) {
    case "Healthcare":
    case "Flooding":
    case "Safety":
      return "bg-red-100 text-red-700";

    case "Water & Sanitation":
    case "Electricity":
      return "bg-orange-100 text-orange-700";

    case "Roads & Transport":
    case "Waste Management":
      return "bg-yellow-100 text-yellow-700";

    default:
      return "bg-green-100 text-green-700";
  }
}

/*
 * =========================================================
 * DATE
 * =========================================================
 */

function formatDate(date?: string) {
  if (!date) {
    return "Unknown date";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/*
 * =========================================================
 * STATUS
 * =========================================================
 */

function normalizeStatus(
  status?: string
): Status {
  if (
    STATUS_OPTIONS.includes(
      status as Status
    )
  ) {
    return status as Status;
  }

  return "Submitted";
}

/*
 * =========================================================
 * VALID GPS CHECK
 * =========================================================
 */

function hasValidCoordinates(
  submission?: Submission | null
) {
  if (!submission) {
    return false;
  }

  return (
    typeof submission.latitude === "number" &&
    Number.isFinite(submission.latitude) &&
    typeof submission.longitude === "number" &&
    Number.isFinite(submission.longitude) &&
    submission.latitude >= -90 &&
    submission.latitude <= 90 &&
    submission.longitude >= -180 &&
    submission.longitude <= 180
  );
}

/*
 * =========================================================
 * GOOGLE MAP URL
 *
 * Used only for navigation from the admin portal.
 * =========================================================
 */

function getGoogleMapsUrl(
  latitude: number,
  longitude: number
) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

/*
 * =========================================================
 * OPENSTREETMAP EMBED URL
 *
 * No API key required.
 * =========================================================
 */

function getOpenStreetMapEmbedUrl(
  latitude: number,
  longitude: number
) {
  const delta = 0.01;

  const left = longitude - delta;
  const right = longitude + delta;
  const top = latitude + delta;
  const bottom = latitude - delta;

  return (
    `https://www.openstreetmap.org/export/embed.html?` +
    `bbox=${left},${bottom},${right},${top}` +
    `&layer=mapnik` +
    `&marker=${latitude},${longitude}`
  );
}

/*
 * =========================================================
 * ADMIN PAGE
 * =========================================================
 */

export default function AdminPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin-auth-token");
    if (!token) {
      router.replace("/login?redirect=/admin");
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  const [
    submissions,
    setSubmissions,
  ] = useState<Submission[]>([]);

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState("All");

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("All");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selectedSubmission,
    setSelectedSubmission,
  ] = useState<Submission | null>(
    null
  );

  const [showBusinessAnalysis, setShowBusinessAnalysis] =
    useState(false);

  /*
   * =======================================================
   * LOAD SUBMISSIONS
   * =======================================================
   */

  const loadSubmissions =
    useCallback(() => {
      try {
        const saved =
          localStorage.getItem(
            STORAGE_KEY
          );

        if (!saved) {
          setSubmissions([]);
          return;
        }

        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setSubmissions(parsed);
        } else {
          setSubmissions([]);
        }
      } catch (error) {
        console.error(
          "Could not load submissions:",
          error
        );

        setSubmissions([]);
      }
    }, []);

  /*
   * =======================================================
   * INITIAL LOAD + CROSS TAB SYNC
   * =======================================================
   */

  useEffect(() => {
    loadSubmissions();

    const handleStorageChange = (
      event: StorageEvent
    ) => {
      if (event.key === STORAGE_KEY) {
        loadSubmissions();
      }
    };

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, [loadSubmissions]);

  /*
   * =======================================================
   * REFRESH WHEN ADMIN WINDOW BECOMES ACTIVE
   * =======================================================
   */

  useEffect(() => {
    const handleFocus = () => {
      loadSubmissions();
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
  }, [loadSubmissions]);

  /*
   * =======================================================
   * UPDATE STATUS
   * =======================================================
   */

  const updateStatus = (
    id: string,
    status: string
  ) => {
    const normalized =
      normalizeStatus(status);

    try {
      const updated =
        submissions.map(
          (submission) =>
            submission.id === id
              ? {
                  ...submission,
                  status: normalized,
                }
              : submission
        );

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updated)
      );

      setSubmissions(updated);

      if (
        selectedSubmission?.id === id
      ) {
        setSelectedSubmission({
          ...selectedSubmission,
          status: normalized,
        });
      }
    } catch (error) {
      console.error(
        "Could not update status:",
        error
      );
    }
  };

  /*
   * =======================================================
   * DELETE
   * =======================================================
   */

  const deleteSubmission = (
    id: string
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this citizen report?"
      );

    if (!confirmed) {
      return;
    }

    try {
      const updated =
        submissions.filter(
          (submission) =>
            submission.id !== id
        );

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updated)
      );

      setSubmissions(updated);

      if (
        selectedSubmission?.id === id
      ) {
        setSelectedSubmission(null);
      }
    } catch (error) {
      console.error(
        "Could not delete submission:",
        error
      );
    }
  };

  /*
   * =======================================================
   * STATISTICS
   * =======================================================
   */

  const statistics = useMemo(() => {
    const submitted =
      submissions.filter(
        (submission) =>
          normalizeStatus(
            submission.status
          ) === "Submitted"
      ).length;

    const underReview =
      submissions.filter(
        (submission) =>
          normalizeStatus(
            submission.status
          ) === "Under Review"
      ).length;

    const verified =
      submissions.filter(
        (submission) =>
          normalizeStatus(
            submission.status
          ) === "Verified"
      ).length;

    const resolved =
      submissions.filter(
        (submission) =>
          normalizeStatus(
            submission.status
          ) === "Resolved"
      ).length;

    const gpsReports =
      submissions.filter(
        (submission) =>
          hasValidCoordinates(
            submission
          )
      ).length;

    return {
      total: submissions.length,
      submitted,
      underReview,
      verified,
      resolved,
      gpsReports,
    };
  }, [submissions]);

  /*
   * =======================================================
   * CATEGORIES
   * =======================================================
   */

  const categories = useMemo(() => {
    const categorySet =
      new Set<string>();

    submissions.forEach(
      (submission) => {
        const classification =
          classifyIssue(
            submission.issue || ""
          );

        categorySet.add(
          classification.category
        );
      }
    );

    return Array.from(
      categorySet
    ).sort();
  }, [submissions]);

  /*
   * =======================================================
   * FILTERED SUBMISSIONS
   * =======================================================
   */

  const filteredSubmissions =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return submissions
        .filter((submission) => {
          if (
            selectedStatus !==
            "All"
          ) {
            const currentStatus =
              normalizeStatus(
                submission.status
              );

            if (
              currentStatus !==
              selectedStatus
            ) {
              return false;
            }
          }

          if (
            selectedCategory !==
            "All"
          ) {
            const category =
              classifyIssue(
                submission.issue || ""
              ).category;

            if (
              category !==
              selectedCategory
            ) {
              return false;
            }
          }

          if (query) {
            const searchableText = [
              submission.id,
              submission.name,
              submission.village,
              submission.location,
              submission.pincode,
              submission.district,
              submission.state,
              submission.verifiedArea,
              submission.issue,
              submission.voiceLanguage,
              submission.latitude?.toString(),
              submission.longitude?.toString(),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            if (
              !searchableText.includes(
                query
              )
            ) {
              return false;
            }
          }

          return true;
        })
        .slice()
        .reverse();
    }, [
      submissions,
      selectedStatus,
      selectedCategory,
      search,
    ]);

  /*
   * =======================================================
   * CLEAR FILTERS
   * =======================================================
   */

  const clearFilters = () => {
    setSearch("");
    setSelectedStatus("All");
    setSelectedCategory("All");
  };

  /*
   * =======================================================
   * PAGE
   * =======================================================
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

      {/* =================================================
          HEADER
      ================================================= */}

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
              Administration Portal
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">

            <a
              href="/citizen"
              className="rounded-full border border-[#397149] bg-white px-4 py-2 text-xs font-bold text-[#397149] transition hover:bg-[#f0f8f1]"
            >
              + Citizen
            </a>

            <a
              href="/dashboard"
              className="rounded-full border border-[#397149] bg-white px-4 py-2 text-xs font-bold text-[#397149] transition hover:bg-[#f0f8f1]"
            >
              📊 Dashboard
            </a>

            <a
              href="/track"
              className="rounded-full border border-[#397149] bg-white px-4 py-2 text-xs font-bold text-[#397149] transition hover:bg-[#f0f8f1]"
            >
              🔎 Track
            </a>

            <button
              type="button"
              onClick={() => setShowBusinessAnalysis(true)}
              className="rounded-full bg-[#173f2a] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0f2f1e]"
            >
              💼 Business Analysis
            </button>

            <button
              type="button"
              onClick={loadSubmissions}
              className="rounded-full bg-[#173f2a] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0f2f1e]"
            >
              ↻ Refresh
            </button>

          </div>
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">

        {/* TITLE */}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#397149]">
              Admin Control Center
            </p>

            <h1 className="mt-3 text-3xl font-bold text-[#173f2a] sm:text-4xl">
              Community Reports
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#66736a]">
              Review citizen submissions,
              verify community needs,
              update report status and
              inspect the exact reported
              location when GPS permission
              was provided.
            </p>
          </div>

          <div className="rounded-2xl border border-[#cfe0d1] bg-white px-5 py-4">

            <p className="text-xs font-bold text-[#66736a]">
              DATA SOURCE
            </p>

            <p className="mt-1 text-sm font-bold text-[#397149]">
              Local Citizen Submissions
            </p>

            <p className="mt-1 text-[11px] text-[#66736a]">
              Storage: Browser
            </p>

          </div>
        </div>

        {/* =================================================
            STATISTICS
        ================================================= */}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">

          <div className="rounded-2xl border border-[#d9e2da] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
              Total Reports
            </p>

            <p className="mt-3 text-4xl font-bold text-[#173f2a]">
              {statistics.total}
            </p>
          </div>

          <div className="rounded-2xl border border-[#d9e2da] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
              Submitted
            </p>

            <p className="mt-3 text-4xl font-bold text-[#173f2a]">
              {statistics.submitted}
            </p>
          </div>

          <div className="rounded-2xl border border-[#d9e2da] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
              Under Review
            </p>

            <p className="mt-3 text-4xl font-bold text-[#173f2a]">
              {statistics.underReview}
            </p>
          </div>

          <div className="rounded-2xl border border-[#d9e2da] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
              Verified
            </p>

            <p className="mt-3 text-4xl font-bold text-[#397149]">
              {statistics.verified}
            </p>
          </div>

          <div className="rounded-2xl border border-[#d9e2da] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
              Resolved
            </p>

            <p className="mt-3 text-4xl font-bold text-[#397149]">
              {statistics.resolved}
            </p>
          </div>

          <div className="rounded-2xl border border-[#cfe0d1] bg-[#f0f8f1] p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
              GPS Reports
            </p>

            <p className="mt-3 text-4xl font-bold text-[#173f2a]">
              {statistics.gpsReports}
            </p>

            <p className="mt-2 text-xs text-[#66736a]">
              Real browser coordinates
            </p>
          </div>

        </div>

        {/* =================================================
            WORKFLOW
        ================================================= */}

        <div className="mt-8 rounded-3xl border border-[#cfe0d1] bg-[#f0f8f1] p-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm font-bold text-[#173f2a]">
                🛠 Admin workflow
              </p>

              <p className="mt-1 text-xs leading-6 text-[#66736a]">
                Select a report to inspect the
                citizen information, evidence,
                classification and private
                location map.
              </p>
            </div>

            <div className="rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#397149]">
              ✓ Citizen Data Connected
            </div>

          </div>

        </div>

        {/* =================================================
            FILTERS
        ================================================= */}

        <div className="mt-8 rounded-3xl border border-[#d9e2da] bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">

            <div className="flex-1">

              <label
                htmlFor="search-reports"
                className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#66736a]"
              >
                Search reports
              </label>

              <input
                id="search-reports"
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search by name, village, location, issue, PIN or ID..."
                className="w-full rounded-xl border border-[#d5ded6] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#397149]"
              />

            </div>

            <div className="w-full lg:w-52">

              <label
                htmlFor="status-filter"
                className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#66736a]"
              >
                Status
              </label>

              <select
                id="status-filter"
                value={selectedStatus}
                onChange={(event) =>
                  setSelectedStatus(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-[#d5ded6] bg-white px-4 py-3 text-sm font-semibold text-[#173f2a] outline-none focus:border-[#397149]"
              >
                <option value="All">
                  All statuses
                </option>

                {STATUS_OPTIONS.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  )
                )}
              </select>

            </div>

            <div className="w-full lg:w-60">

              <label
                htmlFor="category-filter"
                className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#66736a]"
              >
                Category
              </label>

              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(event) =>
                  setSelectedCategory(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-[#d5ded6] bg-white px-4 py-3 text-sm font-semibold text-[#173f2a] outline-none focus:border-[#397149]"
              >
                <option value="All">
                  All categories
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  )
                )}
              </select>

            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-[#cbd8cd] bg-white px-5 py-3 text-sm font-bold text-[#397149] transition hover:bg-[#f0f8f1]"
            >
              Clear
            </button>

          </div>

          <p className="mt-4 text-xs text-[#66736a]">
            Showing{" "}
            <strong>
              {filteredSubmissions.length}
            </strong>{" "}
            of{" "}
            <strong>
              {submissions.length}
            </strong>{" "}
            reports
          </p>

        </div>

        {/* =================================================
            REPORT LIST
        ================================================= */}

        {filteredSubmissions.length ===
        0 ? (

          <div className="mt-8 rounded-3xl border border-dashed border-[#cbd8cd] bg-white p-14 text-center">

            <div className="text-6xl">
              📭
            </div>

            <h2 className="mt-5 text-2xl font-bold text-[#173f2a]">
              No reports found
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#66736a]">
              {submissions.length ===
              0
                ? "No citizen reports have been submitted yet. Submit a report from the Citizen page."
                : "There are no reports matching your current filters."}
            </p>

            {submissions.length >
              0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 rounded-xl bg-[#173f2a] px-6 py-3 text-sm font-bold text-white"
              >
                Show All Reports
              </button>
            )}

          </div>

        ) : (

          <div className="mt-8 space-y-4">

            {filteredSubmissions.map(
              (submission) => {

                const classification =
                  classifyIssue(
                    submission.issue ||
                      ""
                  );

                const status =
                  normalizeStatus(
                    submission.status
                  );

                const gpsAvailable =
                  hasValidCoordinates(
                    submission
                  );

                return (

                  <div
                    key={submission.id}
                    className="rounded-3xl border border-[#d9e2da] bg-white p-5 shadow-sm sm:p-6"
                  >

                    {/* TOP */}

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                      <div className="flex gap-4">

                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[#f0f8f1] text-2xl">
                          {classification.icon}
                        </div>

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <span className="rounded-full bg-[#e9f4ea] px-3 py-1 text-xs font-bold text-[#397149]">
                              {
                                classification.category
                              }
                            </span>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusColor(
                                status
                              )}`}
                            >
                              {status}
                            </span>

                            {gpsAvailable && (
                              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                                📍 GPS Available
                              </span>
                            )}

                          </div>

                          <h2 className="mt-3 break-words text-lg font-bold text-[#173f2a]">
                            {submission.issue ||
                              "No issue description"}
                          </h2>

                          <p className="mt-2 text-xs text-[#66736a]">
                            Submitted{" "}
                            {formatDate(
                              submission.createdAt
                            )}
                          </p>

                        </div>
                      </div>

                      <div className="text-left lg:text-right">

                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#66736a]">
                          Report ID
                        </p>

                        <p className="mt-1 break-all text-xs font-bold text-[#397149]">
                          {submission.id}
                        </p>

                      </div>

                    </div>

                    {/* DETAILS */}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                      <div className="rounded-xl bg-[#f8faf8] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#66736a]">
                          Citizen
                        </p>

                        <p className="mt-2 text-sm font-bold text-[#173f2a]">
                          {submission.name ||
                            "Not provided"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#f8faf8] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#66736a]">
                          Village / Locality
                        </p>

                        <p className="mt-2 text-sm font-bold text-[#173f2a]">
                          {submission.village ||
                            "Not provided"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#f8faf8] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#66736a]">
                          Location
                        </p>

                        <p className="mt-2 text-sm font-bold text-[#173f2a]">
                          {submission.location ||
                            "Not provided"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#f8faf8] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#66736a]">
                          Region
                        </p>

                        <p className="mt-2 text-sm font-bold text-[#173f2a]">
                          {[
                            submission.district,
                            submission.state,
                          ]
                            .filter(Boolean)
                            .join(", ") ||
                            "Not provided"}
                        </p>
                      </div>

                    </div>

                    {/* LOCATION SUMMARY */}

                    <div className="mt-4 rounded-xl border border-[#d9e2da] bg-[#f8faf8] p-4">

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                          <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                            📍 Report Location
                          </p>

                          {gpsAvailable ? (
                            <p className="mt-2 text-xs font-semibold text-[#173f2a]">
                              GPS coordinates captured
                              from citizen browser
                            </p>
                          ) : (
                            <p className="mt-2 text-xs text-[#66736a]">
                              GPS coordinates were not
                              captured for this report.
                            </p>
                          )}

                        </div>

                        {gpsAvailable && (
                          <a
                            href={getGoogleMapsUrl(
                              submission.latitude!,
                              submission.longitude!
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl bg-[#173f2a] px-4 py-2.5 text-center text-xs font-bold text-white hover:bg-[#0f2f1e]"
                          >
                            🗺 Open Map
                          </a>
                        )}

                      </div>

                    </div>

                    {/* CLASSIFICATION */}

                    <div className="mt-4 rounded-xl border border-[#e1e8e2] bg-[#f8faf8] p-4">

                      <div className="flex flex-wrap items-center justify-between gap-3">

                        <div>

                          <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                            Automatic Classification
                          </p>

                          <p className="mt-2 text-sm font-bold text-[#173f2a]">
                            {classification.icon}{" "}
                            {
                              classification.category
                            }
                          </p>

                        </div>

                        {classification.confidence >
                          0 && (
                          <div className="rounded-full bg-white px-3 py-2 text-xs font-bold text-[#397149]">
                            {
                              classification.confidence
                            }
                            % confidence
                          </div>
                        )}

                      </div>

                    </div>

                    {/* ACTIONS */}

                    <div className="mt-5 flex flex-col gap-3 border-t border-[#e1e8e2] pt-5 sm:flex-row sm:items-center sm:justify-between">

                      <div className="flex flex-wrap gap-2">

                        <select
                          value={status}
                          onChange={(event) =>
                            updateStatus(
                              submission.id,
                              event.target.value
                            )
                          }
                          className="rounded-xl border border-[#cbd8cd] bg-white px-4 py-2.5 text-xs font-bold text-[#173f2a] outline-none focus:border-[#397149]"
                        >
                          {STATUS_OPTIONS.map(
                            (statusOption) => (
                              <option
                                key={
                                  statusOption
                                }
                                value={
                                  statusOption
                                }
                              >
                                {
                                  statusOption
                                }
                              </option>
                            )
                          )}
                        </select>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSubmission(
                              submission
                            )
                          }
                          className="rounded-xl border border-[#397149] bg-white px-4 py-2.5 text-xs font-bold text-[#397149] transition hover:bg-[#f0f8f1]"
                        >
                          View Details
                        </button>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          deleteSubmission(
                            submission.id
                          )
                        }
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
                      >
                        🗑 Delete Report
                      </button>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </section>

      {/* =====================================================
          ADMIN-ONLY BUSINESS ANALYSIS
      ===================================================== */}

      {showBusinessAnalysis && (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 p-3 sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowBusinessAnalysis(false);
            }
          }}
        >
          <div className="mx-auto min-h-full w-full max-w-7xl py-3 sm:py-6">
            <div className="overflow-hidden rounded-3xl bg-[#f5f7f4] shadow-2xl">

              <div className="flex flex-col gap-4 border-b border-[#dce3dc] bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#397149]">
                    🔐 ADMIN ONLY
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-[#173f2a] sm:text-3xl">
                    Business Analysis
                  </h2>
                  <p className="mt-1 text-xs text-[#66736a]">
                    Government planning and budget intelligence based on citizen submissions.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBusinessAnalysis(false)}
                  className="self-start rounded-xl border border-[#cbd8cd] bg-white px-5 py-3 text-sm font-bold text-[#397149] transition hover:bg-[#f0f8f1]"
                >
                  ✕ Close Business Analysis
                </button>
              </div>

              <div className="max-h-[calc(100vh-150px)] overflow-y-auto">
                <BusinessPage />
              </div>

            </div>
          </div>
        </div>
      )}


      {selectedSubmission && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedSubmission(null);
            }
          }}
        >

          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">

            {/* MODAL HEADER */}

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                  Admin Report Details
                </p>

                <h2 className="mt-2 text-2xl font-bold text-[#173f2a]">
                  Citizen Submission
                </h2>

                <p className="mt-1 text-xs text-[#66736a]">
                  {selectedSubmission.id}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedSubmission(null)
                }
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#f0f4f0] text-lg font-bold text-[#397149] hover:bg-[#e6eee7]"
                aria-label="Close"
              >
                ×
              </button>

            </div>

            <div className="mt-6 space-y-5">

              {/* ISSUE */}

              <div className="rounded-2xl bg-[#f8faf8] p-5">

                <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
                  Issue
                </p>

                <p className="mt-2 text-sm leading-7 text-[#173f2a]">
                  {selectedSubmission.issue ||
                    "No issue description"}
                </p>

              </div>

              {/* STATUS */}

              <div className="rounded-2xl border border-[#d9e2da] p-5">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                      Report Status
                    </p>

                    <p className="mt-1 text-xs text-[#66736a]">
                      Update the workflow status.
                    </p>

                  </div>

                  <select
                    value={normalizeStatus(
                      selectedSubmission.status
                    )}
                    onChange={(event) =>
                      updateStatus(
                        selectedSubmission.id,
                        event.target.value
                      )
                    }
                    className="rounded-xl border border-[#cbd8cd] bg-white px-4 py-3 text-sm font-bold text-[#173f2a] outline-none focus:border-[#397149]"
                  >
                    {STATUS_OPTIONS.map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      )
                    )}
                  </select>

                </div>

              </div>

              {/* CITIZEN DETAILS */}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                <div className="rounded-2xl bg-[#f8faf8] p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
                    Name
                  </p>

                  <p className="mt-2 text-sm font-bold text-[#173f2a]">
                    {selectedSubmission.name ||
                      "Not provided"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8faf8] p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
                    Village / Locality
                  </p>

                  <p className="mt-2 text-sm font-bold text-[#173f2a]">
                    {selectedSubmission.village ||
                      "Not provided"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8faf8] p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
                    Location
                  </p>

                  <p className="mt-2 text-sm font-bold text-[#173f2a]">
                    {selectedSubmission.location ||
                      "Not provided"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8faf8] p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
                    PIN Code
                  </p>

                  <p className="mt-2 text-sm font-bold text-[#173f2a]">
                    {selectedSubmission.pincode ||
                      "Not provided"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8faf8] p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
                    District
                  </p>

                  <p className="mt-2 text-sm font-bold text-[#173f2a]">
                    {selectedSubmission.district ||
                      "Not provided"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8faf8] p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#66736a]">
                    State
                  </p>

                  <p className="mt-2 text-sm font-bold text-[#173f2a]">
                    {selectedSubmission.state ||
                      "Not provided"}
                  </p>
                </div>

              </div>

              {/* =================================================
                  ADMIN-ONLY GPS MAP
              ================================================= */}

              <div className="rounded-2xl border border-[#cfe0d1] bg-[#f0f8f1] p-5 sm:p-6">

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#397149]">
                      🔐 ADMIN-ONLY LOCATION
                    </p>

                    <h3 className="mt-2 text-xl font-bold text-[#173f2a]">
                      Reported GPS Location
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-[#66736a]">
                      This location is visible only inside
                      the administration report details.
                    </p>

                  </div>

                  {hasValidCoordinates(
                    selectedSubmission
                  ) && (
                    <a
                      href={getGoogleMapsUrl(
                        selectedSubmission.latitude!,
                        selectedSubmission.longitude!
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-[#173f2a] px-5 py-3 text-center text-xs font-bold text-white hover:bg-[#0f2f1e]"
                    >
                      🗺 Open Google Maps
                    </a>
                  )}

                </div>

                {hasValidCoordinates(
                  selectedSubmission
                ) ? (

                  <div className="mt-5 overflow-hidden rounded-2xl border border-[#cbd8cd] bg-white">

                    <iframe
                      title="Citizen reported location"
                      src={getOpenStreetMapEmbedUrl(
                        selectedSubmission.latitude!,
                        selectedSubmission.longitude!
                      )}
                      className="h-[360px] w-full border-0"
                      loading="lazy"
                    />

                    <div className="grid gap-3 border-t border-[#dce3dc] p-4 sm:grid-cols-3">

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#66736a]">
                          Latitude
                        </p>

                        <p className="mt-1 text-sm font-bold text-[#173f2a]">
                          {selectedSubmission.latitude!.toFixed(
                            6
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#66736a]">
                          Longitude
                        </p>

                        <p className="mt-1 text-sm font-bold text-[#173f2a]">
                          {selectedSubmission.longitude!.toFixed(
                            6
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#66736a]">
                          Accuracy
                        </p>

                        <p className="mt-1 text-sm font-bold text-[#173f2a]">
                          {typeof selectedSubmission.locationAccuracy ===
                          "number"
                            ? `±${Math.round(
                                selectedSubmission.locationAccuracy
                              )} m`
                            : "Not available"}
                        </p>
                      </div>

                    </div>

                    {selectedSubmission.locationCapturedAt && (
                      <div className="border-t border-[#dce3dc] px-4 py-3">

                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#66736a]">
                          Location captured
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[#173f2a]">
                          {formatDate(
                            selectedSubmission.locationCapturedAt
                          )}
                        </p>

                      </div>
                    )}

                  </div>

                ) : (

                  <div className="mt-5 rounded-2xl border border-dashed border-[#cbd8cd] bg-white p-8 text-center">

                    <div className="text-5xl">
                      📍
                    </div>

                    <h4 className="mt-4 text-lg font-bold text-[#173f2a]">
                      GPS location unavailable
                    </h4>

                    <p className="mx-auto mt-2 max-w-lg text-xs leading-6 text-[#66736a]">
                      This report does not contain valid
                      browser GPS coordinates. The admin
                      can still use the village, locality,
                      PIN, district and state information
                      provided by the citizen.
                    </p>

                    {(selectedSubmission.location ||
                      selectedSubmission.village ||
                      selectedSubmission.pincode) && (
                      <div className="mt-5 rounded-xl bg-[#f8faf8] p-4 text-left">

                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#66736a]">
                          Citizen-provided location
                        </p>

                        <p className="mt-2 text-sm font-bold text-[#173f2a]">
                          {[
                            selectedSubmission.village,
                            selectedSubmission.location,
                            selectedSubmission.pincode,
                            selectedSubmission.district,
                            selectedSubmission.state,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>

                      </div>
                    )}

                  </div>

                )}

              </div>

              {/* CLASSIFICATION */}

              <div className="rounded-2xl border border-[#d9e2da] p-5">

                <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                  Classification
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3">

                  <p className="text-lg font-bold text-[#173f2a]">

                    {
                      classifyIssue(
                        selectedSubmission.issue ||
                          ""
                      ).icon
                    }{" "}

                    {
                      classifyIssue(
                        selectedSubmission.issue ||
                          ""
                      ).category
                    }

                  </p>

                  {classifyIssue(
                    selectedSubmission.issue ||
                      ""
                  ).confidence > 0 && (

                    <span className="rounded-full bg-[#f0f8f1] px-3 py-1.5 text-xs font-bold text-[#397149]">

                      {
                        classifyIssue(
                          selectedSubmission.issue ||
                            ""
                        ).confidence
                      }
                      % confidence

                    </span>
                  )}

                </div>

                {classifyIssue(
                  selectedSubmission.issue ||
                    ""
                ).matchedKeywords.length >
                  0 && (

                  <p className="mt-3 text-xs text-[#66736a]">

                    Detected:{" "}

                    <strong>
                      {classifyIssue(
                        selectedSubmission.issue ||
                          ""
                      ).matchedKeywords
                        .slice(0, 8)
                        .join(", ")}
                    </strong>

                  </p>
                )}

              </div>

              {/* PHOTOS */}

              {selectedSubmission.photos &&
                selectedSubmission.photos.length >
                  0 && (

                <div className="rounded-2xl border border-[#d9e2da] p-5">

                  <div className="flex items-center justify-between">

                    <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                      📷 Evidence Photos
                    </p>

                    <p className="text-xs font-bold text-[#66736a]">
                      {
                        selectedSubmission.photos.length
                      }{" "}
                      uploaded
                    </p>

                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">

                    {selectedSubmission.photos.map(
                      (photo, index) => (

                        <a
                          key={`${selectedSubmission.id}-photo-${index}`}
                          href={photo}
                          target="_blank"
                          rel="noreferrer"
                        >

                          <img
                            src={photo}
                            alt={`Evidence ${
                              index + 1
                            }`}
                            className="aspect-square w-full rounded-2xl border border-[#d9e2da] object-cover transition hover:opacity-80"
                          />

                        </a>

                      )
                    )}

                  </div>

                </div>
              )}

              {/* LANGUAGE */}

              <div className="rounded-2xl border border-[#d9e2da] p-5">

                <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                  Language Information
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">

                  <div>

                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#66736a]">
                      Voice Language
                    </p>

                    <p className="mt-2 text-sm font-bold text-[#173f2a]">
                      {selectedSubmission.voiceLanguage ||
                        "Not provided"}
                    </p>

                  </div>

                  <div>

                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#66736a]">
                      Writing Languages
                    </p>

                    <p className="mt-2 text-sm font-bold text-[#173f2a]">

                      {selectedSubmission.writingLanguages &&
                      Object.keys(
                        selectedSubmission.writingLanguages
                      ).length > 0
                        ? Object.values(
                            selectedSubmission.writingLanguages
                          ).join(", ")
                        : "Not provided"}

                    </p>

                  </div>

                </div>

              </div>

              {/* SUBMISSION INFORMATION */}

              <div className="rounded-2xl border border-[#d9e2da] p-5">

                <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                  Submission Information
                </p>

                <div className="mt-4 space-y-3 text-xs text-[#66736a]">

                  <p>
                    <strong className="text-[#173f2a]">
                      Report ID:
                    </strong>{" "}
                    {selectedSubmission.id}
                  </p>

                  <p>
                    <strong className="text-[#173f2a]">
                      Submitted:
                    </strong>{" "}
                    {formatDate(
                      selectedSubmission.createdAt
                    )}
                  </p>

                  <p>
                    <strong className="text-[#173f2a]">
                      Verified Area:
                    </strong>{" "}
                    {selectedSubmission.verifiedArea ||
                      "Not provided"}
                  </p>

                  {selectedSubmission.verifiedAreas &&
                    selectedSubmission.verifiedAreas
                      .length > 0 && (

                    <p>
                      <strong className="text-[#173f2a]">
                        Verified Areas:
                      </strong>{" "}
                      {selectedSubmission.verifiedAreas.join(
                        ", "
                      )}
                    </p>

                  )}

                </div>

              </div>

            </div>

            {/* FOOTER */}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">

              <button
                type="button"
                onClick={() =>
                  setSelectedSubmission(null)
                }
                className="flex-1 rounded-xl border border-[#cbd8cd] bg-white px-5 py-3 text-sm font-bold text-[#397149] transition hover:bg-[#f0f8f1]"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const id =
                    selectedSubmission.id;

                  setSelectedSubmission(
                    null
                  );

                  deleteSubmission(id);
                }}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                🗑 Delete Report
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}