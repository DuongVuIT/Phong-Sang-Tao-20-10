/**
 * Đóng gói & MÃ HOÁ toàn bộ bao lì xì (chạy ở máy người tặng, cần thư mục private/):
 *
 *   npm run seal              # render video Remotion (nếu lời chúc đổi) + mã hoá + tạo link
 *   npm run seal -- --no-video
 *   TELEGRAM_BOT_TOKEN=xxx npm run seal   # + tạo bot/links.enc cho bot Telegram (GitHub Actions)
 *
 * Vào:  private/members.json, private/master.key   (KHÔNG commit)
 * Ra:   public/sealed/*      (chỉ dữ liệu đã mã hoá – commit được)
 *       bot/links.enc        (dữ liệu cho bot, mã hoá bằng khoá suy ra từ bot token – commit được)
 *       private/links.txt    (link kích hoạt bot + link mở quà của từng người + link người tặng)
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { createCipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const priv = path.join(root, "private");
const out = path.join(root, "public", "sealed");
const SITE = process.env.SITE_URL ?? "https://duongvuit.github.io/Phong-Sang-Tao-20-10/";
const BOT = process.env.TELEGRAM_BOT_USERNAME ?? "phongsangtao2010_bot";
const withVideo = !process.argv.includes("--no-video");

const data = JSON.parse(readFileSync(path.join(priv, "members.json"), "utf8"));
const master = Buffer.from(readFileSync(path.join(priv, "master.key"), "utf8").trim(), "base64url");
if (master.length !== 32) throw new Error("master.key phải là 32 byte base64url");

const b64u = (b) => Buffer.from(b).toString("base64url");
const memberKey = (i) => createHmac("sha256", master).update(`lixi-member:${i}`).digest();
const claimOf = (i) => createHmac("sha256", master).update(`claim:${i}`).digest("base64url").slice(0, 16);
const slotOf = (key) => createHash("sha256").update(Buffer.concat([Buffer.from("slot:"), key])).digest("hex").slice(0, 24);
const seal = (key, plain) => {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(plain), c.final(), c.getAuthTag()]); // WebCrypto: ct || tag
  return { iv, ct };
};

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
mkdirSync(path.join(priv, "videos"), { recursive: true });

const amount = Math.round(data.total / data.members.length);
const roster = data.members.map((m) => ({ name: m.name, shortName: m.shortName, color: m.color }));
let serveUrl = null;
const links = [];

for (const [idx, raw] of data.members.entries()) {
  const { telegramId, ...member } = raw;
  const key = memberKey(idx + 1);
  const slot = slotOf(key);

  // ---- video lời chúc (Remotion) – chỉ render lại khi nội dung đổi
  const props = {
    name: `${member.honorific} ${member.name}`,
    wishes: member.wishes,
    color: member.color,
    amount: `${amount.toLocaleString("vi-VN")}đ`,
    flowerEmoji: member.flower.emoji,
    ticker: data.sharedWishes,
    team: data.team,
  };
  const propsHash = createHash("sha256").update(JSON.stringify(props) + readFileSync(path.join(root, "src/remotion/WishVideo.tsx"))).digest("hex").slice(0, 16);
  const mp4 = path.join(priv, "videos", `${member.id}-${propsHash}.mp4`);
  if (withVideo && !existsSync(mp4)) {
    serveUrl ??= await bundle({ entryPoint: path.join(root, "src/remotion/index.ts") });
    const chromiumOptions = { gl: process.env.REMOTION_GL ?? "swangle" };
    const composition = await selectComposition({ serveUrl, id: "wish", inputProps: props, chromiumOptions });
    console.log(`🎬 Render video ${member.id}…`);
    await renderMedia({ composition, serveUrl, codec: "h264", crf: 24, scale: 2 / 3, inputProps: props, outputLocation: mp4, chromiumOptions });
  }
  const hasVideo = existsSync(mp4);
  if (hasVideo) {
    const { iv, ct } = seal(key, readFileSync(mp4));
    writeFileSync(path.join(out, `${slot}.bin`), Buffer.concat([iv, ct]));
  }

  // ---- nội dung bao lì xì
  const gift = { member, team: data.team, amount, total: data.total, sharedWishes: data.sharedWishes, giverTelegram: data.giverTelegram ?? "", roster, hasVideo };
  const { iv, ct } = seal(key, Buffer.from(JSON.stringify(gift)));
  writeFileSync(path.join(out, `${slot}.json`), JSON.stringify({ iv: b64u(iv), ct: b64u(ct) }));

  const claim = claimOf(idx + 1);
  links.push({
    id: member.id,
    name: member.name,
    honorific: member.honorific,
    shortName: member.shortName,
    telegramId: telegramId ?? null,
    claim,
    botLink: `https://t.me/${BOT}?start=${claim}`,
    url: `${SITE}#k=${b64u(key)}`,
  });
  console.log(`🔒 ${member.id} → sealed/${slot}.* ${hasVideo ? "(+video)" : ""}`);
}

writeFileSync(path.join(out, "index.json"), JSON.stringify({ count: data.members.length }));

const admin = `${SITE}#m=${b64u(master)}`;
writeFileSync(
  path.join(priv, "links.json"),
  JSON.stringify({ admin, adminTelegramId: data.adminTelegramId ?? null, members: links }, null, 2) + "\n",
);
writeFileSync(
  path.join(priv, "links.txt"),
  [
    "GỬI CHO TỪNG NGƯỜI (link kích hoạt bot – bấm là bot gắn đúng tài khoản Telegram và gửi quà):\n",
    ...links.map((l) => `🌹 ${l.name}: ${l.botLink}`),
    "\n\nDự phòng – link mở quà trực tiếp:\n",
    ...links.map((l) => `🌹 ${l.name}:\n${l.url}\n`),
    `\n👑 Người tặng (xem được tất cả):\n${admin}\n`,
  ].join("\n"),
);

// dữ liệu cho bot Telegram chạy trên GitHub Actions (mã hoá bằng khoá suy ra từ bot token)
if (process.env.TELEGRAM_BOT_TOKEN) {
  const k = createHash("sha256").update(`lixi-bot-links:${process.env.TELEGRAM_BOT_TOKEN}`).digest();
  const { iv, ct } = seal(k, Buffer.from(JSON.stringify({
    team: data.team,
    admin,
    adminTelegramId: data.adminTelegramId ?? null,
    members: links.map(({ honorific, shortName, claim, url }) => ({ honorific, shortName, claim, url })),
  })));
  mkdirSync(path.join(root, "bot"), { recursive: true });
  writeFileSync(path.join(root, "bot", "links.enc"), Buffer.concat([iv, ct]));
  console.log("🤖 bot/links.enc");
}
console.log(`\n✅ Xong. Link riêng: private/links.txt`);
