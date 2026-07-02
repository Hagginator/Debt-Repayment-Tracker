// Animates a summary card's number counting up/down from whatever it
// currently displays to the new value, rather than just snapping to it.
function animateNumber(elementId, targetValue, format) {

    const el = document.getElementById(elementId);
    if (!el) return;

    const startValue = parseFloat(el.textContent.replace(/[^0-9.-]/g, "")) || 0;

    if (Math.abs(targetValue - startValue) < 0.01) {
        el.textContent = format(targetValue);
        return;
    }

    const duration = 500;
    const startTime = performance.now();

    function frame(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        el.textContent = format(startValue + (targetValue - startValue) * eased);

        if (progress < 1) requestAnimationFrame(frame);
        else el.textContent = format(targetValue);
    }

    requestAnimationFrame(frame);
}

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

    animateNumber("totalDebt", totalDebt, v => "£" + v.toFixed(2));
    animateNumber("monthlyInterest", totalMonthlyInterest, v => "£" + v.toFixed(2));
    animateNumber("creditLimit", totalCreditLimit, v => "£" + v.toFixed(2));
    animateNumber("utilisation", utilisation, v => v.toFixed(1) + "%");
    animateNumber("minimumPayments", totalMinimumPayments, v => "£" + v.toFixed(2));

    if (debts.length === 0) {
        document.getElementById("debtFree").textContent = "--";
    }

    const utilisationCard = document.getElementById("utilisation").parentElement;
    utilisationCard.classList.remove("util-green", "util-amber", "util-red");

    if (utilisation < 30) {
        utilisationCard.classList.add("util-green");
    } else if (utilisation < 50) {
        utilisationCard.classList.add("util-amber");
    } else {
        utilisationCard.classList.add("util-red");
    }
}
