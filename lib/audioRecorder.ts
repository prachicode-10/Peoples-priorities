/**
 * Utility for recording and extracting raw audio via MediaRecorder,
 * monitoring audio levels for soundwave visualization,
 * and running concurrent speech recognition for live transcription.
 */

export interface RecordingResult {
  blob: Blob;
  audioUrl: string;
  duration: number; // in seconds
  transcript: string;
  mimeType: string;
}

export interface StartRecordingOptions {
  language?: string;
  onVolumeChange?: (volume: number) => void; // 0 to 100
  onInterimTranscript?: (text: string) => void;
  onError?: (errorMessage: string) => void;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private recognition: any = null;
  private liveTranscript: string = "";
  private startTime: number = 0;
  private isRecordingActive: boolean = false;
  private chosenMimeType: string = "";

  public isRecording(): boolean {
    return this.isRecordingActive;
  }

  public async start(options: StartRecordingOptions = {}): Promise<void> {
    if (typeof window === "undefined") return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = "Microphone access is not supported in this browser.";
      options.onError?.(err);
      throw new Error(err);
    }

    try {
      // 1. Request microphone access with echo cancellation & noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.mediaStream = stream;
      this.audioChunks = [];
      this.liveTranscript = "";
      this.startTime = Date.now();
      this.isRecordingActive = true;

      // 2. Determine best supported audio MIME type
      const possibleTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/aac",
      ];
      this.chosenMimeType =
        possibleTypes.find((type) => {
          try {
            return typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type);
          } catch {
            return false;
          }
        }) || "";

      // 3. Initialize MediaRecorder
      const recorderOptions: MediaRecorderOptions = {};
      if (this.chosenMimeType) {
        recorderOptions.mimeType = this.chosenMimeType;
      }

      this.mediaRecorder = new MediaRecorder(stream, recorderOptions);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Collect audio chunks every 250ms
      this.mediaRecorder.start(250);

      // 4. Setup Web Audio API volume monitoring for soundwave animation
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
          if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
          }

          const source = this.audioContext.createMediaStreamSource(stream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 64;
          this.analyser.smoothingTimeConstant = 0.5;
          source.connect(this.analyser);

          const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

          const checkVolume = () => {
            if (!this.isRecordingActive || !this.analyser) return;

            this.analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            // Normalize roughly from 0 to 100
            const normalized = Math.min(100, Math.round((average / 128) * 100));
            options.onVolumeChange?.(normalized);

            this.animFrameId = requestAnimationFrame(checkVolume);
          };

          checkVolume();
        }
      } catch (audioErr) {
        console.warn("AudioContext visualizer initialization skipped:", audioErr);
      }

      // 5. Concurrently run browser SpeechRecognition (if available) for live transcription
      this.setupLiveSpeechRecognition(options);
    } catch (err: any) {
      this.cleanup();
      let message = "Failed to access microphone.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        message = "Microphone permission denied. Please allow microphone access in your browser settings.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        message = "No microphone found. Please connect an audio input device.";
      } else if (err.message) {
        message = err.message;
      }
      options.onError?.(message);
      throw new Error(message);
    }
  }

  private setupLiveSpeechRecognition(options: StartRecordingOptions) {
    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) return;

      const lang = options.language || "en-IN";
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = lang;

      recognition.onresult = (event: any) => {
        let finalStr = "";
        let interimStr = "";
        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            finalStr += item[0].transcript + " ";
          } else {
            interimStr += item[0].transcript;
          }
        }
        const fullText = (finalStr + interimStr).trim();
        if (fullText) {
          this.liveTranscript = fullText;
          options.onInterimTranscript?.(fullText);
        }
      };

      recognition.onerror = (event: any) => {
        // Soft errors like no-speech should not kill the audio recording
        if (event.error === "no-speech" || event.error === "audio-capture") {
          return;
        }

        // If the browser doesn't have acoustic models for a specific regional language (e.g. Odia on desktop),
        // fallback to en-IN or hi-IN to still capture spoken syllables for backend semantic matching
        if (event.error === "language-not-supported" && lang !== "en-IN") {
          console.warn(
            `[AudioRecorder] ${lang} not supported natively by browser SpeechRecognition, falling back to en-IN...`
          );
          try {
            recognition.lang = "en-IN";
            recognition.start();
            return;
          } catch {}
        }
        console.warn("Browser live recognition error:", event.error);
      };

      recognition.start();
      this.recognition = recognition;
    } catch (e) {
      console.warn("Concurrent SpeechRecognition not available or failed:", e);
    }
  }

  public async stop(): Promise<RecordingResult> {
    if (!this.mediaRecorder || !this.isRecordingActive) {
      throw new Error("No active recording session");
    }

    const duration = Math.max(0.5, (Date.now() - this.startTime) / 1000);
    this.isRecordingActive = false;

    // 1. Gracefully stop SpeechRecognition and wait briefly for final onresult/onend
    if (this.recognition) {
      try {
        await new Promise<void>((resolve) => {
          let finished = false;
          const done = () => {
            if (!finished) {
              finished = true;
              resolve();
            }
          };

          this.recognition.onend = done;
          try {
            this.recognition.stop();
          } catch {
            done();
          }

          // Safety timeout: wait at most 600ms for final words to arrive
          setTimeout(done, 600);
        });
      } catch (e) {
        console.warn("Error finalizing speech recognition:", e);
      }
    }

    // 2. Stop media recorder and retrieve audio blob
    return new Promise((resolve, reject) => {
      const finish = () => {
        try {
          const mimeType = this.chosenMimeType || "audio/webm";
          const blob = new Blob(this.audioChunks, { type: mimeType });
          const audioUrl = URL.createObjectURL(blob);

          const result: RecordingResult = {
            blob,
            audioUrl,
            duration: Math.round(duration * 10) / 10,
            transcript: this.liveTranscript.trim(),
            mimeType,
          };

          this.cleanup();
          resolve(result);
        } catch (e) {
          this.cleanup();
          reject(e);
        }
      };

      if (this.mediaRecorder) {
        if (this.mediaRecorder.state !== "inactive") {
          this.mediaRecorder.onstop = finish;
          try {
            this.mediaRecorder.stop();
          } catch {
            finish();
          }
        } else {
          finish();
        }
      } else {
        finish();
      }
    });
  }

  public cancel(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.isRecordingActive = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
      this.analyser = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      this.mediaStream = null;
    }

    this.recognition = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}

/**
 * Factory helper
 */
export function createAudioRecorder(): AudioRecorder {
  return new AudioRecorder();
}
