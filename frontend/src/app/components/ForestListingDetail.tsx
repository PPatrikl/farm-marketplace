// frontend/src/app/components/ForestListingDetail.tsx
//
// Detail view for a single Metsätori (forest) listing.
// Opened from ForagerMarket when a ForageCard is clicked.

import { ArrowLeft, MapPin, Clock, Scale, Truck, ShieldCheck, Star } from "lucide-react";
import type { ForestListing } from "../../services/forestListings";
import { LocationMap } from "./LocationMap";

interface ForestListingDetailProps {
  listing: ForestListing;
  lang: string;
  contacted: boolean;
  onBack: () => void;
  onContact: () => void;
  /** "12 km" from the user, or "— km" when unknown */
  distanceLabel?: string;
}

// Database stores "litre", but on screen we want "L"
const unitLabel = (unit: string) => (unit === "litre" ? "L" : unit);

export function ForestListingDetail({ listing, lang, contacted, onBack, onContact, distanceLabel }: ForestListingDetailProps) {
  const fi = lang === "fi";
  const unit = unitLabel(listing.unit);

  const category =
    listing.product_type === "marjat" ? (fi ? "Marjat" : "Berries")
    : listing.product_type === "sienet" ? (fi ? "Sienet" : "Mushrooms")
    : (fi ? "Muut" : "Other");
  const categoryIcon = listing.product_type === "marjat" ? "🫐" : "🍄";

  const posted = listing.created_at
    ? new Date(listing.created_at).toLocaleDateString(fi ? "fi-FI" : "en-GB")
    : "";
  const harvested = listing.harvested_at
    ? new Date(listing.harvested_at).toLocaleDateString(fi ? "fi-FI" : "en-GB")
    : null;

  const sellerInitials = listing.seller_name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  const total = (listing.price_per_unit * listing.quantity).toFixed(2);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {fi ? "Takaisin Metsätoriin" : "Back to market"}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: image + description ── */}
          <div className="lg:col-span-2 space-y-5">
            <div className="relative rounded-2xl overflow-hidden bg-secondary" style={{ height: 360 }}>
              <img
                src={listing.primary_image_url ?? "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&h=700&fit=crop&auto=format"}
                alt={listing.product_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-sm font-medium px-3 py-1 rounded-full flex items-center gap-1.5">
                <span>{categoryIcon}</span>
                <span>{category}</span>
              </div>
              {listing.harvested_today && (
                <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-sm font-medium px-3 py-1 rounded-full">
                  {fi ? "Tänään kerätty" : "Harvested today"}
                </div>
              )}
            </div>

            <div className="bg-card rounded-2xl border border-border p-6">
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-3xl mb-2">
                {listing.product_name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-5">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {listing.city}, {listing.region}
                  {distanceLabel && distanceLabel !== "— km" && (
                    <span className="text-foreground font-medium">· {distanceLabel}</span>
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {fi ? "Julkaistu" : "Posted"} {posted}
                </span>
              </div>

              <h2 className="text-sm font-medium text-foreground mb-2">{fi ? "Kuvaus" : "Description"}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                {listing.description || (fi ? "Ei kuvausta." : "No description.")}
              </p>
            </div>

            {/* Product facts */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-sm font-medium text-foreground mb-4">{fi ? "Tuotetiedot" : "Product details"}</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">{fi ? "Määrä" : "Quantity"}:</span>
                  <span className="text-foreground font-medium">{listing.quantity} {unit}</span>
                </div>
                {harvested && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">{fi ? "Kerätty" : "Harvested"}:</span>
                    <span className="text-foreground font-medium">{harvested}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">{fi ? "Toimitus" : "Delivery"}:</span>
                  <span className="text-foreground font-medium">
                    {listing.delivery_available ? (fi ? "Saatavilla" : "Available") : (fi ? "Vain nouto" : "Pickup only")}
                  </span>
                </div>
              </div>
            </div>

            {/* Location map */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-sm font-medium text-foreground mb-4">{fi ? "Sijainti" : "Location"}</h2>
              <LocationMap
                lat={listing.lat}
                lng={listing.lng}
                label={`${listing.city}, ${listing.region}`}
                lang={lang}
              />
            </div>
          </div>

          {/* ── Right: price + seller + contact ── */}
          <div className="space-y-5">
            <div className="bg-card rounded-2xl border border-border p-6 lg:sticky lg:top-24">
              <div className="flex items-baseline gap-1 mb-1">
                <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "2rem" }} className="text-primary">
                  €{Number(listing.price_per_unit).toFixed(2)}
                </span>
                <span className="text-muted-foreground text-sm">/ {unit}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                {fi ? "Yhteensä" : "Total"}: €{total} ({listing.quantity} {unit})
              </p>

              <button
                onClick={onContact}
                className={`w-full py-3 rounded-xl text-sm font-medium transition-all ${
                  contacted
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {contacted ? (fi ? "Viesti lähetetty" : "Message sent") : (fi ? "Ota yhteyttä" : "Contact seller")}
              </button>

              {/* Seller */}
              <div className="mt-6 pt-5 border-t border-border">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">{fi ? "Myyjä" : "Seller"}</p>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold overflow-hidden flex-shrink-0">
                    {listing.seller_avatar
                      ? <img src={listing.seller_avatar} alt={listing.seller_name} className="w-full h-full object-cover" />
                      : sellerInitials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{listing.seller_name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="w-3 h-3 text-yellow-500" fill="currentColor" />
                      {Number(listing.seller_rating ?? 0).toFixed(1)} ({listing.seller_review_count ?? 0})
                    </div>
                  </div>
                </div>
                {listing.identity_verified && (
                  <div className="flex items-center gap-1.5 text-xs text-primary mt-3">
                    <ShieldCheck className="w-4 h-4" />
                    {fi ? "Henkilöllisyys vahvistettu" : "Identity verified"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
