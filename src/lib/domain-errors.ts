import { DomainError } from "../game/domain/types";

const ERROR_MAP: Record<string, string> = {
  INSUFFICIENT_GOLD: "金币不足",
  INSUFFICIENT_CARGO: "舱容不足",
  INVALID_QUANTITY: "请输入有效的购买数量",
  GOOD_NOT_FOUND: "商品不存在",
  CARGO_NOT_FOUND: "货物不足",
  MAX_LEVEL_REACHED: "已达最高等级",
  INVALID_SHIP: "无效船只",
  IN_VOYAGE: "航行中无法进行此操作",
  UNKNOWN_PORT: "未知港口",
  NO_PRICE_DATA: "该商品暂无价格数据",
  CARGO_EXCEEDS_CAPACITY: "当前货物量超出该配置有效舱容，无法出航",
};

/** 将领域层的 DomainError 转为用户可读的中文错误消息 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof DomainError) {
    return ERROR_MAP[err.code] ?? `未知错误 (${err.code})`;
  }
  if (err instanceof Error) return err.message;
  return "发生未知错误";
}
