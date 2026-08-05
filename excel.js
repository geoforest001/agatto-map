/* =============================================
   Excel / CSV 連携モジュール
   agatto-map — GeoJSONレイヤー対応
   ============================================= */

let _xlsxRows       = [];
let _xlsxJoinMap    = null;   // Map: Excelキー値 → 行オブジェクト
let _xlsxTargetName = '';     // 対象レイヤー名
let _xlsxKeyGeo     = '';     // GeoJSON側のキー属性
let _xlsxKeyXls     = '';     // Excel側のキー列名

const _xlsxInput     = document.getElementById('xlsxInput');
const _xlsxModal     = document.getElementById('xlsxModal');
const _xlsxLayerSel  = document.getElementById('xlsxLayerSel');
const _xlsxKeyGeoSel = document.getElementById('xlsxKeyGeo');
const _xlsxKeyXlsSel = document.getElementById('xlsxKeyXls');
const _xlsxModalInfo = document.getElementById('xlsxModalInfo');
const _xlsxStatCard  = document.getElementById('xlsxStatCard');
const _xlsxStatText  = document.getElementById('xlsxStatText');

/* ── ファイル選択トリガー（main.jsのボタンから呼ばれる） ── */
window.xlsxOpenFile = function() {
  _xlsxInput.value = '';
  _xlsxInput.click();
};

/* ── GeoJSONレイヤーから属性フィールド名を取得 ── */
function _getGeoFields(layerName) {
  const lyr = overlays[layerName];
  if (!lyr) return [];
  const fields = new Set();
  lyr.eachLayer(function(l) {
    const props = l.feature && l.feature.properties;
    if (props) Object.keys(props).forEach(function(k) { fields.add(k); });
  });
  return Array.from(fields);
}

/* ── レイヤー選択が変わったらGeoキー列を更新 ── */
function _updateGeoFields() {
  const name = _xlsxLayerSel.value;
  const fields = _getGeoFields(name);
  _xlsxKeyGeoSel.innerHTML = fields.length
    ? fields.map(function(f) { return '<option value="' + f + '">' + f + '</option>'; }).join('')
    : '<option value="">（フィールドなし）</option>';
}

_xlsxLayerSel.addEventListener('change', _updateGeoFields);

/* ── モーダルを開くときにレイヤー一覧を更新 ── */
function _openXlsxModal() {
  const names = Object.keys(overlays);
  if (!names.length) {
    toast('レイヤーが読み込まれていません。先にデータを追加してください。', 3000);
    return;
  }
  _xlsxLayerSel.innerHTML = names.map(function(n) {
    return '<option value="' + n + '">' + n + '</option>';
  }).join('');
  _updateGeoFields();
  _xlsxModal.classList.add('show');
}

/* ── CSV パーサー（Shift-JIS / UTF-8 BOM 対応） ── */
function _parseCsvLine(line) {
  var result = [], inQ = false, field = '';
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { result.push(field); field = ''; }
      else { field += ch; }
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

  _xlsxJoinMap = new Map();
  _xlsxRows.forEach(function(row) {
    var k = String(row[_xlsxKeyXls] !== undefined ? row[_xlsxKeyXls] : '').trim();
    if (k) _xlsxJoinMap.set(k, row);
  });

  _xlsxModal.classList.remove('show');
  _showXlsxStat();

  // 対象レイヤーのポップアップをExcelデータ付きに更新
  _rebindPopups();
  toast('Excel連携を設定しました（' + _xlsxJoinMap.size + '件マッチ）', 2500);
});

/* ── キャンセル ── */
document.getElementById('xlsxModalCancel').addEventListener('click', function() {
  _xlsxModal.classList.remove('show');
});

/* ── 統計カード ── */
function _showXlsxStat() {
  var matched = _xlsxJoinMap ? _xlsxJoinMap.size : 0;
  _xlsxStatText.textContent =
    '📊 Excel連携中 — ' + _xlsxTargetName + ' / ' + _xlsxKeyGeo + 'キー ' +
    matched.toLocaleString() + ' / ' + _xlsxRows.length.toLocaleString() + ' 件';
  _xlsxStatCard.style.display = 'flex';
}

document.getElementById('xlsxStatClose').addEventListener('click', function() {
  _xlsxStatCard.style.display = 'none';
  _xlsxJoinMap = null;
  _xlsxRows    = [];
  _rebindPopups();
  toast('Excel連携を解除しました', 2000);
});

/* ── Excelデータ付きポップアップを再バインド ── */
function _rebindPopups() {
  var lyr = overlays[_xlsxTargetName];
  if (!lyr) return;

  lyr.eachLayer(function(l) {
    if (!l.feature || !l.feature.properties) return;
    var props = l.feature.properties;

    if (_xlsxJoinMap) {
      // 連携中: GeoJSON属性 + Excelデータを表示
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
      // 連携解除: デフォルトポップアップに戻す
      var rows = Object.entries(props)
        .filter(function(e) { return e[1] != null && e[1] !== ''; })
        .map(function(e) {
          return '<tr><th>' + _esc(e[0]) + '</th><td>' + _esc(String(e[1])) + '</td></tr>';
        }).join('');
      if (rows) {
        l.bindPopup('<table style="font-size:12px;border-collapse:collapse">' + rows + '</table>');
      }
    }
  });
}

function _esc(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
