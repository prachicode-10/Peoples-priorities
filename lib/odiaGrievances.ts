/**
 * Verified Native Odia Civic Issue Presets & Phonetic Matcher
 * Resolves browser ASR limitations for Odia by providing authentic
 * native scripts, transliteration mapping, and verified English translations.
 */

export interface OdiaGrievanceTemplate {
  id: string;
  icon: string;
  label: string;
  sublabel: string;
  odiaText: string;
  englishTranslation: string;
  keywords: string[];
}

export const ODIA_GRIEVANCE_TEMPLATES: OdiaGrievanceTemplate[] = [
  {
    id: "water",
    icon: "🚰",
    label: "ପାନୀୟ ଜଳ ସମସ୍ୟା",
    sublabel: "Water supply issue",
    odiaText: "ଆମ ୱାର୍ଡରେ ପାନୀୟ ଜଳ ଯୋଗାଣ ବନ୍ଦ ଅଛି, ପିଇବା ପାଣିର ଘୋର ଅଭାବ ଦେଖାଦେଇଛି।",
    englishTranslation: "Drinking water supply in our ward has been disrupted, causing acute drinking water shortage.",
    keywords: ["water", "pani", "jal", "tap", "pipeline", "peeba", "motar", "borewell", "ପାଣି", "ଜଳ", "ପିଇବା", "ଅଭାବ", "ନଳ"],
  },
  {
    id: "road",
    icon: "🛣️",
    label: "ଭଙ୍ଗା / ଖରାପ ରାସ୍ତା",
    sublabel: "Damaged roads & potholes",
    odiaText: "ଆମ ଗାଁ ମୁଖ୍ୟ ରାସ୍ତା ସଂପୂର୍ଣ୍ଣ ଖରାପ ହୋଇ ବଡ଼ ବଡ଼ ଖାଲ ହୋଇଛି, ଯାତାୟାତରେ ଗୁରୁତର ଅସୁବିଧା ହେଉଛି।",
    englishTranslation: "The main village road is in very bad condition with large potholes, causing severe transit problems.",
    keywords: ["rasta", "sadak", "khal", "kharaap", "kharap", "road", "pothole", "broken", "bhanga", "gata", "accident", "repair", "ଭଙ୍ଗା", "ରାସ୍ତା", "ଗାତ", "ସଡକ", "ଖାଲ"],
  },
  {
    id: "electricity",
    icon: "⚡",
    label: "ବିଦ୍ୟୁତ / ବିଜୁଳି ନାହିଁ",
    sublabel: "Electricity / Power cut",
    odiaText: "ଆମ ଅଞ୍ଚଳରେ ଟ୍ରାନ୍ସଫରମର ଖରାପ ଯୋଗୁଁ ବିଜୁଳି ସରବରାହ ସଂପୂର୍ଣ୍ଣ ବନ୍ଦ ରହିଛି।",
    englishTranslation: "Electricity supply is completely down due to a damaged transformer in our locality.",
    keywords: ["bijuli", "current", "electric", "power", "transformer", "pole", "wire", "cut", "shut", "ବିଦ୍ୟୁତ", "ବିଜୁଳି", "କରେଣ୍ଟ", "ଲାଇନ"],
  },
  {
    id: "drainage",
    icon: "🌊",
    label: "ଡ୍ରେନେଜ୍ ଓ ନର୍ଦ୍ଦମା ପାଣି",
    sublabel: "Drainage waterlogging",
    odiaText: "ନାଳ ନର୍ଦ୍ଦମା ସଫା ନହେବାରୁ ଦୂଷିତ ପାଣି ରାସ୍ତା ଉପରେ ଜମି ରହିଛି, ଦୁର୍ଗନ୍ଧ ବ୍ୟାପୁଛି।",
    englishTranslation: "Due to clogged drains, contaminated wastewater is overflowing onto the street with foul smell.",
    keywords: ["drain", "nala", "nali", "ganda", "sewage", "waterlogging", "jamichi", "overflow", "durgandha", "ଡ୍ରେନ", "ନାଳ", "ନର୍ଦ୍ଦମା", "ଦୂଷିତ"],
  },
  {
    id: "health",
    icon: "🏥",
    label: "ସ୍ୱାସ୍ଥ୍ୟକେନ୍ଦ୍ର ସମସ୍ୟା",
    sublabel: "Hospital / Healthcare issue",
    odiaText: "ସ୍ଥାନୀୟ ସରକାରୀ ସ୍ୱାସ୍ଥ୍ୟକେନ୍ଦ୍ରରେ ଡାକ୍ତର ଅନୁପସ୍ଥିତ ଏବଂ ଜରୁରୀ ଔଷଧ ମିଳୁନାହିଁ।",
    englishTranslation: "Doctors are absent and essential medicines are not available at the local government health center.",
    keywords: ["hospital", "doctor", "health", "medicine", "daktara", "oushadha", "nurse", "clinic", "ward", "chikitsa", "ସ୍ୱାସ୍ଥ୍ୟ", "ଡାକ୍ତର", "ଔଷଧ", "ଡାକ୍ତରଖାନା"],
  },
  {
    id: "streetlight",
    icon: "💡",
    label: "ରାସ୍ତା ଆଲୁଅ (ଷ୍ଟ୍ରିଟ୍ ଲାଇଟ୍)",
    sublabel: "Streetlight outage",
    odiaText: "ଆମ ସାହିର ଷ୍ଟ୍ରିଟ୍ ଲାଇଟ୍ ବହୁ ଦିନ ଧରି ଜଳୁନାହିଁ, ରାତିରେ ଯିବାଆସିବା ପାଇଁ ଭୟ ଲାଗୁଛି।",
    englishTranslation: "Streetlights in our locality have not been functioning for days, causing safety concerns at night.",
    keywords: ["light", "street light", "batti", "andhar", "jaluni", "street", "pole light", "dark", "ଆଲୁଅ", "ଷ୍ଟ୍ରିଟ ଲାଇଟ", "ଅନ୍ଧାର", "ବତୀ"],
  },
  {
    id: "waste",
    icon: "🗑️",
    label: "ଆବର୍ଜନା ଓ ସଫେଇ ସମସ୍ୟା",
    sublabel: "Garbage & Waste clearance",
    odiaText: "ଆମ ସାହିରେ ବହୁ ଦିନ ଧରି ଆବର୍ଜନା ଓ ଅଳିଆ ସଫା ହୋଇନାହିଁ, ଦୁର୍ଗନ୍ଧରେ ଲୋକେ ହଇରାଣ ହେଉଛନ୍ତି।",
    englishTranslation: "Garbage has not been cleared for days in our locality, causing severe foul smell and health hazards.",
    keywords: ["garbage", "kachra", "abarjana", "alia", "waste", "cleaning", "safai", "dustbin", "durgandha", "ଆବର୍ଜନା", "ଅଳିଆ", "ସଫେଇ"],
  },
  {
    id: "food",
    icon: "🍱",
    label: "ଖାଦ୍ୟ ନିରାପତ୍ତା ଓ ଗୁଣବତ୍ତା",
    sublabel: "Food safety & contamination",
    odiaText: "ସ୍ଥାନୀୟ ଅଞ୍ଚଳରେ ଦୂଷିତ ଓ ଅଖାଦ୍ୟ ବିକ୍ରି ଯୋଗୁଁ ଲୋକଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ ଖରାପ ହେଉଛି, ଯାଞ୍ଚ ଆବଶ୍ୟକ।",
    englishTranslation: "Sale of contaminated and adulterated food in the local area is affecting public health and requires urgent inspection.",
    keywords: ["food", "khadya", "khana", "poisoning", "ration", "midday", "meal", "bhat", "contamination", "quality", "ଖାଦ୍ୟ", "ମଧ୍ୟାହ୍ନ ଭୋଜନ", "ରେସନ"],
  },
];

/**
 * Match spoken keywords or phonetic terms against Odia templates
 */
export function findMatchingOdiaTemplate(text: string): OdiaGrievanceTemplate | null {
  if (!text || text.trim().length === 0) return null;
  const lower = text.toLowerCase();
  for (const tpl of ODIA_GRIEVANCE_TEMPLATES) {
    if (tpl.keywords.some((k) => lower.includes(k.toLowerCase()))) {
      return tpl;
    }
  }
  return null;
}
