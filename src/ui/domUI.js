import {
  dialogueAvatar,
  dialogueDock,
  dialogueName,
  dialogueText,
  uiDay,
  uiEvent,
  uiAbility,
  uiChallenge,
  uiGirlification,
  uiGirlificationFill,
  uiIrritation,
  uiIrritationFill,
  uiMood,
  uiStrategy,
  uiObjective,
  uiRoomBadrum,
  uiRoomHall,
  uiRoomEffect,
  uiRoomKok,
  uiRoomSovrum,
  uiRoomVardagsrum,
} from "../core/dom.js";
import { clamp } from "../core/utils.js";
import { controlLabel } from "../core/controlHints.js?v=5";
import { input } from "../core/input.js?v=11";
import { ITEM_TYPES, rooms } from "../core/data.js";
import { world } from "../core/state.js";
import { getContextAbility } from "../systems/player.js?v=7";
import { getChallengeDescription, getChallengeLabel } from "../systems/challenges.js";
import { activePlacementTarget, getDialogueSpeaker, getGirlSpeaker, getSelectedGirlProfile, roomStateToSwedish } from "../game/shared.js";

export function updateTopHudUI() {
  const profile = getSelectedGirlProfile();
  if (uiDay) {
    uiDay.textContent = `Kväll ${world.day}/${world.storyRun.active ? 3 : world.targetDays}`;
  }
  if (uiGirlification) {
    uiGirlification.textContent = `${Math.round(world.girlification)}%`;
  }
  if (uiIrritation) {
    uiIrritation.textContent = `${Math.round(world.annoyance)}%`;
  }
  if (uiGirlificationFill) {
    uiGirlificationFill.style.width = `${clamp(world.girlification, 0, 100)}%`;
  }
  if (uiIrritationFill) {
    uiIrritationFill.style.width = `${clamp(world.annoyance, 0, 100)}%`;
  }
  const relationship = world.storyRun?.relationship || 0;
  const relationshipName = relationship <= -3 ? "Ansträngd" : relationship < 0 ? "Skör" : relationship >= 4 ? "Nära" : relationship > 0 ? "Varmare" : "Neutral";
  const relationshipText = document.getElementById("uiRelationship");
  const relationshipFill = document.getElementById("uiRelationshipFill");
  if (relationshipText) relationshipText.textContent = `${relationshipName} · ${relationship > 0 ? "+" : ""}${relationship}`;
  if (relationshipFill) relationshipFill.style.width = `${((clamp(relationship, -5, 8) + 5) / 13) * 100}%`;
  if (uiEvent) {
    uiEvent.textContent = world.activeEvent ? world.activeEvent.name : "Ingen händelse";
  }

  if (uiAbility) {
    const charmLabel =
      world.charmCooldown > 0 ? `Charma: ${Math.ceil(world.charmCooldown)}s` : "Charma: redo";
    const distractUnlocked = Boolean(world.storyRun && world.storyRun.modifiers && world.storyRun.modifiers.unlockDistract);
    const distractLabel = distractUnlocked
      ? world.storyRun.runtime && world.storyRun.runtime.distractCooldown > 0
        ? `${controlLabel("distract")} Distrahera: ${Math.ceil(world.storyRun.runtime.distractCooldown)}s`
        : `${controlLabel("distract")} Distrahera: redo`
      : `${controlLabel("distract")} Distrahera: låst`;
    uiAbility.textContent = `${charmLabel} | ${distractLabel} | Pakt: ${world.dealsLeft ?? 2} kvar`;
  }

  if (uiChallenge) {
    uiChallenge.textContent = getChallengeLabel();
    uiChallenge.title = getChallengeDescription();
  }

  if (uiObjective) {
    const objective = world.dailyObjective;
    if (!objective) {
      uiObjective.textContent = "Ingen daglig uppgift.";
    } else {
      const progress = objective.type === "preserveRoom"
        ? objective.progress >= 1 ? "hålls" : "hotad"
        : `${Math.min(objective.progress, objective.target)}/${objective.target}`;
      uiObjective.textContent = `Mål: ${objective.title} (${progress})`;
      uiObjective.title = objective.description || "";
    }
  }

  const pendingPlacement = activePlacementTarget();
  const eventCard = uiEvent?.closest(".hud-card-event");
  eventCard?.classList.toggle("is-urgent", !!pendingPlacement || world.girlification >= 80 || world.annoyance >= 80);
  eventCard?.classList.toggle("is-idle", Boolean(world.eventBreather) || (!world.activeEvent && !pendingPlacement && world.girlification < 60 && world.annoyance < 60));
  if (uiMood) {
    if (world.moodSwing.active) {
      uiMood.textContent = "Rött läge. Extra tryck i lägenheten.";
    } else if (pendingPlacement) {
      uiMood.textContent = `${profile.name} bär ${ITEM_TYPES[pendingPlacement.typeId]?.name || "en sak"} mot ${rooms[pendingPlacement.roomKey].name}. ${controlLabel("intercept")} stoppar henne nära.`;
    } else if (world.activeEvent) {
      uiMood.textContent = `${Math.ceil(world.activeEvent.timeLeft)} sek kvar.`;
    } else if (world.charmCooldown > 0) {
      uiMood.textContent = `Charma redo om ${Math.ceil(world.charmCooldown)} sek.`;
    } else if (world.annoyance >= 70) {
      uiMood.textContent = "Stämningen är ansträngd.";
    } else if (world.girlification >= 70) {
      uiMood.textContent = "Mysnivån börjar ta över.";
    } else if (world.items.some((item) => !item.hidden)) {
      const strongest = world.items.filter((item) => !item.hidden).sort((a, b) => b.value - a.value)[0];
      uiMood.textContent = `Störst tryck: ${ITEM_TYPES[strongest.typeId]?.name || "föremål"} i ${rooms[strongest.room]?.name || strongest.room}.`;
    } else {
      uiMood.textContent = "Läget är lugnt.";
    }
  }

  if (uiStrategy) {
    const focus = world.girlfriend.strategyTimer > 0 && world.girlfriend.strategyRoom;
    uiStrategy.textContent = focus
      ? `${profile.name} bevakar ${rooms[world.girlfriend.strategyRoom]?.name || world.girlfriend.strategyRoom} efter dina ${world.girlfriend.strategyAction === "remove" ? "borttagningar" : "flyttar"}. En pakt bryter motdraget.`
      : "";
  }

  const roomBindings = [
    [uiRoomVardagsrum, "Vardagsrum", world.roomStates.vardagsrum, "Mer passivt tryck"],
    [uiRoomKok, "Kök", world.roomStates.kok, "Praktiska saker ger halv nytta"],
    [uiRoomBadrum, "Badrum", world.roomStates.badrum, "Svårare att stabilisera"],
    [uiRoomSovrum, "Sovrum", world.roomStates.sovrum, "Gömning ger mindre lättnad"],
    [uiRoomHall, "Hall", world.roomStates.hall, "Flytt ger mindre lättnad"],
  ];

  for (const [element, label, state, penalty] of roomBindings) {
    if (!element) continue;
    element.textContent = `${label}: ${roomStateToSwedish(state)}`;
    element.title = state === "Girlified" ? penalty : "";
    element.classList.remove("is-neutral", "is-contested", "is-girlified");
    if (state === "Girlified") {
      element.classList.add("is-girlified");
    } else if (state === "Contested") {
      element.classList.add("is-contested");
    } else {
      element.classList.add("is-neutral");
    }
  }
  if (uiRoomEffect) {
    const activePenalties = roomBindings.filter(([, , state]) => state === "Girlified").map(([, label, , penalty]) => `${label}: ${penalty.toLowerCase()}`);
    uiRoomEffect.textContent = activePenalties.join(". ");
  }
}

