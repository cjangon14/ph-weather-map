/* ------------- MAIN MAP ------------- */
const map = L.map('map').setView([14.5995, 120.9842], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ maxZoom:19 }).addTo(map);

/* ------------- CONFIG ------------- */
const MAX_API_CALLS = 55;
const PER_CALL_DELAY_MS = Math.ceil(60000 / MAX_API_CALLS);
const MIN_CALL_DELAY = 250;
const EFFECTIVE_DELAY = Math.max(PER_CALL_DELAY_MS, MIN_CALL_DELAY);

/* -------------------- Province Outline Layer -------------------- */
let provinceGeoJSON = null;
let provinceOutlineLayer = null;
fetch("gadm41_PHL_2.json")
  .then(res => res.json())
  .then(data => { provinceGeoJSON = data; })
  .catch(err => { console.warn("Could not load GADM file:", err); });

function outlineProvince(provinceName) {
  if (!provinceGeoJSON) return;
  if (provinceOutlineLayer) map.removeLayer(provinceOutlineLayer);

  const matches = provinceGeoJSON.features.filter(f =>
    (f.properties.NAME_2 || "").toLowerCase().includes(provinceName.toLowerCase()) ||
    (f.properties.NAME_1 || "").toLowerCase().includes(provinceName.toLowerCase())
  );

  if (!matches || matches.length === 0) return;

  provinceOutlineLayer = L.geoJSON(matches, {
    style: { color: "#ff8000", weight: 2.5, fillOpacity: 0 }
  }).addTo(map);

  try { map.fitBounds(provinceOutlineLayer.getBounds(), { padding: [20, 20] }); } catch (e) {}
}

/* ------------- LAYERS ------------- */
let volcanoLayer = L.layerGroup();
let earthquakeLayer = L.layerGroup().addTo(map);
let weatherLayer = L.layerGroup().addTo(map);

/* ------------- ICONS & HAZARD ZONES ------------- */
const volcanoIconNormal = L.icon({ iconUrl: 'images/volcano_normal.svg', iconSize: [32,32], iconAnchor:[16,32], popupAnchor:[0,-28] });
const volcanoIconActive = L.icon({ iconUrl: 'images/volcano_active.svg', iconSize: [36,36], iconAnchor:[18,36], popupAnchor:[0,-32] });

const VOLCANO_HAZARD_ZONES = [
  { radius: 6000,  color: "#ff0000", opacity: 0.35 },
  { radius: 15000, color: "#ff6600", opacity: 0.25 },
  { radius: 30000, color: "#ffaa00", opacity: 0.15 },
  { radius: 80000, color: "#ffff00", opacity: 0.05 }
];

function drawVolcanoHazardZones(lat, lon) {
  VOLCANO_HAZARD_ZONES.forEach(z => {
    L.circle([lat, lon], {
      radius: z.radius,
      color: z.color, fillColor: z.color,
      fillOpacity: z.opacity, weight: 1
    }).addTo(volcanoLayer);
  });
}

function createVolcanoPulse(lat, lon) {
  let pulse = L.circle([lat, lon], { radius: 2000, color: "#ff0000", fillOpacity: 0.25, weight: 1 }).addTo(volcanoLayer);
  let r = 2000, maxR = 12000, speed = 250;
  const colors = ["#ff0000","#ff6600","#ffaa00","#ffff00"];
  let colorIndex = 0;

  const interval = setInterval(() => {
    r += 900;
    pulse.setRadius(r);
    const opacity = Math.max(0, 0.30 - (r / maxR) * 0.30);
    pulse.setStyle({ fillOpacity: opacity, opacity: opacity, color: colors[colorIndex], fillColor: colors[colorIndex] });

    if (r >= maxR) { r = 2000; pulse.setRadius(r); colorIndex = (colorIndex+1) % colors.length; }
    if (!map.hasLayer(volcanoLayer)) { clearInterval(interval); volcanoLayer.removeLayer(pulse); }
  }, speed);
}

function drawVolcano(v) {
  const marker = L.marker([v.lat, v.lon], { icon: v.erupting ? volcanoIconActive : volcanoIconNormal });
  marker.bindPopup(`<strong>${v.name}</strong><br>Status: ${v.status}<br>${v.lastActivity ? "Last activity: "+new Date(v.lastActivity).toLocaleString() : ""}`);
  volcanoLayer.addLayer(marker);

  if (v.erupting) {
    drawVolcanoHazardZones(v.lat, v.lon);
    createVolcanoPulse(v.lat, v.lon);
  }
}

/* ------------- DATA VOLCANOES ------------- */
/* Use the merged structure you provided earlier. I kept it compact; expand later as needed. */
const volcanoDB = [
  { name: "Babuyan Claro", lat: 19.52408, lon: 121.95005 },
  { name: "Banahaw", lat: 14.06038, lon: 121.48803 },
  { name: "Biliran (Anas)", lat: 11.63268, lon: 124.47162 },
  { name: "Bud Dajo", lat: 6.01295, lon: 121.05772 },
  { name: "Bulusan", lat: 12.76853, lon: 124.05445 },
  { name: "Cabalian", lat: 10.27986, lon: 125.21598 },
  { name: "Cagua", lat: 18.22116, lon: 122.11630 },
  { name: "Camiguin de Babuyanes", lat: 18.83037, lon: 121.86280 },
  { name: "Didicas", lat: 19.07533, lon: 122.20147 },
  { name: "Hibok-Hibok", lat: 9.20427, lon: 124.67115 },
  { name: "Iraya", lat: 20.46669, lon: 122.01078 },
  { name: "Iriga (Asog)", lat: 13.45606, lon: 123.45479 },
  { name: "Isarog", lat: 13.65685, lon: 123.38087 },
  { name: "Kanlaon", lat: 10.41129, lon: 123.13243 },
  { name: "Leonard Kniaseff", lat: 7.39359, lon: 126.06418 },
  { name: "Makaturing", lat: 7.64371, lon: 124.31718 },
  { name: "Matutum", lat: 6.36111, lon: 125.07603 },
  { name: "Mayon", lat: 13.25519, lon: 123.68615 },
  { name: "Musuan (Calayo)", lat: 7.87680, lon: 125.06985 },
  { name: "Parker", lat: 6.10274, lon: 124.88879 },
  { name: "Pinatubo", lat: 15.14162, lon: 120.35084 },
  { name: "Ragang", lat: 7.69066, lon: 124.50639 },
  { name: "Smith", lat: 19.53915, lon: 121.91367 },
  { name: "Taal", lat: 14.01024, lon: 120.99812 }
];


