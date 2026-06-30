import { describe, expect, it } from "bun:test";
import { GOODS } from "../../../data/goods";
import { PORTS } from "../../../data/ports";
import { createTestWorld } from "../../domain/__tests__/helpers";
import {
  buildFleetView,
  buildHarborView,
  buildMarketView,
  buildNavigationView,
  buildShipView,
  buildShipyardView,
  buildVoyageView,
} from "../buildGameView";

describe("buildHarborView", () => {
  it("returns port info for current port", () => {
    const world = createTestWorld();
    const view = buildHarborView(world);

    expect(view.portName).toBe("泉州");
    expect(view.portDescription).toBeTruthy();
    expect(view.region).toBe("东亚");
  });

  it("shows player gold, cargo, day", () => {
    const world = createTestWorld();
    const view = buildHarborView(world);

    expect(view.playerGold).toBe(5000);
    expect(view.cargoCount).toBeGreaterThan(0);
    expect(view.cargoCapacity).toBe(35);
    expect(view.currentDay).toBe(1);
  });

  it("shows ship name", () => {
    const world = createTestWorld();
    const view = buildHarborView(world);

    expect(view.shipName).toBe("单桅帆船");
  });

  it("handles unknown port gracefully", () => {
    const world = createTestWorld({
      player: { name: "船长", gold: 5000, currentPortId: "unknown", day: 1 },
    });
    const view = buildHarborView(world);

    expect(view.portName).toBe("未知");
  });
});

describe("buildMarketView", () => {
  it("returns all goods with prices", () => {
    const world = createTestWorld();
    const view = buildMarketView(world);

    expect(view.portName).toBe("泉州");
    expect(view.goods).toHaveLength(GOODS.length);
    expect(view.playerGold).toBe(5000);
  });

  it("silk price at quanzhou matches current market", () => {
    const world = createTestWorld();
    const view = buildMarketView(world);

    const silk = view.goods.find((g) => g.id === "silk");
    expect(silk?.buyPrice).toBe(84);
  });

  it("sell price is lower than buy price due to spread", () => {
    const world = createTestWorld();
    const view = buildMarketView(world);

    for (const good of view.goods) {
      expect(good.sellPrice).toBeLessThan(good.buyPrice);
    }
  });

  it("shows inCargo for goods in hold", () => {
    const world = createTestWorld();
    const view = buildMarketView(world);

    const silk = view.goods.find((g) => g.id === "silk");
    expect(silk?.inCargo).toBe(5);

    const timber = view.goods.find((g) => g.id === "timber");
    expect(timber?.inCargo).toBe(0);
  });

  it("includes priceChangePercent for each good", () => {
    const world = createTestWorld();
    const view = buildMarketView(world);

    for (const good of view.goods) {
      expect(typeof good.priceChangePercent).toBe("number");
    }
  });
});

describe("buildNavigationView", () => {
  it("lists destinations reachable from current port", () => {
    const world = createTestWorld(); // quanzhou
    const view = buildNavigationView(world);

    expect(view.currentPortName).toBe("泉州");
    // All other ports are reachable via coordinate distance
    expect(view.destinations).toHaveLength(PORTS.length - 1);
  });

  it("each destination has port info and travel days", () => {
    const world = createTestWorld();
    const view = buildNavigationView(world);

    for (const dest of view.destinations) {
      expect(dest.portId).toBeTruthy();
      expect(dest.portName).toBeTruthy();
      expect(dest.travelDays).toBeGreaterThan(0);
      expect(dest.distance).toBeGreaterThan(0);
    }
  });
});

describe("buildFleetView", () => {
  it("returns fleet summary and individual cargo list for each ship", () => {
    const world = createTestWorld();
    const view = buildFleetView(world);

    expect(view.ships).toHaveLength(1);
    expect(view.maxShips).toBe(1);
    expect(view.fleetGold).toBe(5000);

    // Check that active ship summary contains cargo items
    const activeShipView = view.ships[0];
    expect(activeShipView.cargo).toHaveLength(2);
    expect(activeShipView.cargo[0].goodName).toBe("丝绸");
    expect(activeShipView.cargo[0].quantity).toBe(5);
  });
});

describe("buildShipyardView", () => {
  it("returns shipyard options, selected ship, and available ships to buy", () => {
    const world = createTestWorld();
    const view = buildShipyardView(world);

    expect(view.ships).toHaveLength(1);
    expect(view.selectedShipId).toBe(world.fleet.activeShipId);
    expect(view.selectedShipDetail).not.toBeNull();
    expect(view.selectedShipDetail?.shipName).toBe("单桅帆船");

    // At Quanzhou (start port)
    expect(view.availableShips).toHaveLength(2);
    expect(view.availableShips.some((s) => s.typeId === "barque")).toBe(true);
  });

  it("allows selecting a specific ship by ID", () => {
    const world = createTestWorld();
    const view = buildShipyardView(world, "another-ship-id");

    // If not found in fleet, falls back to active ship
    expect(view.selectedShipId).toBe(world.fleet.activeShipId);
  });
});

