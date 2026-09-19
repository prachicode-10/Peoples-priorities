import { ODIA_GRIEVANCE_TEMPLATES, findMatchingOdiaTemplate } from "../lib/odiaGrievances";

async function translateWithGTX(text: string, sourceLang: string, targetLang: string): Promise<string> {
  if (!text || !text.trim()) return "";
  const src = sourceLang.split("-")[0].toLowerCase();
  const tgt = targetLang.split("-")[0].toLowerCase();
  if (src === tgt) return text;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${src}&tl=${tgt}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data[0])) {
        const translated = data[0].map((item: any) => item[0]).join("").trim();
        if (translated) return translated;
      }
    }
  } catch (e: any) {
    console.warn("GTX error:", e.message);
  }
  return "";
}

async function runTests() {
  console.log("=== Testing Odia and Multilingual Processing ===");

  // Test 1: Native Odia script
  const t1Text = "ଆମ ଗାଁ ରାସ୍ତାରେ ବହୁତ ଖାଲ ହୋଇଛି";
  const t1Matched = findMatchingOdiaTemplate(t1Text);
  console.log("Test 1 (Odia script matching):", t1Matched?.id || "None");
  const t1Trans = await translateWithGTX(t1Text, "or", "en");
  console.log("Test 1 Translation to English:", t1Trans);

  // Test 2: Phonetic Odia (Latin)
  const t2Text = "rasta kharap achhi";
  const t2Matched = findMatchingOdiaTemplate(t2Text);
  console.log("Test 2 (Phonetic matching):", t2Matched?.id || "None");
  if (t2Matched) {
    console.log("Test 2 Matched Odia:", t2Matched.odiaText);
    console.log("Test 2 Matched English:", t2Matched.englishTranslation);
  }

  // Test 3: Unmatched Phonetic Latin
  const t3Text = "bridge re pani chali jaichi";
  const t3En = await translateWithGTX(t3Text, "auto", "en");
  console.log("Test 3 auto->en:", t3En);
  const t3Or = await translateWithGTX(t3En, "en", "or");
  console.log("Test 3 en->or:", t3Or);

  // Test 4: Hindi
  const t4Text = "हमारे इलाके में बिजली का खंभा गिर गया है";
  const t4En = await translateWithGTX(t4Text, "hi", "en");
  console.log("Test 4 Hindi->en:", t4En);

  console.log("=== All test cases processed successfully ===");
}

runTests();
