import { ctx } from "../core/dom.js";
import { wrapText } from "../core/utils.js";
import { world } from "../core/state.js";
import { getPlanningCardsForCurrentDay } from "../systems/planning.js";

const CARD_X = 150;
const CARD_Y = 300;
const CARD_W = 218;
const CARD_H = 146;
const CARD_GAP = 18;

export function getPlanningCardButtons() {
  return getPlanningCardsForCurrentDay().map((card, index) => ({
    id: `planning_card_${card.id}`,
    cardId: card.id,
    skipDefaultDraw: true,
    x: CARD_X + index * (CARD_W + CARD_GAP),
    y: CARD_Y,
    w: CARD_W,
    h: CARD_H,
  }));
}

export function drawPlanningCards() {
  const cards = getPlanningCardsForCurrentDay();
  const buttons = getPlanningCardButtons();

  for (let i = 0; i < buttons.length; i += 1) {
    const button = buttons[i];
    const card = cards[i];
    const selected = world.selectedPlanCard === card.id;
    const hovering = world.menuHover === button.id;

    ctx.fillStyle = selected
      ? "rgba(255, 229, 241, 0.2)"
      : hovering
        ? "rgba(255, 229, 241, 0.14)"
        : "rgba(255, 229, 241, 0.08)";
    ctx.fillRect(button.x, button.y, button.w, button.h);
    ctx.strokeStyle = selected ? card.accent : "rgba(255, 228, 239, 0.28)";
    ctx.lineWidth = selected ? 3 : 1.5;
    ctx.strokeRect(button.x, button.y, button.w, button.h);

    ctx.fillStyle = card.accent;
    ctx.fillRect(button.x, button.y, button.w, 6);

    ctx.fillStyle = "#fff8fc";
    ctx.font = "bold 18px Trebuchet MS";
    ctx.textAlign = "left";
    ctx.fillText(`${i + 1}. ${card.name}`, button.x + 12, button.y + 28);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "14px Trebuchet MS";
    let textY = button.y + 50;
    for (const line of wrapText(card.summary, button.w - 24)) {
      ctx.fillText(line, button.x + 12, textY);
      textY += 16;
    }

    ctx.fillStyle = "rgba(255,255,255,0.68)";
    ctx.font = "12px Trebuchet MS";
    for (const line of wrapText(card.detail, button.w - 24).slice(0, 2)) {
      ctx.fillText(line, button.x + 12, textY + 2);
      textY += 14;
    }

    if (selected) {
      ctx.fillStyle = card.accent;
      ctx.font = "bold 13px Trebuchet MS";
      ctx.fillText("Vald för kvällen", button.x + 12, button.y + button.h - 12);
    }
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffeaf4";
  ctx.font = "14px Trebuchet MS";
  ctx.fillText("1-3 väljer kort. Enter startar kvällen när ett kort är valt.", CARD_X, CARD_Y + CARD_H + 22);
  if (world.storyRun.planBoost) {
    ctx.fillStyle = "#baf4c8";
    ctx.fillText("Klarat dagsmål: ditt val får en extra bonus!", CARD_X, CARD_Y + CARD_H + 42);
  }
}
