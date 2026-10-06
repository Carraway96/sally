import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
globalThis.document = {
  body: { classList: { toggle() {} } },
  getElementById: (id) => id === "gameCanvas" ? { width: 1000, height: 640, getContext: () => ({}) } : null,
};
globalThis.Image = class { set src(value) { this.path = value; } };
globalThis.Audio = class { play() { return Promise.resolve(); } pause() {} };

const { world, resetRun } = await import("../src/core/state.js");
const { updatePlayer, getActionPreview, getContextAbility } = await import("../src/systems/player.js");
const { updatePlaying } = await import("../src/systems/gameplay.js");
const { computeRoomStatesAndBonuses, updateAnnoyance, updateDayProgress } = await import("../src/systems/progression.js");
const { setDailyObjective, updateDailyObjective, finalizeDailyObjective } = await import("../src/systems/objectives.js");
const { saveRunSnapshot, loadRunSnapshot } = await import("../src/core/save.js");
const { startStoryRun, advanceStoryStep, completeStoryGameplayDay, startNextStoryChapter, getCurrentCutscene, skipStoryCutscene, updateCutscene } = await import("../src/systems/story.js");
const { selectPlanningCard, confirmPlanningSelection } = await import("../src/systems/planning.js");
const { getDifficultyMultiplier, queuePlacement, runSpecialEvent } = await import("../src/systems/spawning.js");
const { SPECIAL_EVENTS } = await import("../src/core/data.js");
const { canvas, ctx } = await import("../src/core/dom.js");
const { audioState } = await import("../src/core/audio.js?v=3");
const { input, gamepadStatus, bindInputHandlers, updateGamepadInput } = await import("../src/core/input.js?v=11");
const { STORY_CUTSCENES } = await import("../src/data/story/cutscenes.js");
const { drawCutscene } = await import("../src/render/cutscene.js");
const { currentEventScene, advanceEventScene, chooseEventResponse, skipEventScene } = await import("../src/systems/eventScene.js");
const { controlLabel } = await import("../src/core/controlHints.js");

function placePlayerAt(x, y) {
  world.player.x = x - 36;
  world.player.y = y - 92;
}

function act(key) {
  updatePlayer(0, { keys: {}, justPressed: new Set([key]) }, () => ({ x: 700, y: 490 }), () => {});
}

function item(id, typeId, x, y, value = 4) {
  return { id, typeId, room: "hall", x, y, value, age: 0, hidden: false, relocated: false };
}

test("walking follows actual movement and stops when collision blocks the player", async () => {
  const { getWalkingPose } = await import("../src/systems/walking.js");
  resetRun();
  // Feet collider touches the apartment's left boundary.
  placePlayerAt(30, 300);
  const x = world.player.x;
  updatePlayer(0.05, { keys: { a: true }, justPressed: new Set() }, () => ({}), () => {});
  assert.equal(world.player.x, x);
  assert.equal(getWalkingPose(world.player).frame, -1);
  updatePlayer(0.05, { keys: { d: true }, justPressed: new Set() }, () => ({}), () => {});
  assert.ok(world.player.x > x);
  assert.ok(getWalkingPose(world.player).frame >= 0);
  updatePlayer(0.05, { keys: {}, justPressed: new Set() }, () => ({}), () => {});
  assert.equal(getWalkingPose(world.player).frame, -1);
});

test("walking respects reduced motion and ignores position jumps", async () => {
  const { updateWalking, getWalkingPose } = await import("../src/systems/walking.js");
  const entity = { x: 15, y: 0 };
  updateWalking(entity, 0, 0, 0.1);
  assert.equal(getWalkingPose(entity).frame, 1);
  assert.deepEqual(getWalkingPose(entity, true), { frame: -1, bob: 0, sway: 0 });
  entity.x = 500;
  updateWalking(entity, 15, 0, 0.05);
  assert.equal(getWalkingPose(entity).frame, -1);
  resetRun();
  assert.equal(getWalkingPose(world.girlfriend).frame, -1);
});

