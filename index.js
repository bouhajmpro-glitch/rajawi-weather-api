const axios = require('axios');
const fs = require('fs');

async function generateMegaWeatherStation() {
  console.log("🏭 المصنع العملاق يعمل: جاري استخراج كافة بيانات الغلاف الجوي...");

  // إعدادات الشبكة (دقة 2.0 لتوازن الأداء)
  const latStart = 21.0; 
  const latEnd = 36.0;   
  const lonStart = -17.0; 
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
  console.log(`📊 عدد محطات الرصد: ${lats.length}`);

  try {
    const url = "https://api.open-meteo.com/v1/forecast";
    
    // نطلب المتغيرات التي نريد تخزينها في الملف
    // الرياح (للرسم) + بيانات أخرى إذا أردنا تلوين الخريطة مستقبلاً
    const params = {
      latitude: lats.join(','),
      longitude: lons.join(','),
      hourly: "windspeed_10m,winddirection_10m", // نركز على الرياح حالياً للرسم
      forecast_days: 1,
      windspeed_unit: "kmh"
    };

    console.log("📡 جاري سحب البيانات...");
    const response = await axios.get(url, { params });
    const data = response.data;

    // مصفوفات الرياح
    let uData = [];
    let vData = [];
    
    // دالة تحويل الرياح
    const calculateUV = (speed, dir) => {
        const rad = dir * (Math.PI / 180);
        return { u: -speed * Math.sin(rad), v: -speed * Math.cos(rad) };
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
    const today = new Date().toISOString();

    // الهيكلة الجديدة (المشتل الكبير)
    const finalPackage = {
        // قسم الرياح (متوافق مع مكتبة الرسم)
        windVectors: [
            {
                header: {
                    parameterCategory: 2, parameterNumber: 2,
                    la1: latEnd, lo1: lonStart, nx: nx, ny: ny, dx: resolution, dy: resolution, refTime: today
                },
                data: uData
            },
            {
                header: {
                    parameterCategory: 2, parameterNumber: 3,
                    la1: latEnd, lo1: lonStart, nx: nx, ny: ny, dx: resolution, dy: resolution, refTime: today
                },
                data: vData
            }
        ],
        // قسم المعلومات الإضافية (يمكن توسيعه لاحقاً)
        meta: {
            generatedAt: today,
            source: "Rajawi Weather Factory"
        }
    };

    console.log("✅ البيانات جاهزة.");
    fs.writeFileSync('weather_output.json', JSON.stringify(finalPackage));
    console.log("🚀 تم الحفظ: weather_output.json");

  } catch (error) {
    console.error("❌ خطأ:", error.message);
    if(error.response) console.error("تفاصيل:", JSON.stringify(error.response.data).substring(0, 100));
    process.exit(1);
  }
}

generateMegaWeatherStation();
