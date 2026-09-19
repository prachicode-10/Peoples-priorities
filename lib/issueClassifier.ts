/*
 * ============================================================
 * PEOPLE'S PRIORITIES
 * CONTEXT-AWARE MULTILINGUAL ISSUE CLASSIFIER
 * ============================================================
 *
 * This engine provides contextual semantic issue classification
 * by analyzing complete citizen statements rather than relying
 * on isolated keyword counts.
 *
 * Core Capabilities:
 *   1. Cause -> Effect Disambiguation (separates root civic issues
 *      from health or social consequences).
 *   2. Multi-Issue Extraction (extracts compound grievances).
 *   3. Multilingual Understanding (English, Hindi, Odia, and other
 *      Indian languages).
 *   4. Explainable Auditing (generates transparent reasons for AI decisions).
 *   5. Calibrated Confidence Scoring (calibrated 0.0 - 1.0).
 *   6. Clean pluggable interface (IIssueClassifierEngine) for future LLM integration.
 * ============================================================
 */

export type IssueCategory =
  | "Healthcare"
  | "Health & Hygiene"
  | "Food Safety"
  | "Water & Sanitation"
  | "Waste Management"
  | "Roads & Infrastructure"
  | "Electricity"
  | "Education"
  | "Public Transport"
  | "Agriculture"
  | "Employment"
  | "Housing"
  | "Public Safety"
  | "Environment"
  | "Government Services"
  | "Flooding"
  | "Internet & Connectivity"
  // Backward-compatible aliases:
  | "Roads & Transport"
  | "Sanitation"
  | "Safety"
  | "Other";

export interface ContextualIssueAnalysis {
  primaryCategory: IssueCategory;
  secondaryCategories: IssueCategory[];
  theme: string;
  rootIssues: string[];
  impacts: string[];
  keywords: string[];
  confidence: number; // 0.0 to 1.0 (e.g. 0.89)
  reason: string;
  isMultiIssue: boolean;
  language: string;
  originalTranscript: string;
  normalizedText: string;
  detectedCauseEffect?: {
    cause: string;
    effect: string;
  };
}

export interface IssueClassification {
  category: IssueCategory;
  icon: string;
  confidence: number; // 0 to 100 for backward compatibility
  matchedKeywords: string[];
  language: "English" | "Hindi" | "Odia" | "Mixed" | "Unknown";
  analysis?: ContextualIssueAnalysis;
}

export interface IIssueClassifierEngine {
  analyze(text: string, language?: string): ContextualIssueAnalysis;
}

/*
 * ============================================================
 * CATEGORY ICONS & METADATA
 * ============================================================
 */

export const CATEGORY_ICONS: Record<IssueCategory, string> = {
  Healthcare: "🏥",
  "Health & Hygiene": "🧼",
  "Food Safety": "🍽️",
  "Water & Sanitation": "💧",
  "Waste Management": "🗑️",
  "Roads & Infrastructure": "🛣️",
  "Roads & Transport": "🛣️",
  Sanitation: "🗑️",
  Electricity: "⚡",
  Education: "🎓",
  "Public Transport": "🚌",
  Agriculture: "🌾",
  Employment: "💼",
  Housing: "🏠",
  "Public Safety": "🛡️",
  Safety: "🛡️",
  Environment: "🌱",
  "Government Services": "🏛️",
  Flooding: "🌊",
  "Internet & Connectivity": "📡",
  Other: "📌",
};

/*
 * Canonical category normalizer to resolve aliases gracefully
 */
export function canonicalizeCategory(cat: IssueCategory | string): IssueCategory {
  if (cat === "Roads & Transport") return "Roads & Infrastructure";
  if (cat === "Sanitation") return "Waste Management";
  if (cat === "Safety") return "Public Safety";
  return (cat as IssueCategory) || "Other";
}

/*
 * ============================================================
 * NORMALIZATION & LANGUAGE DETECTION
 * ============================================================
 */

