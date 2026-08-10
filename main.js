const fallbackLocation = [35.8730, 137.9204]; // 伊那市西箕輪（上戸地区）
const fallbackZoom = 15;
const currentLocationZoom = 15;
const _isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const gsiAttribution =
  '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>';

const map = L.map("map", {
  zoomControl: true,
  maxZoom: 25
}).setView(fallbackLocation, fallbackZoom);

const gsiStandard = L.tileLayer(
  "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
  {
    attribution: gsiAttribution,
    maxNativeZoom: 18,
    maxZoom: 25,
    className: "grayscale-layer bm-multiply"
  }
);

const gsiAirPhoto = L.tileLayer(
  "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
  {
    attribution: gsiAttribution,
    maxNativeZoom: 18,
    maxZoom: 25,
    className: "bm-multiply"
  }
);

const naganoCsMap = L.tileLayer(
  "https://tile.geospatial.jp/CS/VER2/{z}/{x}/{y}.png",
  {
    attribution:
      '<a href="https://www.geospatial.jp/ckan/dataset/nagano-csmap">長野県CS立体図</a>',
    maxNativeZoom: 18,
    maxZoom: 25,
    className: "bm-multiply"
  }
);

gsiStandard.addTo(map);
gsiAirPhoto.addTo(map); gsiAirPhoto.setOpacity(0);
naganoCsMap.addTo(map); naganoCsMap.setOpacity(0);

/* ─── 住宅地図（PMTiles）─── */
const jutakuTiles = protomapsL.leafletLayer({
  url: 'data/jutaku.pmtiles',
  maxDataZoom: 18,
  paintRules: [
    {
      dataLayer: 'jutaku',
      symbolizer: new protomapsL.PolygonSymbolizer({
        fill: 'rgba(180,210,255,0.45)',
        stroke: 'rgba(0,80,180,0.75)',
        width: 1.2
      })
    }
  ],
  labelRules: []
});
// Excel連携用レイヤーレジストリ（excel.jsから参照）
window.pmLayers = {
  '住宅地図': {
    layer: jutakuTiles,
    dataLayer: 'jutaku',
    keys: ['B_FID', '番地', 'Kanj_Ooa', 'Post_num']
  }
};


/* ─── AED ─── */
const _aedIcon = L.icon({
  iconUrl: 'data/icons/AED.png',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16]
});
const aedLayer = L.geoJSON({
  "type": "FeatureCollection",
  "features": [
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.922313375616454,35.876498628254005]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.924777464198996,35.87602422723986]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.924241993759949,35.877186775345848]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.926881219793671,35.875545956482185]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.92702842926289,35.874091949167791]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.917928425115122,35.882615629934676]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.917398426416042,35.882233245373456]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.913331977216274,35.871864403667651]}}
  ]
}, {
  pointToLayer: function(f, latlng) { return L.marker(latlng, { icon: _aedIcon }); },
  onEachFeature: function(f, layer) { layer.bindPopup('<b>AED</b>'); }
});
aedLayer.addTo(map);

/* ─── ポンプ車庫 ─── */
const _pumpIcon = L.icon({
  iconUrl: 'data/icons/ポンプ車.png',
  iconSize: [40, 30],
  iconAnchor: [20, 30],
  popupAnchor: [0, -32]
});
const _pumpPolygon = L.geoJSON({
  "type": "FeatureCollection",
  "features": [
    {"type":"Feature","properties":{},"geometry":{"type":"MultiPolygon","coordinates":[[[[137.915689965886628,35.871248234096264],[137.91576393163632,35.871230469591026],[137.915744379682792,35.87117981738367],[137.915672778881003,35.871194731656956],[137.915689965886628,35.871248234096264]]]]}}
  ]
}, { style: { color: '#c62828', weight: 2, fillColor: '#ef9a9a', fillOpacity: 0.3 } });
const _pumpMarker = L.marker([35.87121, 137.91572], { icon: _pumpIcon })
  .bindPopup('<b>ポンプ車庫</b>');
const pumpLayer = L.layerGroup([_pumpPolygon, _pumpMarker]);
pumpLayer.addTo(map);

/* ─── 消火栓 ─── */
const _hydrantIcon = L.icon({
  iconUrl: 'data/icons/消火栓.png',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -11]
});
const hydrantLayer = L.geoJSON(null, {
  pointToLayer: function(f, latlng) { return L.marker(latlng, { icon: _hydrantIcon }); },
  onEachFeature: function(f, layer) {
    layer.bindPopup('<b>消火栓</b>' + (f.properties.Name ? '<br>' + f.properties.Name : ''));
  }
});
hydrantLayer.addTo(map);

/* ─── 消火栓から60m ─── */
const hydrant60mLayer = L.layerGroup([]);
hydrant60mLayer.addTo(map);

fetch('data/shoukasen.geojson')
  .then(function(r) { return r.json(); })
  .then(function(data) {
    hydrantLayer.addData(data);
    hydrantLayer.getLayers().forEach(function(m) {
      hydrant60mLayer.addLayer(L.circle(m.getLatLng(), {
        radius: 60,
        color: '#e31a1c',
        weight: 1.5,
        fillOpacity: 0
      }));
    });
  });


/* ─── 防火水槽 ─── */
const _waterTankIcon = L.icon({
  iconUrl: 'data/icons/防火水槽.png',
  iconSize: [32, 24],
  iconAnchor: [16, 24],
  popupAnchor: [0, -26]
});
const waterTankLayer = L.geoJSON({
  "type": "FeatureCollection",
  "features": [
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.91868064013764,35.87863726683098]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.9151239639547,35.87379294050824]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.91308632162296,35.8727203693166]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.91613452374287,35.871682501337375]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.91372613914092,35.870523351769855]}}
  ]
}, {
  pointToLayer: function(f, latlng) { return L.marker(latlng, { icon: _waterTankIcon }); },
  onEachFeature: function(f, layer) { layer.bindPopup('<b>防火水槽</b>'); }
});
waterTankLayer.addTo(map);

