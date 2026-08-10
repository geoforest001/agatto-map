/* =============================================
   Excel / CSV 連携モジュール
   GeoJSON レイヤー + PMTiles レイヤー対応
   ============================================= */

let _xlsxRows          = [];
let _xlsxJoinMap       = null;
let _xlsxTargetName    = '';
let _xlsxKeyGeo        = '';
let _xlsxKeyXls        = '';
let _xlsxIsPmTiles     = false;
let _xlsxColorCol      = '';
let _xlsxColorApplied  = false;

/* 色分け定義 — 区加入区分の凡例と対応 */
const _xlsxColorDefs = [
  { val: '加入',   fill: 'rgba(76,175,80,0.72)',   stroke: 'rgba(27,94,32,0.85)',   width: 1.2 },
  { val: '協力金', fill: 'rgba(255,235,59,0.80)',   stroke: 'rgba(200,120,0,0.85)',  width: 1.2 },
  { val: '休区',   fill: 'rgba(255,255,255,0.78)',  stroke: 'rgba(211,47,47,0.95)', width: 2.5 },
];

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

/* ── レイヤー一覧（GeoJSON + PMTiles 両方、重複除去） ── */
function _getAllLayerNames() {
  var pmNames = new Set(Object.keys(window.pmLayers || {}));
  var names = [];
  Object.keys(overlays).forEach(function(n) {
    if (!pmNames.has(n)) names.push({ name: n, type: 'geojson' });
  });
  pmNames.forEach(function(n) { names.push({ name: n, type: 'pmtiles' }); });
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
  document.getElementById('xlsxColorRow').style.display = pm ? '' : 'none';
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
    return '<option value="' + l.name + '">' + l.name + '</option>';
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
      var opts = headers.map(function(h) {
        return '<option value="' + h + '">' + h + '</option>';
      }).join('');
      _xlsxKeyXlsSel.innerHTML = opts;
      document.getElementById('xlsxColorCol').innerHTML =
        '<option value="">── 色分けなし ──</option>' + opts;
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
  _xlsxColorCol   = document.getElementById('xlsxColorCol').value;
  _xlsxIsPmTiles  = !!(window.pmLayers && window.pmLayers[_xlsxTargetName]);

  _xlsxJoinMap = new Map();
  _xlsxRows.forEach(function(row) {
    var k = String(row[_xlsxKeyXls] !== undefined ? row[_xlsxKeyXls] : '').trim();
    if (k) _xlsxJoinMap.set(k, row);
  });

  _xlsxModal.classList.remove('show');
  _showXlsxStat();

  if (_xlsxIsPmTiles) {
    if (_xlsxColorCol) _applyPmTilesColorCoding();
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
  if (_xlsxColorApplied) _restorePmTilesStyle();
  _xlsxJoinMap = null;
  _xlsxRows    = [];
  if (!_xlsxIsPmTiles) _rebindGeoJsonPopups();
  map.closePopup();
  toast('Excel連携を解除しました', 2000);
});

