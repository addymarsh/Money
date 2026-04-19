(function () {
  var form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var user = (document.getElementById("username") || {}).value || "";
    var pass = (document.getElementById("password") || {}).value || "";
    var err = document.getElementById("login-error");
    var r = window.MoneyApp.login(user.trim(), pass);
    if (!r.ok) {
      if (err) {
        err.textContent = r.message;
        err.hidden = false;
      }
      return;
    }
    window.MoneyApp.setSession(user.trim());
    if (window.MoneyApp.hasActiveGoal(user.trim())) {
      window.location.href = "other.html";
    } else {
      window.location.href = "figures.html";
    }
  });
})();
