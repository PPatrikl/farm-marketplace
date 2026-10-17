// frontend/src/app/routes/NotFound.tsx
//
// Shown for any URL that doesn't match a page (the "*" route).

import { useNavigate } from "react-router";
import { useLang } from "../i18n/LanguageContext";

export function NotFound() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const fi = lang === "fi";

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="max-w-7xl mx-auto px-4 py-24 text-center">
      <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "3rem" }} className="text-primary mb-2">
        404
      </p>
      <h1 className="text-foreground text-xl mb-2">{fi ? "Sivua ei löytynyt" : "Page not found"}</h1>
      <p className="text-muted-foreground text-sm mb-6">
        {fi ? "Osoite voi olla väärin, tai sivu on poistettu." : "The address may be wrong, or the page was removed."}
      </p>
      <button
        onClick={() => navigate("/")}
        className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
      >
        {fi ? "Etusivulle" : "Go to home page"}
      </button>
    </div>
  );
}
