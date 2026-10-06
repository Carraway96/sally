import { ctx, HEIGHT, WIDTH } from "../core/dom.js";
import { ITEM_TYPES, ROOM_ALERT_DURATION, rooms } from "../core/data.js";
import { world } from "../core/state.js";
import { clamp, wrapText } from "../core/utils.js";
import { activePlacementTarget } from "../game/shared.js";
import { getActionPreview, getItemById } from "../systems/player.js?v=7";
import { accessibilityState } from "../core/accessibility.js";
import { controlLabel } from "../core/controlHints.js?v=5";
import { input } from "../core/input.js?v=11";

export function drawInteractionMenu() {
  const item = getItemById(world.interactionItemId);
  if (!item) return;
  const type = ITEM_TYPES[item.typeId] || ITEM_TYPES.candle;
  if (input.device === "gamepad" && !world.gamepadInteractionOpen) {
    const prompt = `A  Välj åtgärd: ${type.name}`;
    ctx.font = "bold 15px Trebuchet MS";
    const width = Math.max(220, ctx.measureText(prompt).width + 28);
    const px = clamp(item.x - width * 0.5, 10, WIDTH - width - 10);
    const py = clamp(item.y - 68, 12, HEIGHT - 38);
    ctx.fillStyle = "rgba(27, 24, 33, 0.91)";
    ctx.fillRect(px, py, width, 34);
    ctx.strokeStyle = "#84ca7a";
    ctx.strokeRect(px, py, width, 34);
    ctx.fillStyle = "#f3fff0";
    ctx.fillText(prompt, px + 14, py + 23);
    return;
  }
  const actions = [
    ["hide", "Göm", "#b7e7ff"],
    ["compromise", `Kompromissa: ${getActionPreview("compromise", item)?.label || "klart"}`, "#ffe1a6"],
    ["remove", "Bort", "#ffb6b6"],
  ];
  const w = 690;
  const h = 63;
  const x = (WIDTH - w) * 0.5;
  const y = HEIGHT - h - 12;
  ctx.fillStyle = "rgba(27, 24, 33, 0.94)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#f4d7eb";
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px Trebuchet MS";
  ctx.fillText(type.name, x + 13, y + 21);
  ctx.fillStyle = "#ccbfcf";
  ctx.font = "12px Trebuchet MS";
  ctx.fillText("Göm = mindre bråk · Bort = mer effekt och irritation", x + 180, y + 20);
  let actionX = x + 13;
  ctx.font = "bold 13px Trebuchet MS";
  for (const [action, label, color] of actions) {
    const key = action === "compromise" ? "relocate" : action;
    const text = `${controlLabel(key)} ${label}`;
    ctx.fillStyle = action === "compromise" && !getActionPreview("compromise", item) ? "#847b87" : color;
    ctx.fillText(text, actionX, y + 48);
    actionX += ctx.measureText(text).width + 24;
  }
  ctx.fillStyle = "#b7aabc";
  ctx.font = "11px Trebuchet MS";
  ctx.fillText(input.device === "gamepad" ? "B stäng" : "E dölj", x + w - 60, y + 48);
}

export function drawTutorialOverlay() {
  if (!world.tutorial || !world.tutorial.active || world.state !== "playing") return;

  const hasVisibleItem = world.items.some((item) => !item.hidden);
  const lines = world.interactionItemId !== null
    ? [
        input.device === "gamepad" && !world.gamepadInteractionOpen ? "Tryck A nära föremålet för att se valen." : "Välj ett av alternativen i rutan vid objektet.",
        "Göm är lugnast. Ta bort räddar mest plats men skapar irritation.",
        `${controlLabel("relocate")}: kompromissa genom att använda, förhandla eller flytta.`,
      ]
    : world.pendingPlacements.length > 0
      ? [
          "En ny placering är på väg.",
          "Följ blinkningen på spelplanen eller minimapen och planera ditt svar.",
        ]
      : hasVisibleItem
        ? [
            `Gå nära ett objekt med ${controlLabel("move")} för att interagera.`,
            "När du gjort ditt första val försvinner den här hjälpen.",
          ]
        : [
            world.currentMode === "story"
              ? "Håll ut kvällen utan 100% tjejifiering eller irritation. Dagens mål finns under Kontroller, rum och mål."
              : "Målet är att överleva tre dagar utan 100% tjejifiering eller irritation.",
            "Första placeringen kommer snart. Håll koll på blinkande signaler.",
          ];
  const x = 14;
  const y = 14;
  const w = 286;
  const h = 116;

  ctx.fillStyle = "rgba(18, 15, 25, 0.88)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(255, 222, 239, 0.7)";
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#ffd8e9";
  ctx.font = "bold 15px Trebuchet MS";
  ctx.fillText("Kom igång", x + 12, y + 22);
  ctx.fillStyle = "#f4f2f8";
  ctx.font = "12px Trebuchet MS";
  let textY = y + 43;
  for (const line of lines) {
    for (const wrapped of wrapText(line, w - 24)) {
      ctx.fillText(wrapped, x + 12, textY);
      textY += 15;
    }
  }
}

