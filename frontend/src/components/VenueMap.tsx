// src/components/VenueMap.tsx
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet marker icons won’t show in some bundlers unless you set them.
// Minimal fix that works in Vite/Next (client-side):
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type Props = {
  name: string;
  lat: number;
  lng: number;
  height?: number; // px
  zoom?: number;
};

function EnsureInView({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    const target: L.LatLngExpression = [lat, lng];
    const bounds = map.getBounds();

    // If the new point is outside the current viewport, re-center (and keep zoom consistent).
    if (!bounds.contains(L.latLng(lat, lng))) {
      map.setView(target, zoom, { animate: false });
    }

    // If container/layout changed (common in React UIs), force Leaflet to recalc size.
    map.invalidateSize();
  }, [map, lat, lng, zoom]);

  return null;
}

export function VenueMap({ name, lat, lng, height = 700, zoom = 10 }: Props) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        height, // fixed height
        width: 700, // responsive width; change to px if you want fixed width too
      }}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }} // fill wrapper
      >
        <EnsureInView lat={lat} lng={lng} zoom={zoom} />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <CircleMarker
          center={[lat, lng]}
          radius={6}
          pathOptions={{
            color: "#111827",
            fillColor: "#111827",
            fillOpacity: 0.9,
            weight: 1,
          }}
        >
          <Popup>{name}</Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}

