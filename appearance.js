"use strict";
(() => {
  const storageKey = "jeju-autumn-2026-text-size-v1";
  const root = document.documentElement;

  // Restore before styles paint so a saved preference does not flash the other size.
  root.dataset.textSize = "large";
  try {
    if (localStorage.getItem(storageKey) === "normal") {
      root.dataset.textSize = "normal";
    }
  } catch {
    // Large text remains the default when browser storage is unavailable.
  }

  document.addEventListener("DOMContentLoaded", () => {
    const controls = document.querySelector("#text-size-controls");
    function updateButtons() {
      for (const button of controls.querySelectorAll("[data-text-size]")) {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.textSize === root.dataset.textSize),
        );
      }
    }
    updateButtons();
    controls.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-text-size]");
      if (!button || !["large", "normal"].includes(button.dataset.textSize))
        return;
      root.dataset.textSize = button.dataset.textSize;
      updateButtons();
      try {
        localStorage.setItem(storageKey, root.dataset.textSize);
      } catch {
        // The current page still switches size without requiring storage.
      }
    });
  });
})();
