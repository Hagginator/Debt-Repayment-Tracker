/* =========================================
   Debt Manager — ui.js
========================================= */

// Which debt the current strategy would attack first — highest
// effective APR for avalanche, smallest balance for snowball. Only
// meaningful with 2+ active debts, since with one there's no choice.
function getPriorityLender() {

    const activeDebts = debts.filter(d => d.balance > 0.01);
    if (activeDebts.length < 2) return null;

    const strategyEl = document.getElementById("strategy");
    const strategy = strategyEl ? strategyEl.value : "avalanche";

    const sorted = [...activeDebts].sort((a, b) => strategy === "snowball"
        ? a.balance - b.balance
        : getEffectiveApr(b, 0) - getEffectiveApr(a, 0)
    );

    return sorted[0].lender;
}

// Debts with an active 0%-style promo ending within the next 60
// days, soonest first — the whole point being to catch it before the
// rate jumps back up, not after.
function getPromoWarnings() {

    const now = new Date();
    const warningWindowMs = 60 * 24 * 60 * 60 * 1000;

    return debts
        .filter(d => d.balance > 0.01 && isPromoCurrentlyActive(d, 0))
        .map(d => {
            const endDate = new Date(d.promoEndDate);
            const daysRemaining = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000));
            return { lender: d.lender, daysRemaining, endDate, normalApr: d.apr };
        })
        .filter(w => w.daysRemaining >= 0 && w.daysRemaining <= 60)
        .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

function renderPromoBanner() {

    const container = document.getElementById("promoBanner");
    if (!container) return;

    const warnings = getPromoWarnings();

    if (warnings.length === 0) {
        container.innerHTML = "";
        return;
    }

    const items = warnings.map(w => {
        const dateLabel = w.endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        const timeLabel = w.daysRemaining === 0 ? "today" : `in ${w.daysRemaining} day${w.daysRemaining > 1 ? "s" : ""}`;
        return `
<div class="promo-warning-item">
    <span>⏰ <strong>${w.lender}</strong>'s promo rate ends ${timeLabel} (${dateLabel}) — jumps to ${w.normalApr}% APR</span>
</div>`;
    }).join("");

    container.innerHTML = `<div class="promo-banner">${items}</div>`;
}