describe("buildShipView", () => {
  it("shows ship name and component levels", () => {
    const world = createTestWorld();
    const view = buildShipView(world);

    expect(view.shipName).toBe("单桅帆船");
    expect(view.components).toHaveLength(4);
    expect(view.components[0].id).toBe("hull");
    expect(view.components[0].level).toBe(0);
    expect(view.components[0].maxLevel).toBe(3);
    expect(view.components[0].nextCost).toBe(500);
    expect(view.durability).toBe(50);
    expect(view.maxDurability).toBe(50);
  });

  it("component upgrade costs reflect current level", () => {
    const world = createTestWorld();
    const view = buildShipView(world);

    expect(view.components[0].nextCost).toBe(500);
    expect(view.components[0].canUpgrade).toBe(true);
  });

  it("canUpgrade false when gold insufficient", () => {
    const world = createTestWorld({
      fleet: {
        ships: [
          {
            id: "ship-1",
            typeId: "sloop",
            name: "单桅帆船",
            equipment: {
              hullLevel: 0,
              sailLevel: 0,
              armorLevel: 0,
              cannonLevel: 0,
            },
            durability: 50,
            maxDurability: 50,
            cargo: [],
            armamentLevel: 0,
            equippedItems: [],
          },
        ],
        activeShipId: "ship-1",
        maxShips: 1,
        crew: 3,
        maxCrew: 6,
        gold: 100,
      },
    });
    const view = buildShipView(world);

    expect(view.components[0].nextCost).toBe(500);
    expect(view.components[0].canUpgrade).toBe(false);
  });

  it("component nextCost null at max level", () => {
    const world = createTestWorld({
      fleet: {
        ships: [
          {
            id: "ship-1",
            typeId: "sloop",
            name: "单桅帆船",
            equipment: {
              hullLevel: 3,
              sailLevel: 3,
              armorLevel: 3,
              cannonLevel: 3,
            },
            durability: 50,
            maxDurability: 50,
            cargo: [],
            armamentLevel: 0,
            equippedItems: [],
          },
        ],
        activeShipId: "ship-1",
        maxShips: 1,
        crew: 3,
        maxCrew: 6,
        gold: 5000,
      },
    });
    const view = buildShipView(world);

    expect(view.components[0].nextCost).toBeNull();
    expect(view.components[0].canUpgrade).toBe(false);
  });
});

describe("buildVoyageView", () => {
  it("returns default state when not traveling", () => {
    const world = createTestWorld();
    const view = buildVoyageView(world);

    expect(view.isUnderway).toBe(false);
    expect(view.fromPortName).toBe("未知");
    expect(view.toPortName).toBe("未知");
    expect(view.travelDays).toBe(0);
    expect(view.events).toHaveLength(0);
  });

  it("shows voyage info when underway", () => {
    const world = createTestWorld({
      voyage: {
        fromPortId: "quanzhou",
        toPortId: "malacca",
        departureDay: 1,
        travelDays: 4,
        events: [
          {
            day: 2,
            description: "遇到一群海豚，心情大好",
            goldChange: 50,
            cargoLoss: 0,
          },
        ],
      },
    });
    const view = buildVoyageView(world);

    expect(view.isUnderway).toBe(true);
    expect(view.fromPortName).toBe("泉州");
    expect(view.toPortName).toBe("马六甲");
    expect(view.travelDays).toBe(4);
    expect(view.events).toHaveLength(1);
    expect(view.events[0].description).toBe("遇到一群海豚，心情大好");
    expect(view.events[0].effect).toContain("50 金币");
  });

  it("handles unknown port gracefully", () => {
    const world = createTestWorld({
      voyage: {
        fromPortId: "unknown_port",
        toPortId: "also_unknown",
        departureDay: 1,
        travelDays: 3,
        events: [],
      },
    });
    const view = buildVoyageView(world);

    expect(view.isUnderway).toBe(true);
    expect(view.fromPortName).toBe("未知");
    expect(view.toPortName).toBe("未知");
  });

  it("event effect is empty when no gold or cargo change", () => {
    const world = createTestWorld({
      voyage: {
        fromPortId: "quanzhou",
        toPortId: "nagasaki",
        departureDay: 1,
        travelDays: 3,
        events: [
          { day: 1, description: "海面风平浪静", goldChange: 0, cargoLoss: 0 },
          { day: 2, description: "遇到海盗", goldChange: -30, cargoLoss: 2 },
        ],
      },
    });
    const view = buildVoyageView(world);

    expect(view.events).toHaveLength(2);
    expect(view.events[0].effect).toBe("无影响");
    expect(view.events[1].effect).toContain("损失 30 金币");
    expect(view.events[1].effect).toContain("丢失 2 单位货物");
  });
});
