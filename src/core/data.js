export const STATE = {
  MENU: "menu",
  DIFFICULTY_SELECT: "difficulty_select",
  STORY_MENU: "story_menu",
  STORY_SCENE: "story_scene",
  PLANNING: "planning",
  CHAPTER_SUMMARY: "chapter_summary",
  SETTINGS: "settings",
  PLAYING: "playing",
  PAUSED: "paused",
  GAME_OVER: "game_over",
};

export const ROOM_COLORS = {
  vardagsrum: "#ece6f3",
  kok: "#f1efe5",
  badrum: "#e5eff6",
  sovrum: "#f6eaf4",
  hall: "#eee9e0",
};

export const INTERACTION_RANGE = 64;
export const INTERCEPT_RANGE = 92;
export const CHARM_COOLDOWN = 18;
export const CHARM_RELIEF = 18;
export const PLAYER_SPRITE_BOX = {
  w: 72,
  h: 112,
  collisionW: 28,
  collisionH: 28,
  collisionOffsetX: 22,
  collisionOffsetY: 78,
};
export const CHARM_EFFECT_DURATION = 0.8;
export const CHARM_PARTICLE_COUNT = 14;
export const CHARM_HIT_DURATION = 0.7;
export const ROOM_ALERT_DURATION = 1.9;
export const GIRL_REACTION_DURATION = 1.25;

export const GIRL_LINES = [
  "Jag kan ställa den här här så länge.",
  "Den tar ju nästan ingen plats.",
  "Jag tänkte att det är praktiskt om den redan finns här.",
  "Jag glömde den sist ändå.",
  "Du använder ju ändå inte den här hyllan.",
  "Den passar faktiskt ganska bra här.",
  "Det känns mer hemtrevligt så.",
  "Den är bara tillfällig.",
  "Jag har ändå med mig den varje gång jag kommer hit.",
  "Det är ju nästan som att jag bor här ibland.",
];


export const GUY_LINES = ["Dina valnötsörhängen är nästan lika fina som ditt leende.", "Ska vi ta en paus och laga något med din basilika?", "Med dig här känns lägenheten redan grönare.", "Jag fixar te, du väljer plats åt chilin."];




export const GIRL_PROFILES = {
  sally: {
    id: "sally",
    name: "Sally",
    difficultyLabel: "Normal",
    tagline: "Blond, charmig och med valnötter som örhängen.",
    menuSummary: "Sally gör lägenheten till en grön oas, en kruka i taget.",
    menuSummaryLines: ["Chili, basilika och amplar flyttar in.", "Växtlamporna gör kvällen lila."],
    menuFacts: ["Level: Sally", "Charma: lugnar och stärker relationen", "Tre kvällar bland krukor och växtlampor"],
    avatarImageSrc: "images/sally_avatar.png",
    avatarAssetKey: "girl_avatar",
    spritePrefix: "girl",
    dialogueLines: GIRL_LINES,
    voiceClipPaths: [],
    spawnIntervalFactor: 1,
    eventIntervalFactor: 1,
    itemValueFactor: 1,
    passiveGainFactor: 1,
    annoyanceDecayFactor: 1,
    charmCooldownFactor: 1,
    charmReliefFactor: 1,
    moodSwingChance: 0.22,
    extraBurstThreshold: 75,
    extraBurstChanceFactor: 1,
    roamCooldownMin: 2.6,
    roamCooldownMax: 4.6,
    speedFactor: 1,
    chainPlacementChance: 0,
    chainPlacementAmount: 0,
    targetDays: 3,
    roomBias: { vardagsrum: 1.35, badrum: 1.2 },
    reclaimRelocatedChance: 0,
    responseWindow: 9,
    responseStrength: 0.7,
    counterDialogue: false,
  },
};

export const GIRL_PROFILE_ORDER = ["sally"];

