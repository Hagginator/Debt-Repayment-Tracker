/* =========================================
   Debt Manager — tabs.js
   Sidebar navigation. Page changes are
   direction-aware: moving down the nav sends
   the new page up, moving back sends it down,
   so the app reads as one continuous surface
   rather than unrelated screens.
========================================= */

const PAGE_ORDER = ["overview", "debts", "payments", "planner", "insights"];

const PAGE_META = {
    overview: { title: "Overview", sub: "Everything you owe, and how it's moving." },
    debts:    { title: "Debts",    sub: "Your cards and loans." },
    payments: { title: "Log Payment", sub: "Record a payment and update your balances." },
    planner:  { title: "Planner",  sub: "Build a payoff plan that fits your budget." },
    insights: { title: "Insights", sub: "A plain-English read on where you stand." }
};

let currentPageIndex = 0;

function switchTab(name) {
    const page = document.getElementById(`tab-${name}`);
    if (!page) return;

    const nextIndex = PAGE_ORDER.indexOf(name);
    const goingForward = nextIndex >= currentPageIndex;
    currentPageIndex = nextIndex < 0 ? currentPageIndex : nextIndex;

    const pages = document.querySelector(".pages");
    if (pages) {
        pages.classList.remove("nav-fwd", "nav-back");
        void pages.offsetWidth; // restart the animation cleanly
        pages.classList.add(goingForward ? "nav-fwd" : "nav-back");
    }

    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));

    page.classList.add("active");

    const btn = document.querySelector(`.tab-btn[data-tab="${name}"]`);
    if (btn) {
        btn.classList.add("active");
        moveNavIndicator(btn);
    }

    const meta = PAGE_META[name];
    if (meta) {
        const t = document.getElementById("pageTitle");
        const s = document.getElementById("pageSubtitle");
        if (t) { t.textContent = meta.title; retitleAnimate(t); }
        if (s) s.textContent = meta.sub;
    }

    const main = document.querySelector(".main");
    if (main) main.scrollTo({ top: 0, behavior: "smooth" });

    // The chart's viewBox is sized from its container, which has no width
    // while the page is hidden — redraw once it's visible again.
    if (name === "overview" && typeof renderProgressChart === "function") {
        requestAnimationFrame(renderProgressChart);
    }
}

// Small wipe on the page title so the header participates in the change
// instead of the text just swapping underneath a moving page.
function retitleAnimate(el) {
    el.classList.remove("title-swap");
    void el.offsetWidth;
    el.classList.add("title-swap");
}

// Glides the highlight pill to the active nav item. Uses transform only,
// so it animates on the compositor rather than triggering layout.
function moveNavIndicator(btn, skipTransition) {
    const indicator = document.getElementById("navIndicator");
    if (!indicator || !btn) return;

    if (skipTransition) indicator.style.transition = "none";

    indicator.style.width = `${btn.offsetWidth}px`;
    indicator.style.height = `${btn.offsetHeight}px`;
    indicator.style.transform = `translate(${btn.offsetLeft}px, ${btn.offsetTop}px)`;
    indicator.style.opacity = "1";

    if (skipTransition) {
        void indicator.offsetHeight;
        indicator.style.transition = "";
    }
}

window.addEventListener("load", () => {
    moveNavIndicator(document.querySelector(".tab-btn.active"), true);
});

let _navResizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(_navResizeTimer);
    _navResizeTimer = setTimeout(() => moveNavIndicator(document.querySelector(".tab-btn.active"), true), 120);
});
