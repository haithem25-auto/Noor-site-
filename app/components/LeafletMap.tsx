"use client";

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// إصلاح مشكلة اختفاء أيقونات الدبوس الافتراضية في Next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface LeafletMapProps {
  center: [number, number];
  zoom?: number;
}

// مكون داخلي لتحديث مركز الكاميرا بسلاسة دون تدمير الخريطة
function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export default function LeafletMap({ center, zoom = 13 }: LeafletMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: "100%", height: "100%" }}
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <RecenterMap center={center} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={center} icon={defaultIcon} />
    </MapContainer>
  );
}