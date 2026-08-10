/* =============================================
   現場掲示板 — Firebase Firestore
   投稿タイプ: 安否確認 / 災害発見 / SOS
   削除: 管理者（隠しログイン）のみ
   ============================================= */

window._bbsStart = function() {

var firebaseConfig = {
  apiKey: 'AIzaSyCVJNDMILPbA4n0hSimX5d-WzcJO_n0oRQ',
  authDomain: 'agatto-map.firebaseapp.com',
  projectId: 'agatto-map',
  storageBucket: 'agatto-map.firebasestorage.app',
  messagingSenderId: '694313355581',
  appId: '1:694313355581:web:e351429ad4e68819b61d54'
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
var _fbDb   = firebase.firestore();
var _fbAuth = firebase.auth();

var _bbsPosts       = [];
var _bbsMarkers     = [];
var _bbsPhotoMap    = {};
var _bbsNewestTs    = null; // 差分取得用: 最新投稿の Firestore Timestamp
var _bbsTimer       = null;
var _bbsPhotoB64    = null;
var _bbsLat         = null;
var _bbsLng         = null;
var _bbsPhotoLat    = null;
var _bbsPhotoLng    = null;
var _bbsCurrentUser = null;
var _bbsPostType    = 'safety';

/* ── 登録情報 ── */
function _getReg() {
  return {
    kumi: localStorage.getItem('uedoBbsKumi') || '',
    name: localStorage.getItem('uedoBbsName') || ''
  };
}
function _bbsUpdateAuthorBar() {
  var reg = _getReg();
  document.getElementById('bbsAuthorBarInfo').textContent =
    (reg.kumi && reg.name) ? reg.kumi + '　' + reg.name : '未登録';
}
document.getElementById('bbsAuthorEditBtn').addEventListener('click', function() {
  window._openRegModal(function() { _bbsUpdateAuthorBar(); });
});

/* ── 管理者認証（隠し：パネルタイトルを5回タップ） ── */
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

/* ── タイプ選択 ── */
function _bbsShowTypePane() {
  document.getElementById('bbsTypePane').style.display    = '';
  document.getElementById('bbsSafetyPane').style.display  = 'none';
  document.getElementById('bbsDisasterPane').style.display = 'none';
  document.getElementById('bbsSubmitBtn').style.display   = 'none';
  document.getElementById('bbsFormStatus').textContent    = '';
}
document.querySelectorAll('.bbs-type-big-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    _bbsPostType = btn.dataset.type;
    document.getElementById('bbsTypePane').style.display    = 'none';
    document.getElementById('bbsSafetyPane').style.display  = _bbsPostType === 'safety' ? '' : 'none';
    document.getElementById('bbsDisasterPane').style.display = _bbsPostType !== 'safety' ? '' : 'none';
    document.getElementById('bbsSubmitBtn').style.display   = '';
    if (_bbsPostType === 'disaster') _bbsAutoGetLoc();
  });
});
document.querySelectorAll('.bbs-back-btn').forEach(function(btn) {
  btn.addEventListener('click', _bbsShowTypePane);
});

