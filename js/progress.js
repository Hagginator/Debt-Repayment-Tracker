/* =========================================
   Debt Manager — progress.js
   Reconstructs total-debt-over-time from the
   per-debt history logs and draws an inline SVG
   line chart. No libraries — works offline, and
   recolours itself with the theme via var(--accent).
========================================= */

// Back-computes a debt's starting balance (what it was before its first
// logged event). Loans carry originalTotal directly; cards are derived by
// reversing their oldest history entry; anything with no history at all
// just uses its current balance.
function debtStartingBalance(debt) {
    const history = debt.history || [];
    // No logged history → no information about past movement, so treat the
    // debt as flat at its current balance. (Anchoring a loan on originalTotal
    // instead dropped a false cliff at "today", since we don't know when the
    // paydown actually happened.)
    if (history.length === 0) return Number(debt.balance) || 0;

    // history is stored newest-first, so the last element is the oldest.
    const oldest = history[history.length - 1];
    const after = Number(oldest.balanceAfter) || 0;
    // reverse it: a payment (down) means the balance before was higher.
    return oldest.direction === "down"
        ? after + Number(oldest.amount)
        : after - Number(oldest.amount);
}

// Reconstructs [{ t, total }] for the SUM of every debt over time. Every debt
// is present across the whole window at its starting balance, then steps to
// each logged balanceAfter. The final point uses live balances so an un-logged
// edit still lands the line on today's real total.
//
// The window starts at the earliest dated moment we know of (a logged payment,
// or a debt's createdAt), minus a day so the first logged payment reads as a
// visible step down rather than a line that begins already-reduced. Debts are
// NOT made to "appear" at their createdAt — that just produced confusing jumps;
// creation only affects where the window begins.
function buildDebtTimeline(list = debts) {
    if (!list.length) return [];

    const now = Date.now();

    const series = list.map(d => ({
        createdAt: d.createdAt ? new Date(d.createdAt).getTime() : null,
        startBal: debtStartingBalance(d),
        cur: Number(d.balance) || 0,
        events: (d.history || [])
            .map(h => ({ t: new Date(h.date).getTime(), bal: Number(h.balanceAfter) || 0 }))
            .sort((a, b) => a.t - b.t)
    }));

    let windowStart = now;
    series.forEach(s => {
        if (s.createdAt !== null) windowStart = Math.min(windowStart, s.createdAt);
        if (s.events.length) windowStart = Math.min(windowStart, s.events[0].t);
    });
    if (windowStart < now) windowStart -= 86400000;

    const times = new Set([now, windowStart]);
    series.forEach(s => s.events.forEach(e => times.add(e.t)));
    const sorted = [...times].sort((a, b) => a - b);

    return sorted.map(t => {
        let total = 0;
        for (const s of series) {
            if (t >= now) { total += s.cur; continue; } // trust live balance at the end
            let bal = s.startBal;
            for (const e of s.events) {
                if (e.t <= t) bal = e.bal; else break;
            }
            total += bal;
        }
        return { t, total };
    });
}

function renderProgressChart() {
    const host = document.getElementById("progressChart");
    if (!host) return;

    const points = buildDebtTimeline();
    const distinctTimes = new Set(points.map(p => p.t));

    // Need a spread of at least two moments in time to have a line at all.
    if (points.length < 2 || distinctTimes.size < 2) {
        host.classList.add("hidden");
        host.innerHTML = "";
        return;
    }
    host.classList.remove("hidden");

    // Match the viewBox to the container width and a fixed banner height, so
    // 1 SVG unit ≈ 1px — the chart stays a sensible height on any screen
    // instead of scaling its aspect ratio up to something enormous when wide.
    const W = Math.max(Math.round(host.clientWidth) || 960, 320);
    const H = 300;
    const padL = 64, padR = 18, padT = 20, padB = 38;

    const t0 = points[0].t;
    const t1 = points[points.length - 1].t;
    const maxV = Math.max(...points.map(p => p.total), 1);

    const x = t => padL + (W - padL - padR) * (t1 === t0 ? 0 : (t - t0) / (t1 - t0));
    const y = v => padT + (H - padT - padB) * (1 - v / maxV);

    const coords = points.map(p => `${x(p.t).toFixed(1)},${y(p.total).toFixed(1)}`);
    const linePath = "M" + coords.join(" L");
    const areaPath = `M${x(t0).toFixed(1)},${y(0).toFixed(1)} L` + coords.join(" L") + ` L${x(t1).toFixed(1)},${y(0).toFixed(1)} Z`;

    const gridVals = [0, maxV / 2, maxV];
    const grid = gridVals.map(v => {
        const yy = y(v).toFixed(1);
        return `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" class="pg-grid"/>` +
               `<text x="${padL - 10}" y="${(y(v) + 6).toFixed(1)}" class="pg-ylab">£${Math.round(v).toLocaleString()}</text>`;
    }).join("");

    const fmtDate = t => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

    const dots = points.map(p =>
        `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.total).toFixed(1)}" r="4" class="pg-dot">` +
        `<title>${fmtDate(p.t)} — £${p.total.toFixed(2)}</title></circle>`
    ).join("");

    const paid = points[0].total - points[points.length - 1].total;
    const caption = paid > 0.005
        ? `Down <strong>£${paid.toFixed(2)}</strong> since ${fmtDate(t0)}`
        : `Tracking since ${fmtDate(t0)}`;

    host.innerHTML = `
<div class="progress-head">
    <h2>📉 Your Progress</h2>
    <span class="progress-caption">${caption}</span>
</div>
<svg viewBox="0 0 ${W} ${H}" class="pg-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Total debt over time">
    ${grid}
    <path d="${areaPath}" class="pg-area"/>
    <path d="${linePath}" class="pg-line" pathLength="1"/>
    ${dots}
    <text x="${padL}" y="${H - 12}" class="pg-xlab" style="text-anchor:start">${fmtDate(t0)}</text>
    <text x="${W - padR}" y="${H - 12}" class="pg-xlab" style="text-anchor:end">${fmtDate(t1)}</text>
</svg>`;
}

// Console-runnable sanity check: two debts, one payment each, known totals.
// Call _pgSelfTest() in devtools. Not run automatically.
function _pgSelfTest() {
    const day = 86400000, base = Date.now() - 10 * day;
    const fake = [
        { type: "card", balance: 200, createdAt: new Date(base).toISOString(),
          history: [{ date: new Date(base + 5 * day).toISOString(), direction: "down", amount: 50, balanceAfter: 200 }] },
        { type: "loan", balance: 300, originalTotal: 400, createdAt: new Date(base).toISOString(),
          history: [{ date: new Date(base + 7 * day).toISOString(), direction: "down", amount: 100, balanceAfter: 300 }] }
    ];
    const tl = buildDebtTimeline(fake);
    console.assert(Math.abs(tl[0].total - (250 + 400)) < 0.01, "start total should be 650, got " + tl[0].total);
    console.assert(Math.abs(tl[tl.length - 1].total - (200 + 300)) < 0.01, "end total should be 500, got " + tl[tl.length - 1].total);
    console.log("progress self-test passed", tl);
}

// The viewBox width now tracks the container, so redraw on resize (debounced).
let _pgResizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(_pgResizeTimer);
    _pgResizeTimer = setTimeout(renderProgressChart, 150);
});
