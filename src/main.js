import { adjustMasterVolume, toggleMusic, toggleSfx, toggleVoice } from "./core/audio.js?v=3";
import { bindInputHandlers, gamepadStatus, input, updateGamepadInput } from "./core/input.js?v=11";
import { STATE, getGirlProfileById } from "./core/data.js";
import { canvas, HEIGHT, WIDTH } from "./core/dom.js";
import { resetRun, world } from "./core/state.js";
import { controlLabel } from "./core/controlHints.js?v=5";
import { clearSavedRun, loadRunSnapshot, saveRunSnapshot } from "./core/save.js";
import { toggleAccessibility } from "./core/accessibility.js";
import { clamp } from "./core/utils.js";
import { drawGameplay } from "./render/gameplay.js?v=10";
import { drawEndScreen, drawMenu, getMenuButtons } from "./render/menu.js?v=16";
import { startRunWithGirl, updateDialogue, updatePlaying, updateToast } from "./systems/gameplay.js?v=14";
import { confirmPlanningSelection, getPlanningCardsForCurrentDay, selectPlanningCard } from "./systems/planning.js?v=7";
import {
  advanceStoryStep,
  clearCompletedRun,
  isStoryState,
  openStoryMenu,
  restartStorySkeleton,
  resumeLastRun,
  returnToMainMenu,
  startStoryRun,
  startNextStoryChapter,
  getStoryScreenContent,
  getCurrentCutscene,
  skipStoryCutscene,
  updateCutscene,
} from "./systems/story.js?v=8";
import { updateControlLegendUI, updateDialogueDockUI, updateTopHudUI } from "./ui/domUI.js?v=9";
import { advanceEventScene, chooseEventResponse, currentEventScene, skipEventScene } from "./systems/eventScene.js?v=4";
import { getContextAbility } from "./systems/player.js?v=7";

const eventSceneElement = document.getElementById("eventScene");
const eventSceneNext = document.getElementById("eventSceneNext");
const eventSceneSkip = document.getElementById("eventSceneSkip");
const eventSceneShare = document.getElementById("eventSceneShare");
const eventSceneDefend = document.getElementById("eventSceneDefend");
let lastEventSceneSignature = "";
let lastControlDevice = "";
let lastPlayHint = "";

function renderControlHelp() {
  if (input.device === lastControlDevice) return;
  lastControlDevice = input.device;
  const summary = document.getElementById("controlSummary");
  const details = document.getElementById("controlDetails");
  if (summary) summary.textContent = `Kontroller · ${controlLabel("move")} flytta · ${controlLabel("interact")} interagera · ${controlLabel("help")} hjälp`;
  if (details) details.textContent = `${controlLabel("hide")} göm · ${controlLabel("relocate")} kompromissa (använd, förhandla eller flytta) · ${controlLabel("remove")} ta bort · ${controlLabel("special")} specialåtgärd när den visas · ${controlLabel("help")} hjälp/karta · ${controlLabel("pause")} pausa. Avancerade genvägar: ${controlLabel("intercept")} stoppa, ${controlLabel("stabilize")} stabilisera, ${controlLabel("calm")} Charma, ${controlLabel("distract")} distrahera${input.device === "keyboard" ? `, ${controlLabel("deal")} pakt, ${controlLabel("use")} använd` : ""}.`;
}

function renderPlayHint() {
  const base = input.device === "gamepad"
    ? "Spak: gå · X göm · Y kompromissa · LB ta bort · R3 hjälp"
    : input.device === "touch"
      ? "Styrkorset: gå · välj bland tre åtgärder nära en sak"
      : "WASD: gå · 1 göm · 2 kompromissa · 3 ta bort · H hjälp";
  const special = getContextAbility();
  const message = `${base}${special ? ` · ${controlLabel("special")} ${special.label}` : ""}`;
  if (message === lastPlayHint) return;
  lastPlayHint = message;
  const hint = document.getElementById("playHint");
  if (hint) hint.textContent = message;
}

