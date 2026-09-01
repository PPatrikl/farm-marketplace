//  UserProfile.tsx 
import {
  MapPin, Camera, Plus, Star,
  Sprout, Trees, Briefcase, CheckCircle, Upload, Pencil, Trash2, X, Eye, Phone
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLang } from "../i18n/LanguageContext";
import { supabase } from "../../supabaseClient";

import { uploadImages, type UploadedImage } from '../../services/storage';
import { createForestListing, updateForestListing, deleteForestListing } from '../../services/forestListings';
import {
  createFarm, updateFarm, fetchOwnFarm, fetchOwnFarmListings,
  createFarmListing, updateFarmListing, deleteFarmListing,
  syncExpiredFarmListings, setFarmListingStatus, getEffectiveStatus,
  allowedUnitsForCategory,
  type PriceUnit, type ListingCategory, type FarmAmenities, type FarmRecord,
  type ListingStatus,
  EMPTY_FARM_AMENITIES,
} from '../../services/farmListings';
import { isoToDate, sameDay, formatShortDate, formatLongDate, formatIsoDate } from "../../utils/dates";

type TrFn = ReturnType<typeof useLang>['tr'];

// Regions: keep a language-independent `code` for storage, with fi/en labels for display
const REGIONS = [
  { code: "uusimaa", fi: "Uusimaa", en: "Uusimaa" },
  { code: "pirkanmaa", fi: "Pirkanmaa", en: "Pirkanmaa" },
  { code: "varsinais-suomi", fi: "Varsinais-Suomi", en: "Varsinais-Suomi" },
  { code: "kanta-hame", fi: "Kanta-Häme", en: "Kanta-Häme" },
  { code: "paijat-hame", fi: "Päijät-Häme", en: "Päijät-Häme" },
  { code: "kymenlaakso", fi: "Kymenlaakso", en: "Kymenlaakso" },
  { code: "etela-karjala", fi: "Etelä-Karjala", en: "South Karelia" },
  { code: "pohjois-karjala", fi: "Pohjois-Karjala", en: "North Karelia" },
  { code: "keski-suomi", fi: "Keski-Suomi", en: "Central Finland" },
  { code: "pohjois-pohjanmaa", fi: "Pohjois-Pohjanmaa", en: "Northern Ostrobothnia" },
  { code: "lappi", fi: "Lappi", en: "Lapland" },
];

// forest_listings.product_type expects exactly 'marjat' | 'sienet' | 'muut'.
const pickerCategories = [
  { id: "marjat", labelKey: "form_cat_berries" as const, icon: "🫐" },
  { id: "sienet", labelKey: "form_cat_mushrooms" as const, icon: "🍄" },
  { id: "muut", labelKey: "form_cat_herbs" as const, icon: "🌿" },
];
  
const farmerCategories: { id: ListingCategory; labelKey: "form_cat_picking" | "form_cat_job"; icon: string }[] = [
  { id: "picking", labelKey: "form_cat_picking", icon: "🍓" },
  { id: "job", labelKey: "form_cat_job", icon: "🌾" },
];

const JOB_AMENITY_FIELDS: { key: keyof typeof EMPTY_LISTING_FORM; fi: string; en: string }[] = [
  { key: "accommodation", fi: "Majoitus", en: "Housing" },
  { key: "mealsIncluded", fi: "Ateriat", en: "Meals included" },
  { key: "transport", fi: "Kuljetukset", en: "Transport" },
  { key: "mealAllowance", fi: "Ateria-avustus", en: "Meal allowance" },
  { key: "contractBased", fi: "Sopimuspohjainen", en: "Contract-based" },
  { key: "machineWork", fi: "Konetyö", en: "Machinery work" },
];

const UNIT_LABEL_KEYS: Record<PriceUnit, "form_unit_kg" | "form_unit_L" | "form_unit_h" | "form_unit_day" | "form_unit_lot"> = {
  kg: "form_unit_kg",
  litre: "form_unit_L",
  h: "form_unit_h",
  day: "form_unit_day",
  piece: "form_unit_lot",
};

const UNIT_SHORT: Record<PriceUnit, string> = {
  kg: "kg",
  litre: "L",
  h: "h",
  day: "pv",
  piece: "kpl",
};

