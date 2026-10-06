import {
  CHARM_COOLDOWN,
  CHARM_EFFECT_DURATION,
  CHARM_HIT_DURATION,
  CHARM_PARTICLE_COUNT,
  CHARM_RELIEF,
  GUY_LINES,
  INTERCEPT_RANGE,
  INTERACTION_RANGE,
  ITEM_TYPES,
} from "../core/data.js?v=2";
import { playSfx } from "../core/audio.js?v=3";
import { world } from "../core/state.js";
import { clamp, distance, getEntityNavPoint, moveEntity, rand, pick, roomFromPoint } from "../core/utils.js";
import { getSelectedGirlProfile } from "../game/shared.js";
import { setToast, showGirlfriendReaction } from "./feedback.js";
import { showGirlTextDialogue, showGuyDialogue } from "./dialogue.js?v=2";
import { consumeActionAnnoyanceMultiplier, hasDistractAbility, peekActionAnnoyanceMultiplier, tryUseDistract } from "./planning.js";
import { registerPlayerAction } from "./ai.js";
import { getChallengeMultiplier } from "./challenges.js";

export function getItemById(id) {
  return world.items.find((item) => item.id === id) || null;
}

function getNearestInteractableItem() {
  const playerPoint = getEntityNavPoint(world.player);
  let best = null;
  let bestDistance = Infinity;
  for (const item of world.items) {
    if (item.hidden || (item.protectedUntil || 0) > world.vfxClock) continue;
    const d = Math.hypot(item.x - playerPoint.x, item.y - playerPoint.y);
    if (d < INTERACTION_RANGE && d < bestDistance) {
      bestDistance = d;
      best = item;
    }
  }
  return best;
}

function isPracticalItem(type) {
  return !!(type && (type.useful || ["charger", "grow_light"].includes(type.id)));
}

function getRoomActionAnnoyanceFactor(action, item, type) {
  if (action === "relocate" && world.roomStates.hall === "Girlified") return 1.6;
  if (item.room === "kok" && isPracticalItem(type)) {
    if (action === "remove") return 1.35;
    if (action === "hide") return 1.22;
    return 1.12;
  }
  return 1;
}

function getHideRelief(item) {
  return item.room === "sovrum" && world.roomStates.sovrum === "Girlified" ? 0.35 : 0.6;
}

function getRelocateRelief() {
  return world.roomStates.hall === "Girlified" ? 0.16 : 0.28;
}

function getUseStrength(item) {
  return item.room === "kok" && world.roomStates.kok === "Girlified" ? 0.5 : 1;
}

function getDealPartner(item) {
  return world.items
    .filter((other) => other.id !== item.id && other.room === item.room && !other.hidden && !other.bargained && !other.hardToMove && other.value <= item.value)
    .sort((a, b) => b.value - a.value)[0] || null;
}

function isNearGirlfriend(item) {
  return (
    distance(
      { x: item.x, y: item.y },
      { x: world.girlfriend.x + world.girlfriend.w * 0.5, y: world.girlfriend.y + world.girlfriend.h * 0.5 }
    ) < 170
  );
}

