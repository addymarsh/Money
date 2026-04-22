(function () {
  "use strict";

  function run() {
    var overlay = document.getElementById("page-splash");
    if (!overlay) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var fadeMs = reduceMotion ? 0 : 450;
    overlay.style.setProperty("--splash-fade-ms", fadeMs + "ms");

    function removeOverlay() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      try {
        window.dispatchEvent(new CustomEvent("moneyAppSplashDismissed"));
      } catch (err) {}
    }

    function dismiss() {
      overlay.classList.add("page-splash--out");
      if (fadeMs === 0) {
        removeOverlay();
        return;
      }
      overlay.addEventListener(
        "transitionend",
        function (e) {
          if (e.target !== overlay || e.propertyName !== "opacity") return;
          removeOverlay();
        },
        { once: true }
      );
    }

    window.setTimeout(dismiss, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
