/* =============================================
   現場掲示板 — Firebase Firestore
   投稿：名前入力のみ（認証不要）
   削除：管理者（隠しログイン）のみ
   ※ index.html の遅延ローダーから _bbsStart() を呼び出す
   ============================================= */

window._bbsStart = function() {

const firebaseConfig = {
  apiKey: 'AIzaSyCVJNDMILPbA4n0hSimX5d-WzcJO_n0oRQ',
  authDomain: 'agatto-map.firebaseapp.com',
  projectId: 'agatto-map',
  storageBucket: 'agatto-map.firebasestorage.app',
  messagingSenderId: '694313355581',
  appId: '1:694313355581:web:e351429ad4e68819b61d54'
};

firebase.initializeApp(firebaseConfig);
var _fbDb   = firebase.firestore();
var _fbAuth = firebase.auth();

var _bbsPosts        = [];
var _bbsMarkers      = [];
var _bbsPhotoMap     = {};
var _bbsTimer        = null;
var _bbsPhotoB64     = null;
var _bbsLat          = null;
var _bbsLng          = null;
var _bbsPhotoLat     = null;
var _bbsPhotoLng     = null;
var _bbsCurrentUser  = null;

/* ── 管理者認証（隠し） ── */
_fbAuth.onAuthStateChanged(function(user) {
  _bbsCurrentUser = user;
  _bbsRenderList();
});

(function() {
  var taps = 0, timer = null;
  document.getElementById('bbsPanelTitle').addEventListener('click', function() {
    taps++;
    clearTimeout(timer);
    timer = setTimeout(function() { taps = 0; }, 2000);
    if (taps >= 5) {
      taps = 0;
      if (_bbsCurrentUser) {
        _fbAuth.signOut().then(function() { toast('管理者ログアウト', 2000); });
      } else {
        var provider = new firebase.auth.GoogleAuthProvider();
        _fbAuth.signInWithPopup(provider)
          .then(function() { toast('管理者ログイン完了', 2000); })
          .catch(function(e) { toast('ログイン失敗: ' + e.message, 3000); });
      }
    }
  });
})();

/* ── 投稿者名管理 ── */
function _bbsGetUserName() { return localStorage.getItem('bbsUserName') || ''; }
function _bbsUpdateAuthorBar() {
  document.getElementById('bbsAuthorBarName').textContent = _bbsGetUserName() || '未登録';
}

(function() {
  var editBtn = document.getElementById('bbsAuthorEditBtn');
  var editor  = document.getElementById('bbsAuthorEditor');
  var input   = document.getElementById('bbsAuthorInput');
  var saveBtn = document.getElementById('bbsAuthorSaveBtn');

  editBtn.addEventListener('click', function() {
    input.value = _bbsGetUserName();
    editor.style.display = 'flex';
    editBtn.style.display = 'none';
    input.focus();
  });
  function saveAuthor() {
    var name = input.value.trim();
    if (!name) { toast('名前を入力してください', 1500); return; }
    localStorage.setItem('bbsUserName', name);
    _bbsUpdateAuthorBar();
    editor.style.display = 'none';
    editBtn.style.display = '';
    toast('投稿者名を登録しました', 1500);
  }
  saveBtn.addEventListener('click', saveAuthor);
  input.addEventListener('keydown', function(e) { if (e.key === 'Enter') saveAuthor(); });
})();

/* ── データ取得 ── */
async function _bbsFetchPosts() {
  try {
    var snap = await _fbDb.collection('bbs_posts').orderBy('ts', 'desc').limit(200).get();
    _bbsPosts = snap.docs.map(function(d) {
      var data = d.data();
      var ts = data.ts && data.ts.toDate ? data.ts.toDate().toISOString() : (data.ts || new Date().toISOString());
      return Object.assign({}, data, { id: d.id, ts: ts });
    });
    _bbsCheckNew();
    return true;
  } catch(e) {
    console.error('[BBS fetch]', e);
    toast('掲示板の読込失敗', 3000);
    return false;
  }
}

/* ── 削除（管理者のみ） ── */
async function _bbsDeleteById(id) {
  if (!_bbsCurrentUser) return;
  if (!await showConfirm('この投稿を削除しますか？')) return;
  toast('削除中...', 3000);
  try {
    await _fbDb.collection('bbs_posts').doc(id).delete();
    _bbsPosts = _bbsPosts.filter(function(p) { return p.id !== id; });
    _bbsRenderMarkers();
    _bbsRenderList();
    toast('削除しました', 2000);
  } catch(e) { toast('削除失敗: ' + e.message, 4000); }
}

/* ── ヘルパー ── */
function _bbsCatEmoji(cat) {
  return { '道路': '🛣', '河川': '💧', '土砂': '⛰', '施設': '🏢', 'その他': '📌' }[cat] || '📌';
}
function _bbsFmtTime(iso) {
  var d = new Date(iso);
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function _bbsEsc(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* ── マーカー描画 ── */
function _bbsRenderMarkers() {
  _bbsMarkers.forEach(function(m) { map.removeLayer(m); });
  _bbsMarkers = []; _bbsPhotoMap = {};
  var catCol = { '道路': '#e65100', '河川': '#0277bd', '土砂': '#4e342e', '施設': '#2e7d32', 'その他': '#37474f' };
  _bbsPosts.forEach(function(p) {
    if (p.lat == null || p.lng == null) return;
    var col = catCol[p.cat] || '#555';
    var ico = L.divIcon({
      html: '<div style="background:' + col + ';color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);margin:-16px 0 0 -16px">' + _bbsCatEmoji(p.cat) + '</div>',
      iconSize: [32, 32], className: ''
    });
    var pop = '<div style="font-size:12px;max-width:230px"><b>' + _bbsEsc(p.cat) + '</b> <span style="color:#aaa">' + _bbsFmtTime(p.ts) + '</span>';
    if (p.author) pop += ' <span style="color:#888">👤' + _bbsEsc(p.author) + '</span>';
    pop += '<br><div style="margin-top:4px">' + _bbsEsc(p.comment || '') + '</div>';
    if (p.photo) {
      _bbsPhotoMap[p.id] = p.photo;
      pop += '<img src="' + p.photo + '" style="max-width:210px;max-height:130px;border-radius:6px;margin-top:6px;cursor:pointer;display:block" onclick="_bbsOpenPhoto(\'' + p.id + '\')">';
    }
    pop += '</div>';
    var mk = L.marker([p.lat, p.lng], { icon: ico }).addTo(map).bindPopup(pop, { maxWidth: 240 });
    _bbsMarkers.push(mk);
  });
}
window._bbsOpenPhoto = function(id) { if (_bbsPhotoMap[id]) openPhoto(_bbsPhotoMap[id]); };

/* ── 投稿一覧描画 ── */
function _bbsRenderList() {
  var listEl   = document.getElementById('bbsList');
  var loadMsg  = document.getElementById('bbsLoadingMsg');
  var emptyMsg = document.getElementById('bbsEmptyMsg');
  if (!listEl) return;
  loadMsg.style.display = 'none';
  if (!_bbsPosts.length) { emptyMsg.style.display = 'block'; listEl.innerHTML = ''; return; }
  emptyMsg.style.display = 'none';
  var sorted = _bbsPosts.slice().sort(function(a, b) { return new Date(b.ts) - new Date(a.ts); });
  listEl.innerHTML = '';
  sorted.forEach(function(p) {
    var card = document.createElement('div');
    card.className = 'bbs-card';
    var hdr = document.createElement('div');
    hdr.className = 'bbs-card-header';
    var badge = document.createElement('span');
    badge.className = 'bbs-cat-badge';
    badge.textContent = _bbsCatEmoji(p.cat) + ' ' + p.cat;
    var ts = document.createElement('span');
    ts.className = 'bbs-time';
    ts.textContent = _bbsFmtTime(p.ts);
    hdr.appendChild(badge); hdr.appendChild(ts);
    if (p.lat != null) {
      var jb = document.createElement('button');
      jb.className = 'bbs-icon-btn'; jb.textContent = '🗺 地図';
      jb.addEventListener('click', function() { map.setView([p.lat, p.lng], 16); closeBbsPanel(); });
      hdr.appendChild(jb);
    }
    if (_bbsCurrentUser) {
      var db = document.createElement('button');
      db.className = 'bbs-icon-btn'; db.textContent = '🗑'; db.style.color = '#c00';
      db.addEventListener('click', function() { _bbsDeleteById(p.id); });
      hdr.appendChild(db);
    }
    card.appendChild(hdr);
    if (p.author) {
      var au = document.createElement('div');
      au.className = 'bbs-author'; au.textContent = '👤 ' + p.author;
      card.appendChild(au);
    }
    var cm = document.createElement('div');
    cm.className = 'bbs-comment'; cm.textContent = p.comment || '';
    card.appendChild(cm);
    if (p.photo) {
      var img = document.createElement('img');
      img.src = p.photo; img.className = 'bbs-photo';
      img.addEventListener('click', function() { openPhoto(p.photo); });
      card.appendChild(img);
    }
    if (p.lat != null) {
      var loc = document.createElement('div');
      loc.className = 'bbs-loc';
      loc.textContent = '📍 ' + p.lat.toFixed(5) + ', ' + p.lng.toFixed(5);
      card.appendChild(loc);
    }
    listEl.appendChild(card);
  });
}

/* ── 未読バッジ ── */
var bbsPanel    = document.getElementById('bbsPanel');
var bbsFloatBtn = document.getElementById('bbsFloatBtn');
var bbsBadge    = document.getElementById('bbsBadge');

function _bbsCheckNew() {
  var last = localStorage.getItem('bbsLastSeen') || '';
  var hasNew = _bbsPosts.some(function(p) { return p.ts > last; });
  bbsBadge.style.display = hasNew ? 'block' : 'none';
}
function _bbsMarkSeen() {
  var latest = _bbsPosts.reduce(function(m, p) { return p.ts > m ? p.ts : m; }, '');
  if (latest) localStorage.setItem('bbsLastSeen', latest);
  bbsBadge.style.display = 'none';
}

/* ── パネル開閉 ── */
window.openBbsPanel = async function() {
  _bbsUpdateAuthorBar();
  bbsPanel.style.display = 'flex';
  bbsPanel.classList.remove('collapsed');
  bbsFloatBtn.classList.add('active');
  _bbsMarkSeen();
  document.querySelectorAll('.bbs-tab').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('bbsTabList').classList.add('active');
  document.getElementById('bbsListPane').style.display = '';
  document.getElementById('bbsNewPane').style.display = 'none';
  document.getElementById('bbsLoadingMsg').style.display = 'block';
  document.getElementById('bbsEmptyMsg').style.display = 'none';
  document.getElementById('bbsList').innerHTML = '';
  if (await _bbsFetchPosts()) _bbsRenderMarkers();
  _bbsRenderList();
  if (!_bbsTimer) _bbsTimer = setInterval(async function() {
    if (await _bbsFetchPosts()) _bbsRenderMarkers();
    _bbsRenderList();
  }, 30000);
};

window.closeBbsPanel = function() {
  bbsPanel.style.display = 'none';
  bbsFloatBtn.classList.remove('active');
  clearInterval(_bbsTimer); _bbsTimer = null;
};

/* ── タブ切り替え ── */
function _bbsUpdateLocStatus() {
  var el = document.getElementById('bbsLocStatus');
  if (_bbsLat != null) {
    el.textContent = '📍 ' + _bbsLat.toFixed(5) + ', ' + _bbsLng.toFixed(5);
    el.style.color = '#2e7d32';
  } else {
    el.textContent = '位置情報なし';
    el.style.color = '#999';
  }
  document.getElementById('bbsUsePhotoLocBtn').style.display = _bbsPhotoLat != null ? '' : 'none';
}

function _bbsAutoGetLoc() {
  if (_bbsLat != null) return;
  document.getElementById('bbsLocStatus').textContent = '📡 取得中...';
  document.getElementById('bbsLocStatus').style.color = '#888';
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      _bbsLat = pos.coords.latitude; _bbsLng = pos.coords.longitude;
      _bbsUpdateLocStatus();
    },
    function() {
      document.getElementById('bbsLocStatus').textContent = '位置情報なし（取得失敗）';
      document.getElementById('bbsLocStatus').style.color = '#999';
    },
    { enableHighAccuracy: true, timeout: 15000 }
  );
}

document.getElementById('bbsClearLocBtn').addEventListener('click', function() {
  _bbsLat = null; _bbsLng = null; _bbsUpdateLocStatus();
});
document.getElementById('bbsUsePhotoLocBtn').addEventListener('click', function() {
  if (_bbsPhotoLat == null) return;
  _bbsLat = _bbsPhotoLat; _bbsLng = _bbsPhotoLng;
  _bbsUpdateLocStatus();
  toast('写真の位置情報を使います', 1500);
});

document.querySelectorAll('.bbs-tab').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.bbs-tab').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    var tab = btn.dataset.tab;
    document.getElementById('bbsListPane').style.display = tab === 'list' ? '' : 'none';
    document.getElementById('bbsNewPane').style.display  = tab === 'new'  ? '' : 'none';
    if (tab === 'new') _bbsAutoGetLoc();
  });
});

