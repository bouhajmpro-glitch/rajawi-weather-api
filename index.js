const axios = require('axios');
const fs = require('fs');

async function generateMoroccoWindData() {
  console.log("🏭 المصنع يعمل: جاري تصنيع شبكة الرياح للمغرب...");

  // 1. إعدادات الشبكة (تغطي المغرب والمحيط)
  const latStart = 20.0; // جنوباً (الكويرة)
  const latEnd = 37.0;   // شمالاً (طنجة/المتوسط)
  const lonStart = -20.0; // غرباً (المحيط)
  const lonEnd = -1.0;    // شرقاً (الحدود)
  const resolution = 1.0; // دقة الشبكة (كل 1 درجة) - يمكن تصغيرها لدقة أعلى لكن ستثقل الطلب

  // توليد نقاط الإحداثيات
  let lats = [];
  let lons = [];
  
  // البناء العكسي (من الشمال للجنوب) كما تتطلب ملفات GRIB عادة
  for (let lat = latEnd; lat >= latStart; lat -= resolution) {
    for (let lon = lonStart; lon <= lonEnd; lon += resolution) {
      lats.push(lat);
      lons.push(lon);
    }
  }

  console.log(`📊 تم تحديد ${lats.length} نقطة رصد جوي.`);

  try {
    // 2. طلب البيانات الحية من Open-Meteo (موديل GFS العالمي)
    // نرسل القوائم دفعة واحدة
    const url = "https://api.open-meteo.com/v1/forecast";
    const params = {
      latitude: lats.join(','),
      longitude: lons.join(','),
      current: "u_component_10m,v_component_10m",
      windspeed_unit: "kmh",
      models: "gfs_seamless" // أو icon_seamless لدقة أعلى
    };

    console.log("📡 الاتصال بالأقمار الصناعية (Open-Meteo)...");
    const response = await axios.get(url, { params });
    const data = response.data;

    // 3. تحويل البيانات إلى صيغة تفهمها leaflet-velocity
    // الصيغة تتطلب مصفوفتين: واحدة لمركبة U (شرق-غرب) وواحدة لمركبة V (شمال-جنوب)
    let uData = [];
    let vData = [];

    // Open-Meteo يعيد مصفوفة من الكائنات إذا طلبنا نقاط متعددة
    if (Array.isArray(data)) {
        data.forEach(point => {
            uData.push(point.current.u_component_10m);
            vData.push(point.current.v_component_10m);
        });
    } else {
        // حالة نادرة (نقطة واحدة)
        uData.push(data.current.u_component_10m);
        vData.push(data.current.v_component_10m);
    }

    // بناء الهيكلة النهائية (Header + Data)
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

    console.log("✅ تم معالجة البيانات بنجاح.");
    
    // 4. الحفظ
    fs.writeFileSync('weather_output.json', JSON.stringify(finalJson));
    console.log("🚀 تم حفظ ملف الرياح المغربي: weather_output.json");

  } catch (error) {
    console.error("❌ خطأ:", error.message);
    if(error.response) console.error(error.response.data);
    process.exit(1);
  }
}

generateMoroccoWindData();
