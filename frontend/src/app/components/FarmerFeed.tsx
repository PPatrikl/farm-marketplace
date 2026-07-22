import { MapPin, Calendar, Star, Filter, SlidersHorizontal, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useLang } from "../i18n/LanguageContext";
import { type Farm } from "../data/farms";
import { fetchFarmListings } from "../../services/farmListings";

interface FarmerFeedProps {
  onSelectFarm?: (farm: Farm) => void;
}

export function FarmerFeed({ onSelectFarm }: FarmerFeedProps) {
  const { tr, lang } = useLang();
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeSortIndex, setActiveSortIndex] = useState(0);
  const [showSort, setShowSort] = useState(false);

  // ── NEW: Supabase state ──────────────────────────────────
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadListings() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchFarmListings();
        setFarms(data);
      } catch (err) {
        console.error(err);
        setError("Ilmoitusten lataaminen epäonnistui. / Failed to load listings.");
      } finally {
        setLoading(false);
      }
    }
    loadListings();
  }, []);
  // ── END NEW ──────────────────────────────────────────────

  const filterChips = [
    { id: "all", label: tr("filter_all") },
    { id: "picking", label: tr("filter_picking") },
    { id: "jobs", label: tr("filter_jobs") },
    { id: "organic", label: tr("filter_organic") },
    { id: "nearby", label: tr("filter_nearby") },
  ];

  const sortOptions = [
    tr("sort_relevant"),
    tr("sort_closest"),
    tr("sort_rated"),
    tr("sort_latest"),
  ];

  const filtered = farms.filter((f) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "picking") return f.type === "picking";
    if (activeFilter === "jobs") return f.type === "job";
    if (activeFilter === "organic") return f.tags_en.some((t) => t.toLowerCase().includes("organic"));
    if (activeFilter === "nearby") return parseInt(f.distance) < 50;
    return true;
  });

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-3xl mb-1">
            {tr("farmer_title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {loading ? "..." : filtered.length} {tr("farmer_subtitle_prefix")} · {tr("farmer_subtitle_suffix")}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {filterChips.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setActiveFilter(chip.id)}
                className={`px-3.5 py-1.5 rounded-full text-sm transition-all border ${
                  activeFilter === chip.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground text-sm transition-colors">
              <Filter className="w-3.5 h-3.5" />
              {tr("btn_filters")}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowSort(!showSort)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {sortOptions[activeSortIndex]}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showSort && (
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-10 min-w-[180px] py-1">
                  {sortOptions.map((opt, i) => (
                    <button
                      key={opt}
                      onClick={() => { setActiveSortIndex(i); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors ${
                        i === activeSortIndex ? "text-primary font-medium" : "text-foreground"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── NEW: loading / error / empty states ── */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
                <div className="bg-secondary" style={{ height: 180 }} />
                <div className="p-4 flex flex-col gap-3">
                  <div className="h-4 bg-secondary rounded w-3/4" />
                  <div className="h-3 bg-secondary rounded w-1/2" />
                  <div className="h-3 bg-secondary rounded w-full" />
                  <div className="h-8 bg-secondary rounded w-1/3 mt-2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-destructive text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
            >
              Yritä uudelleen / Try again
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">
              Ei ilmoituksia tällä hetkellä. / No listings at the moment.
            </p>
          </div>
        )}
        {/* ── END NEW ── */}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((farm) => (
              <FarmCard key={farm.id} farm={farm} lang={lang} tr={tr} onSelect={() => onSelectFarm?.(farm)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FarmCard 
// ════════════════════════════════════════════════════════════
function FarmCard({
  farm,
  lang,
  tr,
  onSelect,
}: {
  farm: Farm;
  lang: string;
  tr: (k: any) => string;
  onSelect: () => void;
}) {
  const isPicking = farm.type === "picking";
  const badgeColor = isPicking ? { bg: "#EDF4E8", text: "#2A5012" } : { bg: "#FAEAEC", text: "#B8293A" };
  const badgeLabel = isPicking ? tr("badge_picking") : tr("badge_job");
  const location = lang === "fi" ? farm.location_fi : farm.location_en;
  const produce = lang === "fi" ? farm.produce_fi : farm.produce_en;
  const tags = lang === "fi" ? farm.tags_fi : farm.tags_en;

  return (
    <div
      onClick={onSelect}
      className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200 group cursor-pointer"
    >
      <div className="relative overflow-hidden" style={{ height: 180, background: "#E8E4DA" }}>
        <img
          src={farm.image}
          alt={farm.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div
          className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{ background: badgeColor.bg, color: badgeColor.text }}
        >
          {badgeLabel}
        </div>
        <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {farm.distance}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-base leading-tight">
            {farm.name}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <Star className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" />
            <span className="text-foreground text-xs font-medium">{farm.rating}</span>
            <span className="text-muted-foreground text-xs">({farm.reviews})</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground text-xs mb-3">
          <MapPin className="w-3 h-3" />
          <span>{location}</span>
        </div>

        <p className="text-foreground text-sm mb-3">{produce}</p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {tags.map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div>
            <div className="flex items-center gap-1">
              <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "1.1rem" }} className="text-primary">
                €{farm.price}
              </span>
              <span className="text-muted-foreground text-xs">{tr("label_price_per")} {farm.unit}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
              <Calendar className="w-3 h-3" />
              <span>{farm.dateStart} – {farm.dateEnd}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground mb-1">
              {farm.openSpots} {tr("label_spots_left")}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
              className="px-3.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              {isPicking ? tr("btn_book") : tr("btn_apply")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

