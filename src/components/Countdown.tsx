import { useEffect, useState } from "react";

// 0h ngày 20/10 giờ Việt Nam
const target = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const t = Date.UTC(year, 9, 19, 17, 0, 0);
  // sau ngày 20/10 thì đếm tới năm sau
  return now.getTime() > t + 86_400_000 ? Date.UTC(year + 1, 9, 19, 17, 0, 0) : t;
};

export function Countdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = target() - now;
  if (diff <= 0) return <div className="countdown today">🎉 Hôm nay là 20/10 – Chúc mừng chị em! 🎉</div>;
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff / 3_600_000) % 24);
  const m = Math.floor((diff / 60_000) % 60);
  const s = Math.floor((diff / 1000) % 60);
  return (
    <div className="countdown" aria-label="Đếm ngược tới 20/10">
      {[
        [d, "ngày"],
        [h, "giờ"],
        [m, "phút"],
        [s, "giây"],
      ].map(([v, l]) => (
        <div key={l} className="cd-cell">
          <b>{String(v).padStart(2, "0")}</b>
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
}