function renderDebts() {

    const container = document.getElementById("debts");
    let html = "";

    const priorityLender = getPriorityLender();

    debts.forEach((debt, index) => {

        const isLoan = debt.type === "loan";
        const effectiveApr = getEffectiveApr(debt, 0);
        const isPromoActive = isPromoCurrentlyActive(debt, 0);
        const isPriority = debt.lender === priorityLender;
        const monthlyInterest = (debt.balance * (effectiveApr / 100)) / 12;
        const effectiveMinimum = getEffectiveMinimum(debt);

        const promoEndLabel = isPromoActive
            ? new Date(debt.promoEndDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
            : "";

        const aprLine = isPromoActive
            ? `${effectiveApr}% APR <span style="color:var(--accent);">· 0% promo till ${promoEndLabel}</span>`
            : `${debt.apr}% APR`;

        let progressWidth, progressColour, statusText, statusIcon, statsBlock;

        if (isLoan) {
            const original = Number(debt.originalPrincipal) || debt.balance;
            const paidOffPct = original > 0 ? ((original - debt.balance) / original) * 100 : 0;
            progressWidth = Math.min(Math.max(paidOffPct, 0), 100);
            progressColour = "#00A650";
            statusText = progressWidth >= 99.99 ? "Paid Off" : "On Track";
            statusIcon = progressWidth >= 99.99 ? "🎉" : "📈";

            statsBlock = `
    <div class="plan-grid">
        <div class="plan-stat">
            <span>Original Loan Amount</span>
            <strong>£${original.toFixed(2)}</strong>
        </div>
        <div class="plan-stat">
            <span>Term</span>
            <strong>${debt.termMonths} months</strong>
        </div>
        <div class="plan-stat">
            <span>Monthly Interest</span>
            <strong>£${monthlyInterest.toFixed(2)}</strong>
        </div>
        <div class="plan-stat">
            <span>Monthly Payment</span>
            <strong>£${effectiveMinimum.toFixed(2)}</strong>
        </div>
    </div>`;
        } else {
            const utilisation = debt.limit > 0 ? (debt.balance / debt.limit) * 100 : 0;
            const availableCredit = Math.max(0, debt.limit - debt.balance);
            const isPercentMinimum = debt.minPercent !== null && debt.minPercent !== undefined && debt.minPercent !== "";

            progressWidth = Math.min(utilisation, 100);

            if (utilisation < 30) {
                progressColour = "#00A650"; statusText = "Healthy"; statusIcon = "🟢";
            } else if (utilisation < 50) {
                progressColour = "#FFB800"; statusText = "Moderate"; statusIcon = "🟡";
            } else {
                progressColour = "#E10600"; statusText = "High Utilisation"; statusIcon = "🔴";
            }

            statsBlock = `
    <div class="plan-grid">
        <div class="plan-stat">
            <span>Credit Limit</span>
            <strong>£${debt.limit.toFixed(2)}</strong>
        </div>
        <div class="plan-stat">
            <span>Available Credit</span>
            <strong>£${availableCredit.toFixed(2)}</strong>
        </div>
        <div class="plan-stat">
            <span>Monthly Interest</span>
            <strong>£${monthlyInterest.toFixed(2)}</strong>
        </div>
        <div class="plan-stat">
            <span>Minimum Payment${isPercentMinimum ? ` (${debt.minPercent}% + floor)` : ""}</span>
            <strong>£${effectiveMinimum.toFixed(2)}</strong>
        </div>
        ${debt.fixedPayment ? `
        <div class="plan-stat" style="grid-column:1 / -1;">
            <span>🔒 Fixed Payment</span>
            <strong>£${Number(debt.fixedPayment).toFixed(2)}/mo</strong>
        </div>` : ""}
    </div>`;
        }

        html += `
<div class="debt-card${isPriority ? " priority-debt" : ""}" style="animation-delay:${Math.min(index, 6) * 60}ms;">

    <div class="debt-top">
        <div>
            <h3>${isLoan ? "🏦" : "💳"} ${debt.lender} ${isPriority ? '<span class="priority-badge">🎯 Pay First</span>' : ""}</h3>
            <p style="margin-top:6px;color:var(--muted);font-family:var(--font-mono);">${aprLine}</p>
        </div>
        <div class="debt-actions">
            <button class="edit-btn" onclick="editDebt(${index})">✏️</button>
            <button class="delete-btn" onclick="deleteDebt(${index})">🗑️</button>
        </div>
    </div>

    <div style="margin:28px 0;">
        <div style="color:var(--muted);margin-bottom:8px;font-family:var(--font-display);text-transform:uppercase;letter-spacing:.5px;font-size:.85rem;">${isLoan ? "Remaining Balance" : "Current Balance"}</div>
        <div style="font-size:2rem;font-weight:700;font-family:var(--font-mono);">£${debt.balance.toFixed(2)}</div>
    </div>

    <div class="progress">
        <div class="progress-fill" style="width:${progressWidth}%;background:${progressColour};"></div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:10px;margin-bottom:24px;font-family:var(--font-display);">
        <span>${progressWidth.toFixed(1)}% ${isLoan ? "Paid Off" : "Utilised"}</span>
        <strong>${statusIcon} ${statusText}</strong>
    </div>

    ${statsBlock}

</div>`;

    });

    container.innerHTML = html;

    renderPaymentsTab();
    renderPromoBanner();
}

// Loans and cards need different fields — a loan has a fixed term
// instead of a credit limit/min-%/promo/fixed-payment, since none of
// those concepts apply to a fixed-payment loan.
function toggleDebtTypeFields() {
    const isLoan = document.getElementById("debtType").value === "loan";
    document.querySelectorAll(".card-field").forEach(el => el.classList.toggle("hidden", isLoan));
    document.querySelectorAll(".loan-field").forEach(el => el.classList.toggle("hidden", !isLoan));
}

// A quick shake to draw the eye to the add-debt form when validation
// fails, alongside the alert().
function shakeForm() {
    const form = document.querySelector(".add-debt");
    if (!form) return;
    form.classList.remove("shake");
    void form.offsetWidth; // force reflow so re-adding the class retriggers the animation
    form.classList.add("shake");
}

function clearForm() {
    document.getElementById("lender").value = "";
    document.getElementById("balance").value = "";
    document.getElementById("apr").value = "";
    document.getElementById("limit").value = "";
    document.getElementById("minimum").value = "";
    document.getElementById("minPercent").value = "";
    document.getElementById("promoApr").value = "";
    document.getElementById("promoEndDate").value = "";
    document.getElementById("fixedPayment").value = "";
    document.getElementById("termMonths").value = "";
    document.getElementById("debtType").value = "card";
    toggleDebtTypeFields();
}
