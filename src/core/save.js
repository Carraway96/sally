import { syncNextItemId, world } from "./state.js";

const STORAGE_KEY = "sally-save-v1";

function sanitizeWorld() {
  const snapshot = JSON.parse(JSON.stringify(world));
  snapshot.menuHover = "";
  snapshot.toast = { text: "", timer: 0 };
  snapshot.girlfriendReaction = { text: "", timer: 0, duration: 1.25, color: "#fff4fb" };
  snapshot.charmFx = { timer: 0, duration: 0, particles: [] };
  snapshot.charmImpact = { timer: 0, duration: 0, relief: 0, sparks: [] };
  snapshot.dialogue = { text: "", timer: 0, lineIndex: -1, speaker: "girl", queue: [] };
  snapshot.state = snapshot.state === "game_over" ? "paused" : snapshot.state;
  return snapshot;
}

export function saveRunSnapshot() {
  if (!world.hasRunStarted || world.state === "game_over") return false;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, world: sanitizeWorld() }));
    return true;
  } catch {
    return false;
  }
}

export function loadRunSnapshot() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || ![2, 3].includes(parsed.version) || !parsed.world || !parsed.world.hasRunStarted) {
      return false;
    }

    Object.assign(world, parsed.world);
    // Version 2 used performance.now(), whose origin changes on reload.
    if (parsed.version === 2) {
      world.recentRemovals = [];
      world.lastAggressiveAt = -999;
    }
    world.dealsLeft ??= 2;
    world.lastBanterAt ??= -999;
    world.roomStability ||= { vardagsrum: 0, kok: 0, badrum: 0, sovrum: 0, hall: 0 };
    world.roomTakeover ||= { vardagsrum: 0, kok: 0, badrum: 0, sovrum: 0, hall: 0 };
    world.roomStabilizeCounts ||= { vardagsrum: 0, kok: 0, badrum: 0, sovrum: 0, hall: 0 };
    world.tutorial = { active: false };
    world.dailyObjective ||= null;
    world.cutscene ||= { shotIndex: 0, elapsed: 0 };
    world.eventScene ||= null;
    world.eventBreather ||= null;
    world.achievements ||= [];
    world.challenge ||= null;
    world.activeCombos ||= [];
    world.comboPulse ||= { text: "", timer: 0 };
    world.storyRun ||= {};
    world.storyRun.flags ||= {};
    world.storyRun.relationship ||= 0;
    world.storyRun.dayResults ||= [];
    world.storyRun.planBoost ||= false;
    world.girlfriend ||= {};
    world.girlfriend.strategyRoom ||= null;
    world.girlfriend.strategyAction ||= null;
    world.girlfriend.strategyTimer ||= 0;
    world.girlfriend.responseLevel ||= 0;
    world.stats = {
      removed: 0,
      hidden: 0,
      relocated: 0,
      roomsLost: 0,
      suspicionTriggers: 0,
      intercepted: 0,
      stabilizedRooms: 0,
      used: 0,
      deals: 0,
      combosTriggered: 0,
      challengeCompleted: false,
      ...(world.stats || {}),
    };
    world.resumeState = world.state === "menu" ? "paused" : world.state;
    world.state = "paused";
    world.menuHover = "";
    syncNextItemId();
    return true;
  } catch {
    return false;
  }
}

export function clearSavedRun() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private browsing; the run still works in memory.
  }
}
