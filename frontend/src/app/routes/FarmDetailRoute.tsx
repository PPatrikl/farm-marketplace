// frontend/src/app/routes/FarmDetailRoute.tsx
//
// Page for /tilaluettelo/:id
// Reads the listing id from the URL and loads the listing from Supabase,
// so the page also works after a refresh or from a shared link.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { fetchFarmListingById, type FarmWithVerification } from "../../services/farmListings";
import { ListingDetail } from "../components/ListingDetail";
import { useLang } from "../i18n/LanguageContext";

export function FarmDetailRoute() {
  const { id } = useParams();          // the ":id" part of the URL
  const navigate = useNavigate();
  const { lang } = useLang();
  const fi = lang === "fi";

  const [farm, setFarm] = useState<FarmWithVerification | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound">("loading");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setStatus("loading");
    fetchFarmListingById(id)
      .then((data) => {
        if (cancelled) return;
        setFarm(data);
        setStatus(data ? "ok" : "notfound");
      })
      .catch(() => { if (!cancelled) setStatus("notfound"); });
    return () => { cancelled = true; };
  }, [id]);

  if (status === "loading") {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-sm text-muted-foreground">
        {fi ? "Ladataan…" : "Loading…"}
      </div>
    );
  }

  if (status === "notfound" || !farm) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-foreground mb-4">
          {fi ? "Ilmoitusta ei löytynyt. Se on ehkä poistettu." : "Listing not found. It may have been removed."}
        </p>
        <button
          onClick={() => navigate("/tilaluettelo")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
        >
          {fi ? "Takaisin tilaluetteloon" : "Back to farms"}
        </button>
      </div>
    );
  }

  return <ListingDetail farm={farm} onBack={() => navigate("/tilaluettelo")} />;
}
