import test from "node:test";
import assert from "node:assert/strict";
import { saveSnapshot, loadSnapshot, clearSnapshot } from "../src/storage/persistence.js";
import { createOnlinePacket, validateOnlinePacket, createSequenceGuard } from "../src/online/protocol.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
}

test("保存データを正規化して読み戻す", () => {
  const storage = memoryStorage();
  const saved = saveSnapshot({ settings: { difficulty: "hard" }, records: { rating: 1200, wins: 4, history: Array.from({length: 35}, (_, i) => i) } }, { storage });
  assert.equal(saved.ok, true);
  const loaded = loadSnapshot({ storage });
  assert.equal(loaded.ok, true);
  assert.equal(loaded.value.records.rating, 1200);
  assert.equal(loaded.value.records.history.length, 30);
});

test("壊れたJSONと未知バージョンを安全に拒否する", () => {
  const storage = memoryStorage();
  storage.setItem("pokemon-battle-v2", "{");
  assert.equal(loadSnapshot({ storage }).reason, "corrupt");
  storage.setItem("pokemon-battle-v2", JSON.stringify({ version: 999 }));
  assert.equal(loadSnapshot({ storage }).reason, "version");
});

test("保存領域が使えない場合に例外を外へ投げない", () => {
  const storage = { getItem() { throw new Error("blocked"); } };
  assert.equal(loadSnapshot({ storage }).reason, "corrupt");
});

test("通信パケットの形式・バージョン・サイズを検証する", () => {
  const packet = createOnlinePacket("action", { action: "move", index: 0 }, 1);
  assert.equal(validateOnlinePacket(packet).ok, true);
  assert.equal(validateOnlinePacket({ ...packet, protocol: 99 }).reason, "version");
  assert.equal(validateOnlinePacket({ ...packet, type: "unknown" }).reason, "type");
});

test("通信の重複・古いシーケンスを拒否する", () => {
  const guard = createSequenceGuard();
  assert.equal(guard(createOnlinePacket("ping", {}, 2)).ok, true);
  assert.equal(guard(createOnlinePacket("pong", {}, 2)).reason, "duplicate-or-old");
  assert.equal(guard(createOnlinePacket("ping", {}, 1)).reason, "duplicate-or-old");
});

test("保存データを削除できる", () => {
  const storage = memoryStorage();
  saveSnapshot({ records: {} }, { storage });
  assert.equal(clearSnapshot({ storage }).ok, true);
  assert.equal(loadSnapshot({ storage }).reason, "empty");
});
