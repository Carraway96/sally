import { musicToggleBtn } from "./dom.js";
import { GIRL_PROFILES, getGirlProfileById } from "./data.js";
import { world } from "./state.js";

export const audioState = {
  musicEnabled: true,
  sfxEnabled: true,
  voiceEnabled: true,
  masterVolume: 0.7,
  startedByUser: false,
  sfxCtx: null,
  voiceBusy: null,
};

const backgroundMusic = new Audio("audio/background_music.mp3");
backgroundMusic.loop = true;
backgroundMusic.volume = 0.12 * audioState.masterVolume;
backgroundMusic.preload = "auto";

function createVoiceClips(paths) {
  return paths.map((path) => {
    const clip = new Audio(path);
    clip.volume = 0.82 * audioState.masterVolume;
    clip.preload = "auto";
    return clip;
  });
}

const voiceClipsByGirlId = Object.fromEntries(
  Object.values(GIRL_PROFILES).map((profile) => [profile.id, createVoiceClips(profile.voiceClipPaths)])
);

export function updateMusicButton() {
  if (!musicToggleBtn) return;
  musicToggleBtn.textContent =
    !audioState.musicEnabled ? "Musik: Av" : !audioState.startedByUser ? "Musik: Starta" : "Musik: På";
  musicToggleBtn.setAttribute("aria-pressed", audioState.musicEnabled ? "true" : "false");
}

export function tryStartMusic() {
  if (!audioState.musicEnabled || !audioState.startedByUser) {
    return;
  }
  backgroundMusic.play().catch(() => {});
  updateMusicButton();
}

export function toggleMusic() {
  audioState.musicEnabled = !audioState.musicEnabled;
  updateMusicButton();
  if (!audioState.musicEnabled) {
    backgroundMusic.pause();
  } else {
    tryStartMusic();
  }
}

export function toggleSfx() {
  audioState.sfxEnabled = !audioState.sfxEnabled;
}

export function toggleVoice() {
  audioState.voiceEnabled = !audioState.voiceEnabled;
  if (!audioState.voiceEnabled && audioState.voiceBusy) {
    audioState.voiceBusy.pause();
    audioState.voiceBusy.currentTime = 0;
  }
}

export function adjustMasterVolume(delta) {
  audioState.masterVolume = Math.max(0, Math.min(1, Math.round((audioState.masterVolume + delta) * 10) / 10));
  backgroundMusic.volume = 0.12 * audioState.masterVolume;
  for (const clips of Object.values(voiceClipsByGirlId)) {
    for (const clip of clips) clip.volume = 0.82 * audioState.masterVolume;
  }
  return audioState.masterVolume;
}

export function unlockAudioByUserGesture() {
  if (audioState.startedByUser) {
    return;
  }
  audioState.startedByUser = true;
  tryStartMusic();
  updateMusicButton();
}

function ensureSfxCtx() {
  if (!audioState.sfxCtx) {
    audioState.sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioState.sfxCtx.state === "suspended") {
    audioState.sfxCtx.resume().catch(() => {});
  }
  return audioState.sfxCtx;
}

function playSfxLayer(ac, now, layer) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);

  const start = now + (layer.delay || 0);
  const end = start + layer.d;
  osc.type = layer.type || "triangle";
  osc.frequency.setValueAtTime(layer.f1, start);
  if (layer.curve === "linear") {
    osc.frequency.linearRampToValueAtTime(Math.max(60, layer.f2), end);
  } else {
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, layer.f2), end);
  }
  gain.gain.setValueAtTime(Math.max(0.0001, layer.v * audioState.masterVolume), start);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.start(start);
  osc.stop(end + 0.01);
}

