// ============================================================
// 港口配置
// 所有数值集中管理，不散落在组件或逻辑代码中
// ============================================================

export interface PortConfig {
  readonly id: string
  readonly name: string
  readonly region: string
  readonly description: string
  readonly specialties: readonly string[] // 特产商品 id
  readonly priceModifiers: Record<string, number> // 商品 id → 价格乘数（0.5 ~ 2.0）
}

export const PORTS: readonly PortConfig[] = [
  {
    id: "quanzhou",
    name: "泉州",
    region: "闽南",
    description: "宋元时期东方第一大港，商贾云集",
    specialties: ["porcelain", "silk"],
    priceModifiers: {
      silk: 0.78,
      porcelain: 0.72,
      spice: 1.25,
      jade: 1.20,
      timber: 1.00,
    },
  },
  {
    id: "malacca",
    name: "马六甲",
    region: "南洋",
    description: "东西方海上十字路口，香料集散之地",
    specialties: ["spice"],
    priceModifiers: {
      spice: 0.70,
      silk: 1.28,
      porcelain: 1.22,
      jade: 1.15,
      timber: 0.68,
    },
  },
  {
    id: "nagasaki",
    name: "长崎",
    region: "东瀛",
    description: "日本唯一的对外窗口，白银与武士的国度",
    specialties: ["jade"],
    priceModifiers: {
      jade: 0.72,
      silk: 1.32,
      porcelain: 1.18,
      spice: 1.20,
      timber: 0.75,
    },
  },
] as const

// ---- 港口间距离 ----

export interface RouteConfig {
  readonly from: string
  readonly to: string
  readonly distance: number // 抽象距离单位
}

export const ROUTES: readonly RouteConfig[] = [
  { from: "quanzhou", to: "malacca", distance: 8 },
  { from: "quanzhou", to: "nagasaki", distance: 5 },
  { from: "malacca", to: "quanzhou", distance: 8 },
  { from: "malacca", to: "nagasaki", distance: 10 },
  { from: "nagasaki", to: "quanzhou", distance: 5 },
  { from: "nagasaki", to: "malacca", distance: 10 },
] as const
