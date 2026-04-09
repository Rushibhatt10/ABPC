import { useCallback, useRef, useState } from "react";

/**
 * In-browser voice recording via MediaRecorder API.
 * Returns a .webm blob when stopped.
 */
export function useVoiceRecorder() {
  const [state, setState] = useState("idle"); // idle | requesting | recording | stopped | error
  const [blob, setBlob] = useState(null);
  const [duration, setDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const start = useCallback(async () => {
    setBlob(null);
    setDuration(0);
    setErrorMsg("");
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"]
        .find((m) => MediaRecorder.isTypeSupported(m)) || "";

      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
      mediaRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const recorded = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        setBlob(recorded);
        setState("stopped");
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };

      recorder.start(250);
      setState("recording");

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      setErrorMsg(err?.message || "Microphone access denied.");
      setState("error");
    }
  }, []);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    if (mediaRef.current && mediaRef.current.state === "recording") {
      mediaRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    clearInterval(timerRef.current);
    if (mediaRef.current && mediaRef.current.state === "recording") {
      mediaRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setBlob(null);
    setDuration(0);
    setErrorMsg("");
    setState("idle");
  }, []);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return { state, blob, duration, durationFmt: fmt(duration), errorMsg, start, stop, reset };
}
