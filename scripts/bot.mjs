/**
 * Bot Telegram – chạy định kỳ bằng GitHub Actions (.github/workflows/bot.yml), không cần server.
 *
 *  - /start <mã kích hoạt>  → gắn Telegram ID với đúng người, gửi link mở quà riêng.
 *  - /start (đã gắn ID)     → gửi lại link (nút "Đăng nhập bằng Telegram" trên web dẫn tới đây).
 *  - tài khoản lạ           → từ chối + nhắn người tặng (admin) các nút "Đây là …" để duyệt bằng 1 chạm.
 *  - PRE_BIND="uid:idx,…"   → gắn sẵn tài khoản (idx bắt đầu từ 0) và gửi quà ngay.
 *
 * Dữ liệu link nằm trong bot/links.enc, trạng thái (ID đã gắn) trong file BOT_STATE –
 * cả hai mã hoá AES-256-GCM bằng khoá suy ra từ TELEGRAM_BOT_TOKEN.
 *
 *   TELEGRAM_BOT_TOKEN=xxx BOT_STATE=/tmp/state.enc BOT_POLL_SECONDS=60 node scripts/bot.mjs
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.log("Chưa có secret TELEGRAM_BOT_TOKEN – bỏ qua.");
  process.exit(0);
}
const statePath = process.env.BOT_STATE ?? "bot-state.enc";
const pollSeconds = Number(process.env.BOT_POLL_SECONDS ?? 0);

const keyFor = (label) => createHash("sha256").update(`${label}:${token}`).digest();
const open = (label, buf) => {
  const d = createDecipheriv("aes-256-gcm", keyFor(label), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(buf.length - 16));
  return JSON.parse(Buffer.concat([d.update(buf.subarray(12, buf.length - 16)), d.final()]).toString("utf8"));
};
const sealFor = (label, obj) => {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", keyFor(label), iv);
  return Buffer.concat([iv, c.update(JSON.stringify(obj)), c.final(), c.getAuthTag()]);
};

const links = open("lixi-bot-links", readFileSync(new URL("../bot/links.enc", import.meta.url)));
const state = existsSync(statePath) ? open("lixi-bot-state", readFileSync(statePath)) : { offset: 0, bindings: {} };
state.notified ??= {};
const before = JSON.stringify(state);

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
const reply = (chat_id, text, button) =>
  api("sendMessage", {
    chat_id,
    text,
    parse_mode: "HTML",
    ...(button ? { reply_markup: { inline_keyboard: [[{ text: button.label, url: button.url }]] } } : {}),
  }).catch((e) => console.log("gửi lỗi:", e.message));

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const sendGift = (chat, m) =>
  reply(
    chat,
    `🌹 <b>${cap(m.honorific)} ${m.shortName} ơi!</b>\n\nNhân dịp 20/10, ${links.team} có một món quà nhỏ 🎁 dành riêng cho ${m.honorific}.\nBấm nút bên dưới để mở nha 💖\n\n<i>Link này là của riêng ${m.honorific}, đừng chia sẻ nhé!</i>`,
    { label: "🎁 Mở quà 20/10", url: m.url },
  );

/** Gắn tài khoản với người thứ idx (mỗi người chỉ 1 tài khoản) rồi gửi quà. */
async function bind(uid, idx) {
  for (const [u, i] of Object.entries(state.bindings)) if (i === idx && u !== uid) delete state.bindings[u];
  state.bindings[uid] = idx;
  delete state.notified[uid];
  await sendGift(uid, links.members[idx]);
  console.log(`gắn ${uid} → #${idx + 1}`);
}

const who = (from) => [from.first_name, from.last_name].filter(Boolean).join(" ") + (from.username ? ` (@${from.username})` : "");

/** Nhắn người tặng để duyệt một tài khoản lạ. */
async function askAdmin(from) {
  if (!links.adminTelegramId || state.notified[from.id]) return;
  state.notified[from.id] = true;
  const rows = links.members.map((m, i) => [{ text: `✅ Đây là ${m.honorific} ${m.shortName}`, callback_data: `b:${from.id}:${i}` }]);
  rows.push([{ text: "🚫 Không phải", callback_data: `x:${from.id}` }]);
  await api("sendMessage", {
    chat_id: links.adminTelegramId,
    text: `🔔 Tài khoản lạ vừa bấm START:\n<b>${who(from)}</b> · ID ${from.id}\n\nNếu là chị em trong phòng, bấm đúng tên để gửi quà:`,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: rows },
  }).catch((e) => console.log("nhắn admin lỗi:", e.message));
}

