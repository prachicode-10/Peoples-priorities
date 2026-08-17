"use client";

import { useEffect, useMemo, useState } from "react";

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
  voiceLanguage?: string;
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

/*
 * =========================================================
 * CATEGORY DETECTION
 * English + Hindi + Odia
 * =========================================================
 */

function getCategory(issue: string): CategoryInfo {
  const text = issue.toLowerCase();

  // ROADS
  if (
    text.includes("road") ||
    text.includes("street") ||
    text.includes("pothole") ||
    text.includes("highway") ||
    text.includes("রাস্তা") ||
    text.includes("ରାସ୍ତା") ||
    text.includes("ସଡକ") ||
    text.includes("सड़क") ||
    text.includes("सड़क") ||
    text.includes("गड्ढा") ||
    text.includes("गड्ढे")
  ) {
    return {
      name: "Roads",
      icon: "🛣️",
    };
  }

  // WATER
  if (
    text.includes("water") ||
    text.includes("drinking water") ||
    text.includes("tap water") ||
    text.includes("water supply") ||
    text.includes("पानी") ||
    text.includes("पीने का पानी") ||
    text.includes("जल") ||
    text.includes("ଜଳ") ||
    text.includes("ପାଣି") ||
    text.includes("ପିଇବା ପାଣି")
  ) {
    return {
      name: "Water",
      icon: "💧",
    };
  }

  // ELECTRICITY
  if (
    text.includes("electric") ||
    text.includes("electricity") ||
    text.includes("power") ||
    text.includes("light") ||
    text.includes("बिजली") ||
    text.includes("बिजली नहीं") ||
    text.includes("विद्युत") ||
    text.includes("ବିଦ୍ୟୁତ") ||
    text.includes("ବିଜୁଳି") ||
    text.includes("ଲାଇଟ")
  ) {
    return {
      name: "Electricity",
      icon: "⚡",
    };
  }

  // SANITATION
  if (
    text.includes("garbage") ||
    text.includes("waste") ||
    text.includes("drain") ||
    text.includes("drainage") ||
    text.includes("toilet") ||
    text.includes("sewage") ||
    text.includes("कचरा") ||
    text.includes("नाली") ||
    text.includes("नाला") ||
    text.includes("शौचालय") ||
    text.includes("गंदगी") ||
    text.includes("आवर्जना") ||
    text.includes("ଆବର୍ଜନା") ||
    text.includes("ନାଳ") ||
    text.includes("ଶୌଚାଳୟ") ||
    text.includes("ଡ୍ରେନ")
  ) {
    return {
      name: "Sanitation",
      icon: "🗑️",
    };
  }

  // HEALTHCARE
  if (
    text.includes("hospital") ||
    text.includes("health") ||
    text.includes("doctor") ||
    text.includes("medicine") ||
    text.includes("clinic") ||
    text.includes("ambulance") ||
    text.includes("अस्पताल") ||
    text.includes("स्वास्थ्य") ||
    text.includes("डॉक्टर") ||
    text.includes("दवा") ||
    text.includes("दवाई") ||
    text.includes("एम्बुलेंस") ||
    text.includes("ହସ୍ପିଟାଲ") ||
    text.includes("ସ୍ୱାସ୍ଥ୍ୟ") ||
    text.includes("ଡାକ୍ତର") ||
    text.includes("ଔଷଧ") ||
    text.includes("ଆମ୍ବୁଲାନ୍ସ")
  ) {
    return {
      name: "Healthcare",
      icon: "🏥",
    };
  }

  // EDUCATION
  if (
    text.includes("school") ||
    text.includes("education") ||
    text.includes("teacher") ||
    text.includes("college") ||
    text.includes("student") ||
    text.includes("स्कूल") ||
    text.includes("शिक्षा") ||
    text.includes("शिक्षक") ||
    text.includes("कॉलेज") ||
    text.includes("छात्र") ||
    text.includes("ସ୍କୁଲ") ||
    text.includes("ଶିକ୍ଷା") ||
    text.includes("ଶିକ୍ଷକ") ||
    text.includes("କଲେଜ") ||
    text.includes("ଛାତ୍ର")
  ) {
    return {
      name: "Education",
      icon: "🎓",
    };
  }

  // FLOODING
  if (
    text.includes("flood") ||
    text.includes("flooding") ||
    text.includes("waterlogging") ||
    text.includes("water logging") ||
    text.includes("जलभराव") ||
    text.includes("बाढ़") ||
    text.includes("ବନ୍ୟା") ||
    text.includes("ଜଳବନ୍ଦୀ") ||
    text.includes("ଜଳ ଜମିବା")
  ) {
    return {
      name: "Flooding",
      icon: "🌊",
    };
  }

  // PUBLIC TRANSPORT
  if (
    text.includes("bus") ||
    text.includes("transport") ||
    text.includes("public transport") ||
    text.includes("बस") ||
    text.includes("परिवहन") ||
    text.includes("ବସ") ||
    text.includes("ପରିବହନ")
  ) {
    return {
      name: "Public Transport",
      icon: "🚌",
    };
  }

  // SAFETY
  if (
    text.includes("safety") ||
    text.includes("crime") ||
    text.includes("police") ||
    text.includes("street light") ||
    text.includes("security") ||
    text.includes("सुरक्षा") ||
    text.includes("पुलिस") ||
    text.includes("अपराध") ||
    text.includes("ଷୁରକ୍ଷା") ||
    text.includes("ପୋଲିସ")
  ) {
    return {
      name: "Public Safety",
      icon: "🛡️",
    };
  }

  return {
    name: "Other",
    icon: "📌",
  };
}

