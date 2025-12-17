const axios = require('axios');
const fs = require('fs');

async function generateMoroccoWindData() {
  console.log("🏭 المصنع يعمل: جاري تصنيع شبكة الرياح (إصلاح نهائي للهيكلة)...");

  const latStart = 20.0; 
  const latEnd = 36.0;   
  const lonStart = -18.0; 
  const lonEnd = -1.0;    
  const resolution = 2.0; 

  let lats = [];
  let lons = [];
  
  for (let lat = latEnd; lat >= latStart; lat -= resolution) {
    for (let lon = lonStart; lon <= lonEnd; lon += resolution) {
      lats.push(lat);
      lons.push(lon);
    }
  }

  try {
    const url = "https://api.open-meteo.com/v1/forecast";
    const params = {
      latitude: lats.join(','),
      longitude: lons.join(','),
      hourly: "windspeed_10m,winddirection_10m",
      forecast_days: 1,
      windspeed_unit: "kmh"
    };

    const response = await axios.get(url, { params });
    const data = response.data;

    let uData = [];
    let vData = [];

    const calculateUV = (speed, dir) => {
        const rad = dir * (Math.PI / 180);
        const u = -speed * Math.sin(rad);
        const v = -speed * Math.cos(rad);
        return { u, v };
    };

    const processPoint = (point) => {
        const speed = point.hourly.windspeed_10m[0];
        const dir = point.hourly.winddirection_10m[0];
        const { u, v } = calculateUV(speed, dir);
        uData.push(u);
        vData.push(v);
    };

    if (Array.isArray(data)) {
        data.forEach(processPoint);
    } else {
        processPoint(data);
    }

    const nx = Math.round((lonEnd - lonStart) / resolution) + 1;
    const ny = Math.round((latEnd - latStart) / resolution) + 1;

    // تاريخ اليوم بصيغة ISO التي تفهمها المكتبة
    const today = new Date().toISOString(); 

    const finalJson = [
      {
        "header": {
          "parameterUnit": "m/s",
          "parameterCategory": 2,
          "parameterNumber": 2,
          "parameterNumberName": "Eastward current",
          "la1": latEnd,
          "lo1": lonStart,
          "nx": nx,
          "ny": ny,
          "dx": resolution,
          "dy": resolution,
          "refTime": today // <--- هام جداً: تمت إضافته
        },
        "data": uData
      },
      {
        "header": {
          "parameterUnit": "m/s",
          "parameterCategory": 2,
          "parameterNumber": 3,
          "parameterNumberName": "Northward current",
          "la1": latEnd,
          "lo1": lonStart,
          "nx": nx,
          "ny": ny,
          "dx": resolution,
          "dy": resolution,
          "refTime": today // <--- هام جداً
        },
        "data": vData
      }
    ];

    fs.writeFileSync('weather_output.json', JSON.stringify(finalJson));
    console.log("🚀 تم الحفظ بنجاح.");

  } catch (error) {
    console.error("❌ خطأ:", error.message);
    process.exit(1);
  }
}

generateMoroccoWindData();
