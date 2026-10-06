import { assets, itemAssets } from "../core/assets.js";
import { accessibilityState } from "../core/accessibility.js";
import { ctx, HEIGHT, WIDTH } from "../core/dom.js";
import { getGirlProfileById, rooms } from "../core/data.js";
import { world } from "../core/state.js";
import { wrapText } from "../core/utils.js";
import { getStorySceneById } from "../data/story/scenes.js?v=5";
import { controlLabel } from "../core/controlHints.js?v=5";
import { getCurrentCutscene } from "../systems/story.js?v=8";
import { drawRoomBackground } from "./environment.js?v=2";

const roomKeys = {
  Badrummet: "badrum",
  Köket: "kok",
  Hallen: "hall",
  Vardagsrummet: "vardagsrum",
};
const stickers = {
  skincare: "BARA TILLFÄLLIGT?",
  mug: "+1 MUGG",
  mirror_boss: "STOR GREJ!",
  basket: "PAKT PÅ GÅNG",
  snack_bowl: "GÄSTER!",
  shared_shelf_boss: "PLATS FÖR TVÅ?",
};

function drawContained(image, x, y, width, height) {
  if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return false;
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.drawImage(image, x + (width - w) / 2, y + (height - h) / 2, w, h);
  return true;
}

function drawStage(shot, elapsed) {
  drawRoomBackground();
  ctx.fillStyle = "rgba(255, 248, 251, 0.53)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const room = rooms[roomKeys[shot.room]];
  if (room) {
    ctx.strokeStyle = shot.accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(room.x + 8, room.y + 8, room.w - 16, room.h - 16);
  }

  ctx.save();
  ctx.shadowColor = "rgba(83, 48, 76, 0.23)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = "rgba(255, 250, 247, 0.94)";
  ctx.fillRect(132, 112, 736, 224);
  ctx.restore();
  ctx.strokeStyle = "#6f576f";
  ctx.lineWidth = 3;
  ctx.strokeRect(132, 112, 736, 224);
  ctx.fillStyle = shot.accent;
  ctx.fillRect(132, 112, 736, 12);

  const bob = accessibilityState.reducedMotion ? 0 : Math.sin(elapsed * 3) * 6;
  const girl = getGirlProfileById(world.selectedGirlId);
  const girlImage = assets[`${girl.spritePrefix}_front`] || assets.girl_front;
  ctx.save();
  ctx.globalAlpha = shot.speaker === "Du" ? 1 : 0.8;
  drawContained(assets.main_front, 210, 153, 108, 168);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = shot.speaker === "Hon" ? 1 : 0.8;
  drawContained(girlImage, 676, 153, 108, 168);
  ctx.restore();

  ctx.fillStyle = "rgba(209, 145, 176, 0.22)";
  ctx.beginPath();
  ctx.ellipse(500, 309, 93, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  const focusImage = shot.focus === "shared_shelf_boss"
    ? assets.shared_shelf_story
    : shot.focus === "skincare"
      ? assets.toiletry_story
      : itemAssets[shot.focus];
  if (!drawContained(focusImage, 409, 137 + bob, 182, 169)) {
    ctx.fillStyle = shot.accent;
    ctx.fillRect(435, 165 + bob, 130, 125);
  }

  ctx.save();
  ctx.translate(758, 136);
  ctx.rotate(-0.07);
  ctx.fillStyle = "#ffe273";
  ctx.fillRect(-12, -18, 184, 38);
  ctx.strokeStyle = "#805e34";
  ctx.lineWidth = 2;
  ctx.strokeRect(-12, -18, 184, 38);
  ctx.font = "bold 15px Trebuchet MS";
  ctx.fillStyle = "#583b38";
  ctx.textAlign = "center";
  ctx.fillText(stickers[shot.focus] || "NY GREJ!", 80, 6);
  ctx.restore();
  ctx.textAlign = "left";
}

export function drawCutscene() {
  const current = getCurrentCutscene();
  if (!current) return false;
  const { shot, index, total } = current;
  const elapsed = world.cutscene?.elapsed || 0;
  const scene = getStorySceneById(world.storySceneId);
  drawStage(shot, elapsed);

  ctx.fillStyle = "rgba(255, 253, 250, 0.94)";
  ctx.fillRect(20, 16, 960, 78);
  ctx.strokeStyle = "#785b77";
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 16, 960, 78);
  ctx.fillStyle = "#472b47";
  ctx.font = "bold 29px Trebuchet MS";
  ctx.fillText(scene?.title || shot.room, 40, 53);
  ctx.font = "17px Trebuchet MS";
  ctx.fillText(`Sally · Kväll ${world.storyDay} · ${shot.room}`, 42, 78);
  ctx.textAlign = "right";
  ctx.font = "bold 18px Trebuchet MS";
  ctx.fillText(`${index + 1}/${total}`, 951, 49);
  ctx.font = "14px Trebuchet MS";
  ctx.fillText(`${controlLabel("interact")}: nästa · ${controlLabel("back")}: hoppa över`, 951, 76);
  ctx.textAlign = "left";

  ctx.save();
  ctx.shadowColor = "rgba(83, 48, 76, 0.2)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = "#fffaf7";
  ctx.fillRect(78, 354, 844, 126);
  ctx.restore();
  ctx.strokeStyle = "#735874";
  ctx.lineWidth = 3;
  ctx.strokeRect(78, 354, 844, 126);
  ctx.fillStyle = shot.accent;
  ctx.fillRect(78, 354, 844, 8);
  ctx.fillStyle = "#56344f";
  ctx.font = "bold 20px Trebuchet MS";
  ctx.fillText(shot.speaker === "Hon" ? getGirlProfileById(world.selectedGirlId).name : shot.speaker, 103, 391);
  ctx.font = "24px Trebuchet MS";
  const visible = accessibilityState.reducedMotion ? shot.line : shot.line.slice(0, Math.floor(elapsed * 45));
  let y = 426;
  for (const line of wrapText(visible, 792)) {
    ctx.fillText(line, 103, y);
    y += 29;
  }
  return true;
}
