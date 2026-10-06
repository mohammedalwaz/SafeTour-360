import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { NearbyGeofence } from "../features/safety/types";

interface TouristMapProps {
  latitude: number;
  longitude: number;
  zones: NearbyGeofence[];
}

function Recenter({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([latitude, longitude]);
  }, [latitude, longitude, map]);
  return null;
}

export default function TouristMap({
  latitude,
  longitude,
  zones,
}: TouristMapProps) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      scrollWheelZoom
      className="leaflet-map"
    >
      <Recenter latitude={latitude} longitude={longitude} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {zones.map((zone) => (
        <Circle
          key={zone.id}
          center={[zone.latitude, zone.longitude]}
          radius={zone.radiusMeters}
          pathOptions={{
            color: zone.type === "danger" ? "#c81e4a" : "#1f7a4d",
            fillColor: zone.type === "danger" ? "#f4b6c2" : "#b7e4c7",
            fillOpacity: zone.isInside ? 0.35 : 0.18,
          }}
        />
      ))}
      <CircleMarker
        center={[latitude, longitude]}
        radius={9}
        pathOptions={{ color: "#111", fillColor: "#f4b6c2", fillOpacity: 1 }}
      />
    </MapContainer>
  );
}
