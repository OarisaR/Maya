import { createContext, useContext, useState } from "react";
import type { Lang } from "@/i18n/translations";

const LangContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
}>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en"; // ← server-safe
    return (localStorage.getItem("lang") as Lang) ?? "en";
  });

  const setLang = (l: Lang) => {
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
    setLangState(l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);