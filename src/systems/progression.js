import { STATE, rooms } from "../core/data.js";
import { playSfx } from "../core/audio.js?v=3";
import { world } from "../core/state.js";
import { clamp } from "../core/utils.js";
import { getSelectedGirlProfile } from "../game/shared.js";
import { setToast, showGirlfriendReaction } from "./feedback.js";
import { getStoryPassiveGainMultiplier } from "./planning.js";
import { evaluateRunOutcome } from "./replay.js";
import { getChallengeMultiplier, getChallengeRoomStabilityBonus } from "./challenges.js";
import { getComboRoomEffects, updateComboState } from "./combos.js";
import { recordRunResult } from "../core/profile.js";

function getRoomScoreFactor(item) {
  if (item.room === "vardagsrum" && !item.hidden && !item.relocated) return 1.2;
  if (item.room === "sovrum" && item.hidden) return 2.3;
  if (item.room === "hall" && item.relocated) return 1.65;
  return 1;
}

function getRoomPassiveFactor(item) {
  if (item.room === "vardagsrum" && !item.hidden && !item.relocated) return 1.18;
  if (item.room === "badrum" && !item.hidden) return 1.16;
  if (item.room === "sovrum" && item.hidden) return 2.1;
  if (item.room === "hall" && item.relocated) return 1.6;
  return 1;
}

function getItemSettleRate(item) {
  if (item.room === "badrum" && !item.hidden) return 1.6;
  return 1;
}

export function checkEndConditions() {
  if (world.state === STATE.GAME_OVER) return;
  if (world.annoyance >= 100) {
    world.annoyance = 100;
    world.overReason = "irritation";
    world.state = STATE.GAME_OVER;
    playSfx("fail");
    recordRunResult(world);
    return;
  }
  if (world.girlification >= 100) {
    world.girlification = 100;
    world.overReason = "girlification";
    world.state = STATE.GAME_OVER;
    playSfx("fail");
    recordRunResult(world);
  }
}

export function computeRoomStatesAndBonuses(dt, bumpRoomAlert) {
  const profile = getSelectedGirlProfile();
  updateComboState();
  const roomScore = {
    vardagsrum: 0,
    kok: 0,
    badrum: 0,
    sovrum: 0,
    hall: 0,
  };

  for (const item of world.items) {
    const mult = item.hidden ? 0.15 : item.relocated ? 0.4 : 1;
    roomScore[item.room] += item.value * mult * getRoomScoreFactor(item);
  }

  for (const roomKey of Object.keys(roomScore)) {
    const comboEffects = getComboRoomEffects(roomKey);
    world.roomStability[roomKey] = Math.max(
      0,
      (world.roomStability[roomKey] || 0) - dt * 0.12 * getChallengeMultiplier("roomStabilityDecayMultiplier", 1)
    );
    roomScore[roomKey] += comboEffects.roomScore;
    roomScore[roomKey] = Math.max(0, roomScore[roomKey] - (world.roomStability[roomKey] || 0));
  }

  for (const roomKey of Object.keys(roomScore)) {
    let nextState = "Neutral";
    const takeoverTarget = clamp(roomScore[roomKey] / 20, 0, 1);
    const previousTakeover = world.roomTakeover[roomKey] || 0;
    world.roomTakeover[roomKey] = previousTakeover + (takeoverTarget - previousTakeover) * clamp(dt * 3, 0, 1);
    if (roomScore[roomKey] >= 20) nextState = "Girlified";
    else if (roomScore[roomKey] >= 11) nextState = "Contested";

    const previousState = world.roomStates[roomKey];
    if (nextState !== previousState) {
      bumpRoomAlert(roomKey, nextState === "Girlified" ? 2.4 : 1.2);
    }
    if (nextState === "Contested" && previousState === "Neutral") {
      playSfx("telegraph");
    }
    if (nextState === "Girlified" && previousState !== "Girlified") {
      world.stats.roomsLost += 1;
      showGirlfriendReaction("!!", "#ffd4e6", 1.2);
      playSfx("flip");
      setToast(`${rooms[roomKey].name} är nu tjejifierat.`);
    }
    world.roomStates[roomKey] = nextState;
  }

  let passiveGain = 0;
  for (const item of world.items) {
    item.age += dt * getItemSettleRate(item);
    const settle = clamp(1 + item.age / 120, 1, 1.45);
    const mode = item.hidden ? 0.07 : item.relocated ? 0.2 : 0.42;
    passiveGain += item.value * settle * mode * getRoomPassiveFactor(item) * getStoryPassiveGainMultiplier(item.room);
  }

  const inRoom = (roomKey, ids) =>
    world.items.filter((item) => item.room === roomKey && !item.hidden && ids.includes(item.typeId)).length;

  for (const roomKey of Object.keys(roomScore)) {
    const candles = inRoom(roomKey, ["candle"]);
    const blankets = inRoom(roomKey, ["blanket"]);
    const pillows = inRoom(roomKey, ["pillow"]);
    if (candles > 0 && blankets > 0 && pillows > 0) {
      passiveGain += 1.6;
    }
  }

  const bathroomPresence = world.items.filter((item) => item.room === "badrum" && !item.hidden).length;
  if (bathroomPresence >= 3) passiveGain += 1.8;
  const mugCount = world.items.filter((item) => item.room === "kok" && item.typeId === "mug" && !item.hidden).length;
  if (mugCount >= 3) passiveGain += 1.7;

  const auraItems = world.items.filter((item) => item.aura > 0 && !item.hidden);
  if (auraItems.length) {
    let auraBoost = 0;
    for (const aura of auraItems) {
      for (const other of world.items) {
        if (other.id === aura.id || other.hidden) continue;
        const d = Math.hypot(other.x - aura.x, other.y - aura.y);
        if (d < 140) auraBoost += other.value * aura.aura;
      }
    }
    passiveGain += auraBoost * 0.02;
  }

  for (const roomKey of Object.keys(roomScore)) {
    const comboEffects = getComboRoomEffects(roomKey);
    passiveGain += comboEffects.passiveGain;
    world.roomStability[roomKey] = Math.min(16, (world.roomStability[roomKey] || 0) + comboEffects.stability * dt * 0.08);
    world.roomStability[roomKey] = Math.min(16, world.roomStability[roomKey] + getChallengeRoomStabilityBonus(roomKey) * dt * 0.025);
  }

  if (world.roomStates.vardagsrum === "Girlified") passiveGain += 0.7;
  if (world.roomStates.badrum === "Girlified") passiveGain += 0.6;
  if (world.roomStates.hall === "Girlified") passiveGain += 0.4;

  world.girlification = clamp(
    world.girlification + passiveGain * profile.passiveGainFactor * getChallengeMultiplier("passiveGainMultiplier", 1) * dt * 0.1,
    0,
    100
  );
}

