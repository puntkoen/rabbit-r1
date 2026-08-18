import { CONFIG } from "../config.js";
import { soundStore } from "./storage.js";
import { defaultSlots, extensionForMime, formatDuration, pickRecordingMime, safeFilename } from "./utils.js";

const byId = (id) => document.getElementById(id);
const elements = {
  slots: byId("slots"), status: byId("status"), record: byId("record"), rename: byId("rename"),
  export: byId("export"), remove: byId("remove"), overlay: byId("recording-overlay"), timer: byId("timer"),
  toast: byId("toast"), renameDialog: byId("rename-dialog"), soundName: byId("sound-name"),
  saveName: byId("save-name"), deleteDialog: byId("delete-dialog"), confirmDelete: byId("confirm-delete")
};

const state = {
  slots: defaultSlots(CONFIG.slotCount), selected: 0, recorder: null, stream: null, chunks: [],
  recordingStarted: 0, timerId: null, stopId: null, audio: null, longPressActive: false
};
let toastId;

function toast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(toastId);
  toastId = setTimeout(() => elements.toast.classList.remove("show"), 1800);
}

function render() {
  elements.slots.replaceChildren(...state.slots.map((slot, index) => {
    const button = document.createElement("button");
    button.className = `slot${index === state.selected ? " selected" : ""}${slot.hasClip ? "" : " empty"}`;
    button.dataset.index = index;
    button.setAttribute("aria-label", `${slot.name}${slot.hasClip ? `, ${formatDuration(slot.duration)}` : ", leeg"}`);
    button.innerHTML = `<b>${slot.name}</b>${slot.hasClip ? '<span class="dot"></span>' : ""}<small>${slot.hasClip ? formatDuration(slot.duration) : "leeg"}</small>`;
    button.addEventListener("click", () => selectSlot(index, slot.hasClip));
    return button;
  }));
  const selected = state.slots[state.selected];
  elements.status.textContent = `${state.selected + 1}/${CONFIG.slotCount} · ${selected.hasClip ? formatDuration(selected.duration) : "leeg"}`;
}

function selectSlot(index, play = false) {
  state.selected = index;
  render();
  if (play) playSelected();
}

function moveSelection(delta) {
  state.selected = (state.selected + delta + state.slots.length) % state.slots.length;
  render();
}

async function playSelected() {
  if (state.recorder?.state === "recording") return;
  const slot = state.slots[state.selected];
  if (!slot.hasClip) return toast("Dit vak is nog leeg");
  const clip = await soundStore.loadClip(state.selected);
  if (!clip?.dataUrl) return toast("Geluid kon niet worden geladen");
  state.audio?.pause();
  document.querySelectorAll(".slot").forEach((button) => button.classList.remove("playing"));
  document.querySelector(`[data-index="${state.selected}"]`)?.classList.add("playing");
  state.audio = new Audio(clip.dataUrl);
  state.audio.addEventListener("ended", () => document.querySelectorAll(".slot").forEach((button) => button.classList.remove("playing")), { once: true });
  try { await state.audio.play(); } catch { toast("Afspelen mislukt"); }
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function startRecording() {
  if (state.recorder?.state === "recording") return;
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    return toast("Opname-API niet beschikbaar");
  }
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
    state.chunks = [];
    const mimeType = pickRecordingMime(MediaRecorder);
    state.recorder = mimeType ? new MediaRecorder(state.stream, { mimeType }) : new MediaRecorder(state.stream);
    state.recorder.addEventListener("dataavailable", (event) => { if (event.data.size) state.chunks.push(event.data); });
    state.recorder.addEventListener("stop", saveRecording, { once: true });
    state.recorder.start(250);
    state.recordingStarted = Date.now();
    elements.overlay.hidden = false;
    elements.record.classList.add("active");
    elements.timer.textContent = "0.0 s";
    state.timerId = setInterval(() => {
      elements.timer.textContent = formatDuration((Date.now() - state.recordingStarted) / 1000);
    }, 100);
    state.stopId = setTimeout(stopRecording, CONFIG.maxDurationSeconds * 1000);
  } catch (error) {
    console.error(error);
    toast(error.name === "NotAllowedError" ? "Microfoontoegang geweigerd" : "Opname kon niet starten");
  }
}

