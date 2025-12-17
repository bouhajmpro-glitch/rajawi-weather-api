const axios = require('axios');
const fs = require('fs');

async function generateMoroccoWindData() {
  console.log("🏭 المصنع يعمل: جاري تصنيع شبكة الرياح للمغرب...");

  // إعدادات الشبكة (تغطي المغرب)
  const latStart = 20.0; 
  const latEnd = 37.0;   
  const lonStart = -20.0; 
  const lonEnd = -1.0;    
  const resolution = 1.0; 

  let lats = [];
  let lons = [];
  
  // توليد النقاط
  for (let lat = latEnd; lat >= latStart; lat -= resolution) {
    for (let lon = lonStart; lon <= lonEnd; lon += resolution) {
      lats.push(lat);
      lons.push(lon);
    }
  }

  console.log(`📊 تم تحديد ${lats.length} نقطة رصد.`);

  try {
    // === التغيير الجوهري هنا ===
    // نطلب hourly بدلاً من current لتجنب خطأ 400
    const url = "https://api.open-meteo.com/v1/forecast";
    const params = {
      latitude: lats.join(','),
      longitude: lons.join(','),
      hourly: "u_component_10m,v_component_10m", // طلبنا الساعات
      forecast_days: 1, // نحتاج يوماً واحداً فقط
      windspeed_unit: "kmh",
      models: "gfs_seamless"
    };

    console.log("📡 الاتصال بالأقمار الصناعية...");
    const response = await axios.get(url, { params });
    const data = response.data;

    let uData = [];
    let vData = [];

    // معالجة البيانات (نأخذ الاندكس 0 وهو الساعة الحالية)
    if (Array.isArray(data)) {
        data.forEach(point => {
            // نأخذ القيمة الأولى [0] من مصفوفة الساعات
            uData.push(point.hourly.u_component_10m[0]);
            vData.push(point.hourly.v_component_10m[0]);
        });
    } else {
        uData.push(data.hourly.u_component_10m[0]);
        vData.push(data.hourly.v_component_10m[0]);
    }

    // بناء الملف النهائي
    const nx = Math.round((lonEnd - lonStart) / resolution) + 1;
    const ny = Math.round((latEnd - latStart) / resolution) + 1;

    const finalJson = [
      {
        "header": {
          "parameterUnit": "m/s",
          "parameterNumber": 2,
          "parameterNumberName": "Eastward current",
          "la1": latEnd,
          "lo1": lonStart,
          "nx": nx,
          "ny": ny,
          "dx": resolution,
          "dy": resolution
        },
        "data": uData
      },
      {
        "header": {
          "parameterUnit": "m/s",
          "parameterNumber": 3,
          "parameterNumberName": "Northward current",
          "la1": latEnd,
          "lo1": lonStart,
          "nx": nx,
          "ny": ny,
          "dx": resolution,
          "dy": resolution
        },
        "data": vData
      }
    ];

    console.log("✅ البيانات جاهزة.");
    fs.writeFileSync('weather_output.json', JSON.stringify(finalJson));
    console.log("🚀 تم الحفظ: weather_output.json");

  } catch (error) {
    console.error("❌ خطأ:", error.message);
    if(error.response) {
        console.error("تفاصيل الخطأ:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

generateMoroccoWindData();
