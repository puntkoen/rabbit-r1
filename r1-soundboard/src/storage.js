const INDEX_KEY = "r1-soundboard:index:v1";
const CLIP_PREFIX = "r1-soundboard:clip:v1:";

function encode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function decode(value) {
  const binary = atob(value);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

function fallback() {
  return {
    async setItem(key, value) { localStorage.setItem(key, value); },
    async getItem(key) { return localStorage.getItem(key); },
    async removeItem(key) { localStorage.removeItem(key); }
  };
}

function driver() { return window.creationStorage?.plain || fallback(); }

async function readJson(key, fallbackValue) {
  const stored = await driver().getItem(key);
  if (!stored) return fallbackValue;
  try { return JSON.parse(decode(stored)); } catch { return fallbackValue; }
}

async function writeJson(key, value) {
  await driver().setItem(key, encode(JSON.stringify(value)));
}

export const soundStore = {
  async loadSlots(fallbackSlots) {
    const stored = await readJson(INDEX_KEY, null);
    if (!Array.isArray(stored) || stored.length !== fallbackSlots.length) return fallbackSlots;
    return stored;
  },
  async saveSlots(slots) { await writeJson(INDEX_KEY, slots); },
  async loadClip(index) { return readJson(`${CLIP_PREFIX}${index}`, null); },
  async saveClip(index, clip) { await writeJson(`${CLIP_PREFIX}${index}`, clip); },
  async removeClip(index) { await driver().removeItem(`${CLIP_PREFIX}${index}`); }
};
