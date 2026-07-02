/* =========================================
   Debt Manager — planner.js
========================================= */

// Tracks any custom "Extra" overrides the user types in, plus the
// raw text as typed (so the live re-render doesn't clobber what's
// mid-keystroke in the focused input).
let currentCustomExtras = {};
let customExtraRaw = {};
let lastBudget = null;
let lastStrategy = null;

// The most recently rendered plan, kept around so the popup can be
// opened/closed without re-running the simulation.
let lastPlanState = null;

// Which debt's payment popup is currently open (by lender name), or
// null if the popup is closed.
let openPlanRowLender = null;

function calculatePlan() {

    const budget = Number(document.getElementById("monthlyBudget").value);
    const strategy = document.getElementById("strategy").value;

    if (!budget || budget <= 0) {
        alert("Enter a valid budget");
        return;
    }

    if (debts.length === 0) {
        alert("Add at least one debt");
        return;
    }

    const totalMinimums = debts.reduce((sum, d) => sum + getGuaranteedPayment(d), 0);

    if (budget < totalMinimums) {
        alert(
            `Your budget (£${budget.toFixed(2)}) is less than your combined required payments ` +
            `(£${totalMinimums.toFixed(2)}), including any fixed payments you've set. Increase your budget to at least this amount to build a plan.`
        );
        return;
    }

    lastBudget = budget;
    lastStrategy = strategy;
    currentCustomExtras = {};
    customExtraRaw = {};

    runPlan();
}

// Called on every keystroke in the popup's "Extra" input — recalculates
// the whole plan live using the user's custom payment amounts.
function updateCustomExtra(lender, rawValue) {
    customExtraRaw[lender] = rawValue;
    currentCustomExtras[lender] = Math.max(0, Number(rawValue) || 0);
    runPlan();
}

function resetToStrategyDefault() {
    currentCustomExtras = {};
    customExtraRaw = {};
    runPlan();
}

function openPlanRow(lender) {
    openPlanRowLender = lender;
    renderModal();
}

function closePlanRowModal() {
    openPlanRowLender = null;
    renderModal();
}

function runPlan() {

    const cleanDebts = JSON.parse(JSON.stringify(debts));
    const result = runRepaymentSimulation(cleanDebts, lastBudget, lastStrategy, currentCustomExtras);

    // Compare against minimum-only payments over the SAME timeframe as
    // the plan. This stays meaningful even if a debt's minimum would
    // never fully pay it off on its own.
    const baseline = runMinimumPaymentSimulationForMonths(
        JSON.parse(JSON.stringify(debts)),
        result.months
    );

    const brokenMinimums = debts
        .filter(d => getGuaranteedPayment(d) < Number(d.balance) * (getEffectiveApr(d, 0) / 100 / 12))
        .map(d => d.lender);

    renderPlan(result, baseline, lastBudget, lastStrategy, brokenMinimums);
}