/* ─── 防犯灯 ─── */
const _boCrimeLightIcon = L.divIcon({
  html: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><polygon points="10,1 12.4,7.5 19.5,7.6 14,12 16,19 10,15 4,19 6,12 0.5,7.6 7.6,7.5" fill="#f6f50e" stroke="#e31a1c" stroke-width="1"/><polygon points="10,4 11.8,8.8 17,8.9 13,12.2 14.4,17.5 10,14.8 5.6,17.5 7,12.2 3,8.9 8.2,8.8" fill="#f6a30e" stroke="#b80808" stroke-width="0.8" transform="rotate(34,10,10)"/></svg>',
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -12]
});
const boCrimeLightLayer = L.geoJSON({
  "type": "FeatureCollection",
  "features": [
    [137.916935,35.868303],[137.916582,35.868502],[137.916075,35.868833],[137.915717,35.869029],[137.917985,35.869147],
    [137.914985,35.868097],[137.915258,35.869038],[137.915371,35.869908],[137.915156,35.869361],[137.915042,35.870153],
    [137.9144,35.870221],[137.913024,35.870749],[137.91389,35.870557],[137.914906,35.869598],[137.91462,35.870103],
    [137.914529,35.869621],[137.914043,35.869706],[137.916255,35.87158],[137.916002,35.871822],[137.915749,35.871604],
    [137.915727,35.871341],[137.915454,35.870918],[137.915311,35.870605],[137.914403,35.871499],[137.914305,35.871872],
    [137.913929,35.87208],[137.913241,35.871533],[137.919445,35.871754],[137.919734,35.871854],[137.920827,35.872432],
    [137.920665,35.872908],[137.91865,35.872997],[137.917037,35.872009],[137.917475,35.872834],[137.917151,35.873281],
    [137.917634,35.873765],[137.913355,35.874378],[137.915599,35.873488],[137.91553,35.873197],[137.916361,35.873523],
    [137.915154,35.87265],[137.916692,35.872834],[137.920378,35.873755],[137.921512,35.873313],[137.921615,35.874388],
    [137.923121,35.875256],[137.923883,35.875637],[137.922962,35.876462],[137.920762,35.876689],[137.921833,35.877446],
    [137.921732,35.879057],[137.922719,35.878616],[137.9239,35.878198],[137.92631,35.877498],[137.926284,35.877214],
    [137.926706,35.876699],[137.927024,35.877998],[137.926479,35.878234],[137.925285,35.878771],[137.927907,35.878171],
    [137.919247,35.875692],[137.91961,35.875921],[137.91839,35.876347],[137.918572,35.876573],[137.914932,35.87433],
    [137.915396,35.87504],[137.916272,35.875411],[137.916395,35.87636],[137.916875,35.875984],[137.917428,35.875697],
    [137.916926,35.879109],[137.917637,35.8793],[137.925701,35.874658],[137.92598,35.872621]
  ].map(function(c) {
    return {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":c}};
  })
}, {
  pointToLayer: function(f, latlng) { return L.marker(latlng, { icon: _boCrimeLightIcon }); },
  onEachFeature: function(f, layer) { layer.bindPopup('<b>防犯灯</b>'); }
});
boCrimeLightLayer.addTo(map);

/* ─── 組境界 ─── */
const kumiBoundaryLayer = L.geoJSON({
  "type": "FeatureCollection",
  "features": [
    {"type":"Feature","properties":{"組名":"北部６組"},"geometry":{"type":"MultiPolygon","coordinates":[[[[137.920759,35.877156],[137.92055,35.876983],[137.920863,35.876647],[137.920023,35.876102],[137.918211,35.875015],[137.918098,35.875128],[137.917599,35.875137],[137.917409,35.875335],[137.917614,35.875509],[137.917628,35.875518],[137.917402,35.875701],[137.917648,35.875952],[137.917958,35.875748],[137.918247,35.875598],[137.918403,35.876191],[137.918475,35.876437],[137.918613,35.876859],[137.918637,35.877069],[137.918673,35.877433],[137.918674,35.877441],[137.920112,35.878272],[137.920355,35.878191],[137.920838,35.877948],[137.921057,35.877839],[137.921125,35.877925],[137.921444,35.877782],[137.921366,35.877681],[137.920759,35.877156]]]]}},
    {"type":"Feature","properties":{"組名":"北部４組"},"geometry":{"type":"MultiPolygon","coordinates":[[[[137.92099,35.87299],[137.920807,35.872957],[137.919903,35.873403],[137.918987,35.874181],[137.918881,35.874293],[137.918208,35.875013],[137.920019,35.8761],[137.920859,35.876645],[137.920546,35.876981],[137.920756,35.877154],[137.921367,35.877683],[137.921744,35.877454],[137.922037,35.877223],[137.922142,35.87708],[137.922252,35.876878],[137.923039,35.876501],[137.923203,35.87642],[137.923416,35.876203],[137.923642,35.875904],[137.923901,35.875572],[137.924261,35.875098],[137.924632,35.874651],[137.922442,35.873628],[137.92099,35.87299]]]]}},
    {"type":"Feature","properties":{"組名":"北部２組"},"geometry":{"type":"MultiPolygon","coordinates":[[[[137.917108,35.872714],[137.917016,35.872778],[137.917016,35.872779],[137.917155,35.872934],[137.917014,35.873035],[137.917137,35.873169],[137.917177,35.87323],[137.917625,35.873828],[137.918094,35.875126],[137.918208,35.875013],[137.918564,35.874631],[137.91855,35.874611],[137.918532,35.874448],[137.918535,35.874167],[137.91857,35.873909],[137.918566,35.873726],[137.918553,35.873659],[137.9181,35.873654],[137.918031,35.873565],[137.917995,35.873474],[137.917955,35.873261],[137.918291,35.873244],[137.918453,35.873251],[137.918441,35.873043],[137.91835,35.873041],[137.918353,35.872912],[137.918345,35.872908],[137.918392,35.872628],[137.917984,35.872588],[137.918198,35.872483],[137.918254,35.872412],[137.918153,35.872278],[137.918086,35.872222],[137.918074,35.872234],[137.917594,35.872252],[137.917199,35.872255],[137.917028,35.872016],[137.916714,35.871814],[137.916393,35.872158],[137.916655,35.87236],[137.917108,35.872714]]]]}},
    {"type":"Feature","properties":{"組名":"北部１組"},"geometry":{"type":"MultiPolygon","coordinates":[[[[137.919903,35.873403],[137.920807,35.872957],[137.92099,35.87299],[137.921119,35.872896],[137.921408,35.872852],[137.921476,35.872842],[137.921683,35.872888],[137.921806,35.872752],[137.921698,35.872698],[137.920893,35.872183],[137.920693,35.872396],[137.92017,35.872087],[137.9192,35.871683],[137.918855,35.871474],[137.918347,35.872003],[137.918112,35.872194],[137.918086,35.872222],[137.918153,35.872278],[137.918254,35.872412],[137.918198,35.872483],[137.917984,35.872588],[137.918392,35.872628],[137.918345,35.872908],[137.918353,35.872912],[137.91835,35.873041],[137.918441,35.873043],[137.918453,35.873251],[137.918291,35.873244],[137.917955,35.873261],[137.917995,35.873474],[137.918031,35.873565],[137.9181,35.873654],[137.918553,35.873659],[137.918566,35.873726],[137.91857,35.873909],[137.918535,35.874167],[137.918532,35.874448],[137.91855,35.874611],[137.918564,35.874631],[137.918881,35.874293],[137.918987,35.874181],[137.919903,35.873403]]]]}},
    {"type":"Feature","properties":{"組名":"南部３組"},"geometry":{"type":"MultiPolygon","coordinates":[[[[137.918861,35.869808],[137.917935,35.869234],[137.917731,35.869442],[137.918672,35.870026],[137.918861,35.869808]]]]}},
    {"type":"Feature","properties":{"組名":"南部１組"},"geometry":{"type":"MultiPolygon","coordinates":[[[[137.923897,35.867664],[137.924877,35.866683],[137.924699,35.86654],[137.924384,35.866398],[137.923794,35.866218],[137.92352,35.866231],[137.923223,35.866147],[137.923388,35.864949],[137.923347,35.864549],[137.922044,35.864526],[137.921042,35.864444],[137.920959,35.865021],[137.920331,35.865934],[137.919308,35.866502],[137.918559,35.867121],[137.918307,35.867547],[137.918306,35.867546],[137.916804,35.867348],[137.915579,35.867836],[137.91541,35.868077],[137.915313,35.868719],[137.915722,35.869078],[137.915581,35.869265],[137.915792,35.869451],[137.916148,35.869449],[137.916675,35.869844],[137.916789,35.869749],[137.917137,35.87003],[137.917731,35.869442],[137.917935,35.869234],[137.919094,35.868067],[137.9204,35.866786],[137.921193,35.866416],[137.921923,35.866413],[137.923897,35.867664]]]]}},
    {"type":"Feature","properties":{"組名":"北部８組"},"geometry":{"type":"MultiPolygon","coordinates":[[[[137.918795,35.878977],[137.919071,35.878838],[137.919491,35.878613],[137.919931,35.878338],[137.920112,35.878272],[137.918671,35.877439],[137.918633,35.877067],[137.91861,35.876857],[137.918471,35.876435],[137.918399,35.876189],[137.91613,35.877393],[137.915257,35.878393],[137.915555,35.878962],[137.916156,35.879275],[137.916086,35.880099],[137.916766,35.880069],[137.917302,35.879681],[137.917885,35.879259],[137.918795,35.878977]]]]}},
    {"type":"Feature","properties":{"組名":"北部５組"},"geometry":{"type":"MultiPolygon","coordinates":[[[[137.921745,35.877454],[137.921367,35.877683],[137.921444,35.877782],[137.921125,35.877925],[137.921057,35.877839],[137.920844,35.877946],[137.920361,35.878189],[137.920112,35.878272],[137.919931,35.878338],[137.919491,35.878613],[137.919071,35.878838],[137.918795,35.878977],[137.919224,35.879741],[137.91947,35.880143],[137.919765,35.87995],[137.920734,35.879523],[137.921824,35.879049],[137.923007,35.878535],[137.92309,35.878502],[137.923184,35.878397],[137.923376,35.878321],[137.925221,35.878063],[137.925172,35.879114],[137.925324,35.879055],[137.92568,35.878923],[137.925727,35.878907],[137.925816,35.878967],[137.926125,35.878843],[137.926404,35.879188],[137.926886,35.87899],[137.927678,35.878651],[137.928074,35.879241],[137.92857,35.879025],[137.927662,35.877675],[137.927355,35.877203],[137.926764,35.876372],[137.927008,35.87583],[137.926725,35.875638],[137.926187,35.875383],[137.926403,35.875124],[137.925566,35.874758],[137.925537,35.874807],[137.92541,35.875041],[137.92514,35.874908],[137.924632,35.874651],[137.924261,35.875098],[137.923901,35.875572],[137.923642,35.875904],[137.923416,35.876203],[137.923203,35.876419],[137.923039,35.876501],[137.922252,35.876878],[137.922142,35.87708],[137.922037,35.877223],[137.921745,35.877454]]]]}},
    {"type":"Feature","properties":{"組名":"北部７組"},"geometry":{"type":"MultiPolygon","coordinates":[[[[137.917955,35.875746],[137.917644,35.87595],[137.917398,35.875699],[137.917624,35.875516],[137.91761,35.875507],[137.917405,35.875332],[137.917595,35.875135],[137.918094,35.875126],[137.917728,35.87483],[137.917144,35.87469],[137.916696,35.874584],[137.916482,35.874536],[137.915952,35.873936],[137.91494,35.874356],[137.914312,35.874734],[137.914264,35.874764],[137.915502,35.876419],[137.91613,35.877393],[137.918399,35.876189],[137.918243,35.875596],[137.917955,35.875746]]]]}},
    {"type":"Feature","properties":{"組名":"北部３組"},"geometry":{"type":"MultiPolygon","coordinates":[[[[137.918094,35.875126],[137.917625,35.873828],[137.917177,35.87323],[137.917137,35.873169],[137.917014,35.873035],[137.917155,35.872934],[137.917155,35.872934],[137.917016,35.872778],[137.917108,35.872714],[137.916655,35.87236],[137.916394,35.872158],[137.91613,35.872442],[137.915812,35.872267],[137.915615,35.872894],[137.91507,35.872643],[137.914458,35.872321],[137.913492,35.872895],[137.912608,35.873115],[137.912697,35.873553],[137.912866,35.874468],[137.913469,35.874765],[137.914264,35.874764],[137.914312,35.874734],[137.91494,35.874356],[137.915952,35.873936],[137.916482,35.874536],[137.916696,35.874583],[137.917144,35.87469],[137.917728,35.87483],[137.918094,35.875126]]]]}},
    {"type":"Feature","properties":{"組名":"南部４組"},"geometry":{"type":"MultiPolygon","coordinates":[[[[137.913492,35.872895],[137.914458,35.872321],[137.91507,35.872643],[137.915615,35.872894],[137.915812,35.872267],[137.91613,35.872442],[137.916393,35.872158],[137.916754,35.871772],[137.917617,35.870649],[137.916942,35.870231],[137.916555,35.870955],[137.916089,35.87055],[137.915457,35.870048],[137.91521,35.870298],[137.915104,35.870221],[137.915072,35.870588],[137.914731,35.870627],[137.914733,35.870525],[137.914639,35.870544],[137.914615,35.870479],[137.914424,35.870539],[137.914595,35.87082],[137.913664,35.871306],[137.91312,35.871471],[137.912798,35.871629],[137.91298,35.871863],[137.913093,35.872422],[137.913018,35.872679],[137.913021,35.873012],[137.913492,35.872895]]]]}},
    {"type":"Feature","properties":{"組名":"南部３組"},"geometry":{"type":"MultiPolygon","coordinates":[[[[137.914595,35.87082],[137.914424,35.870539],[137.914615,35.870479],[137.914639,35.870544],[137.914733,35.870525],[137.914736,35.870425],[137.914635,35.870141],[137.914794,35.870105],[137.914863,35.870096],[137.914776,35.869867],[137.914905,35.869828],[137.914859,35.869548],[137.915295,35.869512],[137.915188,35.869376],[137.914991,35.869388],[137.914972,35.869363],[137.914828,35.86937],[137.914528,35.869094],[137.914138,35.868947],[137.914146,35.869027],[137.914167,35.869391],[137.913682,35.869408],[137.91359,35.86938],[137.912711,35.870537],[137.912184,35.87078],[137.912445,35.871128],[137.912798,35.871629],[137.91312,35.871471],[137.913664,35.871306],[137.914595,35.87082]]]]}},
    {"type":"Feature","properties":{"組名":"南部２組"},"geometry":{"type":"MultiPolygon","coordinates":[[[[137.921698,35.872698],[137.922771,35.872006],[137.918672,35.870026],[137.917731,35.869442],[137.917137,35.87003],[137.916789,35.869749],[137.916675,35.869844],[137.916145,35.869449],[137.915789,35.869451],[137.915578,35.869265],[137.915719,35.869078],[137.91531,35.868719],[137.915407,35.868077],[137.915576,35.867836],[137.915347,35.867101],[137.914383,35.867317],[137.914661,35.868123],[137.913986,35.8683],[137.914033,35.868516],[137.914133,35.868822],[137.91414,35.868948],[137.914528,35.869094],[137.914828,35.86937],[137.914972,35.869363],[137.914991,35.869388],[137.915188,35.869376],[137.915295,35.869512],[137.914859,35.869548],[137.914905,35.869828],[137.914776,35.869867],[137.914863,35.870096],[137.914794,35.870105],[137.914635,35.870141],[137.914736,35.870425],[137.914731,35.870627],[137.915072,35.870588],[137.915104,35.870221],[137.91521,35.870298],[137.915457,35.870048],[137.916089,35.87055],[137.916555,35.870955],[137.916942,35.870231],[137.917617,35.870649],[137.916754,35.871772],[137.916714,35.871814],[137.917028,35.872016],[137.917199,35.872255],[137.917594,35.872252],[137.918074,35.872234],[137.918112,35.872194],[137.918347,35.872003],[137.918855,35.871474],[137.9192,35.871683],[137.92017,35.872087],[137.920693,35.872396],[137.920893,35.872183],[137.921698,35.872698]]]]}},
    {"type":"Feature","properties":{"組名":"北部９組"},"geometry":{"type":"MultiPolygon","coordinates":[[[[137.921698,35.872698],[137.921806,35.872752],[137.921683,35.872888],[137.921476,35.872842],[137.921119,35.872896],[137.92099,35.87299],[137.922442,35.873628],[137.924632,35.874651],[137.92514,35.874908],[137.92541,35.875041],[137.925537,35.874807],[137.92583,35.874314],[137.925927,35.874174],[137.926019,35.874203],[137.926342,35.874073],[137.926269,35.873919],[137.92617,35.873717],[137.926152,35.873606],[137.926154,35.873432],[137.926182,35.873199],[137.926216,35.87298],[137.926197,35.872819],[137.926176,35.872711],[137.923942,35.87125],[137.921698,35.872698]]]]}}
  ]
}, {
  style: { color: '#2f0ef6', weight: 2, fillOpacity: 0 },
  onEachFeature: function(f, layer) {
    layer.bindPopup('<b>' + f.properties['組名'] + '</b>');
    layer.on('click', function() {
      if (kumiBoundaryLayer._selectedLayer && kumiBoundaryLayer._selectedLayer !== layer) {
        kumiBoundaryLayer._selectedLayer.setStyle({ color: '#2f0ef6', weight: 2, fillColor: null, fillOpacity: 0 });
      }
      if (kumiBoundaryLayer._selectedLayer === layer) {
        layer.setStyle({ color: '#2f0ef6', weight: 2, fillColor: null, fillOpacity: 0 });
        kumiBoundaryLayer._selectedLayer = null;
      } else {
        layer.setStyle({ color: '#e53935', weight: 2.5, fillColor: '#e53935', fillOpacity: 0.25 });
        kumiBoundaryLayer._selectedLayer = layer;
      }
    });
  }
});
kumiBoundaryLayer.addTo(map);
jutakuTiles.addTo(map);

// GPX・ログトラックはポイントより上（pointPaneのcanvasで隠れない）
map.createPane('gpxPane');
map.getPane('gpxPane').style.zIndex = 460;

const baseLayers = {};

const overlays = { '住宅地図': jutakuTiles };
const displayOverlays = { 'AED': aedLayer, '防犯灯': boCrimeLightLayer, '組境界': kumiBoundaryLayer };
const fireOverlays    = { 'ポンプ車庫': pumpLayer, '防火水槽': waterTankLayer, '消火栓': hydrantLayer, '消火栓から60m': hydrant60mLayer };

let layerControl;

function renderLayerControl() {
  if (layerControl) map.removeControl(layerControl);

  layerControl = L.control.layers(baseLayers, Object.assign({}, overlays, displayOverlays, fireOverlays), {
    position: "topright",
    collapsed: false
  });
  layerControl.addTo(map);

  // 凡例注入

  var panel = document.querySelector('.leaflet-control-layers');
  if (!panel) return;
  var lcList = panel.querySelector('.leaflet-control-layers-list');
  var base = panel.querySelector('.leaflet-control-layers-base');
  var overlaysDiv = panel.querySelector('.leaflet-control-layers-overlays');

  // ✕ 閉じるボタン
  var closeBtn = document.createElement('button');
  closeBtn.className = 'lc-close-btn';
  closeBtn.textContent = '✕';
  panel.insertBefore(closeBtn, panel.firstChild);

  // メニューボタン（body直下・fixed）
  var openBtn = document.createElement('button');
  openBtn.className = 'lc-open-btn';
  openBtn.textContent = 'レイヤメニュー';
  document.body.appendChild(openBtn);

  function openPanel()  { panel.classList.remove('lc-hidden'); openBtn.style.display = 'none'; }
  function closePanel() { panel.classList.add('lc-hidden');    openBtn.style.display = 'block'; }
  closeBtn.addEventListener('click', closePanel);
  openBtn.addEventListener('click', openPanel);

  // ── ツールボックス（lcList 先頭）──
  var tbDiv = document.createElement('div');
  tbDiv.id = 'tbLayers';
  var curBtn = document.createElement('button');
  curBtn.className = 'tb-btn'; curBtn.id = 'btnCurrentLoc';
  curBtn.innerHTML = '<span class="ico">📍</span><span>現在地</span>';
  var xlsxBtn = document.createElement('button');
  xlsxBtn.className = 'tb-btn'; xlsxBtn.id = 'btnExcelLink';
  xlsxBtn.innerHTML = '<span class="ico">📊</span><span>Excel連携</span>';
  xlsxBtn.addEventListener('click', function() { if(window.xlsxOpenFile) xlsxOpenFile(); });

  tbDiv.appendChild(curBtn);
  lcList.insertBefore(tbDiv, lcList.firstChild);

  curBtn.addEventListener('click', function() {
    var btn = this; btn.classList.add('loading');
    if (_lastKnownPos && (Date.now() - _lastKnownPos.timestamp) < 30000) {
      var z1 = Math.max(map.getZoom(), currentLocationZoom);
      map.setView([_lastKnownPos.coords.latitude, _lastKnownPos.coords.longitude], z1);
      btn.classList.remove('loading');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function(pos) { _lastKnownPos = pos; var z2 = Math.max(map.getZoom(), currentLocationZoom); map.setView([pos.coords.latitude, pos.coords.longitude], z2); btn.classList.remove('loading'); },
      function() { toast('現在地を取得できませんでした', 3000); btn.classList.remove('loading'); },
      { enableHighAccuracy: _isMobile, timeout: 15000 }
    );
  });

  // ── ベースマップ セクション（.leaflet-control-layers-base に注入）──
  var baseLbl = document.createElement('div');
  baseLbl.className = 'lc-section-label';
  baseLbl.textContent = 'ベースマップ';
  base.insertBefore(baseLbl, base.firstChild);

  [
    { id: 'bmStd', label: '地理院標準地図', layer: gsiStandard, defVal: 1.0 },
    { id: 'bmAir', label: '地理院航空写真', layer: gsiAirPhoto, defVal: 0.0 },
    { id: 'bmCs',  label: '長野県CS立体図', layer: naganoCsMap, defVal: 0.0 },
  ].forEach(function(def) {
    var item = document.createElement('div'); item.className = 'bm-item';
    var row  = document.createElement('div'); row.className = 'bm-row';
    var chk  = document.createElement('input'); chk.type = 'checkbox'; chk.id = def.id; chk.checked = def.defVal > 0;
    var lbl  = document.createElement('label'); lbl.setAttribute('for', def.id); lbl.textContent = def.label;
    var pct  = document.createElement('span'); pct.className = 'bm-pct'; pct.id = def.id + 'Pct'; pct.textContent = Math.round(def.defVal * 100) + '%';
    row.appendChild(chk); row.appendChild(lbl); row.appendChild(pct);
    var slider = document.createElement('input'); slider.type = 'range'; slider.className = 'bm-slider';
    slider.id = def.id + 'Slider'; slider.min = 0; slider.max = 1; slider.step = 0.05; slider.value = def.defVal;
    if (def.defVal === 0) { slider.disabled = true; slider.style.opacity = '0.4'; }
    item.appendChild(row); item.appendChild(slider);
    base.appendChild(item);

    function applyBm(val) {
      def.layer.setOpacity(val);
      pct.textContent = Math.round(val * 100) + '%';
      chk.checked = val > 0;
      slider.value = val;
      slider.disabled = val === 0;
      slider.style.opacity = val === 0 ? '0.4' : '1';
    }
    chk.addEventListener('change', function() { applyBm(this.checked ? (parseFloat(slider.value) || 1.0) : 0); });
    slider.addEventListener('input', function() { applyBm(parseFloat(this.value)); });
  });

  var bmSep = document.createElement('div'); bmSep.className = 'leaflet-control-layers-separator';
  base.appendChild(bmSep);

  // ── オーバーレイ セクションラベル（グループ順に注入）──
  var insertIdx = 0;
  [
    { label: '連携可能レイヤ', layers: overlays,       sub: false },
    { label: '表示レイヤ',     layers: displayOverlays, sub: false },
    { label: '消火施設レイヤ',  layers: fireOverlays,    sub: true  }
  ].forEach(function(group) {
    var lbl = document.createElement('div');
    lbl.className = group.sub ? 'lc-section-label lc-sub-label' : 'lc-section-label';

    if (group.sub) {
      var groupCb = document.createElement('input');
      groupCb.type = 'checkbox';
      groupCb.checked = true;
      groupCb.className = 'lc-group-cb';
      var groupTxt = document.createElement('span');
      groupTxt.textContent = group.label;
      lbl.appendChild(groupCb);
      lbl.appendChild(groupTxt);

      var _fireSavedState = null;
      groupCb.addEventListener('change', function() {
        var subItems = overlaysDiv.querySelectorAll('.lc-sub-item');
        if (!groupCb.checked) {
          _fireSavedState = [];
          subItems.forEach(function(item) {
            var cb = item.querySelector('input[type=checkbox]');
            _fireSavedState.push(cb ? cb.checked : false);
            item.classList.add('lc-sub-item--off');
            if (cb && cb.checked) cb.click();
          });
        } else {
          subItems.forEach(function(item, i) {
            var cb = item.querySelector('input[type=checkbox]');
            item.classList.remove('lc-sub-item--off');
            if (cb && _fireSavedState && _fireSavedState[i] && !cb.checked) cb.click();
          });
          _fireSavedState = null;
        }
      });
    } else {
      lbl.textContent = group.label;
    }

    overlaysDiv.insertBefore(lbl, overlaysDiv.children[insertIdx] || null);
    insertIdx += 1;
    var count = Object.keys(group.layers).length;
    if (group.sub) {
      for (var i = 0; i < count; i++) {
        var el = overlaysDiv.children[insertIdx + i];
        if (el) el.classList.add('lc-sub-item');
      }
    }
    insertIdx += count;
  });

  /* Excel連携ボタンは気象レイヤ（DOMContentLoaded で追加）の直後に挿入 */
  window.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      var ov = document.querySelector('.leaflet-control-layers-overlays');
      if (!ov) return;
      var sep = document.createElement('div');
      sep.className = 'leaflet-control-layers-separator';
      ov.appendChild(sep);
      ov.appendChild(xlsxBtn);
    }, 0);
  });

  if (window.innerWidth < 768) closePanel();
}

