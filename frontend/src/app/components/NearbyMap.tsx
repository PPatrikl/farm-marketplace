// frontend/src/app/components/NearbyMap.tsx
//
// Real map for "Lähialueen toiminta" on Etusivu (Leaflet + OpenStreetMap).
// - one dot per place; several listings in the same town share one dot
// - click a dot → popup with the listings → click one to open it
// - "Olet tässä" marker + map centred on the user when location is allowed

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getMapPoints, MAP_COLORS, type MapPoint } from "../../services/mapPoints";
import { useLocation } from "../location/LocationContext";
import { distanceTo, formatDistance } from "../../utils/distance";

interface NearbyMapProps {
  lang: string;
  /** Same function LandingPage uses for the feed and search */
  onOpen: (item: { id: string; kind: "farm" | "forest" }) => void;
  height?: number;
}

// Whole Finland when we don't know where the user is
const FINLAND_CENTER: [number, number] = [64.5, 26.0];
const FINLAND_ZOOM = 5;
const USER_ZOOM = 8; // roughly a 100 km area

/** Listings at (almost) the same coordinates, shown as one dot */
interface PointGroup {
  key: string;
  lat: number;
  lng: number;
  points: MapPoint[];
}

function groupByPlace(points: MapPoint[]): PointGroup[] {
  const groups = new Map<string, PointGroup>();
  for (const p of points) {
    // 3 decimals ≈ 100 m — listings in the same town centre end up together
    const key = `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
    const g = groups.get(key) ?? { key, lat: p.lat, lng: p.lng, points: [] };
    g.points.push(p);
    groups.set(key, g);
  }
  return [...groups.values()];
}

/** Moves the map to the user once their location arrives. */
function FlyToUser({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], USER_ZOOM);
  }, [map, lat, lng]);
  return null;
}

export function NearbyMap({ lang, onOpen, height = 340 }: NearbyMapProps) {
  const fi = lang === "fi";
  const { coords } = useLocation();
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMapPoints()
      .then((data) => { if (!cancelled) setPoints(data); })
      .catch((err) => { console.error("Failed to load map points", err); if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  const groups = useMemo(() => groupByPlace(points), [points]);

  return (
    // "isolation: isolate" keeps Leaflet's high z-index layers inside this box,
    // so the map can't cover the sticky navbar or the search dropdown.
    <div className="relative" style={{ height, isolation: "isolate" }}>
      <MapContainer
        center={FINLAND_CENTER}
        zoom={FINLAND_ZOOM}
        scrollWheelZoom={false} // page scrolling shouldn't zoom the map
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {coords && <FlyToUser lat={coords.lat} lng={coords.lng} />}

        {groups.map((g) => {
          const first = g.points[0];
          const count = g.points.length;
          const km = distanceTo(coords, g.lat, g.lng);
          return (
            <CircleMarker
              key={g.key}
              center={[g.lat, g.lng]}
              radius={count > 1 ? 9 : 7}
              pathOptions={{ color: "#fff", weight: 2, fillColor: MAP_COLORS[first.kind], fillOpacity: 1 }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {count > 1 ? `${first.place.split(" · ").pop()} · ${count} ${fi ? "ilmoitusta" : "listings"}` : first.title}
              </Tooltip>
              <Popup>
                <div style={{ minWidth: 200, fontFamily: "'Inter', sans-serif" }}>
                  {km != null && (
                    <p style={{ margin: "0 0 6px", fontSize: 12, color: "#6b6b6b" }}>{formatDistance(km)}</p>
                  )}
                  {g.points.map((p) => (
                    <button
                      key={`${p.source}-${p.id}`}
                      onClick={() => onOpen({ id: p.id, kind: p.source })}
                      style={{ display: "flex", gap: 8, alignItems: "flex-start", width: "100%", textAlign: "left",
                               padding: "6px 0", background: "none", border: "none", cursor: "pointer" }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: "50%", marginTop: 4, flexShrink: 0,
                                     background: MAP_COLORS[p.kind] }} />
                      <span>
                        <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#1c1c1a" }}>{p.title}</span>
                        <span style={{ display: "block", fontSize: 12, color: "#6b6b6b" }}>{p.place}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {coords && (
          <CircleMarker
            center={[coords.lat, coords.lng]}
            radius={8}
            pathOptions={{ color: "#fff", weight: 3, fillColor: "#1c1c1a", fillOpacity: 1 }}
          >
            <Tooltip permanent direction="top" offset={[0, -8]}>
              {fi ? "Olet tässä" : "You are here"}
            </Tooltip>
          </CircleMarker>
        )}
      </MapContainer>

      {error && (
        <div className="absolute inset-x-0 bottom-0 z-[1000] bg-card/90 text-center text-xs text-muted-foreground py-2">
          {fi ? "Karttatietojen lataaminen epäonnistui." : "Failed to load map data."}
        </div>
      )}
    </div>
  );
}
