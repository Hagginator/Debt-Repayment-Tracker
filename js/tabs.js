/* =========================================
   Debt Manager — tabs.js
========================================= */

function switchTab(name) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));

    document.getElementById(`tab-${name}`).classList.add("active");

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${name}"]`);
    activeBtn.classList.add("active");

    moveTabIndicator(activeBtn);
}

// Slides the pill-shaped indicator behind whichever tab button is now
// active. skipTransition is used for the very first positioning (on
// load) and on resize, so it snaps into place instead of sliding in
// from the top-left corner.
function moveTabIndicator(btn, skipTransition) {

    const indicator = document.getElementById("tabsIndicator");
    if (!indicator || !btn) return;

    if (skipTransition) indicator.style.transition = "none";

    indicator.style.width = `${btn.offsetWidth}px`;
    indicator.style.height = `${btn.offsetHeight}px`;
    indicator.style.transform = `translate(${btn.offsetLeft}px, ${btn.offsetTop}px)`;

    if (skipTransition) {
        indicator.offsetHeight; // force reflow before restoring the transition
        indicator.style.transition = "";
    }
}

window.addEventListener("load", () => {
    moveTabIndicator(document.querySelector(".tab-btn.active"), true);
});

window.addEventListener("resize", () => {
    moveTabIndicator(document.querySelector(".tab-btn.active"), true);
});
