import { Upload, X } from "lucide-react";
import { useLang } from "../../i18n/LanguageContext";
import type { PriceUnit } from "../../../services/farmListings";
import type { ListingImageRecord } from "../../../services/listingImages";

export type TrFn = ReturnType<typeof useLang>['tr'];

export const REGIONS = [
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

export const UNIT_LABEL_KEYS: Record<PriceUnit, "form_unit_kg" | "form_unit_L" | "form_unit_h" | "form_unit_day" | "form_unit_lot"> = {
  kg: "form_unit_kg",
  litre: "form_unit_L",
  h: "form_unit_h",
  day: "form_unit_day",
  piece: "form_unit_lot",
};

export const UNIT_SHORT: Record<PriceUnit, string> = {
  kg: "kg", litre: "L", h: "h", day: "pv", piece: "kpl",
};

export function CategoryPicker<Cat extends { id: string; labelKey: Parameters<TrFn>[0]; icon: string }>({
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

export function FormHeader({ title, subtitle, onCancel, lang }: {
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

export function TextField({ label, value, onChange, placeholder, required }: {
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

export function TextArea({ label, value, onChange, placeholder }: {
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

export function PriceField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
        <input
          type="number"
          step="0.50"
          min="0.01"
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

export function UnitSelect({ label, value, onChange, tr, units }: {
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

export function RegionSelect({ label, value, onChange, tr, lang }: {
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

export function Checkbox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={onToggle}
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
          checked ? "border-primary bg-primary" : "border-border bg-input-background"
        }`}
      >
        {checked && <CheckCircleMini />}
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}
import { CheckCircle } from "lucide-react";
function CheckCircleMini() {
  return <CheckCircle className="w-3 h-3 text-white" />;
}

export function ImageThumb({ src, isPrimary, onDelete, onMoveLeft, onMoveRight, canMoveLeft, canMoveRight }: {
  src: string; isPrimary: boolean; onDelete: () => void;
  onMoveLeft?: () => void; onMoveRight?: () => void; canMoveLeft?: boolean; canMoveRight?: boolean;
}) {
  return (
    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group flex-shrink-0">
      <img src={src} alt="" className="w-full h-full object-cover" />
      {isPrimary && (
        <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded-full font-medium">★</span>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
      {(onMoveLeft || onMoveRight) && (
        <div className="absolute bottom-1 inset-x-1 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" disabled={!canMoveLeft} onClick={onMoveLeft}
            className="w-5 h-5 rounded bg-black/60 text-white text-xs disabled:opacity-30">‹</button>
          <button type="button" disabled={!canMoveRight} onClick={onMoveRight}
            className="w-5 h-5 rounded bg-black/60 text-white text-xs disabled:opacity-30">›</button>
        </div>
      )}
    </div>
  );
}

export function PhotoDropzone({ tr, dragOver, setDragOver, selectedFiles, setSelectedFiles, existingImages, onDeleteExisting }: {
  tr: TrFn; dragOver: boolean; setDragOver: (v: boolean) => void;
  selectedFiles: File[]; setSelectedFiles: (f: File[]) => void;
  existingImages: ListingImageRecord[]; onDeleteExisting: (id: string) => void;
}) {
  const moveFile = (from: number, to: number) => {
    if (to < 0 || to >= selectedFiles.length) return;
    const next = [...selectedFiles];
    [next[from], next[to]] = [next[to], next[from]];
    setSelectedFiles(next);
  };
  const removeFile = (index: number) => setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  const hasAnyExisting = existingImages.length > 0;

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{tr("form_label_photos")}</label>

      {(existingImages.length > 0 || selectedFiles.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {existingImages.map((img) => (
            <ImageThumb key={img.id} src={img.url} isPrimary={img.is_primary} onDelete={() => onDeleteExisting(img.id)} />
          ))}
          {selectedFiles.map((file, i) => (
            <ImageThumb
              key={file.name + i}
              src={URL.createObjectURL(file)}
              isPrimary={!hasAnyExisting && i === 0}
              onDelete={() => removeFile(i)}
              onMoveLeft={i > 0 ? () => moveFile(i, i - 1) : undefined}
              onMoveRight={i < selectedFiles.length - 1 ? () => moveFile(i, i + 1) : undefined}
              canMoveLeft={i > 0}
              canMoveRight={i < selectedFiles.length - 1}
            />
          ))}
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) setSelectedFiles([...selectedFiles, ...Array.from(e.dataTransfer.files)]);
        }}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer relative ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/30"
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => { if (e.target.files) setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)]); }}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
        <p className="text-xs text-muted-foreground">
          {tr("form_photo_drag")}{" "}
          <span className="text-primary font-medium hover:underline">{tr("form_photo_browse")}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">{tr("form_photo_hint")}</p>
      </div>
    </div>
  );
}

export function SubmitBar({ isSubmitting, editingListing, lang, tr }: {
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

export function SuccessPanel({ lang, tr, lastSavedWasEdit }: { lang: string; tr: TrFn; lastSavedWasEdit: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <CheckCircleMini />
      </div>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-xl mb-2">
        {lastSavedWasEdit ? (lang === "fi" ? "Muutokset tallennettu" : "Changes saved") : tr("form_success_title")}
      </h3>
      <p className="text-muted-foreground text-sm text-center">
        {lastSavedWasEdit
          ? (lang === "fi" ? "Ilmoituksesi on päivitetty." : "Your listing has been updated.")
          : tr("form_success_sub")}
      </p>
    </div>
  );
}