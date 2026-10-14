import { useEffect, useState } from "react";
import { GiftScreen } from "./components/GiftScreen";
import { LoginScreen } from "./components/LoginScreen";
import { PetalRain } from "./components/PetalRain";
import type { Gift } from "./config/members";
import { clearSession, loadSession, saveSession, takeSessionFromUrl, type Session } from "./lib/auth";
import { music } from "./lib/music";
import { b64urlToBytes, memberKeysFromMaster, openGift } from "./lib/vault";

type Opened = { gift: Gift; key: Uint8Array };

export function App() {
  const [session, setSession] = useState<Session | null>(() => takeSessionFromUrl() ?? loadSession());
  const [gifts, setGifts] = useState<Opened[] | null>(null);
  const [current, setCurrent] = useState<Opened | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // mở link mới (#k=… / #m=…) khi trang đang mở sẵn
  useEffect(() => {
    const onHash = () => {
      const s = takeSessionFromUrl();
      if (s) {
        setGifts(null);
        setCurrent(null);
        setSession(s);
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const keys = session.kind === "admin" ? await memberKeysFromMaster(b64urlToBytes(session.master)) : [b64urlToBytes(session.key)];
        const opened = (await Promise.all(keys.map(async (key) => ({ key, gift: await openGift(key) })))).filter((o): o is Opened => !!o.gift);
        if (!alive) return;
        if (!opened.length) throw new Error("bad key");
        saveSession(session);
        setError(null);
        setGifts(opened);
        setCurrent(session.kind === "member" ? opened[0] : null);
      } catch {
        if (!alive) return;
        clearSession();
        setSession(null);
        setError("Link không hợp lệ hoặc đã hết hạn 🥺 Mở lại tin nhắn từ bot Telegram nhé!");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [session]);

  const logout = () => {
    music.stop();
    clearSession();
    setSession(null);
    setGifts(null);
    setCurrent(null);
  };

  let body;
  if (!session) body = <LoginScreen onLogin={setSession} error={error} />;
  else if (loading || !gifts) body = <div className="unlocking">🔓 Đang mở khoá…</div>;
  else if (current)
    body = (
      <GiftScreen
        key={current.gift.member.id}
        gift={current.gift}
        giftKey={current.key}
        preview={session.kind === "admin"}
        onBack={session.kind === "admin" ? () => setCurrent(null) : undefined}
        onLogout={logout}
      />
    );
  else
    body = (
      <main className="login">
        <div className="login-card glass admin-pick">
          <p className="eyebrow">Chế độ người tặng</p>
          <h2 className="script big">Xem thử quà của…</h2>
          <div className="chips">
            {gifts.map((o) => (
              <button key={o.gift.member.id} className="btn ghost" onClick={() => setCurrent(o)}>
                {o.gift.member.flower.emoji} {o.gift.member.name}
              </button>
            ))}
          </div>
          <button className="btn ghost" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </main>
    );

  return (
    <>
      <div className="bg-glow" aria-hidden />
      <PetalRain />
      {body}
      <footer className="footer">Làm bằng 💖 · Blender 3D · Remotion · React Three Fiber</footer>
    </>
  );
}
