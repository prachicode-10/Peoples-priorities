"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { lookupIndiaPincode, type VerifiedLocation } from "@/lib/indiaLocations";
import { useLanguage } from "@/lib/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LANGUAGES, SPEECH_LANGUAGES, SupportedLanguage } from "@/lib/translations";
import { createAudioRecorder, AudioRecorder } from "@/lib/audioRecorder";
import { ODIA_GRIEVANCE_TEMPLATES } from "@/lib/odiaGrievances";
import { analyzeIssueContext } from "@/lib/issueClassifier";

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
  const { language, t, speechLang } = useLanguage();

  /* VOICE LANGUAGE (defaults to global language or speechLang) */
  const [voiceLanguage, setVoiceLanguage] = useState<string>(speechLang);

  useEffect(() => {
    setVoiceLanguage(SPEECH_LANGUAGES[language] || "en-IN");
  }, [language]);

  /* FORM STATE */
  const [form, setForm] = useState<FormData>({
    name: "",
    village: "",
    location: "",
    pincode: "",
    issue: "",
  });

  const [errors, setErrors] = useState({
    name: "",
    village: "",
    location: "",
    pincode: "",
    issue: "",
  });

  /* VERIFIED INDIA LOCATION */
  const [verifiedLocation, setVerifiedLocation] = useState<VerifiedLocation | null>(null);
  const [pincodeChecking, setPincodeChecking] = useState(false);
  const [pincodeMessage, setPincodeMessage] = useState("");
  const [localityVerified, setLocalityVerified] = useState(false);

  /* BROWSER GPS LOCATION */
  const [browserLocation, setBrowserLocation] = useState<BrowserLocation | null>(null);
  const [locationCaptureStatus, setLocationCaptureStatus] = useState<"idle" | "requesting" | "captured" | "denied">("idle");
  const [locationCaptureMessage, setLocationCaptureMessage] = useState("");

  /* PHOTOS */
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  /* SUBMISSION STATE */
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState("");

  /* VOICE RECORDING & TRANSLATION ENGINE */
  const [isListening, setIsListening] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [originalTranscript, setOriginalTranscript] = useState("");
  const [translatedTranscript, setTranslatedTranscript] = useState("");
  const [translationPreference, setTranslationPreference] = useState<"combined" | "original" | "translated">("combined");
  const [extractedAudioUrl, setExtractedAudioUrl] = useState<string | null>(null);
  const [extractedAudioDataUrl, setExtractedAudioDataUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [voiceDraftLoaded, setVoiceDraftLoaded] = useState(false);

  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  /* Load voice draft from landing page */
  useEffect(() => {
    try {
      const draft = sessionStorage.getItem("peoples-priorities-voice-draft");
      const audio = sessionStorage.getItem("peoples-priorities-voice-audio");
      if (draft) {
        setForm((prev) => ({ ...prev, issue: draft }));
        setVoiceDraftLoaded(true);
        sessionStorage.removeItem("peoples-priorities-voice-draft");
      }
      if (audio) {
        setExtractedAudioUrl(audio);
        setExtractedAudioDataUrl(audio);
        sessionStorage.removeItem("peoples-priorities-voice-audio");
      }
    } catch {}
  }, []);

  const startSpeaking = async () => {
    setSpeechError("");
    setLiveTranscript("");
    setOriginalTranscript("");
    setTranslatedTranscript("");
    if (extractedAudioUrl && !extractedAudioDataUrl?.startsWith("data:")) {
      URL.revokeObjectURL(extractedAudioUrl);
    }
    setExtractedAudioUrl(null);
    setExtractedAudioDataUrl(null);
    setRecordingDuration(0);

    try {
      const recorder = createAudioRecorder();
      audioRecorderRef.current = recorder;

      await recorder.start({
        language: voiceLanguage,
        onVolumeChange: (vol) => setAudioVolume(vol),
        onInterimTranscript: (text) => setLiveTranscript(text),
        onError: (err) => setSpeechError(err),
      });

      setIsListening(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 120) {
            stopSpeaking();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setIsListening(false);
      setSpeechError(err.message || "Failed to start microphone recording.");
    }
  };

  const stopSpeaking = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const recorder = audioRecorderRef.current;
    if (!recorder) {
      setIsListening(false);
      return;
    }

    try {
      setIsListening(false);
      setIsTranscribing(true);

      const result = await recorder.stop();
      setExtractedAudioUrl(result.audioUrl);

      // Convert to base64 to store with submission evidence
      const reader = new FileReader();
      reader.onloadend = () => {
        setExtractedAudioDataUrl(reader.result as string);
      };
      reader.readAsDataURL(result.blob);

      // Call /api/transcribe to process speech & translate
      const formData = new FormData();
      formData.append("audio", result.blob, "citizen-grievance.webm");
      formData.append("language", voiceLanguage);
      formData.append("interimText", result.transcript || liveTranscript);
      formData.append("targetLanguage", "en");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const orig = data.originalText || result.transcript || liveTranscript;
          const trans = data.translatedText || "";
          setOriginalTranscript(orig);
          setTranslatedTranscript(trans);

          let chosenText = "";
          if (orig && trans && orig.toLowerCase() !== trans.toLowerCase()) {
            chosenText = `[Original]: ${orig}\n[English Translation]: ${trans}`;
          } else {
            chosenText = orig || trans;
          }

          if (chosenText) {
            setForm((prev) => ({
              ...prev,
              issue: chosenText,
            }));
            setErrors((prev) => ({ ...prev, issue: "" }));
          }
        }
      }
    } catch (err: any) {
      console.error("Audio transcription error:", err);
      setSpeechError("Audio was recorded, but translation service timed out. You can still type details.");
    } finally {
      setIsTranscribing(false);
      setAudioVolume(0);
    }
  };

  const applyTranslationChoice = (choice: "combined" | "original" | "translated") => {
    setTranslationPreference(choice);
    if (
      choice === "combined" &&
      originalTranscript &&
      translatedTranscript &&
      originalTranscript.toLowerCase() !== translatedTranscript.toLowerCase()
    ) {
      const combined = `[Original]: ${originalTranscript}\n[English Translation]: ${translatedTranscript}`;
      setForm((prev) => ({ ...prev, issue: combined }));
    } else if (choice === "translated" && translatedTranscript) {
      setForm((prev) => ({ ...prev, issue: translatedTranscript }));
    } else if (originalTranscript) {
      setForm((prev) => ({ ...prev, issue: originalTranscript }));
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [field]: "",
    }));

    if (field === "village") {
      setLocalityVerified(false);
    }
  };

  const handlePincodeChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 6);

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

  /* PIN CODE LOOKUP */
  useEffect(() => {
    let cancelled = false;

    const verifyPincode = async () => {
      const pincode = form.pincode;

      if (pincode.length !== 6) {
        setVerifiedLocation(null);
        setLocalityVerified(false);
        setPincodeChecking(false);
        return;
      }

      setPincodeChecking(true);
      setVerifiedLocation(null);
      setLocalityVerified(false);
      setPincodeMessage(t.citizenForm.pincodeChecking);

      const result = await lookupIndiaPincode(pincode);

      if (cancelled) return;
      setPincodeChecking(false);

      if (result) {
        setVerifiedLocation(result);
        setPincodeMessage(`✓ ${t.citizenForm.pincodeValid}`);
        setErrors((previous) => ({ ...previous, pincode: "" }));
      } else {
        setVerifiedLocation(null);
        setLocalityVerified(false);
        setPincodeMessage(t.citizenForm.pincodeInvalid);
        setErrors((previous) => ({
          ...previous,
          pincode: t.citizenForm.pincodeError,
        }));
      }
    };

    verifyPincode();

    return () => {
      cancelled = true;
    };
  }, [form.pincode, t]);

  const verifyLocality = () => {
    if (!verifiedLocation) {
      setErrors((previous) => ({
        ...previous,
        village: t.citizenForm.pincodeError,
      }));
      return false;
    }

    const entered = form.village.trim().toLowerCase();
    if (!entered) {
      setErrors((previous) => ({
        ...previous,
        village: t.citizenForm.villageError,
      }));
      return false;
    }

    const matches = verifiedLocation.areas.some(
      (area) => area.toLowerCase() === entered
    );

    if (!matches) {
      setLocalityVerified(false);
      setErrors((previous) => ({
        ...previous,
        village: t.citizenForm.villageError,
      }));
      return false;
    }

    setLocalityVerified(true);
    setErrors((previous) => ({ ...previous, village: "" }));
    return true;
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    setPhotos(imageFiles);

    const previews = imageFiles.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(previews);
  };

  const removePhoto = (index: number) => {
    setPhotos((previous) => previous.filter((_, i) => i !== index));
    setPhotoPreviews((previous) => previous.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {
      name: "",
      village: "",
      location: "",
      pincode: "",
      issue: "",
    };

    if (!form.name.trim()) {
      newErrors.name = t.citizenForm.nameError;
    }

    if (!form.village.trim()) {
      newErrors.village = t.citizenForm.villageError;
    } else if (!verifiedLocation) {
      newErrors.village = t.citizenForm.pincodeError;
    }

    if (!form.location.trim()) {
      newErrors.location = t.citizenForm.locationError;
    }

    if (!form.pincode.trim() || form.pincode.length !== 6) {
      newErrors.pincode = t.citizenForm.pincodeError;
    }

    if (!form.issue.trim() || form.issue.trim().length < 5) {
      newErrors.issue = t.citizenForm.issueError;
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const captureBrowserLocation = (): Promise<BrowserLocation | null> => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationCaptureStatus("denied");
      setLocationCaptureMessage(t.citizenForm.gpsDenied);
      return Promise.resolve(null);
    }

    setLocationCaptureStatus("requesting");
    setLocationCaptureMessage(t.citizenForm.gpsRequesting);

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
          setLocationCaptureMessage(`${t.citizenForm.gpsCaptured} (±${captured.accuracy} m)`);
          resolve(captured);
        },
        (error) => {
          console.warn("Could not capture GPS location:", error);
          setLocationCaptureStatus("denied");
          setLocationCaptureMessage(t.citizenForm.gpsDenied);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;

    if (!verifiedLocation) {
      setErrors((previous) => ({
        ...previous,
        pincode: t.citizenForm.pincodeInvalid,
      }));
      return;
    }

    if (!localityVerified) {
      const valid = verifyLocality();
      if (!valid) return;
    }

    const capturedLocation = browserLocation || (await captureBrowserLocation());
    const id = "PP-" + Date.now().toString(36).toUpperCase();

    const photoPromises = photos.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        })
    );

    Promise.all(photoPromises).then((photoData) => {
      const submission = {
        id,
        createdAt: new Date().toISOString(),
        name: form.name.trim(),
        village: form.village.trim(),
        location: form.location.trim(),
        pincode: verifiedLocation.pincode,
        state: verifiedLocation.state,
        district: verifiedLocation.district,
        verifiedArea: verifiedLocation.area,
        verifiedAreas: verifiedLocation.areas,
        latitude: capturedLocation?.latitude ?? null,
        longitude: capturedLocation?.longitude ?? null,
        locationAccuracy: capturedLocation?.accuracy ?? null,
        locationCapturedAt: capturedLocation?.capturedAt ?? null,
        // Context-aware semantic issue classification
        issue: form.issue.trim(),
        originalText: form.issue.trim(),
        originalTranscript: form.issue.trim(),
        normalizedText: analyzeIssueContext(form.issue.trim(), language).normalizedText,
        primaryCategory: analyzeIssueContext(form.issue.trim(), language).primaryCategory,
        theme: analyzeIssueContext(form.issue.trim(), language).theme,
        classification: analyzeIssueContext(form.issue.trim(), language),
        language: language,
        voiceLanguage: voiceLanguage,
        voiceAudioUrl: extractedAudioDataUrl || null,
        voiceTranslatedText: translatedTranscript || null,
        photos: photoData,
        status: "Submitted",
      };

      let existing: any[] = [];
      try {
        const saved = localStorage.getItem("peoples-priorities-submissions");
        const parsed = JSON.parse(saved || "[]");
        if (Array.isArray(parsed)) existing = parsed;
      } catch {
        existing = [];
      }

      existing.push(submission);
      localStorage.setItem("peoples-priorities-submissions", JSON.stringify(existing));

      setSubmissionId(id);
      setSubmitted(true);
    });
  };

  /* SUCCESS SCREEN */
  if (submitted) {
    return (
      <main className="min-h-screen bg-[#f8faf5]">
        <header className="border-b border-[#e2e8df] bg-white sticky top-0 z-30">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-sm font-black tracking-wider text-[#173f2a] flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded bg-[#173f2a] text-white text-xs font-bold">PP</span>
              {t.common.siteName}
            </Link>

            <div className="flex items-center gap-3">
              <LanguageSwitcher compact />
              <Link
                href="/track"
                className="rounded-lg border border-[#28623c] bg-white px-4 py-2 text-xs font-bold text-[#173f2a] hover:bg-[#edf5ee] transition"
              >
                🔎 {t.common.trackComplaint}
              </Link>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-2xl px-5 py-16">
          <div className="rounded-3xl border border-[#d9e2da] bg-white p-8 sm:p-12 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#edf5ee] text-4xl text-[#28623c]">
              ✓
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#28623c]">
              {t.citizenForm.successBadge}
            </p>

            <h1 className="mt-3 text-2xl sm:text-3xl font-black text-[#173f2a]">
              {t.citizenForm.successTitle}
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-[#556458]">
              {t.citizenForm.successDesc}
            </p>

            {/* SUBMISSION ID */}
            <div className="mt-8 rounded-2xl bg-[#f8faf5] border border-[#e2e8df] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#556458]">
                {t.citizenForm.submissionIdLabel}
              </p>
              <p className="mt-2 text-2xl font-black tracking-widest text-[#173f2a]">
                {submissionId}
              </p>
            </div>

            {/* VERIFIED LOCATION */}
            {verifiedLocation && (
              <div className="mt-5 rounded-2xl border border-[#cfe0d1] bg-[#f8faf5] p-5 text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-[#28623c]">
                  {t.citizenForm.verifiedLocationTitle}
                </p>
                <p className="mt-2 text-base font-bold text-[#173f2a]">
                  📍 {form.village}
                </p>
                <p className="mt-1 text-sm text-[#556458]">
                  {verifiedLocation.district}, {verifiedLocation.state}
                </p>
                <p className="mt-1 text-xs font-bold text-[#28623c]">
                  PIN: {verifiedLocation.pincode}
                </p>
              </div>
            )}

            {/* ACTIONS */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/track"
                className="rounded-xl border border-[#28623c] px-6 py-3.5 text-sm font-bold text-[#173f2a] hover:bg-[#edf5ee] transition"
              >
                🔎 {t.citizenForm.trackMySubmissionBtn}
              </Link>

              <button
                onClick={() => {
                  setSubmitted(false);
                  setSubmissionId("");
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
                  setVerifiedLocation(null);
                  setLocalityVerified(false);
                  setPincodeMessage("");
                  setBrowserLocation(null);
                  setLocationCaptureStatus("idle");
                  setLocationCaptureMessage("");
                  setPhotos([]);
                  setPhotoPreviews([]);
                  setLiveTranscript("");
                }}
                className="rounded-xl bg-[#173f2a] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#0f2a1c] transition"
              >
                {t.citizenForm.submitAnotherBtn}
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  /* MAIN COMPLAINT FILING PAGE */
  return (
    <main className="min-h-screen bg-[#f8faf5] text-[#17221b]">
      {/* HEADER */}
      <header className="border-b border-[#e2e8df] bg-white sticky top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-black tracking-wider text-[#173f2a] flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-[#173f2a] text-white text-xs font-bold">PP</span>
            {t.common.siteName}
          </Link>

          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <Link
              href="/track"
              className="rounded-lg border border-[#28623c] bg-white px-4 py-2 text-xs font-bold text-[#173f2a] hover:bg-[#edf5ee] transition"
            >
              🔎 {t.common.track}
            </Link>
            <div className="hidden sm:flex rounded-full bg-[#edf5ee] px-3.5 py-1.5 text-xs font-bold text-[#28623c]">
              {t.common.govtInterface}
            </div>
          </div>
        </div>
      </header>

      {/* FORM CONTAINER */}
      <section className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <div className="rounded-3xl border border-[#d9e2da] bg-white p-6 sm:p-10 shadow-sm">
          {/* TITLE */}
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf5ee] text-3xl">
              🗣️
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[#28623c]">
              {t.citizenForm.badge}
            </p>
            <h1 className="mt-2 text-2xl sm:text-4xl font-black text-[#173f2a]">
              {t.citizenForm.heading}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#556458]">
              {t.citizenForm.description}
            </p>
          </div>

          {/* INDIA LOCATION NOTICE */}
          <div className="mt-8 rounded-2xl border border-[#cfe0d1] bg-[#f8faf5] p-5">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-xs">
                🇮🇳
              </div>
              <div>
                <p className="text-sm font-bold text-[#173f2a]">
                  {t.citizenForm.locVerifyTitle}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#556458]">
                  {t.citizenForm.locVerifyDesc}
                </p>
              </div>
            </div>
          </div>

          {/* VOICE INPUT SELECTOR */}
          <div className="mt-6 rounded-2xl border border-[#cfe0d1] bg-[#f8faf5] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#173f2a] flex items-center gap-2">
                  {t.citizenForm.voiceLangTitle}
                </p>
                <p className="mt-1 text-xs text-[#556458]">
                  {t.citizenForm.voiceLangDesc}
                </p>
              </div>

              <select
                value={voiceLanguage}
                onChange={(e) => setVoiceLanguage(e.target.value)}
                disabled={isListening}
                className="rounded-xl border border-[#cbd8cd] bg-white px-4 py-2.5 text-sm font-semibold text-[#173f2a] outline-none"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.speechLang}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* NAME */}
            <div>
              <label className="mb-2 block text-sm font-bold text-[#173f2a]">
                {t.citizenForm.nameLabel} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder={t.citizenForm.namePlaceholder}
                className={`w-full rounded-xl border bg-white px-4 py-3.5 text-sm outline-none transition ${
                  errors.name ? "border-red-400 focus:ring-1 focus:ring-red-400" : "border-[#d5ded6] focus:border-[#28623c]"
                }`}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs font-semibold text-red-600">⚠ {errors.name}</p>
              )}
            </div>

            {/* PIN CODE */}
            <div>
              <label className="mb-2 block text-sm font-bold text-[#173f2a]">
                {t.citizenForm.pincodeLabel} <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  placeholder={t.citizenForm.pincodePlaceholder}
                  className={`w-full rounded-xl border bg-white px-4 py-3.5 text-sm font-semibold tracking-wider outline-none sm:flex-1 transition ${
                    errors.pincode
                      ? "border-red-400"
                      : verifiedLocation
                      ? "border-[#28623c]"
                      : "border-[#d5ded6]"
                  }`}
                />
                <div className="flex items-center justify-center rounded-xl bg-[#edf5ee] px-4 py-3 text-xs font-bold text-[#28623c] sm:min-w-[140px]">
                  {pincodeChecking ? (
                    <span>⏳ {t.citizenForm.pincodeChecking}</span>
                  ) : verifiedLocation ? (
                    <span>✓ {t.citizenForm.pincodeValid}</span>
                  ) : (
                    <span>🇮🇳 6-Digit PIN</span>
                  )}
                </div>
              </div>

              {pincodeMessage && (
                <p className={`mt-2 text-xs font-semibold ${verifiedLocation ? "text-[#28623c]" : "text-[#556458]"}`}>
                  {pincodeMessage}
                </p>
              )}
              {errors.pincode && (
                <p className="mt-1.5 text-xs font-semibold text-red-600">⚠ {errors.pincode}</p>
              )}

              {/* VERIFIED PIN PREVIEW */}
              {verifiedLocation && (
                <div className="mt-4 rounded-xl border border-[#cfe0d1] bg-[#f8faf5] p-4 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg">📍</span>
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[#28623c]">
                        {t.citizenForm.verifiedLocationTitle}
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#173f2a]">
                        {verifiedLocation.area}
                      </p>
                      <p className="text-[#556458]">
                        {verifiedLocation.district}, {verifiedLocation.state} — PIN {verifiedLocation.pincode}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* VILLAGE / LOCALITY */}
            <div>
              <label className="mb-2 block text-sm font-bold text-[#173f2a]">
                {t.citizenForm.villageLabel} <span className="text-red-500">*</span>
              </label>

              {!verifiedLocation ? (
                <div className="rounded-xl border border-[#d5ded6] bg-[#f8faf5] px-4 py-3 text-xs text-[#556458]">
                  🇮🇳 {t.citizenForm.locVerifyDesc}
                </div>
              ) : (
                <select
                  value={form.village}
                  onChange={(e) => {
                    const selected = e.target.value;
                    handleInputChange("village", selected);
                    if (verifiedLocation.areas.some((area) => area.toLowerCase() === selected.toLowerCase())) {
                      setLocalityVerified(true);
                      setErrors((prev) => ({ ...prev, village: "" }));
                    } else {
                      setLocalityVerified(false);
                    }
                  }}
                  className={`w-full rounded-xl border bg-white px-4 py-3.5 text-sm outline-none ${
                    errors.village ? "border-red-400" : localityVerified ? "border-[#28623c]" : "border-[#d5ded6]"
                  }`}
                >
                  <option value="">{t.citizenForm.villagePlaceholder}</option>
                  {verifiedLocation.areas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              )}

              {localityVerified && (
                <p className="mt-1 text-xs font-semibold text-[#28623c]">✓ {t.citizenForm.localityVerifiedBadge}</p>
              )}
              {errors.village && (
                <p className="mt-1.5 text-xs font-semibold text-red-600">⚠ {errors.village}</p>
              )}
            </div>

            {/* LOCATION / LANDMARK */}
            <div>
              <label className="mb-2 block text-sm font-bold text-[#173f2a]">
                {t.citizenForm.locationLabel} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder={t.citizenForm.locationPlaceholder}
                className={`w-full rounded-xl border bg-white px-4 py-3.5 text-sm outline-none transition ${
                  errors.location ? "border-red-400" : "border-[#d5ded6] focus:border-[#28623c]"
                }`}
              />
              {errors.location && (
                <p className="mt-1.5 text-xs font-semibold text-red-600">⚠ {errors.location}</p>
              )}
            </div>

            {/* ISSUE DESCRIPTION & VOICE */}
            <div>
              <label className="mb-2 block text-sm font-bold text-[#173f2a]">
                {t.citizenForm.issueLabel} <span className="text-red-500">*</span>
              </label>

              {/* VOICE DRAFT NOTICE */}
              {voiceDraftLoaded && (
                <div className="mb-3 flex items-center justify-between rounded-xl border border-[#28623c]/30 bg-[#edf5ee] px-4 py-2 text-xs font-semibold text-[#173f2a]">
                  <span className="flex items-center gap-1.5">
                    <span>🎙️</span> Voice grievance draft loaded from landing page
                  </span>
                  <button
                    type="button"
                    onClick={() => setVoiceDraftLoaded(false)}
                    className="text-[#28623c] hover:underline"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* VOICE BAR */}
              <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-[#d5e1d6] bg-[#f8faf5] p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#173f2a] flex items-center gap-2">
                      {isListening ? (
                        <span className="flex items-center gap-1.5 text-[#b42318]">
                          <span className="h-2 w-2 rounded-full bg-[#b42318] animate-ping" />
                          🔴 {t.voice.recordingPrompt}
                        </span>
                      ) : isTranscribing ? (
                        <span className="text-[#28623c]">
                          ⏳ {t.voice.extractingAudio}
                        </span>
                      ) : (
                        <span>🎤 {t.voice.badge}</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-[#556458]">
                      {isListening
                        ? `${t.voice.listeningPrompt} (${Math.floor(recordingDuration / 60)
                            .toString()
                            .padStart(2, "0")}:${(recordingDuration % 60)
                            .toString()
                            .padStart(2, "0")})`
                        : extractedAudioUrl
                        ? t.voice.listenRecording
                        : t.voice.startPrompt}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isListening && (
                      <div className="flex items-center gap-1 h-6 mr-2">
                        {[0.4, 0.8, 1.0, 0.7, 0.9, 0.5].map((factor, i) => (
                          <span
                            key={i}
                            className="w-1.5 bg-[#b42318] rounded-full transition-all duration-75"
                            style={{
                              height: `${Math.max(4, Math.min(24, audioVolume * factor * 0.7))}px`,
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {!isListening ? (
                      <button
                        type="button"
                        onClick={startSpeaking}
                        disabled={isTranscribing}
                        className="rounded-xl bg-[#173f2a] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0f2a1c] transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        🎙 {t.voice.badge}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopSpeaking}
                        className="rounded-xl bg-[#b42318] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#8e1b12] transition flex items-center gap-1.5 animate-pulse"
                      >
                        ⏹ {t.voice.stopRecordingBtn}
                      </button>
                    )}
                  </div>
                </div>

                {/* LIVE SPEECH TRANSCRIPT PREVIEW */}
                {isListening && liveTranscript && (
                  <div className="rounded-xl border border-[#cbe4d1] bg-[#eef7f0] p-3 text-xs text-[#173f2a] flex items-start gap-2 animate-pulse">
                    <span className="font-bold text-[#28623c] shrink-0">🎙️ Hearing:</span>
                    <span className="font-medium italic">{liveTranscript}</span>
                  </div>
                )}

                {speechError && (
                  <div className="rounded-lg border border-[#f5c6cb] bg-[#fbeae8] p-2.5 text-xs text-[#a33227]">
                    ⚠ {speechError}
                  </div>
                )}

                {/* EXTRACTED AUDIO PLAYER */}
                {extractedAudioUrl && (
                  <div className="rounded-xl border border-[#cfe0d1] bg-[#edf5ee] p-3">
                    <div className="flex items-center justify-between text-xs font-bold text-[#173f2a] mb-2">
                      <span className="flex items-center gap-1.5">
                        <span>🔊</span> {t.voice.audioExtractedTitle}
                      </span>
                      <button
                        type="button"
                        onClick={startSpeaking}
                        className="text-[11px] text-[#28623c] font-semibold hover:underline"
                      >
                        🔄 {t.voice.reRecordBtn}
                      </button>
                    </div>
                    <audio controls src={extractedAudioUrl} className="w-full h-8" />
                  </div>
                )}

                {/* TRANSLATION FORMAT CHOOSER */}
                {originalTranscript &&
                  translatedTranscript &&
                  originalTranscript.toLowerCase() !==
                    translatedTranscript.toLowerCase() && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#e2eae2]">
                      <span className="text-xs font-bold text-[#173f2a]">
                        Format text as:
                      </span>
                      <button
                        type="button"
                        onClick={() => applyTranslationChoice("combined")}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                          translationPreference === "combined"
                            ? "bg-[#173f2a] text-white"
                            : "bg-white border border-[#cbd8cd] text-[#173f2a]"
                        }`}
                      >
                        {t.voice.useBothBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTranslationChoice("original")}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                          translationPreference === "original"
                            ? "bg-[#173f2a] text-white"
                            : "bg-white border border-[#cbd8cd] text-[#173f2a]"
                        }`}
                      >
                        {t.voice.useOriginalBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTranslationChoice("translated")}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                          translationPreference === "translated"
                            ? "bg-[#173f2a] text-white"
                            : "bg-white border border-[#cbd8cd] text-[#173f2a]"
                        }`}
                      >
                        {t.voice.useTranslatedBtn}
                      </button>
                    </div>
                  )}

                {/* ODIA CIVIC ISSUE QUICK SELECTOR */}
                {(voiceLanguage.startsWith("or") || language === "or") && (
                  <div className="mt-2 rounded-xl border border-[#cfe0d1] bg-white p-3">
                    <p className="text-[11px] font-bold text-[#173f2a] flex items-center gap-1.5 mb-2">
                      <span>✨</span> ଓଡ଼ିଆ ସମସ୍ୟା ଶୀଘ୍ର ଚୟନ (Quick Odia Issue Selection):
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {ODIA_GRIEVANCE_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => {
                            setOriginalTranscript(tpl.odiaText);
                            setTranslatedTranscript(tpl.englishTranslation);
                            let text = "";
                            if (translationPreference === "combined") {
                              text = `[Odia]: ${tpl.odiaText}\n[English Translation]: ${tpl.englishTranslation}`;
                            } else if (translationPreference === "translated") {
                              text = tpl.englishTranslation;
                            } else {
                              text = tpl.odiaText;
                            }
                            setForm((prev) => ({ ...prev, issue: text }));
                            setErrors((prev) => ({ ...prev, issue: "" }));
                          }}
                          className="flex flex-col items-start p-2.5 rounded-lg border border-[#cbd8cd] bg-[#f8faf5] hover:border-[#28623c] hover:bg-[#edf5ee] transition text-left group"
                        >
                          <span className="text-base">{tpl.icon}</span>
                          <span className="mt-1 text-xs font-bold text-[#173f2a] group-hover:text-[#28623c] leading-tight">
                            {tpl.label}
                          </span>
                          <span className="text-[10px] text-[#556458] truncate w-full">
                            {tpl.sublabel}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* LIVE TRANSCRIPTION */}
              {isListening && liveTranscript && (
                <div className="mb-3 rounded-xl border border-[#28623c]/30 bg-[#edf5ee] p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#28623c]">
                    Live Speech Transcription
                  </span>
                  <p className="mt-1 text-xs leading-relaxed text-[#173f2a]">
                    {liveTranscript}
                  </p>
                </div>
              )}

              <textarea
                value={form.issue}
                onChange={(e) => handleInputChange("issue", e.target.value)}
                placeholder={t.citizenForm.issuePlaceholder}
                rows={6}
                className={`w-full resize-none rounded-xl border bg-white p-4 text-sm leading-relaxed outline-none transition ${
                  errors.issue ? "border-red-400" : "border-[#d5ded6] focus:border-[#28623c]"
                }`}
              />

              <div className="mt-1.5 flex justify-between text-xs text-[#556458]">
                <span>Type or speak in your chosen language</span>
                <span>{form.issue.length} chars</span>
              </div>

              {errors.issue && (
                <p className="mt-1.5 text-xs font-semibold text-red-600">⚠ {errors.issue}</p>
              )}
            </div>

            {/* PHOTOS */}
            <div>
              <label className="text-sm font-bold text-[#173f2a] block">
                📷 {t.citizenForm.photosLabel}
              </label>
              <p className="mt-0.5 text-xs text-[#556458]">{t.citizenForm.photosDesc}</p>

              <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#cbd8cd] bg-[#f8faf5] p-6 text-center transition hover:border-[#28623c]">
                <span className="text-3xl">📷</span>
                <span className="mt-2 text-sm font-bold text-[#173f2a]">{t.citizenForm.uploadPrompt}</span>
                <span className="mt-0.5 text-xs text-[#556458]">JPG, PNG, WEBP</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>

              {photoPreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photoPreviews.map((preview, index) => (
                    <div key={preview} className="relative overflow-hidden rounded-xl border border-[#d5ded6]">
                      <img src={preview} alt={`Evidence ${index + 1}`} className="h-28 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute right-2 top-2 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* GPS LOCATION STATUS */}
            <div className="rounded-2xl border border-[#e2e8df] bg-[#f8faf5] p-4 text-xs">
              <div className="flex gap-3">
                <span className="text-lg">📍</span>
                <div>
                  <p className="font-bold text-[#173f2a]">{t.citizenForm.gpsLabel}</p>
                  <p className="mt-0.5 text-[#556458] leading-relaxed">
                    Browser coordinates are captured for transparent spatial prioritization on the constituency dashboard.
                  </p>
                  {locationCaptureStatus === "captured" && (
                    <p className="mt-1.5 font-bold text-[#28623c]">✓ {locationCaptureMessage}</p>
                  )}
                  {locationCaptureStatus === "requesting" && (
                    <p className="mt-1.5 font-bold text-[#28623c]">⏳ {locationCaptureMessage}</p>
                  )}
                  {locationCaptureStatus === "denied" && (
                    <p className="mt-1.5 font-bold text-[#9a3412]">⚠ {locationCaptureMessage}</p>
                  )}
                </div>
              </div>
            </div>

            {/* SPEECH ERRORS */}
            {speechError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                ⚠ {speechError}
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={pincodeChecking || !verifiedLocation || !localityVerified}
              className={`w-full rounded-xl px-6 py-4 text-sm font-bold text-white shadow transition ${
                pincodeChecking || !verifiedLocation || !localityVerified
                  ? "cursor-not-allowed bg-[#9db5a5]"
                  : "bg-[#173f2a] hover:bg-[#0f2a1c]"
              }`}
            >
              {pincodeChecking
                ? t.citizenForm.pincodeChecking
                : !verifiedLocation
                ? t.citizenForm.pincodeError
                : !localityVerified
                ? t.citizenForm.villageError
                : `${t.citizenForm.submitBtn} →`}
            </button>

            <p className="text-center text-xs leading-relaxed text-[#556458]">
              {t.citizenForm.locVerifyDesc}
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}