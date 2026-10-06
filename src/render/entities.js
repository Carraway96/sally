import { assets, itemAssets } from "../core/assets.js";
import { ctx, WIDTH } from "../core/dom.js";
import { ITEM_TYPES, rooms } from "../core/data.js";
import { world } from "../core/state.js";
import { clamp } from "../core/utils.js";
import { activePlacementTarget, getSelectedGirlProfile } from "../game/shared.js";
import { drawWalkingCharacter } from "./character.js";
import { accessibilityState } from "../core/accessibility.js";

function drawItemSprite(item, type) {
  const img = itemAssets[type.id];
  if (!img || !img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
    return false;
  }

  let maxDim = Math.max(32, type.size * 2.2);
  if (type.tags?.includes("boss")) {
    maxDim = 84;
  } else if (type.id === "fairy_lights") {
    maxDim = 68;
  }

  const scale = maxDim / Math.max(img.naturalWidth, img.naturalHeight);
  const drawW = Math.max(18, img.naturalWidth * scale);
  const drawH = Math.max(18, img.naturalHeight * scale);
  const groundY = item.y + Math.min(8, type.size * 0.24);
  const drawX = item.x - drawW * 0.5;
  const drawY = groundY - drawH;

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  return true;
}

export function drawItems() {
  for (const item of world.items) {
    if (item.hidden) continue;
    const type = ITEM_TYPES[item.typeId] || ITEM_TYPES.candle;
    if (!drawItemSprite(item, type)) {
      ctx.beginPath();
      if (type.id === "art") {
        ctx.fillStyle = item.color;
        ctx.fillRect(item.x - 10, item.y - 10, 20, 16);
        ctx.strokeStyle = "#555";
        ctx.strokeRect(item.x - 10, item.y - 10, 20, 16);
      } else if (type.tags?.includes("boss")) {
        ctx.fillStyle = "#e8f6ff";
        ctx.fillRect(item.x - 12, item.y - 22, 24, 44);
        ctx.strokeStyle = "#80a4bf";
        ctx.strokeRect(item.x - 12, item.y - 22, 24, 44);
      } else {
        ctx.arc(item.x, item.y, item.size * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(45,45,55,0.65)";
        ctx.stroke();
      }
    }

    if (item.relocated) {
      ctx.fillStyle = "#2f5f8c";
      ctx.font = "bold 10px Trebuchet MS";
      ctx.fillText("R", item.x - 4, item.y + 3);
    }
  }
}

export function drawPlacementTelegraphs() {
  const active = world.pendingPlacements[0];
  if (!active) return;
  const pulse = accessibilityState.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(world.vfxClock * 4.6 + active.pulseOffset);
  ctx.strokeStyle = `rgba(255, 242, 247, ${0.7 + pulse * 0.25})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(active.x, active.y, 23 + pulse * 5, 0, Math.PI * 2);
  ctx.stroke();
  const type = ITEM_TYPES[active.typeId] || ITEM_TYPES.candle;
  const label = `${rooms[active.roomKey].name} · ${type.name}`;
  ctx.font = "bold 12px Trebuchet MS";
  const labelW = Math.max(125, ctx.measureText(label).width + 18);
  const labelX = clamp(active.x - labelW * 0.5, 8, WIDTH - labelW - 8);
  const labelY = Math.max(10, active.y - 54);
  ctx.fillStyle = "rgba(24, 19, 31, 0.84)";
  ctx.fillRect(labelX, labelY, labelW, 24);
  ctx.strokeStyle = "rgba(255, 225, 238, 0.75)";
  ctx.strokeRect(labelX, labelY, labelW, 24);
  ctx.fillStyle = "#fff3fb";
  ctx.fillText(label, labelX + 9, labelY + 16);
}

function drawCharmAura() {
  const progress = world.charmFx.duration > 0 ? world.charmFx.timer / world.charmFx.duration : 0;
  const cx = world.player.x + world.player.w * 0.5;
  const cy = world.player.y + world.player.h * 0.68;
  const ready = world.charmCooldown <= 0;

  if (ready) {
    const pulse = 0.55 + 0.45 * Math.sin(world.vfxClock * 3.4);
    const radius = 26 + pulse * 8;
    const gradient = ctx.createRadialGradient(cx, cy, 6, cx, cy, radius);
    gradient.addColorStop(0, `rgba(185, 226, 255, ${0.16 + pulse * 0.05})`);
    gradient.addColorStop(0.58, `rgba(144, 198, 255, ${0.09 + pulse * 0.04})`);
    gradient.addColorStop(1, "rgba(144, 198, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(222, 243, 255, ${0.28 + pulse * 0.12})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 20 + pulse * 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (progress > 0) {
    const ringProgress = 1 - progress;
    const radius = 22 + ringProgress * 84;
    const alpha = progress * 0.45;
    const gradient = ctx.createRadialGradient(cx, cy, Math.max(8, radius * 0.2), cx, cy, radius);
    gradient.addColorStop(0, `rgba(255, 195, 226, ${alpha * 0.95})`);
    gradient.addColorStop(0.55, `rgba(255, 142, 195, ${alpha * 0.42})`);
    gradient.addColorStop(1, "rgba(255, 142, 195, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 225, 240, ${alpha * 1.3})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.72, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (!world.charmFx.particles.length) return;

  for (const particle of world.charmFx.particles) {
    const lifeRatio = particle.maxLife > 0 ? particle.life / particle.maxLife : 0;
    ctx.fillStyle = `rgba(255, 210, 235, ${lifeRatio * 0.8})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, Math.max(1.5, particle.size * lifeRatio), 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPlayer() {
  drawCharmAura();
  const spriteKey = `main_${world.player.dir}`;
  const img = assets[spriteKey] || assets.main_front;
  if (img && img.complete && img.naturalWidth > 0) {
    drawWalkingCharacter(world.player, img, null, "#5a8cf6");
    return;
  }

  const cx = world.player.x + world.player.w / 2;
  const cy = world.player.y + world.player.h / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fillStyle = world.player.color;
  ctx.fill();
  ctx.strokeStyle = "#23436f";
  ctx.stroke();
}

function drawCharmImpactBackdrop() {
  const progress = world.charmImpact.duration > 0 ? world.charmImpact.timer / world.charmImpact.duration : 0;
  if (progress <= 0) return;

  const cx = world.girlfriend.x + world.girlfriend.w * 0.5;
  const cy = world.girlfriend.y + world.girlfriend.h * 0.36;
  const radius = 30 + (1 - progress) * 24;
  const alpha = progress * 0.34;
  const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
  gradient.addColorStop(0, `rgba(255, 196, 220, ${alpha})`);
  gradient.addColorStop(0.55, `rgba(255, 155, 191, ${alpha * 0.55})`);
  gradient.addColorStop(1, "rgba(255, 155, 191, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawCharmImpactForeground() {
  const progress = world.charmImpact.duration > 0 ? world.charmImpact.timer / world.charmImpact.duration : 0;
  if (progress <= 0 && !world.charmImpact.sparks.length) return;

  const cx = world.girlfriend.x + world.girlfriend.w * 0.5;
  const cy = world.girlfriend.y + 24;

  if (progress > 0) {
    ctx.fillStyle = `rgba(255, 157, 194, ${progress * 0.9})`;
    ctx.font = "bold 22px Trebuchet MS";
    ctx.fillText("♥", cx + 16, cy - 4 - (1 - progress) * 14);
    ctx.fillText("♥", cx - 26, cy + 6 - (1 - progress) * 11);
  }

  for (const spark of world.charmImpact.sparks) {
    const lifeRatio = spark.maxLife > 0 ? spark.life / spark.maxLife : 0;
    ctx.fillStyle = `rgba(255, 206, 224, ${lifeRatio * 0.85})`;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, Math.max(1.2, spark.size * lifeRatio), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGirlfriendReaction() {
  if (!world.girlfriendReaction.text || world.girlfriendReaction.timer <= 0) return;

  const progress =
    world.girlfriendReaction.duration > 0 ? world.girlfriendReaction.timer / world.girlfriendReaction.duration : 0;
  const bob = (1 - progress) * 12 + Math.sin(world.vfxClock * 8) * 1.4;
  const x = world.girlfriend.x + world.girlfriend.w * 0.5;
  const y = world.girlfriend.y - 12 - bob;

  ctx.save();
  ctx.textAlign = "center";
  ctx.globalAlpha = progress;
  ctx.font = "bold 18px Trebuchet MS";
  const textW = ctx.measureText(world.girlfriendReaction.text).width;
  const bubbleW = textW + 20;
  ctx.fillStyle = "rgba(23, 19, 29, 0.82)";
  ctx.fillRect(x - bubbleW * 0.5, y - 18, bubbleW, 24);
  ctx.strokeStyle = "rgba(255, 228, 239, 0.72)";
  ctx.strokeRect(x - bubbleW * 0.5, y - 18, bubbleW, 24);
  ctx.fillStyle = world.girlfriendReaction.color;
  ctx.fillText(world.girlfriendReaction.text, x, y - 1);
  ctx.restore();
}

export function drawGirlfriend() {
  const profile = getSelectedGirlProfile();
  const spriteKey = `${profile.spritePrefix}_${world.girlfriend.dir}`;
  const fallbackKey = `${profile.spritePrefix}_front`;
  const img = assets[spriteKey] || assets[fallbackKey] || assets.girl_front;
  drawCharmImpactBackdrop();
  drawWalkingCharacter(world.girlfriend, img, assets.sally_walk, "#ff9ec2");
  drawCharmImpactForeground();
  drawGirlfriendReaction();
}