export function playSfx(type) {
  if (!audioState.startedByUser || !audioState.sfxEnabled) return;
  const ac = ensureSfxCtx();
  if (!ac) return;
  const now = ac.currentTime;

  const map = {
    place: [
      { type: "triangle", f1: 520, f2: 690, d: 0.08, v: 0.048 },
      { type: "sine", f1: 760, f2: 980, d: 0.05, v: 0.018, delay: 0.01 },
    ],
    hide: [
      { type: "triangle", f1: 440, f2: 280, d: 0.09, v: 0.05 },
      { type: "sine", f1: 360, f2: 220, d: 0.08, v: 0.015, delay: 0.01 },
    ],
    move: [
      { type: "triangle", f1: 360, f2: 430, d: 0.08, v: 0.05 },
      { type: "sine", f1: 410, f2: 520, d: 0.05, v: 0.014, delay: 0.02 },
    ],
    remove: [
      { type: "triangle", f1: 260, f2: 170, d: 0.12, v: 0.06 },
      { type: "sawtooth", f1: 210, f2: 120, d: 0.11, v: 0.022, delay: 0.01 },
    ],
    alert: [
      { type: "sawtooth", f1: 180, f2: 145, d: 0.15, v: 0.08 },
      { type: "triangle", f1: 440, f2: 300, d: 0.11, v: 0.026, delay: 0.03 },
    ],
    event: [
      { type: "triangle", f1: 740, f2: 540, d: 0.14, v: 0.055 },
      { type: "sine", f1: 980, f2: 620, d: 0.1, v: 0.018, delay: 0.02 },
    ],
    charm: [
      { type: "sine", f1: 523, f2: 523, d: 0.15, v: 0.035 },
      { type: "sine", f1: 659, f2: 659, d: 0.15, v: 0.03, delay: 0.08 },
      { type: "triangle", f1: 784, f2: 880, d: 0.24, v: 0.025, delay: 0.16 },
    ],
    fail: [
      { type: "triangle", f1: 160, f2: 120, d: 0.24, v: 0.09 },
      { type: "sawtooth", f1: 220, f2: 80, d: 0.22, v: 0.025, delay: 0.01 },
    ],
    win: [
      { type: "triangle", f1: 420, f2: 760, d: 0.2, v: 0.07 },
      { type: "sine", f1: 620, f2: 1020, d: 0.16, v: 0.02, delay: 0.03 },
    ],
    telegraph: [
      { type: "square", f1: 880, f2: 620, d: 0.09, v: 0.032 },
      { type: "triangle", f1: 540, f2: 760, d: 0.08, v: 0.024, delay: 0.035 },
    ],
    suspicion: [
      { type: "sawtooth", f1: 520, f2: 210, d: 0.14, v: 0.038 },
      { type: "triangle", f1: 270, f2: 170, d: 0.18, v: 0.03, delay: 0.03 },
    ],
    flip: [
      { type: "triangle", f1: 300, f2: 560, d: 0.17, v: 0.048 },
      { type: "square", f1: 640, f2: 980, d: 0.08, v: 0.018, delay: 0.08 },
    ],
  };

  const layers = map[type] || map.place;
  for (const layer of layers) {
    playSfxLayer(ac, now, layer);
  }
}

export function getActiveVoiceClips() {
  const profile = getGirlProfileById(world.selectedGirlId);
  return voiceClipsByGirlId[profile.id] || voiceClipsByGirlId.sally || [];
}

export function getVoiceClipByIndex(index) {
  const voiceClips = getActiveVoiceClips();
  if (index < 0 || index >= voiceClips.length) {
    return null;
  }
  return voiceClips[index] || null;
}

export function playVoice(index) {
  if (!audioState.startedByUser || !audioState.voiceEnabled) return;
  const clip = getVoiceClipByIndex(index);
  if (!clip) return;

  if (audioState.voiceBusy && !audioState.voiceBusy.paused) {
    audioState.voiceBusy.pause();
    audioState.voiceBusy.currentTime = 0;
  }

  clip.currentTime = 0;
  clip.play().catch(() => {});
  audioState.voiceBusy = clip;
}

if (musicToggleBtn) {
  musicToggleBtn.addEventListener("click", () => {
    if (!audioState.startedByUser && audioState.musicEnabled) {
      audioState.startedByUser = true;
      tryStartMusic();
      updateMusicButton();
      return;
    }
    if (!audioState.startedByUser) {
      audioState.startedByUser = true;
    }
    toggleMusic();
  });
  updateMusicButton();
}
