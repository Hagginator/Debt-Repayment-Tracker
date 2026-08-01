/* =========================================
   Debt Manager — insights.js
   Turns the raw debt data into plain-English
   summaries, and renders the sidebar debt list.
   Pure read-only derivation — no state changes.
========================================= */

function gbp(n) { return "£" + (Number(n) || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function gbp0(n) { return "£" + Math.round(Number(n) || 0).toLocaleString("en-GB"); }

// Compact colour per lender, derived from the name so it's stable — used
// as the dot in the sidebar list. Deterministic hash → hue.
function lenderHue(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return h;
}

function renderSidebarDebts() {
    const host = document.getElementById("sidebarDebts");
    const countEl = document.getElementById("sidebarDebtsCount");
    if (!host) return;

    if (countEl) countEl.textContent = debts.length;

    if (debts.length === 0) {
        host.innerHTML = `<p class="sidebar-empty">No debts yet.</p>`;
        return;
    }

    const sorted = [...debts].sort((a, b) => b.balance - a.balance);
    host.innerHTML = sorted.map(d => {
        const paidOff = d.balance <= 0.01;
        return `
<button class="sd-row" onclick="switchTab('debts')" title="${d.lender}">
    <span class="sd-dot" style="--h:${lenderHue(d.lender)}"></span>
    <span class="sd-name">${d.lender}</span>
    <span class="sd-amt${paidOff ? " done" : ""}">${paidOff ? "Paid" : gbp0(d.balance)}</span>
</button>`;
    }).join("");
}

// Builds an ordered list of insight objects. Most urgent first, so the
// overview strip can just take the top few.
function generateInsights() {
    const out = [];
    if (debts.length === 0) {
        return [{ tone: "info", title: "Add your first debt", text: "Once your cards and loans are in, this is where you'll see what to tackle first and how you're doing." }];
    }

    const active = debts.filter(d => d.balance > 0.01);
    const total = debts.reduce((s, d) => s + d.balance, 0);
    const totalMin = debts.reduce((s, d) => s + Number(d.minimum || 0), 0);
    const totalLimit = debts.reduce((s, d) => s + Number(d.limit || 0), 0);
    const util = totalLimit > 0 ? (total / totalLimit) * 100 : null;

    // 1. Promo deals about to expire — the most time-sensitive thing there is.
    const now = new Date();
    active.forEach(d => {
        if (!d.promoEndDate) return;
        const end = new Date(d.promoEndDate);
        const days = Math.ceil((end - now) / 86400000);
        if (days < 0) return;
        if (days <= 60) {
            out.push({
                tone: "warn",
                title: `${d.lender}: 0% deal ends in ${days} day${days === 1 ? "" : "s"}`,
                text: `On ${end.toLocaleDateString("en-GB", { day: "numeric", month: "long" })} the rate jumps to ${Number(d.apr).toFixed(2)}%. Clear the ${gbp(d.balance)} balance or move it to another 0% card before then.`
            });
        }
    });

    // 2. Most expensive debt right now (effective APR, so a live 0% promo counts as 0).
    const byApr = [...active].sort((a, b) => getEffectiveApr(b, 0) - getEffectiveApr(a, 0));
    const worst = byApr[0];
    if (worst && getEffectiveApr(worst, 0) > 0) {
        out.push({
            tone: "info",
            title: `${worst.lender} is your most expensive debt`,
            text: `At ${getEffectiveApr(worst, 0).toFixed(1)}% APR, every pound sitting here costs the most. With the avalanche method you throw spare cash at this one first while paying minimums on the rest.`
        });
    }

    // 3. Progress from the logged history.
    if (typeof buildDebtTimeline === "function") {
        const tl = buildDebtTimeline();
        if (tl.length >= 2) {
            const paid = tl[0].total - tl[tl.length - 1].total;
            if (paid > 0.5) {
                const since = new Date(tl[0].t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                out.push({ tone: "good", title: `Down ${gbp(paid)} since ${since}`, text: `That's real progress — keep logging payments and the line on your Overview keeps dropping.` });
            } else {
                out.push({ tone: "info", title: "Log payments to track progress", text: `Every payment you record on the Log Payment page plots on your progress chart, so you can watch the total actually fall.` });
            }
        }
    }

    // 4. Credit utilisation health.
    if (util !== null) {
        if (util >= 50) {
            out.push({ tone: "warn", title: `Credit utilisation is high (${util.toFixed(0)}%)`, text: `You're using ${util.toFixed(0)}% of your available credit. Above 30% can weigh on your credit score — bringing balances down helps here as well as on interest.` });
        } else if (util < 30) {
            out.push({ tone: "good", title: `Healthy utilisation (${util.toFixed(0)}%)`, text: `You're under the 30% mark lenders like to see. Good place to be.` });
        }
    }

    // 5. Payoff order (avalanche) — the actionable plan.
    if (byApr.length > 1) {
        const order = byApr.slice(0, 4).map((d, i) => `${i + 1}. ${d.lender}`).join("   ");
        out.push({ tone: "info", title: "Suggested payoff order", text: `Highest interest first: ${order}. Pay the minimum on everything, then everything spare on number one until it's gone.` });
    }

    // 6. The headline picture — always last, as a grounding summary.
    out.push({ tone: "info", title: `${gbp(total)} across ${debts.length} debt${debts.length === 1 ? "" : "s"}`, text: `Your minimum payments come to ${gbp(totalMin)} a month. Anything you pay above that is what actually gets you free.` });

    return out;
}

function insightCard(ins) {
    return `
<div class="insight-card ${ins.tone}">
    <div class="insight-card-bar"></div>
    <div class="insight-card-body">
        <strong>${ins.title}</strong>
        <p>${ins.text}</p>
    </div>
</div>`;
}

function renderInsights() {
    const all = generateInsights();

    const strip = document.getElementById("insightsSummary");
    if (strip) {
        // The overview only needs the two or three most useful.
        strip.innerHTML = all.slice(0, 3).map(insightCard).join("");
    }

    const full = document.getElementById("insightsFull");
    if (full) {
        full.innerHTML = all.map(insightCard).join("");
    }
}
