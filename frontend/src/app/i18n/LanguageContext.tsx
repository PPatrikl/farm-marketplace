import { createContext, useContext, useState, type ReactNode } from "react";
import { t, type Lang, type TranslationKey } from "./translations";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  tr: (key: TranslationKey) => any; // Changed from string to any to support calendar arrays
}

const LanguageContext = createContext<LangCtx>({
  lang: "fi",
  setLang: () => {},
  tr: (key) => t.fi[key],
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("fi");
  const tr = (key: TranslationKey): any => t[lang][key]; // Changed from string to any
  
  return (
    <LanguageContext.Provider value={{ lang, setLang, tr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}