export type PrioritySubmission = {
  id: string;
  createdAt: string;
  name?: string;
  village?: string;
  location?: string;
  issue?: string;
  photos?: string[];
  status?: string;
};

export type PriorityBreakdown = {
  frequency: number;
  severity: number;
  geographicConcentration: number;
  evidence: number;
  recency: number;
};

export type PriorityResult = {
  score: number;
  level: "Low" | "Medium" | "High" | "Critical";
  reasons: string[];
  breakdown: PriorityBreakdown;
  factors: PriorityBreakdown;
};

export type PriorityInput = {
  frequency?: number;
  severity?: number;
  geographicConcentration?: number;
  evidence?: number;
  recency?: number;

  // Compatibility with older code
  locationSpread?: number;

  [key: string]: unknown;
};

/*
 * ==========================================
 * KEYWORDS
 * ==========================================
 */

const CRITICAL_KEYWORDS = [
  "death",
  "dead",
  "fatal",
  "accident",
  "dangerous",
  "collapse",
  "collapsed",
  "fire",
  "emergency",
  "life threatening",
  "life-threatening",
  "epidemic",
  "contamination",
  "contaminated",
  "unsafe water",

  "ମୃତ୍ୟୁ",
  "ଦୁର୍ଘଟଣା",
  "ବିପଦ",
  "ଅଗ୍ନି",
  "ଜରୁରୀ",

  "मौत",
  "दुर्घटना",
  "खतरा",
  "आग",
  "आपातकाल",
];

const HIGH_KEYWORDS = [
  "flood",
  "waterlogging",
  "broken",
  "damaged",
  "no water",
  "drinking water",
  "electricity",
  "power cut",
  "hospital",
  "health",
  "medicine",
  "road",
  "pothole",
  "bridge",
  "drain",
  "sewage",
  "school",
  "garbage",
  "waste",

  "ବନ୍ୟା",
  "ଜଳବନ୍ଦୀ",
  "ପାଣି",
  "ବିଦ୍ୟୁତ",
  "ରାସ୍ତା",
  "ନାଳ",
  "ସ୍ୱାସ୍ଥ୍ୟ",

  "बाढ़",
  "पानी",
  "बिजली",
  "सड़क",
  "नाली",
  "अस्पताल",
  "कचरा",
];

const MEDIUM_KEYWORDS = [
  "street light",
  "lighting",
  "park",
  "bus",
  "transport",
  "traffic",
  "footpath",
  "market",
  "education",
  "cleaning",
  "sanitation",

  "ଆଲୋକ",
  "ଶିକ୍ଷା",
  "ପରିମଳ",
  "ପରିବହନ",

  "सफाई",
  "शिक्षा",
  "यातायात",
];

/*
 * ==========================================
 * HELPERS
 * ==========================================
 */

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function containsKeyword(
  text: string,
  keywords: string[]
): boolean {
  return keywords.some((keyword) =>
    text.includes(keyword)
  );
}

function clamp(value: number): number {
  return Math.max(
    0,
    Math.min(100, Math.round(value))
  );
}

/*
 * ==========================================
 * SEVERITY
 * ==========================================
 */

function calculateSeverityFromIssue(
  issue: string
): number {
  const text = normalizeText(issue);

  if (
    containsKeyword(
      text,
      CRITICAL_KEYWORDS
    )
  ) {
    return 100;
  }

  if (
    containsKeyword(
      text,
      HIGH_KEYWORDS
    )
  ) {
    return 75;
  }

  if (
    containsKeyword(
      text,
      MEDIUM_KEYWORDS
    )
  ) {
    return 50;
  }

  return 30;
}

/*
 * ==========================================
 * PRIORITY LEVEL
 * ==========================================
 */

function getPriorityLevel(
  score: number
): PriorityResult["level"] {
  if (score >= 80) {
    return "Critical";
  }

  if (score >= 60) {
    return "High";
  }

  if (score >= 35) {
    return "Medium";
  }

  return "Low";
}

/*
 * ==========================================
 * FACTOR CALCULATION
 * ==========================================
 */

