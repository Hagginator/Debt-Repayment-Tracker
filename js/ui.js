function renderDebts() {

    const container = document.getElementById("debts");

    container.innerHTML = "";

    debts.forEach((debt, index) => {

        const utilisation = debt.limit > 0
            ? (debt.balance / debt.limit) * 100
            : 0;
            const monthlyInterest = (debt.balance * (debt.apr / 100)) / 12;

        const progressWidth = Math.min(utilisation, 100);

        const utilisationColour =
            utilisation < 30 ? "#22C55E" :
            utilisation < 75 ? "#F59E0B" :
            "#EF4444";

        container.innerHTML += `

        <div class="debt-card">

            <div class="debt-top">

                <h3>${debt.lender}</h3>

                <div class="debt-actions">

                    <button
                        class="edit-btn"
                        onclick="editDebt(${index})">

                        ✏ Edit Account

                    </button>

                    <button
                        class="delete-btn"
                        onclick="deleteDebt(${index})">

                        🗑 Delete

                    </button>

                </div>

            </div>

            <div class="debt-numbers">

                <span>Balance</span>
                <strong>£${debt.balance.toFixed(2)}</strong>

                <span>Credit Limit</span>
                <strong>£${(debt.limit || 0).toFixed(2)}</strong>

            </div>

            <div class="progress">

                <div
                    class="progress-fill"
                    style="
                        width:${progressWidth}%;
                        background:${utilisationColour};
                    ">
                </div>

            </div>

            <p class="utilisation-text">

                ${utilisation.toFixed(1)}% Utilised

            </p>

           <div class="debt-footer">

    <span>APR ${debt.apr}%</span>

    <span>Minimum £${debt.minimum.toFixed(2)}</span>

</div>

<div class="debt-footer">

    <span>Monthly Interest</span>

    <strong>£${monthlyInterest.toFixed(2)}</strong>

</div>

        </div>

        `;

    });

}

function clearForm() {

    document.getElementById("lender").value = "";
    document.getElementById("balance").value = "";
    document.getElementById("apr").value = "";
    document.getElementById("limit").value = "";
    document.getElementById("minimum").value = "";

}