/* ------------- DATA (Region -> Province -> {Cities, Municipalities}) ------------- */
/* Use the merged structure you provided earlier. I kept it compact; expand later as needed. */
const locationData = {
/* -------------------- Region I (Ilocos Region) -------------------- */
"Region I (Ilocos Region)": {
  "Ilocos Norte": {
    Cities: [
      { name: "Laoag", lat: 18.197271, lon: 120.595992 },
      { name: "Batac", lat: 18.034718, lon: 120.616989 }
    ],
    Municipalities: [
      { name: "Adams", lat: 18.383600, lon: 120.787200 },
      { name: "Bacarra", lat: 18.346000, lon: 120.596000 },
      { name: "Badoc", lat: 18.205200, lon: 120.528900 },
      { name: "Bangui", lat: 18.506700, lon: 120.762800 },
      { name: "Banna", lat: 18.209600, lon: 120.540000 },
      { name: "Burgos", lat: 18.620300, lon: 120.946100 },
      { name: "Carasi", lat: 18.460400, lon: 120.817900 },
      { name: "Currimao", lat: 18.250000, lon: 120.522000 },
      { name: "Dingras", lat: 18.023900, lon: 120.644700 },
      { name: "Dumalneg", lat: 18.531000, lon: 120.903000 },
      { name: "Marcos", lat: 18.083300, lon: 120.441700 },
      { name: "Nueva Era", lat: 18.397500, lon: 120.633300 },
      { name: "Pagudpud", lat: 18.577300, lon: 120.762600 },
      { name: "Paoay", lat: 18.028600, lon: 120.530000 },
      { name: "Pasuquin", lat: 18.147800, lon: 120.578800 },
      { name: "Piddig", lat: 18.142000, lon: 120.720000 },
      { name: "Pinili", lat: 18.128900, lon: 120.574000 },
      { name: "San Nicolas", lat: 18.138200, lon: 120.585800 },
      { name: "Sarrat", lat: 18.100000, lon: 120.621000 },
      { name: "Solsona", lat: 18.271000, lon: 120.712000 },
      { name: "Vintar", lat: 18.485000, lon: 120.648000 }
    ]
  },

  "Ilocos Sur": {
    Cities: [
      { name: "Vigan", lat: 17.575500, lon: 120.386700 },
      { name: "Candon", lat: 17.187800, lon: 120.446900 }
    ],
    Municipalities: [
      { name: "Alilem", lat: 17.072000, lon: 120.433000 },
      { name: "Banayoyo", lat: 17.198000, lon: 120.349000 },
      { name: "Bantay", lat: 17.588000, lon: 120.402000 },
      { name: "Burgos", lat: 17.200000, lon: 120.366700 },
      { name: "Cabugao", lat: 17.199700, lon: 120.448200 },
      { name: "Caoayan", lat: 17.605000, lon: 120.366000 },
      { name: "Cervantes", lat: 17.214000, lon: 120.672000 },
      { name: "Galimuyod", lat: 17.083300, lon: 120.416700 },
      { name: "Gregorio del Pilar", lat: 17.133300, lon: 120.616700 },
      { name: "Lidlidda", lat: 17.125000, lon: 120.513000 },
      { name: "Magsingal", lat: 17.315000, lon: 120.449000 },
      { name: "Nagbukel", lat: 17.052000, lon: 120.449000 },
      { name: "Narvacan", lat: 17.032000, lon: 120.365000 },
      { name: "Quirino", lat: 17.116000, lon: 120.516000 }, // note: small municipality
      { name: "Salcedo", lat: 17.101000, lon: 120.516000 },
      { name: "San Emilio", lat: 16.919000, lon: 120.832000 },
      { name: "San Esteban", lat: 17.100000, lon: 120.450000 },
      { name: "San Ildefonso", lat: 17.353000, lon: 120.548000 },
      { name: "San Juan", lat: 17.616000, lon: 120.433000 },
      { name: "San Vicente", lat: 17.551000, lon: 120.416000 },
      { name: "Santa", lat: 17.350000, lon: 120.400000 },
      { name: "Santa Catalina", lat: 17.466700, lon: 120.316700 },
      { name: "Santa Cruz", lat: 17.616000, lon: 120.600000 },
      { name: "Santa Lucia", lat: 17.445000, lon: 120.432000 },
      { name: "Santa Maria", lat: 17.130000, lon: 120.431000 },
      { name: "Santiago", lat: 16.686000, lon: 121.547000 },
      { name: "Santo Domingo", lat: 17.099000, lon: 120.666000 },
      { name: "Sigay", lat: 17.183000, lon: 120.516000 },
      { name: "Sinait", lat: 17.647000, lon: 120.451000 },
      { name: "Sugpon", lat: 17.038000, lon: 120.596000 },
      { name: "Suyo", lat: 16.899000, lon: 120.833000 },
      { name: "Tagudin", lat: 17.132000, lon: 120.333000 }
    ]
  },

  "La Union": {
    Cities: [
      { name: "San Fernando", lat: 16.615000, lon: 120.313000 }
    ],
    Municipalities: [
      { name: "Agoo", lat: 16.336000, lon: 120.350000 },
      { name: "Aringay", lat: 16.454000, lon: 120.352000 },
      { name: "Bacnotan", lat: 16.633300, lon: 120.318900 },
      { name: "Bagulin", lat: 16.518000, lon: 120.385000 },
      { name: "Balaoan", lat: 16.525000, lon: 120.437000 },
      { name: "Bangar", lat: 17.006000, lon: 120.403000 },
      { name: "Bauang", lat: 16.619000, lon: 120.283000 },
      { name: "Burgos", lat: 16.662000, lon: 120.456000 },
      { name: "Caba", lat: 16.635000, lon: 120.407000 },
      { name: "Luna", lat: 16.783300, lon: 120.275000 },
      { name: "Naguilian", lat: 16.615000, lon: 120.401000 },
      { name: "Pugo", lat: 16.404000, lon: 120.386000 },
      { name: "Rosario", lat: 16.619000, lon: 120.300000 },
      { name: "San Gabriel", lat: 16.533000, lon: 120.454000 },
      { name: "San Juan", lat: 16.717000, lon: 120.338000 },
      { name: "Santo Tomas", lat: 16.501000, lon: 120.342000 },
      { name: "Santol", lat: 16.451000, lon: 120.301000 },
      { name: "Sudipen", lat: 16.585000, lon: 120.397000 },
      { name: "Tubao", lat: 16.452000, lon: 120.344000 }
    ]
  },

  "Pangasinan": {
    Cities: [
      { name: "Dagupan", lat: 16.045000, lon: 120.333300 },
      { name: "Alaminos", lat: 16.066700, lon: 119.983300 },
      { name: "San Carlos", lat: 15.915900, lon: 120.334000 },
      { name: "Urdaneta", lat: 15.976200, lon: 120.571000 }
    ],
    Municipalities: [
      { name: "Agno", lat: 15.943000, lon: 119.937000 },
      { name: "Aguilar", lat: 15.983300, lon: 120.283300 },
      { name: "Alcala", lat: 15.803000, lon: 120.328000 },
      { name: "Anda", lat: 16.166900, lon: 120.236700 },
      { name: "Asingan", lat: 15.952000, lon: 120.450000 },
      { name: "Balungao", lat: 15.898000, lon: 120.705000 },
      { name: "Bani", lat: 15.918000, lon: 120.150000 },
      { name: "Basista", lat: 15.902000, lon: 120.535000 },
      { name: "Bautista", lat: 15.913000, lon: 120.421000 },
      { name: "Bayambang", lat: 15.913000, lon: 120.450000 },
      { name: "Binalonan", lat: 16.004000, lon: 120.512000 },
      { name: "Binmaley", lat: 16.041000, lon: 120.280000 },
      { name: "Bolinao", lat: 16.168000, lon: 119.982000 },
      { name: "Bugallon", lat: 15.956000, lon: 120.251000 },
      { name: "Burgos", lat: 16.023000, lon: 120.467000 },
      { name: "Calasiao", lat: 16.033300, lon: 120.333300 },
      { name: "Dasol", lat: 15.965000, lon: 119.929000 },
      { name: "Infanta", lat: 16.007000, lon: 120.273000 },
      { name: "Labrador", lat: 16.064000, lon: 120.108000 },
      { name: "Laoac", lat: 16.049000, lon: 120.547000 },
      { name: "Lingayen", lat: 15.983300, lon: 120.233300 },
      { name: "Mabini", lat: 15.949000, lon: 120.188000 },
      { name: "Malasiqui", lat: 15.883000, lon: 120.577000 },
      { name: "Manaoag", lat: 16.016000, lon: 120.509000 },
      { name: "Mangaldan", lat: 16.001000, lon: 120.403000 },
      { name: "Mangatarem", lat: 15.876000, lon: 120.164000 },
      { name: "Mapandan", lat: 16.018000, lon: 120.456000 },
      { name: "Natividad", lat: 15.972000, lon: 120.432000 },
      { name: "Pozorrubio", lat: 16.068000, lon: 120.521000 },
      { name: "Rosales", lat: 15.806000, lon: 120.631000 },
      { name: "San Fabian", lat: 16.002000, lon: 120.297000 },
      { name: "San Jacinto", lat: 16.095000, lon: 120.433000 },
      { name: "San Manuel", lat: 16.061000, lon: 120.673000 },
      { name: "San Nicolas", lat: 16.016000, lon: 120.341000 },
      { name: "San Quintin", lat: 16.088000, lon: 120.400000 },
      { name: "Santa Barbara", lat: 15.883000, lon: 120.349000 },
      { name: "Santa Maria", lat: 16.096000, lon: 120.452000 },
      { name: "Santo Tomas", lat: 16.000000, lon: 120.360000 },
      { name: "Sison", lat: 16.220000, lon: 120.482000 },
      { name: "Sual", lat: 16.133000, lon: 119.914000 },
      { name: "Tayug", lat: 16.098000, lon: 120.594000 },
      { name: "Umingan", lat: 16.045000, lon: 120.646000 },
      { name: "Urbiztondo", lat: 16.044000, lon: 120.203000 },
      { name: "Villasis", lat: 15.983000, lon: 120.523000 }
    ]
  }
}, // end Region I


/* -------------------- Region II (Cagayan Valley) -------------------- */
"Region II (Cagayan Valley)": {
  "Batanes": {
    Cities: [
      { name: "Basco", lat: 20.450000, lon: 121.980000 }
    ],
    Municipalities: [
      { name: "Itbayat", lat: 20.567000, lon: 121.933000 },
      { name: "Ivana", lat: 20.416700, lon: 121.950000 },
      { name: "Mahatao", lat: 20.423000, lon: 121.975000 },
      { name: "Sabtang", lat: 20.366700, lon: 121.983000 },
      { name: "Uyugan", lat: 20.500000, lon: 121.933000 }
    ]
  },
  "Cagayan": {
    Cities: [
      { name: "Tuguegarao", lat: 17.613000, lon: 121.730000 }
    ],
    Municipalities: [
      { name: "Abulug", lat: 18.133000, lon: 121.400000 },
      { name: "Alcala", lat: 17.900000, lon: 121.650000 },
      { name: "Allacapan", lat: 17.933000, lon: 121.700000 },
      { name: "Amulung", lat: 17.633000, lon: 121.733000 },
      { name: "Aparri", lat: 18.333000, lon: 121.667000 },
      { name: "Baggao", lat: 17.900000, lon: 121.633000 },
      { name: "Ballesteros", lat: 18.100000, lon: 121.567000 },
      { name: "Buguey", lat: 18.366700, lon: 121.667000 },
      { name: "Camalaniugan", lat: 18.033000, lon: 121.583000 },
      { name: "Claveria", lat: 18.016700, lon: 121.583000 },
      { name: "Enrile", lat: 17.783000, lon: 121.667000 },
      { name: "Gattaran", lat: 18.183000, lon: 121.717000 },
      { name: "Iguig", lat: 17.650000, lon: 121.700000 },
      { name: "Lal-lo", lat: 18.050000, lon: 121.650000 },
      { name: "Lasam", lat: 18.133000, lon: 121.617000 },
      { name: "Pamplona", lat: 17.933000, lon: 121.667000 },
      { name: "Peñablanca", lat: 17.733000, lon: 121.667000 },
      { name: "Piat", lat: 17.667000, lon: 121.717000 },
      { name: "Rizal", lat: 17.583000, lon: 121.633000 },
      { name: "Sanchez-Mira", lat: 18.416700, lon: 121.617000 },
      { name: "Santa Ana", lat: 18.483000, lon: 122.017000 },
      { name: "Santa Praxedes", lat: 18.466700, lon: 121.900000 },
      { name: "Santa Teresita", lat: 18.383000, lon: 121.833000 },
      { name: "Santo Niño", lat: 17.683000, lon: 121.667000 },
      { name: "Solana", lat: 17.617000, lon: 121.733000 },
      { name: "Tuao", lat: 17.850000, lon: 121.667000 },
      { name: "Villaverde", lat: 17.966700, lon: 121.583000 }
    ]
  },
  "Isabela": {
    Cities: [
      { name: "Ilagan", lat: 17.133000, lon: 121.933000 },
      { name: "Cauayan", lat: 16.933000, lon: 121.750000 },
      { name: "Santiago", lat: 16.716700, lon: 121.550000 }
    ],
    Municipalities: [
      { name: "Aurora", lat: 17.200000, lon: 121.750000 },
      { name: "Benito Soliven", lat: 16.933000, lon: 121.717000 },
      { name: "Burgos", lat: 17.133000, lon: 121.900000 },
      { name: "Cabagan", lat: 17.150000, lon: 121.817000 },
      { name: "Cabatuan", lat: 16.950000, lon: 121.767000 },
      { name: "Cordon", lat: 17.133000, lon: 121.817000 },
      { name: "Delfin Albano", lat: 17.083000, lon: 121.833000 },
      { name: "Dinapigue", lat: 16.100000, lon: 122.167000 },
      { name: "Divilacan", lat: 16.483000, lon: 122.000000 },
      { name: "Echague", lat: 16.833000, lon: 121.850000 },
      { name: "Gamu", lat: 16.966700, lon: 121.800000 },
      { name: "Ilagan", lat: 17.133000, lon: 121.933000 },
      { name: "Jones", lat: 17.083000, lon: 121.900000 },
      { name: "Maconacon", lat: 17.367000, lon: 122.467000 },
      { name: "Mallig", lat: 17.083000, lon: 121.717000 },
      { name: "Naguilian", lat: 17.233000, lon: 121.817000 },
      { name: "Palanan", lat: 16.083000, lon: 122.233000 },
      { name: "Ramon", lat: 16.966700, lon: 121.750000 },
      { name: "Reina Mercedes", lat: 17.100000, lon: 121.833000 },
      { name: "San Agustin", lat: 16.883000, lon: 121.717000 },
      { name: "San Guillermo", lat: 16.900000, lon: 121.700000 },
      { name: "San Isidro", lat: 17.033000, lon: 121.833000 },
      { name: "San Manuel", lat: 16.933000, lon: 121.833000 },
      { name: "San Mariano", lat: 16.850000, lon: 121.833000 },
      { name: "San Mateo", lat: 17.050000, lon: 121.850000 },
      { name: "San Pablo", lat: 17.050000, lon: 121.817000 },
      { name: "Santa Maria", lat: 16.950000, lon: 121.800000 },
      { name: "Santo Tomas", lat: 17.083000, lon: 121.833000 },
      { name: "Cauayan", lat: 16.933000, lon: 121.750000 }
    ]
  },
  "Nueva Vizcaya": {
    Cities: [
      { name: "Bayombong", lat: 16.480000, lon: 121.133000 }
    ],
    Municipalities: [
      { name: "Alfonso Castañeda", lat: 16.566700, lon: 121.383000 },
      { name: "Ambaguio", lat: 16.533300, lon: 121.283000 },
      { name: "Aritao", lat: 16.550000, lon: 121.233000 },
      { name: "Bagabag", lat: 16.566700, lon: 121.233000 },
      { name: "Bambang", lat: 16.450000, lon: 121.167000 },
      { name: "Diadi", lat: 16.500000, lon: 121.317000 },
      { name: "Kasibu", lat: 16.766700, lon: 121.317000 },
      { name: "Quezon", lat: 16.633300, lon: 121.233000 },
      { name: "Santa Fe", lat: 16.716700, lon: 121.150000 },
      { name: "Solano", lat: 16.450000, lon: 121.250000 },
      { name: "Villaverde", lat: 16.666700, lon: 121.233000 }
    ]
  },
  "Quirino": {
    Cities: [
      { name: "Cabarroguis", lat: 16.433000, lon: 121.533000 }
    ],
    Municipalities: [
      { name: "Diffun", lat: 16.333000, lon: 121.500000 },
      { name: "Maddela", lat: 16.417000, lon: 121.500000 },
      { name: "Nagtipunan", lat: 16.350000, lon: 121.633000 },
      { name: "Saguday", lat: 16.333000, lon: 121.417000 }
    ]
  }
}, // end Region II


/* -------------------- Region III (Central Luzon) -------------------- */
"Region III (Central Luzon)": {
  "Aurora": {
    Cities: [
      { name: "Baler", lat: 15.758000, lon: 121.563000 }
    ],
    Municipalities: [
      { name: "Dilasag", lat: 16.115000, lon: 122.141000 },
      { name: "Dinalungan", lat: 16.083000, lon: 122.130000 },
      { name: "Dipaculao", lat: 15.671000, lon: 121.651000 },
      { name: "Maria Aurora", lat: 15.718000, lon: 121.547000 },
      { name: "San Luis", lat: 15.807000, lon: 121.456000 },
      { name: "San Mateo", lat: 15.756000, lon: 121.421000 },
      { name: "Santiago", lat: 15.684000, lon: 121.520000 }
    ]
  },
  "Bataan": {
    Cities: [
      { name: "Balanga", lat: 14.676000, lon: 120.529000 }
    ],
    Municipalities: [
      { name: "Abucay", lat: 14.695000, lon: 120.543000 },
      { name: "Bagac", lat: 14.595000, lon: 120.402000 },
      { name: "Dinalupihan", lat: 14.857000, lon: 120.539000 },
      { name: "Hermosa", lat: 14.743000, lon: 120.474000 },
      { name: "Limay", lat: 14.623000, lon: 120.558000 },
      { name: "Mariveles", lat: 14.405000, lon: 120.407000 },
      { name: "Morong", lat: 14.598000, lon: 120.503000 },
      { name: "Orani", lat: 14.740000, lon: 120.440000 },
      { name: "Orion", lat: 14.687000, lon: 120.450000 },
      { name: "Samal", lat: 14.587000, lon: 120.508000 }
    ]
  },
  "Bulacan": {
    Cities: [
      { name: "Malolos", lat: 14.839000, lon: 120.811000 },
      { name: "Meycauayan", lat: 14.726000, lon: 120.954000 },
      { name: "San Jose del Monte", lat: 14.834000, lon: 121.050000 }
    ],
    Municipalities: [
      { name: "Angat", lat: 14.852000, lon: 120.919000 },
      { name: "Balagtas", lat: 14.840000, lon: 120.883000 },
      { name: "Baliuag", lat: 14.883000, lon: 120.884000 },
      { name: "Bocaue", lat: 14.791000, lon: 120.948000 },
      { name: "Bulacan", lat: 14.952000, lon: 120.800000 },
      { name: "Guiguinto", lat: 14.850000, lon: 120.936000 },
      { name: "Hagonoy", lat: 14.719000, lon: 120.889000 },
      { name: "Marilao", lat: 14.746000, lon: 120.944000 },
      { name: "Norzagaray", lat: 14.910000, lon: 121.024000 },
      { name: "Obando", lat: 14.742000, lon: 120.917000 },
      { name: "Pandi", lat: 14.848000, lon: 120.985000 },
      { name: "Plaridel", lat: 14.898000, lon: 120.852000 },
      { name: "Pulilan", lat: 14.881000, lon: 120.885000 },
      { name: "San Ildefonso", lat: 14.855000, lon: 120.834000 },
      { name: "San Miguel", lat: 14.956000, lon: 120.894000 },
      { name: "San Rafael", lat: 14.960000, lon: 120.889000 },
      { name: "Santa Maria", lat: 14.881000, lon: 120.850000 }
    ]
  },
  "Nueva Ecija": {
    Cities: [
      { name: "Cabanatuan", lat: 15.480000, lon: 120.963000 },
      { name: "Gapan", lat: 15.280000, lon: 120.948000 },
      { name: "Palayan", lat: 15.490000, lon: 121.063000 },
      { name: "San Jose", lat: 15.623000, lon: 121.033000 }
    ],
    Municipalities: [
      { name: "Aliaga", lat: 15.567000, lon: 120.900000 },
      { name: "Bongabon", lat: 15.550000, lon: 121.050000 },
      { name: "Cabiao", lat: 15.300000, lon: 120.950000 },
      { name: "Carranglan", lat: 15.616000, lon: 121.250000 },
      { name: "Cuyapo", lat: 15.750000, lon: 121.083000 },
      { name: "Gabaldon", lat: 15.666000, lon: 121.267000 },
      { name: "General Tinio", lat: 15.266000, lon: 121.167000 },
      { name: "Guimba", lat: 15.566000, lon: 120.900000 },
      { name: "Jaen", lat: 15.500000, lon: 120.967000 },
      { name: "Laur", lat: 15.583000, lon: 121.067000 },
      { name: "Licab", lat: 15.583000, lon: 120.950000 },
      { name: "Nampicuan", lat: 15.616000, lon: 120.933000 },
      { name: "Peñaranda", lat: 15.550000, lon: 121.033000 },
      { name: "Quezon", lat: 15.583000, lon: 121.017000 },
      { name: "Rizal", lat: 15.500000, lon: 120.983000 },
      { name: "San Antonio", lat: 15.666000, lon: 121.067000 },
      { name: "San Isidro", lat: 15.533000, lon: 121.017000 },
      { name: "San Leonardo", lat: 15.583000, lon: 120.967000 },
      { name: "Santa Rosa", lat: 15.516000, lon: 121.033000 },
      { name: "Santo Domingo", lat: 15.533000, lon: 120.950000 },
      { name: "Talavera", lat: 15.600000, lon: 120.950000 },
      { name: "Talugtug", lat: 15.633000, lon: 120.917000 },
      { name: "Zaragoza", lat: 15.600000, lon: 120.950000 }
    ]
  },
  "Pampanga": {
    Cities: [
      { name: "Angeles", lat: 15.145000, lon: 120.583000 },
      { name: "San Fernando", lat: 15.033000, lon: 120.683000 }
    ],
    Municipalities: [
      { name: "Apalit", lat: 14.966000, lon: 120.731000 },
      { name: "Arayat", lat: 15.083000, lon: 120.667000 },
      { name: "Bacolor", lat: 15.033000, lon: 120.683000 },
      { name: "Candaba", lat: 14.983000, lon: 120.650000 },
      { name: "Floridablanca", lat: 15.083000, lon: 120.600000 },
      { name: "Guagua", lat: 14.966000, lon: 120.683000 },
      { name: "Lubao", lat: 14.966000, lon: 120.583000 },
      { name: "Mabalacat", lat: 15.183000, lon: 120.583000 },
      { name: "Macabebe", lat: 14.933000, lon: 120.583000 },
      { name: "Magalang", lat: 15.150000, lon: 120.667000 },
      { name: "Masantol", lat: 14.966000, lon: 120.617000 },
      { name: "Mexico", lat: 15.083000, lon: 120.683000 },
      { name: "San Luis", lat: 15.100000, lon: 120.733000 },
      { name: "San Simon", lat: 15.083000, lon: 120.700000 },
      { name: "Santa Ana", lat: 15.066000, lon: 120.667000 },
      { name: "Santa Rita", lat: 15.016000, lon: 120.667000 },
      { name: "Santo Tomas", lat: 15.050000, lon: 120.667000 },
      { name: "Floridablanca", lat: 15.083000, lon: 120.600000 }
    ]
  },
  "Tarlac": {
    Cities: [
      { name: "Tarlac City", lat: 15.484000, lon: 120.597000 }
    ],
    Municipalities: [
      { name: "Anao", lat: 15.483000, lon: 120.683000 },
      { name: "Bamban", lat: 15.350000, lon: 120.533000 },
      { name: "Camiling", lat: 15.616000, lon: 120.517000 },
      { name: "Capas", lat: 15.300000, lon: 120.567000 },
      { name: "Concepcion", lat: 15.516000, lon: 120.567000 },
      { name: "Gerona", lat: 15.533000, lon: 120.617000 },
      { name: "La Paz", lat: 15.533000, lon: 120.567000 },
      { name: "Mayantoc", lat: 15.366000, lon: 120.533000 },
      { name: "Moncada", lat: 15.500000, lon: 120.583000 },
      { name: "Paniqui", lat: 15.500000, lon: 120.583000 },
      { name: "Pura", lat: 15.466000, lon: 120.583000 },
      { name: "Ramos", lat: 15.483000, lon: 120.583000 },
      { name: "San Clemente", lat: 15.383000, lon: 120.567000 },
      { name: "San Jose", lat: 15.533000, lon: 120.567000 },
      { name: "San Manuel", lat: 15.500000, lon: 120.550000 },
      { name: "Santa Ignacia", lat: 15.500000, lon: 120.533000 }
    ]
  },
  "Zambales": {
    Cities: [
      { name: "Olongapo", lat: 14.839000, lon: 120.282000 }
    ],
    Municipalities: [
      { name: "Castillejos", lat: 14.950000, lon: 120.283000 },
      { name: "Candelaria", lat: 14.933000, lon: 120.300000 },
      { name: "Masinloc", lat: 15.233000, lon: 119.983000 },
      { name: "Palauig", lat: 15.366000, lon: 119.983000 },
      { name: "San Antonio", lat: 15.216000, lon: 120.100000 },
      { name: "San Felipe", lat: 15.200000, lon: 120.117000 },
      { name: "San Marcelino", lat: 14.950000, lon: 120.100000 },
      { name: "San Narciso", lat: 14.933000, lon: 120.133000 },
      { name: "Santa Cruz", lat: 15.200000, lon: 120.200000 },
      { name: "Subic", lat: 14.844000, lon: 120.271000 }
    ]
  }
}, // end Region III


/* -------------------- Region IV-A (CALABARZON) -------------------- */
"Region IV-A (CALABARZON)": {
  "Batangas": {
    Cities: [
      { name: "Batangas City", lat: 13.756000, lon: 121.058000 },
      { name: "Lipa", lat: 13.941000, lon: 121.164000 },
      { name: "Tanauan", lat: 14.106000, lon: 121.095000 },
      { name: "Lemery", lat: 13.850000, lon: 120.966000 }
    ],
    Municipalities: [
      { name: "Agoncillo", lat: 13.807000, lon: 121.068000 },
      { name: "Alitagtag", lat: 13.811000, lon: 121.099000 },
      { name: "Balayan", lat: 13.855000, lon: 120.849000 },
      { name: "Balete", lat: 14.022000, lon: 121.100000 },
      { name: "Bauan", lat: 13.837000, lon: 120.903000 },
      { name: "Calaca", lat: 13.836000, lon: 120.874000 },
      { name: "Calatagan", lat: 13.810000, lon: 120.612000 },
      { name: "Cuenca", lat: 13.887000, lon: 121.060000 },
      { name: "Ibaan", lat: 13.858000, lon: 121.050000 },
      { name: "Laurel", lat: 13.881000, lon: 121.083000 },
      { name: "Lian", lat: 13.852000, lon: 120.787000 },
      { name: "Lobo", lat: 13.762000, lon: 121.358000 },
      { name: "Mabini", lat: 13.766000, lon: 121.113000 },
      { name: "Malvar", lat: 13.865000, lon: 121.135000 },
      { name: "Mataasnakahoy", lat: 13.896000, lon: 121.147000 },
      { name: "Nasugbu", lat: 14.036000, lon: 120.891000 },
      { name: "Padre Garcia", lat: 13.925000, lon: 121.111000 },
      { name: "Rosario", lat: 13.883000, lon: 121.095000 },
      { name: "San Jose", lat: 13.847000, lon: 121.051000 },
      { name: "San Juan", lat: 13.875000, lon: 121.050000 },
      { name: "San Luis", lat: 13.957000, lon: 120.949000 },
      { name: "San Nicolas", lat: 13.910000, lon: 121.067000 },
      { name: "Santa Teresita", lat: 13.875000, lon: 121.083000 },
      { name: "Santo Tomas", lat: 13.920000, lon: 121.070000 },
      { name: "Taal", lat: 13.850000, lon: 120.900000 },
      { name: "Talisay", lat: 13.839000, lon: 121.000000 },
      { name: "Taysan", lat: 13.820000, lon: 121.050000 },
      { name: "Tingloy", lat: 13.730000, lon: 121.133000 },
      { name: "Tuy", lat: 13.883000, lon: 120.783000 }
    ]
  },
  "Cavite": {
    Cities: [
      { name: "Bacoor", lat: 14.460000, lon: 120.917000 },
      { name: "Cavite City", lat: 14.484000, lon: 120.918000 },
      { name: "Dasmariñas", lat: 14.330000, lon: 120.937000 },
      { name: "Imus", lat: 14.426000, lon: 120.936000 },
      { name: "Tagaytay", lat: 14.109000, lon: 120.993000 }
    ],
    Municipalities: [
      { name: "Alfonso", lat: 14.218000, lon: 120.950000 },
      { name: "Amadeo", lat: 14.272000, lon: 121.005000 },
      { name: "Bacoor", lat: 14.460000, lon: 120.917000 },
      { name: "Carmona", lat: 14.333000, lon: 121.000000 },
      { name: "Cavite City", lat: 14.484000, lon: 120.918000 },
      { name: "Dasmariñas", lat: 14.330000, lon: 120.937000 },
      { name: "General Emilio Aguinaldo", lat: 14.333000, lon: 120.933000 },
      { name: "General Mariano Alvarez", lat: 14.330000, lon: 120.950000 },
      { name: "Indang", lat: 14.262000, lon: 120.948000 },
      { name: "Kawit", lat: 14.451000, lon: 120.907000 },
      { name: "Magallanes", lat: 14.234000, lon: 120.930000 },
      { name: "Maragondon", lat: 14.167000, lon: 120.817000 },
      { name: "Mendez", lat: 14.217000, lon: 121.000000 },
      { name: "Naic", lat: 14.338000, lon: 120.833000 },
      { name: "Tagaytay", lat: 14.109000, lon: 120.993000 },
      { name: "Tanza", lat: 14.317000, lon: 120.867000 },
      { name: "Ternate", lat: 14.426000, lon: 120.757000 },
      { name: "Trece Martires", lat: 14.307000, lon: 120.933000 }
    ]
  },
  "Laguna": {
    Cities: [
      { name: "Calamba", lat: 14.210000, lon: 121.154000 },
      { name: "San Pablo", lat: 14.064000, lon: 121.325000 },
      { name: "Santa Rosa", lat: 14.312000, lon: 121.127000 },
      { name: "Biñan", lat: 14.333000, lon: 121.069000 }
    ],
    Municipalities: [
      { name: "Alaminos", lat: 14.250000, lon: 121.142000 },
      { name: "Bay", lat: 14.200000, lon: 121.167000 },
      { name: "Cabuyao", lat: 14.250000, lon: 121.102000 },
      { name: "Calauan", lat: 14.200000, lon: 121.183000 },
      { name: "Cavinti", lat: 14.233000, lon: 121.450000 },
      { name: "Famy", lat: 14.317000, lon: 121.333000 },
      { name: "Kalayaan", lat: 14.133000, lon: 121.350000 },
      { name: "Liliw", lat: 14.083000, lon: 121.400000 },
      { name: "Los Baños", lat: 14.167000, lon: 121.243000 },
      { name: "Luisiana", lat: 14.117000, lon: 121.383000 },
      { name: "Lumban", lat: 14.133000, lon: 121.333000 },
      { name: "Mabitac", lat: 14.167000, lon: 121.367000 },
      { name: "Magdalena", lat: 14.233000, lon: 121.217000 },
      { name: "Majayjay", lat: 14.083000, lon: 121.417000 },
      { name: "Nagcarlan", lat: 14.083000, lon: 121.333000 },
      { name: "Paete", lat: 14.300000, lon: 121.383000 },
      { name: "Pagsanjan", lat: 14.300000, lon: 121.320000 },
      { name: "Pakil", lat: 14.100000, lon: 121.317000 },
      { name: "Pangil", lat: 14.083000, lon: 121.333000 },
      { name: "Pila", lat: 14.233000, lon: 121.300000 },
      { name: "Rizal", lat: 14.133000, lon: 121.300000 },
      { name: "San Pedro", lat: 14.333000, lon: 121.065000 },
      { name: "Santa Cruz", lat: 14.333000, lon: 121.417000 },
      { name: "Santa Maria", lat: 14.333000, lon: 121.400000 },
      { name: "Siniloan", lat: 14.117000, lon: 121.367000 },
      { name: "Victoria", lat: 14.300000, lon: 121.317000 }
    ]
  },
  "Rizal": {
    Cities: [
      { name: "Antipolo", lat: 14.586000, lon: 121.167000 }
    ],
    Municipalities: [
      { name: "Angono", lat: 14.550000, lon: 121.133000 },
      { name: "Baras", lat: 14.700000, lon: 121.250000 },
      { name: "Binangonan", lat: 14.566000, lon: 121.216000 },
      { name: "Cainta", lat: 14.583000, lon: 121.123000 },
      { name: "Cardona", lat: 14.500000, lon: 121.200000 },
      { name: "Jalajala", lat: 14.433000, lon: 121.333000 },
      { name: "Morong", lat: 14.533000, lon: 121.333000 },
      { name: "Pililla", lat: 14.550000, lon: 121.233000 },
      { name: "Rodriguez", lat: 14.650000, lon: 121.150000 },
      { name: "San Mateo", lat: 14.650000, lon: 121.100000 },
      { name: "Tanay", lat: 14.550000, lon: 121.350000 },
      { name: "Taytay", lat: 14.550000, lon: 121.100000 },
      { name: "Teresa", lat: 14.550000, lon: 121.183000 }
    ]
  },
  "Quezon": {
    Cities: [
      { name: "Lucena", lat: 13.941000, lon: 121.617000 }
    ],
    Municipalities: [
      { name: "Alabat", lat: 13.883000, lon: 122.283000 },
      { name: "Atimonan", lat: 14.167000, lon: 121.933000 },
      { name: "Buenavista", lat: 13.933000, lon: 121.933000 },
      { name: "Burdeos", lat: 14.050000, lon: 122.333000 },
      { name: "Calauag", lat: 13.833000, lon: 122.133000 },
      { name: "Candelaria", lat: 13.950000, lon: 121.667000 },
      { name: "Catanauan", lat: 13.783000, lon: 122.150000 },
      { name: "Dolores", lat: 14.100000, lon: 121.833000 },
      { name: "General Luna", lat: 13.900000, lon: 121.950000 },
      { name: "General Nakar", lat: 14.450000, lon: 121.667000 },
      { name: "Guinayangan", lat: 13.966000, lon: 122.133000 },
      { name: "Infanta", lat: 14.633000, lon: 121.616000 },
      { name: "Jomalig", lat: 13.967000, lon: 122.483000 },
      { name: "Lopez", lat: 13.950000, lon: 122.083000 },
      { name: "Lucban", lat: 14.117000, lon: 121.567000 },
      { name: "Macalelon", lat: 13.983000, lon: 122.183000 },
      { name: "Mauban", lat: 14.050000, lon: 121.867000 },
      { name: "Mulanay", lat: 13.850000, lon: 122.050000 },
      { name: "Padre Burgos", lat: 13.917000, lon: 122.150000 },
      { name: "Pagbilao", lat: 14.100000, lon: 121.750000 },
      { name: "Panukulan", lat: 14.500000, lon: 121.900000 },
      { name: "Patnanungan", lat: 14.200000, lon: 122.233000 },
      { name: "Perez", lat: 13.950000, lon: 121.900000 },
      { name: "Pitogo", lat: 13.933000, lon: 121.983000 },
      { name: "Polillo", lat: 14.833000, lon: 121.983000 },
      { name: "Quezon", lat: 14.133000, lon: 121.633000 },
      { name: "Real", lat: 14.600000, lon: 121.700000 },
      { name: "Sampaloc", lat: 14.050000, lon: 121.950000 },
      { name: "San Andres", lat: 13.967000, lon: 122.150000 },
      { name: "San Antonio", lat: 14.033000, lon: 121.917000 },
      { name: "San Francisco", lat: 14.033000, lon: 121.950000 },
      { name: "San Narciso", lat: 14.033000, lon: 121.850000 },
      { name: "Sariaya", lat: 13.967000, lon: 121.767000 },
      { name: "Tagkawayan", lat: 13.983000, lon: 121.983000 },
      { name: "Tayabas", lat: 14.083000, lon: 121.567000 },
      { name: "Tiaong", lat: 13.933000, lon: 121.633000 },
      { name: "Unisan", lat: 13.817000, lon: 121.900000 }
    ]
  }
}, // end Region IV-A


  /* -------------------- Region IV-B (MIMAROPA) -------------------- */
/* -------------------- Region IV-B (MIMAROPA) -------------------- */
"Region IV-B (MIMAROPA)": {
  "Marinduque": {
    Cities: [],
    Municipalities: [
      { name: "Boac", lat: 13.436000, lon: 121.840000 },
      { name: "Buenavista", lat: 13.508000, lon: 121.870000 },
      { name: "Gasan", lat: 13.441000, lon: 121.923000 },
      { name: "Mogpog", lat: 13.417000, lon: 121.873000 },
      { name: "Santa Cruz", lat: 13.417000, lon: 121.850000 },
      { name: "Torrijos", lat: 13.376000, lon: 121.870000 }
    ]
  },
  "Occidental Mindoro": {
    Cities: [],
    Municipalities: [
      { name: "Abra de Ilog", lat: 13.350000, lon: 120.550000 },
      { name: "Calintaan", lat: 13.083000, lon: 120.517000 },
      { name: "Looc", lat: 13.216000, lon: 120.600000 },
      { name: "Lubang", lat: 13.900000, lon: 120.117000 },
      { name: "Magsaysay", lat: 13.167000, lon: 120.633000 },
      { name: "Mamburao", lat: 13.366000, lon: 120.583000 },
      { name: "Paluan", lat: 13.350000, lon: 120.300000 },
      { name: "Rizal", lat: 13.350000, lon: 120.533000 },
      { name: "Sablayan", lat: 12.966000, lon: 120.383000 },
      { name: "San Jose", lat: 13.183000, lon: 120.600000 },
      { name: "Santa Cruz", lat: 13.166000, lon: 120.533000 },
      { name: "Santa Maria", lat: 13.200000, lon: 120.583000 },
      { name: "Santo Tomas", lat: 13.266000, lon: 120.583000 },
      { name: "Baco", lat: 13.200000, lon: 120.650000 }
    ]
  },
  "Oriental Mindoro": {
    Cities: [
      { name: "Calapan", lat: 13.433000, lon: 121.183000 }
    ],
    Municipalities: [
      { name: "Baco", lat: 13.416000, lon: 121.233000 },
      { name: "Bansud", lat: 13.350000, lon: 121.350000 },
      { name: "Bongabon", lat: 13.316000, lon: 121.083000 },
      { name: "Bulalacao", lat: 12.716000, lon: 121.583000 },
      { name: "Gloria", lat: 13.233000, lon: 121.100000 },
      { name: "Mansalay", lat: 12.900000, lon: 121.417000 },
      { name: "Naujan", lat: 13.350000, lon: 121.217000 },
      { name: "Pinamalayan", lat: 13.383000, lon: 121.317000 },
      { name: "Pola", lat: 13.466000, lon: 121.283000 },
      { name: "Puerto Galera", lat: 13.433000, lon: 120.950000 },
      { name: "Roxas", lat: 13.366000, lon: 121.300000 },
      { name: "San Teodoro", lat: 13.516000, lon: 121.267000 },
      { name: "Socorro", lat: 13.366000, lon: 121.383000 },
      { name: "Victoria", lat: 13.333000, lon: 121.217000 }
    ]
  },
  "Palawan": {
    Cities: [
      { name: "Puerto Princesa", lat: 9.744000, lon: 118.734000 }
    ],
    Municipalities: [
      { name: "Aborlan", lat: 9.425000, lon: 118.615000 },
      { name: "Agutaya", lat: 11.933000, lon: 119.867000 },
      { name: "Araceli", lat: 9.983000, lon: 118.900000 },
      { name: "Balabac", lat: 7.983000, lon: 117.566000 },
      { name: "Bataraza", lat: 8.950000, lon: 117.900000 },
      { name: "Brooke's Point", lat: 8.300000, lon: 117.850000 },
      { name: "Cagayancillo", lat: 10.716000, lon: 117.733000 },
      { name: "Coron", lat: 12.000000, lon: 120.200000 },
      { name: "Culion", lat: 12.100000, lon: 120.050000 },
      { name: "Cuyo", lat: 11.150000, lon: 119.883000 },
      { name: "Dumaran", lat: 12.500000, lon: 120.467000 },
      { name: "El Nido", lat: 11.200000, lon: 119.400000 },
      { name: "Linapacan", lat: 12.200000, lon: 119.950000 },
      { name: "Magsaysay", lat: 9.933000, lon: 118.983000 },
      { name: "Narra", lat: 9.983000, lon: 118.667000 },
      { name: "Quezon", lat: 9.983000, lon: 118.750000 },
      { name: "Roxas", lat: 9.783000, lon: 118.900000 },
      { name: "San Vicente", lat: 10.183000, lon: 118.500000 },
      { name: "Sofronio Española", lat: 8.983000, lon: 118.467000 },
      { name: "Taytay", lat: 9.767000, lon: 118.750000 },
      { name: "Taytay (Bacuit)", lat: 11.200000, lon: 119.450000 }
    ]
  },
  "Romblon": {
    Cities: [],
    Municipalities: [
      { name: "Alcantara", lat: 12.583000, lon: 122.300000 },
      { name: "Banton", lat: 12.333000, lon: 122.167000 },
      { name: "Cajidiocan", lat: 12.433000, lon: 122.400000 },
      { name: "Calatrava", lat: 12.583000, lon: 122.433000 },
      { name: "Concepcion", lat: 12.583000, lon: 122.283000 },
      { name: "Corcuera", lat: 12.350000, lon: 122.350000 },
      { name: "Ferrol", lat: 12.500000, lon: 122.433000 },
      { name: "Looc", lat: 12.583000, lon: 122.417000 },
      { name: "Odiongan", lat: 12.533000, lon: 122.300000 },
      { name: "Romblon", lat: 12.566000, lon: 122.283000 },
      { name: "San Agustin", lat: 12.583000, lon: 122.317000 },
      { name: "San Andres", lat: 12.550000, lon: 122.317000 },
      { name: "San Fernando", lat: 12.550000, lon: 122.283000 },
      { name: "San Jose", lat: 12.550000, lon: 122.350000 },
      { name: "Santa Fe", lat: 12.533000, lon: 122.300000 },
      { name: "Santa Maria", lat: 12.600000, lon: 122.333000 },
      { name: "Sibuyan", lat: 12.583000, lon: 122.350000 }
    ]
  }
}, // end Region IV-B


/* -------------------- Region V (Bicol Region) -------------------- */
"Region V (Bicol Region)": {
  "Albay": {
    Cities: [
      { name: "Legazpi", lat: 13.133000, lon: 123.743000 },
      { name: "Ligao", lat: 13.231000, lon: 123.545000 },
      { name: "Tabaco", lat: 13.330000, lon: 123.701000 }
    ],
    Municipalities: [
      { name: "Bacacay", lat: 13.393000, lon: 123.715000 },
      { name: "Camalig", lat: 13.236000, lon: 123.665000 },
      { name: "Daraga", lat: 13.133000, lon: 123.720000 },
      { name: "Guinobatan", lat: 13.266000, lon: 123.558000 },
      { name: "Jovellar", lat: 13.317000, lon: 123.587000 },
      { name: "Libon", lat: 13.266000, lon: 123.767000 },
      { name: "Malilipot", lat: 13.233000, lon: 123.683000 },
      { name: "Malinao", lat: 13.333000, lon: 123.630000 },
      { name: "Manito", lat: 13.083000, lon: 123.783000 },
      { name: "Oas", lat: 13.166000, lon: 123.583000 },
      { name: "Pio Duran", lat: 13.183000, lon: 123.667000 },
      { name: "Polangui", lat: 13.400000, lon: 123.550000 },
      { name: "Rapu-Rapu", lat: 13.383000, lon: 123.767000 },
      { name: "Santo Domingo", lat: 13.200000, lon: 123.633000 },
      { name: "Tiwi", lat: 13.183000, lon: 123.700000 }
    ]
  },
  "Camarines Norte": {
    Cities: [
      { name: "Daet", lat: 14.100000, lon: 122.966000 }
    ],
    Municipalities: [
      { name: "Basud", lat: 14.183000, lon: 122.933000 },
      { name: "Capalonga", lat: 14.283000, lon: 123.083000 },
      { name: "Jose Panganiban", lat: 14.283000, lon: 122.983000 },
      { name: "Labo", lat: 14.250000, lon: 122.950000 },
      { name: "Mercedes", lat: 14.133000, lon: 122.933000 },
      { name: "Paracale", lat: 14.350000, lon: 122.983000 },
      { name: "San Lorenzo Ruiz", lat: 14.200000, lon: 123.033000 },
      { name: "San Vicente", lat: 14.150000, lon: 122.900000 },
      { name: "Santa Elena", lat: 14.133000, lon: 122.983000 },
      { name: "Talisay", lat: 14.133000, lon: 122.950000 }
    ]
  },
  "Camarines Sur": {
    Cities: [
      { name: "Naga", lat: 13.623000, lon: 123.182000 },
      { name: "Iriga", lat: 13.417000, lon: 123.420000 },
      { name: "Ragay", lat: 13.556000, lon: 123.450000 }
    ],
    Municipalities: [
      { name: "Baao", lat: 13.450000, lon: 123.283000 },
      { name: "Balatan", lat: 13.583000, lon: 123.500000 },
      { name: "Bato", lat: 13.500000, lon: 123.533000 },
      { name: "Bombon", lat: 13.533000, lon: 123.150000 },
      { name: "Buhi", lat: 13.500000, lon: 123.467000 },
      { name: "Bula", lat: 13.566000, lon: 123.250000 },
      { name: "Cabusao", lat: 13.583000, lon: 123.283000 },
      { name: "Calabanga", lat: 13.600000, lon: 123.350000 },
      { name: "Camaligan", lat: 13.616000, lon: 123.200000 },
      { name: "Canaman", lat: 13.616000, lon: 123.200000 },
      { name: "Caramoan", lat: 13.950000, lon: 123.900000 },
      { name: "Del Gallego", lat: 13.700000, lon: 123.433000 },
      { name: "Gainza", lat: 13.633000, lon: 123.200000 },
      { name: "Garchitorena", lat: 13.683000, lon: 123.700000 },
      { name: "Goa", lat: 13.550000, lon: 123.267000 },
      { name: "Libmanan", lat: 13.550000, lon: 123.500000 },
      { name: "Lupi", lat: 13.666000, lon: 123.366000 },
      { name: "Magarao", lat: 13.600000, lon: 123.233000 },
      { name: "Milaor", lat: 13.616000, lon: 123.216000 },
      { name: "Minalabac", lat: 13.583000, lon: 123.417000 },
      { name: "Nabua", lat: 13.566000, lon: 123.283000 },
      { name: "Ocampo", lat: 13.766000, lon: 123.433000 },
      { name: "Pamplona", lat: 13.616000, lon: 123.333000 },
      { name: "Pasacao", lat: 13.600000, lon: 123.567000 },
      { name: "Pili", lat: 13.566000, lon: 123.250000 },
      { name: "Presentacion", lat: 13.800000, lon: 123.700000 },
      { name: "Rinconada", lat: 13.616000, lon: 123.233000 },
      { name: "Sagñay", lat: 13.683000, lon: 123.667000 },
      { name: "San Fernando", lat: 13.533000, lon: 123.300000 },
      { name: "San Jose", lat: 13.583000, lon: 123.267000 },
      { name: "Sipocot", lat: 13.766000, lon: 123.416000 },
      { name: "Siruma", lat: 13.950000, lon: 123.867000 },
      { name: "Tigaon", lat: 13.733000, lon: 123.667000 },
      { name: "Tinambac", lat: 13.700000, lon: 123.767000 }
    ]
  },
  "Catanduanes": {
    Cities: [
      { name: "Virac", lat: 13.583000, lon: 124.200000 }
    ],
    Municipalities: [
      { name: "Bagamanoc", lat: 13.750000, lon: 124.367000 },
      { name: "Baras", lat: 13.700000, lon: 124.300000 },
      { name: "Bato", lat: 13.566000, lon: 124.283000 },
      { name: "Caramoran", lat: 13.766000, lon: 124.417000 },
      { name: "Gigmoto", lat: 13.900000, lon: 124.500000 },
      { name: "Pandan", lat: 13.683000, lon: 124.317000 },
      { name: "Panganiban", lat: 13.783000, lon: 124.383000 },
      { name: "San Andres", lat: 13.616000, lon: 124.283000 },
      { name: "San Miguel", lat: 13.666000, lon: 124.383000 },
      { name: "Viga", lat: 13.616000, lon: 124.417000 }
    ]
  },
  "Sorsogon": {
    Cities: [
      { name: "Sorsogon City", lat: 12.973000, lon: 123.922000 }
    ],
    Municipalities: [
      { name: "Barcelona", lat: 12.866000, lon: 123.933000 },
      { name: "Bulusan", lat: 12.800000, lon: 124.050000 },
      { name: "Casiguran", lat: 12.966000, lon: 124.033000 },
      { name: "Castilla", lat: 12.950000, lon: 123.933000 },
      { name: "Donsol", lat: 12.966000, lon: 123.900000 },
      { name: "Gubat", lat: 12.833000, lon: 123.983000 },
      { name: "Irosin", lat: 12.950000, lon: 124.050000 },
      { name: "Juban", lat: 13.033000, lon: 123.900000 },
      { name: "Magallanes", lat: 12.816000, lon: 123.967000 },
      { name: "Matnog", lat: 12.733000, lon: 124.100000 },
      { name: "Pilar", lat: 12.950000, lon: 123.967000 },
      { name: "Prieto Diaz", lat: 12.816000, lon: 124.033000 },
      { name: "Santa Magdalena", lat: 12.833000, lon: 123.950000 }
    ]
  }
}, // end Region V


/* -------------------- NCR (National Capital Region) -------------------- */
"NCR (National Capital Region)": {
  "Metro Manila": {
    Cities: [
      { name: "Caloocan", lat: 14.6570, lon: 120.9780 },
      { name: "Las Piñas", lat: 14.459910, lon: 120.994858 },
      { name: "Makati", lat: 14.5547, lon: 121.0244 },
      { name: "Malabon", lat: 14.6680, lon: 120.9630 },
      { name: "Mandaliuyong", lat: 14.5820, lon: 121.0340 },
      { name: "Manila", lat: 14.5995, lon: 120.9842 },
      { name: "Marikina", lat: 14.6500, lon: 121.1020 },
      { name: "Muntinlupa", lat: 14.4089, lon: 121.0170 },
      { name: "Navotas", lat: 14.4320, lon: 120.9370 },
      { name: "Parañaque", lat: 14.477890, lon: 121.028931 },
      { name: "Pasay", lat: 14.5350, lon: 121.0000 },
      { name: "Pasig", lat: 14.5760, lon: 121.0850 },
      { name: "Quezon City", lat: 14.6760, lon: 121.0430 },
      { name: "San Juan", lat: 14.6000, lon: 121.0350 },
      { name: "Taguig", lat: 14.5170, lon: 121.0500 },
      { name: "Valenzuela", lat: 14.7000, lon: 120.9820 }
    ],
    Municipalities: [] // NCR has no separate municipalities
  }
},

/* -------------------- CAR (Cordillera Administrative Region) -------------------- */
"CAR (Cordillera Administrative Region)": {
  "Abra": {
    Cities: [],
    Municipalities: [
      { name: "Bangued", lat: 17.6330, lon: 120.6160 },
      { name: "Boliney", lat: 17.6330, lon: 120.5170 },
      { name: "Bucay", lat: 17.6160, lon: 120.7000 },
      { name: "Bucloc", lat: 17.6160, lon: 120.5670 },
      { name: "Daguioman", lat: 17.6660, lon: 120.5500 },
      { name: "Danglas", lat: 17.6160, lon: 120.5330 },
      { name: "Dolores", lat: 17.6330, lon: 120.6670 },
      { name: "La Paz", lat: 17.6000, lon: 120.6170 },
      { name: "Lacub", lat: 17.6500, lon: 120.5670 },
      { name: "Lagangilang", lat: 17.6500, lon: 120.5330 },
      { name: "Lagayan", lat: 17.6660, lon: 120.5000 },
      { name: "Langiden", lat: 17.6660, lon: 120.5830 },
      { name: "Licuan-Baay", lat: 17.6500, lon: 120.5830 },
      { name: "Malibcong", lat: 17.6500, lon: 120.5330 },
      { name: "Manabo", lat: 17.6660, lon: 120.5500 },
      { name: "Peñarrubia", lat: 17.6330, lon: 120.5330 },
      { name: "Pilar", lat: 17.6330, lon: 120.5670 },
      { name: "San Isidro", lat: 17.6160, lon: 120.6000 },
      { name: "San Juan", lat: 17.6330, lon: 120.6170 },
      { name: "San Quintin", lat: 17.6330, lon: 120.6000 },
      { name: "Tayum", lat: 17.6160, lon: 120.6170 },
      { name: "Tineg", lat: 17.7000, lon: 120.5000 },
      { name: "Tubo", lat: 17.6500, lon: 120.5170 },
      { name: "Villaviciosa", lat: 17.6160, lon: 120.5830 }
    ]
  },
  "Apayao": {
    Cities: [],
    Municipalities: [
      { name: "Calanasan", lat: 18.2330, lon: 121.1170 },
      { name: "Conner", lat: 18.3170, lon: 121.0330 },
      { name: "Flora", lat: 18.2830, lon: 121.0830 },
      { name: "Kabugao", lat: 18.1830, lon: 121.0830 },
      { name: "Luna", lat: 18.2500, lon: 121.0830 },
      { name: "Pudtol", lat: 18.2000, lon: 121.1330 },
      { name: "Santa Marcela", lat: 18.2330, lon: 121.0500 }
    ]
  },
  "Benguet": {
    Cities: [
      { name: "Baguio", lat: 16.4020, lon: 120.5960 }
    ],
    Municipalities: [
      { name: "Atok", lat: 16.5160, lon: 120.6930 },
      { name: "Bakun", lat: 16.7160, lon: 120.6660 },
      { name: "Bokod", lat: 16.6160, lon: 120.6660 },
      { name: "Buguias", lat: 16.6500, lon: 120.6830 },
      { name: "Itogon", lat: 16.4660, lon: 120.6170 },
      { name: "Kabayan", lat: 16.6330, lon: 120.6170 },
      { name: "Kapangan", lat: 16.6160, lon: 120.6170 },
      { name: "Kibungan", lat: 16.7160, lon: 120.5830 },
      { name: "La Trinidad", lat: 16.4170, lon: 120.6000 },
      { name: "Mankayan", lat: 16.6160, lon: 120.6170 },
      { name: "Sablan", lat: 16.4000, lon: 120.6170 },
      { name: "Tuba", lat: 16.4160, lon: 120.6000 },
      { name: "Tublay", lat: 16.4500, lon: 120.6000 }
    ]
  },
  "Ifugao": {
    Cities: [],
    Municipalities: [
      { name: "Aguinaldo", lat: 16.9330, lon: 121.1670 },
      { name: "Alfonso Lista", lat: 16.8500, lon: 121.0830 },
      { name: "Asipulo", lat: 16.8830, lon: 121.0330 },
      { name: "Banaue", lat: 16.9330, lon: 121.0830 },
      { name: "Hingyon", lat: 16.9830, lon: 121.0830 },
      { name: "Hungduan", lat: 16.9330, lon: 121.0830 },
      { name: "Kiangan", lat: 16.9830, lon: 121.0830 },
      { name: "Lagawe", lat: 16.9830, lon: 121.1330 },
      { name: "Lamut", lat: 17.0330, lon: 121.1670 },
      { name: "Mayoyao", lat: 17.0500, lon: 121.0830 },
      { name: "Tinoc", lat: 16.9830, lon: 121.1670 }
    ]
  },
  "Kalinga": {
    Cities: [],
    Municipalities: [
      { name: "Balbalan", lat: 17.6500, lon: 121.1330 },
      { name: "Lubuagan", lat: 17.5000, lon: 121.0330 },
      { name: "Pasil", lat: 17.6160, lon: 121.1670 },
      { name: "Pinukpuk", lat: 17.6160, lon: 121.2330 },
      { name: "Rizal", lat: 17.5330, lon: 121.0830 },
      { name: "Tabuk", lat: 17.4660, lon: 121.0830 },
      { name: "Tanudan", lat: 17.5830, lon: 121.1170 },
      { name: "Tinglayan", lat: 17.5500, lon: 121.0670 }
    ]
  },
  "Mountain Province": {
    Cities: [],
    Municipalities: [
      { name: "Barlig", lat: 17.0000, lon: 120.9830 },
      { name: "Bauko", lat: 16.9660, lon: 120.9830 },
      { name: "Bontoc", lat: 17.1200, lon: 120.9830 },
      { name: "Natonin", lat: 17.0500, lon: 121.0830 },
      { name: "Paracelis", lat: 16.9500, lon: 121.0330 },
      { name: "Sabangan", lat: 16.9500, lon: 120.9500 },
      { name: "Sadanga", lat: 17.0500, lon: 120.9830 },
      { name: "Sagada", lat: 17.1000, lon: 120.9500 },
      { name: "Banaue", lat: 16.9330, lon: 121.0830 }, // overlaps with Ifugao border
      { name: "Tadian", lat: 17.0330, lon: 120.9830 }
    ]
  },
  "Apayao": {
    Cities: [], // already listed above
    Municipalities: [] // already listed above
  }
} // end CAR

}; // end locationData

