import { MapPin, Calendar, Star, Filter, SlidersHorizontal, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useLang } from "../i18n/LanguageContext";

const farms = [
  {
    id: 1,
    name: "Virtanen Tila",
    location_fi: "Hämeenlinna, Kanta-Häme",
    location_en: "Hämeenlinna, Kanta-Häme",
    type: "picking",
    produce_fi: "Mansikat",
    produce_en: "Strawberries",
    price: "4.50",
    unit: "kg",
    dateStart: "20.6.",
    dateEnd: "15.7.",
    rating: 4.8,
    reviews: 42,
    image: "https://images.unsplash.com/photo-1734313237433-9b0ecafc2d42?w=400&h=240&fit=crop&auto=format",
    distance: "12 km",
    openSpots: 18,
    tags_fi: ["Sopii perheille", "Parkkipaikka"],
    tags_en: ["Family-friendly", "Parking"],
  },
  {
    id: 2,
    name: "Korhonen Farm",
    location_fi: "Turku, Varsinais-Suomi",
    location_en: "Turku, Varsinais-Suomi",
    type: "job",
    produce_fi: "Vadelmansato",
    produce_en: "Raspberry harvest",
    price: "13.50",
    unit: "h",
    dateStart: "1.7.",
    dateEnd: "30.8.",
    rating: 4.6,
    reviews: 27,
    image: "https://images.unsplash.com/photo-1511813534717-f467cef279bf?w=400&h=240&fit=crop&auto=format",
    distance: "89 km",
    openSpots: 6,
    tags_fi: ["Majoitus", "Ateriat sisältyvät"],
    tags_en: ["Accommodation", "Meals included"],
  },
  {
    id: 3,
    name: "Mäkinen Mansikkatila",
    location_fi: "Lahti, Päijät-Häme",
    location_en: "Lahti, Päijät-Häme",
    type: "picking",
    produce_fi: "Mansikat ja vadelmat",
    produce_en: "Strawberries & Raspberries",
    price: "3.80",
    unit: "kg",
    dateStart: "28.6.",
    dateEnd: "22.7.",
    rating: 4.9,
    reviews: 61,
    image: "https://images.unsplash.com/photo-1593895349007-8e6700308b3d?w=400&h=240&fit=crop&auto=format",
    distance: "34 km",
    openSpots: 40,
    tags_fi: ["Luomu", "Lapset tervetulleita"],
    tags_en: ["Organic", "Children welcome"],
  },
  {
    id: 4,
    name: "Leinonen Puutarha",
    location_fi: "Tampere, Pirkanmaa",
    location_en: "Tampere, Pirkanmaa",
    type: "picking",
    produce_fi: "Karviainen ja herukat",
    produce_en: "Gooseberries & Currants",
    price: "5.20",
    unit: "kg",
    dateStart: "10.7.",
    dateEnd: "5.8.",
    rating: 4.7,
    reviews: 19,
    image: "https://images.unsplash.com/photo-1734313237467-1f93eb3abbe0?w=400&h=240&fit=crop&auto=format",
    distance: "58 km",
    openSpots: 12,
    tags_fi: ["Koirat sallittu"],
    tags_en: ["Dogs allowed"],
  },
  {
    id: 5,
    name: "Heikkinen Kartano",
    location_fi: "Seinäjoki, Etelä-Pohjanmaa",
    location_en: "Seinäjoki, South Ostrobothnia",
    type: "job",
    produce_fi: "Perunasato",
    produce_en: "Potato harvest",
    price: "14.00",
    unit: "h",
    dateStart: "15.8.",
    dateEnd: "30.9.",
    rating: 4.5,
    reviews: 33,
    image: "https://images.unsplash.com/photo-1571524188026-cc1d649962ea?w=400&h=240&fit=crop&auto=format",
    distance: "142 km",
    openSpots: 15,
    tags_fi: ["Asuminen järjestetty", "Sopimuspohjainen"],
    tags_en: ["Housing provided", "Contract work"],
  },
  {
    id: 6,
    name: "Niemi Marjatila",
    location_fi: "Joensuu, Pohjois-Karjala",
    location_en: "Joensuu, North Karelia",
    type: "picking",
    produce_fi: "Mustikkakentät",
    produce_en: "Blueberry fields",
    price: "4.00",
    unit: "kg",
    dateStart: "25.7.",
    dateEnd: "20.8.",
    rating: 4.9,
    reviews: 55,
    image: "https://images.unsplash.com/photo-1597389030828-c5218bdf7fa4?w=400&h=240&fit=crop&auto=format",
    distance: "201 km",
    openSpots: 30,
    tags_fi: ["Luomu", "Kaunis sijainti"],
    tags_en: ["Organic", "Scenic location"],
  },
];

export function FarmerFeed() {
  const { tr, lang } = useLang();
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeSortIndex, setActiveSortIndex] = useState(0);
  const [showSort, setShowSort] = useState(false);

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
    if (activeFilter === "organic") return f.tags_en.some((t) => t.includes("Organic"));
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
            {filtered.length} {tr("farmer_subtitle_prefix")} · {tr("farmer_subtitle_suffix")}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((farm) => (
            <FarmCard key={farm.id} farm={farm} lang={lang} tr={tr} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FarmCard({ farm, lang, tr }: { farm: (typeof farms)[0]; lang: string; tr: (k: any) => string }) {
  const isPicking = farm.type === "picking";
  const badgeColor = isPicking ? { bg: "#EDF4E8", text: "#2A5012" } : { bg: "#FAEAEC", text: "#B8293A" };
  const badgeLabel = isPicking ? tr("badge_picking") : tr("badge_job");
  const location = lang === "fi" ? farm.location_fi : farm.location_en;
  const produce = lang === "fi" ? farm.produce_fi : farm.produce_en;
  const tags = lang === "fi" ? farm.tags_fi : farm.tags_en;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200 group cursor-pointer">
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
            <button className="px-3.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
              {isPicking ? tr("btn_book") : tr("btn_apply")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
