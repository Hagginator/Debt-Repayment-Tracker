window.onload = function () {
    loadDebts();
    renderDebts();
    updateSummary();

    const savedSettings = loadBudgetSettings();
    if (savedSettings) {
        if (savedSettings.budget) document.getElementById("monthlyBudget").value = savedSettings.budget;
        if (savedSettings.strategy) document.getElementById("strategy").value = savedSettings.strategy;
    }

    document.getElementById("monthlyBudget").addEventListener("input", persistBudgetSettings);
    document.getElementById("strategy").addEventListener("change", persistBudgetSettings);
};

function persistBudgetSettings() {
    const budget = document.getElementById("monthlyBudget").value;
    const strategy = document.getElementById("strategy").value;
    saveBudgetSettings(budget, strategy);
}
