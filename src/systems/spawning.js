import { ITEM_TYPES, ROOM_ALERT_DURATION, SPECIAL_EVENTS, rooms, spawnPoints } from "../core/data.js";
import { playSfx } from "../core/audio.js?v=3";
import { takeNextItemId, world } from "../core/state.js";
import { clamp, isCollidingRect, pick, rand } from "../core/utils.js";
import { getActiveGirlLines, getSelectedGirlProfile } from "../game/shared.js";
import { bumpRoomAlert, setToast, showGirlfriendReaction } from "./feedback.js";
import { showDialogue, showGirlTextDialogue } from "./dialogue.js?v=2";
import { getStoryRoomWeightMultiplier } from "./planning.js";
import { getCurrentStoryDay } from "./story.js?v=8";
import { getChallengeMultiplier, getChallengeRoomMultiplier } from "./challenges.js";
import { startEventScene } from "./eventScene.js?v=4";

export function getDifficultyMultiplier() {
  const annoyancePart = 1 + world.annoyance / 140;
  const moodPart = world.moodSwing.active ? 1.35 : 1;
  const dayPart = 1 + (world.day - 1) * 0.15;
  const eventPart = world.activeEvent ? 1 + (world.activeEvent.difficultyBoost || 0) : 1;
  const relationshipPart = 1 - clamp(world.storyRun?.relationship || 0, -5, 8) * 0.025;
  return annoyancePart * moodPart * dayPart * eventPart * relationshipPart;
}

export function getSpawnInterval() {
  const base = rand(10, 16);
  return (base * getSelectedGirlProfile().spawnIntervalFactor * getChallengeMultiplier("spawnRateMultiplier", 1)) / getDifficultyMultiplier();
}

export function randomRoomByWeight() {
  const storyDay = getCurrentStoryDay();
  const weights = {
    vardagsrum: 1.25,
    kok: 1.05,
    badrum: 0.95,
    sovrum: 0.95,
    hall: 0.85,
  };
  if (storyDay && storyDay.spawnBias) {
    for (const [key, value] of Object.entries(storyDay.spawnBias)) {
      weights[key] = (weights[key] || 1) * value;
    }
  }
  if (world.activeEvent && world.activeEvent.roomBias) {
    for (const [key, value] of Object.entries(world.activeEvent.roomBias)) {
      weights[key] = (weights[key] || 1) * value;
    }
  }
  for (const key of Object.keys(weights)) {
    weights[key] *= getStoryRoomWeightMultiplier(key);
    const profileRoomBias = getSelectedGirlProfile().roomBias || {};
    weights[key] *= profileRoomBias[key] || 1;
    weights[key] *= getChallengeRoomMultiplier(key);
    if (world.girlfriend.strategyTimer > 0 && world.girlfriend.strategyRoom === key) {
      weights[key] *= 1 + world.girlfriend.responseLevel * 0.55;
    }
  }

  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  let n = Math.random() * total;
  for (const [key, value] of Object.entries(weights)) {
    n -= value;
    if (n <= 0) return key;
  }
  return "vardagsrum";
}

export function weightedItemTypeForRoom(roomKey) {
  const weights = [];
  for (const type of Object.values(ITEM_TYPES)) {
    if (!["chili", "hanging_planter", "basil", "grow_light"].includes(type.id) || !type.rooms.includes(roomKey)) continue;
    let weight = type.value * 0.7 + 0.8;
    if (world.activeEvent && world.activeEvent.itemBias && world.activeEvent.itemBias[type.id]) {
      weight *= world.activeEvent.itemBias[type.id];
    }
    if (roomKey === "badrum" && type.id === "skincare") weight *= 1.5;
    if (roomKey === "kok" && type.id === "mug") weight *= 1.25;
    if (type.useful && world.challenge?.practicalItemValueMultiplier) weight *= world.challenge.practicalItemValueMultiplier;
    weights.push({ id: type.id, w: weight });
  }
  if (!weights.length) return "candle";

  const total = weights.reduce((sum, entry) => sum + entry.w, 0);
  let n = Math.random() * total;
  for (const entry of weights) {
    n -= entry.w;
    if (n <= 0) return entry.id;
  }
  return weights[0].id;
}

