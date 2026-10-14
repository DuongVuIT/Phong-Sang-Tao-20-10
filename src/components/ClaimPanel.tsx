import { useState } from "react";
import { formatVnd, type Member } from "../config/members";

// Mã ngân hàng theo chuẩn VietQR (NAPAS)
const BANKS = [
  ["MOMO", "Ví MoMo (số điện thoại)"],
  ["970436", "Vietcombank"],
  ["970407", "Techcombank"],
  ["970422", "MB Bank"],
  ["970418", "BIDV"],
  ["970415", "VietinBank"],
  ["970405", "Agribank"],
  ["970416", "ACB"],
  ["970432", "VPBank"],
  ["970423", "TPBank"],
  ["970403", "Sacombank"],
  ["970443", "SHB"],
  ["970448", "OCB"],
  ["970441", "VIB"],
] as const;

const KEY = "chiem2010.claim";

/**
 * Chị em nhập STK / số MoMo → tạo mã VietQR đã điền sẵn 50.000đ.
 * Người tặng mở app MoMo/ngân hàng quét là chuyển xong; gửi qua Telegram bằng 1 chạm.
 */
export function ClaimPanel({ member, amount, giver }: { member: Member; amount: number; giver: string }) {
  const LIXI_AMOUNT = amount;
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "{}") as { bank?: string; acc?: string; owner?: string };
    } catch {
      return {};
    }
  })();
  const [bank, setBank] = useState(saved.bank ?? "MOMO");
  const [acc, setAcc] = useState(saved.acc ?? "");
  const [owner, setOwner] = useState(saved.owner ?? "");
  const [done, setDone] = useState(false);

  const accClean = acc.replace(/[^0-9]/g, "");
  const isMomo = bank === "MOMO";
  const valid = accClean.length >= (isMomo ? 10 : 6);
  const note = `Li xi 20-10 ${member.shortName}`;
  const qr = !isMomo && valid
    ? `https://img.vietqr.io/image/${bank}-${accClean}-compact2.png?amount=${LIXI_AMOUNT}&addInfo=${encodeURIComponent(note)}&accountName=${encodeURIComponent(owner)}`
    : null;
  const bankName = BANKS.find(([id]) => id === bank)?.[1] ?? bank;

  const message =
    `🧧 ${member.name} đã mở lì xì 20/10 – ${formatVnd(LIXI_AMOUNT)}!\n` +
    (isMomo ? `📱 MoMo: ${accClean}` : `🏦 ${bankName}: ${accClean}${owner ? ` – ${owner}` : ""}`) +
    (qr ? `\n📷 QR (quét bằng MoMo/app ngân hàng): ${qr}` : "") +
    `\nCảm ơn nhiều nha 💖`;
  const tgUrl = giver ? `https://t.me/${giver}?text=${encodeURIComponent(message)}` : null;

  const submit = async () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ bank, acc, owner }));
    } catch {
      /* ignore */
    }
    if (tgUrl) window.open(tgUrl, "_blank", "noopener");
    else await navigator.clipboard?.writeText(message).catch(() => {});
    setDone(true);
  };

  return (
    <div className="panel glass claim">
      <small>Nhận {formatVnd(LIXI_AMOUNT)} về ví</small>
      <p>Nhập số MoMo hoặc tài khoản ngân hàng, người tặng sẽ quét mã QR và chuyển ngay 💸</p>
      <div className="claim-form">
        <select value={bank} onChange={(e) => setBank(e.target.value)} aria-label="Ngân hàng / ví">
          {BANKS.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <input inputMode="numeric" value={acc} onChange={(e) => setAcc(e.target.value)} placeholder={isMomo ? "Số điện thoại MoMo" : "Số tài khoản"} aria-label="Số tài khoản" />
        {!isMomo && <input value={owner} onChange={(e) => setOwner(e.target.value.toUpperCase())} placeholder="TÊN CHỦ TK (không dấu)" aria-label="Tên chủ tài khoản" />}
      </div>
      {qr && <img className="qr" src={qr} alt={`Mã VietQR ${formatVnd(LIXI_AMOUNT)} vào ${bankName}`} loading="lazy" />}
      <button className="btn" disabled={!valid} onClick={submit}>
        {tgUrl ? "✈️ Gửi cho người tặng qua Telegram" : "📋 Sao chép thông tin nhận tiền"}
      </button>
      {done && <p className="ok">{tgUrl ? "Đã mở Telegram – bấm Gửi là xong nha! 🎉" : "Đã sao chép – dán gửi cho người tặng nhé! 🎉"}</p>}
    </div>
  );
}
