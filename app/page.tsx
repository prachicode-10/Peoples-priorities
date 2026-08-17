"use client";

import { useEffect, useMemo, useState } from "react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import Coverflow from "../components/Coverflow";
import { getCategory } from "@/lib/category";
import { calculatePriority } from "@/lib/priority";

type Language = "en" | "hi" | "or";

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
  issue?: string;
  photos?: string[];
  status?: string;
  voiceLanguage?: string;
  writingLanguages?: Record<string, string>;
};

type CategoryName =
  | "Roads"
  | "Water"
  | "Electricity"
  | "Sanitation"
  | "Healthcare"
  | "Education"
  | "Flooding"
  | "Other";

type CategoryInsight = {
  name: CategoryName;
  icon: string;
  count: number;
  percentage: number;
  priority: number;
  level: "Low" | "Medium" | "High" | "Critical";
  evidence: number;
  locations: number;
};

type Translation = {
  howItWorks: string;
  priorities: string;
  about: string;
  admin: string;
  shareNeed: string;

  badge: string;
  heroTitle1: string;
  heroTitle2: string;
  heroDescription: string;

  tellCommunity: string;
  seeHow: string;
  citizenInputs: string;

  intelligence: string;
  developmentPulse: string;
  live: string;

  submissions: string;
  hotspots: string;
  critical: string;
  evidenceReports: string;

  highestNeed: string;
  priority: string;
  requests: string;
  evidence: string;
  demand: string;

  liveIntelligence: string;
  realCitizenData: string;
  whatSystem: string;
  noDataYet: string;

  issueDistribution: string;
  issueDistributionDescription: string;

  priorityRanking: string;
  priorityRankingDescription: string;

  evidenceCoverage: string;
  evidenceCoverageDescription: string;

  languageInsights: string;
  languageInsightsDescription: string;

  decisionPipeline: string;
  decisionPipelineDescription: string;

  fromVoice: string;
  sixLayers: string;
  sixDescription: string;

  ourDifference: string;
  notComplaint: string;
  differenceDescription: string;

  realityCheck: string;
  realityText: string;

  explainableAI: string;
  explainableText: string;

  evidenceFirst: string;
  evidenceFirstText: string;

  locationVerified: string;
  locationVerifiedText: string;

  noBudgetData: string;
  noBudgetDataText: string;
};

