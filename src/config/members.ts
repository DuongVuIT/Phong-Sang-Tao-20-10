/**
 * Kiểu dữ liệu + tiện ích dùng chung. Dữ liệu thật (tên, lời chúc…) KHÔNG nằm trong repo:
 * nó được mã hoá bằng `npm run seal` thành public/sealed/*, chỉ ai có link riêng mới giải mã được.
 */

export type Flower = {
  name: string;
  emoji: string;
  meaning: string;
};

export type Member = {
  id: string;
  name: string;
  shortName: string;
  /** Cách xưng hô: "em", "bạn", "chị" */
  honorific: string;
  color: string;
  flower: Flower;
  wishes: string[];
};

/** Nội dung một bao lì xì sau khi giải mã. */
export type Gift = {
  member: Member;
  team: string;
  amount: number;
  total: number;
  sharedWishes: string[];
  giverTelegram: string;
  roster: { name: string; shortName: string; color: string }[];
  /** Có video MP4 đã mã hoá đi kèm không */
  hasVideo: boolean;
};

export const TEAM_NAME = "Phòng Sáng Tạo";

export const formatVnd = (n: number) => n.toLocaleString("vi-VN") + "đ";

/** "em A", "bạn B", "chị C"… */
export const callName = (m: Member) => `${m.honorific} ${m.shortName}`;
export const CallName = (m: Member) => {
  const s = callName(m);
  return s.charAt(0).toUpperCase() + s.slice(1);
};
