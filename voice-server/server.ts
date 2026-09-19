import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { EdgeTTS } from "@andresaya/edge-tts";
import { spawn } from "child_process";

const PORT = Number(process.env.PORT || 5001);

const ffmpegPath: string = require("ffmpeg-static");

const SARVAM_API_KEY = process.env.SARVAM_API_KEY?.trim();

if (!SARVAM_API_KEY) {
  console.error("❌ SARVAM_API_KEY is missing");
  process.exit(1);
}

console.log("🔑 Sarvam API key: configured");

type Lang = "en" | "hi" | "or";

type State =
  | "language"
  | "name"
  | "pin"
  | "village"
  | "issue"
  | "confirm"
  | "done";

type Session = {
  lang: Lang;
  state: State;

  name: string;
  pin: string;
  village: string;
  issue: string;

  speaking: boolean;

  sarvam?: WebSocket;
  sarvamReady: boolean;

  streamSid?: string;
  callSid?: string;

  audioQueue: Buffer[];
  processingTranscript: boolean;

  pingTimer?: NodeJS.Timeout;
};

const sessions = new Map<WebSocket, Session>();

/* =========================================================
   TEXT
========================================================= */

const TEXT: Record<
  Lang,
  {
    language: string;
    welcome: string;
    pin: string;
    village: string;
    issue: string;
    confirm: string;
    done: string;
    retry: string;
    no: string;
  }
> = {
  en: {
    language:
      "Please say English, Hindi, or Odia.",

    welcome:
      "Welcome to People's Priorities. I am your AI assistant. Please tell me your name.",

    pin:
      "Thank you. Please say your six digit PIN code one digit at a time.",

    village:
      "Thank you. Please tell me your village or locality.",

    issue:
      "Thank you. Now please describe your problem in your own words.",

    confirm:
      "I understood that your name is {name}, your PIN code is {pin}, your location is {village}, and your complaint is {issue}. Is that correct? Please say yes or no.",

    done:
      "Thank you. Your complaint has been registered successfully. Your complaint ID is {id}. People's Priorities appreciates your participation.",

    retry:
      "I did not understand that. Please say it again.",

    no:
      "Okay. Please provide the information again.",
  },

  hi: {
    language:
      "कृपया अंग्रेज़ी, हिंदी या उड़िया में अपनी भाषा बताइए।",

    welcome:
      "पीपल्स प्रायोरिटीज में आपका स्वागत है। मैं आपका AI सहायक हूँ। कृपया अपना नाम बताइए।",

    pin:
      "धन्यवाद। कृपया अपना छह अंकों का पिन कोड एक-एक अंक करके बताइए।",

    village:
      "धन्यवाद। कृपया अपने गांव या इलाके का नाम बताइए।",

    issue:
      "धन्यवाद। अब अपनी समस्या अपने शब्दों में बताइए।",

    confirm:
      "मैंने समझा कि आपका नाम {name} है, पिन कोड {pin} है, स्थान {village} है और आपकी शिकायत {issue} है। क्या यह सही है? हाँ या नहीं बताइए।",

    done:
      "धन्यवाद। आपकी शिकायत सफलतापूर्वक दर्ज हो गई है। आपकी शिकायत आईडी {id} है।",

    retry:
      "मैं ठीक से समझ नहीं पाया। कृपया दोबारा बताइए।",

    no:
      "ठीक है। कृपया जानकारी दोबारा बताइए।",
  },

  or: {
    language:
      "ଦୟାକରି ଇଂରାଜୀ, ହିନ୍ଦୀ କିମ୍ବା ଓଡ଼ିଆରେ ଆପଣଙ୍କ ଭାଷା କୁହନ୍ତୁ।",

    welcome:
      "ପିପଲ୍ସ ପ୍ରାୟୋରିଟିଜ୍‌କୁ ସ୍ୱାଗତ। ମୁଁ ଆପଣଙ୍କ AI ସହାୟକ। ଦୟାକରି ଆପଣଙ୍କ ନାମ କୁହନ୍ତୁ।",

    pin:
      "ଧନ୍ୟବାଦ। ଦୟାକରି ଆପଣଙ୍କ ଛଅ ଅଙ୍କର ପିନ୍ କୋଡ୍ ଗୋଟିଏ ପରେ ଗୋଟିଏ ଅଙ୍କ କରି କୁହନ୍ତୁ।",

    village:
      "ଧନ୍ୟବାଦ। ଦୟାକରି ଆପଣଙ୍କ ଗାଁ କିମ୍ବା ଅଞ୍ଚଳର ନାମ କୁହନ୍ତୁ।",

    issue:
      "ଧନ୍ୟବାଦ। ଏବେ ଆପଣଙ୍କ ସମସ୍ୟାକୁ ନିଜ ଶବ୍ଦରେ ବର୍ଣ୍ଣନା କରନ୍ତୁ।",

    confirm:
      "ମୁଁ ବୁଝିଛି ଆପଣଙ୍କ ନାମ {name}, ପିନ୍ କୋଡ୍ {pin}, ସ୍ଥାନ {village}, ଏବଂ ସମସ୍ୟା {issue}। ଏହା ଠିକ୍ କି? ହଁ କିମ୍ବା ନା କୁହନ୍ତୁ।",

    done:
      "ଧନ୍ୟବାଦ। ଆପଣଙ୍କ ଅଭିଯୋଗ ସଫଳତାର ସହିତ ପଞ୍ଜୀକୃତ ହୋଇଛି। ଆପଣଙ୍କ ଅଭିଯୋଗ ID {id}।",

    retry:
      "ମୁଁ ଠିକ୍ ଭାବରେ ବୁଝିପାରିଲି ନାହିଁ। ଦୟାକରି ପୁଣି କୁହନ୍ତୁ।",

    no:
      "ଠିକ୍ ଅଛି। ଦୟାକରି ସୂଚନା ପୁଣି ଦିଅନ୍ତୁ।",
  },
};