const translations: Record<Language, Translation> = {
  en: {
    howItWorks: "How it works",
    priorities: "Priorities",
    about: "About",
    admin: "Admin Dashboard",
    shareNeed: "Share a Need",

    badge: "AI FOR CONSTITUENCY DEVELOPMENT",
    heroTitle1: "Turn citizen voice into",
    heroTitle2: "better decisions.",
    heroDescription:
      "A data-driven platform that transforms multilingual citizen feedback into evidence-backed development priorities using transparent, explainable signals.",

    tellCommunity: "Tell us what your community needs →",
    seeHow: "See how it works",
    citizenInputs: "Voice • Text • Photos • Multiple languages",

    intelligence: "CONSTITUENCY INTELLIGENCE",
    developmentPulse: "Development Pulse",
    live: "LIVE",

    submissions: "Citizen submissions",
    hotspots: "Demand hotspots",
    critical: "Critical priorities",
    evidenceReports: "Evidence reports",

    highestNeed: "Highest emerging need",
    priority: "PRIORITY",
    requests: "citizen requests",
    evidence: "Evidence-backed ranking",
    demand:
      "Frequency + severity + location + evidence + recency",

    liveIntelligence: "LIVE CITIZEN INTELLIGENCE",
    realCitizenData: "Real data from this prototype",
    whatSystem: "What the system can surface.",
    noDataYet: "No citizen submissions yet.",

    issueDistribution: "Issue distribution",
    issueDistributionDescription:
      "Live distribution of the problems citizens have actually submitted.",

    priorityRanking: "Priority ranking",
    priorityRankingDescription:
      "Transparent ranking generated from the current citizen reports.",

    evidenceCoverage: "Evidence coverage",
    evidenceCoverageDescription:
      "How many submitted reports currently include photographic evidence.",

    languageInsights: "Citizen language insights",
    languageInsightsDescription:
      "Languages recorded from actual citizen submissions.",

    decisionPipeline: "Live decision pipeline",
    decisionPipelineDescription:
      "How a citizen report moves through the system.",

    fromVoice: "FROM VOICE TO ACTION",
    sixLayers: "Six layers of civic intelligence.",
    sixDescription:
      "People's Priorities connects citizen reports with verification, classification, evidence and transparent prioritisation.",

    ourDifference: "OUR DIFFERENCE",
    notComplaint: "Not another complaint portal.",
    differenceDescription:
      "People's Priorities closes the gap between what citizens report and what decision-makers can understand from structured evidence.",

    realityCheck: "Reality Check",
    realityText:
      "Reports are connected to verified Indian PIN-code information before they are accepted.",

    explainableAI: "Explainable AI",
    explainableText:
      "Every priority score exposes the factors behind the ranking instead of hiding the decision logic.",

    evidenceFirst: "Evidence First",
    evidenceFirstText:
      "Citizens can attach photographs so decision-makers can see supporting evidence alongside the report.",

    locationVerified: "Location Verified",
    locationVerifiedText:
      "Indian PIN codes are checked and connected to state, district and area information.",

    noBudgetData: "No budget data",
    noBudgetDataText:
      "Budget optimisation is not displayed until a real budget dataset is connected.",
  },

  hi: {
    howItWorks: "यह कैसे काम करता है",
    priorities: "प्राथमिकताएँ",
    about: "हमारे बारे में",
    admin: "एडमिन डैशबोर्ड",
    shareNeed: "समस्या बताएं",

    badge: "निर्वाचन क्षेत्र के विकास के लिए AI",
    heroTitle1: "नागरिकों की आवाज़ को",
    heroTitle2: "बेहतर निर्णयों में बदलें।",
    heroDescription:
      "एक डेटा-संचालित प्लेटफ़ॉर्म जो बहुभाषी नागरिक रिपोर्टों को सत्यापन, प्रमाण और पारदर्शी प्राथमिकता स्कोर में बदलता है।",

    tellCommunity: "अपने समुदाय की ज़रूरत बताएं →",
    seeHow: "यह कैसे काम करता है",
    citizenInputs: "आवाज़ • टेक्स्ट • फोटो • कई भाषाएँ",

    intelligence: "निर्वाचन क्षेत्र की जानकारी",
    developmentPulse: "विकास स्थिति",
    live: "लाइव",

    submissions: "नागरिक रिपोर्ट",
    hotspots: "मांग वाले क्षेत्र",
    critical: "महत्वपूर्ण प्राथमिकताएँ",
    evidenceReports: "प्रमाण वाली रिपोर्ट",

    highestNeed: "सबसे उभरती आवश्यकता",
    priority: "प्राथमिकता",
    requests: "नागरिक अनुरोध",
    evidence: "प्रमाण-आधारित रैंकिंग",
    demand:
      "आवृत्ति + गंभीरता + स्थान + प्रमाण + नवीनता",

    liveIntelligence: "लाइव नागरिक जानकारी",
    realCitizenData: "इस प्रोटोटाइप का वास्तविक डेटा",
    whatSystem: "सिस्टम क्या सामने ला सकता है।",
    noDataYet: "अभी कोई नागरिक रिपोर्ट नहीं है।",

    issueDistribution: "समस्या वितरण",
    issueDistributionDescription:
      "नागरिकों द्वारा वास्तव में भेजी गई समस्याओं का लाइव वितरण।",

    priorityRanking: "प्राथमिकता रैंकिंग",
    priorityRankingDescription:
      "वर्तमान नागरिक रिपोर्टों से बनी पारदर्शी रैंकिंग।",

    evidenceCoverage: "प्रमाण कवरेज",
    evidenceCoverageDescription:
      "कितनी रिपोर्टों में फोटो प्रमाण मौजूद है।",

    languageInsights: "नागरिक भाषा जानकारी",
    languageInsightsDescription:
      "वास्तविक नागरिक रिपोर्टों में दर्ज भाषाएँ।",

    decisionPipeline: "लाइव निर्णय प्रक्रिया",
    decisionPipelineDescription:
      "एक नागरिक रिपोर्ट सिस्टम में कैसे आगे बढ़ती है।",

    fromVoice: "आवाज़ से कार्रवाई तक",
    sixLayers: "नागरिक जानकारी की छह परतें।",
    sixDescription:
      "People's Priorities नागरिक रिपोर्टों को सत्यापन, वर्गीकरण, प्रमाण और पारदर्शी प्राथमिकता से जोड़ता है।",

    ourDifference: "हमारी विशेषता",
    notComplaint: "सिर्फ एक शिकायत पोर्टल नहीं।",
    differenceDescription:
      "People's Priorities नागरिकों की रिपोर्ट को संरचित प्रमाण और निर्णय सहायता में बदलता है।",

    realityCheck: "वास्तविकता जाँच",
    realityText:
      "रिपोर्ट स्वीकार करने से पहले भारतीय PIN कोड की जानकारी सत्यापित की जाती है।",

    explainableAI: "समझने योग्य AI",
    explainableText:
      "हर प्राथमिकता स्कोर के पीछे के कारक स्पष्ट रूप से दिखाई देते हैं।",

    evidenceFirst: "प्रमाण पहले",
    evidenceFirstText:
      "नागरिक अपनी समस्या के साथ फोटो प्रमाण भी जोड़ सकते हैं।",

    locationVerified: "स्थान सत्यापित",
    locationVerifiedText:
      "भारतीय PIN कोड को राज्य, जिला और क्षेत्र की जानकारी से जोड़ा जाता है।",

    noBudgetData: "बजट डेटा उपलब्ध नहीं",
    noBudgetDataText:
      "वास्तविक बजट डेटासेट जुड़ने तक बजट अनुकूलन प्रदर्शित नहीं किया जाएगा।",
  },

  or: {
    howItWorks: "ଏହା କିପରି କାମ କରେ",
    priorities: "ପ୍ରାଥମିକତା",
    about: "ଆମ ବିଷୟରେ",
    admin: "ଆଡମିନ୍ ଡ୍ୟାସବୋର୍ଡ",
    shareNeed: "ଆପଣଙ୍କ ସମସ୍ୟା ଜଣାନ୍ତୁ",

    badge: "ନିର୍ବାଚନମଣ୍ଡଳୀ ବିକାଶ ପାଇଁ AI",
    heroTitle1: "ନାଗରିକଙ୍କ ସ୍ୱରକୁ",
    heroTitle2: "ଉନ୍ନତ ନିଷ୍ପତ୍ତିରେ ପରିଣତ କରନ୍ତୁ।",
    heroDescription:
      "ଏକ ଡାଟା-ଆଧାରିତ ପ୍ଲାଟଫର୍ମ ଯାହା ନାଗରିକ ରିପୋର୍ଟକୁ ଯାଞ୍ଚ, ପ୍ରମାଣ ଏବଂ ସ୍ୱଚ୍ଛ ପ୍ରାଥମିକତା ସ୍କୋର ସହିତ ଯୋଡ଼େ।",

    tellCommunity: "ଆପଣଙ୍କ ସମ୍ପ୍ରଦାୟର ଆବଶ୍ୟକତା ଜଣାନ୍ତୁ →",
    seeHow: "ଏହା କିପରି କାମ କରେ",
    citizenInputs: "ସ୍ୱର • ଟେକ୍ସଟ୍ • ଫଟୋ • ଏକାଧିକ ଭାଷା",

    intelligence: "ନିର୍ବାଚନମଣ୍ଡଳୀ ସୂଚନା",
    developmentPulse: "ବିକାଶ ସ୍ଥିତି",
    live: "ଲାଇଭ୍",

    submissions: "ନାଗରିକ ରିପୋର୍ଟ",
    hotspots: "ଚାହିଦା ଅଞ୍ଚଳ",
    critical: "ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ପ୍ରାଥମିକତା",
    evidenceReports: "ପ୍ରମାଣ ରିପୋର୍ଟ",

    highestNeed: "ସର୍ବାଧିକ ଉଦୀୟମାନ ଆବଶ୍ୟକତା",
    priority: "ପ୍ରାଥମିକତା",
    requests: "ନାଗରିକ ଅନୁରୋଧ",
    evidence: "ପ୍ରମାଣ-ଆଧାରିତ ରାଙ୍କିଙ୍ଗ୍",
    demand:
      "ଆବୃତ୍ତି + ଗୁରୁତ୍ୱ + ସ୍ଥାନ + ପ୍ରମାଣ + ସାମ୍ପ୍ରତିକତା",

    liveIntelligence: "ଲାଇଭ୍ ନାଗରିକ ସୂଚନା",
    realCitizenData: "ଏହି ପ୍ରୋଟୋଟାଇପର ବାସ୍ତବ ତଥ୍ୟ",
    whatSystem: "ସିଷ୍ଟମ୍ କଣ ଦେଖାଇପାରିବ।",
    noDataYet: "ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ନାଗରିକ ରିପୋର୍ଟ ନାହିଁ।",

    issueDistribution: "ସମସ୍ୟା ବଣ୍ଟନ",
    issueDistributionDescription:
      "ନାଗରିକମାନେ ପଠାଇଥିବା ପ୍ରକୃତ ସମସ୍ୟାର ଲାଇଭ୍ ବଣ୍ଟନ।",

    priorityRanking: "ପ୍ରାଥମିକତା ରାଙ୍କିଙ୍ଗ୍",
    priorityRankingDescription:
      "ବର୍ତ୍ତମାନ ନାଗରିକ ରିପୋର୍ଟ ଆଧାରରେ ସ୍ୱଚ୍ଛ ରାଙ୍କିଙ୍ଗ୍।",

    evidenceCoverage: "ପ୍ରମାଣ କଭରେଜ୍",
    evidenceCoverageDescription:
      "କେତେ ରିପୋର୍ଟରେ ଫଟୋ ପ୍ରମାଣ ରହିଛି।",

    languageInsights: "ନାଗରିକ ଭାଷା ସୂଚନା",
    languageInsightsDescription:
      "ପ୍ରକୃତ ନାଗରିକ ରିପୋର୍ଟରେ ରେକର୍ଡ ହୋଇଥିବା ଭାଷା।",

    decisionPipeline: "ଲାଇଭ୍ ନିଷ୍ପତ୍ତି ପ୍ରକ୍ରିୟା",
    decisionPipelineDescription:
      "ଏକ ନାଗରିକ ରିପୋର୍ଟ ସିଷ୍ଟମ୍ ମଧ୍ୟରେ କିପରି ଆଗକୁ ବଢ଼େ।",

    fromVoice: "ସ୍ୱରରୁ କାର୍ଯ୍ୟ ପର୍ଯ୍ୟନ୍ତ",
    sixLayers: "ନାଗରିକ ସୂଚନାର ଛଅଟି ସ୍ତର।",
    sixDescription:
      "People's Priorities ନାଗରିକ ରିପୋର୍ଟକୁ ଯାଞ୍ଚ, ବର୍ଗୀକରଣ, ପ୍ରମାଣ ଏବଂ ସ୍ୱଚ୍ଛ ପ୍ରାଥମିକତା ସହିତ ଯୋଡ଼େ।",

    ourDifference: "ଆମର ବିଶେଷତା",
    notComplaint: "କେବଳ ଆଉ ଏକ ଅଭିଯୋଗ ପୋର୍ଟାଲ୍ ନୁହେଁ।",
    differenceDescription:
      "People's Priorities ନାଗରିକ ରିପୋର୍ଟକୁ ଗଠିତ ପ୍ରମାଣ ଏବଂ ନିଷ୍ପତ୍ତି ସହାୟତାରେ ପରିଣତ କରେ।",

    realityCheck: "ବାସ୍ତବତା ଯାଞ୍ଚ",
    realityText:
      "ରିପୋର୍ଟ ଗ୍ରହଣ ପୂର୍ବରୁ ଭାରତୀୟ PIN କୋଡ୍ ତଥ୍ୟ ଯାଞ୍ଚ କରାଯାଏ।",

    explainableAI: "ବୁଝିହେଉଥିବା AI",
    explainableText:
      "ପ୍ରତ୍ୟେକ ପ୍ରାଥମିକତା ସ୍କୋର ପଛରେ ଥିବା କାରକଗୁଡ଼ିକ ସ୍ପଷ୍ଟ ଭାବରେ ଦେଖାଯାଏ।",

    evidenceFirst: "ପ୍ରମାଣ ପ୍ରଥମେ",
    evidenceFirstText:
      "ନାଗରିକମାନେ ସମସ୍ୟା ସହିତ ଫଟୋ ପ୍ରମାଣ ମଧ୍ୟ ଯୋଡ଼ିପାରିବେ।",

    locationVerified: "ସ୍ଥାନ ଯାଞ୍ଚିତ",
    locationVerifiedText:
      "ଭାରତୀୟ PIN କୋଡକୁ ରାଜ୍ୟ, ଜିଲ୍ଲା ଏବଂ ଅଞ୍ଚଳ ତଥ୍ୟ ସହିତ ଯୋଡ଼ାଯାଏ।",

    noBudgetData: "ବଜେଟ୍ ତଥ୍ୟ ନାହିଁ",
    noBudgetDataText:
      "ପ୍ରକୃତ ବଜେଟ୍ ଡାଟାସେଟ୍ ଯୋଡ଼ାଯିବା ପର୍ଯ୍ୟନ୍ତ ବଜେଟ୍ ଅପ୍ଟିମାଇଜେସନ୍ ଦେଖାଯିବ ନାହିଁ।",
  },
};