function renderEventSceneUI() {
  if (!eventSceneElement) return;
  const scene = world.state === STATE.PLAYING ? currentEventScene() : null;
  const signature = `${scene?.id || ""}:${scene?.index ?? ""}:${input.device}`;
  if (signature === lastEventSceneSignature) return;
  lastEventSceneSignature = signature;
  const wasHidden = eventSceneElement.hidden;
  eventSceneElement.hidden = !scene;
  if (!scene) return;
  if (wasHidden) eventSceneElement.focus();
  document.getElementById("eventSceneTitle").textContent = scene.title;
  document.getElementById("eventSceneCount").textContent = `${scene.index + 1}/${scene.total}`;
  const image = document.getElementById("eventSceneImage");
  image.src = scene.image;
  image.alt = scene.title;
  document.getElementById("eventSceneSpeaker").textContent = scene.shot.speaker === "Hon" ? getGirlProfileById(world.selectedGirlId).name + ":" : "Du:";
  document.getElementById("eventSceneLine").textContent = scene.shot.line;
  document.getElementById("eventSceneEffect").textContent = `I spelet: ${scene.effect}`;
  const outcome = document.getElementById("eventSceneOutcome");
  outcome.hidden = !scene.reaction;
  outcome.textContent = scene.outcome;
  eventSceneNext.hidden = scene.choice;
  eventSceneSkip.hidden = scene.choice || scene.reaction;
  eventSceneShare.hidden = !scene.choice;
  eventSceneDefend.hidden = !scene.choice;
  document.querySelector(".event-scene-actions")?.classList.toggle("is-choice", scene.choice);
  eventSceneShare.textContent = "Ge plats · relation +1, tjejifiering +2";
  eventSceneDefend.textContent = "Försvara lägenheten · relation −1, irritation +4";
  eventSceneNext.textContent = scene.reaction ? "Tillbaka till spelet" : "Nästa bild";
  document.getElementById("eventSceneHint").textContent = scene.choice
    ? `${controlLabel("interact")} ge plats · ${controlLabel("back")} försvara lägenheten`
    : scene.reaction ? `${controlLabel("interact")} fortsätt` : `${controlLabel("interact")} nästa · ${controlLabel("back")} till val`;
}

eventSceneNext?.addEventListener("click", advanceEventScene);
eventSceneSkip?.addEventListener("click", skipEventScene);
eventSceneShare?.addEventListener("click", () => chooseEventResponse("share"));
eventSceneDefend?.addEventListener("click", () => chooseEventResponse("defend"));

function handleEventSceneInput() {
  const scene = currentEventScene();
  if (!scene) return;
  if (scene.choice) {
    if (input.justPressed.has("e") || input.justPressed.has("gp_confirm") || input.justPressed.has("enter") || input.justPressed.has("1")) chooseEventResponse("share");
    else if (input.justPressed.has("u") || input.justPressed.has("gp_back") || input.justPressed.has("escape") || input.justPressed.has("2")) chooseEventResponse("defend");
  } else if (input.justPressed.has("e") || input.justPressed.has("gp_confirm") || input.justPressed.has("enter") || input.justPressed.has(" ")) {
    advanceEventScene();
  } else if (input.justPressed.has("gp_back") || input.justPressed.has("p") || input.justPressed.has("escape")) {
    skipEventScene();
  }
}

