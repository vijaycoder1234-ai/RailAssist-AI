import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { IncidentRow, IncidentSeverity } from "@/lib/db";
import { Button } from "@/components/ui/button";

const severityColor: Record<IncidentSeverity, string> = {
  low: "#16a34a",
  medium: "#eab308",
  high: "#f97316",
  critical: "#dc2626",
};

// Fallback station coordinates — used when an incident has no GPS but
// its location text matches a known station name.
const STATION_COORDS: Record<string, [number, number]> = {
  "new delhi": [28.6428, 77.2197],
  "mumbai central": [18.9696, 72.8196],
  "chennai central": [13.0827, 80.2707],
  "howrah": [22.5851, 88.3426],
  "bangalore city": [12.9784, 77.5716],
  "lucknow": [26.8467, 80.9462],
  "ahmedabad": [23.0225, 72.5714],
  "patna": [25.5941, 85.1376],
};

function resolveCoords(i: IncidentRow): [number, number] | null {
  if (i.location_lat != null && i.location_lng != null) return [i.location_lat, i.location_lng];
  if (i.location_text) {
    const key = i.location_text.trim().toLowerCase();
    if (STATION_COORDS[key]) return STATION_COORDS[key];
    for (const k of Object.keys(STATION_COORDS)) {
      if (key.includes(k)) return STATION_COORDS[k];
    }
  }
  return null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Filter = "all" | "critical" | "high" | "medium" | "resolved";

export function IncidentMap({
  incidents,
  onSelect,
}: {
  incidents: IncidentRow[];
  onSelect?: (i: IncidentRow) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  // Init
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

  const filtered = useMemo(() => {
    return incidents.filter((i) => {
      if (filter === "all") return true;
      if (filter === "resolved") return i.status === "resolved" || i.status === "closed";
      return i.severity === filter;
    });
  }, [incidents, filter]);

  // Render markers (clustered by station / coord)
  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    layerRef.current.clearLayers();

    // group by rounded coordinate key
    const groups = new Map<string, { lat: number; lng: number; items: IncidentRow[] }>();
    filtered.forEach((i) => {
      const c = resolveCoords(i);
      if (!c) return;
      const key = `${c[0].toFixed(3)},${c[1].toFixed(3)}`;
      const g = groups.get(key);
      if (g) g.items.push(i);
      else groups.set(key, { lat: c[0], lng: c[1], items: [i] });
    });

    const points: L.LatLngExpression[] = [];

    groups.forEach(({ lat, lng, items }) => {
      // pick worst severity for marker color
      const worst = items.reduce<IncidentSeverity>((acc, it) => {
        const order: Record<IncidentSeverity, number> = { low: 0, medium: 1, high: 2, critical: 3 };
        return order[it.severity] > order[acc] ? it.severity : acc;
      }, "low");
      const anyResolved = items.every((it) => it.status === "resolved" || it.status === "closed");
      const color = anyResolved ? severityColor.low : severityColor[worst];

      if (items.length > 1) {
        // cluster marker with count badge
        const icon = L.divIcon({
          className: "",
          html: `<div style="background:${color};color:#fff;border:2px solid #fff;border-radius:9999px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.25)">${items.length}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        const m = L.marker([lat, lng], { icon });
        m.bindPopup(buildClusterPopup(items));
        m.addTo(layerRef.current!);
      } else {
        const i = items[0];
        const marker = L.circleMarker([lat, lng], {
          radius: i.severity === "critical" ? 11 : 8,
          color,
          fillColor: color,
          fillOpacity: 0.7,
          weight: 2,
        });
        marker.bindPopup(buildIncidentPopup(i));
        if (onSelect) marker.on("popupopen", () => {
          const el = document.getElementById(`view-${i.id}`);
          el?.addEventListener("click", () => onSelect(i), { once: true });
        });
        marker.addTo(layerRef.current!);
      }
      points.push([lat, lng]);
    });

    if (points.length) {
      const bounds = L.latLngBounds(points);
      mapRef.current.fitBounds(bounds.pad(0.3), { maxZoom: 10 });
    }
  }, [filtered, onSelect]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", "critical", "high", "medium", "resolved"] as Filter[]).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="capitalize h-7 text-xs"
          >
            {f}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} on map</span>
      </div>
      <div className="relative">
        <div ref={ref} className="w-full h-[360px] sm:h-[440px] rounded-lg overflow-hidden border" />
        {/* Legend */}
        <div className="absolute bottom-2 left-2 z-[400] rounded-md bg-background/90 backdrop-blur border px-3 py-2 text-[11px] space-y-1 shadow-md">
          <div className="font-semibold mb-1">Severity</div>
          {(["critical", "high", "medium", "low"] as IncidentSeverity[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5 capitalize">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: severityColor[s] }} />
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildIncidentPopup(i: IncidentRow) {
  const color = severityColor[i.severity];
  return (
    `<div style="min-width:200px;font-family:inherit">` +
    `<div style="font-weight:600;margin-bottom:4px">${escapeHtml(i.title)}</div>` +
    `<div style="font-size:11px;color:#64748b;margin-bottom:6px">${escapeHtml(i.category.replace("_", " "))} · ${timeAgo(i.created_at)}</div>` +
    `<div style="display:flex;gap:6px;margin-bottom:6px">` +
    `<span style="background:${color}22;color:${color};border:1px solid ${color}55;padding:2px 8px;border-radius:9999px;font-size:11px;text-transform:capitalize">${i.severity}</span>` +
    `<span style="background:#f1f5f9;border:1px solid #e2e8f0;padding:2px 8px;border-radius:9999px;font-size:11px;text-transform:capitalize">${i.status.replace("_", " ")}</span>` +
    `</div>` +
    `<button id="view-${i.id}" style="margin-top:4px;font-size:11px;color:#2563eb;background:none;border:none;padding:0;cursor:pointer">View details →</button>` +
    `</div>`
  );
}

function buildClusterPopup(items: IncidentRow[]) {
  const rows = items
    .slice(0, 6)
    .map((i) => {
      const color = severityColor[i.severity];
      return `<li style="margin:4px 0;font-size:11px"><span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${color};margin-right:6px"></span>${escapeHtml(i.title)} <span style="color:#94a3b8">· ${timeAgo(i.created_at)}</span></li>`;
    })
    .join("");
  const more = items.length > 6 ? `<div style="font-size:11px;color:#64748b">+${items.length - 6} more</div>` : "";
  return `<div style="min-width:220px"><div style="font-weight:600;margin-bottom:4px">${items.length} incidents at this location</div><ul style="list-style:none;padding:0;margin:0">${rows}</ul>${more}</div>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
