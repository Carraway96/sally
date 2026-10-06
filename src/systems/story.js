import { STATE } from "../core/data.js";
import { tryStartMusic } from "../core/audio.js?v=3";
import { getStoryChapterById, getStoryChapterDay } from "../data/story/chapters.js";
import { getStorySceneById } from "../data/story/scenes.js?v=5";
import { getStoryCutscene } from "../data/story/cutscenes.js?v=9";
import { clearStoryProgress, resetRun, world } from "../core/state.js";
import { finalizeDailyObjective, setDailyObjective } from "./objectives.js";
import { chooseRunChallenge } from "./challenges.js";

export function isStoryState(state) {
  return (
    state === STATE.STORY_MENU ||
    state === STATE.STORY_SCENE ||
    state === STATE.PLANNING ||
    state === STATE.CHAPTER_SUMMARY
  );
}

function rememberStoryScreen(state) {
  if (!isStoryState(state) || state === STATE.STORY_MENU) return;
  world.storyRun.lastScreen = state;
  world.resumeState = state;
}

function getActiveChapter() {
  return getStoryChapterById(world.chapterId || "sally");
}

export function getCurrentStoryDay() {
  if (!world.storyRun.active) {
    return null;
  }
  return getStoryChapterDay(getActiveChapter(), world.storyDay || world.storyRun.currentDay || 1);
}

function setStoryDay(dayNumber) {
  const chapter = getActiveChapter();
  const day = getStoryChapterDay(chapter, dayNumber);
  if (!day) {
    return null;
  }

  world.storyRun.currentDay = day.dayNumber;
  world.storyDay = day.dayNumber;
  world.storySceneId = day.introSceneId;
  world.cutscene = { shotIndex: 0, elapsed: 0 };
  return day;
}

export function getCurrentCutscene() {
  if (world.state !== STATE.STORY_SCENE) return null;
  const shots = getStoryCutscene(world.storySceneId);
  if (!shots?.length) return null;
  const index = Math.max(0, Math.min(shots.length - 1, world.cutscene?.shotIndex || 0));
  return { shot: shots[index], index, total: shots.length };
}

export function updateCutscene(dt) {
  if (world.state === STATE.STORY_SCENE) {
    world.cutscene ||= { shotIndex: 0, elapsed: 0 };
    world.cutscene.elapsed += dt;
  }
}

export function openStoryMenu() {
  if (!world.chapterId) {
    world.chapterId = "sally";
  }
  world.state = STATE.STORY_MENU;
  world.menuHover = "";
}

export function startStoryRun(chapterId = "sally", carryOver = null) {
  const chapter = getStoryChapterById(chapterId);
  if (!chapter) {
    return;
  }

  resetRun(world.selectedGirlId, { clearStoryState: false });
  chooseRunChallenge();
  clearStoryProgress({ preserveMode: true, preserveResume: true });
  world.currentMode = "story";
  world.hasRunStarted = true;
  world.storyRun = {
    active: true,
    chapterId: chapter.id,
    currentDay: 1,
    lastScreen: STATE.STORY_SCENE,
    completedDays: [],
    modifiers: {},
    runtime: {},
    dayComplete: false,
    lastPlanCardId: null,
    completedObjectives: [],
    flags: { ...(carryOver?.flags || {}) },
    relationship: carryOver?.relationship || 0,
    dayResults: [],
    planBoost: false,
  };
  world.chapterId = chapter.id;
  setStoryDay(1);
  world.selectedPlanCard = null;
  world.storyResult = null;
  world.state = STATE.STORY_SCENE;
  world.resumeState = STATE.STORY_SCENE;
}

export function advanceStoryStep() {
  if (!world.storyRun.active) return;
  const chapter = getActiveChapter();
  const activeDay = getCurrentStoryDay();
  if (!chapter || !activeDay) {
    return;
  }

  if (world.state === STATE.STORY_SCENE) {
    const current = getCurrentCutscene();
    if (current && current.index < current.total - 1) {
      world.cutscene.shotIndex += 1;
      world.cutscene.elapsed = 0;
      return;
    }
    world.state = STATE.PLANNING;
    world.storySceneId = activeDay.planningSceneId;
    rememberStoryScreen(world.state);
    return;
  }
}