renderLayerControl();

/* ─── ブランディング表示 ─────────────────────────── */
const brandingControl = L.control({ position: 'bottomright' });
brandingControl.onAdd = function() {
  const div = L.DomUtil.create('div', 'gf-branding');
  div.innerHTML = 'Powered by Geo･Forest Co.,Ltd.';
  return div;
};
brandingControl.addTo(map);

/* ─── 印刷ボタン（ズームコントロール隣） ─── */
const printControl = L.control({ position: 'topleft' });
printControl.onAdd = function() {
  var div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
  div.innerHTML = '<a id="btnPrint" href="#" title="印刷" role="button" aria-label="印刷" style="font-size:16px;line-height:30px;">🖨️</a>';
  div.querySelector('a').addEventListener('click', function(e) {
    e.preventDefault();
    if (window._openPrintFrame) window._openPrintFrame();
  });
  L.DomEvent.disableClickPropagation(div);
  return div;
};
printControl.addTo(map);

/* ─── スケールバー（印刷時のみ表示） ─── */
L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

/* =========================
   ユーティリティ
========================= */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function toast(msg, ms = 2000) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(t._t);
  t._t = setTimeout(() => t.style.display = 'none', ms);
}

const _lb = document.getElementById('lightbox');
const _lbImg = document.getElementById('lightboxImg');
window.openPhoto = src => { _lbImg.src = src; _lb.style.display = 'flex'; };
_lb.onclick = () => { _lb.style.display = 'none'; _lbImg.src = ''; };

