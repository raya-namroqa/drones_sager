import { useEffect, useRef } from "react";
import Map from "./components/Map.jsx";
import DroneList from "./components/DroneList.jsx";
import Counter from "./components/Counter.jsx";
import socket from "./utils/socket.js";
import useDronesStore from "./store/useDronesStore.js";

export default function App() {
  const upsertFC = useDronesStore((s) => s.upsertFromFeatureCollection);

  useEffect(() => {
    const onMsg = (payload) => {
      upsertFC(payload);
    };
    socket.on("message", onMsg);
    return () => {
      socket.off("message", onMsg);
    };
  }, [upsertFC]);

  const mapRef = useRef(null);

  return (
    <div className="h-full w-full grid grid-cols-1 md:grid-cols-[320px_1fr] bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="border-b md:border-b-0 md:border-r border-zinc-800 p-3 flex flex-col gap-3">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Sager Drone</h1>
          <span className="text-xs text-zinc-400">Live</span>
        </header>

        <Dashboard />

        <div className="flex-1 min-h-0">
          <DroneList mapRef={mapRef} />
        </div>
      </aside>

      {/* Map area */}
      <section className="relative min-h-[60vh] md:min-h-0">
        <Map mapRef={mapRef} />
        <Counter />
      </section>
    </div>
  );
}

function Dashboard() {
  const counts = useDronesStore((s) => s.counts);
  return (
    <div className="grid grid-cols-3 gap-2">
      <Card label="Total" value={counts.total} />
      <Card label="Allowed" value={counts.green} />
      <Card label="Blocked" value={counts.red} />
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3 text-center">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
