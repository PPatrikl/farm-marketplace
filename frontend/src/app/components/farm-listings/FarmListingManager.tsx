import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { supabase } from "../../../supabaseClient";
import { uploadImages } from "../../../services/storage";
import {
  createFarm, updateFarm, fetchOwnFarm, fetchOwnFarmListings,
  createFarmListing, updateFarmListing, deleteFarmListing,
  syncExpiredFarmListings, setFarmListingStatus, allowedUnitsForCategory,
  type FarmRecord, type ListingCategory,
} from "../../../services/farmListings";
import { fetchImagesForListing, deleteListingImage, type ListingImageRecord } from "../../../services/listingImages";
import { FarmSettingsForm, EMPTY_FARM_FORM } from "./FarmSettingsForm";
import { FarmListingForm, EMPTY_LISTING_FORM } from "./FarmListingForm";
import type { TrFn } from "./sharedFormFields";

export interface FarmListingManagerHandle {
  startEdit: (listing: any) => void;
  deleteListing: (listing: any) => Promise<void>;
  changeStatus: (listing: any, next: "active" | "closed" | "draft") => Promise<void>;
  refreshListings: () => Promise<void>;
  resetForms: () => void;
  setView: (view: "farm" | "listing") => void;
}

interface FarmListingManagerProps {
  visible: boolean;
  lang: string;
  tr: TrFn;
  normalizeListing: (raw: any, lang: string) => any;
  onListingsChange: (listings: any[]) => void;
  onFarmChange: (farm: FarmRecord | null) => void;
  onSaved: (wasEdit: boolean) => void;
  onCancel: () => void;
}

