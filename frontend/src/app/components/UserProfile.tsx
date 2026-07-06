import {
  User, MapPin, Camera, Plus, Star, ChevronRight,
  Sprout, Trees, Briefcase, CheckCircle, Upload
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLang } from "../i18n/LanguageContext";
import type { UserProfile as UserProfileData } from "../types";

const regions_fi = [
  "Uusimaa", "Pirkanmaa", "Varsinais-Suomi", "Kanta-Häme", "Päijät-Häme",
  "Kymenlaakso", "Etelä-Karjala", "Pohjois-Karjala", "Keski-Suomi",
  "Pohjois-Pohjanmaa", "Lappi",
];
const regions_en = [
  "Uusimaa", "Pirkanmaa", "Varsinais-Suomi", "Kanta-Häme", "Päijät-Häme",
  "Kymenlaakso", "South Karelia", "North Karelia", "Central Finland",
  "Northern Ostrobothnia", "Lapland",
];

type ListingStatus = "active" | "inactive";

type UserListing = {
  id: string;
  title: string;
  category: string;
  status: ListingStatus;
  views: number;
  contacts: number;
  posted: string;
  type: "forager" | "farmer";
  price?: string;
  unit?: string;
  volume?: string;
  location?: string;
  region?: string;
  description?: string;
  delivery?: boolean;
  shipping?: boolean;
};

const listingStorageKey = (email: string | null) =>
  `farm-marketplace-listings:${email?.toLowerCase().trim() || "guest"}`;

const profileStorageKey = (email: string | null) =>
  `farm-marketplace-profile:${email?.toLowerCase().trim() || "guest"}`;

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(date);

const formatMemberSince = (createdAt?: string) => {
  if (!createdAt) return "-";

  const parsed = new Date(createdAt);

  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("fi-FI", {
    month: "long",
    year: "numeric",
  }).format(parsed);
};

const formatCategoryLabel = (lang: "fi" | "en", category: string) => {
  if (category === "berries") return lang === "fi" ? "Luonnonmarjat" : "Wild Berries";
  if (category === "mushrooms") return lang === "fi" ? "Sienet" : "Mushrooms";
  if (category === "picking") return lang === "fi" ? "Itsepoiminta" : "Pick-Your-Own";
  if (category === "job") return lang === "fi" ? "Kausityö" : "Seasonal Job";
  return lang === "fi" ? "Vihannekset" : "Vegetables";
};

const buildUserRating = (email?: string) => {
  return {
    rating: 0,
    reviews: 0,
  };
};

const safeReadJson = <T,>(key: string, fallback: T) => {
  if (typeof window === "undefined") return fallback;

  const raw = window.localStorage.getItem(key);

  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
};

const safeWriteJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

interface UserProfileProps {
  currentUser: UserProfileData | null;
}

