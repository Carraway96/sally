import { GIRL_REACTION_DURATION, ROOM_ALERT_DURATION } from "../core/data.js";
import { world } from "../core/state.js";

export function setToast(text, duration = 2.2) {
  world.toast.text = text;
  world.toast.timer = duration;
}

export function updateToast(dt) {
  if (world.toast.timer > 0) {
    world.toast.timer -= dt;
    if (world.toast.timer <= 0) {
      world.toast.text = "";
    }
  }
}

export function bumpRoomAlert(roomKey, duration = ROOM_ALERT_DURATION) {
  if (!world.roomAlertTimers || world.roomAlertTimers[roomKey] == null) return;
  world.roomAlertTimers[roomKey] = Math.max(world.roomAlertTimers[roomKey], duration);
}

export function updateRoomAlerts(dt) {
  for (const roomKey of Object.keys(world.roomAlertTimers)) {
    world.roomAlertTimers[roomKey] = Math.max(0, world.roomAlertTimers[roomKey] - dt);
  }
}

export function showGirlfriendReaction(text, color = "#fff4fb", duration = GIRL_REACTION_DURATION) {
  world.girlfriendReaction.text = text;
  world.girlfriendReaction.color = color;
  world.girlfriendReaction.timer = duration;
  world.girlfriendReaction.duration = duration;
}

export function updateGirlfriendReaction(dt) {
  if (world.girlfriendReaction.timer <= 0) {
    world.girlfriendReaction.text = "";
    return;
  }

  world.girlfriendReaction.timer = Math.max(0, world.girlfriendReaction.timer - dt);
  if (world.girlfriendReaction.timer <= 0) {
    world.girlfriendReaction.text = "";
  }
}
