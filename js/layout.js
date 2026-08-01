/* =========================================
   Debt Manager — layout.js
   Switches between whole visual layouts
   (typography, shape, density, motion) via
   a data-layout attribute on <html>, kept
   separate from the background-colour theme
   in theme.js.
========================================= */

const DEFAULT_LAYOUT = "fintech";
const VALID_LAYOUTS = ["fintech", "glass"];

function applyLayout(name) {
    document.documentElement.dataset.layout = name;
}

function selectLayout(name) {
    applyLayout(name);
    localStorage.setItem("layoutTheme", name);
    syncLayoutButtons(name);

    // Each theme ships its own palette in CSS. A previously-saved custom
    // colour is applied as inline styles on <html>, which would override
    // that and make all three themes look identical — so switching theme
    // clears the override and lets the new theme's own palette show.
    if (typeof resetTheme === "function") resetTheme();
}

function syncLayoutButtons(name) {
    document.querySelectorAll(".layout-option").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.layout === name);
    });
}

function loadLayout() {
    let saved = localStorage.getItem("layoutTheme");
    // Migrate: the old themes (classic/modern/corporate/terminal) no longer
    // exist, so fall back to the default rather than a dead data-layout.
    if (!VALID_LAYOUTS.includes(saved)) saved = DEFAULT_LAYOUT;
    applyLayout(saved);
    syncLayoutButtons(saved);
}

function resetLayout() {
    localStorage.removeItem("layoutTheme");
    applyLayout(DEFAULT_LAYOUT);
    syncLayoutButtons(DEFAULT_LAYOUT);
}

// Applied immediately (not on window.onload) so a saved layout shows
// straight away instead of flashing the classic one first.
loadLayout();