test("preview does not change state and using a mug applies its effect", () => {
  resetRun();
  const mug = item(1, "mug", 550, 500);
  world.items = [mug];
  placePlayerAt(mug.x, mug.y);
  world.annoyance = 20;
  const preview = getActionPreview("use", mug);
  assert.equal(preview.annoyance, -8);
  assert.equal(world.annoyance, 20);
  assert.equal(world.items.length, 1);
  act("u");
  assert.equal(world.stats.used, 1);
  assert.equal(world.items.length, 0);
  assert.equal(world.annoyance, 12);
});

test("compromise uses practical items, negotiates when possible, otherwise moves once", () => {
  resetRun();
  const mug = item(10, "mug", 550, 500);
  world.items = [mug];
  placePlayerAt(mug.x, mug.y);
  assert.equal(getActionPreview("compromise", mug).kind, "use");
  act("2");
  assert.equal(world.stats.used, 1);

  resetRun();
  const charger = item(15, "charger", 550, 500);
  world.items = [charger];
  placePlayerAt(charger.x, charger.y);
  assert.equal(getActionPreview("compromise", charger).kind, "use");
  act("2");
  assert.equal(charger.used, true);
  assert.equal(getActionPreview("compromise", charger).kind, "relocate");

  resetRun();
  const art = item(11, "art", 550, 500, 6);
  const candle = item(12, "candle", 600, 500, 2);
  world.items = [art, candle];
  placePlayerAt(art.x, art.y);
  assert.equal(getActionPreview("compromise", art).kind, "deal");
  act("2");
  assert.equal(world.stats.deals, 1);
  assert.equal(world.items.length, 1);

  resetRun();
  const plant = item(13, "plant", 550, 500);
  world.items = [plant];
  placePlayerAt(plant.x, plant.y);
  assert.equal(getActionPreview("compromise", plant).kind, "relocate");
  act("2");
  assert.equal(world.stats.relocated, 1);
  assert.equal(world.storyRun.relationship, 1);
  assert.equal(getActionPreview("compromise", plant), null);
});

test("room takeover builds and recedes with its item pressure", () => {
  resetRun();
  world.items = [item(14, "basket", 550, 500, 15)];
  computeRoomStatesAndBonuses(1, () => {});
  assert.ok(world.roomTakeover.hall >= 0.7);
  world.items = [];
  computeRoomStatesAndBonuses(1, () => {});
  assert.equal(world.roomTakeover.hall, 0);
});

test("a pact trades one item, spends one charge and ends the counterplay", () => {
  resetRun();
  const accepted = item(1, "basket", 550, 500, 10);
  const exchanged = item(2, "mug", 640, 500, 4);
  world.items = [accepted, exchanged];
  placePlayerAt(accepted.x, accepted.y);
  world.girlfriend.strategyRoom = "hall";
  world.girlfriend.strategyTimer = 10;
  world.girlfriend.responseLevel = 2;
  act("4");
  assert.equal(world.items.length, 1);
  assert.equal(world.items[0].id, accepted.id);
  assert.equal(world.dealsLeft, 1);
  assert.equal(world.stats.deals, 1);
  assert.equal(world.girlfriend.strategyTimer, 0);
  assert.ok(accepted.protectedUntil > world.vfxClock);
  assert.equal(getActionPreview("deal", accepted), null);
});

test("captured rooms change action value and daily pacts refill", () => {
  resetRun();
  const basket = item(1, "basket", 550, 500, 10);
  const basicMove = getActionPreview("relocate", basket);
  world.roomStates.hall = "Girlified";
  const riskyMove = getActionPreview("relocate", basket);
  assert.ok(riskyMove.girlification > basicMove.girlification);
  assert.ok(riskyMove.annoyance > basicMove.annoyance);
  world.dealsLeft = 0;
  world.dayTimer = world.dayDuration - 0.1;
  updateDayProgress(0.2, () => {});
  assert.equal(world.dealsLeft, 2);
});

test("a room preservation objective remains failed after the room is reclaimed", () => {
  resetRun();
  setDailyObjective({ id: "keep_hall", type: "preserveRoom", room: "hall", target: 1 });
  world.roomStates.hall = "Girlified";
  updateDailyObjective();
  world.roomStates.hall = "Neutral";
  assert.equal(finalizeDailyObjective().completed, false);
});