function calculateFromFactors(
  input: PriorityInput
): PriorityResult {
  const frequency = clamp(
    Number(input.frequency ?? 0)
  );

  const severity = clamp(
    Number(input.severity ?? 0)
  );

  /*
   * Dashboard expects:
   *
   * geographicConcentration
   *
   * Older code may send:
   *
   * locationSpread
   *
   * So support both.
   */

  const geographicConcentration =
    clamp(
      Number(
        input.geographicConcentration ??
          input.locationSpread ??
          0
      )
    );

  const evidence = clamp(
    Number(input.evidence ?? 0)
  );

  const recency = clamp(
    Number(input.recency ?? 0)
  );

  /*
   * ========================================
   * WEIGHTS
   * ========================================
   *
   * Frequency              35%
   * Severity               25%
   * Geographic concentration 15%
   * Evidence               10%
   * Recency                15%
   */

  const score = clamp(
    frequency * 0.35 +
      severity * 0.25 +
      geographicConcentration * 0.15 +
      evidence * 0.1 +
      recency * 0.15
  );

  const level =
    getPriorityLevel(score);

  const reasons: string[] = [];

  if (frequency >= 50) {
    reasons.push(
      "Frequently reported by citizens."
    );
  } else if (frequency >= 25) {
    reasons.push(
      "Reported by a significant share of citizens."
    );
  }

  if (severity >= 100) {
    reasons.push(
      "Reports contain potentially critical safety or emergency concerns."
    );
  } else if (severity >= 75) {
    reasons.push(
      "Reports indicate potentially serious community impact."
    );
  } else if (severity >= 50) {
    reasons.push(
      "Reports indicate a meaningful public-service concern."
    );
  }

  if (geographicConcentration >= 50) {
    reasons.push(
      "The issue is appearing across multiple locations."
    );
  }

  if (evidence >= 40) {
    reasons.push(
      "Many reports include photographic evidence."
    );
  }

  if (recency >= 80) {
    reasons.push(
      "Recent reports suggest the issue is currently active."
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      "Priority is based on available citizen reports."
    );
  }

  const breakdown: PriorityBreakdown = {
    frequency,
    severity,
    geographicConcentration,
    evidence,
    recency,
  };

  return {
    score,
    level,
    reasons,
    breakdown,
    factors: breakdown,
  };
}

/*
 * ==========================================
 * SUBMISSION-BASED CALCULATION
 * ==========================================
 */

function calculateFromSubmissions(
  submissions: PrioritySubmission[],
  totalSubmissions: number
): PriorityResult {
  if (submissions.length === 0) {
    return calculateFromFactors({
      frequency: 0,
      severity: 0,
      geographicConcentration: 0,
      evidence: 0,
      recency: 0,
    });
  }

  /*
   * FREQUENCY
   */

  const frequency = clamp(
    (submissions.length /
      Math.max(totalSubmissions, 1)) *
      100
  );

  /*
   * GEOGRAPHIC CONCENTRATION
   *
   * More distinct locations means the
   * problem affects a wider area.
   */

  const locations = new Set<string>();

  submissions.forEach(
    (submission) => {
      const location =
        submission.village?.trim() ||
        submission.location?.trim();

      if (location) {
        locations.add(
          normalizeText(location)
        );
      }
    }
  );

  const geographicConcentration =
    clamp(
      (locations.size /
        Math.max(
          submissions.length,
          1
        )) *
        100
    );

  /*
   * EVIDENCE
   */

  const reportsWithEvidence =
    submissions.filter(
      (submission) =>
        Array.isArray(
          submission.photos
        ) &&
        submission.photos.length > 0
    ).length;

  const evidence = clamp(
    (reportsWithEvidence /
      Math.max(
        submissions.length,
        1
      )) *
      100
  );

  /*
   * RECENCY
   */

  const now = Date.now();

  let recencyTotal = 0;

  submissions.forEach(
    (submission) => {
      const created =
        new Date(
          submission.createdAt
        ).getTime();

      if (Number.isNaN(created)) {
        recencyTotal += 30;
        return;
      }

      const ageInDays =
        Math.max(
          now - created,
          0
        ) /
        (1000 * 60 * 60 * 24);

      if (ageInDays <= 1) {
        recencyTotal += 100;
      } else if (ageInDays <= 7) {
        recencyTotal += 85;
      } else if (ageInDays <= 30) {
        recencyTotal += 65;
      } else if (ageInDays <= 90) {
        recencyTotal += 45;
      } else {
        recencyTotal += 25;
      }
    }
  );

  const recency = clamp(
    recencyTotal /
      Math.max(
        submissions.length,
        1
      )
  );

  /*
   * SEVERITY
   *
   * Use the highest severity found
   * in this category.
   */

  const severityValues =
    submissions.map(
      (submission) =>
        calculateSeverityFromIssue(
          submission.issue || ""
        )
    );

  const severity = clamp(
    Math.max(...severityValues)
  );

  return calculateFromFactors({
    frequency,
    severity,
    geographicConcentration,
    evidence,
    recency,
  });
}

/*
 * ==========================================
 * PUBLIC FUNCTION
 * ==========================================
 *
 * Supports:
 *
 * calculatePriority(submissions, total)
 *
 * AND:
 *
 * calculatePriority({
 *   frequency,
 *   severity,
 *   geographicConcentration,
 *   evidence,
 *   recency
 * })
 */

export function calculatePriority(
  input:
    | PrioritySubmission[]
    | PriorityInput,
  totalSubmissions?: number
): PriorityResult {
  if (Array.isArray(input)) {
    return calculateFromSubmissions(
      input,
      totalSubmissions ??
        input.length
    );
  }

  return calculateFromFactors(input);
}