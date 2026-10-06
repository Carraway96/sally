import { GIRL_REACTION_DURATION, PLAYER_SPRITE_BOX, STATE, getGirlProfileById } from "./data.js";

export function createRoomValueMap(initialValue = 0) {
  return {
    vardagsrum: initialValue,
    kok: initialValue,
    badrum: initialValue,
    sovrum: initialValue,
    hall: initialValue,
  };
}

function createInitialStoryRun() {
  return {
    active: false,
    chapterId: null,
    currentDay: 0,
    lastScreen: null,
    completedDays: [],
    modifiers: {},
    runtime: {},
    dayComplete: false,
    lastPlanCardId: null,
    completedObjectives: [],
    flags: {},
    relationship: 0,
    dayResults: [],
    planBoost: false,
  };
}

function isStoryState(state) {
  return (
    state === STATE.STORY_MENU ||
    state === STATE.STORY_SCENE ||
    state === STATE.PLANNING ||
    state === STATE.CHAPTER_SUMMARY
  );
}

function createInitialWorld() {
  return {
    state: STATE.MENU,
    prevStateBeforeSettings: STATE.MENU,
    resumeState: null,
    currentMode: null,
    selectedGirlId: "sally",
    player: {
      x: 498,
      y: 422,
      w: PLAYER_SPRITE_BOX.w,
      h: PLAYER_SPRITE_BOX.h,
      collisionW: PLAYER_SPRITE_BOX.collisionW,
      collisionH: PLAYER_SPRITE_BOX.collisionH,
      collisionOffsetX: PLAYER_SPRITE_BOX.collisionOffsetX,
      collisionOffsetY: PLAYER_SPRITE_BOX.collisionOffsetY,
      color: "#5a8cf6",
      dir: "front",
    },
    girlfriend: {
      x: 590,
      y: 460,
      w: 72,
      h: 112,
      collisionW: 28,
      collisionH: 28,
      collisionOffsetX: 22,
      collisionOffsetY: 78,
      speed: 125,
      dir: "front",
      target: { x: 590, y: 460 },
      targetRoom: "hall",
      path: [],
      pathIndex: 0,
      repathAttempts: 0,
      stuckTimer: 0,
      lastX: 590,
      lastY: 460,
      reclaimTargetId: null,
      reclaimCooldown: 0,
      strategyRoom: null,
      strategyAction: null,
      strategyTimer: 0,
      responseLevel: 0,
    },
    items: [],
    interactionItemId: null,
    interactionDismissedId: null,
    gamepadInteractionOpen: false,
    tutorial: { active: false },
    roomStability: createRoomValueMap(0),
    roomTakeover: createRoomValueMap(0),
    roomStabilizeCooldown: 0,
    dealsLeft: 2,
    challenge: null,
    activeCombos: [],
    comboPulse: { text: "", timer: 0 },
    girlification: 8,
    annoyance: 0,
    day: 1,
    targetDays: 3,
    dayTimer: 0,
    dayDuration: 75,
    spawnTimer: 6,
    spawnCycleDuration: 6,
    eventTimer: 22,
    eventCycleDuration: 22,
    burstQueue: 0,
    burstCooldown: 0,
    activeEvent: null,
    eventScene: null,
    eventBreather: null,
    ikeaTimer: 0,
    forceBossSpawn: false,
    forceBossRoom: null,
    forceBossType: null,
    pendingPlacements: [],
    placementCooldown: 0,
    dialogue: { text: "", timer: 0, lineIndex: -1, speaker: "girl", queue: [] },
    toast: { text: "", timer: 0 },
    moodSwing: { active: false, timer: 0 },
    charmCooldown: 0,
    vfxClock: 0,
    charmFx: { timer: 0, duration: 0, particles: [] },
    charmImpact: { timer: 0, duration: 0, relief: 0, sparks: [] },
    roomAlertTimers: createRoomValueMap(0),
    girlfriendReaction: { text: "", timer: 0, duration: GIRL_REACTION_DURATION, color: "#fff4fb" },
    recentRemovals: [],
    lastAggressiveAt: -999,
    lastBanterAt: -999,
    suspicionActive: false,
    stats: {
      removed: 0,
      hidden: 0,
      relocated: 0,
      roomsLost: 0,
      suspicionTriggers: 0,
      intercepted: 0,
      stabilizedRooms: 0,
      used: 0,
      combosTriggered: 0,
      challengeCompleted: false,
    },
    roomStates: {
      vardagsrum: "Neutral",
      kok: "Neutral",
      badrum: "Neutral",
      sovrum: "Neutral",
      hall: "Neutral",
    },
    overReason: null,
    hasRunStarted: false,
    menuHover: "",
    storyRun: createInitialStoryRun(),
    dailyObjective: null,
    roomStabilizeCounts: createRoomValueMap(0),
    chapterId: null,
    storyDay: 0,
    storySceneId: null,
    cutscene: { shotIndex: 0, elapsed: 0 },
    selectedPlanCard: null,
    storyResult: null,
    endingId: null,
    achievements: [],
    storyFlags: {},
    runHistoryRecorded: false,
  };
}

