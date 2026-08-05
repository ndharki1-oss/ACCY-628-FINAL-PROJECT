"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type PropertyMapMarker = {
  id: string;
  name: string;
  address: string;
  ownerName: string;
  latitude: number;
  longitude: number;
  occupancyRate: number | null;
  openWorkOrders: number | null;
};

const markerIcon = L.divIcon({
  className: "harborline-map-marker",
  html: `<span class="harborline-map-marker-dot"></span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
});

function FitAllMarkers({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 12 });
  }, [map, points]);

  return null;
}

export default function PropertyLocationsMapInner({
  markers,
}: {
  markers: PropertyMapMarker[];
}) {
  const points = markers.map((m) => [m.latitude, m.longitude] as [number, number]);
  const fallbackCenter: [number, number] = points[0] ?? [41.8781, -87.6298];

  return (
    <MapContainer
      center={fallbackCenter}
      zoom={11}
      scrollWheelZoom
      className="h-[360px] w-full sm:h-[440px]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitAllMarkers points={points} />
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.latitude, marker.longitude]}
          icon={markerIcon}
        >
          <Popup>
            <div className="min-w-[200px] max-w-[260px] text-[#0c1f2e]">
              <p className="font-[family-name:var(--font-display)] text-base leading-snug">
                {marker.name}
              </p>
              <p className="mt-1 text-xs leading-snug text-slate-600">{marker.address}</p>
              <p className="mt-2 text-sm">
                <span className="text-slate-500">Owner: </span>
                {marker.ownerName}
              </p>
              {marker.occupancyRate != null ? (
                <p className="text-sm">
                  <span className="text-slate-500">Occupancy: </span>
                  {Math.round(marker.occupancyRate * 100)}%
                </p>
              ) : null}
              {marker.openWorkOrders != null ? (
                <p className="text-sm">
                  <span className="text-slate-500">Open work orders: </span>
                  {marker.openWorkOrders}
                </p>
              ) : null}
              <a
                href={`/admin/properties/${marker.id}`}
                className="mt-2 inline-flex rounded border border-[#0c1f2e]/20 px-2.5 py-1 text-xs font-medium text-[#0c1f2e] hover:bg-[#0c1f2e] hover:text-[#f3efe6]"
              >
                View Property
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
