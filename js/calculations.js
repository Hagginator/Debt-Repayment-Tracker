function updateSummary() {

    let totalDebt = 0;
    let totalMonthlyInterest = 0;
    let totalCreditLimit = 0;
    let totalMinimumPayments = 0;

    debts.forEach(debt => {
        totalDebt += debt.balance;
        totalCreditLimit += debt.limit || 0;
        totalMinimumPayments += debt.minimum;
        totalMonthlyInterest += (debt.balance * (getEffectiveApr(debt, 0) / 100)) / 12;
    });

    const utilisation = totalCreditLimit > 0
        ? (totalDebt / totalCreditLimit) * 100
        : 0;

    document.getElementById("totalDebt").textContent = "£" + totalDebt.toFixed(2);
    document.getElementById("monthlyInterest").textContent = "£" + totalMonthlyInterest.toFixed(2);
    document.getElementById("creditLimit").textContent = "£" + totalCreditLimit.toFixed(2);
    document.getElementById("utilisation").textContent = utilisation.toFixed(1) + "%";
    document.getElementById("minimumPayments").textContent = "£" + totalMinimumPayments.toFixed(2);

    if (debts.length === 0) {
        document.getElementById("debtFree").textContent = "--";
    }

    const utilisationCard = document.getElementById("utilisation").parentElement;
    utilisationCard.classList.remove("util-green", "util-amber", "util-red");

    if (utilisation < 30) {
        utilisationCard.classList.add("util-green");
    } else if (utilisation < 75) {
        utilisationCard.classList.add("util-amber");
    } else {
        utilisationCard.classList.add("util-red");
    }
}
