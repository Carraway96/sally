const PROFILE_KEY = "sally-profile-v1";

const DEFAULT_PROFILE = {
  runs: 0,
  wins: 0,
  bestPreserved: 0,
  unlockedChallenges: [],
  recentRuns: [],
};

let profile = loadProfile();

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      unlockedChallenges: Array.isArray(parsed.unlockedChallenges) ? parsed.unlockedChallenges : [],
      recentRuns: Array.isArray(parsed.recentRuns) ? parsed.recentRuns : [],
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

function persistProfile() {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Private browsing can disable local storage; the run itself still works.
  }
}

export function getProfile() {
  return profile;
}

export function recordRunResult(world) {
  if (world.runHistoryRecorded) return;
  const preserved = Math.max(0, Math.round(100 - world.girlification));
  const result = {
    result: world.overReason,
    girlId: world.selectedGirlId,
    challengeId: world.challenge?.id || "standard",
    preserved,
    endingId: world.endingId || null,
    timestamp: Date.now(),
  };
  profile.runs += 1;
  if (world.overReason === "win") profile.wins += 1;
  profile.bestPreserved = Math.max(profile.bestPreserved, preserved);
  if (world.challenge?.id && world.overReason === "win" && !profile.unlockedChallenges.includes(world.challenge.id)) {
    profile.unlockedChallenges.push(world.challenge.id);
  }
  profile.recentRuns = [result, ...profile.recentRuns].slice(0, 8);
  world.runHistoryRecorded = true;
  persistProfile();
}

export function resetProfile() {
  profile = { ...DEFAULT_PROFILE };
  persistProfile();
}
