import { input } from "./input.js?v=11";

const labels = {
  keyboard: { move: "WASD", interact: "E", hide: "1", relocate: "2", remove: "3", special: "F", use: "U", deal: "4", intercept: "B", stabilize: "C", calm: "F", distract: "Q", pause: "P", back: "Esc", help: "H" },
  gamepad: { move: "vänster spak/styrkors", interact: "A", hide: "X", relocate: "Y", remove: "LB", special: "RB", use: "A", deal: "Y", intercept: "LT", stabilize: "RT", calm: "Back", distract: "L3", pause: "Menu", back: "B", help: "R3" },
  touch: { move: "styrkorset", interact: "Val", hide: "Göm", relocate: "Kompromissa", remove: "Bort", special: "Special", use: "U", deal: "Pakt", intercept: "B", stabilize: "C", calm: "F", distract: "Q", pause: "P", back: "Tillbaka", help: "Visa" },
};

export function controlLabel(action) {
  return labels[input.device]?.[action] || labels.keyboard[action] || "";
}
