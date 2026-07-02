/* =========================================
   Debt Manager — advisor.js
   A small, honest "which card should this go
   on" calculator. No AI involved — just the
   same APR/available-credit/promo data
   already in the app, applied to a
   hypothetical purchase.
========================================= */

function getPurchaseAdvice(amount) {

    if (debts.length === 0) {
        return { status: "no-debts" };
    }

    const candidates = debts
        .filter(d => d.type !== "loan") // a loan isn't something you can just "put a purchase on"
        .map(d => ({
            debt: d,
            availableCredit: Math.max(0, Number(d.limit || 0) - Number(d.balance)),
            effectiveApr: getEffectiveApr(d, 0),
            hasPromo: isPromoCurrentlyActive(d, 0)
        }))
        .filter(c => c.availableCredit >= amount);

    if (candidates.length === 0) {
        return { status: "no-room" };
    }

    // Prefer an active 0%-style promo first (genuinely free short-term
    // borrowing), then whichever has the lowest ongoing APR.
    candidates.sort((a, b) => {
        if (a.hasPromo !== b.hasPromo) return a.hasPromo ? -1 : 1;
        return a.effectiveApr - b.effectiveApr;
    });

    const best = candidates[0];
    const monthlyInterestCost = amount * (best.effectiveApr / 100 / 12);

    return { status: "ok", amount, best, monthlyInterestCost };
}

function renderPurchaseAdvice() {

    const amount = Number(document.getElementById("purchaseAmount").value);
    const container = document.getElementById("purchaseAdviceResult");

    if (!amount || amount <= 0) {
        container.innerHTML = `<p class="advisor-result">Enter an amount above £0 first.</p>`;
        return;
    }

    const advice = getPurchaseAdvice(amount);

    if (advice.status === "no-debts") {
        container.innerHTML = `<p class="advisor-result">Add a card first — nothing to compare yet.</p>`;
        return;
    }

    if (advice.status === "no-room") {
        container.innerHTML = `<p class="advisor-result">None of your cards have £${amount.toFixed(2)} of available credit right now.</p>`;
        return;
    }

    const { best, monthlyInterestCost } = advice;

    const reason = best.hasPromo
        ? `it's still on its 0% promo, so this wouldn't cost you anything in interest until that ends`
        : `it has the lowest rate of what you've got, at ${best.effectiveApr}% APR`;

    container.innerHTML = `
<p class="advisor-result">
    Honestly, adding £${amount.toFixed(2)} of new spending while you're paying down debt isn't a great idea.
    But if you're going to, put it on <strong>${best.debt.lender}</strong> — ${reason}.
    ${best.hasPromo ? "" : `Left unpaid, that's roughly <strong>£${monthlyInterestCost.toFixed(2)}/month</strong> in extra interest.`}
</p>`;
}
