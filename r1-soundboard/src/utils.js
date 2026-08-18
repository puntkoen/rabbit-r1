export function defaultSlots(count) {
  return Array.from({ length: count }, (_, index) => ({
    index,
    name: `Geluid ${index + 1}`,
    duration: 0,
    mimeType: "",
    size: 0,
    hasClip: false
  }));
}

export function formatDuration(seconds) {
  return `${Math.max(0, seconds).toFixed(1)} s`;
}

export function extensionForMime(mimeType) {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

export function safeFilename(name) {
  return name.trim().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "r1-geluid";
}

export function pickRecordingMime(MediaRecorderClass) {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((type) => MediaRecorderClass.isTypeSupported?.(type)) || "";
}
