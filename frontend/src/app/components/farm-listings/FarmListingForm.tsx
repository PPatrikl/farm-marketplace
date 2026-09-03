import type { ListingCategory, PriceUnit } from "../../../services/farmListings";
import { allowedUnitsForCategory } from "../../../services/farmListings";
import type { ListingImageRecord } from "../../../services/listingImages";
import {
  CategoryPicker, FormHeader, TextField, TextArea, PriceField, UnitSelect,
  Checkbox, PhotoDropzone, SubmitBar, type TrFn,
} from "./sharedFormFields";

export const EMPTY_LISTING_FORM = {
  category: "" as ListingCategory | "",
  title: "",
  cropType: "",
  price: "", unit: "kg" as PriceUnit, volume: "", description: "",
  dateStart: "", dateEnd: "",
  bookingRequired: false,
  accommodation: false,
  mealsIncluded: false, transport: false, mealAllowance: false,
  contractBased: false, machineWork: false,
};

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

export function FarmListingForm({ form, setForm, dragOver, setDragOver, selectedFiles, setSelectedFiles, existingImages, onDeleteExisting, onSubmit, isSubmitting, editingListing, onCancel, tr, lang }: {
  form: typeof EMPTY_LISTING_FORM; setForm: (f: typeof EMPTY_LISTING_FORM) => void;
  dragOver: boolean; setDragOver: (v: boolean) => void;
  selectedFiles: File[]; setSelectedFiles: (f: File[]) => void;
  existingImages: ListingImageRecord[]; onDeleteExisting: (id: string) => void;
  onSubmit: (e: React.FormEvent, publishAsDraft?: boolean) => void; isSubmitting: boolean;
  editingListing: unknown; onCancel: () => void;
  tr: TrFn; lang: string;
}) {
  const unitsForCategory = allowedUnitsForCategory(form.category === "job" ? "job" : "picking");

  function setCategory(id: ListingCategory) {
    const nextUnits = allowedUnitsForCategory(id);
    setForm({ ...form, category: id, unit: nextUnits.includes(form.unit) ? form.unit : nextUnits[0] });
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <FormHeader
        title={editingListing ? (lang === "fi" ? "Muokkaa ilmoitusta" : "Edit listing") : tr("form_title")}
        subtitle={tr("form_subtitle_farmer")}
        onCancel={editingListing ? onCancel : undefined}
        lang={lang}
      />

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
                    if (key === "mealsIncluded" && nextValue) updated.mealAllowance = false;
                    if (key === "mealAllowance" && nextValue) updated.mealsIncluded = false;
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
          selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles}
          existingImages={existingImages} onDeleteExisting={onDeleteExisting} />

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
    </div>
  );
}