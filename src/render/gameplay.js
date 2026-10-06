import { drawRoomBackground } from "./environment.js?v=2";
import { world } from "../core/state.js";
import { drawComboStatus, drawDifficultyOverlays, drawInteractionMenu, drawMinimap, drawThreatBriefing, drawToast, drawTutorialOverlay } from "./overlays.js?v=10";
import { drawGirlfriend, drawItems, drawPlacementTelegraphs, drawPlayer } from "./entities.js?v=5";

export function drawGameplay() {
  drawRoomBackground();
  drawItems();
  drawPlacementTelegraphs();
  drawPlayer();
  drawGirlfriend();
  drawDifficultyOverlays();
  if (world.tutorial?.active) {
    drawMinimap();
    drawComboStatus();
  }
  drawTutorialOverlay();
  drawInteractionMenu();
  drawToast();
  drawThreatBriefing();
}
