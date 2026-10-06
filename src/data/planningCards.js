export const PLANNING_CARDS = [
  {
    id: "stadrunda",
    name: "Städrunda",
    summary: "Två diskreta försvar ger mindre irritation.",
    detail: "Perfekt när du vill få andrum tidigt på kvällen utan att dra på dig onödig värme.",
    accent: "#92d7ff",
    modifiers: {
      defensiveCalmCharges: 2,
      defensiveActionAnnoyanceMultiplier: 0.58,
      storyEffect: { trust: 1, flag: "kept_calm", value: true },
    },
  },
  {
    id: "lockbete",
    name: "Lockbete",
    summary: "Hallen drar mer tryck, men etableras långsammare.",
    detail: "Du offrar hallen som lockzon för att koppla bort farten i resten av lägenheten.",
    accent: "#ffd38f",
    modifiers: {
      roomWeightMultipliers: {
        hall: 1.65,
      },
      roomPassiveMultipliers: {
        hall: 0.58,
      },
      storyEffect: { trust: -1, flag: "sacrificed_hall", value: true },
    },
  },
  {
    id: "distrahera",
    name: "Distrahera",
    summary: "Lås upp Q och bromsa placeringar kort.",
    detail: "Ett aktivt spelkort. Bra mot kedjor, boss-telegraphs och när tempot börjar dra iväg.",
    accent: "#ff9fc7",
    modifiers: {
      unlockDistract: true,
      distractDuration: 4.5,
      distractCooldown: 14,
      distractSpawnRateMultiplier: 0.38,
      distractMovementMultiplier: 0.45,
      storyEffect: { trust: 2, flag: "set_boundaries", value: true },
    },
  },
];

export function getPlanningCardById(id) {
  return PLANNING_CARDS.find((card) => card.id === id) || null;
}
