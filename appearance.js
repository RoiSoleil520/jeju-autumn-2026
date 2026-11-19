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
    const settings = document.querySelector(".reading-settings");
    const settingsTrigger = settings.querySelector("summary");

    document.addEventListener("click", (event) => {
      if (!settings.contains(event.target)) settings.open = false;
    });
    settings.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !settings.open) return;
      event.preventDefault();
      settings.open = false;
      settingsTrigger.focus({ preventScroll: true });
    });
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
      settings.open = false;
      settingsTrigger.focus({ preventScroll: true });
      try {
        localStorage.setItem(storageKey, root.dataset.textSize);
      } catch {
        // The current page still switches size without requiring storage.
      }
    });
  });
})();
