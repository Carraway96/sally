import { GIRL_LINES, getDialogueSpeakerById, getGirlProfileById, getGirlSpeakerById } from "../core/data.js";
import { world } from "../core/state.js";

export function getSelectedGirlProfile() {
  return getGirlProfileById(world.selectedGirlId);
}

export function getActiveGirlLines() {
  return getSelectedGirlProfile().dialogueLines || GIRL_LINES;
}

export function getGirlSpeaker() {
  return getGirlSpeakerById(world.selectedGirlId);
}

export function getDialogueSpeaker(speakerId) {
  return getDialogueSpeakerById(world.selectedGirlId, speakerId);
}

export function roomStateToSwedish(state) {
  if (state === "Girlified") return "Tjejifierat";
  if (state === "Contested") return "Omstritt";
  return "Neutralt";
}

export function activePlacementTarget() {
  if (!world.pendingPlacements.length) return null;
  return world.pendingPlacements[0];
}