export const RUN_CHALLENGES = [
  {
    id: "quiet_morning",
    name: "Lugn morgon",
    description: "Lägre grundtempo, men rum tappar stabilitet snabbare.",
    spawnRateMultiplier: 0.88,
    passiveGainMultiplier: 1.08,
    roomStabilityDecayMultiplier: 1.45,
    annoyanceDecayMultiplier: 1.08,
  },
  {
    id: "practical_home",
    name: "Praktiskt hem",
    description: "Kök och hall blir viktiga. Praktiska föremål ger större nytta.",
    roomBias: { kok: 1.35, hall: 1.25 },
    practicalItemValueMultiplier: 1.22,
    roomStabilityBonus: { kok: 2, hall: 2 },
  },
  {
    id: "pressure_cooker",
    name: "Tryckkokare",
    description: "Snabbare events och högre belöning för aggressiva beslut.",
    eventRateMultiplier: 0.78,
    spawnRateMultiplier: 0.94,
    aggressiveRewardMultiplier: 1.18,
    annoyanceDecayMultiplier: 0.82,
  },
];

export const DIALOGUE_SPEAKERS = {
  guy: {
    name: "Han",
    imageSrc: "images/guy_avatar.png",
    assetKey: "guy_avatar",
    alt: "Avatar för killen",
    voiceEnabled: false,
  },
};

export const ITEM_TYPES = {
  chili: { id: "chili", name: "Chiliplanta", value: 4, risk: 8, color: "#ed6349", size: 24, rooms: ["kok", "vardagsrum", "hall", "sovrum", "badrum"], tags: ["green", "decor"] },
  hanging_planter: { id: "hanging_planter", name: "Ampel", value: 5, risk: 9, color: "#78ae70", size: 26, rooms: ["vardagsrum", "hall", "sovrum", "badrum", "kok"], tags: ["green", "decor", "cozy"] },
  basil: { id: "basil", name: "Basilika", value: 3, risk: 7, color: "#72bc59", size: 22, rooms: ["kok", "vardagsrum", "hall", "sovrum", "badrum"], useful: true, tags: ["green", "practical", "routine"] },
  grow_light: { id: "grow_light", name: "Växtlampa", value: 6, risk: 10, color: "#cc91ff", size: 26, rooms: ["kok", "vardagsrum", "hall", "sovrum", "badrum"], useful: true, tags: ["light", "practical", "cozy"] },
  candle: { id: "candle", name: "Ljus", value: 2, risk: 6, color: "#ffcf70", size: 16, rooms: ["vardagsrum", "badrum", "sovrum", "kok"], tags: ["cozy", "light"] },
  pillow: { id: "pillow", name: "Prydnadskudde", value: 3, risk: 7, color: "#d7b6ff", size: 20, rooms: ["vardagsrum", "sovrum"], tags: ["cozy", "soft"] },
  plant: { id: "plant", name: "Växt", value: 4, risk: 8, color: "#66bb6a", size: 20, rooms: ["vardagsrum", "kok", "hall", "sovrum"], tags: ["decor", "green"] },
  blanket: { id: "blanket", name: "Filt", value: 5, risk: 9, color: "#f2a8c0", size: 24, rooms: ["vardagsrum", "sovrum"], tags: ["cozy", "soft"] },
  art: { id: "art", name: "Tavla", value: 6, risk: 9, color: "#8ec8ff", size: 18, rooms: ["vardagsrum", "hall", "sovrum"], tags: ["decor", "identity"] },
  skincare: { id: "skincare", name: "Hudvård", value: 5, risk: 10, color: "#ffe59b", size: 16, rooms: ["badrum"], tags: ["routine", "practical"] },
  mug: { id: "mug", name: "Extra mugg", value: 4, risk: 11, color: "#b4d4ff", size: 15, rooms: ["kok", "vardagsrum"], useful: true, tags: ["practical", "routine"] },
  fairy_lights: { id: "fairy_lights", name: "Ljusslinga", value: 8, risk: 12, color: "#ffec99", size: 18, rooms: ["vardagsrum", "sovrum"], tags: ["cozy", "light", "decor"] },
  basket: { id: "basket", name: "Förvaringskorg", value: 10, risk: 13, color: "#c59b6d", size: 20, rooms: ["hall", "vardagsrum", "sovrum", "badrum"], useful: true, tags: ["practical", "storage"] },
  snack_bowl: { id: "snack_bowl", name: "Snackskål", value: 5, risk: 8, color: "#f6c9a1", size: 16, rooms: ["vardagsrum", "kok"], tags: ["cozy", "routine"] },
  charger: { id: "charger", name: "Laddare", value: 4, risk: 8, color: "#d1d1d1", size: 14, rooms: ["hall", "sovrum", "vardagsrum"], tags: ["practical", "utility"] },
  mirror_boss: {
    id: "mirror_boss",
    name: "Stor växtlampa",
    value: 16,
    risk: 18,
    color: "#bde7ff",
    size: 28,
    rooms: ["hall", "sovrum", "vardagsrum"],
    hardToMove: true,
    aura: 0.25,
    tags: ["identity", "anchor", "boss"],
  },
  shared_shelf_boss: {
    id: "shared_shelf_boss", name: "Odlingshylla", value: 15, risk: 17,
    color: "#d6b58d", size: 29, rooms: ["vardagsrum"],
    hardToMove: true, aura: 0.25, tags: ["practical", "storage", "anchor", "boss"],
  },
};