function showConfirm(msg) {
  return new Promise(resolve => {
    const ov = document.getElementById('confirmOverlay');
    document.getElementById('confirmMsg').textContent = msg;
    ov.style.display = 'flex';
    const ok = document.getElementById('confirmOk');
    const cancel = document.getElementById('confirmCancel');
    const done = result => { ov.style.display = 'none'; ok.onclick = null; cancel.onclick = null; resolve(result); };
    ok.onclick = () => done(true);
    cancel.onclick = () => done(false);
  });
}

/* 現場掲示板 (BBS) → bbs.js */


/* ─── GPSログ・GPXインポート ───────────────────── */
let _trackPoints = [];
let _trackActive = false;
let _trackLine = null;
let _importedTrackLine = null;

function _updateTrackLine() {
  if (_trackPoints.length < 2) return;
  const latlngs = _trackPoints.map(p => [p.lat, p.lng]);
  if (_trackLine) { _trackLine.setLatLngs(latlngs); }
  else { _trackLine = L.polyline(latlngs, { color: '#e53935', weight: 4, opacity: 0.85, pane: 'gpxPane' }).addTo(map); }
}

function _exportGPX() {
  if (!_trackPoints.length) { toast('記録がありません', 1500); return; }
  const name = new Date().toLocaleString('ja-JP', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="GeoForest Map" xmlns="http://www.topografix.com/GPX/1/1">\n  <trk><name>${name}</name><trkseg>\n`;
  for (const p of _trackPoints) xml += `    <trkpt lat="${p.lat}" lon="${p.lng}"><time>${p.ts}</time></trkpt>\n`;
  xml += `  </trkseg></trk>\n</gpx>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([xml], { type: 'application/gpx+xml' }));
  a.download = `track_${new Date().toISOString().slice(0,16).replace(/[T:]/g,'-')}.gpx`;
  a.click();
}

