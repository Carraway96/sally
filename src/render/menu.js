import { assets } from "../core/assets.js";
import { audioState } from "../core/audio.js?v=3";
import { ctx, HEIGHT, WIDTH } from "../core/dom.js";
import { STATE, getGirlProfileById } from "../core/data.js";
import { world } from "../core/state.js";
import { wrapText } from "../core/utils.js";
import { getCurrentCutscene, getStoryScreenContent, isStoryState } from "../systems/story.js?v=8";
import { drawGameplay } from "./gameplay.js?v=10";
import { drawPlanningCards, getPlanningCardButtons } from "./planning.js";
import { drawImageContainOrFallback } from "./primitives.js";
import { getEndingProfile } from "../systems/replay.js";
import { accessibilityState } from "../core/accessibility.js";
import { getProfile } from "../core/profile.js";
import { drawCutscene } from "./cutscene.js?v=11";

function drawStartBackground() {
  if (assets.start.complete && assets.start.naturalWidth > 0) {
    const scale = Math.max(WIDTH / assets.start.naturalWidth, HEIGHT / assets.start.naturalHeight);
    const w = assets.start.naturalWidth * scale;
    const h = assets.start.naturalHeight * scale;
    const x = (WIDTH - w) * 0.5;
    const y = (HEIGHT - h) * 0.5;
    ctx.drawImage(assets.start, x, y, w, h);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, "#ffb8d8");
    gradient.addColorStop(1, "#b2d6ff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

function drawProfileSummary() {
  const profile = getProfile();
  ctx.fillStyle = "rgba(18, 14, 24, 0.72)";
  ctx.fillRect(26, 24, 250, 108);
  ctx.strokeStyle = "rgba(255, 221, 237, 0.5)";
  ctx.strokeRect(26, 24, 250, 108);
  ctx.fillStyle = "#ffe2ef";
  ctx.font = "bold 15px Trebuchet MS";
  ctx.fillText("Din lägenhetsprofil", 40, 48);
  ctx.fillStyle = "#fff";
  ctx.font = "13px Trebuchet MS";
  ctx.fillText(`Rundor: ${profile.runs}  |  Vinster: ${profile.wins}`, 40, 70);
  ctx.fillText(`Bästa bevarade nivå: ${profile.bestPreserved}%`, 40, 91);
  ctx.fillText(profile.wins >= 3 ? "Alla körutmaningar tillgängliga." : `Nästa utmaning låses upp vid ${profile.wins >= 1 ? 3 : 1} vinster.`, 40, 110);
}

export function getMenuButtons() {
  const centerX = WIDTH * 0.5;
  const bw = 365;
  const bh = 58;
  const startY = 265;
  const gap = 14;

  if (world.state === STATE.MENU) {
    return [
      { id: "new", label: "Spela Sally", x: centerX - bw / 2, y: startY, w: bw, h: bh },
      { id: "story", label: "Om Sally", x: centerX - bw / 2, y: startY + (bh + gap), w: bw, h: bh },
      { id: "continue", label: "Fortsätt", x: centerX - bw / 2, y: startY + 2 * (bh + gap), w: bw, h: bh, disabled: !world.resumeState },
      { id: "settings", label: "Inställningar", x: centerX - bw / 2, y: startY + 3 * (bh + gap), w: bw, h: bh },
    ];
  }
  if (world.state === STATE.DIFFICULTY_SELECT) {
    return [
      { id: "start_sally", label: "Sally", x: centerX - 155, y: 434, w: 310, h: bh },
      { id: "back_menu", label: "Tillbaka", x: centerX - 155, y: 578, w: 310, h: 42 },
    ];
  }
  if (world.state === STATE.STORY_MENU) {
    return [
      { id: "story_start_sally", label: "Sally", x: centerX - bw / 2, y: 466, w: bw, h: 48 },
      { id: "back_menu", label: "Tillbaka", x: centerX - bw / 2, y: 582, w: bw, h: 38 },
    ];
  }
  if (world.state === STATE.STORY_SCENE) {
    const current = getCurrentCutscene();
    return [
      { id: "story_next", label: current && current.index < current.total - 1 ? "Nästa bild" : "Till planering", x: centerX - bw / 2, y: 500, w: bw, h: bh },
      { id: "story_skip", label: "Hoppa över sekvensen", x: centerX - bw / 2, y: 572, w: bw, h: 42 },
    ];
  }
  if (world.state === STATE.PLANNING) {
    return [
      ...getPlanningCardButtons(),
      { id: "planning_confirm", label: "Starta kvällen", x: centerX - bw / 2, y: 500, w: bw, h: bh, disabled: !world.selectedPlanCard },
      { id: "menu", label: "Till meny", x: centerX - bw / 2, y: 572, w: bw, h: 42 },
    ];
  }
  if (world.state === STATE.CHAPTER_SUMMARY) {
    return [
      { id: "story_restart", label: "Spela Sally igen", x: centerX - bw / 2, y: 500, w: bw, h: bh },
      { id: "menu", label: "Till meny", x: centerX - bw / 2, y: 572, w: bw, h: 42 },
    ];
  }
  if (world.state === STATE.PAUSED) {
    return [
      { id: "resume", label: "Fortsätt", x: centerX - bw / 2, y: startY, w: bw, h: bh },
      { id: "restart", label: "Starta om", x: centerX - bw / 2, y: startY + (bh + gap), w: bw, h: bh },
      { id: "settings", label: "Inställningar", x: centerX - bw / 2, y: startY + 2 * (bh + gap), w: bw, h: bh },
      { id: "menu", label: "Huvudmeny", x: centerX - bw / 2, y: startY + 3 * (bh + gap), w: bw, h: bh },
    ];
  }
  if (world.state === STATE.SETTINGS) {
    const settingsW = 365;
    const settingsH = 46;
    const settingsGap = 8;
    const settingsY = 150;
    return [
      { id: "music", label: audioState.musicEnabled ? "Musik: På" : "Musik: Av", x: centerX - settingsW / 2, y: settingsY, w: settingsW, h: settingsH },
      { id: "sfx", label: audioState.sfxEnabled ? "Ljudeffekter: På" : "Ljudeffekter: Av", x: centerX - settingsW / 2, y: settingsY + settingsH + settingsGap, w: settingsW, h: settingsH },
      { id: "voice", label: audioState.voiceEnabled ? "Röster: På" : "Röster: Av", x: centerX - settingsW / 2, y: settingsY + 2 * (settingsH + settingsGap), w: settingsW, h: settingsH },
      { id: "volume", label: `Volym: ${Math.round(audioState.masterVolume * 100)}%`, x: centerX - settingsW / 2, y: settingsY + 3 * (settingsH + settingsGap), w: settingsW, h: settingsH },
      { id: "high_contrast", label: `Hög kontrast: ${accessibilityState.highContrast ? "På" : "Av"}`, x: centerX - settingsW / 2, y: settingsY + 4 * (settingsH + settingsGap), w: settingsW, h: settingsH },
      { id: "colorblind", label: `Färgblindsläge: ${accessibilityState.colorblind ? "På" : "Av"}`, x: centerX - settingsW / 2, y: settingsY + 5 * (settingsH + settingsGap), w: settingsW, h: settingsH },
      { id: "reduced_motion", label: `Minskade effekter: ${accessibilityState.reducedMotion ? "På" : "Av"}`, x: centerX - settingsW / 2, y: settingsY + 6 * (settingsH + settingsGap), w: settingsW, h: settingsH },
      { id: "back", label: "Tillbaka", x: centerX - settingsW / 2, y: settingsY + 7 * (settingsH + settingsGap), w: settingsW, h: settingsH },
    ];
  }
  if (world.state === STATE.GAME_OVER) {
    return [
      { id: "restart", label: "Spela igen", x: centerX - 150, y: HEIGHT - 165, w: 300, h: 58 },
      { id: "menu", label: "Till meny", x: centerX - 150, y: HEIGHT - 96, w: 300, h: 52 },
    ];
  }
  return [];
}

function drawMenuButton(btn, disabled = false) {
  const hovering = world.menuHover === btn.id;
  ctx.fillStyle = disabled ? "rgba(180,180,180,0.65)" : hovering ? "rgba(255, 148, 201, 0.94)" : "rgba(241, 108, 177, 0.86)";
  ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 2;
  ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
  ctx.fillStyle = disabled ? "rgba(80,80,80,0.85)" : "#fff";
  ctx.font = `bold ${btn.h < 50 ? 22 : 28}px Trebuchet MS`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawDifficultySelectPanel() {
  const hoveredId = "sally";
  const preview = getGirlProfileById(hoveredId);
  const panelX = 110;
  const panelY = 92;
  const panelW = 780;
  const panelH = 332;
  const avatarSize = 132;
  const avatarX = panelX + 52;
  const avatarY = panelY + 128;
  const textX = panelX + 248;
  const textW = 518;

  ctx.fillStyle = "rgba(8, 7, 12, 0.56)";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "rgba(255, 218, 234, 0.9)";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 48px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("Sally", WIDTH / 2, panelY + 68);
  ctx.font = "22px Trebuchet MS";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText("En grön oas, tre kvällar och en hel del chili.", WIDTH / 2, panelY + 106);

  drawImageContainOrFallback(assets[preview.avatarAssetKey], avatarX, avatarY, avatarSize, avatarSize, "#ff9ec2", "bottom");

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffe3f0";
  ctx.font = "bold 32px Trebuchet MS";
  ctx.fillText(`${preview.name}  |  ${preview.difficultyLabel}`, textX, panelY + 164);

  ctx.fillStyle = "#ffffff";
  ctx.font = "20px Trebuchet MS";
  ctx.fillText(preview.tagline, textX, panelY + 198);

  let textY = panelY + 228;
  ctx.font = "17px Trebuchet MS";
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  const summaryLines = preview.menuSummaryLines || wrapText(preview.menuSummary, textW);
  for (const line of summaryLines) {
    ctx.fillText(line, textX, textY);
    textY += 19;
  }

  textY += 10;
  for (const fact of preview.menuFacts || []) {
    const factLines = wrapText(`- ${fact}`, textW);
    for (const line of factLines) {
      ctx.fillText(line, textX, textY);
      textY += 18;
    }
    textY += 4;
  }
}

function drawStoryStatePanel() {
  const content = getStoryScreenContent();
  const panelX = 110;
  const panelY = 88;
  const panelW = 780;
  const panelH = 368;
  const bodyX = panelX + 40;
  const bodyY = panelY + 144;
  const bodyW = panelW - 80;

  ctx.fillStyle = "rgba(8, 7, 12, 0.62)";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "rgba(255, 218, 234, 0.9)";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  ctx.fillStyle = "#ffdceb";
  ctx.font = "bold 18px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(content.eyebrow, WIDTH / 2, panelY + 42);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px Trebuchet MS";
  ctx.fillText(content.title, WIDTH / 2, panelY + 86);

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.font = "19px Trebuchet MS";
  let textY = bodyY;
  for (const line of wrapText(content.body, bodyW)) {
    ctx.fillText(line, bodyX, textY);
    textY += 24;
  }

  if (world.state !== STATE.PLANNING) {
    textY += 18;
    ctx.fillStyle = "#ffe8f4";
    ctx.font = "17px Trebuchet MS";
    for (const bullet of content.bullets || []) {
      const lines = wrapText(`- ${bullet}`, bodyW);
      for (const line of lines) {
        ctx.fillText(line, bodyX, textY);
        textY += 21;
      }
      textY += 4;
    }
  }

  if (world.state === STATE.PLANNING) {
    drawPlanningCards();
  }
}

export function drawMenu() {
  if (world.state === STATE.STORY_SCENE && drawCutscene()) {
    for (const btn of getMenuButtons()) drawMenuButton(btn, !!btn.disabled);
    return;
  }
  drawStartBackground();
  if (world.state === STATE.MENU) {
    drawProfileSummary();
  }
  if (world.state === STATE.PAUSED) {
    drawGameplay();
    ctx.fillStyle = "rgba(12,10,14,0.44)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  } else if (world.state === STATE.SETTINGS || world.state === STATE.DIFFICULTY_SELECT || isStoryState(world.state)) {
    ctx.fillStyle = "rgba(12,10,14,0.35)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  const buttons = getMenuButtons();
  if (world.state === STATE.MENU) {
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  if (world.state === STATE.DIFFICULTY_SELECT) {
    drawDifficultySelectPanel();
  }

  if (isStoryState(world.state)) {
    drawStoryStatePanel();
  }

  if (world.state === STATE.SETTINGS) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(180, 54, 640, 560);
    ctx.strokeStyle = "#ffcee5";
    ctx.strokeRect(180, 54, 640, 560);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 58px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("Inställningar", WIDTH / 2, 106);
    ctx.font = "22px Trebuchet MS";
    ctx.fillText("Tips: Hög irritation ger snabbare spawns och lägre fart.", WIDTH / 2, 128);
    ctx.textAlign = "left";
  }

  for (const btn of buttons) {
    if (btn.skipDefaultDraw) continue;
    drawMenuButton(btn, !!btn.disabled);
  }
}

export function drawEndScreen() {
  const img =
    world.overReason === "irritation"
      ? assets.endingIrritation
      : world.overReason === "girlification"
        ? assets.endingGirlification
        : assets.start;

  if (img && img.complete && img.naturalWidth > 0) {
    const scale = Math.max(WIDTH / img.naturalWidth, HEIGHT / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const x = (WIDTH - w) * 0.5;
    const y = (HEIGHT - h) * 0.5;
    ctx.drawImage(img, x, y, w, h);
  } else {
    ctx.fillStyle = "#1e1f28";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  ctx.fillStyle = "rgba(9, 8, 12, 0.28)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  if (world.overReason === "irritation") {
    ctx.font = "bold 42px Trebuchet MS";
    ctx.fillText("Silent Treatment", WIDTH / 2, 84);
    ctx.font = "24px Trebuchet MS";
    ctx.fillText("100% irritation. Inga ord. På något sätt värre.", WIDTH / 2, 118);
  } else if (world.overReason === "girlification") {
    ctx.font = "bold 38px Trebuchet MS";
    ctx.fillText("Lägenheten gled dig ur händerna", WIDTH / 2, 84);
    ctx.font = "24px Trebuchet MS";
    ctx.fillText("100% tjejifiering. Du bor nu i hennes momentum.", WIDTH / 2, 118);
  } else {
    ctx.font = "bold 40px Trebuchet MS";
    ctx.fillText("Du överlevde", WIDTH / 2, 84);
    ctx.font = "24px Trebuchet MS";
    const preserved = Math.max(0, Math.round(100 - world.girlification));
    ctx.fillText(`Bachelor-andel bevarad: ${preserved}%`, WIDTH / 2, 118);
    const ending = getEndingProfile(world.endingId);
    ctx.font = "bold 26px Trebuchet MS";
    ctx.fillStyle = "#ffd7e9";
    ctx.fillText(ending.title, WIDTH / 2, 154);
    ctx.font = "16px Trebuchet MS";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(ending.description, WIDTH / 2, 178);
  }

  const statsX = 28;
  const statsY = HEIGHT - 250;
  const statsW = 300;
  const statsH = 190;
  ctx.fillStyle = "rgba(20, 15, 24, 0.8)";
  ctx.fillRect(statsX, statsY, statsW, statsH);
  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.strokeRect(statsX, statsY, statsW, statsH);

  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px Trebuchet MS";
  ctx.fillText("Statistik", statsX + 16, statsY + 26);
  ctx.font = "15px Trebuchet MS";
  ctx.fillText(`Borttaget: ${world.stats.removed}`, statsX + 16, statsY + 54);
  ctx.fillText(`Gömt: ${world.stats.hidden}`, statsX + 16, statsY + 78);
  ctx.fillText(`Flyttat: ${world.stats.relocated}`, statsX + 16, statsY + 102);
  ctx.fillText(`Rum förlorade: ${world.stats.roomsLost}`, statsX + 16, statsY + 126);
  ctx.fillText(`Stoppade placeringar: ${world.stats.intercepted}`, statsX + 16, statsY + 150);
  ctx.fillText(`Stabiliseringar: ${world.stats.stabilizedRooms} | Prestationer: ${world.achievements.length}`, statsX + 16, statsY + 174);
  ctx.fillText(`Pakter: ${world.stats.deals || 0}`, statsX + 190, statsY + 54);

  const graphX = WIDTH - 300;
  const graphY = statsY;
  const graphW = 272;
  const graphH = 190;
  ctx.fillStyle = "rgba(20, 15, 24, 0.8)";
  ctx.fillRect(graphX, graphY, graphW, graphH);
  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.strokeRect(graphX, graphY, graphW, graphH);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px Trebuchet MS";
  ctx.fillText("Slutprofil", graphX + 16, graphY + 26);
  const resultBars = [
    ["Tjejifiering", world.girlification, "#ff78ad"],
    ["Irritation", world.annoyance, "#ff9a78"],
    ["Kombinationer", Math.min(100, (world.stats.combosTriggered || 0) * 20), "#ffd27d"],
    ["Rumskontroll", Math.min(100, world.stats.stabilizedRooms * 20), "#9bd7ff"],
  ];
  resultBars.forEach(([label, value, color], index) => {
    const by = graphY + 50 + index * 30;
    ctx.font = "13px Trebuchet MS";
    ctx.fillStyle = "#fff";
    ctx.fillText(label, graphX + 16, by);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(graphX + 108, by - 12, 132, 10);
    ctx.fillStyle = color;
    ctx.fillRect(graphX + 108, by - 12, 132 * Math.min(1, value / 100), 10);
    ctx.fillStyle = "#fff";
    ctx.fillText(`${Math.round(value)}%`, graphX + 244, by);
  });

  for (const button of getMenuButtons()) {
    drawMenuButton(button, false);
  }
  ctx.textAlign = "left";
}
