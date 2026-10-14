import { MapPin, Phone, MessageCircle, Filter, Scale, Clock, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useLang } from "../i18n/LanguageContext";
import { useLocation } from "../location/LocationContext";
import { distanceTo, formatDistance } from "../../utils/distance";

// "Lähellä" filter radius
const NEARBY_KM = 50;
import { fetchForestListings, type ForestListing } from "../../services/forestListings";
import { ContactFormModal } from "./ContactFormModal";
import { ForestListingDetail } from "./ForestListingDetail";

/** ForagerMarket component displays a list of forest listings with filtering and search functionality. */
interface ForagerMarketProps {
  /** Open this listing's detail page right after loading (e.g. clicked on Etusivu) */
  initialListingId?: string | null;
}

export function ForagerMarket({ initialListingId }: ForagerMarketProps) {  const { tr, lang } = useLang();
  // User's position, shared app-wide (null until the user allows location)
  const { coords, status: locationStatus, requestLocation } = useLocation();
  const [listings, setListings] = useState<ForestListing[]>([]);// State to hold the fetched forest listings
  const [loading, setLoading] = useState(true); // State to indicate if the listings are being loaded
  const [error, setError] = useState<string | null>(null);

  /** useEffect hook to fetch forest listings on component mount. */
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchForestListings();
        setListings(data);
        if (initialListingId) {
          const match = data.find((l) => l.id === initialListingId);
          if (match) setSelected(match);
        }      } catch (err) {
        setError("Ilmoitusten lataaminen epäonnistui. / Failed to load listings.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const [activeFilter, setActiveFilter] = useState("all"); 
  const [search, setSearch] = useState("");
  const [contactedId, setContactedId] = useState<string | null>(null); 

  const [contactTarget, setContactTarget] = useState<ForestListing | null>(null);
  // The listing whose detail page is open (null = show the grid)
  const [selected, setSelected] = useState<ForestListing | null>(null);

  const handleContactSuccess = () => {
    if (contactTarget) setContactedId(contactTarget.id);
  };

  const filterChips = [
    { id: "all", label: tr("filter_all") },
    { id: "berries", label: lang === "fi" ? "Marjat" : "Berries" },
    { id: "mushrooms", label: lang === "fi" ? "Sienet" : "Mushrooms" },
    { id: "nearby", label: lang === "fi" ? "Lähellä" : "Nearby" },
    { id: "fresh", label: tr("filter_fresh") },
    { id: "shipping", label: tr("filter_shipping") },
  ];

  // Distance from the user to a listing in km, or null if either position is unknown
  const kmTo = (l: ForestListing) => distanceTo(coords, l.lat, l.lng);

  // Clicking "Lähellä" without a position first asks the browser for one
  const handleFilterClick = (id: string) => {
    if (id === "nearby" && !coords) requestLocation();
    setActiveFilter(id);
  };

  const filtered = listings.filter((l) => {
  const km = kmTo(l);
  const type = l.product_type.toLowerCase();
  const matchFilter =
    activeFilter === "all" ||
    (activeFilter === "berries" && type === "marjat") ||
    (activeFilter === "mushrooms" && type === "sienet") ||
    (activeFilter === "fresh" && l.harvested_today) ||
    (activeFilter === "shipping" && l.delivery_available) ||
    (activeFilter === "nearby" && km != null && km <= NEARBY_KM);

  const q = search.toLowerCase();
  const matchSearch = !q ||
    l.product_name.toLowerCase().includes(q) ||
    l.city.toLowerCase().includes(q) ||
    (l.description?.toLowerCase().includes(q) ?? false);

  return matchFilter && matchSearch;
});

  return (
    <>
      {selected ? (
        // Detail page for the clicked listing
        <ForestListingDetail
          listing={selected}
          lang={lang}
          contacted={contactedId === selected.id}
          onBack={() => setSelected(null)}
          onContact={() => setContactTarget(selected)}
          distanceLabel={formatDistance(kmTo(selected))}
        />
      ) : (
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
                onClick={() => handleFilterClick(chip.id)}
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

          {/* Location status: explains distances and lets the user turn them on */}
          {!coords && (
            <div className="-mt-4 mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {locationStatus === "loading" && <span>{lang === "fi" ? "Haetaan sijaintia…" : "Getting your location…"}</span>}
              {locationStatus === "denied" && (
                <span>
                  {lang === "fi"
                    ? "Sijainti on estetty selaimen asetuksissa, joten etäisyyksiä ei näytetä."
                    : "Location is blocked in your browser settings, so distances aren't shown."}
                </span>
              )}
              {locationStatus === "unavailable" && (
                <span>{lang === "fi" ? "Sijaintia ei saatu selvitettyä." : "Your location couldn't be found."}</span>
              )}
              {locationStatus === "idle" && (
                <>
                  <span>{lang === "fi" ? "Näe, kuinka kaukana ilmoitukset ovat." : "See how far away listings are."}</span>
                  <button
                    onClick={requestLocation}
                    className="px-3 py-1 rounded-full border border-primary/40 text-primary hover:bg-primary/5 transition-colors"
                  >
                    {lang === "fi" ? "Käytä sijaintiani" : "Use my location"}
                  </button>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((listing) => (
              <ForageCard
                key={listing.id}
                listing={listing}
                lang={lang}
                tr={tr}
                contacted={contactedId === listing.id}
                onContact={() => setContactTarget(listing)}
                onSelect={() => { setSelected(listing); window.scrollTo({ top: 0 }); }}
                distanceLabel={coords ? formatDistance(kmTo(listing)) : null}
              />
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Contact modal — shared by the grid and the detail page */}
      <ContactFormModal
          open={contactTarget !== null}
          onClose={() => setContactTarget(null)}
          recipientName={contactTarget?.seller_name}
          listingTitle={contactTarget?.product_name}
          listingId={contactTarget?.id}
          listingType="forest"
          sellerId={contactTarget?.seller_id} 
          
          onSuccess={handleContactSuccess}
        />
    </>
  );
}

/** ForageCard component displays individual forest listing details. */
function ForageCard({
  listing,
  lang,
  tr,
  contacted,
  onContact,
  onSelect,
  distanceLabel,
}: {
  listing: ForestListing;
  lang: string;
  tr: (k: any) => string;
  contacted: boolean;
  onContact: () => void;
  onSelect: () => void;
  distanceLabel: string | null; // "12 km", or null when the user's location isn't known
}) {
  const product = listing.product_name;
  const category = listing.product_type === "marjat" ? (lang === "fi" ? "Marjat" : "Berries") : listing.product_type === "sienet" ? (lang === "fi" ? "Sienet" : "Mushrooms") : (lang === "fi" ? "Muut" : "Other");
  const region = `${listing.city}, ${listing.region}`;
  const description = listing.description ?? "";
  const posted = listing.created_at ? new Date(listing.created_at).toLocaleDateString(lang === "fi" ? "fi-FI" : "en-GB") : "";
  const categoryIcon = listing.product_type === "marjat" ? "🫐" : "🍄";
  const sellerInitials = listing.seller_name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div
      onClick={onSelect}
      className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200 group cursor-pointer"
    >
      <div className="relative overflow-hidden" style={{ height: 200, background: "#E8E4DA" }}>
        <img
          src={listing.primary_image_url ?? "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&h=520&fit=crop&auto=format"}
          alt={product}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5">
          <span>{categoryIcon}</span>
          <span>{category}</span>
        </div>
        {listing.harvested_today && (
          <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-medium px-2.5 py-1 rounded-full">
            {lang === "fi" ? "Tänään kerätty" : "Harvested today"}
          </div>
        )}
        <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
          {listing.quantity} {listing.unit} {lang === "fi" ? "saatavilla" : "available"}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold flex-shrink-0">
            {listing.seller_avatar
              ? <img src={listing.seller_avatar} alt={listing.seller_name} className="w-full h-full rounded-full object-cover" />
              : sellerInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground">{listing.seller_name}</span>
              {listing.identity_verified && (
                <svg className="w-3.5 h-3.5 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {region}
                {distanceLabel && <span className="text-foreground font-medium">· {distanceLabel}</span>}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {posted}
              </span>
            </div>
          </div>
        </div>

        <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-base mb-1">
          {product}
        </h3>
        <p className="text-muted-foreground text-xs mb-3 line-clamp-2">{description}</p>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div>
            <div className="flex items-baseline gap-1">
              <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "1.1rem" }} className="text-primary">
                €{Number(listing.price_per_unit).toFixed(2)}
              </span>
              <span className="text-muted-foreground text-xs">/ {listing.unit}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {lang === "fi" ? "Yhteensä" : "Total"}: €{(listing.price_per_unit * listing.quantity).toFixed(2)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-lg border border-border hover:border-primary/30 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onContact(); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                contacted
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {contacted ? (
                <>{lang === "fi" ? "Lähetetty" : "Sent"}</>
              ) : (
                <>{lang === "fi" ? "Ota yhteyttä" : "Contact"}</>
              )}
            </button>
          </div>
        </div>

        {listing.delivery_available && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-primary">
            <Scale className="w-3 h-3" />
            {lang === "fi" ? "Toimitus saatavilla" : "Delivery available"}
          </div>
        )}
      </div>
    </div>
  );
}
