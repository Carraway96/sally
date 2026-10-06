import { playSfx } from "../core/audio.js?v=3";
import { STATE } from "../core/data.js";
import { world } from "../core/state.js";
import { getPlanningCardById, PLANNING_CARDS } from "../data/planningCards.js";
import { startStoryGameplayDay } from "./story.js?v=8";
import { setToast } from "./feedback.js";

function cloneRoomMap(map = {}) {
  return { ...map };
}

function cloneCardModifiers(card) {
  const modifiers = card && card.modifiers ? card.modifiers : {};
  return {
    defensiveCalmCharges: modifiers.defensiveCalmCharges || 0,
    defensiveActionAnnoyanceMultiplier: modifiers.defensiveActionAnnoyanceMultiplier || 1,
    roomWeightMultipliers: cloneRoomMap(modifiers.roomWeightMultipliers),
    roomPassiveMultipliers: cloneRoomMap(modifiers.roomPassiveMultipliers),
    unlockDistract: !!modifiers.unlockDistract,
    distractDuration: modifiers.distractDuration || 0,
    distractCooldown: modifiers.distractCooldown || 0,
    distractSpawnRateMultiplier: modifiers.distractSpawnRateMultiplier || 1,
    distractMovementMultiplier: modifiers.distractMovementMultiplier || 1,
    storyEffect: modifiers.storyEffect ? { ...modifiers.storyEffect } : null,
  };
}

function ensureStoryRuntime() {
  if (!world.storyRun.runtime) {
    world.storyRun.runtime = {};
  }

  if (typeof world.storyRun.runtime.defensiveCalmCharges !== "number") {
    world.storyRun.runtime.defensiveCalmCharges = 0;
  }
  if (typeof world.storyRun.runtime.distractActiveTimer !== "number") {
    world.storyRun.runtime.distractActiveTimer = 0;
  }
  if (typeof world.storyRun.runtime.distractCooldown !== "number") {
    world.storyRun.runtime.distractCooldown = 0;
  }
  if (typeof world.storyRun.runtime.bossTriggered !== "boolean") {
    world.storyRun.runtime.bossTriggered = false;
  }

  return world.storyRun.runtime;
}

function getStoryModifiers() {
  return world.storyRun && world.storyRun.modifiers ? world.storyRun.modifiers : {};
}

export function getPlanningCardsForCurrentDay() {
  return PLANNING_CARDS;
}

export function getSelectedPlanningCard() {
  return getPlanningCardById(world.selectedPlanCard);
}

export function selectPlanningCard(cardId) {
  if (world.state !== STATE.PLANNING) return false;
  const card = getPlanningCardById(cardId);
  if (!card) return false;

  world.selectedPlanCard = card.id;
  setToast(`${card.name} vald.`);
  return true;
}

export function canConfirmPlanningSelection() {
  return world.state === STATE.PLANNING && !!getSelectedPlanningCard();
}

export function confirmPlanningSelection() {
  const card = getSelectedPlanningCard();
  if (!card) {
    setToast("Välj ett planeringskort först.");
    return false;
  }

  world.storyRun.modifiers = cloneCardModifiers(card);
  const earnedBoost = !!world.storyRun.planBoost;
  if (earnedBoost) {
    if (card.id === "stadrunda") world.storyRun.modifiers.defensiveCalmCharges += 1;
    if (card.id === "lockbete") world.storyRun.modifiers.roomPassiveMultipliers.hall *= 0.75;
    if (card.id === "distrahera") world.storyRun.modifiers.distractDuration += 2;
  }
  world.storyRun.planBoost = false;
  world.storyRun.runtime = {
    defensiveCalmCharges: world.storyRun.modifiers.defensiveCalmCharges || 0,
    distractActiveTimer: 0,
    distractCooldown: 0,
    bossTriggered: false,
  };
  world.storyRun.dayComplete = false;
  world.storyRun.lastPlanCardId = card.id;

  playSfx("telegraph");
  setToast(`${card.name} aktivt${earnedBoost ? " med bonus från gårdagens mål" : ""}.`);
  return startStoryGameplayDay();
}

export function consumeActionAnnoyanceMultiplier(action) {
  const modifiers = getStoryModifiers();
  if (!world.storyRun.active || action === "remove") {
    return 1;
  }

  const runtime = ensureStoryRuntime();
  if (runtime.defensiveCalmCharges <= 0) {
    return 1;
  }

  if (action !== "hide" && action !== "relocate") {
    return 1;
  }

  runtime.defensiveCalmCharges -= 1;
  if (runtime.defensiveCalmCharges === 0) {
    setToast("Städrundan är förbrukad.");
  }

  return modifiers.defensiveActionAnnoyanceMultiplier || 1;
}

export function peekActionAnnoyanceMultiplier(action) {
  const modifiers = getStoryModifiers();
  if (!world.storyRun.active || action === "remove") {
    return 1;
  }

  const runtime = ensureStoryRuntime();
  if (runtime.defensiveCalmCharges <= 0) {
    return 1;
  }

  if (action !== "hide" && action !== "relocate") {
    return 1;
  }

  return modifiers.defensiveActionAnnoyanceMultiplier || 1;
}

export function getStoryRoomWeightMultiplier(roomKey) {
  const modifiers = getStoryModifiers();
  if (!modifiers.roomWeightMultipliers) {
    return 1;
  }
  return modifiers.roomWeightMultipliers[roomKey] || 1;
}

export function getStoryPassiveGainMultiplier(roomKey) {
  const modifiers = getStoryModifiers();
  if (!modifiers.roomPassiveMultipliers) {
    return 1;
  }
  return modifiers.roomPassiveMultipliers[roomKey] || 1;
}

export function hasDistractAbility() {
  return !!getStoryModifiers().unlockDistract;
}

export function tryUseDistract() {
  if (!hasDistractAbility()) {
    return false;
  }

  const runtime = ensureStoryRuntime();
  const modifiers = getStoryModifiers();
  if (runtime.distractCooldown > 0) {
    setToast(`Distraktion redo om ${Math.ceil(runtime.distractCooldown)} sek.`);
    return false;
  }

  runtime.distractActiveTimer = modifiers.distractDuration || 0;
  runtime.distractCooldown = modifiers.distractCooldown || runtime.distractActiveTimer;
  playSfx("event");
  setToast("Distraktion igång. Tempot bromsas.");
  return true;
}

export function updatePlanningRuntime(dt) {
  if (!world.storyRun.active) return;

  const runtime = ensureStoryRuntime();
  runtime.distractCooldown = Math.max(0, runtime.distractCooldown - dt);
  runtime.distractActiveTimer = Math.max(0, runtime.distractActiveTimer - dt);
}

export function getSpawnTimerRateMultiplier() {
  if (!hasDistractAbility()) return 1;
  const runtime = ensureStoryRuntime();
  if (runtime.distractActiveTimer <= 0) {
    return 1;
  }
  return getStoryModifiers().distractSpawnRateMultiplier || 1;
}

export function getPlacementMovementMultiplier() {
  if (!hasDistractAbility()) return 1;
  const runtime = ensureStoryRuntime();
  if (runtime.distractActiveTimer <= 0) {
    return 1;
  }
  return getStoryModifiers().distractMovementMultiplier || 1;
}
