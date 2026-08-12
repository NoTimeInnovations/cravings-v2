import type { Dictionary } from "./en";

/**
 * German (Sie-Form). Typed as `Dictionary`, so this file cannot drift from the
 * English source: add a key to en.ts and TypeScript fails here until it is
 * translated, rather than letting English leak onto a German page.
 *
 * Brand nouns (Menuthere, WhatsApp, Google, Petpooja, Product Hunt, QR, POS,
 * UPI, Stripe, Cashfree) stay in Latin script on purpose — that is how the
 * German market writes them. Buttons and nav labels are deliberately kept
 * short: German compounds run long and blow up the layout.
 */
const de: Dictionary = {
  common: {
    language: "Sprache",
    changeLanguage: "Sprache ändern",
  },
  nav: {
    products: "Produkte",
    solutions: "Lösungen",
    businesses: "Branchen",
    pricing: "Preise",
    resources: "Ressourcen",
    blog: "Blog",
    login: "Anmelden",
    bookDemo: "Demo buchen",
    getStarted: "Kostenlos starten",
    openMenu: "Menü öffnen",
    closeMenu: "Menü schließen",
  },
  navItems: {
    ownDeliveryWebsite: {
      title: "Eigene Bestellseite",
      description: "Lieferplattform ohne Provision",
    },
    digitalMenuCreator: {
      title: "Digitale Speisekarte",
      description: "QR-Karten für Bestellungen am Tisch",
    },
    pos: {
      title: "Kassensystem (POS)",
      description: "Abrechnung und Betrieb steuern",
    },
    tableOrdering: {
      title: "Tischbestellung",
      description: "Reibungsloses Erlebnis für Ihre Gäste",
    },
    captainOrdering: {
      title: "Kellner-Bestellung",
      description: "Schnelle Bestellaufnahme für Ihr Team",
    },
    googleBusinessSync: {
      title: "Google Business Sync",
      description: "Speisekarte zu Google Maps übertragen",
    },
    owners: {
      title: "Inhaber",
      description: "Betrieb steuern und Umsatz steigern",
    },
    agencies: {
      title: "Agenturen",
      description: "Mehrere Kundenkonten mühelos verwalten",
    },
    restaurants: {
      title: "Restaurants",
      description: "Smarte digitale Karten für den Gastraum",
    },
    cafes: {
      title: "Cafés & Kaffeebars",
      description: "Moderne Karten für den perfekten Kaffee",
    },
    bakeries: {
      title: "Bäckereien",
      description: "Frische Backwaren perfekt in Szene setzen",
    },
    cloudKitchens: {
      title: "Cloud Kitchens",
      description: "Mehrere Marken, eine Kartenverwaltung",
    },
    hotels: {
      title: "Hotels & Resorts",
      description: "Elegantes Gastro-Erlebnis für Gäste",
    },
    foodTrucks: {
      title: "Food Trucks",
      description: "Mobile Karten für unterwegs",
    },
    bars: {
      title: "Bars & Kneipen",
      description: "Dynamische Getränkekarten mit Stil",
    },
  },
  hero: {
    productHunt: "Live auf Product Hunt",
    headlineA: "Ihre Bestellungen gehören Ihnen.",
    headlineB: "Ihre Kunden auch.",
    subhead:
      "Schluss mit 30 % Provision für Portale. Menuthere startet Ihre eigene Bestell- und Lieferplattform in wenigen Minuten.",
    searchPlaceholder: "„{name}“ suchen",
    generate: "Erstellen",
    working: "Läuft…",
    clear: "Löschen",
    pickFromDropdown: "Wählen Sie Ihren Betrieb aus der Liste",
    bulletNoCommission: "Keine Provision",
    bulletYourBrand: "Ihre Marke",
    bulletLiveInMinutes: "In Minuten live",
    whatsappTitle: "WhatsApp-Bestellung",
    whatsappNew: "Neu",
    whatsappBlurb: "Gäste bestellen über WhatsApp – ohne App, ohne Login.",
    whatsappExplore: "WhatsApp-Bestellung entdecken",
    trustedBy: "Restaurants, die ihre Marke aufbauen, vertrauen uns",
  },
  footer: {
    solutions: "Lösungen",
    resources: "Ressourcen",
    legal: "Rechtliches",
    tagline: "Bestellungen ohne Provision – für Restaurants.",
    rights: "Alle Rechte vorbehalten.",
  },
  metadata: {
    title: "Menuthere | Bestell- und Lieferplattform für Restaurants",
    description:
      "Starten Sie Ihre eigene Liefer-App mit Petpooja-POS-Integration, Bestellungen in Echtzeit und Analysen. 600+ Restaurants in Indien vertrauen darauf.",
  },
  solutionsOwners: {
    metaTitle: "Lösungen für Restaurant-Inhaber | Menuthere",
    metaDescription:
      "Übernehmen Sie wieder die Kontrolle: Speisekarte, POS, Service und Warenbestand in einem Dashboard. Null Provision, maximale Marge.",
    heroPrimaryCta: "Loslegen",
    heroSecondaryCta: "Demo buchen",
    benefitsHeading: "Warum Menuthere",
    benefitsHeadingAccent: "für Inhaber?",
    reviewsHeading: "Von Restaurantinhabern",
    reviewsHeadingAccent: "geliebt.",
  },
  solutionsAgencies: {
    metaTitle: "Partnerprogramm für Agenturen | Menuthere",
    metaDescription:
      "Werden Sie autorisierter Menuthere-Partner. Verdienen Sie bis zu 30 % lebenslange, wiederkehrende Provision mit digitalen Karten für Restaurants.",
    heroBadge: "Agentur-Partnerprogramm",
    heroApplyCta: "Jetzt bewerben",
    heroDemoCta: "Demo buchen",
    problemHeading: "Mehr Umsatz für Restaurants,",
    problemHeadingAccent: "mehr für Sie",
    problemBody:
      "Unabhängige Restaurants verlieren Umsatz an starre PDFs, die Änderungen nicht abbilden können. Als Menuthere-Partner lösen Sie genau das: mit unserer bewährten Plattform für 30 $/Monat und QR-Karten, die sich sofort aktualisieren und 600+ Standorte überzeugt haben. So werden Sie zum Berater erster Wahl.",
    benefitsHeading: "Warum eine Partnerschaft",
    benefitsHeadingAccent: "mit uns?",
    earningsBadge: "Hohes Verdienstpotenzial",
    earningsHeading: "Provision nach",
    earningsHeadingAccent: "Leistung.",
    earningsSubheading:
      "Ihre Auszahlung richtet sich direkt nach dem Umsatz. Monatlich über Stripe, am selben Tag, an dem die Abo-Zahlung bei uns eingeht.",
    earningsTableTierHeader: "Stufe",
    earningsTableRevenueHeader: "Vermittelter Gesamtumsatz",
    earningsTableCommissionHeader: "Provision (pro 30-$-Abo)",
    tierStarterName: "Starter",
    tierStarterRevenue: "0 $ bis 1.000 $",
    tierStarterRate: "20%",
    tierStarterPayout: "(6 $/Monat)",
    tierStarterPayoutPerSub: "6 $/Monat pro Abo",
    tierGrowthName: "Wachstum",
    tierGrowthRevenue: "1.001 $ bis 5.000 $",
    tierGrowthRate: "25%",
    tierGrowthPayout: "(7,50 $/Monat)",
    tierGrowthPayoutPerSub: "7,50 $/Monat pro Abo",
    tierEliteName: "Elite",
    tierEliteRevenue: "5.001 $+",
    tierEliteRate: "30%",
    tierElitePayout: "(9 $/Monat)",
    tierElitePayoutPerSub: "9 $/Monat pro Abo",
    tierCardRevenueLabel: "Umsatz",
    tierCardCommissionLabel: "Provision",
    processHeading: "So läuft das",
    processHeadingAccent: "Onboarding.",
    processStepOneTitle: "Bewerbung prüfen",
    processStepOneDescription:
      "Schnelle Freigabe inklusive Zugang zum Partnerportal (Demo-Links, Marketingmaterial).",
    processStepTwoTitle: "Einsatz vor Ort",
    processStepTwoDescription:
      "Restaurants ansprechen, in 5 Minuten vorführen, Abschluss machen.",
    processStepThreeTitle: "Umsatzbeteiligung",
    processStepThreeDescription:
      "Automatisches Tracking und taggleiche Auszahlung der eingegangenen Beträge.",
    idealPartnerHeading: "Diese Partner",
    idealPartnerHeadingAccent: "suchen wir",
    idealPartnerBody:
      "Erfahrene Vertriebsprofis, die echte Beziehungen zu Restaurants aufbauen. Ein selektives Programm für nachweisbare Erfolge.",
    partnerTypeRestaurantAdvisors: "Gastronomieberater",
    partnerTypeChannelPartners: "B2B-Vertriebspartner",
    partnerTypeSalesExecutives: "Vertriebsprofis",
    partnerTypeFranchiseSpecialists: "Franchise-Spezialisten",
    partnerTypeSaasResellers: "SaaS-Reseller",
    partnerTypeBizDevPros: "Business-Development-Profis",
    faqHeading: "Fragen von",
    faqHeadingAccent: "Partnern.",
    faqProductOverviewQuestion: "Das Produkt",
    faqProductOverviewAnswer:
      "Digitale QR-Speisekarten für Restaurants weltweit, 30 $/Monat.",
    faqExperienceRequiredQuestion: "Nötige Erfahrung",
    faqExperienceRequiredAnswer:
      "Erfahrung im Außendienst; sämtliche Unterlagen stellen wir.",
    faqPayoutMechanicsQuestion: "Auszahlung",
    faqPayoutMechanicsAnswer:
      "Monatlich per Stripe am Tag des Zahlungseingangs, lebenslang je aktivem Abo.",
    faqCostsInvolvedQuestion: "Kosten",
    faqCostsInvolvedAnswer: "Keine – reine Provisionsbasis.",
    faqTerritoryQuestion: "Gebiet",
    faqTerritoryAnswer: "Weltweit unabhängige Betriebe, Schwerpunkt USA.",
    faqResourcesQuestion: "Materialien",
    faqResourcesAnswer:
      "Portal mit Videos, Gesprächsleitfäden und Präsentationen; warme Leads verfügbar.",
    trustBadgeDeployments: "600+ aktive Installationen",
    trustBadgeFieldTested: "Praxiserprobtes Modell",
    trustBadgeRevenueShare: "Nur Umsatzbeteiligung",
    trustBadgeExclusiveAccess: "Exklusiver Zugang",
    termsHeading: "Bedingungen des Partnerprogramms",
    termsIncomeContinuity:
      "Laufende Einnahmen: Provisionen fließen nur für aktive Abos.",
    termsTerminationRights:
      "Kündigungsrecht: Menuthere kann die Partnerschaft bei Markenverstößen beenden.",
    termsPayoutTiming:
      "Auszahlungstermin: am Tag des Abo-Einzugs, abzüglich Gebühren.",
    termsEligibility:
      "Teilnahme: Partner weltweit willkommen, vorbehaltlich Freigabe.",
  },
  solutionsIndex: {
    metaTitle: "Digitale Speisekarten für jede Gastronomie | Menuthere",
    metaDescription:
      "Digitale Speisekarten für Restaurants, Cafés, Bäckereien, Cloud Kitchens, Hotels, Food Trucks und Bars. QR-Karten, Updates in Echtzeit, Google-Sync.",
    ogTitle: "Digitale Speisekarten-Lösungen | Menuthere",
    ogDescription:
      "Smarte digitale Karten für Restaurants, Cafés, Bäckereien und mehr. Updates in Echtzeit, schönes Design, keine Druckkosten.",
    heroTitleLead: "Digitale Karten",
    heroTitleEmphasis: "verändern",
    heroTitleTail: "Ihr Geschäft.",
    heroSubtitle:
      "Ob gemütliches Café, gut besuchtes Restaurant oder Cloud-Kitchen-Imperium – unsere Plattform passt sich Ihren Anforderungen an.",
    heroPrimaryCta: "Kostenlos starten",
    heroSecondaryCta: "Demo buchen",
    industriesHeadingLead: "Branche wählen,",
    industriesHeadingEmphasis: "loslegen.",
    industriesIntro:
      "Digitale Speisekarten, zugeschnitten auf genau Ihre Art von Gastronomiebetrieb.",
    cardRestaurantsTitle: "Restaurants",
    cardRestaurantsDesc: "Smarte digitale Karten für den Gastraum",
    cardCafesTitle: "Cafés & Kaffeebars",
    cardCafesDesc: "Moderne Karten für den perfekten Kaffee",
    cardBakeriesTitle: "Bäckereien & Konditoreien",
    cardBakeriesDesc: "Frische Backwaren perfekt in Szene gesetzt",
    cardCloudKitchensTitle: "Cloud Kitchens",
    cardCloudKitchensDesc: "Mehrere Marken, eine Kartenverwaltung",
    cardHotelsTitle: "Hotels & Resorts",
    cardHotelsDesc: "Elegantes Gastro-Erlebnis für Ihre Gäste",
    cardFoodTrucksTitle: "Food Trucks",
    cardFoodTrucksDesc: "Mobile Karten, die überall mitfahren",
    cardBarsTitle: "Bars & Kneipen",
    cardBarsDesc: "Dynamische Getränkekarten mit Stil",
    cardCateringTitle: "Catering-Services",
    cardCateringDesc: "Professionelle Karten für jedes Event",
    cardOwnersTitle: "Restaurant-Inhaber",
    cardOwnersDesc: "Holen Sie sich die Kontrolle über Ihren Betrieb zurück",
    cardAgenciesTitle: "Agenturen & Berater",
    cardAgenciesDesc: "Mehrere Kundenkonten mühelos verwalten",
    cardPetpoojaTitle: "Direktbestellung & PetPooja",
    cardPetpoojaDesc: "Provisionsfreie Alternative zu Swiggy & Zomato",
    cardWhatsappOrderingTitle: "WhatsApp-Bestellung",
    cardWhatsappOrderingDesc:
      "Gäste schreiben einfach „Hi“ – ohne App, ohne Anmeldung",
    cardLearnMoreLink: "Mehr erfahren",
    featuresHeadingLead: "Starke Funktionen,",
    featuresHeadingEmphasis: "für jeden Betrieb.",
    featureQrTitle: "QR-Speisekarten",
    featureQrDesc: "Sofort per Smartphone-Scan. Kein App-Download nötig.",
    featureRealtimeTitle: "Updates in Echtzeit",
    featureRealtimeDesc:
      "Preise ändern, Gerichte ergänzen, ausverkauft melden – sofort.",
    featureGoogleSyncTitle: "Google Business Sync",
    featureGoogleSyncDesc:
      "Karte im Google Business-Profil automatisch aktualisieren.",
    featureAnalyticsTitle: "Analysen & Insights",
    featureAnalyticsDesc: "Beliebte Gerichte und Vorlieben Ihrer Gäste im Blick.",
    googleBadge: "Google Business-Integration",
    googleHeading: "Karte mit dem Google Business-Profil synchronisieren",
    googleBody:
      "Ihr Google Business-Profil aktualisiert sich automatisch, sobald Sie etwas ändern. Wer Sie auf Google Maps sucht, sieht immer Ihr aktuelles Angebot.",
    googleBenefitOneClickSync: "Sync per Klick ins Google Business-Profil",
    googleBenefitRealtimeUpdates: "Karten-Updates in Echtzeit auf allen Kanälen",
    googleBenefitLocalSeo: "Bessere lokale Sichtbarkeit und SEO",
    googleBenefitMoreCustomers: "Mehr Gäste über Google Suche & Maps gewinnen",
    googleManagerLink: "Mehr zum Google Business Manager",
    googleCardTitle: "Google Business-Profil",
    googleCardSubtitle: "Speisekarten-Manager",
    googleCardSyncedLabel: "Synchronisierte Gerichte",
    googleCardLastSyncLabel: "Letzte Sync",
    googleCardLastSyncValue: "Gerade eben",
  },
  getStarted: {
    metaTitle: "Loslegen | Menuthere",
    metaDescription:
      "Erstellen Sie Ihre digitale Speisekarte mit Menuthere.",
    stepIndicator: "Schritt {step} von 3",
    publishingLoader1: "Konto wird erstellt …",
    publishingLoader2: "Digitale Speisekarte wird eingerichtet …",
    publishingLoader3: "Dashboard wird konfiguriert …",
    publishingLoader4: "Fast geschafft …",
    step1Title: "Speisekarte hochladen",
    step1Subtitle:
      "Fotografieren Sie Ihre Karte – wir digitalisieren sie sofort.",
    filesSelectedCount: "{count} Datei(en) ausgewählt",
    uploadDropzonePrompt: "Klicken, ziehen & ablegen oder einfügen",
    uploadFormatsHint: "JPG, PNG, PDF bis 10 MB",
    uploadAddMoreHint: "Bereich anklicken, um mehr hinzuzufügen",
    fileTooLargeBadge: "Zu groß ({size} MB)",
    filePreviewAlt: "Seite {number}",
    aiInstructionLabel: "Hinweise für unsere KI",
    optionalSuffix: "(optional)",
    aiInstructionPlaceholder:
      "Etwas Besonderes an Ihrer Karte? z. B. „Getränke ignorieren“, „Combos als eigene Kategorie“, „Preise in AED“",
    aiInstructionHint:
      "Ihr Hinweis hat Vorrang, wenn die KI Ihre Dateien liest.",
    removeInvalidFilesButton: "Ungültige Dateien entfernen",
    nextStepButton: "Weiter",
    uploadOrDivider: "Oder",
    sampleMenuButton: "Beispielkarte testen",
    sampleMenuDialogTitle: "Beispielkarte wählen",
    sampleMenuDialogSubtitle:
      "Wählen Sie einen Betriebstyp und starten Sie mit einer fertigen Karte.",
    sampleMenuComingSoonBadge: "Bald verfügbar",
    filesTooLargeToast:
      "{count} Datei(en) überschreiten das Limit von 10 MB. Bitte laden Sie kleinere Dateien hoch.",
    filesAddedToast: "{count} Datei(en) hinzugefügt!",
    sampleMenuLoadedToast: "Beispielkarte „{name}“ geladen!",
    step2Title: "Angaben zum Restaurant",
    step2Subtitle:
      "Erzählen Sie uns kurz von Ihrem Betrieb, damit wir Ihre Karte personalisieren.",
    restaurantNameLabel: "Name des Restaurants",
    restaurantNamePlaceholder: "z. B. The Burger Joint",
    usernameLabel: "Benutzername",
    usernamePlaceholder: "ihr_restaurantname",
    usernameCheckingStatus: "Verfügbarkeit wird geprüft …",
    usernameAvailableStatus: "Benutzername ist verfügbar",
    usernameTakenStatus: "Dieser Benutzername ist bereits vergeben",
    usernameMinLengthHint: "Der Benutzername braucht mindestens 3 Zeichen",
    phoneNumberLabel: "Telefonnummer",
    phoneCodePlaceholder: "Vorwahl",
    phoneInvalidError: "Ungültige Telefonnummer",
    countryLabel: "Land",
    countryPlaceholder: "Land wählen oder eingeben",
    addressLabel: "Adresse",
    addressPlaceholder: "Straße, Stadtteil, Ort …",
    currencyLabel: "Währung",
    currencyPlaceholder: "Währung wählen oder suchen",
    currencySearchPlaceholder: "Währung suchen (z. B. USD, Euro, ₹)",
    currencySelectFallback: "Währung wählen",
    currencyNoMatch: "Kein Treffer",
    logoLabel: "Logo (optional)",
    logoPreviewAlt: "Logo-Vorschau",
    changeLogoButton: "Logo ändern",
    uploadLogoButton: "Logo hochladen",
    removeLogoButton: "Entfernen",
    logoSizeLabel: "Größe (%)",
    logoBackgroundLabel: "Hintergrund",
    createMenuButton: "Karte erstellen",
    logoNotAnImageToast: "Bitte wählen Sie eine Bilddatei für Ihr Logo",
    logoTooLargeToast: "Das Logo darf höchstens 10 MB groß sein",
    logoReadFailedToast: "Dieses Bild konnte nicht gelesen werden",
    missingDetailsToast: "Bitte füllen Sie alle Felder aus",
    invalidPhoneToast: "Bitte geben Sie eine gültige Telefonnummer ein",
    extractingTitle: "Ihre Karte wird ausgelesen",
    extractingSubtitle:
      "Einen Moment – wir verarbeiten das Bild Ihrer Speisekarte …",
    extractionErrorTitle: "Auslesen fehlgeschlagen",
    menuUnreadableError:
      "Wir konnten Ihre Karte nicht lesen. Versuchen Sie es mit schärferen Dateien oder legen Sie Gerichte manuell an.",
    extractionFailedToast:
      "Karte konnte nicht ausgelesen werden. Bitte erneut versuchen.",
    retryExtractionButton: "Erneut versuchen",
    cancelExtractionButton: "Abbrechen & neu hochladen",
    step3Title: "Ihre Karte ist fertig!",
    step3Subtitle:
      "Wir haben {count} Gerichte erkannt. Passen Sie unten Ihr Design an.",
    themePickerTitle: "Design wählen",
    themeSwatchSample: "Aa",
    themeClassicLabel: "Klassisch",
    themeMidnightLabel: "Mitternacht",
    themeFreshLabel: "Frisch",
    publishButton: "Live schalten",
    authModalSignInTitle: "Zum Veröffentlichen anmelden",
    authModalEmailHint:
      "Wir senden Ihre Dashboard-Zugangsdaten an Ihre E-Mail-Adresse.",
    googleSignInButton: "Mit Google anmelden",
    authDividerOr: "oder",
    emailPlaceholder: "sie@beispiel.de",
    continueWithEmailButton: "Mit E-Mail fortfahren",
    authModalPasswordTitle: "Passwort erstellen",
    authModalPasswordHint:
      "Legen Sie ein Passwort für Ihr Dashboard-Konto fest.",
    passwordPlaceholder: "Passwort (mind. 6 Zeichen)",
    confirmPasswordPlaceholder: "Passwort bestätigen",
    continueButton: "Weiter",
    invalidEmailToast: "Bitte geben Sie eine gültige E-Mail-Adresse ein",
    passwordTooShortToast: "Das Passwort braucht mindestens 6 Zeichen",
    passwordMismatchToast: "Die Passwörter stimmen nicht überein",
    emailAlreadyRegisteredToast:
      "Diese E-Mail-Adresse ist bereits registriert. Bitte verwenden Sie eine andere.",
    googleSignInSuccessToast: "Mit Google angemeldet!",
    googleSignInFailedToast:
      "Anmeldung mit Google fehlgeschlagen. Bitte erneut versuchen.",
    publishSuccessToast: "Karte veröffentlicht! Weiterleitung zum Dashboard …",
    publishFailedToast:
      "Registrierung konnte nicht abgeschlossen werden. Bitte erneut versuchen.",
    successTitle: "Schauen Sie in Ihr Postfach!",
    successSubtitle:
      "Wir haben den Link zu Ihrer Karte und die Dashboard-Zugangsdaten gesendet an:",
    successSpamHint:
      "Nichts angekommen? Prüfen Sie den Spam-Ordner oder ändern Sie unten Ihre E-Mail-Adresse.",
    successMobileSubtitle:
      "Wir haben den Link zu Ihrer Karte und die Dashboard-Zugangsdaten an Ihre E-Mail-Adresse gesendet.",
    changeEmailButton: "Falsche E-Mail? Ändern",
    loginToDashboardButton: "Zum Dashboard",
    changeEmailTitle: "E-Mail ändern",
    changeEmailSubtitle:
      "Geben Sie Ihre richtige E-Mail-Adresse ein. Wir senden Kartenlink und Zugangsdaten dorthin.",
    newEmailLabel: "Neue E-Mail-Adresse",
    updatingEmailButton: "Wird aktualisiert …",
    updateAndResendButton: "Ändern & erneut senden",
    emailUpdatedToast: "E-Mail aktualisiert! Prüfen Sie das neue Postfach.",
    emailUpdateFailedToast:
      "E-Mail konnte nicht aktualisiert werden. Bitte erneut versuchen.",
  },
  helpCenter: {
    metaTitle: "Hilfe & Support | Menuthere",
    metaDescription:
      "Hilfe zu Ihrer digitalen Speisekarte von Menuthere. FAQs, Support über WhatsApp und per E-Mail. Schnelle Antworten zu Karte, Angeboten und mehr.",
    heroTitle: "Hilfe &",
    heroTitleAccent: "Support.",
    heroSubtitle:
      "Sie brauchen Unterstützung? Schreiben Sie uns per E-Mail oder direkt über WhatsApp.",
    faqSectionTitle: "Häufige",
    faqSectionTitleAccent: "Fragen.",
    faq1Question:
      "Wie verhindere ich, dass Gäste alte Karten bei Google oder in Apps finden?",
    faq1Answer:
      "Alle Änderungen – Gerichte, Preise, Beschreibungen oder Verfügbarkeit – erscheinen sofort in Ihrer digitalen Karte. Prüfen Sie es über „Karte ansehen“ im Dashboard; kein Warten, kein Nachdrucken.",
    faq2Question:
      "Ausverkaufte Gerichte stehen weiter auf meiner QR-Karte – warum?",
    faq2Answer:
      "Klicken Sie im Bereich „Karte“ oben auf „Verfügbarkeit“. Dort schalten Sie ganze Kategorien oder einzelne Gerichte mit einem Klick aus – ausverkaufte Positionen verschwinden sofort überall.",
    faq3Question:
      "Karten zu aktualisieren dauert ewig und kostet ein Vermögen für Designer.",
    faq3Answer:
      "Das Bearbeiten dauert Sekunden und erfordert kein technisches Wissen. Gehen Sie in den Bereich „Karte“, klicken Sie ein Gericht an, ändern Sie Name, Preis, Bild, Beschreibung, Angebote oder Varianten und speichern Sie. Die Änderung ist sofort live.",
    faq4Question: "Wie aktualisiere ich meine Gerichte sofort?",
    faq4Answer:
      "Öffnen Sie im Dashboard den Bereich „Karte“. Dort sehen Sie alle Kategorien und Gerichte – klicken Sie eines an, um Name, Preis, Bild oder Beschreibung zu ändern, und speichern Sie für ein sofortiges Update.",
    faq5Question: "Wie ordne ich Gerichte oder Kategorien neu an?",
    faq5Answer:
      "Öffnen Sie den Bereich „Karte“ und klicken Sie auf „Priorität“. Ziehen Sie Kategorien und Gerichte an die richtige Stelle oder vergeben Sie Prioritätsnummern und speichern Sie – die neue Reihenfolge ist sofort sichtbar.",
    faq6Question: "Wie füge ich Angebote oder Specials zu Gerichten hinzu?",
    faq6Answer:
      "Für Specials und Bestseller: Schalten Sie die Option im Bereich „Karte“ pro Gericht ein – sie erscheinen ganz oben als „Must-Try“. Für eigene Angebote: Legen Sie im Bereich „Angebote“ Deals für einzelne oder mehrere Gerichte an, sie sind sofort aktiv.",
    faq7Question:
      "Banner oder Produktbilder ändern – geht das ohne technische Hilfe?",
    faq7Answer:
      "Unter Einstellungen → Allgemein laden Sie Ihr Restaurantbanner hoch oder tauschen es aus. Produktbilder bearbeiten Sie direkt im Bereich „Karte“ – per Drag-and-drop, sofort live.",
    faq8Question:
      "Kann ich Änderungen wie Tagesgerichte einfach vorab ansehen oder planen?",
    faq8Answer:
      "Ja – jede Änderung lässt sich vor dem Speichern über „Karte ansehen“ prüfen. Zum Planen nutzen Sie den Bereich „Angebote“ und legen zeitgesteuerte Updates fest (z. B. Tagesgerichte) – ganz ohne tägliches Einloggen.",
    faq9Question:
      "Kann ich den Shop außerhalb der Öffnungszeiten abschalten?",
    faq9Answer:
      "Ja. Unter Einstellungen schalten Sie Ihr Restaurant jederzeit aus – ideal für Ruhezeiten, Schließtage oder Wartung. Und genauso schnell wieder ein.",
    faq10Question: "Wie einfach ist das Bearbeiten insgesamt?",
    faq10Answer:
      "Extrem einfach – Sekunden pro Änderung. Preise, Namen, Bilder, Verfügbarkeit oder Angebote ändern Sie über Schalter und Auswahllisten im Bereich „Karte“, ohne Code und ohne Designer.",
    faq11Question: "Kann ich mein Abo jederzeit kündigen?",
    faq11Answer:
      "Ja – jederzeit über Ihr Konto. Ihr Tarif läuft bis zum Ende der aktuellen Abrechnungsperiode weiter, danach fallen keine weiteren Kosten an.",
  },
  landing: {
    socialProofEyebrow: "Echte Zahlen aus den letzten 30 Tagen",
    statOrdersLabel: "Eingegangene Bestellungen",
    statRevenueLabel: "Erzielter Umsatz",
    statAvgOrderValueLabel: "Ø Bestellwert",
    statSuffixLakh: "L+",
    statSuffixThousand: "K+",
    platformHeadingLead: "Alles für Ihr Restaurant,",
    platformHeadingAccent: "in einer Plattform.",
    featureWebsiteAppTitle: "Eigene Website & eigene App",
    featureWebsiteAppBody:
      "Starten Sie eine Bestellwebsite und eine eigene App im App Store und Play Store – alles unter Ihrem Namen. Ihre Gäste bestellen direkt bei Ihnen. Keine Zwischenhändler, keine 20–33 % Provision. Sie stöbern, bestellen, verfolgen die Lieferung und bestellen mit einem Tipp erneut, während die Kundenbeziehung, Ihre Preise und jeder Cent Gewinn bei Ihnen bleiben.",
    featureWebsiteAppCta: "So funktioniert es",
    featureWhatsappOrderingTitle: "Bestellen per WhatsApp – einfach „Hi“ senden",
    featureWhatsappOrderingBody:
      "Machen Sie Ihre WhatsApp-Nummer zum einfachsten Bestellkanal. Ein kurzes „Hi“ genügt, und Ihre Gäste bekommen sofort einen Link zu Ihrer Karte, der sie automatisch anmeldet – ohne App, ohne Registrierung, ohne OTP. Sie bestellen mit wenigen Tipps und erhalten Statusmeldungen direkt in WhatsApp, während der Gast Ihnen gehört und Sie null Provision zahlen.",
    featureWhatsappOrderingCta: "WhatsApp-Bestellung ansehen",
    featurePetpoojaTitle: "Petpooja-POS-Integration",
    featurePetpoojaBody:
      "Jede Online-Bestellung landet in Echtzeit direkt in Ihrem Petpooja-POS. Keine manuelle Eingabe, keine verlorenen Bestellungen, keine doppelte Arbeit. Gerichte, Preise und Kategorien gleichen sich automatisch zwischen POS und Bestellwebsite ab. Die einzige Plattform in Indien mit tiefer Petpooja-Integration ab Werk.",
    featurePetpoojaCta: "Mehr zur Petpooja-Integration",
    featurePaymentsTitle: "Zahlungsintegration",
    featurePaymentsBody:
      "Kassieren Sie sofort per UPI, Karte, Onlineüberweisung und Wallet – oder bar bei Lieferung. Sicherer, PCI-konformer Checkout mit Cashfree, und das Geld geht direkt auf Ihr Bankkonto. Kein Portal, das Ihre Einnahmen zurückhält, keine verzögerten Auszahlungen. Jeder Betrag kommt bei Ihnen an.",
    featurePaymentsCta: "Zahlungsarten ansehen",
    featureOrderManagementTitle: "Bestellverwaltung in Echtzeit",
    featureOrderManagementBody:
      "Bestellungen annehmen, verfolgen und steuern – alles in einem Dashboard. Sofortbenachrichtigung bei neuen Bestellungen, Statuswechsel in Echtzeit, Küche und Fahrer immer im Bild. Kein Jonglieren mit mehreren Tablets, keine verlorenen Bestellungen zur Stoßzeit.",
    featureOrderManagementCta: "Bestellverwaltung entdecken",
    featureDigitalMenuTitle: "Digitale Karte verwalten",
    featureDigitalMenuBody:
      "Verwalten Sie Ihre komplette Karte in einem Dashboard: Gerichte, Preise, Kategorien, Fotos und Varianten in Echtzeit anlegen oder ändern. Schalten Sie Gerichte sofort auf ausverkauft, setzen Sie Ernährungsfilter und smarte Suche, und halten Sie Website, App und QR-Codes synchron. Kein Nachdruck, keine Entwickler. Änderungen sind live, sobald Sie speichern.",
    featureDigitalMenuCta: "Mehr zur digitalen Karte",
    featureOffersTitle: "Dynamische Angebote & Aktionen",
    featureOffersBody:
      "Starten Sie Flash-Deals, Happy-Hour-Specials oder zeitgesteuerte Rabatte, die sich automatisch aktivieren und wieder beenden. Heben Sie Bestseller mit „Must-Try“-Badges und „Chef's Choice“-Tags hervor. Mehr Wiederbestellungen und mehr Umsatz – ohne einen einzigen Flyer.",
    featureOffersCta: "So funktionieren Angebote",
    featureGoogleSyncTitle: "Karten-Sync mit Google Business",
    featureGoogleSyncBody:
      "Übertragen Sie Ihre komplette Karte – Kategorien, Gerichte, Preise und Fotos – mit einem Klick automatisch in Ihr Google Business-Profil. Erscheinen Sie auf Google Maps mit vollständiger Karte. Restaurants mit vollständigem Profil erhalten 7× mehr Klicks und 30 % mehr Laufkundschaft.",
    featureGoogleSyncCta: "So funktioniert der Google-Sync",
    featureDeliveryAppTitle: "App für Ihre Fahrer",
    featureDeliveryAppBody:
      "Eine eigene App für Ihr Lieferteam. Fahrer erhalten Bestellbenachrichtigungen, navigieren zur Adresse und aktualisieren den Lieferstatus – alles in Echtzeit. Live-Standorte verfolgen, Bestellungen automatisch zuweisen und mit voller Übersicht schneller liefern.",
    featureDeliveryAppCta: "Mehr zur Fahrer-App",
    featureAnalyticsTitle: "Analysen & Insights",
    featureAnalyticsBody:
      "Behalten Sie Bestellvolumen, Umsatzverläufe, Stoßzeiten und Bestseller im Blick. Entscheiden Sie datenbasiert über Preise, Aktionen und Lieferbetrieb. Sie wissen genau, was funktioniert und wo Potenzial liegt.",
    featureAnalyticsCta: "Mehr zu Analysen",
    ctaBannerHeadingDefault: "Ihre Bestellwebsite steht in unter 2 Minuten.",
    ctaBannerBodyDefault:
      "Karte hochladen, Liefergebiete festlegen und Bestellungen direkt von Ihren Gästen annehmen – mit voller Petpooja-POS-Integration. Über 600 Restaurants wachsen bereits mit Menuthere.",
    ctaBannerPrimaryButton: "Kostenlos starten",
    ctaBannerSecondaryButton: "Alle Tarife ansehen",
    faqHeadingLead: "Häufige",
    faqHeadingAccent: "Fragen.",
    faqVsAggregatorsQuestion:
      "Was unterscheidet Menuthere von Zomato oder Swiggy?",
    faqVsAggregatorsAnswer:
      "Portale wie Zomato und Swiggy nehmen 20–33 % Provision je Bestellung. Menuthere gibt Ihnen eine eigene Bestellwebsite mit Ihrer Marke, auf der Gäste direkt bei Ihnen bestellen – für nur 1 % Provision. Die Kundendaten gehören Ihnen, Sie bestimmen die Preise und bauen echte Markentreue auf.",
    faqPetpoojaIntegrationQuestion:
      "Wie funktioniert die Petpooja-POS-Integration?",
    faqPetpoojaIntegrationAnswer:
      "Nach der Verbindung gleicht sich Ihre Petpooja-Karte automatisch mit Ihrer Menuthere-Bestellwebsite ab. Jede Online-Bestellung geht in Echtzeit direkt an Ihr POS. Keine manuelle Eingabe, keine verlorenen Bestellungen. Gerichte, Preise und Kategorien bleiben in beiden Systemen identisch.",
    faqDeliveryZonesQuestion:
      "Wie richte ich meine Liefergebiete und Liefergebühren ein?",
    faqDeliveryZonesAnswer:
      "Öffnen Sie im Dashboard die Liefereinstellungen. Legen Sie Gebiete per Radius oder Postleitzahl fest, bestimmen Sie die Gebühr je Gebiet und den Mindestbestellwert. Einzelne Gebiete können Sie jederzeit aktivieren oder deaktivieren.",
    faqPickupOrdersQuestion:
      "Können Gäste auch zur Abholung statt zur Lieferung bestellen?",
    faqPickupOrdersAnswer:
      "Ja, Ihre Bestellwebsite unterstützt Lieferung und Abholung. Ihre Gäste wählen an der Kasse selbst. Beide Optionen lassen sich in den Dashboard-Einstellungen ein- oder ausschalten.",
    faqRushHourOrdersQuestion:
      "Wie behalte ich eingehende Bestellungen zur Stoßzeit im Griff?",
    faqRushHourOrdersAnswer:
      "Alle Bestellungen erscheinen in Echtzeit im Dashboard, samt Sofortbenachrichtigung. Annehmen, zubereiten und Status ändern – alles auf einem Bildschirm. Bei verbundenem Petpooja-POS laufen die Bestellungen zusätzlich dorthin, damit Ihre Küche informiert bleibt.",
    faqTechnicalSkillsQuestion:
      "Brauche ich technische Kenntnisse für die Einrichtung?",
    faqTechnicalSkillsAnswer:
      "Überhaupt nicht. Karte hochladen (oder aus Petpooja übernehmen), Branding anpassen – und Ihre Bestellwebsite ist in Minuten live. Kein Code, keine Designer, keine App-Downloads.",
    faqOffersDiscountsQuestion:
      "Kann ich Angebote und Rabatte auf meiner Bestellwebsite anbieten?",
    faqOffersDiscountsAnswer:
      "Ja! Flash-Deals, Gutscheincodes, Rabatte auf die erste Bestellung oder zeitgesteuerte Specials aktivieren und beenden sich automatisch. Heben Sie Bestseller mit „Must-Try“-Badges hervor und steigern Sie den durchschnittlichen Bestellwert.",
    faqCustomerDiscoveryQuestion: "Wie finden Gäste meine Bestellwebsite?",
    faqCustomerDiscoveryAnswer:
      "Teilen Sie den Link in sozialen Medien, über WhatsApp, im Google Business-Profil und per QR-Code im Lokal. Menuthere überträgt Ihre Karte außerdem zu Google Maps, damit Gäste Sie organisch entdecken. Ihre Website ist von Haus aus SEO-optimiert.",
    faqPauseOrderingQuestion:
      "Kann ich Bestellungen außerhalb der Öffnungszeiten abschalten?",
    faqPauseOrderingAnswer:
      "Ja. Unter Einstellungen schalten Sie Ihr Restaurant jederzeit aus – ideal für Ruhezeiten, Feiertage oder Wartung. Und genauso schnell wieder ein. Automatische Öffnungs- und Schließzeiten lassen sich ebenfalls hinterlegen.",
    faqCancelSubscriptionQuestion: "Kann ich mein Abo jederzeit kündigen?",
    faqCancelSubscriptionAnswer:
      "Ja, jederzeit über Ihr Konto. Ihr Tarif läuft bis zum Ende der aktuellen Abrechnungsperiode, danach fallen keine weiteren Kosten an.",
    reviewExpandButton: "Mehr anzeigen",
    reviewCollapseButton: "Weniger anzeigen",
    reviewOneAuthorName: "Hotel Colombo",
    reviewOneAuthorLocation: "MG Road, Edappally",
    reviewOneAuthorInitials: "HC",
    reviewOneParagraphOne:
      "Ehrlich gesagt hätte ich nie gedacht, dass eine eigene App so einfach ist 😅 Das Team hat alles reibungslos übernommen und uns den ganzen Ablauf super leicht gemacht.",
    reviewOneParagraphTwo:
      "Und es sieht genau so aus, wie ich es wollte. Bei ein paar Dingen war ich sehr genau und wollte keinerlei Kompromisse machen – wir hatten mehrere Überarbeitungsrunden, aber sie sind durchweg geduldig und ruhig geblieben und haben es exakt getroffen.",
    reviewOneParagraphThree: "Sehr saubere Arbeit, vielen Dank euch.",
    reviewTwoAuthorName: "Rimaal Mandi & Grills",
    reviewTwoAuthorLocation: "Pune",
    reviewTwoAuthorInitials: "RM",
    reviewTwoParagraphOne:
      "Danke an das MenuThere-Team für die Entwicklung unserer App. Über die App bestellen Gäste direkt bei uns, und die Lieferabwicklung ist deutlich einfacher geworden. Wir wollten zusätzlich externe Lieferdienste wie Porter anbieten, und das Team hat sie erfolgreich integriert. Alles läuft reibungslos, sie haben großartige Arbeit geleistet.",
    reviewTwoParagraphTwo:
      "Der Hauptgrund für die App: Plattformen wie Zomato und Swiggy bringen uns gutes Geschäft und Reichweite, aber bei der Auszahlung wird es wegen Provisionen und weiteren Kosten manchmal schwierig. Auf Zomato und Swiggy können wir natürlich nicht verzichten, weil viele Gäste dort bestellen – wir arbeiten weiter mit ihnen zusammen.",
    reviewTwoParagraphThree:
      "Gleichzeitig gibt uns die App einen weiteren Kanal, um direkt mit unseren Gästen in Kontakt zu bleiben und sie besser zu bedienen.",
    reviewTwoParagraphFour:
      "Danke, MenuThere-Team, für eure Unterstützung und die hervorragende Arbeit.",
  },
  footerLinks: {
    brandBlurb:
      "Die All-in-one-Plattform für Online-Bestellung und Lieferung in der Gastronomie. Eigene Website starten, Portalprovisionen sparen und Ihr Geschäft ausbauen.",
    solutionsGoogleBusinessSync: "Google Business Sync",
    solutionsOwners: "Inhaber",
    solutionsAgencies: "Agenturen",
    solutionsPetpoojaIntegration: "PetPooja-Integration",
    solutionsRestaurants: "Restaurants",
    solutionsCafes: "Cafés",
    resourcesHelpCenter: "Hilfe-Center",
    resourcesDownloadApp: "App herunterladen",
    resourcesGetStarted: "Loslegen",
    legalPrivacyPolicy: "Datenschutz",
    legalTermsOfService: "AGB",
    legalRefundPolicy: "Rückerstattung",
    copyright: "© 2026 Menuthere.",
  },
  solutionsRest: {
    shared: {
      breadcrumbHome: "Start",
      breadcrumbSolutions: "Lösungen",
      bookDemoCta: "Demo buchen",
      stepLabel: "Schritt {step}",
      faqHeading: "Häufige Fragen.",
      zeroPercentValue: "0%",
    },
    googleBusiness: {
      metaTitle: "Speisekarte zu Google Business syncen | Menuthere",
      metaDescription:
        "Übertragen Sie Ihre Speisekarte automatisch ins Google Business-Profil. Einrichtung per Klick, Updates in Echtzeit, bessere lokale Sichtbarkeit.",
      ogDescription:
        "Ihre Speisekarte automatisch auf Google Maps. Immer aktuell, ganz ohne Handarbeit.",
      breadcrumbCurrent: "Karten-Sync mit Google Business-Profil",
      heroBadge: "Google Business-Integration",
      heroTitle: "Ihre Karte automatisch auf Google Maps",
      heroSubtitle:
        "Halten Sie die Karte in Ihrem Google Business-Profil immer aktuell. Ein Klick in Menuthere – und Ihre Karte steht korrekt in der Google Suche und auf Maps.",
      heroPrimaryCta: "Karte synchronisieren",
      mockupCardTitle: "Google Business-Profil",
      mockupCardSubtitle: "Sync-Manager für die Karte",
      mockupSyncStatusTitle: "Karte erfolgreich synchronisiert",
      mockupSyncStatusMeta: "Letzte Sync: gerade eben",
      mockupStatItemsLabel: "Gerichte übertragen",
      mockupStatCategoriesLabel: "Kategorien",
      mockupStatImagesLabel: "Mit Bild",
      mockupRecentlySyncedLabel: "Zuletzt übertragen",
      mockupItem1Name: "Butter Chicken",
      mockupItem1Category: "Hauptgerichte",
      mockupItem2Name: "Paneer Tikka",
      mockupItem2Category: "Vorspeisen",
      mockupItem3Name: "Gulab Jamun",
      mockupItem3Category: "Desserts",
      mockupBadgeTitle: "Profilaufrufe",
      mockupBadgeValue: "+340 % diesen Monat",
      statSyncingValue: "500+",
      statSyncingLabel: "Restaurants synchronisieren",
      statClicksValue: "7x",
      statClicksLabel: "Mehr Profil-Klicks",
      statSyncTimeValue: "< 30s",
      statSyncTimeLabel: "Sync-Dauer",
      statFootfallValue: "30%",
      statFootfallLabel: "Mehr Laufkundschaft",
      howItWorksBadge: "Einfach in 3 Schritten",
      howItWorksHeading: "So funktioniert es",
      howItWorksSubheading:
        "Vom Karten-Dashboard zu Google Maps in drei einfachen Schritten",
      step1Title: "Karte anlegen",
      step1Body:
        "Bauen Sie Ihre Karte auf unserer Plattform: Kategorien, Gerichte, Preise und Fotos. Dauert nur Minuten.",
      step2Title: "Google-Profil verbinden",
      step2Body:
        "Verknüpfen Sie Ihr Google Business-Profil mit einem Klick. Um OAuth und API kümmern wir uns.",
      step3Title: "Synchronisieren & live gehen",
      step3Body:
        "Auf Sync klicken – und Ihre komplette Karte erscheint auf Google Maps. Jederzeit änderbar, Änderungen sind sofort sichtbar.",
      benefitsHeading: "Warum Restaurants den Google-Karten-Sync lieben",
      benefitsSubheading:
        "Ihre Karte ist Ihr stärkstes Marketinginstrument – sie muss dort stehen, wo Gäste suchen",
      benefit1Title: "Bessere lokale Sichtbarkeit",
      benefit1Body:
        "Restaurants mit vollständigem Google Business-Profil bekommen 7× mehr Klicks. Eine synchronisierte Karte ist eines der stärksten lokalen Ranking-Signale – und bringt Sie bei Suchen wie „Restaurant in der Nähe“ weiter nach oben.",
      benefit2Title: "Präsenz auf Google Maps",
      benefit2Body:
        "Wer auf Google Maps nach Essen sucht, sieht Ihre komplette Karte direkt dort – Preise, Kategorien, Gerichte. Die Entscheidung fällt, noch bevor jemand bei Ihnen anruft.",
      benefit3Title: "Immer aktuell",
      benefit3Body:
        "Preis geändert? Neues Gericht? Saisonartikel raus? Ein Sync, und Ihr Google Business-Profil zeigt den neuesten Stand. Kein manuelles Bearbeiten bei Google.",
      benefit4Title: "Jede Woche Stunden sparen",
      benefit4Body:
        "Die Google-Karte von Hand zu pflegen ist mühsam und fehleranfällig. Unser Sync erledigt das in Sekunden statt in Stunden. Kochen Sie – statt zu kopieren.",
      benefit5Title: "Mehr Laufkundschaft",
      benefit5Body:
        "Gäste, die auf Google eine detaillierte Karte sehen, kommen 30 % häufiger vorbei. Geben Sie ihnen die Informationen, die für Sie und gegen den Wettbewerb sprechen.",
      benefit6Title: "Korrekt und verlässlich",
      benefit6Body:
        "Schluss mit abweichenden Preisen zwischen Ihrer echten Karte und dem, was Google zeigt. Keine Beschwerden mehr wegen veralteter Angaben auf Maps.",
      comparisonHeading: "Ohne Sync vs. mit Menuthere",
      comparisonSubheading:
        "So groß ist der Unterschied durch automatischen Karten-Sync",
      comparisonWithoutBadge: "✕ Ohne Sync",
      comparisonWithout1: "Jedes Gericht einzeln bei Google eintragen",
      comparisonWithout2: "Die Google-Karte ist nach wenigen Tagen veraltet",
      comparisonWithout3: "Falsche Preise führen zu Beschwerden",
      comparisonWithout4: "Jeden Monat Stunden für die Dateneingabe",
      comparisonWithout5: "Keine Bilder – nur reine Textlisten",
      comparisonWithout6: "Widersprüchliche Angaben auf allen Kanälen",
      comparisonWithBadge: "✓ Mit Menuthere",
      comparisonWith1: "Ein Klick überträgt die komplette Karte",
      comparisonWith2: "Die Google-Karte zeigt immer Ihr aktuelles Angebot",
      comparisonWith3: "Korrekte Preise schaffen Vertrauen",
      comparisonWith4: "Sekunden statt Stunden Handarbeit",
      comparisonWith5: "Volle Bildunterstützung für mehr Appetit",
      comparisonWith6: "Eine Karte für Website, QR und Google",
      featuresHeading: "Das steckt im Google-Karten-Sync",
      featuresSubheading:
        "Ein komplettes Werkzeug, das Ihre Google-Präsenz korrekt und überzeugend hält.",
      feature1: "Komplette Karte per Klick ins Google Business-Profil",
      feature2: "Automatische Zuordnung und Struktur der Kategorien",
      feature3: "Bild-Upload für einzelne Gerichte",
      feature4: "Sync von Preisen und Verfügbarkeit",
      feature5: "Mehrere Standorte für Ketten",
      feature6: "Sync-Verlauf und Statusanzeige",
      feature7: "Funktioniert mit jedem Google Business-Konto",
      feature8: "Keine technischen Kenntnisse nötig",
      feature9: "Kennzeichnung vegetarisch / nicht vegetarisch",
      feature10: "Sonderzeichen und mehrsprachige Karten inklusive",
      ctaBoxHeading: "Bereit für den Karten-Sync?",
      ctaBoxBody:
        "Hunderte Restaurants halten ihre Google-Präsenz schon mit Menuthere aktuell. Die Einrichtung dauert keine 5 Minuten.",
      ctaBoxButton: "Kostenlos testen",
      comingSoonBadge: "Bald verfügbar",
      comingSoonHeading: "Die Zukunft Ihrer Google-Präsenz",
      comingSoonBody:
        "Wir bauen neue Funktionen, mit denen Sie Ihr komplettes Google Business-Profil steuern – weit über die Karte hinaus.",
      autoPostTitle: "Automatisch bei Google posten",
      autoPostBody:
        "Veröffentlichen Sie Beiträge, Angebote, Events und Neuigkeiten automatisch in Ihrem Google Business-Profil. Tagesgericht, neue Speise oder Festtagsaktion – ganz ohne Login bei Google.",
      autoPostPoint1: "Beiträge mit Fotos und CTAs planen",
      autoPostPoint2: "Tagesgerichte und Saisonangebote bewerben",
      autoPostPoint3: "Veranstaltungen automatisch ankündigen",
      autoPostPoint4: "Auswertung von Reichweite und Interaktion",
      reviewRepliesTitle: "KI-Antworten auf Bewertungen",
      reviewRepliesBody:
        "Lassen Sie die KI durchdachte, persönliche Antworten auf jede Google-Bewertung schreiben – positiv wie negativ. Schneller reagieren, den guten Ruf wahren und rund um die Uhr zeigen, dass Sie zuhören.",
      reviewRepliesPoint1: "KI-generierte, professionelle und herzliche Antworten",
      reviewRepliesPoint2: "Für positive und negative Bewertungen",
      reviewRepliesPoint3: "Trifft den Ton Ihres Restaurants",
      reviewRepliesPoint4: "Vor dem Posten freigeben oder anpassen",
      testimonialQuote:
        "„Früher haben wir jeden Monat einen ganzen Nachmittag damit verbracht, unsere Karte bei Google zu aktualisieren. Mit Menuthere drücke ich einen Knopf und alles wird übertragen – Gerichte, Preise, sogar Bilder. Unser Eintrag auf Google Maps sieht jetzt professionell aus, und es kommen spürbar mehr Gäste herein, die erwähnen, dass sie unsere Karte online gesehen haben.“",
      testimonialAuthor: "Arjun & Priya Nair",
      testimonialRole: "Inhaber, Spice Route Kitchen",
      testimonialLocation: "Kochi, Kerala",
      faqSubheading:
        "Alles Wichtige zum Karten-Sync mit dem Google Business-Profil",
      faq1Question: "Was ist der Karten-Sync mit dem Google Business-Profil?",
      faq1Answer:
        "Eine Funktion, die Ihre Speisekarte automatisch von unserer Plattform in Ihr Google Business-Profil überträgt – also in den Eintrag, der in der Google Suche und auf Google Maps erscheint. Statt jedes Gericht einzeln bei Google einzutragen, übertragen Sie alles mit einem Klick.",
      faq2Question: "Brauche ich dafür ein Google Business-Profil?",
      faq2Answer:
        "Ja, Sie brauchen ein bestätigtes Google Business-Profil für Ihr Restaurant. Falls noch keines existiert, legen Sie es kostenlos auf business.google.com an. Nach der Bestätigung verbinden Sie es mit unserer Plattform und starten den Sync.",
      faq3Question: "Wie oft sollte ich meine Karte synchronisieren?",
      faq3Answer:
        "Immer dann, wenn Sie etwas an der Karte ändern – neue Gerichte, neue Preise oder saisonale Anpassungen. Der Sync dauert nur Sekunden, es spricht also nichts dagegen, alles aktuell zu halten. Manche Restaurants synchronisieren täglich, andere wöchentlich.",
      faq4Question: "Überschreibt der Sync meine bestehende Google-Karte?",
      faq4Answer:
        "Ja, jeder Sync ersetzt die Karte im Google Business-Profil durch die aktuelle Version von unserer Plattform. So bleibt alles korrekt. Ihre übrigen Profilangaben – Fotos, Bewertungen, Öffnungszeiten – bleiben unberührt.",
      faq5Question: "Funktioniert das auch für mehrere Standorte?",
      faq5Answer:
        "Ja! Wenn Sie mehrere Standorte unter einem Google Business-Konto verwalten, wählen Sie aus, wohin synchronisiert wird. Jeder Standort kann eine eigene Karte haben – ideal für Ketten mit unterschiedlichen Karten je Filiale.",
      faq6Question: "Sind meine Google-Kontodaten sicher?",
      faq6Answer:
        "Absolut. Wir nutzen Googles offizielles OAuth 2.0 und die Business Profile API und fordern nur die Berechtigungen an, die zur Kartenpflege nötig sind. Ihre Zugangsdaten werden nie gespeichert – die Authentifizierung läuft sicher über Tokens.",
      faq7Question: "Was passiert beim Sync mit den Bildern der Karte?",
      faq7Answer:
        "Die Bilder Ihrer Gerichte werden zusammen mit den Kartendaten zu Google hochgeladen. Große Bilder optimieren wir automatisch für Googles Vorgaben. Schlägt ein Upload fehl, wird das Gericht trotzdem übertragen – nur eben ohne Foto.",
      faq8Question: "Ist diese Funktion in allen Tarifen enthalten?",
      faq8Answer:
        "Der Karten-Sync mit dem Google Business-Profil ist in den Tarifen Pro und Business enthalten. Details zu den Leistungen der einzelnen Tarife finden Sie auf unserer Preisseite.",
    },
    petpooja: {
      metaTitle: "Schluss mit 30 % Provision | Direktbestellung | Menuthere",
      metaDescription:
        "Lieferportale nehmen 20–30 % Provision je Bestellung. Menuthere gibt Ihnen eine eigene Bestell-App mit 0 % Provision, allen Kundendaten und PetPooja-POS.",
      ogTitle: "Schluss mit 30 % Provision | Direktbestellung für Restaurants",
      ogDescription:
        "Warum 20–30 % an fremde Lieferportale zahlen? Holen Sie sich Ihre eigene Bestellwebsite mit 0 % Provision. PetPooja-POS-Integration, alle Kundendaten, volle Kontrolle.",
      breadcrumbCurrent: "Direktbestellung & PetPooja-Integration",
      heroTitle: "Schluss mit 30 % Provision an fremde Lieferportale",
      heroSubtitle:
        "Ihre eigene Bestellwebsite mit voller Kundenhoheit und PetPooja-POS-Integration",
      heroPrimaryCta: "Direkt verkaufen",
      statCommissionLabel: "Provision je Bestellung",
      value35Percent: "35%",
      statQuitLabel: "Restaurants wollen weg von den Portalen",
      statFeeValue: "45%",
      statFeeLabel: "Effektive Portalgebühr",
      statDataValue: "100%",
      statDataLabel: "Kundendaten gehören Ihnen",
      introParagraph1:
        "Portale nehmen 20–33 % Provision plus versteckte Gebühren – bei jeder Bestellung. Bei 500 Rs Bestellwert verlieren Sie bis zu 225 Rs. Das ist keine Partnerschaft, das ist eine Steuer auf Ihre Arbeit. Ermittlungen der CCI haben großen Lieferplattformen Verstöße gegen das Wettbewerbsrecht nachgewiesen.",
      introParagraph2:
        "Menuthere gibt Ihnen eine eigene Bestellwebsite mit Ihrer Marke – für nur 1 % Provision und mit allen Kundendaten. Zusammen mit der PetPooja-POS-Integration laufen Bestellungen direkt in Ihre Küche: kein Zwischenhändler, keine Umsatzbeteiligung, kein Kontrollverlust.",
      problemsHeading: "So schaden fremde Lieferportale Ihrem Restaurant.",
      problemsSubheading:
        "Die CCI hat beiden Plattformen Verstöße gegen das Wettbewerbsrecht nachgewiesen. Das machen sie mit Ihrem Geschäft.",
      problem1Title: "20–33 % Provision je Bestellung",
      problem1Body:
        "Fremde Lieferportale haben ihre Provisionen zuletzt auf bis zu 33 % erhöht. Bei einer Bestellung über 500 Rs sind 100–165 Rs weg, bevor irgendetwas anderes abgezogen ist. Wareneinsatz, Miete und Löhne zahlen Sie von dem, was übrig bleibt.",
      problem2Title: "Versteckte Kosten summieren sich auf 45 %",
      problem2Body:
        "GST auf die Provision (18 %), Gebühren fürs Zahlungsgateway (2–3 %), Aufschlag auf Verpackung (2–5 Rs pro Bestellung) und erzwungene Rabattbeteiligung. Eine Bestellung über 500 Rs kostet Sie 212–227 Rs an Plattformgebühren – 42–45 % sind weg.",
      problem3Title: "Ihre Kundendaten gehören den Portalen",
      problem3Body:
        "Sie bedienen Tausende Gäste und haben zu keinem eine direkte Beziehung. Die Plattformen verbergen Namen, Telefonnummern und Bestellhistorie gezielt. Treueprogramme oder gezielte Aktionen sind so unmöglich.",
      problem4Title: "Sichtbarkeit nur gegen Geld",
      problem4Body:
        "Die Top-10-Suchergebnisse auf fremden Lieferportalen sind fast immer bezahlte Platzierungen. Ohne Werbebudget verschwindet Ihr Restaurant nach hinten. Mit Anzeigen steigt die effektive Provision auf 25–40 %.",
      problem5Title: "Keine Preishoheit",
      problem5Body:
        "Fremde Lieferportale schreiben Preise vor, drohen bei Verstößen mit Strafen und mit schlechteren Platzierungen, wenn Sie anderswo günstiger anbieten. Nicht einmal Ihre eigene Preisstrategie gehört Ihnen.",
      problem6Title: "Die Portale sind jetzt Ihre Konkurrenz",
      problem6Body:
        "Fremde Lieferportale starten inzwischen eigene Foodmarken und Quick-Commerce-Apps. Sie nutzen IHRE Kundendaten, um konkurrierende Produkte aufzubauen. Die NRAI nennt das „Machtmissbrauch“.",
      commissionHeading: "Was eine Bestellung über 500 Rs wirklich kostet.",
      commissionSubheading:
        "Sehen Sie genau, wohin Ihr Geld geht – Portal gegen Direktbestellung.",
      commissionColCharge: "Kostenart",
      commissionColPlatforms: "Lieferportale",
      commissionRow1Label: "Grundprovision",
      commissionRow1Aggregator: "18-33%",
      commissionRow2Label: "GST",
      commissionRow2Aggregator: "~3-5%",
      commissionRow3Label: "Zahlungsgateway",
      commissionRow3Aggregator: "2-3%",
      commissionRow3Menuthere: "2%",
      commissionRow4Label: "Erzwungene Rabatte",
      commissionRow4Aggregator: "5-15%",
      commissionRow4Menuthere: "Sie entscheiden",
      commissionRow5Label: "Aufschlag Verpackung",
      commissionRow5Aggregator: "Rs 2-5/Bestellung",
      commissionRow6Label: "Bezahlte Platzierungen",
      commissionRow6Aggregator: "5-10% extra",
      commissionRow6Menuthere: "Sichtbarkeit gratis",
      commissionTotalLabel: "Effektiver Gesamtverlust",
      commissionTotalAggregator: "Rs 212-227 (42-45%)",
      commissionTotalMenuthere: "~3%",
      commissionFootnote:
        "* Basierend auf Branchendaten aus Berichten von NRAI, Menuviel und Billboox (2025–2026)",
      solutionHeading: "Holen Sie sich die Kontrolle über Ihr Restaurant zurück.",
      solutionSubheading:
        "Ihre eigene Bestellwebsite. Nur 1 % Provision. Alle Kundendaten. PetPooja-POS-Integration.",
      solution1Title: "Nur 0 % Provision auf Bestellungen",
      solution1Body:
        "Bei nur 0 % Provision landet praktisch jeder Betrag, den Ihr Gast zahlt, bei Ihnen. Keine versteckten Gebühren, keine Umsatzbeteiligung. Ihre Marge bleibt, wo sie hingehört.",
      solution2Title: "100 % der Kundendaten gehören Ihnen",
      solution2Body:
        "Jede Bestellung bringt Ihnen Name, Telefonnummer, Bestellhistorie und Vorlieben. Bauen Sie Treueprogramme auf, senden Sie gezielte Angebote und pflegen Sie echte Beziehungen zu Ihren Gästen.",
      solution3Title: "Bestellwebsite mit Ihrer Marke",
      solution3Body:
        "Sie bekommen eine professionelle Bestellwebsite mit Ihrem Logo, Ihren Farben und Ihrer Domain. Gäste bestellen direkt bei Ihnen – und Ihre Marke wächst, nicht die eines Portals.",
      solution4Title: "Vollständige Analysen & Insights",
      solution4Body:
        "Verfolgen Sie jede Bestellung, Stoßzeiten, beliebte Gerichte, Kundenverhalten und Umsatzverläufe. Entscheiden Sie datenbasiert über Karte, Preise und Aktionen.",
      solution5Title: "Echte Kundentreue aufbauen",
      solution5Body:
        "Starten Sie eigene Angebote, Rabatte und Treueprämien, ohne Marge abzugeben. Senden Sie WhatsApp-Benachrichtigungen, Festtagsgrüße und persönliche Deals direkt an Ihre Gäste.",
      solution6Title: "PetPooja-POS-Integration",
      solution6Body:
        "Bestellungen von Ihrer Menuthere-Website laufen nahtlos direkt in Ihr PetPooja-POS. Keine manuelle Eingabe, keine verlorenen Bestellungen. Ihre Küche sieht sie sofort – wie bei jedem anderen Kanal.",
      realNumbersHeading: "Abhängigkeit vom Portal vs. Direktbestellung.",
      realNumbersSubheading:
        "Der Vergleich, den die Plattformen Ihnen lieber nicht zeigen.",
      realNumbersColAggregators: "Portale",
      realNumbersRow1Metric: "Provision je Bestellung",
      realNumbersRow1Aggregator: "18–33 % + Gebühren (effektiv 35–45 %)",
      realNumbersRow1Direct: "Nur 0 %",
      realNumbersRow2Metric: "Eigentum an den Kundendaten",
      realNumbersRow2Aggregator: "Alles gehört der Plattform",
      realNumbersRow2Direct: "Zu 100 % Ihnen",
      realNumbersRow3Metric: "Preishoheit",
      realNumbersRow3Aggregator: "Eingeschränkt, mit Strafen",
      realNumbersRow3Direct: "Völlig frei",
      realNumbersRow4Metric: "Markenaufbau",
      realNumbersRow4Aggregator: "Die Treue gilt der Plattform",
      realNumbersRow4Direct: "Die Treue gilt IHREM Restaurant",
      realNumbersRow5Metric: "Marge bei Lieferung",
      realNumbersRow5Aggregator: "Oft unter 10 %",
      realNumbersRow5Direct: "25–35 % und mehr möglich",
      realNumbersRow6Metric: "Kontrolle über Marketing",
      realNumbersRow6Aggregator: "Nur gegen Geld, 250–4.000+ Rs",
      realNumbersRow6Direct: "Volle Kontrolle, eigene Kampagnen",
      realNumbersRow7Metric: "Kontrolle über Karte & Rabatte",
      realNumbersRow7Aggregator: "Plattform kann ohne Zustimmung eingreifen",
      realNumbersRow7Direct: "Zu 100 % Ihre Entscheidung",
      transparencyHeading: "Gut zu wissen – volle Transparenz.",
      transparencySubheading:
        "Wir sagen offen, was wir bieten und was nicht.",
      deliveryTitle: "Wir stellen keine Lieferfahrer",
      deliveryBody:
        "Menuthere konzentriert sich auf die beste Bestellplattform, Kundenverwaltung und POS-Integration. Für die Lieferung haben Sie flexible Möglichkeiten:",
      deliveryPoint1: "Eigene Fahrer einsetzen – volle Kontrolle",
      deliveryPoint2: "Externe Dienste wie Porter, Dunzo oder Shadowfax nutzen",
      deliveryPoint3: "Nur Abholung anbieten – viele Gäste bevorzugen das",
      deliveryPoint4: "QR-Bestellung im Lokal braucht gar keine Lieferung",
      deliveryNote:
        "Selbst reine Abholbestellungen über eigene Kanäle sind profitabler als gelieferte Bestellungen über Portale mit 30 % Provision.",
      paymentTitle: "Zahlungsintegration",
      paymentBadge: "Nur 1 %",
      paymentBody:
        "Integriertes Zahlungsgateway für nur 1 % (reine Servicegebühr). Ihre Gäste zahlen direkt auf Ihrer Bestellwebsite online:",
      paymentPoint1: "UPI-Zahlungen (Google Pay, PhonePe, Paytm)",
      paymentPoint2: "Kredit- und Debitkarten",
      paymentPoint3: "Anbindung digitaler Wallets",
      paymentPoint4: "Automatischer Abgleich mit dem PetPooja-POS",
      paymentNote:
        "Sie können auch bar bei Lieferung kassieren oder Ihre bestehende Zahlungslösung weiternutzen.",
      factsHeading: "Die Zahlen sprechen für sich.",
      factsSubheading:
        "Echte Daten aus Branchenumfragen, CCI-Ermittlungen und NRAI-Berichten.",
      fact1Text:
        "der indischen Restaurants wollen fremde Lieferportale verlassen (Umfrage Dezember 2025)",
      fact2Value: "60%",
      fact2Text:
        "der neuen Restaurants schließen im ersten Jahr – die Abhängigkeit von Plattformen ist ein Hauptgrund",
      fact3Value: "Rs 400 Cr",
      fact3Text:
        "jährlich zusätzlich, die Plattformen über Aufschläge auf Verpackungsgebühren aus dem Markt ziehen",
      fact4Value: "2,000+",
      fact4Text:
        "Restaurants beteiligten sich am #Logout-Boykott gegen die Lieferportale",
      howItWorksHeading: "In 3 einfachen Schritten zur Direktbestellung.",
      howItWorksSubheading:
        "Ihr eigener Bestellkanal steht in unter 10 Minuten.",
      step1Title: "Karte & Website anlegen",
      step1Body:
        "Karte hochladen, Branding anpassen und Ihre eigene Bestellwebsite live schalten. Dauert unter 10 Minuten.",
      step2Title: "PetPooja-POS verbinden",
      step2Body:
        "Verknüpfen Sie Ihr PetPooja-POS für den automatischen Bestell-Sync. Bestellungen laufen direkt in die Küche – ganz ohne Handarbeit.",
      step3Title: "Teilen & verkaufen",
      step3Body:
        "Teilen Sie Ihren Bestelllink über WhatsApp, soziale Medien und QR-Codes. Dann kommen die Direktbestellungen.",
      savingsHeading:
        "Jede Bestellung über fremde Lieferportale kostet Sie 100–225 Rs",
      savingsBody:
        "Bei 50 Lieferbestellungen am Tag sind das 5.000–11.250 Rs täglich. 1,5–3,3 Lakh jeden Monat. Ihre eigene Bestellwebsite rechnet sich vom ersten Tag an.",
      savingsSecondaryCta: "Preise ansehen",
      faqSubheading: "Alles Wichtige zur Direktbestellung mit Menuthere.",
      faq1Question:
        "Wie hilft mir Menuthere, keine Provision mehr an Lieferportale zu zahlen?",
      faq1Answer:
        "Menuthere gibt Ihnen eine eigene Bestellwebsite mit Ihrer Marke, auf der Gäste direkt bestellen. Bei nur 0 % Provision bleibt Ihnen fast der gesamte Bestellumsatz. Wir berechnen eine einfache Abogebühr – keine 20–30 % von jeder Bestellung.",
      faq2Question: "Stellt Menuthere Lieferfahrer?",
      faq2Answer:
        "Nein, Menuthere stellt keine Lieferfahrer. Wir konzentrieren uns auf die beste Bestellplattform, Kundenverwaltung und POS-Integration. Für die Lieferung setzen Sie eigenes Personal ein, arbeiten mit Diensten wie Porter, Dunzo oder Shadowfax zusammen oder bieten nur Abholung an. Viele Restaurants stellen fest, dass selbst Abholbestellungen über eigene Kanäle profitabler sind als gelieferte Bestellungen über Portale.",
      faq3Question: "Wie funktioniert die PetPooja-Integration?",
      faq3Answer:
        "Bestellungen auf Ihrer Menuthere-Website werden in Echtzeit automatisch an Ihr PetPooja-Terminal weitergeleitet. Ihre Küche sieht die Bestellung sofort – keine manuelle Eingabe, kein Kopieren, keine verlorenen Bestellungen. Es funktioniert genau wie eine Bestellung aus jedem anderen Kanal.",
      faq4Question: "Wie läuft der Zahlungseinzug bei den Gästen?",
      faq4Answer:
        "Menuthere bringt ein integriertes Zahlungsgateway mit nur 0 % Gebühr mit (reine Servicegebühr). Ihre Gäste zahlen online per UPI, Karte oder Wallet direkt auf Ihrer Bestellwebsite. Sie können auch bar bei Lieferung kassieren oder Ihre bestehende Zahlungslösung nutzen.",
      faq5Question: "Sollte ich fremde Lieferportale komplett verlassen?",
      faq5Answer:
        "Nicht unbedingt. Viele Restaurants nutzen Portale weiterhin für die Neukundengewinnung und lenken Stammgäste auf die eigene Bestellwebsite mit höherer Marge. Es geht darum, die Abhängigkeit zu senken – nicht zwingend darum, sie ganz zu beenden – und mehr Umsatz bei sich zu behalten.",
      faq6Question: "Was kostet Menuthere?",
      faq6Answer:
        "Menuthere berechnet ein einfaches Monatsabo – keinen Prozentsatz Ihrer Bestellungen. Selbst in den bezahlten Tarifen sparen Sie durch die wegfallenden Portalprovisionen weit mehr, als Sie ausgeben. Aktuelle Tarife finden Sie auf unserer Preisseite.",
      faq7Question:
        "Wollen wirklich 35 % der Restaurants weg von den Portalen?",
      faq7Answer:
        "Ja. Eine Branchenumfrage vom Dezember 2025 ergab, dass 35 % der indischen Restaurants fremde Lieferportale nicht mehr nutzen wollen – wegen hoher Provisionen, schlechtem Service, zu geringer Gewinne und fehlendem Zugang zu Kundendaten.",
      faq8Question:
        "Kann ich fremde Lieferportale parallel zu Menuthere nutzen?",
      faq8Answer:
        "Selbstverständlich. Die meisten unserer Partner tun genau das. Sie behalten die Portale für die Neukundengewinnung und lenken Stammgäste aktiv auf ihre Menuthere-Bestellwebsite, wo die Marge deutlich höher ist. Mit der Zeit wächst der Anteil der Direktbestellungen, weil Gäste den direkten Weg bevorzugen.",
    },
    whatsappOrdering: {
      metaTitle: "WhatsApp-Bestellung für Restaurants | Menuthere",
      metaDescription:
        "Machen Sie Ihre WhatsApp-Nummer zum Bestellkanal: Gast schreibt „Hi“, erhält einen Auto-Login-Link, bestellt und bekommt Live-Updates. 0 % Provision.",
      metaKeywords:
        "whatsapp bestellung, whatsapp bestellsystem für restaurants, per whatsapp bestellen, whatsapp business bestellung, speisekarte über whatsapp, hi senden und bestellen, essen über whatsapp bestellen, conversational commerce, bestellen ohne provision",
      ogTitle: "WhatsApp-Bestellung – einfach „Hi“ senden | Menuthere",
      ogDescription:
        "Der Bestellkanal mit der geringsten Hürde. „Hi“ senden → sofort ein Link → auf Ihrer Karte bestellen → Live-Updates in WhatsApp. Keine App, keine Anmeldung, null Provision.",
      structuredDataProductName: "Menuthere WhatsApp-Bestellung",
      structuredDataProductDescription:
        "WhatsApp-Bestellsystem für Restaurants. Gäste senden „Hi“, erhalten sofort einen Auto-Login-Link, bestellen auf einer visuellen Web-Karte und bekommen Live-Updates zum Bestellstatus in WhatsApp.",
      heroBadge: "WhatsApp-Bestellung",
      heroBadgeNew: "NEU",
      heroTitle: "Ihre Gäste bestellen mit einem einfachen „Hi“.",
      heroSubtitle:
        "Machen Sie Ihre WhatsApp-Nummer zum einfachsten Bestellkanal. Ein einziges „Hi“ liefert jedem Gast sofort einen Link zu Ihrer Karte, der ihn automatisch anmeldet – ohne App, ohne Registrierung, ohne OTP. Der Gast bleibt Ihrer, und Sie zahlen null Provision.",
      primaryCta: "Kostenlos starten",
      heroTrust1: "Kein App-Download",
      heroTrust2: "Keine Anmeldung, kein OTP",
      heroTrust3: "0 % Provision",
      stepsHeading: "„Hi“ senden. Das ist der ganze Funnel.",
      stepsSubheading:
        "Warenkörbe werden vor allem wegen Reibung abgebrochen – Downloads, Registrierungen, Passwörter. Die WhatsApp-Bestellung nimmt all das weg. Vier Schritte, und Ihr Gast verlässt nie einen Kanal, dem er ohnehin vertraut.",
      step1Title: "Gast sendet „Hi“",
      step1Body:
        "Über einen Sticker, den QR-Code am Tisch, den Link in Ihrer Bio oder Ihr Google-Profil tippt der Gast auf WhatsApp und sendet Hi an Ihre Nummer. Keine App, kein Formular.",
      step2Title: "Er bekommt sofort einen Bestell-Link",
      step2Body:
        "Ihre Nummer antwortet binnen einer Sekunde mit einem Button „Jetzt bestellen“. Der Link meldet ihn automatisch an – ohne OTP, ohne Passwort, ohne Kontoerstellung.",
      step3Title: "Er bestellt auf Ihrer visuellen Karte",
      step3Body:
        "Der Link öffnet Ihre Karte im Design Ihrer Marke – bereits angemeldet. Fotos ansehen, in den Warenkorb legen, UPI oder Barzahlung wählen und in wenigen Tipps bestellen.",
      step4Title: "Updates kommen über WhatsApp zurück",
      step4Body:
        "Bestellung eingegangen, angenommen, Essen fertig, unterwegs mit Live-Tracking-Link, geliefert – plus Treuepunkte. Jedes Update landet direkt im Chat.",
      featuresHeading: "Gebaut zum Verkaufen, nicht nur zum Chatten.",
      featuresSubheading:
        "Alles, was Sie brauchen, um Bestellungen über WhatsApp professionell abzuwickeln – in Ihrem Design, zu Ihren Bedingungen.",
      feature1Title: "Keine App, keine Anmeldung",
      feature1Body:
        "Funktioniert auf jedem Handy mit WhatsApp. Das „Hi“ legt den Gast im Hintergrund an und erkennt ihn wieder – er stößt nie auf eine Login-Hürde.",
      feature2Title: "Ihre eigene Nummer",
      feature2Body:
        "Verbinden Sie Ihre echte WhatsApp Business-Nummer in wenigen Minuten über Meta – auch die, die Sie bereits nutzen. Oder starten Sie sofort über unsere gemeinsame Nummer.",
      feature3Title: "Bestell-Links auf Ihrer Domain",
      feature3Body:
        "Bestell-Links laufen auf Wunsch über Ihre eigene Domain (ihremarke.de) statt über eine fremde URL – so bleibt jeder Kontaktpunkt Ihre Marke.",
      feature4Title: "Automatische Statusmeldungen",
      feature4Body:
        "Bestellung mit voller Rechnung, angenommen, fertig, unterwegs mit Link zur Live-Karte, abgeschlossen und Treuepunkte – alles automatisch versendet.",
      feature5Title: "Sichere Einmal-Links",
      feature5Body:
        "Jeder Link ist signiert, läuft nach Minuten ab und bindet sich an den ersten Öffner – ein weitergeleiteter Link kann niemals eine angemeldete Sitzung übernehmen.",
      feature6Title: "Nachrichtenflows ohne Code",
      feature6Body:
        "Begrüßung und Bestellnachrichten sind bearbeitbare Flows mit Keyword-Triggern, Buttons und Medien – Texte ändern Sie ohne eine Zeile Code.",
      feature7Title: "Gemeinsamer WhatsApp-Posteingang",
      feature7Body:
        "Jede ein- und ausgehende Nachricht wird gespeichert und ist im Dashboard sichtbar – auch im größten Trubel geht nichts unter.",
      feature8Title: "Analysen nach Kanal",
      feature8Body:
        "Bestellungen über WhatsApp werden automatisch markiert. Sehen Sie Anzahl und Umsatz für App, Website und WhatsApp direkt nebeneinander.",
      frictionHeading: "Zählen Sie die Schritte. Ihre Gäste tun es.",
      frictionSubheading:
        "Jeder zusätzliche Schritt zwischen Hunger und Bestellung kostet Sie einen Gast. Hier dieselbe Bestellung auf zwei Wegen.",
      frictionAggregatorLabel: "Portal-App",
      frictionAggregatorStep1: "App installieren",
      frictionAggregatorStep2: "Registrieren + OTP bestätigen",
      frictionAggregatorStep3: "Ihr Restaurant suchen",
      frictionAggregatorStep4: "Bestellen (Portal nimmt 20–33 %)",
      frictionAggregatorStep5: "Sie sehen den Gast nie",
      frictionWhatsappLabel: "WhatsApp-Bestellung",
      frictionWhatsappStep1: "„Hi“ senden",
      frictionWhatsappStep2:
        "Auf „Jetzt bestellen“ tippen (automatisch angemeldet)",
      frictionWhatsappStep3: "Auf Ihrer Karte bestellen",
      frictionHighlight: "100 % des Bestellwerts bleiben bei Ihnen.",
      comparisonHeading: "So schneidet es ab.",
      comparisonSubheading:
        "Menuthere WhatsApp-Bestellung vs. Lieferportale vs. generische „Chatbot“-Bestelltools.",
      comparisonColAggregators: "Lieferportale",
      comparisonColChatbots: "Generische Chatbots",
      comparisonValueYes: "Ja",
      comparisonValueNo: "Nein",
      comparisonRow1Label: "Provision je Bestellung",
      comparisonRow1Aggregator: "20–33 %",
      comparisonRow1Chatbot: "Monatsgebühr + pro Nachricht",
      comparisonRow2Label: "App-Download nötig",
      comparisonRow2Us: "Nie",
      comparisonRow3Label: "Login / OTP für Gäste",
      comparisonRow3Us: "Automatisch – keiner",
      comparisonRow3Aggregator: "Konto + OTP",
      comparisonRow3Chatbot: "Meist nötig",
      comparisonRow4Label: "Bestellerlebnis",
      comparisonRow4Us: "Volle visuelle Karte mit Fotos",
      comparisonRow4Aggregator: "In deren App",
      comparisonRow4Chatbot: "Gerichte in den Chat tippen",
      comparisonRow5Label: "Versand von Ihrer eigenen Nummer",
      comparisonRow5Chatbot: "Manchmal",
      comparisonRow6Label: "Live-Bestell- und Liefertracking",
      comparisonRow6Us: "In WhatsApp",
      comparisonRow6Aggregator: "In deren App",
      comparisonRow6Chatbot: "Selten",
      comparisonRow7Label: "Die Kundendaten gehören Ihnen",
      comparisonRow7Us: "Ja, vollständig",
      comparisonRow7Chatbot: "Teilweise",
      comparisonRow8Label: "Einrichtungszeit",
      comparisonRow8Us: "Minuten",
      comparisonRow8Aggregator: "Wochen Onboarding",
      comparisonRow8Chatbot: "Tage + Skripting",
      outcome1Value: "≈ 10 Sek.",
      outcome1Label: "Von „Hi“ bis zum fertigen Bestell-Link in der Hand des Gastes.",
      outcome2Label:
        "Provision. Jeder Cent des Bestellwerts bleibt bei Ihnen.",
      outcome3Value: "End-to-End",
      outcome3Label:
        "Aufgegeben → angenommen → unterwegs → verfolgt, alles in WhatsApp.",
      faqHeading: "Fragen, beantwortet.",
      faq1Question: "Müssen meine Gäste etwas installieren?",
      faq1Answer:
        "Nein. Wer WhatsApp hat, kann bestellen. Ein „Hi“, ein Tipp auf den Bestell-Link – und der Gast ist auf Ihrer Karte, bereits angemeldet. Es gibt keine App zum Herunterladen und kein Konto anzulegen.",
      faq2Question: "Tippt der Gast seine Bestellung in den Chat?",
      faq2Answer:
        "Nein – und genau das ist der Punkt. WhatsApp ist die Eingangstür, nicht die Kasse. Das „Hi“ bringt sofort den Link zu Ihrer echten visuellen Karte mit Fotos, Kategorien und Suche, damit das Bestellen schnell geht und Fehler selten sind. Die Statusmeldungen kommen dann über WhatsApp zurück.",
      faq3Question: "Kann alles von meiner eigenen WhatsApp-Nummer kommen?",
      faq3Answer:
        "Ja. Sie verbinden Ihre eigene WhatsApp Business-Nummer in wenigen Minuten über das offizielle Onboarding von Meta – auch eine Nummer, die Sie bereits in der WhatsApp Business App nutzen. Lieber ganz ohne Einrichtung? Starten Sie sofort über unsere gemeinsame Nummer und wechseln Sie später.",
      faq4Question: "Ist der Bestell-Link sicher zum Weitergeben?",
      faq4Answer:
        "Jeder Link ist kryptografisch signiert, läuft nach Minuten ab und bindet sich an die Person, die ihn zuerst öffnet. Wird er weitergeleitet, funktioniert er für niemanden sonst – eine angemeldete Sitzung kann also nie abfließen.",
      faq5Question: "Was bekommt der Gast nach der Bestellung?",
      faq5Answer:
        "Automatische WhatsApp-Nachrichten zu jedem Schritt: Bestellung eingegangen mit voller Rechnung, angenommen, Essen fertig, unterwegs mit Live-Tracking-Link, abgeschlossen und gesammelte Treuepunkte (falls Sie ein Treueprogramm nutzen).",
      faq6Question: "Wie viel Provision nimmt Menuthere?",
      faq6Answer:
        "Null Provision auf Bestellungen. Die WhatsApp-Bestellung gehört zu Ihrem eigenen Direktkanal – Ihnen bleiben 100 % jedes Bestellwerts, und die Zahlungen gehen direkt auf Ihr Bankkonto.",
      faqCtaPrompt: "Bereit für Bestellungen mit einem einzigen „Hi“?",
      faqSecondaryLink: "Bestellen ohne Provision entdecken",
      trialHeading:
        "Ihr WhatsApp-Bestellsystem steht in unter 2 Minuten.",
      trialDescription:
        "WhatsApp-Nummer verbinden, Karte hochladen und Gäste mit einem einzigen „Hi“ bestellen lassen – Auto-Login-Link, Live-Statusmeldungen und null Provision. Über 600 Restaurants wachsen bereits mit Menuthere.",
    },
  },
  solutionsSlug: {
    heroPrimaryCta: "Kostenlos starten",
    heroSecondaryCta: "Demo buchen",
    benefitsHeadingLead: "Warum Menuthere",
    benefitsHeadingIndustry: "für {industry}?",
    benefitsHeadingIndustryFallback: "Ihr Geschäft",
    benefitsSubheading:
      "Funktionen, die eigens für Ihre Branche entwickelt wurden.",
    featuresHeadingLead: "Alles, was Sie brauchen,",
    featuresHeadingEmphasis: "um erfolgreich zu sein.",
    featuresSubheading:
      "Ein umfassendes Toolkit, das Ihre Karte modernisiert und Ihre Gäste begeistert.",
    featuresCtaCardHeading: "Bereit loszulegen?",
    featuresCtaCardBody:
      "Tausende Betriebe verwandeln ihr Karten-Erlebnis bereits mit Menuthere.",
    featuresCtaCardButton: "Kostenlos testen",
    useCasesHeadingLead: "Passend für jede Art",
    useCasesHeadingIndustry: "von {industry}.",
    useCasesHeadingIndustryFallback: "Betrieb",
    faqHeadingLead: "Häufige",
    faqHeadingEmphasis: "Fragen.",
    notFoundMetaTitle: "Lösung nicht gefunden",
    breadcrumbHome: "Start",
    breadcrumbSolutions: "Lösungen",
  },
  downloadApp: {
    heroHeadingLead: "Menuthere für",
    heroHeadingHighlight: "Mobil & Desktop.",
    heroSubheading:
      "Führen Sie Ihr Restaurant unterwegs oder vom Schreibtisch aus. Bestellbenachrichtigungen in Echtzeit, Karte aktualisieren und Umsätze auf allen Geräten im Blick.",
    appStoreBadgePrefix: "Laden im",
    playStoreBadgePrefix: "Jetzt bei",
    windowsBadgePrefix: "Download für",
    windowsBadgePlatform: "Windows",
    heroImageAlt: "Menuthere App-Oberfläche",
  },
  blog: {
    metaTitle: "Blog | Menuthere – Tipps für Restaurants & Cafés",
    metaDescription:
      "Tipps, Anleitungen und Einblicke für Gastronomen: digitale Speisekarten, QR-Codes, Google Business Sync und Wachstum für Ihren Betrieb.",
    ogTitle: "Blog | Menuthere",
    ogDescription:
      "Tipps, Anleitungen und Einblicke für Gastronomen zu digitalen Speisekarten, QR-Codes und Wachstum für Ihren Betrieb.",
    heroHeading: "Neuigkeiten und Einblicke",
    heroHeadingAccent: "von Menuthere",
    categoryLabel: "Blog",
    emptyState:
      "Noch keine Artikel veröffentlicht. Schauen Sie bald wieder vorbei!",
    postMetaTitleTemplate: "{title} | Menuthere Blog",
    postNotFoundMetaTitle: "Artikel nicht gefunden",
    backToIndexLink: "← Blog",
    relatedHeading: "Weitere Artikel",
  },
};

export default de;
