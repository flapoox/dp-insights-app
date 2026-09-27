/* Starts the app: asks for the PIN once, fetches data from the Apps Script feed,
   keeps a copy for offline use, then runs the dashboard (app.js). */
(function () {
  var API = (window.DP_CONFIG || {}).api;
  var K_PIN = 'dp-pin', K_DATA = 'dp-data';
  var gate = document.getElementById('gate'), form = document.getElementById('gateForm');
  var pinEl = document.getElementById('pin'), btn = document.getElementById('gateBtn');
  var err = document.getElementById('gateErr'), msg = document.getElementById('gateMsg');
  var wrap = document.querySelector('.wrap');
  var started = false;

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function del(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function showGate(text, isErr) {
    wrap.style.visibility = 'hidden';
    gate.hidden = false; form.hidden = false;
    pinEl.style.display = ''; btn.style.display = ''; btn.disabled = false; btn.textContent = 'Open';
    msg.textContent = 'Enter your PIN to open the dashboard.';
    err.textContent = isErr ? text : '';
    if (!isErr && text) msg.textContent = text;
    setTimeout(function () { pinEl.focus(); }, 50);
  }
  function showLoading() {
    wrap.style.visibility = 'hidden';
    gate.hidden = false; pinEl.style.display = 'none'; btn.style.display = 'none'; err.textContent = '';
    msg.innerHTML = 'Loading your latest numbers…<div class="spin"></div>';
  }
  function run(data, note) {
    if (started) return;
    started = true;
    window.DP_DATA = data;
    gate.hidden = true; wrap.style.visibility = '';
    var s = document.createElement('script');
    s.src = 'app.js';
    s.onload = function () {
      if (note) {
        var n = document.getElementById('syncNote');
        if (n) n.insertAdjacentHTML('beforeend', '<span style="color:var(--warn)"> ' + note + '</span>');
      }
    };
    document.body.appendChild(s);
  }
  function fetchData(pin) {
    return fetch(API, { method: 'POST', body: JSON.stringify({ pin: pin }), redirect: 'follow' })
      .then(function (r) { return r.json(); });
  }
  // Changes (pause, budget, boost) go to the same script; it checks the viewing PIN and the Action PIN.
  window.DP_ACTION = function (payload) {
    return fetch(API, { method: 'POST', body: JSON.stringify(Object.assign({ pin: get(K_PIN) }, payload)), redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .catch(function () { return { error: 'net', message: 'No internet connection. Nothing was changed.' }; });
  };
  function lastSync(d) { return d && d.lastSync && d.lastSync.time || ''; }

  function load(pin, fromGate) {
    var cached = null;
    try { cached = JSON.parse(get(K_DATA) || 'null'); } catch (e) {}
    if (cached && !fromGate) run(cached); else showLoading();
    fetchData(pin).then(function (res) {
      if (res && res.ok) {
        set(K_PIN, pin);
        var fresh = lastSync(res.data) !== lastSync(cached);
        set(K_DATA, JSON.stringify(res.data));
        if (!started) run(res.data);
        else if (fresh) location.reload();
        return;
      }
      var code = res && res.error;
      if (code === 'badpin') { del(K_PIN); del(K_DATA); if (started) return location.reload(); return showGate('Wrong PIN. Please try again.', true); }
      if (started) return;
      showGate((res && res.message) || 'Could not load data.', true);
    }).catch(function () {
      if (started) {
        var n = document.getElementById('syncNote');
        if (n) n.insertAdjacentHTML('beforeend', '<span style="color:var(--warn)"> Offline: showing the last saved data.</span>');
        return;
      }
      showGate('Could not connect. Check your internet and try again.', true);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var pin = pinEl.value.trim();
    if (pin.length < 6) { err.textContent = 'PIN has at least 6 characters.'; return; }
    btn.disabled = true; btn.textContent = 'Checking…';
    load(pin, true);
  });
  document.getElementById('refreshBtn').addEventListener('click', function () { location.reload(); });
  document.getElementById('lockBtn').addEventListener('click', function () { del(K_PIN); del(K_DATA); location.reload(); });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});

  /* ---- "Update available" pop-up, like store apps ----
     The site publishes version.json. If it is newer than the version this screen was loaded with,
     show a banner; "Update" clears the offline copy and reloads the newest version. */
  var CURRENT = (document.querySelector('meta[name="app-version"]') || {}).content || '0';
  function newer(a, b) { var x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (var i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; }
  function checkForUpdate() {
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (v) {
      if (!v || !newer(v.version, CURRENT)) return;
      if (get('dp-skip-version') === v.version) return;
      document.getElementById('updTitle').textContent = 'Update available · v' + v.version;
      document.getElementById('updSub').textContent = "What's new:";
      document.getElementById('updNotes').innerHTML = (v.notes || []).slice(0, 5).map(function (n) {
        return '<li>' + String(n).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + '</li>'; }).join('');
      document.getElementById('updBar').hidden = false;
    }).catch(function () {});
  }
  document.getElementById('updGo').addEventListener('click', function () {
    var btn = this; btn.textContent = 'Updating…'; btn.disabled = true;
    var done = function () { location.reload(); };
    Promise.all([
      window.caches ? caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }) : null,
      navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.update(); })); }) : null
    ]).then(done, done);
  });
  document.getElementById('updLater').addEventListener('click', function () {
    document.getElementById('updBar').hidden = true;   // asks again next time the app opens
  });
  setTimeout(function () { var f = document.querySelector('.footer'); if (f && f.textContent.indexOf('App v') < 0) f.insertAdjacentHTML('beforeend', ' · App v' + CURRENT); }, 1500);
  setTimeout(checkForUpdate, 3000);
  setInterval(checkForUpdate, 30 * 60 * 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) checkForUpdate(); });

  var pin = get(K_PIN);
  if (!API || API.indexOf('__') === 0) return showGate('App is not connected yet.', true);
  if (pin) load(pin, false); else showGate();
})();
