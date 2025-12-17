const axios = require('axios');
const fs = require('fs');

// دالة المصنع الرئيسية
async function generateMoroccoWeatherData() {
  console.log("🏭 المصنع يعمل: بدء معالجة بيانات الطقس للمغرب...");

  // 1. إعدادات الشبكة (المغرب)
  // دقة 2.0 تعني نقاط متباعدة قليلاً لتخفيف الحجم وضمان قبول السيرفر
  const latStart = 20.0; 
  const latEnd = 36.0;   
  const lonStart = -18.0; 
  const lonEnd = -1.0;    
  const resolution = 2.0; 

  let lats = [];
  let lons = [];
  
  // توليد نقاط الشبكة
  for (let lat = latEnd; lat >= latStart; lat -= resolution) {
    for (let lon = lonStart; lon <= lonEnd; lon += resolution) {
      lats.push(lat);
      lons.push(lon);
    }
  }
  console.log(`📊 عدد نقاط الرصد: ${lats.length}`);

  try {
    const url = "https://api.open-meteo.com/v1/forecast";
    
    // نطلب سرعة واتجاه الرياح (لأنها لا تسبب أخطاء 400 مثل u/v المباشرة)
    // ونطلب أيضاً الحرارة والضغط لاستخدامهم مستقبلاً
    const params = {
      latitude: lats.join(','),
      longitude: lons.join(','),
      hourly: "windspeed_10m,winddirection_10m,temperature_2m,surface_pressure",
      forecast_days: 1,
      windspeed_unit: "kmh"
    };

    console.log("📡 الاتصال بالأقمار الصناعية (Open-Meteo)...");
    const response = await axios.get(url, { params });
    const data = response.data;

    // مصفوفات لتخزين النتائج
    let uData = [];
    let vData = [];

    // معادلة تحويل (السرعة/الاتجاه) إلى (U/V) لكي تفهمها الخريطة
    const calculateUV = (speed, dir) => {
        const rad = dir * (Math.PI / 180);
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

    // معالجة البيانات سواء كانت مصفوفة أو كائن واحد
    if (Array.isArray(data)) {
        data.forEach(processPoint);
    } else {
        processPoint(data);
    }

    // إعداد أبعاد الشبكة للملف النهائي
    const nx = Math.round((lonEnd - lonStart) / resolution) + 1;
    const ny = Math.round((latEnd - latStart) / resolution) + 1;
    const today = new Date().toISOString(); // تاريخ اليوم ضروري

    // هيكلة ملف JSON حسب معايير GRIB2 التي تطلبها leaflet-velocity
    const finalJson = [
      {
        "header": {
          "parameterCategory": 2, // 2 = Momentum (رياح)
          "parameterNumber": 2,   // 2 = U-component
          "parameterUnit": "m/s",
          "parameterNumberName": "Eastward current",
          "la1": latEnd,
          "lo1": lonStart,
          "nx": nx,
          "ny": ny,
          "dx": resolution,
          "dy": resolution,
          "refTime": today
        },
        "data": uData
      },
      {
        "header": {
          "parameterCategory": 2, // 2 = Momentum (رياح)
          "parameterNumber": 3,   // 3 = V-component
          "parameterUnit": "m/s",
          "parameterNumberName": "Northward current",
          "la1": latEnd,
          "lo1": lonStart,
          "nx": nx,
          "ny": ny,
          "dx": resolution,
          "dy": resolution,
          "refTime": today
        },
        "data": vData
      }
    ];

    console.log("✅ تمت المعالجة بنجاح.");
    fs.writeFileSync('weather_output.json', JSON.stringify(finalJson));
    console.log("🚀 تم حفظ الملف: weather_output.json");

  } catch (error) {
    console.error("❌ خطأ أثناء المعالجة:", error.message);
    if (error.response) {
        console.error("تفاصيل السيرفر:", JSON.stringify(error.response.data).substring(0, 200));
    }
    process.exit(1);
  }
}

// تشغيل الدالة
generateMoroccoWeatherData();
