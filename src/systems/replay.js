import { world } from "../core/state.js";
import { recordRunResult } from "../core/profile.js";

const ENDINGS = {
  boundary_keeper: {
    title: "Gränsvakten",
    description: "Du lärde dig att stoppa eskaleringen innan den landade.",
  },
  bachelor_stronghold: {
    title: "Bachelorfästningen",
    description: "Lägenheten överlevde och behöll sin grundläggande identitet.",
  },
  room_tactician: {
    title: "Rumsstrategen",
    description: "Du vann genom att återta kontroll, rum för rum.",
  },
  combo_architect: {
    title: "Kombinationsarkitekten",
    description: "Du läste rummens samband och bröt deras kedjor innan de blev permanenta.",
  },
  survivor: {
    title: "Den motvillige överlevaren",
    description: "Du tog dig igenom kvällen. Det räcker den här gången.",
  },
};

export function evaluateRunOutcome() {
  const achievements = [];
  if (world.stats.intercepted > 0) achievements.push("Första gränsen");
  if (world.stats.stabilizedRooms >= 3) achievements.push("Rumskontroll");
  if (world.stats.removed === 0) achievements.push("Rena händer");
  if (world.stats.used >= 2) achievements.push("Praktisk problemlösare");
  if (world.stats.suspicionTriggers === 0) achievements.push("Inga tydliga mönster");
  if ((world.stats.combosTriggered || 0) >= 3) achievements.push("Kombinationsläsare");
  if (world.challenge?.id && world.stats.roomsLost <= 2) {
    achievements.push(`Utmaning klar: ${world.challenge.name}`);
    world.stats.challengeCompleted = true;
  }

  let endingId = "survivor";
  if (world.stats.intercepted >= 2) {
    endingId = "boundary_keeper";
  } else if (world.girlification < 35) {
    endingId = "bachelor_stronghold";
  } else if (world.stats.combosTriggered >= 3) {
    endingId = "combo_architect";
  } else if (world.stats.stabilizedRooms >= 3) {
    endingId = "room_tactician";
  }

  world.endingId = endingId;
  world.achievements = achievements;
  recordRunResult(world);
  return ENDINGS[endingId];
}

export function getEndingProfile(id) {
  return ENDINGS[id] || ENDINGS.survivor;
}