function _importGPX(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const gpx = new DOMParser().parseFromString(e.target.result, 'application/xml');
      const pts = Array.from(gpx.querySelectorAll('trkpt'));
      if (!pts.length) { toast('トラックポイントが見つかりません', 2500); return; }
      const latlngs = pts.map(p => [parseFloat(p.getAttribute('lat')), parseFloat(p.getAttribute('lon'))]);
      if (_importedTrackLine) map.removeLayer(_importedTrackLine);
      _importedTrackLine = L.polyline(latlngs, { color: '#e53935', weight: 4, opacity: 0.9, pane: 'gpxPane' }).addTo(map);
      map.fitBounds(_importedTrackLine.getBounds(), { padding: [40, 40] });
      toast(`GPX読み込み完了（${pts.length}点）`, 2000);
      _buildTrackCtrl();
    } catch(_) { toast('GPXの読み込みに失敗しました', 2500); }
  };
  reader.readAsText(file);
}

function _appendImportBtn(div) {
  const lbl = document.createElement('label');
  lbl.className = 'track-btn';
  lbl.textContent = '📂 GPX読込';
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.gpx'; inp.style.display = 'none';
  inp.onchange = e => { _importGPX(e.target.files[0]); e.target.value = ''; };
  lbl.appendChild(inp);
  div.appendChild(lbl);
}

