import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { IncidentRow, IncidentSeverity } from "@/lib/db";

const severityColor: Record<IncidentSeverity, string> = {
  low: "#16a34a",
  medium: "#eab308",
  high: "#f97316",
  critical: "#dc2626",
};

export function IncidentMap({ incidents, onSelect }: { incidents: IncidentRow[]; onSelect?: (i: IncidentRow) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { center: [22.5937, 78.9629], zoom: 5, scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    layerRef.current.clearLayers();
    const points: L.LatLngExpression[] = [];
    incidents.forEach((i) => {
      if (i.location_lat == null || i.location_lng == null) return;
      const color = severityColor[i.severity];
      const marker = L.circleMarker([i.location_lat, i.location_lng], {
        radius: i.severity === "critical" ? 12 : 8,
        color,
        fillColor: color,
        fillOpacity: 0.6,
        weight: 2,
      });
      marker.bindPopup(
        `<div style="min-width:180px"><strong>${escapeHtml(i.title)}</strong><br/>` +
          `<span style="text-transform:capitalize;color:${color}">${i.severity}</span> · ${i.status.replace("_", " ")}</div>`,
      );
      if (onSelect) marker.on("click", () => onSelect(i));
      marker.addTo(layerRef.current!);
      points.push([i.location_lat, i.location_lng]);
    });
    if (points.length) {
      const bounds = L.latLngBounds(points);
      mapRef.current.fitBounds(bounds.pad(0.3), { maxZoom: 10 });
    }
  }, [incidents, onSelect]);

  return <div ref={ref} className="w-full h-[420px] rounded-lg overflow-hidden border" />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
