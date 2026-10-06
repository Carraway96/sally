import { STATE, getGirlProfileById } from "../core/data.js";
import { tryStartMusic } from "../core/audio.js?v=3";
import { clearStoryProgress, resetRun, world } from "../core/state.js";
import { updateDialogue } from "./dialogue.js";
import { bumpRoomAlert, updateGirlfriendReaction, updateRoomAlerts, updateToast } from "./feedback.js";
import { updateEvents, updateSpawns, maybeStartMoodSwing } from "./events.js?v=4";
import { updateGirlfriend } from "./girlfriend.js?v=4";
import { getItemById, updatePlayer } from "./player.js?v=7";
import { updatePlanningRuntime } from "./planning.js?v=7";
import {
  checkEndConditions,
  computeRoomStatesAndBonuses,
  updateAnnoyance,
  updateDayProgress,
  updateCharmEffect,
  updateCharmImpact,
} from "./progression.js?v=2";
import { safeSpawnPoint } from "./spawning.js?v=4";
import { completeStoryGameplayDay } from "./story.js?v=8";
import { updateDailyObjective } from "./objectives.js";
import { chooseRunChallenge } from "./challenges.js";

export { getItemById } from "./player.js?v=7";
export { updateDialogue } from "./dialogue.js";
export { updateToast } from "./feedback.js";

export function updatePlaying(dt, input) {
  if (world.comboPulse?.timer > 0) world.comboPulse.timer = Math.max(0, world.comboPulse.timer - dt);
  if (world.eventBreather) {
    updatePlayer(dt, input, safeSpawnPoint, checkEndConditions);
    world.eventBreather.timeLeft = Math.max(0, world.eventBreather.timeLeft - dt);
    updateDialogue(dt);
    updateCharmEffect(dt);
    updateCharmImpact(dt);
    updateRoomAlerts(dt);
    updateGirlfriendReaction(dt);
    updateToast(dt);
    if (world.eventBreather.timeLeft <= 0) world.eventBreather = null;
    return;
  }
  world.vfxClock += dt;
  updatePlanningRuntime(dt);
  updatePlayer(dt, input, safeSpawnPoint, checkEndConditions);
  updateEvents(dt);
  if (world.eventScene) return;
  updateSpawns(dt);
  updateGirlfriend(dt);
  computeRoomStatesAndBonuses(dt, bumpRoomAlert);
  updateAnnoyance(dt);
  updateDayProgress(dt, maybeStartMoodSwing);
  updateDailyObjective();
  updateDialogue(dt);
  updateCharmEffect(dt);
  updateCharmImpact(dt);
  updateRoomAlerts(dt);
  updateGirlfriendReaction(dt);
  updateToast(dt);
  checkEndConditions();

  if (world.currentMode === "story" && world.state === STATE.PLAYING && world.storyRun.dayComplete) {
    completeStoryGameplayDay();
  }
}

export function startRunWithGirl(girlId) {
  world.selectedGirlId = getGirlProfileById(girlId || world.selectedGirlId).id;
  chooseRunChallenge();
  resetRun(world.selectedGirlId);
  clearStoryProgress({ preserveMode: true, preserveResume: true });
  world.hasRunStarted = true;
  world.currentMode = "survival";
  world.resumeState = STATE.PLAYING;
  world.state = STATE.PLAYING;
  tryStartMusic();
}
