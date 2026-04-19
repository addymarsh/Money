(function () {
  var list = document.getElementById("advice-list");
  if (!list) return;

  var posts = window.MoneyApp.getAdvicePosts();
  list.innerHTML = "";

  if (!posts.length) {
    var empty = document.createElement("p");
    empty.className = "advice-empty";
    empty.textContent = "When people complete a goal and share a tip, it shows up here.";
    list.appendChild(empty);
    return;
  }

  posts.forEach(function (p) {
    var wrap = document.createElement("div");
    wrap.className = "test";
    var userEl = document.createElement("div");
    userEl.className = "user";
    userEl.textContent = p.user || "Someone";
    var textEl = document.createElement("div");
    textEl.className = "text";
    textEl.textContent = p.text || "";
    wrap.appendChild(userEl);
    wrap.appendChild(textEl);
    list.appendChild(wrap);
  });
})();
