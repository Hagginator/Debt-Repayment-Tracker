function calculatePlan() {

    const budget = Number(document.getElementById("monthlyBudget").value);
    const strategy = document.getElementById("strategy").value;

    if (budget <= 0) {
        alert("Enter a monthly repayment budget.");
        return;
    }

    if (debts.length === 0) {
        alert("Add at least one debt.");
        return;
    }

    let workingDebts = debts.map(debt => ({ ...debt }));

    if (strategy === "avalanche") {

        workingDebts.sort((a, b) => b.apr - a.apr);

    } else if (strategy === "snowball") {

        workingDebts.sort((a, b) => a.balance - b.balance);

    }

    // Calculate this month's payments

    let totalMinimum = 0;

    workingDebts.forEach(debt => {

        totalMinimum += debt.minimum;

    });

    if (budget < totalMinimum) {

        alert("Budget is less than your total minimum payments.");

        return;

    }

    let extraPayment = budget - totalMinimum;

    let paymentPlan = workingDebts.map((debt, index) => ({

        lender: debt.lender,

        minimum: debt.minimum,

        extra: index === 0 ? extraPayment : 0,

        total: debt.minimum + (index === 0 ? extraPayment : 0)

    }));

    // Long-term simulation

    let simulation = workingDebts.map(debt => ({ ...debt }));

    let months = 0;
    let totalInterest = 0;

    while (true) {

        let remainingDebt = simulation.reduce(
            (sum, debt) => sum + Math.max(0, debt.balance),
            0
        );

        if (remainingDebt <= 0.01)
            break;

        months++;

        simulation.forEach(debt => {

            if (debt.balance <= 0)
                return;

            const interest =
                debt.balance * (debt.apr / 100) / 12;

            debt.balance += interest;

            totalInterest += interest;

        });

        simulation.forEach((debt, index) => {

            if (debt.balance <= 0)
                return;

            let payment = debt.minimum;

            if (index === 0)
                payment += extraPayment;

            payment = Math.min(payment, debt.balance);

            debt.balance -= payment;

        });

        if (months > 600)
            break;

    }

    const debtFreeDate = new Date();

    debtFreeDate.setMonth(
        debtFreeDate.getMonth() + months
    );

    let html = `

        <div class="plan-card">

            <h3>💳 Payments This Month</h3>

    `;

    paymentPlan.forEach(plan => {

        html += `

            <div class="plan-row">

                <div>

                    <strong>${plan.lender}</strong><br>

                    Minimum £${plan.minimum.toFixed(2)}<br>

                    Extra £${plan.extra.toFixed(2)}

                </div>

                <div>

                    <strong>

                        £${plan.total.toFixed(2)}

                    </strong>

                </div>

            </div>

        `;

    });

    html += `

        <hr style="margin:25px 0;border-color:#334155;">

        <h3>📈 Long-Term Projection</h3>

        <div class="plan-row">

            <span>Debt Free In</span>

            <strong>${months} months</strong>

        </div>

        <div class="plan-row">

            <span>Estimated Debt Free</span>

            <strong>

                ${debtFreeDate.toLocaleString("default", {
                    month: "long",
                    year: "numeric"
                })}

            </strong>

        </div>

        <div class="plan-row">

            <span>Total Interest</span>

            <strong>

                £${totalInterest.toFixed(2)}

            </strong>

        </div>

    </div>

    `;

    document.getElementById("repaymentPlan").innerHTML = html;

}