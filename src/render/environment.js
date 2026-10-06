import { assets, colliders } from "../core/assets.js";
import { ctx, HEIGHT, WIDTH } from "../core/dom.js";
import { ROOM_ALERT_DURATION, furniture, rooms } from "../core/data.js";
import { world } from "../core/state.js";
import { clamp } from "../core/utils.js";
import { activePlacementTarget } from "../game/shared.js";
import { drawImageOrFallback } from "./primitives.js";

function getRoomAmbientStrength(roomKey) {
  return 0.38 + (world.roomTakeover?.[roomKey] || 0) * 0.62;
}

function withRoomClip(roomKey, drawFn) {
  const room = rooms[roomKey];
  if (!room) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(room.x, room.y, room.w, room.h);
  ctx.clip();
  drawFn(room);
  ctx.restore();
}

function drawAmbientMotes(room, options = {}) {
  const count = options.count || 6;
  const color = options.color || "255,255,255";
  const speed = options.speed || 1;
  const alpha = options.alpha || 0.08;
  const minRadius = options.minRadius || 1.8;
  const radiusSpan = options.radiusSpan || 3;
  const time = world.vfxClock * speed;

  for (let i = 0; i < count; i += 1) {
    const seed = i * 17.213 + room.x * 0.013 + room.y * 0.021;
    const px = room.x + 18 + ((Math.sin(seed + time * (0.9 + i * 0.02)) + 1) * 0.5) * (room.w - 36);
    const py = room.y + 18 + ((Math.cos(seed * 1.43 - time * (0.55 + i * 0.03)) + 1) * 0.5) * (room.h - 36);
    const pulse = 0.55 + 0.45 * Math.sin(seed * 2.1 + time * 2.2);
    const radius = minRadius + ((Math.sin(seed * 2.8 + time * 1.4) + 1) * 0.5) * radiusSpan;
    ctx.fillStyle = `rgba(${color}, ${alpha * pulse})`;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBedroomAmbient(room, intensity) {
  const sweep = room.x - 70 + ((Math.sin(world.vfxClock * 0.23) + 1) * 0.5) * (room.w + 140);
  const glow = ctx.createLinearGradient(room.x, room.y, room.x + room.w, room.y + room.h);
  glow.addColorStop(0, `rgba(255, 233, 247, ${0.08 * intensity})`);
  glow.addColorStop(1, "rgba(255, 233, 247, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(room.x, room.y, room.w, room.h);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.06 * intensity})`;
  ctx.fillRect(sweep, room.y, 54, room.h);
  drawAmbientMotes(room, {
    count: 5 + Math.round(intensity * 3),
    color: "255,235,246",
    alpha: 0.055 + intensity * 0.03,
    speed: 0.45,
    minRadius: 1.8,
    radiusSpan: 2.4,
  });
}

function drawLivingRoomAmbient(room, intensity) {
  const tvGlow = ctx.createRadialGradient(496, 304, 18, 496, 304, 118);
  tvGlow.addColorStop(0, `rgba(161, 214, 255, ${0.14 * intensity})`);
  tvGlow.addColorStop(0.5, `rgba(139, 191, 255, ${0.08 * intensity})`);
  tvGlow.addColorStop(1, "rgba(139, 191, 255, 0)");
  ctx.fillStyle = tvGlow;
  ctx.beginPath();
  ctx.arc(496, 304, 118, 0, Math.PI * 2);
  ctx.fill();

  const loungeGlow = ctx.createRadialGradient(560, 170, 12, 560, 170, 132);
  loungeGlow.addColorStop(0, `rgba(255, 220, 177, ${0.16 * intensity})`);
  loungeGlow.addColorStop(0.55, `rgba(255, 189, 145, ${0.08 * intensity})`);
  loungeGlow.addColorStop(1, "rgba(255, 189, 145, 0)");
  ctx.fillStyle = loungeGlow;
  ctx.beginPath();
  ctx.arc(560, 170, 132, 0, Math.PI * 2);
  ctx.fill();

  drawAmbientMotes(room, {
    count: 7 + Math.round(intensity * 3),
    color: "255,229,196",
    alpha: 0.05 + intensity * 0.035,
    speed: 0.62,
    minRadius: 2,
    radiusSpan: 2.8,
  });
}

function drawBathroomAmbient(room, intensity) {
  for (let i = 0; i < 6; i += 1) {
    const seed = i * 11.7;
    const travel = (world.vfxClock * (20 + i * 2.8) + seed * 7) % (room.h + 70);
    const px = room.x + 44 + i * 35 + Math.sin(world.vfxClock * 1.05 + seed) * 10;
    const py = room.y + room.h + 18 - travel;
    ctx.fillStyle = `rgba(240, 248, 255, ${0.05 + intensity * 0.05})`;
    ctx.beginPath();
    ctx.ellipse(px, py, 12 + i * 0.7, 22 + i * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawAmbientMotes(room, {
    count: 6 + Math.round(intensity * 3),
    color: "225,242,255",
    alpha: 0.045 + intensity * 0.03,
    speed: 0.58,
    minRadius: 1.6,
    radiusSpan: 2.6,
  });
}

function drawKitchenAmbient(room, intensity) {
  const ovenGlow = ctx.createRadialGradient(124, 402, 16, 124, 402, 88);
  ovenGlow.addColorStop(0, `rgba(255, 184, 119, ${0.16 * intensity})`);
  ovenGlow.addColorStop(0.6, `rgba(255, 141, 104, ${0.08 * intensity})`);
  ovenGlow.addColorStop(1, "rgba(255, 141, 104, 0)");
  ctx.fillStyle = ovenGlow;
  ctx.beginPath();
  ctx.arc(124, 402, 88, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 222, 196, ${0.09 * intensity})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i += 1) {
    const x = 92 + i * 18;
    const offset = Math.sin(world.vfxClock * 1.7 + i * 0.9) * 7;
    ctx.beginPath();
    ctx.moveTo(x, 410);
    ctx.quadraticCurveTo(x + offset, 390, x - offset * 0.7, 356);
    ctx.stroke();
  }

  drawAmbientMotes(room, {
    count: 5 + Math.round(intensity * 2),
    color: "255,230,200",
    alpha: 0.04 + intensity * 0.028,
    speed: 0.5,
    minRadius: 1.8,
    radiusSpan: 2.2,
  });
}

function drawHallAmbient(room, intensity) {
  const sweep = room.x - 80 + ((Math.sin(world.vfxClock * 0.36) + 1) * 0.5) * (room.w + 140);
  ctx.fillStyle = `rgba(255, 247, 224, ${0.07 * intensity})`;
  ctx.fillRect(sweep, room.y, 72, room.h);
  ctx.fillStyle = `rgba(255, 225, 187, ${0.035 * intensity})`;
  ctx.fillRect(sweep + 22, room.y, 22, room.h);
  drawAmbientMotes(room, {
    count: 6 + Math.round(intensity * 2),
    color: "255,237,214",
    alpha: 0.038 + intensity * 0.03,
    speed: 0.54,
    minRadius: 1.8,
    radiusSpan: 2.4,
  });
}

function drawRoomAmbientEffects() {
  withRoomClip("sovrum", (room) => drawBedroomAmbient(room, getRoomAmbientStrength("sovrum")));
  withRoomClip("vardagsrum", (room) => drawLivingRoomAmbient(room, getRoomAmbientStrength("vardagsrum")));
  withRoomClip("badrum", (room) => drawBathroomAmbient(room, getRoomAmbientStrength("badrum")));
  withRoomClip("kok", (room) => drawKitchenAmbient(room, getRoomAmbientStrength("kok")));
  withRoomClip("hall", (room) => drawHallAmbient(room, getRoomAmbientStrength("hall")));
}

function drawRoomStateOverlays() {
  const placement = activePlacementTarget();
  for (const [roomKey, room] of Object.entries(rooms)) {
    const state = world.roomStates[roomKey];
    const takeover = world.roomTakeover?.[roomKey] || 0;
    const alert = clamp(world.roomAlertTimers[roomKey] / ROOM_ALERT_DURATION, 0, 1);
    const isTargetRoom = placement && placement.roomKey === roomKey;

    if (takeover > 0.06) {
      const fillAlpha = 0.02 + takeover * 0.14;
      const gradient = ctx.createLinearGradient(room.x, room.y, room.x + room.w, room.y + room.h);
      gradient.addColorStop(0, `rgba(255, 156, 205, ${fillAlpha})`);
      gradient.addColorStop(1, `rgba(255, 223, 172, ${fillAlpha * 0.7})`);
      withRoomClip(roomKey, () => {
        ctx.fillStyle = gradient;
        ctx.fillRect(room.x, room.y, room.w, room.h);
      });
    }

    ctx.lineWidth = state === "Girlified" ? 2.5 : state === "Contested" ? 2 : 1.25;
    ctx.strokeStyle =
      state === "Girlified"
        ? "rgba(255, 132, 185, 0.72)"
        : state === "Contested"
          ? "rgba(255, 206, 112, 0.7)"
          : "rgba(255, 255, 255, 0.18)";
    ctx.strokeRect(room.x + 1.5, room.y + 1.5, room.w - 3, room.h - 3);

    if (alert > 0 || isTargetRoom) {
      const pulse = 0.55 + 0.45 * Math.sin(world.vfxClock * 7 + room.x * 0.02);
      ctx.strokeStyle = isTargetRoom
        ? `rgba(240, 250, 255, ${0.32 + alert * 0.5 + pulse * 0.18})`
        : `rgba(255, 235, 246, ${0.24 + alert * 0.42 + pulse * 0.12})`;
      ctx.lineWidth = 2.5 + pulse * 1.8;
      ctx.strokeRect(room.x + 4, room.y + 4, room.w - 8, room.h - 8);
    }
  }
}

const roomRugs = {
  sovrum: [165, 205, 105, 28],
  vardagsrum: [515, 221, 128, 48],
  badrum: [846, 210, 76, 27],
  kok: [275, 528, 126, 34],
  hall: [691, 542, 163, 31],
};

function drawRoomTakeoverDecor() {
  for (const [roomKey, room] of Object.entries(rooms)) {
    const takeover = world.roomTakeover?.[roomKey] || 0;
    if (takeover < 0.16) continue;
    const rugStrength = clamp((takeover - 0.16) / 0.64, 0, 1);
    const trimStrength = clamp((takeover - 0.42) / 0.58, 0, 1);
    const [cx, cy, rx, ry] = roomRugs[roomKey];
    withRoomClip(roomKey, () => {
      ctx.fillStyle = `rgba(244, 135, 184, ${0.28 * rugStrength})`;
      ctx.strokeStyle = `rgba(157, 73, 117, ${0.4 * rugStrength})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (trimStrength <= 0) return;
      ctx.fillStyle = `rgba(250, 211, 228, ${0.46 * trimStrength})`;
      ctx.fillRect(room.x + 6, room.y + 6, room.w - 12, 12);
      ctx.fillStyle = `rgba(181, 91, 139, ${0.54 * trimStrength})`;
      for (let x = room.x + 18; x < room.x + room.w - 12; x += 26) {
        ctx.beginPath();
        ctx.moveTo(x, room.y + 12);
        ctx.lineTo(x + 5, room.y + 17);
        ctx.lineTo(x + 10, room.y + 12);
        ctx.lineTo(x + 5, room.y + 7);
        ctx.closePath();
        ctx.fill();
      }
    });
  }
}

function drawFurnitureTakeoverAccents() {
  const amount = (roomKey) => clamp(((world.roomTakeover?.[roomKey] || 0) - 0.38) / 0.62, 0, 1);
  const bedroom = amount("sovrum");
  if (bedroom) {
    ctx.fillStyle = `rgba(238, 125, 177, ${0.54 * bedroom})`;
    ctx.fillRect(43, 142, 126, 21);
  }
  const living = amount("vardagsrum");
  if (living) {
    ctx.fillStyle = `rgba(241, 143, 189, ${0.58 * living})`;
    ctx.fillRect(574, 51, 45, 37);
  }
  const bathroom = amount("badrum");
  if (bathroom) {
    ctx.fillStyle = `rgba(235, 133, 181, ${0.72 * bathroom})`;
    ctx.fillRect(908, 96, 13, 19);
    ctx.fillRect(925, 91, 10, 24);
  }
  const kitchen = amount("kok");
  if (kitchen) {
    ctx.fillStyle = `rgba(239, 126, 176, ${0.7 * kitchen})`;
    ctx.fillRect(168, 398, 16, 31);
  }
  const hall = amount("hall");
  if (hall) {
    ctx.fillStyle = `rgba(239, 126, 176, ${0.66 * hall})`;
    ctx.fillRect(918, 382, 15, 29);
  }
}

function drawFurniture() {
  for (const piece of furniture) {
    if (piece.id === "bed") {
      drawImageOrFallback(assets.bed, piece.x, piece.y, piece.w, piece.h, "#d8c0c9");
    } else if (piece.id === "sofa") {
      drawImageOrFallback(assets.sofa, piece.x, piece.y, piece.w, piece.h, "#cfd8dc");
    } else if (piece.id === "bathtub") {
      drawImageOrFallback(assets.bathtub, piece.x, piece.y, piece.w, piece.h, "#d9efff");
    } else if (piece.id === "tv") {
      drawImageOrFallback(assets.tv, piece.x, piece.y, piece.w, piece.h, "#303743");
    } else if (piece.id === "table") {
      drawImageOrFallback(assets.table, piece.x, piece.y, piece.w, piece.h, "#caa67f");
    } else if (piece.id === "oven") {
      drawImageOrFallback(assets.oven, piece.x, piece.y, piece.w, piece.h, "#d9dce5");
    } else if (piece.id === "shoe_rack") {
      drawImageOrFallback(assets.shoe_rack, piece.x, piece.y, piece.w, piece.h, "#b48561");
    } else {
      ctx.fillStyle = "#caa67f";
      ctx.fillRect(piece.x, piece.y, piece.w, piece.h);
      ctx.strokeStyle = "#7f5d3f";
      ctx.strokeRect(piece.x, piece.y, piece.w, piece.h);
    }
  }
}

export function drawRoomBackground() {
  ctx.fillStyle = "#c8cedc";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const tile = 20;
  for (let y = 0; y < HEIGHT; y += tile) {
    for (let x = 0; x < WIDTH; x += tile) {
      const even = ((x / tile) + y / tile) % 2 === 0;
      ctx.fillStyle = even ? "rgba(232, 236, 247, 0.34)" : "rgba(195, 204, 224, 0.3)";
      ctx.fillRect(x, y, tile, tile);
    }
  }

  ctx.fillStyle = "rgba(232, 229, 232, 0.85)";
  ctx.fillRect(0, HEIGHT - 58, WIDTH, 58);

  ctx.fillStyle = "#a0a6b6";
  colliders.forEach((collider, idx) => {
    if (idx < 11) {
      ctx.fillRect(collider.x, collider.y, collider.w, collider.h);
    }
  });

  drawRoomAmbientEffects();
  drawRoomStateOverlays();
  drawRoomTakeoverDecor();
  drawFurniture();
  drawFurnitureTakeoverAccents();
}
