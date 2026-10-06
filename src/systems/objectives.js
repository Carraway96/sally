import { world } from "../core/state.js";
import { setToast } from "./feedback.js";

export function setDailyObjective(objective) {
  if (!objective) {
    world.dailyObjective = null;
    return;
  }

  world.dailyObjective = {
    ...objective,
    progress: 0,
    completed: false,
    startedAtDay: world.day,
    baselineIntercepted: world.stats.intercepted,
    baselineDeals: world.stats.deals || 0,
    baselineUsed: world.stats.used || 0,
    baselineStabilized: objective.room ? world.roomStabilizeCounts[objective.room] || 0 : 0,
    everLostRoom: false,
  };
}

export function updateDailyObjective() {
  const objective = world.dailyObjective;
  if (!objective) return null;

  if (objective.type === "intercept") {
    objective.progress = world.stats.intercepted - objective.baselineIntercepted;
  } else if (objective.type === "deal") {
    objective.progress = (world.stats.deals || 0) - objective.baselineDeals;
  } else if (objective.type === "use") {
    objective.progress = (world.stats.used || 0) - objective.baselineUsed;
  } else if (objective.type === "stabilizeRoom") {
    objective.progress = (world.roomStabilizeCounts[objective.room] || 0) - objective.baselineStabilized;
  } else if (objective.type === "preserveRoom") {
    if (world.roomStates[objective.room] === "Girlified") objective.everLostRoom = true;
    objective.progress = objective.everLostRoom ? 0 : 1;
  }

  if (objective.type !== "preserveRoom" && objective.progress >= objective.target) {
    objective.completed = true;
  }

  return objective;
}

export function finalizeDailyObjective() {
  const objective = updateDailyObjective();
  if (!objective) return null;

  if (objective.type === "preserveRoom") {
    objective.completed = objective.progress >= 1;
  }

  if (objective.completed) {
    if (!world.storyRun.completedObjectives) {
      world.storyRun.completedObjectives = [];
    }
    if (!world.storyRun.completedObjectives.includes(objective.id)) {
      world.storyRun.completedObjectives.push(objective.id);
      setToast(`Dagens mål klart: ${objective.title}`);
    }
  } else {
    setToast(`Dagens mål missat: ${objective.title}`);
  }

  return objective;
}