export function getActionPreview(action, item) {
  if (!item) return null;
  if (action === "compromise") {
    const chosen = getCompromiseAction(item);
    const preview = chosen ? getActionPreview(chosen, item) : null;
    return preview ? { ...preview, kind: chosen } : null;
  }
  const type = ITEM_TYPES[item.typeId] || ITEM_TYPES.candle;
  if (action === "use") {
    if (item.used) return null;
    const strength = getUseStrength(item);
    if (["mug", "basil"].includes(type.id)) return { girlification: -item.value * 0.25 * strength, annoyance: -8 * strength, label: "Använd" };
    if (["charger", "grow_light"].includes(type.id)) return { girlification: -0.5 * strength, annoyance: -3 * strength, label: "Använd" };
    if (type.id === "basket") return { girlification: -0.8 * strength, annoyance: -2 * strength, label: "Använd" };
    return null;
  }
  if (action === "deal") {
    const partner = getDealPartner(item);
    if (!partner || item.bargained || world.dealsLeft <= 0) return null;
    return { girlification: -partner.value * 0.65, annoyance: 1.5, label: "Förhandla", detail: `${ITEM_TYPES[partner.typeId]?.name || "sak"} lämnar rummet` };
  }
  const nearGirl = isNearGirlfriend(item);
  const irritationPressure = 1 + world.annoyance / 170;
  const roomAnnoyanceFactor = getRoomActionAnnoyanceFactor(action, item, type);
  const resistance = world.activeEvent && world.activeEvent.resistanceMultiplier ? world.activeEvent.resistanceMultiplier : 1;
  const planningMultiplier = peekActionAnnoyanceMultiplier(action);
  const usefulPenalty = type.useful ? 1.3 : 1;
  const hardPenalty = item.hardToMove ? 1.4 : 1;

  if (action === "hide") {
    return {
      girlification: -item.value * (getHideRelief(item) / resistance),
      annoyance: type.risk * 0.16 * irritationPressure * roomAnnoyanceFactor * planningMultiplier * (nearGirl ? 1.25 : 1),
      label: "Göm",
    };
  }
  if (action === "relocate") {
    if (item.relocated) return null;
    return {
      girlification: -item.value * (getRelocateRelief() / resistance),
      annoyance: type.risk * 0.08 * irritationPressure * roomAnnoyanceFactor * planningMultiplier * (nearGirl ? 1.15 : 1),
      label: "Flytta",
    };
  }
  if (action !== "remove") return null;
  return {
    girlification: -item.value * (1.3 / resistance),
    annoyance: type.risk * 0.5 * usefulPenalty * hardPenalty * irritationPressure * roomAnnoyanceFactor * (nearGirl ? 1.8 : 1),
    label: "Ta bort",
  };
}

export function getCompromiseAction(item) {
  if (!item) return null;
  if (getActionPreview("use", item)) return "use";
  if (getActionPreview("deal", item)) return "deal";
  if (getActionPreview("relocate", item)) return "relocate";
  return null;
}

export function getContextAbility() {
  const playerPoint = getEntityNavPoint(world.player);
  const girlfriendPoint = getEntityNavPoint(world.girlfriend);
  if (world.pendingPlacements.length && distance(playerPoint, girlfriendPoint) <= INTERCEPT_RANGE) {
    return { id: "intercept", label: "Stoppa henne" };
  }
  if (world.annoyance >= 15 && world.charmCooldown <= 0) {
    return { id: "charm", label: "Charma" };
  }
  const roomKey = roomFromPoint(playerPoint.x, playerPoint.y);
  if (world.roomStabilizeCooldown <= 0 && world.items.some((item) => item.room === roomKey && !item.hidden)) {
    return { id: "stabilize", label: "Stabilisera rummet" };
  }
  if (hasDistractAbility() && (world.storyRun?.runtime?.distractCooldown || 0) <= 0) {
    return { id: "distract", label: "Distrahera" };
  }
  return null;
}

function useContextAbility() {
  const ability = getContextAbility();
  if (!ability) return;
  if (ability.id === "intercept") tryInterceptPlacement();
  else if (ability.id === "charm") useCharm();
  else if (ability.id === "stabilize") tryStabilizeRoom();
  else if (ability.id === "distract") tryUseDistract();
}

function tryInterceptPlacement() {
  const placement = world.pendingPlacements[0];
  if (!placement) {
    setToast("Det finns ingen placering att stoppa.");
    return;
  }

  const playerPoint = getEntityNavPoint(world.player);
  const girlfriendPoint = getEntityNavPoint(world.girlfriend);
  if (distance(playerPoint, girlfriendPoint) > INTERCEPT_RANGE) {
    setToast("Kom närmare henne för att sätta en gräns.");
    return;
  }

  const type = ITEM_TYPES[placement.typeId] || ITEM_TYPES.candle;
  world.pendingPlacements.shift();
  world.annoyance = clamp(world.annoyance + 4 + type.risk * 0.12, 0, 100);
  world.girlification = clamp(world.girlification - type.value * 0.4, 0, 100);
  world.stats.intercepted += 1;
  world.lastAggressiveAt = world.vfxClock;
  showGirlfriendReaction("?!", "#ffe7a6", 1.35);
  setToast(`${type.name} stoppad. Hon kommer komma ihåg det här.`);
  playSfx("alert");
}

