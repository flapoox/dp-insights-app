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

  var pin = get(K_PIN);
  if (!API || API.indexOf('__') === 0) return showGate('App is not connected yet.', true);
  if (pin) load(pin, false); else showGate();
})();
