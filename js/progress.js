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
    if (debt.type === "loan") return Number(debt.originalTotal ?? debt.balance) || 0;

    const history = debt.history || [];
    if (history.length === 0) return Number(debt.balance) || 0;

    // history is stored newest-first, so the last element is the oldest.
    const oldest = history[history.length - 1];
    const after = Number(oldest.balanceAfter) || 0;
    // reverse it: a payment (down) means the balance before was higher.
    return oldest.direction === "down"
        ? after + Number(oldest.amount)
        : after - Number(oldest.amount);
}

// When a debt started being tracked: explicit createdAt if present, else
// its oldest history entry, else now (nothing dated to go on).
function debtStartMs(debt) {
    if (debt.createdAt) return new Date(debt.createdAt).getTime();
    const history = debt.history || [];
    if (history.length) return new Date(history[history.length - 1].date).getTime();
    return Date.now();
}

// Reconstructs [{ t, total }] for the SUM of every debt over time. A debt
// contributes nothing before its start, then its starting balance, then
// steps to each logged balanceAfter in turn. The final point uses the live
// balances so any un-logged edit still lands the line on today's real total.
function buildDebtTimeline(list = debts) {
    if (!list.length) return [];

    const now = Date.now();

    const series = list.map(d => ({
        start: debtStartMs(d),
        startBal: debtStartingBalance(d),
        cur: Number(d.balance) || 0,
        events: (d.history || [])
            .map(h => ({ t: new Date(h.date).getTime(), bal: Number(h.balanceAfter) || 0 }))
            .sort((a, b) => a.t - b.t)
    }));

    // Every timestamp we need a plotted point at.
    const times = new Set([now]);
    series.forEach(s => { times.add(s.start); s.events.forEach(e => times.add(e.t)); });
    const sorted = [...times].sort((a, b) => a - b);

    return sorted.map(t => {
        let total = 0;
        for (const s of series) {
            if (t < s.start) continue;            // debt didn't exist yet
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

    const W = 1000, H = 380;
    const padL = 70, padR = 18, padT = 18, padB = 40;

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
