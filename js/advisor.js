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

// Tiered by amount, mildest first — each tier has a few opening lines
// so it doesn't say the exact same thing every time. The actual card
// recommendation underneath is always the same accurate calculation;
// only the tone of the opener changes.
const PURCHASE_ADVICE_TIERS = [
    {
        max: 100,
        openers: [
            "Honestly? £{amount} isn't going to break anything.",
            "A bit silly, but fine — £{amount} won't derail much.",
            "Look, £{amount} is hardly the crime of the century.",
            "£{amount}? Go ahead, it's not exactly a big deal."
        ]
    },
    {
        max: 300,
        openers: [
            "That's not nothing — £{amount} is worth a second thought.",
            "£{amount} while you're paying down debt is a bit cheeky, but okay.",
            "I'd think twice about £{amount}, but it's not the end of the world.",
            "£{amount} isn't ideal, but it won't wreck your plan on its own."
        ]
    },
    {
        max: 700,
        openers: [
            "£{amount}? That's a real dent — I'd sit on this one.",
            "Genuinely, £{amount} is a lot to add right now.",
            "£{amount} is the kind of purchase that undoes weeks of progress.",
            "I wouldn't. £{amount} is a significant step backwards."
        ]
    },
    {
        max: Infinity,
        openers: [
            "Absolutely not. £{amount} is a genuinely bad idea right now.",
            "No — £{amount} would seriously set you back.",
            "£{amount}? That's a hard no from me.",
            "Please don't. £{amount} is real money you're already short on."
        ]
    }
];

function pickPurchaseOpener(amount) {
    const tier = PURCHASE_ADVICE_TIERS.find(t => amount <= t.max);
    const template = tier.openers[Math.floor(Math.random() * tier.openers.length)];
    return template.replace("{amount}", amount.toFixed(2));
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
    ${pickPurchaseOpener(amount)}
    But if you're going to, put it on <strong>${best.debt.lender}</strong> — ${reason}.
    ${best.hasPromo ? "" : `Left unpaid, that's roughly <strong>£${monthlyInterestCost.toFixed(2)}/month</strong> in extra interest.`}
</p>`;
}