/* =========================================================
   HELPERS
========================================================= */

function fill(
  text: string,
  values: Record<string, string>
): string {
  return text.replace(
    /\{(\w+)\}/g,
    (_, key) => values[key] ?? ""
  );
}

function detectLanguage(text: string): Lang {
  if (/[\u0B00-\u0B7F]/.test(text)) {
    return "or";
  }

  if (/[\u0900-\u097F]/.test(text)) {
    return "hi";
  }

  const lower = text.toLowerCase();

  if (/\b(odia|oriya)\b/.test(lower)) {
    return "or";
  }

  if (/\bhindi\b/.test(lower)) {
    return "hi";
  }

  return "en";
}

function isYes(text: string): boolean {
  const t = text.toLowerCase().trim();

  return (
    /\b(yes|yeah|yep|correct|right|sure|okay|ok)\b/.test(t) ||
    /हाँ|हां|हा/.test(text) ||
    /ହଁ|ଠିକ୍/.test(text)
  );
}

function isNo(text: string): boolean {
  const t = text.toLowerCase().trim();

  return (
    /\b(no|nope|wrong|nah)\b/.test(t) ||
    /नहीं|नहि/.test(text) ||
    /ନା|ନୁହେଁ/.test(text)
  );
}

/* =========================================================
   PIN EXTRACTION
========================================================= */

function pinFrom(text: string): string {
  const normalized = text
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/,/g, " ");

  // Direct digits
  const digits = normalized.replace(/\D/g, "");

  if (digits.length >= 6) {
    return digits.slice(0, 6);
  }

  const numberWords: Record<string, string> = {
    zero: "0",
    oh: "0",
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",

    // Hindi
    "शून्य": "0",
    "एक": "1",
    "दो": "2",
    "तीन": "3",
    "चार": "4",
    "पांच": "5",
    "पाँच": "5",
    "छह": "6",
    "छः": "6",
    "सात": "7",
    "आठ": "8",
    "नौ": "9",

    // Odia
    "ଶୂନ": "0",
    "ଶୂନ୍ୟ": "0",
    "ଏକ": "1",
    "ଦୁଇ": "2",
    "ତିନି": "3",
    "ଚାରି": "4",
    "ପାଞ୍ଚ": "5",
    "ଛଅ": "6",
    "ସାତ": "7",
    "ଆଠ": "8",
    "ନଅ": "9",
  };

  const converted = normalized
    .split(/\s+/)
    .map((word) => numberWords[word] ?? "")
    .join("");

  console.log("🔢 PIN conversion:", {
    original: text,
    digits,
    converted,
  });

  return converted.length >= 6
    ? converted.slice(0, 6)
    : "";
}

/* =========================================================
   COMPLAINT ID
========================================================= */

