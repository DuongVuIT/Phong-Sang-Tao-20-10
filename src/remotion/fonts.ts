import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/dancing-script/700.css";
import { continueRender, delayRender } from "remotion";

export const scriptFont = "'Dancing Script', cursive";
export const sansFont = "'Be Vietnam Pro', system-ui, sans-serif";

// Font được đóng gói cùng bundle (không phụ thuộc Google Fonts lúc render)
if (typeof document !== "undefined") {
  const handle = delayRender("Tải font tiếng Việt");
  Promise.all([
    document.fonts.load("700 40px 'Dancing Script'", "Chúc mừng"),
    document.fonts.load("400 40px 'Be Vietnam Pro'", "Chúc mừng"),
    document.fonts.load("700 40px 'Be Vietnam Pro'", "Chúc mừng"),
  ]).finally(() => continueRender(handle));
}
