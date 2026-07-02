/* =========================================
   Debt Manager — ui.js
========================================= */

function renderDebts() {

    const container = document.getElementById("debts");
    let html = "";

    debts.forEach((debt, index) => {

        const effectiveApr = getEffectiveApr(debt, 0);
        const isPromoActive = effectiveApr !== Number(debt.apr);

        const utilisation = debt.limit > 0 ? (debt.balance / debt.limit) * 100 : 0;
        const availableCredit = Math.max(0, debt.limit - debt.balance);
        const monthlyInterest = (debt.balance * (effectiveApr / 100)) / 12;
        const progressWidth = Math.min(utilisation, 100);

        let progressColour, healthText, healthIcon;

        if (utilisation < 30) {
            progressColour = "#00A650"; healthText = "Healthy"; healthIcon = "🟢";
        } else if (utilisation < 75) {
            progressColour = "#FFB800"; healthText = "Moderate"; healthIcon = "🟡";
        } else {
            progressColour = "#E10600"; healthText = "High Utilisation"; healthIcon = "🔴";
        }

        const promoEndLabel = isPromoActive
            ? new Date(debt.promoEndDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
            : "";

        const aprLine = isPromoActive
            ? `${effectiveApr}% APR <span style="color:var(--accent);">· 0% promo till ${promoEndLabel}</span>`
            : `${debt.apr}% APR`;

        html += `
<div class="debt-card">

    <div class="debt-top">
        <div>
            <h3>💳 ${debt.lender}</h3>
            <p style="margin-top:6px;color:var(--muted);font-family:var(--font-mono);">${aprLine}</p>
        </div>
        <div class="debt-actions">
            <button class="edit-btn" onclick="editDebt(${index})">✏️</button>
            <button class="delete-btn" onclick="deleteDebt(${index})">🗑️</button>
        </div>
    </div>

    <div style="margin:28px 0;">
        <div style="color:var(--muted);margin-bottom:8px;font-family:var(--font-display);text-transform:uppercase;letter-spacing:.5px;font-size:.85rem;">Current Balance</div>
        <div style="font-size:2rem;font-weight:700;font-family:var(--font-mono);">£${debt.balance.toFixed(2)}</div>
    </div>

    <div class="progress">
        <div class="progress-fill" style="width:${progressWidth}%;background:${progressColour};"></div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:10px;margin-bottom:24px;font-family:var(--font-display);">
        <span>${utilisation.toFixed(1)}% Utilised</span>
        <strong>${healthIcon} ${healthText}</strong>
    </div>

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
            <span>Minimum Payment</span>
            <strong>£${debt.minimum.toFixed(2)}</strong>
        </div>
        ${debt.fixedPayment ? `
        <div class="plan-stat" style="grid-column:1 / -1;">
            <span>🔒 Fixed Payment</span>
            <strong>£${Number(debt.fixedPayment).toFixed(2)}/mo</strong>
        </div>` : ""}
    </div>

</div>`;

    });

    container.innerHTML = html;
}

function clearForm() {
    document.getElementById("lender").value = "";
    document.getElementById("balance").value = "";
    document.getElementById("apr").value = "";
    document.getElementById("limit").value = "";
    document.getElementById("minimum").value = "";
    document.getElementById("promoApr").value = "";
    document.getElementById("promoEndDate").value = "";
    document.getElementById("fixedPayment").value = "";
}
