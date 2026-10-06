import { playSfx } from "../core/audio.js?v=3";
import { world } from "../core/state.js";
import { rand } from "../core/utils.js";
import { getSelectedGirlProfile } from "../game/shared.js";
import { getDifficultyMultiplier, getSpawnInterval, queuePlacement, runSpecialEvent } from "./spawning.js?v=4";
import { setToast, showGirlfriendReaction } from "./feedback.js";
import { getSpawnTimerRateMultiplier } from "./planning.js";
import { getCurrentStoryDay } from "./story.js?v=8";
import { getChallengeMultiplier } from "./challenges.js";

export function maybeStartMoodSwing() {
  if (world.moodSwing.active) return;
  const chance = getSelectedGirlProfile().moodSwingChance;
  if (Math.random() < chance) {
    world.moodSwing.active = true;
    world.moodSwing.timer = world.dayDuration;
    showGirlfriendReaction("!", "#ffc9c9", 1.3);
    setToast("Humörsvängningsdag. Rött läge aktiverat.");
    playSfx("alert");
  }
}

export function updateEvents(dt) {
  const profile = getSelectedGirlProfile();
  const storyDay = getCurrentStoryDay();
  const runtime = world.storyRun && world.storyRun.active ? (world.storyRun.runtime ||= {}) : null;

  if (
    storyDay &&
    storyDay.bossEventId &&
    runtime &&
    !runtime.bossTriggered &&
    !world.activeEvent &&
    world.dayTimer >= Math.min(42, world.dayDuration * 0.55)
  ) {
    runSpecialEvent(storyDay.bossEventId);
    runtime.bossTriggered = true;
    world.eventTimer = rand(30, 42) * profile.eventIntervalFactor * getChallengeMultiplier("eventRateMultiplier", 1);
    world.eventCycleDuration = world.eventTimer;
  }

  if (world.eventScene) return;

  world.eventTimer -= dt;
  if (world.eventTimer <= 0 && !world.activeEvent && !(storyDay && storyDay.bossEventId && runtime && !runtime.bossTriggered && world.dayTimer > 35)) {
    runSpecialEvent();
    world.eventTimer = rand(24, 40) * profile.eventIntervalFactor * getChallengeMultiplier("eventRateMultiplier", 1);
    world.eventCycleDuration = world.eventTimer;
  }

  if (world.eventScene) return;

  if (world.activeEvent) {
    world.activeEvent.timeLeft -= dt;
    if (world.activeEvent.timeLeft <= 0) {
      world.activeEvent = null;
      setToast("Händelse över.");
    }
  }
}

export function updateSpawns(dt) {
  const profile = getSelectedGirlProfile();
  const difficulty = getDifficultyMultiplier();
  const spawnRateMultiplier = getSpawnTimerRateMultiplier();
  world.spawnTimer -= dt * spawnRateMultiplier;

  if (world.ikeaTimer > 0) {
    world.ikeaTimer -= dt * spawnRateMultiplier;
    if (world.ikeaTimer <= 0) {
      queuePlacement({ typeId: "basket", room: "hall" });
      setToast("Ikea-kartongen blev visst permanent.");
    }
  }

  if (world.burstQueue > 0) {
    world.burstCooldown -= dt * spawnRateMultiplier;
    if (world.burstCooldown <= 0) {
      queuePlacement();
      world.burstQueue -= 1;
      world.burstCooldown = 0.75 / difficulty;
    }
  }

  if (world.annoyance > profile.extraBurstThreshold && Math.random() < dt * 0.22 * profile.extraBurstChanceFactor) {
    world.burstQueue += 1;
    setToast("Irritationen triggar extra placering.");
  }

  if (world.spawnTimer <= 0) {
    queuePlacement();
    world.spawnTimer = getSpawnInterval();
    world.spawnCycleDuration = world.spawnTimer;
  }
}
