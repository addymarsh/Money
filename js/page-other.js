(function () {
  var BILL_SRC = "dollar%20bill.svg";

  function playBillConfetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    var layer = document.createElement("div");
    layer.className = "confetti-layer";
    layer.setAttribute("aria-hidden", "true");
    var count = 38;
    var maxMs = 0;
    for (var i = 0; i < count; i++) {
      var img = document.createElement("img");
      img.src = BILL_SRC;
      img.alt = "";
      img.className = "confetti-bill";
      var dur = 2 + Math.random() * 1.75;
      var delay = Math.random() * 0.4;
      maxMs = Math.max(maxMs, (dur + delay) * 1000);
      img.style.setProperty("--left", Math.random() * 100 + "%");
      img.style.setProperty("--size", 26 + Math.random() * 40 + "px");
      img.style.setProperty("--dur", dur + "s");
      img.style.setProperty("--delay", delay + "s");
      img.style.setProperty("--drift", (Math.random() - 0.5) * 300 + "px");
      img.style.setProperty("--twist", 360 + Math.random() * 900 + "deg");
      layer.appendChild(img);
    }
    document.body.appendChild(layer);
    window.setTimeout(function () {
      if (layer.parentNode) {
        layer.parentNode.removeChild(layer);
      }
    }, maxMs + 300);
  }

  var u = window.MoneyApp.getSession();
  if (!u) {
    window.location.href = "index.html";
    return;
  }

  var user = window.MoneyApp.getUser(u);
  if (!user || user.targetAmount == null || !user.targetDate) {
    window.location.href = "figures.html";
    return;
  }

  var timeEl = document.querySelector(".time");
  var goalEl = document.querySelector(".goal");
  var moneyEl = document.querySelector(".money");
  var barEl = document.querySelector(".bar");
  var barFill = document.querySelector(".bar-fill");
  var form = document.getElementById("savings-form");
  var addInput = document.getElementById("add-amount");

  function refresh() {
    user = window.MoneyApp.getUser(u);
    if (!user || user.targetAmount == null) {
      window.location.href = "figures.html";
      return;
    }
    var target = user.targetAmount;
    var saved = user.savedAmount || 0;
    var end = window.MoneyApp.parseStoredGoalDate(user.targetDate) || new Date(user.targetDate);
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    var days = window.MoneyApp.daysBetween(now, end);
    var remaining = Math.max(0, target - saved);
    var pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;

    if (timeEl) {
      timeEl.textContent =
        days === 1
          ? "1 day left to reach your goal!"
          : days + " days left to reach your goal!";
    }

    var monthsLeft = Math.max(
      1,
      Math.ceil(days / 30) || 1
    );
    var perMonth = remaining / monthsLeft;

    if (goalEl) {
      if (remaining <= 0) {
        goalEl.textContent = "You hit $" + target.toLocaleString() + " — nice work!";
      } else {
        goalEl.textContent =
          "Save about " +
          window.MoneyApp.formatMoney(perMonth) +
          " / month to reach " +
          window.MoneyApp.formatMoney(target) +
          " by " +
          end.toLocaleDateString() +
          "!";
      }
    }

    if (moneyEl) {
      moneyEl.textContent =
        window.MoneyApp.formatMoney(saved) + " / " + window.MoneyApp.formatMoney(target);
    }

    if (barFill) {
      barFill.style.width = pct + "%";
    }
    if (barEl) {
      barEl.setAttribute("aria-valuenow", String(Math.round(pct)));
      barEl.setAttribute("aria-valuetext", window.MoneyApp.formatMoney(saved) + " of " + window.MoneyApp.formatMoney(target));
    }

    if (saved >= target) {
      window.location.href = "congratulations.html";
    }
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = document.getElementById("savings-error");
      var r = window.MoneyApp.addSavings(u, addInput ? addInput.value : "");
      if (!r.ok) {
        if (err) {
          err.textContent = r.message;
          err.hidden = false;
        }
        return;
      }
      if (err) err.hidden = true;
      if (addInput) addInput.value = "";
      playBillConfetti();
      if (r.done) {
        var waitMs = window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 2600;
        window.setTimeout(function () {
          window.location.href = "congratulations.html";
        }, waitMs);
      } else {
        refresh();
      }
    });
  }

  refresh();
})();
