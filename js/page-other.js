(function () {
  var BILL_SRC = "dollar%20bill.svg";
  var goalCompleteRedirectScheduled = false;
  var PROGRESS_ART_QS = "?v=5";

  function toMoneyNumber(raw) {
    if (raw == null || raw === "") return NaN;
    if (typeof raw === "number" && isFinite(raw)) return raw;
    return window.MoneyApp.parseMoney(raw);
  }

  var P1 = 100 / 6;
  var P2 = 200 / 6;
  var P3 = 50;
  var P4 = 400 / 6;
  var P5 = 500 / 6;

  /**
   * Same percentage as the progress bar: (saved/target)*100.
   * Thresholds: ≤16⅔%, ≤33⅓%, ≤50%, ≤66⅔%, ≤83⅓%, then six until 100%.
   */
  function progressArtFromPct(pct) {
    var p = Number(pct);
    if (!isFinite(p)) p = 0;
    if (p < 0) p = 0;
    if (p > 100) p = 100;
    if (p >= 100) return "congrats.svg";
    if (p <= P1) return "one.svg";
    if (p <= P2) return "two.svg";
    if (p <= P3) return "three.svg";
    if (p <= P4) return "four.svg";
    if (p <= P5) return "five.svg";
    return "six.svg";
  }

  function progressArtUrl(filename) {
    var base = filename.indexOf("?") >= 0 ? filename : filename + PROGRESS_ART_QS;
    return base;
  }

  function updateProgressArt(saved, target) {
    var img =
      document.getElementById("goal-progress-image") ||
      document.querySelector(".picture img.picture__art");
    if (!img) return;
    var t = Number(target);
    var s = Number(saved);
    if (!isFinite(s) || s < 0) s = 0;
    if (Math.abs(s) < 1e-6) s = 0;
    if (!isFinite(t) || t <= 0) {
      img.src = progressArtUrl("one.svg");
      return;
    }
    if (s >= t) {
      img.src = progressArtUrl("congrats.svg");
      return;
    }
    if (!(s > 0)) {
      img.src = progressArtUrl("one.svg");
      return;
    }
    var pct = Math.min(100, Math.max(0, (s / t) * 100));
    img.src = progressArtUrl(progressArtFromPct(pct));
  }

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
    window.MoneyApp.applyExpectSavedZeroAfterGoalSet(u);
    window.MoneyApp.repairSavedIfExceedsTarget(u);
    user = window.MoneyApp.getUser(u);
    var target = toMoneyNumber(user.targetAmount);
    var saved = toMoneyNumber(user.savedAmount);
    if (!isFinite(saved) || saved < 0) saved = 0;
    saved = Math.round(saved * 100) / 100;
    if (Math.abs(saved) < 1e-6) saved = 0;
    if (!isFinite(target) || target <= 0) {
      window.location.href = "figures.html";
      return;
    }
    var end = window.MoneyApp.parseStoredGoalDate(user.targetDate) || new Date(user.targetDate);
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    var days = window.MoneyApp.daysBetween(now, end);
    var remaining = Math.max(0, target - saved);
    var pct = Math.min(100, Math.max(0, (saved / target) * 100));

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

    updateProgressArt(saved, target);
    window.requestAnimationFrame(function () {
      updateProgressArt(saved, target);
    });

    if (saved >= target && !goalCompleteRedirectScheduled) {
      goalCompleteRedirectScheduled = true;
      var waitComplete = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 2600;
      window.setTimeout(function () {
        window.location.href = "congratulations.html";
      }, waitComplete);
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
        var doneUser = window.MoneyApp.getUser(u);
        var dt = doneUser ? Number(doneUser.targetAmount) : 0;
        var ds = doneUser ? Number(doneUser.savedAmount) : 0;
        updateProgressArt(ds, dt);
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

  window.addEventListener("moneyAppSplashDismissed", function () {
    refresh();
  });

  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted) refresh();
  });

  refresh();
})();