function tryStabilizeRoom() {
  if (world.roomStabilizeCooldown > 0) {
    setToast(`Rumsstabilisering redo om ${Math.ceil(world.roomStabilizeCooldown)} sek.`);
    return;
  }

  const playerPoint = getEntityNavPoint(world.player);
  const roomKey = roomFromPoint(playerPoint.x, playerPoint.y);
  const visibleItems = world.items.filter((item) => item.room === roomKey && !item.hidden);
  if (!visibleItems.length) {
    setToast("Det finns inget tryck här att stabilisera.");
    return;
  }

  const roomName = roomKey === "kok" ? "Kök" : roomKey.charAt(0).toUpperCase() + roomKey.slice(1);
  const gain = roomKey === "badrum" && world.roomStates.badrum === "Girlified" ? 3 : world.roomStates[roomKey] === "Girlified" ? 5.5 : 4;
  world.roomStability[roomKey] = clamp((world.roomStability[roomKey] || 0) + gain, 0, 16);
  world.girlification = clamp(world.girlification - (world.roomStates[roomKey] === "Girlified" ? 1.8 : 0.8), 0, 100);
  world.annoyance = clamp(world.annoyance + 1.3, 0, 100);
  world.roomStabilizeCooldown = 7;
  world.stats.stabilizedRooms += 1;
  world.roomStabilizeCounts[roomKey] = (world.roomStabilizeCounts[roomKey] || 0) + 1;
  setToast(`${roomName} stabiliserat tillfälligt. Effekten klingar av.`);
  playSfx("move");
}

function updateInteractionTarget() {
  const nearest = getNearestInteractableItem();
  if (!nearest) {
    world.interactionItemId = null;
    world.interactionDismissedId = null;
    world.gamepadInteractionOpen = false;
    return;
  }

  if (world.interactionItemId !== nearest.id) world.gamepadInteractionOpen = false;

  if (world.interactionDismissedId !== null && world.interactionDismissedId !== nearest.id) {
    world.interactionDismissedId = null;
  }

  if (world.interactionDismissedId === nearest.id) {
    world.interactionItemId = null;
    return;
  }

  world.interactionItemId = nearest.id;
}

function triggerCharmEffect() {
  const cx = world.player.x + world.player.w * 0.5;
  const cy = world.player.y + world.player.h * 0.68;
  world.charmFx.timer = CHARM_EFFECT_DURATION;
  world.charmFx.duration = CHARM_EFFECT_DURATION;
  world.charmFx.particles = [];

  for (let i = 0; i < CHARM_PARTICLE_COUNT; i += 1) {
    const angle = (Math.PI * 2 * i) / CHARM_PARTICLE_COUNT + Math.random() * 0.35;
    const speed = 80 + Math.random() * 90;
    const life = 0.38 + Math.random() * 0.42;
    world.charmFx.particles.push({
      x: cx + Math.cos(angle) * (18 + Math.random() * 12),
      y: cy + Math.sin(angle) * (12 + Math.random() * 10),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (24 + Math.random() * 34),
      size: 4 + Math.random() * 8,
      life,
      maxLife: life,
    });
  }
}

function triggerCharmImpact(reliefAmount) {
  const cx = world.girlfriend.x + world.girlfriend.w * 0.5;
  const cy = world.girlfriend.y + world.girlfriend.h * 0.38;
  world.charmImpact.timer = CHARM_HIT_DURATION;
  world.charmImpact.duration = CHARM_HIT_DURATION;
  world.charmImpact.relief = reliefAmount;
  world.charmImpact.sparks = [];

  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI * 0.8 + (Math.PI * 1.6 * i) / 9 + Math.random() * 0.18;
    const speed = 42 + Math.random() * 58;
    const life = 0.25 + Math.random() * 0.3;
    world.charmImpact.sparks.push({
      x: cx + Math.cos(angle) * (12 + Math.random() * 12),
      y: cy + Math.sin(angle) * (8 + Math.random() * 8),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 18,
      size: 2.5 + Math.random() * 4,
      life,
      maxLife: life,
    });
  }
}

