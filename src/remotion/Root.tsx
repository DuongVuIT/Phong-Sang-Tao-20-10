import { Composition } from "remotion";
import { WISH_DURATION, WISH_FPS, WishVideo, type WishVideoProps } from "./WishVideo";

// Props mẫu cho Remotion Studio – nội dung thật được truyền vào lúc `npm run seal`
const sample: WishVideoProps = {
  name: "chị em",
  wishes: ["Chúc 20/10 thật rạng rỡ,", "luôn xinh đẹp, yêu đời,", "công việc thuận lợi,", "và hạnh phúc ngập tràn! 🌹"],
  color: "#ff4d79",
  amount: "",
  flowerEmoji: "🌹",
  ticker: ["Chúc mừng 20/10! 💐", "Luôn xinh đẹp, rạng rỡ ✨", "Mãi là những bông hoa đẹp nhất 🌸"],
  team: "Phòng Sáng Tạo",
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="wish"
    component={WishVideo}
    durationInFrames={WISH_DURATION}
    fps={WISH_FPS}
    width={1080}
    height={1920}
    defaultProps={sample}
  />
);