function listingTypeToCategory(type: string): ListingCategory {
  return type === "kausityo" ? "job" : "picking";
}

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

// ── Empty form shapes ────────────────────────────────────────

const EMPTY_PICKER_FORM = {
  title: "", category: "", price: "", unit: "kg" as PriceUnit, volume: "",
  location: "", region: "", description: "", delivery: false, shipping: false,
};

const EMPTY_FARM_FORM = {
  name: "", description: "", city: "", region: "", address: "",
  amenities: { ...EMPTY_FARM_AMENITIES } as FarmAmenities,
};

const EMPTY_LISTING_FORM = {
  category: "" as ListingCategory | "",
  title: "",
  cropType: "",   // free-text produce/culture name — NOT the category id
  price: "", unit: "kg" as PriceUnit, volume: "", description: "",
  dateStart: "", dateEnd: "",
  bookingRequired: false,
  accommodation: false,
  mealsIncluded: false, transport: false, mealAllowance: false,
  contractBased: false, machineWork: false,
};

const FARM_AMENITY_FIELDS: { key: keyof FarmAmenities; fi: string; en: string }[] = [
  { key: "is_organic", fi: "Luomu", en: "Organic" },
  { key: "is_accessible", fi: "Esteettömyys", en: "Accessible" },
  { key: "family_friendly", fi: "Sopii perheille", en: "Family-friendly" },
  { key: "dogs_allowed", fi: "Koirat sallittu", en: "Dogs allowed" },
];

