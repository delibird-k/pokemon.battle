const STORAGE_VERSION = 1;
const DEFAULT_KEY = "pokemon-battle-v2";

function getStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function normalizeSnapshot(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("保存データはオブジェクトである必要があります");
  }
  const settings = value.settings && typeof value.settings === "object" ? value.settings : {};
  const records = value.records && typeof value.records === "object" ? value.records : {};
  const history = Array.isArray(records.history) ? records.history.slice(-30) : [];
  return {
    version: STORAGE_VERSION,
    settings: { ...settings },
    records: {
      rating: Number.isFinite(Number(records.rating)) ? Math.max(1, Number(records.rating)) : 1,
      wins: Number.isFinite(Number(records.wins)) ? Math.max(0, Number(records.wins)) : 0,
      losses: Number.isFinite(Number(records.losses)) ? Math.max(0, Number(records.losses)) : 0,
      winStreak: Number.isFinite(Number(records.winStreak)) ? Math.max(0, Number(records.winStreak)) : 0,
      loseStreak: Number.isFinite(Number(records.loseStreak)) ? Math.max(0, Number(records.loseStreak)) : 0,
      history
    }
  };
}

export function saveSnapshot(snapshot, { storage, key = DEFAULT_KEY } = {}) {
  const target = getStorage(storage);
  if (!target) return { ok: false, reason: "unavailable" };
  try {
    const normalized = normalizeSnapshot(snapshot);
    target.setItem(key, JSON.stringify(normalized));
    return { ok: true, value: normalized };
  } catch (error) {
    return { ok: false, reason: error?.name === "QuotaExceededError" ? "quota" : "write", error };
  }
}

export function loadSnapshot({ storage, key = DEFAULT_KEY } = {}) {
  const target = getStorage(storage);
  if (!target) return { ok: false, reason: "unavailable", value: null };
  try {
    const raw = target.getItem(key);
    if (raw == null) return { ok: true, reason: "empty", value: null };
    const parsed = JSON.parse(raw);
    if (parsed.version !== STORAGE_VERSION) {
      return { ok: false, reason: "version", value: null };
    }
    return { ok: true, reason: "loaded", value: normalizeSnapshot(parsed) };
  } catch (error) {
    return { ok: false, reason: "corrupt", value: null, error };
  }
}

export function clearSnapshot({ storage, key = DEFAULT_KEY } = {}) {
  const target = getStorage(storage);
  if (!target) return { ok: false, reason: "unavailable" };
  try {
    target.removeItem(key);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "remove", error };
  }
}
