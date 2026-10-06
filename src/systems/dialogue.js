import { getVoiceClipByIndex, playVoice } from "../core/audio.js?v=3";
import { world } from "../core/state.js";
import { getActiveGirlLines, getDialogueSpeaker } from "../game/shared.js";

export function showDialogue(lineIndex) {
  const lines = getActiveGirlLines();
  const text = lines[lineIndex] || lines[0];
  world.dialogue.queue.push({ text, lineIndex, speaker: "girl" });
  if (!world.dialogue.text) {
    startNextDialogue();
  }
}

export function showGuyDialogue(text) {
  if (!text) return;
  world.dialogue.queue.push({ text, lineIndex: -1, speaker: "guy" });
  if (!world.dialogue.text) {
    startNextDialogue();
  }
}

export function showGirlTextDialogue(text) {
  if (!text) return;
  world.dialogue.queue.push({ text, lineIndex: -1, speaker: "girl", silent: true });
  if (!world.dialogue.text) startNextDialogue();
}

export function startNextDialogue() {
  if (!world.dialogue.queue.length) {
    world.dialogue.text = "";
    world.dialogue.timer = 0;
    world.dialogue.lineIndex = -1;
    world.dialogue.speaker = "girl";
    return;
  }

  const next = world.dialogue.queue.shift();
  const speaker = getDialogueSpeaker(next.speaker);
  const voiceIndex = Number.isInteger(next.lineIndex) ? next.lineIndex : -1;
  const clip = speaker.voiceEnabled ? getVoiceClipByIndex(voiceIndex) : null;
  const clipDuration = clip && Number.isFinite(clip.duration) && clip.duration > 0 ? clip.duration : 0;
  const textDuration = Math.max(3.2, next.text.length * 0.07);

  world.dialogue.text = next.text;
  world.dialogue.timer = Math.max(textDuration, clipDuration + 0.35);
  world.dialogue.lineIndex = voiceIndex;
  world.dialogue.speaker = next.speaker || "girl";
  if (speaker.voiceEnabled && !next.silent) {
    playVoice(voiceIndex);
  }
}

export function updateDialogue(dt) {
  if (world.dialogue.timer > 0) {
    world.dialogue.timer -= dt;
  }

  if (world.dialogue.timer <= 0) {
    startNextDialogue();
  }
}