async function handleCallback(q) {
  const ok = links.adminTelegramId && String(q.from.id) === String(links.adminTelegramId);
  const [kind, uid, idx] = (q.data ?? "").split(":");
  if (!ok) return api("answerCallbackQuery", { callback_query_id: q.id, text: "Không có quyền" }).catch(() => {});
  let note = "";
  if (kind === "b" && links.members[+idx]) {
    await bind(uid, +idx);
    const m = links.members[+idx];
    note = `✅ Đã gắn ID ${uid} với ${m.honorific} ${m.shortName} và gửi quà.`;
  } else if (kind === "x") {
    note = `🚫 Đã bỏ qua ID ${uid}.`;
    console.log(`admin bỏ qua ${uid}`);
  }
  await api("answerCallbackQuery", { callback_query_id: q.id, text: note.slice(0, 190) }).catch(() => {});
  if (q.message) await api("editMessageText", { chat_id: q.message.chat.id, message_id: q.message.message_id, text: `${q.message.text}\n\n${note}` }).catch(() => {});
}

async function handle(msg) {
  if (msg.chat?.type !== "private" || !msg.from || msg.from.is_bot) return;
  const uid = String(msg.from.id);
  const text = (msg.text ?? "").trim();
  const payload = text.startsWith("/start") ? text.slice(6).trim() : "";

  if (links.adminTelegramId && uid === String(links.adminTelegramId)) {
    await reply(msg.chat.id, "👑 <b>Link người tặng</b>\nXem thử được quà của tất cả mọi người. Đừng chia sẻ link này nhé!", { label: "👑 Chế độ người tặng", url: links.admin });
    return console.log(`admin ${uid}`);
  }

  const idx = links.members.findIndex((m) => payload && m.claim === payload);
  if (idx >= 0) {
    const owner = Object.entries(state.bindings).find(([, i]) => i === idx)?.[0];
    if (owner && owner !== uid) {
      await reply(msg.chat.id, "🥺 Mã này đã được kích hoạt bởi một tài khoản Telegram khác. Liên hệ người tặng giúp mình nhé!");
      return console.log(`claim ${idx} bị dùng lại bởi ${uid}`);
    }
    return bind(uid, idx);
  }

  if (uid in state.bindings) {
    await sendGift(msg.chat.id, links.members[state.bindings[uid]]);
    return console.log(`gửi lại link #${state.bindings[uid] + 1} cho ${uid}`);
  }

  await reply(msg.chat.id, `Chào ${msg.from.first_name ?? "bạn"} 🌸 Bot này dành riêng cho chị em ${links.team}. Mình đã báo người tặng xác nhận – nếu đúng là bạn, quà sẽ tới trong ít phút nha!`);
  await askAdmin(msg.from);
  console.log(`chờ duyệt ${uid} (${who(msg.from)})`);
}

for (const pair of (process.env.PRE_BIND ?? "").split(",").filter(Boolean)) {
  const [uid, idx] = pair.split(":");
  if (links.members[+idx]) await bind(uid.trim(), +idx);
}

const deadline = Date.now() + pollSeconds * 1000;
do {
  const timeout = Math.max(0, Math.min(25, Math.floor((deadline - Date.now()) / 1000)));
  let updates;
  try {
    updates = await api("getUpdates", { offset: state.offset, timeout, allowed_updates: ["message", "callback_query"] });
  } catch (e) {
    // lỗi mạng tạm thời: dừng lượt này, tin nhắn chưa xử lý vẫn còn ở Telegram cho lượt sau
    console.log("getUpdates lỗi:", e.message);
    break;
  }
  for (const u of updates) {
    state.offset = u.update_id + 1;
    if (u.message) await handle(u.message);
    else if (u.callback_query) await handleCallback(u.callback_query);
  }
} while (Date.now() < deadline);

if (JSON.stringify(state) !== before) {
  writeFileSync(statePath, sealFor("lixi-bot-state", state));
  console.log(`💾 lưu trạng thái (${Object.keys(state.bindings).length}/${links.members.length} người đã kích hoạt)`);
} else console.log("Không có gì mới.");
