(function () {
  var u = window.MoneyApp.getSession();
  if (!u) {
    window.location.href = "index.html";
    return;
  }

  var user = window.MoneyApp.getUser(u);
  if (!user || user.targetAmount == null || (user.savedAmount || 0) < user.targetAmount) {
    window.location.href = "other.html";
    return;
  }

  var form = document.getElementById("congrats-form");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ta = document.getElementById("advice-post");
    var err = document.getElementById("congrats-error");
    var text = ta ? ta.value : "";
    var r = window.MoneyApp.addAdvicePost(u, text);
    if (!r.ok) {
      if (err) {
        err.textContent = r.message;
        err.hidden = false;
      }
      return;
    }
    window.MoneyApp.completeGoalAndClear(u);
    window.location.href = "advice.html";
  });
})();
