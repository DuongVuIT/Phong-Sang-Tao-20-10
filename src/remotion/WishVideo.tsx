import { AbsoluteFill, Easing, interpolate, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { sansFont, scriptFont } from "./fonts";
import { Rose3D } from "./Rose3D";

export type WishVideoProps = {
  name: string;
  wishes: string[];
  color: string;
  amount: string;
  flowerEmoji: string;
  ticker: string[];
  team: string;
  /** URL của rose.glb – bỏ trống khi render (dùng staticFile), BASE_URL khi chạy trong web. */
  modelUrl?: string;
};

export const WISH_FPS = 30;
export const WISH_DURATION = 16 * WISH_FPS;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const GOLD = "linear-gradient(180deg,#fff6d5 0%,#ffd36e 45%,#e7a326 70%,#fff1b8 100%)";

const Background: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const hue = Math.sin(frame / 90) * 6;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 80% at 50% ${30 + Math.sin(frame / 70) * 6}%, ${color}55 0%, #5b0f2e 45%, #22051a 100%)`,
        filter: `hue-rotate(${hue}deg)`,
      }}
    >
      {new Array(46).fill(0).map((_, i) => {
        const x = random(`bx${i}`) * width;
        const speed = 0.4 + random(`bs${i}`) * 1.2;
        const y = (((random(`by${i}`) * height - frame * speed) % height) + height) % height;
        const r = 4 + random(`br${i}`) * 16;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(frame / (12 + random(`bt${i}`) * 20) + i));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: r,
              height: r,
              borderRadius: "50%",
              background: i % 3 ? "#ffe9a8" : "#ffb3c8",
              opacity: tw * 0.75,
              boxShadow: `0 0 ${r * 2}px ${r / 2}px ${i % 3 ? "#ffd36e" : "#ff6f9c"}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Petals: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {new Array(28).fill(0).map((_, i) => {
        const fall = 2 + random(`pf${i}`) * 3;
        const y = ((random(`py${i}`) * height * 1.2 + frame * fall) % (height * 1.2)) - height * 0.1;
        const x = random(`px${i}`) * width + Math.sin(frame / 25 + i) * 50;
        const size = 26 + random(`ps${i}`) * 34;
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 40 40"
            style={{ position: "absolute", left: x, top: y, rotate: `${frame * (1 + (i % 3)) + i * 40}deg`, opacity: 0.85 }}
          >
            <path d="M20 2 C34 10 36 28 20 38 C4 28 6 10 20 2Z" fill={i % 2 ? "#ff7aa2" : "#ffc2d4"} />
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};

const Title: React.FC<{ name: string }> = ({ name }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 8, fps, config: { damping: 12, mass: 0.8 } });
  const letters = "20 · 10".split("");
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 170 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {letters.map((ch, i) => {
          const s = spring({ frame: frame - 6 - i * 4, fps, config: { damping: 10 } });
          return (
            <span
              key={i}
              style={{
                fontFamily: sansFont,
                fontWeight: 700,
                fontSize: 230,
                lineHeight: 1,
                background: GOLD,
                WebkitBackgroundClip: "text",
                color: "transparent",
                filter: "drop-shadow(0 8px 30px rgba(255,190,80,.55))",
                translate: `0px ${(1 - s) * 140}px`,
                opacity: s,
                whiteSpace: "pre",
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
      <div
        style={{
          fontFamily: sansFont,
          fontSize: 44,
          letterSpacing: 6,
          textTransform: "uppercase",
          color: "#ffe6ef",
          marginTop: 20,
          opacity: interpolate(frame, [30, 55], [0, 1], clamp),
          scale: String(0.9 + 0.1 * pop),
        }}
      >
        Ngày Phụ nữ Việt Nam
      </div>
      <div
        style={{
          fontFamily: scriptFont,
          fontSize: 120,
          color: "#fff",
          marginTop: 50,
          textShadow: "0 0 40px rgba(255,120,170,.9)",
          opacity: interpolate(frame, [60, 85], [0, 1], clamp),
          translate: `0px ${interpolate(frame, [60, 95], [40, 0], { ...clamp, easing: Easing.out(Easing.cubic) })}px`,
        }}
      >
        Gửi {name}
      </div>
    </AbsoluteFill>
  );
};

const WishLines: React.FC<{ wishes: string[]; color: string }> = ({ wishes, color }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 740, padding: "0 40px" }}>
      <div
        style={{
          background: "rgba(255,255,255,.1)",
          border: "2px solid rgba(255,214,140,.55)",
          borderRadius: 48,
          padding: "44px 40px",
          backdropFilter: "blur(10px)",
          boxShadow: `0 20px 80px ${color}55`,
          opacity: interpolate(frame, [0, 20], [0, 1], clamp),
          scale: String(interpolate(frame, [0, 25], [0.92, 1], { ...clamp, easing: Easing.out(Easing.back(1.5)) })),
        }}
      >
        {wishes.map((line, i) => {
          const start = 15 + i * 38;
          const shown = Math.floor(interpolate(frame, [start, start + 32], [0, line.length], clamp));
          return (
            <div
              key={i}
              style={{
                fontFamily: sansFont,
                fontSize: 40,
                lineHeight: 1.5,
                color: "#fff8f0",
                textAlign: "center",
                minHeight: 64,
                opacity: interpolate(frame, [start, start + 8], [0, 1], clamp),
              }}
            >
              {line.slice(0, shown)}
              {shown < line.length && frame >= start ? <span style={{ color: "#ffd36e" }}>▍</span> : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Ticker: React.FC<{ items: string[] }> = ({ items }) => {
  const frame = useCurrentFrame();
  const text = items.join("   ✦   ");
  return (
    <AbsoluteFill style={{ top: "auto", bottom: 70, height: 90, overflow: "hidden", justifyContent: "center" }}>
      <div
        style={{
          whiteSpace: "nowrap",
          fontFamily: sansFont,
          fontSize: 40,
          color: "#ffe6a8",
          translate: `${1080 - frame * 7}px 0px`,
          textShadow: "0 0 20px rgba(255,200,100,.7)",
        }}
      >
        {text}   ✦   {text}
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ amount: string; team: string; emoji: string }> = ({ amount, team, emoji }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 9 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 760, background: `rgba(34,5,26,${interpolate(frame, [0, 15], [0, 0.35], clamp)})` }}>
      <div style={{ fontSize: 170, scale: String(s), rotate: `${(1 - s) * -30}deg` }}>🧧</div>
      <div
        style={{
          fontFamily: sansFont,
          fontWeight: 700,
          fontSize: 120,
          background: GOLD,
          WebkitBackgroundClip: "text",
          color: "transparent",
          scale: String(0.6 + 0.4 * s),
          filter: "drop-shadow(0 6px 26px rgba(255,190,80,.6))",
        }}
      >
        {amount}
      </div>
      <div
        style={{
          fontFamily: scriptFont,
          fontSize: 84,
          color: "#fff",
          marginTop: 20,
          opacity: interpolate(frame, [20, 40], [0, 1], clamp),
          textShadow: "0 0 30px rgba(255,120,170,.9)",
        }}
      >
        {team} yêu chị em {emoji}
      </div>
    </AbsoluteFill>
  );
};

export const WishVideo: React.FC<WishVideoProps> = ({ name, wishes, color, amount, flowerEmoji, ticker, team, modelUrl }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#22051a", overflow: "hidden" }}>
      <Background color={color} />
      <Rose3D modelUrl={modelUrl ?? staticFile("models/rose.glb")} />
      <Petals />
      <Title name={name} />
      <Sequence from={4 * fps} durationInFrames={8 * fps} layout="absolute-fill">
        <WishLines wishes={wishes} color={color} />
      </Sequence>
      <Sequence from={12 * fps} layout="absolute-fill">
        <Outro amount={amount} team={team} emoji={flowerEmoji} />
      </Sequence>
      <Ticker items={ticker} />
    </AbsoluteFill>
  );
};
