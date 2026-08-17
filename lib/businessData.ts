import {
  classifyIssue,
  type IssueCategory,
} from "@/lib/issueClassifier";

export type BusinessSubmission = {
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

export type BusinessCategory = {
  name: IssueCategory;
  icon: string;
  reports: number;
  percentage: number;
  priority: number;
  evidence: number;
  locations: number;
  recentReports: number;
  level: "Low" | "Medium" | "High" | "Critical";
};

export type BudgetAllocation = BusinessCategory & {
  allocation: number;
  allocationPercentage: number;
  benefitIndex: number;
};

const SEVERITY: Record<string, number> = {
  Healthcare: 90,
  Flooding: 90,
  Safety: 90,
  "Water & Sanitation": 85,
  Electricity: 85,
  "Roads & Transport": 75,
  "Waste Management": 72,
  Education: 65,
  Agriculture: 70,
  Housing: 70,
  Employment: 68,
  Environment: 65,
  "Government Services": 60,
  "Internet & Connectivity": 55,
};

function getSeverity(category: IssueCategory) {
  return SEVERITY[category] ?? 55;
}

function getLevel(
  score: number
): BusinessCategory["level"] {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function getLocation(
  submission: BusinessSubmission
) {
  return (
    submission.village?.trim() ||
    submission.location?.trim() ||
    submission.pincode?.trim() ||
    submission.district?.trim() ||
    ""
  );
}

/*
 * Creates business intelligence entirely from
 * actual citizen submissions.
 *
 * No synthetic report counts are created.
 */
export function buildBusinessCategories(
  submissions: BusinessSubmission[]
): BusinessCategory[] {
  if (submissions.length === 0) {
    return [];
  }

  const grouped = new Map<
    IssueCategory,
    BusinessSubmission[]
  >();

  submissions.forEach((submission) => {
    const category = classifyIssue(
      submission.issue || ""
    ).category;

    const existing =
      grouped.get(category) || [];

    existing.push(submission);

    grouped.set(category, existing);
  });

  const total = submissions.length;
  const now = Date.now();

  return Array.from(grouped.entries())
    .map(([name, reports]) => {
      const count = reports.length;

      const percentage =
        total > 0
          ? Math.round((count / total) * 100)
          : 0;

      const locations = new Set<string>();

      reports.forEach((report) => {
        const location = getLocation(report);

        if (location) {
          locations.add(
            location.toLowerCase()
          );
        }
      });

      const reportsWithEvidence =
        reports.filter(
          (report) =>
            Array.isArray(report.photos) &&
            report.photos.length > 0
        ).length;

      const evidence =
        count > 0
          ? Math.round(
              (reportsWithEvidence / count) *
                100
            )
          : 0;

      const recentReports =
        reports.filter((report) => {
          const timestamp =
            new Date(
              report.createdAt
            ).getTime();

          if (!Number.isFinite(timestamp)) {
            return false;
          }

          const age =
            now - timestamp;

          return (
            age >= 0 &&
            age <=
              30 *
                24 *
                60 *
                60 *
                1000
          );
        }).length;

      const recency =
        count > 0
          ? Math.round(
              (recentReports / count) *
                100
            )
          : 0;

      /*
       * Transparent priority formula:
       *
       * 35% demand frequency
       * 20% category severity
       * 15% geographic spread
       * 15% evidence
       * 15% recency
       *
       * These are planning weights, not government
       * statistics.
       */
      const frequency = percentage;

      const geographic =
        count > 0
          ? Math.min(
              100,
              Math.round(
                (locations.size / count) *
                  100
              )
            )
          : 0;

      const severity =
        getSeverity(name);

      const priority = Math.round(
        frequency * 0.35 +
          severity * 0.2 +
          geographic * 0.15 +
          evidence * 0.15 +
          recency * 0.15
      );

      const firstClassification =
        classifyIssue(
          reports[0]?.issue || ""
        );

      return {
        name,
        icon: firstClassification.icon,
        reports: count,
        percentage,
        priority,
        evidence,
        locations: locations.size,
        recentReports,
        level: getLevel(priority),
      };
    })
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        b.reports - a.reports
    );
}

/*
 * Dynamic budget optimizer.
 *
 * The budget is distributed according to the
 * actual priority weights generated from citizen
 * submissions.
 *
 * This does NOT pretend to know actual government
 * project costs.
 */
export function optimizeBudget(
  categories: BusinessCategory[],
  budget: number
): BudgetAllocation[] {
  if (
    categories.length === 0 ||
    budget <= 0
  ) {
    return categories.map((category) => ({
      ...category,
      allocation: 0,
      allocationPercentage: 0,
      benefitIndex: 0,
    }));
  }

  const totalWeight =
    categories.reduce(
      (total, category) =>
        total + Math.max(category.priority, 1),
      0
    );

  return categories.map((category) => {
    const allocation =
      budget *
      (Math.max(category.priority, 1) /
        totalWeight);

    const allocationPercentage =
      budget > 0
        ? (allocation / budget) * 100
        : 0;

    /*
     * Benefit index represents how strongly the
     * allocated budget follows measured citizen
     * demand + priority.
     *
     * It is NOT an economic ROI claim.
     */
    const benefitIndex = Math.round(
      category.priority *
        (allocationPercentage / 100)
    );

    return {
      ...category,
      allocation,
      allocationPercentage,
      benefitIndex,
    };
  });
}

export function readCitizenSubmissions(): BusinessSubmission[] {
  if (
    typeof window === "undefined"
  ) {
    return [];
  }

  try {
    const saved =
      localStorage.getItem(
        "peoples-priorities-submissions"
      );

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch (error) {
    console.error(
      "Could not read citizen submissions:",
      error
    );

    return [];
  }
}

export function formatCrores(
  rupees: number
) {
  if (rupees >= 10000000) {
    return `₹${(
      rupees / 10000000
    ).toFixed(2)} Cr`;
  }

  if (rupees >= 100000) {
    return `₹${(
      rupees / 100000
    ).toFixed(2)} L`;
  }

  return `₹${Math.round(
    rupees
  ).toLocaleString("en-IN")}`;
}