test("save and resume preserve the game clock used by suspicion", () => {
  resetRun();
  world.hasRunStarted = true;
  world.state = "playing";
  world.vfxClock = 100;
  world.recentRemovals = [98, 99, 99.5];
  world.lastAggressiveAt = 99;
  assert.equal(saveRunSnapshot(), true);
  world.vfxClock = 0;
  world.recentRemovals = [];
  assert.equal(loadRunSnapshot(), true);
  assert.equal(world.vfxClock, 100);
  updateAnnoyance(1);
  assert.equal(world.suspicionActive, true);
  world.vfxClock = 112.5;
  updateAnnoyance(0);
  assert.equal(world.suspicionActive, false);
});

test("a completed objective improves the player's next planning choice", () => {
  startStoryRun();
  skipStoryCutscene();
  world.storyRun.planBoost = true;
  assert.equal(selectPlanningCard("stadrunda"), true);
  assert.equal(confirmPlanningSelection(), true);
  assert.equal(world.storyRun.runtime.defensiveCalmCharges, 3);
  assert.equal(world.storyRun.planBoost, false);
});

test("Sally is the only level and completes without a second chapter", async () => {
  const { STORY_CHAPTERS, getStoryChapterById } = await import("../src/data/story/chapters.js");
  const { GIRL_PROFILE_ORDER, GIRL_PROFILES } = await import("../src/core/data.js");
  assert.deepEqual(GIRL_PROFILE_ORDER, ["sally"]);
  assert.deepEqual(Object.keys(GIRL_PROFILES), ["sally"]);
  assert.equal(STORY_CHAPTERS.length, 1);
  assert.equal(STORY_CHAPTERS[0].title, "Sally");
  assert.equal(getStoryChapterById("chapter02"), null);
  startStoryRun("sally");
  for (let day=1; day<=3; day++) completeStoryGameplayDay();
  assert.equal(world.state, "chapter_summary");
  assert.equal(world.storyResult, "sally_complete");
  assert.equal(startNextStoryChapter(), false);
});

test("Sally can place all four gardening items and ordinary spawns use them", async () => {
  const { spawnItemAt, weightedItemTypeForRoom } = await import("../src/systems/spawning.js");
  const allowed = ["chili", "hanging_planter", "basil", "grow_light"];
  resetRun("sally");
  for (const typeId of allowed) spawnItemAt({ typeId, roomKey: "kok", x: 220, y: 560, lineIndex: 0 });
  assert.deepEqual(world.items.map(i => i.typeId), allowed);
  for (const room of ["kok", "hall", "badrum", "sovrum", "vardagsrum"]) {
    for (let i=0; i<30; i++) assert.ok(allowed.includes(weightedItemTypeForRoom(room)));
  }
});

test("cutscene shots advance, skip, and survive a saved run", () => {
  startStoryRun("sally");
  assert.equal(getCurrentCutscene().index, 0);
  updateCutscene(0.7);
  advanceStoryStep();
  assert.equal(getCurrentCutscene().index, 1);
  assert.equal(world.cutscene.elapsed, 0);
  assert.equal(saveRunSnapshot(), true);
  assert.equal(loadRunSnapshot(), true);
  assert.equal(world.cutscene.shotIndex, 1);
  world.state = "story_scene";
  while (world.state === "story_scene") advanceStoryStep();
  assert.equal(world.state, "planning");
  startStoryRun("sally");
  assert.equal(skipStoryCutscene(), true);
  assert.equal(world.state, "planning");
});

test("every cutscene uses existing art and renders a frame", () => {
  for (const shots of Object.values(STORY_CUTSCENES)) {
    assert.ok(shots.length >= 2);
    for (const shot of shots) {
      assert.equal(existsSync(new URL(`../${shot.image}`, import.meta.url)), true, shot.image);
      assert.ok(shot.line.length > 0);
    }
  }
  for (const method of ["fillRect", "drawImage", "beginPath", "ellipse", "arc", "fill", "save", "restore", "fillText", "strokeRect", "stroke", "rect", "clip", "moveTo", "quadraticCurveTo", "translate", "rotate"]) {
    ctx[method] = () => {};
  }
  ctx.createLinearGradient = () => ({ addColorStop() {} });
  ctx.createRadialGradient = () => ({ addColorStop() {} });
  ctx.measureText = (value) => ({ width: value.length * 13 });
  startStoryRun("sally");
  updateCutscene(2);
  assert.equal(drawCutscene(), true);
});

