const PI = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAxSImYF1Y59oVy4ibDufy3Z0y_GjH2O_fzkP2MPs-0ZhYc8I_D7rRE_5_jz5Q_P3wTfvu66FzrMkciP4wZIORmZiGDvp5H9YuVs5wWn7MsVuZTSKtyVTnDu70UOV3TJ3vQddzkayc2CtWMM2y0uyVP--4inxQkldErPw__l5-MYaDmOcMIP6GVmA9klXociDJkSH8_-eVJBfTnAHAbRp8FeGPJbIkiXyv5hOv_Rb5OcRs4KzTk7oGsLE1MvFafxLT3KxGYvAx5RbI';
let map, marker, curPage = 'home', history = JSON.parse(localStorage.getItem('dn_history') || '[]');
let favorites = JSON.parse(localStorage.getItem('dn_favorites') || '{}');
let darkMode = localStorage.getItem('dn_dark') === 'true';
const mainNav = ['home', 'map', 'history', 'utilities', 'profile'];
const authPages = ['login', 'signup'];

// ── Auth State Management ──
function getAuthState() {
  try { return JSON.parse(localStorage.getItem('dn_auth') || 'null'); } catch (e) { return null; }
}
function setAuthState(user) {
  localStorage.setItem('dn_auth', JSON.stringify(user));
}
function clearAuthState() {
  localStorage.removeItem('dn_auth');
}
function isLoggedIn() {
  return !!getAuthState();
}
function getCurrentUser() {
  return getAuthState();
}

// ── User Database (SharedPreferences pattern) ──
function getUsersDB() {
  try { return JSON.parse(localStorage.getItem('dn_users') || '{}'); } catch (e) { return {}; }
}
function saveUsersDB(db) {
  localStorage.setItem('dn_users', JSON.stringify(db));
}
function registerUser(username, password) {
  let db = getUsersDB();
  let key = username.toLowerCase();
  if (db[key]) return { success: false, error: 'Username already taken' };
  db[key] = { username: username, password: btoa(password), createdAt: new Date().toISOString() };
  saveUsersDB(db);
  return { success: true };
}
function authenticateUser(username, password) {
  let db = getUsersDB();
  let key = username.toLowerCase();
  if (!db[key]) return { success: false, error: 'Account not found. Please sign up first.' };
  if (db[key].password !== btoa(password)) return { success: false, error: 'Incorrect password. Please try again.' };
  return { success: true, user: db[key] };
}

// ── Password Strength Checker ──
function checkPasswordStrength(pwd) {
  let score = 0;
  let checks = { length: false, upper: false, number: false, special: false };
  if (pwd.length >= 8) { score++; checks.length = true; }
  if (/[A-Z]/.test(pwd)) { score++; checks.upper = true; }
  if (/[0-9]/.test(pwd)) { score++; checks.number = true; }
  if (/[^A-Za-z0-9]/.test(pwd)) { score++; checks.special = true; }
  let labels = ['Weak', 'Fair', 'Good', 'Strong'];
  let icons = ['warning', 'info', 'thumb_up', 'verified'];
  return { score: Math.min(score, 3), label: labels[Math.min(score, 3)], icon: icons[Math.min(score, 3)], checks };
}
function updatePasswordStrength(inputId, meterId) {
  let pwd = document.getElementById(inputId).value;
  let meter = document.getElementById(meterId);
  if (!meter) return;
  if (!pwd) { meter.classList.remove('visible'); return; }
  meter.classList.add('visible');
  let s = checkPasswordStrength(pwd);
  let bars = meter.querySelector('.pwd-strength-bars');
  let label = meter.querySelector('.pwd-strength-label');
  let tips = meter.querySelector('.pwd-strength-tips');
  bars.className = 'pwd-strength-bars str-' + s.score;
  label.className = 'pwd-strength-label str-' + s.score;
  label.innerHTML = `<span class="material-symbols-outlined mi" style="font-size:14px">${s.icon}</span>${s.label}`;
  tips.innerHTML =
    `<span class="${s.checks.length ? 'pass' : 'fail'}"><span class="material-symbols-outlined mi" style="font-size:12px">${s.checks.length ? 'check_circle' : 'cancel'}</span>8+ chars</span>` +
    `<span class="${s.checks.upper ? 'pass' : 'fail'}"><span class="material-symbols-outlined mi" style="font-size:12px">${s.checks.upper ? 'check_circle' : 'cancel'}</span>Uppercase</span>` +
    `<span class="${s.checks.number ? 'pass' : 'fail'}"><span class="material-symbols-outlined mi" style="font-size:12px">${s.checks.number ? 'check_circle' : 'cancel'}</span>Number</span>` +
    `<span class="${s.checks.special ? 'pass' : 'fail'}"><span class="material-symbols-outlined mi" style="font-size:12px">${s.checks.special ? 'check_circle' : 'cancel'}</span>Special char</span>`;
}

// ── Protected pages (require auth) ──
const protectedPages = ['home', 'map', 'history', 'utilities', 'iplookup', 'domaintoip', 'ipvalidator', 'networkinfo'];

// ── Toast notifications ──
function showToast(msg, type = 'success') {
  let existing = document.querySelector('.toast');
  if (existing) existing.remove();
  let t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── CAPTCHA system ──
let currentCaptcha = '';
function generateCaptcha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 5; i++)c += chars[Math.floor(Math.random() * chars.length)];
  currentCaptcha = c;
  return c;
}

const hdr = (t) => `<header class="hdr"><div class="flex justify-between items-center px-6 py-4"><div class="flex items-center gap-3"><span class="material-symbols-outlined mi text-white">explore</span><h1 class="font-bold text-lg text-white">${t}</h1></div><img class="w-10 h-10 rounded-full border-2 border-white/20" src="${PI}"></div></header>`;
const thdr = (t, back = 'utilities') => `<header class="thdr"><button onclick="nav('${back}')" class="text-white p-2 rounded-full hover:bg-white/10 mr-2"><span class="material-symbols-outlined mi">arrow_back</span></button><h1 class="text-white text-lg font-bold">${t}</h1><div class="flex-1"></div><button class="text-white p-2 rounded-full hover:bg-white/10"><span class="material-symbols-outlined mi">info</span></button></header>`;

function applyDarkMode() {
  let app = document.getElementById('app');
  if (darkMode) { app.classList.add('dark'); document.documentElement.classList.add('dark'); }
  else { app.classList.remove('dark'); document.documentElement.classList.remove('dark'); }
}
function toggleDark() {
  darkMode = !darkMode;
  localStorage.setItem('dn_dark', darkMode);
  applyDarkMode();
  let btn = document.getElementById('dark-toggle');
  if (btn) {
    let dot = btn.querySelector('div');
    if (darkMode) { btn.classList.remove('bg-[#e0e3e6]'); btn.classList.add('bg-blue-600'); dot.style.transform = 'translateX(24px)'; }
    else { btn.classList.remove('bg-blue-600'); btn.classList.add('bg-[#e0e3e6]'); dot.style.transform = 'translateX(0)'; }
  }
}

function nav(p) {
  // Auth guard: if trying to access protected page while not logged in, redirect to login
  if (protectedPages.includes(p) && !isLoggedIn()) {
    showToast('Please login to access this feature', 'error');
    p = 'login';
  }

  // Re-render auth-dependent pages each time
  if (p === 'login') document.getElementById('page-login').innerHTML = pages.login();
  if (p === 'signup') document.getElementById('page-signup').innerHTML = pages.signup();
  if (p === 'profile') { document.getElementById('page-profile').innerHTML = pages.profile(); }

  document.querySelectorAll('.page').forEach(e => e.classList.remove('active'));
  document.getElementById('page-' + p).classList.add('active');
  let np = mainNav.includes(p) ? p : 'utilities';
  document.querySelectorAll('.ni').forEach(e => {
    let isA = e.dataset.p === np;
    e.classList.toggle('active', isA);
    e.querySelector('span:first-child').className = 'material-symbols-outlined ' + (isA ? 'mf' : 'mi');
  });

  // Hide bottom nav on auth screens
  let bnav = document.getElementById('bnav');
  if (authPages.includes(p)) {
    bnav.style.display = 'none';
  } else {
    bnav.style.display = '';
  }

  curPage = p;
  if (p === 'map') initMap();
  if (p === 'networkinfo') loadNetInfo();
  if (p === 'home') loadHomeIp();
  if (p === 'history') renderHistory();
  if (p === 'profile') renderFavorites();
  if (p === 'signup') {
    generateCaptcha();
    let captchaEl = document.getElementById('captcha-display');
    if (captchaEl) captchaEl.textContent = currentCaptcha.split('').join(' ');
  }
  document.getElementById('page-' + p).scrollTop = 0;
  window.scrollTo(0, 0);
}

