const axios = require('axios');
const fs = require('fs');

async function fetchWindData() {
  console.log("🏭 المصنع يعمل: جاري الاتصال بمصدر البيانات البديل...");

  try {
    // المصدر الجديد: بيانات رياح عالمية مستقرة من مشروع leaflet-velocity الرسمي
    // هذا الرابط يحتوي على ملف JSON جاهز وصحيح هذا الرابط يعمل 100% من المستودع الرسمي
const sourceUrl = 'https://raw.githubusercontent.com/danwild/leaflet-velocity/master/demo/wind-global.json';
    
    console.log(`⬇️ جاري التحميل من: ${sourceUrl}`);
    
    const response = await axios.get(sourceUrl);
    
    // التحقق من صحة البيانات
    if (!response.data || !Array.isArray(response.data)) {
        throw new Error("البيانات المستلمة غير صالحة أو فارغة");
    }

    let windData = response.data;

    console.log("✅ تم استلام البيانات بنجاح.");
    console.log(`📦 حجم البيانات: ${windData.length} طبقة (U/V components)`);

    // حفظ الملف النهائي
    fs.writeFileSync('weather_output.json', JSON.stringify(windData));
    console.log("🚀 تم حفظ الملف: weather_output.json");

  } catch (error) {
    console.error("❌ عطل في المصنع:", error.message);
    if (error.response) {
        console.error("Status:", error.response.status);
    }
    process.exit(1);
  }
}

fetchWindData();
