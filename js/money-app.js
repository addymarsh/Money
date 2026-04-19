(function () {
  "use strict";

  var USERS_KEY = "moneyAppUsers";
  var POSTS_KEY = "moneyAppAdvicePosts";
  var SESSION_KEY = "moneyAppSession";

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
  }

  function getSession() {
    return localStorage.getItem(SESSION_KEY);
  }

  function setSession(username) {
    if (username) localStorage.setItem(SESSION_KEY, username);
    else localStorage.removeItem(SESSION_KEY);
  }

  function getUsers() {
    return readJson(USERS_KEY, {});
  }

  function saveUserRecord(username, record) {
    var users = getUsers();
    users[username] = record;
    writeJson(USERS_KEY, users);
  }

  function getUser(username) {
    return getUsers()[username] || null;
  }

  function signup(username, password) {
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
    u.savedAmount = u.savedAmount || 0;
    saveUserRecord(username, u);
    return { ok: true };
  }

  function addSavings(username, amountRaw) {
    var add = parseMoney(amountRaw);
    if (!isFinite(add) || add <= 0) return { ok: false, message: "Enter a positive amount." };
    var u = getUser(username);
    if (!u || u.targetAmount == null) return { ok: false, message: "No goal set." };
    u.savedAmount = Math.round(((u.savedAmount || 0) + add) * 100) / 100;
    saveUserRecord(username, u);
    var done = u.savedAmount >= u.targetAmount;
    return { ok: true, done: done };
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
    getAdvicePosts: getAdvicePosts,
    addAdvicePost: addAdvicePost,
    formatMoney: formatMoney,
    daysBetween: daysBetween,
    parseMoney: parseMoney,
    parseStoredGoalDate: parseStoredGoalDate,
  };
})();
