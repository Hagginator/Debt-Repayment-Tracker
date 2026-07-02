let debts = [];
let editingIndex = null;

function addDebt() {

    const lender = document.getElementById("lender").value;
    const balance = Number(document.getElementById("balance").value);
    const apr = Number(document.getElementById("apr").value);
    const limit = Number(document.getElementById("limit").value);
    const minimum = Number(document.getElementById("minimum").value);

    const minPercentRaw = document.getElementById("minPercent").value;
    const promoAprRaw = document.getElementById("promoApr").value;
    const promoEndDateRaw = document.getElementById("promoEndDate").value;
    const fixedPaymentRaw = document.getElementById("fixedPayment").value;

    if (!lender || balance <= 0 || apr < 0 || limit <= 0 || minimum <= 0) {
        alert("Please complete every field.");
        return;
    }

    if (fixedPaymentRaw !== "" && Number(fixedPaymentRaw) < minimum) {
        alert("Fixed payment can't be less than the minimum payment.");
        return;
    }

    // Promo fields are optional — both must be filled in for a promo
    // to apply, otherwise the card just uses its normal APR.
    const promoApr = (promoAprRaw !== "" && promoEndDateRaw !== "") ? Number(promoAprRaw) : null;
    const promoEndDate = (promoAprRaw !== "" && promoEndDateRaw !== "") ? promoEndDateRaw : null;
    const fixedPayment = fixedPaymentRaw !== "" ? Number(fixedPaymentRaw) : null;
    const minPercent = minPercentRaw !== "" ? Number(minPercentRaw) : null;

    const debt = { lender, balance, apr, limit, minimum, minPercent, promoApr, promoEndDate, fixedPayment };

    if (editingIndex === null) {
        debt.history = [];
        debts.push(debt);
    } else {
        const existing = debts[editingIndex];
        debt.history = existing.history || [];

        // If the balance was changed by hand (rather than via Log
        // Payment/Charge), record it too — otherwise the history trail
        // would silently disagree with the debt's actual balance.
        const delta = balance - existing.balance;
        if (Math.abs(delta) > 0.005) {
            recordHistory(debt, "adjustment", delta > 0 ? "up" : "down", Math.abs(delta));
        }

        debts[editingIndex] = debt;
    }

    exitEditMode();

    saveDebts();
    renderDebts();
    updateSummary();
    clearForm();
}

function deleteDebt(index) {

    const debt = debts[index];
    if (!confirm(`Delete ${debt.lender}? This can't be undone.`)) return;

    debts.splice(index, 1);

    // Deleting the debt currently being edited would otherwise leave
    // the form stuck in "Save Changes" mode pointing at a stale index.
    if (editingIndex === index) {
        exitEditMode();
        clearForm();
    } else if (editingIndex !== null && index < editingIndex) {
        editingIndex--;
    }

    renderDebts();
    updateSummary();
    saveDebts();
}

function editDebt(index) {

    const debt = debts[index];

    document.getElementById("lender").value = debt.lender;
    document.getElementById("balance").value = debt.balance;
    document.getElementById("apr").value = debt.apr;
    document.getElementById("limit").value = debt.limit;
    document.getElementById("minimum").value = debt.minimum;
    document.getElementById("minPercent").value = (debt.minPercent !== null && debt.minPercent !== undefined) ? debt.minPercent : "";
    document.getElementById("promoApr").value = (debt.promoApr !== null && debt.promoApr !== undefined) ? debt.promoApr : "";
    document.getElementById("promoEndDate").value = debt.promoEndDate || "";
    document.getElementById("fixedPayment").value = (debt.fixedPayment !== null && debt.fixedPayment !== undefined) ? debt.fixedPayment : "";

    editingIndex = index;
    document.getElementById("addDebtButton").textContent = "Save Changes";
    document.getElementById("cancelEditButton").classList.remove("hidden");
}

function cancelEdit() {
    exitEditMode();
    clearForm();
}

function exitEditMode() {
    editingIndex = null;
    document.getElementById("addDebtButton").textContent = "Add Debt";
    document.getElementById("cancelEditButton").classList.add("hidden");
}

// Returns the APR that actually applies to a debt at a given point in
// time. monthsFromNow = 0 means "this month"; simulations pass higher
// offsets to check whether a promo will still be active N months from
// now. Falls back to the normal APR if no promo is set, or once the
// promo end date has passed.
function getEffectiveApr(debt, monthsFromNow = 0) {

    const hasPromo = (debt.promoApr !== null && debt.promoApr !== undefined && debt.promoApr !== "")
        && !!debt.promoEndDate;

    if (!hasPromo) return Number(debt.apr);

    const today = new Date();
    const checkDate = new Date(today.getFullYear(), today.getMonth() + monthsFromNow, 1);
    const promoEnd = new Date(debt.promoEndDate);

    return checkDate < promoEnd ? Number(debt.promoApr) : Number(debt.apr);
}

// Most real cards require the GREATER of a flat amount or a % of the
// current balance — and because that's balance-based, it shrinks as
// the balance does. minPercent is optional; without it, the minimum
// just stays whatever flat amount was entered, as before.
function getEffectiveMinimum(debt) {
    if (debt.minPercent === null || debt.minPercent === undefined || debt.minPercent === "") {
        return Number(debt.minimum);
    }
    const percentBased = Number(debt.balance) * (Number(debt.minPercent) / 100);
    return Math.max(Number(debt.minimum), percentBased);
}

// The amount that's actually guaranteed to be paid on this debt every
// month: the fixed payment if one's been set (and it's always at
// least the minimum), otherwise just the (possibly %-based) minimum.
function getGuaranteedPayment(debt) {
    return Math.max(getEffectiveMinimum(debt), Number(debt.fixedPayment) || 0);
}
