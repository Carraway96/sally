export const STORY_SCENES = {
  story_menu: { eyebrow: "LEVEL", title: "Sally", body: "Sally är blond, söt och bär valnötter som örhängen. Nu vill hon fylla lägenheten med chiliplantor, basilika, amplar och växtlampor.", bullets: ["En level, tre kvällar.", "Charma Sally för att lugna läget.", "Hitta plats för er båda bland alla plantor."] },
  sally_summary: { eyebrow: "SALLY", title: "En grön oas", body: "Tre kvällar av odling, charm och kompromisser är avklarade.", bullets: ["Spela igen med en annan plan."] },
};
for (const [i,title] of ["Chiliplantorna", "Basilika och amplar", "Växtlampan i hallen"].entries()) {
  STORY_SCENES[`sally_day${i+1}_intro`] = { eyebrow: `Sally · Kväll ${i+1}`, title, body: "Sally har nya odlingsplaner för lägenheten.", bullets: [] };
  STORY_SCENES[`sally_day${i+1}_planning`] = { eyebrow: "Sally · Planering", title, body: "Välj din plan för kvällen. Göm, kompromissa, använd basilikan eller charma Sally när läget blir spänt.", bullets: [] };
}
export function getStorySceneById(id) { return STORY_SCENES[id] || null; }
