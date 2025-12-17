const axios = require('axios');
const fs = require('fs');

async function generateMoroccoWindData() {
  console.log("🏭 المصنع يعمل: جاري تصنيع شبكة الرياح للمغرب (وضع الآمان)...");

  // تقليل الدقة قليلاً لتفادي رفض السيرفر (Resolution 2.0)
  const latStart = 20.0; 
  const latEnd = 36.0;   
  const lonStart = -18.0; 
  const lonEnd = -1.0;    
  const resolution = 2.0; // كل نقطتين درجة واحدة (أخف على السيرفر)

  let lats = [];
  let lons = [];
  
  // توليد نقاط الشبكة
  for (let lat = latEnd; lat >= latStart; lat -= resolution) {
    for (let lon = lonStart; lon <= lonEnd; lon += resolution) {
      lats.push(lat);
      lons.push(lon);
    }
  }

  console.log(`📊 تم تقليص الشبكة إلى ${lats.length} نقطة لضمان القبول.`);

  try {
    const url = "https://api.open-meteo.com/v1/forecast";
    const params = {
      latitude: lats.join(','),
      longitude: lons.join(','),
      hourly: "u_component_10m,v_component_10m", // نطلب البيانات الساعية
      forecast_days: 1,
      windspeed_unit: "kmh"
      // قمنا بحذف 'models' لنترك للنظام حرية اختيار الأفضل وتجنب الخطأ
    };

    console.log("📡 الاتصال بالأقمار الصناعية...");
    const response = await axios.get(url, { params });
    const data = response.data;

    let uData = [];
    let vData = [];

    // معالجة البيانات
    if (Array.isArray(data)) {
        data.forEach(point => {
            // نأخذ الساعة الحالية (index 0)
            uData.push(point.hourly.u_component_10m[0]);
            vData.push(point.hourly.v_component_10m[0]);
        });
    } else {
        uData.push(data.hourly.u_component_10m[0]);
        vData.push(data.hourly.v_component_10m[0]);
    }

    // بناء ملف JSON النهائي المتوافق مع الخريطة
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

    console.log("✅ البيانات جاهزة ومعالجة.");
    fs.writeFileSync('weather_output.json', JSON.stringify(finalJson));
    console.log("🚀 تم حفظ الملف بنجاح: weather_output.json");

  } catch (error) {
    console.error("❌ خطأ:", error.message);
    if(error.response) {
        console.error("تفاصيل الخطأ:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

generateMoroccoWindData();