function render() {
  if (world.state === STATE.PLAYING) {
    drawGameplay();
  } else if (
    world.state === STATE.MENU ||
    world.state === STATE.DIFFICULTY_SELECT ||
    world.state === STATE.STORY_MENU ||
    world.state === STATE.STORY_SCENE ||
    world.state === STATE.PLANNING ||
    world.state === STATE.CHAPTER_SUMMARY ||
    world.state === STATE.PAUSED ||
    world.state === STATE.SETTINGS
  ) {
    drawMenu();
  } else if (world.state === STATE.GAME_OVER) {
    drawEndScreen();
  }
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function canvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = WIDTH / rect.width;
  const scaleY = HEIGHT / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function handleMenuAction(id) {
  if (id === "new") {
    startStoryRun("sally");
    return;
  }
  if (id === "story") {
    openStoryMenu();
    return;
  }
  if (id === "continue") {
    resumeLastRun();
    return;
  }
  if (id === "settings") {
    world.prevStateBeforeSettings = world.state === STATE.SETTINGS ? STATE.MENU : world.state;
    world.state = STATE.SETTINGS;
    return;
  }
  if (id === "start_sally") {
    startRunWithGirl("sally");
    return;
  }
  if (id === "story_start_sally") { startStoryRun("sally"); return; }
  if (id === "story_next_chapter") {
    startNextStoryChapter();
    return;
  }
  if (id === "story_next") {
    advanceStoryStep();
    return;
  }
  if (id === "story_skip") {
    skipStoryCutscene();
    return;
  }
  if (id.startsWith("planning_card_")) {
    selectPlanningCard(id.replace("planning_card_", ""));
    world.menuHover = "planning_confirm";
    return;
  }
  if (id === "planning_confirm") {
    confirmPlanningSelection();
    return;
  }
  if (id === "story_restart") {
    restartStorySkeleton();
    return;
  }
  if (id === "back_menu") {
    world.state = STATE.MENU;
    return;
  }
  if (id === "resume") {
    world.state = STATE.PLAYING;
    return;
  }
  if (id === "restart") {
    if (world.currentMode === "story") {
      restartStorySkeleton();
    } else {
      startRunWithGirl(world.selectedGirlId);
    }
    return;
  }
  if (id === "menu") {
    if (world.state === STATE.GAME_OVER) {
      clearCompletedRun();
    }
    returnToMainMenu();
    return;
  }
  if (id === "music") {
    toggleMusic();
    return;
  }
  if (id === "sfx") {
    toggleSfx();
    return;
  }
  if (id === "voice") {
    toggleVoice();
    return;
  }
  if (id === "volume") {
    adjustMasterVolume(0.1);
    return;
  }
  if (id === "high_contrast") {
    toggleAccessibility("highContrast");
    return;
  }
  if (id === "colorblind") {
    toggleAccessibility("colorblind");
    return;
  }
  if (id === "reduced_motion") {
    toggleAccessibility("reducedMotion");
    return;
  }
  if (id === "back") {
    world.state = world.prevStateBeforeSettings || STATE.MENU;
  }
}

const mobileMenu = document.getElementById("mobileMenu");
let lastMobileMenuSignature = "";

function renderMobileMenu() {
  if (!mobileMenu || world.state === STATE.PLAYING) return;
  const buttons = getMenuButtons();
  const cards = world.state === STATE.PLANNING ? getPlanningCardsForCurrentDay() : [];
  const signature = JSON.stringify({
    state: world.state, scene: world.storySceneId, chapter: world.chapterId, shot: world.cutscene?.shotIndex,
    selected: world.selectedPlanCard, resume: world.resumeState, music: buttons.map((button) => button.label),
  });
  if (signature === lastMobileMenuSignature) return;
  lastMobileMenuSignature = signature;
  mobileMenu.replaceChildren();

  const storyContent = isStoryState(world.state) ? getStoryScreenContent() : null;
  const title = document.createElement("h2");
  title.textContent = storyContent?.title || ({
    [STATE.MENU]: "Girlification",
    [STATE.DIFFICULTY_SELECT]: "Välj svårighetsgrad",
    [STATE.PAUSED]: "Pausat",
    [STATE.SETTINGS]: "Inställningar",
    [STATE.GAME_OVER]: world.overReason === "win" ? "Du överlevde" : "Rundan är slut",
  })[world.state] || "Spelmeny";
  mobileMenu.append(title);

  const cutscene = getCurrentCutscene();
  mobileMenu.classList.toggle("has-cutscene", Boolean(cutscene));
  if (cutscene) {
    const frame = document.createElement("div");
    frame.className = "mobile-cutscene-frame";
    frame.style.setProperty("--scene-accent", cutscene.shot.accent);
    const room = document.createElement("span");
    room.className = "mobile-cutscene-room";
    room.textContent = `${cutscene.shot.room} · Bild ${cutscene.index + 1}/${cutscene.total}`;
    const image = document.createElement("img");
    image.src = cutscene.shot.image;
    image.alt = cutscene.shot.focus === "shared_shelf_boss" ? "Stor hylla" : cutscene.shot.room;
    const speaker = document.createElement("strong");
    speaker.textContent = cutscene.shot.speaker === "Hon" ? getGirlProfileById(world.selectedGirlId).name : cutscene.shot.speaker;
    frame.append(room, image, speaker);
    mobileMenu.append(frame);
  }

  if (storyContent?.body) {
    const body = document.createElement("p");
    body.textContent = storyContent.body;
    mobileMenu.append(body);
  }
  if (world.state === STATE.GAME_OVER) {
    const result = document.createElement("p");
    result.textContent = `${world.overReason === "win" ? "Du höll ut." : world.overReason === "irritation" ? "Irritationen nådde 100%." : "Tjejifieringen nådde 100%."} Bevarad nivå: ${Math.max(0, Math.round(100 - world.girlification))}%. Borttaget: ${world.stats.removed}, gömt: ${world.stats.hidden}, pakter: ${world.stats.deals || 0}.`;
    mobileMenu.append(result);
  }
  if (storyContent?.bullets?.length) {
    const list = document.createElement("ul");
    for (const bullet of storyContent.bullets) {
      const item = document.createElement("li");
      item.textContent = bullet;
      list.append(item);
    }
    mobileMenu.append(list);
  }
  for (const button of buttons) {
    const card = cards.find((entry) => `planning_card_${entry.id}` === button.id);
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = card ? card.name : button.label || button.id;
    element.disabled = Boolean(button.disabled);
    if (card) {
      element.setAttribute("aria-pressed", world.selectedPlanCard === card.id ? "true" : "false");
      const detail = document.createElement("span");
      detail.className = "mobile-menu-detail";
      detail.textContent = card.summary;
      element.append(detail);
    }
    element.addEventListener("click", () => {
      handleMenuAction(button.id);
      lastMobileMenuSignature = "";
      renderMobileMenu();
    });
    mobileMenu.append(element);
  }
}

canvas.addEventListener("mousemove", (event) => {
  const point = canvasPointFromEvent(event);
  world.menuHover = "";
  if (
    world.state === STATE.MENU ||
    world.state === STATE.DIFFICULTY_SELECT ||
    world.state === STATE.STORY_MENU ||
    world.state === STATE.STORY_SCENE ||
    world.state === STATE.PLANNING ||
    world.state === STATE.CHAPTER_SUMMARY ||
    world.state === STATE.PAUSED ||
    world.state === STATE.SETTINGS ||
    world.state === STATE.GAME_OVER
  ) {
    for (const button of getMenuButtons()) {
      if (button.disabled) continue;
      if (pointInRect(point.x, point.y, button)) {
        world.menuHover = button.id;
        break;
      }
    }
  }
});

canvas.addEventListener("click", (event) => {
  const point = canvasPointFromEvent(event);
  if (
    world.state === STATE.MENU ||
    world.state === STATE.DIFFICULTY_SELECT ||
    world.state === STATE.STORY_MENU ||
    world.state === STATE.STORY_SCENE ||
    world.state === STATE.PLANNING ||
    world.state === STATE.CHAPTER_SUMMARY ||
    world.state === STATE.PAUSED ||
    world.state === STATE.SETTINGS ||
    world.state === STATE.GAME_OVER
  ) {
    for (const button of getMenuButtons()) {
      if (button.disabled) continue;
      if (pointInRect(point.x, point.y, button)) {
        handleMenuAction(button.id);
        return;
      }
    }
  }
});

function handleGamepadMenu() {
  if (world.state === STATE.PLAYING || world.state === STATE.STORY_SCENE) return false;
  const buttons = getMenuButtons().filter((button) => !button.disabled);
  if (!buttons.length) return false;
  const currentIndex = Math.max(0, buttons.findIndex((button) => button.id === world.menuHover));
  if (input.justPressed.has("gp_down") || input.justPressed.has("gp_right")) {
    world.menuHover = buttons[(currentIndex + 1) % buttons.length].id;
    return true;
  }
  if (input.justPressed.has("gp_up") || input.justPressed.has("gp_left")) {
    world.menuHover = buttons[(currentIndex - 1 + buttons.length) % buttons.length].id;
    return true;
  }
  if (input.justPressed.has("gp_back")) {
    if (world.state === STATE.SETTINGS) handleMenuAction("back");
    else if (world.state === STATE.PAUSED) handleMenuAction("resume");
    else if (world.state !== STATE.MENU) handleMenuAction("menu");
    return true;
  }
  if (input.justPressed.has("gp_confirm")) {
    handleMenuAction(buttons[currentIndex].id);
    return true;
  }
  return false;
}

const gamepadStatusElement = document.getElementById("gamepadStatus");
let lastGamepadStatusText = "";

function updateGamepadStatusUI() {
  if (!gamepadStatusElement) return;
  gamepadStatusElement.title = gamepadStatus.state === "connected" ? gamepadStatus.name : "";
  let message;
  if (gamepadStatus.state === "connected") {
    message = "Handkontroll ansluten";
  } else if (gamepadStatus.state === "nonstandard") {
    message = "Handkontroll: välj Gamepad-layout i Steam";
  } else if (gamepadStatus.state === "unsupported") {
    message = "Handkontroll stöds inte i webbläsaren";
  } else if (gamepadStatus.state === "blocked") {
    message = "Handkontroll blockerad i webbläsaren";
  } else {
    message = "Handkontroll: tryck A i sidan";
  }
  if (message !== lastGamepadStatusText) {
    gamepadStatusElement.textContent = message;
    lastGamepadStatusText = message;
  }
}

function handleGlobalHotkeys() {
  if (input.justPressed.has("r") && world.state === STATE.GAME_OVER) {
    if (world.currentMode === "story") {
      restartStorySkeleton();
    } else {
      startRunWithGirl(world.selectedGirlId);
    }
  }

  if (world.state === STATE.DIFFICULTY_SELECT) {
    if (input.justPressed.has("1")) {
      startRunWithGirl("sally");
      return;
    }
  }

  if (world.state === STATE.STORY_MENU && input.justPressed.has("enter")) {
    startStoryRun();
    return;
  }

  if (world.state === STATE.STORY_SCENE && (input.justPressed.has("enter") || input.justPressed.has("e") || input.justPressed.has("gp_confirm"))) {
    advanceStoryStep();
    return;
  }
  if (world.state === STATE.STORY_SCENE && (input.justPressed.has("p") || input.justPressed.has("escape") || input.justPressed.has("gp_back"))) {
    skipStoryCutscene();
    return;
  }

  if (world.state === STATE.PLANNING) {
    const cards = getPlanningCardsForCurrentDay();
    if (input.justPressed.has("1") && cards[0]) {
      selectPlanningCard(cards[0].id);
      return;
    }
    if (input.justPressed.has("2") && cards[1]) {
      selectPlanningCard(cards[1].id);
      return;
    }
    if (input.justPressed.has("3") && cards[2]) {
      selectPlanningCard(cards[2].id);
      return;
    }
    if (input.justPressed.has("enter")) {
      confirmPlanningSelection();
      return;
    }
  }

  if (world.state === STATE.CHAPTER_SUMMARY && input.justPressed.has("enter")) {
    if (world.chapterId === "sally") startNextStoryChapter();
    else restartStorySkeleton();
    return;
  }

  if ((input.justPressed.has("p") || input.justPressed.has(" ")) && world.state === STATE.PLAYING) {
    world.state = STATE.PAUSED;
  } else if ((input.justPressed.has("p") || input.justPressed.has(" ")) && world.state === STATE.PAUSED) {
    world.state = STATE.PLAYING;
  }

  if (input.justPressed.has("h") && world.state === STATE.PLAYING) {
    world.tutorial.active = !world.tutorial.active;
    world.toast.text = world.tutorial.active ? "Hjälpvisning på." : "Hjälpvisning av.";
    world.toast.timer = 1.6;
  }

  if (input.justPressed.has("escape") && isStoryState(world.state) && world.state !== STATE.STORY_MENU) {
    returnToMainMenu();
  }
}

function tick(dt) {
  document.querySelector(".app")?.classList.toggle("is-menu", world.state !== STATE.PLAYING);
  updateGamepadInput();
  document.querySelector(".app")?.classList.toggle("uses-gamepad", input.device === "gamepad");
  updateGamepadStatusUI();
  const eventWasOpen = world.state === STATE.PLAYING && Boolean(world.eventScene);
  if (eventWasOpen) handleEventSceneInput();
  else if (!handleGamepadMenu()) handleGlobalHotkeys();
  if (world.state === STATE.PLAYING && !eventWasOpen) {
    updatePlaying(dt, input);
  } else if (!eventWasOpen) {
    updateCutscene(dt);
    updateDialogue(dt);
    updateToast(dt);
  }
  updateTopHudUI();
  updateControlLegendUI();
  updateDialogueDockUI();
  renderControlHelp();
  renderPlayHint();
  renderEventSceneUI();
  renderMobileMenu();

  if (world.state === STATE.GAME_OVER) {
    clearSavedRun();
  } else if (world.hasRunStarted) {
    saveTimer -= dt;
    if (saveTimer <= 0) {
      saveRunSnapshot();
      saveTimer = 1;
    }
  }
}

let lastTime = performance.now();
let saveTimer = 0;

function gameLoop(now) {
  const dt = clamp((now - lastTime) / 1000, 0, 0.05);
  lastTime = now;
  tick(dt);
  render();
  input.justPressed.clear();
  requestAnimationFrame(gameLoop);
}

bindInputHandlers();
if (!loadRunSnapshot()) {
  resetRun();
}
updateTopHudUI();
updateDialogueDockUI();
requestAnimationFrame(gameLoop);
