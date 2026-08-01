/* =========================================
   Debt Manager — tabs.js
   Sidebar navigation between the app's pages,
   with an animated transition on each switch.
========================================= */

const PAGE_META = {
    overview: { title: "Overview", sub: "Everything you owe, and how it's moving." },
    debts:    { title: "Debts",    sub: "Your cards and loans." },
    payments: { title: "Log Payment", sub: "Record a payment and update your balances." },
    planner:  { title: "Planner",  sub: "Build a payoff plan that fits your budget." },
    insights: { title: "Insights", sub: "A plain-English read on where you stand." }
};

function switchTab(name) {
    const page = document.getElementById(`tab-${name}`);
    if (!page) return;

    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));

    // Restart the entrance animation cleanly even if the same page object
    // is reused — remove, force reflow, re-add.
    page.classList.remove("active");
    void page.offsetWidth;
    page.classList.add("active");

    const btn = document.querySelector(`.tab-btn[data-tab="${name}"]`);
    if (btn) btn.classList.add("active");

    const meta = PAGE_META[name];
    if (meta) {
        const t = document.getElementById("pageTitle");
        const s = document.getElementById("pageSubtitle");
        if (t) t.textContent = meta.title;
        if (s) s.textContent = meta.sub;
    }

    // Long pages: start each one at the top rather than wherever the last was.
    const main = document.querySelector(".main");
    if (main) main.scrollTo({ top: 0, behavior: "smooth" });
}
