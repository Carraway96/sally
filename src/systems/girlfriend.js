import { safeSpawnPoint, spawnItemAt } from "./spawning.js?v=4";
import { setToast, showGirlfriendReaction } from "./feedback.js";
import { buildWaypointPath, distance, moveEntity, rand } from "../core/utils.js";
import { world } from "../core/state.js";
import { activePlacementTarget, getSelectedGirlProfile } from "../game/shared.js";
import { getPlacementMovementMultiplier } from "./planning.js";
import { updateAiPressure } from "./ai.js";

export function setGirlfriendDestination(x, y, roomKey) {
  const targetChanged =
    Math.hypot(world.girlfriend.target.x - x, world.girlfriend.target.y - y) > 8 ||
    world.girlfriend.targetRoom !== roomKey;

  world.girlfriend.target.x = x;
  world.girlfriend.target.y = y;
  world.girlfriend.targetRoom = roomKey;

  if (!targetChanged) {
    return;
  }

  world.girlfriend.path = buildWaypointPath(
    { x: world.girlfriend.x, y: world.girlfriend.y },
    { x, y },
    world.girlfriend,
    roomKey
  );
  world.girlfriend.pathIndex = 0;
  world.girlfriend.repathAttempts = 0;
}

export function updateGirlfriend(dt) {
  const profile = getSelectedGirlProfile();
  updateAiPressure(dt);
  const targetPlacement = activePlacementTarget();
  world.girlfriend.reclaimCooldown = Math.max(0, world.girlfriend.reclaimCooldown - dt);

  if (targetPlacement) {
    world.girlfriend.reclaimTargetId = null;
  } else if (
    profile.reclaimRelocatedChance > 0 &&
    !world.girlfriend.reclaimTargetId &&
    world.girlfriend.reclaimCooldown <= 0 &&
    Math.random() < dt * profile.reclaimRelocatedChance
  ) {
    const candidate = world.items.find((item) => item.relocated && !item.hidden);
    if (candidate) {
      world.girlfriend.reclaimTargetId = candidate.id;
      world.girlfriend.reclaimCooldown = 5;
    }
  }

  const reclaimTarget = world.items.find((item) => item.id === world.girlfriend.reclaimTargetId && item.relocated && !item.hidden);
  if (targetPlacement) {
    setGirlfriendDestination(
      targetPlacement.x - world.girlfriend.w * 0.5,
      targetPlacement.y - world.girlfriend.h * 0.5,
      targetPlacement.roomKey
    );
  } else if (reclaimTarget) {
    setGirlfriendDestination(
      reclaimTarget.x - world.girlfriend.w * 0.5,
      reclaimTarget.y - world.girlfriend.h * 0.5,
      "hall"
    );
  } else {
    world.girlfriend.reclaimTargetId = null;
    world.placementCooldown -= dt;
    if (world.placementCooldown <= 0) {
      const roam = [
        { x: 560, y: 460, roomKey: "hall" },
        { x: 760, y: 452, roomKey: "hall" },
        { x: 446, y: 154, roomKey: "vardagsrum" },
        { x: 156, y: 468, roomKey: "kok" },
        { x: 792, y: 150, roomKey: "badrum" },
        { x: 196, y: 142, roomKey: "sovrum" },
      ];
      const roomBias = { ...(profile.roomBias || {}) };
      if (world.girlfriend.strategyTimer > 0 && world.girlfriend.strategyRoom) {
        roomBias[world.girlfriend.strategyRoom] = (roomBias[world.girlfriend.strategyRoom] || 1) * (1 + world.girlfriend.responseLevel * 0.7);
      }
      const totalWeight = roam.reduce((sum, point) => sum + (roomBias[point.roomKey] || 1), 0);
      let needle = Math.random() * totalWeight;
      let point = roam[0];
      for (const candidate of roam) {
        needle -= roomBias[candidate.roomKey] || 1;
        if (needle <= 0) {
          point = candidate;
          break;
        }
      }
      setGirlfriendDestination(point.x, point.y, point.roomKey);
      world.placementCooldown = rand(profile.roamCooldownMin, profile.roamCooldownMax);
    }
  }

  const activeWaypoint =
    world.girlfriend.pathIndex < world.girlfriend.path.length
      ? world.girlfriend.path[world.girlfriend.pathIndex]
      : world.girlfriend.target;

  const dx = activeWaypoint.x - world.girlfriend.x;
  const dy = activeWaypoint.y - world.girlfriend.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 1) {
    const speed = world.girlfriend.speed * (world.moodSwing.active ? 1.08 : 1) * getPlacementMovementMultiplier();
    const vx = (dx / dist) * speed * dt;
    const vy = (dy / dist) * speed * dt;
    moveEntity(world.girlfriend, vx, vy);

    if (Math.abs(vx) > Math.abs(vy)) {
      world.girlfriend.dir = vx >= 0 ? "right" : "left";
    } else {
      world.girlfriend.dir = vy >= 0 ? "front" : "back";
    }
  }

  if (dist < 10 && world.girlfriend.pathIndex < world.girlfriend.path.length) {
    world.girlfriend.pathIndex += 1;
  }

  const movedSinceLast = Math.hypot(
    world.girlfriend.x - world.girlfriend.lastX,
    world.girlfriend.y - world.girlfriend.lastY
  );
  if (dist > 20 && movedSinceLast < 0.3) {
    world.girlfriend.stuckTimer += dt;
  } else {
    world.girlfriend.stuckTimer = 0;
  }
  world.girlfriend.lastX = world.girlfriend.x;
  world.girlfriend.lastY = world.girlfriend.y;

  if (world.girlfriend.stuckTimer > 2.5) {
    world.girlfriend.stuckTimer = 0;
    world.girlfriend.repathAttempts += 1;
    world.girlfriend.path = buildWaypointPath(
      { x: world.girlfriend.x, y: world.girlfriend.y },
      { x: world.girlfriend.target.x, y: world.girlfriend.target.y },
      world.girlfriend,
      world.girlfriend.targetRoom
    );
    world.girlfriend.pathIndex = 0;

    if (world.girlfriend.repathAttempts >= 2 && targetPlacement) {
      spawnItemAt(targetPlacement);
      world.pendingPlacements.shift();
      setToast("Hon tog en smartare genväg.");
      return;
    }
  }

  if (targetPlacement) {
    const centerGirl = {
      x: world.girlfriend.x + world.girlfriend.w * 0.5,
      y: world.girlfriend.y + world.girlfriend.h * 0.5,
    };
    if (distance(centerGirl, { x: targetPlacement.x, y: targetPlacement.y }) < 18) {
      spawnItemAt(targetPlacement);
      world.pendingPlacements.shift();
    }
  }

  if (!targetPlacement && reclaimTarget) {
    const centerGirl = {
      x: world.girlfriend.x + world.girlfriend.w * 0.5,
      y: world.girlfriend.y + world.girlfriend.h * 0.5,
    };
    if (distance(centerGirl, { x: reclaimTarget.x, y: reclaimTarget.y }) < 18) {
      const originalRoom = reclaimTarget.originalRoom || "vardagsrum";
      const spot = safeSpawnPoint(originalRoom);
      reclaimTarget.relocated = false;
      reclaimTarget.room = originalRoom;
      reclaimTarget.x = spot.x;
      reclaimTarget.y = spot.y;
      world.girlification = Math.min(100, world.girlification + reclaimTarget.value * 0.25);
      world.girlfriend.reclaimTargetId = null;
      world.girlfriend.reclaimCooldown = 8;
      showGirlfriendReaction("↩", "#ffd9ec", 1.15);
      setToast(`${profile.name} flyttade tillbaka ${reclaimTarget.typeId}.`);
    }
  }
}