let lastLegendSignature = "";
export function updateControlLegendUI() {
  const legend = document.getElementById("controlLegend");
  if (!legend) return;
  const cooldown = Math.ceil(world.charmCooldown || 0);
  const distractUnlocked = Boolean(world.storyRun?.modifiers?.unlockDistract);
  const distractCooldown = Math.ceil(world.storyRun?.runtime?.distractCooldown || 0);
  const special = getContextAbility();
  const signature = `${input.device}:${special?.id || ""}:${cooldown}:${world.dealsLeft}:${distractUnlocked}:${distractCooldown}`;
  if (signature === lastLegendSignature) return;
  lastLegendSignature = signature;
  const actions = [
    ["move", "Gå", false],
    ["interact", input.device === "gamepad" ? "Öppna val" : "Visa/dölj val", false],
    ["hide", "Göm", false],
    ["relocate", "Kompromissa", false],
    ["remove", "Ta bort", false],
    ...(input.device === "gamepad" ? [["back", "Stäng val", false]] : []),
  ];
  if (special) actions.unshift(["special", special.label, true]);
  const fragment = document.createDocumentFragment();
  for (const [action, name, primary] of actions) {
    const tile = document.createElement("div");
    tile.className = `control-tile${primary ? " is-primary" : ""}${primary && cooldown ? " is-cooling" : ""}`;
    const glyph = document.createElement("span");
    const label = action === "move" && input.device === "gamepad" ? "LS" : controlLabel(action);
    glyph.textContent = label;
    glyph.className = `control-glyph${input.device === "gamepad" ? " is-xbox" : ""}`;
    if (input.device === "gamepad") {
      const kind = { A: "a", B: "b", X: "x", Y: "y", LB: "shoulder", RB: "shoulder", LT: "shoulder", RT: "shoulder", LS: "stick", L3: "stick", Back: "view" }[label];
      if (kind) glyph.classList.add(`is-${kind}`);
    }
    const text = document.createElement("span");
    text.className = "control-tile-label";
    text.textContent = name;
    tile.append(glyph, text);
    fragment.append(tile);
  }
  legend.replaceChildren(fragment);
}

export function updateDialogueDockUI() {
  if (!dialogueDock || !dialogueText) {
    return;
  }

  const hasDialogue = Boolean(world.dialogue.text);
  const speaker = hasDialogue ? getDialogueSpeaker(world.dialogue.speaker) : getGirlSpeaker();
  dialogueDock.classList.toggle("is-hidden", !hasDialogue);
  if (dialogueAvatar) {
    dialogueAvatar.src = speaker.imageSrc;
    dialogueAvatar.alt = speaker.alt;
  }
  if (dialogueName) {
    dialogueName.textContent = speaker.name;
  }
  dialogueText.textContent = hasDialogue ? world.dialogue.text : "Ingen kommentar just nu.";
}
