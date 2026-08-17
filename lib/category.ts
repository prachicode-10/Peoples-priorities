export type IssueCategory = {
  name:
    | "Roads"
    | "Water"
    | "Electricity"
    | "Sanitation"
    | "Healthcare"
    | "Education"
    | "Flooding"
    | "Other";
  icon: string;
};

/*
 * ============================================================
 * TEXT NORMALIZATION
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
 * WORD MATCHING
 * ============================================================
 *
 * We intentionally use many common variations instead of
 * depending on one exact spelling.
 *
 * Supports:
 * English
 * Hindi
 * Odia
 *
 * This is still deterministic and lightweight — no API/database
 * is required.
 * ============================================================
 */

function containsAny(
  text: string,
  words: string[]
): boolean {
  return words.some((word) =>
    text.includes(word)
  );
}

/*
 * ============================================================
 * ROADS
 * ============================================================
 */

const ROAD_WORDS = [
  // English
  "road",
  "roads",
  "street",
  "streets",
  "pothole",
  "potholes",
  "highway",
  "pathway",
  "lane",
  "bridge",
  "broken road",
  "damaged road",
  "road damage",
  "road problem",
  "road repair",

  // Hindi
  "सड़क",
  "सड़क",
  "सडक",
  "सड़के",
  "सड़के",
  "रास्ता",
  "रास्ते",
  "मार्ग",
  "गली",
  "गलियां",
  "गड्ढा",
  "गड्ढे",
  "पुल",
  "टूटी सड़क",
  "टूटी हुई सड़क",
  "खराब सड़क",
  "सड़क खराब",
  "सड़क टूटी",
  "रास्ता खराब",
  "रास्ता टूटा",
  "सड़क की समस्या",
  "सड़क की दिक्कत",
  "सड़क मरम्मत",

  // Odia
  "ରାସ୍ତା",
  "ରାସ୍ତାଘାଟ",
  "ସଡକ",
  "ସଡ଼କ",
  "ଗାଡ଼ି ରାସ୍ତା",
  "ଗାତ",
  "ପୋଲ",
  "ଭଙ୍ଗା ରାସ୍ତା",
  "ଖରାପ ରାସ୍ତା",
  "ରାସ୍ତା ସମସ୍ୟା",
  "ରାସ୍ତା ମରାମତି",
];

/*
 * ============================================================
 * WATER
 * ============================================================
 */

const WATER_WORDS = [
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

  // Hindi
  "पानी",
  "पानी की समस्या",
  "पानी की दिक्कत",
  "पीने का पानी",
  "पीने के पानी",
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
  "पानी गंदा",
  "पाइपलाइन",
  "पानी की पाइप",

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
];

/*
 * ============================================================
 * ELECTRICITY
 * ============================================================
 */

const ELECTRICITY_WORDS = [
  // English
  "electric",
  "electricity",
  "power",
  "power cut",
  "powercut",
  "electric pole",
  "electric wire",
  "transformer",
  "voltage",
  "no electricity",
  "electricity problem",
  "electricity issue",
  "electricity supply",
  "power supply",
  "blackout",

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
  "लाइट की समस्या",

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
];

/*
 * ============================================================
 * SANITATION
 * ============================================================
 */

const SANITATION_WORDS = [
  // English
  "garbage",
  "trash",
  "waste",
  "solid waste",
  "dirty",
  "dirt",
  "cleanliness",
  "sanitation",
  "drain",
  "drainage",
  "sewage",
  "sewer",
  "toilet",
  "public toilet",
  "open defecation",
  "garbage collection",
  "waste collection",

  // Hindi
  "कचरा",
  "कूड़ा",
  "कूड़ा",
  "कचरे",
  "गंदगी",
  "सफाई",
  "स्वच्छता",
  "नाली",
  "नालियां",
  "नाला",
  "सीवर",
  "सीवेज",
  "शौचालय",
  "सार्वजनिक शौचालय",
  "कचरा नहीं उठता",
  "कचरा जमा",
  "गंदा इलाका",

  // Odia
  "ଆବର୍ଜନା",
  "ଅଳିଆ",
  "ଅଳିଆ ଆବର୍ଜନା",
  "ଅପରିଷ୍କାର",
  "ସଫେଇ",
  "ସ୍ୱଚ୍ଛତା",
  "ନାଳ",
  "ନାଳୀ",
  "ଡ୍ରେନ",
  "ସିୱେଜ",
  "ଶୌଚାଳୟ",
  "କଚରା",
];

/*
 * ============================================================
 * HEALTHCARE
 * ============================================================
 */

const HEALTHCARE_WORDS = [
  // English
  "hospital",
  "hospitals",
  "health",
  "healthcare",
  "health center",
  "health centre",
  "doctor",
  "doctors",
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
  "स्वास्थ्य की समस्या",
  "डॉक्टर नहीं",
  "दवा नहीं",
  "इलाज नहीं",

  // Odia
  "ହସ୍ପିଟାଲ",
  "ଡାକ୍ତର",
  "ସ୍ୱାସ୍ଥ୍ୟ",
  "ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର",
  "ଔଷଧ",
  "ଦେହ",
  "ଚିକିତ୍ସା",
  "ଆମ୍ବୁଲାନ୍ସ",
  "କ୍ଲିନିକ",
  "ରୋଗୀ",
  "ସ୍ୱାସ୍ଥ୍ୟ ସମସ୍ୟା",
  "ଡାକ୍ତର ନାହାନ୍ତି",
  "ଔଷଧ ନାହିଁ",
];

/*
 * ============================================================
 * EDUCATION
 * ============================================================
 */

const EDUCATION_WORDS = [
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
  "education problem",
  "education issue",
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
];

/*
 * ============================================================
 * FLOODING / WATERLOGGING
 * ============================================================
 */

const FLOODING_WORDS = [
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
];

/*
 * ============================================================
 * CATEGORY CLASSIFIER
 * ============================================================
 */

export function getCategory(
  issue: string
): IssueCategory {
  const text = normalizeText(issue);

  /*
   * Flooding is checked before Water because:
   *
   * "There is waterlogging"
   *
   * should become Flooding, not Water.
   */

  if (containsAny(text, FLOODING_WORDS)) {
    return {
      name: "Flooding",
      icon: "🌊",
    };
  }

  if (containsAny(text, ROAD_WORDS)) {
    return {
      name: "Roads",
      icon: "🛣️",
    };
  }

  if (containsAny(text, WATER_WORDS)) {
    return {
      name: "Water",
      icon: "💧",
    };
  }

  if (containsAny(text, ELECTRICITY_WORDS)) {
    return {
      name: "Electricity",
      icon: "⚡",
    };
  }

  if (containsAny(text, SANITATION_WORDS)) {
    return {
      name: "Sanitation",
      icon: "🗑️",
    };
  }

  if (containsAny(text, HEALTHCARE_WORDS)) {
    return {
      name: "Healthcare",
      icon: "🏥",
    };
  }

  if (containsAny(text, EDUCATION_WORDS)) {
    return {
      name: "Education",
      icon: "🎓",
    };
  }

  return {
    name: "Other",
    icon: "📌",
  };
}

/*
 * ============================================================
 * EXPORTED NORMALIZER
 * ============================================================
 *
 * Useful later for similarity / duplicate detection.
 * ============================================================
 */

export function normalizeIssueText(
  issue: string
): string {
  return normalizeText(issue);
}