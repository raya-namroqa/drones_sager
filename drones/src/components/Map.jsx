import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import useDronesStore, { regStartsWithB } from "../store/useDronesStore.js";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const ICONS = [
  "bell.svg",
  "capture-svgrepo-com.svg",
  "dashboard-svgrepo-com-2.svg",
  "drone.svg",
  "language-svgrepo-com.svg",
  "location-svgrepo-com-2.svg",
];

export default function Map({ mapRef }) {
  const dronesGetter = useDronesStore((s) => s.getDronesArray);
  const selectedId = useDronesStore((s) => s.selectedId);

  const popupRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/dark-v11",
      center: [35.9313, 31.9488],
      zoom: 10,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");

    map.on("load", () => {

      // إضافة كل الصور تلقائيًا من الباكند
      ICONS.forEach((iconName) => {
        const img = new Image();
        img.onload = () => {
          const size = 64;
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = size;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, size, size);
          map.addImage(iconName.split(".")[0], canvas, { pixelRatio: 2 });
        };
        // المسار من الباكند
        img.src = `http://localhost:9013/icons/${iconName}`;
      });

      map.addSource("drones", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "drones-symbol",
        type: "symbol",
        source: "drones",
        layout: {
          "icon-image": "drone",
          "icon-size": 0.5,
          "icon-rotate": ["get", "yaw"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
        },
        paint: {
          "icon-opacity": ["case", ["==", ["get", "id"], selectedId || ""], 1.0, 0.85],
        },
      });

      map.addSource("trails", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "trails-line",
        type: "line",
        source: "trails",
        paint: {
          "line-color": ["case", ["boolean", ["get", "isGreen"], false], "#22c55e", "#ef4444"],
          "line-width": ["case", ["==", ["get", "id"], selectedId || ""], 3, 2],
          "line-opacity": 0.7,
        },
      });

      popupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

      map.on("mousemove", "drones-symbol", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        const { id, altitude, firstSeen } = f.properties;
        const ms = Date.now() - Number(firstSeen);
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        const html = `<div style="font-size:12px">
          <div><b>${id}</b></div>
          <div>Altitude: ${altitude} m</div>
          <div>Flight: ${mins}m ${secs}s</div>
        </div>`;
        popupRef.current.setLngLat(e.lngLat).setHTML(html).addTo(map);
      });
      map.on("mouseleave", "drones-symbol", () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });

      map.on("click", "drones-symbol", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const id = f.properties.id;
        map.easeTo({ center: f.geometry.coordinates, zoom: Math.max(map.getZoom(), 12) });
        useDronesStore.getState().setSelected(id);
        const el = document.querySelector(`[data-drone-item="${id}"]`);
        el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });

      mapRef.current = map;

      const tick = () => {
        const drones = dronesGetter();
        const droneFeatures = drones.map((d) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: d.coord },
          properties: {
            id: d.id,
            altitude: d.altitude,
            yaw: d.yaw,
            firstSeen: d.firstSeen,
            isGreen: regStartsWithB(d.registration),
          },
        }));
        const trailFeatures = drones.map((d) => ({
          type: "Feature",
          geometry: { type: "LineString", coordinates: d.path },
          properties: { id: d.id, isGreen: regStartsWithB(d.registration) },
        }));

        map.getSource("drones")?.setData(fc(droneFeatures));
        map.getSource("trails")?.setData(fc(trailFeatures));

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div id="map" style={{ width: "100%", height: "100%" }} />;
}

function emptyFC() {
  return { type: "FeatureCollection", features: [] };
}
function fc(features) {
  return { type: "FeatureCollection", features };
}