function complaintId(): string {
  return `PP-${Date.now()
    .toString(36)
    .toUpperCase()}`;
}

/* =========================================================
   SAVE PHONE COMPLAINT
========================================================= */

async function savePhoneComplaint(
  session: Session,
  id: string
) {
  const complaint = {
    id,
    name: session.name,
    pin: session.pin,
    village: session.village,
    issue: session.issue,

    voiceLanguage: session.lang,
    writingLanguages: [session.lang],

    photos: [],

    status: "Submitted",
    source: "phone",

    submittedAt: new Date().toISOString(),
  };

  const apiUrl =
    process.env.NEXT_APP_URL ||
    "http://localhost:3000";

  console.log(
    "📡 Saving complaint to:",
    `${apiUrl}/api/complaints`
  );

  const response = await fetch(
    `${apiUrl}/api/complaints`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(
        complaint
      ),
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Complaint API failed: ${response.status} ${errorText}`
    );
  }

  const result =
    await response.json();

  console.log(
    "======================================"
  );

  console.log(
    "✅ PHONE COMPLAINT SAVED"
  );

  console.log(
    "Complaint ID:",
    id
  );

  console.log(
    "API Result:",
    result
  );

  console.log(
    "======================================"
  );

  return result.complaint;
}

/* =========================================================
   TTS
========================================================= */

const ttsCache =
  new Map<string, Buffer>();

async function generateTTS(
  text: string,
  lang: Lang
): Promise<Buffer> {

  const voice =
    lang === "hi"
      ? "hi-IN-SwaraNeural"
      : lang === "or"
        ? "or-IN-SubhasiniNeural"
        : "en-IN-NeerjaNeural";

  const cacheKey =
    `${lang}:${text}`;

  const cached =
    ttsCache.get(cacheKey);

  if (cached) {
    console.log(
      "⚡ Using cached TTS"
    );

    return cached;
  }

  console.log(
    `🎙️ Edge TTS: ${voice}`
  );

  const engine =
    new EdgeTTS();

  await engine.synthesize(
    text,
    voice,
    {
      outputFormat:
        "audio-24khz-48kbitrate-mono-mp3" as any,
    }
  );

  const base64 =
    engine.toRaw();

  if (
    !base64 ||
    typeof base64 !== "string"
  ) {
    throw new Error(
      "Edge TTS returned no Base64 audio"
    );
  }

  const mp3 =
    Buffer.from(
      base64,
      "base64"
    );

  console.log(
    `🎵 Edge TTS MP3: ${mp3.length} bytes`
  );

  const pcm =
    await new Promise<Buffer>(
      (resolve, reject) => {

        const ffmpeg =
          spawn(
            ffmpegPath,
            [
              "-hide_banner",
              "-loglevel",
              "error",

              "-f",
              "mp3",

              "-i",
              "pipe:0",

              "-ar",
              "8000",

              "-ac",
              "1",

              "-f",
              "s16le",

              "pipe:1",
            ]
          );

        const chunks: Buffer[] = [];

        let stderr = "";

        ffmpeg.stdout.on(
          "data",
          (chunk: Buffer) => {
            chunks.push(
              Buffer.from(chunk)
            );
          }
        );

        ffmpeg.stderr.on(
          "data",
          (data: Buffer) => {
            stderr +=
              data.toString();
          }
        );

        ffmpeg.on(
          "error",
          reject
        );

        ffmpeg.on(
          "close",
          (code) => {

            if (code !== 0) {
              reject(
                new Error(
                  stderr ||
                  `FFmpeg exited with code ${code}`
                )
              );

              return;
            }

            resolve(
              Buffer.concat(
                chunks
              )
            );
          }
        );

        ffmpeg.stdin.write(mp3);
        ffmpeg.stdin.end();
      }
    );

  console.log(
    `✅ PCM ready: ${pcm.length} bytes`
  );

  ttsCache.set(
    cacheKey,
    pcm
  );

  return pcm;
}

/* =========================================================
   SEND AUDIO TO EXOTEL
========================================================= */

async function sendAudio(
  ws: WebSocket,
  session: Session,
  text: string
) {

  if (
    ws.readyState !==
    WebSocket.OPEN
  ) {
    return;
  }

  session.speaking = true;

  try {

    console.log(
      "🔊 AI:",
      text
    );

    const pcm =
      await generateTTS(
        text,
        session.lang
      );

    // 8000 Hz × 2 bytes × 200 ms
    const CHUNK_SIZE = 3200;

    let chunkNumber = 1;

    for (
      let offset = 0;
      offset < pcm.length;
      offset += CHUNK_SIZE
    ) {

      if (
        ws.readyState !==
        WebSocket.OPEN
      ) {
        break;
      }

      const chunk =
        pcm.subarray(
          offset,
          Math.min(
            offset + CHUNK_SIZE,
            pcm.length
          )
        );

      ws.send(
        JSON.stringify({
          event: "media",

          stream_sid:
            session.streamSid,

          media: {
            chunk:
              String(chunkNumber++),

            timestamp:
              String(
                Math.floor(
                  offset / 16
                )
              ),

            payload:
              chunk.toString(
                "base64"
              ),
          },
        })
      );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            200
          )
      );
    }

    console.log(
      `📤 Sent ${pcm.length} PCM bytes to Exotel`
    );

  } catch (error) {

    console.error(
      "❌ TTS error:",
      error
    );

  } finally {

    session.speaking = false;
  }
}

/* =========================================================
   SARVAM REALTIME STT
========================================================= */

function startStt(
  session: Session,
  exotelWs: WebSocket
) {

  if (
    session.sarvam &&
    session.sarvam.readyState ===
      WebSocket.OPEN
  ) {
    return;
  }

  const url =
    "wss://api.sarvam.ai/speech-to-text-realtime/ws" +
    "?language_code=auto" +
    "&model=saaras:v3-realtime" +
    "&stream_type=fast" +
    "&encoding=linear16" +
    "&sample_rate=8000" +
    "&endpointing=vad" +
    "&silence_duration_ms=500" +
    "&min_speech_duration_ms=250";

  console.log(
    "🔌 Connecting to Sarvam STT..."
  );

  const sarvam =
    new WebSocket(
      url,
      {
        headers: {
          "api-subscription-key":
            SARVAM_API_KEY,
        },
      }
    );

  session.sarvam =
    sarvam;

  /* ---------------------------------------------------------
     KEEPALIVE
  --------------------------------------------------------- */

  session.pingTimer =
    setInterval(
      () => {

        if (
          sarvam.readyState ===
          WebSocket.OPEN
        ) {

          try {
            sarvam.send(
              JSON.stringify({
                event: "ping",
              })
            );
          } catch {
            // Ignore ping errors.
          }
        }

      },
      15000
    );

  /* ---------------------------------------------------------
     OPEN
  --------------------------------------------------------- */

  sarvam.on(
    "open",
    () => {

      session.sarvamReady =
        true;

      console.log(
        "🎤 Sarvam STT connected — listening..."
      );

      /*
       * Send buffered audio.
       */

      for (
        const audio
        of session.audioQueue
      ) {

        if (
          sarvam.readyState ===
          WebSocket.OPEN
        ) {

          sarvam.send(
            JSON.stringify({
              event:
                "audio_input",

              audio:
                audio.toString(
                  "base64"
                ),
            })
          );
        }
      }

      session.audioQueue =
        [];

      console.log(
        "🎧 Sarvam audio buffer cleared"
      );
    }
  );

  /* ---------------------------------------------------------
     MESSAGES
  --------------------------------------------------------- */

  sarvam.on(
    "message",
    async (raw) => {

      try {

        const data =
          JSON.parse(
            raw.toString()
          );

        console.log(
          "📡 Sarvam event:",
          data.event
        );

        /* SESSION BEGIN */

        if (
          data.event ===
          "session.begin"
        ) {

          console.log(
            "🟢 Sarvam session started"
          );

          return;
        }

        /* SPEECH START */

        if (
          data.event ===
          "vad.speech_start"
        ) {

          console.log(
            "🎙️ User started speaking"
          );

          return;
        }

        /* SPEECH END */

        if (
          data.event ===
          "vad.speech_end"
        ) {

          console.log(
            "🔚 User stopped speaking"
          );

          return;
        }

        /* PARTIAL */

        if (
          data.event ===
          "transcript.partial"
        ) {

          if (data.text) {

            console.log(
              "📝 Partial:",
              data.text
            );
          }

          return;
        }

        /* FINAL */

        if (
          data.event ===
          "transcript.final"
        ) {

          const text =
            String(
              data.text || ""
            ).trim();

          if (!text) {
            return;
          }

          console.log(
            "======================================"
          );

          console.log(
            "📝 FINAL TRANSCRIPT:",
            text
          );

          console.log(
            "CURRENT STATE:",
            session.state
          );

          console.log(
            "======================================"
          );

          if (
            session.processingTranscript
          ) {

            console.log(
              "⚠️ Transcript already being processed"
            );

            return;
          }

          session.processingTranscript =
            true;

          try {

            await handleConversation(
              session,
              exotelWs,
              text
            );

          } catch (error) {

            console.error(
              "❌ Conversation error:",
              error
            );

          } finally {

            session.processingTranscript =
              false;
          }

          return;
        }

        /* SESSION END */

        if (
          data.event ===
          "session.end"
        ) {

          console.log(
            "🔴 Sarvam session ended"
          );

          return;
        }

        /* ERROR */

        if (
          data.event ===
          "error"
        ) {

          console.error(
            "❌ SARVAM ERROR:",
            JSON.stringify(
              data,
              null,
              2
            )
          );

          return;
        }

      } catch (error) {

        console.error(
          "❌ Sarvam message error:",
          error
        );
      }
    }
  );

  /* ---------------------------------------------------------
     ERROR
  --------------------------------------------------------- */

  sarvam.on(
    "error",
    (error) => {

      session.sarvamReady =
        false;

      console.error(
        "❌ Sarvam WebSocket error:",
        error
      );
    }
  );

  /* ---------------------------------------------------------
     CLOSE
  --------------------------------------------------------- */

  sarvam.on(
    "close",
    (
      code,
      reason
    ) => {

      session.sarvamReady =
        false;

      if (session.pingTimer) {
        clearInterval(
          session.pingTimer
        );

        session.pingTimer =
          undefined;
      }

      console.log(
        "🔌 Sarvam disconnected:",
        code,
        reason.toString()
      );
    }
  );
}

/* =========================================================
   STOP STT
========================================================= */

function stopStt(
  session: Session
) {

  try {

    if (session.pingTimer) {

      clearInterval(
        session.pingTimer
      );

      session.pingTimer =
        undefined;
    }

    if (
      session.sarvam &&
      session.sarvam.readyState ===
        WebSocket.OPEN
    ) {

      session.sarvam.send(
        JSON.stringify({
          event: "end",
        })
      );

      session.sarvam.close();
    }

  } catch {
    // Ignore close errors.
  }

  session.sarvam =
    undefined;

  session.sarvamReady =
    false;

  session.audioQueue =
    [];
}

/* =========================================================
   CONVERSATION
========================================================= */

async function handleConversation(
  session: Session,
  ws: WebSocket,
  text: string
) {

  if (
    session.state ===
    "done"
  ) {
    return;
  }

  /* ---------------------------------------------------------
     LANGUAGE
  --------------------------------------------------------- */

  if (
    session.state ===
    "language"
  ) {

    const lang =
      detectLanguage(text);

    session.lang =
      lang;

    session.state =
      "name";

    console.log(
      "🌐 Language selected:",
      lang
    );

    await sendAudio(
      ws,
      session,
      TEXT[lang].welcome
    );

    return;
  }

  /* ---------------------------------------------------------
     NAME
  --------------------------------------------------------- */

  if (
    session.state ===
    "name"
  ) {

    session.name =
      text.trim();

    console.log(
      "👤 Name:",
      session.name
    );

    if (
      !session.name
    ) {

      await sendAudio(
        ws,
        session,
        TEXT[
          session.lang
        ].retry
      );

      return;
    }

    session.state =
      "pin";

    await sendAudio(
      ws,
      session,
      TEXT[
        session.lang
      ].pin
    );

    return;
  }

  /* ---------------------------------------------------------
     PIN
  --------------------------------------------------------- */

  if (
    session.state ===
    "pin"
  ) {

    console.log(
      "🔢 PIN TURN RECEIVED:",
      text
    );

    const pin =
      pinFrom(text);

    console.log(
      "🔢 EXTRACTED PIN:",
      pin
    );

    if (
      pin.length !== 6
    ) {

      console.log(
        "❌ PIN INVALID"
      );

      await sendAudio(
        ws,
        session,
        TEXT[
          session.lang
        ].retry
      );

      return;
    }

    session.pin =
      pin;

    console.log(
      "✅ PIN ACCEPTED:",
      session.pin
    );

    session.state =
      "village";

    await sendAudio(
      ws,
      session,
      TEXT[
        session.lang
      ].village
    );

    return;
  }

  /* ---------------------------------------------------------
     VILLAGE
  --------------------------------------------------------- */

  if (
    session.state ===
    "village"
  ) {

    session.village =
      text.trim();

    console.log(
      "📍 Village:",
      session.village
    );

    if (
      !session.village
    ) {

      await sendAudio(
        ws,
        session,
        TEXT[
          session.lang
        ].retry
      );

      return;
    }

    session.state =
      "issue";

    await sendAudio(
      ws,
      session,
      TEXT[
        session.lang
      ].issue
    );

    return;
  }

  /* ---------------------------------------------------------
     ISSUE
  --------------------------------------------------------- */

  if (
    session.state ===
    "issue"
  ) {

    session.issue =
      text.trim();

    console.log(
      "📝 Issue:",
      session.issue
    );

    if (
      !session.issue
    ) {

      await sendAudio(
        ws,
        session,
        TEXT[
          session.lang
        ].retry
      );

      return;
    }

    session.state =
      "confirm";

    const confirmation =
      fill(
        TEXT[
          session.lang
        ].confirm,
        {
          name:
            session.name,

          pin:
            session.pin,

          village:
            session.village,

          issue:
            session.issue,
        }
      );

    await sendAudio(
      ws,
      session,
      confirmation
    );

    return;
  }

  /* ---------------------------------------------------------
     CONFIRM
  --------------------------------------------------------- */

  if (
    session.state ===
    "confirm"
  ) {

    console.log(
      "❓ CONFIRMATION:",
      text
    );

    /* YES */

    if (
      isYes(text)
    ) {

      console.log(
        "✅ USER CONFIRMED"
      );

      const id =
        complaintId();

      try {

        await savePhoneComplaint(
          session,
          id
        );

      } catch (error) {

        console.error(
          "❌ PHONE COMPLAINT SAVE FAILED:",
          error
        );
      }

      session.state =
        "done";

      console.log("");
      console.log(
        "======================================"
      );

      console.log(
        "📋 PARAKRAM PHONE COMPLAINT"
      );

      console.log(
        "======================================"
      );

      console.log(
        "Complaint ID:",
        id
      );

      console.log(
        "Name:",
        session.name
      );

      console.log(
        "PIN:",
        session.pin
      );

      console.log(
        "Village:",
        session.village
      );

      console.log(
        "Issue:",
        session.issue
      );

      console.log(
        "Language:",
        session.lang
      );

      console.log(
        "======================================"
      );

      console.log("");

      await sendAudio(
        ws,
        session,
        fill(
          TEXT[
            session.lang
          ].done,
          {
            id,
          }
        )
      );

      setTimeout(
        () => {

          if (
            ws.readyState ===
            WebSocket.OPEN
          ) {

            ws.close();
          }

        },
        3500
      );

      return;
    }

    /* NO */

    if (
      isNo(text)
    ) {

      console.log(
        "❌ USER REJECTED CONFIRMATION"
      );

      session.state =
        "name";

      session.name =
        "";

      session.pin =
        "";

      session.village =
        "";

      session.issue =
        "";

      await sendAudio(
        ws,
        session,
        TEXT[
          session.lang
        ].welcome
      );

      return;
    }

    /* UNKNOWN */

    await sendAudio(
      ws,
      session,
      TEXT[
        session.lang
      ].confirm
        .replace(
          "{name}",
          session.name
        )
        .replace(
          "{pin}",
          session.pin
        )
        .replace(
          "{village}",
          session.village
        )
        .replace(
          "{issue}",
          session.issue
        )
    );
  }
}

/* =========================================================
   HTTP SERVER
========================================================= */

const server =
  http.createServer(
    (req, res) => {

      if (
        req.url ===
        "/health"
      ) {

        res.writeHead(
          200,
          {
            "Content-Type":
              "application/json",
          }
        );

        res.end(
          JSON.stringify({
            service:
              "PARAKRAM Voice AI",

            status:
              "running",

            websocket:
              "/voice",
          })
        );

        return;
      }

      res.writeHead(
        200,
        {
          "Content-Type":
            "text/plain",
        }
      );

      res.end(
        "PARAKRAM Voice AI is running."
      );
    }
  );

/* =========================================================
   EXOTEL WEBSOCKET
========================================================= */

const wss =
  new WebSocketServer({
    server,
    path: "/voice",
  });

wss.on(
  "connection",
  (ws) => {

    console.log("");
    console.log(
      "📞 PARAKRAM VOICE CALL CONNECTED"
    );

    const session: Session = {

      lang: "en",

      state: "language",

      name: "",

      pin: "",

      village: "",

      issue: "",

      speaking: false,

      sarvamReady: false,

      audioQueue: [],

      processingTranscript: false,
    };

    sessions.set(
      ws,
      session
    );

    /* -------------------------------------------------------
       EXOTEL MESSAGES
    ------------------------------------------------------- */

    ws.on(
      "message",
      async (raw) => {

        try {

          const message =
            JSON.parse(
              raw.toString()
            );

          /* START */

          if (
            message.event ===
            "start"
          ) {

            const start =
              message.start ||
              {};

            session.streamSid =
              message.stream_sid ||
              start.stream_sid;

            session.callSid =
              start.call_sid;

            console.log(
              "✅ Exotel connected"
            );

            console.log(
              "📦 EXOTEL START:",
              JSON.stringify(
                message,
                null,
                2
              )
            );

            console.log(
              "▶️ Call stream started:",
              session.streamSid
            );

            /*
             * Speak first.
             */

            await sendAudio(
              ws,
              session,
              TEXT.en.language
            );

            /*
             * Start STT after
             * initial prompt.
             */

            startStt(
              session,
              ws
            );

            return;
          }

          /* MEDIA */

          if (
            message.event ===
            "media"
          ) {

            const payload =
              message.media?.payload;

            if (!payload) {
              return;
            }

            const audio =
              Buffer.from(
                payload,
                "base64"
              );

            /*
             * Send caller audio
             * to Sarvam.
             */

            if (
              session.sarvamReady &&
              session.sarvam &&
              session.sarvam.readyState ===
                WebSocket.OPEN
            ) {

              session.sarvam.send(
                JSON.stringify({
                  event:
                    "audio_input",

                  audio:
                    payload,
                })
              );

            } else {

              /*
               * Buffer audio while
               * Sarvam connects.
               */

              if (
                session.audioQueue
                  .length < 100
              ) {

                session.audioQueue.push(
                  audio
                );
              }
            }

            return;
          }

          /* DTMF */

          if (
            message.event ===
            "dtmf"
          ) {

            console.log(
              "☎️ DTMF:",
              message?.dtmf?.digit
            );

            return;
          }

          /* STOP */

          if (
            message.event ===
            "stop"
          ) {

            stopStt(
              session
            );

            console.log(
              "🛑 Call stopped:",
              message?.stop?.reason
            );

            sessions.delete(
              ws
            );

            return;
          }

        } catch (error) {

          console.error(
            "❌ Exotel message error:",
            error
          );
        }
      }
    );

    /* -------------------------------------------------------
       CLOSE
    ------------------------------------------------------- */

    ws.on(
      "close",
      () => {

        console.log(
          "📴 Voice WebSocket disconnected"
        );

        stopStt(
          session
        );

        sessions.delete(
          ws
        );
      }
    );

    /* -------------------------------------------------------
       ERROR
    ------------------------------------------------------- */

    ws.on(
      "error",
      (error) => {

        console.error(
          "❌ Exotel WebSocket error:",
          error
        );
      }
    );
  }
);

/* =========================================================
   START SERVER
========================================================= */

server.listen(
  PORT,
  () => {

    console.log("");

    console.log(
      "======================================"
    );

    console.log(
      "🚀 PARAKRAM VOICE AI"
    );

    console.log(
      "======================================"
    );

    console.log(
      `🌐 HTTP: http://localhost:${PORT}`
    );

    console.log(
      `🔌 WS: ws://localhost:${PORT}/voice`
    );

    console.log(
      "🎤 STT: Sarvam Realtime"
    );

    console.log(
      "🔊 TTS: Edge TTS"
    );

    console.log(
      "🎵 Audio: FFmpeg → 8kHz PCM"
    );

    console.log(
      "💾 Complaints: Next.js /api/complaints"
    );

    console.log(
      "======================================"
    );

    console.log("");
  }
);