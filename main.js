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
jutakuTiles.addTo(map);

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
const hydrantLayer = L.geoJSON({
  "type": "FeatureCollection",
  "features": [
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.924342,35.879186]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.922947,35.879683]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.921997,35.880198]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.922511,35.879211]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.92104,35.880607]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.920787,35.88279]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.923135,35.878488]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.919952,35.884724]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.924997,35.883993]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.926152,35.882625]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.92462,35.881727]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.925101,35.87884]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.925873,35.880224]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.918599,35.883978]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.917913,35.881346]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.921062,35.884505]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.925505,35.882135]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.919894,35.882117]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.918526,35.882374]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.916659,35.868406]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.915643,35.869242]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.91499,35.868736]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.924832,35.874251]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.915445,35.86983]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.914125,35.869411]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.914013,35.870462]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.915095,35.87072]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.915711,35.871523]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.914368,35.871622]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.913749,35.872143]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.913495,35.871893]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.915548,35.873485]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.916554,35.873487]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.917621,35.869617]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.917676,35.873832]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.916923,35.872918]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.917942,35.873056]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.918539,35.873672]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.918987,35.873006]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.922278,35.874759]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.925912,35.875322]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.921039,35.878192]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.926747,35.878124]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.918607,35.877139]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.915258,35.875153]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.918524,35.876403]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.917463,35.875716]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.91403,35.873352]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.9256,35.864426]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.922969,35.876494]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.923678,35.875578]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.921779,35.877351]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.919839,35.873277]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.920544,35.873857]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.926158,35.872873]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.927251,35.864211]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.924439,35.86455]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.920158,35.879753]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.917058,35.879048]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.92074,35.872383]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.911884,35.870111]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.910693,35.86982]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.909723,35.870964]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.910052,35.86887]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.911774,35.869066]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.910967,35.868162]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.905523,35.868772]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.907308,35.866282]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.908402,35.8688]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.90686,35.869726]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.903783,35.869921]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.909484,35.872774]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.909514,35.871605]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.911139,35.87197]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.92851,35.880733]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.933236,35.87312]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.931334,35.872169]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.930252,35.874393]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.929457,35.874682]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.927629,35.875072]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.926824,35.875845]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.928031,35.876474]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.928519,35.876102]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.929756,35.876466]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.927433,35.877474]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.928209,35.878583]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.929739,35.880971]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.933683,35.877751]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.929795,35.875564]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.931833,35.873604]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.927628,35.875603]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.929057,35.873083]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.92874,35.878212]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.932466,35.875391]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.932451,35.872922]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.931168,35.878804]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.929127,35.877285]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.9307,35.873018]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.9294,35.880236]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.929322,35.87814]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.930975,35.876211]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.924877,35.876561]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.930738,35.877966]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.932144,35.876874]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.92925,35.872129]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.932773,35.879016]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.9348,35.87609]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.927442,35.873681]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.927284,35.872781]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.932018,35.87966]}},
    {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[137.93409,35.872411]}}
  ]
}, {
  pointToLayer: function(f, latlng) { return L.marker(latlng, { icon: _hydrantIcon }); },
  onEachFeature: function(f, layer) { layer.bindPopup('<b>消火栓</b>'); }
});
hydrantLayer.addTo(map);

/* ─── 消火栓から60m ─── */
const hydrant60mLayer = L.layerGroup(
  hydrantLayer.getLayers().map(function(m) {
    return L.circle(m.getLatLng(), {
      radius: 60,
      color: '#e31a1c',
      weight: 1.5,
      fillOpacity: 0
    });
  })
);
hydrant60mLayer.addTo(map);

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
    {"type":"Feature","properties":{"組名":"北部９組"},"geometry":{"type":"MultiPolygon","coordinates":[[[[137.921698,35.872698],[137.921806,35.872752],[137.921683,35.872888],[137.921476,35.872842],[137.921119,35.872896],[137.92099,35.87299],[137.922442,35.873628],[137.924632,35.874651],[137.92514,35.874908],[137.92541,35.875041],[137.925537,35.874807],[137.92583,35.874314],[137.925927,35.874174],[137.926019,35.874203],[137.926342,35.874073],[137.926269,35.873919],[137.92617,35.873717],[137.926152,35.873606],[137.926154,35.873432],[137.926182,35.873199],[137.926216,35.87298],[137.926197,35.872819],[137.926176,35.872711],[137.923942,35.87125],[137.921698,35.872698]]]}}
  ]
}, {
  style: { color: '#2f0ef6', weight: 2, fillOpacity: 0 },
  onEachFeature: function(f, layer) {
    layer.bindPopup('<b>' + f.properties['組名'] + '</b>');
  }
});
kumiBoundaryLayer.addTo(map);