/* ── データ取得（初回は全件、以降は差分のみ） ── */
async function _bbsFetchPosts() {
  try {
    var col = _fbDb.collection('bbs_posts');
    var snap;
    var isIncremental = !!_bbsNewestTs;

    if (isIncremental) {
      snap = await col.orderBy('ts', 'desc').where('ts', '>', _bbsNewestTs).get();
    } else {
      snap = await col.orderBy('ts', 'desc').limit(200).get();
    }

    var mapped = snap.docs.map(function(d) {
      var data  = d.data();
      var rawTs = data.ts;
      var ts    = rawTs && rawTs.toDate ? rawTs.toDate().toISOString() : (rawTs || new Date().toISOString());
      return Object.assign({}, data, { id: d.id, ts: ts, _rawTs: rawTs });
    });

    if (isIncremental) {
      if (!mapped.length) return false;
      var existingIds = new Set(_bbsPosts.map(function(p) { return p.id; }));
      var fresh = mapped.filter(function(p) { return !existingIds.has(p.id); });
      if (!fresh.length) return false;
      _bbsPosts = fresh.concat(_bbsPosts);
    } else {
      _bbsPosts = mapped;
    }

    // 最新 Firestore Timestamp を更新
    _bbsPosts.forEach(function(p) {
      if (!p._rawTs) return;
      if (!_bbsNewestTs || p._rawTs.seconds > _bbsNewestTs.seconds) _bbsNewestTs = p._rawTs;
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
function _bbsTypeLabel(p) {
  if (p.type === 'sos')      return { icon: '🆘', color: '#c62828', label: 'SOS' };
  if (p.type === 'safety') {
    if (p.status === '異常あり')
      return { icon: '⚠️', color: '#e65100', label: '安否確認' };
    return { icon: '✅', color: '#2e7d32', label: '安否確認' };
  }
  return { icon: '📝', color: '#37474f', label: '自由コメント' };
}

/* ── マーカー描画 ── */
function _bbsRenderMarkers() {
  _bbsMarkers.forEach(function(m) { map.removeLayer(m); });
  _bbsMarkers = []; _bbsPhotoMap = {};
  _bbsPosts.forEach(function(p) {
    if (p.lat == null || p.lng == null) return;
    var tl = _bbsTypeLabel(p);
    var isSos = p.type === 'sos';
    var sz = isSos ? 50 : 34;
    var half = sz / 2;
    var icoHtml = isSos
      ? '<div style="background:linear-gradient(160deg,#ef5350 0%,#c62828 55%,#8e0000 100%);color:#fff;border-radius:50%;width:50px;height:50px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;font-family:sans-serif;letter-spacing:0.05em;border:3px solid #fff;box-shadow:0 4px 0 #7b0000,0 6px 14px rgba(140,0,0,0.55),inset 0 1px 3px rgba(255,255,255,0.25);margin:-25px 0 0 -25px;text-shadow:0 1px 2px rgba(0,0,0,0.4)">SOS</div>'
      : '<div style="background:' + tl.color + ';color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:17px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);margin:-17px 0 0 -17px">' + tl.icon + '</div>';
    var ico = L.divIcon({
      html: icoHtml,
      iconSize: [sz, sz], className: ''
    });
    var pop = '<div style="font-size:12px;max-width:230px">';
    pop += '<b>' + _bbsEsc(tl.label) + '</b> <span style="color:#aaa">' + _bbsFmtTime(p.ts) + '</span>';
    if (p.kumi || p.author) pop += '<br><span style="color:#666">👤 ' + _bbsEsc((p.kumi || '') + '　' + (p.author || '')) + '</span>';
    if (p.status) pop += '<br><span style="font-weight:bold">' + _bbsEsc(p.status) + '</span>';
    if (p.comment) pop += '<br>' + _bbsEsc(p.comment);
    if (p.photo) {
      _bbsPhotoMap[p.id] = p.photo;
      pop += '<img src="' + p.photo + '" style="max-width:210px;max-height:130px;border-radius:6px;margin-top:6px;cursor:pointer;display:block" onclick="_bbsOpenPhoto(\'' + p.id + '\')">';
    }
    pop += '</div>';
    var mk = L.marker([p.lat, p.lng], { icon: ico, zIndexOffset: isSos ? 1000 : 0 }).addTo(map).bindPopup(pop, { maxWidth: 240 });
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
  var sorted = _bbsPosts.slice().sort(function(a, b) {
    return new Date(b.ts) - new Date(a.ts);
  });
  listEl.innerHTML = '';
  sorted.forEach(function(p) {
    var tl   = _bbsTypeLabel(p);
    var isSos = p.type === 'sos';
    var card = document.createElement('div');
    card.className = 'bbs-card';
    card.style.borderLeft = '4px solid ' + tl.color;
    if (isSos) card.style.cssText += ';padding:11px 12px;';

    var hdr = document.createElement('div');
    hdr.className = 'bbs-card-header';

    var badge = document.createElement('span');
    badge.className = 'bbs-cat-badge';
    badge.style.background = tl.color;
    badge.textContent = tl.icon + ' ' + tl.label;

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

    if (p.kumi || p.author) {
      var au = document.createElement('div');
      au.className = 'bbs-author';
      au.textContent = '👤 ' + (p.kumi || '') + '　' + (p.author || '');
      card.appendChild(au);
    }
    if (p.status) {
      var st = document.createElement('div');
      st.style.cssText = 'font-size:13px;font-weight:bold;margin:4px 0;color:' + tl.color;
      st.textContent = p.status;
      card.appendChild(st);
    }
    if (p.comment) {
      var cm = document.createElement('div');
      cm.className = 'bbs-comment'; cm.textContent = p.comment;
      card.appendChild(cm);
    }
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

/* ── 新規投稿ボタン / 一覧に戻る ── */
function _bbsShowList() {
  document.getElementById('bbsListPane').style.display = '';
  document.getElementById('bbsNewPane').style.display  = 'none';
}
document.getElementById('bbsNewBtn').addEventListener('click', function() {
  document.getElementById('bbsListPane').style.display = 'none';
  document.getElementById('bbsNewPane').style.display  = '';
  _bbsShowTypePane();
});
document.querySelectorAll('.bbs-back-to-list-btn').forEach(function(btn) {
  btn.addEventListener('click', _bbsShowList);
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

/* ── 初回フェッチ・定期更新 ── */
(async function() {
  if (await _bbsFetchPosts()) _bbsRenderMarkers();
  setInterval(async function() {
    if (bbsPanel.style.display !== 'flex') {
      if (await _bbsFetchPosts()) _bbsRenderMarkers();
    }
  }, 60000);
})();

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

/* ── 位置情報 ── */
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
  if (window._lastKnownPos) {
    _bbsLat = window._lastKnownPos.coords.latitude;
    _bbsLng = window._lastKnownPos.coords.longitude;
    _bbsUpdateLocStatus(); return;
  }
  document.getElementById('bbsLocStatus').textContent = '📡 取得中...';
  document.getElementById('bbsLocStatus').style.color = '#888';
  navigator.geolocation.getCurrentPosition(
    function(pos) { _bbsLat = pos.coords.latitude; _bbsLng = pos.coords.longitude; _bbsUpdateLocStatus(); },
    function() { document.getElementById('bbsLocStatus').textContent = '取得失敗'; document.getElementById('bbsLocStatus').style.color = '#999'; },
    { enableHighAccuracy: true, timeout: 15000 }
  );
}
document.getElementById('bbsClearLocBtn').addEventListener('click', function() {
  _bbsLat = null; _bbsLng = null; _bbsUpdateLocStatus();
});
document.getElementById('bbsUsePhotoLocBtn').addEventListener('click', function() {
  if (_bbsPhotoLat == null) return;
  _bbsLat = _bbsPhotoLat; _bbsLng = _bbsPhotoLng;
  _bbsUpdateLocStatus(); toast('写真の位置情報を使います', 1500);
});

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
    if (window._lastKnownPos) { _bbsPhotoLat = window._lastKnownPos.coords.latitude; _bbsPhotoLng = window._lastKnownPos.coords.longitude; }
  } else {
    if (window.exifr) {
      try {
        var gps = await exifr.gps(file);
        if (gps && gps.latitude && gps.longitude) { _bbsPhotoLat = gps.latitude; _bbsPhotoLng = gps.longitude; }
      } catch(_) {}
    }
  }
  if (_bbsPhotoLat != null) { _bbsLat = _bbsPhotoLat; _bbsLng = _bbsPhotoLng; }
  document.getElementById('bbsTakePhotoBtn').textContent = '圧縮中...';
  document.getElementById('bbsPickPhotoBtn').textContent = '圧縮中...';
  _bbsPhotoB64 = await _bbsCompressPhoto(file);
  if (_bbsPhotoB64) { var prev = document.getElementById('bbsPhotoPreview'); prev.src = _bbsPhotoB64; prev.style.display = 'block'; }
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
  inp.onchange = function(e) { var f = e.target.files[0]; if (f) _bbsHandlePhoto(f, useCamera); document.body.removeChild(inp); };
  inp.click();
}
document.getElementById('bbsTakePhotoBtn').addEventListener('click', function() { _bbsOpenFileInput(true); });
document.getElementById('bbsPickPhotoBtn').addEventListener('click', function() { _bbsOpenFileInput(false); });
document.getElementById('bbsPhotoInput').addEventListener('change', function(e) { _bbsHandlePhoto(e.target.files[0]); e.target.value = ''; });
document.getElementById('bbsPhotoPreview').addEventListener('click', function() { if (_bbsPhotoB64) openPhoto(_bbsPhotoB64); });

/* ── 投稿 ── */
document.getElementById('bbsSubmitBtn').addEventListener('click', async function() {
  var reg = _getReg();
  if (!reg.kumi || !reg.name) { toast('先に組名・氏名を登録してください', 2500); return; }
  var btn = document.getElementById('bbsSubmitBtn');
  var status = document.getElementById('bbsFormStatus');
  var postData = {
    ts:      firebase.firestore.FieldValue.serverTimestamp(),
    type:    _bbsPostType,
    kumi:    reg.kumi,
    author:  reg.name,
    lat:     null,
    lng:     null,
    photo:   null
  };
  if (_bbsPostType === 'safety') {
    postData.status  = document.getElementById('bbsStatusSel').value;
    postData.comment = document.getElementById('bbsSafetyComment').value.trim();
  } else {
    var comment = document.getElementById('bbsDisasterComment').value.trim();
    if (!comment) { toast('コメントを入力してください', 2000); return; }
    postData.comment = comment;
    postData.lat     = _bbsLat;
    postData.lng     = _bbsLng;
    postData.photo   = _bbsPhotoB64 || null;
  }
  btn.disabled = true; status.textContent = '投稿中...';
  try {
    await _fbDb.collection('bbs_posts').add(postData);
    document.getElementById('bbsSafetyComment').value  = '';
    document.getElementById('bbsDisasterComment').value = '';
    _bbsPhotoB64 = null; _bbsLat = null; _bbsLng = null; _bbsPhotoLat = null; _bbsPhotoLng = null;
    document.getElementById('bbsPhotoPreview').style.display = 'none';
    document.getElementById('bbsTakePhotoBtn').textContent = '📷 撮影する';
    document.getElementById('bbsPickPhotoBtn').textContent = '🖼 ギャラリー';
    _bbsUpdateLocStatus();
    _bbsShowList();
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

/* ── SOS送信 ── */
window._bbsSendSOS = async function() {
  var reg = _getReg();
  if (!reg.kumi || !reg.name) { toast('組名・氏名の登録が必要です', 2500); return; }
  if (!await showConfirm('SOSを送信しますか？\n緊急時のみ使用してください。')) return;
  var lat = window._lastKnownPos ? window._lastKnownPos.coords.latitude  : null;
  var lng = window._lastKnownPos ? window._lastKnownPos.coords.longitude : null;
  try {
    await _fbDb.collection('bbs_posts').add({
      ts:     firebase.firestore.FieldValue.serverTimestamp(),
      type:   'sos',
      kumi:   reg.kumi,
      author: reg.name,
      comment: 'SOS',
      lat:    lat,
      lng:    lng,
      photo:  null
    });
    toast('🆘 SOSを送信しました', 4000);
    if (await _bbsFetchPosts()) _bbsRenderMarkers();
  } catch(e) { toast('SOS送信失敗: ' + e.message, 4000); }
};

/* ── 投稿ログ ── */
var _bbsLogFiltered = [];

function _bbsOpenLog() {
  var today   = new Date().toISOString().slice(0, 10);
  var weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  document.getElementById('bbsLogFrom').value = weekAgo;
  document.getElementById('bbsLogTo').value   = today;
  document.getElementById('bbsLogModal').classList.add('open');
  _bbsRenderLog();
}

function _bbsRenderLog() {
  var fromVal  = document.getElementById('bbsLogFrom').value;
  var toVal    = document.getElementById('bbsLogTo').value;
  var fromDate = fromVal ? new Date(fromVal + 'T00:00:00') : null;
  var toDate   = toVal   ? new Date(toVal   + 'T23:59:59') : null;

  _bbsLogFiltered = _bbsPosts.filter(function(p) {
    var d = new Date(p.ts);
    if (fromDate && d < fromDate) return false;
    if (toDate   && d > toDate)   return false;
    return true;
  }).sort(function(a, b) { return new Date(a.ts) - new Date(b.ts); });

  document.getElementById('bbsLogCount').textContent = _bbsLogFiltered.length + '件';

  var list = document.getElementById('bbsLogList');
  if (!_bbsLogFiltered.length) {
    list.innerHTML = '<div style="text-align:center;color:#999;padding:24px">該当する投稿がありません</div>';
    return;
  }

  list.innerHTML = '';
  _bbsLogFiltered.forEach(function(p) {
    var tl  = _bbsTypeLabel(p);
    var row = document.createElement('div');
    row.className = 'bbs-log-row';
    row.style.borderLeftColor = tl.color;

    var d  = new Date(p.ts);
    var dt = d.getFullYear() + '/' +
             String(d.getMonth() + 1).padStart(2, '0') + '/' +
             String(d.getDate()).padStart(2, '0') + ' ' +
             String(d.getHours()).padStart(2, '0') + ':' +
             String(d.getMinutes()).padStart(2, '0');

    var content = '';
    if (p.status)  content = p.status;
    if (p.comment) content += (content ? '　' : '') + p.comment;

    var author = (p.kumi || '') + (p.kumi && (p.author || p.name) ? '　' : '') + (p.author || p.name || '');

    row.innerHTML =
      '<div class="bbs-log-meta">' +
        '<span class="bbs-log-time">' + dt + '</span>' +
        '<span class="bbs-log-badge" style="background:' + tl.color + '">' + tl.icon + ' ' + _bbsEsc(tl.label) + '</span>' +
        '<span class="bbs-log-author">' + _bbsEsc(author) + '</span>' +
      '</div>' +
      (content ? '<div class="bbs-log-content">' + _bbsEsc(content) + '</div>' : '');

    list.appendChild(row);
  });
}

function _bbsPrintLog() {
  var fromVal = document.getElementById('bbsLogFrom').value;
  var toVal   = document.getElementById('bbsLogTo').value;

  var html = '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>掲示板ログ</title><style>' +
    'body{font-family:sans-serif;font-size:12px;margin:20px}' +
    'h2{font-size:15px;margin-bottom:4px}' +
    '.period{font-size:11px;color:#666;margin-bottom:12px}' +
    'table{width:100%;border-collapse:collapse}' +
    'th,td{border:1px solid #ccc;padding:5px 8px;text-align:left;vertical-align:top}' +
    'th{background:#eceff1;font-size:11px}' +
    '.badge{display:inline-block;color:#fff;border-radius:3px;padding:1px 5px;font-size:11px}' +
    '</style></head><body>' +
    '<h2>📄 掲示板ログ — 上戸地区防災マップ</h2>' +
    '<div class="period">期間: ' + (fromVal || '—') + ' 〜 ' + (toVal || '—') +
      '　全 ' + _bbsLogFiltered.length + ' 件　（印刷: ' + new Date().toLocaleString('ja-JP') + '）</div>' +
    '<table><thead><tr><th>日時</th><th>種別</th><th>組名・氏名</th><th>内容</th></tr></thead><tbody>';

  _bbsLogFiltered.forEach(function(p) {
    var tl = _bbsTypeLabel(p);
    var d  = new Date(p.ts);
    var dt = d.getFullYear() + '/' +
             String(d.getMonth() + 1).padStart(2, '0') + '/' +
             String(d.getDate()).padStart(2, '0') + ' ' +
             String(d.getHours()).padStart(2, '0') + ':' +
             String(d.getMinutes()).padStart(2, '0');
    var content = '';
    if (p.status)  content = p.status;
    if (p.comment) content += (content ? ' / ' : '') + p.comment;
    var author = (p.kumi || '') + (p.kumi && (p.author || p.name) ? '　' : '') + (p.author || p.name || '');
    html += '<tr><td style="white-space:nowrap">' + dt + '</td>' +
      '<td><span class="badge" style="background:' + tl.color + '">' + tl.icon + ' ' + _bbsEsc(tl.label) + '</span></td>' +
      '<td>' + _bbsEsc(author) + '</td>' +
      '<td>' + _bbsEsc(content) + '</td></tr>';
  });

  html += '</tbody></table></body></html>';

  var w = window.open('', '_blank', 'width=820,height=640');
  w.document.write(html);
  w.document.close();
  setTimeout(function() { w.print(); }, 400);
}

function _bbsExportCsv() {
  var headers = ['日時', '種別', '組名', '氏名', '状態', 'コメント', '緯度', '経度'];
  var rows = [headers];

  _bbsLogFiltered.forEach(function(p) {
    var tl = _bbsTypeLabel(p);
    var d  = new Date(p.ts);
    var dt = d.getFullYear() + '/' +
             String(d.getMonth() + 1).padStart(2, '0') + '/' +
             String(d.getDate()).padStart(2, '0') + ' ' +
             String(d.getHours()).padStart(2, '0') + ':' +
             String(d.getMinutes()).padStart(2, '0');
    rows.push([
      dt,
      tl.label,
      p.kumi    || '',
      p.author  || p.name || '',
      p.status  || '',
      p.comment || '',
      p.lat != null ? p.lat : '',
      p.lng != null ? p.lng : ''
    ]);
  });

  var csv = '﻿'; // BOM（Excel/QGISでの文字化け防止）
  rows.forEach(function(row) {
    csv += row.map(function(v) {
      var s = String(v);
      if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) {
        s = '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(',') + '\r\n';
  });

  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = 'bbs_log_' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.getElementById('bbsLogBtn').addEventListener('click', _bbsOpenLog);
document.getElementById('bbsLogSearchBtn').addEventListener('click', _bbsRenderLog);
document.getElementById('bbsLogModalClose').addEventListener('click', function() {
  document.getElementById('bbsLogModal').classList.remove('open');
});
document.getElementById('bbsLogCloseBtn').addEventListener('click', function() {
  document.getElementById('bbsLogModal').classList.remove('open');
});
document.getElementById('bbsLogCsvBtn').addEventListener('click', _bbsExportCsv);
document.getElementById('bbsLogPrintBtn').addEventListener('click', _bbsPrintLog);

}; /* _bbsStart end */
