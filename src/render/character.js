import { ctx } from "../core/dom.js";
import { accessibilityState } from "../core/accessibility.js";
import { getWalkingPose } from "../systems/walking.js";
import { drawImageContainOrFallback } from "./primitives.js";

const directionRows = { front: 0, back: 1, left: 2, right: 3 };

export function drawWalkingCharacter(entity, idleImage, walkSheet, fallbackColor) {
  const pose = getWalkingPose(entity, accessibilityState.reducedMotion);
  const footX = entity.x + entity.w / 2;
  const footY = entity.y + entity.h;
  // The shadow stays on the ground while the torso rises during a step.
  ctx.save();
  ctx.fillStyle = "rgba(40, 36, 44, 0.17)";
  ctx.beginPath();
  ctx.ellipse(footX, footY - 2, entity.w * 0.22, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(footX, footY + pose.bob);
  ctx.rotate(pose.sway);
  if (pose.frame >= 0 && walkSheet?.complete && walkSheet.naturalWidth > 0) {
    const frameW = walkSheet.naturalWidth / 4;
    const frameH = walkSheet.naturalHeight / 4;
    const scale = entity.h / frameH;
    const width = frameW * scale;
    const height = frameH * scale;
    ctx.drawImage(walkSheet, pose.frame * frameW, directionRows[entity.dir] * frameH,
      frameW, frameH, -width / 2, -height, width, height);
  } else {
    drawImageContainOrFallback(idleImage, -entity.w / 2, -entity.h, entity.w, entity.h, fallbackColor, "bottom");
  }
  ctx.restore();
}