function renderPlan(sim, baseline, budget, strategy, brokenMinimums) {

    lastPlanState = { sim, baseline, budget, strategy, brokenMinimums };

    const months = sim.months;
    const years = (months / 12).toFixed(1);
    const debtFreeDate = getFutureDate(months);

    const strategyLabel = strategy === "snowball"
        ? "❄️ Snowball (Smallest Balance)"
        : "🔥 Avalanche (Highest APR)";

    const savedInterest = baseline.totalInterest - sim.totalInterest;
    const savedInterestDisplay = "£" + savedInterest.toFixed(2);

    const warningBanner = brokenMinimums.length > 0
        ? `<p style="color:var(--warning);margin-top:14px;font-size:.9rem;">
             ⚠️ ${brokenMinimums.join(", ")} — the required payment${brokenMinimums.length > 1 ? "s" : ""}
             ${brokenMinimums.length > 1 ? "don't" : "doesn't"} cover ${brokenMinimums.length > 1 ? "their" : "its"} own
             monthly interest. This has nothing to do with your £${budget.toFixed(2)} budget — on that amount alone,
             the balance would grow forever rather than shrink.
           </p>`
        : "";

    const totalAllocated = sim.breakdown.reduce((s, p) => s + p.total, 0);
    const leftover = Math.max(0, budget - totalAllocated);

    const allocationNote = leftover > 0.01
        ? `<p style="color:var(--muted);margin-top:14px;font-size:.85rem;">
             £${leftover.toFixed(2)} of your budget is unallocated this month — every debt would already be cleared.
           </p>`
        : "";

    // Stable order (same as the debts array) so rows don't jump around.
    const paymentRows = sim.breakdown.map(p => {

        const originalDebt = debts.find(d => d.lender === p.lender);
        const hasFixedPayment = originalDebt && originalDebt.fixedPayment;

        const statusBadge = p.extra > 0
            ? '<span class="plan-status success">Pay Extra</span>'
            : `<span class="plan-status pending">${hasFixedPayment ? "Fixed Only" : "Minimum Only"}</span>`;

        return `
<div class="plan-row-compact" onclick="openPlanRow('${p.lender.replace(/'/g, "\\'")}')">
    <div class="plan-row-main">
        <span class="plan-row-name">💳 ${p.lender}</span>
        ${statusBadge}
    </div>
    <span class="plan-row-amount">£${p.total.toFixed(2)}</span>
</div>`;
    }).join("");

    const html = `
<div class="plan-card">
    <h3>📅 Debt Freedom Plan — ${strategyLabel}</h3>
    <div class="summary-grid">
        <div class="summary-item">
            <span>Debt Free In</span>
            <strong>${months} months</strong>
        </div>
        <div class="summary-item">
            <span>Approx Years</span>
            <strong>${years}</strong>
        </div>
        <div class="summary-item">
            <span>Debt Free Date</span>
            <strong>${debtFreeDate}</strong>
        </div>
        <div class="summary-item">
            <span>Interest Saved (vs minimums only)</span>
            <strong>${savedInterestDisplay}</strong>
        </div>
    </div>
    ${warningBanner}
</div>

<div class="plan-card">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <h3 style="margin:0;">💳 Pay This Month</h3>
        <button
            type="button"
            class="edit-btn"
            style="width:auto;padding:8px 16px;border-radius:12px;font-size:.85rem;"
            onclick="resetToStrategyDefault()">
            Reset to ${strategy === "snowball" ? "Snowball" : "Avalanche"} Default
        </button>
    </div>
    <p style="color:var(--muted);font-size:.85rem;margin-top:10px;">
        Tap a card to fine-tune its payment — the rest of your budget still follows your chosen strategy.
    </p>
    ${paymentRows}
    ${allocationNote}
</div>`;

    document.getElementById("repaymentPlan").innerHTML = html;
    document.getElementById("debtFree").textContent = debtFreeDate;

    renderModal();
}

// Renders (or hides) the "fine-tune this card's payment" popup, based
// on lastPlanState + openPlanRowLender. Also handles the same
// focus/cursor preservation the old inline inputs needed, since typing
// in the popup's Extra field triggers a full recalculation.
function renderModal() {

    const overlay = document.getElementById("planRowModal");
    const content = document.getElementById("planRowModalContent");

    if (!lastPlanState || openPlanRowLender === null) {
        overlay.classList.add("hidden");
        content.innerHTML = "";
        return;
    }

    const { sim } = lastPlanState;
    const p = sim.breakdown.find(row => row.lender === openPlanRowLender);

    // The debt behind this row may have been deleted since the popup opened.
    if (!p) {
        openPlanRowLender = null;
        overlay.classList.add("hidden");
        return;
    }

    const inputId = "extraInput-modal";
    const active = document.activeElement;
    const wasExtraInputFocused = active && active.id === inputId;
    const selStart = wasExtraInputFocused && typeof active.selectionStart === "number" ? active.selectionStart : null;

    const displayValue = (wasExtraInputFocused && customExtraRaw[p.lender] !== undefined)
        ? customExtraRaw[p.lender]
        : p.extra.toFixed(2);

    const originalDebt = debts.find(d => d.lender === p.lender);
    const hasFixedPayment = originalDebt && originalDebt.fixedPayment;
    const guaranteedLabel = hasFixedPayment ? "🔒 Fixed Payment" : "Minimum";

    content.innerHTML = `
<h3 style="margin-bottom:20px;">💳 ${p.lender}</h3>
<div class="plan-grid">
    <div class="plan-stat">
        <span>${guaranteedLabel}</span>
        <strong>£${p.minimum.toFixed(2)}</strong>
    </div>
    <div class="plan-stat">
        <span>Extra (edit me)</span>
        <input
            type="number"
            min="0"
            step="1"
            class="extra-input"
            id="${inputId}"
            value="${displayValue}"
            oninput="updateCustomExtra('${p.lender.replace(/'/g, "\\'")}', this.value)">
    </div>
    <div class="plan-stat" style="grid-column:1 / -1;">
        <span>Pay This Month</span>
        <strong>£${p.total.toFixed(2)}</strong>
    </div>
</div>`;

    overlay.classList.remove("hidden");

    if (wasExtraInputFocused) {
        const el = document.getElementById(inputId);
        if (el) {
            el.focus();
            if (selStart !== null && el.setSelectionRange) {
                try { el.setSelectionRange(selStart, selStart); } catch (e) {}
            }
        }
    }
}

function getFutureDate(months) {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
