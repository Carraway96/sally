// Drive footsteps from distance actually travelled, including collision sliding.
export function updateWalking(entity, previousX, previousY, dt) {
  if (dt <= 0) return;
  const distance = Math.hypot(entity.x - previousX, entity.y - previousY);
  const walking = entity.walking ||= { distance: 0, moving: false, strength: 0 };
  // Ignore teleports and resume/reset jumps rather than playing a burst of steps.
  walking.moving = distance > 0.01 && distance <= 400 * dt;
  if (walking.moving) walking.distance = (walking.distance + distance) % 52;
  const target = walking.moving ? 1 : 0;
  walking.strength += (target - walking.strength) * Math.min(1, dt * 14);
  if (!walking.moving && walking.strength < 0.01) {
    walking.distance = 0;
    walking.strength = 0;
  }
}

export function getWalkingPose(entity, reducedMotion = false) {
  const walking = entity.walking;
  if (reducedMotion || !walking) return { frame: -1, bob: 0, sway: 0 };
  const phase = walking.distance / 52 * Math.PI * 2;
  return {
    frame: walking.moving ? Math.floor(walking.distance / 13) : -1,
    bob: -Math.abs(Math.sin(phase)) * 1.6 * walking.strength,
    sway: Math.sin(phase) * 0.018 * walking.strength,
  };
}