export const SPECIAL_EVENTS = [
  { id: "tote_bag", name: "Sallys plantkasse", desc: "Fem krukor är på väg in i snabb följd.", duration: 16, difficultyBoost: 0.2, onStart(w) { w.burstQueue += 5; } },
  { id: "bathroom_refresh", name: "Ampeldags", desc: "Sally har hittat plats för amplar i badrummet.", duration: 26, difficultyBoost: 0.24, roomBias: { badrum: 3.5 }, itemBias: { hanging_planter: 3 }, roomValueBonus: { badrum: 1.8 } },
  { id: "mello", name: "Chilikväll", desc: "Chiliplantor söker sig till köket och vardagsrummet.", duration: 28, difficultyBoost: 0.3, roomBias: { kok: 3, vardagsrum: 2 }, itemBias: { chili: 3, grow_light: 2 }, roomValueBonus: { vardagsrum: 2 } },
  { id: "we_word", name: "Vår gröna oas", desc: "Sallys plantor börjar känna sig hemma.", duration: 22, difficultyBoost: 0.18, resistanceMultiplier: 1.35 },
  { id: "phone_break", name: "Basilikapaus", desc: "Ett lugnt ögonblick att laga mat eller stabilisera ett rum.", duration: 15, difficultyBoost: -0.12, itemBias: { basil: 3 } },
  { id: "mirror_hall", name: "Den stora växtlampan", desc: "En stor växtlampa är på väg till hallen. Stoppa placeringen eller ge odlingen plats.", duration: 26, difficultyBoost: 0.34, roomBias: { hall: 5 }, boss: true, onStart(w) { w.forceBossSpawn = true; w.forceBossRoom = "hall"; } },
];

export const rooms = {
  sovrum: { x: 30, y: 30, w: 280, h: 220, name: "Sovrum" },
  vardagsrum: { x: 320, y: 110, w: 370, h: 250, name: "Vardagsrum" },
  badrum: { x: 710, y: 35, w: 260, h: 255, name: "Badrum" },
  kok: { x: 30, y: 360, w: 430, h: 250, name: "Kök" },
  hall: { x: 470, y: 370, w: 500, h: 240, name: "Hall" },
};

export const ROOM_RULES = {
  vardagsrum: { shortLabel: "Showroom", summary: "Synliga saker känns mer etablerade här." },
  kok: { shortLabel: "Praktiskt", summary: "Praktiska saker i köket skapar mer konflikt när du rör dem." },
  badrum: { shortLabel: "Sätter sig", summary: "Produkter i badrummet blir snabbt en vana." },
  sovrum: { shortLabel: "Permanent", summary: "Gömda prylar i sovrummet räknas mer än du hoppas." },
  hall: { shortLabel: "Transitfälla", summary: "Omplacerade saker i hallen börjar snart kännas permanenta." },
};

export const spawnPoints = {
  sovrum: [{ x: 130, y: 226 }, { x: 222, y: 226 }, { x: 280, y: 160 }],
  vardagsrum: [{ x: 410, y: 165 }, { x: 505, y: 170 }, { x: 618, y: 208 }, { x: 626, y: 286 }],
  badrum: [{ x: 772, y: 242 }, { x: 846, y: 236 }, { x: 914, y: 236 }],
  kok: [{ x: 128, y: 532 }, { x: 220, y: 560 }, { x: 210, y: 440 }, { x: 394, y: 548 }],
  hall: [{ x: 565, y: 520 }, { x: 692, y: 470 }, { x: 800, y: 456 }, { x: 916, y: 454 }],
};

