import { DomainError } from "../game/domain/types";

const ERROR_MAP: Record<string, string> = {
  AFFINITY_TOO_LOW: "好感度不足",
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
  UNKNOWN_REGION: "未知海域",
  CARGO_EXCEEDS_CAPACITY: "当前货物量超出该配置有效舱容，无法出航",
  FLEET_FULL: "舰队已满，提升等级以扩充舰队",
  LAST_SHIP: "至少保留一艘船",
  SHIP_HAS_CARGO: "请先清空船上货物",
  SHIP_NOT_AT_PORT: "当前港口无法购买该船只",
  EMPTY_FLEET_SELECTION: "请至少选择一艘船出航",
  SHIP_ZERO_DURABILITY: "船体严重损坏，无法出航",
  CREW_EXCEEDS_CAPACITY: "招募失败，船员人数超出舰队容量上限",
  INSUFFICIENT_CREW: "船员不足，无法出海",
  NOT_AT_PORT: "当前港口无法购买该装备",
  EQUIPMENT_NOT_FOUND: "未找到该装备",
  EQUIPMENT_SLOT_FULL: "装备槽已满（每艘船最多装备3件）",
  DUPLICATE_EQUIPMENT_TYPE: "同类型装备不可重复装配",
  SHIP_HAS_EQUIPMENT: "出售船只前必须先卸下所有装备",
  INSUFFICIENT_ATTRIBUTE_POINTS: "属性分配点不足",
  ITEM_NOT_FOUND: "背包中未找到该物品",
  ITEM_NOT_FOUND_IN_INVENTORY: "背包中未找到该物品",
  ITEM_NOT_EQUIPPABLE: "该物品无法装备在人物身上",
  EQUIPMENT_SLOT_INVALID: "无效的装备位置",
  NOT_IN_COMBAT: "当前不在战斗中",
  INVALID_COMBAT_TARGET: "无效的战斗目标",
  INSUFFICIENT_MP: "MP 不足，无法施放技能",
  INVALID_COMBAT_ACTION: "无效的战斗动作",
  NOT_YOUR_TURN: "当前不是您的回合",
  NPC_ALREADY_RECRUITED: "该角色已被招募",
  NPC_NOT_AT_THIS_PORT: "该角色不在当前港口",
  NPC_NOT_FOUND: "未找到该角色",
  NPC_NOT_RECRUITABLE: "该角色无法招募",
  QUEST_ALREADY_ACCEPTED: "该任务已接受",
  QUEST_NOT_AVAILABLE: "该任务不可用",
  QUEST_NOT_COMPLETABLE: "任务条件尚未满足",
  QUEST_NOT_FOUND: "未找到该任务",
  QUEST_REQUIREMENT_NOT_MET: "不满足任务要求",
  SILENCED: "您处于沉默状态，无法施放魔法技能",
};

/** 将领域层的 DomainError 转为用户可读的中文错误消息 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof DomainError) {
    return ERROR_MAP[err.code] ?? `未知错误 (${err.code})`;
  }
  if (err instanceof Error) return err.message;
  return "发生未知错误";
}
