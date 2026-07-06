import { MapPin, Phone, MessageCircle, Filter, Scale, Clock, Search } from "lucide-react";
import { useState } from "react";
import { useLang } from "../i18n/LanguageContext";

const listings = [
  {
    id: 1,
    seller: "Paavo Mäkinen",
    initials: "PM",
    avatarColor: "#2A5012",
    product_fi: "Kultaiset kanttarellit",
    product_en: "Golden Chanterelles",
    category: "Mushrooms",
    category_fi: "Sienet",
    volume: "4 kg",
    price: "12.00",
    unit: "kg",
    total: "48.00",
    location: "Tampere",
    region_fi: "Pirkanmaa",
    region_en: "Pirkanmaa",
    distance: "5 km",
    posted_fi: "4 tuntia sitten",
    posted_en: "4 hours ago",
    description_fi: "Kerätty tänä aamuna Teiskon metsästä. Puhtaat, luokka A -kanttarellit. Voin toimittaa Tampereen alueella.",
    description_en: "Freshly picked this morning from Teisko forest. Clean, grade A chanterelles. Can deliver within Tampere.",
    verified: true,
    fresh: true,
  },
  {
    id: 2,
    seller: "Riikka Leinonen",
    initials: "RL",
    avatarColor: "#3B5EA6",
    product_fi: "Luonnonmustikka",
    product_en: "Wild Blueberries",
    category: "Berries",
    category_fi: "Marjat",
    volume: "8 L",
    price: "8.50",
    unit: "L",
    total: "68.00",
    location: "Jyväskylä",
    region_fi: "Keski-Suomi",
    region_en: "Central Finland",
    distance: "142 km",
    posted_fi: "8 tuntia sitten",
    posted_en: "8 hours ago",
    description_fi: "Käsinpoimittu puhtaasta metsästä, ei teitä lähistöllä. Sopii hilloon, mehuun tai syötäväksi tuoreena. Pakastetoimituskin onnistuu.",
    description_en: "Hand-picked from pristine forest, no roads nearby. Perfect for jam, juice, or eating fresh. Can ship frozen.",
    verified: true,
    fresh: true,
  },
  {
    id: 3,
    seller: "Eero Salminen",
    initials: "ES",
    avatarColor: "#B8293A",
    product_fi: "Puolukka",
    product_en: "Lingonberries",
    category: "Berries",
    category_fi: "Marjat",
    volume: "12 L",
    price: "6.00",
    unit: "L",
    total: "72.00",
    location: "Rovaniemi",
    region_fi: "Lappi",
    region_en: "Lapland",
    distance: "680 km",
    posted_fi: "1 päivä sitten",
    posted_en: "1 day ago",
    description_fi: "Lapin puolukoita — poikkeuksellinen laatu ja maku puhtaista pohjoisista metsistä. Toimitus saatavilla koko maahan.",
    description_en: "Lapland lingonberries — exceptional quality and flavor from clean northern forests. Shipping available nationwide.",
    verified: false,
    fresh: false,
  },
  {
    id: 4,
    seller: "Anu Korhonen",
    initials: "AK",
    avatarColor: "#6B5B2E",
    product_fi: "Sekasieniseos",
    product_en: "Mixed Forest Mushrooms",
    category: "Mushrooms",
    category_fi: "Sienet",
    volume: "3 kg",
    price: "9.00",
    unit: "kg",
    total: "27.00",
    location: "Oulu",
    region_fi: "Pohjois-Pohjanmaa",
    region_en: "Northern Ostrobothnia",
    distance: "320 km",
    posted_fi: "2 päivää sitten",
    posted_en: "2 days ago",
    description_fi: "Seos herkkutatteja, kanttarelleja ja rouskuja. Kaikki puhdistettu ja lajiteltu koon mukaan. Nouto suositeltavaa.",
    description_en: "Mix of porcini, chanterelles, and milk caps. All cleaned and sorted by size. Pickup preferred.",
    verified: true,
    fresh: false,
  },
  {
    id: 5,
    seller: "Sirpa Virtanen",
    initials: "SV",
    avatarColor: "#4A7C2F",
    product_fi: "Lakka (Hilla)",
    product_en: "Cloudberries",
    category: "Berries",
    category_fi: "Marjat",
    volume: "5 L",
    price: "22.00",
    unit: "L",
    total: "110.00",
    location: "Kemi",
    region_fi: "Lappi",
    region_en: "Lapland",
    distance: "598 km",
    posted_fi: "2 päivää sitten",
    posted_en: "2 days ago",
    description_fi: "Laadukkaita lakkoja aidoilta Lapin soilta. Harvinaista ja kausiluonteista — saatavilla vain elokuussa. Pakaste saatavilla.",
    description_en: "Premium cloudberries from genuine Lapland bogs. Rare and seasonal — only available August. Frozen available.",
    verified: true,
    fresh: false,
  },
  {
    id: 6,
    seller: "Mikko Heikkinen",
    initials: "MH",
    avatarColor: "#5C4E3A",
    product_fi: "Herkkutatti",
    product_en: "Porcini Mushrooms",
    category: "Mushrooms",
    category_fi: "Sienet",
    volume: "2.5 kg",
    price: "18.00",
    unit: "kg",
    total: "45.00",
    location: "Kuopio",
    region_fi: "Pohjois-Savo",
    region_en: "Northern Savonia",
    distance: "195 km",
    posted_fi: "5 tuntia sitten",
    posted_en: "5 hours ago",
    description_fi: "Kauniita herkkutatteja Kallaveden lähimetsistä. Kiinteät, suuret lakki. Täydellisiä risottoon tai kuivaukseen.",
    description_en: "Beautiful porcini from Lake Kallavesi forests. Firm, large caps. Perfect for risotto or drying.",
    verified: true,
    fresh: true,
  },
];