/* ------------- ANIMATED WEATHER ICONS ------------- */
const animatedIcons = {
  "01d":"https://basmilius.github.io/weather-icons/production/fill/all/clear-day.svg",
  "01n":"https://basmilius.github.io/weather-icons/production/fill/all/clear-night.svg",
  "02d":"https://basmilius.github.io/weather-icons/production/fill/all/partly-cloudy-day.svg",
  "02n":"https://basmilius.github.io/weather-icons/production/fill/all/partly-cloudy-night.svg",
  "03d":"https://basmilius.github.io/weather-icons/production/fill/all/cloudy.svg",
  "03n":"https://basmilius.github.io/weather-icons/production/fill/all/cloudy.svg",
  "04d":"https://basmilius.github.io/weather-icons/production/fill/all/overcast.svg",
  "04n":"https://basmilius.github.io/weather-icons/production/fill/all/overcast.svg",
  "09d":"https://basmilius.github.io/weather-icons/production/fill/all/rain.svg",
  "09n":"https://basmilius.github.io/weather-icons/production/fill/all/rain.svg",
  "10d":"https://basmilius.github.io/weather-icons/production/fill/all/partly-cloudy-day-rain.svg",
  "10n":"https://basmilius.github.io/weather-icons/production/fill/all/partly-cloudy-night-rain.svg",
  "11d":"https://basmilius.github.io/weather-icons/production/fill/all/thunderstorms.svg",
  "11n":"https://basmilius.github.io/weather-icons/production/fill/all/thunderstorms.svg",
  "13d":"https://basmilius.github.io/weather-icons/production/fill/all/snow.svg",
  "13n":"https://basmilius.github.io/weather-icons/production/fill/all/snow.svg",
  "50d":"https://basmilius.github.io/weather-icons/production/fill/all/haze-day.svg",
  "50n":"https://basmilius.github.io/weather-icons/production/fill/all/haze-night.svg"
};

