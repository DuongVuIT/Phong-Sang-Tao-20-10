import { formatVnd, type Gift } from "../config/members";
import type { WishVideoProps } from "./WishVideo";

export const buildWishProps = (gift: Gift, modelUrl: string): WishVideoProps => ({
  name: `${gift.member.honorific} ${gift.member.name}`,
  wishes: gift.member.wishes,
  color: gift.member.color,
  amount: formatVnd(gift.amount),
  flowerEmoji: gift.member.flower.emoji,
  ticker: gift.sharedWishes,
  team: gift.team,
  modelUrl,
});