export function ForagerMarket() {
  const { tr, lang } = useLang();
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [contactedId, setContactedId] = useState<number | null>(null);

  const filterChips = [
    { id: "all", label: tr("filter_all") },
    { id: "berries", label: lang === "fi" ? "Marjat" : "Berries" },
    { id: "mushrooms", label: lang === "fi" ? "Sienet" : "Mushrooms" },
    { id: "nearby", label: lang === "fi" ? "Lähellä" : "Nearby" },
    { id: "fresh", label: tr("filter_fresh") },
    { id: "shipping", label: tr("filter_shipping") },
  ];

  const filtered = listings.filter((l) => {
    const cat = l.category.toLowerCase();
    const matchFilter =
      activeFilter === "all" ||
      (activeFilter === "berries" && cat === "berries") ||
      (activeFilter === "mushrooms" && cat === "mushrooms") ||
      (activeFilter === "nearby" && parseInt(l.distance) < 100) ||
      (activeFilter === "fresh" && l.fresh) ||
      (activeFilter === "shipping" && (l.description_fi.toLowerCase().includes("toimitus") || l.description_en.toLowerCase().includes("ship")));
    const q = search.toLowerCase();
    const matchSearch = !q ||
      l.product_fi.toLowerCase().includes(q) ||
      l.product_en.toLowerCase().includes(q) ||
      l.location.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-3xl mb-1">
                {tr("market_title")}
              </h1>
              <p className="text-muted-foreground text-sm">
                {filtered.length} {tr("market_subtitle_prefix")} · {tr("market_subtitle_suffix")}
              </p>
            </div>
            <div className="relative md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr("market_search")}
                className="w-full pl-9 pr-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 mb-8 flex-wrap">
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
          <button className="ml-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground text-sm transition-colors">
            <Filter className="w-3.5 h-3.5" />
            {tr("label_more_filters")}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((listing) => (
            <ForageCard
              key={listing.id}
              listing={listing}
              lang={lang}
              tr={tr}
              contacted={contactedId === listing.id}
              onContact={() => setContactedId(listing.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ForageCard({
  listing,
  lang,
  tr,
  contacted,
  onContact,
}: {
  listing: (typeof listings)[0];
  lang: string;
  tr: (k: any) => string;
  contacted: boolean;
  onContact: () => void;
}) {
  const product = lang === "fi" ? listing.product_fi : listing.product_en;
  const category = lang === "fi" ? listing.category_fi : listing.category;
  const region = lang === "fi" ? listing.region_fi : listing.region_en;
  const description = lang === "fi" ? listing.description_fi : listing.description_en;
  const posted = lang === "fi" ? listing.posted_fi : listing.posted_en;
  const categoryIcon = listing.category === "Berries" ? "🫐" : "🍄";

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200 group">
      <div className="relative overflow-hidden" style={{ height: 170, background: "#E8E4DA" }}>
        <img
          src={listing.id === 1 ? "https://images.unsplash.com/photo-1595669994887-c202e84f06da?w=400&h=240&fit=crop&auto=format"
            : listing.id === 2 ? "https://images.unsplash.com/photo-1725714871679-95dde71f1b63?w=400&h=240&fit=crop&auto=format"
            : listing.id === 3 ? "https://images.unsplash.com/photo-1597389030828-c5218bdf7fa4?w=400&h=240&fit=crop&auto=format"
            : listing.id === 4 ? "https://images.unsplash.com/photo-1512595594595-82b7f049313b?w=400&h=240&fit=crop&auto=format"
            : listing.id === 5 ? "https://images.unsplash.com/photo-1586007173401-3821e3092abf?w=400&h=240&fit=crop&auto=format"
            : "https://images.unsplash.com/photo-1512595784-5ebad80772a3?w=400&h=240&fit=crop&auto=format"}
          alt={product}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
          <span>{categoryIcon}</span>
          <span>{category}</span>
        </div>
        {listing.fresh && (
          <div className="absolute top-3 right-3 bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-full">
            {tr("label_fresh_today")}
          </div>
        )}
        <div className="absolute bottom-3 left-3 bg-white/90 text-foreground text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
          <Scale className="w-3 h-3 text-primary" />
          {listing.volume} {tr("label_available")}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
            style={{ background: listing.avatarColor }}
          >
            {listing.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-foreground text-sm font-medium truncate">{listing.seller}</span>
              {listing.verified && (
                <span className="text-xs text-primary" title={tr("label_verified")}>✓</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <MapPin className="w-3 h-3" />
              <span>{listing.location}, {region}</span>
              <span className="mx-1">·</span>
              <span>{listing.distance}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground text-xs flex-shrink-0">
            <Clock className="w-3 h-3" />
            <span>{posted}</span>
          </div>
        </div>

        <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-base mb-1.5">
          {product}
        </h3>
        <p className="text-muted-foreground text-xs leading-relaxed mb-4 line-clamp-2">
          {description}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div>
            <div className="flex items-baseline gap-1">
              <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "1.2rem" }} className="text-accent">
                €{listing.price}
              </span>
              <span className="text-muted-foreground text-xs">/ {listing.unit}</span>
            </div>
            <div className="text-muted-foreground text-xs mt-0.5">
              {tr("label_total")} €{listing.total}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
              <MessageCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onContact}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                contacted
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              {contacted ? tr("btn_contacted") : tr("btn_contact")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