// GPX・ログトラックはポイントより上（pointPaneのcanvasで隠れない）
map.createPane('gpxPane');
map.getPane('gpxPane').style.zIndex = 460;

const baseLayers = {};

const overlays = { '住宅地図': jutakuTiles };
const displayOverlays = { 'AED': aedLayer, 'ポンプ車庫': pumpLayer, '消火栓': hydrantLayer, '消火栓から60m': hydrant60mLayer, '防火水槽': waterTankLayer, '組境界': kumiBoundaryLayer };

let layerControl;

function renderLayerControl() {
  if (layerControl) map.removeControl(layerControl);

  layerControl = L.control.layers(baseLayers, Object.assign({}, overlays, displayOverlays), {
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
  openBtn.textContent = 'メニュー';
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
  tbDiv.appendChild(xlsxBtn);
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
    { label: '連携可能レイヤ', layers: overlays },
    { label: '表示レイヤ',     layers: displayOverlays }
  ].forEach(function(group) {
    var lbl = document.createElement('div');
    lbl.className = 'lc-section-label';
    lbl.textContent = group.label;
    overlaysDiv.insertBefore(lbl, overlaysDiv.children[insertIdx] || null);
    insertIdx += 1 + Object.keys(group.layers).length;
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

/* =========================
   現場掲示板 (BBS)
========================= */
const _GH_PAT = ['github_pat_11CEFRMRY0','mquikxruRiN4_ukRsAYZ7rWdrFuv3aYpWk00WJROhS','GF747tXbXCPF5zFI2HJIYA1VDRjLVB'].join('');
const _GH_FILE_URL = 'https://api.github.com/repos/geoforest001/agatto-map/contents/bbs/posts.json';

let _bbsPosts = [], _bbsSha = null, _bbsMarkers = [], _bbsTimer = null;
let _bbsPhotoB64 = null, _bbsLat = null, _bbsLng = null;
let _bbsPhotoMap = {};

async function _bbsFetchPosts() {
  try {
    const res = await fetch(_GH_FILE_URL, {
      headers: { 'Authorization': 'Bearer ' + _GH_PAT, 'Accept': 'application/vnd.github+json' }
    });
    if (res.status === 404) { _bbsPosts = []; _bbsSha = null; _bbsCheckNew(); return true; }
    if (!res.ok) throw new Error('GitHub API ' + res.status);
    const data = await res.json();
    _bbsSha = data.sha;
    let parsed;
    if (data.content) {
      parsed = JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))));
    } else if (data.download_url) {
      const raw = await fetch(data.download_url + '?_=' + Date.now());
      if (!raw.ok) throw new Error('download_url ' + raw.status);
      parsed = await raw.json();
    } else {
      throw new Error('content unavailable');
    }
    _bbsPosts = parsed || [];
    _bbsCheckNew();
    return true;
  } catch(e) {
    console.error('[BBS fetch]', e);
    toast('掲示板の読込失敗 — 既存の投稿はそのまま表示中', 3000);
    return false;
  }
}