function _buildTrackCtrl() {
  const div = document.getElementById('trackCtrl');
  if (!div) return;
  div.innerHTML = '';
  if (_trackActive) {
    const info = document.createElement('div');
    info.className = 'track-info'; info.id = 'trackInfo';
    info.textContent = `🔴 記録中 ${_trackPoints.length}点`;
    div.appendChild(info);
    const stopBtn = document.createElement('button');
    stopBtn.className = 'track-btn'; stopBtn.textContent = '⏹ 停止';
    stopBtn.onclick = () => { _trackActive = false; _buildTrackCtrl(); };
    div.appendChild(stopBtn);
  } else if (_trackPoints.length > 0) {
    const saveBtn = document.createElement('button');
    saveBtn.className = 'track-btn'; saveBtn.textContent = '💾 GPX保存';
    saveBtn.onclick = _exportGPX;
    div.appendChild(saveBtn);
    const clrBtn = document.createElement('button');
    clrBtn.className = 'track-btn'; clrBtn.textContent = '🗑 ログ消去';
    clrBtn.onclick = () => {
      _trackPoints = [];
      if (_trackLine) { map.removeLayer(_trackLine); _trackLine = null; }
      _buildTrackCtrl();
    };
    div.appendChild(clrBtn);
  } else {
    const startBtn = document.createElement('button');
    startBtn.className = 'track-btn'; startBtn.textContent = '⏺ ログ開始';
    startBtn.onclick = () => { _trackActive = true; toast('ログ記録を開始しました', 1500); _buildTrackCtrl(); };
    div.appendChild(startBtn);
    _appendImportBtn(div);
    if (_importedTrackLine) {
      const clrBtn = document.createElement('button');
      clrBtn.className = 'track-btn'; clrBtn.textContent = '🗑 GPX消去';
      clrBtn.onclick = () => { map.removeLayer(_importedTrackLine); _importedTrackLine = null; _buildTrackCtrl(); };
      div.appendChild(clrBtn);
    }
  }
}

