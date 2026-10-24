// frontend/src/app/components/LocationMap.tsx
//
// Small real map for detail pages, using OpenStreetMap's free embed

// Usage:
//   <LocationMap lat={listing.lat} lng={listing.lng} label="Tampere, Pirkanmaa" lang={lang} />

import { Navigation, MapPin } from "lucide-react";

interface LocationMapProps {
  lat: number | null;
  lng: number | null;
  label: string;      // shown under the map
  lang: string;
  /** true when the coordinates are only the city centre, not the exact spot */
  approximate?: boolean;
  height?: number;
}

export function LocationMap({ lat, lng, label, lang, approximate = true, height = 260 }: LocationMapProps) {
  const fi = lang === "fi";

  // No coordinates -> say so instead of showing a wrong map
  if (lat == null || lng == null) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4" />
        {label} · {fi ? "Sijaintia ei ole merkitty kartalle." : "No map location available."}
      </div>
    );
  }

  // The visible area around the pin: about 5 km +-
  const d = 0.05;
  const bbox = [lng - d * 2, lat - d, lng + d * 2, lat + d].join(",");
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div>
      <div className="rounded-xl overflow-hidden border border-border" style={{ height }}>
        <iframe
          title={fi ? "Kartta" : "Map"}
          src={mapSrc}
          className="w-full h-full"
          style={{ border: 0 }}
          loading="lazy"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
        <div className="text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            {label}
          </span>
          {approximate && (
            <span className="text-xs block mt-0.5">
              {fi ? "Sijainti on suuntaa antava." : "Approximate location."}
            </span>
          )}
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border text-sm text-foreground hover:border-primary/40 transition-colors"
        >
          <Navigation className="w-4 h-4" />
          {fi ? "Reittiohjeet" : "Directions"}
        </a>
      </div>
    </div>
  );
}