export function UserProfile() {
  const { tr, lang } = useLang();

  const [role, setRole] = useState<'picker' | 'farmer'>('picker');
  const [profile, setProfile] = useState<{
    full_name: string; city: string | null; region: string | null;
    rating: number; review_count: number;
    phone_verified: boolean; identity_verified: boolean; food_licence: boolean;
    is_farmer: boolean; is_collector: boolean; total_sales_eur: number; created_at: string;
  } | null>(null);

  const [myListings, setMyListings] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "create">("profile");
  const [dragOver, setDragOver] = useState(false);

  const [pickerForm, setPickerForm] = useState(EMPTY_PICKER_FORM);

  const [farm, setFarm] = useState<FarmRecord | null>(null);
  const [farmForm, setFarmForm] = useState(EMPTY_FARM_FORM);
  const [savingFarm, setSavingFarm] = useState(false);
  const [farmSaved, setFarmSaved] = useState(false);

  const [farmerView, setFarmerView] = useState<'listing' | 'farm'>('listing');

  const [listingForm, setListingForm] = useState(EMPTY_LISTING_FORM);

  const [editingListing, setEditingListing] = useState<{ id: string; isForest: boolean } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [lastSavedWasEdit, setLastSavedWasEdit] = useState(false);

  const [profileNotice, setProfileNotice] = useState<null | { edit: boolean }>(null);

  useEffect(() => {
    async function loadProfileFarmAndListings() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        if (authError) console.error("Failed to load user:", authError.message);
        return;
      }

      await syncExpiredFarmListings(user.id);

      const [profileRes, farmRes, farmListingsRows, forestListingsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        fetchOwnFarm(user.id), 
        fetchOwnFarmListings(user.id), 
        supabase.from('forest_listings').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }),
      ]);

      if (profileRes.error) console.error("Failed to load profile:", profileRes.error.message);
      if (forestListingsRes.error) console.error("Failed to load forest listings:", forestListingsRes.error.message);

      if (profileRes.data) {
        setProfile(profileRes.data);

        if (profileRes.data.is_farmer) setRole("farmer");
      }

      if (farmRes) {
        setFarm(farmRes);
        setFarmForm({
          name: farmRes.name,
          description: farmRes.description ?? "",
          city: farmRes.city,
          region: farmRes.region,
          address: farmRes.address ?? "",
          amenities: {
            is_organic: farmRes.is_organic,
            is_accessible: farmRes.is_accessible,
            family_friendly: farmRes.family_friendly,
            dogs_allowed: farmRes.dogs_allowed,
          },
        });
      }

      const combinedListings = [
        ...farmListingsRows,
        ...(forestListingsRes.data || []),
      ].map((raw) => normalizeListing(raw, lang));

      setMyListings(combinedListings);
    }

    loadProfileFarmAndListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetAllForms() {
    setEditingListing(null);
    setPickerForm(EMPTY_PICKER_FORM);
    setListingForm(EMPTY_LISTING_FORM);
    setSelectedFiles([]);
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

  // ── Picker (forest) submit ────────────────────────────────
  async function handlePickerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert("Please log in first"); setIsSubmitting(false); return; }

      const uploadedImages = selectedFiles.length > 0 ? await uploadImages(selectedFiles) : [];
      const payload = {
        product_name: pickerForm.title,
        product_type: pickerForm.category,
        price_per_unit: parseFloat(pickerForm.price) || 0,
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
        setMyListings((prev) =>
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

  // ── Farm settings submit ───────────────────
  async function handleFarmSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingFarm(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert("Please log in first"); setSavingFarm(false); return; }

      const payload = {
        name: farmForm.name,
        description: farmForm.description || undefined,
        city: farmForm.city,
        region: farmForm.region,
        address: farmForm.address || undefined,
        amenities: farmForm.amenities,
      };

      const isFirstFarmCreation = !farm;
      const saved = farm ? await updateFarm(farm.id, payload) : await createFarm(user.id, payload);

      setFarm(saved);
      setFarmSaved(true);
      setTimeout(() => setFarmSaved(false), 3000);

      if (isFirstFarmCreation) setFarmerView("listing");
    } catch (error: any) {
      console.error("Error saving farm:", error);
      alert(`Failed to save farm: ${error.message || 'Unknown error'}`);
    } finally {
      setSavingFarm(false);
    }
  }

  // ── Farmer listing submit ─────────────────────────
  async function handleListingSubmit(e: React.FormEvent, publishAsDraft: boolean = false) {
    e.preventDefault();
    if (!farm) {
      alert(lang === "fi" ? "Täytä ensin tilan tiedot yllä." : "Please fill in your farm details above first.");
      return;
    }
    if (!listingForm.category) {
      alert(lang === "fi" ? "Valitse kategoria." : "Please choose a category.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert("Please log in first"); setIsSubmitting(false); return; }

      const uploadedImages = selectedFiles.length > 0 ? await uploadImages(selectedFiles) : [];
      const isJob = listingForm.category === "job";
      const isPicking = listingForm.category === "picking";

      const amenities = isJob
        ? {
            accommodation: listingForm.accommodation,
            meals_included: listingForm.mealsIncluded,
            transport: listingForm.transport,
            meal_allowance: listingForm.mealsIncluded ? false : listingForm.mealAllowance,
            contract_based: listingForm.contractBased,
            machine_work: listingForm.machineWork,
          }
        : {
            accommodation: false, meals_included: false, transport: false,
            meal_allowance: false, contract_based: false, machine_work: false,
          };

      const payload = {
        category: listingForm.category as ListingCategory,
        title: listingForm.title,
        crop_type: listingForm.cropType,
        price: parseFloat(listingForm.price) || 0,
        price_unit: listingForm.unit,
        capacity: parseFloat(listingForm.volume) || 0,
        description: listingForm.description,
        date_start: listingForm.dateStart || undefined,
        date_end: listingForm.dateEnd || undefined,
        booking_required: isPicking ? listingForm.bookingRequired : false,
        ...amenities,
        images: uploadedImages,
      };

      const resultListing = editingListing
        ? await updateFarmListing(editingListing.id, payload)
        : await createFarmListing({
            owner_id: user.id, farm_id: farm.id,
            status: publishAsDraft ? 'draft' : 'active',
            ...payload,
          });

      if (resultListing) {
        const normalized = normalizeListing(resultListing, lang);
        setMyListings((prev) =>
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
      await setFarmListingStatus(listing.id, next);
      setMyListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, status: next } : l)));
    } catch (error: any) {
      console.error("Error changing listing status:", error);
      alert(`Failed to update status: ${error.message || 'Unknown error'}`);
    }
  }

  function startEdit(listing: any) {
    const raw = listing._raw;
    const isForest = listing.isForest;
    setRole(isForest ? "picker" : "farmer");
    setSubmitted(false);

    if (isForest) {
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
    } else {
      setFarmerView("listing");
      const category = listingTypeToCategory(raw.type);
      setListingForm({
        category,
        title: raw.title ?? "",
        cropType: raw.crop_type ?? "",
        price: String(raw.price ?? ""),

        unit: allowedUnitsForCategory(category).includes(raw.price_unit)
          ? (raw.price_unit as PriceUnit)
          : allowedUnitsForCategory(category)[0],
        volume: String(raw.spots_total ?? ""),
        description: raw.description ?? "",
        dateStart: raw.date_start ?? "",
        dateEnd: raw.date_end ?? "",
        bookingRequired: Boolean(raw.booking_required),
        accommodation: Boolean(raw.accommodation),
        mealsIncluded: Boolean(raw.meals_included),
        transport: Boolean(raw.transport),
        mealAllowance: Boolean(raw.meal_allowance),
        contractBased: Boolean(raw.contract_based),
        machineWork: Boolean(raw.machine_work),
      });
    }

    setEditingListing({ id: listing.id, isForest });
    setSelectedFiles([]);
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
      if (listing.isForest) await deleteForestListing(listing.id);
      else await deleteFarmListing(listing.id);
      setMyListings((prev) => prev.filter((l) => l.id !== listing.id));
    } catch (error: any) {
      console.error("Error deleting listing:", error);
      alert(`Failed to delete listing: ${error.message || 'Unknown error'}`);
    }
  }

  const tabs = [
    { id: "profile", labelKey: "profile_tab_profile" as const },
    { id: "create", labelKey: "profile_tab_create" as const },
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
                    setFarmerView("farm");
                    setActiveTab("create");
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
                    setFarmerView("listing");
                    setActiveTab("create");
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
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            {role === "picker" ? (
              <PickerForm
                form={pickerForm} setForm={setPickerForm}
                dragOver={dragOver} setDragOver={setDragOver}
                selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles}
                onSubmit={handlePickerSubmit} isSubmitting={isSubmitting}
                editingListing={editingListing} onCancel={cancelEdit}
                submitted={submitted} lastSavedWasEdit={lastSavedWasEdit}
                tr={tr} lang={lang}
              />
            ) : (
              <>
                {farm && (
                  <div className="flex items-center gap-1 bg-secondary rounded-xl p-1 w-fit">
                    <button
                      type="button"
                      onClick={() => setFarmerView("farm")}
                      className={`px-4 py-2 rounded-lg text-sm transition-all ${
                        farmerView === "farm" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {lang === "fi" ? "Tilan tiedot" : "Farm details"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFarmerView("listing")}
                      className={`px-4 py-2 rounded-lg text-sm transition-all ${
                        farmerView === "listing" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {editingListing ? (lang === "fi" ? "Muokkaa ilmoitusta" : "Edit listing") : tr("form_title")}
                    </button>
                  </div>
                )}

                {(!farm || farmerView === "farm") && (
                  <FarmSettingsForm
                    form={farmForm} setForm={setFarmForm}
                    onSubmit={handleFarmSubmit} saving={savingFarm} saved={farmSaved}
                    hasFarm={Boolean(farm)} tr={tr} lang={lang}
                  />
                )}

                {farm && farmerView === "listing" && (
                  <ListingForm
                    form={listingForm} setForm={setListingForm}
                    dragOver={dragOver} setDragOver={setDragOver}
                    selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles}
                    onSubmit={handleListingSubmit} isSubmitting={isSubmitting}
                    editingListing={editingListing} onCancel={cancelEdit}
                    submitted={submitted} lastSavedWasEdit={lastSavedWasEdit}
                    tr={tr} lang={lang}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Category picker (shared: picker + farmer) ─────────────────

function CategoryPicker<Cat extends { id: string; labelKey: Parameters<TrFn>[0]; icon: string }>({
  categories, value, onChange, label, tr, columns = 3,
}: {
  categories: Cat[]; value: string; onChange: (id: Cat["id"]) => void; label: string; tr: TrFn; columns?: 2 | 3;
}) {
  const gridColsClass = columns === 2 ? "grid-cols-2" : "grid-cols-3";
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <div className={`grid ${gridColsClass} gap-2`}>
        {categories.map((cat) => (
          <button
            type="button"
            key={cat.id}
            onClick={() => onChange(cat.id)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
              value === cat.id
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
  );
}

// ── Shared form header (title + subtitle + optional cancel) ──

function FormHeader({ title, subtitle, onCancel, lang }: {
  title: string; subtitle: string; onCancel?: () => void; lang: string;
}) {
  return (
    <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-4">
      <div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-xl">{title}</h2>
        <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
      </div>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-sm flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
          {lang === "fi" ? "Peruuta" : "Cancel"}
        </button>
      )}
    </div>
  );
}

// ── Picker (forest) form ───────────────────────────────────────

function PickerForm({ form, setForm, dragOver, setDragOver, selectedFiles, setSelectedFiles, onSubmit, isSubmitting, editingListing, onCancel, submitted, lastSavedWasEdit, tr, lang }: {
  form: typeof EMPTY_PICKER_FORM; setForm: (f: typeof EMPTY_PICKER_FORM) => void;
  dragOver: boolean; setDragOver: (v: boolean) => void;
  selectedFiles: File[]; setSelectedFiles: (f: File[]) => void;
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
            selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} />

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

// ── Farm settings form ────────────────────────

function FarmSettingsForm({ form, setForm, onSubmit, saving, saved, hasFarm, tr, lang }: {
  form: typeof EMPTY_FARM_FORM; setForm: (f: typeof EMPTY_FARM_FORM) => void;
  onSubmit: (e: React.FormEvent) => void; saving: boolean; saved: boolean; hasFarm: boolean;
  tr: TrFn; lang: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-6 py-5 border-b border-border">
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-xl">
          {lang === "fi" ? "Tilan tiedot" : "Farm details"}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {lang === "fi"
            ? "Nämä tiedot koskevat koko tilaasi, ei yksittäistä ilmoitusta. Näytetään vain itsepoiminta-ilmoituksissa."
            : "These details apply to your whole farm, not a single listing. Only shown on pick-your-own listings."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="p-6 space-y-5">
        <TextField label={lang === "fi" ? "Tilan nimi" : "Farm name"} value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
          placeholder={lang === "fi" ? "esim. Mansikkamäki Tila" : "e.g. Mansikkamäki Farm"} required />

        <div className="grid grid-cols-2 gap-4">
          <TextField label={tr("form_label_city")} value={form.city}
            onChange={(v) => setForm({ ...form, city: v })}
            placeholder={tr("form_placeholder_city")} required />
          <RegionSelect label={tr("form_label_region")} value={form.region} tr={tr} lang={lang}
            onChange={(v) => setForm({ ...form, region: v })} />
        </div>

        <TextField label={lang === "fi" ? "Osoite" : "Address"} value={form.address}
          onChange={(v) => setForm({ ...form, address: v })}
          placeholder={lang === "fi" ? "Valinnainen" : "Optional"} />

        <TextArea label={lang === "fi" ? "Tilan kuvaus" : "Farm description"} value={form.description}
          onChange={(v) => setForm({ ...form, description: v })}
          placeholder={lang === "fi" ? "Kerro tilastasi" : "Tell buyers about your farm"} />

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {lang === "fi" ? "Tilan ominaisuudet (itsepoiminta)" : "Farm amenities (pick-your-own)"}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FARM_AMENITY_FIELDS.map(({ key, fi, en }) => (
              <Checkbox key={key}
                checked={form.amenities[key]}
                onToggle={() => setForm({ ...form, amenities: { ...form.amenities, [key]: !form.amenities[key] } })}
                label={lang === "fi" ? fi : en}
              />
            ))}
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving
              ? (lang === "fi" ? "Tallennetaan..." : "Saving...")
              : hasFarm
                ? (lang === "fi" ? "Tallenna tilan tiedot" : "Save farm details")
                : (lang === "fi" ? "Luo tila" : "Create farm")}
          </button>
          {saved && (
            <p className="text-center text-xs text-primary mt-3">
              {lang === "fi" ? "Tilan tiedot tallennettu." : "Farm details saved."}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

// ── Farm listing form ──────────────────────────────

function ListingForm({ form, setForm, dragOver, setDragOver, selectedFiles, setSelectedFiles, onSubmit, isSubmitting, editingListing, onCancel, submitted, lastSavedWasEdit, tr, lang }: {
  form: typeof EMPTY_LISTING_FORM; setForm: (f: typeof EMPTY_LISTING_FORM) => void;
  dragOver: boolean; setDragOver: (v: boolean) => void;
  selectedFiles: File[]; setSelectedFiles: (f: File[]) => void;
  onSubmit: (e: React.FormEvent, publishAsDraft?: boolean) => void; isSubmitting: boolean;
  editingListing: unknown; onCancel: () => void;
  submitted: boolean; lastSavedWasEdit: boolean; tr: TrFn; lang: string;
}) {
  const unitsForCategory = allowedUnitsForCategory(
    form.category === "job" ? "job" : "picking"
  );

  function setCategory(id: ListingCategory) {
    const nextUnits = allowedUnitsForCategory(id);
    setForm({
      ...form,
      category: id,
      unit: nextUnits.includes(form.unit) ? form.unit : nextUnits[0],
    });
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <FormHeader
        title={editingListing ? (lang === "fi" ? "Muokkaa ilmoitusta" : "Edit listing") : tr("form_title")}
        subtitle={tr("form_subtitle_farmer")}
        onCancel={editingListing ? onCancel : undefined}
        lang={lang}
      />

      {submitted ? (
        <SuccessPanel lang={lang} tr={tr} lastSavedWasEdit={lastSavedWasEdit} />
      ) : (
        <form onSubmit={(e) => onSubmit(e, false)} className="p-6 space-y-5">
          <CategoryPicker categories={farmerCategories} value={form.category} tr={tr} columns={2}
            label={tr("form_label_category")} onChange={(id) => setCategory(id as ListingCategory)} />

          <TextField label={tr("form_label_title")} value={form.title}
            onChange={(v) => setForm({ ...form, title: v })}
            placeholder={tr("form_placeholder_title_farmer")} required />

          <TextField
            label={lang === "fi" ? "Kasvi / tuote" : "Crop / produce"}
            value={form.cropType}
            onChange={(v) => setForm({ ...form, cropType: v })}
            placeholder={lang === "fi" ? "esim. Mansikka" : "e.g. Strawberries"}
          />

          <div className="grid grid-cols-2 gap-4">
            <PriceField label={tr("form_label_price")} value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
            <UnitSelect label={tr("form_label_unit")} value={form.unit} tr={tr}
              units={unitsForCategory}
              onChange={(v) => setForm({ ...form, unit: v })} />
          </div>

          <TextField label={tr("form_label_volume_farmer")} value={form.volume}
            onChange={(v) => setForm({ ...form, volume: v })}
            placeholder={tr("form_placeholder_volume_farmer")} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{lang === "fi" ? "Alkaen" : "Available from"}</label>
              <input
                type="date"
                value={form.dateStart}
                onChange={(e) => setForm({ ...form, dateStart: e.target.value })}
                className="w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{lang === "fi" ? "Päättyen" : "Available until"}</label>
              <input
                type="date"
                value={form.dateEnd}
                onChange={(e) => setForm({ ...form, dateEnd: e.target.value })}
                className="w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          {form.category === "picking" && (
            <Checkbox
              checked={form.bookingRequired}
              onToggle={() => setForm({ ...form, bookingRequired: !form.bookingRequired })}
              label={lang === "fi" ? "Varaus vaaditaan" : "Requires advance booking"}
            />
          )}

          {form.category === "job" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{lang === "fi" ? "Työn edut" : "Job amenities"}</label>
              <div className="grid grid-cols-2 gap-2">
                {JOB_AMENITY_FIELDS.map(({ key, fi, en }) => (
                  <Checkbox key={key}
                    checked={form[key] as boolean}
                    onToggle={() => {
                      const nextValue = !form[key];
                      let updated = { ...form, [key]: nextValue };

                      if (key === "mealsIncluded" && nextValue) {
                        updated.mealAllowance = false;
                      }
                      if (key === "mealAllowance" && nextValue) {
                        updated.mealsIncluded = false;
                      }

                      setForm(updated);
                    }}
                    label={lang === "fi" ? fi : en}
                  />
                ))}
              </div>
            </div>
          )}

          <TextArea label={tr("form_label_description")} value={form.description}
            onChange={(v) => setForm({ ...form, description: v })}
            placeholder={tr("form_placeholder_description")} />

          <PhotoDropzone tr={tr} dragOver={dragOver} setDragOver={setDragOver}
            selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} />

          <SubmitBar isSubmitting={isSubmitting} editingListing={editingListing} lang={lang} tr={tr} />

          {!editingListing && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => onSubmit(e as unknown as React.FormEvent, true)}
              className="w-full py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-sm font-medium disabled:opacity-50"
            >
              {lang === "fi" ? "Tallenna luonnoksena" : "Save as draft"}
            </button>
          )}
        </form>
      )}
    </div>
  );
}

// ── Small shared field components ─────────────────────────────

function TextField({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30"
        required={required}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30 resize-none"
      />
    </div>
  );
}

function PriceField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
        <input
          type="number"
          step="0.50"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
          className="w-full pl-8 pr-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30"
          required
        />
      </div>
    </div>
  );
}

function UnitSelect({ label, value, onChange, tr, units }: {
  label: string; value: PriceUnit; onChange: (v: PriceUnit) => void; tr: TrFn; units: PriceUnit[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PriceUnit)}
        className="w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30 appearance-none"
      >
        {units.map((u) => (
          <option key={u} value={u}>{tr(UNIT_LABEL_KEYS[u])}</option>
        ))}
      </select>
    </div>
  );
}

function RegionSelect({ label, value, onChange, tr, lang }: {
  label: string; value: string; onChange: (v: string) => void; tr: TrFn; lang: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30 appearance-none"
      >
        <option value="">{tr("form_placeholder_region")}</option>
        {REGIONS.map((r) => (
          <option key={r.code} value={r.code}>{lang === "fi" ? r.fi : r.en}</option>
        ))}
      </select>
    </div>
  );
}

function Checkbox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={onToggle}
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
          checked ? "border-primary bg-primary" : "border-border bg-input-background"
        }`}
      >
        {checked && <CheckCircle className="w-3 h-3 text-white" />}
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}

function PhotoDropzone({ tr, dragOver, setDragOver, selectedFiles, setSelectedFiles }: {
  tr: TrFn; dragOver: boolean; setDragOver: (v: boolean) => void;
  selectedFiles: File[]; setSelectedFiles: (f: File[]) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{tr("form_label_photos")}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) setSelectedFiles(Array.from(e.dataTransfer.files));
        }}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/30"
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => { if (e.target.files) setSelectedFiles(Array.from(e.target.files)); }}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          {tr("form_photo_drag")}{" "}
          <span className="text-primary font-medium hover:underline">{tr("form_photo_browse")}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">{tr("form_photo_hint")}</p>
        {selectedFiles.length > 0 && (
          <div className="mt-3 text-xs text-primary font-medium">
            Selected {selectedFiles.length} file(s): {selectedFiles.map(f => f.name).join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}

function SubmitBar({ isSubmitting, editingListing, lang, tr }: {
  isSubmitting: boolean; editingListing: unknown; lang: string; tr: TrFn;
}) {
  return (
    <div className="pt-2">
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isSubmitting
          ? (editingListing ? (lang === "fi" ? "Tallennetaan..." : "Saving...") : "Publishing...")
          : (editingListing ? (lang === "fi" ? "Tallenna muutokset" : "Save changes") : tr("form_btn_publish"))}
      </button>
      <p className="text-center text-xs text-muted-foreground mt-3">
        {editingListing
          ? (lang === "fi" ? "Muutokset tallennetaan heti." : "Changes are saved immediately.")
          : tr("form_hint_publish")}
      </p>
    </div>
  );
}

function SuccessPanel({ lang, tr, lastSavedWasEdit }: { lang: string; tr: TrFn; lastSavedWasEdit: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8 text-primary" />
      </div>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-xl mb-2">
        {lastSavedWasEdit
          ? (lang === "fi" ? "Muutokset tallennettu" : "Changes saved")
          : tr("form_success_title")}
      </h3>
      <p className="text-muted-foreground text-sm text-center">
        {lastSavedWasEdit
          ? (lang === "fi" ? "Ilmoituksesi on päivitetty." : "Your listing has been updated.")
          : tr("form_success_sub")}
      </p>
    </div>
  );
}