export function drawThreatBriefing() {
  const briefing = world.eventBreather;
  if (!briefing) return;
  const room = rooms[briefing.roomKey] || rooms.hall;
  const pulse = accessibilityState.reducedMotion ? 0.7 : 0.62 + Math.sin((briefing.duration - briefing.timeLeft) * 5) * 0.18;
  ctx.save();
  ctx.fillStyle = `rgba(178, 35, 70, ${pulse * 0.12})`;
  ctx.fillRect(room.x, room.y, room.w, room.h);
  ctx.strokeStyle = `rgba(255, 104, 137, ${pulse})`;
  ctx.lineWidth = 5;
  ctx.strokeRect(room.x + 3, room.y + 3, room.w - 6, room.h - 6);

  const x = 322;
  const y = 12;
  const w = 356;
  const h = 66;
  ctx.fillStyle = "rgba(27, 16, 26, 0.95)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#ff7399";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#ffb0c6";
  ctx.font = "bold 13px Trebuchet MS";
  ctx.fillText(`HOTAT RUM · ${room.name.toUpperCase()}`, x + 12, y + 20);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px Trebuchet MS";
  ctx.fillText(`${briefing.itemName} på väg in`, x + 12, y + 39);
  ctx.fillStyle = "#ffe0e8";
  ctx.font = "12px Trebuchet MS";
  ctx.fillText(`Ta position · hon rör sig om ${briefing.timeLeft.toFixed(1)} s`, x + 12, y + 56);
  ctx.restore();
}

export function drawComboStatus() {
  const combos = world.activeCombos || [];
  if (!combos.length && (!world.comboPulse || world.comboPulse.timer <= 0)) return;
  const x = 14;
  const y = HEIGHT - 132;
  const w = 260;
  const h = Math.min(104, 28 + combos.length * 18);
  ctx.fillStyle = "rgba(18, 15, 25, 0.84)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(255, 217, 166, 0.72)";
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#ffe4b3";
  ctx.font = "bold 13px Trebuchet MS";
  ctx.fillText("Aktiva kombinationer", x + 10, y + 18);
  ctx.fillStyle = "#fff8ec";
  ctx.font = "12px Trebuchet MS";
  combos.slice(0, 4).forEach((combo, index) => {
    ctx.fillText(`${combo.label} · ${combo.roomKey}`, x + 10, y + 38 + index * 17);
  });
  if (world.comboPulse?.timer > 0) {
    ctx.fillStyle = "#ffc6df";
    ctx.font = "bold 12px Trebuchet MS";
    ctx.fillText(`Ny kedja: ${world.comboPulse.text}`, x + 10, y + h - 8);
  }
}

export function drawToast() {
  if (!world.toast.text) return;
  const w = 520;
  const h = 44;
  const x = WIDTH * 0.5 - w * 0.5;
  const y = HEIGHT - 126;
  ctx.fillStyle = "rgba(10, 10, 10, 0.75)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px Trebuchet MS";
  for (const [index, line] of wrapText(world.toast.text, w - 24).slice(0, 2).entries()) {
    ctx.fillText(line, x + 12, y + 17 + index * 17);
  }
}

