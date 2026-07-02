function saveDebts() {
    localStorage.setItem("debts", JSON.stringify(debts));
}

function loadDebts() {
    const savedDebts = localStorage.getItem("debts");
    if (savedDebts) debts = JSON.parse(savedDebts);
}

function saveBudgetSettings(budget, strategy) {
    localStorage.setItem("budgetSettings", JSON.stringify({ budget, strategy }));
}

function loadBudgetSettings() {
    const saved = localStorage.getItem("budgetSettings");
    return saved ? JSON.parse(saved) : null;
}
