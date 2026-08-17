/*
 * ============================================================
 * PEOPLE'S PRIORITIES
 * MULTILINGUAL ISSUE CLASSIFIER
 * ============================================================
 *
 * Supports:
 *   🇮🇳 English
 *   🇮🇳 Hindi
 *   🇮🇳 Odia
 *
 * The classifier is deterministic and explainable.
 * It does NOT require an external API.
 *
 * The goal is to prevent valid Hindi/Odia complaints
 * from automatically falling into "Other".
 * ============================================================
 */

export type IssueCategory =
  | "Roads & Transport"
  | "Water & Sanitation"
  | "Electricity"
  | "Healthcare"
  | "Education"
  | "Flooding"
  | "Agriculture"
  | "Housing"
  | "Employment"
  | "Safety"
  | "Government Services"
  | "Internet & Connectivity"
  | "Environment"
  | "Waste Management"
  | "Other";

export type IssueClassification = {
  category: IssueCategory;
  icon: string;
  confidence: number;
  matchedKeywords: string[];
  language: "English" | "Hindi" | "Odia" | "Mixed" | "Unknown";
};

/*
 * ============================================================
 * NORMALIZATION
 * ============================================================
 */

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[।,!?;:()[\]{}"'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * ============================================================
 * LANGUAGE DETECTION
 * ============================================================
 */

function detectLanguage(
  text: string
): IssueClassification["language"] {
  const normalized = normalizeText(text);

  const hasHindi = /[\u0900-\u097f]/.test(
    normalized
  );

  const hasOdia = /[\u0b00-\u0b7f]/.test(
    normalized
  );

  const hasLatin = /[a-zA-Z]/.test(
    normalized
  );

  if (hasHindi && hasOdia) {
    return "Mixed";
  }

  if (hasHindi) {
    return hasLatin ? "Mixed" : "Hindi";
  }

  if (hasOdia) {
    return hasLatin ? "Mixed" : "Odia";
  }

  if (hasLatin) {
    return "English";
  }

  return "Unknown";
}

/*
 * ============================================================
 * KEYWORD DATABASE
 * ============================================================
 */

const CATEGORY_KEYWORDS: Record<
  IssueCategory,
  string[]
> = {
  /*
   * ----------------------------------------------------------
   * ROADS & TRANSPORT
   * ----------------------------------------------------------
   */

  "Roads & Transport": [
    // English
    "road",
    "roads",
    "street",
    "pothole",
    "potholes",
    "highway",
    "bridge",
    "footpath",
    "sidewalk",
    "traffic",
    "bus",
    "bus stop",
    "transport",
    "public transport",
    "broken road",
    "damaged road",
    "road repair",
    "road accident",

    // Hindi
    "सड़क",
    "सड़क",
    "सडक",
    "सड़के",
    "रास्ता",
    "रास्ते",
    "मार्ग",
    "गली",
    "गड्ढा",
    "गड्ढे",
    "पुल",
    "फुटपाथ",
    "यातायात",
    "ट्रैफिक",
    "बस",
    "बस स्टॉप",
    "परिवहन",
    "सड़क खराब",
    "सड़क टूटी",
    "खराब सड़क",
    "टूटी सड़क",
    "सड़क की समस्या",

    // Odia
    "ରାସ୍ତା",
    "ରାସ୍ତାଘାଟ",
    "ସଡକ",
    "ସଡ଼କ",
    "ଗାତ",
    "ପୋଲ",
    "ଫୁଟପାଥ",
    "ଯାତାୟାତ",
    "ବସ",
    "ବସ ଷ୍ଟପ",
    "ପରିବହନ",
    "ଭଙ୍ଗା ରାସ୍ତା",
    "ଖରାପ ରାସ୍ତା",
    "ରାସ୍ତା ସମସ୍ୟା",
    "ରାସ୍ତା ମରାମତି",
  ],

  /*
   * ----------------------------------------------------------
   * WATER & SANITATION
   * ----------------------------------------------------------
   */

  "Water & Sanitation": [
    // English
    "water",
    "drinking water",
    "water supply",
    "water shortage",
    "water problem",
    "water issue",
    "tap water",
    "pipeline",
    "water tank",
    "water tanker",
    "no water",
    "dirty water",
    "unsafe water",
    "drain",
    "drainage",
    "sewage",
    "sewer",
    "toilet",
    "public toilet",
    "sanitation",
    "cleanliness",

    // Hindi
    "पानी",
    "पानी की समस्या",
    "पानी की दिक्कत",
    "पीने का पानी",
    "जल",
    "जल समस्या",
    "जल की समस्या",
    "जल संकट",
    "पानी नहीं",
    "पानी नहीं आ रहा",
    "पानी की कमी",
    "पानी की सप्लाई",
    "जलापूर्ति",
    "नल का पानी",
    "गंदा पानी",
    "पाइपलाइन",
    "पानी की पाइप",
    "नाली",
    "नालियां",
    "नाला",
    "सीवर",
    "सीवेज",
    "शौचालय",
    "सफाई",
    "स्वच्छता",

    // Odia
    "ପାଣି",
    "ଜଳ",
    "ପିଇବା ପାଣି",
    "ପାଣି ସମସ୍ୟା",
    "ଜଳ ସମସ୍ୟା",
    "ପାଣି ନାହିଁ",
    "ପାଣି ଆସୁନାହିଁ",
    "ପାଣିର ଅଭାବ",
    "ପାଣି ଯୋଗାଣ",
    "ଜଳ ଯୋଗାଣ",
    "ନଳ ପାଣି",
    "ଦୂଷିତ ପାଣି",
    "ପାଇପଲାଇନ",
    "ନାଳ",
    "ନାଳୀ",
    "ଡ୍ରେନ",
    "ସିୱେଜ",
    "ଶୌଚାଳୟ",
    "ପରିମଳ",
    "ସ୍ୱଚ୍ଛତା",
  ],

  /*
   * ----------------------------------------------------------
   * ELECTRICITY
   * ----------------------------------------------------------
   */

  Electricity: [
    // English
    "electricity",
    "electric",
    "power",
    "power cut",
    "powercut",
    "blackout",
    "transformer",
    "voltage",
    "electric pole",
    "electric wire",
    "electricity supply",
    "power supply",
    "no electricity",

    // Hindi
    "बिजली",
    "बिजली की समस्या",
    "बिजली की दिक्कत",
    "बिजली नहीं",
    "बिजली नहीं है",
    "बिजली कटौती",
    "बिजली कट",
    "बिजली सप्लाई",
    "विद्युत",
    "विद्युत समस्या",
    "बिजली का पोल",
    "बिजली का तार",
    "ट्रांसफार्मर",
    "वोल्टेज",
    "लाइट नहीं",

    // Odia
    "ବିଦ୍ୟୁତ",
    "ବିଜୁଳି",
    "ବିଦ୍ୟୁତ ସମସ୍ୟା",
    "ବିଦ୍ୟୁତ ନାହିଁ",
    "ବିଦ୍ୟୁତ ଯାଉଛି",
    "ବିଦ୍ୟୁତ ଯୋଗାଣ",
    "ବିଦ୍ୟୁତ ଖୁଣ୍ଟ",
    "ତାର",
    "ଟ୍ରାନ୍ସଫର୍ମର",
    "ଭୋଲଟେଜ",
  ],

  /*
   * ----------------------------------------------------------
   * HEALTHCARE
   * ----------------------------------------------------------
   */

  Healthcare: [
    // English
    "hospital",
    "health",
    "healthcare",
    "health center",
    "health centre",
    "doctor",
    "medicine",
    "medicines",
    "medical",
    "clinic",
    "ambulance",
    "treatment",
    "patient",
    "pharmacy",
    "health problem",
    "health issue",
    "no doctor",
    "no medicine",

    // Hindi
    "अस्पताल",
    "हॉस्पिटल",
    "स्वास्थ्य",
    "स्वास्थ्य केंद्र",
    "स्वास्थ्य केन्द्र",
    "डॉक्टर",
    "चिकित्सक",
    "दवा",
    "दवाइयां",
    "दवाई",
    "इलाज",
    "उपचार",
    "क्लिनिक",
    "एम्बुलेंस",
    "मरीज",
    "स्वास्थ्य समस्या",
    "डॉक्टर नहीं",
    "दवा नहीं",
    "इलाज नहीं",

    // Odia
    "ହସ୍ପିଟାଲ",
    "ଡାକ୍ତର",
    "ସ୍ୱାସ୍ଥ୍ୟ",
    "ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର",
    "ଔଷଧ",
    "ଚିକିତ୍ସା",
    "ଆମ୍ବୁଲାନ୍ସ",
    "କ୍ଲିନିକ",
    "ରୋଗୀ",
    "ସ୍ୱାସ୍ଥ୍ୟ ସମସ୍ୟା",
    "ଡାକ୍ତର ନାହାନ୍ତି",
    "ଔଷଧ ନାହିଁ",
  ],

  /*
   * ----------------------------------------------------------
   * EDUCATION
   * ----------------------------------------------------------
   */

  Education: [
    // English
    "school",
    "schools",
    "education",
    "teacher",
    "teachers",
    "student",
    "students",
    "college",
    "university",
    "classroom",
    "school building",
    "school bus",
    "midday meal",
    "books",
    "library",

    // Hindi
    "स्कूल",
    "विद्यालय",
    "शिक्षा",
    "शिक्षक",
    "अध्यापक",
    "छात्र",
    "छात्रों",
    "कॉलेज",
    "विश्वविद्यालय",
    "कक्षा",
    "पढ़ाई",
    "पढाई",
    "स्कूल भवन",
    "स्कूल की समस्या",
    "शिक्षा की समस्या",
    "किताब",
    "पुस्तकालय",
    "मध्याह्न भोजन",

    // Odia
    "ସ୍କୁଲ",
    "ବିଦ୍ୟାଳୟ",
    "ଶିକ୍ଷା",
    "ଶିକ୍ଷକ",
    "ଛାତ୍ର",
    "ଛାତ୍ରଛାତ୍ରୀ",
    "କଲେଜ",
    "ବିଶ୍ୱବିଦ୍ୟାଳୟ",
    "ଶ୍ରେଣୀ",
    "ପାଠପଢା",
    "ପାଠପଢ଼ା",
    "ସ୍କୁଲ ସମସ୍ୟା",
    "ଶିକ୍ଷା ସମସ୍ୟା",
    "ପୁସ୍ତକ",
    "ଲାଇବ୍ରେରୀ",
  ],

  /*
   * ----------------------------------------------------------
   * FLOODING
   * ----------------------------------------------------------
   */

  Flooding: [
    // English
    "flood",
    "flooding",
    "waterlogging",
    "water logging",
    "water logged",
    "waterlogged",
    "inundation",
    "flood water",
    "rain water",
    "rainwater",
    "heavy flooding",
    "street flooding",

    // Hindi
    "बाढ़",
    "बाढ़",
    "बाढ़ की समस्या",
    "बाढ़ का पानी",
    "जलभराव",
    "जल भराव",
    "पानी भर गया",
    "पानी भर जाता है",
    "बारिश का पानी",
    "बारिश में पानी",
    "जलमग्न",
    "जलमग्नता",
    "भारी बारिश",
    "सड़क पर पानी",

    // Odia
    "ବନ୍ୟା",
    "ବନ୍ୟା ପାଣି",
    "ଜଳବନ୍ଦୀ",
    "ଜଳବନ୍ଧ",
    "ଜଳ ଜମିବା",
    "ପାଣି ଜମିଛି",
    "ବର୍ଷା ପାଣି",
    "ବର୍ଷାରେ ପାଣି",
    "ଜଳମଗ୍ନ",
  ],

  /*
   * ----------------------------------------------------------
   * AGRICULTURE
   * ----------------------------------------------------------
   */

  Agriculture: [
    // English
    "agriculture",
    "farmer",
    "farmers",
    "farming",
    "crop",
    "crops",
    "cultivation",
    "irrigation",
    "fertilizer",
    "fertiliser",
    "seeds",
    "pesticide",
    "harvest",
    "farm",
    "agricultural",
    "crop damage",

    // Hindi
    "कृषि",
    "किसान",
    "खेती",
    "फसल",
    "फसलों",
    "सिंचाई",
    "खाद",
    "बीज",
    "कीटनाशक",
    "फसल खराब",
    "फसल नुकसान",
    "कृषि समस्या",
    "खेती की समस्या",

    // Odia
    "କୃଷି",
    "ଚାଷ",
    "ଚାଷୀ",
    "କୃଷକ",
    "ଫସଲ",
    "ଫସଲ ନଷ୍ଟ",
    "ଜଳସେଚନ",
    "ସାର",
    "ବିହନ",
    "କୀଟନାଶକ",
    "ଚାଷ ସମସ୍ୟା",
  ],

  /*
   * ----------------------------------------------------------
   * HOUSING
   * ----------------------------------------------------------
   */

  Housing: [
    // English
    "house",
    "housing",
    "home",
    "homes",
    "shelter",
    "roof",
    "building",
    "house damage",
    "damaged house",
    "housing problem",
    "housing scheme",

    // Hindi
    "घर",
    "मकान",
    "आवास",
    "आवास समस्या",
    "आवास योजना",
    "छत",
    "मकान खराब",
    "घर खराब",
    "घर की समस्या",

    // Odia
    "ଘର",
    "ବାସଗୃହ",
    "ଆବାସ",
    "ଆବାସ ଯୋଜନା",
    "ଛାତ",
    "ଘର ସମସ୍ୟା",
    "ଘର ନଷ୍ଟ",
  ],

  /*
   * ----------------------------------------------------------
   * EMPLOYMENT
   * ----------------------------------------------------------
   */

  Employment: [
    // English
    "employment",
    "job",
    "jobs",
    "unemployment",
    "work",
    "worker",
    "workers",
    "wage",
    "salary",
    "employment opportunity",
    "job opportunity",
    "skill training",

    // Hindi
    "रोजगार",
    "नौकरी",
    "बेरोजगारी",
    "काम",
    "मजदूर",
    "मजदूरी",
    "वेतन",
    "रोजगार समस्या",
    "नौकरी नहीं",
    "काम नहीं",

    // Odia
    "ରୋଜଗାର",
    "ଚାକିରି",
    "ବେକାର",
    "କାମ",
    "ଶ୍ରମିକ",
    "ମଜୁରୀ",
    "ଦରମା",
    "ରୋଜଗାର ସମସ୍ୟା",
    "ଚାକିରି ନାହିଁ",
  ],

  /*
   * ----------------------------------------------------------
   * SAFETY
   * ----------------------------------------------------------
   */

  Safety: [
    // English
    "safety",
    "unsafe",
    "danger",
    "dangerous",
    "accident",
    "crime",
    "police",
    "violence",
    "fire",
    "emergency",
    "life threatening",
    "security",
    "street light",

    // Hindi
    "सुरक्षा",
    "असुरक्षित",
    "खतरा",
    "खतरनाक",
    "दुर्घटना",
    "अपराध",
    "पुलिस",
    "हिंसा",
    "आग",
    "आपातकाल",
    "सुरक्षित नहीं",

    // Odia
    "ସୁରକ୍ଷା",
    "ଅସୁରକ୍ଷିତ",
    "ବିପଦ",
    "ଦୁର୍ଘଟଣା",
    "ଅପରାଧ",
    "ପୋଲିସ",
    "ହିଂସା",
    "ଅଗ୍ନି",
    "ଜରୁରୀ",
  ],

  /*
   * ----------------------------------------------------------
   * GOVERNMENT SERVICES
   * ----------------------------------------------------------
   */

  "Government Services": [
    // English
    "government",
    "government office",
    "municipality",
    "municipal",
    "panchayat",
    "gram panchayat",
    "certificate",
    "ration card",
    "pension",
    "welfare",
    "scheme",
    "government scheme",
    "public service",
    "official",
    "application",
    "document",

    // Hindi
    "सरकार",
    "सरकारी",
    "सरकारी कार्यालय",
    "नगरपालिका",
    "पंचायत",
    "ग्राम पंचायत",
    "प्रमाण पत्र",
    "राशन कार्ड",
    "पेंशन",
    "कल्याण",
    "योजना",
    "सरकारी योजना",
    "सरकारी सेवा",
    "दस्तावेज",

    // Odia
    "ସରକାର",
    "ସରକାରୀ",
    "ସରକାରୀ କାର୍ଯ୍ୟାଳୟ",
    "ପୌରପାଳିକା",
    "ପଞ୍ଚାୟତ",
    "ଗ୍ରାମ ପଞ୍ଚାୟତ",
    "ପ୍ରମାଣପତ୍ର",
    "ରାସନ କାର୍ଡ",
    "ପେନସନ",
    "ଯୋଜନା",
    "ସରକାରୀ ଯୋଜନା",
    "ସରକାରୀ ସେବା",
    "ଦଲିଲ",
  ],

  /*
   * ----------------------------------------------------------
   * INTERNET & CONNECTIVITY
   * ----------------------------------------------------------
   */

  "Internet & Connectivity": [
    // English
    "internet",
    "network",
    "mobile network",
    "mobile signal",
    "signal",
    "wifi",
    "wi-fi",
    "broadband",
    "connectivity",
    "no network",
    "no internet",
    "internet problem",
    "internet issue",

    // Hindi
    "इंटरनेट",
    "नेटवर्क",
    "मोबाइल नेटवर्क",
    "मोबाइल सिग्नल",
    "सिग्नल",
    "वाईफाई",
    "कनेक्टिविटी",
    "नेटवर्क नहीं",
    "इंटरनेट नहीं",
    "इंटरनेट समस्या",

    // Odia
    "ଇଣ୍ଟରନେଟ",
    "ନେଟୱର୍କ",
    "ମୋବାଇଲ ନେଟୱର୍କ",
    "ସିଗନାଲ",
    "ୱାଇଫାଇ",
    "କନେକ୍ଟିଭିଟି",
    "ନେଟୱର୍କ ନାହିଁ",
    "ଇଣ୍ଟରନେଟ ନାହିଁ",
  ],

  /*
   * ----------------------------------------------------------
   * ENVIRONMENT
   * ----------------------------------------------------------
   */

  Environment: [
    // English
    "environment",
    "pollution",
    "air pollution",
    "water pollution",
    "river pollution",
    "forest",
    "trees",
    "tree",
    "deforestation",
    "climate",
    "smoke",
    "plastic pollution",
    "environmental",

    // Hindi
    "पर्यावरण",
    "प्रदूषण",
    "वायु प्रदूषण",
    "जल प्रदूषण",
    "नदी प्रदूषण",
    "जंगल",
    "पेड़",
    "पेड़",
    "वन",
    "जलवायु",
    "धुआं",
    "प्लास्टिक प्रदूषण",

    // Odia
    "ପରିବେଶ",
    "ପ୍ରଦୂଷଣ",
    "ବାୟୁ ପ୍ରଦୂଷଣ",
    "ଜଳ ପ୍ରଦୂଷଣ",
    "ନଦୀ ପ୍ରଦୂଷଣ",
    "ଜଙ୍ଗଲ",
    "ଗଛ",
    "ବନ",
    "ଜଳବାୟୁ",
    "ଧୂଆଁ",
    "ପ୍ଲାଷ୍ଟିକ ପ୍ରଦୂଷଣ",
  ],

  /*
   * ----------------------------------------------------------
   * WASTE MANAGEMENT
   * ----------------------------------------------------------
   */

  "Waste Management": [
    // English
    "garbage",
    "trash",
    "waste",
    "solid waste",
    "waste collection",
    "garbage collection",
    "garbage dump",
    "dumping",
    "litter",
    "dustbin",
    "bin",

    // Hindi
    "कचरा",
    "कूड़ा",
    "कूड़ा",
    "कचरे",
    "कचरा संग्रह",
    "कचरा नहीं उठता",
    "कचरा जमा",
    "कूड़ेदान",
    "कूड़ेदान",
    "कचरा डंप",

    // Odia
    "ଆବର୍ଜନା",
    "ଅଳିଆ",
    "ଅଳିଆ ଆବର୍ଜନା",
    "କଚରା",
    "ଅଳିଆ ସଂଗ୍ରହ",
    "କଚରା ସଂଗ୍ରହ",
    "କଚରା ଜମା",
    "ଡଷ୍ଟବିନ",
  ],

  Other: [],
};

/*
 * ============================================================
 * CATEGORY ICONS
 * ============================================================
 */

const CATEGORY_ICONS: Record<
  IssueCategory,
  string
> = {
  "Roads & Transport": "🛣️",
  "Water & Sanitation": "💧",
  Electricity: "⚡",
  Healthcare: "🏥",
  Education: "🎓",
  Flooding: "🌊",
  Agriculture: "🌾",
  Housing: "🏠",
  Employment: "👷",
  Safety: "🛡️",
  "Government Services": "🏛️",
  "Internet & Connectivity": "📡",
  Environment: "🌳",
  "Waste Management": "🗑️",
  Other: "📌",
};

/*
 * ============================================================
 * SPECIAL PRIORITY RULES
 * ============================================================
 *
 * Some phrases are more specific than individual keywords.
 *
 * Example:
 *
 * "road par pani bhar jata hai"
 *
 * should be Flooding rather than Water.
 * ============================================================
 */

const FLOODING_OVERRIDES = [
  "waterlogging",
  "water logging",
  "waterlogged",
  "water logged",
  "flood",
  "flooding",
  "inundation",

  "जलभराव",
  "जल भराव",
  "बाढ़",
  "बाढ़",
  "पानी भर गया",
  "पानी भर जाता है",

  "ଜଳବନ୍ଦୀ",
  "ବନ୍ୟା",
  "ପାଣି ଜମିଛି",
];

/*
 * ============================================================
 * CLASSIFY
 * ============================================================
 */

export function classifyIssue(
  issue: string
): IssueClassification {
  const text = normalizeText(issue);

  if (!text) {
    return {
      category: "Other",
      icon: CATEGORY_ICONS.Other,
      confidence: 0,
      matchedKeywords: [],
      language: "Unknown",
    };
  }

  const language =
    detectLanguage(text);

  /*
   * Flooding gets priority over normal water.
   */

  const floodingMatches =
    FLOODING_OVERRIDES.filter(
      (keyword) =>
        text.includes(
          normalizeText(keyword)
        )
    );

  if (floodingMatches.length > 0) {
    return {
      category: "Flooding",
      icon: CATEGORY_ICONS.Flooding,
      confidence: Math.min(
        98,
        82 +
          floodingMatches.length * 8
      ),
      matchedKeywords:
        floodingMatches,
      language,
    };
  }

  /*
   * Score every category.
   */

  const scores: Record<
    IssueCategory,
    {
      score: number;
      matches: string[];
    }
  > = {} as Record<
    IssueCategory,
    {
      score: number;
      matches: string[];
    }
  >;

  for (const category of Object.keys(
    CATEGORY_KEYWORDS
  ) as IssueCategory[]) {
    const keywords =
      CATEGORY_KEYWORDS[category];

    const matches = keywords.filter(
      (keyword) =>
        text.includes(
          normalizeText(keyword)
        )
    );

    let score = 0;

    matches.forEach(
      (keyword) => {
        /*
         * Longer phrases are more specific,
         * therefore they receive more weight.
         */

        const normalizedKeyword =
          normalizeText(keyword);

        if (
          normalizedKeyword.includes(" ")
        ) {
          score += 3;
        } else {
          score += 2;
        }
      }
    );

    scores[category] = {
      score,
      matches,
    };
  }

  /*
   * Find highest scoring category.
   */

  let bestCategory: IssueCategory =
    "Other";

  let bestScore = 0;

  let bestMatches: string[] = [];

  for (const category of Object.keys(
    scores
  ) as IssueCategory[]) {
    const current =
      scores[category];

    if (
      current.score >
      bestScore
    ) {
      bestScore = current.score;
      bestCategory = category;
      bestMatches =
        current.matches;
    }
  }

  /*
   * No meaningful match.
   */

  if (
    bestCategory === "Other" ||
    bestScore === 0
  ) {
    return {
      category: "Other",
      icon: CATEGORY_ICONS.Other,
      confidence: 20,
      matchedKeywords: [],
      language,
    };
  }

  /*
   * Confidence is based on the
   * number/strength of matches.
   */

  const confidence = Math.min(
    98,
    55 + bestScore * 8
  );

  return {
    category: bestCategory,
    icon: CATEGORY_ICONS[
      bestCategory
    ],
    confidence,
    matchedKeywords:
      bestMatches,
    language,
  };
}

/*
 * ============================================================
 * BACKWARD-COMPATIBLE FUNCTION
 * ============================================================
 *
 * Your dashboard previously used getCategory().
 *
 * Keeping this function means we can replace the old
 * dashboard classifier without breaking existing code.
 * ============================================================
 */

export function getCategory(
  issue: string
): {
  name: IssueCategory;
  icon: string;
} {
  const result =
    classifyIssue(issue);

  return {
    name: result.category,
    icon: result.icon,
  };
}

/*
 * ============================================================
 * NORMALIZER EXPORT
 * ============================================================
 */

export function normalizeIssueText(
  issue: string
): string {
  return normalizeText(issue);
}