export function drawDifficultyOverlays() {
  const g = clamp(world.girlification / 100, 0, 1);
  const a = clamp(world.annoyance / 100, 0, 1);
  if (g > 0.02) {
    const alpha = 0.08 + g * 0.18;
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, `rgba(255, 190, 220, ${alpha})`);
    gradient.addColorStop(1, `rgba(255, 240, 185, ${alpha * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
  if (a > 0.35) {
    const alpha = (a - 0.35) * 0.42;
    ctx.fillStyle = `rgba(170, 22, 26, ${alpha})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
  if (world.moodSwing.active) {
    ctx.fillStyle = "rgba(190, 20, 20, 0.15)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

function drawMiniProgressBar(label, value, x, y, w, fg, bg, caption) {
  ctx.textAlign = "left";
  ctx.fillStyle = "#dde3ef";
  ctx.font = "11px Trebuchet MS";
  ctx.fillText(label, x, y - 4);
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, 8);
  ctx.fillStyle = fg;
  ctx.fillRect(x, y, w * clamp(value, 0, 1), 8);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.strokeRect(x, y, w, 8);
  if (caption) {
    ctx.fillStyle = "#f7eaf3";
    ctx.font = "10px Trebuchet MS";
    ctx.fillText(caption, x + w - ctx.measureText(caption).width, y - 4);
  }
}

export function drawMinimap() {
  ctx.textAlign = "left";
  const panelW = 224;
  const panelH = 154;
  const panelX = WIDTH - panelW - 14;
  const panelY = 14;
  const mapX = panelX + 12;
  const mapY = panelY + 12;
  const mapW = panelW - 24;
  const mapH = 88;
  const scale = Math.min(mapW / WIDTH, mapH / HEIGHT);
  const offsetX = mapX + (mapW - WIDTH * scale) * 0.5;
  const offsetY = mapY + (mapH - HEIGHT * scale) * 0.5;

  const mapPoint = (px, py) => ({
    x: offsetX + px * scale,
    y: offsetY + py * scale,
  });

  ctx.fillStyle = "rgba(14, 16, 24, 0.84)";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "rgba(255, 228, 239, 0.38)";
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  ctx.fillStyle = "#fff1f8";
  ctx.font = "bold 13px Trebuchet MS";
  ctx.fillText("Lägenhetskarta", panelX + 12, panelY + 14);

  for (const [roomKey, room] of Object.entries(rooms)) {
    const point = mapPoint(room.x, room.y);
    const state = world.roomStates[roomKey];
    ctx.fillStyle =
      state === "Girlified"
        ? "rgba(255, 154, 203, 0.72)"
        : state === "Contested"
          ? "rgba(255, 218, 127, 0.72)"
          : "rgba(208, 237, 214, 0.5)";
    ctx.fillRect(point.x, point.y, room.w * scale, room.h * scale);

    ctx.strokeStyle = `rgba(255,255,255,${0.14 + clamp(world.roomAlertTimers[roomKey] / ROOM_ALERT_DURATION, 0, 1) * 0.6})`;
    ctx.strokeRect(point.x, point.y, room.w * scale, room.h * scale);

    ctx.fillStyle = "#fffafc";
    ctx.font = "9px Trebuchet MS";
    ctx.fillText(room.name[0], point.x + 4, point.y + 10);
  }

  const playerPoint = mapPoint(world.player.x + world.player.w * 0.5, world.player.y + world.player.h * 0.78);
  const girlPoint = mapPoint(world.girlfriend.x + world.girlfriend.w * 0.5, world.girlfriend.y + world.girlfriend.h * 0.78);

  ctx.fillStyle = "#93d5ff";
  ctx.beginPath();
  ctx.arc(playerPoint.x, playerPoint.y, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  ctx.fillStyle = "#ff98c8";
  ctx.beginPath();
  ctx.arc(girlPoint.x, girlPoint.y, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  const placement = activePlacementTarget();
  if (placement) {
    const placementPoint = mapPoint(placement.x, placement.y);
    const pulse = accessibilityState.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(world.vfxClock * 5 + placement.pulseOffset);
    ctx.strokeStyle = `rgba(255, 247, 250, ${0.6 + pulse * 0.25})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(placementPoint.x, placementPoint.y, 4.5 + pulse * 2.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawMiniProgressBar(
    "Nästa drop",
    world.pendingPlacements.length > 0 ? 1 : 1 - world.spawnTimer / Math.max(0.1, world.spawnCycleDuration),
    panelX + 12,
    panelY + 112,
    panelW - 24,
    "#ff9cc9",
    "rgba(255,255,255,0.09)",
    world.pendingPlacements.length > 0 ? `Kö ${world.pendingPlacements.length}` : `${Math.ceil(world.spawnTimer)}s`
  );

  drawMiniProgressBar(
    world.activeEvent ? "Event live" : "Nästa event",
    world.activeEvent
      ? 1 - world.activeEvent.timeLeft / Math.max(0.1, world.activeEvent.duration)
      : 1 - world.eventTimer / Math.max(0.1, world.eventCycleDuration),
    panelX + 12,
    panelY + 136,
    panelW - 24,
    "#91d3ff",
    "rgba(255,255,255,0.09)",
    world.activeEvent ? `${Math.ceil(world.activeEvent.timeLeft)}s` : `${Math.ceil(world.eventTimer)}s`
  );
}
