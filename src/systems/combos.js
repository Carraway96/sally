import { ITEM_TYPES } from "../core/data.js";
import { world } from "../core/state.js";

const COMBO_RULES = [
  {
    id: "cozy_corner",
    label: "Mysig hörna",
    roomKeys: ["vardagsrum", "sovrum"],
    required: ["candle", "blanket", "pillow"],
    passiveGain: 1.25,
    roomScore: 2.1,
  },
  {
    id: "practical_station",
    label: "Praktisk station",
    roomKeys: ["kok", "hall", "vardagsrum"],
    required: ["mug", "charger"],
    passiveGain: 0.45,
    stability: 1.15,
    annoyanceDecay: 0.08,
  },
  {
    id: "spa_routine",
    label: "Kvällsrutin",
    roomKeys: ["badrum"],
    required: ["skincare", "candle", "basket"],
    passiveGain: 1.1,
    roomScore: 1.8,
  },
  {
    id: "entryway_claim",
    label: "Hallens identitet",
    roomKeys: ["hall"],
    required: ["plant", "art", "basket"],
    passiveGain: 0.75,
    roomScore: 2.6,
  },
  {
    id: "boss_anchor",
    label: "Permanent förankring",
    roomKeys: ["hall", "vardagsrum", "sovrum"],
    required: ["mirror_boss", "art"],
    passiveGain: 1.4,
    roomScore: 4.2,
  },
];

function visibleItemsInRoom(roomKey) {
  return world.items.filter((item) => item.room === roomKey && !item.hidden);
}

function findNearbyRequired(items, required) {
  const selected = [];
  for (const typeId of required) {
    const candidate = items.find((item) =>
      item.typeId === typeId &&
      !selected.includes(item) &&
      selected.every((other) => Math.hypot(other.x - item.x, other.y - item.y) < 220)
    );
    if (!candidate) return null;
    selected.push(candidate);
  }
  return selected;
}

export function getActiveCombos() {
  const combos = [];
  for (const rule of COMBO_RULES) {
    for (const roomKey of rule.roomKeys) {
      const items = findNearbyRequired(visibleItemsInRoom(roomKey), rule.required);
      if (!items) continue;
      combos.push({
        id: `${rule.id}:${roomKey}`,
        ruleId: rule.id,
        roomKey,
        label: rule.label,
        itemIds: items.map((item) => item.id),
        passiveGain: rule.passiveGain || 0,
        roomScore: rule.roomScore || 0,
        stability: rule.stability || 0,
        annoyanceDecay: rule.annoyanceDecay || 0,
      });
    }
  }
  return combos;
}

export function updateComboState() {
  const next = getActiveCombos();
  const previousIds = new Set((world.activeCombos || []).map((combo) => combo.id));
  const newCombos = next.filter((combo) => !previousIds.has(combo.id));
  if (newCombos.length > 0) {
    world.stats.combosTriggered = (world.stats.combosTriggered || 0) + newCombos.length;
    world.comboPulse = {
      text: newCombos.map((combo) => combo.label).join(" + "),
      timer: 2.4,
    };
  }
  world.activeCombos = next;
  return next;
}

export function getComboRoomEffects(roomKey) {
  return (world.activeCombos || []).filter((combo) => combo.roomKey === roomKey).reduce(
    (effects, combo) => {
      effects.passiveGain += combo.passiveGain;
      effects.roomScore += combo.roomScore;
      effects.stability += combo.stability;
      effects.annoyanceDecay += combo.annoyanceDecay;
      return effects;
    },
    { passiveGain: 0, roomScore: 0, stability: 0, annoyanceDecay: 0 }
  );
}

export function getComboForItem(itemId) {
  return (world.activeCombos || []).find((combo) => combo.itemIds.includes(itemId)) || null;
}

export function getComboRuleCount() {
  return COMBO_RULES.length;
}

export function getItemTags(item) {
  return ITEM_TYPES[item.typeId]?.tags || [];
}