function useCharm() {
  const profile = getSelectedGirlProfile();
  const charmCooldown = CHARM_COOLDOWN * profile.charmCooldownFactor;
  const charmRelief = CHARM_RELIEF * profile.charmReliefFactor;
  if (world.charmCooldown > 0) {
    setToast(`Charma redo om ${Math.ceil(world.charmCooldown)} sek.`);
    return;
  }

  if (world.annoyance <= 0) {
    setToast("Hon är redan orimligt lugn.");
    return;
  }

  world.annoyance = clamp(world.annoyance - charmRelief, 0, 100);
  world.storyRun.relationship = clamp((world.storyRun.relationship || 0) + 1, -5, 8);
  world.charmCooldown = charmCooldown;
  triggerCharmEffect();
  triggerCharmImpact(charmRelief);
  setToast(`Charma: irritation −${Math.round(charmRelief)}, relation +1. Sally ler och läget lugnar sig.`);
  showGuyDialogue(pick(GUY_LINES));
  showGirlTextDialogue(pick([
    "Du är rätt söt när du föreslår en paus bland plantorna.",
    "Okej, vi lagar något med basilikan tillsammans.",
    "Du får mig att le. Men chilin vill fortfarande ha fönsterplats.",
  ]));
  playSfx("event");
}

function showActionBanter(action, type, nearGirl) {
  if (!nearGirl || world.vfxClock - (world.lastBanterAt ?? -999) < 12) return;
  const lines = {
    hide: [`${type.name} är inte gömd. Den gör fältarbete.`, "Den har varit bakom skohyllan länge nog för att få adress där."],
    relocate: ["Hallen är väl neutral mark?", "Hallen är neutral bara när mina saker flyttar in."],
    remove: [`En ${type.name} mindre. Lägenheten andas igen!`, "Du kastade min grej. Nu behöver tomrummet en prydnadskudde."],
    use: [`Se? ${type.name} bidrar faktiskt till hushållet.`, "Bra. Då är saken anställd här och kan inte sägas upp."],
    deal: ["En sak in, en sak ut. Diplomati!", "Avtal godkänt. Korgen vill ha det skriftligt."],
  }[action];
  if (!lines) return;
  world.lastBanterAt = world.vfxClock;
  const relationDelta = action === "remove" ? -1 : action === "use" ? 1 : 0;
  if (relationDelta) {
    world.storyRun.relationship = clamp((world.storyRun.relationship || 0) + relationDelta, -5, 8);
    world.toast.text += ` Relation ${relationDelta > 0 ? "+" : ""}${relationDelta}.`;
  }
  showGuyDialogue(lines[0]);
  showGirlTextDialogue(lines[1]);
}

