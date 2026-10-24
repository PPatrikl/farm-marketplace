//  UserProfile.tsx
import {
  MapPin, Camera, Plus, Star, Sprout, Trees, CheckCircle, Pencil, Trash2, X, Eye, Phone
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "../i18n/LanguageContext";
import { supabase } from "../../supabaseClient";

import { uploadImages } from '../../services/storage';
import { createForestListing, updateForestListing, deleteForestListing } from '../../services/forestListings';
import { getEffectiveStatus, type PriceUnit, type FarmRecord, type ListingStatus } from '../../services/farmListings';
import { fetchImagesForListing, deleteListingImage, type ListingImageRecord } from '../../services/listingImages';
import { formatShortDate } from "../../utils/dates";
import { useSearchParams } from "react-router";
import { Inbox } from "./Inbox";
import { useUnread } from "../notifications/UnreadContext";

import {
  TextField, TextArea, PriceField, UnitSelect, RegionSelect, Checkbox,
  PhotoDropzone, FormHeader, SubmitBar, SuccessPanel, CategoryPicker,
  UNIT_LABEL_KEYS, UNIT_SHORT, type TrFn,
} from "./farm-listings/sharedFormFields";
import { FarmListingManager, type FarmListingManagerHandle } from "./farm-listings/FarmListingManager";

// forest_listings.product_type expects exactly 'marjat' | 'sienet' | 'muut'.
const pickerCategories = [
  { id: "marjat", labelKey: "form_cat_berries" as const, icon: "🫐" },
  { id: "sienet", labelKey: "form_cat_mushrooms" as const, icon: "🍄" },
  { id: "muut", labelKey: "form_cat_herbs" as const, icon: "🌿" },
];

const EMPTY_PICKER_FORM = {
  title: "", category: "", price: "", unit: "kg" as PriceUnit, volume: "",
  location: "", region: "", description: "", delivery: false, shipping: false,
};

// Normalizes a raw farm_listings / forest_listings row into the shape the UI renders
function normalizeListing(raw: any, lang: string) {
  const isForest = raw.seller_id !== undefined || raw.product_name !== undefined;
  const title = isForest ? (raw.product_name ?? "-") : (raw.title ?? "-");
  const createdAt = raw.created_at ? new Date(raw.created_at) : null;
  const posted = createdAt
    ? createdAt.toLocaleDateString(lang === "fi" ? "fi-FI" : "en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "-";

  const effectiveStatus: ListingStatus | "active" | "inactive" = isForest
    ? ((raw.status ?? "active") as ListingStatus | "active" | "inactive")
    : getEffectiveStatus({ status: raw.status ?? "active", date_end: raw.date_end ?? "9999-12-31" });

  return {
    id: raw.id,
    title,
    type: isForest ? "forager" : "farmer",
    category: isForest ? raw.product_type : raw.type,
    posted,
    views: raw.view_count ?? 0,
    contacts: raw.contact_count ?? 0,
    status: effectiveStatus,
    isForest,
    quantity: isForest ? (raw.quantity ?? null) : (raw.spots_total ?? raw.capacity ?? null),
    unit: (isForest ? raw.unit : raw.price_unit) ?? null,
    price: (isForest ? raw.price_per_unit : raw.price) ?? null,
    dateStart: isForest ? null : (raw.date_start ?? null),
    dateEnd: isForest ? null : (raw.date_end ?? null),
    _raw: raw,
  };
}

const STATUS_LABELS: Record<string, { fi: string; en: string; bg: string; color: string }> = {
  active:   { fi: "Aktiivinen",  en: "Active",  bg: "#EDF4E8", color: "#2A5012" },
  inactive: { fi: "Ei aktiivinen", en: "Inactive", bg: "#EAE7E0", color: "#6B6860" },
  closed:   { fi: "Suljettu",    en: "Closed",  bg: "#EAE7E0", color: "#6B6860" },
  draft:    { fi: "Luonnos",     en: "Draft",   bg: "#F5F0DC", color: "#8A6D1E" },
  expired:  { fi: "Vanhentunut", en: "Expired", bg: "#FAEAEC", color: "#B8293A" },
  sold:     { fi: "Myyty",       en: "Sold",    bg: "#EAE7E0", color: "#6B6860" },
};

function categoryBadgeLabel(listing: { isForest: boolean; category: string }, lang: string) {
  if (listing.isForest) return lang === "fi" ? "METSÄTORI" : "FOREST MARKET";
  return listing.category === "job"
    ? (lang === "fi" ? "KAUSITYÖ" : "SEASONAL WORK")
    : (lang === "fi" ? "TILA" : "FARM");
}

export function UserProfile() {
  const { tr, lang } = useLang();

  const [role, setRole] = useState<'picker' | 'farmer'>('picker');
  const [profile, setProfile] = useState<{
    full_name: string; city: string | null; region: string | null;
    rating: number; review_count: number;
    phone_verified: boolean; identity_verified: boolean; food_licence: boolean;
    is_farmer: boolean; is_collector: boolean; total_sales_eur: number; created_at: string;
  } | null>(null);

  const [forestListings, setForestListings] = useState<any[]>([]);
  const [farmListings, setFarmListings] = useState<any[]>([]);
  const myListings = useMemo(() => [...farmListings, ...forestListings], [farmListings, forestListings]);

  const [farm, setFarm] = useState<FarmRecord | null>(null);
  const farmManagerRef = useRef<FarmListingManagerHandle>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // The open tab lives in the URL (?tab=create / ?tab=inbox), so the bell can link
  // straight to the inbox and the browser's Back button works between tabs.
  type Tab = "profile" | "create" | "inbox";
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: Tab = tabParam === "create" || tabParam === "inbox" ? tabParam : "profile";
  const setActiveTab = (tab: Tab) => setSearchParams(tab === "profile" ? {} : { tab });
  const { count: unread } = useUnread();
  const [dragOver, setDragOver] = useState(false);

  const [pickerForm, setPickerForm] = useState(EMPTY_PICKER_FORM);
  const [existingImages, setExistingImages] = useState<ListingImageRecord[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

  const [editingListing, setEditingListing] = useState<{ id: string; isForest: boolean } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [lastSavedWasEdit, setLastSavedWasEdit] = useState(false);

  const [profileNotice, setProfileNotice] = useState<null | { edit: boolean }>(null);

  useEffect(() => {
    async function loadProfileAndForestListings() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        if (authError) console.error("Failed to load user:", authError.message);
        return;
      }

      const [profileRes, forestListingsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('forest_listings').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }),
      ]);

      if (profileRes.error) console.error("Failed to load profile:", profileRes.error.message);
      if (forestListingsRes.error) console.error("Failed to load forest listings:", forestListingsRes.error.message);

      if (profileRes.data) {
        setProfile(profileRes.data);
        if (profileRes.data.is_farmer) setRole("farmer");
      }

      setForestListings((forestListingsRes.data || []).map((raw) => normalizeListing(raw, lang)));
    }

    loadProfileAndForestListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetAllForms() {
    setEditingListing(null);
    setPickerForm(EMPTY_PICKER_FORM);
    setExistingImages([]);
    setDeletedImageIds([]);
    setSelectedFiles([]);
    farmManagerRef.current?.resetForms();
  }

  function handleDeleteExistingImage(id: string) {
    setDeletedImageIds((prev) => [...prev, id]);
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
  }

  function finishSaving(wasEdit: boolean) {
    setSubmitted(true);
    setLastSavedWasEdit(wasEdit);
    resetAllForms();
    setActiveTab("profile");
    setProfileNotice({ edit: wasEdit });
    setTimeout(() => {
      setSubmitted(false);
      setProfileNotice(null);
    }, 3000);
  }

  // ── Picker (forest) submit 
  async function handlePickerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert("Please log in first"); setIsSubmitting(false); return; }

      if (deletedImageIds.length > 0) {
        await Promise.all(deletedImageIds.map((id) => deleteListingImage(id)));
      }
      const parsedPrice = parseFloat(pickerForm.price);
        if (!pickerForm.price || isNaN(parsedPrice) || parsedPrice <= 0) {
          alert(lang === "fi" ? "Anna hinta, joka on suurempi kuin 0." : "Please enter a price greater than 0.");
          return;
        }
        
      const uploadedImages = selectedFiles.length > 0 ? await uploadImages(selectedFiles) : [];
      const payload = {
        product_name: pickerForm.title,
        product_type: pickerForm.category,
        price_per_unit: parsedPrice,
        unit: pickerForm.unit,
        quantity: parseFloat(pickerForm.volume) || 0,
        city: pickerForm.location,
        region: pickerForm.region,
        description: pickerForm.description,
        delivery_available: pickerForm.delivery,
        pickup_only: !pickerForm.delivery,
        images: uploadedImages,
      };

      const resultListing = editingListing
        ? await updateForestListing(editingListing.id, payload)
        : await createForestListing({ seller_id: user.id, ...payload });

      if (resultListing) {
        const normalized = normalizeListing(resultListing, lang);
        setForestListings((prev) =>
          editingListing ? prev.map((l) => (l.id === normalized.id ? normalized : l)) : [normalized, ...prev]
        );
      }

      finishSaving(Boolean(editingListing));
    } catch (error: any) {
      console.error("Error saving listing:", error);
      alert(`Failed to save listing: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(listing: any, next: 'active' | 'closed' | 'draft') {
    try {
      await farmManagerRef.current?.changeStatus(listing, next);
    } catch (error: any) {
      console.error("Error changing listing status:", error);
      alert(`Failed to update status: ${error.message || 'Unknown error'}`);
    }
  }

  function startEdit(listing: any) {
    const raw = listing._raw;
    const isForest = listing.isForest;
    setSubmitted(false);
    setEditingListing({ id: listing.id, isForest });

    if (isForest) {
      setRole("picker");
      setDeletedImageIds([]);
      fetchImagesForListing(listing.id, 'forest').then(setExistingImages);
      setPickerForm({
        title: raw.product_name ?? "",
        category: raw.product_type ?? "",
        price: String(raw.price_per_unit ?? ""),
        unit: (raw.unit ?? "kg") as PriceUnit,
        volume: String(raw.quantity ?? ""),
        location: raw.city ?? "",
        region: raw.region ?? "",
        description: raw.description ?? "",
        delivery: Boolean(raw.delivery_available),
        shipping: false,
      });
      setSelectedFiles([]);
    } else {
      setRole("farmer");
      farmManagerRef.current?.startEdit(listing);
    }

    setActiveTab("create");
  }

  function cancelEdit() {
    resetAllForms();
    setActiveTab("profile");
  }

  async function handleDelete(listing: any) {
    const confirmMsg = lang === "fi"
      ? "Haluatko varmasti poistaa tämän ilmoituksen?"
      : "Are you sure you want to delete this listing?";
    if (!window.confirm(confirmMsg)) return;

    try {
      if (listing.isForest) {
        await deleteForestListing(listing.id);
        setForestListings((prev) => prev.filter((l) => l.id !== listing.id));
      } else {
        await farmManagerRef.current?.deleteListing(listing);
      }
    } catch (error: any) {
      console.error("Error deleting listing:", error);
      alert(`Failed to delete listing: ${error.message || 'Unknown error'}`);
    }
  }

  const tabs = [
    { id: "profile", labelKey: "profile_tab_profile" as const },
    { id: "create", labelKey: "profile_tab_create" as const },
    { id: "inbox", labelKey: "profile_tab_inbox" as const },
  ];

  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'MK';

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative flex-shrink-0">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-medium"
                style={{ background: "linear-gradient(135deg, #2A5012, #4A7C2F)", fontFamily: "'Fraunces', serif" }}
              >
                {initials}
              </div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors">
                <Camera className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1">
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-2xl mb-0.5">
                {profile?.full_name ?? tr("profile_title")}
              </h1>
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <MapPin className="w-3.5 h-3.5" />
                <span>{profile ? `${profile.city ?? ''}, ${profile.region ?? ''}` : tr("profile_location")}</span>
                <span className="mx-2">·</span>
                <Star className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" />
                <span className="text-foreground">{profile?.rating ?? 0}</span>
                <span className="text-muted-foreground">({profile?.review_count ?? 0} {lang === "fi" ? "arvostelua" : "reviews"})</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
                <button
                  onClick={() => !editingListing && setRole("picker")}
                  disabled={Boolean(editingListing)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    role === "picker" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Trees className="w-4 h-4" />
                  {tr("profile_role_picker")}
                </button>
                <button
                  onClick={() => !editingListing && setRole("farmer")}
                  disabled={Boolean(editingListing)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    role === "farmer" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sprout className="w-4 h-4" />
                  {tr("profile_role_farmer")}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-1 mt-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {tr(tab.labelKey)}
                {tab.id === "inbox" && unread > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-semibold">
                    {unread}
                  </span>
                )}
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
                  {[
                    { labelKey: "profile_stat_listings" as const, value: String(myListings.length) },
                    { labelKey: "profile_stat_sold" as const, value: `€ ${profile?.total_sales_eur ?? 0}` },
                    { labelKey: "profile_stat_buyers" as const, value: String(profile?.review_count ?? 0) },
                    { labelKey: "profile_stat_member" as const, value: profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString(lang === "fi" ? "fi-FI" : "en-GB", { month: "long", year: "numeric" })
                      : "-" },
                  ].map((s) => (
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
                    { labelKey: "profile_verified_phone" as const, ok: profile?.phone_verified ?? false },
                    { labelKey: "profile_verified_id" as const, ok: profile?.identity_verified ?? false },
                    { labelKey: "profile_verified_food" as const, ok: profile?.food_licence ?? false },
                  ].map((b) => (
                    <div key={b.labelKey} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: b.ok ? "#2A5012" : "#C2BDB0" }} />
                      <span className={`text-sm ${b.ok ? "text-foreground" : "text-muted-foreground"}`}>{tr(b.labelKey)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {farm && (
                <button
                  type="button"
                  onClick={() => {
                    resetAllForms();
                    setRole("farmer");
                    setActiveTab("create");
                    farmManagerRef.current?.setView("farm");
                  }}
                  className="w-full text-left bg-card rounded-2xl border border-border p-5 hover:border-primary/30 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground">
                      {lang === "fi" ? "Tilani" : "My farm"}
                    </h3>
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-foreground text-sm font-medium">{farm.name}</p>
                  <p className="text-muted-foreground text-xs mt-1">{farm.city}, {farm.region}</p>
                </button>
              )}
            </div>

            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-xl">
                  {tr("profile_listings_title")}
                </h2>
                <button
                  onClick={() => {
                    resetAllForms();
                    setActiveTab("create");
                    farmManagerRef.current?.setView("listing");
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {tr("profile_btn_new")}
                </button>
              </div>

              {profileNotice && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2 text-sm text-primary">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  {profileNotice.edit
                    ? (lang === "fi" ? "Muutokset tallennettu." : "Changes saved.")
                    : (lang === "fi" ? "Ilmoitus julkaistu." : "Listing published.")}
                </div>
              )}

              <div className="space-y-3">
                {myListings.map((listing) => {
                  const statusInfo = STATUS_LABELS[listing.status] ?? STATUS_LABELS.active;
                  const dateRangeLabel = listing.dateStart && listing.dateEnd
                    ? `${formatShortDate(listing.dateStart)} – ${formatShortDate(listing.dateEnd, true)}`
                    : null;

                  const priceLabel = listing.price
                    ? `€${Number(listing.price).toFixed(2)}${listing.unit ? "/" + (UNIT_SHORT[listing.unit as PriceUnit] ?? listing.unit) : ""}`
                    : null;

                  return (
                    <div
                      key={listing.id}
                      className="bg-card rounded-2xl border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:border-primary/20 transition-colors group"
                    >
                      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                          style={{ background: "#EDF4E8" }}
                        >
                          {listing.isForest ? (
                            <Trees className="w-5 h-5 text-primary" />
                          ) : listing.category === "kausityo" || listing.category === "job" ? (
                            "🌾"
                          ) : (
                            "🍓"
                          )}
                        </div>
                        <div className="flex-1 min-w-0 py-0.5">
                          <p className="text-foreground text-sm font-medium leading-snug break-words">{listing.title}</p>
                          <span
                            className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase"
                            style={{ background: "#EDF4E8", color: "#2A5012" }}
                          >
                            {categoryBadgeLabel(listing, lang)}
                          </span>
                          {(dateRangeLabel || priceLabel) && (
                            <p className="text-muted-foreground text-xs mt-1">
                              {[dateRangeLabel, priceLabel].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 flex-shrink-0 text-xs text-muted-foreground pl-14 sm:pl-0">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {listing.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {listing.contacts}
                        </span>
                        <span
                          className="px-2.5 py-1 rounded-full font-medium whitespace-nowrap"
                          style={{ background: statusInfo.bg, color: statusInfo.color }}
                        >
                          {lang === "fi" ? statusInfo.fi : statusInfo.en}
                        </span>

                        {!listing.isForest && (
                          <div className="flex items-center gap-1">
                            {listing.status === "draft" && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(listing, "active")}
                                className="px-2.5 text-xs py-1 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                              >
                                {lang === "fi" ? "Julkaise" : "Publish"}
                              </button>
                            )}
                            {listing.status === "active" && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(listing, "closed")}
                                className="px-2.5 text-xs py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                              >
                                {lang === "fi" ? "Sulje" : "Close"}
                              </button>
                            )}
                            {listing.status === "closed" && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(listing, "active")}
                                className="px-2.5 text-xs py-1 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                              >
                                {lang === "fi" ? "Avaa uudelleen" : "Reopen"}
                              </button>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(listing)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                            title={lang === "fi" ? "Muokkaa" : "Edit"}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(listing)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                            title={lang === "fi" ? "Poista" : "Delete"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : activeTab === "inbox" ? (
          <Inbox lang={lang} />
        ) : (
          role === "picker" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <PickerForm
                form={pickerForm} setForm={setPickerForm}
                dragOver={dragOver} setDragOver={setDragOver}
                selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles}
                existingImages={existingImages} onDeleteExisting={handleDeleteExistingImage}
                onSubmit={handlePickerSubmit} isSubmitting={isSubmitting}
                editingListing={editingListing} onCancel={cancelEdit}
                submitted={submitted} lastSavedWasEdit={lastSavedWasEdit}
                tr={tr} lang={lang}
              />
            </div>
          )
        )}

        <FarmListingManager
          ref={farmManagerRef}
          visible={activeTab === "create" && role === "farmer"}
          lang={lang}
          tr={tr}
          normalizeListing={normalizeListing}
          onListingsChange={setFarmListings}
          onFarmChange={setFarm}
          onSaved={finishSaving}
          onCancel={cancelEdit}
        />
      </div>
    </div>
  );
}

// ── Picker (forest) form — 

function PickerForm({ form, setForm, dragOver, setDragOver, selectedFiles, setSelectedFiles, existingImages, onDeleteExisting, onSubmit, isSubmitting, editingListing, onCancel, submitted, lastSavedWasEdit, tr, lang }: {
  form: typeof EMPTY_PICKER_FORM; setForm: (f: typeof EMPTY_PICKER_FORM) => void;
  dragOver: boolean; setDragOver: (v: boolean) => void;
  selectedFiles: File[]; setSelectedFiles: (f: File[]) => void;
  existingImages: ListingImageRecord[]; onDeleteExisting: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void; isSubmitting: boolean;
  editingListing: unknown; onCancel: () => void;
  submitted: boolean; lastSavedWasEdit: boolean; tr: TrFn; lang: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <FormHeader
        title={editingListing ? (lang === "fi" ? "Muokkaa ilmoitusta" : "Edit listing") : tr("form_title")}
        subtitle={tr("form_subtitle_picker")}
        onCancel={editingListing ? onCancel : undefined}
        lang={lang}
      />

      {submitted ? (
        <SuccessPanel lang={lang} tr={tr} lastSavedWasEdit={lastSavedWasEdit} />
      ) : (
        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <CategoryPicker categories={pickerCategories} value={form.category} tr={tr}
            label={tr("form_label_category")} onChange={(id) => setForm({ ...form, category: id })} />

          <TextField label={tr("form_label_title")} value={form.title}
            onChange={(v) => setForm({ ...form, title: v })}
            placeholder={tr("form_placeholder_title_picker")} required />

          <div className="grid grid-cols-2 gap-4">
            <PriceField label={tr("form_label_price")} value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
            <UnitSelect label={tr("form_label_unit")} value={form.unit} tr={tr}
              units={["kg", "litre", "h", "day", "piece"]}
              onChange={(v) => setForm({ ...form, unit: v })} />
          </div>

          <TextField label={tr("form_label_volume_picker")} value={form.volume}
            onChange={(v) => setForm({ ...form, volume: v })}
            placeholder={tr("form_placeholder_volume_picker")} />

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
                  required
                />
              </div>
            </div>
            <RegionSelect label={tr("form_label_region")} value={form.region} tr={tr} lang={lang}
              onChange={(v) => setForm({ ...form, region: v })} />
          </div>

          <TextArea label={tr("form_label_description")} value={form.description}
            onChange={(v) => setForm({ ...form, description: v })}
            placeholder={tr("form_placeholder_description")} />

          <PhotoDropzone tr={tr} dragOver={dragOver} setDragOver={setDragOver}
            selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles}
            existingImages={existingImages} onDeleteExisting={onDeleteExisting} />

          <div className="flex items-center gap-6">
            {(["delivery", "shipping"] as const).map((opt) => (
              <Checkbox key={opt}
                checked={form[opt]}
                onToggle={() => setForm({ ...form, [opt]: !form[opt] })}
                label={opt === "delivery" ? tr("form_opt_delivery") : tr("form_opt_shipping")}
              />
            ))}
          </div>

          <SubmitBar isSubmitting={isSubmitting} editingListing={editingListing} lang={lang} tr={tr} />
        </form>
      )}
    </div>
  );
}