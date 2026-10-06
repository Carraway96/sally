const ACCESSIBILITY_KEY = "girlification-accessibility-v1";

export const accessibilityState = {
  highContrast: false,
  colorblind: false,
  reducedMotion: false,
};

function loadAccessibility() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACCESSIBILITY_KEY) || "null");
    if (saved) Object.assign(accessibilityState, saved);
  } catch {
    // Defaults are safe when storage is unavailable.
  }
}

function persistAccessibility() {
  try {
    localStorage.setItem(ACCESSIBILITY_KEY, JSON.stringify(accessibilityState));
  } catch {
    // Settings remain active for the current session.
  }
}

export function applyAccessibility() {
  document.body.classList.toggle("accessibility-high-contrast", accessibilityState.highContrast);
  document.body.classList.toggle("accessibility-colorblind", accessibilityState.colorblind);
  document.body.classList.toggle("accessibility-reduced-motion", accessibilityState.reducedMotion);
}

export function toggleAccessibility(key) {
  accessibilityState[key] = !accessibilityState[key];
  persistAccessibility();
  applyAccessibility();
  return accessibilityState[key];
}

loadAccessibility();
applyAccessibility();
