let debts = [];
let editingIndex = null;

// A loan's payment isn't chosen — it's the fixed amount that exactly
// clears the principal over the given term at the given rate. Falls
// back to a plain equal split for a 0% loan, since the standard
// formula divides by zero at monthlyRate === 0.
function calculateLoanPayment(principal, apr, termMonths) {
    const monthlyRate = (apr / 100) / 12;
    if (monthlyRate === 0) return principal / termMonths;
    return principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)
        / (Math.pow(1 + monthlyRate, termMonths) - 1);
}

function addDebt() {

    const debtType = document.getElementById("debtType").value;
    const isLoan = debtType === "loan";

    const lender = document.getElementById("lender").value;
    const balance = Number(document.getElementById("balance").value);
    const apr = Number(document.getElementById("apr").value);
    const termMonths = Number(document.getElementById("termMonths").value);

    const limit = Number(document.getElementById("limit").value);
    const minimumRaw = document.getElementById("minimum").value;

    const minPercentRaw = document.getElementById("minPercent").value;
    const promoAprRaw = document.getElementById("promoApr").value;
    const promoEndDateRaw = document.getElementById("promoEndDate").value;
    const fixedPaymentRaw = document.getElementById("fixedPayment").value;

    if (!lender || balance <= 0 || apr < 0) {
        shakeForm();
        alert("Please complete every field.");
        return;
    }

    if (isLoan) {
        if (termMonths <= 0) {
            shakeForm();
            alert("Enter a loan term in months.");
            return;
        }
    } else {
        if (limit <= 0 || Number(minimumRaw) <= 0) {
            shakeForm();
            alert("Please complete every field.");
            return;
        }
        if (fixedPaymentRaw !== "" && Number(fixedPaymentRaw) < Number(minimumRaw)) {
            shakeForm();
            alert("Fixed payment can't be less than the minimum payment.");
            return;
        }
    }

    // A real loan's payment is fixed at origination — correcting the
    // balance later (or just re-saving) shouldn't quietly re-amortize
    // it lower. Only recalculate when the loan is brand new, converting
    // from a card, or the APR/term itself changed (i.e. an actual
    // refinance), otherwise keep whatever payment was already set.
    let loanMinimum;
    if (isLoan) {
        const existing = editingIndex !== null ? debts[editingIndex] : null;
        const isRefinance = !existing || existing.type !== "loan"
            || Number(existing.apr) !== apr || Number(existing.termMonths) !== termMonths;
        loanMinimum = isRefinance ? calculateLoanPayment(balance, apr, termMonths) : existing.minimum;
    }

    const debt = isLoan
        ? {
            lender, balance, apr,
            type: "loan",
            termMonths,
            minimum: loanMinimum,
            limit: null, minPercent: null, promoApr: null, promoEndDate: null, fixedPayment: null
        }
        : {
            lender, balance, apr,
            type: "card",
            termMonths: null,
            limit,
            minimum: Number(minimumRaw),
            minPercent: minPercentRaw !== "" ? Number(minPercentRaw) : null,
            // Promo fields are optional — both must be filled in for a
            // promo to apply, otherwise the card just uses its normal APR.
            promoApr: (promoAprRaw !== "" && promoEndDateRaw !== "") ? Number(promoAprRaw) : null,
            promoEndDate: (promoAprRaw !== "" && promoEndDateRaw !== "") ? promoEndDateRaw : null,
            fixedPayment: fixedPaymentRaw !== "" ? Number(fixedPaymentRaw) : null
        };

    if (editingIndex === null) {
        debt.history = [];
        if (isLoan) debt.originalPrincipal = balance;
        debts.push(debt);
    } else {
        const existing = debts[editingIndex];
        debt.history = existing.history || [];

        // The original loan amount is a fixed reference point for the
        // "paid off so far" progress bar — keep it from before rather
        // than resetting it every time the loan is edited.
        if (isLoan) {
            debt.originalPrincipal = (existing.type === "loan" && existing.originalPrincipal)
                ? existing.originalPrincipal
                : balance;
        }

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
    const isLoan = debt.type === "loan";

    document.getElementById("debtType").value = isLoan ? "loan" : "card";
    document.getElementById("lender").value = debt.lender;
    document.getElementById("balance").value = debt.balance;
    document.getElementById("apr").value = debt.apr;
    document.getElementById("termMonths").value = debt.termMonths || "";
    document.getElementById("limit").value = debt.limit || "";
    document.getElementById("minimum").value = isLoan ? "" : debt.minimum;
    document.getElementById("minPercent").value = (debt.minPercent !== null && debt.minPercent !== undefined) ? debt.minPercent : "";
    document.getElementById("promoApr").value = (debt.promoApr !== null && debt.promoApr !== undefined) ? debt.promoApr : "";
    document.getElementById("promoEndDate").value = debt.promoEndDate || "";
    document.getElementById("fixedPayment").value = (debt.fixedPayment !== null && debt.fixedPayment !== undefined) ? debt.fixedPayment : "";
    toggleDebtTypeFields();

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

// Whether a promo is configured AND still within its window at a
// given point in time. Deliberately independent of whether promoApr
// and apr happen to differ numerically — a card can legitimately have
// both set to 0%, and it should still count as "on a promo" right up
// until the end date, not just while the two rates differ.
function isPromoCurrentlyActive(debt, monthsFromNow = 0) {

    const hasPromo = (debt.promoApr !== null && debt.promoApr !== undefined && debt.promoApr !== "")
        && !!debt.promoEndDate;

    if (!hasPromo) return false;

    const today = new Date();
    const checkDate = new Date(today.getFullYear(), today.getMonth() + monthsFromNow, 1);
    const promoEnd = new Date(debt.promoEndDate);

    return checkDate < promoEnd;
}

// Returns the APR that actually applies to a debt at a given point in
// time. monthsFromNow = 0 means "this month"; simulations pass higher
// offsets to check whether a promo will still be active N months from
// now. Falls back to the normal APR if no promo is set, or once the
// promo end date has passed.
function getEffectiveApr(debt, monthsFromNow = 0) {
    return isPromoCurrentlyActive(debt, monthsFromNow) ? Number(debt.promoApr) : Number(debt.apr);
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
