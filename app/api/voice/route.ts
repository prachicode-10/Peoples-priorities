import { NextRequest, NextResponse } from "next/server";
import { classifyIssue } from "@/lib/issueClassifier";

type Language = "odia" | "hindi" | "english";

type VoiceSession = {
  language?: Language;
  name?: string;
  pinCode?: string;
  locality?: string;
  issue?: string;
  category?: string;
  confirmed?: boolean;
};

const sessions = new Map<string, VoiceSession>();

function detectLanguage(input: string): Language | null {
  const text = input.toLowerCase().trim();

  if (
    text.includes("odia") ||
    text.includes("oriya") ||
    /[\u0B00-\u0B7F]/.test(input)
  ) {
    return "odia";
  }

  if (
    text.includes("hindi") ||
    /[\u0900-\u097F]/.test(input)
  ) {
    return "hindi";
  }

  if (text.includes("english")) {
    return "english";
  }

  return null;
}

function isYes(input: string): boolean {
  const text = input.toLowerCase().trim();

  return (
    text === "yes" ||
    text === "yeah" ||
    text === "yep" ||
    text === "correct" ||
    text === "right" ||
    text === "haan" ||
    text === "ha" ||
    text === "हाँ" ||
    text === "ହଁ" ||
    text.includes("yes") ||
    text.includes("correct") ||
    text.includes("right")
  );
}

function extractDigits(input: string): string {
  return input.replace(/\D/g, "");
}

function extractName(input: string): string {
  let name = input.trim();

  name = name.replace(
    /^(my name is|my name's|i am|i'm|this is|name is)\s+/i,
    ""
  );

  name = name.replace(
    /^(मेरा नाम है|मेरा नाम|मैं)\s*/i,
    ""
  );

  name = name.replace(
    /^(ମୋ ନାମ ହେଉଛି|ମୋ ନାମ|ମୁଁ)\s*/i,
    ""
  );

  return name.trim();
}