async function _bbsSavePosts(posts, _depth = 0) {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(posts, null, 2))));
  const body = { message: 'BBS: update posts', content: encoded, committer: { name: 'Field Map', email: 'map@field' } };
  if (_bbsSha) body.sha = _bbsSha;
  const res = await fetch(_GH_FILE_URL, {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + _GH_PAT, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github+json' },
    body: JSON.stringify(body)
  });
  if (res.status === 409 && _depth < 2) {
    // 競合: 最新を取得してリモートにない投稿をマージして再試行
    const r = await fetch(_GH_FILE_URL, { headers: { 'Authorization': 'Bearer ' + _GH_PAT, 'Accept': 'application/vnd.github+json' } });
    if (!r.ok) throw new Error('競合解決のための再取得に失敗しました');
    const d = await r.json();
    _bbsSha = d.sha;
    const remotePosts = JSON.parse(decodeURIComponent(escape(atob(d.content.replace(/\n/g, ''))))) || [];
    const remoteIds = new Set(remotePosts.map(p => p.id));
    const newOnly = posts.filter(p => !remoteIds.has(p.id));
    const merged = newOnly.length > 0 ? [...remotePosts, ...newOnly] : remotePosts;
    _bbsPosts = merged;
    if (newOnly.length === 0) return; // 追加投稿なし（削除競合）→ リモート状態を受け入れ
    return _bbsSavePosts(merged, _depth + 1);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'GitHub PUT ' + res.status);
  }
  const data = await res.json();
  _bbsSha = data.content.sha;
}

function _bbsCatEmoji(cat) {
  return { '道路': '🛣', '河川': '💧', '土砂': '⛰', '施設': '🏢', 'その他': '📌' }[cat] || '📌';
}