/* ── PMTilesクリックハンドラ ── */
map.on('click', function(e) {
  var pmLayers = window.pmLayers || {};
  for (var name of Object.keys(pmLayers)) {
    var cfg = pmLayers[name];
    if (!map.hasLayer(cfg.layer)) continue;

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

    if (!props) continue;

    var geoRows = Object.entries(props)
      .filter(function(kv) { return kv[1] != null && kv[1] !== ''; })
      .map(function(kv) {
        return '<tr><th>' + _esc(kv[0]) + '</th><td>' + _esc(String(kv[1])) + '</td></tr>';
      }).join('');

    var content = '<table class="xl-popup">' + geoRows;

    if (_xlsxJoinMap && _xlsxIsPmTiles && _xlsxTargetName === name) {
      var geoKey = String(props[_xlsxKeyGeo] !== undefined ? props[_xlsxKeyGeo] : '').trim();
      var xlRow  = _xlsxJoinMap.get(geoKey);
      var xlRows = xlRow
        ? Object.entries(xlRow)
            .filter(function(kv) { return kv[0] !== _xlsxKeyXls; })
            .map(function(kv) {
              return '<tr class="xl-row"><th>📊 ' + _esc(kv[0]) + '</th><td>' + _esc(String(kv[1])) + '</td></tr>';
            }).join('')
        : '<tr><td colspan="2" style="color:#aaa;font-size:11px">（Excelにデータなし）</td></tr>';
      content += '<tr><td colspan="2" class="xl-sep">── Excel データ ──</td></tr>' + xlRows;
    }

    content += '</table>';
    L.popup({ maxWidth: 280 }).setLatLng(e.latlng).setContent(content).openOn(map);
    break;
  }
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

/* ── PMTiles 色分け適用 ── */
function _applyPmTilesColorCoding() {
  var cfg = window.pmLayers && window.pmLayers[_xlsxTargetName];
  if (!cfg) return;
  var layer = cfg.layer;

  if (!cfg._origPaintRules) cfg._origPaintRules = (layer.paintRules || []).slice();

  var keyGeo   = _xlsxKeyGeo;
  var colorCol = _xlsxColorCol;
  var joinMap  = _xlsxJoinMap;

  /* マッチ数を集計してトーストで診断 */
  var counts = {};
  _xlsxColorDefs.forEach(function(d) { counts[d.val] = 0; });
  counts['その他'] = 0;
  var knownVals = _xlsxColorDefs.map(function(d) { return d.val; });
  joinMap.forEach(function(row) {
    var v = String(row[colorCol] || '').trim();
    if (knownVals.indexOf(v) !== -1) counts[v]++;
    else counts['その他']++;
  });
  var summary = _xlsxColorDefs.map(function(d) { return d.val + ':' + counts[d.val] + '件'; }).join(' / ');
  var totalMatch = _xlsxColorDefs.reduce(function(s, d) { return s + counts[d.val]; }, 0);
  if (totalMatch === 0) {
    toast('⚠️ 色分け列「' + colorCol + '」でマッチなし。列名・キーを確認してください。', 5000);
  } else {
    toast('🎨 色分け: ' + summary, 4000);
  }

  /* 既知カテゴリのルール */
  var rules = _xlsxColorDefs.map(function(def) {
    var val = def.val;
    return {
      dataLayer: cfg.dataLayer,
      symbolizer: new protomapsL.PolygonSymbolizer({ fill: def.fill, stroke: def.stroke, width: def.width }),
      filter: function(zoom, feature) {
        var k = String(feature.props[keyGeo] || '').trim();
        var row = joinMap.get(k);
        return !!(row && String(row[colorCol] || '').trim() === val);
      }
    };
  });

  /* フォールバック: Excelにない or 未定義カテゴリ */
  rules.unshift({
    dataLayer: cfg.dataLayer,
    symbolizer: new protomapsL.PolygonSymbolizer({ fill: 'rgba(200,200,200,0.45)', stroke: 'rgba(110,110,110,0.55)', width: 1.0 }),
    filter: function(zoom, feature) {
      var k = String(feature.props[keyGeo] || '').trim();
      var row = joinMap.get(k);
      if (!row) return true;
      return knownVals.indexOf(String(row[colorCol] || '').trim()) === -1;
    }
  });

  layer.paintRules = rules;
  layer.rerenderTiles();
  /* rerenderTiles が不十分な場合の fallback */
  setTimeout(function() { layer.redraw(); }, 50);
  document.getElementById('xlsxLegend').style.display = '';
  _xlsxColorApplied = true;
}

/* ── PMTiles スタイル復元 ── */
function _restorePmTilesStyle() {
  var cfg = window.pmLayers && window.pmLayers[_xlsxTargetName];
  if (!cfg || !cfg._origPaintRules) return;
  cfg.layer.paintRules = cfg._origPaintRules;
  cfg.layer.rerenderTiles();
  delete cfg._origPaintRules;
  document.getElementById('xlsxLegend').style.display = 'none';
  _xlsxColorApplied = false;
}
