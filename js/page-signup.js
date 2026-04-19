(function () {
  var form = document.getElementById("signup-form");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var user = (document.getElementById("username") || {}).value || "";
    var pass = (document.getElementById("password") || {}).value || "";
    var err = document.getElementById("signup-error");
    var r = window.MoneyApp.signup(user.trim(), pass);
    if (!r.ok) {
      if (err) {
        err.textContent = r.message;
        err.hidden = false;
      }
      return;
    }
    window.MoneyApp.setSession(user.trim());
    window.location.href = "figures.html";
  });
})();