function _bbsFmtTime(iso) {
  const d = new Date(iso);
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function _bbsRenderMarkers() {
  _bbsMarkers.forEach(m => map.removeLayer(m));
  _bbsMarkers = []; _bbsPhotoMap = {};
  const catCol = { '道路': '#e65100', '河川': '#0277bd', '土砂': '#4e342e', '施設': '#2e7d32', 'その他': '#37474f' };
  for (const p of _bbsPosts) {
    if (p.lat == null || p.lng == null) continue;
    const col = catCol[p.cat] || '#555';
    const ico = L.divIcon({
      html: `<div style="background:${col};color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);margin:-16px 0 0 -16px">${_bbsCatEmoji(p.cat)}</div>`,
      iconSize: [32, 32], className: ''
    });
    let pop = `<div style="font-size:12px;max-width:230px"><b>${escapeHtml(p.cat)}</b> <span style="color:#aaa">${_bbsFmtTime(p.ts)}</span>${p.author ? ` <span style="color:#888">👤${escapeHtml(p.author)}</span>` : ''}<br><div style="margin-top:4px">${escapeHtml(p.comment || '')}</div>`;
    if (p.photo) {
      _bbsPhotoMap[p.id] = p.photo;
      pop += `<img src="${p.photo}" style="max-width:210px;max-height:130px;border-radius:6px;margin-top:6px;cursor:pointer;display:block" onclick="_bbsOpenPhoto('${p.id}')">`;
    }
    pop += '</div>';
    const mk = L.marker([p.lat, p.lng], { icon: ico }).addTo(map).bindPopup(pop, { maxWidth: 240 });
    _bbsMarkers.push(mk);
  }
}
window._bbsOpenPhoto = id => { if (_bbsPhotoMap[id]) openPhoto(_bbsPhotoMap[id]); };

function _bbsRenderList() {
  const listEl = document.getElementById('bbsList');
  const loadMsg = document.getElementById('bbsLoadingMsg');
  const emptyMsg = document.getElementById('bbsEmptyMsg');
  loadMsg.style.display = 'none';
  if (!_bbsPosts.length) { emptyMsg.style.display = 'block'; listEl.innerHTML = ''; return; }
  emptyMsg.style.display = 'none';
  const sorted = [..._bbsPosts].sort((a, b) => new Date(b.ts) - new Date(a.ts));
  listEl.innerHTML = '';
  sorted.forEach(p => {
    const card = document.createElement('div');
    card.className = 'bbs-card';
    const hdr = document.createElement('div');
    hdr.className = 'bbs-card-header';
    const badge = document.createElement('span');
    badge.className = 'bbs-cat-badge';
    badge.textContent = `${_bbsCatEmoji(p.cat)} ${p.cat}`;
    const ts = document.createElement('span');
    ts.className = 'bbs-time';
    ts.textContent = _bbsFmtTime(p.ts);
    hdr.appendChild(badge); hdr.appendChild(ts);
    if (p.lat != null) {
      const jb = document.createElement('button');
      jb.className = 'bbs-icon-btn'; jb.textContent = '🗺 地図';
      jb.addEventListener('click', () => { map.setView([p.lat, p.lng], 16); closeBbsPanel(); });
      hdr.appendChild(jb);
    }
    const db = document.createElement('button');
    db.className = 'bbs-icon-btn'; db.textContent = '🗑'; db.style.color = '#c00';
    db.addEventListener('click', () => _bbsDeleteById(p.id));
    hdr.appendChild(db);
    card.appendChild(hdr);
    if (p.author) {
      const au = document.createElement('div');
      au.className = 'bbs-author'; au.textContent = '👤 ' + p.author;
      card.appendChild(au);
    }
    const cm = document.createElement('div');
    cm.className = 'bbs-comment'; cm.textContent = p.comment || '';
    card.appendChild(cm);
    if (p.photo) {
      const img = document.createElement('img');
      img.src = p.photo; img.className = 'bbs-photo';
      img.addEventListener('click', () => openPhoto(p.photo));
      card.appendChild(img);
    }
    if (p.lat != null) {
      const loc = document.createElement('div');
      loc.className = 'bbs-loc';
      loc.textContent = `📍 ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
      card.appendChild(loc);
    }
    listEl.appendChild(card);
  });
}

async function _bbsDeleteById(id) {
  if (!await showConfirm('この投稿を削除しますか？')) return;
  const newPosts = _bbsPosts.filter(p => p.id !== id);
  toast('削除中...', 3000);
  try {
    await _bbsSavePosts(newPosts);
    _bbsPosts = newPosts;
    _bbsRenderMarkers();
    _bbsRenderList();
    toast('削除しました', 2000);
  } catch(e) { toast('削除失敗: ' + e.message, 4000); }
}

function _bbsCompressPhoto(file) {
  return new Promise(resolve => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 640; let w = img.width, h = img.height;
      if (w > MAX || h > MAX) { if (w > h) { h = Math.round(h * MAX / w); w = MAX; } else { w = Math.round(w * MAX / h); h = MAX; } }
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      // 50KB以下になるまで品質を下げる（data:image/jpeg;base64, + base64 → 50*1024*4/3+23≈68290文字）
      let q = 0.82, dataUrl;
      do { dataUrl = c.toDataURL('image/jpeg', q); q -= 0.1; } while (dataUrl.length > 68000 && q > 0.2);
      resolve(dataUrl);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

/* 投稿者名管理 */
function _bbsGetUserName() { return localStorage.getItem('bbsUserName') || ''; }
function _bbsUpdateAuthorBar() {
  const name = _bbsGetUserName();
  document.getElementById('bbsAuthorBarName').textContent = name || '未登録';
}

(() => {
  const editBtn = document.getElementById('bbsAuthorEditBtn');
  const editor  = document.getElementById('bbsAuthorEditor');
  const input   = document.getElementById('bbsAuthorInput');
  const saveBtn = document.getElementById('bbsAuthorSaveBtn');

  editBtn.addEventListener('click', () => {
    input.value = _bbsGetUserName();
    editor.style.display = 'flex';
    editBtn.style.display = 'none';
    input.focus();
  });

  function saveAuthor() {
    const name = input.value.trim();
    if (!name) { toast('名前を入力してください', 1500); return; }
    localStorage.setItem('bbsUserName', name);
    _bbsUpdateAuthorBar();
    editor.style.display = 'none';
    editBtn.style.display = '';
    toast('投稿者名を登録しました', 1500);
  }
  saveBtn.addEventListener('click', saveAuthor);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') saveAuthor(); });
})();

const bbsPanel = document.getElementById('bbsPanel');
const bbsFloatBtn = document.getElementById('bbsFloatBtn');
const bbsBadge = document.getElementById('bbsBadge');

function _bbsCheckNew() {
  const last = localStorage.getItem('bbsLastSeen') || '';
  const hasNew = _bbsPosts.some(p => p.ts > last);
  bbsBadge.style.display = hasNew ? 'block' : 'none';
}
function _bbsMarkSeen() {
  const latest = _bbsPosts.reduce((m, p) => p.ts > m ? p.ts : m, '');
  if (latest) localStorage.setItem('bbsLastSeen', latest);
  bbsBadge.style.display = 'none';
}

async function openBbsPanel() {
  _bbsUpdateAuthorBar();
  bbsPanel.style.display = 'flex';
  bbsPanel.classList.remove('collapsed');
  bbsFloatBtn.classList.add('active');
  _bbsMarkSeen();
  document.querySelectorAll('.bbs-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('bbsTabList').classList.add('active');
  document.getElementById('bbsListPane').style.display = '';
  document.getElementById('bbsNewPane').style.display = 'none';
  document.getElementById('bbsLoadingMsg').style.display = 'block';
  document.getElementById('bbsEmptyMsg').style.display = 'none';
  document.getElementById('bbsList').innerHTML = '';
  if (await _bbsFetchPosts()) _bbsRenderMarkers();
  _bbsRenderList();
  if (!_bbsTimer) _bbsTimer = setInterval(async () => {
    if (await _bbsFetchPosts()) _bbsRenderMarkers();
    _bbsRenderList();
  }, 30000);
}

function closeBbsPanel() {
  bbsPanel.style.display = 'none';
  bbsFloatBtn.classList.remove('active');
  clearInterval(_bbsTimer); _bbsTimer = null;
}

document.querySelectorAll('.bbs-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bbs-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('bbsListPane').style.display = tab === 'list' ? '' : 'none';
    document.getElementById('bbsNewPane').style.display = tab === 'new' ? '' : 'none';
  });
});

bbsFloatBtn.addEventListener('click', () => {
  if (bbsPanel.style.display === 'flex') closeBbsPanel();
  else openBbsPanel();
});

(async () => {
  if (await _bbsFetchPosts()) _bbsRenderMarkers();
  setInterval(async () => {
    if (bbsPanel.style.display !== 'flex') {
      if (await _bbsFetchPosts()) _bbsRenderMarkers();
    }
  }, 60000);
})();

document.getElementById('bbsClose').addEventListener('click', closeBbsPanel);
document.getElementById('bbsCollapseBtn').addEventListener('click', () => { bbsPanel.classList.toggle('collapsed'); });
document.getElementById('bbsRefreshBtn').addEventListener('click', async () => {
  document.getElementById('bbsLoadingMsg').style.display = 'block';
  document.getElementById('bbsList').innerHTML = '';
  if (await _bbsFetchPosts()) _bbsRenderMarkers();
  _bbsRenderList();
  toast('更新しました', 1500);
});

// ドラッグ
(() => {
  const handle = document.getElementById('bbsHandle');
  let drag = null;
  function startDrag(cx, cy) { const r = bbsPanel.getBoundingClientRect(); drag = { ox: cx - r.left, oy: cy - r.top }; }
  function moveDrag(cx, cy) {
    if (!drag) return;
    let x = cx - drag.ox, y = cy - drag.oy;
    x = Math.max(0, Math.min(window.innerWidth - bbsPanel.offsetWidth, x));
    y = Math.max(0, Math.min(window.innerHeight - bbsPanel.offsetHeight, y));
    bbsPanel.style.left = x + 'px'; bbsPanel.style.top = y + 'px'; bbsPanel.style.right = 'auto';
  }
  function endDrag() { drag = null; }
  handle.addEventListener('touchstart', e => { if (e.target.closest('button')) return; startDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  handle.addEventListener('touchmove', e => { if (!drag) return; e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
  handle.addEventListener('touchend', endDrag, { passive: true });
  handle.addEventListener('mousedown', e => { if (e.target.closest('button')) return; startDrag(e.clientX, e.clientY); handle.style.cursor = 'grabbing'; });
  document.addEventListener('mousemove', e => { if (drag) moveDrag(e.clientX, e.clientY); });
  document.addEventListener('mouseup', () => { endDrag(); handle.style.cursor = 'grab'; });
})();

document.getElementById('bbsGetLocBtn').addEventListener('click', () => {
  document.getElementById('bbsLocStatus').textContent = '取得中...';
  navigator.geolocation.getCurrentPosition(
    pos => { _bbsLat = pos.coords.latitude; _bbsLng = pos.coords.longitude;
      document.getElementById('bbsLocStatus').textContent = `${_bbsLat.toFixed(5)}, ${_bbsLng.toFixed(5)}`; },
    () => { document.getElementById('bbsLocStatus').textContent = '取得失敗'; },
    { enableHighAccuracy: true, timeout: 15000 }
  );
});

async function _bbsHandlePhoto(file, fromCamera = false) {
  if (!file) return;
  if (fromCamera) {
    if (_lastKnownPos) {
      _bbsLat = _lastKnownPos.coords.latitude;
      _bbsLng = _lastKnownPos.coords.longitude;
      document.getElementById('bbsLocStatus').textContent =
        `📍 ${_bbsLat.toFixed(5)}, ${_bbsLng.toFixed(5)}`;
    }
  } else {
    if (window.exifr) {
      try {
        const gps = await exifr.gps(file);
        if (gps && gps.latitude && gps.longitude) {
          _bbsLat = gps.latitude;
          _bbsLng = gps.longitude;
          document.getElementById('bbsLocStatus').textContent =
            `📷 ${_bbsLat.toFixed(5)}, ${_bbsLng.toFixed(5)}`;
        }
      } catch(_) {}
    }
  }
  document.getElementById('bbsTakePhotoBtn').textContent = '圧縮中...';
  document.getElementById('bbsPickPhotoBtn').textContent = '圧縮中...';
  _bbsPhotoB64 = await _bbsCompressPhoto(file);
  if (_bbsPhotoB64) {
    const prev = document.getElementById('bbsPhotoPreview');
    prev.src = _bbsPhotoB64; prev.style.display = 'block';
  }
  document.getElementById('bbsTakePhotoBtn').textContent = '📷 撮影する';
  document.getElementById('bbsPickPhotoBtn').textContent = '🖼 ギャラリー';
}

function _bbsOpenFileInput(useCamera) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  if (useCamera) inp.setAttribute('capture', 'environment');
  inp.style.cssText = 'position:fixed;top:0;left:0;opacity:0;width:0;height:0;pointer-events:none;';
  document.body.appendChild(inp);
  inp.onchange = e => {
    const f = e.target.files[0];
    if (f) _bbsHandlePhoto(f, useCamera);
    document.body.removeChild(inp);
  };
  inp.click();
}

document.getElementById('bbsTakePhotoBtn').addEventListener('click', () => _bbsOpenFileInput(true));
document.getElementById('bbsPickPhotoBtn').addEventListener('click', () => _bbsOpenFileInput(false));
document.getElementById('bbsPhotoInput').addEventListener('change', e => { _bbsHandlePhoto(e.target.files[0]); e.target.value = ''; });
document.getElementById('bbsPhotoPreview').addEventListener('click', () => { if (_bbsPhotoB64) openPhoto(_bbsPhotoB64); });

document.getElementById('bbsSubmitBtn').addEventListener('click', async () => {
  const comment = document.getElementById('bbsComment').value.trim();
  const cat = document.getElementById('bbsCatSel').value;
  if (!comment) { toast('コメントを入力してください', 2000); return; }
  const btn = document.getElementById('bbsSubmitBtn');
  const status = document.getElementById('bbsFormStatus');
  btn.disabled = true; status.textContent = '投稿中...';
  const post = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ts: new Date().toISOString(), cat, comment,
    author: _bbsGetUserName(),
    lat: _bbsLat, lng: _bbsLng,
    photo: _bbsPhotoB64 || null
  };
  try {
    await _bbsSavePosts([..._bbsPosts, post]);
    _bbsPosts.push(post);
    _bbsRenderMarkers();
    document.getElementById('bbsComment').value = '';
    _bbsPhotoB64 = null; _bbsLat = null; _bbsLng = null;
    document.getElementById('bbsPhotoPreview').style.display = 'none';
    document.getElementById('bbsLocStatus').textContent = '未設定';
    document.getElementById('bbsTakePhotoBtn').textContent = '📷 撮影する';
    document.getElementById('bbsPickPhotoBtn').textContent = '🖼 ギャラリー';
    document.querySelectorAll('.bbs-tab').forEach(b => b.classList.remove('active'));
    document.getElementById('bbsTabList').classList.add('active');
    document.getElementById('bbsListPane').style.display = '';
    document.getElementById('bbsNewPane').style.display = 'none';
    _bbsRenderList();
    toast('投稿しました！', 2500);
    status.textContent = '';
  } catch(e) {
    status.textContent = '投稿失敗: ' + e.message;
    toast('投稿に失敗しました', 3000);
  }
  btn.disabled = false;
});

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
