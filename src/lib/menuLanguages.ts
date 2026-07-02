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
];
