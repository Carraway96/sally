// Repeatable balance probe. Actions use travel-time estimates; this is not a human playtest.
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
globalThis.document = {
  getElementById: (id) => id === "gameCanvas" ? { width: 1000, height: 640, getContext: () => ({}) } : null,
};
globalThis.Image = class { set src(value) { this.path = value; } };
globalThis.Audio = class { play() { return Promise.resolve(); } pause() {} };

const { world } = await import("../src/core/state.js");
const { startRunWithGirl, updatePlaying } = await import("../src/systems/gameplay.js");
const { getActionPreview } = await import("../src/systems/player.js");
const { RUN_CHALLENGES } = await import("../src/core/data.js");
const { skipEventScene, chooseEventResponse, advanceEventScene } = await import("../src/systems/eventScene.js");

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function chooseTarget(policy) {
  const options = world.items.filter((item) => !item.hidden && (item.protectedUntil || 0) <= world.vfxClock);
  if (!options.length) return null;
  return options.sort((a, b) => {
    const da = Math.hypot(a.x - (world.player.x + 36), a.y - (world.player.y + 92));
    const db = Math.hypot(b.x - (world.player.x + 36), b.y - (world.player.y + 92));
    const scoreA = a.value * (policy === "aggressive" ? 3 : 2) - da / 75;
    const scoreB = b.value * (policy === "aggressive" ? 3 : 2) - db / 75;
    return scoreB - scoreA;
  })[0];
}

function actionFor(policy, item) {
  if (policy === "aggressive") return "3";
  if (policy === "cautious") return getActionPreview("use", item) && world.annoyance > 10 ? "u" : "1";
  if (getActionPreview("use", item) && world.annoyance > 20) return "u";
  if (getActionPreview("deal", item) && (world.girlfriend.strategyTimer > 0 || world.girlification > 45)) return "4";
  if (world.annoyance < 38 && item.value >= 7) return "3";
  if (item.room === "sovrum" && world.roomStates.sovrum === "Girlified") return "3";
  return "1";
}

function simulate(girlId, policy, seed) {
  Math.random = seededRandom(seed);
  startRunWithGirl(girlId);
  world.challenge = { ...RUN_CHALLENGES[0] };
  let targetId = null;
  let travelLeft = 0;
  let elapsed = 0;
  const dt = 0.05;

  while (world.state === "playing" && elapsed < 300) {
    if (world.eventScene) {
      skipEventScene();
      chooseEventResponse(policy === "aggressive" ? "defend" : "share");
      advanceEventScene();
    }
    const input = { keys: {}, justPressed: new Set() };
    if (policy !== "idle") {
      const target = world.items.find((item) => item.id === targetId && !item.hidden && (item.protectedUntil || 0) <= world.vfxClock);
      if (!target) {
        const next = chooseTarget(policy);
        targetId = next?.id ?? null;
        travelLeft = next ? Math.hypot(next.x - (world.player.x + 36), next.y - (world.player.y + 92)) / 155 + 0.4 : 0;
      } else {
        travelLeft -= dt;
        if (travelLeft <= 0) {
          world.player.x = target.x - 36;
          world.player.y = target.y - 92;
          input.justPressed.add(actionFor(policy, target));
          targetId = null;
        }
      }
      if (world.annoyance >= 24 && world.charmCooldown <= 0) input.justPressed.add("f");
    }
    updatePlaying(dt, input);
    elapsed += dt;
  }

  return {
    girl: girlId,
    policy,
    seed,
    result: world.overReason || world.state,
    seconds: Math.round(elapsed),
    day: world.day,
    girlification: Math.round(world.girlification),
    annoyance: Math.round(world.annoyance),
    removed: world.stats.removed,
    hidden: world.stats.hidden,
    used: world.stats.used,
    deals: world.stats.deals,
    intercepted: world.stats.intercepted,
  };
}

const results = [];
for (const girlId of ["sally"]) {
  for (const policy of ["idle", "cautious", "mixed", "aggressive"]) {
    for (const seed of [11, 29, 47, 83, 101]) {
      results.push(simulate(girlId, policy, seed));
    }
  }
}
console.table(results);
for (const girl of ["sally"]) {
  for (const policy of ["idle", "cautious", "mixed", "aggressive"]) {
    const sample = results.filter((entry) => entry.girl === girl && entry.policy === policy);
    console.log(`${girl} ${policy}: ${sample.filter((entry) => entry.result === "win").length}/${sample.length} wins, median ${sample.map((entry) => entry.seconds).sort((a, b) => a - b)[2]}s`);
  }
}
