/** 根据品质标签返回 Tailwind 颜色类名 */
export function getQualityColor(quality: string): string {
  switch (quality) {
    case "传说":
      return "text-red-400 font-bold";
    case "稀有":
      return "text-orange-400 font-bold";
    case "优秀":
      return "text-purple-400";
    case "良":
      return "text-blue-400";
    default:
      return "text-parchment";
  }
}
