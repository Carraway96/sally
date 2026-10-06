import { ITEM_TYPES, SPECIAL_EVENTS } from "../core/data.js";
import { world } from "../core/state.js";
import { getEventScene } from "../data/eventScenes.js?v=3";
import { clamp } from "../core/utils.js";

export function currentEventScene() {
  if (!world.eventScene) return null;
  const event = SPECIAL_EVENTS.find((entry) => entry.id === world.eventScene.id);
  const scene = getEventScene(event);
  if (!scene) return null;
  const index = world.eventScene.shotIndex;
  return {
    ...scene,
    index,
    total: 3,
    choice: index === 1,
    reaction: index === 2,
    shot: index === 2
      ? { speaker: "Hon", line: scene.replies[world.eventScene.choice] }
      : scene.shots[index],
    outcome: world.eventScene.outcome || "",
  };
}

export function startEventScene(eventId) {
  world.eventScene = { id: eventId, shotIndex: 0, choice: null, outcome: "" };
}

function finishEventScene() {
  const placement = world.pendingPlacements[0];
  world.eventBreather = {
    roomKey: placement?.roomKey || "hall",
    itemName: ITEM_TYPES[placement?.typeId]?.name || "en ny sak",
    duration: 4,
    timeLeft: 4,
  };
  world.eventScene = null;
}

export function advanceEventScene() {
  if (!world.eventScene) return;
  const scene = currentEventScene();
  if (!scene || world.eventScene.shotIndex >= 2) {
    finishEventScene();
  } else if (world.eventScene.shotIndex === 0) {
    world.eventScene.shotIndex += 1;
  }
}

export function skipEventScene() {
  if (!world.eventScene) return;
  if (world.eventScene.shotIndex === 0) world.eventScene.shotIndex = 1;
  else if (world.eventScene.shotIndex === 2) finishEventScene();
}

export function chooseEventResponse(choice) {
  if (!world.eventScene || world.eventScene.shotIndex !== 1 || !["share", "defend"].includes(choice)) return false;
  const relation = world.storyRun?.relationship || 0;
  if (choice === "share") {
    world.storyRun.relationship = clamp(relation + 1, -5, 8);
    world.girlification = clamp(world.girlification + 2, 0, 100);
    world.annoyance = clamp(world.annoyance - 4, 0, 100);
    world.eventScene.outcome = "Relation +1 · Tjejifiering +2 · Irritation −4";
  } else {
    world.storyRun.relationship = clamp(relation - 1, -5, 8);
    world.girlification = clamp(world.girlification - 2, 0, 100);
    world.annoyance = clamp(world.annoyance + 4, 0, 100);
    world.eventScene.outcome = "Relation −1 · Tjejifiering −2 · Irritation +4";
  }
  world.eventScene.choice = choice;
  world.eventScene.shotIndex = 2;
  return true;
}
