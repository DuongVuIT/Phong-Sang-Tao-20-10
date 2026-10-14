/**
 * Mở bao lì xì đã mã hoá (AES-256-GCM).
 *
 * - Mỗi người có khoá 32 byte riêng = HMAC-SHA256(master, "lixi-member:<i>").
 * - File public/sealed/<slot>.json, slot = SHA-256("slot:" + khoá) – không lộ tên.
 * - Khoá chỉ nằm trong link bot Telegram gửi riêng (#k=...), không bao giờ gửi lên server.
 */
import type { Gift } from "../config/members";

const BASE = import.meta.env.BASE_URL;
const enc = new TextEncoder();

export const b64urlToBytes = (s: string) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};
export const bytesToB64url = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function slotOf(key: Uint8Array) {
  const data = new Uint8Array([...enc.encode("slot:"), ...key]);
  return hex(await crypto.subtle.digest("SHA-256", data)).slice(0, 24);
}

async function aesKey(key: Uint8Array) {
  return crypto.subtle.importKey("raw", key as BufferSource, "AES-GCM", false, ["decrypt"]);
}

async function decrypt(key: Uint8Array, iv: Uint8Array, ct: Uint8Array) {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, await aesKey(key), ct as BufferSource);
}

/** Giải mã nội dung bao lì xì; trả null nếu khoá sai. */
export async function openGift(key: Uint8Array): Promise<Gift | null> {
  if (key.length !== 32) return null;
  try {
    const res = await fetch(`${BASE}sealed/${await slotOf(key)}.json`, { cache: "no-cache" });
    if (!res.ok) return null;
    const { iv, ct } = (await res.json()) as { iv: string; ct: string };
    const plain = await decrypt(key, b64urlToBytes(iv), b64urlToBytes(ct));
    return JSON.parse(new TextDecoder().decode(plain)) as Gift;
  } catch {
    return null;
  }
}

/** Giải mã video MP4 riêng → object URL để phát / tải về. */
export async function openVideo(key: Uint8Array): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}sealed/${await slotOf(key)}.bin`);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const plain = await decrypt(key, buf.slice(0, 12), buf.slice(12));
    return URL.createObjectURL(new Blob([plain], { type: "video/mp4" }));
  } catch {
    return null;
  }
}

/** Khoá admin (master) → khoá của từng người. */
export async function memberKeysFromMaster(master: Uint8Array): Promise<Uint8Array[]> {
  const res = await fetch(`${BASE}sealed/index.json`, { cache: "no-cache" });
  const { count } = (await res.json()) as { count: number };
  const hmac = await crypto.subtle.importKey("raw", master as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const keys: Uint8Array[] = [];
  for (let i = 1; i <= count; i++) keys.push(new Uint8Array(await crypto.subtle.sign("HMAC", hmac, enc.encode(`lixi-member:${i}`))));
  return keys;
}