async function api(url) { try { let r = await fetch(url); return await r.json(); } catch (e) { return { error: e.message }; } }

function addHistory(ip, data) {
  let entry = { ip, city: data.city || 'Unknown', country: data.country_name || 'Unknown', lat: data.latitude, lon: data.longitude, isp: data.connection?.isp || 'Unknown', time: new Date().toLocaleString() };
  history.unshift(entry); if (history.length > 20) history.pop();
  localStorage.setItem('dn_history', JSON.stringify(history));
}

// ── Favorites ──
function toggleFav(ip) {
  if (favorites[ip]) { delete favorites[ip]; }
  else { favorites[ip] = { note: '', time: new Date().toLocaleString() }; }
  localStorage.setItem('dn_favorites', JSON.stringify(favorites));
  renderHistory();
}
function openNoteModal(ip) {
  let existing = favorites[ip]?.note || '';
  let overlay = document.createElement('div');
  overlay.className = 'note-modal-overlay';
  overlay.id = 'note-modal';
  overlay.innerHTML = `<div class="note-modal"><div class="flex items-center justify-between mb-4"><h3 class="font-bold text-lg">Edit Note</h3><button onclick="closeNoteModal()" class="p-1 rounded-full hover:bg-gray-100"><span class="material-symbols-outlined mi">close</span></button></div><p class="text-xs t-secondary mb-2 font-semibold">${ip}</p><textarea id="note-text" class="w-full border-none rounded-xl p-3 text-sm resize-none h-28 focus:ring-2 focus:ring-blue-400" style="background:var(--bg-input);color:var(--text-primary)" placeholder="Add a note for this IP...">${existing}</textarea><button onclick="saveNote('${ip}')" class="btn-primary w-full py-3 mt-3 text-sm shadow-lg shadow-blue-600/20">Save Note</button></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeNoteModal(); });
}
function closeNoteModal() { let m = document.getElementById('note-modal'); if (m) m.remove(); }
function saveNote(ip) {
  let text = document.getElementById('note-text').value;
  if (!favorites[ip]) favorites[ip] = { note: '', time: new Date().toLocaleString() };
  favorites[ip].note = text;
  localStorage.setItem('dn_favorites', JSON.stringify(favorites));
  closeNoteModal();
  renderHistory();
  renderFavorites();
}

async function trackIp() {
  let ip = document.getElementById('home-ip').value.trim(); if (!ip) return;
  document.getElementById('home-track-btn').textContent = 'Tracking...';
  let d = await api('/api/lookup/' + ip);
  if (d && !d.error && d.ip) {
    document.getElementById('home-ip-val').textContent = d.ip;
    document.getElementById('home-loc').textContent = (d.city || 'Unknown') + ', ' + (d.country_name || 'Unknown');
    document.getElementById('home-isp').textContent = d.connection?.isp || 'Unknown ISP';
    document.getElementById('home-coords').textContent = 'Lat: ' + (d.latitude || 0) + ' | Long: ' + (d.longitude || 0);
    addHistory(d.ip, d); renderRecent();
  }
  document.getElementById('home-track-btn').textContent = 'Track Now';
}

// ── Auto-load user's real IP on home dashboard ──
async function loadHomeIp() {
  try {
    let r = await fetch('https://api.ipify.org?format=json');
    let j = await r.json();
    let ip = j.ip;
    if (ip) {
      document.getElementById('home-ip-val').textContent = ip;
      let d = await api('/api/lookup/' + ip);
      if (d && !d.error) {
        document.getElementById('home-loc').textContent = (d.city || 'Unknown') + ', ' + (d.country_name || 'Unknown');
        document.getElementById('home-isp').textContent = d.connection?.isp || 'Unknown ISP';
        document.getElementById('home-coords').textContent = 'Lat: ' + (d.latitude || 0) + ' | Long: ' + (d.longitude || 0);
      }
    }
  } catch (e) { }
}

function renderRecent() {
  let c = document.getElementById('recent-list'); if (!c) return;
  let h = history.slice(0, 3).map((e, i) => `<div class="card cursor-pointer" onclick="document.getElementById('home-ip').value='${e.ip}';trackIp()"><div class="flex items-center gap-3 mb-3"><div class="w-8 h-8 rounded-full flex items-center justify-center" style="background:var(--blue-highlight-bg)"><span class="material-symbols-outlined mi text-sm" style="color:var(--blue-highlight)">history</span></div><span class="text-xs font-bold t-secondary">${e.time}</span></div><p class="font-extrabold mb-1">${e.ip}</p><p class="text-xs t-secondary">${e.city}, ${e.country}</p></div>`).join('');
  c.innerHTML = h || '<p class="text-sm t-muted text-center py-8">No recent lookups yet</p>';
}

let mapReady = false;
function initMap() {
  if (mapReady) { map.invalidateSize(); return; }
  setTimeout(() => {
    map = L.map('leaflet-map', { zoomControl: false }).setView([37.7749, -122.4194], 13);
    L.control.zoom({ position: 'topleft' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    marker = L.marker([37.7749, -122.4194]).addTo(map).bindPopup('San Francisco').openPopup();
    mapReady = true; map.invalidateSize();
  }, 100);
}

async function mapSearch() {
  let v = document.getElementById('map-search-input').value.trim(); if (!v) return;
  let d = await api('/api/lookup/' + v);
  if (d && d.latitude && d.longitude) {
    let ll = [d.latitude, d.longitude]; map.setView(ll, 13);
    if (marker) map.removeLayer(marker);
    marker = L.marker(ll).addTo(map).bindPopup(d.ip + '<br>' + d.city + ', ' + d.country_name).openPopup();
    document.getElementById('map-ip').textContent = d.ip || v;
    document.getElementById('map-city').textContent = d.city || 'Unknown';
    document.getElementById('map-country').textContent = d.country_name || 'Unknown';
    document.getElementById('map-isp').textContent = d.connection?.isp || 'Unknown';
    addHistory(d.ip, d);
  }
}

function renderHistory() {
  let c = document.getElementById('history-list'); if (!c) return;
  let colors = ['bg-[#dae2ff] text-[#0040a1]', 'bg-[#d0e6f3] text-[#4d616c]', 'bg-[#ffdbcf] text-[#822800]', 'bg-[#dae2ff] text-[#0040a1]', 'bg-[#e0e3e6] text-[#424654]'];
  document.getElementById('hist-total').textContent = history.length;
  document.getElementById('hist-safe').textContent = Math.floor(history.length * 0.33);
  let h = history.map((e, i) => {
    let isFav = !!favorites[e.ip];
    let starClass = isFav ? 'mf text-amber-500' : 'mi t-accent';
    let noteIcon = isFav ? `<button onclick="event.stopPropagation();openNoteModal('${e.ip}')" class="p-2 t-secondary hover:bg-blue-50 rounded-full" title="Edit note"><span class="material-symbols-outlined mi text-[20px]">edit</span></button>` : '';
    let notePreview = isFav && favorites[e.ip].note ? `<p class="text-[11px] text-blue-600 mt-1 truncate max-w-[200px]"><span class="material-symbols-outlined mi text-[12px] align-middle mr-0.5">sticky_note_2</span>${favorites[e.ip].note}</p>` : '';
    return `<div class="card flex items-center justify-between mb-3"><div class="flex items-start gap-3"><div class="w-12 h-12 ${colors[i % 5]} flex items-center justify-center rounded-xl flex-shrink-0"><span class="material-symbols-outlined mf">location_on</span></div><div class="min-w-0"><p class="font-bold text-lg leading-tight">${e.ip}</p><div class="flex items-center gap-1 t-secondary text-sm mt-0.5"><span class="material-symbols-outlined mi text-[16px]">map</span><span>${e.city}, ${e.country}</span></div><span class="t-muted text-xs mt-1 block">${e.time}</span>${notePreview}</div></div><div class="flex gap-1 flex-shrink-0">${noteIcon}<button onclick="toggleFav('${e.ip}')" class="p-2 hover:bg-amber-50 rounded-full"><span class="material-symbols-outlined ${starClass}">star</span></button><button onclick="delHist(${i})" class="p-2 text-[#ba1a1a] hover:bg-red-50 rounded-full"><span class="material-symbols-outlined mi">delete</span></button></div></div>`;
  }).join('');
  c.innerHTML = h || '<p class="text-center t-muted py-8">No history yet</p>';
}
function delHist(i) { history.splice(i, 1); localStorage.setItem('dn_history', JSON.stringify(history)); renderHistory(); }

function renderFavorites() {
  let c = document.getElementById('fav-list'); if (!c) return;
  let keys = Object.keys(favorites);
  if (!keys.length) { c.innerHTML = '<p class="text-center t-muted py-6 text-sm">No favorites yet. Star IPs in History to add them here.</p>'; return; }
  let html = keys.map(ip => {
    let f = favorites[ip];
    return `<div class="flex items-center justify-between p-3 rounded-xl mb-2" style="background:var(--bg-input)"><div class="flex items-center gap-3 min-w-0 flex-1"><span class="material-symbols-outlined mf text-amber-500 text-[20px] flex-shrink-0">star</span><div class="min-w-0"><p class="font-bold text-sm">${ip}</p>${f.note ? `<p class="text-[11px] t-secondary truncate">${f.note}</p>` : ''}<p class="text-[10px] t-muted">${f.time || ''}</p></div></div><div class="flex gap-1 flex-shrink-0"><button onclick="openNoteModal('${ip}')" class="p-1.5 hover:bg-white rounded-full" title="Edit note"><span class="material-symbols-outlined mi text-[18px] t-secondary">edit</span></button><button onclick="removeFav('${ip}')" class="p-1.5 hover:bg-red-50 rounded-full" title="Remove"><span class="material-symbols-outlined mi text-[18px] text-[#ba1a1a]">delete</span></button></div></div>`;
  }).join('');
  c.innerHTML = html;
}
function removeFav(ip) { delete favorites[ip]; localStorage.setItem('dn_favorites', JSON.stringify(favorites)); renderFavorites(); renderHistory(); }

async function toolLookup() {
  let ip = document.getElementById('tool-ip-input').value.trim(); if (!ip) return;
  document.getElementById('tool-ip-result').innerHTML = '<div class="p-8 text-center"><span class="material-symbols-outlined mi t-accent text-3xl animate-spin">progress_activity</span><p class="text-sm t-secondary mt-2">Looking up...</p></div>';
  let d = await api('/api/lookup/' + ip);
  if (d && !d.error) {
    let ipType = 'Public'; let ipTypeColor = 'text-emerald-600'; let ipTypeBg = 'bg-emerald-50';
    if (d.ip) { let p = d.ip; if (p.startsWith('10.') || p.startsWith('192.168.') || p.match(/^172\.(1[6-9]|2[0-9]|3[01])\./) || p.startsWith('127.')) { ipType = 'Private'; ipTypeColor = 'text-amber-600'; ipTypeBg = 'bg-amber-50'; } }
    let ipVersion = d.ip && d.ip.includes(':') ? 'IPv6' : 'IPv4';
    document.getElementById('tool-ip-result').innerHTML = `<div class="p-5 flex items-center justify-between" style="border-bottom:1px solid var(--border-muted)"><h2 class="font-bold text-lg">Lookup Result</h2><div style="background:var(--tag-bg)" class="px-3 py-1 rounded-full flex items-center gap-2"><span class="w-2 h-2 rounded-full animate-pulse" style="background:var(--tag-color)"></span><span class="text-[10px] font-bold tracking-wider uppercase" style="color:var(--tag-color)">Live</span></div></div><div><div class="result-row px-5"><div class="result-icon"><span class="material-symbols-outlined mi">fingerprint</span></div><div class="flex-1"><p class="text-[10px] font-bold t-secondary tracking-widest uppercase mb-1">IP Address</p><div class="flex items-center gap-3"><p class="font-semibold text-lg">${d.ip}</p><span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${ipTypeBg} ${ipTypeColor} uppercase">${ipType}</span><span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">${ipVersion}</span></div></div></div><div class="px-5 py-4"><div class="grid grid-cols-2 gap-3"><div class="rounded-xl p-3" style="background:var(--bg-input)"><p class="text-[10px] font-bold t-secondary uppercase tracking-widest mb-1">Country</p><p class="font-bold text-sm">${d.country_name || 'N/A'}</p></div><div class="rounded-xl p-3" style="background:var(--bg-input)"><p class="text-[10px] font-bold t-secondary uppercase tracking-widest mb-1">City</p><p class="font-bold text-sm">${d.city || 'N/A'}</p></div><div class="rounded-xl p-3" style="background:var(--bg-input)"><p class="text-[10px] font-bold t-secondary uppercase tracking-widest mb-1">Region</p><p class="font-bold text-sm">${d.region_name || 'N/A'}</p></div><div class="rounded-xl p-3" style="background:var(--bg-input)"><p class="text-[10px] font-bold t-secondary uppercase tracking-widest mb-1">ZIP</p><p class="font-bold text-sm">${d.zip || 'N/A'}</p></div></div></div><div class="result-row px-5"><div class="result-icon"><span class="material-symbols-outlined mi">business</span></div><div><p class="text-[10px] font-bold t-secondary tracking-widest uppercase mb-1">ISP</p><p class="font-semibold text-lg">${d.connection?.isp || 'N/A'}</p></div></div><div class="result-row px-5"><div class="result-icon"><span class="material-symbols-outlined mi">explore</span></div><div><p class="text-[10px] font-bold t-secondary tracking-widest uppercase mb-1">Coordinates</p><p class="font-semibold text-lg">${d.latitude || 'N/A'}, ${d.longitude || 'N/A'}</p></div></div></div>`;
    addHistory(d.ip, d);
  } else {
    document.getElementById('tool-ip-result').innerHTML = '<div class="p-8 text-center"><span class="material-symbols-outlined mi text-red-500 text-3xl">error</span><p class="text-sm text-red-600 mt-2">Lookup failed. Please check the IP address.</p></div>';
  }
}

async function toolDns() {
  let dom = document.getElementById('tool-dns-input').value.trim(); if (!dom) return;
  let d = await api('/api/dns/' + dom);
  if (d && d.success) {
    let recs = d.addresses.map(a => `<div class="flex justify-between items-center p-4 rounded-xl mb-2" style="background:var(--bg-input)"><span class="font-medium">${a.ip}</span><span class="text-[10px] font-bold px-2 py-1 rounded" style="color:var(--text-muted);background:var(--bg-card);border:1px solid var(--border-subtle)">${a.type}</span></div>`).join('');
    document.getElementById('tool-dns-result').innerHTML = `<div class="p-5 flex justify-between items-center" style="border-bottom:1px solid var(--border-subtle)"><h2 class="font-bold text-lg">Resolution Results</h2><span style="background:var(--tag-bg);color:var(--tag-color)" class="text-xs font-bold px-3 py-1 rounded-full uppercase">Success</span></div><div class="p-5 space-y-5"><div class="flex items-start gap-4"><div class="result-icon"><span class="material-symbols-outlined mi">dns</span></div><div><p class="text-sm t-secondary">Domain</p><p class="text-lg font-bold">${d.domain}</p></div></div><div class="flex items-start gap-4"><div class="result-icon" style="background:rgba(0,86,210,.1);color:#0056d2"><span class="material-symbols-outlined mi">router</span></div><div><p class="text-sm t-secondary">Primary Resolved IP</p><p class="text-2xl font-extrabold t-accent">${d.primary}</p></div></div><div class="h-px" style="background:var(--border-subtle)"></div><p class="text-sm t-secondary font-bold flex items-center gap-2"><span class="material-symbols-outlined mi text-sm">list</span>Alternative Records</p>${recs}</div>`;
  }
}

async function toolValidate() {
  let ip = document.getElementById('tool-val-input').value.trim(); if (!ip) return;
  let d = await api('/api/validate/' + ip);
  let icon = d.valid ? 'check_circle' : 'cancel'; let color = d.valid ? 'text-emerald-600' : 'text-red-600'; let status = d.valid ? 'Valid IP' : 'Invalid IP';
  document.getElementById('tool-val-result').innerHTML = `<div class="p-5"><div class="flex justify-between items-start mb-5"><div><p class="t-secondary text-sm">Last Validation Result</p><h3 class="text-xl font-extrabold tracking-tight">${d.ip}</h3></div><div class="bg-blue-100 p-3 rounded-xl"><span class="material-symbols-outlined mi t-accent text-2xl">router</span></div></div><div class="space-y-3"><div class="flex items-center justify-between p-4 rounded-xl" style="background:var(--bg-input)"><div class="flex items-center gap-3"><span class="material-symbols-outlined mf ${color}">${icon}</span><span class="font-bold">Status: ${status}</span></div><span class="t-secondary text-sm">${d.valid ? 'Verified' : 'Failed'}</span></div><div class="grid grid-cols-2 gap-3"><div class="p-4 rounded-xl" style="background:var(--bg-input)"><p class="t-secondary text-xs mb-1">Version</p><p class="font-bold">${d.version}</p></div><div class="p-4 rounded-xl" style="background:var(--bg-input)"><p class="t-secondary text-xs mb-1">Type</p><p class="font-bold">${d.type}</p></div></div></div></div>`;
}

let netInfoData = null;

// ── Convert decimal integer IP to dotted-decimal notation ──
function decimalToIP(int) {
  return (
    (int >>> 24) + "." +
    ((int >> 16) & 255) + "." +
    ((int >> 8) & 255) + "." +
    (int & 255)
  );
}

// ── Get private IP via WebRTC (works on mobile browsers) ──
const getPrivateIp = async () => {
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      let resolved = false;

      pc.createDataChannel("");

      pc.onicecandidate = (event) => {
        if (!event || !event.candidate) {
          if (!resolved) resolve("Unavailable");
          return;
        }

        const candidate = event.candidate.candidate;

        // Split candidate string into parts
        // Format: "candidate:0 1 UDP 2122252543 <address> <port> typ host ..."
        const parts = candidate.split(" ");
        let addr = parts.length >= 5 ? parts[4] : null;

        if (!addr || resolved) return;

        // Skip mDNS candidates (UUIDs like "a1b2c3d4-e5f6-...")
        if (addr.includes("-") || addr.endsWith(".local")) return;

        // Check if addr is a decimal integer (some mobile browsers do this)
        if (/^\d+$/.test(addr) && parseInt(addr) > 255) {
          addr = decimalToIP(parseInt(addr));
        }

        // Validate it looks like a proper IPv4 or IPv6 address
        const isIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(addr);
        const isIPv6 = /^[a-f0-9:]+$/i.test(addr) && addr.includes(":");

        if ((isIPv4 || isIPv6) && !resolved) {
          resolved = true;
          resolve(addr);
          pc.close();
        }
      };

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => resolve("Unavailable"));

      setTimeout(() => {
        if (!resolved) {
          resolve("Unavailable");
          pc.close();
        }
      }, 3000);
    } catch {
      resolve("Unavailable");
    }
  });
};

// ── Detect connection type from browser APIs ──
function getConnectionType() {
  let conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    let t = conn.type || conn.effectiveType || 'Unknown';
    if (t === 'wifi') return 'WiFi';
    if (t === 'cellular') return 'Mobile Data';
    if (t === 'ethernet') return 'Ethernet';
    if (t === '4g' || t === '3g' || t === '2g') return 'Mobile (' + t.toUpperCase() + ')';
    if (t === 'slow-2g') return 'Mobile (Slow)';
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return 'Unknown';
}

async function loadNetInfo() {
  // Step 1: Fetch user's REAL public IP from client-side (not server)
  let publicIp = 'N/A';
  try {
    let r = await fetch('https://api.ipify.org?format=json');
    let j = await r.json();
    publicIp = j.ip || 'N/A';
  } catch (e) {
    // Fallback: try plain text endpoint
    try {
      let r2 = await fetch('https://api.ipify.org');
      publicIp = await r2.text();
    } catch (e2) { }
  }

  // Step 2: Get private IP via WebRTC
  let privateIp = await getPrivateIp();

  // Step 3: Get device/connection info from browser
  let connectionType = getConnectionType();
  let hostname = location.hostname || 'N/A';
  let userAgent = navigator.userAgent || '';
  // Derive a friendly device name
  let deviceName = 'Browser';
  if (/Android/i.test(userAgent)) deviceName = 'Android Device';
  else if (/iPhone|iPad/i.test(userAgent)) deviceName = 'iOS Device';
  else if (/Windows/i.test(userAgent)) deviceName = 'Windows PC';
  else if (/Mac/i.test(userAgent)) deviceName = 'macOS Device';
  else if (/Linux/i.test(userAgent)) deviceName = 'Linux Device';

  // Build netInfoData
  netInfoData = { publicIp, privateIp, connectionType, hostname: deviceName };

  // Update UI immediately with what we have
  document.getElementById('ni-pub').textContent = publicIp;
  document.getElementById('ni-priv').textContent = privateIp;
  document.getElementById('ni-type').textContent = connectionType;
  document.getElementById('ni-host').textContent = deviceName;

  // Step 4: Get geo data using the user's real public IP via our backend
  let country = 'N/A', city = 'N/A', region = 'N/A';
  if (publicIp !== 'N/A') {
    try {
      let geo = await api('/api/lookup/' + publicIp);
      if (geo && !geo.error) {
        country = geo.country_name || 'N/A';
        city = geo.city || 'N/A';
        region = geo.region_name || 'N/A';
        if (geo.latitude) netInfoData.latitude = geo.latitude;
        if (geo.longitude) netInfoData.longitude = geo.longitude;
        netInfoData.country = country;
        netInfoData.city = city;
        netInfoData.regionName = region;
      }
    } catch (e) { }
  }
  document.getElementById('ni-country').textContent = country;
  document.getElementById('ni-city').textContent = city;
  document.getElementById('ni-region').textContent = region;
  doPing();
}
async function doPing() {
  let el = document.getElementById('ni-ping');
  el.textContent = 'Measuring...';
  try {
    let start = performance.now();
    await fetch('/api/ping/8.8.8.8');
    let latency = Math.round(performance.now() - start);
    el.innerHTML = `<span class="text-emerald-600 font-bold">${latency} ms</span>`;
  } catch (e) {
    el.innerHTML = '<span class="text-red-500">Unavailable</span>';
  }
}
function viewNetOnMap() {
  if (netInfoData && netInfoData.latitude && netInfoData.longitude) {
    nav('map');
    setTimeout(() => {
      let ll = [netInfoData.latitude, netInfoData.longitude];
      map.setView(ll, 13);
      if (marker) map.removeLayer(marker);
      marker = L.marker(ll).addTo(map).bindPopup('My Location<br>' + netInfoData.city + ', ' + netInfoData.country).openPopup();
      document.getElementById('map-ip').textContent = netInfoData.publicIp || 'My IP';
      document.getElementById('map-city').textContent = netInfoData.city || 'Unknown';
      document.getElementById('map-country').textContent = netInfoData.country || 'Unknown';
      document.getElementById('map-isp').textContent = 'Local Network';
    }, 200);
  }
}

function saveApiKey() { let k = document.getElementById('api-key-input').value; if (k) { localStorage.setItem('dn_apikey', k); alert('API Key saved!'); } }

// Render all app pages (call after login/signup to populate content)
function renderAllPages() {
  Object.keys(pages).forEach(k => {
    if (!authPages.includes(k)) {
      let el = document.getElementById('page-' + k);
      if (el) el.innerHTML = pages[k]();
    }
  });
  renderRecent(); renderHistory(); renderFavorites();
}

// ── Auth Handlers ──
function handleLogin(e) {
  e.preventDefault();
  let username = document.getElementById('login-username').value.trim();
  let password = document.getElementById('login-password').value.trim();
  let errEl = document.getElementById('login-error');
  errEl.textContent = '';

  if (!username) { errEl.innerHTML = '<span class="material-symbols-outlined mi" style="font-size:14px">error</span>Please enter your username or email'; return; }
  if (!password) { errEl.innerHTML = '<span class="material-symbols-outlined mi" style="font-size:14px">error</span>Please enter your password'; return; }
  if (password.length < 6) { errEl.innerHTML = '<span class="material-symbols-outlined mi" style="font-size:14px">error</span>Password must be at least 6 characters'; return; }

  let btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Signing in...';

  // Validate against registered users (SharedPreferences)
  setTimeout(() => {
    let result = authenticateUser(username, password);
    if (!result.success) {
      errEl.innerHTML = '<span class="material-symbols-outlined mi" style="font-size:14px">error</span>' + result.error;
      btn.disabled = false;
      btn.textContent = 'Login';
      return;
    }
    setAuthState({ username: result.user.username, loginTime: new Date().toISOString() });
    showToast('Welcome back, ' + result.user.username + '!', 'success');
    // Render ALL pages so map/history/utilities are populated
    renderAllPages();
    nav('home');
    btn.disabled = false;
    btn.textContent = 'Login';
  }, 1200);
}

function handleSignup(e) {
  e.preventDefault();
  let username = document.getElementById('signup-username').value.trim();
  let password = document.getElementById('signup-password').value.trim();
  let confirm = document.getElementById('signup-confirm').value.trim();
  let captchaInput = document.getElementById('signup-captcha').value.trim();
  let errEl = document.getElementById('signup-error');
  errEl.textContent = '';

  if (!username) { errEl.innerHTML = '<span class="material-symbols-outlined mi" style="font-size:14px">error</span>Please choose a username'; return; }
  if (username.length < 3) { errEl.innerHTML = '<span class="material-symbols-outlined mi" style="font-size:14px">error</span>Username must be at least 3 characters'; return; }
  if (!password) { errEl.innerHTML = '<span class="material-symbols-outlined mi" style="font-size:14px">error</span>Please create a password'; return; }
  if (password.length < 8) { errEl.innerHTML = '<span class="material-symbols-outlined mi" style="font-size:14px">error</span>Password must be at least 8 characters'; return; }
  let strength = checkPasswordStrength(password);
  if (strength.score < 1) { errEl.innerHTML = '<span class="material-symbols-outlined mi" style="font-size:14px">error</span>Password is too weak. Add uppercase, numbers, or special characters.'; return; }
  if (password !== confirm) { errEl.innerHTML = '<span class="material-symbols-outlined mi" style="font-size:14px">error</span>Passwords do not match'; return; }
  if (captchaInput.toUpperCase() !== currentCaptcha) {
    errEl.innerHTML = '<span class="material-symbols-outlined mi" style="font-size:14px">error</span>CAPTCHA verification failed. Please try again.';
    refreshCaptcha();
    return;
  }

  let btn = document.getElementById('signup-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Creating account...';

  setTimeout(() => {
    // Register user in SharedPreferences (localStorage)
    let regResult = registerUser(username, password);
    if (!regResult.success) {
      errEl.innerHTML = '<span class="material-symbols-outlined mi" style="font-size:14px">error</span>' + regResult.error;
      btn.disabled = false;
      btn.innerHTML = 'Create Account <span class="material-symbols-outlined mi" style="font-size:18px;vertical-align:middle">arrow_forward</span>';
      return;
    }
    setAuthState({ username: username, loginTime: new Date().toISOString() });
    showToast('Account created successfully!', 'success');
    // Render ALL pages so map/history/utilities are populated
    renderAllPages();
    nav('home');
    btn.disabled = false;
    btn.innerHTML = 'Create Account <span class="material-symbols-outlined mi" style="font-size:18px;vertical-align:middle">arrow_forward</span>';
  }, 1500);
}

function handleLogout() {
  clearAuthState();
  showToast('Logged out successfully', 'success');
  // Re-render profile to show login/signup buttons
  document.getElementById('page-profile').innerHTML = pages.profile();
  renderFavorites();
  // Redirect to login screen
  nav('login');
}

function refreshCaptcha() {
  generateCaptcha();
  let el = document.getElementById('captcha-display');
  if (el) el.textContent = currentCaptcha.split('').join(' ');
  let inp = document.getElementById('signup-captcha');
  if (inp) inp.value = '';
}

function togglePasswordVisibility(inputId, btnEl) {
  let inp = document.getElementById(inputId);
  let icon = btnEl.querySelector('.material-symbols-outlined');
  if (inp.type === 'password') { inp.type = 'text'; icon.textContent = 'visibility_off'; }
  else { inp.type = 'password'; icon.textContent = 'visibility'; }
}

const pages = {
  home: () => { let user = getCurrentUser(); let greeting = user ? 'Welcome back, ' + user.username : 'Welcome back, Alex'; return hdr('Digital Navigator') + `<main class="px-6 pt-5"><section class="mb-5"><h2 class="text-2xl font-extrabold tracking-tight mb-1">${greeting}</h2><p class="t-secondary font-medium text-sm">Your network environment is currently secure.</p></section><section class="mb-7"><div class="rounded-xl flex items-center p-2" style="background:var(--bg-input)"><span class="material-symbols-outlined mi t-muted ml-3">search</span><input id="home-ip" class="bg-transparent border-none w-full px-3 text-sm" style="color:var(--text-primary)" placeholder="Track IP" inputmode="url"><button id="home-track-btn" onclick="trackIp()" class="btn-primary px-5 py-2.5 text-sm whitespace-nowrap shadow-lg shadow-blue-600/20">Track Now</button></div></section><div class="card-xl mb-5" id="ip-card"><div class="flex items-center justify-between mb-5"><span class="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider" style="background:var(--tag-bg);color:var(--tag-color)">PRIMARY CONNECTION</span><div class="flex items-center gap-2"><div class="w-2 h-2 bg-[#822800] rounded-full animate-pulse"></div><span class="text-[10px] font-bold t-secondary uppercase tracking-widest">LIVE</span></div></div><p class="text-[10px] t-secondary font-semibold mb-1">IP ADDRESS</p><h3 id="home-ip-val" class="text-3xl font-extrabold t-accent tracking-tight mb-5">192.168.1.1</h3><div class="space-y-4"><div class="flex items-center gap-4"><div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:var(--bg-input)"><span class="material-symbols-outlined mi t-accent">location_on</span></div><div><p class="text-[11px] font-bold t-secondary mb-0.5">CITY &amp; COUNTRY</p><p id="home-loc" class="font-bold">San Francisco, USA</p></div></div><div class="flex items-center gap-4"><div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:var(--bg-input)"><span class="material-symbols-outlined mi t-accent">lan</span></div><div><p class="text-[11px] font-bold t-secondary mb-0.5">INTERNET PROVIDER</p><p id="home-isp" class="font-bold">CloudLink Systems Inc.</p></div></div></div><button onclick="nav('map')" class="mt-5 w-full py-3 font-bold rounded-xl text-sm transition-colors" style="background:var(--bg-elevated)">View Network Details</button></div><div class="card-xl mb-5 !p-0 overflow-hidden relative h-[250px]"><img class="w-full h-full object-cover" src="homepage.png"><div class="absolute top-3 right-3"><button onclick="nav('map')" class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform" style="background:var(--bg-card)"><span class="material-symbols-outlined mi">fullscreen</span></button></div><div class="absolute bottom-3 left-3 right-3 backdrop-blur-xl p-3 rounded-2xl shadow-lg border border-white/20" style="background:var(--glass-bg)"><div class="flex justify-between items-center"><div><h4 class="font-bold text-sm">Satellite precision</h4><p class="text-xs t-secondary" id="home-coords">Lat: 37.7749 | Long: -122.4194</p></div><span class="bg-[#0040a1] text-white text-[10px] px-2 py-1 rounded-lg font-bold">ACCURATE</span></div></div></div><section class="mt-8 mb-8"><div class="flex justify-between items-end mb-4"><div><h3 class="text-xl font-bold">Recent Lookups</h3><p class="text-sm t-secondary">History of your last analyzed endpoints</p></div><button onclick="nav('history')" class="t-accent font-bold text-sm">View All</button></div><div id="recent-list" class="grid gap-3"></div></section></main>`; },

  map: () => hdr('Digital Navigator') + `<main class="relative" style="height:calc(100dvh - 56px);display:flex;flex-direction:column;overflow:hidden"><div class="map-wrapper"><div id="leaflet-map"></div><div class="map-search"><div class="backdrop-blur-xl rounded-full px-4 py-3 shadow-2xl flex items-center gap-3" style="background:var(--glass-bg)"><span class="material-symbols-outlined mi t-accent">search</span><input id="map-search-input" class="bg-transparent border-none w-full text-sm" style="color:var(--text-primary)" placeholder="Search IP address or domain..." inputmode="url" onkeydown="if(event.key==='Enter')mapSearch()"><div class="w-px h-6" style="background:var(--border-subtle)"></div><button onclick="mapSearch()" class="material-symbols-outlined mi t-muted">my_location</button></div></div></div><div class="map-analytics-panel"><div class="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3"></div><div class="flex justify-between items-start mb-3"><div><span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2" style="background:var(--blue-highlight-bg);color:var(--blue-highlight)"><span class="w-1.5 h-1.5 rounded-full animate-pulse" style="background:var(--blue-highlight)"></span>Live Tracked</span><h2 id="map-ip" class="text-xl font-extrabold tracking-tight">8.8.8.8</h2></div></div><div class="grid grid-cols-2 gap-2 mb-3"><div class="rounded-xl p-2.5" style="background:var(--bg-input)"><p class="text-[10px] font-bold t-muted uppercase tracking-widest mb-0.5">City</p><p id="map-city" class="font-bold text-sm truncate">Mountain View</p></div><div class="rounded-xl p-2.5" style="background:var(--bg-input)"><p class="text-[10px] font-bold t-muted uppercase tracking-widest mb-0.5">Country</p><p id="map-country" class="font-bold text-sm truncate">United States</p></div></div><div class="rounded-xl p-2.5 mb-3" style="background:var(--bg-input)"><div class="flex justify-between items-center"><div><p class="text-[10px] font-bold t-muted uppercase tracking-widest mb-0.5">Provider</p><p id="map-isp" class="font-bold text-sm">Google LLC</p></div><span class="material-symbols-outlined mi text-blue-300 text-lg">lan</span></div></div><button onclick="nav('home')" class="w-full btn-primary py-2.5 text-sm shadow-lg shadow-blue-600/30">View Complete Analytics</button></div></main>`,

  history: () => hdr('Digital Navigator') + `<main class="px-6 pt-5"><section class="mb-6"><h2 class="text-3xl font-extrabold tracking-tight mb-1">Search History</h2><p class="t-secondary font-medium">Review your recent geo-location logs</p></section><div class="grid grid-cols-2 gap-4 mb-8"><div class="card"><span class="text-[10px] uppercase tracking-widest t-secondary font-bold">Total Logs</span><div id="hist-total" class="text-2xl font-extrabold t-accent">0</div></div><div class="card"><span class="text-[10px] uppercase tracking-widest t-secondary font-bold">Safe Zones</span><div id="hist-safe" class="text-2xl font-extrabold t-accent">0</div></div></div><div id="history-list" class="mb-10"></div><div class="py-8 flex flex-col items-center opacity-40"><span class="material-symbols-outlined mi text-4xl mb-2">history_toggle_off</span><p class="text-sm font-semibold">End of recent history</p></div></main>`,

  utilities: () => hdr('Network Utilities') + `<main class="px-6 pt-5"><div class="card-xl mb-5"><div class="flex items-center justify-between mb-3"><h2 class="font-bold text-lg">Quick Check</h2><span class="text-[10px] font-bold px-3 py-1 bg-[#ffdbcf] text-[#812800] rounded-full flex items-center gap-2 uppercase tracking-widest"><span class="w-2 h-2 rounded-full bg-[#822800] animate-pulse"></span>LIVE STATUS</span></div><div class="rounded-xl flex items-center p-2" style="background:var(--bg-input)"><span class="material-symbols-outlined mi t-muted ml-3">search</span><input id="util-search" class="bg-transparent border-none w-full px-3 text-sm" style="color:var(--text-primary)" placeholder="Enter IP or Domain..." inputmode="url"><button onclick="let v=document.getElementById('util-search').value;if(v){document.getElementById('home-ip').value=v;nav('home');setTimeout(trackIp,100)}" class="btn-primary px-5 py-2.5 rounded-xl text-sm">Analyze</button></div></div><div class="grid grid-cols-2 gap-3 mb-6"><div onclick="nav('iplookup')" class="card cursor-pointer flex flex-col items-start gap-3 border border-black/5 hover:shadow-md transition-shadow"><div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background:var(--blue-highlight-bg);color:var(--text-accent)"><span class="material-symbols-outlined mi text-3xl">edit_square</span></div><div><p class="font-bold">IP Lookup</p><p class="text-xs t-secondary mt-1 leading-relaxed">Manual geolocation and ISP data retrieval.</p></div></div><div onclick="nav('domaintoip')" class="card cursor-pointer flex flex-col items-start gap-3 border border-black/5 hover:shadow-md transition-shadow"><div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background:var(--blue-highlight-bg);color:var(--text-accent)"><span class="material-symbols-outlined mi text-3xl">public</span></div><div><p class="font-bold">Domain to IP</p><p class="text-xs t-secondary mt-1 leading-relaxed">Resolve hostnames to physical IP addresses.</p></div></div><div onclick="nav('ipvalidator')" class="card cursor-pointer flex flex-col items-start gap-3 border border-black/5 hover:shadow-md transition-shadow"><div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background:var(--blue-highlight-bg);color:var(--text-accent)"><span class="material-symbols-outlined mi text-3xl">verified</span></div><div><p class="font-bold">IP Validator</p><p class="text-xs t-secondary mt-1 leading-relaxed">Check syntax and status of IPv4/v6 ranges.</p></div></div><div onclick="nav('networkinfo')" class="card cursor-pointer flex flex-col items-start gap-3 border border-black/5 hover:shadow-md transition-shadow"><div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background:var(--blue-highlight-bg);color:var(--text-accent)"><span class="material-symbols-outlined mi text-3xl">smartphone</span></div><div><p class="font-bold">Device Info</p><p class="text-xs t-secondary mt-1 leading-relaxed">Hardware specs and local network identifiers.</p></div></div></div><div class="mb-5"><h2 class="font-bold text-lg mb-3">Advanced Diagnostics</h2><div class="card-xl !p-0 overflow-hidden border border-black/5"><div class="h-32 w-full bg-gradient-to-br from-[#0040a1] to-[#0056d2] flex items-center justify-center"><span class="material-symbols-outlined mi text-white/30 text-6xl">dns</span></div><div class="p-5 flex justify-between items-start"><div><p class="font-bold text-lg">Subnet Calculator</p><p class="text-sm t-secondary">Analyze network masks and host ranges</p></div><span class="material-symbols-outlined mi t-accent">chevron_right</span></div></div></div></main>`,

  profile: () => {
    let user = getCurrentUser();
    let authSection = '';
    if (user) {
      authSection = `<div class="profile-user-card mb-5">
      <div class="flex items-center gap-4 relative z-10">
        <div class="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <span class="material-symbols-outlined mf text-white text-3xl">person</span>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-xl font-extrabold tracking-tight">${user.username}</h3>
          <p class="text-white/70 text-sm font-medium">Logged in since ${new Date(user.loginTime).toLocaleDateString()}</p>
        </div>
      </div>
      <button onclick="handleLogout()" class="mt-4 w-full py-3 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all relative z-10">
        <span class="material-symbols-outlined mi text-lg">logout</span>Sign Out
      </button>
    </div>`;
    } else {
      authSection = `<div class="profile-auth-card mb-5">
      <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0040a1] to-[#0056d2] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
        <span class="material-symbols-outlined mf text-white text-3xl">person</span>
      </div>
      <h3 class="text-lg font-extrabold tracking-tight mb-1">Welcome to GeoTracker</h3>
      <p class="t-muted text-sm mb-6">Access your account to save history and preferences</p>
      <div class="flex gap-3">
        <button onclick="nav('login')" class="flex-1 py-3 bg-gradient-to-r from-[#0040a1] to-[#0056d2] text-white font-bold rounded-full text-sm shadow-lg shadow-blue-600/20 active:scale-[0.97] transition-transform flex items-center justify-center gap-2">
          <span class="material-symbols-outlined mi text-lg">login</span>Login
        </button>
        <button onclick="nav('signup')" class="flex-1 py-3 font-bold rounded-full text-sm transition-all active:scale-[0.97] flex items-center justify-center gap-2" style="background:var(--bg-input);color:var(--text-accent)">
          <span class="material-symbols-outlined mi text-lg">person_add</span>Sign Up
        </button>
      </div>
    </div>`;
    }
    return hdr('Digital Navigator') + `<main class="px-6 pt-5"><div class="mb-8 text-center"><h2 class="text-3xl font-extrabold tracking-tight mb-2">Settings</h2><p class="t-secondary text-sm">Manage your navigation preferences and account data.</p></div><div class="space-y-5">${authSection}<div class="card-xl"><div class="flex items-center gap-3 mb-4"><span class="material-symbols-outlined mf text-amber-500">star</span><h3 class="text-lg font-bold">Favorites</h3><span class="text-xs font-bold px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full">${Object.keys(favorites).length}</span></div><div id="fav-list"></div></div><div class="card-xl"><div class="flex items-center gap-3 mb-5"><span class="material-symbols-outlined mi t-accent">key</span><h3 class="text-lg font-bold">API Configuration</h3></div><label class="text-xs font-bold t-secondary tracking-wider block mb-2">ENTER IPSTACK API KEY</label><div class="flex gap-2"><input id="api-key-input" class="w-full border-none rounded-xl px-4 py-3 text-sm" style="background:var(--bg-input);color:var(--text-primary)" placeholder="Enter key here" type="password" value=""><button onclick="saveApiKey()" class="btn-primary px-4 py-2 rounded-xl text-sm">Save</button></div></div><div class="card-xl"><div class="flex items-center gap-3 mb-5"><span class="material-symbols-outlined mi t-accent">settings</span><h3 class="text-lg font-bold">Preferences</h3></div><div class="flex items-center justify-between py-3"><div><span class="font-semibold">Units (KM/Miles)</span><p class="text-xs t-secondary">Choose your preferred measurement</p></div><div class="flex p-1 rounded-full" style="background:var(--bg-input)"><button class="bg-[#0040a1] text-white px-4 py-1 rounded-full text-xs font-bold">KM</button><button class="px-4 py-1 t-secondary text-xs font-bold">Miles</button></div></div><div class="h-px" style="background:var(--border-muted)"></div><div class="flex items-center justify-between py-3"><div><span class="font-semibold">Dark Mode</span><p class="text-xs t-secondary">Switch between light and dark visual styles</p></div><button id="dark-toggle" onclick="toggleDark()" class="w-12 h-6 ${darkMode ? 'bg-blue-600' : 'bg-[#e0e3e6]'} rounded-full relative transition-colors"><div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform shadow" style="transform:translateX(${darkMode ? '24px' : '0'})"></div></button></div></div><div class="card-xl"><div class="flex items-center gap-3 mb-5"><span class="material-symbols-outlined mi t-accent">privacy_tip</span><h3 class="text-lg font-bold">Privacy</h3></div><div class="flex items-center justify-between py-3 cursor-pointer"><span class="font-semibold">Privacy Settings</span><span class="material-symbols-outlined mi t-secondary">chevron_right</span></div><div class="h-px" style="background:var(--border-muted)"></div><div onclick="history=[];localStorage.removeItem('dn_history');alert('History cleared!')" class="flex items-center justify-between py-3 cursor-pointer"><span class="font-semibold text-[#ba1a1a]">Clear History</span><span class="material-symbols-outlined mi text-[#ba1a1a]">delete_sweep</span></div></div><div class="card-xl"><div class="flex items-center gap-3 mb-5"><span class="material-symbols-outlined mi t-accent">info</span><h3 class="text-lg font-bold">About</h3></div><div class="flex items-center justify-between py-3"><span class="font-semibold">App Version</span><span class="text-sm t-secondary">v2.4.1-stable</span></div><div class="h-px" style="background:var(--border-muted)"></div><div class="flex items-center justify-between py-3 cursor-pointer"><span class="font-semibold">About GeoTracker</span><span class="material-symbols-outlined mi t-secondary">open_in_new</span></div></div></div></main>`;
  },

  // ── Login Page ──
  login: () => `<div class="auth-header">
  <h1><span class="material-symbols-outlined mi text-white" style="font-size:28px">explore</span>GeoTracker</h1>
  <p>Secure Login</p>
</div>
<div class="auth-card">
  <div style="text-align:center;margin-bottom:28px">
    <h2 style="font-size:1.5rem;font-weight:800;letter-spacing:-.03em;margin-bottom:6px">Welcome Back</h2>
    <p class="t-muted" style="font-size:13px">Please enter your credentials to access your journey data.</p>
  </div>
  <form onsubmit="handleLogin(event)" style="display:flex;flex-direction:column;gap:18px">
    <div>
      <label class="t-secondary" style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px;margin-left:2px">Username</label>
      <div class="auth-input-wrap">
        <span class="material-symbols-outlined mi input-icon">person</span>
        <input id="login-username" class="auth-input" type="text" placeholder="Enter your username" autocomplete="username">
      </div>
    </div>
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding:0 2px">
        <label class="t-secondary" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em">Password</label>
        <a class="auth-link" style="font-size:11px" href="#">Forgot Password?</a>
      </div>
      <div class="auth-input-wrap">
        <span class="material-symbols-outlined mi input-icon">lock</span>
        <input id="login-password" class="auth-input" type="password" placeholder="Enter your password" oninput="updatePasswordStrength('login-password','login-pwd-meter')" autocomplete="current-password">
        <button type="button" class="toggle-vis-btn" onclick="togglePasswordVisibility('login-password',this)">
          <span class="material-symbols-outlined mi" style="font-size:20px">visibility</span>
        </button>
      </div>
      <div id="login-pwd-meter" class="pwd-strength">
        <div class="pwd-strength-bars"><span></span><span></span><span></span><span></span></div>
        <div class="pwd-strength-label"></div>
        <div class="pwd-strength-tips"></div>
      </div>
    </div>
    <div id="login-error" class="auth-error"></div>
    <button id="login-btn" type="submit" class="auth-btn" style="margin-top:4px">Login</button>
  </form>
  <div class="auth-footer" style="margin-top:24px;padding-bottom:0">
    Don't have an account? <a class="auth-link" onclick="nav('signup')">Sign Up</a>
  </div>
</div>
<div style="text-align:center;padding:24px 0 48px;display:flex;justify-content:center;gap:24px;opacity:.35">
  <span class="material-symbols-outlined mi t-muted" style="font-size:24px">security</span>
  <span class="material-symbols-outlined mi t-muted" style="font-size:24px">location_on</span>
  <span class="material-symbols-outlined mi t-muted" style="font-size:24px">verified_user</span>
</div>
<p class="t-muted" style="text-align:center;font-size:10px;opacity:.5;font-weight:700;text-transform:uppercase;letter-spacing:.2em;padding-bottom:32px">Encrypted Navigation Environment • v2.4.0</p>`,

  // ── Signup Page ──
  signup: () => {
    generateCaptcha(); return `<div class="auth-header" style="padding-bottom:80px">
  <h1><span class="material-symbols-outlined mi text-white" style="font-size:28px">explore</span>GeoTracker</h1>
  <p>Create Account</p>
</div>
<div class="auth-card">
  <form onsubmit="handleSignup(event)" style="display:flex;flex-direction:column;gap:16px">
    <div>
      <label class="t-secondary" style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;margin-left:2px">Username</label>
      <div class="auth-input-wrap">
        <span class="material-symbols-outlined mi input-icon">person</span>
        <input id="signup-username" class="auth-input" type="text" placeholder="Choose a unique username" autocomplete="username">
      </div>
    </div>
    <div>
      <label class="t-secondary" style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;margin-left:2px">Password</label>
      <div class="auth-input-wrap">
        <span class="material-symbols-outlined mi input-icon">lock</span>
        <input id="signup-password" class="auth-input" type="password" placeholder="Create a strong password" oninput="updatePasswordStrength('signup-password','signup-pwd-meter')" autocomplete="new-password">
        <button type="button" class="toggle-vis-btn" onclick="togglePasswordVisibility('signup-password',this)">
          <span class="material-symbols-outlined mi" style="font-size:20px">visibility</span>
        </button>
      </div>
      <div id="signup-pwd-meter" class="pwd-strength">
        <div class="pwd-strength-bars"><span></span><span></span><span></span><span></span></div>
        <div class="pwd-strength-label"></div>
        <div class="pwd-strength-tips"></div>
      </div>
    </div>
    <div>
      <label class="t-secondary" style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;margin-left:2px">Confirm Password</label>
      <div class="auth-input-wrap">
        <span class="material-symbols-outlined mi input-icon">lock_reset</span>
        <input id="signup-confirm" class="auth-input" type="password" placeholder="Repeat your password" autocomplete="new-password">
        <button type="button" class="toggle-vis-btn" onclick="togglePasswordVisibility('signup-confirm',this)">
          <span class="material-symbols-outlined mi" style="font-size:20px">visibility</span>
        </button>
      </div>
    </div>
    <div>
      <label class="t-secondary" style="display:block;font-size:13px;font-weight:600;margin-bottom:8px;margin-left:2px">Security Verification</label>
      <div class="captcha-container">
        <div>
          <span id="captcha-display" class="captcha-text">${currentCaptcha.split('').join(' ')}</span>
          <div class="captcha-label">Case Sensitive</div>
        </div>
        <button type="button" onclick="refreshCaptcha()" style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--captcha-btn-bg);border:none;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08);color:var(--text-accent);transition:transform .15s" onmousedown="this.style.transform='scale(0.9)'" onmouseup="this.style.transform='scale(1)'">
          <span class="material-symbols-outlined mi">refresh</span>
        </button>
      </div>
      <div class="auth-input-wrap" style="margin-top:8px">
        <input id="signup-captcha" class="auth-input" type="text" placeholder="Enter characters above">
      </div>
    </div>
    <div id="signup-error" class="auth-error"></div>
    <button id="signup-btn" type="submit" class="auth-btn" style="margin-top:4px;display:flex;align-items:center;justify-content:center;gap:8px">Create Account <span class="material-symbols-outlined mi" style="font-size:18px">arrow_forward</span></button>
  </form>
  <div style="margin-top:28px;padding-top:28px;border-top:1px solid var(--border-subtle);text-align:center">
    <p class="t-muted" style="font-weight:500;font-size:14px">Already have an account? <a class="auth-link" onclick="nav('login')">Login</a></p>
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:24px">
  <div style="padding:12px;border-radius:12px;background:var(--bg-input);display:flex;align-items:center;gap:10px">
    <div style="width:36px;height:36px;border-radius:50%;background:rgba(0,64,161,.1);display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined mi" style="color:var(--text-accent);font-size:20px">security</span></div>
    <div><span class="t-secondary" style="font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-weight:700">Encryption</span><br><span style="font-size:12px;font-weight:700">End-to-end Secure</span></div>
  </div>
  <div style="padding:12px;border-radius:12px;background:var(--bg-input);display:flex;align-items:center;gap:10px">
    <div style="width:36px;height:36px;border-radius:50%;background:rgba(130,40,0,.1);display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined mi" style="color:#822800;font-size:20px">location_on</span></div>
    <div><span class="t-secondary" style="font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-weight:700">Tracking</span><br><span style="font-size:12px;font-weight:700">Precision GPS</span></div>
  </div>
</div>
<p class="t-muted" style="text-align:center;font-size:11px;padding:0 32px 32px">By creating an account, you agree to our <a class="auth-link" href="#" style="font-weight:600">Terms of Service</a> and <a class="auth-link" href="#" style="font-weight:600">Privacy Policy</a></p>`;
  },

  iplookup: () => thdr('IP Lookup') + `<main class="px-4 -mt-1 relative z-10 space-y-5 pt-5"><section class="card-xl"><div class="space-y-4"><div class="relative"><span class="material-symbols-outlined mi absolute left-4 top-4 t-muted">language</span><input id="tool-ip-input" class="input-field" placeholder="Enter IP address" inputmode="url"></div><button onclick="toolLookup()" class="btn-primary w-full py-4 text-lg shadow-lg shadow-blue-600/20">Search</button></div></section><section id="tool-ip-result" class="card-xl !p-0 overflow-hidden"></section></main>`,

  domaintoip: () => thdr('Domain to IP') + `<main class="px-4 -mt-1 relative z-10 space-y-5 pt-5"><section class="card-xl"><div class="space-y-4"><label class="block text-sm font-medium t-secondary mb-1 ml-1">Domain Name</label><div class="relative"><span class="material-symbols-outlined mi absolute left-4 top-4 t-muted">language</span><input id="tool-dns-input" class="input-field" placeholder="Enter domain (e.g., google.com)" inputmode="url"></div><button onclick="toolDns()" class="btn-primary w-full py-4 text-lg shadow-lg shadow-blue-600/20">Convert</button></div></section><section id="tool-dns-result" class="card-xl !p-0 overflow-hidden"></section></main>`,

  ipvalidator: () => thdr('IP Validator') + `<main class="px-4 -mt-1 relative z-10 space-y-5 pt-5"><section class="card-xl"><div class="space-y-4"><div class="flex items-center gap-3 mb-2"><span class="material-symbols-outlined mf t-accent">verified_user</span><h2 class="font-bold text-lg">Security Check</h2></div><div class="relative"><span class="material-symbols-outlined mi absolute left-4 top-4 t-muted">shield</span><input id="tool-val-input" class="input-field" placeholder="Enter IP to validate" inputmode="url"></div><button onclick="toolValidate()" class="btn-primary w-full py-4 text-lg shadow-lg shadow-blue-600/20">Validate</button></div></section><section id="tool-val-result" class="card-xl !p-0 overflow-hidden"></section></main>`,

  networkinfo: () => thdr('Network Info') + `<main class="px-6 pt-6 pb-8"><div class="mb-8 text-center"><div class="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-1.5 rounded-full mb-4"><span class="material-symbols-outlined mf text-[18px]">sensors</span><span class="text-xs font-bold tracking-wider uppercase">Live Connection</span></div><h2 class="text-3xl font-extrabold tracking-tight mb-2">Network Info</h2><p class="t-secondary text-sm">Your local network configuration detected with high precision.</p></div><div class="card-xl !p-0 overflow-hidden mb-5"><div class="h-28 relative bg-[#0056d2] overflow-hidden flex items-center justify-center"><span class="material-symbols-outlined mi text-white/30 text-7xl">language</span><div class="absolute bottom-4 left-6"><span class="text-white/80 text-xs uppercase tracking-[.2em]">Diagnostic Result</span></div></div><div class="p-5 space-y-5"><div class="flex items-center gap-4"><div class="w-12 h-12 rounded-2xl flex items-center justify-center" style="background:var(--blue-highlight-bg);color:var(--text-accent)"><span class="material-symbols-outlined mi">public</span></div><div class="flex-1"><p class="text-[10px] font-bold t-secondary uppercase tracking-widest">Public IP</p><p id="ni-pub" class="text-xl font-bold tabular-nums">Loading...</p></div></div><div class="h-px" style="background:var(--border-muted)"></div><div class="flex items-center gap-4"><div class="w-12 h-12 rounded-2xl flex items-center justify-center" style="background:var(--bg-input);color:var(--result-icon-color)"><span class="material-symbols-outlined mi">lan</span></div><div class="flex-1"><p class="text-[10px] font-bold t-secondary uppercase tracking-widest">Private IP</p><p id="ni-priv" class="text-xl font-bold tabular-nums">Loading...</p></div></div><div class="grid grid-cols-2 gap-3"><div class="p-4 rounded-2xl" style="background:var(--bg-input)"><div class="flex items-center gap-2 mb-2"><span class="material-symbols-outlined mi t-accent text-[20px]">wifi</span><span class="text-[10px] font-bold t-secondary uppercase">Type</span></div><p id="ni-type" class="text-sm font-bold">Loading...</p></div><div class="p-4 rounded-2xl" style="background:var(--bg-input)"><div class="flex items-center gap-2 mb-2"><span class="material-symbols-outlined mi t-accent text-[20px]">apartment</span><span class="text-[10px] font-bold t-secondary uppercase">Host</span></div><p id="ni-host" class="text-sm font-bold truncate">Loading...</p></div></div><div class="flex justify-between items-center pt-2"><div class="flex items-center gap-2"><span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span><span class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Secure Connection</span></div><p class="text-[10px] t-secondary">Last updated: Just now</p></div></div></div><div class="card-xl !p-0 overflow-hidden mb-5"><div class="p-4 flex items-center gap-3" style="border-bottom:1px solid var(--border-muted)"><span class="material-symbols-outlined mi t-accent">location_on</span><h3 class="font-bold text-lg">Location Details</h3></div><div class="p-5"><div class="grid grid-cols-3 gap-3 mb-4"><div class="p-3 rounded-2xl text-center" style="background:var(--bg-input)"><p class="text-[10px] font-bold t-secondary uppercase tracking-widest mb-1">Country</p><p id="ni-country" class="text-sm font-bold">Loading...</p></div><div class="p-3 rounded-2xl text-center" style="background:var(--bg-input)"><p class="text-[10px] font-bold t-secondary uppercase tracking-widest mb-1">City</p><p id="ni-city" class="text-sm font-bold">Loading...</p></div><div class="p-3 rounded-2xl text-center" style="background:var(--bg-input)"><p class="text-[10px] font-bold t-secondary uppercase tracking-widest mb-1">Region</p><p id="ni-region" class="text-sm font-bold">Loading...</p></div></div><button onclick="viewNetOnMap()" class="w-full py-3 bg-gradient-to-r from-[#0040a1] to-[#0056d2] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-[0.97] transition-transform"><span class="material-symbols-outlined mi text-lg">map</span>View on Map</button></div></div><div class="card-xl !p-0 overflow-hidden mb-5"><div class="p-4 flex items-center gap-3" style="border-bottom:1px solid var(--border-muted)"><span class="material-symbols-outlined mi t-accent">speed</span><h3 class="font-bold text-lg">Connection Quality</h3></div><div class="p-5"><div class="flex items-center gap-4"><div class="w-14 h-14 rounded-2xl flex items-center justify-center" style="background:var(--blue-highlight-bg)"><span class="material-symbols-outlined mf t-accent text-2xl">network_check</span></div><div class="flex-1"><p class="text-[10px] font-bold t-secondary uppercase tracking-widest mb-1">Current Ping</p><p id="ni-ping" class="text-2xl font-extrabold tabular-nums">Measuring...</p><p class="text-[10px] t-muted mt-0.5">Ping to 8.8.8.8 (Google DNS)</p></div><button onclick="doPing()" class="w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-90" style="background:var(--bg-input)"><span class="material-symbols-outlined mi t-accent">refresh</span></button></div></div></div></main>`
};

function init() {
  applyDarkMode();
  // Check if user is logged in on app launch
  if (!isLoggedIn()) {
    // Not logged in: show login page first
    document.getElementById('page-login').innerHTML = pages.login();
    document.querySelectorAll('.page').forEach(e => e.classList.remove('active'));
    document.getElementById('page-login').classList.add('active');
    document.getElementById('bnav').style.display = 'none';
    // Still render profile so nav('profile') works
    document.getElementById('page-profile').innerHTML = pages.profile();
  } else {
    // Logged in: render all pages normally
    Object.keys(pages).forEach(k => {
      if (!authPages.includes(k)) {
        document.getElementById('page-' + k).innerHTML = pages[k]();
      }
    });
    renderRecent(); renderHistory(); renderFavorites();
    loadHomeIp();
  }
}
init();
