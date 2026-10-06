import { canvas } from "./dom.js";
import { unlockAudioByUserGesture } from "./audio.js?v=3";
import { STATE } from "./data.js";
import { world } from "./state.js";

export const input = { keys: {}, justPressed: new Set(), device: "keyboard", gamepadMove: { x: 0, y: 0 } };
export const gamepadStatus = { state: "waiting", name: "", lastInput: "" };

const keyboardDown = new Set();
const touchDown = new Set();
const gamepadDown = new Set();
let previousPhysicalButtons = new Set();

// Standard Gamepad mapping used by Xbox controllers in Chrome.
const buttonKeys = {
  0: ["gp_confirm"],     // A: open / compromise / confirm
  1: ["gp_back"],        // B: close / back
  2: ["gp_hide"],        // X: hide
  3: ["gp_compromise"],  // Y: context-sensitive compromise
  4: ["gp_remove"],      // LB: remove
  5: ["gp_special"],     // RB: relevant special action
  6: ["b"],              // LT: intercept
  7: ["c"],              // RT: stabilize
  8: ["gp_charm"],    // View: Charma shortcut
  9: ["p"],              // Menu: pause / skip scene
  10: ["q"],             // Left stick click: distract
  11: ["h"],             // Right stick click: help
};
const buttonLabels = {
  0: "A", 1: "B", 2: "X", 3: "Y", 4: "LB", 5: "RB", 6: "LT", 7: "RT",
  8: "Back", 9: "Menu", 10: "L3", 11: "R3", 12: "Upp", 13: "Ned", 14: "Vänster", 15: "Höger",
};

function syncKey(key) {
  const wasPressed = Boolean(input.keys[key]);
  const pressed = keyboardDown.has(key) || touchDown.has(key) || gamepadDown.has(key);
  input.keys[key] = pressed;
  if (pressed && !wasPressed) input.justPressed.add(key);
}

function onKeyDown(event) {
  const key = event.key.toLowerCase();
  if (!event.repeat) input.device = "keyboard";
  keyboardDown.add(key);
  syncKey(key);
  unlockAudioByUserGesture();
  if (key === "escape") {
    if (world.eventScene) {
      event.preventDefault();
      return;
    }
    if (world.state === STATE.PLAYING) world.state = STATE.PAUSED;
    else if (world.state === STATE.PAUSED) world.state = STATE.PLAYING;
    else if (world.state === STATE.DIFFICULTY_SELECT || world.state === STATE.SETTINGS) world.state = STATE.MENU;
    event.preventDefault();
  }
}

function onKeyUp(event) {
  const key = event.key.toLowerCase();
  keyboardDown.delete(key);
  syncKey(key);
}

export function bindInputHandlers() {
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") input.device = "keyboard";
    else if (event.pointerType === "touch") input.device = "touch";
  });
  canvas.addEventListener("mousedown", unlockAudioByUserGesture);
  for (const button of document.querySelectorAll("[data-game-key]")) {
    const key = button.dataset.gameKey;
    const press = (event) => {
      event.preventDefault();
      input.device = "touch";
      touchDown.add(key);
      syncKey(key);
      unlockAudioByUserGesture();
      if (button.setPointerCapture && event.pointerId !== undefined) button.setPointerCapture(event.pointerId);
    };
    const release = (event) => {
      event.preventDefault();
      touchDown.delete(key);
      syncKey(key);
    };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  }
}

function applyGamepadKeys(next) {
  const changed = new Set([...gamepadDown, ...next]);
  gamepadDown.clear();
  for (const key of next) gamepadDown.add(key);
  for (const key of changed) syncKey(key);
}

export function updateGamepadInput() {
  let pads;
  try {
    if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") {
      gamepadStatus.state = "unsupported";
      input.gamepadMove = { x: 0, y: 0 };
      applyGamepadKeys(new Set());
      return;
    }
    pads = navigator.getGamepads();
  } catch {
    gamepadStatus.state = "blocked";
    input.gamepadMove = { x: 0, y: 0 };
    applyGamepadKeys(new Set());
    return;
  }

  const pad = Array.from(pads || []).find((entry) => entry && entry.connected !== false);
  if (!pad) {
    gamepadStatus.state = "waiting";
    gamepadStatus.name = "";
    gamepadStatus.lastInput = "";
    previousPhysicalButtons = new Set();
    input.gamepadMove = { x: 0, y: 0 };
    if (input.device === "gamepad") input.device = "keyboard";
    applyGamepadKeys(new Set());
    return;
  }

  gamepadStatus.name = pad.id || "Handkontroll";
  if (pad.mapping && pad.mapping !== "standard") {
    gamepadStatus.state = "nonstandard";
    input.gamepadMove = { x: 0, y: 0 };
    applyGamepadKeys(new Set());
    return;
  }
  gamepadStatus.state = "connected";

  const next = new Set();
  const physical = new Set();
  const axes = pad.axes || [];
  const rawX = axes[0] || 0;
  const rawY = axes[1] || 0;
  const tilt = Math.min(1, Math.hypot(rawX, rawY));
  const strength = Math.max(0, (tilt - 0.18) / 0.82);
  const dpadX = Number(Boolean(pad.buttons?.[15]?.pressed)) - Number(Boolean(pad.buttons?.[14]?.pressed));
  const dpadY = Number(Boolean(pad.buttons?.[13]?.pressed)) - Number(Boolean(pad.buttons?.[12]?.pressed));
  input.gamepadMove = dpadX || dpadY
    ? { x: dpadX, y: dpadY }
    : strength > 0 ? { x: rawX / tilt * strength, y: rawY / tilt * strength } : { x: 0, y: 0 };
  const left = (axes[0] || 0) < -0.42 || Boolean(pad.buttons?.[14]?.pressed);
  const right = (axes[0] || 0) > 0.42 || Boolean(pad.buttons?.[15]?.pressed);
  const up = (axes[1] || 0) < -0.42 || Boolean(pad.buttons?.[12]?.pressed);
  const down = (axes[1] || 0) > 0.42 || Boolean(pad.buttons?.[13]?.pressed);
  if (left) { next.add("a"); next.add("gp_left"); }
  if (right) { next.add("d"); next.add("gp_right"); }
  if (up) { next.add("w"); next.add("gp_up"); }
  if (down) { next.add("s"); next.add("gp_down"); }

  for (const [indexString, keys] of Object.entries(buttonKeys)) {
    const index = Number(indexString);
    const button = pad.buttons?.[index];
    if (button?.pressed || (button?.value || 0) > 0.55) {
      physical.add(index);
      for (const key of keys) next.add(key);
    }
  }
  for (const index of [12, 13, 14, 15]) {
    if (pad.buttons?.[index]?.pressed) physical.add(index);
  }
  for (const index of physical) {
    if (!previousPhysicalButtons.has(index)) {
      input.device = "gamepad";
      gamepadStatus.lastInput = buttonLabels[index] || `Knapp ${index}`;
      if (index === 0) unlockAudioByUserGesture();
    }
  }
  previousPhysicalButtons = physical;
  if (tilt > 0.32 && input.device !== "gamepad") {
    input.device = "gamepad";
    gamepadStatus.lastInput = "Vänster spak";
  }
  if (["gp_left", "gp_right", "gp_up", "gp_down"].some((key) => next.has(key) && !gamepadDown.has(key))) {
    input.device = "gamepad";
  }
  applyGamepadKeys(next);
}
