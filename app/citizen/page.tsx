"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  lookupIndiaPincode,
  type VerifiedLocation,
} from "@/lib/indiaLocations";

type Language =
  | "en-IN"
  | "hi-IN"
  | "or-IN";

const LANGUAGES = {
  "en-IN": {
    label: "English",
    native: "English",
    placeholder:
      "Type your issue here...",
  },

  "hi-IN": {
    label: "Hindi",
    native: "हिन्दी",
    placeholder:
      "अपनी समस्या यहाँ लिखें...",
  },

  "or-IN": {
    label: "Odia",
    native: "ଓଡ଼ିଆ",
    placeholder:
      "ଆପଣଙ୍କ ସମସ୍ୟା ଏଠାରେ ଲେଖନ୍ତୁ...",
  },
};

type FormData = {
  name: string;
  village: string;
  location: string;
  pincode: string;
  issue: string;
};

type BrowserLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
};

export default function CitizenPage() {
  /*
   * =========================================================
   * LANGUAGE
   * =========================================================
   */

  const [
    voiceLanguage,
    setVoiceLanguage,
  ] = useState<Language>("hi-IN");

  const [
    writingLanguages,
    setWritingLanguages,
  ] = useState({
    name: "en-IN" as Language,
    village: "hi-IN" as Language,
    location: "en-IN" as Language,
    issue: "hi-IN" as Language,
  });

  /*
   * =========================================================
   * FORM
   * =========================================================
   */

  const [form, setForm] =
    useState<FormData>({
      name: "",
      village: "",
      location: "",
      pincode: "",
      issue: "",
    });

  const [errors, setErrors] =
    useState({
      name: "",
      village: "",
      location: "",
      pincode: "",
      issue: "",
    });

  /*
   * =========================================================
   * VERIFIED INDIA LOCATION
   * =========================================================
   */

  const [
    verifiedLocation,
    setVerifiedLocation,
  ] =
    useState<VerifiedLocation | null>(
      null
    );

  const [
    pincodeChecking,
    setPincodeChecking,
  ] = useState(false);

  const [
    pincodeMessage,
    setPincodeMessage,
  ] = useState("");

  const [
    localityVerified,
    setLocalityVerified,
  ] = useState(false);

  /* BROWSER GPS LOCATION */
  const [browserLocation, setBrowserLocation] =
    useState<BrowserLocation | null>(null);

  const [locationCaptureStatus, setLocationCaptureStatus] =
    useState<"idle" | "requesting" | "captured" | "denied">("idle");

  const [locationCaptureMessage, setLocationCaptureMessage] =
    useState("");

  /*
   * =========================================================
   * PHOTOS
   * =========================================================
   */

  const [photos, setPhotos] =
    useState<File[]>([]);

  const [
    photoPreviews,
    setPhotoPreviews,
  ] = useState<string[]>([]);

  /*
   * =========================================================
   * SUBMISSION
   * =========================================================
   */

  const [
    submitted,
    setSubmitted,
  ] = useState(false);

  const [
    submissionId,
    setSubmissionId,
  ] = useState("");

  /*
   * =========================================================
   * SPEECH
   * =========================================================
   */

  const [
    isListening,
    setIsListening,
  ] = useState(false);

  const [
    liveTranscript,
    setLiveTranscript,
  ] = useState("");

  const [
    speechSupported,
    setSpeechSupported,
  ] = useState(true);

  const [
    speechError,
    setSpeechError,
  ] = useState("");

  const recognitionRef =
    useRef<any>(null);

  const activeFieldRef =
    useRef<"issue" | null>(null);

  const finalTranscriptRef =
    useRef("");

  const manuallyStoppedRef =
    useRef(false);

  /*
   * =========================================================
   * SPEECH RECOGNITION
   * =========================================================
   */

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any)
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang =
      voiceLanguage;

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechError("");
    };

    recognition.onresult = (
      event: any
    ) => {
      let interimTranscript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const transcript =
          event.results[i][0]
            .transcript;

        if (
          event.results[i].isFinal
        ) {
          finalTranscriptRef.current +=
            transcript + " ";
        } else {
          interimTranscript +=
            transcript;
        }
      }

      const completeText =
        finalTranscriptRef.current +
        interimTranscript;

      setLiveTranscript(
        completeText
      );

      if (
        activeFieldRef.current ===
        "issue"
      ) {
        setForm((previous) => ({
          ...previous,
          issue: completeText,
        }));

        setErrors((previous) => ({
          ...previous,
          issue: "",
        }));
      }
    };

    recognition.onerror = (
      event: any
    ) => {
      console.error(
        "Speech recognition error:",
        event.error
      );

      if (
        event.error ===
        "not-allowed"
      ) {
        setSpeechError(
          "Microphone permission was denied."
        );
      } else if (
        event.error ===
        "no-speech"
      ) {
        setSpeechError(
          "No speech detected. Please try again."
        );
      } else if (
        event.error === "network"
      ) {
        setSpeechError(
          "Speech recognition needs internet."
        );
      } else {
        setSpeechError(
          "Could not recognize speech. Please try again."
        );
      }

      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);

      if (
        !manuallyStoppedRef.current &&
        activeFieldRef.current ===
          "issue"
      ) {
        try {
          recognition.start();
        } catch {}
      }
    };

    recognitionRef.current =
      recognition;

    return () => {
      manuallyStoppedRef.current =
        true;

      try {
        recognition.stop();
      } catch {}
    };
  }, [voiceLanguage]);

  /*
   * =========================================================
   * START SPEAKING
   * =========================================================
   */

  const startSpeaking = () => {
    if (!speechSupported) {
      setSpeechError(
        "Please use Google Chrome or Microsoft Edge."
      );

      return;
    }

    const recognition =
      recognitionRef.current;

    if (!recognition) return;

    manuallyStoppedRef.current =
      false;

    activeFieldRef.current =
      "issue";

    recognition.lang =
      voiceLanguage;

    finalTranscriptRef.current =
      form.issue
        ? form.issue.trim() + " "
        : "";

    setLiveTranscript(
      finalTranscriptRef.current
    );

    setSpeechError("");

    try {
      recognition.start();
    } catch {}
  };

  /*
   * =========================================================
   * STOP SPEAKING
   * =========================================================
   */

  const stopSpeaking = () => {
    manuallyStoppedRef.current =
      true;

    activeFieldRef.current =
      null;

    try {
      recognitionRef.current?.stop();
    } catch {}

    setIsListening(false);

    setForm((previous) => ({
      ...previous,
      issue:
        finalTranscriptRef.current.trim(),
    }));
  };

  /*
   * =========================================================
   * NORMAL INPUT
   * =========================================================
   */

  const handleInputChange = (
    field: keyof FormData,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [field]: "",
    }));

    /*
     * Changing locality means it must
     * be verified again.
     */

    if (field === "village") {
      setLocalityVerified(false);
    }
  };

  /*
   * =========================================================
   * PIN CODE INPUT
   * =========================================================
   */

  const handlePincodeChange = (
    value: string
  ) => {
    const cleaned = value
      .replace(/\D/g, "")
      .slice(0, 6);

    setForm((previous) => ({
      ...previous,
      pincode: cleaned,
      village: "",
    }));

    setVerifiedLocation(null);
    setLocalityVerified(false);
    setPincodeMessage("");

    setErrors((previous) => ({
      ...previous,
      pincode: "",
      village: "",
    }));

    if (cleaned.length < 6) {
      setPincodeChecking(false);
    }
  };

  /*
   * =========================================================
   * PIN CODE VERIFICATION
   * =========================================================
   */

  useEffect(() => {
    let cancelled = false;

    const verifyPincode =
      async () => {
        const pincode =
          form.pincode;

        if (pincode.length !== 6) {
          setVerifiedLocation(null);
          setLocalityVerified(
            false
          );
          setPincodeChecking(false);

          return;
        }

        setPincodeChecking(true);
        setVerifiedLocation(null);
        setLocalityVerified(false);

        setPincodeMessage(
          "Checking Indian PIN code..."
        );

        const result =
          await lookupIndiaPincode(
            pincode
          );

        if (cancelled) return;

        setPincodeChecking(false);

        if (result) {
          setVerifiedLocation(
            result
          );

          setPincodeMessage(
            "✓ PIN code verified successfully."
          );

          setErrors((previous) => ({
            ...previous,
            pincode: "",
          }));
        } else {
          setVerifiedLocation(null);
          setLocalityVerified(
            false
          );

          setPincodeMessage(
            "This PIN code could not be verified. Please check it."
          );

          setErrors((previous) => ({
            ...previous,
            pincode:
              "Please enter a valid Indian PIN code.",
          }));
        }
      };

    verifyPincode();

    return () => {
      cancelled = true;
    };
  }, [form.pincode]);

  /*
   * =========================================================
   * VERIFY LOCALITY
   * =========================================================
   */

  const verifyLocality = () => {
    if (!verifiedLocation) {
      setErrors((previous) => ({
        ...previous,
        village:
          "Please verify your Indian PIN code first.",
      }));

      return false;
    }

    const entered =
      form.village
        .trim()
        .toLowerCase();

    if (!entered) {
      setErrors((previous) => ({
        ...previous,
        village:
          "Village / locality is required.",
      }));

      return false;
    }

    const matches =
      verifiedLocation.areas.some(
        (area) =>
          area.toLowerCase() ===
          entered
      );

    if (!matches) {
      setLocalityVerified(false);

      setErrors((previous) => ({
        ...previous,
        village:
          "Please select a locality associated with this PIN code.",
      }));

      return false;
    }

    setLocalityVerified(true);

    setErrors((previous) => ({
      ...previous,
      village: "",
    }));

    return true;
  };

  /*
   * =========================================================
   * LANGUAGE CHANGE
   * =========================================================
   */

  const changeWritingLanguage = (
    field: keyof typeof writingLanguages,
    language: Language
  ) => {
    setWritingLanguages(
      (previous) => ({
        ...previous,
        [field]: language,
      })
    );
  };

  /*
   * =========================================================
   * PHOTO SELECT
   * =========================================================
   */

  const handlePhotoChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(
      event.target.files || []
    );

    const imageFiles =
      files.filter((file) =>
        file.type.startsWith(
          "image/"
        )
      );

    setPhotos(imageFiles);

    const previews =
      imageFiles.map((file) =>
        URL.createObjectURL(file)
      );

    setPhotoPreviews(previews);
  };

  /*
   * =========================================================
   * REMOVE PHOTO
   * =========================================================
   */

  const removePhoto = (
    index: number
  ) => {
    setPhotos((previous) =>
      previous.filter(
        (_, i) => i !== index
      )
    );

    setPhotoPreviews(
      (previous) =>
        previous.filter(
          (_, i) => i !== index
        )
    );
  };

  /*
   * =========================================================
   * VALIDATION
   * =========================================================
   */

  const validateForm = () => {
    const newErrors = {
      name: "",
      village: "",
      location: "",
      pincode: "",
      issue: "",
    };

    /*
     * NAME
     */

    if (!form.name.trim()) {
      newErrors.name =
        "Name is required.";
    } else if (
      form.name.trim().length < 2
    ) {
      newErrors.name =
        "Please enter a valid name.";
    }

    /*
     * VILLAGE / LOCALITY
     */

    if (!form.village.trim()) {
      newErrors.village =
        "Village / locality is required.";
    } else if (
      !verifiedLocation
    ) {
      newErrors.village =
        "Please verify your PIN code first.";
    } else if (
      !verifiedLocation.areas.some(
        (area) =>
          area.toLowerCase() ===
          form.village
            .trim()
            .toLowerCase()
      )
    ) {
      newErrors.village =
        "Please select a locality associated with this PIN code.";
    }

    /*
     * LOCATION / LANDMARK
     */

    if (!form.location.trim()) {
      newErrors.location =
        "Location / landmark is required.";
    } else if (
      form.location.trim().length < 2
    ) {
      newErrors.location =
        "Please enter a valid location or landmark.";
    }

    /*
     * PIN CODE
     */

    if (!form.pincode.trim()) {
      newErrors.pincode =
        "PIN code is required.";
    } else if (
      !/^[1-9][0-9]{5}$/.test(
        form.pincode
      )
    ) {
      newErrors.pincode =
        "Enter a valid 6-digit Indian PIN code.";
    } else if (
      !verifiedLocation
    ) {
      newErrors.pincode =
        "Please wait for the PIN code to be verified.";
    }

    /*
     * ISSUE
     */

    if (!form.issue.trim()) {
      newErrors.issue =
        "Please describe the issue.";
    } else if (
      form.issue.trim().length < 10
    ) {
      newErrors.issue =
        "Please describe the issue in more detail.";
    }

    setErrors(newErrors);

    return !Object.values(
      newErrors
    ).some(
      (error) => error !== ""
    );
  };

  /*
   * =========================================================
   * SUBMIT
   * =========================================================
   */

  const captureBrowserLocation = (): Promise<BrowserLocation | null> => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationCaptureStatus("denied");
      setLocationCaptureMessage(
        "This browser does not provide GPS location. Your verified PIN/locality will still be saved."
      );
      return Promise.resolve(null);
    }

    setLocationCaptureStatus("requesting");
    setLocationCaptureMessage("Requesting your current location...");

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const captured: BrowserLocation = {
            latitude: Number(position.coords.latitude.toFixed(7)),
            longitude: Number(position.coords.longitude.toFixed(7)),
            accuracy: Math.round(position.coords.accuracy),
            capturedAt: new Date().toISOString(),
          };

          setBrowserLocation(captured);
          setLocationCaptureStatus("captured");
          setLocationCaptureMessage(
            `Location captured (±${captured.accuracy} m).`
          );
          resolve(captured);
        },
        (error) => {
          console.warn("Could not capture browser location:", error);
          setLocationCaptureStatus("denied");

          if (error.code === error.PERMISSION_DENIED) {
            setLocationCaptureMessage(
              "Location permission was denied. Your verified PIN/locality will still be saved."
            );
          } else if (error.code === error.TIMEOUT) {
            setLocationCaptureMessage(
              "Location request timed out. Your verified PIN/locality will still be saved."
            );
          } else {
            setLocationCaptureMessage(
              "Could not capture GPS location. Your verified PIN/locality will still be saved."
            );
          }

          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!verifiedLocation) {
      setErrors((previous) => ({
        ...previous,
        pincode:
          "Please enter and verify a valid Indian PIN code.",
      }));

      return;
    }

    if (!localityVerified) {
      const valid =
        verifyLocality();

      if (!valid) {
        return;
      }
    }

    const capturedLocation =
      browserLocation ||
      (await captureBrowserLocation());

    const id =
      "PP-" +
      Date.now()
        .toString(36)
        .toUpperCase();

    /*
     * =====================================================
     * PHOTO CONVERSION
     * =====================================================
     */

    const photoPromises =
      photos.map(
        (file) =>
          new Promise<string>(
            (resolve) => {
              const reader =
                new FileReader();

              reader.onload = () =>
                resolve(
                  reader.result as string
                );

              reader.readAsDataURL(
                file
              );
            }
          )
      );

    Promise.all(
      photoPromises
    ).then((photoData) => {
      const submission = {
        id,

        createdAt:
          new Date().toISOString(),

        /*
         * CITIZEN INFORMATION
         */

        name:
          form.name.trim(),

        village:
          form.village.trim(),

        location:
          form.location.trim(),

        /*
         * VERIFIED INDIA-WIDE
         * GEOGRAPHIC INFORMATION
         */

        pincode:
          verifiedLocation.pincode,

        state:
          verifiedLocation.state,

        district:
          verifiedLocation.district,

        verifiedArea:
          verifiedLocation.area,

        verifiedAreas:
          verifiedLocation.areas,

        /* GPS coordinates for the admin map */
        latitude: capturedLocation?.latitude ?? null,
        longitude: capturedLocation?.longitude ?? null,
        locationAccuracy: capturedLocation?.accuracy ?? null,
        locationCapturedAt: capturedLocation?.capturedAt ?? null,

        /*
         * ISSUE
         */

        issue:
          form.issue.trim(),

        /*
         * LANGUAGE METADATA
         */

        voiceLanguage,

        writingLanguages,

        /*
         * EVIDENCE
         */

        photos: photoData,

        /*
         * WORKFLOW
         */

        status: "Submitted",
      };

      /*
       * ===================================================
       * LOAD EXISTING SUBMISSIONS
       * ===================================================
       */

      let existing: any[] = [];

      try {
        const saved =
          localStorage.getItem(
            "peoples-priorities-submissions"
          );

        const parsed =
          JSON.parse(
            saved || "[]"
          );

        if (
          Array.isArray(parsed)
        ) {
          existing = parsed;
        }
      } catch {
        existing = [];
      }

      /*
       * ===================================================
       * SAVE
       * ===================================================
       */

      existing.push(
        submission
      );

      localStorage.setItem(
        "peoples-priorities-submissions",
        JSON.stringify(
          existing
        )
      );

      /*
       * ===================================================
       * SUCCESS
       * ===================================================
       */

      setSubmissionId(id);
      setSubmitted(true);

      console.log(
        "NEW INDIA-WIDE CITIZEN SUBMISSION:",
        submission
      );
    });
  };

  /*
   * =========================================================
   * LANGUAGE SELECTOR
   * =========================================================
   */

  const LanguageSelector = ({
    value,
    onChange,
  }: {
    value: Language;
    onChange: (
      language: Language
    ) => void;
  }) => (
    <select
      value={value}
      onChange={(event) =>
        onChange(
          event.target
            .value as Language
        )
      }
      className="rounded-lg border border-[#cfd9d0] bg-white px-3 py-1.5 text-xs font-semibold text-[#173f2a]"
    >
      <option value="en-IN">
        English
      </option>

      <option value="hi-IN">
        हिन्दी
      </option>

      <option value="or-IN">
        ଓଡ଼ିଆ
      </option>
    </select>
  );

  /*
   * =========================================================
   * SUCCESS SCREEN
   * =========================================================
   */

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#f5f7f4]">

        <header className="border-b border-[#dce3dc] bg-white">

          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">

            <a
              href="/"
              className="text-sm font-bold tracking-[0.18em] text-[#173f2a]"
            >
              PEOPLE'S PRIORITIES
            </a>

            <div className="flex items-center gap-3">

              <a
                href="/track"
                className="rounded-full border border-[#397149] bg-white px-4 py-2 text-xs font-bold text-[#397149] transition hover:bg-[#f0f8f1]"
              >
                🔎 Track My Submission
              </a>

              <div className="rounded-full bg-[#e9f4ea] px-4 py-2 text-xs font-bold text-[#397149]">
                🇮🇳 India • Citizen Voice
              </div>

            </div>

          </div>

        </header>

        <section className="mx-auto max-w-2xl px-5 py-20">

          <div className="rounded-[2rem] border border-[#d9e2da] bg-white p-10 text-center shadow-sm">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#e9f4ea] text-4xl">
              ✓
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#397149]">
              Submission Successful
            </p>

            <h1 className="mt-3 text-3xl font-bold text-[#173f2a]">
              Your community need has been recorded.
            </h1>

            <p className="mt-4 text-sm leading-7 text-[#66736a]">
              Your report has been
              recorded with a verified
              Indian location.
            </p>

            {/* SUBMISSION ID */}

            <div className="mt-8 rounded-2xl bg-[#f5faf5] p-5">

              <p className="text-xs font-semibold text-[#66736a]">
                Submission ID
              </p>

              <p className="mt-2 text-xl font-bold tracking-wider text-[#173f2a]">
                {submissionId}
              </p>

            </div>

            {/* VERIFIED LOCATION */}

            {verifiedLocation && (
              <div className="mt-5 rounded-2xl border border-[#cfe0d1] bg-[#f5faf5] p-5 text-left">

                <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                  Verified Location
                </p>

                <p className="mt-3 text-sm font-bold text-[#173f2a]">
                  📍{" "}
                  {form.village}
                </p>

                <p className="mt-1 text-sm text-[#66736a]">
                  {verifiedLocation.district},{" "}
                  {verifiedLocation.state}
                </p>

                <p className="mt-1 text-xs font-semibold text-[#397149]">
                  PIN:{" "}
                  {
                    verifiedLocation.pincode
                  }
                </p>

              </div>
            )}

            {/* ACTIONS */}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">

              <a
                href="/track"
                className="rounded-2xl border border-[#397149] px-8 py-4 font-bold text-[#173f2a] transition hover:bg-[#f5faf5]"
              >
                🔎 Track My Submission
              </a>

              <button
                onClick={() => {
                  setSubmitted(
                    false
                  );

                  setSubmissionId(
                    ""
                  );

                  setForm({
                    name: "",
                    village: "",
                    location: "",
                    pincode: "",
                    issue: "",
                  });

                  setErrors({
                    name: "",
                    village: "",
                    location: "",
                    pincode: "",
                    issue: "",
                  });

                  setVerifiedLocation(
                    null
                  );

                  setLocalityVerified(
                    false
                  );

                  setPincodeMessage(
                    ""
                  );

                  setBrowserLocation(null);
                   setLocationCaptureStatus("idle");
                   setLocationCaptureMessage("");

                   setPhotos([]);

                  setPhotoPreviews(
                    []
                  );

                  setLiveTranscript(
                    ""
                  );
                }}
                className="rounded-2xl bg-[#173f2a] px-8 py-4 font-bold text-white"
              >
                Submit Another Need
              </button>

            </div>

          </div>

        </section>

      </main>
    );
  }

  /*
   * =========================================================
   * MAIN PAGE
   * =========================================================
   */

  return (
    <main className="min-h-screen bg-[#f5f7f4] text-[#17221b]">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="border-b border-[#dce3dc] bg-white">

        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">

          <a
            href="/"
            className="text-sm font-bold tracking-[0.18em] text-[#173f2a]"
          >
            PEOPLE'S PRIORITIES
          </a>

          <div className="flex items-center gap-3">

            <a
              href="/track"
              className="rounded-full border border-[#397149] bg-white px-4 py-2 text-xs font-bold text-[#397149] transition hover:bg-[#f0f8f1]"
            >
              🔎 Track
            </a>

            <div className="rounded-full bg-[#e9f4ea] px-4 py-2 text-xs font-bold text-[#397149]">
              🇮🇳 India • Citizen Voice
            </div>

          </div>

        </div>

      </header>

      {/* =====================================================
          MAIN SECTION
          ===================================================== */}

      <section className="mx-auto max-w-4xl px-5 py-10 sm:px-8">

        <div className="rounded-[2rem] border border-[#d9e2da] bg-white p-6 shadow-sm sm:p-10">

          {/* =================================================
              TITLE
              ================================================= */}

          <div className="text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e9f4ea] text-3xl">
              🗣️
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#397149]">
              Citizen Submission
            </p>

            <h1 className="mt-3 text-3xl font-bold text-[#173f2a] sm:text-4xl">
              Tell us what your community needs
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#66736a]">
              Share your problem from
              anywhere in India.
              Use English, हिन्दी or
              ଓଡ଼ିଆ. You can type,
              speak, or attach photos
              as evidence.
            </p>

          </div>

          {/* =================================================
              INDIA LOCATION NOTICE
              ================================================= */}

          <div className="mt-8 rounded-2xl border border-[#cfe0d1] bg-[#f5faf5] p-5">

            <div className="flex gap-4">

              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white text-xl">
                🇮🇳
              </div>

              <div>

                <p className="text-sm font-bold text-[#173f2a]">
                  India-wide location verification
                </p>

                <p className="mt-1 text-xs leading-5 text-[#66736a]">
                  Your 6-digit Indian
                  PIN code is verified
                  before your submission
                  is accepted. After
                  verification, you can
                  select a locality
                  associated with that
                  PIN code.
                </p>

              </div>

            </div>

          </div>

          {/* =================================================
              VOICE LANGUAGE
              ================================================= */}

          <div className="mt-6 rounded-2xl border border-[#cfe0d1] bg-[#f5faf5] p-5">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-sm font-bold text-[#173f2a]">
                  🎙️ Voice language
                </p>

                <p className="mt-1 text-xs text-[#66736a]">
                  Select the language
                  you will speak.
                </p>

              </div>

              <select
                value={
                  voiceLanguage
                }
                onChange={(
                  event
                ) =>
                  setVoiceLanguage(
                    event.target
                      .value as Language
                  )
                }
                disabled={
                  isListening
                }
                className="rounded-xl border border-[#cbd8cd] bg-white px-4 py-3 text-sm font-semibold text-[#173f2a]"
              >

                <option value="or-IN">
                  ଓଡ଼ିଆ — Odia
                </option>

                <option value="hi-IN">
                  हिन्दी — Hindi
                </option>

                <option value="en-IN">
                  English
                </option>

              </select>

            </div>

          </div>

          {/* =================================================
              FORM
              ================================================= */}

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-8 space-y-7"
          >

            {/* =================================================
                NAME
                ================================================= */}

            <div>

              <div className="mb-2 flex items-center justify-between">

                <label className="text-sm font-bold text-[#173f2a]">
                  Name{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <LanguageSelector
                  value={
                    writingLanguages.name
                  }
                  onChange={(
                    language
                  ) =>
                    changeWritingLanguage(
                      "name",
                      language
                    )
                  }
                />

              </div>

              <input
                type="text"
                value={
                  form.name
                }
                onChange={(
                  event
                ) =>
                  handleInputChange(
                    "name",
                    event.target
                      .value
                  )
                }
                placeholder={
                  LANGUAGES[
                    writingLanguages
                      .name
                  ].placeholder
                }
                className={`w-full rounded-2xl border bg-white px-5 py-4 outline-none ${
                  errors.name
                    ? "border-red-400"
                    : "border-[#d5ded6]"
                }`}
              />

              {errors.name && (
                <p className="mt-2 text-sm text-red-600">
                  ⚠{" "}
                  {
                    errors.name
                  }
                </p>
              )}

            </div>

            {/* =================================================
                PIN CODE
                ================================================= */}

            <div>

              <label className="mb-2 block text-sm font-bold text-[#173f2a]">
                Indian PIN Code{" "}
                <span className="text-red-500">
                  *
                </span>
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={
                    form.pincode
                  }
                  onChange={(
                    event
                  ) =>
                    handlePincodeChange(
                      event.target
                        .value
                    )
                  }
                  placeholder="Enter 6-digit PIN code"
                  className={`w-full rounded-2xl border bg-white px-5 py-4 font-semibold tracking-wider outline-none sm:flex-1 ${
                    errors.pincode
                      ? "border-red-400"
                      : verifiedLocation
                      ? "border-[#397149]"
                      : "border-[#d5ded6]"
                  }`}
                />

                <div className="flex items-center justify-center rounded-2xl bg-[#f5faf5] px-5 py-4 text-sm font-bold text-[#397149] sm:min-w-[150px]">

                  {pincodeChecking ? (
                    <>
                      ⏳ Checking...
                    </>
                  ) : verifiedLocation ? (
                    <>
                      ✓ Verified
                    </>
                  ) : (
                    <>
                      India PIN
                    </>
                  )}

                </div>

              </div>

              {pincodeMessage && (
                <p
                  className={`mt-2 text-sm font-semibold ${
                    verifiedLocation
                      ? "text-[#397149]"
                      : "text-[#66736a]"
                  }`}
                >
                  {
                    pincodeMessage
                  }
                </p>
              )}

              {errors.pincode && (
                <p className="mt-2 text-sm text-red-600">
                  ⚠{" "}
                  {
                    errors.pincode
                  }
                </p>
              )}

              {/* VERIFIED PIN LOCATION */}

              {verifiedLocation && (
                <div className="mt-4 rounded-2xl border border-[#cfe0d1] bg-[#f5faf5] p-5">

                  <div className="flex items-start gap-3">

                    <div className="text-xl">
                      📍
                    </div>

                    <div>

                      <p className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                        Verified Indian Location
                      </p>

                      <p className="mt-2 text-sm font-bold text-[#173f2a]">
                        {
                          verifiedLocation
                            .area
                        }
                      </p>

                      <p className="mt-1 text-sm text-[#66736a]">
                        {
                          verifiedLocation
                            .district
                        }
                        ,{" "}
                        {
                          verifiedLocation
                            .state
                        }
                      </p>

                      <p className="mt-1 text-xs font-semibold text-[#397149]">
                        PIN:{" "}
                        {
                          verifiedLocation
                            .pincode
                        }
                      </p>

                      <p className="mt-2 text-xs text-[#66736a]">
                        {
                          verifiedLocation
                            .areas
                            .length
                        }{" "}
                        locality/post-office option
                        {verifiedLocation
                          .areas
                          .length !==
                        1
                          ? "s"
                          : ""}{" "}
                        available for this PIN.
                      </p>

                    </div>

                  </div>

                </div>
              )}

            </div>

            {/* =================================================
                VILLAGE / LOCALITY
                ================================================= */}

            <div>

              <div className="mb-2 flex items-center justify-between">

                <label className="text-sm font-bold text-[#173f2a]">
                  Village / Locality{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <LanguageSelector
                  value={
                    writingLanguages
                      .village
                  }
                  onChange={(
                    language
                  ) =>
                    changeWritingLanguage(
                      "village",
                      language
                    )
                  }
                />

              </div>

              {!verifiedLocation ? (

                <div className="rounded-2xl border border-[#d5ded6] bg-[#f8fbf8] px-5 py-4 text-sm text-[#66736a]">
                  🇮🇳 Enter and verify
                  your Indian PIN code
                  first. Your verified
                  localities will appear
                  here.
                </div>

              ) : (

                <select
                  value={
                    form.village
                  }
                  onChange={(
                    event
                  ) => {
                    const selected =
                      event.target
                        .value;

                    handleInputChange(
                      "village",
                      selected
                    );

                    if (
                      verifiedLocation.areas.some(
                        (
                          area
                        ) =>
                          area.toLowerCase() ===
                          selected.toLowerCase()
                      )
                    ) {
                      setLocalityVerified(
                        true
                      );

                      setErrors(
                        (
                          previous
                        ) => ({
                          ...previous,
                          village:
                            "",
                        })
                      );
                    } else {
                      setLocalityVerified(
                        false
                      );
                    }
                  }}
                  className={`w-full rounded-2xl border bg-white px-5 py-4 outline-none ${
                    errors.village
                      ? "border-red-400"
                      : localityVerified
                      ? "border-[#397149]"
                      : "border-[#d5ded6]"
                  }`}
                >

                  <option value="">
                    Select your village /
                    locality
                  </option>

                  {verifiedLocation.areas.map(
                    (
                      area
                    ) => (
                      <option
                        key={
                          area
                        }
                        value={
                          area
                        }
                      >
                        {
                          area
                        }
                      </option>
                    )
                  )}

                </select>

              )}

              {verifiedLocation && (
                <p className="mt-2 text-xs text-[#66736a]">
                  Select a locality
                  associated with your
                  verified PIN code.
                </p>
              )}

              {localityVerified && (
                <p className="mt-2 text-sm font-semibold text-[#397149]">
                  ✓ Locality verified
                </p>
              )}

              {errors.village && (
                <p className="mt-2 text-sm text-red-600">
                  ⚠{" "}
                  {
                    errors.village
                  }
                </p>
              )}

            </div>

            {/* =================================================
                LOCATION / LANDMARK
                ================================================= */}

            <div>

              <div className="mb-2 flex items-center justify-between">

                <label className="text-sm font-bold text-[#173f2a]">
                  Location / Landmark{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <LanguageSelector
                  value={
                    writingLanguages
                      .location
                  }
                  onChange={(
                    language
                  ) =>
                    changeWritingLanguage(
                      "location",
                      language
                    )
                  }
                />

              </div>

              <input
                type="text"
                value={
                  form.location
                }
                onChange={(
                  event
                ) =>
                  handleInputChange(
                    "location",
                    event.target
                      .value
                  )
                }
                placeholder="Example: Near the market"
                className={`w-full rounded-2xl border bg-white px-5 py-4 outline-none ${
                  errors.location
                    ? "border-red-400"
                    : "border-[#d5ded6]"
                }`}
              />

              <p className="mt-2 text-xs text-[#66736a]">
                Example: Near school,
                bus stop, market,
                temple, main road,
                etc.
              </p>

              {errors.location && (
                <p className="mt-2 text-sm text-red-600">
                  ⚠{" "}
                  {
                    errors.location
                  }
                </p>
              )}

            </div>

            {/* =================================================
                ISSUE
                ================================================= */}

            <div>

              <div className="mb-2 flex items-center justify-between">

                <label className="text-sm font-bold text-[#173f2a]">
                  What is the issue?{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <LanguageSelector
                  value={
                    writingLanguages
                      .issue
                  }
                  onChange={(
                    language
                  ) =>
                    changeWritingLanguage(
                      "issue",
                      language
                    )
                  }
                />

              </div>

              {/* VOICE */}

              <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-[#d5e1d6] bg-[#f8fbf8] p-4 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-sm font-bold text-[#173f2a]">
                    {isListening
                      ? "🔴 Listening..."
                      : "🎤 Speak your issue"}
                  </p>

                  <p className="mt-1 text-xs text-[#66736a]">
                    Speaking in{" "}
                    <strong>
                      {
                        LANGUAGES[
                          voiceLanguage
                        ].native
                      }
                    </strong>
                  </p>

                </div>

                {!isListening ? (

                  <button
                    type="button"
                    onClick={
                      startSpeaking
                    }
                    className="rounded-full bg-[#173f2a] px-6 py-3 text-sm font-bold text-white"
                  >
                    🎙 Start Speaking
                  </button>

                ) : (

                  <button
                    type="button"
                    onClick={
                      stopSpeaking
                    }
                    className="rounded-full bg-[#b42318] px-6 py-3 text-sm font-bold text-white"
                  >
                    ✓ Done Speaking
                  </button>

                )}

              </div>

              {/* LIVE TRANSCRIPT */}

              {isListening && (

                <div className="mb-3 rounded-2xl border border-[#9bc5a2] bg-[#f0f8f1] p-4">

                  <span className="text-xs font-bold uppercase tracking-wider text-[#397149]">
                    Live transcription
                  </span>

                  <p className="mt-3 min-h-[45px] text-base leading-7 text-[#173f2a]">
                    {
                      liveTranscript ||
                      "Start speaking..."
                    }
                  </p>

                </div>

              )}

              <textarea
                value={
                  form.issue
                }
                onChange={(
                  event
                ) =>
                  handleInputChange(
                    "issue",
                    event.target
                      .value
                  )
                }
                placeholder={
                  LANGUAGES[
                    writingLanguages
                      .issue
                  ].placeholder
                }
                rows={7}
                className={`w-full resize-none rounded-2xl border bg-white px-5 py-4 leading-7 outline-none ${
                  errors.issue
                    ? "border-red-400"
                    : "border-[#d5ded6]"
                }`}
              />

              <div className="mt-2 flex justify-between">

                <p className="text-xs text-[#7b877f]">
                  Type manually or
                  use voice.
                </p>

                <p className="text-xs text-[#7b877f]">
                  {
                    form.issue
                      .length
                  }{" "}
                  characters
                </p>

              </div>

              {errors.issue && (
                <p className="mt-2 text-sm text-red-600">
                  ⚠{" "}
                  {
                    errors.issue
                  }
                </p>
              )}

            </div>

            {/* =================================================
                PHOTOS
                ================================================= */}

            <div>

              <label className="text-sm font-bold text-[#173f2a]">
                📷 Add photos /
                evidence
              </label>

              <p className="mt-1 text-xs text-[#66736a]">
                Upload photos showing
                the problem.
              </p>

              <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#cbd8cd] bg-[#f8fbf8] p-8 text-center transition hover:border-[#397149]">

                <span className="text-4xl">
                  📷
                </span>

                <span className="mt-3 text-sm font-bold text-[#173f2a]">
                  Click to upload
                  photos
                </span>

                <span className="mt-1 text-xs text-[#66736a]">
                  JPG, PNG or WEBP •
                  Multiple photos
                  allowed
                </span>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={
                    handlePhotoChange
                  }
                  className="hidden"
                />

              </label>

              {photoPreviews.length >
                0 && (

                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">

                  {photoPreviews.map(
                    (
                      preview,
                      index
                    ) => (

                      <div
                        key={
                          preview
                        }
                        className="relative overflow-hidden rounded-2xl border border-[#d5ded6]"
                      >

                        <img
                          src={
                            preview
                          }
                          alt={`Evidence ${
                            index +
                            1
                          }`}
                          className="h-36 w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removePhoto(
                              index
                            )
                          }
                          className="absolute right-2 top-2 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white"
                        >
                          Remove
                        </button>

                      </div>

                    )
                  )}

                </div>

              )}

              {photos.length >
                0 && (

                <p className="mt-3 text-xs font-semibold text-[#397149]">
                  ✓{" "}
                  {
                    photos.length
                  }{" "}
                  photo
                  {photos.length >
                  1
                    ? "s"
                    : ""}{" "}
                  selected
                </p>

              )}

            </div>

            {/* =================================================
                SPEECH ERROR
                ================================================= */}

            {speechError && (

              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                ⚠{" "}
                {
                  speechError
                }
              </div>

            )}

            {!speechSupported && (

              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-semibold text-yellow-800">
                Your browser does
                not support speech
                recognition. Use
                Google Chrome or
                Microsoft Edge.
              </div>

            )}

            {/* =================================================
                GPS LOCATION STATUS
                ================================================= */}

            <div className="rounded-2xl border border-[#d9e2da] bg-white p-5">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f8f1] text-lg">
                  📍
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#173f2a]">
                    Admin map location
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#66736a]">
                    When you submit, your browser will ask for your current GPS location. If you allow it, the coordinates are stored with this report for the admin map. Your verified PIN and locality remain the geographic fallback if GPS is unavailable.
                  </p>
                  {locationCaptureStatus === "captured" && (
                    <p className="mt-2 text-xs font-semibold text-[#397149]">
                      ✓ {locationCaptureMessage}
                    </p>
                  )}
                  {locationCaptureStatus === "requesting" && (
                    <p className="mt-2 text-xs font-semibold text-[#397149]">
                      ⏳ {locationCaptureMessage}
                    </p>
                  )}
                  {locationCaptureStatus === "denied" && (
                    <p className="mt-2 text-xs font-semibold text-[#9a3412]">
                      ⚠ {locationCaptureMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* =================================================
                LOCATION CONFIRMATION
                ================================================= */}

            {verifiedLocation &&
              localityVerified && (

                <div className="rounded-2xl border border-[#cfe0d1] bg-[#f5faf5] p-5">

                  <div className="flex gap-3">

                    <div className="text-xl">
                      🛡️
                    </div>

                    <div>

                      <p className="text-sm font-bold text-[#173f2a]">
                        Location verified
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#66736a]">
                        This report
                        will be
                        associated
                        with{" "}
                        <strong>
                          {
                            form
                              .village
                          }
                        </strong>
                        ,{" "}
                        <strong>
                          {
                            verifiedLocation
                              .district
                          }
                        </strong>
                        ,{" "}
                        <strong>
                          {
                            verifiedLocation
                              .state
                          }
                        </strong>{" "}
                        using PIN{" "}
                        <strong>
                          {
                            verifiedLocation
                              .pincode
                          }
                        </strong>
                        .
                      </p>

                    </div>

                  </div>

                </div>

              )}

            {/* =================================================
                SUBMIT
                ================================================= */}

            <button
              type="submit"
              disabled={
                pincodeChecking ||
                !verifiedLocation ||
                !localityVerified
              }
              className={`w-full rounded-2xl px-6 py-4 text-base font-bold text-white shadow-lg transition ${
                pincodeChecking ||
                !verifiedLocation ||
                !localityVerified
                  ? "cursor-not-allowed bg-[#829889]"
                  : "bg-[#173f2a] hover:bg-[#0f2f1e]"
              }`}
            >
              {pincodeChecking
                ? "Verifying location..."
                : !verifiedLocation
                ? "Verify PIN code first"
                : !localityVerified
                ? "Select your verified locality"
                : "Submit Community Need →"}
            </button>

            <p className="text-center text-xs leading-5 text-[#7b877f]">
              Your submission is
              accepted only after
              the Indian PIN code
              and locality have been
              successfully verified.
            </p>

          </form>

        </div>

      </section>

    </main>
  );
}