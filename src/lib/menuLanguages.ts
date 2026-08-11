// Languages offered by the storefront menu language switcher. `code` is the
// Google Translate language code. Shared by the switcher (checkout) and the
// admin settings (which languages the partner chooses to offer).
export interface MenuLanguage {
    code: string;
    label: string;
}

export const MENU_LANGUAGES: MenuLanguage[] = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिन्दी" },
    { code: "ml", label: "മലയാളം" },
    { code: "ta", label: "தமிழ்" },
    { code: "te", label: "తెలుగు" },
    { code: "kn", label: "ಕನ್ನಡ" },
    { code: "ar", label: "العربية" },
    { code: "bn", label: "বাংলা" },
    { code: "mr", label: "मराठी" },
    { code: "gu", label: "ગુજરાતી" },
    // Spanish, for the Mexico market. Google's website widget has ONE Spanish —
    // there is no es-MX (or es-419) in includedLanguages, and passing one makes
    // the entry silently vanish from the dropdown. So the code is "es" and the
    // label stays plain "Español" rather than promising Mexican Spanish the
    // translation does not actually deliver.
    { code: "es", label: "Español" },
    // Chinese is TWO scripts in Google's widget, not one: zh-CN (Simplified) and
    // zh-TW (Traditional). Plain "zh" is not accepted and drops the entry.
    // Simplified covers the mainland and Singapore; add zh-TW here if a
    // Taiwan/Hong Kong partner needs it.
    { code: "zh-CN", label: "中文" },
    { code: "ja", label: "日本語" },
];
