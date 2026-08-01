/* =========================================
   Debt Manager — progress.js
   Reconstructs total-debt-over-time from the
   per-debt history logs and draws an inline SVG
   line chart. No libraries — works offline, and
   recolours itself with the theme via var(--accent).
   Each plotted point carries the events that caused
   it, so hovering shows what actually changed.
========================================= */

function pgEscape(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Back-computes a debt's starting balance (what it was before its first
// logged event). Cards are derived by reversing their oldest history entry;
// anything with no history at all just uses its current balance.
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

// Reconstructs [{ t, total, events }] for the SUM of every debt over time.
// Every debt is present across the whole window at its starting balance, then
// steps to each logged balanceAfter. The final point uses live balances so an
// un-logged edit still lands the line on today's real total.
//
// `events` lists what changed AT that timestamp — lender, type and amount —
// which is what the hover tooltip reads.
//
// The window starts at the earliest dated moment we know of, minus a day so
// the first logged payment reads as a visible step down rather than a line
// that begins already-reduced.
function buildDebtTimeline(list = debts) {
    if (!list.length) return [];

    const now = Date.now();

    const series = list.map(d => ({
        lender: d.lender || "Debt",
        createdAt: d.createdAt ? new Date(d.createdAt).getTime() : null,
        startBal: debtStartingBalance(d),
        cur: Number(d.balance) || 0,
        events: (d.history || [])
            .map(h => ({
                t: new Date(h.date).getTime(),
                bal: Number(h.balanceAfter) || 0,
                type: h.type || "payment",
                direction: h.direction || "down",
                amount: Number(h.amount) || 0
            }))
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
        const events = [];
        for (const s of series) {
            if (t >= now) { total += s.cur; } else {
                let bal = s.startBal;
                for (const e of s.events) {
                    if (e.t <= t) bal = e.bal; else break;
                }
                total += bal;
            }
            // Whatever happened on this debt at exactly this moment.
            s.events.forEach(e => {
                if (e.t === t) events.push({ lender: s.lender, type: e.type, direction: e.direction, amount: e.amount });
            });
        }
        return { t, total, events };
    });
}

function pgFmtDate(t) {
    return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function pgMoney(n) {
    return "£" + Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// The hover card: what changed here, then the resulting total.
function pgTooltipHtml(point, isFirst, isLast) {
    const rows = point.events.map(e => {
        const down = e.direction === "down";
        const verb = e.type === "payment" ? "payment"
            : e.type === "charge" ? "charge"
            : down ? "adjusted down" : "adjusted up";
        return `<div class="pg-tip-row">
            <span class="pg-tip-dot ${down ? "down" : "up"}"></span>
            <span class="pg-tip-what">${pgEscape(e.lender)} ${verb}</span>
            <b class="${down ? "down" : "up"}">${down ? "−" : "+"}${pgMoney(e.amount)}</b>
        </div>`;
    }).join("");

    const note = point.events.length ? rows
        : `<div class="pg-tip-note">${isFirst ? "Tracking starts here" : isLast ? "Today" : "No logged change"}</div>`;

    return `<strong class="pg-tip-date">${pgFmtDate(point.t)}</strong>
        ${note}
        <div class="pg-tip-total">Total owed <b>${pgMoney(point.total)}</b></div>`;
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

    // A point that logged a change gets a solid marker; a plain shape-change
    // point stays small, so the eye lands on the events that matter.
    const dots = points.map(p =>
        `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.total).toFixed(1)}" r="${p.events.length ? 4.5 : 3}" class="pg-dot${p.events.length ? " has-event" : ""}"/>`
    ).join("");

    // Invisible, generous hit targets — 4px circles are miserable to hover.
    const hits = points.map((p, i) =>
        `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.total).toFixed(1)}" r="16" class="pg-hit" data-i="${i}"/>`
    ).join("");

    const paid = points[0].total - points[points.length - 1].total;
    const caption = paid > 0.005
        ? `Down <strong>${pgMoney(paid)}</strong> since ${pgFmtDate(t0)}`
        : `Tracking since ${pgFmtDate(t0)}`;

    host.innerHTML = `
<div class="progress-head">
    <h2>Your Progress</h2>
    <span class="progress-caption">${caption}</span>
</div>
<svg viewBox="0 0 ${W} ${H}" class="pg-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Total debt over time">
    ${grid}
    <path d="${areaPath}" class="pg-area"/>
    <path d="${linePath}" class="pg-line" pathLength="1"/>
    <line class="pg-guide" x1="0" y1="${padT}" x2="0" y2="${H - padB}"/>
    ${dots}
    ${hits}
    <text x="${padL}" y="${H - 12}" class="pg-xlab" style="text-anchor:start">${pgFmtDate(t0)}</text>
    <text x="${W - padR}" y="${H - 12}" class="pg-xlab" style="text-anchor:end">${pgFmtDate(t1)}</text>
</svg>
<div class="pg-tip" role="tooltip"></div>`;

    attachChartTooltips(host, points);
}

function attachChartTooltips(host, points) {
    const tip = host.querySelector(".pg-tip");
    const svg = host.querySelector(".pg-svg");
    const guide = host.querySelector(".pg-guide");
    if (!tip || !svg) return;

    const show = hit => {
        const i = Number(hit.dataset.i);
        const p = points[i];
        if (!p) return;

        tip.innerHTML = pgTooltipHtml(p, i === 0, i === points.length - 1);
        tip.classList.add("show");

        // Position from real screen geometry, so it stays correct however the
        // SVG has been scaled to fit its container.
        const hr = hit.getBoundingClientRect();
        const pr = host.getBoundingClientRect();
        const cx = hr.left + hr.width / 2 - pr.left;
        const cy = hr.top + hr.height / 2 - pr.top;

        const half = tip.offsetWidth / 2;
        tip.style.left = Math.max(half + 4, Math.min(cx, pr.width - half - 4)) + "px";
        tip.style.top = (cy - 14) + "px";

        if (guide) {
            const gx = hit.getAttribute("cx");
            guide.setAttribute("x1", gx);
            guide.setAttribute("x2", gx);
            guide.classList.add("show");
        }
        svg.querySelectorAll(".pg-dot").forEach((d, di) => d.classList.toggle("active", di === i));
    };

    const hide = () => {
        tip.classList.remove("show");
        if (guide) guide.classList.remove("show");
        svg.querySelectorAll(".pg-dot").forEach(d => d.classList.remove("active"));
    };

    host.querySelectorAll(".pg-hit").forEach(hit => {
        hit.addEventListener("mouseenter", () => show(hit));
        hit.addEventListener("click", () => show(hit));   // tap support
        hit.addEventListener("mouseleave", hide);
    });
    svg.addEventListener("mouseleave", hide);
}

// Console-runnable sanity check: totals, plus event attribution on the points.
// Call _pgSelfTest() in devtools. Not run automatically.
function _pgSelfTest() {
    const day = 86400000, base = Date.now() - 10 * day;
    const fake = [
        { lender: "CardA", type: "card", balance: 200, createdAt: new Date(base).toISOString(),
          history: [{ date: new Date(base + 5 * day).toISOString(), type: "payment", direction: "down", amount: 50, balanceAfter: 200 }] },
        { lender: "LoanB", type: "loan", balance: 300, originalTotal: 400, createdAt: new Date(base).toISOString(),
          history: [{ date: new Date(base + 7 * day).toISOString(), type: "payment", direction: "down", amount: 100, balanceAfter: 300 }] }
    ];
    const tl = buildDebtTimeline(fake);
    console.assert(Math.abs(tl[0].total - (250 + 400)) < 0.01, "start total should be 650, got " + tl[0].total);
    console.assert(Math.abs(tl[tl.length - 1].total - (200 + 300)) < 0.01, "end total should be 500, got " + tl[tl.length - 1].total);
    const withEvents = tl.filter(p => p.events.length);
    console.assert(withEvents.length === 2, "expected 2 event points, got " + withEvents.length);
    console.assert(withEvents[0].events[0].lender === "CardA" && withEvents[0].events[0].amount === 50,
        "first event should be CardA 50, got " + JSON.stringify(withEvents[0].events[0]));
    console.log("progress self-test passed", tl);
}

// The viewBox width now tracks the container, so redraw on resize (debounced).
let _pgResizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(_pgResizeTimer);
    _pgResizeTimer = setTimeout(renderProgressChart, 150);
});