export function safeSpawnPoint(roomKey) {
  const points = spawnPoints[roomKey] || spawnPoints.hall;
  const orderedPoints = [...points].sort(() => Math.random() - 0.5);
  for (const point of orderedPoints) {
    const rect = { x: point.x - 22, y: point.y - 22, w: 44, h: 44 };
    if (!isCollidingRect(rect)) {
      return { x: point.x, y: point.y };
    }
  }
  const fallback = points[0];
  return { x: fallback.x, y: fallback.y };
}

export function queuePlacement(options = {}) {
  const lines = getActiveGirlLines();
  let roomKey = options.room || randomRoomByWeight();
  let typeId;
  if (world.forceBossSpawn) {
    typeId = world.forceBossType || "mirror_boss";
    roomKey = world.forceBossRoom || pick(["hall", "sovrum", "vardagsrum"]);
    world.forceBossSpawn = false;
    world.forceBossRoom = null;
    world.forceBossType = null;
  } else {
    typeId = options.typeId || weightedItemTypeForRoom(roomKey);
  }

  const spot = options.spot || safeSpawnPoint(roomKey);
  const wasQueueIdle = world.pendingPlacements.length === 0;
  const placement = {
    roomKey,
    typeId,
    x: spot.x,
    y: spot.y,
    lineIndex: Math.floor(Math.random() * lines.length),
    queuedAt: world.vfxClock,
    pulseOffset: Math.random() * Math.PI * 2,
  };
  world.pendingPlacements.push(placement);

  const type = ITEM_TYPES[typeId] || ITEM_TYPES.candle;
  const roomName = rooms[roomKey] ? rooms[roomKey].name : roomKey;
  bumpRoomAlert(roomKey, ROOM_ALERT_DURATION + (wasQueueIdle ? 0.35 : 0));

  if (wasQueueIdle || type.tags?.includes("boss")) {
    if (type.tags?.includes("boss")) {
      setToast(`Stor grej på väg mot ${roomName}.`, 1.5);
      showGirlfriendReaction("!!", "#ffe2b3", 1.45);
      playSfx("alert");
    } else {
      setToast(`${getSelectedGirlProfile().name} siktar på ${roomName}.`, 1.25);
      showGirlfriendReaction("...", "#ffe2f3", 1);
      playSfx("telegraph");
    }
  }
}