const trackControl = L.control({ position: 'bottomright' });
trackControl.onAdd = function() {
  const div = L.DomUtil.create('div', 'track-ctrl');
  div.id = 'trackCtrl';
  L.DomEvent.disableClickPropagation(div);
  L.DomEvent.disableScrollPropagation(div);
  return div;
};
trackControl.addTo(map);
setTimeout(_buildTrackCtrl, 0);

/* ─── 現在地 常時追跡（自動開始） ───────────────── */
let currentLocationMarker = null;
let currentLocationCircle = null;
let _lastKnownPos = null;

if (navigator.geolocation) {
  let firstFix = true;
  navigator.geolocation.watchPosition(
    pos => {
      _lastKnownPos = pos;
      window._lastKnownPos = pos;
      const latlng = [pos.coords.latitude, pos.coords.longitude];
      if (firstFix) {
        map.setView(latlng, currentLocationZoom);
        firstFix = false;
      }
      if (currentLocationMarker) map.removeLayer(currentLocationMarker);
      if (currentLocationCircle) map.removeLayer(currentLocationCircle);
      currentLocationMarker = L.circleMarker(latlng, {
        radius: 8, color: '#fff', weight: 3,
        fillColor: '#2979ff', fillOpacity: 1
      }).addTo(map);
      if (pos.coords.accuracy) {
        currentLocationCircle = L.circle(latlng, {
          radius: pos.coords.accuracy,
          color: '#2979ff', weight: 1, fillColor: '#2979ff', fillOpacity: 0.1
        }).addTo(map);
      }
      if (_trackActive) {
        _trackPoints.push({ lat: pos.coords.latitude, lng: pos.coords.longitude, ts: new Date(pos.timestamp).toISOString() });
        _updateTrackLine();
        const info = document.getElementById('trackInfo');
        if (info) info.textContent = `🔴 記録中 ${_trackPoints.length}点`;
      }
    },
    () => { toast('現在地を取得できませんでした', 3000); },
    { enableHighAccuracy: _isMobile, timeout: 30000, maximumAge: 5000 }
  );
}

