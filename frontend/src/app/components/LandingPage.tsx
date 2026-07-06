import { Search, MapPin, Sprout, Briefcase, Trees, ArrowRight, Star, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { useLang } from "../i18n/LanguageContext";

interface LandingPageProps {
  onNavigate: (page: string) => void;
  onOpenAuth: (tab: "login" | "register") => void;
}

const recentActivity = [
  {
    id: 1,
    title_fi: "Mansikanpoiminta avoinna",
    title_en: "Strawberry picking open",
    farm: "Virtanen Tila",
    location: "Hämeenlinna",
    distance: "12 km",
    time_fi: "2t sitten",
    time_en: "2h ago",
    color: "#B8293A",
  },
  {
    id: 2,
    title_fi: "Kanttarellit — 4 kg",
    title_en: "Chanterelles — 4 kg",
    farm: "Paavo Mäkinen",
    location: "Tampere",
    distance: "5 km",
    time_fi: "4t sitten",
    time_en: "4h ago",
    color: "#D4A853",
  },
  {
    id: 3,
    title_fi: "Satotyöläisiä etsitään",
    title_en: "Harvest workers needed",
    farm: "Korhonen Farm",
    location: "Turku",
    distance: "89 km",
    time_fi: "6t sitten",
    time_en: "6h ago",
    color: "#2A5012",
  },
  {
    id: 4,
    title_fi: "Luonnonmustikkaa — 8 L",
    title_en: "Wild blueberries — 8 L",
    farm: "Riikka Leinonen",
    location: "Jyväskylä",
    distance: "142 km",
    time_fi: "8t sitten",
    time_en: "8h ago",
    color: "#3B5EA6",
  },
];

const mapMarkers = [
  { id: 1, x: 28, y: 35, type: "farm", label_fi: "Virtanen Tila", label_en: "Virtanen Tila" },
  { id: 2, x: 52, y: 55, type: "forager", label_fi: "Kanttarellit", label_en: "Chanterelles" },
  { id: 3, x: 42, y: 42, type: "job", label_fi: "Satotyö", label_en: "Harvest job" },
  { id: 4, x: 65, y: 30, type: "forager", label_fi: "Mustikkaa", label_en: "Blueberries" },
  { id: 5, x: 20, y: 65, type: "farm", label_fi: "Koskela Tila", label_en: "Koskela Farm" },
  { id: 6, x: 75, y: 68, type: "forager", label_fi: "Puolukoita", label_en: "Lingonberries" },
  { id: 7, x: 35, y: 78, type: "job", label_fi: "Vadelmanpoiminta", label_en: "Raspberry picking" },
];

export function LandingPage({ onNavigate, onOpenAuth }: LandingPageProps) {
  const { tr, lang } = useLang();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);

  const stats = [
    { labelKey: "landing_badge_farms" as const, value: "284", icon: Sprout },
    { labelKey: "landing_badge_pickers" as const, value: "1 840", icon: Users },
    { labelKey: "landing_badge_listings" as const, value: "93", icon: TrendingUp },
  ];

  const categories = [
    {
      id: "farmers",
      icon: Sprout,
      titleKey: "landing_cat_picking_title" as const,
      subtitleKey: "landing_cat_picking_sub" as const,
      countKey: "landing_cat_picking_count" as const,
      color: "#2A5012",
      bg: "#EDF4E8",
    },
    {
      id: "farmers",
      icon: Briefcase,
      titleKey: "landing_cat_jobs_title" as const,
      subtitleKey: "landing_cat_jobs_sub" as const,
      countKey: "landing_cat_jobs_count" as const,
      color: "#B8293A",
      bg: "#FAEAEC",
    },
    {
      id: "foragers",
      icon: Trees,
      titleKey: "landing_cat_forest_title" as const,
      subtitleKey: "landing_cat_forest_sub" as const,
      countKey: "landing_cat_forest_count" as const,
      color: "#4A7C2F",
      bg: "#EEF4E9",
    },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-screen bg-background">
      {/* Hero */}
      <section
        className="relative overflow-hidden"
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
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3.5 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
              <span className="text-white/90 text-sm">{tr("landing_badge")}</span>
            </div>
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocus(true)}
                  onBlur={() => setSearchFocus(false)}
                  placeholder={tr("landing_search_placeholder")}
                  className="flex-1 px-4 py-4 text-foreground placeholder:text-muted-foreground bg-transparent outline-none text-base"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
                <div className="flex items-center gap-2 pr-2">
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-colors">
                    <MapPin className="w-4 h-4" />
                    <span>{tr("landing_location")}</span>
                  </button>
                  <button className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                    {tr("landing_search_btn")}
                  </button>
                </div>
              </div>
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
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: cat.bg, color: cat.color }}
                  >
                    {tr(cat.countKey)}
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
            <div className="relative" style={{ height: 340 }}>
              <img
                src="https://images.unsplash.com/photo-1668090147256-10de5a40b9fe?w=800&h=340&fit=crop&auto=format"
                alt="Finnish farmland aerial view"
                className="w-full h-full object-cover opacity-30"
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, #EEF4E9 0%, transparent 30%, transparent 70%, #EEF4E9 100%)" }} />
              <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.15 }}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <line key={`h${i}`} x1="0" y1={`${(i / 5) * 100}%`} x2="100%" y2={`${(i / 5) * 100}%`} stroke="#2A5012" strokeWidth="1" />
                ))}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <line key={`v${i}`} x1={`${(i / 5) * 100}%`} y1="0" x2={`${(i / 5) * 100}%`} y2="100%" stroke="#2A5012" strokeWidth="1" />
                ))}
              </svg>
              {mapMarkers.map((marker) => {
                const color = marker.type === "farm" ? "#2A5012" : marker.type === "job" ? "#B8293A" : "#D4A853";
                const label = lang === "fi" ? marker.label_fi : marker.label_en;
                return (
                  <div
                    key={marker.id}
                    className="absolute group cursor-pointer"
                    style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-125"
                      style={{ background: color }}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-foreground text-background text-xs px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                      {label}
                    </div>
                  </div>
                );
              })}
              <div className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
                <div className="w-5 h-5 rounded-full bg-primary border-2 border-white shadow-lg">
                  <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-40" />
                </div>
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
                  {tr("landing_map_you")}
                </div>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm">
            <div className="px-5 py-4 border-b border-border">
              <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground">
                {tr("landing_recent_title")}
              </h3>
            </div>
            <div className="divide-y divide-border">
              {recentActivity.map((item) => (
                <div key={item.id} className="px-5 py-4 hover:bg-secondary/40 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: item.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">
                        {lang === "fi" ? item.title_fi : item.title_en}
                      </p>
                      <p className="text-muted-foreground text-xs mt-0.5">{item.farm}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </span>
                        <span className="text-muted-foreground text-xs">·</span>
                        <span className="text-xs text-muted-foreground">{item.distance}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {lang === "fi" ? item.time_fi : item.time_en}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4">
              <button
                onClick={() => onNavigate("foragers")}
                className="w-full text-center text-sm text-primary font-medium hover:underline"
              >
                {tr("landing_view_all")}
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
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-yellow-300" fill="currentColor" />
              <span className="text-white/80 text-sm">{tr("landing_cta_trusted")}</span>
            </div>
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
              onClick={() => onOpenAuth("register")}
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