export function UserProfile({ currentUser }: UserProfileProps) {
  const { tr, lang } = useLang();
  const [role, setRole] = useState<"picker" | "farmer">(currentUser?.role ?? "picker");
  const [activeTab, setActiveTab] = useState<"profile" | "create">("profile");
  const [form, setForm] = useState({
    title: "",
    category: "",
    price: "",
    unit: "kg",
    volume: "",
    location: "",
    region: "",
    description: "",
    phone: "",
    delivery: false,
    shipping: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [listings, setListings] = useState<UserListing[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  const displayName = currentUser?.name?.trim() || tr("profile_title");
  const displayLocation = currentUser?.location?.trim() || tr("profile_location");
  const derivedRating = buildUserRating(currentUser?.email);
  const displayRating = currentUser?.rating?.toFixed(1) ?? derivedRating.rating.toFixed(1);
  const displayReviews = currentUser?.reviews ?? derivedRating.reviews;
  const storageKey = profileStorageKey(currentUser?.email ?? null);
  const storageListingsKey = listingStorageKey(currentUser?.email ?? null);

  useEffect(() => {
    if (currentUser?.role) {
      setRole(currentUser.role);
    }
  }, [currentUser?.role]);

  useEffect(() => {
    const savedProfile = safeReadJson<{ role?: "picker" | "farmer" }>(storageKey, {});
    if (savedProfile.role) {
      setRole(savedProfile.role);
    }

    const savedListings = safeReadJson<UserListing[]>(storageListingsKey, []);
    const cleanedListings = savedListings.filter((listing) => !listing.id.startsWith("seed-"));
    setListings(cleanedListings);
    setSelectedListingId((current) => (cleanedListings.some((listing) => listing.id === current) ? current : null));
  }, [currentUser?.email, currentUser?.role, storageKey, storageListingsKey]);

  useEffect(() => {
    safeWriteJson(storageKey, { role });
  }, [role, storageKey]);

  useEffect(() => {
    safeWriteJson(storageListingsKey, listings);
  }, [listings, storageListingsKey]);

  const stats = useMemo(() => {
    const totalListings = listings.length;
    const activeListings = listings.filter((listing) => listing.status === "active").length;
    const totalContacts = listings.reduce((sum, listing) => sum + listing.contacts, 0);
    const totalViews = listings.reduce((sum, listing) => sum + listing.views, 0);

    return [
      { labelKey: "profile_stat_listings" as const, value: String(totalListings) },
      { labelKey: "profile_stat_active" as const, value: String(activeListings) },
      { labelKey: "profile_stat_contacts" as const, value: String(totalContacts || totalViews) },
      { labelKey: "profile_stat_member" as const, value: formatMemberSince(currentUser?.createdAt) },
    ];
  }, [currentUser?.createdAt, listings]);

  const selectedListing = listings.find((listing) => listing.id === selectedListingId) || null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newListing: UserListing = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: form.title.trim(),
      category: form.category,
      status: "active",
      views: 0,
      contacts: 0,
      posted: formatDate(new Date()),
      type: role === "farmer" ? "farmer" : "forager",
      price: form.price,
      unit: form.unit,
      volume: form.volume,
      location: form.location,
      region: form.region,
      description: form.description,
      delivery: form.delivery,
      shipping: form.shipping,
    };

    setListings((current) => [newListing, ...current]);
    setSelectedListingId(newListing.id);
    setSubmitted(true);
    setForm({
      title: "",
      category: "",
      price: "",
      unit: "kg",
      volume: "",
      location: "",
      region: "",
      description: "",
      phone: "",
      delivery: false,
      shipping: false,
    });
    setTimeout(() => setSubmitted(false), 3000);
  };

  const pickerCategories = [
    { id: "berries", labelKey: "form_cat_berries" as const, icon: "🫐" },
    { id: "mushrooms", labelKey: "form_cat_mushrooms" as const, icon: "🍄" },
    { id: "herbs", labelKey: "form_cat_herbs" as const, icon: "🌿" },
    { id: "vegetables", labelKey: "form_cat_vegetables" as const, icon: "🥕" },
  ];
  const farmerCategories = [
    { id: "picking", labelKey: "form_cat_picking" as const, icon: "🍓" },
    { id: "job", labelKey: "form_cat_job" as const, icon: "🌾" },
    { id: "vegetables", labelKey: "form_cat_vegetables" as const, icon: "🥕" },
  ];

  const cats = role === "picker" ? pickerCategories : farmerCategories;
  const regions = lang === "fi" ? regions_fi : regions_en;

  const tabs = [
    { id: "profile", labelKey: "profile_tab_profile" as const },
    { id: "create", labelKey: "profile_tab_create" as const },
  ];

  const listingCountText = listings.length === 0
    ? lang === "fi"
      ? "Ei vielä omia ilmoituksia"
      : "No listings yet"
    : null;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-medium"
                style={{ background: "linear-gradient(135deg, #2A5012, #4A7C2F)", fontFamily: "'Fraunces', serif" }}
              >
                {displayName
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors">
                <Camera className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-2xl mb-0.5">
                {displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-sm">
                <span className="flex items-center gap-1 min-w-0">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{displayLocation}</span>
                </span>
                <span className="hidden sm:inline text-border">·</span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <Star className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" fill="currentColor" />
                  <span className="text-foreground">{displayRating}</span>
                  <span className="text-muted-foreground">({displayReviews} {lang === "fi" ? "arvostelua" : "reviews"})</span>
                </span>
              </div>
            </div>
            {/* Role toggle */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
                <button
                  onClick={() => setRole("picker")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    role === "picker" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Trees className="w-4 h-4" />
                  {tr("profile_role_picker")}
                </button>
                <button
                  onClick={() => setRole("farmer")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    role === "farmer" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sprout className="w-4 h-4" />
                  {tr("profile_role_farmer")}
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "profile" | "create")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {tr(tab.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "profile" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground mb-4">
                  {tr("profile_stats_title")}
                </h3>
                <div className="space-y-3">
                  {stats.map((s) => (
                    <div key={s.labelKey} className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">{tr(s.labelKey)}</span>
                      <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground mb-4">
                  {tr("profile_verified_title")}
                </h3>
                <div className="space-y-2">
                  {[
                    { labelKey: "profile_verified_phone" as const, ok: true },
                    { labelKey: "profile_verified_id" as const, ok: true },
                    { labelKey: "profile_verified_food" as const, ok: false },
                  ].map((b) => (
                    <div key={b.labelKey} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: b.ok ? "#2A5012" : "#C2BDB0" }} />
                      <span className={`text-sm ${b.ok ? "text-foreground" : "text-muted-foreground"}`}>
                        {tr(b.labelKey)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* My listings */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-xl">
                  {tr("profile_listings_title")}
                </h2>
                <button
                  onClick={() => setActiveTab("create")}
                  className="flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {tr("profile_btn_new")}
                </button>
              </div>

              <div className="space-y-3">
                {listings.length === 0 ? (
                  <div className="bg-card rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground text-sm">
                    {listingCountText}
                  </div>
                ) : listings.map((listing) => {
                  const status = tr(listing.status === "active" ? "profile_status_active" : "profile_status_inactive");
                  const isActive = listing.status === "active";
                  const categoryLabel = formatCategoryLabel(lang, listing.category);
                  const isSelected = selectedListingId === listing.id;
                  return (
                    <div
                      key={listing.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedListingId((current) => (current === listing.id ? null : listing.id))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedListingId((current) => (current === listing.id ? null : listing.id));
                        }
                      }}
                      className={`bg-card rounded-2xl border p-4 flex flex-col gap-3 transition-colors cursor-pointer group outline-none sm:flex-row sm:items-center sm:gap-4 ${
                        isSelected ? "border-primary shadow-sm" : "border-border hover:border-primary/20"
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 self-start sm:self-auto"
                        style={{ background: listing.type === "forager" ? "#EEF4E9" : "#EDF4E8" }}
                      >
                        {listing.type === "forager" ? (
                          <Trees className="w-5 h-5 text-primary" />
                        ) : (
                          <Briefcase className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-foreground text-sm font-medium leading-5">{listing.title}</p>
                          <span
                            className="whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-medium"
                            style={{
                              background: isActive ? "#EDF4E8" : "#EAE7E0",
                              color: isActive ? "#2A5012" : "#6B6860",
                            }}
                          >
                            {status}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
                          <span className="whitespace-nowrap">{listing.posted}</span>
                          <span className="hidden sm:inline text-border">·</span>
                          <span className="whitespace-nowrap">{categoryLabel}</span>
                          <span className="hidden sm:inline text-border">·</span>
                          <span className="whitespace-nowrap">{listing.location || displayLocation}</span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="whitespace-nowrap px-2 py-1 rounded-full bg-secondary/50">{listing.views} {tr("profile_listing_views")}</span>
                          <span className="whitespace-nowrap px-2 py-1 rounded-full bg-secondary/50">{listing.contacts} {tr("profile_listing_contacts")}</span>
                          {listing.price ? (
                            <span className="whitespace-nowrap px-2 py-1 rounded-full bg-secondary/50">
                              {listing.price}{listing.unit ? ` / ${listing.unit}` : ""}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 flex-shrink-0 sm:justify-end">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setListings((current) => current.map((item) => (
                              item.id === listing.id
                                ? { ...item, status: item.status === "active" ? "inactive" : "active" }
                                : item
                            )));
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors whitespace-nowrap"
                        >
                          {listing.status === "active"
                            ? (lang === "fi" ? "Merkitse ei-aktiiviseksi" : "Mark inactive")
                            : (lang === "fi" ? "Merkitse aktiiviseksi" : "Mark active")}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            const confirmDelete = window.confirm(
                              lang === "fi"
                                ? "Poistetaanko ilmoitus?"
                                : "Delete this listing?"
                            );
                            if (!confirmDelete) return;
                            setListings((current) => current.filter((item) => item.id !== listing.id));
                            setSelectedListingId((current) => (current === listing.id ? null : current));
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent hover:bg-accent/15 transition-colors whitespace-nowrap"
                        >
                          {lang === "fi" ? "Poista" : "Delete"}
                        </button>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </div>
                  );
                })}
              </div>

              {selectedListing && (
                <div className="mt-5 bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                        {lang === "fi" ? "Valittu ilmoitus" : "Selected listing"}
                      </p>
                      <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-lg">
                        {selectedListing.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        {formatCategoryLabel(lang, selectedListing.category)} · {selectedListing.posted}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: selectedListing.status === "active" ? "#EDF4E8" : "#EAE7E0",
                          color: selectedListing.status === "active" ? "#2A5012" : "#6B6860",
                        }}
                      >
                        {tr(selectedListing.status === "active" ? "profile_status_active" : "profile_status_inactive")}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setListings((current) => current.map((item) => (
                            item.id === selectedListing.id
                              ? { ...item, status: item.status === "active" ? "inactive" : "active" }
                              : item
                          )));
                        }}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                      >
                        {selectedListing.status === "active"
                          ? (lang === "fi" ? "Ei aktiivinen" : "Inactive")
                          : (lang === "fi" ? "Aktiivinen" : "Active")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const confirmDelete = window.confirm(
                            lang === "fi"
                              ? "Poistetaanko ilmoitus?"
                              : "Delete this listing?"
                          );
                          if (!confirmDelete) return;
                          setListings((current) => current.filter((item) => item.id !== selectedListing.id));
                          setSelectedListingId(null);
                        }}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                      >
                        {lang === "fi" ? "Poista" : "Delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedListingId(null)}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                      >
                        {lang === "fi" ? "Sulje" : "Close"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-secondary/30 p-3">
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">{lang === "fi" ? "Hinta" : "Price"}</p>
                      <p className="text-foreground font-medium mt-1">
                        {selectedListing.price
                          ? `${selectedListing.price}${selectedListing.unit ? ` / ${selectedListing.unit}` : ""}`
                          : "-"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-secondary/30 p-3">
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">{lang === "fi" ? "Sijainti" : "Location"}</p>
                      <p className="text-foreground font-medium mt-1">{selectedListing.location || displayLocation}</p>
                    </div>
                    <div className="rounded-xl bg-secondary/30 p-3">
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">{lang === "fi" ? "Maakunta" : "Region"}</p>
                      <p className="text-foreground font-medium mt-1">{selectedListing.region || "-"}</p>
                    </div>
                    <div className="rounded-xl bg-secondary/30 p-3">
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">{lang === "fi" ? "Määrä" : "Amount"}</p>
                      <p className="text-foreground font-medium mt-1">{selectedListing.volume || "-"}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">{lang === "fi" ? "Kuvaus" : "Description"}</p>
                      <p className="text-sm text-foreground whitespace-pre-line">
                        {selectedListing.description || (lang === "fi" ? "Ei kuvausta vielä." : "No description yet.")}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                        {selectedListing.delivery
                          ? lang === "fi" ? "Paikallinen toimitus" : "Local delivery"
                          : lang === "fi" ? "Ei paikallista toimitusta" : "No local delivery"}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                        {selectedListing.shipping
                          ? lang === "fi" ? "Valtakunnallinen toimitus" : "Nationwide shipping"
                          : lang === "fi" ? "Ei valtakunnallista toimitusta" : "No nationwide shipping"}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{selectedListing.views} {tr("profile_listing_views")}</span>
                      <span>{selectedListing.contacts} {tr("profile_listing_contacts")}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-6 py-5 border-b border-border">
                <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-xl">
                  {tr("form_title")}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {role === "picker" ? tr("form_subtitle_picker") : tr("form_subtitle_farmer")}
                </p>
              </div>

              {submitted ? (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-primary" />
                  </div>
                  <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-xl mb-2">
                    {tr("form_success_title")}
                  </h3>
                  <p className="text-muted-foreground text-sm text-center">
                    {tr("form_success_sub")}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{tr("form_label_category")}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {cats.map((cat) => (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => setForm({ ...form, category: cat.id })}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                            form.category === cat.id
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border bg-input-background text-foreground hover:border-primary/30"
                          }`}
                        >
                          <span>{cat.icon}</span>
                          <span className="truncate">{tr(cat.labelKey)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{tr("form_label_title")}</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder={role === "picker" ? tr("form_placeholder_title_picker") : tr("form_placeholder_title_farmer")}
                      className="w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                      required
                    />
                  </div>

                  {/* Price + Unit */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">{tr("form_label_price")}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                        <input
                          type="number"
                          step="0.50"
                          value={form.price}
                          onChange={(e) => setForm({ ...form, price: e.target.value })}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">{tr("form_label_unit")}</label>
                      <select
                        value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                        className="w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30 appearance-none"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        <option value="kg">{tr("form_unit_kg")}</option>
                        <option value="L">{tr("form_unit_L")}</option>
                        <option value="h">{tr("form_unit_h")}</option>
                        <option value="day">{tr("form_unit_day")}</option>
                        <option value="lot">{tr("form_unit_lot")}</option>
                      </select>
                    </div>
                  </div>

                  {/* Volume */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {role === "picker" ? tr("form_label_volume_picker") : tr("form_label_volume_farmer")}
                    </label>
                    <input
                      type="text"
                      value={form.volume}
                      onChange={(e) => setForm({ ...form, volume: e.target.value })}
                      placeholder={role === "picker" ? tr("form_placeholder_volume_picker") : tr("form_placeholder_volume_farmer")}
                      className="w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    />
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">{tr("form_label_city")}</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={form.location}
                          onChange={(e) => setForm({ ...form, location: e.target.value })}
                          placeholder={tr("form_placeholder_city")}
                          className="w-full pl-9 pr-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">{tr("form_label_region")}</label>
                      <select
                        value={form.region}
                        onChange={(e) => setForm({ ...form, region: e.target.value })}
                        className="w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30 appearance-none"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        <option value="">{tr("form_placeholder_region")}</option>
                        {regions.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{tr("form_label_description")}</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder={tr("form_placeholder_description")}
                      rows={3}
                      className="w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30 resize-none"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    />
                  </div>

                  {/* Photo upload */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{tr("form_label_photos")}</label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={() => setDragOver(false)}
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                        dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/30"
                      }`}
                    >
                      <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {tr("form_photo_drag")}{" "}
                        <span className="text-primary font-medium cursor-pointer hover:underline">{tr("form_photo_browse")}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{tr("form_photo_hint")}</p>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="flex items-center gap-6">
                    {(["delivery", "shipping"] as const).map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <div
                          onClick={() => setForm({ ...form, [opt]: !form[opt] })}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            form[opt] ? "border-primary bg-primary" : "border-border bg-input-background"
                          }`}
                        >
                          {form[opt] && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm text-foreground">
                          {opt === "delivery" ? tr("form_opt_delivery") : tr("form_opt_shipping")}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Submit */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      {tr("form_btn_publish")}
                    </button>
                    <p className="text-center text-xs text-muted-foreground mt-3">
                      {tr("form_hint_publish")}
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
