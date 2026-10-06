import { ctx } from "../core/dom.js";

export function drawImageOrFallback(img, x, y, w, h, fallbackColor) {
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x, y, w, h);
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(x, y, w, h);
  }
}

export function drawImageContainOrFallback(img, x, y, w, h, fallbackColor, verticalAlign = "center") {
  if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const drawX = x + (w - drawW) * 0.5;
    const drawY =
      verticalAlign === "bottom" ? y + (h - drawH) : verticalAlign === "top" ? y : y + (h - drawH) * 0.5;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(x, y, w, h);
  }
}