function applyAction(action, safeSpawnPoint, checkEndConditions) {
  const item = getItemById(world.interactionItemId);
  if (!item) {
    world.interactionItemId = null;
    return;
  }
  if (action === "compromise") {
    action = getCompromiseAction(item);
    if (!action) {
      setToast("Den här saken går inte att kompromissa om igen.");
      return;
    }
  }
  const type = ITEM_TYPES[item.typeId] || ITEM_TYPES.candle;
  const preview = getActionPreview(action, item);
  if (!preview) {
    setToast(action === "deal" ? "Pakt: behåll den värdefullare saken och byt bort en mindre sak i samma rum. Två pakter per dag." : "Det här föremålet kan inte användas.");
    return;
  }
  const nearGirl =
    distance(
      { x: item.x, y: item.y },
      { x: world.girlfriend.x + world.girlfriend.w * 0.5, y: world.girlfriend.y + world.girlfriend.h * 0.5 }
    ) < 170;
  const irritationPressure = 1 + world.annoyance / 170;
  const roomAnnoyanceFactor = getRoomActionAnnoyanceFactor(action, item, type);
  const resistance = world.activeEvent && world.activeEvent.resistanceMultiplier ? world.activeEvent.resistanceMultiplier : 1;
  const planningMultiplier = action === "hide" || action === "relocate" ? consumeActionAnnoyanceMultiplier(action) : 1;

  if (action === "use") {
    const strength = getUseStrength(item);
    if (["mug", "basil"].includes(type.id)) {
      world.annoyance = clamp(world.annoyance - 8 * strength, 0, 100);
      world.girlification = clamp(world.girlification - item.value * 0.25 * strength, 0, 100);
      world.items = world.items.filter((entry) => entry.id !== item.id);
    } else if (["charger", "grow_light"].includes(type.id)) {
      world.charmCooldown = Math.max(0, world.charmCooldown - 6 * strength);
      world.annoyance = clamp(world.annoyance - 3 * strength, 0, 100);
      world.girlification = clamp(world.girlification - 0.5 * strength, 0, 100);
      item.age = 0;
      item.used = true;
    } else if (type.id === "basket") {
      world.roomStability[item.room] = clamp((world.roomStability[item.room] || 0) + 4 * strength, 0, 16);
      world.annoyance = clamp(world.annoyance - 2 * strength, 0, 100);
      world.girlification = clamp(world.girlification - 0.8 * strength, 0, 100);
      item.age = 0;
      item.used = true;
    }
    world.stats.used += 1;
    setToast(`${type.name} använd: ${Math.abs(preview.annoyance).toFixed(1)} irritation.`);
    playSfx("event");
  } else if (action === "deal") {
    const partner = getDealPartner(item);
    world.items = world.items.filter((entry) => entry.id !== partner.id);
    item.bargained = true;
    item.protectedUntil = world.vfxClock + 30;
    item.value *= 1.25;
    world.dealsLeft -= 1;
    world.stats.deals += 1;
    world.girlification = clamp(world.girlification - partner.value * 0.65, 0, 100);
    world.annoyance = clamp(world.annoyance + 1.5, 0, 100);
    world.girlfriend.strategyTimer = 0;
    world.girlfriend.responseLevel = 0;
    world.girlfriend.strategyRoom = null;
    world.girlfriend.strategyAction = null;
    if (world.currentMode === "story" && world.storyRun?.active) {
      world.storyRun.relationship = clamp((world.storyRun.relationship || 0) + 1, -5, 8);
    }
    setToast(`Pakt: ${type.name} får stanna, ${ITEM_TYPES[partner.typeId]?.name || "en sak"} tas bort. ${world.dealsLeft} kvar idag.`);
    playSfx("event");
  } else if (action === "hide") {
    item.hidden = true;
    item.relocated = false;
    item.x = rand(905, 970);
    item.y = rand(430, 585);
    world.girlification = clamp(world.girlification - item.value * (getHideRelief(item) / resistance), 0, 100);
    const annoy = type.risk * 0.16 * irritationPressure * roomAnnoyanceFactor * planningMultiplier * (nearGirl ? 1.25 : 1);
    world.annoyance = clamp(world.annoyance + annoy, 0, 100);
    world.stats.hidden += 1;
    setToast(`${type.name} gömd: ${Math.abs(preview.girlification).toFixed(1)} tjejifiering, +${preview.annoyance.toFixed(1)} irritation.`);
    playSfx("hide");
  } else if (action === "relocate") {
    item.hidden = false;
    item.relocated = true;
    item.originalRoom = item.originalRoom || item.room;
    item.room = "hall";
    const spot = safeSpawnPoint("hall");
    item.x = spot.x;
    item.y = spot.y;
    world.girlification = clamp(world.girlification - item.value * (getRelocateRelief() / resistance), 0, 100);
    const annoy = type.risk * 0.08 * irritationPressure * roomAnnoyanceFactor * planningMultiplier * (nearGirl ? 1.15 : 1);
    world.annoyance = clamp(world.annoyance + annoy, 0, 100);
    world.stats.relocated += 1;
    if (nearGirl) world.storyRun.relationship = clamp((world.storyRun.relationship || 0) + 1, -5, 8);
    registerPlayerAction(action, item);
    setToast(`${type.name} flyttad: ${Math.abs(preview.girlification).toFixed(1)} tjejifiering, +${preview.annoyance.toFixed(1)} irritation.${nearGirl ? " Relation +1." : ""}`);
    playSfx("move");
  } else if (action === "remove") {
    const usefulPenalty = type.useful ? 1.3 : 1;
    const hardPenalty = item.hardToMove ? 1.4 : 1;
    const annoy =
      type.risk * 0.5 * usefulPenalty * hardPenalty * irritationPressure * roomAnnoyanceFactor * (nearGirl ? 1.8 : 1);
    world.annoyance = clamp(world.annoyance + annoy * getChallengeMultiplier("aggressiveRewardMultiplier", 1), 0, 100);
    world.girlification = clamp(world.girlification - item.value * (1.3 / resistance), 0, 100);
    world.items = world.items.filter((entry) => entry.id !== item.id);
    world.recentRemovals.push(world.vfxClock);
    world.lastAggressiveAt = world.vfxClock;
    world.stats.removed += 1;
    registerPlayerAction(action, item);
    setToast(`${type.name} borttagen: ${Math.abs(preview.girlification).toFixed(1)} tjejifiering, +${(annoy * getChallengeMultiplier("aggressiveRewardMultiplier", 1)).toFixed(1)} irritation.`);
    playSfx("remove");
  }

  showActionBanter(action, type, nearGirl);

  if (world.tutorial) {
    world.tutorial.active = false;
  }
  world.interactionItemId = null;
  world.interactionDismissedId = null;
  world.gamepadInteractionOpen = false;
  checkEndConditions();
}