export const FarmListingManager = forwardRef<FarmListingManagerHandle, FarmListingManagerProps>(
  function FarmListingManager({ visible, lang, tr, normalizeListing, onListingsChange, onFarmChange, onSaved, onCancel }, ref) {
    const [farm, setFarm] = useState<FarmRecord | null>(null);
    const [farmForm, setFarmForm] = useState(EMPTY_FARM_FORM);
    const [savingFarm, setSavingFarm] = useState(false);
    const [farmSaved, setFarmSaved] = useState(false);
    const [farmerView, setFarmerView] = useState<'listing' | 'farm'>('listing');

    const [listingForm, setListingForm] = useState(EMPTY_LISTING_FORM);
    const [editingListing, setEditingListing] = useState<{ id: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [existingImages, setExistingImages] = useState<ListingImageRecord[]>([]);
    const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

    // Загружается один раз при монтировании UserProfile — не зависит от текущей вкладки,
    // чтобы фермерские объявления сразу были в общем списке на "Профиле".
    useEffect(() => {
      async function load() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await syncExpiredFarmListings(user.id);
        const [farmRes, rows] = await Promise.all([fetchOwnFarm(user.id), fetchOwnFarmListings(user.id)]);
        if (farmRes) {
          setFarm(farmRes);
          onFarmChange(farmRes);
          setFarmForm({
            name: farmRes.name, description: farmRes.description ?? "",
            city: farmRes.city, region: farmRes.region, address: farmRes.address ?? "",
            amenities: {
              is_organic: farmRes.is_organic, is_accessible: farmRes.is_accessible,
              family_friendly: farmRes.family_friendly, dogs_allowed: farmRes.dogs_allowed,
            },
          });
        }
        onListingsChange(rows.map((raw) => normalizeListing(raw, lang)));
      }
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function refreshListings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const rows = await fetchOwnFarmListings(user.id);
      onListingsChange(rows.map((raw) => normalizeListing(raw, lang)));
    }

    function resetForms() {
      setEditingListing(null);
      setListingForm(EMPTY_LISTING_FORM);
      setExistingImages([]);
      setDeletedImageIds([]);
      setSelectedFiles([]);
    }

    function handleDeleteExistingImage(id: string) {
      setDeletedImageIds((prev) => [...prev, id]);
      setExistingImages((prev) => prev.filter((img) => img.id !== id));
    }

    async function handleFarmSubmit(e: React.FormEvent) {
      e.preventDefault();
      setSavingFarm(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { alert("Please log in first"); setSavingFarm(false); return; }
        const payload = {
          name: farmForm.name, description: farmForm.description || undefined,
          city: farmForm.city, region: farmForm.region, address: farmForm.address || undefined,
          amenities: farmForm.amenities,
        };
        const isFirstFarmCreation = !farm;
        const saved = farm ? await updateFarm(farm.id, payload) : await createFarm(user.id, payload);
        setFarm(saved);
        onFarmChange(saved);
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

    async function handleListingSubmit(e: React.FormEvent, publishAsDraft: boolean = false) {
      e.preventDefault();
      if (!farm) {
        alert(lang === "fi" ? "Täytä ensin tilan tiedot yllä." : "Please fill in your farm details above first.");
        return;
      }

      const parsedPrice = parseFloat(listingForm.price);
        if (!listingForm.price || isNaN(parsedPrice) || parsedPrice <= 0) {
        alert(lang === "fi" ? "Anna hinta, joka on suurempi kuin 0." : "Please enter a price greater than 0.");
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

        if (deletedImageIds.length > 0) {
          await Promise.all(deletedImageIds.map((id) => deleteListingImage(id)));
        }

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
          price: parsedPrice,
          price_unit: listingForm.unit,
          capacity: parseFloat(listingForm.volume) || 0,
          description: listingForm.description,
          date_start: listingForm.dateStart || undefined,
          date_end: listingForm.dateEnd || undefined,
          booking_required: isPicking ? listingForm.bookingRequired : false,
          ...amenities,
          images: uploadedImages,
        };

        if (editingListing) {
          await updateFarmListing(editingListing.id, payload);
        } else {
          await createFarmListing({
            owner_id: user.id, farm_id: farm.id,
            status: publishAsDraft ? 'draft' : 'active',
            ...payload,
          });
        }

        await refreshListings();
        const wasEdit = Boolean(editingListing);
        resetForms();
        onSaved(wasEdit);
      } catch (error: any) {
        console.error("Error saving listing:", error);
        alert(`Failed to save listing: ${error.message || 'Unknown error'}`);
      } finally {
        setIsSubmitting(false);
      }
    }

    useImperativeHandle(ref, () => ({
      startEdit(listing: any) {
        const raw = listing._raw;
        setFarmerView("listing");
        setDeletedImageIds([]);
        fetchImagesForListing(listing.id, 'farm').then(setExistingImages);

        const category: ListingCategory = raw.type === "kausityo" ? "job" : "picking";
        setListingForm({
          category,
          title: raw.title ?? "",
          cropType: raw.crop_type ?? "",
          price: String(raw.price ?? ""),
          unit: allowedUnitsForCategory(category).includes(raw.price_unit)
            ? raw.price_unit
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
        setEditingListing({ id: listing.id });
        setSelectedFiles([]);
      },
      async deleteListing(listing: any) {
        await deleteFarmListing(listing.id);
        await refreshListings();
      },
      async changeStatus(listing: any, next) {
        await setFarmListingStatus(listing.id, next);
        await refreshListings();
      },
      refreshListings,
      resetForms,
      setView(view) {
        setFarmerView(view);
      },
    }));

    if (!visible) return null;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
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
          <FarmListingForm
            form={listingForm} setForm={setListingForm}
            dragOver={dragOver} setDragOver={setDragOver}
            selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles}
            existingImages={existingImages} onDeleteExisting={handleDeleteExistingImage}
            onSubmit={handleListingSubmit} isSubmitting={isSubmitting}
            editingListing={editingListing}
            onCancel={() => { resetForms(); onCancel(); }}
            tr={tr} lang={lang}
          />
        )}
      </div>
    );
  }
);