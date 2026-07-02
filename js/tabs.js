/* =========================================
   Debt Manager — tabs.js
========================================= */

function switchTab(name) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));

    document.getElementById(`tab-${name}`).classList.add("active");
    document.querySelector(`.tab-btn[data-tab="${name}"]`).classList.add("active");
}