function generateId(): string {
  return `PP-${Date.now()
    .toString(36)
    .toUpperCase()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
}

function getPrompt(session: VoiceSession) {
  const language = session.language;

  if (!language) {
    return {
      stage: "language",
      response:
        "Welcome to People's Priorities. Please select your language. Say English, Hindi, or Odia.",
    };
  }

  if (!session.name) {
    if (language === "odia") {
      return {
        stage: "name",
        response: "ଦୟାକରି ଆପଣଙ୍କ ନାମ କୁହନ୍ତୁ।",
      };
    }

    if (language === "hindi") {
      return {
        stage: "name",
        response: "कृपया अपना नाम बताइए।",
      };
    }

    return {
      stage: "name",
      response: "Please tell me your name.",
    };
  }

  if (!session.pinCode) {
    if (language === "odia") {
      return {
        stage: "pin",
        response: "ଦୟାକରି ଆପଣଙ୍କ ୬ ଅଙ୍କର ପିନ୍ କୋଡ୍ କୁହନ୍ତୁ।",
      };
    }

    if (language === "hindi") {
      return {
        stage: "pin",
        response: "कृपया अपना 6 अंकों का पिन कोड बताइए।",
      };
    }

    return {
      stage: "pin",
      response: "Please tell me your six digit PIN code.",
    };
  }

  if (!session.locality) {
    if (language === "odia") {
      return {
        stage: "locality",
        response:
          "ଦୟାକରି ଆପଣଙ୍କ ଗାଁ କିମ୍ବା ଅଞ୍ଚଳର ନାମ କୁହନ୍ତୁ।",
      };
    }

    if (language === "hindi") {
      return {
        stage: "locality",
        response:
          "कृपया अपने गांव या इलाके का नाम बताइए।",
      };
    }

    return {
      stage: "locality",
      response: "Please tell me your village or locality.",
    };
  }

  if (!session.issue) {
    if (language === "odia") {
      return {
        stage: "issue",
        response:
          "ଦୟାକରି ଆପଣଙ୍କ ସମସ୍ୟା ବିଷୟରେ କୁହନ୍ତୁ।",
      };
    }

    if (language === "hindi") {
      return {
        stage: "issue",
        response:
          "କୃପୟା ଆପଣଙ୍କ ସମସ୍ୟା ବିଷୟରେ କୁହନ୍ତୁ।",
      };
    }

    return {
      stage: "issue",
      response:
        "Please describe the problem you are facing.",
    };
  }

  if (!session.confirmed) {
    const category =
      session.category ||
      classifyIssue(session.issue).category;

    if (language === "odia") {
      return {
        stage: "confirmation",
        response: `ମୁଁ ବୁଝିଛି ଯେ ଆପଣଙ୍କ ସମସ୍ୟା "${session.issue}" ଏବଂ ଏହା ${category} ସହିତ ସମ୍ପର୍କିତ। ଏହା ଠିକ୍ ତ?`,
      };
    }

    if (language === "hindi") {
      return {
        stage: "confirmation",
        response: `मैंने समझा कि आपकी समस्या "${session.issue}" है और यह ${category} से संबंधित है। क्या यह सही है?`,
      };
    }

    return {
      stage: "confirmation",
      response: `I understand that your issue is "${session.issue}" and it is related to ${category}. Is that correct?`,
    };
  }

  return {
    stage: "complete",
    response: "Your complaint is ready to be registered.",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const input = String(body.input || "").trim();

    let sessionId = String(body.sessionId || "");

    if (!input) {
      return NextResponse.json(
        {
          error: "Input is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!sessionId) {
      sessionId = generateId();
      sessions.set(sessionId, {});
    }

    const session = sessions.get(sessionId) || {};

    // ============================================================
    // 1. LANGUAGE
    // ============================================================

    if (!session.language) {
      const detectedLanguage = detectLanguage(input);

      if (!detectedLanguage) {
        return NextResponse.json({
          sessionId,
          stage: "language",
          response:
            "Please say English, Hindi, or Odia.",
        });
      }

      session.language = detectedLanguage;

      sessions.set(sessionId, session);

      return NextResponse.json({
        sessionId,
        ...getPrompt(session),
      });
    }

    // ============================================================
    // 2. NAME
    // ============================================================

    if (!session.name) {
      const name = extractName(input);

      if (!name) {
        return NextResponse.json({
          sessionId,
          stage: "name",
          response:
            session.language === "odia"
              ? "ଦୟାକରି ଆପଣଙ୍କ ନାମ କୁହନ୍ତୁ।"
              : session.language === "hindi"
              ? "कृपया अपना नाम बताइए।"
              : "Please tell me your name.",
        });
      }

      session.name = name;

      sessions.set(sessionId, session);

      return NextResponse.json({
        sessionId,
        ...getPrompt(session),
      });
    }

    // ============================================================
    // 3. PIN
    // ============================================================

    if (!session.pinCode) {
      const digits = extractDigits(input);

      if (digits.length !== 6) {
        const response =
          session.language === "odia"
            ? "ଦୟାକରି ୬ ଅଙ୍କର ପିନ୍ କୋଡ୍ କୁହନ୍ତୁ।"
            : session.language === "hindi"
            ? "कृपया 6 अंकों का पिन कोड बताइए।"
            : "Please provide a valid six digit PIN code.";

        return NextResponse.json({
          sessionId,
          stage: "pin",
          response,
        });
      }

      session.pinCode = digits;

      sessions.set(sessionId, session);

      return NextResponse.json({
        sessionId,
        ...getPrompt(session),
      });
    }

    // ============================================================
    // 4. LOCALITY
    // ============================================================

    if (!session.locality) {
      session.locality = input;

      sessions.set(sessionId, session);

      return NextResponse.json({
        sessionId,
        ...getPrompt(session),
      });
    }

    // ============================================================
    // 5. ISSUE
    // ============================================================

    if (!session.issue) {
      session.issue = input;

      const classification = classifyIssue(input);

      session.category = classification.category;

      sessions.set(sessionId, session);

      return NextResponse.json({
        sessionId,
        stage: "confirmation",
        category: classification.category,
        response: getPrompt(session).response,
      });
    }

    // ============================================================
    // 6. CONFIRMATION
    // ============================================================

    if (!session.confirmed) {
      if (!isYes(input)) {
        session.issue = undefined;
        session.category = undefined;

        sessions.set(sessionId, session);

        const response =
          session.language === "odia"
            ? "ଠିକ୍ ଅଛି। ଦୟାକରି ସମସ୍ୟାଟି ପୁଣିଥରେ କୁହନ୍ତୁ।"
            : session.language === "hindi"
            ? "ठीक है। कृपया अपनी समस्या फिर से बताइए।"
            : "Okay. Please describe your problem again.";

        return NextResponse.json({
          sessionId,
          stage: "issue",
          response,
        });
      }

      session.confirmed = true;

      sessions.set(sessionId, session);

      const submissionId = generateId();

      const complaint = {
        submissionId,
        source: "phone",
        language: session.language,
        name: session.name,
        pinCode: session.pinCode,
        locality: session.locality,
        issue: session.issue,
        category: session.category,
        status: "Submitted",
        createdAt: new Date().toISOString(),
      };

      sessions.delete(sessionId);

      const response =
        session.language === "odia"
          ? `ଧନ୍ୟବାଦ ${session.name}। ଆପଣଙ୍କ ଅଭିଯୋଗ ${submissionId} ଭାବରେ ପଞ୍ଜୀକୃତ ହୋଇଛି।`
          : session.language === "hindi"
          ? `धन्यवाद ${session.name}। आपकी शिकायत ${submissionId} के रूप में दर्ज कर ली गई है।`
          : `Thank you ${session.name}. Your complaint has been registered with ID ${submissionId}.`;

      return NextResponse.json({
        sessionId,
        stage: "complete",
        response,
        complaint,
      });
    }

    // ============================================================
    // FALLBACK
    // ============================================================

    return NextResponse.json({
      sessionId,
      ...getPrompt(session),
    });
  } catch (error) {
    console.error("Voice API error:", error);

    return NextResponse.json(
      {
        error: "Voice conversation failed.",
      },
      {
        status: 500,
      }
    );
  }
}