import { RUN_CHALLENGES } from "../core/data.js";
import { world } from "../core/state.js";
import { getProfile } from "../core/profile.js";

export function getAvailableChallenges() {
  const profile = getProfile();
  return RUN_CHALLENGES.filter((challenge) =>
    challenge.id === "quiet_morning" ||
    profile.unlockedChallenges.includes(challenge.id) ||
    (challenge.id === "practical_home" && profile.wins >= 1) ||
    (challenge.id === "pressure_cooker" && profile.wins >= 3)
  );
}

export function chooseRunChallenge(preferredId = null) {
  const available = getAvailableChallenges();
  const challenge = available.find((entry) => entry.id === preferredId) || available[Math.floor(Math.random() * available.length)];
  world.challenge = { ...challenge };
  if (challenge.roomBias) world.challenge.roomBias = { ...challenge.roomBias };
  if (challenge.roomStabilityBonus) world.challenge.roomStabilityBonus = { ...challenge.roomStabilityBonus };
  return world.challenge;
}

export function getChallenge() {
  return world.challenge || {};
}

export function getChallengeMultiplier(key, fallback = 1) {
  const value = getChallenge()[key];
  return typeof value === "number" ? value : fallback;
}

export function getChallengeRoomMultiplier(roomKey) {
  return getChallenge().roomBias?.[roomKey] || 1;
}

export function getChallengeRoomStabilityBonus(roomKey) {
  return getChallenge().roomStabilityBonus?.[roomKey] || 0;
}

export function getChallengeLabel() {
  return getChallenge().name || "Standardrunda";
}

export function getChallengeDescription() {
  return getChallenge().description || "Ingen extra regel aktiv.";
}