const CATEGORY_ORDER: CategoryName[] = [
  "Roads",
  "Water",
  "Electricity",
  "Sanitation",
  "Healthcare",
  "Education",
  "Flooding",
  "Other",
];

const CATEGORY_TITLES: Record<
  CategoryName,
  Record<Language, string>
> = {
  Roads: {
    en: "Roads",
    hi: "सड़कें",
    or: "ସଡ଼କ",
  },
  Water: {
    en: "Water",
    hi: "पानी",
    or: "ଜଳ",
  },
  Electricity: {
    en: "Electricity",
    hi: "बिजली",
    or: "ବିଦ୍ୟୁତ",
  },
  Sanitation: {
    en: "Sanitation",
    hi: "स्वच्छता",
    or: "ପରିମଳ",
  },
  Healthcare: {
    en: "Healthcare",
    hi: "स्वास्थ्य सेवा",
    or: "ସ୍ୱାସ୍ଥ୍ୟସେବା",
  },
  Education: {
    en: "Education",
    hi: "शिक्षा",
    or: "ଶିକ୍ଷା",
  },
  Flooding: {
    en: "Flooding",
    hi: "बाढ़ / जलभराव",
    or: "ବନ୍ୟା / ଜଳବନ୍ଦୀ",
  },
  Other: {
    en: "Other",
    hi: "अन्य",
    or: "ଅନ୍ୟ",
  },
};

function readSubmissions(): Submission[] {
  try {
    const saved = localStorage.getItem(
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
  } catch {
    return [];
  }
}

function getLanguageLabel(
  language: string | undefined,
  currentLanguage: Language
): string {
  if (language === "hi-IN") {
    return currentLanguage === "hi"
      ? "हिन्दी"
      : currentLanguage === "or"
        ? "ହିନ୍ଦୀ"
        : "Hindi";
  }

  if (language === "or-IN") {
    return currentLanguage === "hi"
      ? "ओड़िया"
      : currentLanguage === "or"
        ? "ଓଡ଼ିଆ"
        : "Odia";
  }

  if (language === "en-IN") {
    return "English";
  }

  return currentLanguage === "hi"
    ? "अन्य"
    : currentLanguage === "or"
      ? "ଅନ୍ୟ"
      : "Other";
}

function getCategoryTitle(
  category: CategoryName,
  language: Language
) {
  return CATEGORY_TITLES[category][language];
}

function AnimatedNumber({
  value,
  duration = 700,
}: {
  value: number;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] =
    useState(value);

  useEffect(() => {
    const startValue = displayValue;
    const difference = value - startValue;

    if (difference === 0) {
      return;
    }

    const startTime = performance.now();

    let animationFrame = 0;

    const animate = (currentTime: number) => {
      const progress = Math.min(
        (currentTime - startTime) / duration,
        1
      );

      const eased =
        1 - Math.pow(1 - progress, 3);

      setDisplayValue(
        Math.round(
          startValue + difference * eased
        )
      );

      if (progress < 1) {
        animationFrame =
          requestAnimationFrame(animate);
      }
    };

    animationFrame =
      requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(
        animationFrame
      );
    };
  }, [value]);

  return (
    <>
      {displayValue.toLocaleString("en-IN")}
    </>
  );
}