export function getPlayerSpeed() {
  const base = 220;
  const slowdown = world.annoyance * 0.0032;
  return clamp(base * (1 - slowdown), 135, base);
}

export function updatePlayer(dt, input, safeSpawnPoint, checkEndConditions) {
  world.charmCooldown = Math.max(0, world.charmCooldown - dt);
  world.roomStabilizeCooldown = Math.max(0, world.roomStabilizeCooldown - dt);

  let mx = 0;
  let my = 0;
  if (input.keys.w || input.keys.arrowup) my -= 1;
  if (input.keys.s || input.keys.arrowdown) my += 1;
  if (input.keys.a || input.keys.arrowleft) mx -= 1;
  if (input.keys.d || input.keys.arrowright) mx += 1;
  if (input.device === "gamepad" && input.gamepadMove && (input.gamepadMove.x || input.gamepadMove.y)) {
    mx = input.gamepadMove.x;
    my = input.gamepadMove.y;
  }

  const len = Math.hypot(mx, my) || 1;
  const speed = getPlayerSpeed();
  const strength = Math.min(1, len);
  const dx = (mx / len) * speed * strength * dt;
  const dy = (my / len) * speed * strength * dt;
  moveEntity(world.player, dx, dy);
  if (mx !== 0 || my !== 0) {
    if (Math.abs(mx) > Math.abs(my)) {
      world.player.dir = mx > 0 ? "right" : "left";
    } else {
      world.player.dir = my > 0 ? "front" : "back";
    }
  }
  updateInteractionTarget();

  if (input.justPressed.has("e")) {
    if (world.interactionItemId !== null) {
      world.interactionDismissedId = world.interactionItemId;
      world.interactionItemId = null;
    } else if (world.interactionDismissedId !== null) {
      const found = getNearestInteractableItem();
      if (found && found.id === world.interactionDismissedId) {
        world.interactionDismissedId = null;
        world.interactionItemId = found.id;
      } else {
        setToast("Inget att interagera med här.");
      }
    }
  }

  if (input.justPressed.has("gp_back")) world.gamepadInteractionOpen = false;
  else if (input.justPressed.has("gp_confirm")) {
    if (world.interactionItemId === null) {
      const nearby = getNearestInteractableItem();
      if (nearby) {
        world.interactionDismissedId = null;
        world.interactionItemId = nearby.id;
        world.gamepadInteractionOpen = true;
      }
    } else if (!world.gamepadInteractionOpen) world.gamepadInteractionOpen = true;
    else applyAction("compromise", safeSpawnPoint, checkEndConditions);
  }

  if (input.justPressed.has("f") || input.justPressed.has("gp_special")) useContextAbility();
  if (input.justPressed.has("gp_charm")) useCharm();

  if (input.justPressed.has("q") && hasDistractAbility()) {
    tryUseDistract();
  }

  if (input.justPressed.has("b")) {
    tryInterceptPlacement();
  }

  if (input.justPressed.has("c")) {
    tryStabilizeRoom();
  }

  if (world.interactionItemId !== null) {
    if (input.justPressed.has("1")) applyAction("hide", safeSpawnPoint, checkEndConditions);
    if (input.justPressed.has("2")) applyAction("compromise", safeSpawnPoint, checkEndConditions);
    if (input.justPressed.has("3")) applyAction("remove", safeSpawnPoint, checkEndConditions);
    if (input.justPressed.has("4")) applyAction("deal", safeSpawnPoint, checkEndConditions);
    if (input.justPressed.has("u")) applyAction("use", safeSpawnPoint, checkEndConditions);
    if (world.gamepadInteractionOpen) {
      if (input.justPressed.has("gp_hide")) applyAction("hide", safeSpawnPoint, checkEndConditions);
      else if (input.justPressed.has("gp_compromise")) applyAction("compromise", safeSpawnPoint, checkEndConditions);
      else if (input.justPressed.has("gp_remove")) applyAction("remove", safeSpawnPoint, checkEndConditions);
    }
  }
}