export function skipStoryCutscene() {
  if (world.state !== STATE.STORY_SCENE) return false;
  const activeDay = getCurrentStoryDay();
  if (!activeDay) return false;
  world.state = STATE.PLANNING;
  world.storySceneId = activeDay.planningSceneId;
  rememberStoryScreen(world.state);
  return true;
}

export function startStoryGameplayDay() {
  if (!world.storyRun.active || !world.selectedPlanCard) {
    return false;
  }

  const activeDay = getCurrentStoryDay();
  if (!activeDay) {
    return false;
  }

  const chapterId = world.chapterId;
  const currentDay = activeDay.dayNumber;
  const completedDays = Array.isArray(world.storyRun.completedDays) ? [...world.storyRun.completedDays] : [];
  const modifiers = world.storyRun.modifiers ? { ...world.storyRun.modifiers } : {};
  if (modifiers.roomWeightMultipliers) {
    modifiers.roomWeightMultipliers = { ...modifiers.roomWeightMultipliers };
  }
  if (modifiers.roomPassiveMultipliers) {
    modifiers.roomPassiveMultipliers = { ...modifiers.roomPassiveMultipliers };
  }
  const runtime = world.storyRun.runtime ? { ...world.storyRun.runtime } : {};
  const lastPlanCardId = world.storyRun.lastPlanCardId || world.selectedPlanCard;

  resetRun(world.selectedGirlId, { clearStoryState: false });

  world.currentMode = "story";
  world.hasRunStarted = true;
  world.state = STATE.PLAYING;
  world.resumeState = STATE.PLAYING;
  world.day = currentDay;
  world.targetDays = currentDay;
  world.storyRun.active = true;
  world.storyRun.chapterId = chapterId;
  world.storyRun.currentDay = currentDay;
  world.storyRun.lastScreen = STATE.PLANNING;
  world.storyRun.completedDays = completedDays;
  world.storyRun.modifiers = modifiers;
  world.storyRun.runtime = runtime;
  world.storyRun.dayComplete = false;
  world.storyRun.lastPlanCardId = lastPlanCardId;
  world.chapterId = chapterId;
  world.storyDay = currentDay;
  world.storySceneId = activeDay.planningSceneId;
  setDailyObjective(activeDay.objective);
  applyStoryConsequences(activeDay);
  tryStartMusic();
  return true;
}

function applyStoryConsequences(activeDay) {
  const flags = world.storyRun.flags || {};
  if (flags.bathroom_secured) world.roomStability.badrum = 5;
  if (flags.hall_saved) world.roomStability.hall = 5;
  if (flags.sacrificed_hall) world.girlification = Math.min(100, world.girlification + 3);
  if (flags.set_boundaries) world.annoyance = Math.max(0, world.annoyance - 4);
  if (flags.made_pact) world.roomStability.hall += 3;
  if (flags.used_practical_items) world.roomStability.kok += 3;
  if (world.storyRun.relationship >= 3) world.roomStability.vardagsrum += 2;
  if (activeDay.dayNumber > 1 && flags.kept_calm) {
    world.spawnTimer += 2;
    world.spawnCycleDuration = world.spawnTimer;
  }
}

function recordStoryDayResult(activeDay) {
  const objective = world.dailyObjective;
  const objectiveCompleted = Boolean(objective && objective.completed);
  const card = world.storyRun.modifiers || {};
  const effect = card.storyEffect;
  const trustDelta = (objectiveCompleted ? 2 : -1) + (effect?.trust || 0);
  world.storyRun.relationship = Math.max(-5, Math.min(8, (world.storyRun.relationship || 0) + trustDelta));
  world.storyRun.flags ||= {};
  const objectiveFlags = {
    stabilize_bathroom: "bathroom_secured",
    intercept_placement: "set_boundaries",
    preserve_hall: "hall_saved",
    make_a_pact: "made_pact",
    use_practical_items: "used_practical_items",
    preserve_living_room: "living_room_saved",
  };
  if (objectiveCompleted && objectiveFlags[objective?.id]) world.storyRun.flags[objectiveFlags[objective.id]] = true;
  if (effect?.flag) world.storyRun.flags[effect.flag] = effect.value;
  world.storyRun.dayResults ||= [];
  world.storyRun.dayResults.push({ day: activeDay.dayNumber, objectiveCompleted, cardId: world.storyRun.lastPlanCardId, trustDelta });
  world.storyRun.planBoost = objectiveCompleted;
}

