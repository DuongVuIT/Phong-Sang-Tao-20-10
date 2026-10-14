import { Player } from "@remotion/player";
import { useEffect } from "react";
import type { Gift } from "../config/members";
import { buildWishProps } from "../remotion/props";
import { WISH_DURATION, WISH_FPS, WishVideo } from "../remotion/WishVideo";

const MODEL_URL = `${import.meta.env.BASE_URL}models/rose.glb`;

/** Video lời chúc Remotion phát ngay trong trình duyệt + dải lời chúc chạy ngang màn hình. */
export function WishOverlay({ gift, onClose }: { gift: Gift; onClose: () => void }) {
  const { member, sharedWishes: SHARED_WISHES } = gift;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay" role="dialog" aria-label={`Lời chúc gửi ${member.name}`}>
      <div className="marquee top" aria-hidden>
        <div>{[...member.wishes, ...SHARED_WISHES].join("  💐  ")}  💐  {[...member.wishes, ...SHARED_WISHES].join("  💐  ")}</div>
      </div>
      <div className="player-wrap">
        <Player
          component={WishVideo}
          inputProps={buildWishProps(gift, MODEL_URL)}
          durationInFrames={WISH_DURATION}
          fps={WISH_FPS}
          compositionWidth={1080}
          compositionHeight={1920}
          style={{ width: "100%", height: "100%" }}
          autoPlay
          loop
          controls
          clickToPlay={false}
          acknowledgeRemotionLicense
        />
      </div>
      <div className="marquee bottom" aria-hidden>
        <div>{[...SHARED_WISHES].reverse().join("  ✨  ")}  ✨  {[...SHARED_WISHES].reverse().join("  ✨  ")}</div>
      </div>
      <button className="btn close" onClick={onClose}>
        Đóng ✕
      </button>
    </div>
  );
}
