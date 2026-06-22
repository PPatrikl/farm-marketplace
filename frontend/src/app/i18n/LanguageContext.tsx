import { createContext, useContext, useState, type ReactNode } from "react";
import { t, type Lang, type TranslationKey } from "./translations";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  tr: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LangCtx>({
  lang: "fi",
  setLang: () => {},
  tr: (key) => t.fi[key],
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("fi");
  const tr = (key: TranslationKey): string => t[lang][key];
  return (
    <LanguageContext.Provider value={{ lang, setLang, tr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
