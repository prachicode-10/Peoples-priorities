import { analyzeIssueContext } from "../lib/issueClassifier";
import { ODIA_GRIEVANCE_TEMPLATES, findMatchingOdiaTemplate } from "../lib/odiaGrievances";
import { LANGUAGES, getTranslations, CATEGORY_NAMES } from "../lib/translations";

async function runAllVerification() {
  console.log("=================================================");
  console.log("🔍 PEOPLE'S PRIORITIES: COMPLETE FEATURE VERIFICATION");
  console.log("=================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ PASS: ${testName}${detail ? ` (${detail})` : ""}`);
    } else {
      console.error(`❌ FAIL: ${testName}${detail ? ` (${detail})` : ""}`);
    }
  }

  // ----------------------------------------------------
  // SECTION 1: Page Routes & Server Health
  // ----------------------------------------------------
  console.log("--- 1. Testing Page Routes (Next.js Server) ---");
  const routes = ["/", "/citizen", "/track", "/dashboard", "/admin", "/login"];
  for (const r of routes) {
    try {
      const res = await fetch(`http://localhost:3000${r}`);
      assert(res.status === 200, `Route: ${r}`, `Status: ${res.status}`);
    } catch (e: any) {
      assert(false, `Route: ${r}`, `Error: ${e.message}`);
    }
  }

  // ----------------------------------------------------
  // SECTION 2: Voice Transcribe & Translation API
  // ----------------------------------------------------
  console.log("\n--- 2. Testing Voice Transcribe & Translation Pipeline (/api/transcribe) ---");
  
  // Test 2.1: Phonetic Odia input -> authentic Odia script & English translation
  try {
    const fd = new FormData();
    fd.append("audio", new Blob([new Uint8Array(1024)], { type: "audio/webm" }), "voice.webm");
    fd.append("language", "or-IN");
    fd.append("interimText", "rasta kharap achhi");
    fd.append("targetLanguage", "en");

    const res = await fetch("http://localhost:3000/api/transcribe", { method: "POST", body: fd });
    const data = await res.json();
    assert(
      data.success &&
      data.originalText.includes("ରାସ୍ତା") &&
      data.translatedText.toLowerCase().includes("road"),
      "Phonetic Odia Voice ('rasta kharap achhi')",
      `Original: "${data.originalText.substring(0, 30)}...", Translated: "${data.translatedText.substring(0, 35)}..."`
    );
  } catch (e: any) {
    assert(false, "Phonetic Odia Voice", e.message);
  }

  // Test 2.2: Native Odia Script input -> English Translation
  try {
    const fd = new FormData();
    fd.append("audio", new Blob([new Uint8Array(1024)], { type: "audio/webm" }), "voice.webm");
    fd.append("language", "or-IN");
    fd.append("interimText", "ଆମ ୱାର୍ଡରେ ପାନୀୟ ଜଳ ଯୋଗାଣ ବନ୍ଦ ଅଛି");
    fd.append("targetLanguage", "en");

    const res = await fetch("http://localhost:3000/api/transcribe", { method: "POST", body: fd });
    const data = await res.json();
    assert(
      data.success &&
      data.originalText.includes("ପାନୀୟ ଜଳ") &&
      data.translatedText.toLowerCase().includes("water"),
      "Native Odia Script ('ପାନୀୟ ଜଳ ଯୋଗାଣ')",
      `Translated: "${data.translatedText}"`
    );
  } catch (e: any) {
    assert(false, "Native Odia Script", e.message);
  }

  // Test 2.3: Hindi Voice input -> English Translation
  try {
    const fd = new FormData();
    fd.append("audio", new Blob([new Uint8Array(1024)], { type: "audio/webm" }), "voice.webm");
    fd.append("language", "hi-IN");
    fd.append("interimText", "सड़क पर बहुत गहरे गड्ढे हैं जिससे दुर्घटनाएं हो रही हैं");
    fd.append("targetLanguage", "en");

    const res = await fetch("http://localhost:3000/api/transcribe", { method: "POST", body: fd });
    const data = await res.json();
    assert(
      data.success &&
      data.originalText.includes("सड़क") &&
      (data.translatedText.toLowerCase().includes("pothole") || data.translatedText.toLowerCase().includes("road")),
      "Hindi Voice ('सड़क पर बहुत गहरे गड्ढे हैं')",
      `Translated: "${data.translatedText}"`
    );
  } catch (e: any) {
    assert(false, "Hindi Voice", e.message);
  }

  // Test 2.4: Empty text with audio evidence -> Auto-populated voice draft
  try {
    const fd = new FormData();
    fd.append("audio", new Blob([new Uint8Array(2048)], { type: "audio/webm" }), "voice.webm");
    fd.append("language", "or-IN");
    fd.append("interimText", "");
    fd.append("targetLanguage", "en");

    const res = await fetch("http://localhost:3000/api/transcribe", { method: "POST", body: fd });
    const data = await res.json();
    assert(
      data.success &&
      data.originalText.length > 0 &&
      data.translatedText.length > 0 &&
      data.audioReceived === true,
      "Audio-only with Empty Text Fallback Draft",
      `Draft: "${data.originalText}"`
    );
  } catch (e: any) {
    assert(false, "Audio-only with Empty Text Fallback Draft", e.message);
  }

  // ----------------------------------------------------
  // SECTION 3: Context-Aware Issue Classification API
  // ----------------------------------------------------
  console.log("\n--- 3. Testing Context-Aware Issue Classification (/api/classify) ---");

  // Test 3.1: Cause vs Effect (Food Safety causes Malaria/Typhoid -> Food Safety)
  try {
    const text = "The food quality in our area is very poor and contaminated food is causing malaria and typhoid.";
    const res = await fetch(`http://localhost:3000/api/classify?text=${encodeURIComponent(text)}`);
    const data = await res.json();
    assert(
      data.success &&
      data.classification.primaryCategory === "Food Safety" &&
      data.classification.theme === "Food Quality & Safety",
      "Cause vs Effect Disambiguation (Food Safety causes illness)",
      `Category: ${data.classification.primaryCategory}, Impact: ${data.classification.impact}`
    );
  } catch (e: any) {
    assert(false, "Cause vs Effect Disambiguation", e.message);
  }

  // Test 3.2: Waste causing Dengue -> Waste Management
  try {
    const text = "The garbage dump near our houses is causing dengue and mosquitoes are breeding everywhere.";
    const res = await fetch(`http://localhost:3000/api/classify?text=${encodeURIComponent(text)}`);
    const data = await res.json();
    assert(
      data.success &&
      data.classification.primaryCategory === "Waste Management",
      "Garbage dump causing Dengue -> Waste Management",
      `Category: ${data.classification.primaryCategory}, Impact: ${data.classification.impact}`
    );
  } catch (e: any) {
    assert(false, "Garbage dump causing Dengue", e.message);
  }

  // Test 3.3: Compound multi-issue grievance
  try {
    const text = "Our village has no water and no garbage collection.";
    const res = await fetch(`http://localhost:3000/api/classify?text=${encodeURIComponent(text)}`);
    const data = await res.json();
    assert(
      data.success &&
      data.classification.primaryCategory === "Water & Sanitation" &&
      data.classification.secondaryCategories.includes("Waste Management"),
      "Compound Multi-Issue Grievance (Water + Waste)",
      `Primary: ${data.classification.primaryCategory}, Secondary: ${data.classification.secondaryCategories.join(", ")}`
    );
  } catch (e: any) {
    assert(false, "Compound Multi-Issue Grievance", e.message);
  }

  // Test 3.4: Odia Complaint Classification
  try {
    const text = "ଆମ ଗାଁ ମୁଖ୍ୟ ରାସ୍ତା ସଂପୂର୍ଣ୍ଣ ଖରାପ ହୋଇ ବଡ଼ ବଡ଼ ଖାଲ ହୋଇଛି, ଯାତାୟାତରେ ଅସୁବିଧା ହେଉଛି।";
    const res = await fetch(`http://localhost:3000/api/classify?text=${encodeURIComponent(text)}`);
    const data = await res.json();
    assert(
      data.success &&
      data.classification.primaryCategory === "Roads & Infrastructure",
      "Odia Language Complaint Classification",
      `Category: ${data.classification.primaryCategory}, Confidence: ${data.classification.confidence}%`
    );
  } catch (e: any) {
    assert(false, "Odia Language Complaint Classification", e.message);
  }

  // ----------------------------------------------------
  // SECTION 4: Multilingual Translation Dictionaries
  // ----------------------------------------------------
  console.log("\n--- 4. Testing 12-Language Multilingual System ---");
  assert(LANGUAGES.length === 12, "All 12 Languages Registered", `${LANGUAGES.map(l => l.code).join(", ")}`);
  
  let allDictionariesValid = true;
  for (const lang of LANGUAGES) {
    const dict = getTranslations(lang.code);
    if (!dict || !dict.common || !dict.hero || !dict.voice || !dict.citizenForm) {
      allDictionariesValid = false;
      break;
    }
  }
  assert(allDictionariesValid, "All 12 Language UI Dictionaries Complete", "Common, Hero, Voice, CitizenForm in all 12");

  let allCategoriesTranslated = true;
  for (const cat of Object.keys(CATEGORY_NAMES)) {
    for (const lang of LANGUAGES) {
      if (!CATEGORY_NAMES[cat][lang.code]) {
        allCategoriesTranslated = false;
        break;
      }
    }
  }
  assert(allCategoriesTranslated, "All Categories Translated Across 12 Languages", `${Object.keys(CATEGORY_NAMES).length} categories`);

  // ----------------------------------------------------
  // SECTION 5: Native Odia Presets & Matcher
  // ----------------------------------------------------
  console.log("\n--- 5. Testing Odia Civic Presets & Phonetic Matcher ---");
  assert(ODIA_GRIEVANCE_TEMPLATES.length >= 8, "Odia Civic Presets Count", `${ODIA_GRIEVANCE_TEMPLATES.length} templates`);
  
  const m1 = findMatchingOdiaTemplate("rasta kharap");
  assert(m1?.id === "road", "Phonetic matcher for 'rasta kharap'", `Matched: ${m1?.label}`);

  const m2 = findMatchingOdiaTemplate("pani asuni");
  assert(m2?.id === "water", "Phonetic matcher for 'pani asuni'", `Matched: ${m2?.label}`);

  const m3 = findMatchingOdiaTemplate("bijuli gul");
  assert(m3?.id === "electricity", "Phonetic matcher for 'bijuli gul'", `Matched: ${m3?.label}`);

  console.log("\n=================================================");
  console.log(`📊 FINAL RESULT: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("=================================================");
}

runAllVerification();
