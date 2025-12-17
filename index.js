"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { 
  MapContainer, 
  TileLayer, 
  LayersControl, 
  useMap, 
  useMapEvents 
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-velocity/dist/leaflet-velocity.css";
import L from "leaflet";
// @ts-ignore
import "leaflet-velocity"; 
import { Wind, Navigation, Thermometer, Droplets, Gauge } from "lucide-react";

// --- 1. إصلاح أيقونات Leaflet ---
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const { BaseLayer, Overlay } = LayersControl;

// --- 2. طبقة الرياح المتحركة (متصلة بمصنعك) ---
function WindParticlesLayer() {
  const map = useMap();
  const layerRef = useRef<any>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    // رابط المصنع الخاص بك مع Cache Busting لتحديث البيانات فوراً
    const DATA_URL = `https://bouhajmpro-glitch.github.io/rajawi-weather-api/weather_output.json?t=${Date.now()}`;

    const initLayer = async () => {
      try {
        const response = await fetch(DATA_URL);
        if (!response.ok) return;
        const data = await response.json();

        // فحص الأمان: هل الخريطة ما زالت موجودة؟
        if (!mountedRef.current || !map) return;

        // تنظيف الطبقة القديمة
        if (layerRef.current) {
            try {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            } catch (e) { /* تجاهل الأخطاء */ }
        }

        // إعدادات المحرك البصري
        // @ts-ignore
        const velocityLayer = L.velocityLayer({
          displayValues: true,
          displayOptions: {
            velocityType: "Morocco Wind",
            position: "bottomleft",
            emptyString: "No wind data",
            angleConvention: "bearingCW",
            speedUnit: "km/h",
          },
          data: data,
          maxVelocity: 60,
          velocityScale: 0.01,
          colorScale: ["rgba(255, 255, 255, 0.8)"], // لون أبيض نقي
          lineWidth: 2,
          particleAge: 90,
          particleMultiplier: 1/500, // كثافة الجزيئات
        });

        // تأخير بسيط لضمان استقرار الخريطة قبل الرسم
        requestAnimationFrame(() => {
            if (mountedRef.current && map && !layerRef.current) {
                try {
                    velocityLayer.addTo(map);
                    layerRef.current = velocityLayer;
                } catch (err) {
                    console.warn("Map not ready for velocity layer", err);
                }
            }
        });

      } catch (err) {
        console.error("Wind layer error:", err);
      }
    };

    initLayer();

    // دالة التنظيف عند الخروج
    return () => {
      mountedRef.current = false;
      if (layerRef.current) {
        try {
            if (map && map.hasLayer(layerRef.current)) {
                map.removeLayer(layerRef.current);
            }
        } catch (e) {}
        layerRef.current = null;
      }
    };
  }, [map]);

  return null;
}

// --- 3. مراقب مركز الخريطة ---
function MapCenterMonitor({ onCenterChange }: { onCenterChange: (lat: number, lng: number) => void }) {
  const map = useMap();

  useEffect(() => {
     map.setView([31.7917, -7.0926], 6);
  }, [map]);

  useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onCenterChange(center.lat, center.lng);
    },
  });

  return null;
}

