// ============================================================
// Combat Views
// ============================================================

import { ITEMS } from "../../data/items";
import { SKILLS } from "../../data/skills";
import type {
  CombatChoiceView,
  CombatParticipantView,
  PersonCombatView,
  SkillView,
} from "../../types/game-view";
import type { CombatParticipant, World } from "../domain/types";

function getStatusLabel(type: string): string {
  const labels: Record<string, string> = {
    poison: "中毒",
    bleed: "出血",
    burn: "燃烧",
    freeze: "冰冻",
    sleep: "睡眠",
    silence: "沉默",
    blind: "暗闇",
  };
  return labels[type] ?? type;
}

function buildCombatParticipantView(
  p: CombatParticipant,
): CombatParticipantView {
  const weaponName = p.weaponId
    ? (ITEMS.find((i) => i.id === p.weaponId)?.name ?? null)
    : null;
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    hp: p.hp,
    maxHp: p.maxHp,
    mp: p.mp,
    maxMp: p.maxMp,
    spd: p.spd,
    level: p.level,
    weaponName,
    statuses: p.statuses.map((s) => ({
      type: s.type,
      label: getStatusLabel(s.type),
      duration: s.duration,
    })),
    isDodging: p.isDodging,
    isParrying: p.isParrying,
    isDead: p.hp <= 0,
  };
}

export function buildPersonCombatView(world: World): PersonCombatView | null {
  const combat = world.combat;
  if (!combat) return null;
  const currentTurnId = combat.turnOrder[combat.currentTurnIndex];
  const player = combat.participants.find((p) => p.id === "player");
  if (!player) return null;
  const weaponConfig = player.weaponId
    ? ITEMS.find((i) => i.id === player.weaponId)
    : null;
  const availableSkills: SkillView[] = weaponConfig?.skills
    ? weaponConfig.skills
        .filter((s) => player.level >= s.levelRequired)
        .map((s) => {
          const skill = SKILLS.find((sk) => sk.id === s.skillId);
          if (!skill) return null;
          return {
            skillId: skill.id,
            name: skill.name,
            mpCost: skill.mpCost,
            type: skill.type,
            description: skill.description,
            power: skill.power,
          };
        })
        .filter((s): s is SkillView => s !== null)
    : [];
  return {
    participants: combat.participants.map(buildCombatParticipantView),
    turnOrder: combat.turnOrder,
    currentTurnId,
    round: combat.round,
    logs: combat.logs.map((l) => ({ round: l.round, message: l.message })),
    status: combat.status,
    isPlayerTurn: combat.status === "in_progress" && currentTurnId === "player",
    availableSkills,
  };
}

export function buildCombatChoiceView(world: World): CombatChoiceView | null {
  const voyage = world.voyage;
  if (!voyage || !voyage.combatSelection) return null;
  return {
    hasSelection: true,
    isDirectBoarding: voyage.directBoarding ?? false,
    difficulty: 1,
  };
}
