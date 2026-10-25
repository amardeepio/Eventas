"use client";

import { Globe } from "lucide-react";
import { LANGUAGES, type LanguageCode } from "@/lib/i18n/languages";
import { useLanguage } from "@/lib/i18n/language-provider";
import { cn } from "@/lib/utils/cn";

interface LanguageSwitcherProps {
  className?: string;
  /** Accessible label, translated for the active language. */
  label?: string;
}

export function LanguageSwitcher({ className, label = "Language" }: LanguageSwitcherProps) {
  const { language, setLanguage, t, translating } = useLanguage();
  return (
    <label
      translate="no"
      className={cn(
        "relative inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-paper px-3 text-muted transition focus-within:border-clay focus-within:ring-4 focus-within:ring-clay/10",
        className,
      )}
    >
      <Globe size={14} aria-hidden="true" className="shrink-0 text-clay" />
      <span className="sr-only">{t(label)}</span>
      <select
        data-testid="language-switcher"
        value={language}
        onChange={(event) => setLanguage(event.target.value as LanguageCode)}
        aria-label={t(label)}
        title={t(label)}
        className="min-h-9 cursor-pointer bg-transparent pr-1 text-xs font-semibold text-ink outline-none"
      >
        {LANGUAGES.map((item) => (
          <option key={item.code} value={item.code} lang={item.htmlLang}>
            {item.nativeLabel}
          </option>
        ))}
      </select>
      {translating && <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-clay" />}
      <span className="sr-only" aria-live="polite">{translating ? t("Translating…") : ""}</span>
    </label>
  );
}