/* ------------- API ------------- */
const API_KEY = "0fb77c599638926341f8d8ed83aa27ad";
async function getWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  try { const res = await fetch(url); if (!res.ok) return null; return await res.json(); }
  catch (e) { return null; }
}

/* ------------- UI REFS ------------- */
const citySearch = document.getElementById('citySearch');
const suggestions = document.getElementById('suggestions');
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loadingText');
const clearBtn = document.getElementById('clearBtn');

/* ------------- Drawer / Side Dock (robust init) ------------- */
(function initDrawer() {
  function el(id){ return document.getElementById(id); }
  const dp = el("drawerPanel");
  const dc = el("drawerContent");
  const btnH = el("btnHazards");
  const btnW = el("btnWeather");
  const headerVolcanoToggle = el("volcano-toggle");
  if (!dp || !dc || !btnH || !btnW) {
    console.warn("Drawer elements missing; skipping drawer init.");
    return;
  }

  function openPanel(type, html, after) {
    if (dp.classList.contains("open") && dp.dataset.panel === type) {
      dp.classList.remove("open");
      dp.dataset.panel = "";
      return;
    }
    dp.classList.add("open");
    dp.dataset.panel = type;
    dc.innerHTML = html;
    if (typeof after === "function") after();
  }

  btnH.addEventListener("click", () => {
    openPanel("hazards", `
      <h2>Hazard Layers</h2>
      <label style="display:block;margin:8px 0;"><input type="checkbox" id="chkVolcano"> Volcanoes</label>
      <label style="display:block;margin:8px 0;"><input type="checkbox" id="chkTsunami"> Tsunami Risk</label>
      <label style="display:block;margin:8px 0;"><input type="checkbox" id="chkFlood"> Flood Zones</label>
      <label style="display:block;margin:8px 0;"><input type="checkbox" id="chkStorm"> Tropical Cyclones</label>
    `, () => {
      const chkVol = document.getElementById("chkVolcano");
      if (chkVol) {
        if (headerVolcanoToggle) chkVol.checked = headerVolcanoToggle.checked;
        chkVol.addEventListener("change", () => {
          if (chkVol.checked) { map.addLayer(volcanoLayer); refreshVolcanoLayerIfPossible(); }
          else map.removeLayer(volcanoLayer);
          if (headerVolcanoToggle) headerVolcanoToggle.checked = chkVol.checked;
        });
      }
    });
  });

  btnW.addEventListener("click", () => {
    openPanel("weather", `<h2>Weather Locations</h2><div id="weatherRegionTree"></div>`, () => {
      if (typeof buildUIFromData === "function") buildUIFromData();
    });
  });

  if (headerVolcanoToggle) {
    headerVolcanoToggle.addEventListener("change", () => {
      if (headerVolcanoToggle.checked) { map.addLayer(volcanoLayer); refreshVolcanoLayerIfPossible(); }
      else map.removeLayer(volcanoLayer);
      const chk = document.getElementById("chkVolcano");
      if (chk) chk.checked = headerVolcanoToggle.checked;
    });
  }
})();