export function completeStoryGameplayDay() {
  if (!world.storyRun.active) {
    return false;
  }

  const chapter = getActiveChapter();
  const activeDay = getCurrentStoryDay();
  if (!chapter || !activeDay) {
    return false;
  }

  finalizeDailyObjective();
  recordStoryDayResult(activeDay);
  world.storyRun.dayComplete = false;
  if (!world.storyRun.completedDays.includes(activeDay.dayNumber)) {
    world.storyRun.completedDays.push(activeDay.dayNumber);
  }

  world.selectedPlanCard = null;
  world.storyRun.modifiers = {};
  world.storyRun.runtime = {};

  const nextDay = getStoryChapterDay(chapter, activeDay.dayNumber + 1);
  if (nextDay) {
    setStoryDay(nextDay.dayNumber);
    world.state = STATE.STORY_SCENE;
    rememberStoryScreen(world.state);
    return true;
  }

  world.state = STATE.CHAPTER_SUMMARY;
  world.storySceneId = chapter.summarySceneId;
  world.storyResult = chapter.summaryResult;
  world.storyRun.conclusion = world.storyRun.relationship >= 4
    ? "Ni har hittat plats för både er och Sallys gröna oas."
    : "Tre kvällar senare: plantorna trivs, och ni fortsätter prata om platsen.";
  rememberStoryScreen(world.state);
  return true;
}

export function restartStorySkeleton() {
  startStoryRun(world.chapterId || "sally");
}

export function startNextStoryChapter() { return false; }

export function returnToMainMenu() {
  world.state = STATE.MENU;
  world.menuHover = "";
}

export function resumeLastRun() {
  if (!world.hasRunStarted || !world.resumeState) {
    return false;
  }
  world.state = world.resumeState;
  return true;
}

export function clearCompletedRun() {
  world.hasRunStarted = false;
  world.resumeState = null;
  if (world.currentMode === "story") {
    clearStoryProgress();
  }
  world.currentMode = null;
}

export function getStoryScreenContent() {
  const chapter = getActiveChapter();
  const storyScene = getStorySceneById(world.storySceneId);

  if (world.state === STATE.STORY_MENU) {
    return (
      getStorySceneById("story_menu") || {
        eyebrow: "Story Mode",
        title: "Story preview",
        body: "Kapiteldata saknas.",
        bullets: ["Ingen storydata laddad."],
      }
    );
  }

  if (storyScene) {
    if (world.state === STATE.STORY_SCENE) {
      const current = getCurrentCutscene();
      if (current) return { ...storyScene, body: current.shot.line, bullets: [] };
    }
    if (world.state === STATE.CHAPTER_SUMMARY) {
      return {
        ...storyScene,
        bullets: [
          ...(storyScene.bullets || []),
          `Relation: ${world.storyRun.relationship || 0}`,
          `Dagar med godkänt mål: ${world.storyRun.completedObjectives?.length || 0}`,
          world.storyRun.conclusion || "Kapitelresultat saknas.",
        ],
      };
    }
    return storyScene;
  }

  return {
    eyebrow: "Story",
    title: "Storydata saknas",
    body:
      "Story runnern forvantade sig ett kapitel och en scen, men hittade ingen matchande datapost.",
    bullets: [
      `Kapitel: ${world.chapterId || "saknas"}`,
      `Dag: ${world.storyDay || 0}`,
      `Scene id: ${world.storySceneId || "saknas"}`,
    ],
  };
}
