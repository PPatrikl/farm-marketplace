import { EMPTY_FARM_AMENITIES, type FarmAmenities } from "../../../services/farmListings";
import { TextField, TextArea, RegionSelect, Checkbox, type TrFn } from "./sharedFormFields";

export const EMPTY_FARM_FORM = {
  name: "", description: "", city: "", region: "", address: "",
  amenities: { ...EMPTY_FARM_AMENITIES } as FarmAmenities,
};

const FARM_AMENITY_FIELDS: { key: keyof FarmAmenities; fi: string; en: string }[] = [
  { key: "is_organic", fi: "Luomu", en: "Organic" },
  { key: "is_accessible", fi: "Esteettömyys", en: "Accessible" },
  { key: "family_friendly", fi: "Sopii perheille", en: "Family-friendly" },
  { key: "dogs_allowed", fi: "Koirat sallittu", en: "Dogs allowed" },
];

export function FarmSettingsForm({ form, setForm, onSubmit, saving, saved, hasFarm, tr, lang }: {
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