/* ─── 印刷機能 ─────────────────────────── */
(function() {
  var _pfLandscape = false;
  var _pfCenter = null;
  var _pfBounds = null;
  var A4_W = 794, A4_H = 1123;

  function _pfUpdateFrame() {
    var box = document.getElementById('printFrameBox');
    var vw = window.innerWidth, vh = window.innerHeight;
    var margin = 36, barH = 70;
    var aw = vw - margin * 2, ah = vh - barH - margin * 2;
    var ratio = 297 / 210;
    var fw, fh;
    if (_pfLandscape) {
      if (aw / ratio <= ah) { fw = aw; fh = fw / ratio; }
      else { fh = ah; fw = fh * ratio; }
    } else {
      if (aw * ratio <= ah) { fw = aw; fh = fw * ratio; }
      else { fh = ah; fw = fh / ratio; }
    }
    box.style.width  = fw + 'px';
    box.style.height = fh + 'px';
    box.style.left   = ((vw - fw) / 2) + 'px';
    box.style.top    = margin + 'px';
  }

  function _buildPrintMeta(title) {
    var now = new Date();
    var pad = function(n) { return String(n).padStart(2, '0'); };
    var dateStr = now.getFullYear() + '/' + pad(now.getMonth() + 1) + '/' + pad(now.getDate()) +
                  ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
    var center = map.getCenter();
    var zoom   = map.getZoom();
    document.getElementById('printHeaderMapTitle').textContent = title || '上戸地区 防災マップ';
    document.getElementById('printHeaderMeta').textContent =
      dateStr + ' | 緯度 ' + center.lat.toFixed(5) + ' 経度 ' + center.lng.toFixed(5) + ' | Zoom ' + zoom;
    var scaleRaw = parseInt(document.getElementById('printScaleInput').value, 10);
    var scaleDom = document.getElementById('printHeaderScale');
    var mapScale = document.getElementById('printMapScale');
    if (scaleRaw > 0) {
      var txt = '縮尺 1/' + scaleRaw.toLocaleString();
      scaleDom.textContent = txt; scaleDom.style.display = '';
      mapScale.textContent = txt; mapScale.style.display = '';
    } else {
      scaleDom.textContent = ''; scaleDom.style.display = 'none';
      mapScale.textContent = ''; mapScale.style.display = 'none';
    }
  }

  window._openPrintFrame = function() {
    _pfLandscape = false;
    _pfCenter = null; _pfBounds = null;
    document.getElementById('printFrameOrient').textContent = '横向き';
    document.getElementById('printFrame').classList.add('show');
    _pfUpdateFrame();
  };

  document.getElementById('printFrameOrient').addEventListener('click', function() {
    _pfLandscape = !_pfLandscape;
    document.getElementById('printFrameOrient').textContent = _pfLandscape ? '縦向き' : '横向き';
    _pfUpdateFrame();
  });

  document.getElementById('printFrameCancel').addEventListener('click', function() {
    document.getElementById('printFrame').classList.remove('show');
  });

  document.getElementById('printFrameNext').addEventListener('click', function() {
    var box   = document.getElementById('printFrameBox');
    var mapEl = map.getContainer();
    var bRect = box.getBoundingClientRect();
    var mRect = mapEl.getBoundingClientRect();
    var tl = map.containerPointToLatLng(L.point(bRect.left - mRect.left, bRect.top    - mRect.top));
    var br = map.containerPointToLatLng(L.point(bRect.right - mRect.left, bRect.bottom - mRect.top));
    _pfBounds = L.latLngBounds(tl, br);
    _pfCenter = _pfBounds.getCenter();
    document.getElementById('printFrame').classList.remove('show');
    document.getElementById('printMapTitle').value   = '';
    document.getElementById('printScaleInput').value = '';
    document.getElementById('printModal').classList.add('show');
    setTimeout(function() { document.getElementById('printMapTitle').focus(); }, 100);
  });

  window.addEventListener('resize', function() {
    if (document.getElementById('printFrame').classList.contains('show')) _pfUpdateFrame();
  });

  document.getElementById('printCancel').addEventListener('click', function() {
    document.getElementById('printModal').classList.remove('show');
  });

  document.getElementById('printOk').addEventListener('click', function() {
    var title = document.getElementById('printMapTitle').value.trim();
    document.getElementById('printModal').classList.remove('show');
    _buildPrintMeta(title);

    var hdr  = document.getElementById('printHeader');
    hdr.style.display = 'flex';
    var hdrH = hdr.offsetHeight;
    hdr.style.display = '';

    document.getElementById('printNorthOnMap').style.top = (hdrH + 6) + 'px';

    var ds = document.getElementById('_pfDynStyle');
    if (!ds) { ds = document.createElement('style'); ds.id = '_pfDynStyle'; document.head.appendChild(ds); }
    ds.textContent = '@media print{#map{top:' + hdrH + 'px !important;height:calc(100vh - ' + hdrH + 'px) !important;}}';

    var s = document.getElementById('_pfOrientStyle');
    if (!s) { s = document.createElement('style'); s.id = '_pfOrientStyle'; document.head.appendChild(s); }
    s.textContent = _pfLandscape ? '@page{size:A4 landscape;}' : '@page{size:A4 portrait;}';

    if (_pfBounds && _pfCenter) {
      var paperW = _pfLandscape ? A4_H : A4_W;
      var paperH = (_pfLandscape ? A4_W : A4_H) - hdrH;
      var origCenter = map.getCenter();
      var origZoom   = map.getZoom();
      var mapEl      = map.getContainer();
      var origW      = mapEl.style.width;
      var origH      = mapEl.style.height;
      var origSnap   = map.options.zoomSnap;
      mapEl.style.width  = paperW + 'px';
      mapEl.style.height = paperH + 'px';
      map.invalidateSize({ animate: false });
      map.options.zoomSnap = 0;
      map.fitBounds(_pfBounds, { animate: false, padding: [0, 0] });
      setTimeout(function() {
        window.print();
        window.addEventListener('afterprint', function() {
          mapEl.style.width  = origW;
          mapEl.style.height = origH;
          map.options.zoomSnap = origSnap;
          map.invalidateSize({ animate: false });
          map.setView(origCenter, origZoom, { animate: false });
          document.getElementById('printNorthOnMap').style.top = '';
          ds.textContent = '';
        }, { once: true });
      }, 600);
    } else {
      setTimeout(function() { window.print(); }, 80);
    }
  });

  document.getElementById('printMapTitle').addEventListener('keydown', function(e) {
    if (e.key === 'Enter')  document.getElementById('printOk').click();
    if (e.key === 'Escape') document.getElementById('printCancel').click();
  });
})();