/*
 * =========================================================
 * STATUS FLOW
 *
 * Must match the ADMIN page exactly.
 * =========================================================
 */

const STATUS_STEPS = [
  {
    key: "Submitted",
    title: "Submitted",
    description:
      "Your community need has been received.",
  },
  {
    key: "Under Review",
    title: "Under Review",
    description:
      "Your report is being reviewed and assessed.",
  },
  {
    key: "Verified",
    title: "Verified",
    description:
      "The reported community need has been verified.",
  },
  {
    key: "Resolved",
    title: "Resolved",
    description:
      "The reported issue has been marked as resolved.",
  },
];

/*
 * =========================================================
 * STATUS NORMALISATION
 * =========================================================
 */

function getStatusStep(status?: string) {
  if (!status) return 0;

  const normalized = status
    .trim()
    .toLowerCase();

  if (
    normalized === "resolved" ||
    normalized === "completed" ||
    normalized.includes("resolved")
  ) {
    return 3;
  }

  if (
    normalized === "verified" ||
    normalized.includes("verified")
  ) {
    return 2;
  }

  if (
    normalized === "under review" ||
    normalized.includes("review") ||
    normalized.includes("progress")
  ) {
    return 1;
  }

  return 0;
}

/*
 * =========================================================
 * STATUS COLOR
 * =========================================================
 */

