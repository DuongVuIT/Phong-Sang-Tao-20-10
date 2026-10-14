/**
 * Bot Telegram gửi link mở lì xì riêng cho từng người (đã bấm START bot).
 *
 *   TELEGRAM_BOT_TOKEN=xxx npm run send-links            # gửi cho tất cả đã có telegramId
 *   TELEGRAM_BOT_TOKEN=xxx npm run send-links -- admin   # chỉ gửi link người tặng
 *   TELEGRAM_BOT_TOKEN=xxx npm run send-links -- ids     # liệt kê ai đã nhắn bot (để lấy ID)
 *
 * telegramId của từng người khai trong private/members.json, chạy `npm run seal` trước.
 */
import { readFileSync } from "node:fs";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("Thiếu TELEGRAM_BOT_TOKEN");
const api = async (method, body) => {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const j = await r.json();
  if (!j.ok) throw new Error(`${method}: ${j.description}`);
  return j.result;
};

const mode = process.argv[2];
if (mode === "ids") {
  const seen = new Map();
  for (const u of await api("getUpdates")) {
    const f = (u.message ?? u.my_chat_member)?.from;
    if (f && !f.is_bot) seen.set(f.id, `${f.id}\t${[f.first_name, f.last_name].filter(Boolean).join(" ")}\t${f.username ? "@" + f.username : "-"}`);
  }
  console.log([...seen.values()].join("\n") || "Chưa ai nhắn bot (Telegram chỉ giữ tin 24h).");
  process.exit(0);
}

const links = JSON.parse(readFileSync(new URL("../private/links.json", import.meta.url), "utf8"));
const data = JSON.parse(readFileSync(new URL("../private/members.json", import.meta.url), "utf8"));

const send = (chatId, text, url, label) =>
  api("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: label, url }]] } });

if (links.adminTelegramId && (mode === "admin" || !mode)) {
  await send(
    links.adminTelegramId,
    "👑 <b>Link người tặng</b>\nXem thử được quà của tất cả mọi người. Đừng chia sẻ link này nhé!",
    links.admin,
    "👑 Mở chế độ người tặng",
  );
  console.log("✓ admin");
}
if (mode === "admin") process.exit(0);

for (const l of links.members) {
  if (!l.telegramId) {
    console.log(`… ${l.id}: chưa có telegramId`);
    continue;
  }
  const m = data.members.find((x) => x.id === l.id);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  await send(
    l.telegramId,
    `🌹 <b>${cap(m.honorific)} ${m.shortName} ơi!</b>\n\nNhân dịp 20/10, ${data.team} có một món quà nhỏ 🎁 dành riêng cho ${m.honorific}.\nBấm nút bên dưới để mở nha 💖\n\n<i>Link này là của riêng ${m.honorific}, đừng chia sẻ nhé!</i>`,
    l.url,
    "🎁 Mở quà 20/10",
  );
  console.log(`✓ ${l.id}`);
}
