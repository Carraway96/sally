import { getGirlProfileById } from "../core/data.js";
import { world } from "../core/state.js";
import { setToast, showGirlfriendReaction } from "./feedback.js";

export function registerPlayerAction(action, item) {
  const profile = getGirlProfileById(world.selectedGirlId);
  if (!item) return;

  if (action === "remove" || action === "relocate") {
    const responseGain = action === "remove" ? 1 : 0.55;
    world.girlfriend.strategyRoom = item.room;
    world.girlfriend.strategyAction = action;
    world.girlfriend.strategyTimer = Math.max(world.girlfriend.strategyTimer, profile.responseWindow || 12);
    world.girlfriend.responseLevel = Math.min(2, world.girlfriend.responseLevel + responseGain * (profile.responseStrength || 1));
    if (world.girlfriend.responseLevel >= 1.55 && profile.counterDialogue) {
      showGirlfriendReaction("...", "#ffe0a8", 1.1);
      setToast(`${profile.name} bevakar ${item.room} efter dina ${action === "remove" ? "borttagningar" : "flyttar"}. Förhandla för att lugna läget.`);
    }
  }
}

export function updateAiPressure(dt) {
  if (world.girlfriend.strategyTimer > 0) {
    world.girlfriend.strategyTimer = Math.max(0, world.girlfriend.strategyTimer - dt);
  } else {
    world.girlfriend.responseLevel = Math.max(0, world.girlfriend.responseLevel - dt * 0.1);
    if (world.girlfriend.responseLevel <= 0.01) {
      world.girlfriend.strategyRoom = null;
      world.girlfriend.strategyAction = null;
    }
  }
}

export function getAiFocusRoom() {
  return world.girlfriend.strategyTimer > 0 ? world.girlfriend.strategyRoom : null;
}
