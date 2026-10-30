export const ONLINE_PROTOCOL_VERSION = 1;
export const ONLINE_MESSAGE_TYPES = Object.freeze([
  "hello", "ready", "team", "battle-start", "action", "state", "result", "leave", "ping", "pong"
]);

const MAX_PACKET_LENGTH = 256_000;

export function createOnlinePacket(type, payload = {}, sequence = 0) {
  if (!ONLINE_MESSAGE_TYPES.includes(type)) throw new TypeError("未対応の通信メッセージです");
  if (!Number.isSafeInteger(sequence) || sequence < 0) throw new TypeError("sequenceが不正です");
  return {
    protocol: ONLINE_PROTOCOL_VERSION,
    type,
    sequence,
    sentAt: Date.now(),
    payload
  };
}

export function validateOnlinePacket(packet) {
  if (!packet || typeof packet !== "object" || Array.isArray(packet)) return { ok: false, reason: "shape" };
  if (packet.protocol !== ONLINE_PROTOCOL_VERSION) return { ok: false, reason: "version" };
  if (!ONLINE_MESSAGE_TYPES.includes(packet.type)) return { ok: false, reason: "type" };
  if (!Number.isSafeInteger(packet.sequence) || packet.sequence < 0) return { ok: false, reason: "sequence" };
  if (!packet.payload || typeof packet.payload !== "object" || Array.isArray(packet.payload)) return { ok: false, reason: "payload" };
  try {
    if (JSON.stringify(packet).length > MAX_PACKET_LENGTH) return { ok: false, reason: "size" };
  } catch {
    return { ok: false, reason: "serialize" };
  }
  return { ok: true, packet };
}

export function createSequenceGuard() {
  let lastSequence = -1;
  return packet => {
    const result = validateOnlinePacket(packet);
    if (!result.ok) return result;
    if (packet.sequence <= lastSequence) return { ok: false, reason: "duplicate-or-old" };
    lastSequence = packet.sequence;
    return { ok: true, packet };
  };
}
