const axios = require('axios');
const fs = require('fs');

async function generateMoroccoWindData() {
  console.log("🏭 المصنع يعمل: جاري تصنيع شبكة الرياح (إصلاح الهيكلة)...");

  // إعدادات الشبكة
  const latStart = 20.0; 
  const latEnd = 36.0;   
  const lonStart = -18.0; 
  const lonEnd = -1.0;    
  const resolution = 2.0; 

  let lats = [];
  let lons = [];
  
  // توليد نقاط الشبكة (من الشمال للجنوب، ومن الغرب للشرق)
  for (let lat = latEnd; lat >= latStart; lat -= resolution) {
    for (let lon = lonStart; lon <= lonEnd; lon += resolution) {
      lats.push(lat);
      lons.push(lon);
    }
  }

  console.log(`📊 عدد نقاط الرصد: ${lats.length}`);

  try {
    const url = "https://api.open-meteo.com/v1/forecast";
    
    // نطلب السرعة والاتجاه (الحل الرياضي الآمن)
    const params = {
      latitude: lats.join(','),
      longitude: lons.join(','),
      hourly: "windspeed_10m,winddirection_10m",
      forecast_days: 1,
      windspeed_unit: "kmh" // تأكد أن الوحدة متوافقة
    };

    console.log("📡 الاتصال بالأقمار الصناعية...");
    const response = await axios.get(url, { params });
    const data = response.data;

    let uData = [];
    let vData = [];

    // معادلة التحويل
    const calculateUV = (speed, dir) => {
        // تحويل الاتجاه من درجات إلى راديان
        const rad = dir * (Math.PI / 180);
        // المعادلات القياسية للأرصاد الجوية
        const u = -speed * Math.sin(rad);
        const v = -speed * Math.cos(rad);
        return { u, v };
    };

    const processPoint = (point) => {
        // نأخذ الساعة الحالية (index 0)
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

    // === التصحيح الجوهري هنا ===
    // إضافة parameterCategory: 2 لكي تتعرف المكتبة على البيانات
    const finalJson = [
      {
        "header": {
          "parameterUnit": "m/s",
          "parameterCategory": 2, // <--- هام جداً: تصنيف "زخم"
          "parameterNumber": 2,   // رقم 2 يعني U-component
          "parameterNumberName": "Eastward current",
          "la1": latEnd,   // خط العرض الشمالي (البداية)
          "lo1": lonStart, // خط الطول الغربي (البداية)
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
          "parameterCategory": 2, // <--- هام جداً
          "parameterNumber": 3,   // رقم 3 يعني V-component
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

    console.log("✅ البيانات جاهزة بالهيكلة الصحيحة.");
    fs.writeFileSync('weather_output.json', JSON.stringify(finalJson));
    console.log("🚀 تم حفظ الملف: weather_output.json");

  } catch (error) {
    console.error("❌ خطأ:", error.message);
    process.exit(1);
  }
}

generateMoroccoWindData();