test("every special event offers a relationship choice and pauses its timer", () => {
  for (const event of SPECIAL_EVENTS) {
    resetRun();
    runSpecialEvent(event.id);
    const scene = currentEventScene();
    assert.equal(scene.id, event.id);
    assert.equal(scene.shots.length, 2);
    assert.ok(scene.replies.share);
    assert.ok(scene.replies.defend);
    assert.ok(scene.effect.length > 0);
    assert.equal(existsSync(new URL(`../${scene.image}`, import.meta.url)), true);
    assert.equal(world.activeEvent.timeLeft, event.duration);
    advanceEventScene();
    assert.equal(currentEventScene().index, 1);
    assert.equal(currentEventScene().choice, true);
    assert.equal(chooseEventResponse("share"), true);
    assert.equal(world.storyRun.relationship, 1);
    assert.equal(currentEventScene().reaction, true);
    advanceEventScene();
    assert.equal(currentEventScene(), null);
    assert.equal(world.activeEvent.timeLeft, event.duration);
  }
  runSpecialEvent("mello");
  skipEventScene();
  assert.equal(currentEventScene().choice, true);
  assert.equal(chooseEventResponse("defend"), true);
  assert.equal(world.storyRun.relationship, 0);
  assert.equal(currentEventScene().outcome.includes("Irritation +4"), true);
  skipEventScene();
  assert.equal(currentEventScene(), null);
});

test("event aftermath previews a real threat and gives four safe seconds to reposition", () => {
  resetRun();
  world.state = "playing";
  runSpecialEvent("bathroom_refresh");
  assert.equal(world.pendingPlacements[0].roomKey, "badrum");
  assert.equal(world.pendingPlacements[0].typeId, "hanging_planter");
  advanceEventScene();
  chooseEventResponse("defend");
  advanceEventScene();
  assert.equal(world.eventScene, null);
  assert.equal(world.eventBreather.roomKey, "badrum");
  assert.equal(world.eventBreather.itemName, "Ampel");
  const eventTime = world.activeEvent.timeLeft;
  const spawnTime = world.spawnTimer;
  const dayTime = world.dayTimer;
  const gameClock = world.vfxClock;
  const girlX = world.girlfriend.x;
  updatePlaying(2, { keys: {}, justPressed: new Set() });
  assert.equal(world.eventBreather.timeLeft, 2);
  assert.equal(world.activeEvent.timeLeft, eventTime);
  assert.equal(world.spawnTimer, spawnTime);
  assert.equal(world.dayTimer, dayTime);
  assert.equal(world.vfxClock, gameClock);
  assert.equal(world.girlfriend.x, girlX);
  updatePlaying(2, { keys: {}, justPressed: new Set() });
  assert.equal(world.eventBreather, null);
  updatePlaying(0.05, { keys: {}, justPressed: new Set() });
  assert.ok(world.activeEvent.timeLeft < eventTime);
});

test("Charma calms Sally and improves the relationship", () => {
  resetRun();
  world.annoyance = 30;
  const before = world.annoyance;
  act("f");
  assert.ok(world.annoyance < before);
  assert.equal(world.storyRun.relationship, 1);
  assert.ok(world.charmCooldown > 0);
});

test("context action stops an incoming placement when she is in reach", () => {
  resetRun();
  world.pendingPlacements = [{ typeId: "mug", roomKey: "hall", x: 620, y: 500 }];
  placePlayerAt(world.girlfriend.x + 36, world.girlfriend.y + 56);
  assert.equal(getContextAbility().id, "intercept");
  act("f");
  assert.equal(world.pendingPlacements.length, 0);
  assert.equal(world.stats.intercepted, 1);
});

test("relationship changes event pressure and visible item choices", () => {
  resetRun();
  world.storyRun.relationship = -4;
  const tensePressure = getDifficultyMultiplier();
  world.storyRun.relationship = 4;
  assert.ok(getDifficultyMultiplier() < tensePressure);

  resetRun();
  const mug = item(101, "mug", 550, 500);
  world.items = [mug];
  world.annoyance = 20;
  placePlayerAt(mug.x, mug.y);
  world.interactionItemId = mug.id;
  act("u");
  assert.equal(world.storyRun.relationship, 1);
  assert.ok(world.dialogue.queue.some((line) => line.speaker === "girl"));
});