export function updateAnnoyance(dt) {
  const now = world.vfxClock;
  world.recentRemovals = world.recentRemovals.filter((time) => now - time < 12);
  const suspicionNow = world.recentRemovals.length >= 3;

  if (suspicionNow && !world.suspicionActive) {
    world.suspicionActive = true;
    world.stats.suspicionTriggers += 1;
    setToast("Hon börjar ana ett mönster.");
    showGirlfriendReaction("?!", "#ffe7a6", 1.35);
    playSfx("suspicion");
  } else if (!suspicionNow) {
    world.suspicionActive = false;
  }

  if (suspicionNow) {
    world.annoyance = clamp(world.annoyance + dt * 2.7, 0, 100);
  }

  if (world.annoyance >= 100) {
    world.annoyance = 100;
    return;
  }

  const justAggressive = now - world.lastAggressiveAt < 5;
  const comboDecay = Object.keys(world.roomStates).reduce((sum, roomKey) => sum + getComboRoomEffects(roomKey).annoyanceDecay, 0);
  const decay = ((justAggressive ? 0.12 : 0.9) + comboDecay) * getSelectedGirlProfile().annoyanceDecayFactor * getChallengeMultiplier("annoyanceDecayMultiplier", 1);
  world.annoyance = clamp(world.annoyance - decay * dt, 0, 100);
}

export function updateCharmEffect(dt) {
  if (world.charmFx.timer > 0) {
    world.charmFx.timer = Math.max(0, world.charmFx.timer - dt);
  }

  if (!world.charmFx.particles.length) return;

  const nextParticles = [];
  for (const particle of world.charmFx.particles) {
    particle.life -= dt;
    if (particle.life <= 0) continue;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.98;
    particle.vy += 85 * dt;
    nextParticles.push(particle);
  }
  world.charmFx.particles = nextParticles;
}

export function updateCharmImpact(dt) {
  if (world.charmImpact.timer > 0) {
    world.charmImpact.timer = Math.max(0, world.charmImpact.timer - dt);
  }

  if (!world.charmImpact.sparks.length) return;

  const nextSparks = [];
  for (const spark of world.charmImpact.sparks) {
    spark.life -= dt;
    if (spark.life <= 0) continue;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vx *= 0.96;
    spark.vy += 48 * dt;
    nextSparks.push(spark);
  }
  world.charmImpact.sparks = nextSparks;
}

export function updateDayProgress(dt, maybeStartMoodSwing) {
  world.dayTimer += dt;
  if (world.dayTimer >= world.dayDuration) {
    world.dayTimer -= world.dayDuration;
    world.day += 1;
    world.dealsLeft = 2;
    world.moodSwing.active = false;
    world.moodSwing.timer = 0;
    maybeStartMoodSwing();
    setToast(`Dag ${world.day} börjar.`);
  }
  if (world.moodSwing.active) {
    world.moodSwing.timer -= dt;
    if (world.moodSwing.timer <= 0) {
      world.moodSwing.active = false;
      setToast("Humörsvängningen lugnade ner sig.");
    }
  }
  if (world.day > world.targetDays) {
    if (world.currentMode === "story" && world.storyRun.active) {
      world.storyRun.dayComplete = true;
      world.day = world.targetDays;
      return;
    }

    world.overReason = "win";
    evaluateRunOutcome();
    world.state = STATE.GAME_OVER;
    playSfx("win");
  }
}