export default function Home() {
  const [language, setLanguage] =
    useState<Language>("en");

  const [submissions, setSubmissions] =
    useState<Submission[]>([]);

  const [pulseKey, setPulseKey] =
    useState(0);

  const t = translations[language];

  /*
   * =========================================================
   * LOAD REAL CITIZEN DATA
   * =========================================================
   */

  useEffect(() => {
    const load = () => {
      const next = readSubmissions();

      setSubmissions((previous) => {
        if (
          previous.length !==
          next.length
        ) {
          setPulseKey(
            (value) => value + 1
          );
        }

        return next;
      });
    };

    load();

    /*
     * The citizen page currently stores
     * submissions in localStorage.
     *
     * Polling makes this landing page
     * update while the demo is running.
     */

    const interval = window.setInterval(
      load,
      1000
    );

    const handleStorage = () => {
      load();
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.clearInterval(interval);

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  /*
   * =========================================================
   * LIVE CATEGORY INTELLIGENCE
   * =========================================================
   */

  const categoryInsights =
    useMemo<CategoryInsight[]>(() => {
      const total =
        submissions.length;

      return CATEGORY_ORDER.map(
        (categoryName) => {
          const categorySubmissions =
            submissions.filter(
              (submission) => {
                const category =
                  getCategory(
                    submission.issue || ""
                  );

                return (
                  category.name ===
                  categoryName
                );
              }
            );

          const count =
            categorySubmissions.length;

          const percentage =
            total > 0
              ? Math.round(
                  (count / total) *
                    100
                )
              : 0;

          const uniqueLocations =
            new Set<string>();

          categorySubmissions.forEach(
            (submission) => {
              const location =
                submission.village?.trim() ||
                submission.location?.trim() ||
                submission.pincode?.trim() ||
                submission.district?.trim();

              if (location) {
                uniqueLocations.add(
                  location.toLowerCase()
                );
              }
            }
          );

          const reportsWithEvidence =
            categorySubmissions.filter(
              (submission) =>
                Array.isArray(
                  submission.photos
                ) &&
                submission.photos.length >
                  0
            ).length;

          const evidence =
            count > 0
              ? Math.round(
                  (reportsWithEvidence /
                    count) *
                    100
                )
              : 0;

          const priority =
            calculatePriority(
              categorySubmissions,
              total
            );

          return {
            name: categoryName,
            icon:
              getCategory(
                categorySubmissions[0]
                  ?.issue || categoryName
              ).icon,
            count,
            percentage,
            priority: priority.score,
            level: priority.level,
            evidence,
            locations:
              uniqueLocations.size,
          };
        }
      ).filter(
        (category) =>
          category.count > 0
      );
    }, [submissions]);

  /*
   * =========================================================
   * REAL METRICS
   * =========================================================
   */

  const uniqueHotspots = useMemo(() => {
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

  const criticalPriorities =
    useMemo(() => {
      return categoryInsights.filter(
        (category) =>
          category.level ===
          "Critical"
      ).length;
    }, [categoryInsights]);

  const evidenceReports =
    useMemo(() => {
      return submissions.filter(
        (submission) =>
          Array.isArray(
            submission.photos
          ) &&
          submission.photos.length > 0
      ).length;
    }, [submissions]);

  const topPriority =
    categoryInsights[0] || null;

  const evidencePercentage =
    submissions.length > 0
      ? Math.round(
          (evidenceReports /
            submissions.length) *
            100
        )
      : 0;

  /*
   * =========================================================
   * LANGUAGE INTELLIGENCE
   * =========================================================
   */

  const languageInsights =
    useMemo(() => {
      const counts: Record<
        string,
        number
      > = {};

      submissions.forEach(
        (submission) => {
          const language =
            submission.voiceLanguage ||
            submission.writingLanguages
              ?.issue ||
            "en-IN";

          counts[language] =
            (counts[language] || 0) +
            1;
        }
      );

      return Object.entries(counts)
        .map(
          ([language, count]) => ({
            language,
            count,
            percentage:
              submissions.length > 0
                ? Math.round(
                    (count /
                      submissions.length) *
                      100
                  )
                : 0,
          })
        )
        .sort(
          (a, b) =>
            b.count - a.count
        );
    }, [submissions]);

  /*
   * =========================================================
   * LIVE PIPELINE
   * =========================================================
   */

  const pipelineSteps = [
    {
      icon: "🗣️",
      title:
        language === "hi"
          ? "नागरिक आवाज़"
          : language === "or"
            ? "ନାଗରିକ ସ୍ୱର"
            : "Citizen Voice",
      text:
        language === "hi"
          ? "रिपोर्ट प्राप्त"
          : language === "or"
            ? "ରିପୋର୍ଟ ଗ୍ରହଣ"
            : "Report received",
    },
    {
      icon: "🧩",
      title:
        language === "hi"
          ? "वर्गीकरण"
          : language === "or"
            ? "ବର୍ଗୀକରଣ"
            : "Classification",
      text:
        language === "hi"
          ? "समस्या की श्रेणी"
          : language === "or"
            ? "ସମସ୍ୟା ବର୍ଗ"
            : "Issue category",
    },
    {
      icon: "📍",
      title:
        language === "hi"
          ? "स्थान सत्यापन"
          : language === "or"
            ? "ସ୍ଥାନ ଯାଞ୍ଚ"
            : "Location verification",
      text:
        language === "hi"
          ? "PIN आधारित"
          : language === "or"
            ? "PIN ଆଧାରିତ"
            : "PIN verified",
    },
    {
      icon: "📷",
      title:
        language === "hi"
          ? "प्रमाण"
          : language === "or"
            ? "ପ୍ରମାଣ"
            : "Evidence",
      text:
        language === "hi"
          ? "फोटो उपलब्ध"
          : language === "or"
            ? "ଫଟୋ ଉପଲବ୍ଧ"
            : "Photos available",
    },
    {
      icon: "📊",
      title:
        language === "hi"
          ? "प्राथमिकता"
          : language === "or"
            ? "ପ୍ରାଥମିକତା"
            : "Priority",
      text:
        language === "hi"
          ? "स्कोर तैयार"
          : language === "or"
            ? "ସ୍କୋର ପ୍ରସ୍ତୁତ"
            : "Score generated",
    },
  ];

  /*
   * =========================================================
   * HOW IT WORKS
   * =========================================================
   */

  const howItWorks = [
    {
      number: "01",
      icon: "🗣️",
      title: {
        en: "Listen",
        hi: "सुनें",
        or: "ଶୁଣନ୍ତୁ",
      },
      text: {
        en: "Collect voice, text, photos and multilingual submissions from citizens.",
        hi: "नागरिकों से आवाज़, टेक्स्ट, फोटो और बहुभाषी रिपोर्ट एकत्र करें।",
        or: "ନାଗରିକଙ୍କଠାରୁ ସ୍ୱର, ଟେକ୍ସଟ୍, ଫଟୋ ଏବଂ ବହୁଭାଷୀ ରିପୋର୍ଟ ସଂଗ୍ରହ କରନ୍ତୁ।",
      },
    },
    {
      number: "02",
      icon: "🧩",
      title: {
        en: "Classify",
        hi: "वर्गीकृत करें",
        or: "ବର୍ଗୀକରଣ କରନ୍ତୁ",
      },
      text: {
        en: "Group reports into roads, water, electricity, sanitation, healthcare, education and flooding.",
        hi: "रिपोर्ट को सड़क, पानी, बिजली, स्वच्छता, स्वास्थ्य, शिक्षा और बाढ़ जैसी श्रेणियों में समूहित करें।",
        or: "ରିପୋର୍ଟଗୁଡ଼ିକୁ ସଡ଼କ, ଜଳ, ବିଦ୍ୟୁତ, ପରିମଳ, ସ୍ୱାସ୍ଥ୍ୟ, ଶିକ୍ଷା ଏବଂ ବନ୍ୟା ଭାବେ ବର୍ଗୀକରଣ କରନ୍ତୁ।",
      },
    },
    {
      number: "03",
      icon: "📍",
      title: {
        en: "Verify",
        hi: "सत्यापित करें",
        or: "ଯାଞ୍ଚ କରନ୍ତୁ",
      },
      text: {
        en: "Connect each accepted report with verified Indian PIN-code location information.",
        hi: "हर स्वीकार की गई रिपोर्ट को सत्यापित भारतीय PIN कोड स्थान जानकारी से जोड़ें।",
        or: "ପ୍ରତ୍ୟେକ ଗ୍ରହଣ କରାଯାଇଥିବା ରିପୋର୍ଟକୁ ଯାଞ୍ଚିତ ଭାରତୀୟ PIN କୋଡ୍ ସ୍ଥାନ ତଥ୍ୟ ସହିତ ଯୋଡ଼ନ୍ତୁ।",
      },
    },
    {
      number: "04",
      icon: "📷",
      title: {
        en: "Support",
        hi: "प्रमाण जोड़ें",
        or: "ପ୍ରମାଣ ଯୋଡ଼ନ୍ତୁ",
      },
      text: {
        en: "Use citizen-uploaded photographs as supporting evidence.",
        hi: "नागरिकों द्वारा अपलोड की गई तस्वीरों को सहायक प्रमाण के रूप में उपयोग करें।",
        or: "ନାଗରିକଙ୍କ ଦ୍ୱାରା ଅପଲୋଡ୍ ହୋଇଥିବା ଫଟୋକୁ ସହାୟକ ପ୍ରମାଣ ଭାବେ ବ୍ୟବହାର କରନ୍ତୁ।",
      },
    },
    {
      number: "05",
      icon: "📊",
      title: {
        en: "Prioritize",
        hi: "प्राथमिकता दें",
        or: "ପ୍ରାଥମିକତା ଦିଅନ୍ତୁ",
      },
      text: {
        en: "Rank categories using frequency, severity, geographic concentration, evidence and recency.",
        hi: "आवृत्ति, गंभीरता, भौगोलिक एकाग्रता, प्रमाण और नवीनता के आधार पर रैंकिंग करें।",
        or: "ଆବୃତ୍ତି, ଗୁରୁତ୍ୱ, ଭୌଗୋଳିକ ଏକାଗ୍ରତା, ପ୍ରମାଣ ଏବଂ ସାମ୍ପ୍ରତିକତା ଆଧାରରେ ରାଙ୍କ କରନ୍ତୁ।",
      },
    },
    {
      number: "06",
      icon: "🎯",
      title: {
        en: "Decide",
        hi: "निर्णय लें",
        or: "ନିଷ୍ପତ୍ତି ନିଅନ୍ତୁ",
      },
      text: {
        en: "Give decision-makers a transparent view of where citizen attention is concentrated.",
        hi: "निर्णयकर्ताओं को दिखाएं कि नागरिकों की प्राथमिकता कहाँ केंद्रित है।",
        or: "ନିଷ୍ପତ୍ତି ନେଉଥିବା ବ୍ୟକ୍ତିଙ୍କୁ ନାଗରିକଙ୍କ ପ୍ରାଥମିକତା କେଉଁଠାରେ ରହିଛି ଦେଖାନ୍ତୁ।",
      },
    },
  ];

  return (
    <main className="min-h-screen bg-[#f5f7f4] text-[#17221b]">
      {/* =====================================================
          NAVIGATION
      ====================================================== */}

      <nav className="border-b border-[#dce3dc] bg-[#f5f7f4]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173f2a] text-lg text-white shadow-sm">
              P
            </div>

            <div>
              <div className="text-sm font-bold tracking-[0.18em] text-[#173f2a]">
                PEOPLE&apos;S
              </div>

              <div className="text-xs font-semibold tracking-[0.28em] text-[#66736a]">
                PRIORITIES
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm font-medium text-[#536058] md:flex">
            <a
              href="#how-it-works"
              className="transition hover:text-[#173f2a]"
            >
              {t.howItWorks}
            </a>

            <a
              href="#live-intelligence"
              className="transition hover:text-[#173f2a]"
            >
              {t.priorities}
            </a>

            <a
              href="#about"
              className="transition hover:text-[#173f2a]"
            >
              {t.about}
            </a>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher
              language={language}
              setLanguage={setLanguage}
            />

            <a
              href="/login?redirect=/dashboard"
              className="hidden rounded-full border border-[#cbd5cc] px-5 py-2.5 text-sm font-semibold text-[#314038] transition hover:border-[#173f2a] hover:bg-white sm:block"
            >
              {t.admin}
            </a>

            <a
              href="/citizen"
              className="rounded-full bg-[#173f2a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f2f1e]"
            >
              {t.shareNeed}
            </a>
          </div>
        </div>
      </nav>

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="relative overflow-hidden">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#dcebdd] blur-3xl" />

        <div className="absolute -left-32 top-48 h-72 w-72 rounded-full bg-[#e5eee4] blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-14 px-6 pb-16 pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:pb-24 lg:pt-24">
          <div className="flex flex-col justify-center">
            <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-[#cbdacb] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#376147]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#4d9a61]" />

              {t.badge}
            </div>

            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] text-[#17221b] sm:text-6xl lg:text-7xl">
              {t.heroTitle1}{" "}
              <span className="text-[#28623c]">
                {t.heroTitle2}
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#5b675f]">
              {t.heroDescription}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="/citizen"
                className="rounded-full bg-[#173f2a] px-7 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-[#173f2a]/10 transition hover:-translate-y-0.5 hover:bg-[#0f2f1e]"
              >
                {t.tellCommunity}
              </a>

              <a
                href="#live-intelligence"
                className="rounded-full border border-[#cbd5cc] bg-white px-7 py-3.5 text-center text-sm font-bold text-[#314038] transition hover:bg-[#eef3ee]"
              >
                {t.seeHow}
              </a>
            </div>

            <div className="mt-10 flex items-center gap-3 text-sm text-[#66736a]">
              <div className="flex -space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#f5f7f4] bg-[#d8e5d9] text-xs">
                  🇮🇳
                </div>

                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#f5f7f4] bg-[#e7ddd0] text-xs">
                  🎤
                </div>

                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#f5f7f4] bg-[#dfe4ed] text-xs">
                  📍
                </div>
              </div>

              <span>
                {t.citizenInputs}
              </span>
            </div>
          </div>

          {/* =================================================
              LIVE DEVELOPMENT PULSE
          ================================================== */}

          <div className="relative flex items-center">
            <div
              key={pulseKey}
              className="w-full rounded-[2rem] border border-[#d6ded6] bg-white p-5 shadow-[0_30px_80px_rgba(32,57,40,0.10)] hover:shadow-[0_20px_50px_rgba(34,197,94,0.25)] hover:border-[#22c55e] hover:scale-[1.015] transition-all duration-500 ease-out sm:p-7"
            >
              <div className="flex items-center justify-between border-b border-[#e5eae5] pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7b877f]">
                    {t.intelligence}
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-[#17221b]">
                    {t.developmentPulse}
                  </h2>
                </div>

                <div className="flex items-center gap-2 rounded-full bg-[#e9f4ea] px-3 py-1.5 text-xs font-bold text-[#397149]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#397149]" />
                  {t.live}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {/* SUBMISSIONS */}

                <div className="rounded-2xl bg-[#f5f7f4] p-4 border border-transparent hover:border-[#22c55e]/40 hover:bg-[#eafaea]/30 hover:shadow-[0_4px_12px_rgba(34,197,94,0.15)] transition-all duration-300 hover:-translate-y-0.5">
                  <p className="text-2xl font-bold tracking-tight text-[#173f2a]">
                    <AnimatedNumber
                      value={
                        submissions.length
                      }
                    />
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#6c776f]">
                    {t.submissions}
                  </p>
                </div>

                {/* HOTSPOTS */}

                <div className="rounded-2xl bg-[#f5f7f4] p-4 border border-transparent hover:border-[#22c55e]/40 hover:bg-[#eafaea]/30 hover:shadow-[0_4px_12px_rgba(34,197,94,0.15)] transition-all duration-300 hover:-translate-y-0.5">
                  <p className="text-2xl font-bold tracking-tight text-[#173f2a]">
                    <AnimatedNumber
                      value={
                        uniqueHotspots
                      }
                    />
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#6c776f]">
                    {t.hotspots}
                  </p>
                </div>

                {/* CRITICAL */}

                <div className="rounded-2xl bg-[#f5f7f4] p-4 border border-transparent hover:border-[#22c55e]/40 hover:bg-[#eafaea]/30 hover:shadow-[0_4px_12px_rgba(34,197,94,0.15)] transition-all duration-300 hover:-translate-y-0.5">
                  <p className="text-2xl font-bold tracking-tight text-[#173f2a]">
                    <AnimatedNumber
                      value={
                        criticalPriorities
                      }
                    />
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#6c776f]">
                    {t.critical}
                  </p>
                </div>

                {/* EVIDENCE */}

                <div className="rounded-2xl bg-[#f5f7f4] p-4 border border-transparent hover:border-[#22c55e]/40 hover:bg-[#eafaea]/30 hover:shadow-[0_4px_12px_rgba(34,197,94,0.15)] transition-all duration-300 hover:-translate-y-0.5">
                  <p className="text-2xl font-bold tracking-tight text-[#173f2a]">
                    <AnimatedNumber
                      value={
                        evidenceReports
                      }
                    />
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#6c776f]">
                    {t.evidenceReports}
                  </p>
                </div>
              </div>

              {/* TOP NEED */}

              <div className="mt-6 rounded-2xl border border-[#e1e7e1] hover:border-[#22c55e]/40 hover:bg-[#eafaea]/10 hover:shadow-[0_4px_12px_rgba(34,197,94,0.12)] transition-all duration-300 p-4">
                {topPriority ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[#6d786f]">
                          {t.highestNeed}
                        </p>

                        <p className="mt-1 flex items-center gap-2 font-bold text-[#17221b]">
                          <span>
                            {
                              topPriority.icon
                            }
                          </span>

                          {getCategoryTitle(
                            topPriority.name,
                            language
                          )}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#28623c]">
                          {
                            topPriority.priority
                          }
                        </p>

                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7b877f]">
                          {t.priority}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e5eae5]">
                      <div
                        className="h-full rounded-full bg-[#397149] transition-all duration-1000"
                        style={{
                          width: `${Math.max(
                            topPriority.priority,
                            3
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="mt-3 flex justify-between text-xs text-[#7b877f]">
                      <span>
                        {
                          topPriority.count
                        }{" "}
                        {t.requests}
                      </span>

                      <span>
                        {
                          topPriority.locations
                        }{" "}
                        {t.hotspots}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="py-5 text-center">
                    <p className="text-3xl">
                      📊
                    </p>

                    <p className="mt-2 text-sm font-bold text-[#173f2a]">
                      {t.noDataYet}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#173f2a] p-4 text-white">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  ✓
                </div>

                <div>
                  <p className="text-sm font-bold">
                    {t.evidence}
                  </p>

                  <p className="mt-0.5 text-xs text-white/65">
                    {t.demand}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          LIVE INTELLIGENCE
      ====================================================== */}

      <section
        id="live-intelligence"
        className="border-y border-[#dce3dc] bg-white"
      >
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#397149]">
                {t.liveIntelligence}
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#17221b] sm:text-4xl">
                {t.whatSystem}
              </h2>

              <p className="mt-4 max-w-2xl leading-7 text-[#66736a]">
                {t.realCitizenData}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-[#cfe0d1] bg-[#f5faf5] px-4 py-2 text-xs font-bold text-[#397149]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#397149]" />
              {submissions.length}{" "}
              {t.submissions}
            </div>
          </div>

          {submissions.length === 0 ? (
            <div className="mt-10 rounded-[2rem] border-2 border-dashed border-[#d4ded5] bg-[#f8faf8] p-14 text-center">
              <div className="text-6xl">
                📊
              </div>

              <h3 className="mt-5 text-2xl font-bold text-[#173f2a]">
                {t.noDataYet}
              </h3>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#68736b]">
                {language === "hi"
                  ? "नागरिक पोर्टल से पहली रिपोर्ट जमा होने के बाद यह पूरा सेक्शन वास्तविक डेटा से भर जाएगा।"
                  : language === "or"
                    ? "ନାଗରିକ ପୋର୍ଟାଲରୁ ପ୍ରଥମ ରିପୋର୍ଟ ଦାଖଲ ହେଲା ପରେ ଏହି ବିଭାଗ ପ୍ରକୃତ ତଥ୍ୟରେ ଭରିଯିବ।"
                    : "Submit the first report through the citizen portal and this section will populate with real data."}
              </p>

              <a
                href="/citizen"
                className="mt-6 inline-flex rounded-full bg-[#173f2a] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0f2f1e]"
              >
                {t.tellCommunity}
              </a>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {/* ISSUE DISTRIBUTION */}

              <div className="rounded-[2rem] border border-[#d9e1d9] bg-[#f8faf8] p-6 shadow-sm sm:p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#397149]">
                      {t.issueDistribution}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[#68736b]">
                      {
                        t.issueDistributionDescription
                      }
                    </p>
                  </div>

                  <div className="text-2xl">
                    📊
                  </div>
                </div>

                <div className="mt-7 space-y-4">
                  {categoryInsights.map(
                    (category, index) => (
                      <div
                        key={
                          category.name
                        }
                        className="group"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white">
                              {
                                category.icon
                              }
                            </span>

                            <span className="font-bold text-[#173f2a]">
                              {getCategoryTitle(
                                category.name,
                                language
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#778279]">
                              {
                                category.count
                              }
                            </span>

                            <span className="font-bold text-[#397149]">
                              {
                                category.percentage
                              }
                              %
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#dfe8e0]">
                          <div
                            className="h-full origin-left rounded-full bg-[#397149] transition-all duration-1000 ease-out group-hover:bg-[#28623c]"
                            style={{
                              width: `${Math.max(
                                category.percentage,
                                3
                              )}%`,
                              transitionDelay: `${index * 60}ms`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* PRIORITY RANKING */}

              <div className="rounded-[2rem] border border-[#d9e1d9] bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#397149]">
                      {t.priorityRanking}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[#68736b]">
                      {
                        t.priorityRankingDescription
                      }
                    </p>
                  </div>

                  <div className="text-2xl">
                    🎯
                  </div>
                </div>

                <div className="mt-7 space-y-4">
                  {categoryInsights
                    .slice(0, 6)
                    .map(
                      (
                        category,
                        index
                      ) => (
                        <div
                          key={
                            category.name
                          }
                          className="rounded-2xl border border-[#e3e9e3] bg-[#f8faf8] p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-bold text-[#397149]">
                              #
                              {index + 1}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <span>
                                    {
                                      category.icon
                                    }
                                  </span>

                                  <span className="truncate text-sm font-bold text-[#173f2a]">
                                    {getCategoryTitle(
                                      category.name,
                                      language
                                    )}
                                  </span>
                                </div>

                                <span className="text-lg font-bold text-[#28623c]">
                                  {
                                    category.priority
                                  }
                                </span>
                              </div>

                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#dfe8e0]">
                                <div
                                  className="h-full rounded-full bg-[#397149] transition-all duration-1000"
                                  style={{
                                    width: `${Math.max(
                                      category.priority,
                                      3
                                    )}%`,
                                  }}
                                />
                              </div>

                              <div className="mt-2 flex items-center justify-between text-[11px] text-[#778279]">
                                <span>
                                  {
                                    category.count
                                  }{" "}
                                  {t.requests}
                                </span>

                                <span>
                                  {
                                    category.level
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                </div>
              </div>

              {/* EVIDENCE */}

              <div className="rounded-[2rem] border border-[#d9e1d9] bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#397149]">
                      {t.evidenceCoverage}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[#68736b]">
                      {
                        t.evidenceCoverageDescription
                      }
                    </p>
                  </div>

                  <div className="text-2xl">
                    📷
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-8">
                  <div
                    className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: `conic-gradient(#397149 ${evidencePercentage}%, #e1e9e2 ${evidencePercentage}% 100%)`,
                    }}
                  >
                    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-[#173f2a]">
                          {
                            evidencePercentage
                          }
                          %
                        </p>

                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7b877f]">
                          evidence
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-3xl font-bold text-[#173f2a]">
                      <AnimatedNumber
                        value={
                          evidenceReports
                        }
                      />
                    </p>

                    <p className="mt-1 text-sm text-[#68736b]">
                      {t.evidenceReports}
                    </p>

                    <p className="mt-4 text-xs leading-5 text-[#7b877f]">
                      {submissions.length -
                        evidenceReports}{" "}
                      reports currently
                      have no photo
                      evidence.
                    </p>
                  </div>
                </div>
              </div>

              {/* LANGUAGE */}

              <div className="rounded-[2rem] border border-[#d9e1d9] bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#397149]">
                      {t.languageInsights}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[#68736b]">
                      {
                        t.languageInsightsDescription
                      }
                    </p>
                  </div>

                  <div className="text-2xl">
                    🌐
                  </div>
                </div>

                <div className="mt-7 space-y-5">
                  {languageInsights.map(
                    (item) => (
                      <div
                        key={
                          item.language
                        }
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold text-[#173f2a]">
                            {getLanguageLabel(
                              item.language,
                              language
                            )}
                          </span>

                          <span className="font-bold text-[#397149]">
                            {
                              item.count
                            }{" "}
                            ·{" "}
                            {
                              item.percentage
                            }
                            %
                          </span>
                        </div>

                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#e0e8e1]">
                          <div
                            className="h-full rounded-full bg-[#397149] transition-all duration-1000"
                            style={{
                              width: `${Math.max(
                                item.percentage,
                                3
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          LIVE PIPELINE
      ====================================================== */}

      <section className="bg-[#f5f7f4]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#397149]">
              {t.decisionPipeline}
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#17221b] sm:text-4xl">
              {t.decisionPipeline}
            </h2>

            <p className="mt-4 leading-7 text-[#66736a]">
              {
                t.decisionPipelineDescription
              }
            </p>
          </div>

          <div className="relative mt-12">
            <div className="absolute left-0 right-0 top-8 hidden h-px bg-[#cfdacf] lg:block" />

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {pipelineSteps.map(
                (step, index) => (
                  <div
                    key={step.title}
                    className="relative rounded-3xl border border-[#d9e2da] bg-white p-6 shadow-sm transition duration-500 hover:-translate-y-1 hover:shadow-lg"
                    style={{
                      animationDelay: `${index * 120}ms`,
                    }}
                  >
                    <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e9f4ea] text-2xl shadow-sm">
                      {step.icon}
                    </div>

                    <p className="mt-5 text-sm font-bold text-[#173f2a]">
                      {step.title}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#718078]">
                      {step.text}
                    </p>

                    <div className="mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#397149]">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[#397149]" />
                      LIVE
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          HOW IT WORKS
      ====================================================== */}

      <section
        id="how-it-works"
        className="border-y border-[#dce3dc] bg-white"
      >
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#397149]">
              {t.fromVoice}
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#17221b] sm:text-4xl">
              {t.sixLayers}
            </h2>

            <p className="mt-4 leading-7 text-[#66736a]">
              {t.sixDescription}
            </p>
          </div>

          <div className="mt-12">
            <Coverflow items={howItWorks} language={language} />
          </div>
        </div>
      </section>

      {/* =====================================================
          REAL PRIORITIES
      ====================================================== */}

      <section
        id="priorities"
        className="bg-[#f5f7f4]"
      >
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#397149]">
                {t.priorityRanking}
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#17221b] sm:text-4xl">
                {t.whatSystem}
              </h2>
            </div>

            <a
              href="/dashboard"
              className="text-sm font-bold text-[#397149] hover:underline"
            >
              {language === "en"
                ? "Open full dashboard →"
                : language === "hi"
                  ? "पूरा डैशबोर्ड खोलें →"
                  : "ସମ୍ପୂର୍ଣ୍ଣ ଡ୍ୟାସବୋର୍ଡ ଖୋଲନ୍ତୁ →"}
            </a>
          </div>

          {categoryInsights.length === 0 ? (
            <div className="mt-10 rounded-[2rem] border border-dashed border-[#cbd8cd] bg-white p-12 text-center">
              <div className="text-5xl">
                🎯
              </div>

              <p className="mt-4 font-bold text-[#173f2a]">
                {t.noDataYet}
              </p>
            </div>
          ) : (
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {categoryInsights
                .slice(0, 3)
                .map(
                  (item, index) => (
                    <div
                      key={item.name}
                      className="rounded-3xl border border-[#d9e1d9] bg-white p-6 shadow-sm transition duration-500 hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4ee] text-xl">
                          {item.icon}
                        </div>

                        <span className="text-xs font-bold tracking-widest text-[#9aa49d]">
                          #
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>
                      </div>

                      <div className="mt-6 flex items-end justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-[#17221b]">
                            {getCategoryTitle(
                              item.name,
                              language
                            )}
                          </h3>

                          <p className="mt-2 text-xs text-[#78837b]">
                            {item.count}{" "}
                            {t.requests}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-3xl font-bold text-[#28623c]">
                            {
                              item.priority
                            }
                          </span>

                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#89948c]">
                            {t.priority}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 h-2 rounded-full bg-[#e8ede8]">
                        <div
                          className="h-full rounded-full bg-[#397149] transition-all duration-1000"
                          style={{
                            width: `${Math.max(
                              item.priority,
                              3
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="mt-4 flex justify-between text-xs text-[#78837b]">
                        <span>
                          {
                            item.percentage
                          }
                          % of reports
                        </span>

                        <span>
                          {
                            item.locations
                          }{" "}
                          locations
                        </span>
                      </div>
                    </div>
                  )
                )}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          DATA INTEGRITY NOTICE
      ====================================================== */}

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="rounded-[2rem] border border-[#cfe0d1] bg-[#f5faf5] p-7 sm:p-9">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#173f2a] text-xl text-white">
                🛡️
              </div>

              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#397149]">
                  {language === "en"
                    ? "DATA INTEGRITY"
                    : language === "hi"
                      ? "डेटा विश्वसनीयता"
                      : "ତଥ୍ୟ ବିଶ୍ୱସନୀୟତା"}
                </p>

                <h2 className="mt-2 text-2xl font-bold text-[#173f2a]">
                  {language === "en"
                    ? "No fabricated intelligence"
                    : language === "hi"
                      ? "कोई नकली आँकड़े नहीं"
                      : "କୌଣସି ନକଲି ତଥ୍ୟ ନାହିଁ"}
                </h2>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#66736a]">
                  {language === "en"
                    ? "Every number shown on this page is calculated from the citizen submissions currently available to the application. Metrics that require an external dataset are intentionally not displayed."
                    : language === "hi"
                      ? "इस पेज पर दिखाया गया हर आँकड़ा वर्तमान में एप्लिकेशन में उपलब्ध नागरिक रिपोर्टों से निकाला जाता है। जिन मेट्रिक्स के लिए बाहरी डेटासेट चाहिए, उन्हें जानबूझकर नहीं दिखाया गया है।"
                      : "ଏହି ପୃଷ୍ଠାରେ ଦେଖାଯାଉଥିବା ପ୍ରତ୍ୟେକ ତଥ୍ୟ ବର୍ତ୍ତମାନ ଆପ୍ଲିକେସନରେ ଥିବା ନାଗରିକ ରିପୋର୍ଟରୁ ଗଣନା କରାଯାଏ। ବାହ୍ୟ ଡାଟାସେଟ୍ ଆବଶ୍ୟକ କରୁଥିବା ମେଟ୍ରିକ୍ ଜାଣିଶୁଣି ଦେଖାଯାଉନାହିଁ।"}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-bold text-[#397149]">
                      {t.locationVerified}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#66736a]">
                      {t.locationVerifiedText}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-bold text-[#397149]">
                      {t.evidenceFirst}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#66736a]">
                      {t.evidenceFirstText}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-bold text-[#397149]">
                      {t.noBudgetData}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#66736a]">
                      {t.noBudgetDataText}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          UNIQUENESS
      ====================================================== */}

      <section
        id="about"
        className="bg-[#173f2a] text-white"
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a8c8ae]">
              {t.ourDifference}
            </p>

            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              {t.notComplaint}
            </h2>

            <p className="mt-6 max-w-xl text-base leading-8 text-white/65">
              {t.differenceDescription}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 transition hover:bg-white/[0.09]">
              <div className="text-2xl">
                📍
              </div>

              <h3 className="mt-4 font-bold">
                {t.realityCheck}
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/55">
                {t.realityText}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 transition hover:bg-white/[0.09]">
              <div className="text-2xl">
                🧠
              </div>

              <h3 className="mt-4 font-bold">
                {t.explainableAI}
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/55">
                {t.explainableText}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 transition hover:bg-white/[0.09]">
              <div className="text-2xl">
                📷
              </div>

              <h3 className="mt-4 font-bold">
                {t.evidenceFirst}
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/55">
                {t.evidenceFirstText}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 transition hover:bg-white/[0.09]">
              <div className="text-2xl">
                🇮🇳
              </div>

              <h3 className="mt-4 font-bold">
                {t.locationVerified}
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/55">
                {t.locationVerifiedText}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="bg-[#102d1e] text-white/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-xs sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>
            PEOPLE&apos;S PRIORITIES · AI FOR
            CONSTITUENCY DEVELOPMENT
          </p>

          <p>
            PARAKRAM 1.0
          </p>
        </div>
      </footer>
    </main>
  );
}