import { create } from "zustand";

function now() {
  return Date.now();
}

export function regStartsWithB(reg = "") {
  const part = (reg.includes("-") ? reg.split("-")[1] : reg) || "";
  return part.startsWith("B");
}

const MAX_PATH_POINTS = 200;
const STALE_MS = 15000;

const useDronesStore = create((set, get) => ({
  drones: new Map(),       // Map داخل store
  selectedId: null,

  upsertFromFeatureCollection: (fc) => {
    const t = now();
    const m = new Map(get().drones);

    if (!fc || !Array.isArray(fc.features)) return;

    for (const f of fc.features) {
      const id = f?.properties?.serial || f?.id || Math.random().toString(36).slice(2);
      const registration = f?.properties?.registration || "";
      const name = f?.properties?.Name || "Unknown";
      const altitude = f?.properties?.altitude ?? null;
      const yaw = f?.properties?.yaw ?? 0;
      const coord = f?.geometry?.coordinates || [0, 0];

      const prev = m.get(id);
      const firstSeen = prev?.firstSeen ?? t;
      const path = prev?.path ? [...prev.path, coord] : [coord];
      if (path.length > MAX_PATH_POINTS) path.splice(0, path.length - MAX_PATH_POINTS);

      m.set(id, {
        id,
        registration,
        name,
        altitude,
        yaw,
        coord,
        firstSeen,
        lastSeen: t,
        path,
      });
    }

    for (const [id, d] of m) {
      if (t - d.lastSeen > STALE_MS) m.delete(id);
    }

    set({ drones: m });
  },

  setSelected: (id) => set({ selectedId: id }),

  // دالة آمنة لا تستخدم داخل selector مباشرة
  getDronesArray: () =>
    Array.from(get().drones.values()).sort((a, b) => b.lastSeen - a.lastSeen),

  counts: (() => {
    const compute = () => {
      const arr = Array.from(get().drones.values());
      const total = arr.length;
      const green = arr.filter((d) => regStartsWithB(d.registration)).length;
      const red = total - green;
      return { total, green, red };
    };
    return new Proxy(
      {},
      {
        get(_, prop) {
          return compute()[prop];
        },
      }
    );
  })(),
}));

export default useDronesStore;