function refreshVolcanoLayerIfPossible(){ if (typeof refreshVolcanoLayer === "function") refreshVolcanoLayer(); }

/* ------------- Build Weather Region/Province Tree ------------- */
function buildUIFromData() {
  const treeContainer = document.getElementById("weatherRegionTree");
  if (!treeContainer) return;
  if (typeof locationData === "undefined") { treeContainer.innerHTML = "<div style='color:#bbb'>Location data not loaded.</div>"; return; }

  treeContainer.innerHTML = "";

  Object.keys(locationData).forEach(regionName => {
    const regionDiv = document.createElement("div");
    regionDiv.className = "region";

    const regionLabel = document.createElement("div");
    regionLabel.className = "region-label";
    regionLabel.innerHTML = `<strong>${regionName}</strong><span class="toggle">▸</span>`;
    regionDiv.appendChild(regionLabel);

    const provinceList = document.createElement("div");
    provinceList.className = "province-list";
    provinceList.style.display = "none";

    const regionObj = locationData[regionName] || {};
    Object.keys(regionObj).forEach(provinceName => {
      const provDiv = document.createElement("div");
      provDiv.className = "province";

      const provLabel = document.createElement("div");
      provLabel.className = "province-label";
      provLabel.innerHTML = `<span class="prov-click">${provinceName}</span><span class="toggle">▸</span>`;
      provDiv.appendChild(provLabel);

      const cityList = document.createElement("div");
      cityList.className = "city-list";
      cityList.style.display = "none";

      const provObj = regionObj[provinceName] || { Cities: [], Municipalities: [] };
      const citiesArr = provObj.Cities || [];
      const munisArr = provObj.Municipalities || [];

      if (citiesArr.length) {
        const header = document.createElement("div");
        header.style.fontSize = '12px'; header.style.color = 'var(--muted)';
        header.style.margin = '6px 0 4px'; header.textContent = 'Cities';
        cityList.appendChild(header);

        citiesArr.forEach(city => {
          const c = document.createElement('div');
          c.className = 'city-entry';
          c.textContent = city.name;
          c.addEventListener('click', (ev) => { ev.stopPropagation(); flyToCity(city); openCityWeather(city); });
          cityList.appendChild(c);
        });
      }

      if (munisArr.length) {
        const header = document.createElement("div");
        header.style.fontSize = '12px'; header.style.color = 'var(--muted)';
        header.style.margin = '6px 0 4px'; header.textContent = 'Municipalities';
        cityList.appendChild(header);

        munisArr.forEach(m => {
          const mdiv = document.createElement('div');
          mdiv.className = 'muni-entry';
          mdiv.textContent = m.name;
          mdiv.addEventListener('click', (ev) => { ev.stopPropagation(); flyToCity(m); openCityWeather(m); });
          cityList.appendChild(mdiv);
        });
      }

      provDiv.appendChild(cityList);

      // Create prov-click load handler — pass provLabel for spinner UI
      const provClick = provLabel.querySelector('.prov-click');
      if (provClick) {
        provClick.style.cursor = 'pointer';
        provClick.addEventListener('click', (ev) => {
          ev.stopPropagation(); // prevent parent toggles
          // show spinner (created here) while loadGroup runs
          let spinner = provLabel.querySelector('.prov-spinner');
          if (!spinner) {
            spinner = document.createElement('span');
            spinner.className = 'prov-spinner';
            // inline spinner styles (no CSS file changes)
            spinner.style.display = 'inline-block';
            spinner.style.width = '12px';
            spinner.style.height = '12px';
            spinner.style.marginLeft = '8px';
            spinner.style.border = '2px solid rgba(255,255,255,0.12)';
            spinner.style.borderTop = '2px solid rgba(255,255,255,0.9)';
            spinner.style.borderRadius = '50%';
            spinner.style.animation = 'provspin 0.8s linear infinite';
            provLabel.appendChild(spinner);
          }
          // call loadGroup with provLabel reference for spinner removal support
          loadGroup(regionName, provinceName, provLabel);
        });
      }

      // parent label toggles the child city list
      provLabel.addEventListener('click', () => {
        const open = cityList.style.display === 'block';
        cityList.style.display = open ? 'none' : 'block';
        provLabel.querySelector('.toggle').textContent = open ? '▸' : '▾';
      });

      provinceList.appendChild(provDiv);
    });

    regionLabel.addEventListener('click', () => {
      const open = provinceList.style.display === 'block';
      provinceList.style.display = open ? 'none' : 'block';
      regionLabel.querySelector('.toggle').textContent = open ? '▸' : '▾';
    });

    regionDiv.appendChild(provinceList);
    treeContainer.appendChild(regionDiv);
  });

  // add small keyframes style for the spinner (inject only once)
  if (!document.getElementById('prov-spinner-style')) {
    const s = document.createElement('style');
    s.id = 'prov-spinner-style';
    s.textContent = `@keyframes provspin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(s);
  }
}

/* ------------- Search / Autocomplete (flatIndex expects locationData to exist) ------------- */
let flatIndex = [];
function rebuildFlatIndex() {
  flatIndex = [];
  if (typeof locationData === "undefined") return;
  Object.keys(locationData).forEach(region => {
    const regionObj = locationData[region] || {};
    Object.keys(regionObj).forEach(province => {
      const provObj = regionObj[province] || { Cities: [], Municipalities: [] };
      (provObj.Cities || []).forEach(c => flatIndex.push({ name: c.name, lat: c.lat, lon: c.lon, region, province, type: 'City' }));
      (provObj.Municipalities || []).forEach(m => flatIndex.push({ name: m.name, lat: m.lat, lon: m.lon, region, province, type: 'Municipality' }));
    });
  });
}
window.rebuildLocationIndex = function(){ rebuildFlatIndex(); };

function showSuggestions(items) {
  suggestions.innerHTML = '';
  if (!items || items.length === 0) { suggestions.classList.add('hidden'); return; }
  suggestions.classList.remove('hidden');

  items.slice(0, 8).forEach(it => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.innerHTML = `<strong>${it.name}</strong> <span style="color:var(--muted);font-size:12px"> — ${it.province} | ${it.region}</span>`;
    div.addEventListener('click', () => {
      suggestions.classList.add('hidden');
      citySearch.value = it.name;
      flyToCity(it); openCityWeather(it);
    });
    suggestions.appendChild(div);
  });
}

citySearch.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) { showSuggestions([]); return; }
  const matches = flatIndex.filter(i => i.name.toLowerCase().includes(q));
  showSuggestions(matches);
});

document.addEventListener('click', (e) => {
  if (suggestions && !suggestions.contains(e.target) && e.target !== citySearch) suggestions.classList.add('hidden');
});

let suggestionIndex = -1;
citySearch.addEventListener('keydown', (e) => {
  const visible = suggestions && !suggestions.classList.contains('hidden');
  const items = suggestions ? Array.from(suggestions.querySelectorAll('.suggestion-item')) : [];
  if (!visible || items.length === 0) return;
  if (e.key === 'ArrowDown') {
    suggestionIndex = Math.min(items.length - 1, suggestionIndex + 1);
    items.forEach((it,i)=> it.style.background = (i===suggestionIndex? 'rgba(255,255,255,0.04)':'transparent'));
    e.preventDefault();
  } else if (e.key === 'ArrowUp') {
    suggestionIndex = Math.max(0, suggestionIndex - 1);
    items.forEach((it,i)=> it.style.background = (i===suggestionIndex? 'rgba(255,255,255,0.04)':'transparent'));
    e.preventDefault();
  } else if (e.key === 'Enter') {
    if (suggestionIndex >= 0 && items[suggestionIndex]) { items[suggestionIndex].click(); suggestionIndex = -1; e.preventDefault(); }
    else {
      const qv = citySearch.value.trim();
      const found = flatIndex.find(i => i.name.toLowerCase() === qv.toLowerCase());
      if (found) { flyToCity(found); openCityWeather(found); }
    }
  }
});

/* ------------- WEATHER MARKER MANAGEMENT ------------- */
let lastLoaded = { region: null, province: null };
let activeRequestId = 0;

function showLoading(show, text) {
  if (!loading) return;
  if (show) { loading.classList.remove('hidden'); loadingText.textContent = text || 'Loading weather...'; }
  else { loading.classList.add('hidden'); loadingText.textContent = 'Loading weather...'; }
}

function clearWeather() { weatherLayer.clearLayers(); }

async function addWeatherForCities(cityList, requestId) {
  clearWeather();
  let all = Array.isArray(cityList) ? cityList.slice() : [];
  if (all.length === 0) { showLoading(false); return; }

  if (all.length > MAX_API_CALLS) { showLoading(true, `Too many locations (${all.length}). Showing first ${MAX_API_CALLS}`); all = all.slice(0, MAX_API_CALLS); }
  else showLoading(true, `Loading ${all.length} location(s)...`);

  for (let i = 0; i < all.length; i++) {
    const city = all[i];
    if (requestId !== activeRequestId) { showLoading(false); return; }
    await new Promise(r => setTimeout(r, EFFECTIVE_DELAY));
    const data = await getWeather(city.lat, city.lon);
    if (!data) continue;
    if (requestId !== activeRequestId) { showLoading(false); return; }

    const code = data.weather?.[0]?.icon || '03d';
    const iconURL = animatedIcons[code] || animatedIcons['03d'];

    const icon = L.divIcon({
      html: `<div class="weather-marker"><img src="${iconURL}" /><span>${Math.round(data.main.temp)}°C</span></div>`,
      className: 'weather-icon-wrapper', iconSize: [64,64], iconAnchor: [32,32]
    });

    const marker = L.marker([city.lat, city.lon], { icon });
    marker.bindPopup(`
      <b>${city.name}</b><br>
      <img src="${iconURL}" width="90" /><br>
      ${data.weather[0].description.toUpperCase()}<br>
      🌡 ${data.main.temp}°C &nbsp; 💧 ${data.main.humidity}% <br>
      💨 ${data.wind.speed} m/s
    `);
    marker.addTo(weatherLayer);
  }

  showLoading(false);
}

/* ------------- single city open ------------- */
async function openCityWeather(city) {
  const requestId = ++activeRequestId;
  flyToCity(city);
  showLoading(true, 'Loading city weather...');
  const data = await getWeather(city.lat, city.lon);
  if (requestId !== activeRequestId) return;
  showLoading(false); if (!data) return;

  const code = data.weather?.[0]?.icon || '03d';
  const iconURL = animatedIcons[code];
  const tempIcon = L.divIcon({ html: `<div class="weather-marker"><img src="${iconURL}" /><span>${Math.round(data.main.temp)}°C</span></div>`, className:'weather-icon-wrapper', iconSize:[60,60], iconAnchor:[30,30] });

  const tempMarker = L.marker([city.lat, city.lon], { icon: tempIcon }).addTo(map);
  tempMarker.bindPopup(`<b>${city.name}</b><br><img src="${iconURL}" width="90" /><br>${data.weather[0].description.toUpperCase()}<br>🌡 ${data.main.temp}°C`).openPopup();
  setTimeout(() => tempMarker.remove(), 12000);
}
function flyToCity(city) { map.flyTo([city.lat, city.lon], 11, { duration: 0.9 }); }

/* ------------- Load a province (region + province) ------------- */
/* NOTE: accepts optional provLabelEl to show/remove per-province spinner */
async function loadGroup(region, province=null, provLabelEl=null) {
  if (!region || !province) return;

  // If user clicked the same province repeatedly, ignore repeat loads
  if (lastLoaded.region === region && lastLoaded.province === province) return;

  lastLoaded = { region, province };
  clearWeather();
  const requestId = ++activeRequestId;

  // show small spinner next to province if element provided (safety)
  let spinner = null;
  if (provLabelEl) {
    spinner = provLabelEl.querySelector('.prov-spinner');
    if (!spinner) {
      spinner = document.createElement('span');
      spinner.className = 'prov-spinner';
      spinner.style.display = 'inline-block';
      spinner.style.width = '12px';
      spinner.style.height = '12px';
      spinner.style.marginLeft = '8px';
      spinner.style.border = '2px solid rgba(255,255,255,0.12)';
      spinner.style.borderTop = '2px solid rgba(255,255,255,0.9)';
      spinner.style.borderRadius = '50%';
      spinner.style.animation = 'provspin 0.8s linear infinite';
      provLabelEl.appendChild(spinner);
    }
  }

  const bounds = computeBoundsForGroup(region, province);
  if (bounds) map.flyToBounds(bounds.pad(0.6), { duration: 0.9 });

  const regionObj = (typeof locationData !== "undefined") ? locationData[region] : null;
  if (!regionObj) {
    if (spinner && spinner.parentNode) spinner.parentNode.removeChild(spinner);
    showLoading(false);
    return;
  }

  const provObj = regionObj[province] || { Cities: [], Municipalities: [] };
  const cities = [...(provObj.Cities || []), ...(provObj.Municipalities || [])];

  await addWeatherForCities(cities, requestId);

  // remove spinner when done (if still present)
  if (spinner && spinner.parentNode) spinner.parentNode.removeChild(spinner);
}

/* ------------- computeBoundsForGroup ------------- */
function computeBoundsForGroup(region, province=null) {
  if (typeof locationData === "undefined") return null;
  const regionObj = locationData[region];
  if (!regionObj) return null;
  let coords = [];

  if (province) {
    const p = regionObj[province]; if (!p) return null;
    coords = [...(p.Cities || []).map(c => [c.lat, c.lon]), ...(p.Municipalities || []).map(m => [m.lat, m.lon])];
  } else {
    Object.keys(regionObj).forEach(pName => {
      const prov = regionObj[pName] || {};
      coords.push(...(prov.Cities || []).map(c => [c.lat, c.lon]));
      coords.push(...(prov.Municipalities || []).map(m => [m.lat, m.lon]));
    });
  }
  if (coords.length === 0) return null;
  return L.latLngBounds(coords);
}

/* ------------- Earthquake loader ------------- */
const EQ_URL_DAY = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
const MIN_LAT = -15, MAX_LAT = 35, MIN_LON = 90, MAX_LON = 150;

async function loadEarthquakes() {
  try {
    const res = await fetch(EQ_URL_DAY); const data = await res.json();
    earthquakeLayer.clearLayers();
    (data.features || []).forEach(eq => {
      const mag = eq.properties.mag || 0;
      const [lon, lat] = eq.geometry.coordinates;
      if (lat < MIN_LAT || lat > MAX_LAT || lon < MIN_LON || lon > MAX_LON) return;
      const circle = L.circle([lat, lon], { radius: Math.max(1200, mag * 5000), color: 'red', fillColor: 'red', fillOpacity: 0.35 }).addTo(earthquakeLayer);
      circle.bindPopup(`<b>Mag:</b> ${mag}<br><b>Place:</b> ${eq.properties.place}<br><b>Time:</b> ${new Date(eq.properties.time).toLocaleString()}`);
      setTimeout(() => circle.setStyle({ fillOpacity: 0.15 }), 15000);
    });
  } catch (e) { /* fail silently */ }
}

/* ------------- Volcano loader (guarded) ------------- */
async function fetchActiveVolcanoEvents() {
  try {
    const res = await fetch("https://eonet.gsfc.nasa.gov/api/v3/events?category=volcanoes");
    const data = await res.json();
    return (data.events || []).map(evt => ({
      title: evt.title,
      time: evt.geometry[0]?.date,
      lat: evt.geometry[0]?.coordinates[1],
      lon: evt.geometry[0]?.coordinates[0]
    }));
  } catch (err) { console.error("EONET volcano API error:", err); return []; }
}

async function buildVolcanoStatus() {
  if (typeof volcanoDB === "undefined") return [];
  const events = await fetchActiveVolcanoEvents();
  return volcanoDB.map(v => {
    const match = events.find(e => e.title.toLowerCase().includes((v.name||"").toLowerCase()));
    return { ...v, status: match ? "ACTIVE" : "Normal", erupting: !!match, lastActivity: match ? match.time : null };
  });
}

async function refreshVolcanoLayer() {
  if (typeof volcanoDB === "undefined") return;
  volcanoLayer.clearLayers();
  const list = await buildVolcanoStatus();
  list.forEach(drawVolcano);
}

/* ------------- UI actions ------------- */
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    clearWeather(); if (citySearch) citySearch.value = '';
    if (suggestions) suggestions.classList.add('hidden'); activeRequestId++; showLoading(false);
  });
}

/* ------------- Start repeated loaders ------------- */
(async function start() {
  loadEarthquakes();
  setInterval(loadEarthquakes, 120000);

  const headerVolcano = document.getElementById('volcano-toggle');
  if (headerVolcano && headerVolcano.checked) refreshVolcanoLayer();
  setInterval(() => { const header = document.getElementById('volcano-toggle'); if (header && header.checked) refreshVolcanoLayer(); }, 5 * 60 * 1000);
})();

/* ------------- Init ------------- */
(function init() {
  map.setView([14.5995, 120.9842], 10);
  // if you re-add `locationData`/`volcanoDB`, run:
  // rebuildLocationIndex(); buildUIFromData();
})();


// ---------------- TSUNAMI EARLY INDICATOR SYSTEM --------------------
// (placeholder structure - full logic will be added next step)

console.log("Tsunami system loaded (placeholder)");



// ---------------- TSUNAMI EARLY INDICATOR SYSTEM --------------------
/* Tsunami Early Indicators
   - Alerts generated from earthquake feed (USGS)
   - Markers buffered if layer is disabled, shown when enabled
   - Pulsing marker becomes clickable after 5 seconds
*/

(function(){
  // Layer and state
  const tsunamiLayer = L.layerGroup(); // not added by default
  const tsunamiPending = []; // buffered alerts while layer off
  const processedQuakeIds = new Set();

  // Detection thresholds
  const TSUNAMI_MAG_THRESHOLD = 7.0;
  const TSUNAMI_DEPTH_THRESHOLD_KM = 50;
  const TSUNAMI_DISTANCE_KM = 120;

  // Trench approximations (lat, lon pairs). Replace with more precise GeoJSON later if desired.
  const TSUNAMI_TRENCHES = [
    { name: "Philippine Trench", coords: [ [9.0,125.0],[10.5,126.5],[12.0,128.0],[13.5,129.5],[15.0,131.0] ] },
    { name: "East Luzon Trench", coords: [ [18.5,122.0],[17.0,123.5],[15.5,125.0],[14.0,126.5],[12.5,128.0] ] },
    { name: "Sulu Trench", coords: [ [6.0,119.0],[7.0,118.0],[8.0,117.0],[9.0,116.5] ] },
    { name: "Negros Trench", coords: [ [10.0,123.0],[10.5,122.0],[11.0,121.0] ] }
  ];

  // Utility: haversine (km)
  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = Math.PI/180;
    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1*toRad) * Math.cos(lat2*toRad) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  }

  // Distance from point to polyline (km) - simple per-segment projection
  function distanceToPolylineKm(lat, lon, polyline) {
    const toRad = Math.PI/180;
    const lat0 = lat * toRad;
    const cosLat0 = Math.cos(lat0);
    const R = 6371000;
    const px = lon * toRad * R * cosLat0;
    const py = lat * toRad * R;
    let minDistM = Infinity;
    for (let i=0;i<polyline.length-1;i++){
      const aLat = polyline[i][0], aLon = polyline[i][1];
      const bLat = polyline[i+1][0], bLon = polyline[i+1][1];
      const ax = aLon * toRad * R * cosLat0;
      const ay = aLat * toRad * R;
      const bx = bLon * toRad * R * cosLat0;
      const by = bLat * toRad * R;
      const vx = bx-ax, vy = by-ay;
      const wx = px-ax, wy = py-ay;
      const vlen2 = vx*vx + vy*vy;
      let t = vlen2===0?0:((wx*vx + wy*vy) / vlen2);
      if (t<0) t=0; if (t>1) t=1;
      const projx = ax + t*vx;
      const projy = ay + t*vy;
      const dx = px - projx, dy = py - projy;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d < minDistM) minDistM = d;
    }
    return minDistM === Infinity ? Number.MAX_VALUE : (minDistM/1000.0);
  }

  function isNearTsunamiZone(lat, lon, kmThreshold = TSUNAMI_DISTANCE_KM) {
    for (const t of TSUNAMI_TRENCHES){
      const d = distanceToPolylineKm(lat, lon, t.coords);
      if (d <= kmThreshold) return true;
    }
    return false;
  }

  // Create pulsing marker (hazard triangle + wave SVG), interactive after 5s
  function createTsunamiMarker(feature) {
    const coords = feature.geometry && feature.geometry.coordinates;
    const lon = coords && coords[0];
    const lat = coords && coords[1];
    const depth = coords && coords[2];
    const mag = feature.properties && feature.properties.mag;
    const id = feature.id || (feature.properties && (feature.properties.code || feature.properties.time)) || Math.random().toString(36).slice(2);

    const html = `
      <div class="tsunami-alert-container" data-quake-id="${id}">
        <div class="tsunami-rings">
          <span class="ring ring-1"></span>
          <span class="ring ring-2"></span>
          <span class="ring ring-3"></span>
        </div>
        <div class="tsunami-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" aria-hidden="true">
            <g transform="translate(0,0)">
              <path d="M1 21h22L12 2 1 21z" fill="#f2b236"></path>
              <path d="M7 15c.8-1.5 2.4-2.5 4-2.5s3.2 1 4 2.5c1-1.5 2.6-2.5 4-2.5v4H3v-4c1.4 0 3 1 4 2.5z" fill="#01579b"></path>
            </g>
          </svg>
        </div>
      </div>
    `;
    const icon = L.divIcon({
      className: 'tsunami-divicon',
      html: html,
      iconSize: [48,48],
      iconAnchor: [24,24],
      popupAnchor: [0,-28]
    });
    const marker = L.marker([lat, lon], { icon: icon, interactive: true });
    marker._tsunamiMeta = { id, mag, depth, lat, lon };
    // Add popup after delay
    setTimeout(() => {
      const popupHtml = `
        <div style="font-weight:700;color:#c62828">Potential Tsunami Indicator</div>
        <div>Magnitude: ${mag}<br/>Depth: ${depth} km<br/>Location: ${lat.toFixed(3)}, ${lon.toFixed(3)}</div>
        <div style="margin-top:6px;color:#666;font-size:12px;">This is an automated indicator derived from earthquake data. Verify with PHIVOLCS or PTWC.</div>
        <div style="margin-top:6px;"><a href="https://www.phivolcs.dost.gov.ph" target="_blank">PHIVOLCS</a> • <a href="https://ptwc.weather.gov" target="_blank">PTWC</a></div>
      `;
      marker.bindPopup(popupHtml);
    }, 5000);

    // Stop pulsing visual after 40s (rings animation removed)
    setTimeout(() => {
      const el = marker.getElement();
      if (el) {
        const rings = el.querySelectorAll('.ring');
        rings.forEach(r => r.style.animation = 'none');
      }
    }, 40000);

    return marker;
  }

  // Show marker immediately if layer is active, else buffer
  function showOrBufferMarker(marker, meta) {
    if (map.hasLayer(tsunamiLayer)) {
      marker.addTo(tsunamiLayer);
    } else {
      tsunamiPending.push({ marker, meta });
    }
  }

  // When enabling layer, drain pending
  function drainPending() {
    while (tsunamiPending.length) {
      const item = tsunamiPending.shift();
      item.marker.addTo(tsunamiLayer);
    }
  }

  // Evaluate quake feature for tsunami potential
  function evaluateQuakeForTsunami(feature) {
    try {
      const id = feature.id || (feature.properties && (feature.properties.code || feature.properties.time));
      if (!id) return;
      if (processedQuakeIds.has(id)) return;
      const mag = feature.properties && feature.properties.mag ? feature.properties.mag : 0;
      const coords = feature.geometry && feature.geometry.coordinates;
      if (!coords) { processedQuakeIds.add(id); return; }
      const lon = coords[0], lat = coords[1], depthKm = coords[2] || (feature.properties && feature.properties.depth) || 9999;
      // mark processed regardless to avoid repeats
      processedQuakeIds.add(id);

      if (mag < TSUNAMI_MAG_THRESHOLD) return;
      if (depthKm > TSUNAMI_DEPTH_THRESHOLD_KM) return;
      if (!isNearTsunamiZone(lat, lon, TSUNAMI_DISTANCE_KM)) return;

      const marker = createTsunamiMarker(feature);
      showOrBufferMarker(marker, { id, mag, depthKm, lat, lon });
    } catch (e) {
      console.warn("Tsunami eval error:", e);
    }
  }

  // Expose control: add checkbox behavior in hazards panel if present
  function setupTsunamiToggle() {
    const chk = document.getElementById('chkTsunami') || document.getElementById('chkTsunamiRisk') || document.querySelector('input[data-tsunami-toggle]');
    if (!chk) {
      // If drawer builds dynamically, we add a MutationObserver to catch when it's added later
      const mo = new MutationObserver((records) => {
        const k = document.getElementById('chkTsunami') || document.getElementById('chkTsunamiRisk') || document.querySelector('input[data-tsunami-toggle]');
        if (k) { mo.disconnect(); bindCheckbox(k); }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } else {
      bindCheckbox(chk);
    }

    function bindCheckbox(chkEl) {
      // set label text if found nearby label
      try {
        const lab = chkEl.parentElement;
        if (lab && lab.tagName.toLowerCase() === 'label') {
          lab.innerHTML = `<input type="checkbox" id="chkTsunami"> Tsunami Early Indicators`;
          // reassign the element reference
        }
      } catch(e){}
      // actual element now:
      const newChk = document.getElementById('chkTsunami');
      if (!newChk) return;
      // start unchecked
      newChk.checked = false;
      newChk.addEventListener('change', (ev) => {
        if (ev.target.checked) {
          map.addLayer(tsunamiLayer);
          drainPending();
        } else {
          if (map.hasLayer(tsunamiLayer)) map.removeLayer(tsunamiLayer);
          // keep pending and existing markers in memory
        }
      });
    }
  }

  // Initialize
  setupTsunamiToggle();

  // Expose functions for debugging
  window.evaluateQuakeForTsunami = evaluateQuakeForTsunami;
  window.tsunamiLayer = tsunamiLayer;
  window.tsunamiPending = tsunamiPending;

})(); // end tsunami IIFE
