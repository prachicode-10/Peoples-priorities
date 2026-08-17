export type Issue = {
  id: number;
  category: string;
  title: {
    en: string;
    hi: string;
    or: string;
  };
  requests: number;
  hotspots: number;
  severity: number;
  populationAffected: number;
  infrastructureGap: number;
  impact: number;
};

export const constituencyData: Issue[] = [
  {
    id: 1,
    category: "water",
    title: {
      en: "Drinking Water",
      hi: "पीने का पानी",
      or: "ପାନୀୟ ଜଳ",
    },
    requests: 8421,
    hotspots: 14,
    severity: 91,
    populationAffected: 38200,
    infrastructureGap: 87,
    impact: 94,
  },
  {
    id: 2,
    category: "health",
    title: {
      en: "Healthcare Access",
      hi: "स्वास्थ्य सेवा",
      or: "ସ୍ୱାସ୍ଥ୍ୟସେବା",
    },
    requests: 6184,
    hotspots: 9,
    severity: 86,
    populationAffected: 27400,
    infrastructureGap: 82,
    impact: 91,
  },
  {
    id: 3,
    category: "roads",
    title: {
      en: "Road Infrastructure",
      hi: "सड़क बुनियादी ढाँचा",
      or: "ସଡ଼କ ଭିତ୍ତିଭୂମି",
    },
    requests: 5927,
    hotspots: 11,
    severity: 82,
    populationAffected: 31800,
    infrastructureGap: 79,
    impact: 88,
  },
  {
    id: 4,
    category: "education",
    title: {
      en: "Education",
      hi: "शिक्षा",
      or: "ଶିକ୍ଷା",
    },
    requests: 4712,
    hotspots: 8,
    severity: 76,
    populationAffected: 22100,
    infrastructureGap: 73,
    impact: 84,
  },
  {
    id: 5,
    category: "electricity",
    title: {
      en: "Electricity",
      hi: "बिजली",
      or: "ବିଦ୍ୟୁତ୍",
    },
    requests: 3896,
    hotspots: 7,
    severity: 71,
    populationAffected: 18400,
    infrastructureGap: 69,
    impact: 79,
  },
  {
    id: 6,
    category: "sanitation",
    title: {
      en: "Sanitation",
      hi: "स्वच्छता",
      or: "ପରିମଳ",
    },
    requests: 3154,
    hotspots: 6,
    severity: 67,
    populationAffected: 15600,
    infrastructureGap: 64,
    impact: 75,
  },
];

export const totalSubmissions = constituencyData.reduce(
  (total, issue) => total + issue.requests,
  0
);

export const totalHotspots = constituencyData.reduce(
  (total, issue) => total + issue.hotspots,
  0
);

export const criticalPriorities = constituencyData.filter(
  (issue) => issue.severity >= 80
).length;

export const totalPopulationAffected = constituencyData.reduce(
  (total, issue) => total + issue.populationAffected,
  0
);

export function calculatePriorityScore(issue: Issue) {
  return Math.round(
    issue.severity * 0.35 +
      issue.infrastructureGap * 0.25 +
      issue.impact * 0.25 +
      Math.min(issue.requests / 100, 100) * 0.15
  );
}

export const rankedIssues = [...constituencyData]
  .map((issue) => ({
    ...issue,
    score: calculatePriorityScore(issue),
  }))
  .sort((a, b) => b.score - a.score);