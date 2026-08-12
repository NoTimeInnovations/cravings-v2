import type { Dictionary } from "./en";

/**
 * Urdu (RTL, Arabic script). Typed as `Dictionary`, so this file cannot drift
 * from the English source: add a key to en.ts and TypeScript fails here until
 * it is translated, rather than letting English leak onto an Urdu page.
 *
 * Brand nouns (Menuthere, WhatsApp, Google, Product Hunt, QR, POS, Stripe,
 * PetPooja, Swiggy, Zomato) stay in Latin script on purpose — that is how the
 * market writes them, and the browser bidi-embeds them inside the RTL run.
 *
 * Dashboard UI labels the answer tells the reader to click (Menu, Availability,
 * Priority, Offers, Settings → General Settings, View Menu) are also left in
 * Latin: the dashboard itself is English, so translating them would send people
 * looking for a button that does not exist.
 */
const ur: Dictionary = {
  common: {
    language: "زبان",
    changeLanguage: "زبان تبدیل کریں",
  },
  nav: {
    products: "مصنوعات",
    solutions: "حل",
    businesses: "کاروبار",
    pricing: "قیمتیں",
    resources: "وسائل",
    blog: "بلاگ",
    login: "لاگ ان",
    bookDemo: "ڈیمو بک کریں",
    getStarted: "مفت شروع کریں",
    openMenu: "مینو کھولیں",
    closeMenu: "مینو بند کریں",
  },
  navItems: {
    ownDeliveryWebsite: {
      title: "اپنی ڈیلیوری ویب سائٹ",
      description: "بغیر کمیشن ڈیلیوری پلیٹ فارم",
    },
    digitalMenuCreator: {
      title: "ڈیجیٹل مینو بنائیں",
      description: "ڈائن ان آرڈرنگ کے لیے QR مینو",
    },
    pos: {
      title: "پوائنٹ آف سیل (POS)",
      description: "بلنگ اور آپریشنز ایک جگہ",
    },
    tableOrdering: {
      title: "ٹیبل آرڈرنگ",
      description: "گاہکوں کے لیے ہموار کھانے کا تجربہ",
    },
    captainOrdering: {
      title: "کیپٹن آرڈرنگ",
      description: "عملہ سیکنڈوں میں آرڈر لے",
    },
    googleBusinessSync: {
      title: "Google Business سنک",
      description: "مینو Google Maps پر بھیجیں",
    },
    owners: {
      title: "مالکان",
      description: "آپریشنز سنبھالیں، آمدنی بڑھائیں",
    },
    agencies: {
      title: "ایجنسیاں",
      description: "کئی کلائنٹ اکاؤنٹس آسانی سے چلائیں",
    },
    restaurants: {
      title: "ریستوران",
      description: "ڈائن ان کے لیے سمارٹ ڈیجیٹل مینو",
    },
    cafes: {
      title: "کیفے اور کافی شاپس",
      description: "بہترین کافی کے لیے جدید مینو",
    },
    bakeries: {
      title: "بیکریاں",
      description: "تازہ بیکنگ خوبصورتی سے پیش کریں",
    },
    cloudKitchens: {
      title: "کلاؤڈ کچن",
      description: "کئی برانڈز کے مینو ایک جگہ",
    },
    hotels: {
      title: "ہوٹل اور ریزورٹس",
      description: "مہمانوں کے لیے شاندار ڈائننگ",
    },
    foodTrucks: {
      title: "فوڈ ٹرکس",
      description: "چلتے پھرتے موبائل مینو",
    },
    bars: {
      title: "بارز اور پبز",
      description: "اسٹائل کے ساتھ بدلتے ڈرنکس مینو",
    },
  },
  hero: {
    productHunt: "Product Hunt پر لائیو",
    headlineA: "آرڈر آپ کے اپنے۔",
    headlineB: "گاہک آپ کے اپنے۔",
    subhead:
      "ایگریگیٹر کا 30% کمیشن بھول جائیں۔ Menuthere منٹوں میں آپ کے اپنے برانڈ کا آرڈرنگ اور ڈیلیوری پلیٹ فارم کھڑا کر دیتا ہے۔",
    searchPlaceholder: "\"{name}\" تلاش کریں",
    generate: "بنائیں",
    working: "کام جاری ہے…",
    clear: "صاف کریں",
    pickFromDropdown: "ڈراپ ڈاؤن سے اپنا کاروبار چنیں",
    bulletNoCommission: "کوئی کمیشن نہیں",
    bulletYourBrand: "آپ کا برانڈ",
    bulletLiveInMinutes: "منٹوں میں لائیو",
    whatsappTitle: "WhatsApp آرڈرنگ",
    whatsappNew: "نیا",
    whatsappBlurb: "گاہک WhatsApp پر آرڈر کریں — نہ ایپ، نہ لاگ ان۔",
    whatsappExplore: "WhatsApp آرڈرنگ دیکھیں",
    trustedBy: "اپنا برانڈ بڑھاتے ریستورانوں کا اعتماد",
  },
  footer: {
    solutions: "حل",
    resources: "وسائل",
    legal: "قانونی",
    tagline: "ریستورانوں کے لیے بغیر کمیشن آرڈرنگ۔",
    rights: "جملہ حقوق محفوظ ہیں۔",
  },
  metadata: {
    title: "Menuthere | ریستوران کے لیے آن لائن آرڈرنگ و ڈیلیوری",
    description:
      "Petpooja POS انٹیگریشن، ریئل ٹائم آرڈرز اور اینالیٹکس کے ساتھ اپنے ریستوران کی اپنی ڈیلیوری ایپ لانچ کریں۔ بھارت بھر کے 600+ ریستورانوں کا اعتماد۔",
  },
  solutionsOwners: {
    metaTitle: "ریستوران مالکان کے حل | Menuthere",
    metaDescription:
      "Menuthere کے ساتھ اپنے ریستوران کا کنٹرول واپس لیں۔ مینو، POS، کیپٹن اور انوینٹری ایک ہی ڈیش بورڈ سے چلائیں۔ صفر کمیشن، زیادہ منافع۔",
    heroPrimaryCta: "شروع کریں",
    heroSecondaryCta: "ڈیمو بک کریں",
    benefitsHeading: "مالکان Menuthere ہی",
    benefitsHeadingAccent: "کیوں چنیں؟",
    reviewsHeading: "ریستوران مالکان کی",
    reviewsHeadingAccent: "پسند۔",
  },
  solutionsAgencies: {
    metaTitle: "ایجنسی پارٹنر پروگرام | مستقل کمیشن | Menuthere",
    metaDescription:
      "Menuthere کے مجاز پارٹنر بنیں۔ ریستورانوں کو پریمیم ڈیجیٹل مینو حل بیچیں اور 30% تک تاحیات مستقل کمیشن کمائیں۔",
    heroBadge: "ایجنسی پارٹنر پروگرام",
    heroApplyCta: "درخواست دیں",
    heroDemoCta: "ڈیمو بک کریں",
    problemHeading: "ریستورانوں کی آمدنی کھولیں،",
    problemHeadingAccent: "اپنی پکی کریں",
    problemBody:
      "خودمختار ریستوران ایسے جامد PDF مینو کی وجہ سے فروخت گنواتے ہیں جو وقت پر بدلتے ہی نہیں۔ Menuthere پارٹنر کے طور پر آپ یہ مسئلہ ہمارے آزمودہ $30 ماہانہ پلیٹ فارم سے حل کرتے ہیں — فوری QR اپ ڈیٹس جن پر 600+ مقامات بھروسہ کرتے ہیں — اور آپ ان کے سب سے قابل اعتماد مشیر بن جاتے ہیں۔",
    benefitsHeading: "ہمارے ساتھ پارٹنرشپ",
    benefitsHeadingAccent: "کیوں؟",
    earningsBadge: "کمائی کا بڑا موقع",
    earningsHeading: "کارکردگی پر مبنی کمیشن",
    earningsHeadingAccent: "اسٹرکچر۔",
    earningsSubheading:
      "ادائیگیاں سیدھی آمدنی سے جڑی ہیں۔ جس دن سبسکرپشن کی رقم ہمیں ملتی ہے، اسی دن Stripe کے ذریعے ماہانہ ادائیگی۔",
    earningsTableTierHeader: "ٹیئر",
    earningsTableRevenueHeader: "تاحیات ریفرل آمدنی",
    earningsTableCommissionHeader: "کمیشن (فی $30 سبسکرپشن)",
    tierStarterName: "اسٹارٹر",
    tierStarterRevenue: "$0 سے $1,000",
    tierStarterRate: "20%",
    tierStarterPayout: "($6 ماہانہ)",
    tierStarterPayoutPerSub: "$6 ماہانہ فی سبسکرپشن",
    tierGrowthName: "گروتھ",
    tierGrowthRevenue: "$1,001 سے $5,000",
    tierGrowthRate: "25%",
    tierGrowthPayout: "($7.50 ماہانہ)",
    tierGrowthPayoutPerSub: "$7.50 ماہانہ فی سبسکرپشن",
    tierEliteName: "ایلیٹ",
    tierEliteRevenue: "$5,001+",
    tierEliteRate: "30%",
    tierElitePayout: "($9 ماہانہ)",
    tierElitePayoutPerSub: "$9 ماہانہ فی سبسکرپشن",
    tierCardRevenueLabel: "آمدنی",
    tierCardCommissionLabel: "کمیشن",
    processHeading: "پارٹنر آن بورڈنگ کا",
    processHeadingAccent: "طریقہ کار۔",
    processStepOneTitle: "درخواست کا جائزہ",
    processStepOneDescription:
      "تیز منظوری اور ری سیلر پورٹل تک رسائی (ڈیمو لنکس، برانڈڈ مواد)۔",
    processStepTwoTitle: "فیلڈ میں اتریں",
    processStepTwoDescription:
      "ریستوران چنیں، 5 منٹ کا ڈیمو دیں اور سودا پکا کریں۔",
    processStepThreeTitle: "آمدنی میں حصہ",
    processStepThreeDescription:
      "خودکار ٹریکنگ اور وصول شدہ رقم پر اسی دن ادائیگی۔",
    idealPartnerHeading: "ہمیں مطلوب",
    idealPartnerHeadingAccent: "اسٹریٹجک پارٹنرز",
    idealPartnerBody:
      "ایسے آزمودہ سیلز پروفیشنلز جو ریستورانوں سے تعلق بنانا جانتے ہیں۔ یہ پروگرام صرف ثابت شدہ کارکردگی والوں کے لیے ہے۔",
    partnerTypeRestaurantAdvisors: "ریستوران مشیر",
    partnerTypeChannelPartners: "B2B چینل پارٹنرز",
    partnerTypeSalesExecutives: "سیلز ایگزیکٹوز",
    partnerTypeFranchiseSpecialists: "فرنچائز ماہرین",
    partnerTypeSaasResellers: "SaaS ری سیلرز",
    partnerTypeBizDevPros: "بزنس ڈیولپمنٹ ماہرین",
    faqHeading: "پارٹنر",
    faqHeadingAccent: "عمومی سوالات۔",
    faqProductOverviewQuestion: "پروڈکٹ کا تعارف",
    faqProductOverviewAnswer:
      "دنیا بھر کے ریستورانوں کے لیے $30 ماہانہ کا پریمیم QR ڈیجیٹل مینو پلیٹ فارم۔",
    faqExperienceRequiredQuestion: "مطلوبہ تجربہ",
    faqExperienceRequiredAnswer:
      "فیلڈ سیلز کا تجربہ؛ باقی سارا مواد ہماری طرف سے۔",
    faqPayoutMechanicsQuestion: "ادائیگی کا طریقہ",
    faqPayoutMechanicsAnswer:
      "وصولی والے دن Stripe کے ذریعے ماہانہ ادائیگی، ہر فعال سبسکرپشن پر تاحیات۔",
    faqCostsInvolvedQuestion: "کتنی لاگت",
    faqCostsInvolvedAnswer: "کچھ بھی نہیں، سب کچھ کمیشن پر۔",
    faqTerritoryQuestion: "علاقہ",
    faqTerritoryAnswer: "دنیا بھر کے خودمختار ریستوران، امریکہ کو ترجیح۔",
    faqResourcesQuestion: "وسائل",
    faqResourcesAnswer:
      "ویڈیوز، اسکرپٹس اور پریزنٹیشنز والا پورٹل؛ تیار لیڈز بھی دستیاب۔",
    trustBadgeDeployments: "600+ لائیو ڈیپلائمنٹس",
    trustBadgeFieldTested: "فیلڈ میں آزمودہ ماڈل",
    trustBadgeRevenueShare: "صرف ریونیو شیئر",
    trustBadgeExclusiveAccess: "خصوصی رسائی",
    termsHeading: "پارٹنر پروگرام کی شرائط",
    termsIncomeContinuity:
      "آمدنی کا تسلسل: کمیشن صرف فعال سبسکرپشنز پر جاری رہتا ہے۔",
    termsTerminationRights:
      "اختتام کا حق: برانڈ سے مطابقت نہ ہونے پر Menuthere شراکت ختم کر سکتا ہے۔",
    termsPayoutTiming:
      "ادائیگی کا وقت: سبسکرپشن وصول ہونے والے دن، فیس منہا کرنے کے بعد۔",
    termsEligibility: "اہلیت: دنیا بھر سے پارٹنرز قبول ہیں؛ منظوری سے مشروط۔",
  },
  solutionsIndex: {
    metaTitle: "ہر فوڈ کاروبار کے لیے ڈیجیٹل مینو | Menuthere",
    metaDescription:
      "سمارٹ ڈیجیٹل مینو سے اپنا فوڈ کاروبار بدلیں۔ ریستوران، کیفے، بیکری، کلاؤڈ کچن، ہوٹل، فوڈ ٹرک اور بار کے لیے۔ QR مینو، فوری اپ ڈیٹس، Google Business سنک۔",
    ogTitle: "ڈیجیٹل مینو کے حل | Menuthere",
    ogDescription:
      "ریستوران، کیفے، بیکری اور مزید کے لیے سمارٹ ڈیجیٹل مینو۔ فوری اپ ڈیٹس، خوبصورت ڈیزائن، پرنٹنگ کا صفر خرچ۔",
    heroTitleLead: "ڈیجیٹل مینو جو آپ کا کاروبار",
    heroTitleEmphasis: "بدل",
    heroTitleTail: "کر رکھ دیں۔",
    heroSubtitle:
      "چھوٹا سا کیفے ہو، بھرا ہوا ریستوران ہو یا کلاؤڈ کچن کا پورا نیٹ ورک — ہمارا پلیٹ فارم آپ کی ضرورت کے مطابق ڈھل جاتا ہے۔",
    heroPrimaryCta: "مفت شروع کریں",
    heroSecondaryCta: "ڈیمو بک کریں",
    industriesHeadingLead: "اپنی انڈسٹری چنیں،",
    industriesHeadingEmphasis: "کام شروع کریں۔",
    industriesIntro:
      "آپ کے فوڈ کاروبار کی نوعیت کے مطابق خاص طور پر بنائے گئے ڈیجیٹل مینو حل۔",
    cardRestaurantsTitle: "ریستوران",
    cardRestaurantsDesc: "ڈائن ان کے لیے بہترین سمارٹ ڈیجیٹل مینو",
    cardCafesTitle: "کیفے اور کافی شاپس",
    cardCafesDesc: "بہترین کافی کے تجربے کے لیے جدید مینو",
    cardBakeriesTitle: "بیکری اور پیسٹری شاپس",
    cardBakeriesDesc: "اپنی تازہ بیکنگ خوبصورتی سے دکھائیں",
    cardCloudKitchensTitle: "کلاؤڈ کچن",
    cardCloudKitchensDesc: "کئی برانڈز کے مینو سنبھالنا اب آسان",
    cardHotelsTitle: "ہوٹل اور ریزورٹس",
    cardHotelsDesc: "مہمانوں کے لیے شاندار ڈائننگ تجربہ",
    cardFoodTrucksTitle: "فوڈ ٹرکس",
    cardFoodTrucksDesc: "موبائل مینو جو ہر جگہ آپ کے ساتھ چلے",
    cardBarsTitle: "بارز اور پبز",
    cardBarsDesc: "اسٹائل کے ساتھ بدلتے ڈرنکس مینو",
    cardCateringTitle: "کیٹرنگ سروسز",
    cardCateringDesc: "ہر تقریب کے لیے پروفیشنل مینو",
    cardOwnersTitle: "ریستوران مالکان",
    cardOwnersDesc: "اپنے ریستوران کے آپریشنز کا کنٹرول واپس لیں",
    cardAgenciesTitle: "ایجنسیاں اور کنسلٹنٹس",
    cardAgenciesDesc: "کئی کلائنٹ اکاؤنٹس آسانی سے چلائیں",
    cardPetpoojaTitle: "ڈائریکٹ آرڈرنگ اور PetPooja",
    cardPetpoojaDesc: "Swiggy اور Zomato کا بغیر کمیشن متبادل",
    cardWhatsappOrderingTitle: "WhatsApp آرڈرنگ",
    cardWhatsappOrderingDesc:
      "گاہک صرف “Hi” بھیج کر آرڈر کریں — نہ ایپ، نہ سائن اپ",
    cardLearnMoreLink: "مزید جانیں",
    featuresHeadingLead: "طاقتور فیچرز،",
    featuresHeadingEmphasis: "ہر کاروبار کے لیے۔",
    featureQrTitle: "QR کوڈ مینو",
    featureQrDesc: "فون سے اسکین کریں اور مینو حاضر۔ کوئی ایپ ڈاؤن لوڈ نہیں۔",
    featureRealtimeTitle: "فوری اپ ڈیٹس",
    featureRealtimeDesc:
      "قیمت بدلیں، نئی ڈش شامل کریں یا سولڈ آؤٹ لگائیں — سب اسی لمحے۔",
    featureGoogleSyncTitle: "Google Business سنک",
    featureGoogleSyncDesc:
      "آپ کے Google Business Profile کا مینو خود بخود اپ ڈیٹ۔",
    featureAnalyticsTitle: "اینالیٹکس اور بصیرت",
    featureAnalyticsDesc: "مقبول آئٹمز اور گاہکوں کی پسند پر نظر رکھیں۔",
    googleBadge: "Google Business انٹیگریشن",
    googleHeading: "اپنا مینو Google Business Profile سے ہم آہنگ کریں",
    googleBody:
      "آپ جب بھی کچھ بدلیں، آپ کے Google Business Profile کا مینو خود بخود اپ ڈیٹ ہو جاتا ہے۔ Google Maps پر آپ کو تلاش کرنے والے گاہکوں کو ہمیشہ تازہ ترین مینو ہی نظر آئے گا۔",
    googleBenefitOneClickSync: "ایک کلک میں Google Business Profile سے سنک",
    googleBenefitRealtimeUpdates: "ہر پلیٹ فارم پر مینو فوری اپ ڈیٹ",
    googleBenefitLocalSeo: "بہتر لوکل SEO اور نمایاں موجودگی",
    googleBenefitMoreCustomers: "Google Search اور Maps سے زیادہ گاہک",
    googleManagerLink: "Google Business Manager کے بارے میں جانیں",
    googleCardTitle: "Google Business Profile",
    googleCardSubtitle: "مینو مینیجر",
    googleCardSyncedLabel: "سنک شدہ مینو آئٹمز",
    googleCardLastSyncLabel: "آخری سنک",
    googleCardLastSyncValue: "ابھی ابھی",
  },
  getStarted: {
    metaTitle: "شروع کریں | Menuthere",
    metaDescription: "Menuthere کے ساتھ اپنا ڈیجیٹل مینو بنائیں۔",
    stepIndicator: "مرحلہ {step}/3",
    publishingLoader1: "آپ کا اکاؤنٹ بن رہا ہے...",
    publishingLoader2: "آپ کا ڈیجیٹل مینو تیار ہو رہا ہے...",
    publishingLoader3: "ڈیش بورڈ سیٹ ہو رہا ہے...",
    publishingLoader4: "بس تھوڑا سا اور...",
    step1Title: "اپنا مینو اپ لوڈ کریں",
    step1Subtitle: "مینو کی تصویر لیں، ہم اسے فوراً ڈیجیٹل کر دیں گے۔",
    filesSelectedCount: "{count} فائل(یں) منتخب",
    uploadDropzonePrompt: "اپ لوڈ کے لیے کلک کریں، ڈریگ اینڈ ڈراپ یا پیسٹ کریں",
    uploadFormatsHint: "JPG، PNG، PDF — 10MB تک",
    uploadAddMoreHint: "مزید شامل کرنے کے لیے یہاں کلک کریں",
    fileTooLargeBadge: "بہت بڑی ({size}MB)",
    filePreviewAlt: "صفحہ {number}",
    aiInstructionLabel: "ہمارے AI کے لیے ہدایات",
    optionalSuffix: "(اختیاری)",
    aiInstructionPlaceholder:
      "آپ کے مینو میں کوئی خاص بات؟ مثلاً \"سارے ڈرنکس نظرانداز کریں\"، \"Combos کو الگ کیٹیگری مانیں\"، \"قیمتیں AED میں ہیں\"",
    aiInstructionHint: "فائلیں پڑھتے وقت AI آپ کی ہدایت کو ترجیح دے گا۔",
    removeInvalidFilesButton: "آگے بڑھنے کے لیے غلط فائلیں ہٹائیں",
    nextStepButton: "اگلا مرحلہ",
    uploadOrDivider: "یا",
    sampleMenuButton: "نمونہ مینو آزمائیں",
    sampleMenuDialogTitle: "نمونہ مینو چنیں",
    sampleMenuDialogSubtitle:
      "کاروبار کی قسم چنیں اور پہلے سے تیار مینو کے ساتھ شروع کریں۔",
    sampleMenuComingSoonBadge: "جلد آ رہا ہے",
    filesTooLargeToast:
      "{count} فائل(یں) 10MB کی حد سے بڑی ہیں۔ براہ کرم چھوٹی فائلیں اپ لوڈ کریں۔",
    filesAddedToast: "{count} فائل(یں) شامل ہو گئیں!",
    sampleMenuLoadedToast: "\"{name}\" کا نمونہ مینو لوڈ ہو گیا!",
    step2Title: "ریستوران کی تفصیلات",
    step2Subtitle: "اپنی جگہ کے بارے میں کچھ بتائیں تاکہ مینو آپ جیسا لگے۔",
    restaurantNameLabel: "ریستوران کا نام",
    restaurantNamePlaceholder: "مثلاً The Burger Joint",
    usernameLabel: "یوزر نیم",
    usernamePlaceholder: "your_store_name",
    usernameCheckingStatus: "دستیابی دیکھی جا رہی ہے...",
    usernameAvailableStatus: "یہ یوزر نیم دستیاب ہے",
    usernameTakenStatus: "یہ یوزر نیم پہلے سے لیا جا چکا ہے",
    usernameMinLengthHint: "یوزر نیم کم از کم 3 حروف کا ہونا چاہیے",
    phoneNumberLabel: "فون نمبر",
    phoneCodePlaceholder: "کوڈ",
    phoneInvalidError: "فون نمبر درست نہیں",
    countryLabel: "ملک",
    countryPlaceholder: "ملک چنیں یا لکھیں",
    addressLabel: "پتہ",
    addressPlaceholder: "گلی، علاقہ، شہر…",
    currencyLabel: "کرنسی",
    currencyPlaceholder: "کرنسی چنیں یا تلاش کریں",
    currencySearchPlaceholder: "کرنسی تلاش کریں (مثلاً USD، Euro، ₹)",
    currencySelectFallback: "کرنسی چنیں",
    currencyNoMatch: "کوئی نتیجہ نہیں",
    logoLabel: "لوگو (اختیاری)",
    logoPreviewAlt: "لوگو کا پیش منظر",
    changeLogoButton: "لوگو بدلیں",
    uploadLogoButton: "لوگو اپ لوڈ کریں",
    removeLogoButton: "ہٹائیں",
    logoSizeLabel: "سائز (%)",
    logoBackgroundLabel: "پس منظر",
    createMenuButton: "مینو بنائیں",
    logoNotAnImageToast: "لوگو کے لیے تصویر والی فائل چنیں",
    logoTooLargeToast: "لوگو 10MB سے کم ہونا چاہیے",
    logoReadFailedToast: "یہ تصویر پڑھی نہیں جا سکی",
    missingDetailsToast: "براہ کرم تمام تفصیلات مکمل کریں",
    invalidPhoneToast: "براہ کرم درست فون نمبر درج کریں",
    extractingTitle: "آپ کا مینو نکالا جا رہا ہے",
    extractingSubtitle:
      "آپ کے مینو کی تصویر پر کام جاری ہے، ذرا انتظار کیجیے...",
    extractionErrorTitle: "مینو نہیں نکل سکا",
    menuUnreadableError:
      "ہم آپ کا مینو نہیں پڑھ سکے۔ زیادہ صاف فائلیں آزمائیں یا آئٹمز خود شامل کر لیں۔",
    extractionFailedToast: "مینو نکالنے میں ناکامی۔ دوبارہ کوشش کریں۔",
    retryExtractionButton: "دوبارہ کوشش کریں",
    cancelExtractionButton: "منسوخ کر کے دوبارہ اپ لوڈ کریں",
    step3Title: "آپ کا مینو تیار ہے!",
    step3Subtitle: "ہم نے {count} آئٹمز نکال لیے ہیں۔ نیچے اپنی تھیم چنیں۔",
    themePickerTitle: "تھیم چنیں",
    themeSwatchSample: "اب",
    themeClassicLabel: "کلاسک",
    themeMidnightLabel: "مڈنائٹ",
    themeFreshLabel: "فریش",
    publishButton: "لائیو کریں",
    authModalSignInTitle: "پبلش کرنے کے لیے سائن ان کریں",
    authModalEmailHint:
      "ڈیش بورڈ کی لاگ ان تفصیلات ہم آپ کی ای میل پر بھیج دیں گے۔",
    googleSignInButton: "Google سے سائن ان کریں",
    authDividerOr: "یا",
    emailPlaceholder: "you@example.com",
    continueWithEmailButton: "ای میل سے جاری رکھیں",
    authModalPasswordTitle: "پاس ورڈ بنائیں",
    authModalPasswordHint: "اپنے ڈیش بورڈ اکاؤنٹ کے لیے پاس ورڈ سیٹ کریں۔",
    passwordPlaceholder: "پاس ورڈ (کم از کم 6 حروف)",
    confirmPasswordPlaceholder: "پاس ورڈ دوبارہ لکھیں",
    continueButton: "جاری رکھیں",
    invalidEmailToast: "براہ کرم درست ای میل ایڈریس درج کریں",
    passwordTooShortToast: "پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے",
    passwordMismatchToast: "دونوں پاس ورڈ ایک جیسے نہیں",
    emailAlreadyRegisteredToast:
      "یہ ای میل پہلے سے رجسٹرڈ ہے۔ براہ کرم کوئی اور ای میل استعمال کریں۔",
    googleSignInSuccessToast: "Google سے سائن ان ہو گیا!",
    googleSignInFailedToast: "Google سائن ان ناکام۔ دوبارہ کوشش کریں۔",
    publishSuccessToast: "مینو پبلش ہو گیا! ڈیش بورڈ پر لے جا رہے ہیں...",
    publishFailedToast: "سائن اپ مکمل نہیں ہو سکا۔ دوبارہ کوشش کریں۔",
    successTitle: "اپنی ای میل دیکھیں!",
    successSubtitle:
      "ہم نے آپ کے مینو کا لنک اور ڈیش بورڈ کی لاگ ان تفصیلات یہاں بھیج دی ہیں:",
    successSpamHint:
      "نہیں مل رہی؟ اسپیم فولڈر دیکھیں یا نیچے اپنی ای میل بدل لیں۔",
    successMobileSubtitle:
      "ہم نے آپ کے مینو کا لنک اور ڈیش بورڈ کی تفصیلات آپ کی ای میل پر بھیج دی ہیں۔",
    changeEmailButton: "غلط ای میل؟ بدلیں",
    loginToDashboardButton: "ڈیش بورڈ میں لاگ ان",
    changeEmailTitle: "ای میل بدلیں",
    changeEmailSubtitle:
      "اپنا درست ای میل ایڈریس درج کریں۔ مینو کا لنک اور ڈیش بورڈ کی تفصیلات ہم وہیں بھیج دیں گے۔",
    newEmailLabel: "نیا ای میل ایڈریس",
    updatingEmailButton: "اپ ڈیٹ ہو رہا ہے...",
    updateAndResendButton: "اپ ڈیٹ کر کے دوبارہ بھیجیں",
    emailUpdatedToast: "ای میل اپ ڈیٹ ہو گئی! نیا ان باکس دیکھیں۔",
    emailUpdateFailedToast: "ای میل اپ ڈیٹ نہیں ہو سکی۔ دوبارہ کوشش کریں۔",
  },
  helpCenter: {
    metaTitle: "مدد اور سپورٹ | Menuthere ڈیجیٹل مینو",
    metaDescription:
      "اپنے Menuthere ڈیجیٹل مینو کے لیے مدد لیں۔ عمومی سوالات، WhatsApp سپورٹ اور ای میل رابطہ۔ مینو، آفرز اور مزید پر فوری جواب۔",
    heroTitle: "مدد اور",
    heroTitleAccent: "سپورٹ۔",
    heroSubtitle:
      "کوئی مدد چاہیے؟ ہمیں ای میل کریں یا سیدھا WhatsApp پر بات کریں۔",
    faqSectionTitle: "اکثر پوچھے جانے والے",
    faqSectionTitleAccent: "سوالات۔",
    faq1Question: "گاہکوں کو Google یا ایپس پر پرانا مینو دکھنا کیسے بند کروں؟",
    faq1Answer:
      "پروڈکٹ، قیمت، تفصیل یا دستیابی — ہر تبدیلی آپ کے ڈیجیٹل مینو پر فوراً لاگو ہو جاتی ہے۔ ڈیش بورڈ سے View Menu پر کلک کر کے خود دیکھ لیں؛ نہ انتظار، نہ دوبارہ پرنٹنگ۔",
    faq2Question:
      "آؤٹ آف اسٹاک آئٹمز اب بھی میرے QR/ڈیجیٹل مینو پر نظر آ رہے ہیں — کیوں؟",
    faq2Answer:
      "Menu سیکشن میں اوپر Availability پر کلک کریں۔ ایک ہی کلک سے پوری کیٹیگری یا الگ آئٹم آن/آف کریں — سولڈ آؤٹ آئٹم فوراً ہر جگہ سے غائب۔",
    faq3Question: "مینو اپ ڈیٹ کرنے میں وقت بھی لگتا ہے اور ڈیزائنر کا خرچ بھی۔",
    faq3Answer:
      "ایڈٹ کرنا نہایت آسان اور سیکنڈوں کا کام ہے — کوئی تکنیکی مہارت درکار نہیں۔ Menu سیکشن میں جائیں، کسی بھی پروڈکٹ پر کلک کر کے نام، قیمت، تصویر، تفصیل، آفر یا ورائنٹ بدلیں اور محفوظ کر دیں۔ تبدیلی فوراً لائیو۔",
    faq4Question: "اپنے مینو کے پروڈکٹس فوری کیسے اپ ڈیٹ کروں؟",
    faq4Answer:
      "ڈیش بورڈ کے Menu سیکشن میں جائیں۔ تمام کیٹیگریز اور پروڈکٹس وہیں فہرست میں ہوں گے — کسی پر بھی کلک کر کے نام، قیمت، تصویر یا تفصیل بدلیں اور محفوظ کریں، اپ ڈیٹ فوراً ہو جائے گا۔",
    faq5Question: "مینو آئٹمز یا کیٹیگریز کی ترتیب کیسے بدلوں؟",
    faq5Answer:
      "Menu سیکشن کھولیں اور Priority پر کلک کریں۔ کیٹیگریز اور آئٹمز کو ڈریگ کریں یا ترجیحی نمبر دیں، پھر محفوظ کریں — نئی ترتیب فوراً لائیو نظر آئے گی۔",
    faq6Question: "مینو آئٹمز پر آفر یا اسپیشل کیسے لگاؤں؟",
    faq6Answer:
      "Specials/Best Sellers کے لیے: Menu سیکشن میں ہر آئٹم کا آپشن آن کریں — وہ Must-Try بن کر سب سے اوپر آ جائیں گے۔ اپنی مرضی کی آفرز کے لیے: Offers سیکشن میں ایک یا کئی آئٹمز کے ڈیل بنائیں، وہ فوراً فعال ہو جاتے ہیں۔",
    faq7Question:
      "کیا تکنیکی مدد کے بغیر بینر یا پروڈکٹ کی تصویریں بدلنا مشکل ہے؟",
    faq7Answer:
      "ریستوران کا بینر اپ لوڈ یا تبدیل کرنے کے لیے Settings → General Settings میں جائیں۔ پروڈکٹس کی تصویریں سیدھا Menu سیکشن میں بدلیں — ڈریگ اینڈ ڈراپ جتنا آسان، اور فوراً لائیو۔",
    faq8Question:
      "کیا تبدیلیوں کا پیش منظر دیکھ سکتا ہوں یا ڈیلی اسپیشل شیڈول کر سکتا ہوں؟",
    faq8Answer:
      "جی ہاں — محفوظ کرنے سے پہلے View Menu سے ہر تبدیلی کا پیش منظر دیکھ لیں۔ شیڈولنگ کے لیے Offers سیکشن سے وقت مقرر کریں (مثلاً ڈیلی اسپیشل) — روز لاگ ان کیے بغیر سب خودکار۔",
    faq9Question: "کیا بند اوقات میں اسٹور آف کیا جا سکتا ہے؟",
    faq9Answer:
      "جی ہاں۔ Settings میں جا کر کسی بھی وقت اپنا ریستوران آف کر دیں — بند اوقات، چھٹی یا مرمت کے لیے بہترین۔ تیار ہوں تو دوبارہ آن کر دیں۔",
    faq10Question: "مجموعی طور پر مینو آئٹمز ایڈٹ کرنا کتنا آسان ہے؟",
    faq10Answer:
      "بےحد آسان — ہر تبدیلی چند سیکنڈ کی۔ Menu سیکشن کے سادہ ٹوگل اور ڈراپ ڈاؤن سے قیمت، نام، تصویر، دستیابی یا آفرز بدلیں، نہ کوڈنگ، نہ ڈیزائنر۔",
    faq11Question: "کیا میں کسی بھی وقت اپنی سبسکرپشن منسوخ کر سکتا ہوں؟",
    faq11Answer:
      "جی ہاں — اپنے اکاؤنٹ سے کسی بھی وقت منسوخ کریں۔ پلان موجودہ بلنگ مدت کے اختتام تک چلتا رہے گا، اور تجدید نہ کرنے پر مزید کوئی چارج نہیں۔",
  },
  landing: {
    socialProofEyebrow: "پچھلے 30 دن کے اصل اعداد و شمار",
    statOrdersLabel: "موصول ہوئے آرڈرز",
    statRevenueLabel: "حاصل ہوئی آمدنی",
    statAvgOrderValueLabel: "اوسط آرڈر ویلیو",
    statSuffixLakh: "L+",
    statSuffixThousand: "K+",
    platformHeadingLead: "آپ کے ریستوران کی ہر ضرورت،",
    platformHeadingAccent: "ایک ہی پلیٹ فارم پر۔",
    featureWebsiteAppTitle: "اپنی ویب سائٹ اور اپنے برانڈ کی ایپ",
    featureWebsiteAppBody:
      "اپنے نام سے آرڈرنگ ویب سائٹ اور App Store اور Play Store پر اپنی ایپ لانچ کریں۔ گاہک سیدھا آپ سے آرڈر کریں — نہ کوئی ایگریگیٹر بیچ میں، نہ 20-33% کمیشن۔ وہ ایک ٹیپ میں مینو دیکھیں، آرڈر کریں، ڈیلیوری ٹریک کریں اور دوبارہ آرڈر کریں، جبکہ گاہک کا رشتہ، قیمتوں کا کنٹرول اور منافع کا ہر روپیہ آپ کا رہتا ہے۔",
    featureWebsiteAppCta: "کیسے کام کرتا ہے",
    featureWhatsappOrderingTitle: "WhatsApp پر آرڈر — بس “Hi” بھیجیں",
    featureWhatsappOrderingBody:
      "اپنے WhatsApp نمبر کو آرڈر لینے کا سب سے آسان ذریعہ بنائیں۔ گاہک سادہ سا “Hi” بھیجیں اور فوراً آپ کے مینو کا آٹو لاگ ان لنک پائیں — نہ ایپ ڈاؤن لوڈ، نہ سائن اپ، نہ OTP۔ وہ چند ٹیپ میں آرڈر کریں اور WhatsApp پر ہی لائیو اسٹیٹس دیکھیں، جبکہ گاہک آپ کا رہتا ہے اور کمیشن صفر۔",
    featureWhatsappOrderingCta: "WhatsApp آرڈرنگ دیکھیں",
    featurePetpoojaTitle: "Petpooja POS انٹیگریشن",
    featurePetpoojaBody:
      "ہر آن لائن آرڈر ریئل ٹائم میں سیدھا آپ کے Petpooja POS میں پہنچتا ہے۔ نہ ہاتھ سے اندراج، نہ آرڈر چھوٹنے کا ڈر، نہ دہری محنت۔ مینو آئٹمز، قیمتیں اور کیٹیگریز آپ کے POS اور ڈیلیوری ویب سائٹ کے درمیان خود بخود سنک ہوتی ہیں۔ بھارت کا واحد پلیٹ فارم جس میں Petpooja کی گہری انٹیگریشن پہلے سے موجود ہے۔",
    featurePetpoojaCta: "Petpooja انٹیگریشن جانیں",
    featurePaymentsTitle: "پیمنٹ انٹیگریشن",
    featurePaymentsBody:
      "بلٹ ان UPI، کارڈ، نیٹ بینکنگ اور والٹ کے ساتھ فوری ادائیگی لیں، اور کیش آن ڈیلیوری بھی۔ Cashfree سے چلنے والا محفوظ، PCI کمپلائنٹ چیک آؤٹ، اور رقم سیدھی آپ کے بینک اکاؤنٹ میں۔ نہ کوئی ایگریگیٹر آپ کا پیسہ روکے، نہ ادائیگی میں تاخیر۔ ہر روپیہ آپ تک پہنچتا ہے۔",
    featurePaymentsCta: "پیمنٹ آپشنز دیکھیں",
    featureOrderManagementTitle: "ریئل ٹائم آرڈر مینجمنٹ",
    featureOrderManagementBody:
      "ایک ہی ڈیش بورڈ سے ڈیلیوری آرڈرز قبول کریں، ٹریک کریں اور سنبھالیں۔ نئے آرڈر کی فوری اطلاع پائیں، اسٹیٹس ریئل ٹائم میں اپ ڈیٹ کریں اور کچن اور ڈیلیوری ٹیم کو ایک ہی صفحے پر رکھیں۔ اب نہ کئی ٹیبلٹس کا جھنجھٹ، نہ رش کے وقت آرڈر چھوٹنے کا ڈر۔",
    featureOrderManagementCta: "آرڈر مینجمنٹ دیکھیں",
    featureDigitalMenuTitle: "ڈیجیٹل مینو مینجمنٹ",
    featureDigitalMenuBody:
      "پورا مینو ایک ڈیش بورڈ سے چلائیں: آئٹمز، قیمتیں، کیٹیگریز، تصویریں اور ورائنٹس ریئل ٹائم میں شامل یا ایڈٹ کریں۔ ڈشز کو فوراً ان یا آؤٹ آف اسٹاک کریں، ڈائٹ فلٹرز اور اسمارٹ سرچ لگائیں، اور ویب سائٹ، ایپ اور QR کوڈز پر سب کچھ ایک جیسا رکھیں۔ نہ دوبارہ پرنٹنگ، نہ ڈیولپرز۔ محفوظ کرتے ہی تبدیلی لائیو۔",
    featureDigitalMenuCta: "ڈیجیٹل مینو کے بارے میں جانیں",
    featureOffersTitle: "بدلتی آفرز اور پروموشنز",
    featureOffersBody:
      "فلیش ڈیل، ہیپی آور اسپیشل یا وقت مقرر رعایتیں چلائیں جو خود بخود شروع اور ختم ہو جائیں۔ بیسٹ سیلرز کو Must-Try بیج اور Chef's Choice ٹیگ سے نمایاں کریں۔ ایک پرچہ چھپوائے بغیر بار بار آرڈر اور آمدنی بڑھائیں۔",
    featureOffersCta: "آفرز کیسے چلتی ہیں",
    featureGoogleSyncTitle: "Google Business مینو سنک",
    featureGoogleSyncBody:
      "اپنا پورا مینو (کیٹیگریز، آئٹمز، قیمتیں اور تصویریں) ایک کلک میں اپنے Google Business Profile پر سنک کریں۔ Google Maps پر مکمل مینو کے ساتھ نظر آئیں۔ مکمل پروفائل والے ریستورانوں کو 7 گنا زیادہ کلکس ملتے ہیں اور 30% زیادہ گاہک آتے ہیں۔",
    featureGoogleSyncCta: "Google Sync کیسے کام کرتا ہے",
    featureDeliveryAppTitle: "ڈیلیوری بوائے ایپ",
    featureDeliveryAppBody:
      "آپ کی ڈیلیوری ٹیم کے لیے الگ ایپ۔ ڈیلیوری بوائے آرڈر کی اطلاع پائیں، گاہک کے پتے تک راستہ دیکھیں اور ڈیلیوری اسٹیٹس ریئل ٹائم میں اپ ڈیٹ کریں۔ لائیو لوکیشن ٹریک کریں، آرڈر خودکار طریقے سے تفویض کریں اور پوری نظر کے ساتھ تیز ڈیلیوری یقینی بنائیں۔",
    featureDeliveryAppCta: "ڈیلیوری ایپ کے بارے میں جانیں",
    featureAnalyticsTitle: "اینالیٹکس اور بصیرت",
    featureAnalyticsBody:
      "آرڈرز کی تعداد، آمدنی کے رجحان، مصروف اوقات اور سب سے زیادہ بکنے والی ڈشز پر نظر رکھیں۔ قیمت، پروموشن اور ڈیلیوری کے فیصلے اندازے سے نہیں، ڈیٹا سے کریں۔ جانیں کہ کیا چل رہا ہے اور کہاں بہتری چاہیے۔",
    featureAnalyticsCta: "اینالیٹکس کے بارے میں جانیں",
    ctaBannerHeadingDefault: "2 منٹ سے کم میں اپنی ڈیلیوری ویب سائٹ لانچ کریں۔",
    ctaBannerBodyDefault:
      "مینو اپ لوڈ کریں، ڈیلیوری زون سیٹ کریں اور مکمل Petpooja POS انٹیگریشن کے ساتھ سیدھا اپنے گاہکوں سے آرڈر لینا شروع کریں۔ 600+ ریستوران پہلے ہی Menuthere کے ساتھ بڑھ رہے ہیں۔",
    ctaBannerPrimaryButton: "مفت شروع کریں",
    ctaBannerSecondaryButton: "تمام پلانز دیکھیں",
    faqHeadingLead: "اکثر پوچھے جانے والے",
    faqHeadingAccent: "سوالات۔",
    faqVsAggregatorsQuestion: "Menuthere، Zomato یا Swiggy سے کیسے مختلف ہے؟",
    faqVsAggregatorsAnswer:
      "Zomato اور Swiggy جیسے ایگریگیٹر ہر آرڈر پر 20-33% کمیشن لیتے ہیں۔ Menuthere آپ کو اپنے برانڈ کی ڈیلیوری ویب سائٹ دیتا ہے جہاں گاہک سیدھا آپ سے آرڈر کرتے ہیں، صرف 1% کمیشن پر۔ گاہک کا ڈیٹا آپ کا، قیمتوں کا کنٹرول آپ کا، اور برانڈ کی وفاداری بھی آپ کی۔",
    faqPetpoojaIntegrationQuestion: "Petpooja POS انٹیگریشن کیسے کام کرتی ہے؟",
    faqPetpoojaIntegrationAnswer:
      "ایک بار جڑ جانے کے بعد آپ کا Petpooja مینو خود بخود Menuthere ڈیلیوری ویب سائٹ سے سنک ہو جاتا ہے۔ ہر آن لائن آرڈر ریئل ٹائم میں سیدھا آپ کے POS پر چلا جاتا ہے۔ نہ ہاتھ سے اندراج، نہ کوئی آرڈر چھوٹے۔ مینو آئٹمز، قیمتیں اور کیٹیگریز دونوں سسٹمز میں ایک جیسی رہتی ہیں۔",
    faqDeliveryZonesQuestion: "اپنے ڈیلیوری زون اور چارجز کیسے سیٹ کروں؟",
    faqDeliveryZonesAnswer:
      "ڈیش بورڈ سے Delivery Settings میں جائیں۔ رداس یا پن کوڈ کے حساب سے ڈیلیوری زون بنائیں، ہر زون کے چارجز مقرر کریں اور کم از کم آرڈر کی رقم طے کریں۔ کسی بھی علاقے کے لیے ڈیلیوری کبھی بھی آن یا آف کی جا سکتی ہے۔",
    faqPickupOrdersQuestion:
      "کیا گاہک ڈیلیوری کے ساتھ پک اپ آرڈر بھی کر سکتے ہیں؟",
    faqPickupOrdersAnswer:
      "جی ہاں، آپ کی ڈیلیوری ویب سائٹ ڈیلیوری اور پک اپ دونوں سپورٹ کرتی ہے۔ گاہک چیک آؤٹ پر اپنی پسند چن سکتے ہیں۔ دونوں میں سے کوئی بھی آپشن ڈیش بورڈ کی سیٹنگز سے آن یا آف کیا جا سکتا ہے۔",
    faqRushHourOrdersQuestion: "رش کے اوقات میں آنے والے آرڈرز کیسے سنبھالوں؟",
    faqRushHourOrdersAnswer:
      "تمام آرڈرز فوری اطلاع کے ساتھ ریئل ٹائم میں آپ کے ڈیش بورڈ پر آتے ہیں۔ ایک ہی اسکرین سے آرڈر قبول کریں، تیار کریں اور اسٹیٹس اپ ڈیٹ کریں۔ Petpooja POS جڑا ہو تو آرڈر وہاں بھی سنک ہو جاتے ہیں، سو کچن بھی ساتھ چلتا رہتا ہے۔",
    faqTechnicalSkillsQuestion: "کیا اسے سیٹ کرنے کے لیے تکنیکی مہارت چاہیے؟",
    faqTechnicalSkillsAnswer:
      "بالکل نہیں۔ مینو اپ لوڈ کریں (یا Petpooja سے سنک کریں)، اپنی برانڈنگ لگائیں اور ڈیلیوری ویب سائٹ منٹوں میں لائیو۔ نہ کوڈنگ، نہ ڈیزائنر، نہ کوئی ایپ ڈاؤن لوڈ۔",
    faqOffersDiscountsQuestion:
      "کیا میں اپنی ڈیلیوری ویب سائٹ پر آفرز اور رعایتیں چلا سکتا ہوں؟",
    faqOffersDiscountsAnswer:
      "جی ہاں! فلیش ڈیل، کوپن کوڈ، پہلے آرڈر پر رعایت یا وقت مقرر اسپیشل چلائیں جو خود بخود شروع اور ختم ہو جائیں۔ بیسٹ سیلرز کو Must-Try بیج سے نمایاں کر کے اوسط آرڈر ویلیو بڑھائیں۔",
    faqCustomerDiscoveryQuestion: "گاہک میری ڈیلیوری ویب سائٹ تک کیسے پہنچیں گے؟",
    faqCustomerDiscoveryAnswer:
      "اپنی ویب سائٹ کا لنک سوشل میڈیا، WhatsApp، Google Business Profile اور دکان کے QR کوڈز پر شیئر کریں۔ Menuthere آپ کا مینو Google Maps پر بھی سنک کر دیتا ہے تاکہ گاہک خود آپ تک پہنچیں۔ آپ کی ویب سائٹ پہلے دن سے SEO کے لیے تیار ہے۔",
    faqPauseOrderingQuestion: "کیا بند اوقات میں آرڈر لینا روکا جا سکتا ہے؟",
    faqPauseOrderingAnswer:
      "جی ہاں۔ Settings میں جا کر کسی بھی وقت اپنا ریستوران آف کر دیں — بند اوقات، چھٹیوں یا مرمت کے لیے بہترین۔ تیار ہوں تو دوبارہ آن کر دیں۔ خودکار کھلنے اور بند ہونے کا شیڈول بھی سیٹ کیا جا سکتا ہے۔",
    faqCancelSubscriptionQuestion:
      "کیا میں کسی بھی وقت اپنی سبسکرپشن منسوخ کر سکتا ہوں؟",
    faqCancelSubscriptionAnswer:
      "جی ہاں، اپنے اکاؤنٹ سے کسی بھی وقت منسوخ کریں۔ پلان موجودہ بلنگ مدت کے اختتام تک چلتا رہے گا، اور تجدید نہ کرنے پر مزید کوئی چارج نہیں۔",
    reviewExpandButton: "مزید دیکھیں",
    reviewCollapseButton: "کم دیکھیں",
    reviewOneAuthorName: "Hotel Colombo",
    reviewOneAuthorLocation: "MG Road, Edappally",
    reviewOneAuthorInitials: "HC",
    reviewOneParagraphOne:
      "سچ کہوں تو مجھے اندازہ نہیں تھا کہ ایپ بنوانا اتنا آسان ہوگا 😅 انہوں نے سب کچھ بڑے سکون سے سنبھالا اور پورا عمل ہمارے لیے نہایت سادہ بنا دیا۔",
    reviewOneParagraphTwo:
      "اور انہوں نے اسے بالکل ویسا ہی بنایا جیسا میں چاہتا تھا۔ میں کچھ چیزوں پر بہت سخت تھا اور ذرا بھی سمجھوتہ کرنے کو تیار نہیں تھا — کئی بار کام دوبارہ ہوا، مگر وہ پورے وقت صبر اور ٹھنڈے دماغ سے کام کرتے رہے اور آخر میں بالکل ٹھیک بنا دیا۔",
    reviewOneParagraphThree: "بہت صاف ستھرا کام، آپ سب کا بےحد شکریہ۔",
    reviewTwoAuthorName: "Rimaal Mandi & Grills",
    reviewTwoAuthorLocation: "Pune",
    reviewTwoAuthorInitials: "RM",
    reviewTwoParagraphOne:
      "ہماری ایپ بنانے پر MenuThere ٹیم کا شکریہ۔ اس ایپ سے گاہک سیدھا ہم سے آرڈر کرتے ہیں اور ڈیلیوری سنبھالنا بہت آسان ہو گیا ہے۔ ہم نے Porter جیسی تھرڈ پارٹی ڈیلیوری سروسز بھی رکھیں، اور ٹیم نے انہیں کامیابی سے سسٹم میں شامل کر دیا۔ سب کچھ بخوبی چل رہا ہے اور انہوں نے بہترین کام کیا ہے۔",
    reviewTwoParagraphTwo:
      "یہ ایپ لانچ کرنے کی بڑی وجہ یہ ہے کہ Zomato اور Swiggy جیسے پلیٹ فارم ہمیں اچھا کاروبار اور گاہک تو دیتے ہیں، مگر کمیشن اور دوسرے اخراجات کی وجہ سے ہاتھ آنے والی رقم کبھی کبھی بہت کم رہ جاتی ہے۔ ظاہر ہے ہم Zomato اور Swiggy چھوڑ نہیں سکتے، بہت سے گاہک انہی سے آرڈر کرنے کے عادی ہیں، اور ہم ان کے ساتھ کام جاری رکھیں گے۔",
    reviewTwoParagraphThree:
      "ساتھ ہی یہ ایپ ہمیں اپنے گاہکوں سے براہ راست جڑنے اور انہیں بہتر خدمت دینے کا ایک اور راستہ دیتی ہے۔",
    reviewTwoParagraphFour:
      "MenuThere ٹیم، آپ کے تعاون اور شاندار کام کا شکریہ۔",
  },
  footerLinks: {
    brandBlurb:
      "ریستورانوں کے لیے آن لائن آرڈرنگ اور ڈیلیوری کا مکمل پلیٹ فارم۔ اپنی ویب سائٹ لانچ کریں، ایگریگیٹر کا کمیشن بچائیں اور اپنا کاروبار بڑھائیں۔",
    solutionsGoogleBusinessSync: "Google Business سنک",
    solutionsOwners: "مالکان",
    solutionsAgencies: "ایجنسیاں",
    solutionsPetpoojaIntegration: "PetPooja انٹیگریشن",
    solutionsRestaurants: "ریستوران",
    solutionsCafes: "کیفے",
    resourcesHelpCenter: "ہیلپ سینٹر",
    resourcesDownloadApp: "ایپ ڈاؤن لوڈ کریں",
    resourcesGetStarted: "شروع کریں",
    legalPrivacyPolicy: "پرائیویسی پالیسی",
    legalTermsOfService: "سروس کی شرائط",
    legalRefundPolicy: "ریفنڈ پالیسی",
    copyright: "© 2026 Menuthere.",
  },
  solutionsRest: {
    shared: {
      breadcrumbHome: "ہوم",
      breadcrumbSolutions: "حل",
      bookDemoCta: "ڈیمو بک کریں",
      stepLabel: "مرحلہ {step}",
      faqHeading: "اکثر پوچھے جانے والے سوالات۔",
      zeroPercentValue: "0%",
    },
    googleBusiness: {
      metaTitle: "مینو Google Business پر سنک کریں | Menuthere",
      metaDescription:
        "اپنے ریستوران کا مینو خود بخود Google Business Profile پر سنک کریں۔ ایک کلک سیٹ اپ، فوری اپ ڈیٹس، بہتر لوکل SEO۔ 600+ ریستورانوں کا اعتماد۔",
      ogDescription:
        "اپنے ریستوران کا مینو خود بخود Google Maps پر سنک کریں۔ ہمیشہ تازہ، اور بغیر کسی محنت کے۔",
      breadcrumbCurrent: "Google Business Profile مینو سنک",
      heroBadge: "Google Business انٹیگریشن",
      heroTitle: "اپنا مینو خود بخود Google Maps پر بھیجیں",
      heroSubtitle:
        "اپنے Google Business Profile کا مینو ہمیشہ تازہ رکھیں۔ Menuthere سے ایک کلک سنک — آپ کا مینو Google Search اور Maps پر، ہر بار درست۔",
      heroPrimaryCta: "مینو سنک کریں",
      mockupCardTitle: "Google Business Profile",
      mockupCardSubtitle: "مینو سنک مینیجر",
      mockupSyncStatusTitle: "مینو کامیابی سے سنک ہو گیا",
      mockupSyncStatusMeta: "آخری سنک: ابھی ابھی",
      mockupStatItemsLabel: "سنک شدہ آئٹمز",
      mockupStatCategoriesLabel: "کیٹیگریز",
      mockupStatImagesLabel: "تصویروں کے ساتھ",
      mockupRecentlySyncedLabel: "حال ہی میں سنک ہوئے",
      mockupItem1Name: "بٹر چکن",
      mockupItem1Category: "مین کورس",
      mockupItem2Name: "پنیر ٹکہ",
      mockupItem2Category: "اسٹارٹرز",
      mockupItem3Name: "گلاب جامن",
      mockupItem3Category: "میٹھے",
      mockupBadgeTitle: "پروفائل ویوز",
      mockupBadgeValue: "اس ماہ +340%",
      statSyncingValue: "500+",
      statSyncingLabel: "ریستوران سنک کر رہے ہیں",
      statClicksValue: "7x",
      statClicksLabel: "زیادہ پروفائل کلکس",
      statSyncTimeValue: "< 30s",
      statSyncTimeLabel: "سنک کا وقت",
      statFootfallValue: "30%",
      statFootfallLabel: "زیادہ گاہک",
      howItWorksBadge: "آسان 3 مرحلوں کا عمل",
      howItWorksHeading: "یہ کیسے کام کرتا ہے",
      howItWorksSubheading:
        "آپ کے مینو ڈیش بورڈ سے Google Maps تک، تین آسان مرحلوں میں",
      step1Title: "اپنا مینو بنائیں",
      step1Body:
        "ہمارے پلیٹ فارم پر کیٹیگریز، آئٹمز، قیمتوں اور تصویروں کے ساتھ مینو بنائیں۔ صرف چند منٹ کا کام۔",
      step2Title: "Google پروفائل جوڑیں",
      step2Body:
        "ایک کلک میں اپنا Google Business Profile جوڑیں۔ OAuth اور API کی ساری سیٹنگ ہم سنبھال لیتے ہیں۔",
      step3Title: "سنک کریں اور لائیو ہو جائیں",
      step3Body:
        "سنک دبائیں اور پورا مینو Google Maps پر آ جائے گا۔ جب چاہیں بدلیں — تبدیلی فوراً نظر آتی ہے۔",
      benefitsHeading: "ریستوران Google مینو سنک کو کیوں پسند کرتے ہیں",
      benefitsSubheading:
        "آپ کا مینو آپ کا سب سے بڑا مارکیٹنگ ہتھیار ہے — اسے وہاں دکھائیں جہاں گاہک تلاش کر رہے ہیں",
      benefit1Title: "لوکل SEO بہتر بنائیں",
      benefit1Body:
        "مکمل Google Business Profile والے ریستورانوں کو 7 گنا زیادہ کلکس ملتے ہیں۔ سنک شدہ مینو لوکل رینکنگ کے سب سے مضبوط اشاروں میں سے ایک ہے — اور \"restaurants near me\" جیسی تلاش میں آپ کو اوپر لاتا ہے۔",
      benefit2Title: "Google Maps پر نظر آئیں",
      benefit2Body:
        "جب گاہک Google Maps پر کھانا تلاش کریں تو آپ کا پورا مینو وہیں نظر آتا ہے — قیمتیں، کیٹیگریز اور آئٹمز۔ فون کرنے سے پہلے ہی وہ آنے کا فیصلہ کر لیتے ہیں۔",
      benefit3Title: "ہمیشہ تازہ",
      benefit3Body:
        "قیمت بدلی؟ نئی ڈش آئی؟ سیزن کی چیز ہٹا دی؟ ایک سنک اور آپ کے Google Business Profile کا مینو تازہ ترین ہو جاتا ہے۔ Google پر ہاتھ سے ایڈٹ کرنے کی ضرورت نہیں۔",
      benefit4Title: "ہر ہفتے کئی گھنٹے بچائیں",
      benefit4Body:
        "Google Business کا مینو ہاتھ سے اپ ڈیٹ کرنا تھکا دینے والا اور غلطیوں سے بھرا کام ہے۔ ہمارا سنک یہ کام گھنٹوں میں نہیں، سیکنڈوں میں کرتا ہے۔ آپ کھانا بنائیں، کاپی پیسٹ نہیں۔",
      benefit5Title: "زیادہ گاہک لائیں",
      benefit5Body:
        "جو گاہک Google پر تفصیلی مینو دیکھتے ہیں، ان کے آنے کے امکانات 30% زیادہ ہوتے ہیں۔ انہیں وہ معلومات دیں جن کی بنیاد پر وہ آپ کو دوسروں پر ترجیح دیں۔",
      benefit6Title: "درست اور بھروسے کے قابل",
      benefit6Body:
        "اب آپ کے اصل مینو اور Google پر دکھنے والی قیمتوں میں فرق نہیں رہے گا۔ Maps پر پرانی معلومات کی وجہ سے آنے والی شکایتیں ختم۔",
      comparisonHeading: "سنک کے بغیر بمقابلہ Menuthere کے ساتھ",
      comparisonSubheading: "دیکھیں کہ خودکار مینو سنک کتنا فرق ڈالتا ہے",
      comparisonWithoutBadge: "✕ سنک کے بغیر",
      comparisonWithout1: "Google پر ہر آئٹم ایک ایک کر کے ہاتھ سے ڈالیں",
      comparisonWithout2: "Google کا مینو چند دن میں پرانا ہو جاتا ہے",
      comparisonWithout3: "قیمتوں کے فرق پر گاہکوں کی شکایتیں",
      comparisonWithout4: "ہر مہینے ڈیٹا انٹری میں گھنٹوں ضائع",
      comparisonWithout5: "کوئی تصویر نہیں — بس سادہ فہرست",
      comparisonWithout6: "ہر پلیٹ فارم پر الگ الگ معلومات",
      comparisonWithBadge: "✓ Menuthere کے ساتھ",
      comparisonWith1: "ایک کلک میں پورا مینو سنک",
      comparisonWith2: "Google کا مینو ہمیشہ آپ کے تازہ مینو جیسا",
      comparisonWith3: "درست قیمتیں گاہک کا بھروسہ بناتی ہیں",
      comparisonWith4: "سنک سیکنڈوں میں، گھنٹوں کی محنت نہیں",
      comparisonWith5: "تصویروں کی مکمل سپورٹ، دیکھنے میں شاندار",
      comparisonWith6: "ویب سائٹ، QR اور Google پر ایک ہی مینو",
      featuresHeading: "Google مینو سنک میں آپ کو کیا کچھ ملتا ہے",
      featuresSubheading:
        "آپ کی Google موجودگی کو درست اور پرکشش رکھنے کے لیے مکمل ٹول کٹ۔",
      feature1: "ایک کلک میں پورا مینو Google Business Profile پر سنک",
      feature2: "خودکار کیٹیگری میپنگ اور ترتیب",
      feature3: "مینو آئٹمز کے لیے تصویر اپ لوڈ سپورٹ",
      feature4: "قیمت اور دستیابی کا سنک",
      feature5: "چینز کے لیے کئی برانچوں کی سپورٹ",
      feature6: "سنک ہسٹری اور اسٹیٹس ٹریکنگ",
      feature7: "کسی بھی Google Business اکاؤنٹ کے ساتھ کام کرتا ہے",
      feature8: "کسی تکنیکی مہارت کی ضرورت نہیں",
      feature9: "ویج/نان ویج لیبلنگ کی سپورٹ",
      feature10: "خاص حروف اور کئی زبانوں والے مینو بھی سنبھالتا ہے",
      ctaBoxHeading: "مینو سنک کرنے کے لیے تیار؟",
      ctaBoxBody:
        "سینکڑوں ریستوران پہلے ہی Menuthere سے اپنی Google موجودگی تازہ رکھ رہے ہیں۔ سیٹ اپ میں 5 منٹ سے بھی کم لگتا ہے۔",
      ctaBoxButton: "مفت ٹرائل شروع کریں",
      comingSoonBadge: "جلد آ رہا ہے",
      comingSoonHeading: "آپ کی Google موجودگی کا مستقبل",
      comingSoonBody:
        "ہم ایسے نئے فیچرز بنا رہے ہیں جن سے آپ صرف مینو نہیں، پورا Google Business Profile سنبھال سکیں گے۔",
      autoPostTitle: "Google پر خودکار پوسٹ",
      autoPostBody:
        "پوسٹس، آفرز، ایونٹس اور اپ ڈیٹس خود بخود سیدھا اپنے Google Business Profile پر شائع کریں۔ آج کا اسپیشل، نئی ڈش یا تہوار کی آفر — Google میں لاگ ان کیے بغیر۔",
      autoPostPoint1: "تصویروں اور CTA کے ساتھ پوسٹ شیڈول کریں",
      autoPostPoint2: "روزانہ کے اسپیشل اور سیزن کی آفرز پروموٹ کریں",
      autoPostPoint3: "ایونٹ کے اعلانات خودکار طور پر شائع",
      autoPostPoint4: "پوسٹ اینالیٹکس اور اینگیجمنٹ ٹریکنگ",
      reviewRepliesTitle: "AI ریویو جوابات",
      reviewRepliesBody:
        "AI کو ہر Google ریویو کا سوچا سمجھا، ذاتی جواب لکھنے دیں — تعریف ہو یا شکایت۔ تیز جواب دیں، اپنی ساکھ برقرار رکھیں اور گاہکوں کو 24/7 محسوس کرائیں کہ آپ کو پروا ہے۔",
      reviewRepliesPoint1: "AI سے لکھے گئے پیشہ ورانہ اور خوش اخلاق جوابات",
      reviewRepliesPoint2: "اچھے اور برے، دونوں طرح کے ریویوز سنبھالتا ہے",
      reviewRepliesPoint3: "آپ کے ریستوران کے لہجے سے ملتا جلتا انداز",
      reviewRepliesPoint4: "پوسٹ کرنے سے پہلے ایک کلک منظوری یا ایڈٹ",
      testimonialQuote:
        "“ہر مہینے Google پر مینو اپ ڈیٹ کرنے میں پوری دوپہر لگ جاتی تھی۔ Menuthere کے ساتھ میں ایک بٹن دباتا ہوں اور سب کچھ سنک ہو جاتا ہے — آئٹمز، قیمتیں، حتیٰ کہ تصویریں بھی۔ اب ہماری Google Maps لسٹنگ پیشہ ورانہ لگتی ہے اور ایسے گاہک نمایاں طور پر بڑھ گئے ہیں جو کہتے ہیں کہ انہوں نے ہمارا مینو آن لائن دیکھا تھا۔”",
      testimonialAuthor: "ارجن اور پریا نائر",
      testimonialRole: "مالکان، Spice Route Kitchen",
      testimonialLocation: "کوچی، کیرالا",
      faqSubheading: "Google Business Profile مینو سنک کے بارے میں سب کچھ",
      faq1Question: "Google Business Profile مینو سنک ہے کیا؟",
      faq1Answer:
        "یہ ایک فیچر ہے جو آپ کے ریستوران کا مینو ہمارے پلیٹ فارم سے خود بخود آپ کے Google Business Profile (وہی لسٹنگ جو Google Search اور Google Maps پر نظر آتی ہے) پر نقل کر دیتا ہے۔ ہر آئٹم Google پر ہاتھ سے ڈالنے کے بجائے، سب کچھ ایک کلک میں سنک ہو جاتا ہے۔",
      faq2Question: "کیا اس کے لیے Google Business Profile ہونا ضروری ہے؟",
      faq2Answer:
        "جی ہاں، آپ کے ریستوران کا تصدیق شدہ Google Business Profile ہونا چاہیے۔ اگر ابھی نہیں ہے تو business.google.com پر مفت بنایا جا سکتا ہے۔ تصدیق کے بعد اسے ہمارے پلیٹ فارم سے جوڑ کر سنک شروع کر دیں۔",
      faq3Question: "مینو کتنی بار سنک کرنا چاہیے؟",
      faq3Answer:
        "جب بھی مینو میں کوئی تبدیلی کریں — نئے آئٹمز، قیمت میں فرق یا سیزن کی اپ ڈیٹ — تب سنک کر لیں۔ سنک میں چند سیکنڈ ہی لگتے ہیں، اس لیے تازہ رکھنے میں کوئی حرج نہیں۔ کچھ ریستوران روزانہ سنک کرتے ہیں، کچھ ہفتہ وار۔",
      faq4Question: "کیا سنک سے میرا موجودہ Google مینو مٹ جائے گا؟",
      faq4Answer:
        "جی ہاں، ہر سنک آپ کے Google Business Profile کے مینو کی جگہ ہمارے پلیٹ فارم کا تازہ ترین مینو رکھ دیتا ہے، تاکہ سب کچھ بالکل درست رہے۔ آپ کے Google Business Profile کی باقی معلومات (تصویریں، ریویوز، اوقات) پر کوئی اثر نہیں پڑتا۔",
      faq5Question: "کیا یہ کئی برانچوں کے لیے بھی کام کرتا ہے؟",
      faq5Answer:
        "جی ہاں! اگر آپ ایک ہی Google Business اکاؤنٹ سے کئی برانچیں چلاتے ہیں تو چن سکتے ہیں کہ کس برانچ پر سنک کرنا ہے۔ ہر برانچ کا اپنا مینو ہو سکتا ہے۔ ان ریستوران چینز کے لیے بہترین جن کا ہر برانچ پر مینو مختلف ہے۔",
      faq6Question: "کیا میرے Google اکاؤنٹ کا ڈیٹا محفوظ ہے؟",
      faq6Answer:
        "بالکل۔ ہم Google کا سرکاری OAuth 2.0 اور Business Profile API استعمال کرتے ہیں اور صرف اتنی ہی اجازت مانگتے ہیں جتنی مینو سنبھالنے کے لیے ضروری ہے۔ آپ کی لاگ ان تفصیلات کبھی محفوظ نہیں کی جاتیں — ہم محفوظ ٹوکن بیسڈ تصدیق استعمال کرتے ہیں۔",
      faq7Question: "سنک کے دوران مینو کی تصویروں کا کیا ہوتا ہے؟",
      faq7Answer:
        "آپ کے پروفائل میں موجود آئٹمز کی تصویریں مینو کے ڈیٹا کے ساتھ Google پر اپ لوڈ ہو جاتی ہیں۔ بڑی تصویریں Google کی شرائط کے مطابق خود بخود بہتر کر دی جاتی ہیں۔ اگر کوئی تصویر اپ لوڈ نہ ہو سکے تو آئٹم پھر بھی سنک ہو جاتا ہے — بس تصویر کے بغیر۔",
      faq8Question: "کیا یہ فیچر تمام پلانز میں شامل ہے؟",
      faq8Answer:
        "Google Business Profile مینو سنک ہمارے Pro اور Business پلانز میں دستیاب ہے۔ ہر پلان میں کیا کچھ شامل ہے، یہ جاننے کے لیے ہمارا پرائسنگ صفحہ دیکھیں۔",
    },
    petpooja: {
      metaTitle: "30% کمیشن دینا بند کریں | Menuthere ڈائریکٹ آرڈرنگ",
      metaDescription:
        "تھرڈ پارٹی ڈیلیوری پلیٹ فارم ہر آرڈر پر 20-30%+ کمیشن لیتے ہیں۔ Menuthere دیتا ہے آپ کی اپنی آرڈرنگ ایپ — 0% کمیشن، گاہک ڈیٹا اور PetPooja POS انٹیگریشن۔",
      ogTitle: "30% کمیشن دینا بند کریں | ریستورانوں کے لیے ڈائریکٹ آرڈرنگ",
      ogDescription:
        "دوسرے ڈیلیوری پلیٹ فارمز کو 20-30% کیوں دیں؟ اپنی آرڈرنگ ویب سائٹ لیں، صرف 0% کمیشن پر۔ PetPooja POS انٹیگریشن، پورا گاہک ڈیٹا اور مکمل کنٹرول۔",
      breadcrumbCurrent: "ڈائریکٹ آرڈرنگ اور PetPooja انٹیگریشن",
      heroTitle: "تھرڈ پارٹی ڈیلیوری پلیٹ فارمز کو 30% کمیشن دینا بند کریں",
      heroSubtitle:
        "اپنی آرڈرنگ ویب سائٹ، گاہک پر پورا حق، اور PetPooja POS انٹیگریشن",
      heroPrimaryCta: "براہ راست بیچنا شروع کریں",
      statCommissionLabel: "فی آرڈر کمیشن",
      value35Percent: "35%",
      statQuitLabel: "ریستوران ایگریگیٹر چھوڑنا چاہتے ہیں",
      statFeeValue: "45%",
      statFeeLabel: "اصل ایگریگیٹر فیس",
      statDataValue: "100%",
      statDataLabel: "گاہک ڈیٹا جو آپ کا ہے",
      introParagraph1:
        "ایگریگیٹر ہر آرڈر پر 20-33% کمیشن اور اوپر سے چھپی ہوئی فیسیں لیتے ہیں۔ 500 روپے کے آرڈر پر آپ کے 225 روپے تک چلے جاتے ہیں۔ یہ شراکت داری نہیں — آپ کی محنت پر ٹیکس ہے۔ CCI کی تحقیقات میں بڑے ڈیلیوری پلیٹ فارم مسابقتی قوانین کی خلاف ورزی کے مرتکب پائے گئے۔",
      introParagraph2:
        "Menuthere آپ کو اپنے برانڈ کی آرڈرنگ ویب سائٹ دیتا ہے — صرف 1% کمیشن اور گاہک کے ڈیٹا پر پورا حق کے ساتھ۔ PetPooja POS انٹیگریشن کے ساتھ آرڈر سیدھا آپ کے کچن میں پہنچتے ہیں: نہ کوئی بیچ والا، نہ آمدنی کی تقسیم، نہ کنٹرول کا نقصان۔",
      problemsHeading:
        "دوسرے ڈیلیوری پلیٹ فارم آپ کے ریستوران کو کیسے نقصان پہنچا رہے ہیں۔",
      problemsSubheading:
        "CCI کی تحقیقات میں دونوں پلیٹ فارم مسابقتی قوانین کی خلاف ورزی کے مرتکب پائے گئے۔ دیکھیں وہ آپ کے کاروبار کے ساتھ کیا کر رہے ہیں۔",
      problem1Title: "فی آرڈر 20-33% کمیشن",
      problem1Body:
        "تھرڈ پارٹی ڈیلیوری پلیٹ فارمز نے حال ہی میں کمیشن 33% تک بڑھا دیا۔ 500 روپے کے آرڈر پر باقی کٹوتیوں سے پہلے ہی 100-165 روپے چلے جاتے ہیں۔ کھانے کی لاگت، کرایہ اور عملے کی تنخواہ اسی بچے ہوئے میں سے نکلتی ہے۔",
      problem2Title: "چھپے ہوئے چارجز 45% تک",
      problem2Body:
        "کمیشن پر GST (18%)، پیمنٹ گیٹ وے فیس (2-3%)، پیکجنگ کا اضافی چارج (2-5 روپے فی آرڈر) اور زبردستی کی رعایتیں۔ 500 روپے کے آرڈر پر کل پلیٹ فارم فیس 212-227 روپے بن جاتی ہے — یعنی 42-45% ختم۔",
      problem3Title: "گاہک کا ڈیٹا ان کا ہے، آپ کا نہیں",
      problem3Body:
        "آپ ہزاروں گاہکوں کو کھانا کھلاتے ہیں مگر کسی سے بھی آپ کا براہ راست تعلق نہیں۔ پلیٹ فارم جان بوجھ کر گاہک کی تفصیلات چھپاتے ہیں — نام، فون نمبر، آرڈر ہسٹری۔ نہ آپ وفاداری بنا سکتے ہیں، نہ ٹارگٹڈ آفر چلا سکتے ہیں۔",
      problem4Title: "دکھائی دینے کے لیے پیسے دو",
      problem4Body:
        "دوسرے ڈیلیوری پلیٹ فارمز پر تلاش کے پہلے 10 نتائج تقریباً ہمیشہ پیسے دے کر لی گئی جگہیں ہوتی ہیں۔ پروموٹڈ لسٹنگ پر خرچ کیے بغیر آپ کا ریستوران نیچے دب جاتا ہے۔ اشتہار کے خرچ کے ساتھ اصل کمیشن 25-40% تک پہنچ جاتا ہے۔",
      problem5Title: "قیمت طے کرنے کی آزادی نہیں",
      problem5Body:
        "تھرڈ پارٹی ڈیلیوری پلیٹ فارم قیمتوں پر پابندیاں لگاتے ہیں، خلاف ورزی پر جرمانہ کرتے ہیں اور کہیں اور کم قیمت رکھنے پر رینک گرانے کی دھمکی دیتے ہیں۔ آپ اپنی قیمت کی حکمت عملی تک خود طے نہیں کر سکتے۔",
      problem6Title: "اب پلیٹ فارم خود آپ کے مقابل ہیں",
      problem6Body:
        "تھرڈ پارٹی ڈیلیوری پلیٹ فارم اب اپنے فوڈ برانڈ اور کوئیک کامرس ایپس لانچ کر رہے ہیں۔ وہ آپ ہی کے گاہکوں کا ڈیٹا استعمال کر کے آپ کے مقابل پروڈکٹ بنا رہے ہیں۔ NRAI اسے 'طاقت کا ناجائز استعمال' کہتی ہے۔",
      commissionHeading: "500 روپے کے آرڈر کی اصل قیمت۔",
      commissionSubheading:
        "دیکھیں کہ ایگریگیٹر پلیٹ فارمز پر اور ڈائریکٹ آرڈرنگ میں آپ کا پیسہ کہاں جاتا ہے۔",
      commissionColCharge: "چارج کی قسم",
      commissionColPlatforms: "ڈیلیوری پلیٹ فارمز",
      commissionRow1Label: "بنیادی کمیشن",
      commissionRow1Aggregator: "18-33%",
      commissionRow2Label: "GST",
      commissionRow2Aggregator: "~3-5%",
      commissionRow3Label: "پیمنٹ گیٹ وے",
      commissionRow3Aggregator: "2-3%",
      commissionRow3Menuthere: "2%",
      commissionRow4Label: "زبردستی کی رعایتیں",
      commissionRow4Aggregator: "5-15%",
      commissionRow4Menuthere: "فیصلہ آپ کا",
      commissionRow5Label: "پیکجنگ کا اضافی چارج",
      commissionRow5Aggregator: "2-5 روپے فی آرڈر",
      commissionRow6Label: "پروموٹڈ لسٹنگ",
      commissionRow6Aggregator: "5-10% اضافی",
      commissionRow6Menuthere: "نمایاں جگہ، مفت",
      commissionTotalLabel: "کل حقیقی نقصان",
      commissionTotalAggregator: "212-227 روپے (42-45%)",
      commissionTotalMenuthere: "~3%",
      commissionFootnote:
        "* NRAI، Menuviel اور Billboox کی رپورٹس (2025-2026) کے صنعتی اعداد و شمار پر مبنی",
      solutionHeading: "اپنے ریستوران کا کنٹرول واپس لیں۔",
      solutionSubheading:
        "اپنی آرڈرنگ ویب سائٹ۔ صرف 1% کمیشن۔ پورا گاہک ڈیٹا۔ PetPooja POS انٹیگریشن۔",
      solution1Title: "آرڈرز پر صرف 0% کمیشن",
      solution1Body:
        "صرف 0% کمیشن کے ساتھ گاہک کا دیا ہوا تقریباً ہر روپیہ آپ تک پہنچتا ہے۔ نہ چھپی ہوئی فیس، نہ آمدنی کی تقسیم۔ آپ کا منافع محفوظ رہتا ہے — جیسا ہونا چاہیے۔",
      solution2Title: "گاہک کا 100% ڈیٹا آپ کا",
      solution2Body:
        "ہر آرڈر پر آپ کو گاہک کا نام، فون نمبر، آرڈر ہسٹری اور پسند ملتی ہے۔ لائلٹی پروگرام بنائیں، ٹارگٹڈ آفرز بھیجیں اور اپنے گاہکوں سے سچا رشتہ قائم کریں۔",
      solution3Title: "اپنے برانڈ کی آرڈرنگ ویب سائٹ",
      solution3Body:
        "اپنے ریستوران کی برانڈنگ، رنگوں اور ڈومین کے ساتھ پیشہ ورانہ آرڈرنگ ویب سائٹ حاصل کریں۔ گاہک سیدھا آپ سے آرڈر کریں — بڑھے آپ کا برانڈ، کسی ایگریگیٹر کا نہیں۔",
      solution4Title: "مکمل اینالیٹکس اور بصیرت",
      solution4Body:
        "ہر آرڈر، مصروف اوقات، مقبول آئٹمز، گاہکوں کا رویہ اور آمدنی کے رجحان پر نظر رکھیں۔ مینو، قیمت اور پروموشن کے فیصلے ڈیٹا کی بنیاد پر کریں۔",
      solution5Title: "گاہکوں کی سچی وفاداری بنائیں",
      solution5Body:
        "منافع میں سے حصہ دیے بغیر اپنی آفرز، رعایتیں اور لائلٹی انعامات چلائیں۔ WhatsApp پر اطلاعات، تہوار کی مبارکباد اور ذاتی ڈیل سیدھا اپنے گاہکوں کو بھیجیں۔",
      solution6Title: "PetPooja POS انٹیگریشن",
      solution6Body:
        "اپنی Menuthere ویب سائٹ کے آرڈر آسانی سے سیدھا PetPooja POS پر سنک کریں۔ نہ ہاتھ سے اندراج، نہ کوئی آرڈر چھوٹے۔ آپ کے کچن کو آرڈر فوراً ملتا ہے، بالکل کسی اور چینل کی طرح۔",
      realNumbersHeading: "ایگریگیٹر پر انحصار بمقابلہ ڈائریکٹ آرڈرنگ۔",
      realNumbersSubheading:
        "وہ اصل موازنہ جو پلیٹ فارم آپ کو نہیں دکھانا چاہتے۔",
      realNumbersColAggregators: "ایگریگیٹرز",
      realNumbersRow1Metric: "فی آرڈر کمیشن",
      realNumbersRow1Aggregator: "18-33% + فیس (اصل میں 35-45%)",
      realNumbersRow1Direct: "صرف 0%",
      realNumbersRow2Metric: "گاہک ڈیٹا کی ملکیت",
      realNumbersRow2Aggregator: "سب کچھ پلیٹ فارم کا",
      realNumbersRow2Direct: "100% آپ کا",
      realNumbersRow3Metric: "قیمت کا کنٹرول",
      realNumbersRow3Aggregator: "پابندی، اور جرمانے بھی",
      realNumbersRow3Direct: "پوری آزادی",
      realNumbersRow4Metric: "برانڈ کی تعمیر",
      realNumbersRow4Aggregator: "وفاداری پلیٹ فارم کو جاتی ہے",
      realNumbersRow4Direct: "وفاداری آپ کے ریستوران کو",
      realNumbersRow5Metric: "ڈیلیوری پر منافع",
      realNumbersRow5Aggregator: "اکثر 10% سے بھی کم",
      realNumbersRow5Direct: "25-35%+ ممکن",
      realNumbersRow6Metric: "مارکیٹنگ کا کنٹرول",
      realNumbersRow6Aggregator: "پیسے دو تو دکھو، 250-4000+ روپے",
      realNumbersRow6Direct: "پورا کنٹرول، اپنی مہمات",
      realNumbersRow7Metric: "مینو اور رعایت کا کنٹرول",
      realNumbersRow7Aggregator: "پلیٹ فارم بغیر اجازت مسلط کر سکتا ہے",
      realNumbersRow7Direct: "100% آپ کا فیصلہ",
      transparencyHeading: "جان لینا ضروری ہے — پوری شفافیت۔",
      transparencySubheading:
        "ہم صاف بات کرنے پر یقین رکھتے ہیں۔ ہم کیا دیتے ہیں اور کیا نہیں، سب یہاں ہے۔",
      deliveryTitle: "ہم ڈیلیوری رائیڈر فراہم نہیں کرتے",
      deliveryBody:
        "Menuthere کا کام آپ کو بہترین آرڈرنگ پلیٹ فارم، گاہک مینجمنٹ اور POS انٹیگریشن دینا ہے۔ ڈیلیوری کے لیے آپ کے پاس کئی آسان آپشن ہیں:",
      deliveryPoint1: "اپنے ڈیلیوری عملے سے پورا کنٹرول رکھیں",
      deliveryPoint2: "Porter، Dunzo یا Shadowfax جیسی سروسز کے ساتھ کام کریں",
      deliveryPoint3: "صرف پک اپ رکھیں — بہت سے گاہک یہی پسند کرتے ہیں",
      deliveryPoint4: "ڈائن ان QR آرڈرنگ میں ڈیلیوری کی ضرورت ہی نہیں",
      deliveryNote:
        "30% کمیشن والے ایگریگیٹر سے آنے والے ڈیلیوری آرڈر کے مقابلے میں، اپنے چینل سے آنے والا صرف پک اپ آرڈر بھی زیادہ منافع بخش ہے۔",
      paymentTitle: "پیمنٹ انٹیگریشن",
      paymentBadge: "صرف 1%",
      paymentBody:
        "صرف 1% پر پیمنٹ گیٹ وے انٹیگریشن (صرف کسٹمر سروس کے لیے)۔ آپ کے گاہک آپ ہی کی آرڈرنگ ویب سائٹ پر آن لائن ادائیگی کر سکتے ہیں:",
      paymentPoint1: "UPI ادائیگیاں (Google Pay، PhonePe، Paytm)",
      paymentPoint2: "کریڈٹ اور ڈیبٹ کارڈ کی سپورٹ",
      paymentPoint3: "ڈیجیٹل والٹ انٹیگریشن",
      paymentPoint4: "PetPooja POS کے ساتھ خودکار حساب برابر",
      paymentNote:
        "آپ کیش آن ڈیلیوری بھی لے سکتے ہیں یا اپنا موجودہ پیمنٹ سیٹ اپ استعمال کر سکتے ہیں۔",
      factsHeading: "اعداد جھوٹ نہیں بولتے۔",
      factsSubheading:
        "صنعتی سروے، CCI کی تحقیقات اور NRAI رپورٹس کا اصل ڈیٹا۔",
      fact1Text:
        "بھارتی ریستوران دوسرے ڈیلیوری پلیٹ فارم چھوڑنا چاہتے ہیں (دسمبر 2025 کا سروے)",
      fact2Value: "60%",
      fact2Text:
        "نئے ریستوران پہلے ہی سال بند ہو جاتے ہیں — پلیٹ فارم پر انحصار ایک بڑی وجہ ہے",
      fact3Value: "400 کروڑ روپے",
      fact3Text:
        "ہر سال پیکجنگ فیس کے اضافی چارجز کے ذریعے پلیٹ فارم پورے ایکو سسٹم سے اضافی نکال لیتے ہیں",
      fact4Value: "2,000+",
      fact4Text:
        "ریستورانوں نے ایگریگیٹر پلیٹ فارمز کے خلاف #Logout مہم میں حصہ لیا",
      howItWorksHeading: "3 آسان مرحلوں میں ڈائریکٹ ہو جائیں۔",
      howItWorksSubheading: "10 منٹ سے کم میں اپنا آرڈرنگ چینل تیار کریں۔",
      step1Title: "اپنا مینو اور ویب سائٹ بنائیں",
      step1Body:
        "مینو اپ لوڈ کریں، برانڈنگ اپنی مرضی سے سیٹ کریں اور اپنی آرڈرنگ ویب سائٹ لائیو کریں۔ 10 منٹ سے کم کا کام۔",
      step2Title: "PetPooja POS جوڑیں",
      step2Body:
        "خودکار آرڈر سنک کے لیے اپنا PetPooja POS جوڑیں۔ آرڈر سیدھا کچن میں پہنچتے ہیں — ہاتھ سے کچھ نہیں کرنا پڑتا۔",
      step3Title: "شیئر کریں اور بیچنا شروع کریں",
      step3Body:
        "اپنا آرڈرنگ لنک WhatsApp، سوشل میڈیا اور QR کوڈز پر شیئر کریں۔ پھر دیکھیں ڈائریکٹ آرڈر کیسے آتے ہیں۔",
      savingsHeading:
        "دوسرے ڈیلیوری پلیٹ فارمز پر ہر آرڈر آپ کو 100-225 روپے کا پڑتا ہے",
      savingsBody:
        "اگر روزانہ 50 ڈیلیوری آرڈر آتے ہیں تو یہ روز 5,000-11,250 روپے کا نقصان ہے۔ مہینے کے 1.5 سے 3.3 لاکھ روپے۔ اپنی آرڈرنگ ویب سائٹ پہلے ہی دن سے اپنی قیمت وصول کر لیتی ہے۔",
      savingsSecondaryCta: "قیمتیں دیکھیں",
      faqSubheading:
        "Menuthere کے ساتھ ڈائریکٹ آرڈرنگ کے بارے میں سب کچھ۔",
      faq1Question:
        "Menuthere دوسرے ڈیلیوری پلیٹ فارمز کا کمیشن بچانے میں کیسے مدد کرتا ہے؟",
      faq1Answer:
        "Menuthere آپ کو اپنے برانڈ کی آرڈرنگ ویب سائٹ دیتا ہے جہاں گاہک سیدھا آرڈر کر سکتے ہیں۔ صرف 0% کمیشن کے ساتھ آرڈر کی تقریباً پوری آمدنی آپ کے پاس رہتی ہے۔ ہم سادہ سبسکرپشن فیس لیتے ہیں — ہر آرڈر میں سے 20-30% کا حصہ نہیں۔",
      faq2Question: "کیا Menuthere ڈیلیوری بوائے دیتا ہے؟",
      faq2Answer:
        "نہیں، Menuthere ڈیلیوری رائیڈر فراہم نہیں کرتا۔ ہمارا کام آپ کو بہترین آرڈرنگ پلیٹ فارم، گاہک مینجمنٹ اور POS انٹیگریشن دینا ہے۔ ڈیلیوری کے لیے اپنا عملہ رکھیں، Porter، Dunzo یا Shadowfax جیسی سروسز سے کام لیں، یا صرف پک اپ رکھیں۔ بہت سے ریستورانوں کو اپنے چینل سے آنے والے پک اپ آرڈر بھی ایگریگیٹر کی ڈیلیوری سے زیادہ منافع بخش لگتے ہیں۔",
      faq3Question: "PetPooja انٹیگریشن کیسے کام کرتی ہے؟",
      faq3Answer:
        "آپ کی Menuthere ویب سائٹ پر لگنے والے آرڈر ریئل ٹائم میں خود بخود آپ کے PetPooja POS ٹرمینل پر چلے جاتے ہیں۔ کچن کو آرڈر فوراً نظر آتا ہے — نہ ہاتھ سے اندراج، نہ کاپی پیسٹ، نہ کوئی آرڈر چھوٹے۔ بالکل ویسے ہی جیسے POS پر کسی اور چینل سے آرڈر آتا ہے۔",
      faq4Question: "گاہکوں سے ادائیگی کیسے وصول ہوگی؟",
      faq4Answer:
        "Menuthere میں صرف 0% فیس (صرف کسٹمر سروس) کے ساتھ پیمنٹ گیٹ وے شامل ہے۔ گاہک آپ کی آرڈرنگ ویب سائٹ پر UPI، کارڈ اور والٹ سے آن لائن ادائیگی کر سکتے ہیں۔ آپ کیش آن ڈیلیوری بھی لے سکتے ہیں یا اپنا موجودہ پیمنٹ سیٹ اپ استعمال کر سکتے ہیں۔",
      faq5Question: "کیا مجھے دوسرے ڈیلیوری پلیٹ فارم بالکل چھوڑ دینے چاہئیں؟",
      faq5Answer:
        "ضروری نہیں۔ بہت سے ریستوران نئے گاہک ڈھونڈنے کے لیے دوسرے ڈیلیوری پلیٹ فارم استعمال کرتے ہیں اور بار بار آنے والے گاہکوں کو اپنی آرڈرنگ ویب سائٹ پر لے آتے ہیں جہاں منافع زیادہ ہے۔ مقصد انحصار کم کرنا ہے — مکمل خاتمہ ضروری نہیں — تاکہ آمدنی کا بڑا حصہ آپ کے پاس رہے۔",
      faq6Question: "Menuthere کی قیمت کتنی ہے؟",
      faq6Answer:
        "Menuthere سادہ ماہانہ سبسکرپشن لیتا ہے — آپ کے آرڈرز کا فیصد نہیں۔ ہمارے پیڈ پلانز پر بھی آپ ایگریگیٹر کے کمیشن سے بچ کر خرچ سے کہیں زیادہ بچاتے ہیں۔ موجودہ پلانز کے لیے ہمارا پرائسنگ صفحہ دیکھیں۔",
      faq7Question: "کیا واقعی 35% ریستوران ایگریگیٹر چھوڑنا چاہتے ہیں؟",
      faq7Answer:
        "جی ہاں۔ دسمبر 2025 کے ایک صنعتی سروے میں 35% بھارتی ریستورانوں نے کہا کہ وہ دوسرے ڈیلیوری پلیٹ فارم استعمال کرنا چھوڑنا چاہتے ہیں، اور وجہ بھاری کمیشن، ناقص کسٹمر سروس، کم منافع اور گاہک کے ڈیٹا تک رسائی نہ ہونا بتائی۔",
      faq8Question:
        "کیا میں Menuthere کے ساتھ ساتھ دوسرے ڈیلیوری پلیٹ فارم بھی استعمال کر سکتا ہوں؟",
      faq8Answer:
        "بالکل۔ ہمارے زیادہ تر پارٹنر ریستوران دونوں چلاتے ہیں۔ نئے گاہک ڈھونڈنے کے لیے دوسرے پلیٹ فارم رکھتے ہیں اور بار بار آنے والوں کو اپنی Menuthere ویب سائٹ پر لے جاتے ہیں جہاں منافع کہیں زیادہ ہے۔ وقت کے ساتھ ڈائریکٹ آرڈرز کا حصہ بڑھتا جاتا ہے، کیونکہ گاہک سیدھا آرڈر کرنا پسند کرنے لگتے ہیں۔",
    },
    whatsappOrdering: {
      metaTitle: "ریستورانوں کے لیے WhatsApp آرڈرنگ | Menuthere",
      metaDescription:
        "اپنے WhatsApp نمبر کو آرڈرنگ چینل بنائیں۔ گاہک 'Hi' بھیجیں، آٹو لاگ ان لنک پائیں، مینو سے آرڈر کریں، لائیو اپ ڈیٹس لیں — نہ ایپ، نہ سائن اپ، صفر کمیشن۔",
      metaKeywords:
        "whatsapp آرڈرنگ، ریستوران کے لیے whatsapp آرڈرنگ سسٹم، whatsapp پر آرڈر، whatsapp بزنس آرڈرنگ، ریستوران whatsapp مینو، آرڈر کے لیے hi بھیجیں، whatsapp فوڈ آرڈرنگ، بات چیت سے آرڈرنگ، صفر کمیشن آرڈرنگ",
      ogTitle: "WhatsApp آرڈرنگ — گاہک بس 'Hi' بھیجیں | Menuthere",
      ogDescription:
        "ریستورانوں کے لیے سب سے آسان آرڈرنگ چینل۔ 'Hi' بھیجیں، فوری لنک پائیں، مینو پر آرڈر کریں اور WhatsApp پر لائیو اپ ڈیٹس لیں۔ نہ ایپ، نہ سائن اپ، صفر کمیشن۔",
      structuredDataProductName: "Menuthere WhatsApp آرڈرنگ",
      structuredDataProductDescription:
        "ریستورانوں کے لیے WhatsApp آرڈرنگ سسٹم۔ گاہک 'Hi' بھیج کر فوری آٹو لاگ ان لنک پاتے ہیں، تصویری ویب مینو سے آرڈر کرتے ہیں اور WhatsApp پر لائیو آرڈر اسٹیٹس اپ ڈیٹس وصول کرتے ہیں۔",
      heroBadge: "WhatsApp آرڈرنگ",
      heroBadgeNew: "نیا",
      heroTitle: "آپ کے گاہک بس “Hi” بھیج کر آرڈر کریں۔",
      heroSubtitle:
        "اپنے WhatsApp نمبر کو آرڈر لینے کا سب سے آسان ذریعہ بنائیں۔ ایک “Hi” ہر گاہک کو آپ کے مینو کا فوری، آٹو لاگ ان لنک دے دیتا ہے — نہ ایپ انسٹال، نہ سائن اپ، نہ OTP۔ گاہک آپ کا رہتا ہے اور کمیشن صفر۔",
      primaryCta: "مفت شروع کریں",
      heroTrust1: "کوئی ایپ ڈاؤن لوڈ نہیں",
      heroTrust2: "نہ سائن اپ، نہ OTP",
      heroTrust3: "0% کمیشن",
      stepsHeading: "“Hi” بھیجیں۔ بس یہی پورا فنل ہے۔",
      stepsSubheading:
        "کارٹ چھوڑ دینے کی سب سے بڑی وجہ رکاوٹ ہے — ڈاؤن لوڈ، سائن اپ، پاس ورڈ۔ WhatsApp آرڈرنگ یہ سب ختم کر دیتی ہے۔ چار مرحلے، اور گاہک اسی جگہ رہتا ہے جس پر وہ پہلے سے بھروسہ کرتا ہے۔",
      step1Title: "گاہک “Hi” بھیجے",
      step1Body:
        "اسٹیکر، ٹیبل کے QR، بائیو لنک یا Google پروفائل سے گاہک ایک ٹیپ میں WhatsApp کھول کر آپ کے نمبر پر Hi بھیجتا ہے۔ نہ کوئی ایپ ڈاؤن لوڈ، نہ کوئی فارم۔",
      step2Title: "اسے فوراً Order Now لنک ملے",
      step2Body:
        "آپ کا نمبر ایک سیکنڈ میں Order Now بٹن کے ساتھ جواب دیتا ہے۔ لنک اسے خود بخود سائن ان کر دیتا ہے — نہ OTP، نہ پاس ورڈ، نہ اکاؤنٹ بنانا۔",
      step3Title: "وہ آپ کے تصویری مینو پر آرڈر کرے",
      step3Body:
        "لنک آپ کا برانڈڈ ویب مینو کھولتا ہے — پہلے سے لاگ ان۔ وہ تصویریں دیکھتا ہے، کارٹ میں ڈالتا ہے، UPI یا کیش چنتا ہے اور چند ٹیپ میں آرڈر کر دیتا ہے۔",
      step4Title: "اپ ڈیٹس واپس WhatsApp پر آئیں",
      step4Body:
        "آرڈر ملا، قبول ہوا، کھانا تیار، لائیو ٹریکنگ لنک کے ساتھ ڈیلیوری پر روانہ، پہنچ گیا — اور لائلٹی پوائنٹس بھی۔ ہر اپ ڈیٹ سیدھی چیٹ میں۔",
      featuresHeading: "صرف بات چیت کے لیے نہیں، بکنے کے لیے بنایا گیا۔",
      featuresSubheading:
        "WhatsApp پر پیشہ ورانہ انداز میں آرڈر لینے کے لیے سب کچھ — آپ کے برانڈ پر، آپ کی شرائط پر۔",
      feature1Title: "نہ ایپ، نہ سائن اپ",
      feature1Body:
        "ہر اس فون پر کام کرتا ہے جس میں WhatsApp ہو۔ “Hi” بھیجتے ہی گاہک خاموشی سے بن اور پہچانا جاتا ہے، سو اسے کبھی لاگ ان کی دیوار نہیں ملتی۔",
      feature2Title: "آپ کا اپنا برانڈڈ نمبر",
      feature2Body:
        "Meta کے ذریعے منٹوں میں اپنا اصل WhatsApp Business نمبر جوڑیں — وہی جو آپ پہلے سے استعمال کر رہے ہیں۔ یا ہمارے مشترکہ نمبر پر فوراً لائیو ہو جائیں۔",
      feature3Title: "اپنے ڈومین کے آرڈر لنکس",
      feature3Body:
        "آرڈر لنک آپ کے اپنے ڈومین (yourbrand.com) پر چل سکتے ہیں، کسی عام تھرڈ پارٹی URL پر نہیں — سو ہر جگہ آپ ہی کا برانڈ رہتا ہے۔",
      feature4Title: "خودکار اسٹیٹس اپ ڈیٹس",
      feature4Body:
        "پورے بل کے ساتھ آرڈر لگا، قبول ہوا، تیار ہے، لائیو ٹریکنگ میپ لنک کے ساتھ روانہ، مکمل، اور لائلٹی پوائنٹس — سب خود بخود چلا جاتا ہے۔",
      feature5Title: "محفوظ، ایک بار چلنے والے لنکس",
      feature5Body:
        "ہر لنک دستخط شدہ ہے، چند منٹ میں ختم ہو جاتا ہے اور پہلے کھولنے والے سے بندھ جاتا ہے — فارورڈ کیا گیا لنک کسی کا لاگ ان سیشن نہیں چرا سکتا۔",
      feature6Title: "بغیر کوڈ کے میسج فلو",
      feature6Body:
        "آپ کے خوش آمدید اور آرڈر پیغام ایسے فلو ہیں جن میں کی ورڈ ٹرگر، بٹن اور میڈیا شامل ہیں — کوڈ کو ہاتھ لگائے بغیر عبارت بدلیں۔",
      feature7Title: "ایک ہی WhatsApp ان باکس",
      feature7Body:
        "آنے اور جانے والا ہر پیغام محفوظ ہوتا ہے اور ڈیش بورڈ میں نظر آتا ہے، تاکہ رش میں کچھ چھوٹ نہ جائے۔",
      feature8Title: "چینل کے حساب سے اینالیٹکس",
      feature8Body:
        "WhatsApp پر لگنے والے آرڈر خود بخود ٹیگ ہو جاتے ہیں۔ ایپ، ویب سائٹ اور WhatsApp کے آرڈر اور آمدنی ساتھ ساتھ دیکھیں۔",
      frictionHeading: "ٹیپ گنیں۔ گاہک تو گنتے ہیں۔",
      frictionSubheading:
        "بھوک اور آرڈر کے بیچ کا ہر اضافی قدم ایک گاہک کھو دیتا ہے۔ یہ رہا ایک ہی آرڈر، دو طریقوں سے۔",
      frictionAggregatorLabel: "ایگریگیٹر ایپ",
      frictionAggregatorStep1: "ایپ انسٹال کریں",
      frictionAggregatorStep2: "سائن اپ + OTP کی تصدیق",
      frictionAggregatorStep3: "آپ کا ریستوران تلاش کریں",
      frictionAggregatorStep4: "آرڈر (وہ 20–33% لیتے ہیں)",
      frictionAggregatorStep5: "گاہک آپ کو کبھی نظر نہیں آتا",
      frictionWhatsappLabel: "WhatsApp آرڈرنگ",
      frictionWhatsappStep1: "“Hi” بھیجیں",
      frictionWhatsappStep2: "Order Now دبائیں (خود بخود سائن ان)",
      frictionWhatsappStep3: "آپ کے مینو پر آرڈر",
      frictionHighlight: "آرڈر کی 100% رقم آپ ہی کے پاس رہتی ہے۔",
      comparisonHeading: "موازنہ کر لیں۔",
      comparisonSubheading:
        "Menuthere WhatsApp آرڈرنگ بمقابلہ فوڈ ایگریگیٹرز بمقابلہ عام “چیٹ بوٹ” آرڈرنگ ٹولز۔",
      comparisonColAggregators: "فوڈ ایگریگیٹرز",
      comparisonColChatbots: "عام چیٹ بوٹس",
      comparisonValueYes: "ہاں",
      comparisonValueNo: "نہیں",
      comparisonRow1Label: "فی آرڈر کمیشن",
      comparisonRow1Aggregator: "20–33%",
      comparisonRow1Chatbot: "ماہانہ فیس + فی پیغام",
      comparisonRow2Label: "ایپ ڈاؤن لوڈ ضروری",
      comparisonRow2Us: "کبھی نہیں",
      comparisonRow3Label: "گاہک کا لاگ ان / OTP",
      comparisonRow3Us: "خودکار — کوئی نہیں",
      comparisonRow3Aggregator: "اکاؤنٹ + OTP",
      comparisonRow3Chatbot: "عموماً ضروری",
      comparisonRow4Label: "آرڈر کا تجربہ",
      comparisonRow4Us: "پورا تصویری مینو",
      comparisonRow4Aggregator: "ان کی اپنی ایپ میں",
      comparisonRow4Chatbot: "چیٹ میں آئٹم ٹائپ کریں",
      comparisonRow5Label: "آپ کے اپنے نمبر سے پیغام",
      comparisonRow5Chatbot: "کبھی کبھی",
      comparisonRow6Label: "لائیو آرڈر اور ڈیلیوری ٹریکنگ",
      comparisonRow6Us: "WhatsApp پر",
      comparisonRow6Aggregator: "ان کی ایپ میں",
      comparisonRow6Chatbot: "شاذ و نادر",
      comparisonRow7Label: "گاہک کا ڈیٹا آپ کا",
      comparisonRow7Us: "جی ہاں، پورا",
      comparisonRow7Chatbot: "کچھ حد تک",
      comparisonRow8Label: "سیٹ اپ کا وقت",
      comparisonRow8Us: "چند منٹ",
      comparisonRow8Aggregator: "ہفتوں کی آن بورڈنگ",
      comparisonRow8Chatbot: "کئی دن + اسکرپٹنگ",
      outcome1Value: "≈ 10 سیکنڈ",
      outcome1Label: "“Hi” سے لے کر گاہک کے ہاتھ میں لائیو آرڈرنگ لنک تک۔",
      outcome2Label: "کمیشن۔ آرڈر کی رقم کا ہر روپیہ آپ کا۔",
      outcome3Value: "شروع سے آخر تک",
      outcome3Label:
        "آرڈر لگا، قبول ہوا، ڈیلیوری پر روانہ، ٹریک ہوا — سب WhatsApp پر۔",
      faqHeading: "سوالات، جوابات کے ساتھ۔",
      faq1Question: "کیا میرے گاہکوں کو کچھ انسٹال کرنا پڑے گا؟",
      faq1Answer:
        "نہیں۔ جب تک ان کے پاس WhatsApp ہے، وہ آرڈر کر سکتے ہیں۔ وہ “Hi” بھیجتے ہیں، Order Now لنک دباتے ہیں اور آپ کے مینو پر آ جاتے ہیں — پہلے سے سائن ان۔ نہ کوئی ایپ ڈاؤن لوڈ، نہ اکاؤنٹ بنانا۔",
      faq2Question: "کیا گاہک اپنا آرڈر چیٹ میں ٹائپ کرتا ہے؟",
      faq2Answer:
        "نہیں — اور یہی اصل بات ہے۔ WhatsApp دروازہ ہے، چیک آؤٹ نہیں۔ “Hi” سے اسے آپ کے اصل تصویری مینو کا فوری لنک ملتا ہے، جس میں تصویریں، کیٹیگریز اور سرچ سب ہے، سو آرڈر تیز ہوتا ہے اور غلطیاں کم۔ اسٹیٹس اپ ڈیٹس پھر WhatsApp پر واپس آ جاتی ہیں۔",
      faq3Question: "کیا یہ میرے اپنے WhatsApp نمبر سے پیغام بھیج سکتا ہے؟",
      faq3Answer:
        "جی ہاں۔ آپ Meta کی سرکاری آن بورڈنگ سے چند منٹ میں اپنا WhatsApp Business نمبر جوڑ سکتے ہیں — وہی نمبر بھی جو آپ پہلے سے WhatsApp Business ایپ پر استعمال کر رہے ہیں۔ کوئی سیٹ اپ نہیں چاہتے؟ ہمارے مشترکہ نمبر پر فوراً لائیو ہو جائیں اور بعد میں بدل لیں۔",
      faq4Question: "کیا آرڈرنگ لنک شیئر کرنا محفوظ ہے؟",
      faq4Answer:
        "ہر لنک خفیہ نگاری سے دستخط شدہ ہے، چند منٹ میں ختم ہو جاتا ہے اور پہلے کھولنے والے سے بندھ جاتا ہے۔ کوئی اسے آگے بھیج دے تو وہ کسی اور کے لیے چلے گا ہی نہیں — سو لاگ ان سیشن کبھی لیک نہیں ہوتا۔",
      faq5Question: "آرڈر کے بعد گاہک کو کیا کچھ ملتا ہے؟",
      faq5Answer:
        "ہر مرحلے پر خودکار WhatsApp پیغام: پورے بل کے ساتھ آرڈر موصول، قبول ہوا، کھانا تیار، لائیو ٹریکنگ لنک کے ساتھ ڈیلیوری پر روانہ، مکمل، اور کمائے گئے لائلٹی پوائنٹس (اگر آپ لائلٹی چلاتے ہیں)۔",
      faq6Question: "Menuthere کتنا کمیشن لیتا ہے؟",
      faq6Answer:
        "آرڈرز پر صفر کمیشن۔ WhatsApp آرڈرنگ آپ کے اپنے ڈائریکٹ چینل کا حصہ ہے — ہر آرڈر کی 100% رقم آپ کی، اور ادائیگی سیدھی آپ کے بینک میں۔",
      faqCtaPrompt: "تیار ہیں کہ گاہک صرف ایک “Hi” سے آرڈر کریں؟",
      faqSecondaryLink: "صفر کمیشن آرڈرنگ دیکھیں",
      trialHeading: "2 منٹ سے کم میں اپنا WhatsApp آرڈرنگ سسٹم لانچ کریں۔",
      trialDescription:
        "اپنا WhatsApp نمبر جوڑیں، مینو اپ لوڈ کریں اور گاہکوں کو صرف ایک “Hi” سے آرڈر کرنے دیں — آٹو لاگ ان لنک، لائیو اسٹیٹس اپ ڈیٹس اور صفر کمیشن۔ 600+ ریستوران پہلے ہی Menuthere کے ساتھ بڑھ رہے ہیں۔",
    },
  },
  solutionsSlug: {
    heroPrimaryCta: "مفت شروع کریں",
    heroSecondaryCta: "ڈیمو بک کریں",
    benefitsHeadingLead: "آخر Menuthere ہی کیوں،",
    benefitsHeadingIndustry: "{industry} کے لیے؟",
    benefitsHeadingIndustryFallback: "آپ کے کاروبار",
    benefitsSubheading:
      "خاص طور پر آپ کی انڈسٹری کے لیے بنائے گئے فیچرز۔",
    featuresHeadingLead: "کامیابی کے لیے درکار",
    featuresHeadingEmphasis: "ہر چیز۔",
    featuresSubheading:
      "آپ کے مینو کو جدید بنانے اور گاہکوں کو خوش کرنے کے لیے مکمل ٹول کٹ۔",
    featuresCtaCardHeading: "شروع کرنے کے لیے تیار؟",
    featuresCtaCardBody:
      "ہزاروں کاروبار پہلے ہی Menuthere سے اپنے مینو کا تجربہ بدل رہے ہیں۔",
    featuresCtaCardButton: "مفت ٹرائل شروع کریں",
    useCasesHeadingLead: "ہر طرح کے",
    useCasesHeadingIndustry: "{industry} کے لیے بہترین۔",
    useCasesHeadingIndustryFallback: "کاروبار",
    faqHeadingLead: "اکثر پوچھے جانے والے",
    faqHeadingEmphasis: "سوالات۔",
    notFoundMetaTitle: "حل نہیں ملا",
    breadcrumbHome: "ہوم",
    breadcrumbSolutions: "حل",
  },
  downloadApp: {
    heroHeadingLead: "Menuthere برائے",
    heroHeadingHighlight: "موبائل اور ڈیسک ٹاپ۔",
    heroSubheading:
      "اپنا ریستوران چلتے پھرتے یا اپنی میز سے سنبھالیں۔ ریئل ٹائم آرڈر نوٹیفکیشن پائیں، مینو اپ ڈیٹ کریں اور ہر ڈیوائس پر سیلز ٹریک کریں۔",
    appStoreBadgePrefix: "ڈاؤن لوڈ کریں",
    playStoreBadgePrefix: "حاصل کریں",
    windowsBadgePrefix: "ڈاؤن لوڈ برائے",
    windowsBadgePlatform: "Windows",
    heroImageAlt: "Menuthere ایپ کا انٹرفیس",
  },
  blog: {
    metaTitle: "بلاگ | Menuthere - ریستوران اور کیفے کی بصیرتیں",
    metaDescription:
      "ڈیجیٹل مینو، QR کوڈز، Google Business سنک اور فوڈ کاروبار بڑھانے پر ریستوران مالکان کے لیے ٹپس، گائیڈز اور بصیرتیں۔",
    ogTitle: "بلاگ | Menuthere",
    ogDescription:
      "ڈیجیٹل مینو، QR کوڈز اور فوڈ کاروبار بڑھانے پر ریستوران مالکان کے لیے ٹپس، گائیڈز اور بصیرتیں۔",
    heroHeading: "تازہ ترین اپ ڈیٹس اور بصیرتیں",
    heroHeadingAccent: "Menuthere کی جانب سے",
    categoryLabel: "بلاگ",
    emptyState: "ابھی کوئی مضمون شائع نہیں ہوا۔ منتظر رہیں!",
    postMetaTitleTemplate: "{title} | Menuthere بلاگ",
    postNotFoundMetaTitle: "پوسٹ نہیں ملی",
    backToIndexLink: "← بلاگ",
    relatedHeading: "مزید مضامین",
  },
};

export default ur;
