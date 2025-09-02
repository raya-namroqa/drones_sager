import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import useDronesStore from "../store/useDronesStore.js";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

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
      // أيقونة الدرون
      const img = new Image();
      img.onload = () => map.addImage("drone", img, { pixelRatio: 2 });
      img.src = "/icons/drone.svg";

      // مصدر الدرونز
      map.addSource("drones", { type: "geojson", data: emptyFC() });

      // دائرة خلف كل درون مع تلوين حسب ID
      map.addLayer({
        id: "drones-circle",
        type: "circle",
        source: "drones",
        paint: {
          "circle-radius": 20,
          "circle-opacity": 0.3,
          "circle-color": [
            "case",
            ["==", ["slice", ["get", "id"], 3, 4], "B"], // أول حرف بعد SD-
            "#10b981", // أخضر
            "#ef4444"  // أحمر
          ]
        },
      });

      // أيقونة الدرون فوق الدائرة
      map.addLayer({
        id: "drones-symbol",
        type: "symbol",
        source: "drones",
        layout: {
          "icon-image": "drone",
          "icon-size": 1.5,
          "icon-rotate": ["get", "yaw"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
        },
        paint: {
          "icon-opacity": ["case", ["==", ["get", "id"], selectedId || ""], 1.0, 0.85],
        },
      }, "drones-circle"); // symbol فوق الدائرة

      // مصدر المسارات
      map.addSource("trails", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "trails-line",
        type: "line",
        source: "trails",
        paint: {
          "line-color": "#ef4444",
          "line-width": 2,
          "line-opacity": 0.7,
        },
      });

      popupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

      // popup عند hover
      map.on("mousemove", "drones-symbol", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        const { id, altitude, firstSeen } = f.properties;
        const ms = Date.now() - Number(firstSeen);
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        const html = `<div style="font-size:12px; color:#f5f5f5; font-weight:600; background: rgba(0,0,0,0.6); padding:4px; border-radius:4px">
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

      mapRef.current = map;

      // تحديث الدرونز والمسارات كل فريم
      const tick = () => {
        const drones = dronesGetter();

        drones.forEach(d => {
          console.log(d.id, d.path, d.coords, d.positions, d.yaw);
        });

        const droneFeatures = drones.map((d) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: d.coord },
          properties: {
            id: d.id,
            altitude: d.altitude,
            yaw: d.yaw,
            firstSeen: d.firstSeen,
          },
        }));

        const trailFeatures = drones
          .filter((d) => Array.isArray(d.path) && d.path.length >= 2)
          .map((d) => ({
            type: "Feature",
            geometry: { type: "LineString", coordinates: d.path },
            properties: { id: d.id },
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
