/* =========================================
   Debt Manager — payments.js
========================================= */

// Which debts' history lists are currently expanded, tracked by
// lender name so it survives re-renders.
let expandedHistoryLenders = new Set();

function toggleHistory(lender) {
    if (expandedHistoryLenders.has(lender)) {
        expandedHistoryLenders.delete(lender);
    } else {
        expandedHistoryLenders.add(lender);
    }
    renderPaymentsTab();
}

function buildHistorySectionHtml(debt) {

    const history = debt.history || [];
    const isExpanded = expandedHistoryLenders.has(debt.lender);

    if (history.length === 0) {
        return `<div class="history-section"><span class="history-empty">No history logged yet</span></div>`;
    }

    const toggleLabel = isExpanded ? "Hide" : "Show";
    const lenderEscaped = debt.lender.replace(/'/g, "\\'");

    const entries = isExpanded
        ? `<div class="history-list">${history.map(h => {
            const dateLabel = new Date(h.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
            const isDown = h.direction === "down";
            const typeLabel = h.type === "payment" ? "➖ Payment"
                : h.type === "charge" ? "➕ Charge"
                : (isDown ? "✏️ Adjusted Down" : "✏️ Adjusted Up");
            return `
<div class="history-entry">
    <span class="history-date">${dateLabel}</span>
    <span class="history-type ${h.type}">${typeLabel}</span>
    <span class="history-amount ${isDown ? "payment" : "charge"}">${isDown ? "-" : "+"}£${h.amount.toFixed(2)}</span>
    <span class="history-balance">→ £${h.balanceAfter.toFixed(2)}</span>
</div>`;
        }).join("")}</div>`
        : "";

    return `
<div class="history-section">
    <button class="history-toggle" onclick="toggleHistory('${lenderEscaped}')">📜 ${toggleLabel} History (${history.length})</button>
    ${entries}
</div>`;
}

function renderPaymentsTab() {

    const container = document.getElementById("paymentsList");
    if (!container) return;

    if (debts.length === 0) {
        container.innerHTML = `<p style="color:var(--muted);">Add a debt first to start logging payments.</p>`;
        return;
    }

    container.innerHTML = debts.map((debt, index) => {

        const historySection = buildHistorySectionHtml(debt);

        if (debt.balance <= 0.01) {
            return `
<div class="payment-row">
    <div class="payment-row-info">
        <h4>💳 ${debt.lender}</h4>
        <span class="payment-row-balance">🎉 Paid off</span>
    </div>
    <div class="payment-row-action">
        <input
            type="number"
            min="0"
            step="1"
            class="payment-input"
            id="paymentInput-${index}"
            placeholder="Amount">
        <button class="log-charge-btn" onclick="logCharge(${index})">➕ Log Charge</button>
    </div>
    ${historySection}
</div>`;
        }

        return `
<div class="payment-row">
    <div class="payment-row-info">
        <h4>💳 ${debt.lender}</h4>
        <span class="payment-row-balance">Balance: £${debt.balance.toFixed(2)}</span>
    </div>
    <div class="payment-row-action">
        <input
            type="number"
            min="0"
            step="1"
            class="payment-input"
            id="paymentInput-${index}"
            placeholder="£${getGuaranteedPayment(debt).toFixed(2)}">
        <button class="log-payment-btn" onclick="logPayment(${index})">➖ Payment</button>
        <button class="log-charge-btn" onclick="logCharge(${index})">➕ Charge</button>
    </div>
    ${historySection}
</div>`;
    }).join("");
}

// Appends a record to the debt's history — newest first, so the list
// doesn't need reversing when it's rendered. direction is "down" for
// anything that reduced the balance, "up" for anything that grew it.
function recordHistory(debt, type, direction, amount) {
    if (!Array.isArray(debt.history)) debt.history = [];
    debt.history.unshift({
        date: new Date().toISOString(),
        type,
        direction,
        amount,
        balanceAfter: debt.balance
    });
}

function logPayment(index) {

    const input = document.getElementById(`paymentInput-${index}`);
    const amount = Number(input.value);

    if (!amount || amount <= 0) {
        alert("Enter a payment amount greater than £0.");
        return;
    }

    const debt = debts[index];
    const wasActive = debt.balance > 0.01;
    debt.balance = Math.max(0, debt.balance - amount);
    const justPaidOff = wasActive && debt.balance <= 0.01;

    recordHistory(debt, "payment", "down", amount);

    saveDebts();
    renderDebts();
    updateSummary();

    if (justPaidOff) celebrateDebtPaidOff();
}

// The other direction from logPayment — a new purchase, a missed
// payment's fee, whatever added to the balance instead of reducing it.
function logCharge(index) {

    const input = document.getElementById(`paymentInput-${index}`);
    const amount = Number(input.value);

    if (!amount || amount <= 0) {
        alert("Enter a charge amount greater than £0.");
        return;
    }

    const debt = debts[index];
    debt.balance += amount;

    recordHistory(debt, "charge", "up", amount);

    saveDebts();
    renderDebts();
    updateSummary();
}
