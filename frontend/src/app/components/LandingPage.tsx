// src/app/components/LandingPage.tsx

import { Search, MapPin, Sprout, Briefcase, Trees, ArrowRight, Star, TrendingUp, Users } from "lucide-react";

import { useLang } from "../i18n/LanguageContext";
import { useEffect, useState } from "react";
import { getRecentActivity, type RecentActivityItem } from "../../services/recentActivity";
import { fetchFarmListingById } from "../../services/farmListings";
import type { FarmWithVerification } from "../../services/farmListings";

import { getLandingStats, getCategoryCounts, type LandingStats, type CategoryCounts } from "../../services/stats";
import { searchListings, type SearchResult } from "../../services/search";
import { useLocation } from "../location/LocationContext";
import { distanceTo, formatDistance } from "../../utils/distance";
import { NearbyMap } from "./NearbyMap";

const CATEGORY_LABEL_KEY = {
  picking: "landing_map_legend_farm",   // "Tila"
  job: "landing_map_legend_job",        // "Työ"
  forest: "landing_map_legend_forage",  // "Keruu"
} as const;

interface LandingPageProps {
  onNavigate: (page: string) => void;
  onOpenAuth: (tab: "login" | "register") => void;
  onSelectFarmListing: (farm: FarmWithVerification) => void; 
  onSelectForestListing: (id: string) => void;
  isLoggedIn: boolean;
}



