/**
 * Phiên đăng nhập: link riêng từ bot Telegram mang khoá giải mã trong phần #.
 *   #k=<khoá>  → một chị em
 *   #m=<master> → người tặng (admin), xem thử được tất cả
 * Phần # không bao giờ được trình duyệt gửi lên server.
 */

export type Session = { kind: "member"; key: string } | { kind: "admin"; master: string };

const KEY = "chiem2010.session";

export const TELEGRAM_BOT = __TG_BOT__;

/** Đọc khoá từ link (nếu có) rồi xoá khỏi thanh địa chỉ. */
export function takeSessionFromUrl(): Session | null {
  const params = new URLSearchParams(location.hash.slice(1));
  const k = params.get("k");
  const m = params.get("m");
  if (!k && !m) return null;
  history.replaceState(null, "", location.pathname + location.search);
  return m ? { kind: "admin", master: m } : { kind: "member", key: k! };
}

/** Cho phép dán cả link lẫn mã vào ô nhập. */
export function parseSessionInput(input: string): Session | null {
  const s = input.trim();
  const hash = s.includes("#") ? s.slice(s.indexOf("#") + 1) : "";
  const params = new URLSearchParams(hash);
  if (params.get("m")) return { kind: "admin", master: params.get("m")! };
  if (params.get("k")) return { kind: "member", key: params.get("k")! };
  return /^[A-Za-z0-9_-]{40,}$/.test(s) ? { kind: "member", key: s } : null;
}

export function loadSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null") as Session | null;
  } catch {
    return null;
  }
}

export function saveSession(s: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode – phiên chỉ sống trong tab */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

const openedKey = (id: string) => `chiem2010.opened.${id}`;
export const hasOpened = (id: string) => {
  try {
    return localStorage.getItem(openedKey(id)) === "1";
  } catch {
    return false;
  }
};
export const markOpened = (id: string) => {
  try {
    localStorage.setItem(openedKey(id), "1");
  } catch {
    /* ignore */
  }
};