export const world = createInitialWorld();

let nextItemId = 1;

export function clearStoryProgress(options = {}) {
  const { preserveMode = false, preserveResume = false } = options;
  world.storyRun = createInitialStoryRun();
  world.chapterId = null;
  world.storyDay = 0;
  world.storySceneId = null;
  world.cutscene = { shotIndex: 0, elapsed: 0 };
  world.selectedPlanCard = null;
  world.storyResult = null;
  if (!preserveMode && world.currentMode === "story") {
    world.currentMode = null;
  }
  if (!preserveResume && isStoryState(world.resumeState)) {
    world.resumeState = null;
  }
}

export function resetRun(selectedGirlId = world.selectedGirlId, options = {}) {
  const { clearStoryState = true } = options;
  const profile = getGirlProfileById(selectedGirlId);
  nextItemId = 1;

  if (clearStoryState) {
    clearStoryProgress();
  }

  world.player.x = 498;
  world.player.y = 422;
  world.player.dir = "front";
  world.player.walking = { distance: 0, moving: false, strength: 0 };
  world.girlfriend.x = 590;
  world.girlfriend.y = 460;
  world.girlfriend.target.x = 590;
  world.girlfriend.target.y = 460;
  world.girlfriend.targetRoom = "hall";
  world.girlfriend.dir = "front";
  world.girlfriend.walking = { distance: 0, moving: false, strength: 0 };
  world.girlfriend.speed = 125 * profile.speedFactor;
  world.girlfriend.path = [];
  world.girlfriend.pathIndex = 0;
  world.girlfriend.repathAttempts = 0;
  world.girlfriend.stuckTimer = 0;
  world.girlfriend.lastX = 590;
  world.girlfriend.lastY = 460;
  world.girlfriend.reclaimTargetId = null;
  world.girlfriend.reclaimCooldown = 0;
  world.girlfriend.strategyRoom = null;
  world.girlfriend.strategyAction = null;
  world.girlfriend.strategyTimer = 0;
  world.girlfriend.responseLevel = 0;

  world.items = [];
  world.interactionItemId = null;
  world.interactionDismissedId = null;
  world.gamepadInteractionOpen = false;
  world.tutorial = { active: false };
  world.roomStability = createRoomValueMap(0);
  world.roomTakeover = createRoomValueMap(0);
  world.roomStabilizeCooldown = 0;
  world.dealsLeft = 2;
  world.activeCombos = [];
  world.comboPulse = { text: "", timer: 0 };
  world.dailyObjective = null;
  world.cutscene = { shotIndex: 0, elapsed: 0 };
  world.roomStabilizeCounts = createRoomValueMap(0);
  world.girlification = 8;
  world.annoyance = 0;
  world.day = 1;
  world.targetDays = profile.targetDays;
  world.dayTimer = 0;
  world.spawnTimer = 5 * profile.spawnIntervalFactor;
  world.spawnCycleDuration = world.spawnTimer;
  world.eventTimer = (18 + Math.random() * 10) * profile.eventIntervalFactor;
  world.eventCycleDuration = world.eventTimer;
  world.burstQueue = 0;
  world.burstCooldown = 0;
  world.activeEvent = null;
  world.eventScene = null;
  world.eventBreather = null;
  world.ikeaTimer = 0;
  world.forceBossSpawn = false;
  world.forceBossRoom = null;
  world.forceBossType = null;
  world.pendingPlacements = [];
  world.placementCooldown = 0;
  world.dialogue.text = "";
  world.dialogue.timer = 0;
  world.dialogue.lineIndex = -1;
  world.dialogue.speaker = "girl";
  world.dialogue.queue = [];
  world.toast.text = "";
  world.toast.timer = 0;
  world.moodSwing.active = false;
  world.moodSwing.timer = 0;
  world.charmCooldown = 0;
  world.vfxClock = 0;
  world.charmFx.timer = 0;
  world.charmFx.duration = 0;
  world.charmFx.particles = [];
  world.charmImpact.timer = 0;
  world.charmImpact.duration = 0;
  world.charmImpact.relief = 0;
  world.charmImpact.sparks = [];
  world.roomAlertTimers = createRoomValueMap(0);
  world.girlfriendReaction.text = "";
  world.girlfriendReaction.timer = 0;
  world.girlfriendReaction.duration = GIRL_REACTION_DURATION;
  world.girlfriendReaction.color = "#fff4fb";
  world.recentRemovals = [];
  world.lastAggressiveAt = -999;
  world.lastBanterAt = -999;
  world.suspicionActive = false;
  world.overReason = null;
  world.endingId = null;
  world.achievements = [];
  world.runHistoryRecorded = false;
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
  };
  world.roomStates = {
    vardagsrum: "Neutral",
    kok: "Neutral",
    badrum: "Neutral",
    sovrum: "Neutral",
    hall: "Neutral",
  };
}

export function takeNextItemId() {
  const id = nextItemId;
  nextItemId += 1;
  return id;
}

export function syncNextItemId() {
  const maxId = world.items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  nextItemId = maxId + 1;
}