bbsFloatBtn.addEventListener('click', function() {
  if (bbsPanel.style.display === 'flex') closeBbsPanel();
  else openBbsPanel();
});

document.getElementById('bbsClose').addEventListener('click', closeBbsPanel);
document.getElementById('bbsCollapseBtn').addEventListener('click', function() { bbsPanel.classList.toggle('collapsed'); });
document.getElementById('bbsRefreshBtn').addEventListener('click', async function() {
  document.getElementById('bbsLoadingMsg').style.display = 'block';
  document.getElementById('bbsList').innerHTML = '';
  if (await _bbsFetchPosts()) _bbsRenderMarkers();
  _bbsRenderList();
  toast('更新しました', 1500);
});

/* ── ドラッグ ── */
(function() {
  var handle = document.getElementById('bbsHandle');
  var drag = null;
  function startDrag(cx, cy) { var r = bbsPanel.getBoundingClientRect(); drag = { ox: cx - r.left, oy: cy - r.top }; }
  function moveDrag(cx, cy) {
    if (!drag) return;
    var x = Math.max(0, Math.min(window.innerWidth  - bbsPanel.offsetWidth,  cx - drag.ox));
    var y = Math.max(0, Math.min(window.innerHeight - bbsPanel.offsetHeight, cy - drag.oy));
    bbsPanel.style.left = x + 'px'; bbsPanel.style.top = y + 'px'; bbsPanel.style.right = 'auto';
  }
  function endDrag() { drag = null; }
  handle.addEventListener('touchstart', function(e) { if (e.target.closest('button')) return; startDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  handle.addEventListener('touchmove', function(e) { if (!drag) return; e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
  handle.addEventListener('touchend', endDrag, { passive: true });
  handle.addEventListener('mousedown', function(e) { if (e.target.closest('button')) return; startDrag(e.clientX, e.clientY); handle.style.cursor = 'grabbing'; });
  document.addEventListener('mousemove', function(e) { if (drag) moveDrag(e.clientX, e.clientY); });
  document.addEventListener('mouseup', function() { endDrag(); handle.style.cursor = 'grab'; });
})();

/* ── 写真圧縮 ── */
function _bbsCompressPhoto(file) {
  return new Promise(function(resolve) {
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function() {
      var MAX = 640, w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      var q = 0.82, dataUrl;
      do { dataUrl = c.toDataURL('image/jpeg', q); q -= 0.1; } while (dataUrl.length > 68000 && q > 0.2);
      resolve(dataUrl);
    };
    img.onerror = function() { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

async function _bbsHandlePhoto(file, fromCamera) {
  if (!file) return;
  _bbsPhotoLat = null; _bbsPhotoLng = null;
  if (fromCamera) {
    if (window._lastKnownPos) {
      _bbsPhotoLat = _lastKnownPos.coords.latitude;
      _bbsPhotoLng = _lastKnownPos.coords.longitude;
    }
  } else {
    if (window.exifr) {
      try {
        var gps = await exifr.gps(file);
        if (gps && gps.latitude && gps.longitude) {
          _bbsPhotoLat = gps.latitude; _bbsPhotoLng = gps.longitude;
        }
      } catch(_) {}
    }
  }
  if (_bbsPhotoLat != null) { _bbsLat = _bbsPhotoLat; _bbsLng = _bbsPhotoLng; }
  document.getElementById('bbsTakePhotoBtn').textContent = '圧縮中...';
  document.getElementById('bbsPickPhotoBtn').textContent = '圧縮中...';
  _bbsPhotoB64 = await _bbsCompressPhoto(file);
  if (_bbsPhotoB64) {
    var prev = document.getElementById('bbsPhotoPreview');
    prev.src = _bbsPhotoB64; prev.style.display = 'block';
  }
  document.getElementById('bbsTakePhotoBtn').textContent = '📷 撮影する';
  document.getElementById('bbsPickPhotoBtn').textContent = '🖼 ギャラリー';
  _bbsUpdateLocStatus();
}

function _bbsOpenFileInput(useCamera) {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  if (useCamera) inp.setAttribute('capture', 'environment');
  inp.style.cssText = 'position:fixed;top:0;left:0;opacity:0;width:0;height:0;pointer-events:none;';
  document.body.appendChild(inp);
  inp.onchange = function(e) {
    var f = e.target.files[0];
    if (f) _bbsHandlePhoto(f, useCamera);
    document.body.removeChild(inp);
  };
  inp.click();
}

document.getElementById('bbsTakePhotoBtn').addEventListener('click', function() { _bbsOpenFileInput(true); });
document.getElementById('bbsPickPhotoBtn').addEventListener('click', function() { _bbsOpenFileInput(false); });
document.getElementById('bbsPhotoInput').addEventListener('change', function(e) { _bbsHandlePhoto(e.target.files[0]); e.target.value = ''; });
document.getElementById('bbsPhotoPreview').addEventListener('click', function() { if (_bbsPhotoB64) openPhoto(_bbsPhotoB64); });

/* ── 投稿（認証不要） ── */
document.getElementById('bbsSubmitBtn').addEventListener('click', async function() {
  var comment = document.getElementById('bbsComment').value.trim();
  var cat     = document.getElementById('bbsCatSel').value;
  if (!comment) { toast('コメントを入力してください', 2000); return; }
  var author = _bbsGetUserName();
  if (!author) { toast('先に投稿者名を登録してください', 2000); return; }
  var btn    = document.getElementById('bbsSubmitBtn');
  var status = document.getElementById('bbsFormStatus');
  btn.disabled = true; status.textContent = '投稿中...';
  try {
    await _fbDb.collection('bbs_posts').add({
      ts:      firebase.firestore.FieldValue.serverTimestamp(),
      cat:     cat,
      comment: comment,
      author:  author,
      lat:     _bbsLat,
      lng:     _bbsLng,
      photo:   _bbsPhotoB64 || null
    });
    document.getElementById('bbsComment').value = '';
    _bbsPhotoB64 = null; _bbsLat = null; _bbsLng = null; _bbsPhotoLat = null; _bbsPhotoLng = null;
    document.getElementById('bbsPhotoPreview').style.display = 'none';
    document.getElementById('bbsTakePhotoBtn').textContent = '📷 撮影する';
    document.getElementById('bbsPickPhotoBtn').textContent = '🖼 ギャラリー';
    _bbsUpdateLocStatus();
    document.querySelectorAll('.bbs-tab').forEach(function(b) { b.classList.remove('active'); });
    document.getElementById('bbsTabList').classList.add('active');
    document.getElementById('bbsListPane').style.display = '';
    document.getElementById('bbsNewPane').style.display  = 'none';
    if (await _bbsFetchPosts()) _bbsRenderMarkers();
    _bbsRenderList();
    toast('投稿しました！', 2500);
    status.textContent = '';
  } catch(e) {
    status.textContent = '投稿失敗: ' + e.message;
    toast('投稿に失敗しました', 3000);
  }
  btn.disabled = false;
});

}; /* _bbsStart end */