export function spawnItemAt(placement) {
  const profile = getSelectedGirlProfile();
  const type = ITEM_TYPES[placement.typeId] || ITEM_TYPES.candle;
  let valueMult = (1 + world.annoyance / 180) * profile.itemValueFactor;
  if (type.useful && world.challenge?.practicalItemValueMultiplier) valueMult *= world.challenge.practicalItemValueMultiplier;
  if (world.activeEvent && world.activeEvent.roomValueBonus && world.activeEvent.roomValueBonus[placement.roomKey]) {
    valueMult *= world.activeEvent.roomValueBonus[placement.roomKey];
  }
  if (world.moodSwing.active) {
    valueMult *= 1.2;
  }

  const item = {
    id: takeNextItemId(),
    typeId: type.id,
    room: placement.roomKey,
    originalRoom: placement.roomKey,
    x: placement.x,
    y: placement.y,
    size: type.size,
    baseValue: type.value,
    value: type.value * valueMult,
    risk: type.risk,
    color: type.color,
    hidden: false,
    relocated: false,
    hardToMove: !!type.hardToMove,
    aura: type.aura || 0,
    age: 0,
    placedAtDay: world.day,
  };
  world.items.push(item);

  const immediateGain = item.value * 0.6;
  world.girlification = clamp(world.girlification + immediateGain, 0, 100);
  setToast(`+${immediateGain.toFixed(1)} tjejifiering: ${type.name} i ${rooms[item.room]?.name || item.room}.`, 2.8);

  const absurdClaims = {
    chili: "Chilin behöver sol, vatten och ett eget postnummer.",
    hanging_planter: "Ampeln tar ingen golvyta. Taket har ändå varit ledigt.",
    basil: "Basilikan betalar hyran i pesto.",
    grow_light: "Växtlampan är sol på sladd. Nu är det sommar i hallen.",
    candle: "Ljuset behöver bara ett hörn. Skuggan tar ingen extra plats.",
    pillow: "Kudden har röstat för soffan. Vi kan inte ignorera ett enhälligt beslut.",
    plant: "Växten behöver sol, vatten och ett eget postnummer.",
    blanket: "Filten har legat här i tre minuter. Den har besittningsrätt.",
    art: "Tavlan täcker väggen. Därför räknas väggen inte längre som ditt problem.",
    skincare: "Necessären är liten. Den vill bara ha översta hyllan och din respekt.",
    mug: "Muggen valde skåpet själv. Jag vill inte styra hennes framtid.",
    fairy_lights: "Ljusslingan gör rummet större om du kisar. Det är vetenskap.",
    basket: "Korgen organiserar hallen nu. Vi får ställa oss i kö.",
    snack_bowl: "Skålen är här för gästerna. Gästerna finns i teorin.",
    charger: "Laddaren måste bo här. Den har redan knutit an till uttaget.",
    mirror_boss: "Växtlampan gör hallen till ett växthus. Chilin applåderar.",
    shared_shelf_boss: "Hyllan är gemensam. Dina saker får söka plats via formulär.",
  };
  if (Math.random() < 0.8) showGirlTextDialogue(absurdClaims[type.id] || "Den är bara här tillfälligt. Tills den känner sig hemma.");
  else showDialogue(placement.lineIndex);
  if (profile.chainPlacementChance > 0 && Math.random() < profile.chainPlacementChance) {
    world.burstQueue += profile.chainPlacementAmount;
    setToast(`+${immediateGain.toFixed(1)} tjejifiering: ${type.name}. ${profile.name} planerar ännu en sak.`, 2.8);
  }
  playSfx("place");
}

function pickStoryWeightedEvent() {
  const storyDay = getCurrentStoryDay();
  const candidates = SPECIAL_EVENTS.filter((event) => !event.boss);
  const weighted = candidates.map((event) => ({
    event,
    weight: Math.max(0.05, storyDay && storyDay.eventBias && storyDay.eventBias[event.id] ? storyDay.eventBias[event.id] : 1),
  }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let needle = Math.random() * total;
  for (const entry of weighted) {
    needle -= entry.weight;
    if (needle <= 0) return entry.event;
  }
  return weighted[0].event;
}

export function runSpecialEvent(eventId = null) {
  const requested = eventId ? SPECIAL_EVENTS.find((event) => event.id === eventId) : null;
  const event = { ...(requested || pickStoryWeightedEvent()) };
  event.timeLeft = event.duration;
  world.activeEvent = event;
  startEventScene(event.id);
  setToast(`Händelse: ${event.name}`);
  showGirlfriendReaction("!", "#ffd9ec", 1.05);
  playSfx("event");
  if (typeof event.onStart === "function") {
    event.onStart(world);
  }
  if (!world.pendingPlacements.length) {
    const openingThreat = {
      mello: { room: "kok", typeId: "chili" }, tote_bag: { room: "hall", typeId: "chili" },
      bathroom_refresh: { room: "badrum", typeId: "hanging_planter" }, we_word: { room: "vardagsrum", typeId: "basil" },
      phone_break: { room: "kok", typeId: "basil" }, mirror_hall: { room: "hall" },
    };
    queuePlacement(openingThreat[event.id] || {});
  }
}
