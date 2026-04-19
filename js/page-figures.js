(function () {
  var u = window.MoneyApp.getSession();
  if (!u) {
    window.location.href = "index.html";
    return;
  }
  if (window.MoneyApp.hasActiveGoal(u)) {
    window.location.href = "other.html";
    return;
  }

  var whenInput = document.getElementById("whent");
  if (whenInput) {
    whenInput.min = new Date().toISOString().slice(0, 10);
  }

  var form = document.getElementById("figures-form");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var amount = (document.getElementById("needed") || {}).value;
    var when = (document.getElementById("whent") || {}).value;
    var err = document.getElementById("figures-error");
    var r = window.MoneyApp.saveGoal(u, amount, when);
    if (!r.ok) {
      if (err) {
        err.textContent = r.message;
        err.hidden = false;
      }
      return;
    }
    window.location.href = "other.html";
  });
})();
