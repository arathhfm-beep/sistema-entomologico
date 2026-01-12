
document.addEventListener("DOMContentLoaded", () => {
  const btnGeosis = qs("#conectarBtn");
  if (btnGeosis) btnGeosis.addEventListener("click", manejarConectar);

  const btnSin = qs("#conectarBtnSin");
  if (btnSin) btnSin.addEventListener("click", conectarSin);


  const darkBtn = qs("#darkToggle");
  if (darkBtn) {
    darkBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      darkBtn.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
    });
  }
});

// Tabs
function showTab(tab) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
  document.getElementById(tab).classList.add("active");
  if (tab === "geosis") document.querySelectorAll(".tab-btn")[0].classList.add("active");
  else document.querySelectorAll(".tab-btn")[1].classList.add("active");
}
