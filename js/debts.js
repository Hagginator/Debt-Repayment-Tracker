let debts = [];
let editingIndex = null;

function addDebt() {

    const lender = document.getElementById("lender").value;
    const balance = Number(document.getElementById("balance").value);
    const apr = Number(document.getElementById("apr").value);
    const limit = Number(document.getElementById("limit").value);
    const minimum = Number(document.getElementById("minimum").value);

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

    const debt = { lender, balance, apr, limit, minimum, promoApr, promoEndDate, fixedPayment };

    if (editingIndex === null) {
        debts.push(debt);
    } else {
        debts[editingIndex] = debt;
        editingIndex = null;
        document.getElementById("addDebtButton").textContent = "Add Debt";
    }

    saveDebts();
    renderDebts();
    updateSummary();
    clearForm();
}

function deleteDebt(index) {
    debts.splice(index, 1);
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
    document.getElementById("promoApr").value = (debt.promoApr !== null && debt.promoApr !== undefined) ? debt.promoApr : "";
    document.getElementById("promoEndDate").value = debt.promoEndDate || "";
    document.getElementById("fixedPayment").value = (debt.fixedPayment !== null && debt.fixedPayment !== undefined) ? debt.fixedPayment : "";

    editingIndex = index;
    document.getElementById("addDebtButton").textContent = "Save Changes";
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

// The amount that's actually guaranteed to be paid on this debt every
// month: the fixed payment if one's been set (and it's always at
// least the minimum), otherwise just the minimum.
function getGuaranteedPayment(debt) {
    return Math.max(Number(debt.minimum), Number(debt.fixedPayment) || 0);
}
