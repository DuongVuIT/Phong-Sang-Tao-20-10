import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { callName, CallName, formatVnd, type Gift } from "../config/members";
import { hasOpened, markOpened } from "../lib/auth";
import { music } from "../lib/music";
import { openVideo } from "../lib/vault";
import { ClaimPanel } from "./ClaimPanel";
import { Fireworks, type FireworksHandle } from "./Fireworks";

const LixiScene = lazy(() => import("./LixiScene").then((m) => ({ default: m.LixiScene })));
const WishOverlay = lazy(() => import("./WishOverlay").then((m) => ({ default: m.WishOverlay })));

type Props = { gift: Gift; giftKey: Uint8Array; preview: boolean; onBack?: () => void; onLogout: () => void };

export function GiftScreen({ gift, giftKey, preview, onBack, onLogout }: Props) {
  const { member, roster, team, amount, total } = gift;
  const [opened, setOpened] = useState(() => !preview && hasOpened(member.id));
  const [showWish, setShowWish] = useState(false);
  const [flowerFlipped, setFlowerFlipped] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const fw = useRef<FireworksHandle>(null);

  // video MP4 render bằng Remotion, được mã hoá – giải mã ngay trong trình duyệt
  useEffect(() => {
    if (!opened || !gift.hasVideo) return;
    let url: string | null = null;
    openVideo(giftKey).then((u) => {
      url = u;
      setVideoUrl(u);
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [opened, gift.hasVideo, giftKey]);

  const toggleMusic = async () => {
    if (music.playing) {
      music.stop();
      setMusicOn(false);
    } else {
      await music.start();
      setMusicOn(true);
    }
  };

  const open = () => {
    setOpened(true);
    if (!preview) markOpened(member.id);
    music.sparkle();
    if (!music.playing) music.start().then(() => setMusicOn(true));
    setTimeout(() => fw.current?.show(8), 500);
    setTimeout(() => setShowWish(true), 2600);
  };

  return (
    <main className="gift">
      <header className="topbar">
        <div className="me">
          <span className="avatar" style={{ background: member.color }}>
            {member.shortName[0]}
          </span>
          <div>
            <small>{preview ? "Xem thử (người tặng)" : "Xin chào"}</small>
            <b>{member.name}</b>
          </div>
        </div>
        <div className="actions">
          {onBack && (
            <button className="icon-btn" onClick={onBack} title="Chọn người khác">
              ←
            </button>
          )}
          <button className="icon-btn" onClick={toggleMusic} aria-pressed={musicOn} title="Nhạc nền">
            {musicOn ? "🔊" : "🔈"}
          </button>
          <button className="icon-btn" onClick={onLogout} title="Đăng xuất">
            ⎋
          </button>
        </div>
      </header>

      <section className="stage">
        <h2 className="script big center">
          {opened ? "Lì xì đã mở! 🎉" : `${CallName(member)} ơi, có lì xì nè!`}
        </h2>
        <div className="scene-box">
          <Suspense fallback={<div className="loading">Đang gói lì xì… 🧧</div>}>
            <LixiScene opened={opened} onOpen={open} name={`${member.honorific} ${member.name}`} amount={formatVnd(amount)} color={member.color} />
          </Suspense>
          {!opened && (
            <button className="btn pulse open-btn" onClick={open}>
              Chạm để mở lì xì 🧧
            </button>
          )}
        </div>
      </section>

      {opened && (
        <section className="panels">
          <div className="panel glass amount">
            <small>Lì xì của {callName(member)}</small>
            <div className="gold huge">{formatVnd(amount)}</div>
            <p>
              Quỹ {formatVnd(total)} chia đều cho {roster.length} chị em {team} 💐
            </p>
            <div className="split" aria-hidden>
              {roster.map((m) => (
                <span key={m.name} className={m.name === member.name ? "me" : ""} style={{ background: m.color }} title={m.name} />
              ))}
            </div>
            <div className="row">
              <button className="btn" onClick={() => setShowWish(true)}>
                ▶ Xem lời chúc
              </button>
              {videoUrl && (
                <a className="btn ghost" href={videoUrl} download="loi-chuc-20-10.mp4">
                  ⬇ Tải video
                </a>
              )}
            </div>
          </div>

          <ClaimPanel member={member} amount={amount} giver={gift.giverTelegram} />

          <button className={`panel glass flower ${flowerFlipped ? "flipped" : ""}`} onClick={() => setFlowerFlipped(true)}>
            {flowerFlipped ? (
              <>
                <small>Bông hoa của {callName(member)}</small>
                <div className="flower-emoji">{member.flower.emoji}</div>
                <b>{member.flower.name}</b>
                <p>{member.flower.meaning}</p>
              </>
            ) : (
              <>
                <small>Bói hoa 20/10</small>
                <div className="flower-emoji">🔮</div>
                <b>Chạm để xem bạn là loài hoa nào</b>
              </>
            )}
          </button>

          <div className="panel glass team">
            <small>Hội chị em {team}</small>
            <ul>
              {roster.map((m) => (
                <li key={m.name} className={m.name === member.name ? "me" : ""}>
                  <span className="avatar sm" style={{ background: m.color }}>
                    {m.shortName[0]}
                  </span>
                  {m.name}
                  <em>{formatVnd(amount)}</em>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <Fireworks ref={fw} />
      {showWish && (
        <Suspense fallback={null}>
          <WishOverlay gift={gift} onClose={() => setShowWish(false)} />
        </Suspense>
      )}
    </main>
  );
}