// --- 4. المكون الرئيسي ---
export default function WeatherMap() {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState({ lat: 31.7917, lng: -7.0926 });

  const fetchLiveTelemetry = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setCoords({ lat, lng });
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m`);
      const data = await res.json();
      
      if (data.current) {
        setTelemetry({
          temp: data.current.temperature_2m,
          wind: data.current.wind_speed_10m,
          dir: data.current.wind_direction_10m,
          hum: data.current.relative_humidity_2m,
          press: data.current.surface_pressure
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="relative w-full h-full bg-[#0f172a] text-white font-sans overflow-hidden">
      
      <MapContainer
        center={[31.7917, -7.0926]}
        zoom={6}
        className="w-full h-full z-0 bg-[#0f172a]"
        zoomControl={false}
      >
        <MapCenterMonitor onCenterChange={fetchLiveTelemetry} />

        <LayersControl position="topright">
            
            <BaseLayer checked name="Dark Mode (Windy)">
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution="CartoDB"
                />
            </BaseLayer>

            <BaseLayer name="Satellite (Esri)">
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="Esri"
                />
            </BaseLayer>

            <BaseLayer name="OpenStreetMap">
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="OSM"
                />
            </BaseLayer>

            <Overlay checked name="💨 Wind Particles (Live)">
                <WindParticlesLayer />
            </Overlay>

            <Overlay checked name="🏷️ Labels">
               <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
            </Overlay>

        </LayersControl>
      </MapContainer>

      {/* ==================== واجهة المستخدم الجديدة (UI) ==================== */}

      {/* 1. مؤشر التصويب الاحترافي (Minimalist Crosshair) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] pointer-events-none flex items-center justify-center">
         <div className="w-6 h-6 rounded-full border-[1.5px] border-white/40 flex items-center justify-center backdrop-blur-[2px]">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)]"></div>
         </div>
      </div>

      {/* 2. لوحة البيانات الزجاجية الفاخرة (Glassmorphism Dashboard) */}
      <div className="absolute top-6 left-6 z-[500] pointer-events-none select-none">
         <div className="bg-slate-950/70 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl shadow-black/50 min-w-[260px] transition-all duration-500 overflow-hidden relative group">
            
            {/* تأثير لمعان */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

            {/* الإحداثيات */}
            <div className="flex items-center gap-2 text-[11px] text-blue-300/80 font-mono mb-4 border-b border-white/5 pb-3 tracking-wider">
                <Navigation size={14} className="opacity-70" />
                <div className="flex flex-col leading-tight">
                    <span>LAT: {coords.lat.toFixed(4)} N</span>
                    <span>LNG: {coords.lng.toFixed(4)} W</span>
                </div>
            </div>

            {loading ? (
                <div className="py-8 text-center text-sm text-blue-200/70 flex flex-col items-center justify-center gap-3">
                    <div className="relative">
                        <span className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin block"></span>
                        <span className="absolute inset-0 w-8 h-8 border-2 border-blue-400/20 rounded-full animate-ping opacity-50"></span>
                    </div>
                    <span className="tracking-widest text-[10px] uppercase animate-pulse">Scanning Atmosphere...</span>
                </div>
            ) : telemetry ? (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* الحرارة الرئيسية */}
                    <div className="flex items-start justify-between relative">
                        <div>
                            <span className="text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] leading-none">
                                {Math.round(telemetry.temp)}
                                <span className="text-3xl align-top text-orange-400/80 font-thin">°</span>
                            </span>
                            <div className="text-[10px] text-orange-200/60 font-bold uppercase tracking-[0.2em] mt-2 ml-1">Temperature</div>
                        </div>
                        <Thermometer size={40} className="text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]" strokeWidth={1.5} />
                    </div>

                    {/* شبكة التفاصيل */}
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                        
                        {/* الرياح */}
                        <div className="col-span-2 bg-blue-500/10 border border-blue-400/10 p-3 rounded-2xl flex items-center justify-between relative overflow-hidden">
                             <div className="absolute -right-4 -bottom-4 text-blue-500/5">
                                <Wind size={80} strokeWidth={0.5} />
                            </div>
                            <div className="flex flex-col relative z-10">
                                <div className="flex items-center gap-1.5 text-[10px] text-blue-300/70 font-bold uppercase tracking-wider mb-1">
                                    <Wind size={12} className="text-blue-400" /> Wind Speed
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-white drop-shadow-sm">{telemetry.wind}</span>
                                    <span className="text-xs text-blue-200/60 font-medium">km/h</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end relative z-10 pl-4 border-l border-blue-400/10">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.2)]" style={{transform: `rotate(${telemetry.dir}deg)`, transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'}}>
                                     <Navigation size={18} className="text-blue-300" fill="currentColor" />
                                </div>
                                <span className="text-[10px] text-blue-200/60 mt-1 font-mono">{telemetry.dir}°</span>
                            </div>
                        </div>

                        {/* الرطوبة */}
                        <div className="bg-cyan-500/5 border border-cyan-400/10 p-3 rounded-2xl">
                            <div className="flex items-center gap-1.5 text-[10px] text-cyan-200/70 font-bold uppercase mb-1 tracking-wider">
                                <Droplets size={12} className="text-cyan-400"/> Humidity
                            </div>
                            <span className="text-xl font-black text-white drop-shadow-sm">{telemetry.hum}<span className="text-sm align-top text-cyan-200/60 font-normal">%</span></span>
                        </div>

                        {/* الضغط */}
                        <div className="bg-purple-500/5 border border-purple-400/10 p-3 rounded-2xl">
                            <div className="flex items-center gap-1.5 text-[10px] text-purple-200/70 font-bold uppercase mb-1 tracking-wider">
                                <Gauge size={12} className="text-purple-400"/> Pressure
                            </div>
                            <span className="text-xl font-black text-white drop-shadow-sm">{Math.round(telemetry.press)} <span className="text-[9px] text-purple-200/60 font-normal">hPa</span></span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-xs text-blue-200/50 text-center py-6 uppercase tracking-widest animate-pulse">System Ready</div>
            )}
         </div>
      </div>

      {/* 3. مفتاح الألوان الأنيق (Legend) */}
      <div className="absolute bottom-8 right-8 z-[400] bg-slate-950/70 backdrop-blur-xl px-5 py-4 rounded-2xl border border-white/10 shadow-2xl shadow-black/30 select-none">
          <div className="text-[10px] text-blue-200/70 mb-3 font-bold uppercase tracking-[0.15em] text-center">Wind Intensity</div>
          <div className="flex items-center gap-3">
              <span className="text-[10px] text-white/60 font-mono font-medium">0</span>
              <div className="w-48 h-3 rounded-full bg-gradient-to-r from-white/5 via-white/40 to-white shadow-inner border border-white/10"></div>
              <span className="text-[10px] text-white font-mono font-bold text-right leading-tight">60+ <br/><span className="text-[8px] text-white/60 font-normal">km/h</span></span>
          </div>
      </div>

    </div>
  );
}
