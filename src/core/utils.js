import { ctx } from "./dom.js";
import { colliders } from "./assets.js";
import { NAV_GRAPH, NAV_NODES, ROOM_ENTRY_NODES, rooms } from "./data.js";

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function isCollidingRect(rect) {
  for (const collider of colliders) {
    if (rectOverlap(rect, collider)) {
      return true;
    }
  }
  return false;
}

export function getEntityCollisionRect(entity, nextX, nextY) {
  const ox = entity.collisionOffsetX || 0;
  const oy = entity.collisionOffsetY || 0;
  const w = entity.collisionW || entity.w;
  const h = entity.collisionH || entity.h;
  return { x: nextX + ox, y: nextY + oy, w, h };
}

export function getEntityNavOffset(entity) {
  const ox = entity.collisionOffsetX || 0;
  const oy = entity.collisionOffsetY || 0;
  const w = entity.collisionW || entity.w;
  const h = entity.collisionH || entity.h;
  return {
    x: ox + w * 0.5,
    y: oy + h * 0.5,
  };
}

export function getEntityNavPoint(entity, nextX = entity.x, nextY = entity.y) {
  const offset = getEntityNavOffset(entity);
  return { x: nextX + offset.x, y: nextY + offset.y };
}

export function navPointToEntityPosition(entity, navX, navY) {
  const offset = getEntityNavOffset(entity);
  return {
    x: navX - offset.x,
    y: navY - offset.y,
  };
}

export function moveEntity(entity, dx, dy) {
  const maxDelta = Math.max(Math.abs(dx), Math.abs(dy));
  const steps = Math.max(1, Math.ceil(maxDelta));
  const sx = dx / steps;
  const sy = dy / steps;

  for (let i = 0; i < steps; i += 1) {
    const nextX = entity.x + sx;
    let movedX = false;
    let movedY = false;
    const testX = getEntityCollisionRect(entity, nextX, entity.y);
    if (!isCollidingRect(testX)) {
      entity.x = nextX;
      movedX = true;
    }

    const nextY = entity.y + sy;
    const testY = getEntityCollisionRect(entity, entity.x, nextY);
    if (!isCollidingRect(testY)) {
      entity.y = nextY;
      movedY = true;
    }

    if (!movedX && !movedY && sx !== 0 && sy !== 0) {
      const slideOffsets = [Math.sign(sy), -Math.sign(sy), Math.sign(sy) * 2, -Math.sign(sy) * 2];
      for (const offset of slideOffsets) {
        const slideY = entity.y + offset;
        const slideRect = getEntityCollisionRect(entity, entity.x, slideY);
        if (!isCollidingRect(slideRect)) {
          entity.y = slideY;
          movedY = true;
          break;
        }
      }

      if (!movedY) {
        const slideOffsetsX = [Math.sign(sx), -Math.sign(sx), Math.sign(sx) * 2, -Math.sign(sx) * 2];
        for (const offset of slideOffsetsX) {
          const slideX = entity.x + offset;
          const slideRect = getEntityCollisionRect(entity, slideX, entity.y);
          if (!isCollidingRect(slideRect)) {
            entity.x = slideX;
            break;
          }
        }
      }
    }
  }
}

export function wrapText(text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function roomFromPoint(x, y) {
  for (const [key, room] of Object.entries(rooms)) {
    if (x >= room.x && x <= room.x + room.w && y >= room.y && y <= room.y + room.h) {
      return key;
    }
  }
  return "hall";
}

export function segmentWalkable(from, to, entity) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distanceToTarget = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distanceToTarget / 12));

  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const x = from.x + dx * t;
    const y = from.y + dy * t;
    const rect = getEntityCollisionRect(entity, x, y);
    if (isCollidingRect(rect)) {
      return false;
    }
  }

  return true;
}

function getNodeEntityPosition(nodeKey, entity) {
  const node = NAV_NODES[nodeKey];
  if (!node) {
    return null;
  }
  return navPointToEntityPosition(entity, node.x, node.y);
}

function buildNodeRoute(startRoom, targetRoom, start, target, entity) {
  const startNodes = ROOM_ENTRY_NODES[startRoom] || [];
  const endNodes = new Set(ROOM_ENTRY_NODES[targetRoom] || []);

  if (!startNodes.length || !endNodes.size) {
    return [];
  }

  const queue = [];
  const visited = new Set();
  const parents = new Map();

  for (const nodeKey of startNodes) {
    const nodePos = getNodeEntityPosition(nodeKey, entity);
    if (!nodePos || !segmentWalkable(start, nodePos, entity)) {
      continue;
    }
    queue.push(nodeKey);
    visited.add(nodeKey);
  }

  while (queue.length) {
    const current = queue.shift();
    const currentPos = getNodeEntityPosition(current, entity);

    if (endNodes.has(current) && currentPos && segmentWalkable(currentPos, target, entity)) {
      const path = [];
      let cursor = current;
      while (cursor) {
        path.unshift(cursor);
        cursor = parents.get(cursor);
      }
      return path;
    }

    for (const next of NAV_GRAPH[current] || []) {
      if (visited.has(next)) {
        continue;
      }
      const nextPos = getNodeEntityPosition(next, entity);
      if (!currentPos || !nextPos || !segmentWalkable(currentPos, nextPos, entity)) {
        continue;
      }
      visited.add(next);
      parents.set(next, current);
      queue.push(next);
    }
  }

  return [];
}

export function buildWaypointPath(start, target, entity, targetRoom) {
  const startNav = getEntityNavPoint(entity, start.x, start.y);
  const targetNav = getEntityNavPoint(entity, target.x, target.y);
  const startRoom = roomFromPoint(startNav.x, startNav.y);
  const endRoom = targetRoom || roomFromPoint(targetNav.x, targetNav.y);

  if (segmentWalkable(start, target, entity)) {
    return [{ x: target.x, y: target.y }];
  }

  const nodePath = buildNodeRoute(startRoom, endRoom, start, target, entity);
  const rawWaypoints = nodePath.map((key) => getNodeEntityPosition(key, entity)).filter(Boolean);
  rawWaypoints.push({ x: target.x, y: target.y });

  if (!rawWaypoints.length) {
    return [];
  }

  const smoothWaypoints = [];
  let anchor = { x: start.x, y: start.y };
  let index = 0;

  while (index < rawWaypoints.length) {
    let furthest = index;
    for (let candidate = rawWaypoints.length - 1; candidate >= index; candidate -= 1) {
      if (segmentWalkable(anchor, rawWaypoints[candidate], entity)) {
        furthest = candidate;
        break;
      }
    }
    smoothWaypoints.push(rawWaypoints[furthest]);
    anchor = rawWaypoints[furthest];
    index = furthest + 1;
  }

  return smoothWaypoints;
}
