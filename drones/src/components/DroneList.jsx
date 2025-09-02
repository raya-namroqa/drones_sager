import { useMemo } from "react";
import useDronesStore from "../store/useDronesStore.js";

export default function DroneList({ mapRef }) {
  const dronesMap = useDronesStore((state) => state.drones);
  const selectedId = useDronesStore((state) => state.selectedId);
  const setSelected = useDronesStore((state) => state.setSelected);

  const drones = useMemo(() => {
    return Array.from(dronesMap.values()).sort((a, b) => b.lastSeen - a.lastSeen);
  }, [dronesMap]);

  console.log("Drones data from store:", drones); // تفحص القيم من الباك

  return (
    <div className="h-full overflow-auto space-y-2 pr-1">
      {drones.length > 0 ? (
        drones.map((d) => {
          const reg = (d.registration || "").trim().toUpperCase(); // تنظيف وتحويل للحروف الكبيرة
          let isGreen = false;

          // التحقق إذا يبدأ بـ SD- والحرف الرابع هو B
          if (reg.startsWith("SD-") && reg.length >= 5) {
            const letter = reg[3]; // الحرف بعد SD-
            if (letter === "B") isGreen = true;
          }

          console.log(d.id, d.registration, reg, isGreen); // للتأكد من اللون

          return (
            <button
              key={d.id}
              data-drone-item={d.id}
              onClick={() => {
                setSelected(d.id);
                const map = mapRef.current;
                if (map) {
                  map.easeTo({ center: d.coord, zoom: Math.max(map.getZoom(), 12) });
                }
              }}
              className={`w-full text-left p-3 rounded-xl border transition ${
                d.id === selectedId
                  ? "border-zinc-600 bg-zinc-900"
                  : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <img src="/icons/drone.svg" alt="drone" className="w-5 h-5" />
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    isGreen ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="font-medium truncate">{d.id}</span>
              </div>
              <div className="mt-1 text-xs text-zinc-400 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>Reg: {d.registration || "—"}</span>
                <span>Alt: {d.altitude ?? "—"} m</span>
                <span>Yaw: {d.yaw ?? "—"}°</span>
              </div>
            </button>
          );
        })
      ) : (
        <div className="text-sm text-zinc-400 p-3">Waiting for drones…</div>
      )}
    </div>
  );
}
