import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const base = env.BASE_PATH || "/";
  // URL tuyệt đối cho ảnh og:image (preview khi gửi link qua Telegram)
  process.env.VITE_SITE_URL ??= base;

  return {
    base,
    plugins: [react()],
    define: {
      __TG_BOT__: JSON.stringify((env.TELEGRAM_BOT_USERNAME || "phongsangtao2010_bot").replace(/^@/, "")),
    },
    build: {
      chunkSizeWarningLimit: 2000,
    },
  };
});
