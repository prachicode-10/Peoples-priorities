import { NextRequest, NextResponse } from "next/server";
import {
  ODIA_GRIEVANCE_TEMPLATES,
  findMatchingOdiaTemplate,
} from "@/lib/odiaGrievances";

// Language names map
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  or: "Odia",
  bn: "Bengali",
  te: "Telugu",
  ta: "Tamil",
  mr: "Marathi",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
  ur: "Urdu",
  as: "Assamese",
};

/**
 * Fast & accurate translation via Google GTX engine
 */
async function translateWithGTX(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  if (!text || !text.trim()) return "";
  const src = sourceLang.split("-")[0].toLowerCase();
  const tgt = targetLang.split("-")[0].toLowerCase();
  if (src === tgt) return text;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${src}&tl=${tgt}&dt=t&q=${encodeURIComponent(
      text
    )}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data[0])) {
        const translated = data[0]
          .map((item: any) => (item && item[0] ? item[0] : ""))
          .join("")
          .trim();
        if (translated) return translated;
      }
    }
  } catch (e: any) {
    console.warn("[Transcribe API] GTX translation warning:", e.message);
  }
  return "";
}

/**
 * Fallback translation using MyMemory API
 */
async function translateWithMyMemory(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  if (!text || !text.trim()) return "";
  const src = sourceLang.split("-")[0].toLowerCase();
  const tgt = targetLang.split("-")[0].toLowerCase();
  if (src === tgt) return text;

  try {
    const pair = `${src}|${tgt}`;
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=${encodeURIComponent(pair)}&de=peoplespriorities.civic@gmail.com`;

    const response = await fetch(myMemoryUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });

    if (response.ok) {
      const data = await response.json();
      const resultText = data.responseData?.translatedText;
      if (
        resultText &&
        !resultText.includes("MYMEMORY WARNING:") &&
        resultText.trim().length > 0
      ) {
        return resultText.trim();
      }
    }
  } catch (err: any) {
    console.warn("[Transcribe API] MyMemory translation warning:", err.message);
  }
  return "";
}

/**
 * Unified Multilingual Translation Pipeline
 */
async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string = "en"
): Promise<{ translated: string; detected: string }> {
  if (!text || text.trim().length === 0) {
    return { translated: "", detected: sourceLang };
  }

  const src = sourceLang.split("-")[0].toLowerCase();
  const tgt = targetLang.split("-")[0].toLowerCase();

  if (src === tgt) {
    return { translated: text, detected: src };
  }

  // 1. Primary: Google GTX Engine
  const gtxResult = await translateWithGTX(text, src, tgt);
  if (gtxResult) {
    return { translated: gtxResult, detected: src };
  }

  // 2. Secondary: MyMemory API
  const myMemoryResult = await translateWithMyMemory(text, src, tgt);
  if (myMemoryResult) {
    return { translated: myMemoryResult, detected: src };
  }

  // 3. Fallback: Return original
  return { translated: text, detected: src };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const rawLanguage = (formData.get("language") as string) || "en-IN";
    const interimText = (formData.get("interimText") as string) || "";
    const targetLanguage = (formData.get("targetLanguage") as string) || "en";

    const langCode = rawLanguage.split("-")[0].toLowerCase();
    const langName = LANGUAGE_NAMES[langCode] || langCode.toUpperCase();

    const audioSize = audioFile ? audioFile.size : 0;
    const audioType = audioFile ? audioFile.type : "unknown";

    console.log(
      `[Transcribe API] Received audio: ${audioSize} bytes (${audioType}), language: ${rawLanguage}, clientText: "${interimText}"`
    );

    let originalTranscript = interimText.trim();
    let translatedText = "";

    // 1. Check for external OpenAI Whisper API if configured
    if (process.env.OPENAI_API_KEY && audioFile && audioSize > 1000) {
      try {
        const whisperForm = new FormData();
        whisperForm.append("file", audioFile);
        whisperForm.append("model", "whisper-1");
        whisperForm.append("language", langCode);

        const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: whisperForm,
        });

        if (whisperRes.ok) {
          const wData = await whisperRes.json();
          if (wData.text && wData.text.trim().length > 0) {
            originalTranscript = wData.text.trim();
          }
        }
      } catch (whisperErr) {
        console.warn("[Transcribe API] OpenAI Whisper API attempt failed:", whisperErr);
      }
    }

    // 2. Specialized Odia Processing
    if (langCode === "or") {
      const hasOdiaScript = /[\u0b00-\u0b7f]/.test(originalTranscript);

      // Check if text matches verified Odia civic templates (phonetic or script)
      const matched = findMatchingOdiaTemplate(originalTranscript);
      if (matched) {
        originalTranscript = matched.odiaText;
        translatedText = matched.englishTranslation;
      } else if (hasOdiaScript) {
        // Genuine Odia script: translate to English
        const res = await translateText(originalTranscript, "or", "en");
        translatedText = res.translated;
      } else if (originalTranscript.length > 0) {
        // Spoken Latin syllables / English words captured by browser
        const enRes = await translateText(originalTranscript, "auto", "en");
        if (enRes.translated && enRes.translated.trim()) {
          translatedText = enRes.translated.trim();
          // Generate authentic Odia script for citizen
          const odiaRes = await translateText(translatedText, "en", "or");
          if (odiaRes.translated && /[\u0b00-\u0b7f]/.test(odiaRes.translated)) {
            originalTranscript = odiaRes.translated;
          }
        } else {
          translatedText = originalTranscript;
        }
      }
    }

    // 3. General Multilingual Translation Flow
    if (originalTranscript && !translatedText) {
      if (langCode !== "en" && targetLanguage === "en") {
        const result = await translateText(originalTranscript, langCode, "en");
        translatedText = result.translated;
      } else if (langCode === "en" && targetLanguage !== "en") {
        const result = await translateText(originalTranscript, "en", targetLanguage);
        translatedText = result.translated;
      } else {
        const result = await translateText(originalTranscript, langCode, "en");
        translatedText = result.translated;
      }
    }

    // 4. Default Voice Grievance Drafting if audio was recorded without transcribed text
    if (!originalTranscript && !translatedText && audioSize > 200) {
      if (langCode === "or") {
        originalTranscript = "ନାଗରିକଙ୍କ ସ୍ୱର ସମସ୍ୟା ରେକର୍ଡ ହୋଇଛି (ଅଡିଓ ଫାଇଲ୍ ସଂଲଗ୍ନ)";
        translatedText = "Citizen voice grievance recorded (Audio evidence attached)";
      } else if (langCode === "hi") {
        originalTranscript = "नागरिक की ध्वनि शिकायत दर्ज की गई (ऑडियो संलग्न)";
        translatedText = "Citizen voice grievance recorded (Audio evidence attached)";
      } else {
        originalTranscript = "Citizen Voice Grievance Recorded (Audio Evidence Attached)";
        translatedText = "Citizen Voice Grievance Recorded (Audio Evidence Attached)";
      }
    }

    // Compose combined bilingual representation
    let combined = "";
    if (
      originalTranscript &&
      translatedText &&
      translatedText.toLowerCase() !== originalTranscript.toLowerCase()
    ) {
      combined = `[${langName}]: ${originalTranscript}\n[English Translation]: ${translatedText}`;
    } else {
      combined = originalTranscript || translatedText;
    }

    // Return successfully structured response
    if (originalTranscript || translatedText || audioSize > 0) {
      return NextResponse.json({
        success: true,
        originalText: originalTranscript,
        translatedText: translatedText || originalTranscript,
        combinedText: combined,
        detectedLanguage: langCode,
        languageName: langName,
        audioReceived: audioSize > 0,
        audioSize,
        audioType,
        isOdia: langCode === "or",
        odiaTemplates: ODIA_GRIEVANCE_TEMPLATES,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "No audio data received. Please record your issue again.",
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[Transcribe API] Error processing voice request:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process audio transcription",
      },
      { status: 500 }
    );
  }
}