function getStatusColor(status?: string) {
  switch (status) {
    case "Verified":
      return "bg-green-100 text-green-700";

    case "Resolved":
      return "bg-blue-100 text-blue-700";

    case "Under Review":
      return "bg-yellow-100 text-yellow-700";

    default:
      return "bg-gray-100 text-gray-700";
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

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

/*
 * =========================================================
 * PRIORITY
 *
 * Local/demo priority calculation.
 * =========================================================
 */

function calculateLocalPriority(
  submission: Submission,
  allSubmissions: Submission[]
) {
  let score = 25;

  const category = getCategory(
    submission.issue || ""
  );

  /*
   * Frequency
   */

  const sameCategoryCount =
    allSubmissions.filter(
      (item) =>
        getCategory(item.issue || "").name ===
        category.name
    ).length;

  if (allSubmissions.length > 0) {
    const frequencyRatio =
      sameCategoryCount /
      allSubmissions.length;

    score += Math.round(
      frequencyRatio * 30
    );
  }

  /*
   * Evidence
   */

  if (
    submission.photos &&
    submission.photos.length > 0
  ) {
    score += 15;
  }

  /*
   * Serious issue keywords
   */

  const issue = (
    submission.issue || ""
  ).toLowerCase();

  const seriousWords = [
    "emergency",
    "danger",
    "dangerous",
    "death",
    "accident",
    "hospital",
    "ambulance",
    "flood",
    "fire",
    "unsafe",
    "critical",

    "आपात",
    "खतरा",
    "दुर्घटना",
    "अस्पताल",
    "बाढ़",
    "आग",

    "ଜରୁରୀ",
    "ବିପଦ",
    "ଦୁର୍ଘଟଣା",
    "ବନ୍ୟା",
  ];

  if (
    seriousWords.some((word) =>
      issue.includes(word)
    )
  ) {
    score += 20;
  }

  /*
   * Recency
   */

  const created = new Date(
    submission.createdAt
  ).getTime();

  if (!Number.isNaN(created)) {
    const now = Date.now();

    const days =
      (now - created) /
      (1000 * 60 * 60 * 24);

    if (days <= 7) {
      score += 10;
    } else if (days <= 30) {
      score += 5;
    }
  }

  score = Math.min(
    100,
    Math.max(0, score)
  );

  let level:
    | "Low"
    | "Medium"
    | "High"
    | "Critical";

  if (score >= 80) {
    level = "Critical";
  } else if (score >= 60) {
    level = "High";
  } else if (score >= 40) {
    level = "Medium";
  } else {
    level = "Low";
  }

  return {
    score,
    level,
    category,
    sameCategoryCount,
  };
}

/*
 * =========================================================
 * PAGE
 * =========================================================
 */

export default function TrackPage() {
  const [
    submissions,
    setSubmissions,
  ] = useState<Submission[]>([]);

  const [
    searchId,
    setSearchId,
  ] = useState("");

  const [
    selectedSubmission,
    setSelectedSubmission,
  ] = useState<Submission | null>(null);

  const [
    error,
    setError,
  ] = useState("");

  /*
   * =======================================================
   * LOAD SUBMISSIONS
   * =======================================================
   */

  const loadSubmissions = () => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(
          STORAGE_KEY
        ) || "[]"
      );

      if (Array.isArray(saved)) {
        setSubmissions(saved);
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
  };

  /*
   * Initial load
   */

  useEffect(() => {
    loadSubmissions();
  }, []);

  /*
   * =======================================================
   * URL ID
   * =======================================================
   */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const id = params.get("id");

    if (id) {
      setSearchId(id);
    }
  }, []);

  /*
   * =======================================================
   * KEEP TRACK PAGE UPDATED
   *
   * This lets Track respond when another browser tab
   * updates localStorage.
   * =======================================================
   */

  useEffect(() => {
    const handleStorage = (
      event: StorageEvent
    ) => {
      if (
        event.key === STORAGE_KEY
      ) {
        loadSubmissions();
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

  /*
   * =======================================================
   * FIND SUBMISSION
   * =======================================================
   */

  const findSubmission = () => {
    const cleaned =
      searchId.trim().toUpperCase();

    setError("");
    setSelectedSubmission(null);

    if (!cleaned) {
      setError(
        "Please enter your Submission ID."
      );
      return;
    }

    const found =
      submissions.find(
        (submission) =>
          submission.id
            .toUpperCase() ===
          cleaned
      );

    if (!found) {
      setError(
        "Submission not found. Please check your Submission ID."
      );
      return;
    }

    setSelectedSubmission(found);

    window.history.replaceState(
      null,
      "",
      `/track?id=${encodeURIComponent(
        found.id
      )}`
    );
  };

  /*
   * =======================================================
   * RESET SEARCH
   * =======================================================
   */

  const resetSearch = () => {
    setSearchId("");
    setSelectedSubmission(null);
    setError("");

    window.history.replaceState(
      null,
      "",
      "/track"
    );
  };

  /*
   * =======================================================
   * AUTO-SEARCH FROM URL
   *
   * Handles /track?id=PP-XXXX
   * =======================================================
   */

  useEffect(() => {
    if (
      searchId &&
      submissions.length > 0 &&
      !selectedSubmission
    ) {
      const cleaned =
        searchId.trim().toUpperCase();

      const found =
        submissions.find(
          (submission) =>
            submission.id
              .toUpperCase() ===
            cleaned
        );

      if (found) {
        setSelectedSubmission(found);
        setError("");
      }
    }
  }, [
    searchId,
    submissions,
    selectedSubmission,
  ]);

  /*
   * =======================================================
   * REFRESH SELECTED SUBMISSION
   *
   * If Admin changes the status, this keeps the selected
   * Track result synchronized.
   * =======================================================
   */

  useEffect(() => {
    if (!selectedSubmission) {
      return;
    }

    const latest =
      submissions.find(
        (submission) =>
          submission.id ===
          selectedSubmission.id
      );

    if (latest) {
      setSelectedSubmission(latest);
    }
  }, [submissions]);

  /*
   * =======================================================
   * PRIORITY
   * =======================================================
   */

  const priority = useMemo(() => {
    if (!selectedSubmission) {
      return null;
    }

    return calculateLocalPriority(
      selectedSubmission,
      submissions
    );
  }, [
    selectedSubmission,
    submissions,
  ]);

  /*
   * =======================================================
   * STATUS
   * =======================================================
   */

  const currentStatus =
    selectedSubmission?.status ||
    "Submitted";

  const currentStep =
    getStatusStep(currentStatus);

  /*
   * =======================================================
   * PAGE
   * =======================================================
   */

  return (
    <main className="min-h-screen bg-[#f5f7f4] text-[#17221b]">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="border-b border-[#dce3dc] bg-white">

        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">

          <a
            href="/"
            className="text-sm font-bold tracking-[0.18em] text-[#173f2a]"
          >
            PEOPLE'S PRIORITIES
          </a>

          <div className="flex items-center gap-3">

            <a
              href="/citizen"
              className="rounded-full border border-[#397149] bg-white px-4 py-2 text-xs font-bold text-[#397149] transition hover:bg-[#f0f8f1]"
            >
              + Share a Need
            </a>

            <div className="hidden rounded-full bg-[#e9f4ea] px-4 py-2 text-xs font-bold text-[#397149] sm:block">
              India • Citizen Voice
            </div>

          </div>

        </div>

      </header>

      {/* ===================================================
          MAIN
      =================================================== */}

      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8">

        {/* =================================================
            TITLE
        ================================================= */}

        <div className="text-center">

          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#397149]">
            Citizen Services
          </p>

          <h1 className="mt-3 text-3xl font-bold text-[#173f2a] sm:text-4xl">
            Track Your Submission
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#66736a]">
            Enter the Submission ID you received
            after reporting your community need.
          </p>

        </div>

        {/* =================================================
            SEARCH
        ================================================= */}

        {!selectedSubmission && (

          <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-[#d9e2da] bg-white p-6 shadow-sm sm:p-8">

            <label className="text-sm font-bold text-[#173f2a]">
              Submission ID
            </label>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row">

              <input
                type="text"
                value={searchId}
                onChange={(event) => {
                  setSearchId(
                    event.target.value
                  );
                  setError("");
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                  ) {
                    findSubmission();
                  }
                }}
                placeholder="Example: PP-MSTHPC1F"
                className="min-w-0 flex-1 rounded-2xl border border-[#d5ded6] bg-white px-5 py-4 font-semibold uppercase tracking-wider text-[#173f2a] outline-none focus:border-[#397149]"
              />

              <button
                type="button"
                onClick={findSubmission}
                className="rounded-2xl bg-[#173f2a] px-7 py-4 text-sm font-bold text-white transition hover:bg-[#0f2f1e]"
              >
                🔎 Track
              </button>

            </div>

            {error && (

              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                ⚠ {error}
              </div>

            )}

            <div className="mt-5 rounded-2xl bg-[#f5faf5] p-4">

              <p className="text-xs leading-5 text-[#66736a]">
                Your Submission ID is shown on
                the confirmation screen after
                you submit a community need.
              </p>

            </div>

          </div>

        )}

        {/* =================================================
            RESULT
        ================================================= */}

        {selectedSubmission && (

          <div className="mt-8">

            <div className="rounded-[2rem] border border-[#d9e2da] bg-white p-6 shadow-sm sm:p-10">

              {/* =========================================
                  HEADER
              ========================================= */}

              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

                <div>

                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#397149]">
                    Submission Found
                  </p>

                  <h2 className="mt-3 text-3xl font-bold text-[#173f2a]">
                    Your community need
                  </h2>

                </div>

                <span
                  className={`self-start rounded-full px-4 py-2 text-xs font-bold ${getStatusColor(
                    currentStatus
                  )}`}
                >
                  ✓ {currentStatus}
                </span>

              </div>

              {/* =========================================
                  ID
              ========================================= */}

              <div className="mt-8 rounded-2xl bg-[#f5faf5] p-6">

                <p className="text-xs font-semibold uppercase tracking-wider text-[#66736a]">
                  Submission ID
                </p>

                <p className="mt-2 break-all text-2xl font-bold tracking-wider text-[#173f2a]">
                  {selectedSubmission.id}
                </p>

              </div>

              {/* =========================================
                  BASIC INFORMATION
              ========================================= */}

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                <div className="rounded-2xl bg-[#f8faf8] p-5">

                  <p className="text-xs font-semibold uppercase tracking-wider text-[#66736a]">
                    Citizen
                  </p>

                  <p className="mt-2 text-base font-bold text-[#173f2a]">
                    {selectedSubmission.name ||
                      "Not provided"}
                  </p>

                </div>

                <div className="rounded-2xl bg-[#f8faf8] p-5">

                  <p className="text-xs font-semibold uppercase tracking-wider text-[#66736a]">
                    Submitted
                  </p>

                  <p className="mt-2 text-base font-bold text-[#173f2a]">
                    {formatDate(
                      selectedSubmission.createdAt
                    )}
                  </p>

                </div>

                <div className="rounded-2xl bg-[#f8faf8] p-5">

                  <p className="text-xs font-semibold uppercase tracking-wider text-[#66736a]">
                    Village / Locality
                  </p>

                  <p className="mt-2 text-base font-bold text-[#173f2a]">
                    {selectedSubmission.village ||
                      "Not provided"}
                  </p>

                </div>

                <div className="rounded-2xl bg-[#f8faf8] p-5">

                  <p className="text-xs font-semibold uppercase tracking-wider text-[#66736a]">
                    Location
                  </p>

                  <p className="mt-2 text-base font-bold text-[#173f2a]">
                    {selectedSubmission.location ||
                      "Not provided"}
                  </p>

                </div>

                {selectedSubmission.district && (

                  <div className="rounded-2xl bg-[#f8faf8] p-5">

                    <p className="text-xs font-semibold uppercase tracking-wider text-[#66736a]">
                      District
                    </p>

                    <p className="mt-2 text-base font-bold text-[#173f2a]">
                      {
                        selectedSubmission.district
                      }
                    </p>

                  </div>

                )}

                {selectedSubmission.state && (

                  <div className="rounded-2xl bg-[#f8faf8] p-5">

                    <p className="text-xs font-semibold uppercase tracking-wider text-[#66736a]">
                      State
                    </p>

                    <p className="mt-2 text-base font-bold text-[#173f2a]">
                      {selectedSubmission.state}
                    </p>

                  </div>

                )}

              </div>

              {/* =========================================
                  CATEGORY + PRIORITY
              ========================================= */}

              {priority && (

                <div className="mt-6 rounded-2xl border border-[#cfe0d1] bg-[#f5faf5] p-5">

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                        Detected Category
                      </p>

                      <p className="mt-2 text-xl font-bold text-[#173f2a]">
                        {priority.category.icon}{" "}
                        {priority.category.name}
                      </p>

                      <p className="mt-2 text-xs text-[#66736a]">
                        {
                          priority.sameCategoryCount
                        }{" "}
                        report
                        {priority.sameCategoryCount ===
                        1
                          ? ""
                          : "s"}{" "}
                        in this category
                      </p>

                    </div>

                    <div className="rounded-xl bg-white px-5 py-3">

                      <p className="text-xs font-semibold text-[#66736a]">
                        Priority
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#397149]">
                        {priority.level}{" "}
                        <span className="text-sm">
                          ({priority.score}/100)
                        </span>
                      </p>

                    </div>

                  </div>

                </div>

              )}

              {/* =========================================
                  ISSUE
              ========================================= */}

              <div className="mt-6 rounded-2xl border border-[#d9e2da] p-6">

                <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                  Reported Issue
                </p>

                <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-[#39463d]">
                  {selectedSubmission.issue ||
                    "No issue description"}
                </p>

              </div>

              {/* =========================================
                  EVIDENCE
              ========================================= */}

              {selectedSubmission.photos &&
                selectedSubmission.photos.length >
                  0 && (

                  <div className="mt-6">

                    <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                      Evidence
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">

                      {selectedSubmission.photos.map(
                        (photo, index) => (

                          <div
                            key={`${photo}-${index}`}
                            className="overflow-hidden rounded-2xl border border-[#d9e2da] bg-[#f8faf8]"
                          >

                            <img
                              src={photo}
                              alt={`Evidence ${
                                index + 1
                              }`}
                              className="h-40 w-full object-cover"
                            />

                          </div>

                        )
                      )}

                    </div>

                  </div>

                )}

              {/* =========================================
                  ADDITIONAL INFORMATION
              ========================================= */}

              {(selectedSubmission.pincode ||
                selectedSubmission.verifiedArea ||
                selectedSubmission.voiceLanguage) && (

                <div className="mt-6 rounded-2xl border border-[#d9e2da] p-6">

                  <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                    Additional Information
                  </p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">

                    {selectedSubmission.pincode && (

                      <div>

                        <p className="text-xs text-[#66736a]">
                          PIN Code
                        </p>

                        <p className="mt-1 text-sm font-bold text-[#173f2a]">
                          {
                            selectedSubmission.pincode
                          }
                        </p>

                      </div>

                    )}

                    {selectedSubmission.verifiedArea && (

                      <div>

                        <p className="text-xs text-[#66736a]">
                          Verified Area
                        </p>

                        <p className="mt-1 text-sm font-bold text-[#173f2a]">
                          {
                            selectedSubmission.verifiedArea
                          }
                        </p>

                      </div>

                    )}

                    {selectedSubmission.voiceLanguage && (

                      <div>

                        <p className="text-xs text-[#66736a]">
                          Voice Language
                        </p>

                        <p className="mt-1 text-sm font-bold text-[#173f2a]">
                          {
                            selectedSubmission.voiceLanguage
                          }
                        </p>

                      </div>

                    )}

                  </div>

                </div>

              )}

              {/* =========================================
                  PROGRESS
              ========================================= */}

              <div className="mt-10">

                <div className="flex items-center justify-between gap-4">

                  <div>

                    <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                      Report Progress
                    </p>

                    <p className="mt-1 text-xs text-[#66736a]">
                      Current status:{" "}
                      <strong className="text-[#173f2a]">
                        {currentStatus}
                      </strong>
                    </p>

                  </div>

                  {currentStatus ===
                    "Resolved" && (

                    <span className="rounded-full bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700">
                      ✓ Completed
                    </span>

                  )}

                </div>

                <div className="mt-7 space-y-6">

                  {STATUS_STEPS.map(
                    (step, index) => {

                      const completed =
                        index <=
                        currentStep;

                      const active =
                        index ===
                        currentStep;

                      return (

                        <div
                          key={step.key}
                          className="flex gap-4"
                        >

                          {/* CIRCLE + LINE */}

                          <div className="flex flex-col items-center">

                            <div
                              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                completed
                                  ? "bg-[#e9f4ea] text-[#397149]"
                                  : "bg-[#f0f2f0] text-[#66736a]"
                              }`}
                            >
                              {completed
                                ? "✓"
                                : index + 1}
                            </div>

                            {index <
                              STATUS_STEPS.length -
                                1 && (

                              <div
                                className={`mt-2 h-10 w-0.5 ${
                                  index <
                                  currentStep
                                    ? "bg-[#397149]"
                                    : "bg-[#dce3dc]"
                                }`}
                              />

                            )}

                          </div>

                          {/* DESCRIPTION */}

                          <div className="pb-2">

                            <p
                              className={`text-base font-bold ${
                                active ||
                                completed
                                  ? "text-[#173f2a]"
                                  : "text-[#66736a]"
                              }`}
                            >
                              {step.title}

                              {active && (
                                <span className="ml-2 rounded-full bg-[#e9f4ea] px-2 py-1 text-[10px] text-[#397149]">
                                  CURRENT
                                </span>
                              )}

                            </p>

                            <p className="mt-1 text-sm leading-6 text-[#66736a]">
                              {step.description}
                            </p>

                          </div>

                        </div>

                      );
                    }
                  )}

                </div>

              </div>

              {/* =========================================
                  STATUS EXPLANATION
              ========================================= */}

              <div className="mt-8 rounded-2xl bg-[#f5faf5] p-5">

                <p className="text-sm font-bold text-[#173f2a]">
                  What happens next?
                </p>

                <p className="mt-2 text-sm leading-6 text-[#66736a]">

                  {currentStatus ===
                    "Submitted" &&
                    "Your report has been submitted successfully and is awaiting review."}

                  {currentStatus ===
                    "Under Review" &&
                    "Your report is currently being reviewed. The administration can verify the issue and determine the appropriate priority."}

                  {currentStatus ===
                    "Verified" &&
                    "Your reported community need has been verified and is ready for further action."}

                  {currentStatus ===
                    "Resolved" &&
                    "This report has been marked as resolved by the administration."}

                </p>

              </div>

              {/* =========================================
                  ACTIONS
              ========================================= */}

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">

                <button
                  type="button"
                  onClick={resetSearch}
                  className="rounded-2xl border border-[#397149] px-6 py-4 text-sm font-bold text-[#173f2a] transition hover:bg-[#f5faf5]"
                >
                  ← Track Another Submission
                </button>

                <button
                  type="button"
                  onClick={loadSubmissions}
                  className="rounded-2xl border border-[#cbd8cd] bg-white px-6 py-4 text-sm font-bold text-[#397149] transition hover:bg-[#f5faf5]"
                >
                  ↻ Refresh Status
                </button>

                <a
                  href="/citizen"
                  className="rounded-2xl bg-[#173f2a] px-6 py-4 text-center text-sm font-bold text-white transition hover:bg-[#0f2f1e]"
                >
                  + Submit Another Need
                </a>

              </div>

            </div>

          </div>

        )}

        {/* =================================================
            NO SUBMISSIONS
        ================================================= */}

        {!selectedSubmission &&
          submissions.length === 0 && (

            <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-dashed border-[#cbd8cd] bg-white p-10 text-center">

              <div className="text-5xl">
                📋
              </div>

              <h2 className="mt-4 text-xl font-bold text-[#173f2a]">
                No submissions on this browser
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#66736a]">
                Submit a community need first.
                Your Submission ID will then
                be available for tracking on
                this browser.
              </p>

              <a
                href="/citizen"
                className="mt-6 inline-block rounded-2xl bg-[#173f2a] px-6 py-3 text-sm font-bold text-white"
              >
                Share a Need
              </a>

            </div>

          )}

        {/* =================================================
            LOCAL DATA NOTE
        ================================================= */}

        {!selectedSubmission &&
          submissions.length > 0 && (

            <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-[#d9e2da] bg-white p-5">

              <p className="text-xs leading-6 text-[#66736a]">

                <strong className="text-[#173f2a]">
                  Demo data note:
                </strong>{" "}
                This prototype currently stores
                submissions locally in the browser.
                Tracking therefore works for
                submissions created on this browser.

              </p>

            </div>

          )}

      </section>

    </main>
  );
}