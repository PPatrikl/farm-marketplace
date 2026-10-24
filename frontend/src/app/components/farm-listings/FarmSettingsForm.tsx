import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { EMPTY_FARM_AMENITIES, type FarmAmenities } from "../../../services/farmListings";
import { geocodeAddress } from "../../../utils/geocode";
import type { Coords } from "../../../utils/distance";
import { LocationMap } from "../LocationMap";
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

/** Result of "Näytä sijainti kartalla": not checked yet / nothing found / found */
type Preview =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "notfound" }
  | { state: "found"; coords: Coords; exact: boolean };

export function FarmSettingsForm({ form, setForm, onSubmit, saving, saved, hasFarm, tr, lang }: {
  form: typeof EMPTY_FARM_FORM; setForm: (f: typeof EMPTY_FARM_FORM) => void;
  onSubmit: (e: React.FormEvent) => void; saving: boolean; saved: boolean; hasFarm: boolean;
  tr: TrFn; lang: string;
}) {
  const fi = lang === "fi";
  const [preview, setPreview] = useState<Preview>({ state: "idle" });

  // When the town or address is edited, the old preview no longer matches — hide it
  useEffect(() => {
    setPreview({ state: "idle" });
  }, [form.city, form.address]);

  const checkLocation = async () => {
    setPreview({ state: "loading" });
    const result = await geocodeAddress(form.address, form.city);
    setPreview(result ? { state: "found", ...result } : { state: "notfound" });
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-6 py-5 border-b border-border">
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-xl">
          {fi ? "Tilan tiedot" : "Farm details"}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {fi
            ? "Nämä tiedot koskevat koko tilaasi, ei yksittäistä ilmoitusta. Näytetään vain itsepoiminta-ilmoituksissa."
            : "These details apply to your whole farm, not a single listing. Only shown on pick-your-own listings."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="p-6 space-y-5">
        <TextField label={fi ? "Tilan nimi" : "Farm name"} value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
          placeholder={fi ? "esim. Mansikkamäki Tila" : "e.g. Mansikkamäki Farm"} required />

        <div className="grid grid-cols-2 gap-4">
          <TextField label={tr("form_label_city")} value={form.city}
            onChange={(v) => setForm({ ...form, city: v })}
            placeholder={tr("form_placeholder_city")} required />
          <RegionSelect label={tr("form_label_region")} value={form.region} tr={tr} lang={lang}
            onChange={(v) => setForm({ ...form, region: v })} />
        </div>

        <TextField label={fi ? "Osoite" : "Address"} value={form.address}
          onChange={(v) => setForm({ ...form, address: v })}
          placeholder={fi ? "Valinnainen, esim. Kauppakatu 40" : "Optional, e.g. Kauppakatu 40"} />

        {/* Location preview: lets the farmer check the pin before saving */}
        <div>
          <button
            type="button"
            onClick={checkLocation}
            disabled={preview.state === "loading" || !form.city.trim()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border text-sm text-foreground hover:border-primary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MapPin className="w-4 h-4" />
            {preview.state === "loading"
              ? (fi ? "Haetaan sijaintia…" : "Finding location…")
              : (fi ? "Näytä sijainti kartalla" : "Show location on map")}
          </button>

          {preview.state === "notfound" && (
            <p className="text-sm text-destructive mt-2">
              {fi
                ? "Sijaintia ei löytynyt. Tarkista kaupunki ja osoite."
                : "Location not found. Check the town and address."}
            </p>
          )}

          {preview.state === "found" && (
            <div className="mt-3 space-y-2">
              {!preview.exact && form.address.trim() && (
                <p className="text-sm text-amber-700">
                  {fi
                    ? "Katuosoitetta ei löytynyt — kartalla näkyy kaupungin keskusta."
                    : "Street address not found — the map shows the town centre."}
                </p>
              )}
              <LocationMap
                lat={preview.coords.lat}
                lng={preview.coords.lng}
                label={[form.address, form.city].filter((s) => s.trim()).join(", ")}
                lang={lang}
                approximate={!preview.exact}
                height={220}
              />
              <p className="text-xs text-muted-foreground">
                {fi
                  ? "Sijainti tallentuu, kun tallennat tilan tiedot."
                  : "The location is saved when you save the farm details."}
              </p>
            </div>
          )}
        </div>

        <TextArea label={fi ? "Tilan kuvaus" : "Farm description"} value={form.description}
          onChange={(v) => setForm({ ...form, description: v })}
          placeholder={fi ? "Kerro tilastasi" : "Tell buyers about your farm"} />

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {fi ? "Tilan ominaisuudet (itsepoiminta)" : "Farm amenities (pick-your-own)"}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FARM_AMENITY_FIELDS.map(({ key, fi: labelFi, en }) => (
              <Checkbox key={key}
                checked={form.amenities[key]}
                onToggle={() => setForm({ ...form, amenities: { ...form.amenities, [key]: !form.amenities[key] } })}
                label={fi ? labelFi : en}
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
              ? (fi ? "Tallennetaan..." : "Saving...")
              : hasFarm
                ? (fi ? "Tallenna tilan tiedot" : "Save farm details")
                : (fi ? "Luo tila" : "Create farm")}
          </button>
          {saved && (
            <p className="text-center text-xs text-primary mt-3">
              {fi ? "Tilan tiedot tallennettu." : "Farm details saved."}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
