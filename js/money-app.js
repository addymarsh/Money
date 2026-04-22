(function () {
  "use strict";

  var USERS_KEY = "moneyAppUsers";
  var POSTS_KEY = "moneyAppAdvicePosts";
  var SESSION_KEY = "moneyAppSession";
  var EXPECT_ZERO_PREFIX = "moneyApp:expectZeroSaved:";
  var MIRROR_PREFIX = "MoneyAppM1|";

  function isFileProtocol() {
    return typeof location !== "undefined" && location.protocol === "file:";
  }

  function normalizeUsername(username) {
    return username == null ? "" : String(username).trim();
  }

  function loadMirrorState() {
    try {
      var n = window.name;
      if (!n || n.indexOf(MIRROR_PREFIX) !== 0) return null;
      return JSON.parse(n.substring(MIRROR_PREFIX.length));
    } catch (e) {
      return null;
    }
  }

  function saveMirrorState(m) {
    try {
      window.name = MIRROR_PREFIX + JSON.stringify(m);
    } catch (e) {}
  }

  function mirrorPatchKeyValue(key, value) {
    if (!isFileProtocol()) return;
    var m = loadMirrorState() || {};
    if (value === null || value === undefined) delete m[key];
    else m[key] = value;
    saveMirrorState(m);
  }

  /**
   * file:/// uses a separate localStorage per HTML file. Keep one copy in
   * window.name (per tab) and merge both ways on each load so index, figures,
   * and other share the same users + session.
   */
  function mergeMirrorBidirectional() {
    if (!isFileProtocol()) return;
    var m = loadMirrorState() || {};
    function persistMirror() {
      saveMirrorState(m);
    }

    function mergeJsonKey(key) {
      var loc = localStorage.getItem(key);
      var mir = m[key];
      if (loc == null && mir != null) {
        localStorage.setItem(key, JSON.stringify(mir));
      }
      loc = localStorage.getItem(key);
      if (loc != null) {
        try {
          m[key] = JSON.parse(loc);
        } catch (e) {}
      }
    }

    function mergeStringKey(key) {
      var loc = localStorage.getItem(key);
      var mir = m[key];
      if (loc == null && mir != null) {
        localStorage.setItem(key, String(mir));
      }
      loc = localStorage.getItem(key);
      if (loc != null) {
        m[key] = loc;
      }
    }

    mergeJsonKey(USERS_KEY);
    mergeJsonKey(POSTS_KEY);
    mergeStringKey(SESSION_KEY);

    Object.keys(m).forEach(function (key) {
      if (key.indexOf(EXPECT_ZERO_PREFIX) !== 0) return;
      var loc = localStorage.getItem(key);
      var mir = m[key];
      if (loc == null && mir != null) localStorage.setItem(key, String(mir));
      loc = localStorage.getItem(key);
      if (loc != null) m[key] = loc;
    });
    Object.keys(localStorage).forEach(function (key) {
      if (key.indexOf(EXPECT_ZERO_PREFIX) !== 0) return;
      if (m[key] == null && localStorage.getItem(key) != null) {
        m[key] = localStorage.getItem(key);
      }
    });

    persistMirror();
  }

  mergeMirrorBidirectional();

  if (isFileProtocol() && !window.__moneyAppFileProtoNoted) {
    window.__moneyAppFileProtoNoted = true;
    console.info(
      "Money app (file://): savings data is synced across pages in this tab via window.name. Use a local HTTP server if you open multiple tabs or still see wrong balances."
    );
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    mirrorPatchKeyValue(key, value);
  }

  function getSession() {
    var raw = localStorage.getItem(SESSION_KEY);
    return raw ? normalizeUsername(raw) : null;
  }

  function setSession(username) {
    var u = normalizeUsername(username);
    if (u) localStorage.setItem(SESSION_KEY, u);
    else localStorage.removeItem(SESSION_KEY);
    mirrorPatchKeyValue(SESSION_KEY, u || null);
  }

  function getUsers() {
    return readJson(USERS_KEY, {});
  }

  function saveUserRecord(username, record) {
    var key = normalizeUsername(username);
    if (!key) return;
    var users = getUsers();
    users[key] = JSON.parse(JSON.stringify(record));
    writeJson(USERS_KEY, users);
  }

  function getUser(username) {
    var key = normalizeUsername(username);
    if (!key) return null;
    return getUsers()[key] || null;
  }

  function signup(username, password) {
    username = normalizeUsername(username);
    if (!username || !password) return { ok: false, message: "Enter username and password." };
    var users = getUsers();
    if (users[username]) return { ok: false, message: "That username is taken." };
    users[username] = {
      password: password,
      targetAmount: null,
      targetDate: null,
      savedAmount: 0,
    };
    writeJson(USERS_KEY, users);
    return { ok: true };
  }

  function login(username, password) {
    var u = getUser(username);
    if (!u || u.password !== password) return { ok: false, message: "Invalid username or password." };
    return { ok: true };
  }

  function hasActiveGoal(username) {
    var u = getUser(username);
    return !!(u && u.targetAmount != null && u.targetDate);
  }

  function parseMoney(str) {
    if (str == null) return NaN;
    var n = parseFloat(String(str).replace(/[^0-9.]/g, ""));
    return n;
  }

  function parseLocalDateYMD(str) {
    var parts = String(str || "").trim().split("-");
    if (parts.length !== 3) return null;
    var y = Number(parts[0]);
    var m = Number(parts[1]);
    var day = Number(parts[2]);
    if (!y || !m || !day) return null;
    return new Date(y, m - 1, day);
  }

  function saveGoal(username, amountRaw, dateRaw) {
    var amount = parseMoney(amountRaw);
    var dateStr = String(dateRaw || "").trim();
    if (!isFinite(amount) || amount <= 0) return { ok: false, message: "Enter a valid savings amount." };
    if (!dateStr) return { ok: false, message: "Enter when you need the money." };
    var d = parseLocalDateYMD(dateStr);
    if (!d || isNaN(d.getTime())) return { ok: false, message: "Enter a valid date." };
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    if (d < today) return { ok: false, message: "Pick a future date." };
    var u = getUser(username);
    if (!u) return { ok: false, message: "Session expired. Log in again." };
    u.targetAmount = Math.round(amount * 100) / 100;
    u.targetDate = dateStr;
    u.savedAmount = 0;
    saveUserRecord(username, u);
    var check = getUser(username);
    if (check && Number(check.savedAmount) !== 0) {
      check.savedAmount = 0;
      saveUserRecord(username, check);
    }
    return { ok: true };
  }

  function markExpectSavedZeroAfterGoalSet(username) {
    try {
      var key = normalizeUsername(username);
      if (!key) return;
      var flagKey = EXPECT_ZERO_PREFIX + key;
      localStorage.setItem(flagKey, "1");
      mirrorPatchKeyValue(flagKey, "1");
    } catch (e) {}
  }

  function applyExpectSavedZeroAfterGoalSet(username) {
    var key = normalizeUsername(username);
    if (!key) return;
    var flagKey = EXPECT_ZERO_PREFIX + key;
    var on = localStorage.getItem(flagKey);
    if (on !== "1" && isFileProtocol()) {
      var m = loadMirrorState();
      if (m && m[flagKey] === "1") {
        localStorage.setItem(flagKey, "1");
      }
    }
    if (localStorage.getItem(flagKey) !== "1") return;
    localStorage.removeItem(flagKey);
    mirrorPatchKeyValue(flagKey, null);
    var u = getUser(key);
    if (!u) return;
    u.savedAmount = 0;
    saveUserRecord(key, u);
  }

  function resetSavedAmount(username) {
    var key = normalizeUsername(username);
    if (!key) return { ok: false, message: "No user." };
    var u = getUser(key);
    if (!u) return { ok: false, message: "User not found." };
    u.savedAmount = 0;
    saveUserRecord(key, u);
    return { ok: true };
  }

  function addSavings(username, amountRaw) {
    var add = parseMoney(amountRaw);
    if (!isFinite(add) || add <= 0) return { ok: false, message: "Enter a positive amount." };
    var u = getUser(username);
    if (!u || u.targetAmount == null) return { ok: false, message: "No goal set." };
    var cap = Number(u.targetAmount);
    if (!isFinite(cap) || cap < 0) cap = 0;
    var prev = Number(u.savedAmount);
    if (!isFinite(prev) || prev < 0) prev = 0;
    var next = Math.round((prev + add) * 100) / 100;
    if (next > cap) next = cap;
    u.savedAmount = next;
    saveUserRecord(username, u);
    var done = u.savedAmount >= u.targetAmount;
    return { ok: true, done: done };
  }

  /**
   * Saved higher than the current goal happens after lowering the goal or old
   * bugs that kept prior savings. Reset savings to 0 so the new goal starts clean.
   */
  function repairSavedIfExceedsTarget(username) {
    var u = getUser(username);
    if (!u || u.targetAmount == null) return;
    var target = Number(u.targetAmount);
    var saved = Number(u.savedAmount);
    if (!isFinite(target) || target <= 0 || !isFinite(saved)) return;
    if (saved > target) {
      u.savedAmount = 0;
      saveUserRecord(username, u);
    }
  }

  function completeGoalAndClear(username) {
    var u = getUser(username);
    if (!u) return;
    u.targetAmount = null;
    u.targetDate = null;
    u.savedAmount = 0;
    saveUserRecord(username, u);
  }

  function getAdvicePosts() {
    return readJson(POSTS_KEY, []);
  }

  function addAdvicePost(username, text) {
    var t = String(text || "").trim();
    if (!t) return { ok: false, message: "Write something to share." };
    var posts = getAdvicePosts();
    posts.unshift({
      user: username,
      text: t,
      at: new Date().toISOString(),
    });
    writeJson(POSTS_KEY, posts);
    return { ok: true };
  }

  function formatMoney(n) {
    if (!isFinite(n)) return "$0";
    return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function daysBetween(from, to) {
    var a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    var b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    var ms = b - a;
    return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
  }

  function parseStoredGoalDate(dateStr) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) {
      return parseLocalDateYMD(dateStr);
    }
    var d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  window.MoneyApp = {
    getSession: getSession,
    setSession: setSession,
    signup: signup,
    login: login,
    hasActiveGoal: hasActiveGoal,
    getUser: getUser,
    saveGoal: saveGoal,
    addSavings: addSavings,
    completeGoalAndClear: completeGoalAndClear,
    repairSavedIfExceedsTarget: repairSavedIfExceedsTarget,
    markExpectSavedZeroAfterGoalSet: markExpectSavedZeroAfterGoalSet,
    applyExpectSavedZeroAfterGoalSet: applyExpectSavedZeroAfterGoalSet,
    resetSavedAmount: resetSavedAmount,
    getAdvicePosts: getAdvicePosts,
    addAdvicePost: addAdvicePost,
    formatMoney: formatMoney,
    daysBetween: daysBetween,
    parseMoney: parseMoney,
    parseStoredGoalDate: parseStoredGoalDate,
  };
})();