export const NAV_NODES = {
  nav_sovrum: { x: 216, y: 216 },
  nav_vardagsrum_left: { x: 340, y: 200 },
  nav_vardagsrum_top_left: { x: 340, y: 112 },
  nav_vardagsrum_top_right: { x: 622, y: 112 },
  nav_vardagsrum_right: { x: 622, y: 220 },
  nav_vardagsrum_hall: { x: 624, y: 318 },
  nav_vardagsrum_kok: { x: 340, y: 318 },
  nav_badrum: { x: 840, y: 218 },
  nav_kok: { x: 230, y: 472 },
  nav_hall_left: { x: 610, y: 456 },
  nav_hall_right: { x: 808, y: 470 },
  door_sv: { x: 311, y: 226 },
  door_vb: { x: 699, y: 184 },
  door_vk: { x: 300, y: 351 },
  door_vh: { x: 635, y: 351 },
};

export const ROOM_ENTRY_NODES = {
  sovrum: ["nav_sovrum"],
  vardagsrum: ["nav_vardagsrum_left", "nav_vardagsrum_top_left", "nav_vardagsrum_top_right", "nav_vardagsrum_right", "nav_vardagsrum_hall", "nav_vardagsrum_kok"],
  badrum: ["nav_badrum"],
  kok: ["nav_kok"],
  hall: ["nav_hall_left", "nav_hall_right"],
};

export const NAV_GRAPH = {
  nav_sovrum: ["door_sv"],
  door_sv: ["nav_sovrum", "nav_vardagsrum_left"],
  nav_vardagsrum_left: ["door_sv", "nav_vardagsrum_top_left", "nav_vardagsrum_kok"],
  nav_vardagsrum_top_left: ["nav_vardagsrum_left", "nav_vardagsrum_top_right"],
  nav_vardagsrum_top_right: ["nav_vardagsrum_top_left", "nav_vardagsrum_right", "door_vb"],
  nav_vardagsrum_right: ["nav_vardagsrum_top_right", "nav_vardagsrum_hall"],
  nav_vardagsrum_hall: ["nav_vardagsrum_right", "door_vh"],
  nav_vardagsrum_kok: ["nav_vardagsrum_left", "door_vk"],
  door_vb: ["nav_vardagsrum_top_right", "nav_badrum"],
  nav_badrum: ["door_vb"],
  door_vk: ["nav_vardagsrum_kok", "nav_kok"],
  nav_kok: ["door_vk"],
  door_vh: ["nav_vardagsrum_hall", "nav_hall_left"],
  nav_hall_left: ["door_vh", "nav_hall_right"],
  nav_hall_right: ["nav_hall_left"],
};

export const furniture = [
  { id: "bed", x: 15, y: 15, w: 180, h: 160, collider: { x: 27, y: 57, w: 152, h: 120 }, room: "sovrum" },
  { id: "sofa", x: 400, y: 15, w: 240, h: 100, collider: { x: 420, y: 31, w: 206, h: 54 }, room: "vardagsrum" },
  { id: "tv", x: 420, y: 260, w: 150, h: 85, collider: { x: 432, y: 278, w: 116, h: 47 }, room: "vardagsrum" },
  { id: "table", x: 400, y: 120, w: 176, h: 79, collider: { x: 418, y: 138, w: 142, h: 44 }, room: "vardagsrum" },
  { id: "oven", x: 56, y: 360, w: 136, h: 72, collider: { x: 72, y: 376, w: 104, h: 40 }, room: "kok" },
  { id: "shoe_rack", x: 812, y: 360, w: 126, h: 65, collider: { x: 826, y: 376, w: 98, h: 30 }, room: "hall" },
  { id: "bathtub", x: 764, y: 15, w: 184, h: 100, collider: { x: 780, y: 35, w: 154, h: 66 }, room: "badrum" },
];

export function getGirlProfileById(id) {
  return GIRL_PROFILES[id] || GIRL_PROFILES.sally;
}

export function getGirlSpeakerById(id) {
  const profile = getGirlProfileById(id);
  return {
    name: profile.name,
    imageSrc: profile.avatarImageSrc,
    assetKey: profile.avatarAssetKey,
    alt: `Avatar för ${profile.name}`,
    voiceEnabled: true,
  };
}

export function getDialogueSpeakerById(selectedGirlId, speakerId) {
  if (speakerId === "girl") {
    return getGirlSpeakerById(selectedGirlId);
  }
  return DIALOGUE_SPEAKERS[speakerId] || getGirlSpeakerById(selectedGirlId);
}