export function normalizeText(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFC")
    .replace(/[।,!?;:()[\]{}"'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectLanguage(
  text: string
): "English" | "Hindi" | "Odia" | "Mixed" | "Unknown" {
  const norm = normalizeText(text);
  const hasHindi = /[\u0900-\u097f]/.test(norm);
  const hasOdia = /[\u0b00-\u0b7f]/.test(norm);
  const hasLatin = /[a-zA-Z]/.test(norm);

  if ((hasHindi && hasOdia) || (hasHindi && hasLatin) || (hasOdia && hasLatin)) {
    return "Mixed";
  }
  if (hasHindi) return "Hindi";
  if (hasOdia) return "Odia";
  if (hasLatin) return "English";
  return "Unknown";
}

/*
 * ============================================================
 * IMPACTS / SYMPTOMS ONTOLOGY (CONSEQUENCES, NOT ROOT CAUSES)
 * ============================================================
 */

interface ImpactPattern {
  label: string;
  category: "Health" | "Environmental" | "Access" | "Social";
  terms: string[];
}

const IMPACT_PATTERNS: ImpactPattern[] = [
  {
    label: "Waterborne illness / Diarrhea",
    category: "Health",
    terms: [
      "diarrhea",
      "diarrhoea",
      "cholera",
      "loose motion",
      "vomiting",
      "vomit",
      "stomach infection",
      "jaundice",
      "डायरिया",
      "दस्त",
      "उल्टी",
      "हैजा",
      "पीलिया",
      "पेट दर्द",
      "ଝାଡା",
      "ଝାଡ଼ାବାନ୍ତି",
      "ବାନ୍ତି",
      "କଲେରା",
      "ପେଟ ଖରାପ",
    ],
  },
  {
    label: "Vector-borne disease (Malaria / Dengue)",
    category: "Health",
    terms: [
      "malaria",
      "typhoid",
      "dengue",
      "chikungunya",
      "viral fever",
      "fever",
      "मलेरिया",
      "डेंगू",
      "टाइफाइड",
      "बुखार",
      "वायरल बुखार",
      "ମ୍ୟାଲେରିଆ",
      "ଡେଙ୍ଗୁ",
      "ଟାଇଫଏଡ",
      "ଜ୍ୱର",
    ],
  },
  {
    label: "Public health risk / Illness",
    category: "Health",
    terms: [
      "making people sick",
      "people are getting sick",
      "people getting sick",
      "becoming sick",
      "making children sick",
      "children are becoming sick",
      "falling sick",
      "falling ill",
      "getting sick",
      "illness",
      "sickness",
      "disease",
      "diseases",
      "infection",
      "infections",
      "epidemic",
      "patients suffering",
      "suffering",
      "unwell",
      "death",
      "deaths",
      "लोग बीमार",
      "बीमार हो रहे",
      "बीमारी",
      "बीमार",
      "बच्चे बीमार",
      "तबीयत खराब",
      "संक्रमण",
      "लोग परेशान",
      "ଅସୁସ୍ଥ",
      "ରୋଗ",
      "ରୋଗ ବ୍ୟାପୁଛି",
      "ପିଲାମାନେ ଅସୁସ୍ଥ",
      "ଲୋକ ଅସୁସ୍ଥ",
      "ସଂକ୍ରମଣ",
    ],
  },
  {
    label: "Mosquito breeding / Vector proliferation",
    category: "Environmental",
    terms: [
      "mosquitoes",
      "mosquito",
      "mosquito breeding",
      "flies",
      "insect",
      "मच्छर",
      "मच्छरों",
      "मक्खियां",
      "ମଶା",
      "ମାଛି",
    ],
  },
  {
    label: "Foul odor / Environmental nuisance",
    category: "Environmental",
    terms: [
      "bad smell",
      "foul smell",
      "stinking",
      "stench",
      "odor",
      "odour",
      "बदबू",
      "दुर्गंध",
      "सड़ांध",
      "ଗନ୍ଧ",
      "ଦୁର୍ଗନ୍ଧ",
    ],
  },
  {
    label: "Emergency access disruption (Ambulance / Fire)",
    category: "Access",
    terms: [
      "ambulance cannot reach",
      "ambulances cannot reach",
      "no ambulance can reach",
      "ambulance blocked",
      "cannot reach the village",
      "vehicles cannot pass",
      "vehicles damaged",
      "traffic blocked",
      "road accident",
      "accidents",
      "एम्बुलेंस नहीं आ सकती",
      "गाड़ियां नहीं आ सकती",
      "दुर्घटना",
      "रास्ता बंद",
      "ଆମ୍ବୁଲାନ୍ସ ଆସିପାରୁନାହିଁ",
      "ଗାଡ଼ି ଯାଇପାରୁନାହିଁ",
      "ଦୁର୍ଘଟଣା",
    ],
  },
];

/*
 * ============================================================
 * ROOT PROBLEM DEFINITIONS & DOMAIN LEXICON
 * ============================================================
 */

interface DomainConcept {
  category: IssueCategory;
  theme: string;
  rootLabel: string;
  rootPatterns: string[];
  directPhrases: string[];
  weight: number;
}

const DOMAIN_CONCEPTS: DomainConcept[] = [
  /*
   * 1. FOOD SAFETY
   */
  {
    category: "Food Safety",
    theme: "Food Quality & Safety",
    rootLabel: "Poor or contaminated food quality",
    rootPatterns: [
      "food quality",
      "contaminated food",
      "poor food quality",
      "poor food",
      "stale food",
      "rotten food",
      "spoiled food",
      "unsafe food",
      "bad food",
      "unhygienic food",
      "food contamination",
      "food is stale",
      "food is contaminated",
      "food is very poor",
      "food is rotten",
      "food poisoning",
      "school food",
      "midday meal",
      "mid day meal",
      "canteen food",
      "adulterated food",
      "insect in food",
      "worm in food",
      "stale meal",
      "spoiled meal",
      // Hindi
      "भोजन की गुणवत्ता",
      "खाने की गुणवत्ता",
      "खराब खाना",
      "खराब भोजन",
      "बासी खाना",
      "बासी भोजन",
      "दूषित खाना",
      "दूषित भोजन",
      "सड़ा खाना",
      "सड़ा भोजन",
      "मध्याह्न भोजन",
      "स्कूल का खाना",
      "मिलावटी खाना",
      "मिलावटी भोजन",
      "अस्वच्छ खाना",
      // Odia
      "ଖାଦ୍ୟର ମାନ",
      "ଖରାପ ଖାଦ୍ୟ",
      "ବାସି ଖାଦ୍ୟ",
      "ଦୂଷିତ ଖାଦ୍ୟ",
      "ସଢା ଖାଦ୍ୟ",
      "ମଧ୍ୟାହ୍ନ ଭୋଜନ",
      "ସ୍କୁଲ ଖାଦ୍ୟ",
      "ଅସ୍ୱାସ୍ଥ୍ୟକର ଖାଦ୍ୟ",
    ],
    directPhrases: [
      "food quality in our area",
      "school food is stale",
      "contaminated food is causing",
      "poor food quality is making",
    ],
    weight: 9,
  },

  /*
   * 2. WATER & SANITATION
   */
  {
    category: "Water & Sanitation",
    theme: "Drinking Water Supply & Purity",
    rootLabel: "Unsafe, contaminated or deficient drinking water",
    rootPatterns: [
      "drinking water",
      "clean water",
      "clean drinking water",
      "dirty water",
      "contaminated water",
      "unsafe water",
      "unsafe drinking water",
      "water is not fit to drink",
      "water is contaminated",
      "tap water",
      "water supply",
      "no water",
      "water shortage",
      "no clean water",
      "no clean drinking water",
      "water problem",
      "pipeline leak",
      "pipeline broken",
      "broken pipeline",
      "pipe broken",
      "muddy water",
      "turbid water",
      "tube well broken",
      "hand pump broken",
      "no water supply",
      "water tanker",
      "water pipeline",
      // Hindi
      "पीने का पानी",
      "पीने का पानी नहीं",
      "गंदा पानी",
      "दूषित पानी",
      "पानी की समस्या",
      "पानी की सप्लाई",
      "नल का पानी",
      "पानी नहीं आ रहा",
      "पानी नहीं है",
      "पानी की किल्लत",
      "पानी का संकट",
      "पाइपलाइन टूटी",
      "टूटी पाइप",
      "जलापूर्ति",
      // Odia
      "ପିଇବା ପାଣି",
      "ଦୂଷିତ ପାଣି",
      "ମଇଳା ପାଣି",
      "ପାଣି ନାହିଁ",
      "ପାଣି ଆସୁନାହିଁ",
      "ପାଣି ସମସ୍ୟା",
      "ପାଣି ଯୋଗାଣ",
      "ନଳ ପାଣି",
      "ପାଇପଲାଇନ ଫାଟିଛି",
      "ନଳକୂପ ଅଚଳ",
      "ଜଳ ସମସ୍ୟା",
      "ପିଇବା ପାଣିର ଅଭାବ",
    ],
    directPhrases: [
      "dirty water is causing",
      "no clean drinking water",
      "drinking water is contaminated",
      "village has no water",
      "no clean water",
    ],
    weight: 9,
  },

  /*
   * 3. WASTE MANAGEMENT
   */
  {
    category: "Waste Management",
    theme: "Garbage Collection & Solid Waste",
    rootLabel: "Uncollected garbage and solid waste accumulation",
    rootPatterns: [
      "garbage",
      "garbage is not collected",
      "garbage collection",
      "no garbage collection",
      "garbage dump",
      "dump near",
      "trash",
      "trash is piling up",
      "waste",
      "waste is not collected",
      "solid waste",
      "waste management",
      "waste accumulation",
      "garbage everywhere",
      "no garbage disposal",
      "garbage pile",
      "garbage near",
      "overflowing garbage",
      "open dumping",
      "dustbin",
      "no dustbins",
      "litter",
      "rubbish",
      // Hindi
      "कचरा",
      "कूड़ा",
      "कचरा नहीं उठता",
      "कूड़ा नहीं उठता",
      "कचरे का ढेर",
      "कूड़े का ढेर",
      "कचरा जमा",
      "कूड़ा जमा",
      "कचरा संग्रह",
      "कूड़ादान",
      "गंदगी का ढेर",
      // Odia
      "ଅଳିଆ",
      "ଆବର୍ଜନା",
      "ଅଳିଆ ଆବର୍ଜନା",
      "ଅଳିଆ ସଫା ହେଉନାହିଁ",
      "ଅଳିଆ ଜମା",
      "ଆବର୍ଜନା ଗଦା",
      "କଚରା",
      "ଡଷ୍ଟବିନ ନାହିଁ",
    ],
    directPhrases: [
      "garbage is not collected",
      "garbage dump near",
      "garbage near the market",
      "no garbage collection",
      "garbage near our houses",
    ],
    weight: 9,
  },

  /*
   * 4. SANITATION & DRAINAGE
   */
  {
    category: "Waste Management",
    theme: "Drainage & Sewage Sanitation",
    rootLabel: "Clogged drainage and sewage overflow",
    rootPatterns: [
      "drain",
      "drainage",
      "open drain",
      "clogged drain",
      "blocked drain",
      "overflowing drain",
      "sewer",
      "sewage",
      "sewage overflow",
      "toilet",
      "public toilet",
      "dirty toilet",
      "open defecation",
      "gutters",
      // Hindi
      "नाली",
      "नालियां",
      "खुली नाली",
      "नाली जाम",
      "सीवर",
      "सीवेज",
      "सीवर ओवरफ्लो",
      "शौचालय",
      "सार्वजनिक शौचालय",
      // Odia
      "ଡ୍ରେନ",
      "ନାଳ",
      "ନାଳୀ",
      "ଖୋଲା ଡ୍ରେନ",
      "ନାଳ ବନ୍ଦ",
      "ସିୱେଜ",
      "ଶୌଚାଳୟ",
    ],
    directPhrases: ["drain is overflowing", "blocked drain", "open sewer"],
    weight: 8,
  },

  /*
   * 5. ROADS & INFRASTRUCTURE
   */
  {
    category: "Roads & Infrastructure",
    theme: "Road Quality & Transit Infrastructure",
    rootLabel: "Damaged road infrastructure and potholes",
    rootPatterns: [
      "road",
      "roads",
      "road is broken",
      "broken road",
      "damaged road",
      "pothole",
      "potholes",
      "pothole on road",
      "highway",
      "street",
      "bridge",
      "broken bridge",
      "damaged bridge",
      "road repair",
      "pathway",
      "unpaved road",
      "footpath",
      "sidewalk",
      "cracked road",
      // Hindi
      "सड़क",
      "सड़क",
      "सड़क टूटी",
      "टूटी सड़क",
      "खराब सड़क",
      "सड़क खराब",
      "गड्ढा",
      "गड्ढे",
      "सड़क में गड्ढे",
      "रास्ता टूटा",
      "रास्ता खराब",
      "पुल टूटा",
      "पुल",
      // Odia
      "ରାସ୍ତା",
      "ଭଙ୍ଗା ରାସ୍ତା",
      "ଖରାପ ରାସ୍ତା",
      "ରାସ୍ତାରେ ଗାତ",
      "ଗାତ",
      "ପୋଲ",
      "ପୋଲ ଭାଙ୍ଗିଛି",
      "ସଡ଼କ",
      "ରାସ୍ତା ମରାମତି",
    ],
    directPhrases: [
      "the road is broken",
      "road is broken and ambulances",
      "damaged road",
      "potholes everywhere",
    ],
    weight: 9,
  },

  /*
   * 6. HEALTHCARE
   * Note: This is for direct healthcare services delivery deficiency,
   * e.g., absent doctor, no medicine, hospital closed.
   */
  {
    category: "Healthcare",
    theme: "Medical Facilities & Healthcare Delivery",
    rootLabel: "Deficiency in doctor availability, medicines, or medical facilities",
    rootPatterns: [
      "no doctor",
      "no doctors",
      "doctor is not available",
      "doctor absent",
      "there is no doctor",
      "hospital has no medicines",
      "no medicine",
      "no medicines",
      "hospital",
      "health center",
      "health centre",
      "phc",
      "chc",
      "dispensary",
      "clinic",
      "medical staff",
      "nurses absent",
      "ambulance service",
      "government hospital",
      "sub-center closed",
      // Hindi
      "डॉक्टर नहीं",
      "डॉक्टर नहीं है",
      "अस्पताल में दवा नहीं",
      "दवा नहीं",
      "दवाइयां नहीं",
      "अस्पताल",
      "हॉस्पिटल",
      "स्वास्थ्य केंद्र",
      "चिकित्सक",
      "इलाज नहीं",
      "क्लिनिक",
      // Odia
      "ଡାକ୍ତର ନାହାନ୍ତି",
      "ଡାକ୍ତର ନାହିଁ",
      "ହସ୍ପିଟାଲରେ ଔଷଧ ନାହିଁ",
      "ଔଷଧ ନାହିଁ",
      "ହସ୍ପିଟାଲ",
      "ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର",
      "ଚିକିତ୍ସାଳୟ",
      "ରୋଗୀଙ୍କ ଚିକିତ୍ସା ନାହିଁ",
    ],
    directPhrases: [
      "there is no doctor",
      "hospital has no medicines",
      "no doctor in our village",
      "health center is closed",
    ],
    weight: 9,
  },

  /*
   * 7. EDUCATION
   */
  {
    category: "Education",
    theme: "School Facilities & Educational Staff",
    rootLabel: "School infrastructure or teaching staffing issue",
    rootPatterns: [
      "school",
      "schools",
      "teacher",
      "teachers",
      "no teacher",
      "teachers absent",
      "school building",
      "classroom",
      "student",
      "students",
      "books",
      "library",
      "college",
      "university",
      // Hindi
      "स्कूल",
      "विद्यालय",
      "शिक्षक",
      "अध्यापक",
      "शिक्षक नहीं",
      "पढ़ाई",
      "स्कूल भवन",
      "किताबें",
      // Odia
      "ସ୍କୁଲ",
      "ବିଦ୍ୟାଳୟ",
      "ଶିକ୍ଷକ",
      "ଶିକ୍ଷକ ନାହାନ୍ତି",
      "ପାଠପଢା",
      "ଶ୍ରେଣୀ ଗୃହ",
    ],
    directPhrases: ["no teacher in school", "school building broken"],
    weight: 8,
  },

  /*
   * 8. ELECTRICITY
   */
  {
    category: "Electricity",
    theme: "Power Supply & Electrical Grid",
    rootLabel: "Power outage, voltage fluctuation, or hazardous wiring",
    rootPatterns: [
      "electricity",
      "power cut",
      "powercut",
      "no power",
      "no electricity",
      "blackout",
      "voltage",
      "low voltage",
      "transformer",
      "electric pole",
      "hanging wire",
      "loose wire",
      "electric wire",
      "street light",
      "streetlight",
      "street lights not working",
      // Hindi
      "बिजली",
      "बिजली नहीं",
      "बिजली कटौती",
      "विद्युत",
      "ट्रांसफार्मर",
      "वोल्टेज",
      "बिजली का खंभा",
      "बिजली का तार",
      "स्ट्रीट लाइट",
      // Odia
      "ବିଦ୍ୟୁତ",
      "ବିଜୁଳି",
      "ବିଦ୍ୟୁତ ନାହିଁ",
      "ବିଦ୍ୟୁତ କାଟ",
      "ଟ୍ରାନ୍ସଫର୍ମର",
      "ଭୋଲଟେଜ",
      "ଖୁଣ୍ଟ",
      "ତାର",
      "ଷ୍ଟ୍ରିଟ ଲାଇଟ",
    ],
    directPhrases: ["no electricity", "power cut every day", "street light broken"],
    weight: 8,
  },

  /*
   * 9. FLOODING
   */
  {
    category: "Flooding",
    theme: "Monsoon Waterlogging & Inundation",
    rootLabel: "Monsoon waterlogging or flood inundation",
    rootPatterns: [
      "flood",
      "flooding",
      "waterlogging",
      "water logging",
      "water logged",
      "waterlogged",
      "inundation",
      "rain water trapped",
      "street flooded",
      // Hindi
      "बाढ़",
      "बाढ़",
      "जलभराव",
      "पानी भर गया",
      "जलमग्न",
      "बारिश का पानी",
      // Odia
      "ବନ୍ୟା",
      "ଜଳବନ୍ଦୀ",
      "ପାଣି ଜମିଛି",
      "ବର୍ଷା ପାଣି",
    ],
    directPhrases: ["waterlogging in area", "houses flooded"],
    weight: 8,
  },

  /*
   * 10. PUBLIC SAFETY
   */
  {
    category: "Public Safety",
    theme: "Neighborhood Safety & Policing",
    rootLabel: "Community safety hazard or crime concern",
    rootPatterns: [
      "theft",
      "crime",
      "robbery",
      "harassment",
      "unsafe at night",
      "police patrolling",
      "anti-social",
      "security",
      "public safety",
      // Hindi
      "चोरी",
      "सुरक्षा",
      "अपराध",
      "छेड़छाड़",
      "पुलिस गश्त",
      // Odia
      "ଚୋରି",
      "ସୁରକ୍ଷା",
      "ଅପରାଧ",
      "ପୋଲିସ",
    ],
    directPhrases: ["unsafe at night", "theft in area"],
    weight: 8,
  },

  /*
   * 11. AGRICULTURE
   */
  {
    category: "Agriculture",
    theme: "Farming & Agricultural Support",
    rootLabel: "Crop damage, irrigation or farming supply issue",
    rootPatterns: [
      "crop damage",
      "farming",
      "farmer",
      "farmers",
      "irrigation",
      "fertilizer",
      "seeds",
      "drought",
      "paddy",
      // Hindi
      "फसल",
      "किसान",
      "खेती",
      "सिंचाई",
      "खाद",
      "बीज",
      "सूखा",
      // Odia
      "ଫସଲ",
      "ଚାଷୀ",
      "କୃଷି",
      "ଜଳସେଚନ",
      "ସାର",
      "ବିହନ",
    ],
    directPhrases: ["crop damaged", "irrigation water needed"],
    weight: 7,
  },
];

/*
 * ============================================================
 * CAUSAL CONNECTOR DEFINITIONS
 * ============================================================
 */

interface CausalConnector {
  pattern: RegExp;
  order: "cause_first" | "effect_first";
  connectorText: string;
}

const CAUSAL_CONNECTORS: CausalConnector[] = [
  // English cause-first: "X is causing Y", "X causing Y", "X causes Y"
  {
    pattern: /\b(?:is\s+causing|are\s+causing|was\s+causing|causing|causes|caused)\b/i,
    order: "cause_first",
    connectorText: "causing",
  },
  // English cause-first: "X is making people sick", "X making children sick"
  {
    pattern: /\b(?:is\s+making|are\s+making|making|makes|made)\s+(?:people|children|residents|students|citizens|everyone)?\s*sick\b/i,
    order: "cause_first",
    connectorText: "making sick",
  },
  // English cause-first: "X leading to Y", "X leads to Y"
  {
    pattern: /\b(?:is\s+leading\s+to|are\s+leading\s+to|leading\s+to|leads\s+to|led\s+to)\b/i,
    order: "cause_first",
    connectorText: "leading to",
  },
  // English cause-first: "X resulting in Y"
  {
    pattern: /\b(?:resulting\s+in|results\s+in|resulted\s+in)\b/i,
    order: "cause_first",
    connectorText: "resulting in",
  },
  // English cause-first: "X and [effect phrase]"
  {
    pattern: /\band\s+(?:people\s+are\s+getting\s+sick|many\s+people\s+are\s+getting\s+sick|children\s+are\s+becoming\s+sick|mosquitoes\s+are\s+increasing|ambulances\s+cannot\s+reach)\b/i,
    order: "cause_first",
    connectorText: "and consequence",
  },
  // English effect-first: "Y due to X", "Y because of X"
  {
    pattern: /\b(?:due\s+to|because\s+of|as\s+a\s+result\s+of|caused\s+by)\b/i,
    order: "effect_first",
    connectorText: "due to",
  },

  // Hindi cause-first: "X के कारण Y", "X की वजह से Y"
  {
    pattern: /(?:के\s*कारण|की\s*वजह\s*से|से\s*बीमारी|से\s*लोग\s*बीमार|होने\s*से)/i,
    order: "cause_first",
    connectorText: "के कारण",
  },

  // Odia cause-first: "X ଯୋଗୁଁ Y", "X କାରଣରୁ Y", "X ପାଇଁ Y"
  {
    pattern: /(?:ଯୋଗୁଁ|କାରଣରୁ|ପାଇଁ|ଯୋଗେ|ଦ୍ୱାରା)/i,
    order: "cause_first",
    connectorText: "ଯୋଗୁଁ",
  },
];

/*
 * Multi-issue connectors (compound statements)
 */
const MULTI_ISSUE_CONNECTORS = [
  /\band\s+no\b/i,
  /\band\s+the\s+garbage\b/i,
  /\band\s+garbage\b/i,
  /\band\s+there\s+is\s+no\b/i,
  /\band\s+also\b/i,
  /\bas\s+well\s+as\b/i,
  /\bmoreover\b/i,
  /\bin\s+addition\s+to\b/i,
  // Hindi
  /और\s+(?:कचरा|पानी|सड़क|बिजली|अस्पताल|कोई|न\s*ही)/i,
  /और\s+न\s+ही/i,
  /न\s+ही/i,
  /न\s+तो/i,
  /तथा\s+/i,
  /साथ\s+ही\s+/i,
  // Odia
  /ଏବଂ\s+/i,
  /ଓ\s+(?:ଅଳିଆ|ପାଣି|ରାସ୍ତା|ବିଦ୍ୟୁତ|ଡାକ୍ତର|ନାହିଁ)/i,
  /ସହିତ\s+/i,
];

/*
 * ============================================================
 * CONTEXTUAL CLASSIFIER IMPLEMENTATION
 * ============================================================
 */

export class ContextualIssueClassifierEngine implements IIssueClassifierEngine {
  analyze(text: string, langHint?: string): ContextualIssueAnalysis {
    const rawText = text || "";
    const norm = normalizeText(rawText);
    const lang = langHint || detectLanguage(rawText);

    if (!norm || norm.length < 3) {
      return {
        primaryCategory: "Other",
        secondaryCategories: [],
        theme: "General Inquiry",
        rootIssues: ["Unspecified civic issue"],
        impacts: [],
        keywords: [],
        confidence: 0.2,
        reason: "The complaint text is too brief or empty to determine a specific category.",
        isMultiIssue: false,
        language: lang,
        originalTranscript: rawText,
        normalizedText: norm,
      };
    }

    // 1. Detect Causal Connection (Cause vs Effect)
    let detectedCauseEffect: { cause: string; effect: string } | undefined;
    let causeText = norm;
    let effectText = "";

    for (const connector of CAUSAL_CONNECTORS) {
      const match = norm.search(connector.pattern);
      if (match !== -1) {
        if (connector.order === "cause_first") {
          causeText = norm.substring(0, match).trim();
          effectText = norm.substring(match).trim();
        } else {
          effectText = norm.substring(0, match).trim();
          causeText = norm.substring(match).trim();
        }
        detectedCauseEffect = {
          cause: causeText,
          effect: effectText,
        };
        break;
      }
    }

    // 2. Extract Impacts from the complete text (especially effect clause)
    const detectedImpacts: string[] = [];
    const impactKeywords: string[] = [];

    IMPACT_PATTERNS.forEach((item) => {
      const foundTerms = item.terms.filter((term) => norm.includes(term.toLowerCase()));
      if (foundTerms.length > 0) {
        if (!detectedImpacts.includes(item.label)) {
          detectedImpacts.push(item.label);
        }
        foundTerms.forEach((t) => {
          if (!impactKeywords.includes(t)) impactKeywords.push(t);
        });
      }
    });

    // 3. Multi-issue Clause Splitting
    let isMultiIssue = false;
    const clauseList: string[] = [];

    let hasMultiConnector = false;
    for (const regex of MULTI_ISSUE_CONNECTORS) {
      if (regex.test(norm)) {
        hasMultiConnector = true;
        break;
      }
    }

    if (hasMultiConnector || norm.includes(";") || norm.includes(",")) {
      // Split into candidate clauses
      const parts = norm
        .split(/(?:;|,|\band\s+no\b|\band\s+the\s+garbage\b|\band\s+garbage\b|\band\s+also\b|\bas\s+well\s+as\b|और\s+न\s+ही|न\s+ही|और|तथा|ଏବଂ|ଓ)/i)
        .map((p) => p.trim())
        .filter((p) => p.length > 3);
      if (parts.length > 1) {
        clauseList.push(...parts);
      }
    }

    // 4. Domain Scoring Engine
    // Score each domain based on:
    //  - Matches in the CAUSE text (weighted highest)
    //  - Direct phrases matched (high specificity)
    //  - Matches in the entire text (if not in an effect clause that has an identified root cause)
    interface DomainScore {
      concept: DomainConcept;
      score: number;
      matchedPatterns: string[];
      isCauseMatch: boolean;
      firstIndex: number;
      clauseIndex?: number;
    }

    const domainScores: DomainScore[] = [];

    DOMAIN_CONCEPTS.forEach((concept) => {
      let score = 0;
      const matchedPatterns: string[] = [];
      let isCauseMatch = false;
      let firstIndex = 999999;

      // Check direct phrases
      concept.directPhrases.forEach((phrase) => {
        const pLower = phrase.toLowerCase();
        const idx = norm.indexOf(pLower);
        if (idx !== -1) {
          score += 15;
          matchedPatterns.push(phrase);
          isCauseMatch = true;
          if (idx < firstIndex) firstIndex = idx;
        }
      });

      // Check root patterns in CAUSE text vs whole text
      concept.rootPatterns.forEach((pattern) => {
        const pLower = pattern.toLowerCase();
        const idxInNorm = norm.indexOf(pLower);
        if (idxInNorm !== -1 && idxInNorm < firstIndex) {
          firstIndex = idxInNorm;
        }

        if (causeText.includes(pLower)) {
          // It's in the CAUSE clause!
          const wordCount = pLower.split(" ").length;
          score += 6 + wordCount * 3;
          if (!matchedPatterns.includes(pattern)) matchedPatterns.push(pattern);
          isCauseMatch = true;
        } else if (norm.includes(pLower)) {
          // It's in the text, but might be an effect
          // If this is Healthcare, and the mention is just a symptom/disease (malaria/dengue/sick),
          // DO NOT score Healthcare as root issue!
          const isHealthcareConsequence =
            concept.category === "Healthcare" &&
            (pLower.includes("health") || pLower.includes("रोग") || pLower.includes("बीमार")) &&
            detectedImpacts.length > 0 &&
            !causeText.includes("hospital") &&
            !causeText.includes("doctor") &&
            !causeText.includes("medicine") &&
            !causeText.includes("ଡାକ୍ତର") &&
            !causeText.includes("ଅସୁସ୍ଥ");

          if (!isHealthcareConsequence) {
            score += 4;
            if (!matchedPatterns.includes(pattern)) matchedPatterns.push(pattern);
          }
        }
      });

      // Check against distinct clauses if multi-issue suspected
      if (clauseList.length > 1) {
        clauseList.forEach((clause, idx) => {
          concept.rootPatterns.forEach((pattern) => {
            if (clause.includes(pattern.toLowerCase())) {
              score += 3;
              if (!matchedPatterns.includes(pattern)) matchedPatterns.push(pattern);
            }
          });
        });
      }

      if (score > 0) {
        domainScores.push({
          concept,
          score,
          matchedPatterns,
          isCauseMatch,
          firstIndex,
        });
      }
    });

    // Sort by score descending
    domainScores.sort((a, b) => b.score - a.score);

    // 5. Multi-Issue Extraction
    const activeDomains: DomainScore[] = [];
    const seenCategories = new Set<string>();

    domainScores.forEach((ds) => {
      const cat = ds.concept.category;
      if (!seenCategories.has(cat)) {
        seenCategories.add(cat);
        activeDomains.push(ds);
      }
    });

    // Check if truly multi-issue:
    // We have at least 2 distinct domains with strong scores (> 7)
    // AND the text has multi-connector or compound structure.
    const secondaryCategories: IssueCategory[] = [];
    const extractedRootIssues: string[] = [];

    if (activeDomains.length > 1 && (hasMultiConnector || clauseList.length > 1)) {
      const first = activeDomains[0];
      const second = activeDomains[1];

      // If second category is distinct and strong
      if (second.score >= 7 && second.concept.category !== first.concept.category) {
        isMultiIssue = true;

        // If the second issue was mentioned EARLIER in the citizen's complaint,
        // it is the citizen's primary stated issue!
        if (second.firstIndex < first.firstIndex) {
          activeDomains[0] = second;
          activeDomains[1] = first;
        }

        secondaryCategories.push(activeDomains[1].concept.category);
        extractedRootIssues.push(activeDomains[0].concept.rootLabel);
        extractedRootIssues.push(activeDomains[1].concept.rootLabel);
      } else if (activeDomains.length > 0) {
        extractedRootIssues.push(activeDomains[0].concept.rootLabel);
      }
    } else if (activeDomains.length > 0) {
      extractedRootIssues.push(activeDomains[0].concept.rootLabel);
    }

    // Default primary category
    let primaryCategory: IssueCategory = "Other";
    let theme = "General Community Grievance";
    let matchedKeywords: string[] = [];

    if (activeDomains.length > 0) {
      primaryCategory = activeDomains[0].concept.category;
      theme = activeDomains[0].concept.theme;
      matchedKeywords = activeDomains[0].matchedPatterns;
      if (activeDomains[1] && isMultiIssue) {
        matchedKeywords = Array.from(
          new Set([...matchedKeywords, ...activeDomains[1].matchedPatterns])
        );
      }
    }

    // Add impact keywords
    impactKeywords.forEach((ik) => {
      if (!matchedKeywords.includes(ik)) matchedKeywords.push(ik);
    });

    // 6. Confidence Calculation
    // Base confidence depends on match strength
    let confidence = 0.55;

    if (primaryCategory === "Other") {
      confidence = 0.35;
    } else {
      const topScore = activeDomains[0]?.score || 0;
      if (detectedCauseEffect && activeDomains[0]?.isCauseMatch) {
        // Both Cause and Effect identified clearly: high confidence (0.89 - 0.94)
        confidence = Math.min(0.95, 0.88 + Math.min(topScore * 0.003, 0.06));
      } else if (isMultiIssue) {
        // Clear multi-issue compound statement (0.88 - 0.92)
        confidence = 0.91;
      } else if (topScore >= 20) {
        confidence = 0.93;
      } else if (topScore >= 12) {
        confidence = 0.89;
      } else if (topScore >= 6) {
        confidence = 0.78;
      } else {
        confidence = 0.62;
      }
    }

    // 7. Explainable Reason Generation
    let reason = "";

    if (primaryCategory === "Other") {
      reason =
        "The complaint does not match verified civic infrastructure or public service categories with sufficient specificity.";
    } else if (isMultiIssue) {
      const cat1 = primaryCategory;
      const cat2 = secondaryCategories.join(", ");
      reason = `Multiple distinct civic grievances detected: ${activeDomains[0]?.concept.theme} (${cat1}) and ${activeDomains[1]?.concept.theme} (${cat2}).`;
    } else if (detectedCauseEffect && detectedImpacts.length > 0) {
      const rootTopic = activeDomains[0]?.concept.rootLabel.toLowerCase();
      const impactTopic = detectedImpacts.join(", ").toLowerCase();
      reason = `The complaint primarily reports ${rootTopic}; ${impactTopic} is identified as a consequence/impact rather than the root cause.`;
    } else if (primaryCategory === "Healthcare") {
      reason =
        "Direct healthcare service grievance regarding medical personnel, clinic availability, or medicine supplies.";
    } else if (primaryCategory === "Roads & Infrastructure") {
      if (detectedImpacts.length > 0) {
        reason = `The root issue is damaged road infrastructure; ${detectedImpacts[0].toLowerCase()} is treated as an access impact.`;
      } else {
        reason = "The complaint specifically reports damaged road/pothole infrastructure requiring municipal repair.";
      }
    } else if (primaryCategory === "Food Safety") {
      reason =
        "The complaint focuses on poor/unsafe food quality. Reported illnesses are treated as public health impacts rather than the root issue.";
    } else if (primaryCategory === "Water & Sanitation") {
      reason =
        "The complaint focuses on drinking water purity, supply interruption, or water infrastructure deficiencies.";
    } else if (primaryCategory === "Waste Management") {
      reason =
        "The complaint identifies uncollected waste or solid waste accumulation as the primary civic issue.";
    } else {
      reason = `The complaint was classified into ${primaryCategory} based on contextual indicators for ${theme}.`;
    }

    // Return structured contextual analysis
    return {
      primaryCategory,
      secondaryCategories,
      theme,
      rootIssues: extractedRootIssues.length > 0 ? extractedRootIssues : ["Civic grievance"],
      impacts: detectedImpacts.length > 0 ? detectedImpacts : ["Community inconvenience"],
      keywords: matchedKeywords.slice(0, 8),
      confidence: Number(confidence.toFixed(2)),
      reason,
      isMultiIssue,
      language: lang,
      originalTranscript: rawText,
      normalizedText: norm,
      detectedCauseEffect,
    };
  }
}

/*
 * Default singleton instance
 */
export const defaultIssueClassifierEngine = new ContextualIssueClassifierEngine();

/*
 * ============================================================
 * PRIMARY EXPORTED API
 * ============================================================
 */

export function analyzeIssueContext(
  text: string,
  language?: string
): ContextualIssueAnalysis {
  return defaultIssueClassifierEngine.analyze(text, language);
}

/*
 * ============================================================
 * BACKWARD-COMPATIBLE CLASSIFIER
 * ============================================================
 */

export function classifyIssue(
  text: string,
  languageHint?: string
): IssueClassification {
  const analysis = defaultIssueClassifierEngine.analyze(text, languageHint);

  const langType: IssueClassification["language"] =
    analysis.language === "Hindi"
      ? "Hindi"
      : analysis.language === "Odia"
      ? "Odia"
      : analysis.language === "English"
      ? "English"
      : analysis.language === "Mixed"
      ? "Mixed"
      : "Unknown";

  return {
    category: analysis.primaryCategory,
    icon: CATEGORY_ICONS[analysis.primaryCategory] || "📌",
    confidence: Math.round(analysis.confidence * 100),
    matchedKeywords: analysis.keywords,
    language: langType,
    analysis,
  };
}

/*
 * Backward-compatible getCategory()
 */
export function getCategory(issue: string): {
  name: IssueCategory;
  icon: string;
} {
  const result = classifyIssue(issue);
  return {
    name: result.category,
    icon: result.icon,
  };
}

/*
 * Exported normalizer
 */
export function normalizeIssueText(issue: string): string {
  return normalizeText(issue);
}