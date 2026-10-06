export const STORY_CUTSCENES = {};
const evenings = [
  ["Köket", "chili", "Chiliplantan behöver bara lite sol. Och halva fönsterbrädan.", "Jag trodde det var en lägenhet. Nu är det en plantskola.", "Sallys valnötsörhängen gungar. En kruka har redan flyttat in."],
  ["Vardagsrummet", "hanging_planter", "Amplarna hänger i luften, så de tar tekniskt sett ingen golvyta.", "Och basilikan? Den har tagit min plats vid bordet.", "Basilikan doftar gott. Förhandlingsläget har blivit grönt."],
  ["Hallen", "grow_light", "Växtlampan gör hallen till ett litet paradis för chilin.", "Ett lila paradis där jag fortfarande behöver kunna gå till dörren.", "Sista kvällen: ge plantorna ljus och relationen lite charm."],
];
evenings.forEach(([room,focus,...lines],i) => {
  STORY_CUTSCENES[`sally_day${i+1}_intro`] = lines.map((line,j) => ({ room, focus, image: `images/${focus}.png`, speaker: ["Hon", "Du", "Berättare"][j], line, accent: "#b9d6a2" }));
});
export function getStoryCutscene(id) { return STORY_CUTSCENES[id] || null; }
