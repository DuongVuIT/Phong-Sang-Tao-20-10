import { useState } from "react";
import { TEAM_NAME } from "../config/members";
import { parseSessionInput, TELEGRAM_BOT, type Session } from "../lib/auth";
import { Countdown } from "./Countdown";

export function LoginScreen({ onLogin, error }: { onLogin: (s: Session) => void; error: string | null }) {
  const [input, setInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = parseSessionInput(input);
    if (!s) return setLocalError("Link chưa đúng rồi 🙈 Copy lại nguyên link bot gửi nhé!");
    setLocalError(null);
    onLogin(s);
  };

  const shownError = localError ?? error;

  return (
    <main className="login">
      <div className="login-card glass">
        <p className="eyebrow">{TEAM_NAME} · Ngày Phụ nữ Việt Nam</p>
        <h1 className="hero-title">
          <span className="gold">20</span>
          <span className="dot">·</span>
          <span className="gold">10</span>
        </h1>
        <p className="script big">Gửi những bông hoa đẹp nhất văn phòng</p>

        <Countdown />

        <div className="login-box">
          <p className="hint">
            💌 Có một món quà nhỏ đang chờ bạn. Đăng nhập bằng Telegram – bot sẽ gửi <b>link riêng</b> cho bạn.
          </p>

          {TELEGRAM_BOT && (
            <a className="btn tg-btn" href={`https://t.me/${TELEGRAM_BOT}?start=2010`} target="_blank" rel="noreferrer">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
                <path fill="currentColor" d="M9.8 15.6 9.6 19c.4 0 .6-.2.8-.4l2-1.9 4.1 3c.8.4 1.3.2 1.5-.7l2.7-12.7c.3-1.1-.4-1.6-1.1-1.3L3.6 11c-1.1.4-1 1-.2 1.3l4 1.2 9.4-5.9c.4-.3.8-.1.5.2z" />
              </svg>
              Đăng nhập bằng Telegram
            </a>
          )}

          <details className="code-login">
            <summary>Đã có link từ bot? Dán vào đây</summary>
            <form onSubmit={submit}>
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="https://…#k=…" aria-label="Link riêng" autoComplete="off" />
              <button className="btn" disabled={!input.trim()}>
                Mở 🔓
              </button>
            </form>
          </details>

          {shownError && (
            <p className="error" role="alert">
              {shownError}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
