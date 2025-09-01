import useDronesStore from "../store/useDronesStore.js";

export default function Counter() {
  const red = useDronesStore((s) => s.counts.red);
  return (
    <div className="absolute bottom-4 right-4">
      <div className="rounded-2xl bg-zinc-900/80 backdrop-blur border border-zinc-800 px-4 py-2 text-sm">
        <span className="font-semibold">Red drones:</span> {red}
      </div>
    </div>
  );
}