function stopRecording() {
  if (state.recorder?.state === "recording") state.recorder.stop();
}

async function saveRecording() {
  clearInterval(state.timerId);
  clearTimeout(state.stopId);
  elements.overlay.hidden = true;
  elements.record.classList.remove("active");
  state.stream?.getTracks().forEach((track) => track.stop());
  const duration = Math.min(CONFIG.maxDurationSeconds, (Date.now() - state.recordingStarted) / 1000);
  const mimeType = state.recorder.mimeType || state.chunks[0]?.type || "audio/webm";
  const blob = new Blob(state.chunks, { type: mimeType });
  if (!blob.size) return toast("Geen geluid opgenomen");
  if (blob.size > CONFIG.maxClipBytes) return toast("Opname is te groot om lokaal te bewaren");
  try {
    await soundStore.saveClip(state.selected, { dataUrl: await blobToDataUrl(blob), mimeType, size: blob.size });
    Object.assign(state.slots[state.selected], { duration, mimeType, size: blob.size, hasClip: true });
    await soundStore.saveSlots(state.slots);
    render();
    toast("Geluid lokaal opgeslagen");
  } catch (error) {
    console.error(error);
    toast("Opslag vol of niet beschikbaar");
  }
}

function toggleRecording() {
  state.recorder?.state === "recording" ? stopRecording() : startRecording();
}

function openRename() {
  elements.soundName.value = state.slots[state.selected].name;
  elements.renameDialog.showModal();
  elements.soundName.focus();
  elements.soundName.select();
}

async function renameSelected(event) {
  event.preventDefault();
  const name = elements.soundName.value.trim();
  if (!name) return;
  state.slots[state.selected].name = name;
  await soundStore.saveSlots(state.slots);
  elements.renameDialog.close();
  render();
}

async function removeSelected(event) {
  event.preventDefault();
  await soundStore.removeClip(state.selected);
  state.slots[state.selected] = defaultSlots(CONFIG.slotCount)[state.selected];
  await soundStore.saveSlots(state.slots);
  elements.deleteDialog.close();
  render();
  toast("Geluid gewist");
}

async function exportSelected() {
  const slot = state.slots[state.selected];
  if (!slot.hasClip) return toast("Dit vak is leeg");
  const clip = await soundStore.loadClip(state.selected);
  const response = await fetch(clip.dataUrl);
  const blob = await response.blob();
  const filename = `${safeFilename(slot.name)}.${extensionForMime(clip.mimeType)}`;
  const file = new File([blob], filename, { type: clip.mimeType });
  try {
    if (navigator.canShare?.({ files: [file] })) return await navigator.share({ title: slot.name, files: [file] });
    const link = document.createElement("a");
    link.href = clip.dataUrl;
    link.download = filename;
    link.click();
    toast("Download gestart");
  } catch (error) {
    if (error.name !== "AbortError") toast("Export niet ondersteund");
  }
}

function registerEvents() {
  elements.record.addEventListener("click", toggleRecording);
  elements.rename.addEventListener("click", openRename);
  elements.saveName.addEventListener("click", renameSelected);
  elements.remove.addEventListener("click", () => state.slots[state.selected].hasClip ? elements.deleteDialog.showModal() : toast("Dit vak is leeg"));
  elements.confirmDelete.addEventListener("click", removeSelected);
  elements.export.addEventListener("click", exportSelected);
  window.addEventListener("scrollUp", () => moveSelection(-1));
  window.addEventListener("scrollDown", () => moveSelection(1));
  window.addEventListener("sideClick", () => { if (!state.longPressActive) playSelected(); });
  window.addEventListener("longPressStart", () => { state.longPressActive = true; startRecording(); });
  window.addEventListener("longPressEnd", () => {
    stopRecording();
    setTimeout(() => { state.longPressActive = false; }, 250);
  });
}

async function init() {
  registerEvents();
  try { state.slots = await soundStore.loadSlots(defaultSlots(CONFIG.slotCount)); }
  catch (error) { console.error(error); toast("Opgeslagen geluiden konden niet laden"); }
  render();
}

init();
