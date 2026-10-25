/**
 * Supported interface languages.
 *
 * Codes are Google Cloud Translation (v2) target codes, so the same values can
 * travel from the language switcher to the translate endpoint without mapping.
 */
export const LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English", htmlLang: "en" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", htmlLang: "hi" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা", htmlLang: "bn" },
  { code: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી", htmlLang: "gu" },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ", htmlLang: "kn" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்", htmlLang: "ta" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी", htmlLang: "mr" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export type LanguageMeta = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export const LANGUAGE_CODES = LANGUAGES.map((language) => language.code) as [
  LanguageCode,
  ...LanguageCode[],
];

const BY_CODE = new Map<LanguageCode, LanguageMeta>(
  LANGUAGES.map((language) => [language.code, language]),
);

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && BY_CODE.has(value as LanguageCode);
}

export function getLanguage(code: LanguageCode | string | null | undefined): LanguageMeta {
  return BY_CODE.get(code as LanguageCode) ?? BY_CODE.get(DEFAULT_LANGUAGE)!;
}
