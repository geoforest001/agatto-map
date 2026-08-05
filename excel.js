/* =============================================
   Excel / CSV 連携モジュール
   GeoJSON レイヤー + PMTiles レイヤー対応
   ============================================= */

let _xlsxRows       = [];
let _xlsxJoinMap    = null;
let _xlsxTargetName = '';
let _xlsxKeyGeo     = '';
let _xlsxKeyXls     = '';
let _xlsxIsPmTiles  = false;

const _xlsxInput     = document.getElementById('xlsxInput');
const _xlsxModal     = document.getElementById('xlsxModal');
const _xlsxLayerSel  = document.getElementById('xlsxLayerSel');
const _xlsxKeyGeoSel = document.getElementById('xlsxKeyGeo');
const _xlsxKeyXlsSel = document.getElementById('xlsxKeyXls');
const _xlsxModalInfo = document.getElementById('xlsxModalInfo');
const _xlsxStatCard  = document.getElementById('xlsxStatCard');
const _xlsxStatText  = document.getElementById('xlsxStatText');

window.xlsxOpenFile = function() {
  _xlsxInput.value = '';
  _xlsxInput.click();
};

/* ── レイヤー一覧（GeoJSON + PMTiles 両方） ── */
function _getAllLayerNames() {
  const names = [];
  Object.keys(overlays).forEach(function(n) { names.push({ name: n, type: 'geojson' }); });
  Object.keys(window.pmLayers || {}).forEach(function(n) { names.push({ name: n, type: 'pmtiles' }); });
  return names;
}

/* ── GeoJSONレイヤーの属性フィールド名を取得 ── */
function _getGeoJsonFields(layerName) {
  var lyr = overlays[layerName];
  if (!lyr) return [];
  var fields = new Set();
  lyr.eachLayer(function(l) {
    var props = l.feature && l.feature.properties;
    if (props) Object.keys(props).forEach(function(k) { fields.add(k); });
  });
  return Array.from(fields);
}

/* ── レイヤー選択変更時にキー列を更新 ── */
function _updateGeoFields() {
  var name = _xlsxLayerSel.value;
  var pm = window.pmLayers && window.pmLayers[name];
  var fields = pm ? pm.keys : _getGeoJsonFields(name);
  _xlsxKeyGeoSel.innerHTML = fields.length
    ? fields.map(function(f) { return '<option value="' + f + '">' + f + '</option>'; }).join('')
    : '<option value="">（フィールドなし）</option>';
}

_xlsxLayerSel.addEventListener('change', _updateGeoFields);

/* ── モーダルを開く ── */
function _openXlsxModal() {
  var layers = _getAllLayerNames();
  if (!layers.length) {
    toast('レイヤーが読み込まれていません。先にデータを追加してください。', 3000);
    return;
  }
  _xlsxLayerSel.innerHTML = layers.map(function(l) {
    var badge = l.type === 'pmtiles' ? ' [PMTiles]' : ' [GeoJSON]';
    return '<option value="' + l.name + '">' + l.name + badge + '</option>';
  }).join('');
  _updateGeoFields();
  _xlsxModal.classList.add('show');
}

/* ── CSV パーサー ── */
function _parseCsvLine(line) {
  var result = [], inQ = false, field = '';
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else field += ch;
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { result.push(field); field = ''; }
      else field += ch;
    }
  }
  result.push(field);
  return result;
}

function _parseCsv(text) {
  var lines = text.split(/\r?\n/);
  var headers = _parseCsvLine(lines[0]);
  var rows = [];
  for (var i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    var vals = _parseCsvLine(lines[i]);
    var obj = {};
    headers.forEach(function(h, j) { obj[h] = vals[j] !== undefined ? vals[j] : ''; });
    rows.push(obj);
  }
  return rows;
}

/* ── ファイル読み込み ── */
_xlsxInput.addEventListener('change', function() {
  var f = _xlsxInput.files[0];
  if (!f) return;
  _xlsxRows = [];
  _xlsxKeyXlsSel.innerHTML = '';

  var isCsv = f.name.toLowerCase().endsWith('.csv');
  var rd = new FileReader();
  rd.onload = function(e) {
    try {
      if (isCsv) {
        var bytes = new Uint8Array(e.target.result);
        var text = '';
        if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
          text = new TextDecoder('utf-8').decode(bytes.slice(3));
        } else if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
          text = new TextDecoder('utf-16le').decode(bytes.slice(2));
        } else {
          for (var enc of ['shift_jis', 'utf-8']) {
            try { text = new TextDecoder(enc).decode(bytes); break; } catch(_) {}
          }
        }
        _xlsxRows = _parseCsv(text);
      } else {
        var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        var ws = wb.Sheets[wb.SheetNames[0]];
        _xlsxRows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      }
      if (!_xlsxRows.length) { toast('データが空です', 2000); return; }
      var headers = Object.keys(_xlsxRows[0]);
      _xlsxKeyXlsSel.innerHTML = headers.map(function(h) {
        return '<option value="' + h + '">' + h + '</option>';
      }).join('');
      _xlsxModalInfo.textContent = _xlsxRows.length + '行 / ' + headers.length + '列 読み込み完了';
      _openXlsxModal();
    } catch(err) {
      toast('ファイルの読み込みに失敗しました: ' + err.message, 3000);
    }
  };
  rd.readAsArrayBuffer(f);
});