test("touch and gamepad controls reach item actions and release cleanly", () => {
  const listeners = {};
  const touchButton = {
    dataset: { gameKey: "4" },
    addEventListener(type, handler) { listeners[type] = handler; },
    setPointerCapture() {},
  };
  globalThis.window = { addEventListener() {} };
  canvas.addEventListener = () => {};
  document.querySelectorAll = () => [touchButton];
  bindInputHandlers();
  const pointerEvent = { pointerId: 1, preventDefault() {} };
  listeners.pointerdown(pointerEvent);
  assert.equal(input.device, "touch");
  assert.equal(input.keys["4"], true);
  assert.equal(input.justPressed.has("4"), true);
  listeners.pointerup(pointerEvent);
  assert.equal(input.keys["4"], false);
  input.justPressed.clear();

  const pad = { id: "Xbox Controller", mapping: "standard", axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  pad.buttons[0].pressed = true;
  pad.buttons[2].pressed = true;
  pad.buttons[3].pressed = true;
  pad.buttons[5].pressed = true;
  pad.buttons[6].pressed = true;
  pad.buttons[11].pressed = true;
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { getGamepads: () => [null, pad] } });
  updateGamepadInput();
  assert.equal(gamepadStatus.state, "connected");
  assert.equal(input.device, "gamepad");
  assert.equal(controlLabel("intercept"), "LT");
  assert.equal(input.justPressed.has("gp_confirm"), true);
  assert.equal(input.justPressed.has("e"), false);
  assert.equal(input.justPressed.has("gp_hide"), true);
  assert.equal(input.justPressed.has("gp_compromise"), true);
  assert.equal(input.justPressed.has("gp_special"), true);
  assert.equal(input.justPressed.has("1"), false);
  assert.equal(input.justPressed.has("b"), true);
  assert.equal(input.justPressed.has("h"), true);
  assert.equal(controlLabel("help"), "R3");
  input.justPressed.clear();
  updateGamepadInput();
  assert.equal(input.justPressed.size, 0);
  pad.buttons[13].pressed = true;
  updateGamepadInput();
  assert.equal(input.justPressed.has("gp_down"), true);
  assert.equal(input.keys.s, true);
  navigator.getGamepads = () => [];
  updateGamepadInput();
  assert.equal(gamepadStatus.state, "waiting");
  assert.equal(input.device, "keyboard");
  assert.equal(controlLabel("intercept"), "B");
  assert.equal(input.keys["4"], false);
  assert.equal(input.keys.s, false);
});

test("gamepad A opens item choices, B closes them, and actions require an open choice", () => {
  audioState.sfxEnabled = false;
  resetRun();
  const mug = item(111, "mug", 550, 500);
  world.items = [mug];
  placePlayerAt(mug.x, mug.y);
  act("gp_hide");
  assert.equal(mug.hidden, false);
  act("gp_confirm");
  assert.equal(world.gamepadInteractionOpen, true);
  assert.equal(world.stats.used, 0);
  act("gp_back");
  assert.equal(world.gamepadInteractionOpen, false);
  act("gp_confirm");
  act("gp_confirm");
  assert.equal(world.stats.used, 1);
  assert.equal(world.gamepadInteractionOpen, false);
  audioState.sfxEnabled = true;
});

test("left-stick tilt controls walking speed", () => {
  resetRun();
  const start = world.player.x;
  updatePlayer(0.05, { keys: {}, justPressed: new Set(), device: "gamepad", gamepadMove: { x: 0.5, y: 0 } }, () => ({ x: 700, y: 490 }), () => {});
  const halfStep = world.player.x - start;
  resetRun();
  updatePlayer(0.05, { keys: {}, justPressed: new Set(), device: "gamepad", gamepadMove: { x: 1, y: 0 } }, () => ({ x: 700, y: 490 }), () => {});
  const fullStep = world.player.x - start;
  assert.ok(halfStep > 0);
  assert.ok(fullStep > halfStep * 1.8);
});