export function LandingPage({ onNavigate, onOpenAuth, onSelectFarmListing, onSelectForestListing, isLoggedIn }: LandingPageProps) {
  const { tr, lang } = useLang();
  const fi = lang === "fi";
  const { coords, status: locationStatus, requestLocation } = useLocation();

  /** "· 12 km", or "" if we don't know the user's or the listing's position */
  const kmLabel = (lat: number | null, lng: number | null) => {
    const km = distanceTo(coords, lat, lng);
    return km == null ? "" : formatDistance(km);
  };

  const locationButtonLabel =
    coords ? (fi ? "Sijaintisi" : "Your location")
    : locationStatus === "loading" ? (fi ? "Haetaan…" : "Locating…")
    : locationStatus === "denied" ? (fi ? "Sijainti estetty" : "Location blocked")
    : (fi ? "Käytä sijaintia" : "Use location");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [openingListingId, setOpeningListingId] = useState<string | null>(null);

  async function openListing(item: { id: string; kind: "farm" | "forest" }) {
    if (item.kind === "forest") {
      onSelectForestListing(item.id);
      return;
    }

    setOpeningListingId(item.id);
    try {
      const farm = await fetchFarmListingById(item.id);
      if (farm) {
        onSelectFarmListing(farm);
      } else {
        console.error("Listing not found or no longer active:", item.id);
      }
    } catch (err) {
      console.error("Failed to load listing", err);
    } finally {
      setOpeningListingId(null);
    }
  }

  const [landingStats, setLandingStats] = useState<LandingStats | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCounts | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getLandingStats(), getCategoryCounts()])
      .then(([s, c]) => { if (!cancelled) { setLandingStats(s); setCategoryCounts(c); } })
      .catch((err) => console.error("Failed to load landing stats", err));
    return () => { cancelled = true; };
  }, []);

  const stats = [
    { labelKey: "landing_badge_farms" as const, value: landingStats ? String(landingStats.activeFarms) : "—", icon: Sprout },
    { labelKey: "landing_badge_pickers" as const, value: landingStats ? landingStats.registeredPickers.toLocaleString('fi-FI') : "—", icon: Users },
    { labelKey: "landing_badge_listings" as const, value: landingStats ? String(landingStats.listingsThisWeek) : "—", icon: TrendingUp },
  ];

  const weekCount = landingStats?.listingsThisWeek;
  const badgeText =
    weekCount === undefined
      ? "\u00A0" // While it loads, we maintain the height so the header doesn't jump
      : weekCount === 1
        ? tr("landing_badge_one")
        : tr("landing_badge").replace("{count}", String(weekCount));

  const categories = [
    {
      id: "farmers",
      icon: Sprout,
      titleKey: "landing_cat_picking_title" as const,
      subtitleKey: "landing_cat_picking_sub" as const,
      countSuffixKey: "landing_cat_picking_count_suffix" as const,
      count: categoryCounts?.pickingCount ?? null,
      color: "#2A5012",
      bg: "#EDF4E8",
    },
    {
      id: "farmers",
      icon: Briefcase,
      titleKey: "landing_cat_jobs_title" as const,
      subtitleKey: "landing_cat_jobs_sub" as const,
      countSuffixKey: "landing_cat_jobs_count_suffix" as const,
      count: categoryCounts?.jobsCount ?? null,
      color: "#B8293A",
      bg: "#FAEAEC",
    },
    {
      id: "foragers",
      icon: Trees,
      titleKey: "landing_cat_forest_title" as const,
      subtitleKey: "landing_cat_forest_sub" as const,
      countSuffixKey: "landing_cat_forest_count_suffix" as const,
      count: categoryCounts?.forestCount ?? null,
      color: "#4A7C2F",
      bg: "#EEF4E9",
    },
  ];

  useEffect(() => {
    let cancelled = false;
    getRecentActivity(4)
      .then((data) => { if (!cancelled) setRecentActivity(data); })
      .catch((err) => console.error("Failed to load recent activity", err))
      .finally(() => { if (!cancelled) setLoadingActivity(false); });
    return () => { cancelled = true; };
  }, []);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    const timer = setTimeout(() => {
      searchListings(q)
        .then((r) => { if (!cancelled) setSearchResults(r); })
        .catch((err) => console.error("Search failed", err))
        .finally(() => { if (!cancelled) setSearchLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery]);

  function handlePostListing() {
    if (isLoggedIn) {
      onNavigate("profile");
    } else {
      onOpenAuth("register");
    }
  }

  const TRUST_STEP = 100;

  const usersRounded = landingStats
    ? Math.floor(landingStats.registeredPickers / TRUST_STEP) * TRUST_STEP
    : 0;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative"
        style={{ background: "linear-gradient(160deg, #2A5012 0%, #3D6B1C 50%, #4A7C2F 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1668090147256-10de5a40b9fe?w=1400&h=600&fit=crop&auto=format")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28">
          <div className="max-w-2xl">
              {weekCount !== 0 && (
                <div className={`inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3.5 py-1.5 mb-6 ${weekCount === undefined ? "invisible" : ""}`}>
                  <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                  <span className="text-white/90 text-sm">{badgeText}</span>
                </div>
              )}
            <h1
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, lineHeight: 1.15, fontSize: "clamp(2rem, 5vw, 3.25rem)" }}
              className="text-white mb-5"
            >
              {tr("landing_hero_title")}
            </h1>
              <p className="text-white/75 text-lg mb-10 leading-relaxed max-w-lg">
                {tr("landing_hero_sub")}
              </p>
            
            {/* Search bar */}
            <div className="relative">
              <div
                className={`flex items-center bg-white rounded-xl overflow-hidden transition-shadow ${
                  searchFocus ? "shadow-2xl" : "shadow-lg"
                }`}
              >
                <Search className="ml-4 w-5 h-5 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                  onFocus={() => { setSearchFocus(true); setSearchOpen(true); }}
                  onBlur={() => { setSearchFocus(false); setSearchOpen(false); }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSearchOpen(false);
                    if (e.key === "Enter") setSearchOpen(true);
                  }}
                  placeholder={tr("landing_search_placeholder")}
                  className="flex-1 px-4 py-4 text-foreground placeholder:text-muted-foreground bg-transparent outline-none text-base"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
                <div className="flex items-center gap-2 pr-2">
                    <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={requestLocation}
                    disabled={locationStatus === "loading"}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors ${
                      coords ? "text-primary font-medium" : "text-muted-foreground"
                    }`}>
                    <MapPin className="w-4 h-4" />
                    <span>{locationButtonLabel}</span>
                  </button>

                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setSearchOpen(true)}
                    className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    {tr("landing_search_btn")}
                  </button>
                </div>
              </div>

              {searchOpen && searchQuery.trim().length >= 2 && (
                <div
                  onMouseDown={(e) => e.preventDefault()} 
                  className="absolute left-0 right-0 top-full mt-2 bg-card rounded-xl border border-border shadow-2xl z-30 max-h-96 overflow-y-auto divide-y divide-border"
                >
                  {searchLoading && searchResults.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      {tr("landing_recent_loading")}
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      {tr("landing_search_empty")}
                    </div>
                  ) : (
                    searchResults.map((r) => (
                      <div
                        key={`${r.kind}-${r.id}`}
                        onClick={() => { setSearchOpen(false); openListing(r); }}
                        className="px-4 py-3 hover:bg-secondary/40 transition-colors cursor-pointer flex items-center gap-3"
                      >
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-sm font-medium truncate">{r.title}</p>
                          <p className="text-muted-foreground text-xs truncate">
                            {[r.subtitle, r.city, kmLabel(r.lat, r.lng)].filter(Boolean).join(" · ")}                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {tr(CATEGORY_LABEL_KEY[r.category])}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 48" className="w-full" preserveAspectRatio="none" style={{ height: 48 }}>
            <path d="M0,48 C360,0 1080,48 1440,16 L1440,48 Z" fill="#F5F3EE" />
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-1 pb-4">
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.labelKey} className="bg-card rounded-xl p-5 border border-border flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p
                    style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "1.4rem", lineHeight: 1 }}
                    className="text-foreground"
                  >
                    {stat.value}
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">{tr(stat.labelKey)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h2
          style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
          className="text-foreground text-2xl mb-6"
        >
          {tr("landing_browse_title")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <button
                key={i}
                onClick={() => onNavigate(cat.id)}
                className="group text-left p-6 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105"
                  style={{ background: cat.bg }}
                >
                  <Icon className="w-6 h-6" style={{ color: cat.color }} />
                </div>
                <h3
                  style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "1.15rem" }}
                  className="text-foreground mb-1"
                >
                  {tr(cat.titleKey)}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{tr(cat.subtitleKey)}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: cat.bg, color: cat.color }}>
                    {cat.count === null ? "…" : `${cat.count} ${tr(cat.countSuffixKey)}`}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Map + Activity */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Map */}
          <div className="lg:col-span-3 bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground">
                {tr("landing_map_title")}
              </h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {(["farm", "job", "forage"] as const).map((type) => {
                  const color = type === "farm" ? "#2A5012" : type === "job" ? "#B8293A" : "#D4A853";
                  const labelKey = type === "farm" ? "landing_map_legend_farm" : type === "job" ? "landing_map_legend_job" : "landing_map_legend_forage";
                  return (
                    <span key={type} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
                      {tr(labelKey as any)}
                    </span>
                  );
                })}
              </div>
            </div>
                        <NearbyMap lang={lang} onOpen={openListing} height={420} />
          </div>

          {/* Recent activity */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm">
            <div className="px-5 py-4 border-b border-border">
              <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground">
                {tr("landing_recent_title")}
              </h3>
            </div>
          <div className="divide-y divide-border">
            {loadingActivity ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                {tr("landing_recent_loading") /*  "Loading..." */}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                {tr("landing_recent_empty") /*  "No listings yet" */}
              </div>
            ) : (
              recentActivity.map((item) => (
                <div
                  key={item.id}
                  onClick={() => openListing(item)}
                  className={`px-5 py-4 hover:bg-secondary/40 transition-colors cursor-pointer ${
                    openingListingId === item.id ? "opacity-60 pointer-events-none" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: item.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">{item.title}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{item.authorName}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {item.city}
                          {kmLabel(item.lat, item.lng) && (
                            <span className="text-foreground font-medium">· {kmLabel(item.lat, item.lng)}</span>
                          )}
                        </span>                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {lang === "fi" ? item.timeAgoFi : item.timeAgoEn}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
            <div className="px-5 py-4 flex gap-4 justify-center text-sm">
              <button onClick={() => onNavigate("farmers")} className="w-full text-primary text-sm font-medium hover:underline">
                {tr("landing_view_farms")} 
              </button>
              <button onClick={() => onNavigate("foragers")} className="w-full text-primary text-sm font-medium hover:underline">
                {tr("landing_view_forest")} 
              </button>
            </div>
 
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div
          className="rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8"
          style={{ background: "linear-gradient(135deg, #2A5012 0%, #4A7C2F 100%)" }}
        >
          <div>
            {usersRounded >= TRUST_STEP && (
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-yellow-300" fill="currentColor" />
                <span className="text-white/80 text-sm">
                  {tr("landing_cta_trusted").replace("{count}", usersRounded.toLocaleString("fi-FI"))}
                </span>
              </div>
            )}
            <h2
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "clamp(1.4rem, 3vw, 2rem)" }}
              className="text-white mb-2"
            >
              {tr("landing_cta_title")}
            </h2>
            <p className="text-white/75 text-sm leading-relaxed max-w-md">
              {tr("landing_cta_sub")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <button
              onClick={handlePostListing}
              className="px-6 py-3 bg-white text-primary rounded-xl text-sm font-medium hover:bg-white/90 transition-colors shadow-sm"
            >
              {tr("landing_cta_post")}
            </button>
            <button
              onClick={() => onNavigate("farmers")}
              className="px-6 py-3 bg-white/15 text-white border border-white/30 rounded-xl text-sm font-medium hover:bg-white/20 transition-colors"
            >
              {tr("landing_cta_browse")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
