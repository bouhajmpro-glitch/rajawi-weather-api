const axios = require('axios');
const fs = require('fs');

async function generateMoroccoWindData() {
  console.log("🏭 المصنع يعمل: جاري تصنيع شبكة الرياح (وضع الحساب الرياضي)...");

  // إعدادات الشبكة (دقة متوسطة لضمان السرعة)
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
    
    // التغيير الذكي: نطلب السرعة والاتجاه بدلاً من المركبات التي تسبب الخطأ
    const params = {
      latitude: lats.join(','),
      longitude: lons.join(','),
      hourly: "windspeed_10m,winddirection_10m", // هذه المتغيرات لا تفشل أبداً
      forecast_days: 1,
      windspeed_unit: "kmh"
    };

    console.log("📡 الاتصال بالأقمار الصناعية (طلب البيانات الأساسية)...");
    const response = await axios.get(url, { params });
    const data = response.data;

    let uData = [];
    let vData = [];

    // الدالة الرياضية لتحويل السرعة والاتجاه إلى U و V
    // U = -speed * sin(direction)
    // V = -speed * cos(direction)
    const calculateUV = (speed, dir) => {
        const rad = dir * (Math.PI / 180);
        const u = -speed * Math.sin(rad);
        const v = -speed * Math.cos(rad);
        return { u, v };
    };

    // معالجة البيانات
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

    // بناء ملف JSON النهائي
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

    console.log("✅ تمت العمليات الحسابية بنجاح.");
    fs.writeFileSync('weather_output.json', JSON.stringify(finalJson));
    console.log("🚀 تم حفظ الملف: weather_output.json");

  } catch (error) {
    console.error("❌ خطأ:", error.message);
    if(error.response) {
        // طباعة جزء صغير من الخطأ لتجنب ملء الشاشة
        console.error("تفاصيل:", JSON.stringify(error.response.data).substring(0, 200));
    }
    process.exit(1);
  }
}

generateMoroccoWindData();