/* ── 連携する ── */
document.getElementById('xlsxModalOk').addEventListener('click', function() {
  _xlsxTargetName = _xlsxLayerSel.value;
  _xlsxKeyGeo     = _xlsxKeyGeoSel.value;
  _xlsxKeyXls     = _xlsxKeyXlsSel.value;
  _xlsxIsPmTiles  = !!(window.pmLayers && window.pmLayers[_xlsxTargetName]);

  _xlsxJoinMap = new Map();
  _xlsxRows.forEach(function(row) {
    var k = String(row[_xlsxKeyXls] !== undefined ? row[_xlsxKeyXls] : '').trim();
    if (k) _xlsxJoinMap.set(k, row);
  });

  _xlsxModal.classList.remove('show');
  _showXlsxStat();

  if (_xlsxIsPmTiles) {
    toast('Excel連携を設定しました（' + _xlsxJoinMap.size + '件マッチ）\nポリゴンをクリックしてデータを確認できます', 3000);
  } else {
    _rebindGeoJsonPopups();
    toast('Excel連携を設定しました（' + _xlsxJoinMap.size + '件マッチ）', 2500);
  }
});

document.getElementById('xlsxModalCancel').addEventListener('click', function() {
  _xlsxModal.classList.remove('show');
});

/* ── 統計カード ── */
function _showXlsxStat() {
  var matched = _xlsxJoinMap ? _xlsxJoinMap.size : 0;
  _xlsxStatText.textContent =
    '📊 Excel連携中 — ' + _xlsxTargetName + '/' + _xlsxKeyGeo + ' キー ' +
    matched.toLocaleString() + ' / ' + _xlsxRows.length.toLocaleString() + ' 件';
  _xlsxStatCard.style.display = 'flex';
}

document.getElementById('xlsxStatClose').addEventListener('click', function() {
  _xlsxStatCard.style.display = 'none';
  _xlsxJoinMap = null;
  _xlsxRows    = [];
  if (!_xlsxIsPmTiles) _rebindGeoJsonPopups();
  map.closePopup();
  toast('Excel連携を解除しました', 2000);
});

/* ── PMTilesクリックハンドラ ── */
map.on('click', function(e) {
  if (!_xlsxJoinMap || !_xlsxIsPmTiles) return;
  var cfg = window.pmLayers && window.pmLayers[_xlsxTargetName];
  if (!cfg || !map.hasLayer(cfg.layer)) return;

  var props = null;
  try {
    var results = cfg.layer.queryTileFeaturesDebug(e.latlng.lng, e.latlng.lat, 0);
    for (var entry of results) {
      for (var f of entry[1]) {
        if (f.layerName === cfg.dataLayer) { props = f.feature.props; break; }
      }
      if (props) break;
    }
  } catch(_) {}

  if (!props) return;

  var geoKey = String(props[_xlsxKeyGeo] !== undefined ? props[_xlsxKeyGeo] : '').trim();
  var xlRow  = _xlsxJoinMap.get(geoKey);

  var geoRows = Object.entries(props)
    .filter(function(e) { return e[1] != null && e[1] !== ''; })
    .map(function(e) {
      return '<tr><th>' + _esc(e[0]) + '</th><td>' + _esc(String(e[1])) + '</td></tr>';
    }).join('');

  var xlRows = xlRow
    ? Object.entries(xlRow)
        .filter(function(e) { return e[0] !== _xlsxKeyXls; })
        .map(function(e) {
          return '<tr class="xl-row"><th>📊 ' + _esc(e[0]) + '</th><td>' + _esc(String(e[1])) + '</td></tr>';
        }).join('')
    : '<tr><td colspan="2" style="color:#aaa;font-size:11px">（Excelにデータなし）</td></tr>';

  L.popup({ maxWidth: 280 })
    .setLatLng(e.latlng)
    .setContent(
      '<table class="xl-popup">' + geoRows +
      '<tr><td colspan="2" class="xl-sep">── Excel データ ──</td></tr>' +
      xlRows + '</table>'
    )
    .openOn(map);
});

/* ── GeoJSONレイヤーのポップアップ再バインド ── */
function _rebindGeoJsonPopups() {
  var lyr = overlays[_xlsxTargetName];
  if (!lyr) return;
  lyr.eachLayer(function(l) {
    if (!l.feature || !l.feature.properties) return;
    var props = l.feature.properties;
    if (_xlsxJoinMap) {
      var geoKey = String(props[_xlsxKeyGeo] !== undefined ? props[_xlsxKeyGeo] : '').trim();
      var xlRow  = _xlsxJoinMap.get(geoKey);
      var geoRows = Object.entries(props)
        .filter(function(e) { return e[1] != null && e[1] !== ''; })
        .map(function(e) {
          return '<tr><th>' + _esc(e[0]) + '</th><td>' + _esc(String(e[1])) + '</td></tr>';
        }).join('');
      var xlRows = xlRow
        ? Object.entries(xlRow)
            .filter(function(e) { return e[0] !== _xlsxKeyXls; })
            .map(function(e) {
              return '<tr class="xl-row"><th>📊 ' + _esc(e[0]) + '</th><td>' + _esc(String(e[1])) + '</td></tr>';
            }).join('')
        : '<tr><td colspan="2" style="color:#aaa;font-size:11px">（未マッチ）</td></tr>';
      l.bindPopup(
        '<table class="xl-popup">' + geoRows +
        '<tr><td colspan="2" class="xl-sep">── Excel データ ──</td></tr>' +
        xlRows + '</table>',
        { maxWidth: 280 }
      );
    } else {
      var rows = Object.entries(props)
        .filter(function(e) { return e[1] != null && e[1] !== ''; })
        .map(function(e) {
          return '<tr><th>' + _esc(e[0]) + '</th><td>' + _esc(String(e[1])) + '</td></tr>';
        }).join('');
      if (rows) l.bindPopup('<table style="font-size:12px;border-collapse:collapse">' + rows + '</table>');
    }
  });
}

function _esc(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
