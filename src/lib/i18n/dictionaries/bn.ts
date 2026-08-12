import type { Dictionary } from "./en";

/**
 * Bengali (bn) — neutral register readable in both West Bengal and Bangladesh.
 * Typed as `Dictionary`, so this file cannot drift from the English source:
 * add a key to en.ts and TypeScript fails here until it is translated, rather
 * than letting English leak onto a Bengali page.
 *
 * Brand nouns (Menuthere, WhatsApp, Google, Petpooja, Zomato, Swiggy, Stripe,
 * Product Hunt, QR, POS, SaaS) stay in Latin script on purpose — that is how
 * the Bengali-speaking software market writes them. Dashboard UI labels the
 * answer tells the reader to click (Menu, Availability, Priority, Offers,
 * Settings, View Menu, Must-Try) are kept in English too, because that is what
 * they will actually see on screen.
 */
const bn: Dictionary = {
  common: {
    language: "ভাষা",
    changeLanguage: "ভাষা বদলান",
  },
  nav: {
    products: "প্রোডাক্ট",
    solutions: "সমাধান",
    businesses: "ব্যবসা",
    pricing: "মূল্য",
    resources: "রিসোর্স",
    blog: "ব্লগ",
    login: "লগ ইন",
    bookDemo: "ডেমো বুক করুন",
    getStarted: "ফ্রি শুরু করুন",
    openMenu: "মেনু খুলুন",
    closeMenu: "মেনু বন্ধ করুন",
  },
  navItems: {
    ownDeliveryWebsite: {
      title: "নিজের ডেলিভারি ওয়েবসাইট",
      description: "কমিশন ছাড়া ডেলিভারি প্ল্যাটফর্ম",
    },
    digitalMenuCreator: {
      title: "ডিজিটাল মেনু ক্রিয়েটর",
      description: "ডাইন-ইন অর্ডারের জন্য QR মেনু",
    },
    pos: {
      title: "পয়েন্ট অফ সেল (POS)",
      description: "বিলিং আর পুরো অপারেশন এক জায়গায়",
    },
    tableOrdering: {
      title: "টেবিল অর্ডারিং",
      description: "গ্রাহকের জন্য ঝামেলাহীন ডাইনিং",
    },
    captainOrdering: {
      title: "ক্যাপ্টেন অর্ডারিং",
      description: "স্টাফের হাতে দ্রুত অর্ডার নেওয়া",
    },
    googleBusinessSync: {
      title: "Google Business সিঙ্ক",
      description: "মেনু সরাসরি Google Maps-এ",
    },
    owners: {
      title: "মালিক",
      description: "অপারেশনে নজর, আয়ে বৃদ্ধি",
    },
    agencies: {
      title: "এজেন্সি",
      description: "একাধিক ক্লায়েন্ট অ্যাকাউন্ট সহজে সামলান",
    },
    restaurants: {
      title: "রেস্তোরাঁ",
      description: "ডাইন-ইনের জন্য স্মার্ট ডিজিটাল মেনু",
    },
    cafes: {
      title: "ক্যাফে ও কফি শপ",
      description: "পারফেক্ট কফির জন্য আধুনিক মেনু",
    },
    bakeries: {
      title: "বেকারি",
      description: "টাটকা বেক সুন্দর করে তুলে ধরুন",
    },
    cloudKitchens: {
      title: "ক্লাউড কিচেন",
      description: "একাধিক ব্র্যান্ডের মেনু ব্যবস্থাপনা",
    },
    hotels: {
      title: "হোটেল ও রিসোর্ট",
      description: "অতিথিদের জন্য অভিজাত ডাইনিং",
    },
    foodTrucks: {
      title: "ফুড ট্রাক",
      description: "চলতে-ফিরতে মোবাইল মেনু",
    },
    bars: {
      title: "বার ও পাব",
      description: "স্টাইল করে বদলে যাওয়া ড্রিঙ্ক মেনু",
    },
  },
  hero: {
    productHunt: "Product Hunt-এ লাইভ",
    headlineA: "অর্ডার থাকুক আপনার হাতে।",
    headlineB: "গ্রাহকও থাকুক আপনার।",
    subhead:
      "অ্যাগ্রিগেটরের 30% কমিশন বাদ দিন। Menuthere কয়েক মিনিটেই চালু করে দেয় আপনার নিজের ব্র্যান্ডের অর্ডারিং ও ডেলিভারি প্ল্যাটফর্ম।",
    searchPlaceholder: '"{name}" খুঁজুন',
    generate: "তৈরি করুন",
    working: "চলছে…",
    clear: "মুছুন",
    pickFromDropdown: "ড্রপডাউন থেকে আপনার ব্যবসা বাছুন",
    bulletNoCommission: "কোনো কমিশন নেই",
    bulletYourBrand: "আপনার ব্র্যান্ড",
    bulletLiveInMinutes: "মিনিটেই লাইভ",
    whatsappTitle: "WhatsApp অর্ডারিং",
    whatsappNew: "নতুন",
    whatsappBlurb: "গ্রাহক WhatsApp-এই অর্ডার করেন — অ্যাপ নেই, লগ ইন নেই।",
    whatsappExplore: "WhatsApp অর্ডারিং দেখুন",
    trustedBy: "নিজের ব্র্যান্ড গড়ে তোলা রেস্তোরাঁদের ভরসা",
  },
  footer: {
    solutions: "সমাধান",
    resources: "রিসোর্স",
    legal: "আইনি",
    tagline: "রেস্তোরাঁর জন্য কমিশন-মুক্ত অর্ডারিং।",
    rights: "সর্বস্বত্ব সংরক্ষিত।",
  },
  metadata: {
    title: "Menuthere | রেস্তোরাঁর অনলাইন অর্ডারিং ও ডেলিভারি প্ল্যাটফর্ম",
    description:
      "Petpooja POS ইন্টিগ্রেশন, রিয়েল-টাইম অর্ডার ও অ্যানালিটিক্স নিয়ে চালু করুন নিজের ডেলিভারি অ্যাপ। ভারতজুড়ে 600+ রেস্তোরাঁর ভরসা।",
  },

  solutionsOwners: {
    metaTitle: "রেস্তোরাঁ মালিকদের সমাধান | Menuthere",
    metaDescription:
      "Menuthere দিয়ে রেস্তোরাঁর নিয়ন্ত্রণ ফিরিয়ে নিন। এক ড্যাশবোর্ড থেকেই মেনু, POS, ক্যাপ্টেন ও ইনভেন্টরি সামলান। শূন্য কমিশন, সর্বোচ্চ লাভ।",
    heroPrimaryCta: "শুরু করুন",
    heroSecondaryCta: "ডেমো বুক করুন",
    benefitsHeading: "মালিকদের জন্য কেন",
    benefitsHeadingAccent: "Menuthere?",
    reviewsHeading: "ভরসা রাখেন রেস্তোরাঁ",
    reviewsHeadingAccent: "মালিকেরা।",
  },
  solutionsAgencies: {
    metaTitle: "এজেন্সি পার্টনার প্রোগ্রাম | রিকারিং কমিশন | Menuthere",
    metaDescription:
      "Menuthere-এর অনুমোদিত পার্টনার হন। রেস্তোরাঁয় প্রিমিয়াম ডিজিটাল মেনু সমাধান বিক্রি করে আজীবন 30% পর্যন্ত রিকারিং কমিশন আয় করুন।",
    heroBadge: "এজেন্সি পার্টনার প্রোগ্রাম",
    heroApplyCta: "আবেদন করুন",
    heroDemoCta: "ডেমো বুক করুন",
    problemHeading: "রেস্তোরাঁর আয় বাড়ান,",
    problemHeadingAccent: "নিজেরটাও পাকা করুন",
    problemBody:
      "স্বাধীন রেস্তোরাঁগুলো বিক্রি হারায় স্ট্যাটিক PDF মেনুর কারণে, যেখানে রিয়েল-টাইম বদল দেখানোই যায় না। Menuthere পার্টনার হিসেবে আপনি এর সমাধান দেন মাসে $30-এর প্রমাণিত প্ল্যাটফর্ম দিয়ে — যার তাৎক্ষণিক QR আপডেটে ভরসা রাখে 600+ আউটলেট, আর আপনি হয়ে ওঠেন তাদের প্রথম পরামর্শদাতা।",
    benefitsHeading: "কেন আমাদের সঙ্গে",
    benefitsHeadingAccent: "পার্টনারশিপ?",
    earningsBadge: "উঁচু আয়ের সুযোগ",
    earningsHeading: "পারফরম্যান্স-ভিত্তিক কমিশন",
    earningsHeadingAccent: "কাঠামো।",
    earningsSubheading:
      "পেআউট সরাসরি আয়ের সঙ্গে বাঁধা। সাবস্ক্রিপশনের টাকা আমাদের হাতে আসার দিনেই Stripe-এ মাসিক পেমেন্ট।",
    earningsTableTierHeader: "টিয়ার",
    earningsTableRevenueHeader: "রেফার করা আজীবন আয়",
    earningsTableCommissionHeader: "কমিশন (প্রতি $30 সাব)",
    tierStarterName: "স্টার্টার",
    tierStarterRevenue: "$0 থেকে $1,000",
    tierStarterRate: "20%",
    tierStarterPayout: "($6/মাস)",
    tierStarterPayoutPerSub: "প্রতি সাবে $6/মাস",
    tierGrowthName: "গ্রোথ",
    tierGrowthRevenue: "$1,001 থেকে $5,000",
    tierGrowthRate: "25%",
    tierGrowthPayout: "($7.50/মাস)",
    tierGrowthPayoutPerSub: "প্রতি সাবে $7.50/মাস",
    tierEliteName: "এলিট",
    tierEliteRevenue: "$5,001+",
    tierEliteRate: "30%",
    tierElitePayout: "($9/মাস)",
    tierElitePayoutPerSub: "প্রতি সাবে $9/মাস",
    tierCardRevenueLabel: "আয়",
    tierCardCommissionLabel: "কমিশন",
    processHeading: "পার্টনার অনবোর্ডিং",
    processHeadingAccent: "প্রক্রিয়া।",
    processStepOneTitle: "আবেদন পর্যালোচনা",
    processStepOneDescription:
      "দ্রুত অনুমোদন, সঙ্গে রিসেলার পোর্টালে অ্যাক্সেস (ডেমো লিঙ্ক, ব্র্যান্ডেড উপকরণ)।",
    processStepTwoTitle: "মাঠে নামা",
    processStepTwoDescription:
      "রেস্তোরাঁ বাছুন, 5 মিনিটের ডেমো দিন, আর চুক্তি পাকা করুন।",
    processStepThreeTitle: "আয়ের ভাগ",
    processStepThreeDescription:
      "স্বয়ংক্রিয় ট্র্যাকিং, আর টাকা আদায়ের দিনেই পেআউট।",
    idealPartnerHeading: "আমরা যেসব কৌশলগত পার্টনার",
    idealPartnerHeadingAccent: "খুঁজছি",
    idealPartnerBody:
      "মাঠে পরীক্ষিত সেলস নেতৃত্ব, যাঁরা রেস্তোরাঁর সঙ্গে সম্পর্ক গড়ে তুলতে জানেন। প্রমাণিত পারফর্মারদের জন্য বাছাই করা প্রোগ্রাম।",
    partnerTypeRestaurantAdvisors: "রেস্তোরাঁ পরামর্শদাতা",
    partnerTypeChannelPartners: "B2B চ্যানেল পার্টনার",
    partnerTypeSalesExecutives: "সেলস এক্সিকিউটিভ",
    partnerTypeFranchiseSpecialists: "ফ্র্যাঞ্চাইজ বিশেষজ্ঞ",
    partnerTypeSaasResellers: "SaaS রিসেলার",
    partnerTypeBizDevPros: "বিজনেস ডেভেলপমেন্ট পেশাদার",
    faqHeading: "পার্টনার",
    faqHeadingAccent: "FAQ।",
    faqProductOverviewQuestion: "প্রোডাক্ট পরিচিতি",
    faqProductOverviewAnswer:
      "বিশ্বজুড়ে রেস্তোরাঁর জন্য মাসে $30-এর প্রিমিয়াম QR ডিজিটাল মেনু প্ল্যাটফর্ম।",
    faqExperienceRequiredQuestion: "যে অভিজ্ঞতা দরকার",
    faqExperienceRequiredAnswer:
      "মাঠপর্যায়ের সেলস দক্ষতা; বাকি সব উপকরণ আমরাই দিই।",
    faqPayoutMechanicsQuestion: "পেআউট কীভাবে হয়",
    faqPayoutMechanicsAnswer:
      "টাকা আদায়ের দিনে Stripe-এ মাসিক পেমেন্ট, প্রতিটি চালু সাবের জন্য আজীবন।",
    faqCostsInvolvedQuestion: "কত খরচ",
    faqCostsInvolvedAnswer: "শূন্য — পুরোটাই কমিশনভিত্তিক।",
    faqTerritoryQuestion: "এলাকা",
    faqTerritoryAnswer: "বিশ্বজুড়ে স্বাধীন রেস্তোরাঁ, অগ্রাধিকার US-এ।",
    faqResourcesQuestion: "রিসোর্স",
    faqResourcesAnswer:
      "ভিডিও, স্ক্রিপ্ট ও প্রেজেন্টেশন সহ পোর্টাল; সঙ্গে আগ্রহী লিডও পাবেন।",
    trustBadgeDeployments: "600+ লাইভ ডিপ্লয়মেন্ট",
    trustBadgeFieldTested: "মাঠে পরীক্ষিত মডেল",
    trustBadgeRevenueShare: "শুধুই রেভিনিউ শেয়ার",
    trustBadgeExclusiveAccess: "এক্সক্লুসিভ অ্যাক্সেস",
    termsHeading: "পার্টনার প্রোগ্রামের শর্তাবলি",
    termsIncomeContinuity:
      "আয়ের ধারাবাহিকতা: কমিশন চলবে শুধু চালু সাবস্ক্রিপশনের জন্য।",
    termsTerminationRights:
      "সমাপ্তির অধিকার: ব্র্যান্ডের সঙ্গে না মিললে Menuthere চুক্তি শেষ করার অধিকার রাখে।",
    termsPayoutTiming:
      "পেআউটের সময়: সাবস্ক্রিপশনের টাকা আদায়ের দিনেই, ফি বাদ দিয়ে।",
    termsEligibility:
      "যোগ্যতা: বিশ্বের যেকোনো দেশের পার্টনার নেওয়া হয়; অনুমোদন সাপেক্ষে।",
  },
  solutionsIndex: {
    metaTitle: "প্রতিটি খাদ্য ব্যবসার ডিজিটাল মেনু সমাধান | Menuthere",
    metaDescription:
      "স্মার্ট ডিজিটাল মেনুতে বদলে যাক আপনার খাদ্য ব্যবসা। রেস্তোরাঁ, ক্যাফে, বেকারি, ক্লাউড কিচেন, হোটেল, ফুড ট্রাক ও বারের জন্য QR মেনু ও রিয়েল-টাইম আপডেট।",
    ogTitle: "ডিজিটাল মেনু সমাধান | Menuthere",
    ogDescription:
      "রেস্তোরাঁ, ক্যাফে, বেকারি ও আরও অনেকের জন্য স্মার্ট ডিজিটাল মেনু। রিয়েল-টাইম আপডেট, সুন্দর ডিজাইন, ছাপার খরচ শূন্য।",
    heroTitleLead: "ডিজিটাল মেনু, যা আপনার ব্যবসাকে",
    heroTitleEmphasis: "বদলে",
    heroTitleTail: "দেয়।",
    heroSubtitle:
      "ছোট্ট একটা ক্যাফে, জমজমাট রেস্তোরাঁ কিংবা ক্লাউড কিচেনের সাম্রাজ্য — আপনার প্রয়োজন যেমনই হোক, আমাদের প্ল্যাটফর্ম মানিয়ে নেয়।",
    heroPrimaryCta: "ফ্রি শুরু করুন",
    heroSecondaryCta: "ডেমো বুক করুন",
    industriesHeadingLead: "আপনার ইন্ডাস্ট্রি বাছুন,",
    industriesHeadingEmphasis: "শুরু করুন।",
    industriesIntro:
      "আপনার ধরনের খাদ্য ব্যবসার কথা ভেবেই তৈরি ডিজিটাল মেনু সমাধান।",
    cardRestaurantsTitle: "রেস্তোরাঁ",
    cardRestaurantsDesc: "ডাইন-ইনকে সেরা করতে স্মার্ট ডিজিটাল মেনু",
    cardCafesTitle: "ক্যাফে ও কফি শপ",
    cardCafesDesc: "পারফেক্ট কফির অভিজ্ঞতার জন্য আধুনিক মেনু",
    cardBakeriesTitle: "বেকারি ও পেস্ট্রি শপ",
    cardBakeriesDesc: "টাটকা বেক সুন্দর করে তুলে ধরুন",
    cardCloudKitchensTitle: "ক্লাউড কিচেন",
    cardCloudKitchensDesc: "একাধিক ব্র্যান্ডের মেনু সামলানো এখন সহজ",
    cardHotelsTitle: "হোটেল ও রিসোর্ট",
    cardHotelsDesc: "অতিথিদের জন্য অভিজাত ডাইনিং অভিজ্ঞতা",
    cardFoodTrucksTitle: "ফুড ট্রাক",
    cardFoodTrucksDesc: "আপনি যেখানেই যান, মেনুও সেখানে",
    cardBarsTitle: "বার ও পাব",
    cardBarsDesc: "স্টাইল করে বদলে যাওয়া ড্রিঙ্ক মেনু",
    cardCateringTitle: "ক্যাটারিং সার্ভিস",
    cardCateringDesc: "প্রতিটি অনুষ্ঠানের জন্য পেশাদার মেনু",
    cardOwnersTitle: "রেস্তোরাঁ মালিক",
    cardOwnersDesc: "রেস্তোরাঁর অপারেশন ফিরিয়ে নিন নিজের হাতে",
    cardAgenciesTitle: "এজেন্সি ও কনসালট্যান্ট",
    cardAgenciesDesc: "একাধিক ক্লায়েন্ট অ্যাকাউন্ট সহজে সামলান",
    cardPetpoojaTitle: "ডাইরেক্ট অর্ডারিং ও PetPooja",
    cardPetpoojaDesc: "Swiggy ও Zomato-র শূন্য কমিশন বিকল্প",
    cardWhatsappOrderingTitle: "WhatsApp অর্ডারিং",
    cardWhatsappOrderingDesc:
      "শুধু “Hi” পাঠিয়েই গ্রাহক অর্ডার করেন — অ্যাপ নেই, সাইনআপ নেই",
    cardLearnMoreLink: "আরও জানুন",
    featuresHeadingLead: "শক্তিশালী ফিচার,",
    featuresHeadingEmphasis: "সব ব্যবসার জন্য।",
    featureQrTitle: "QR কোড মেনু",
    featureQrDesc: "স্মার্টফোনে স্ক্যান করলেই মেনু। কোনো অ্যাপ লাগে না।",
    featureRealtimeTitle: "রিয়েল-টাইম আপডেট",
    featureRealtimeDesc:
      "দাম বদলান, আইটেম যোগ করুন, সোল্ড-আউট দেখান — সঙ্গে সঙ্গে।",
    featureGoogleSyncTitle: "Google Business সিঙ্ক",
    featureGoogleSyncDesc:
      "আপনার Google Business Profile-এর মেনু নিজে থেকেই আপডেট হয়।",
    featureAnalyticsTitle: "অ্যানালিটিক্স ও ইনসাইট",
    featureAnalyticsDesc:
      "কোন আইটেম জনপ্রিয়, গ্রাহক কী পছন্দ করেন — সব দেখুন।",
    googleBadge: "Google Business ইন্টিগ্রেশন",
    googleHeading: "আপনার মেনু মিলিয়ে নিন Google Business Profile-এর সঙ্গে",
    googleBody:
      "মেনুতে কিছু বদলালেই আপনার Google Business Profile-এর মেনু নিজে থেকেই আপডেট হয়ে যায়। Google Maps-এ যাঁরা আপনাকে খোঁজেন, তাঁরা সবসময় সর্বশেষ মেনুটাই দেখবেন।",
    googleBenefitOneClickSync: "এক ক্লিকেই Google Business Profile-এ সিঙ্ক",
    googleBenefitRealtimeUpdates: "সব প্ল্যাটফর্মে রিয়েল-টাইম মেনু আপডেট",
    googleBenefitLocalSeo: "লোকাল SEO ও দৃশ্যমানতা বাড়ে",
    googleBenefitMoreCustomers: "Google Search ও Maps থেকে আরও গ্রাহক আসে",
    googleManagerLink: "Google Business Manager সম্পর্কে জানুন",
    googleCardTitle: "Google Business Profile",
    googleCardSubtitle: "মেনু ম্যানেজার",
    googleCardSyncedLabel: "সিঙ্ক হওয়া মেনু আইটেম",
    googleCardLastSyncLabel: "শেষ সিঙ্ক",
    googleCardLastSyncValue: "এইমাত্র",
  },
  getStarted: {
    metaTitle: "শুরু করুন | Menuthere",
    metaDescription: "Menuthere দিয়ে তৈরি করুন আপনার ডিজিটাল মেনু।",
    stepIndicator: "ধাপ {step}/3",
    publishingLoader1: "আপনার অ্যাকাউন্ট তৈরি হচ্ছে...",
    publishingLoader2: "ডিজিটাল মেনু সাজানো হচ্ছে...",
    publishingLoader3: "ড্যাশবোর্ড কনফিগার করা হচ্ছে...",
    publishingLoader4: "প্রায় হয়ে এসেছে...",
    step1Title: "আপনার মেনু আপলোড করুন",
    step1Subtitle: "মেনুর একটা ছবি তুলুন, আমরা মুহূর্তেই ডিজিটাল করে দেব।",
    filesSelectedCount: "{count}টি ফাইল বাছাই হয়েছে",
    uploadDropzonePrompt: "ক্লিক করে আপলোড করুন, ড্র্যাগ অ্যান্ড ড্রপ বা পেস্ট করুন",
    uploadFormatsHint: "JPG, PNG, PDF — সর্বোচ্চ 10MB",
    uploadAddMoreHint: "আরও যোগ করতে এখানে ক্লিক করুন",
    fileTooLargeBadge: "খুব বড় ({size}MB)",
    filePreviewAlt: "পৃষ্ঠা {number}",
    aiInstructionLabel: "আমাদের AI-এর জন্য নির্দেশনা",
    optionalSuffix: "(ঐচ্ছিক)",
    aiInstructionPlaceholder:
      "আপনার মেনুতে বিশেষ কিছু আছে? যেমন \"সব পানীয় বাদ দাও\", \"Combos আলাদা ক্যাটাগরি ধরো\", \"দাম AED-তে\"",
    aiInstructionHint:
      "AI আপনার ফাইল পড়ার সময় আপনার নির্দেশনাই অগ্রাধিকার পাবে।",
    removeInvalidFilesButton: "এগোতে হলে অচল ফাইলগুলো সরান",
    nextStepButton: "পরের ধাপ",
    uploadOrDivider: "অথবা",
    sampleMenuButton: "নমুনা মেনু দিয়ে দেখুন",
    sampleMenuDialogTitle: "একটি নমুনা মেনু বাছুন",
    sampleMenuDialogSubtitle:
      "রেস্তোরাঁর ধরন বেছে নিন, তৈরি মেনু দিয়েই শুরু করুন।",
    sampleMenuComingSoonBadge: "শীঘ্রই আসছে",
    filesTooLargeToast:
      "{count}টি ফাইল 10MB সীমা ছাড়িয়েছে। আরও ছোট ফাইল আপলোড করুন।",
    filesAddedToast: "{count}টি ফাইল যোগ হয়েছে!",
    sampleMenuLoadedToast: "\"{name}\" নমুনা মেনু লোড হয়েছে!",
    step2Title: "রেস্তোরাঁর তথ্য",
    step2Subtitle: "মেনু আপনার মতো করে সাজাতে জায়গাটার কথা একটু বলুন।",
    restaurantNameLabel: "রেস্তোরাঁর নাম",
    restaurantNamePlaceholder: "যেমন The Burger Joint",
    usernameLabel: "ইউজারনেম",
    usernamePlaceholder: "your_store_name",
    usernameCheckingStatus: "খালি আছে কি না দেখা হচ্ছে...",
    usernameAvailableStatus: "ইউজারনেমটি খালি আছে",
    usernameTakenStatus: "এই ইউজারনেমটি আগেই নেওয়া হয়ে গেছে",
    usernameMinLengthHint: "ইউজারনেম অন্তত 3 অক্ষরের হতে হবে",
    phoneNumberLabel: "ফোন নম্বর",
    phoneCodePlaceholder: "কোড",
    phoneInvalidError: "ফোন নম্বরটি ঠিক নয়",
    countryLabel: "দেশ",
    countryPlaceholder: "দেশ বাছুন বা লিখুন",
    addressLabel: "ঠিকানা",
    addressPlaceholder: "রাস্তা, এলাকা, শহর…",
    currencyLabel: "মুদ্রা",
    currencyPlaceholder: "মুদ্রা বাছুন বা খুঁজুন",
    currencySearchPlaceholder: "মুদ্রা খুঁজুন (যেমন USD, Euro, ₹)",
    currencySelectFallback: "মুদ্রা বাছুন",
    currencyNoMatch: "কিছু মিলল না",
    logoLabel: "লোগো (ঐচ্ছিক)",
    logoPreviewAlt: "লোগো প্রিভিউ",
    changeLogoButton: "লোগো বদলান",
    uploadLogoButton: "লোগো আপলোড করুন",
    removeLogoButton: "সরান",
    logoSizeLabel: "আকার (%)",
    logoBackgroundLabel: "ব্যাকগ্রাউন্ড",
    createMenuButton: "মেনু তৈরি করুন",
    logoNotAnImageToast: "লোগোর জন্য একটি ছবি ফাইল বাছুন",
    logoTooLargeToast: "লোগো 10MB-এর কম হতে হবে",
    logoReadFailedToast: "ছবিটি পড়া গেল না",
    missingDetailsToast: "সব তথ্য পূরণ করুন",
    invalidPhoneToast: "সঠিক ফোন নম্বর দিন",
    extractingTitle: "আপনার মেনু পড়া হচ্ছে",
    extractingSubtitle: "মেনুর ছবি প্রসেস করা হচ্ছে, একটু অপেক্ষা করুন...",
    extractionErrorTitle: "পড়া গেল না",
    menuUnreadableError:
      "আপনার মেনু পড়া যায়নি। আরও স্পষ্ট ফাইল দিন, বা আইটেমগুলো নিজে যোগ করুন।",
    extractionFailedToast: "মেনু পড়া যায়নি। আবার চেষ্টা করুন।",
    retryExtractionButton: "আবার চেষ্টা করুন",
    cancelExtractionButton: "বাতিল করে আবার আপলোড করুন",
    step3Title: "আপনার মেনু তৈরি!",
    step3Subtitle: "আমরা {count}টি আইটেম পেয়েছি। নিচে থিম পছন্দমতো সাজান।",
    themePickerTitle: "একটি থিম বাছুন",
    themeSwatchSample: "Aa",
    themeClassicLabel: "ক্লাসিক",
    themeMidnightLabel: "মিডনাইট",
    themeFreshLabel: "ফ্রেশ",
    publishButton: "লাইভ করুন",
    authModalSignInTitle: "পাবলিশ করতে সাইন ইন করুন",
    authModalEmailHint: "ড্যাশবোর্ডে লগ ইনের তথ্য আপনার ইমেলে পাঠিয়ে দেব।",
    googleSignInButton: "Google দিয়ে সাইন ইন",
    authDividerOr: "অথবা",
    emailPlaceholder: "you@example.com",
    continueWithEmailButton: "ইমেল দিয়ে এগোন",
    authModalPasswordTitle: "একটি পাসওয়ার্ড তৈরি করুন",
    authModalPasswordHint: "ড্যাশবোর্ড অ্যাকাউন্টের জন্য পাসওয়ার্ড দিন।",
    passwordPlaceholder: "পাসওয়ার্ড (অন্তত 6 অক্ষর)",
    confirmPasswordPlaceholder: "পাসওয়ার্ড আবার লিখুন",
    continueButton: "এগিয়ে যান",
    invalidEmailToast: "সঠিক ইমেল ঠিকানা দিন",
    passwordTooShortToast: "পাসওয়ার্ড অন্তত 6 অক্ষরের হতে হবে",
    passwordMismatchToast: "পাসওয়ার্ড দুটি মিলছে না",
    emailAlreadyRegisteredToast:
      "এই ইমেলটি আগেই নিবন্ধিত। অন্য একটি ইমেল ব্যবহার করুন।",
    googleSignInSuccessToast: "Google দিয়ে সাইন ইন হয়েছে!",
    googleSignInFailedToast: "Google সাইন ইন হয়নি। আবার চেষ্টা করুন।",
    publishSuccessToast: "মেনু পাবলিশ হয়েছে! ড্যাশবোর্ডে নিয়ে যাচ্ছি...",
    publishFailedToast: "সাইন আপ শেষ করা যায়নি। আবার চেষ্টা করুন।",
    successTitle: "ইমেল দেখুন!",
    successSubtitle:
      "আপনার মেনুর লিঙ্ক আর ড্যাশবোর্ডে লগ ইনের তথ্য পাঠিয়ে দিয়েছি এখানে:",
    successSpamHint:
      "খুঁজে পাচ্ছেন না? স্প্যাম ফোল্ডার দেখুন, বা নিচে ইমেল বদলে নিন।",
    successMobileSubtitle:
      "আপনার মেনুর লিঙ্ক আর ড্যাশবোর্ডের তথ্য ইমেলে পাঠিয়ে দিয়েছি।",
    changeEmailButton: "ভুল ইমেল? বদলে নিন",
    loginToDashboardButton: "ড্যাশবোর্ডে লগ ইন",
    changeEmailTitle: "ইমেল বদলান",
    changeEmailSubtitle:
      "আপনার সঠিক ইমেল ঠিকানা দিন। মেনুর লিঙ্ক আর ড্যাশবোর্ডের তথ্য সেখানেই পাঠাব।",
    newEmailLabel: "নতুন ইমেল ঠিকানা",
    updatingEmailButton: "আপডেট হচ্ছে...",
    updateAndResendButton: "আপডেট করে আবার পাঠান",
    emailUpdatedToast: "ইমেল আপডেট হয়েছে! নতুন ইনবক্স দেখুন।",
    emailUpdateFailedToast: "ইমেল আপডেট করা যায়নি। আবার চেষ্টা করুন।",
  },
  helpCenter: {
    metaTitle: "সহায়তা ও সাপোর্ট | Menuthere ডিজিটাল মেনু",
    metaDescription:
      "Menuthere ডিজিটাল মেনু নিয়ে সাহায্য নিন। FAQ, WhatsApp সাপোর্ট ও ইমেল যোগাযোগ। মেনু, অফার ও আরও অনেক কিছুর দ্রুত উত্তর।",
    heroTitle: "সহায়তা ও",
    heroTitleAccent: "সাপোর্ট।",
    heroSubtitle:
      "সাহায্য দরকার? আমাদের ইমেল করুন, নয়তো সরাসরি WhatsApp-এ চ্যাট করুন।",
    faqSectionTitle: "প্রায়ই জিজ্ঞাসা করা",
    faqSectionTitleAccent: "প্রশ্ন।",
    faq1Question: "Google বা অ্যাপে গ্রাহক যাতে পুরোনো মেনু না দেখেন, কী করব?",
    faq1Answer:
      "প্রোডাক্ট, দাম, বিবরণ বা স্টক — যেকোনো বদল সঙ্গে সঙ্গেই আপনার ডিজিটাল মেনুতে বসে যায়। ড্যাশবোর্ড থেকে View Menu-তে ক্লিক করে নিজেই দেখে নিন; কোনো দেরি নেই, নতুন করে ছাপানোরও দরকার নেই।",
    faq2Question: "স্টক শেষ হওয়া আইটেম এখনও আমার QR/ডিজিটাল মেনুতে দেখাচ্ছে কেন?",
    faq2Answer:
      "Menu সেকশনে উপরে Availability-তে ক্লিক করুন। এক ক্লিকেই গোটা ক্যাটাগরি বা আলাদা আইটেম চালু/বন্ধ করুন — সোল্ড-আউট আইটেম সঙ্গে সঙ্গে সব জায়গা থেকে সরে যায়।",
    faq3Question: "মেনু আপডেট করতে অনেক সময় লাগে, ডিজাইনারের খরচও বিশাল।",
    faq3Answer:
      "এডিট করা ভীষণ সহজ, সেকেন্ডের কাজ — কোনো টেকনিক্যাল জ্ঞান লাগে না। Menu সেকশনে গিয়ে যেকোনো প্রোডাক্টে ক্লিক করে নাম, দাম, ছবি, বিবরণ, অফার বা ভ্যারিয়েন্ট বদলে সেভ করুন। বদল সঙ্গে সঙ্গে লাইভ হয়ে যায়।",
    faq4Question: "মেনুর প্রোডাক্ট সঙ্গে সঙ্গে কীভাবে আপডেট করব?",
    faq4Answer:
      "ড্যাশবোর্ডের Menu সেকশনে যান। সেখানে সব ক্যাটাগরি ও প্রোডাক্ট এক তালিকায় থাকে — যেকোনোটায় ক্লিক করে নাম, দাম, ছবি বা বিবরণ বদলে সেভ করুন; আপডেট তৎক্ষণাৎ লাইভ।",
    faq5Question: "মেনুর আইটেম বা ক্যাটাগরির ক্রম কীভাবে বদলাব?",
    faq5Answer:
      "Menu সেকশন খুলে Priority-তে ক্লিক করুন। ক্যাটাগরি ও আইটেম ড্র্যাগ করুন বা প্রায়োরিটি নম্বর বসিয়ে সেভ করুন — নতুন ক্রম সঙ্গে সঙ্গে লাইভে দেখা যাবে।",
    faq6Question: "মেনু আইটেমে অফার বা স্পেশাল কীভাবে যোগ করব?",
    faq6Answer:
      "Specials/Best Sellers-এর জন্য: Menu সেকশনে ওই আইটেমের টগল চালু করুন — সেটি উপরে Must-Try হিসেবে দেখাবে। কাস্টম অফারের জন্য: Offers সেকশনে গিয়ে এক বা একাধিক আইটেমের ডিল বানান, সেগুলো সঙ্গে সঙ্গে চালু হয়ে যায়।",
    faq7Question: "টেকনিক্যাল সাহায্য ছাড়া ব্যানার বা প্রোডাক্টের ছবি বদলানো কঠিন?",
    faq7Answer:
      "রেস্তোরাঁর ব্যানার আপলোড বা বদলাতে Settings → General Settings-এ যান। প্রোডাক্টের ছবি সরাসরি Menu সেকশনেই বদলান — ড্র্যাগ-অ্যান্ড-ড্রপের মতোই সহজ, আর সঙ্গে সঙ্গে লাইভ।",
    faq8Question: "ডেইলি স্পেশালের মতো বদল কি প্রিভিউ বা শিডিউল করা যায়?",
    faq8Answer:
      "হ্যাঁ — সেভ করার আগে View Menu থেকে যেকোনো এডিট প্রিভিউ করে নিন। শিডিউল করতে Offers সেকশনে সময় বেঁধে দিন (যেমন ডেইলি স্পেশাল) — রোজ লগ ইন করার দরকার নেই।",
    faq9Question: "দোকান বন্ধ থাকার সময় কি স্টোর অফ করে রাখা যাবে?",
    faq9Answer:
      "হ্যাঁ। Settings-এ গিয়ে যেকোনো সময় রেস্তোরাঁ অফ করে দিন — বন্ধের সময়, ছুটি বা মেরামতির জন্য দারুণ। তৈরি হলে আবার অন করে দিন।",
    faq10Question: "সব মিলিয়ে মেনু আইটেম এডিট করা কতটা সহজ?",
    faq10Answer:
      "ভীষণ সহজ — প্রতিটি বদল সেকেন্ডের কাজ। Menu সেকশনের সহজ টগল আর ড্রপডাউন থেকে দাম, নাম, ছবি, স্টক বা অফার বদলান; কোডিং নেই, ডিজাইনারও নেই।",
    faq11Question: "আমি কি যেকোনো সময় সাবস্ক্রিপশন বাতিল করতে পারি?",
    faq11Answer:
      "হ্যাঁ — নিজের অ্যাকাউন্ট থেকে যেকোনো সময় বাতিল করুন। চলতি বিলিং পিরিয়ড শেষ হওয়া পর্যন্ত প্ল্যান চালু থাকবে, আর রিনিউ না করলে আর কোনো চার্জ লাগবে না।",
  },

  landing: {
    socialProofEyebrow: "গত 30 দিনের সত্যিকারের হিসেব",
    statOrdersLabel: "প্রাপ্ত অর্ডার",
    statRevenueLabel: "মোট আয়",
    statAvgOrderValueLabel: "গড় অর্ডার মূল্য",
    statSuffixLakh: "L+",
    statSuffixThousand: "K+",
    platformHeadingLead: "আপনার রেস্তোরাঁর যা কিছু দরকার,",
    platformHeadingAccent: "সবই এক প্ল্যাটফর্মে।",
    featureWebsiteAppTitle: "নিজের ওয়েবসাইট আর নিজের ব্র্যান্ডের অ্যাপ",
    featureWebsiteAppBody:
      "নিজের নামেই চালু করুন ব্র্যান্ডেড অর্ডারিং ওয়েবসাইট, আর App Store ও Play Store-এ নিজের অ্যাপ। গ্রাহক অর্ডার করেন সরাসরি আপনার কাছে — মাঝখানে কোনো অ্যাগ্রিগেটর নেই, 20-33% কমিশনও নেই। তাঁরা এক ট্যাপেই মেনু দেখেন, অর্ডার করেন, ডেলিভারি ট্র্যাক করেন আর আবার অর্ডার করেন; আর গ্রাহক সম্পর্ক, দামের নিয়ন্ত্রণ ও লাভের প্রতিটি টাকা থাকে আপনার হাতে।",
    featureWebsiteAppCta: "কীভাবে কাজ করে দেখুন",
    featureWhatsappOrderingTitle: "WhatsApp-এ অর্ডার — শুধু “Hi” পাঠান",
    featureWhatsappOrderingBody:
      "আপনার WhatsApp নম্বরকেই বানিয়ে ফেলুন সবচেয়ে সহজ অর্ডারিং চ্যানেল। গ্রাহক একটা “Hi” পাঠালেই সঙ্গে সঙ্গে পেয়ে যান আপনার মেনুর অটো-লগইন লিঙ্ক — অ্যাপ ডাউনলোড নেই, সাইনআপ নেই, OTP নেই। কয়েক ট্যাপে অর্ডার করেন, আর লাইভ স্ট্যাটাস আপডেট ফিরে আসে WhatsApp-এই; গ্রাহক থাকেন আপনার, কমিশন লাগে শূন্য।",
    featureWhatsappOrderingCta: "WhatsApp অর্ডারিং দেখুন",
    featurePetpoojaTitle: "Petpooja POS ইন্টিগ্রেশন",
    featurePetpoojaBody:
      "প্রতিটি অনলাইন অর্ডার রিয়েল-টাইমে সরাসরি ঢুকে যায় আপনার Petpooja POS-এ। হাতে তোলার ঝামেলা নেই, অর্ডার হারানোর ভয় নেই, একই কাজ দু'বার করাও নেই। মেনু আইটেম, দাম ও ক্যাটাগরি আপনার POS আর ডেলিভারি ওয়েবসাইটের মধ্যে নিজে থেকেই সিঙ্ক হয়। ভারতে একমাত্র প্ল্যাটফর্ম, যাতে Petpooja-র গভীর ইন্টিগ্রেশন বিল্ট-ইন।",
    featurePetpoojaCta: "Petpooja ইন্টিগ্রেশন সম্পর্কে জানুন",
    featurePaymentsTitle: "পেমেন্ট ইন্টিগ্রেশন",
    featurePaymentsBody:
      "বিল্ট-ইন UPI, কার্ড, নেট ব্যাঙ্কিং ও ওয়ালেট — সঙ্গে ক্যাশ অন ডেলিভারি; পেমেন্ট নিন সঙ্গে সঙ্গে। Cashfree-চালিত নিরাপদ, PCI-কমপ্লায়েন্ট চেকআউট, আর টাকা জমা পড়ে সরাসরি আপনার ব্যাঙ্ক অ্যাকাউন্টে। কোনো অ্যাগ্রিগেটর আপনার টাকা আটকে রাখবে না, পেআউটেও দেরি নেই। প্রতিটি টাকা আপনার কাছেই পৌঁছয়।",
    featurePaymentsCta: "পেমেন্ট অপশন দেখুন",
    featureOrderManagementTitle: "রিয়েল-টাইম অর্ডার ম্যানেজমেন্ট",
    featureOrderManagementBody:
      "এক ড্যাশবোর্ড থেকেই ডেলিভারি অর্ডার নিন, ট্র্যাক করুন আর সামলান। নতুন অর্ডারের নোটিফিকেশন পান সঙ্গে সঙ্গে, স্ট্যাটাস আপডেট করুন রিয়েল-টাইমে, আর রান্নাঘর ও ডেলিভারি টিমকে রাখুন এক তালে। ব্যস্ত সময়ে আর একগাদা ট্যাব সামলানো বা অর্ডার হারানো নয়।",
    featureOrderManagementCta: "অর্ডার ম্যানেজমেন্ট দেখুন",
    featureDigitalMenuTitle: "ডিজিটাল মেনু ম্যানেজমেন্ট",
    featureDigitalMenuBody:
      "গোটা মেনু সামলান এক ড্যাশবোর্ড থেকে: আইটেম, দাম, ক্যাটাগরি, ছবি ও ভ্যারিয়েন্ট রিয়েল-টাইমে যোগ করুন বা বদলান। এক ক্লিকেই কোনো পদ স্টকে আনুন বা সরান, ডায়েট ফিল্টার ও স্মার্ট সার্চ সেট করুন, আর ওয়েবসাইট, অ্যাপ ও QR কোড — সবখানে সব মিলিয়ে রাখুন। নতুন করে ছাপানো নেই, ডেভেলপারও নেই। সেভ করার মুহূর্তেই বদল লাইভ।",
    featureDigitalMenuCta: "ডিজিটাল মেনু সম্পর্কে জানুন",
    featureOffersTitle: "ডায়নামিক অফার ও প্রোমোশন",
    featureOffersBody:
      "ফ্ল্যাশ ডিল, হ্যাপি-আওয়ার স্পেশাল বা সময় ধরে ছাড় চালান — যা নিজে থেকেই শুরু আর শেষ হয়ে যায়। Must-Try ব্যাজ আর Chef's Choice ট্যাগ দিয়ে বেস্ট-সেলার তুলে ধরুন। একটাও লিফলেট না ছাপিয়েই বাড়ান রিপিট অর্ডার আর আয়।",
    featureOffersCta: "অফার কীভাবে কাজ করে দেখুন",
    featureGoogleSyncTitle: "Google Business মেনু সিঙ্ক",
    featureGoogleSyncBody:
      "এক ক্লিকেই আপনার পুরো মেনু (ক্যাটাগরি, আইটেম, দাম ও ছবি) নিজে থেকে সিঙ্ক হয়ে যায় Google Business Profile-এ। Google Maps-এ দেখা দিন সম্পূর্ণ মেনু নিয়ে। পূর্ণ প্রোফাইল থাকা রেস্তোরাঁ 7x বেশি ক্লিক পায় আর 30% বেশি লোক টেনে আনে।",
    featureGoogleSyncCta: "Google Sync কীভাবে কাজ করে দেখুন",
    featureDeliveryAppTitle: "ডেলিভারি বয় অ্যাপ",
    featureDeliveryAppBody:
      "আপনার ডেলিভারি টিমের জন্য আলাদা অ্যাপ। ডেলিভারি বয়রা অর্ডারের নোটিফিকেশন পান, গ্রাহকের ঠিকানায় পথ দেখে পৌঁছন আর ডেলিভারি স্ট্যাটাস আপডেট করেন — সবই রিয়েল-টাইমে। লাইভ লোকেশন ট্র্যাক করুন, অর্ডার নিজে থেকে বণ্টন করুন, আর পুরো ছবিটা চোখের সামনে রেখে দ্রুত ডেলিভারি নিশ্চিত করুন।",
    featureDeliveryAppCta: "ডেলিভারি অ্যাপ সম্পর্কে জানুন",
    featureAnalyticsTitle: "অ্যানালিটিক্স ও ইনসাইট",
    featureAnalyticsBody:
      "অর্ডারের সংখ্যা, আয়ের ধারা, ব্যস্ত সময় আর সবচেয়ে বেশি বিক্রি হওয়া আইটেম ট্র্যাক করুন। দাম, প্রোমোশন ও ডেলিভারি নিয়ে সিদ্ধান্ত নিন তথ্যের ভিত্তিতে। কোনটা কাজ করছে আর কোথায় উন্নতি দরকার, জানুন ঠিকঠাক।",
    featureAnalyticsCta: "অ্যানালিটিক্স সম্পর্কে জানুন",
    ctaBannerHeadingDefault:
      "2 মিনিটেরও কমে চালু করুন আপনার ডেলিভারি ওয়েবসাইট।",
    ctaBannerBodyDefault:
      "মেনু আপলোড করুন, ডেলিভারি জোন ঠিক করুন, আর পুরো Petpooja POS ইন্টিগ্রেশন নিয়ে গ্রাহকের কাছ থেকে সরাসরি অর্ডার নেওয়া শুরু করুন। Menuthere-এর সঙ্গে বেড়ে ওঠা 600+ রেস্তোরাঁর দলে যোগ দিন।",
    ctaBannerPrimaryButton: "ফ্রি শুরু করুন",
    ctaBannerSecondaryButton: "সব প্ল্যান দেখুন",
    faqHeadingLead: "প্রায়ই জিজ্ঞাসা করা",
    faqHeadingAccent: "প্রশ্ন।",
    faqVsAggregatorsQuestion: "Zomato বা Swiggy-র থেকে Menuthere আলাদা কীসে?",
    faqVsAggregatorsAnswer:
      "Zomato, Swiggy-র মতো অ্যাগ্রিগেটর প্রতিটি অর্ডারে 20-33% কমিশন নেয়। Menuthere দেয় আপনার নিজের ব্র্যান্ডের ডেলিভারি ওয়েবসাইট, যেখানে গ্রাহক অর্ডার করেন সরাসরি আপনার কাছে — কমিশন মাত্র 1%। গ্রাহকের তথ্য আপনার, দামের নিয়ন্ত্রণ আপনার, আর ব্র্যান্ডের প্রতি আনুগত্যও গড়ে ওঠে আপনার নামে।",
    faqPetpoojaIntegrationQuestion: "Petpooja POS ইন্টিগ্রেশন কীভাবে কাজ করে?",
    faqPetpoojaIntegrationAnswer:
      "একবার যুক্ত করলে আপনার Petpooja মেনু নিজে থেকেই Menuthere ডেলিভারি ওয়েবসাইটের সঙ্গে সিঙ্ক হয়ে যায়। প্রতিটি অনলাইন অর্ডার রিয়েল-টাইমে সরাসরি চলে যায় আপনার POS-এ। হাতে তোলার দরকার নেই, অর্ডার হারানোরও ভয় নেই। মেনু আইটেম, দাম ও ক্যাটাগরি দুই সিস্টেমেই এক থাকে।",
    faqDeliveryZonesQuestion: "ডেলিভারি জোন আর চার্জ কীভাবে সেট করব?",
    faqDeliveryZonesAnswer:
      "ড্যাশবোর্ড থেকে Delivery Settings-এ যান। দূরত্ব বা পিন কোড ধরে জোন ঠিক করুন, প্রতিটি জোনের ডেলিভারি চার্জ বসান, আর ন্যূনতম অর্ডারের অঙ্ক ঠিক করুন। নির্দিষ্ট এলাকার ডেলিভারি যেকোনো সময় চালু বা বন্ধও করতে পারেন।",
    faqPickupOrdersQuestion:
      "গ্রাহক কি ডেলিভারির পাশাপাশি পিকআপেও অর্ডার করতে পারেন?",
    faqPickupOrdersAnswer:
      "হ্যাঁ, আপনার ডেলিভারি ওয়েবসাইটে ডেলিভারি আর পিকআপ — দুটোই চলে। চেকআউটের সময় গ্রাহক নিজের পছন্দ বেছে নিতে পারেন। ড্যাশবোর্ড সেটিংস থেকে যেকোনোটি চালু বা বন্ধ করতে পারেন।",
    faqRushHourOrdersQuestion: "ব্যস্ত সময়ে আসা অর্ডার কীভাবে সামলাব?",
    faqRushHourOrdersAnswer:
      "সব অর্ডার রিয়েল-টাইমে ড্যাশবোর্ডে চলে আসে, সঙ্গে সঙ্গে নোটিফিকেশনও। এক স্ক্রিন থেকেই অর্ডার নিন, তৈরি করুন আর স্ট্যাটাস আপডেট করুন। Petpooja POS যুক্ত থাকলে অর্ডার সেখানেও সিঙ্ক হয়, তাই রান্নাঘরও খবর পেয়ে যায়।",
    faqTechnicalSkillsQuestion: "এটা সেট করতে কি টেকনিক্যাল জ্ঞান লাগে?",
    faqTechnicalSkillsAnswer:
      "একদমই না। মেনু আপলোড করুন (বা Petpooja থেকে সিঙ্ক করুন), ব্র্যান্ডিং পছন্দমতো সাজান — কয়েক মিনিটেই আপনার ডেলিভারি ওয়েবসাইট লাইভ। কোডিং নেই, ডিজাইনার নেই, অ্যাপ ডাউনলোডও নেই।",
    faqOffersDiscountsQuestion:
      "ডেলিভারি ওয়েবসাইটে কি অফার আর ছাড় চালাতে পারি?",
    faqOffersDiscountsAnswer:
      "হ্যাঁ! ফ্ল্যাশ ডিল, কুপন কোড, প্রথম অর্ডারে ছাড় বা সময় ধরে স্পেশাল চালান — যা নিজে থেকেই শুরু আর শেষ হয়ে যায়। Must-Try ব্যাজ দিয়ে বেস্ট-সেলার তুলে ধরে গড় অর্ডার মূল্য বাড়ান।",
    faqCustomerDiscoveryQuestion:
      "গ্রাহকরা আমার ডেলিভারি ওয়েবসাইট খুঁজে পাবেন কীভাবে?",
    faqCustomerDiscoveryAnswer:
      "ওয়েবসাইটের লিঙ্ক ছড়িয়ে দিন সোশ্যাল মিডিয়া, WhatsApp, Google Business Profile আর দোকানের QR কোডে। Menuthere আপনার মেনু Google Maps-এও সিঙ্ক করে, তাই গ্রাহক নিজে থেকেই আপনাকে খুঁজে পান। আপনার ওয়েবসাইট প্রথম দিন থেকেই SEO-অপ্টিমাইজড।",
    faqPauseOrderingQuestion:
      "দোকান বন্ধ থাকার সময় কি অর্ডার নেওয়া বন্ধ রাখতে পারব?",
    faqPauseOrderingAnswer:
      "হ্যাঁ। Settings-এ গিয়ে যেকোনো সময় রেস্তোরাঁ অফ করে দিন — বন্ধের সময়, ছুটি বা মেরামতির জন্য দারুণ। তৈরি হলে আবার অন করে দিন। চাইলে খোলা-বন্ধের সময়সূচিও নিজে থেকে চলতে দিতে পারেন।",
    faqCancelSubscriptionQuestion:
      "আমি কি যেকোনো সময় সাবস্ক্রিপশন বাতিল করতে পারি?",
    faqCancelSubscriptionAnswer:
      "হ্যাঁ, নিজের অ্যাকাউন্ট থেকে যেকোনো সময় বাতিল করুন। চলতি বিলিং পিরিয়ড শেষ হওয়া পর্যন্ত প্ল্যান চালু থাকবে, আর রিনিউ না করলে আর কোনো চার্জ লাগবে না।",
    reviewExpandButton: "আরও দেখুন",
    reviewCollapseButton: "কম দেখান",
    reviewOneAuthorName: "Hotel Colombo",
    reviewOneAuthorLocation: "MG Road, Edappally",
    reviewOneAuthorInitials: "HC",
    reviewOneParagraphOne:
      "সত্যি বলতে, অ্যাপ বানানো যে এত সহজ হতে পারে ভাবিইনি 😅 ওঁরা সবটা এত সুন্দরভাবে সামলেছেন যে আমাদের কাছে গোটা ব্যাপারটা জলের মতো সহজ লেগেছে।",
    reviewOneParagraphTwo:
      "আর ঠিক যেমনটা চেয়েছিলাম, তেমনই বানিয়ে দিয়েছেন। কয়েকটা ব্যাপারে আমি খুব খুঁতখুঁতে ছিলাম, একটুও ছাড় দিতে রাজি ছিলাম না — বারবার বদল করতে হয়েছে, কিন্তু ওঁরা পুরোটা সময় ধৈর্য ধরে, ঠান্ডা মাথায় কাজ করে একেবারে ঠিকঠাক করে দিয়েছেন।",
    reviewOneParagraphThree: "খুব পরিষ্কার কাজ, অনেক ধন্যবাদ আপনাদের।",
    reviewTwoAuthorName: "Rimaal Mandi & Grills",
    reviewTwoAuthorLocation: "Pune",
    reviewTwoAuthorInitials: "RM",
    reviewTwoParagraphOne:
      "আমাদের অ্যাপ বানানোর জন্য MenuThere টিমকে ধন্যবাদ। এই অ্যাপে গ্রাহকরা সরাসরি আমাদের কাছেই অর্ডার করতে পারেন, আর ডেলিভারি সামলানোও অনেক সহজ হয়ে গেছে। আমরা Porter-এর মতো থার্ড-পার্টি ডেলিভারির ব্যবস্থাও রেখেছিলাম, টিম সেগুলোও সফলভাবে সিস্টেমে জুড়ে দিয়েছে। সবকিছু দিব্যি চলছে, ওঁরা দারুণ কাজ করেছেন।",
    reviewTwoParagraphTwo:
      "অ্যাপটা চালু করার মূল কারণ হলো — Zomato, Swiggy-র মতো প্ল্যাটফর্ম ভালো ব্যবসা আর অনেক গ্রাহক এনে দিলেও কমিশন ও অন্যান্য খরচের জন্য পেআউটের দিকটা মাঝেমধ্যে কঠিন হয়ে পড়ে। অবশ্যই Zomato আর Swiggy বাদ দেওয়া যায় না, অনেক গ্রাহক ওখান থেকেই অর্ডার করতে অভ্যস্ত, তাই ওদের সঙ্গে কাজ চালিয়েও যাব।",
    reviewTwoParagraphThree:
      "পাশাপাশি এই অ্যাপ আমাদের গ্রাহকদের সঙ্গে সরাসরি যোগাযোগের আরেকটা পথ খুলে দিয়েছে, যাতে আরও ভালোভাবে সেবা দিতে পারি।",
    reviewTwoParagraphFour:
      "MenuThere টিমকে ধন্যবাদ, আপনাদের সহযোগিতা আর চমৎকার কাজের জন্য।",
  },
  footerLinks: {
    brandBlurb:
      "রেস্তোরাঁর জন্য অল-ইন-ওয়ান অনলাইন অর্ডারিং ও ডেলিভারি প্ল্যাটফর্ম। নিজের ওয়েবসাইট চালু করুন, অ্যাগ্রিগেটরের কমিশন এড়ান, আর ব্যবসা বাড়ান।",
    solutionsGoogleBusinessSync: "Google Business সিঙ্ক",
    solutionsOwners: "মালিক",
    solutionsAgencies: "এজেন্সি",
    solutionsPetpoojaIntegration: "PetPooja ইন্টিগ্রেশন",
    solutionsRestaurants: "রেস্তোরাঁ",
    solutionsCafes: "ক্যাফে",
    resourcesHelpCenter: "হেল্প সেন্টার",
    resourcesDownloadApp: "অ্যাপ ডাউনলোড",
    resourcesGetStarted: "শুরু করুন",
    legalPrivacyPolicy: "প্রাইভেসি পলিসি",
    legalTermsOfService: "পরিষেবার শর্তাবলি",
    legalRefundPolicy: "রিফান্ড পলিসি",
    copyright: "© 2026 Menuthere.",
  },
  solutionsRest: {
    shared: {
      breadcrumbHome: "হোম",
      breadcrumbSolutions: "সমাধান",
      bookDemoCta: "ডেমো বুক করুন",
      stepLabel: "ধাপ {step}",
      faqHeading: "প্রায়ই জিজ্ঞাসা করা প্রশ্ন।",
      zeroPercentValue: "0%",
    },
    googleBusiness: {
      metaTitle: "রেস্তোরাঁর মেনু Google Business-এ সিঙ্ক | Menuthere",
      metaDescription:
        "রেস্তোরাঁর মেনু নিজে থেকেই সিঙ্ক করুন Google Business Profile-এ। এক ক্লিকে সেটআপ, রিয়েল-টাইম আপডেট, ভালো লোকাল SEO। 600+ রেস্তোরাঁর ভরসা।",
      ogDescription:
        "রেস্তোরাঁর মেনু নিজে থেকেই সিঙ্ক হোক Google Maps-এ। সবসময় হালনাগাদ, হাতে কোনো খাটনি নেই।",
      breadcrumbCurrent: "Google Business Profile মেনু সিঙ্ক",
      heroBadge: "Google Business ইন্টিগ্রেশন",
      heroTitle: "আপনার মেনু নিজে থেকেই সিঙ্ক হোক Google Maps-এ",
      heroSubtitle:
        "Google Business Profile-এর মেনু সবসময় হালনাগাদ রাখুন। Menuthere থেকে এক ক্লিকেই সিঙ্ক — Google Search ও Maps-এ আপনার মেনু, প্রতিবার নির্ভুল।",
      heroPrimaryCta: "মেনু সিঙ্ক করুন",
      mockupCardTitle: "Google Business Profile",
      mockupCardSubtitle: "মেনু সিঙ্ক ম্যানেজার",
      mockupSyncStatusTitle: "মেনু সফলভাবে সিঙ্ক হয়েছে",
      mockupSyncStatusMeta: "শেষ সিঙ্ক: এইমাত্র",
      mockupStatItemsLabel: "সিঙ্ক হওয়া আইটেম",
      mockupStatCategoriesLabel: "ক্যাটাগরি",
      mockupStatImagesLabel: "ছবি সহ",
      mockupRecentlySyncedLabel: "সদ্য সিঙ্ক হয়েছে",
      mockupItem1Name: "বাটার চিকেন",
      mockupItem1Category: "মেন কোর্স",
      mockupItem2Name: "পনির টিক্কা",
      mockupItem2Category: "স্টার্টার",
      mockupItem3Name: "গুলাব জামুন",
      mockupItem3Category: "ডেজার্ট",
      mockupBadgeTitle: "প্রোফাইল ভিউ",
      mockupBadgeValue: "এ মাসে +340%",
      statSyncingValue: "500+",
      statSyncingLabel: "রেস্তোরাঁ সিঙ্ক করছে",
      statClicksValue: "7x",
      statClicksLabel: "বেশি প্রোফাইল ক্লিক",
      statSyncTimeValue: "< 30s",
      statSyncTimeLabel: "সিঙ্কের সময়",
      statFootfallValue: "30%",
      statFootfallLabel: "বেশি লোক আসে",
      howItWorksBadge: "সহজ 3 ধাপের প্রক্রিয়া",
      howItWorksHeading: "কীভাবে কাজ করে",
      howItWorksSubheading:
        "আপনার মেনু ড্যাশবোর্ড থেকে Google Maps পর্যন্ত, তিনটি সহজ ধাপে",
      step1Title: "মেনু তৈরি করুন",
      step1Body:
        "আমাদের প্ল্যাটফর্মে ক্যাটাগরি, আইটেম, দাম ও ছবি দিয়ে মেনু সাজান। কয়েক মিনিটের কাজ।",
      step2Title: "Google Profile যুক্ত করুন",
      step2Body:
        "এক ক্লিকেই আপনার Google Business Profile জুড়ে দিন। OAuth আর API-এর সব ব্যবস্থা আমরাই সামলাই।",
      step3Title: "সিঙ্ক করুন, লাইভ হয়ে যান",
      step3Body:
        "সিঙ্কে চাপ দিন, গোটা মেনু চলে আসে Google Maps-এ। যেকোনো সময় বদলান — বদল সঙ্গে সঙ্গে দেখা যায়।",
      benefitsHeading: "Google মেনু সিঙ্ক কেন রেস্তোরাঁদের এত পছন্দ",
      benefitsSubheading:
        "আপনার মেনুই আপনার সবচেয়ে বড় বিজ্ঞাপন — গ্রাহক যেখানে খুঁজছেন, সেখানেই সেটিকে রাখুন",
      benefit1Title: "লোকাল SEO-তে এগিয়ে যান",
      benefit1Body:
        "সম্পূর্ণ Google Business Profile থাকা রেস্তোরাঁ 7x বেশি ক্লিক পায়। সিঙ্ক করা মেনু লোকাল র‍্যাঙ্কিংয়ের অন্যতম শক্ত সংকেত — \"restaurants near me\" ধরনের সার্চে আপনাকে উপরে তুলে আনে।",
      benefit2Title: "Google Maps-এ দেখা দিন",
      benefit2Body:
        "গ্রাহক যখন Google Maps-এ খাবার খোঁজেন, আপনার পুরো মেনু সেখানেই দেখা যায় — দাম, ক্যাটাগরি আর আইটেম সমেত। ফোন করার আগেই তাঁরা আসার সিদ্ধান্ত নিতে পারেন।",
      benefit3Title: "সবসময় হালনাগাদ",
      benefit3Body:
        "দাম বদলেছেন? নতুন পদ যোগ করেছেন? মরসুমি আইটেম সরিয়েছেন? একবার সিঙ্ক করলেই Google Business Profile-এর মেনু সবশেষ চেহারা নেয়। Google-এ গিয়ে হাতে বদলানোর দরকার নেই।",
      benefit4Title: "প্রতি সপ্তাহে ঘণ্টার পর ঘণ্টা বাঁচান",
      benefit4Body:
        "হাতে Google Business মেনু আপডেট করা ক্লান্তিকর, আর ভুলও হয় অনেক। আমাদের সিঙ্ক সেটা করে সেকেন্ডে, ঘণ্টায় নয়। কপি-পেস্ট নয়, মন দিন রান্নায়।",
      benefit5Title: "আরও বেশি লোক আনুন",
      benefit5Body:
        "Google-এ বিস্তারিত মেনু দেখা গ্রাহকদের আসার সম্ভাবনা 30% বেশি। প্রতিযোগীদের বদলে আপনাকে বেছে নেওয়ার তথ্যটুকু তাঁদের হাতে দিন।",
      benefit6Title: "নির্ভুল ও নির্ভরযোগ্য",
      benefit6Body:
        "আসল মেনু আর Google-এ দেখানো দামের মধ্যে আর কোনো গরমিল নয়। Maps-এ পুরোনো তথ্য নিয়ে গ্রাহকের অভিযোগ একেবারেই বন্ধ।",
      comparisonHeading: "সিঙ্ক ছাড়া বনাম Menuthere সহ",
      comparisonSubheading: "নিজে থেকে মেনু সিঙ্ক হলে তফাতটা কোথায়, দেখুন",
      comparisonWithoutBadge: "✕ সিঙ্ক ছাড়া",
      comparisonWithout1: "Google-এ প্রতিটি আইটেম হাতে একে একে যোগ করা",
      comparisonWithout2: "কয়েক দিনেই Google-এর মেনু পুরোনো হয়ে যায়",
      comparisonWithout3: "দামের গরমিলে গ্রাহকের অভিযোগ",
      comparisonWithout4: "প্রতি মাসে ঘণ্টার পর ঘণ্টা ডেটা এন্ট্রি",
      comparisonWithout5: "কোনো ছবি নেই — শুধু সাদামাটা লেখা",
      comparisonWithout6: "প্ল্যাটফর্মে প্ল্যাটফর্মে আলাদা তথ্য",
      comparisonWithBadge: "✓ Menuthere সহ",
      comparisonWith1: "এক ক্লিকেই গোটা মেনু পাঠিয়ে দেওয়া",
      comparisonWith2: "Google-এর মেনু সবসময় সবশেষ মেনুর সঙ্গে মেলে",
      comparisonWith3: "নির্ভুল দাম গ্রাহকের ভরসা গড়ে",
      comparisonWith4: "সিঙ্ক সেকেন্ডে, হাতে ঘণ্টার কাজ নয়",
      comparisonWith5: "পুরো ছবি সাপোর্ট, দেখতেও আকর্ষণীয়",
      comparisonWith6: "ওয়েবসাইট, QR ও Google — সবখানে একই মেনু",
      featuresHeading: "Google মেনু সিঙ্কে যা যা পাচ্ছেন",
      featuresSubheading:
        "Google-এ আপনার উপস্থিতি নির্ভুল আর আকর্ষণীয় রাখার সম্পূর্ণ টুলকিট।",
      feature1: "এক ক্লিকে গোটা মেনু Google Business Profile-এ সিঙ্ক",
      feature2: "ক্যাটাগরি নিজে থেকেই ম্যাপ ও সাজিয়ে দেওয়া",
      feature3: "মেনু আইটেমের ছবি আপলোড সাপোর্ট",
      feature4: "দাম ও স্টকের সিঙ্ক",
      feature5: "চেইনের জন্য একাধিক লোকেশন সাপোর্ট",
      feature6: "সিঙ্কের ইতিহাস ও স্ট্যাটাস ট্র্যাকিং",
      feature7: "যেকোনো Google Business অ্যাকাউন্টে চলে",
      feature8: "কোনো টেকনিক্যাল জ্ঞান লাগে না",
      feature9: "ভেজ/নন-ভেজ লেবেল সাপোর্ট",
      feature10: "বিশেষ অক্ষর ও একাধিক ভাষার মেনুও সামলায়",
      ctaBoxHeading: "মেনু সিঙ্ক করতে তৈরি?",
      ctaBoxBody:
        "Google-এ নিজেদের উপস্থিতি হালনাগাদ রাখতে Menuthere ব্যবহার করছে শয়ে শয়ে রেস্তোরাঁ — আপনিও যোগ দিন। সেটআপে 5 মিনিটও লাগে না।",
      ctaBoxButton: "ফ্রি ট্রায়াল শুরু করুন",
      comingSoonBadge: "শীঘ্রই আসছে",
      comingSoonHeading: "Google-এ আপনার উপস্থিতির পরবর্তী ধাপ",
      comingSoonBody:
        "শুধু মেনু নয় — গোটা Google Business Profile সামলাতে আমরা নতুন শক্তিশালী ফিচার বানাচ্ছি।",
      autoPostTitle: "Google-এ অটো-পোস্ট",
      autoPostBody:
        "পোস্ট, অফার, ইভেন্ট ও আপডেট নিজে থেকেই প্রকাশ করুন সরাসরি আপনার Google Business Profile-এ। আজকের স্পেশাল, নতুন পদ কিংবা উৎসবের অফার — Google-এ লগ ইন না করেই ছড়িয়ে দিন।",
      autoPostPoint1: "ছবি ও CTA সহ পোস্ট শিডিউল করুন",
      autoPostPoint2: "রোজকার স্পেশাল ও মরসুমি অফারের প্রচার",
      autoPostPoint3: "ইভেন্টের ঘোষণা নিজে থেকেই প্রকাশ",
      autoPostPoint4: "পোস্টের অ্যানালিটিক্স ও এনগেজমেন্ট ট্র্যাকিং",
      reviewRepliesTitle: "AI রিভিউ রিপ্লাই",
      reviewRepliesBody:
        "প্রতিটি Google রিভিউয়ের — ভালো হোক বা খারাপ — ভেবেচিন্তে লেখা, ব্যক্তিগত উত্তর তৈরি করুক AI। দ্রুত জবাব দিন, সুনাম বজায় রাখুন, আর 24/7 গ্রাহককে বোঝান যে আপনি খেয়াল রাখছেন।",
      reviewRepliesPoint1: "AI-এর লেখা পেশাদার ও আন্তরিক উত্তর",
      reviewRepliesPoint2: "ভালো আর খারাপ — দুই ধরনের রিভিউই সামলায়",
      reviewRepliesPoint3: "আপনার রেস্তোরাঁর ভাষা ও সুরের সঙ্গে মেলে",
      reviewRepliesPoint4: "পোস্ট করার আগে এক ক্লিকে অনুমোদন বা সম্পাদনা",
      testimonialQuote:
        "“প্রতি মাসে Google-এ মেনু আপডেট করতে গোটা একটা দুপুর চলে যেত। Menuthere-এ আমি একটা বোতাম টিপি, আর সব সিঙ্ক হয়ে যায় — আইটেম, দাম, এমনকি ছবিও। আমাদের Google Maps লিস্টিং এখন পেশাদার দেখায়, আর অনলাইনে মেনু দেখে আসা গ্রাহকের সংখ্যাও চোখে পড়ার মতো বেড়েছে।”",
      testimonialAuthor: "Arjun & Priya Nair",
      testimonialRole: "মালিক, Spice Route Kitchen",
      testimonialLocation: "কোচি, কেরালা",
      faqSubheading:
        "Google Business Profile মেনু সিঙ্ক নিয়ে যা যা জানা দরকার",
      faq1Question: "Google Business Profile মেনু সিঙ্ক জিনিসটা কী?",
      faq1Answer:
        "এটি এমন একটি ফিচার, যা আমাদের প্ল্যাটফর্ম থেকে আপনার রেস্তোরাঁর মেনু নিজে থেকেই কপি করে দেয় আপনার Google Business Profile-এ (Google Search ও Google Maps-এ যে লিস্টিংটি দেখা যায়)। Google-এ একে একে প্রতিটি আইটেম যোগ করার বদলে এক ক্লিকেই সব সিঙ্ক হয়ে যায়।",
      faq2Question: "এটি ব্যবহার করতে কি Google Business Profile লাগবে?",
      faq2Answer:
        "হ্যাঁ, আপনার রেস্তোরাঁর একটি ভেরিফায়েড Google Business Profile দরকার। না থাকলে business.google.com-এ বিনামূল্যে তৈরি করে নিন। ভেরিফাই হয়ে গেলে সেটি আমাদের প্ল্যাটফর্মে যুক্ত করে সিঙ্ক শুরু করতে পারবেন।",
      faq3Question: "কত ঘন ঘন মেনু সিঙ্ক করা উচিত?",
      faq3Answer:
        "মেনুতে যখনই কিছু বদলান — নতুন আইটেম, দামের বদল বা মরসুমি আপডেট — তখনই সিঙ্ক করে নিন। সিঙ্কে কয়েক সেকেন্ডই লাগে, তাই হালনাগাদ না রাখার কারণ নেই। কেউ রোজ সিঙ্ক করেন, কেউ সপ্তাহে একবার।",
      faq4Question: "সিঙ্ক করলে কি Google-এ থাকা পুরোনো মেনু মুছে যাবে?",
      faq4Answer:
        "হ্যাঁ, প্রতিটি সিঙ্ক আপনার Google Business Profile-এর মেনুকে আমাদের প্ল্যাটফর্মের সবশেষ সংস্করণ দিয়ে বদলে দেয়। এতে তথ্য পুরোপুরি নির্ভুল থাকে। আপনার Google Business Profile-এর বাকি তথ্যে (ছবি, রিভিউ, সময়) কোনো প্রভাব পড়ে না।",
      faq5Question: "একাধিক রেস্তোরাঁর লোকেশনেও কি এটি কাজ করে?",
      faq5Answer:
        "হ্যাঁ! একটি Google Business অ্যাকাউন্টে একাধিক লোকেশন থাকলে কোনটিতে সিঙ্ক হবে তা বেছে নিতে পারেন। প্রতিটি লোকেশনের আলাদা মেনু থাকতে পারে। শাখায় শাখায় আলাদা মেনু রাখা চেইনের জন্য একেবারে ঠিকঠাক।",
      faq6Question: "আমার Google অ্যাকাউন্টের তথ্য কি নিরাপদ?",
      faq6Answer:
        "একদম। আমরা Google-এর অফিসিয়াল OAuth 2.0 ও Business Profile API ব্যবহার করি। মেনু সামলাতে যতটুকু অনুমতি দরকার, ঠিক ততটুকুই চাই। আপনার লগইনের তথ্য কখনো জমা রাখা হয় না — আমরা নিরাপদ টোকেন-ভিত্তিক অথেন্টিকেশন ব্যবহার করি।",
      faq7Question: "সিঙ্কের সময় মেনুর ছবিগুলোর কী হয়?",
      faq7Answer:
        "আপনার প্রোফাইলের মেনু আইটেমের ছবি মেনুর তথ্যের সঙ্গেই Google-এ আপলোড হয়ে যায়। বড় ছবি নিজে থেকেই Google-এর মাপে অপ্টিমাইজ হয়। কোনো ছবি আপলোড না হলেও আইটেমটি সিঙ্ক হয় — শুধু ছবিটা ছাড়া।",
      faq8Question: "এই ফিচার কি সব প্ল্যানে আছে?",
      faq8Answer:
        "Google Business Profile মেনু সিঙ্ক আমাদের Pro ও Business প্ল্যানে পাওয়া যায়। কোন প্ল্যানে কী কী আছে জানতে আমাদের প্রাইসিং পেজ দেখুন।",
    },
    petpooja: {
      metaTitle:
        "থার্ড-পার্টি ডেলিভারি প্ল্যাটফর্মকে 30% কমিশন দেওয়া বন্ধ করুন | Menuthere-এ ডাইরেক্ট অর্ডারিং",
      metaDescription:
        "থার্ড-পার্টি ডেলিভারি প্ল্যাটফর্ম প্রতি অর্ডারে রেস্তোরাঁর কাছ থেকে 20-30%+ কমিশন নেয়। Menuthere দেয় আপনার নিজের অর্ডারিং অ্যাপ — কমিশন মাত্র 0%, গ্রাহকের সব তথ্যের মালিকানা আপনার, সঙ্গে PetPooja POS ইন্টিগ্রেশন। রেস্তোরাঁর নিয়ন্ত্রণ ফিরিয়ে নিন।",
      ogTitle: "30% কমিশন দেওয়া বন্ধ করুন | রেস্তোরাঁর ডাইরেক্ট অর্ডারিং",
      ogDescription:
        "অন্য ডেলিভারি প্ল্যাটফর্মকে 20-30% দেবেন কেন? নিজের অর্ডারিং ওয়েবসাইট নিন, কমিশন মাত্র 0%। PetPooja POS ইন্টিগ্রেশন, গ্রাহকের সব তথ্য আর পুরো নিয়ন্ত্রণ আপনার।",
      breadcrumbCurrent: "ডাইরেক্ট অর্ডারিং ও PetPooja ইন্টিগ্রেশন",
      heroTitle:
        "থার্ড-পার্টি ডেলিভারি প্ল্যাটফর্মকে 30% কমিশন দেওয়া বন্ধ করুন",
      heroSubtitle:
        "নিজের অর্ডারিং ওয়েবসাইট, গ্রাহকের উপর পূর্ণ অধিকার, সঙ্গে PetPooja POS ইন্টিগ্রেশন",
      heroPrimaryCta: "সরাসরি বিক্রি শুরু করুন",
      statCommissionLabel: "প্রতি অর্ডারে কমিশন",
      value35Percent: "35%",
      statQuitLabel: "রেস্তোরাঁ অ্যাগ্রিগেটর ছাড়তে চায়",
      statFeeValue: "45%",
      statFeeLabel: "কার্যকর অ্যাগ্রিগেটর ফি",
      statDataValue: "100%",
      statDataLabel: "গ্রাহক তথ্য আপনার",
      introParagraph1:
        "অ্যাগ্রিগেটররা প্রতিটি অর্ডারে 20-33% কমিশন, আর তার উপরে লুকোনো ফি নেয়। 500 টাকার অর্ডারে আপনার হাত থেকে বেরিয়ে যায় 225 টাকা পর্যন্ত। এটা অংশীদারিত্ব নয় — এটা আপনার পরিশ্রমের উপর কর। CCI-এর তদন্তে বড় ডেলিভারি প্ল্যাটফর্মগুলো প্রতিযোগিতা আইন ভাঙার দায়ে দোষী প্রমাণিত হয়েছে।",
      introParagraph2:
        "Menuthere দেয় আপনার নিজের ব্র্যান্ডের অর্ডারিং ওয়েবসাইট — কমিশন মাত্র 1%, আর গ্রাহকের সব তথ্যের মালিক আপনি। সঙ্গে PetPooja POS ইন্টিগ্রেশন থাকায় অর্ডার সরাসরি চলে যায় আপনার রান্নাঘরে — মাঝখানে কেউ নেই, আয়ের ভাগ নেই, নিয়ন্ত্রণ হারানোও নেই।",
      problemsHeading: "অন্য ডেলিভারি প্ল্যাটফর্ম আপনার রেস্তোরাঁর কী ক্ষতি করছে।",
      problemsSubheading:
        "CCI-এর তদন্তে দুটি প্ল্যাটফর্মই প্রতিযোগিতা আইন ভাঙার দায়ে দোষী প্রমাণিত হয়েছে। আপনার ব্যবসার সঙ্গে ওরা ঠিক কী করছে, দেখুন।",
      problem1Title: "প্রতি অর্ডারে 20-33% কমিশন",
      problem1Body:
        "থার্ড-পার্টি ডেলিভারি প্ল্যাটফর্ম সম্প্রতি কমিশন বাড়িয়ে 33% পর্যন্ত নিয়ে গেছে। 500 টাকার অর্ডারে অন্য কোনো কাটাকুটির আগেই আপনার যায় 100-165 টাকা। খাবারের খরচ, ভাড়া আর কর্মীদের বেতন — সব ওই বাকিটুকু থেকেই।",
      problem2Title: "লুকোনো খরচ মিলিয়ে 45% পর্যন্ত",
      problem2Body:
        "কমিশনের উপর GST (18%), পেমেন্ট গেটওয়ে ফি (2-3%), প্যাকেজিংয়ে বাড়তি দাম (অর্ডারপিছু 2-5 টাকা), আর জোর করে চাপানো ছাড়ের ভাগ। 500 টাকার একটি অর্ডারে মোট প্ল্যাটফর্ম ফি দাঁড়াতে পারে 212-227 টাকায় — অর্থাৎ 42-45% বেরিয়ে গেল।",
      problem3Title: "গ্রাহকের তথ্য ওদের দখলে",
      problem3Body:
        "আপনি হাজার হাজার গ্রাহককে খাওয়ান, অথচ কারও সঙ্গেই আপনার সরাসরি সম্পর্ক নেই। প্ল্যাটফর্মগুলো ইচ্ছে করেই গ্রাহকের নাম, ফোন নম্বর আর অর্ডারের ইতিহাস আড়াল করে রাখে। ফলে আপনি না পারেন আনুগত্য গড়তে, না পারেন লক্ষ্য করে প্রচার চালাতে।",
      problem4Title: "টাকা দিলে তবেই নজরে আসা",
      problem4Body:
        "অন্য ডেলিভারি প্ল্যাটফর্মে সার্চের প্রথম 10টি ফলাফল প্রায় সবসময়ই টাকা দিয়ে কেনা জায়গা। প্রোমোটেড লিস্টিংয়ে খরচ না করলে আপনার রেস্তোরাঁ চাপা পড়ে যায়। বিজ্ঞাপনের খরচ ধরলে কার্যকর কমিশন দাঁড়ায় 25-40%।",
      problem5Title: "দাম ঠিক করার স্বাধীনতা নেই",
      problem5Body:
        "থার্ড-পার্টি ডেলিভারি প্ল্যাটফর্ম দামের উপর নিয়ম চাপায়, না মানলে জরিমানা করে, আর অন্য কোথাও কম দাম রাখলে র‍্যাঙ্ক নামিয়ে দেওয়ার হুঁশিয়ারি দেয়। নিজের দামের কৌশলটুকুও আপনার হাতে থাকে না।",
      problem6Title: "প্ল্যাটফর্ম এখন আপনারই প্রতিযোগী",
      problem6Body:
        "থার্ড-পার্টি ডেলিভারি প্ল্যাটফর্মগুলো এখন নিজেরাই ফুড ব্র্যান্ড আর কুইক-কমার্স অ্যাপ চালু করছে। আপনারই গ্রাহকের তথ্য কাজে লাগিয়ে ওরা প্রতিযোগী পণ্য বানাচ্ছে। NRAI একে বলছে 'ক্ষমতার অপব্যবহার'।",
      commissionHeading: "500 টাকার একটি অর্ডারের আসল খরচ।",
      commissionSubheading:
        "অ্যাগ্রিগেটর প্ল্যাটফর্ম বনাম ডাইরেক্ট অর্ডারিং — আপনার টাকা ঠিক কোথায় যায়, দেখুন।",
      commissionColCharge: "খরচের ধরন",
      commissionColPlatforms: "ডেলিভারি প্ল্যাটফর্ম",
      commissionRow1Label: "মূল কমিশন",
      commissionRow1Aggregator: "18-33%",
      commissionRow2Label: "GST",
      commissionRow2Aggregator: "~3-5%",
      commissionRow3Label: "পেমেন্ট গেটওয়ে",
      commissionRow3Aggregator: "2-3%",
      commissionRow3Menuthere: "2%",
      commissionRow4Label: "জোর করে চাপানো ছাড়",
      commissionRow4Aggregator: "5-15%",
      commissionRow4Menuthere: "আপনি ঠিক করবেন",
      commissionRow5Label: "প্যাকেজিংয়ে বাড়তি দাম",
      commissionRow5Aggregator: "অর্ডারপিছু 2-5 টাকা",
      commissionRow6Label: "প্রোমোটেড লিস্টিং",
      commissionRow6Aggregator: "বাড়তি 5-10%",
      commissionRow6Menuthere: "বিনামূল্যে নজরে আসা",
      commissionTotalLabel: "কার্যকর মোট ক্ষতি",
      commissionTotalAggregator: "212-227 টাকা (42-45%)",
      commissionTotalMenuthere: "~3%",
      commissionFootnote:
        "* NRAI, Menuviel ও Billboox-এর রিপোর্টে (2025-2026) পাওয়া ইন্ডাস্ট্রি তথ্যের ভিত্তিতে",
      solutionHeading: "রেস্তোরাঁর নিয়ন্ত্রণ ফিরিয়ে নিন।",
      solutionSubheading:
        "নিজের অর্ডারিং ওয়েবসাইট। কমিশন মাত্র 1%। গ্রাহকের সব তথ্য। PetPooja POS ইন্টিগ্রেশন।",
      solution1Title: "অর্ডারে কমিশন মাত্র 0%",
      solution1Body:
        "কমিশন মাত্র 0% হওয়ায় গ্রাহকের দেওয়া প্রায় প্রতিটি টাকাই আপনার কাছে আসে। কোনো লুকোনো ফি নেই, আয়ের ভাগও নেই। আপনার মার্জিন অক্ষত থাকে — যেমনটা হওয়া উচিত।",
      solution2Title: "গ্রাহকের 100% তথ্য আপনার",
      solution2Body:
        "প্রতিটি অর্ডারে আপনি পান গ্রাহকের নাম, ফোন নম্বর, অর্ডারের ইতিহাস আর পছন্দ। লয়্যালটি প্রোগ্রাম চালান, বেছে বেছে অফার পাঠান, আর গ্রাহকের সঙ্গে সত্যিকারের সম্পর্ক গড়ে তুলুন।",
      solution3Title: "নিজের ব্র্যান্ডের অর্ডারিং ওয়েবসাইট",
      solution3Body:
        "পান আপনার রেস্তোরাঁর ব্র্যান্ডিং, রং আর ডোমেন সমেত পেশাদার অর্ডারিং ওয়েবসাইট। গ্রাহক অর্ডার করেন সরাসরি আপনার কাছে — বাড়ে আপনার ব্র্যান্ড, কোনো অ্যাগ্রিগেটরের নয়।",
      solution4Title: "সম্পূর্ণ অ্যানালিটিক্স ও ইনসাইট",
      solution4Body:
        "প্রতিটি অর্ডার, ব্যস্ত সময়, জনপ্রিয় আইটেম, গ্রাহকের আচরণ আর আয়ের ধারা ট্র্যাক করুন। মেনু, দাম ও প্রোমোশন নিয়ে সিদ্ধান্ত নিন তথ্যের ভিত্তিতে।",
      solution5Title: "সত্যিকারের গ্রাহক আনুগত্য গড়ুন",
      solution5Body:
        "মার্জিনের ভাগ না দিয়েই নিজের অফার, ছাড় আর লয়্যালটি পুরস্কার চালান। WhatsApp নোটিফিকেশন, উৎসবের শুভেচ্ছা আর ব্যক্তিগত ডিল পাঠান সরাসরি গ্রাহকের কাছে।",
      solution6Title: "PetPooja POS ইন্টিগ্রেশন",
      solution6Body:
        "Menuthere ওয়েবসাইটের অর্ডার নির্বিঘ্নে সিঙ্ক হয়ে যায় সরাসরি আপনার PetPooja POS-এ। হাতে তোলার দরকার নেই, অর্ডার হারানোরও ভয় নেই। অন্য যেকোনো চ্যানেলের মতোই রান্নাঘর অর্ডার পেয়ে যায় সঙ্গে সঙ্গে।",
      realNumbersHeading: "অ্যাগ্রিগেটর নির্ভরতা বনাম ডাইরেক্ট অর্ডারিং।",
      realNumbersSubheading:
        "যে তুলনাটা প্ল্যাটফর্মগুলো আপনাকে দেখাতে চায় না।",
      realNumbersColAggregators: "অ্যাগ্রিগেটর",
      realNumbersRow1Metric: "প্রতি অর্ডারে কমিশন",
      realNumbersRow1Aggregator: "18-33% + ফি (কার্যকর 35-45%)",
      realNumbersRow1Direct: "মাত্র 0%",
      realNumbersRow2Metric: "গ্রাহক তথ্যের মালিকানা",
      realNumbersRow2Aggregator: "সবকিছুর মালিক প্ল্যাটফর্ম",
      realNumbersRow2Direct: "100% আপনার",
      realNumbersRow3Metric: "দামের নিয়ন্ত্রণ",
      realNumbersRow3Aggregator: "নিয়মে বাঁধা, না মানলে জরিমানা",
      realNumbersRow3Direct: "পূর্ণ স্বাধীনতা",
      realNumbersRow4Metric: "ব্র্যান্ড গড়া",
      realNumbersRow4Aggregator: "আনুগত্য যায় প্ল্যাটফর্মের ঘরে",
      realNumbersRow4Direct: "আনুগত্য যায় আপনার রেস্তোরাঁর ঘরে",
      realNumbersRow5Metric: "ডেলিভারিতে লাভের মার্জিন",
      realNumbersRow5Aggregator: "প্রায়ই 10%-এর নিচে",
      realNumbersRow5Direct: "25-35%+ সম্ভব",
      realNumbersRow6Metric: "মার্কেটিংয়ের নিয়ন্ত্রণ",
      realNumbersRow6Aggregator: "টাকা দিলে তবেই, 250-4000+ টাকা",
      realNumbersRow6Direct: "পূর্ণ নিয়ন্ত্রণ, নিজের ক্যাম্পেন",
      realNumbersRow7Metric: "মেনু ও ছাড়ের নিয়ন্ত্রণ",
      realNumbersRow7Aggregator: "প্ল্যাটফর্ম অনুমতি ছাড়াই চাপাতে পারে",
      realNumbersRow7Direct: "100% আপনার সিদ্ধান্ত",
      transparencyHeading: "জেনে রাখা ভালো — সম্পূর্ণ স্বচ্ছতা।",
      transparencySubheading:
        "আমরা খোলাখুলি বলতে বিশ্বাসী। আমরা কী দিই আর কী দিই না, দেখে নিন।",
      deliveryTitle: "আমরা ডেলিভারি রাইডার দিই না",
      deliveryBody:
        "Menuthere মন দেয় সেরা অর্ডারিং প্ল্যাটফর্ম, গ্রাহক ব্যবস্থাপনা আর POS ইন্টিগ্রেশনে। ডেলিভারির জন্য আপনার হাতে নমনীয় কয়েকটি পথ আছে:",
      deliveryPoint1: "নিজের ডেলিভারি কর্মী রাখুন, নিয়ন্ত্রণ থাকুক পুরোটাই",
      deliveryPoint2:
        "Porter, Dunzo বা Shadowfax-এর মতো থার্ড-পার্টি পরিষেবার সঙ্গে জুড়ুন",
      deliveryPoint3: "শুধু পিকআপ রাখুন — অনেক গ্রাহক তাতেই স্বচ্ছন্দ",
      deliveryPoint4: "ডাইন-ইন QR অর্ডারে তো ডেলিভারির দরকারই নেই",
      deliveryNote:
        "30% কমিশনে অ্যাগ্রিগেটরের মাধ্যমে ডেলিভারি করা অর্ডারের চেয়ে সরাসরি চ্যানেলে শুধু পিকআপের অর্ডারও বেশি লাভজনক।",
      paymentTitle: "পেমেন্ট ইন্টিগ্রেশন",
      paymentBadge: "মাত্র 1%",
      paymentBody:
        "মাত্র 1%-এ ইন্টিগ্রেটেড পেমেন্ট গেটওয়ে (শুধু গ্রাহক পরিষেবার জন্য)। আপনার গ্রাহকরা অর্ডারিং ওয়েবসাইটেই সরাসরি অনলাইনে টাকা দিতে পারেন:",
      paymentPoint1: "UPI পেমেন্ট (Google Pay, PhonePe, Paytm)",
      paymentPoint2: "ক্রেডিট ও ডেবিট কার্ড সাপোর্ট",
      paymentPoint3: "ডিজিটাল ওয়ালেট ইন্টিগ্রেশন",
      paymentPoint4: "PetPooja POS-এর সঙ্গে অটো-রিকনসিলিয়েশন",
      paymentNote:
        "চাইলে ক্যাশ অন ডেলিভারিও নিতে পারেন, কিংবা নিজের চালু পেমেন্ট ব্যবস্থাই রাখতে পারেন।",
      factsHeading: "সংখ্যা মিথ্যে বলে না।",
      factsSubheading:
        "ইন্ডাস্ট্রি সমীক্ষা, CCI-এর তদন্ত আর NRAI রিপোর্টের সত্যিকারের তথ্য।",
      fact1Text:
        "ভারতীয় রেস্তোরাঁ অন্য ডেলিভারি প্ল্যাটফর্ম ছাড়তে চায় (ডিসেম্বর 2025-এর সমীক্ষা)",
      fact2Value: "60%",
      fact2Text:
        "নতুন রেস্তোরাঁ প্রথম বছরেই বন্ধ হয়ে যায় — প্ল্যাটফর্ম নির্ভরতা এর বড় কারণ",
      fact3Value: "400 কোটি টাকা",
      fact3Text:
        "প্যাকেজিং ফিতে বাড়তি দাম বসিয়ে প্ল্যাটফর্মগুলো গোটা ইকোসিস্টেম থেকে বছরে বাড়তি তুলে নেয়",
      fact4Value: "2,000+",
      fact4Text:
        "রেস্তোরাঁ অ্যাগ্রিগেটর প্ল্যাটফর্মের বিরুদ্ধে #Logout বয়কটে অংশ নিয়েছিল",
      howItWorksHeading: "3টি সহজ ধাপে সরাসরি বিক্রি শুরু করুন।",
      howItWorksSubheading:
        "10 মিনিটেরও কমে নিজের অর্ডারিং চ্যানেল তৈরি করে ফেলুন।",
      step1Title: "মেনু ও ওয়েবসাইট তৈরি করুন",
      step1Body:
        "মেনু আপলোড করুন, ব্র্যান্ডিং পছন্দমতো সাজান, আর নিজের অর্ডারিং ওয়েবসাইট লাইভ করুন। 10 মিনিটও লাগে না।",
      step2Title: "PetPooja POS যুক্ত করুন",
      step2Body:
        "অর্ডার নিজে থেকে সিঙ্ক করতে PetPooja POS জুড়ে দিন। অর্ডার সরাসরি চলে যায় রান্নাঘরে — হাতে কোনো কাজ নেই।",
      step3Title: "শেয়ার করুন, বিক্রি শুরু করুন",
      step3Body:
        "WhatsApp, সোশ্যাল মিডিয়া আর QR কোডে আপনার অর্ডারিং লিঙ্ক ছড়িয়ে দিন। দেখুন সরাসরি অর্ডার আসতে শুরু করেছে।",
      savingsHeading:
        "অন্য ডেলিভারি প্ল্যাটফর্মে প্রতিটি অর্ডারে আপনার যায় 100-225 টাকা",
      savingsBody:
        "দিনে 50টি ডেলিভারি অর্ডার হলে রোজ হারাচ্ছেন 5,000-11,250 টাকা। মাসে 1.5-3.3 লাখ টাকা। নিজের অর্ডারিং ওয়েবসাইট প্রথম দিন থেকেই নিজের খরচ তুলে নেয়।",
      savingsSecondaryCta: "প্রাইসিং দেখুন",
      faqSubheading:
        "Menuthere-এ ডাইরেক্ট অর্ডারিং নিয়ে যা যা জানা দরকার।",
      faq1Question:
        "অন্য ডেলিভারি প্ল্যাটফর্মের কমিশন দেওয়া বন্ধ করতে Menuthere কীভাবে সাহায্য করে?",
      faq1Answer:
        "Menuthere দেয় আপনার নিজের ব্র্যান্ডের অর্ডারিং ওয়েবসাইট, যেখানে গ্রাহক সরাসরি অর্ডার করতে পারেন। কমিশন মাত্র 0% হওয়ায় অর্ডারের প্রায় পুরো আয়টাই আপনার থাকে। আমরা নিই সাধারণ একটা সাবস্ক্রিপশন ফি — প্রতিটি অর্ডারের 20-30% ভাগ নয়।",
      faq2Question: "Menuthere কি ডেলিভারি বয় দেয়?",
      faq2Answer:
        "না, Menuthere ডেলিভারি রাইডার দেয় না। আমরা মন দিই সেরা অর্ডারিং প্ল্যাটফর্ম, গ্রাহক ব্যবস্থাপনা আর POS ইন্টিগ্রেশনে। ডেলিভারির জন্য নিজের কর্মী রাখতে পারেন, Porter, Dunzo বা Shadowfax-এর মতো থার্ড-পার্টি পরিষেবার সঙ্গে জুড়তে পারেন, কিংবা শুধু পিকআপ রাখতে পারেন। অনেক রেস্তোরাঁ দেখেছে, 30% কমিশনে অ্যাগ্রিগেটরের ডেলিভারি অর্ডারের চেয়ে সরাসরি চ্যানেলের পিকআপ অর্ডারও বেশি লাভজনক।",
      faq3Question: "PetPooja ইন্টিগ্রেশন কীভাবে কাজ করে?",
      faq3Answer:
        "আপনার Menuthere ওয়েবসাইটে আসা অর্ডার রিয়েল-টাইমে নিজে থেকেই চলে যায় PetPooja POS টার্মিনালে। রান্নাঘর অর্ডার দেখে সঙ্গে সঙ্গে — হাতে তোলা নেই, কপি-পেস্ট নেই, অর্ডার হারানোও নেই। POS-এ অন্য যেকোনো চ্যানেলের অর্ডারের মতোই কাজ করে।",
      faq4Question: "গ্রাহকের কাছ থেকে টাকা নেওয়ার ব্যবস্থা কী?",
      faq4Answer:
        "Menuthere-এ ইন্টিগ্রেটেড পেমেন্ট গেটওয়ে সাপোর্ট আছে, ফি মাত্র 0% (শুধু গ্রাহক পরিষেবার জন্য)। গ্রাহকরা আপনার অর্ডারিং ওয়েবসাইটেই UPI, কার্ড ও ওয়ালেটে অনলাইনে টাকা দিতে পারেন। চাইলে ক্যাশ অন ডেলিভারিও নিতে পারেন, কিংবা নিজের চালু পেমেন্ট ব্যবস্থাই রাখতে পারেন।",
      faq5Question: "অন্য ডেলিভারি প্ল্যাটফর্ম কি পুরোপুরি ছেড়ে দেওয়া উচিত?",
      faq5Answer:
        "সবসময় নয়। অনেক রেস্তোরাঁ নতুন গ্রাহক পাওয়ার জন্য অন্য ডেলিভারি প্ল্যাটফর্ম রেখে দেয়, আর পুরোনো গ্রাহকদের বেশি মার্জিনের অর্ডারের জন্য নিজের ওয়েবসাইটে নিয়ে আসে। লক্ষ্য হলো নির্ভরতা কমানো — সবসময় পুরোপুরি ছেড়ে দেওয়া নয় — আর আয়ের বেশি অংশ নিজের কাছে রাখা।",
      faq6Question: "Menuthere-এর খরচ কত?",
      faq6Answer:
        "Menuthere নেয় সাধারণ একটা মাসিক সাবস্ক্রিপশন — আপনার অর্ডারের শতাংশ নয়। এমনকি পেইড প্ল্যানেও অ্যাগ্রিগেটরের কমিশন এড়িয়ে খরচের চেয়ে অনেক বেশি সাশ্রয় করবেন। চলতি প্ল্যান দেখতে আমাদের প্রাইসিং পেজে যান।",
      faq7Question: "সত্যিই কি 35% রেস্তোরাঁ অ্যাগ্রিগেটর ছাড়তে চায়?",
      faq7Answer:
        "হ্যাঁ। 2025 সালের ডিসেম্বরের একটি ইন্ডাস্ট্রি সমীক্ষায় দেখা গেছে, 35% ভারতীয় রেস্তোরাঁ অন্য ডেলিভারি প্ল্যাটফর্ম ব্যবহার বন্ধ করতে চায় — কারণ হিসেবে তারা বলেছে চড়া কমিশন, খারাপ গ্রাহক পরিষেবা, কম লাভ আর গ্রাহকের তথ্য না পাওয়ার কথা।",
      faq8Question:
        "Menuthere-এর পাশাপাশি কি অন্য ডেলিভারি প্ল্যাটফর্মও ব্যবহার করা যায়?",
      faq8Answer:
        "একদম। আমাদের বেশিরভাগ রেস্তোরাঁ পার্টনার দুটোই ব্যবহার করেন। নতুন গ্রাহক পেতে অন্য ডেলিভারি প্ল্যাটফর্ম রাখেন, আর পুরোনো গ্রাহকদের সক্রিয়ভাবে নিয়ে আসেন নিজের Menuthere ওয়েবসাইটে, যেখানে মার্জিন অনেক বেশি। সময়ের সঙ্গে গ্রাহকরা সরাসরি অর্ডার করতেই বেশি পছন্দ করেন, তাই সরাসরি অর্ডারের ভাগ বাড়তেই থাকে।",
    },
    whatsappOrdering: {
      metaTitle:
        "রেস্তোরাঁর জন্য WhatsApp অর্ডারিং — গ্রাহক শুধু 'Hi' পাঠান | Menuthere",
      metaDescription:
        "আপনার WhatsApp নম্বরকেই বানান অর্ডারিং চ্যানেল। গ্রাহক 'Hi' পাঠান, সঙ্গে সঙ্গে অটো-লগইন লিঙ্ক পান, ছবিওয়ালা মেনু থেকে অর্ডার করেন আর লাইভ স্ট্যাটাস আপডেট পান — অ্যাপ ডাউনলোড নেই, সাইনআপ নেই, কমিশন শূন্য।",
      metaKeywords:
        "WhatsApp অর্ডারিং, রেস্তোরাঁর জন্য WhatsApp অর্ডারিং সিস্টেম, WhatsApp-এ অর্ডার, WhatsApp Business অর্ডারিং, রেস্তোরাঁর WhatsApp মেনু, Hi পাঠিয়ে অর্ডার, WhatsApp ফুড অর্ডারিং, চ্যাটে অর্ডার, শূন্য কমিশন অর্ডারিং",
      ogTitle: "WhatsApp অর্ডারিং — গ্রাহক শুধু 'Hi' পাঠান | Menuthere",
      ogDescription:
        "রেস্তোরাঁর সবচেয়ে ঝামেলাহীন অর্ডারিং চ্যানেল। 'Hi' পাঠান → সঙ্গে সঙ্গে লিঙ্ক → আপনার মেনুতে অর্ডার → WhatsApp-এ লাইভ আপডেট। অ্যাপ নেই, সাইনআপ নেই, কমিশন শূন্য।",
      structuredDataProductName: "Menuthere WhatsApp অর্ডারিং",
      structuredDataProductDescription:
        "রেস্তোরাঁর জন্য WhatsApp অর্ডারিং সিস্টেম। গ্রাহক 'Hi' পাঠিয়ে সঙ্গে সঙ্গে অটো-লগইন লিঙ্ক পান, ছবিওয়ালা ওয়েব মেনু থেকে অর্ডার করেন আর WhatsApp-এ অর্ডারের লাইভ স্ট্যাটাস আপডেট পান।",
      heroBadge: "WhatsApp অর্ডারিং",
      heroBadgeNew: "নতুন",
      heroTitle: "আপনার গ্রাহক অর্ডার করেন শুধু “Hi” পাঠিয়ে।",
      heroSubtitle:
        "আপনার WhatsApp নম্বরকেই বানিয়ে ফেলুন সবচেয়ে সহজ অর্ডারিং চ্যানেল। একটাই “Hi”, আর প্রতিটি গ্রাহক সঙ্গে সঙ্গে পেয়ে যান আপনার মেনুর অটো-লগইন লিঙ্ক — অ্যাপ ইনস্টল নেই, সাইনআপ নেই, OTP নেই। গ্রাহক থাকেন আপনার, কমিশন লাগে শূন্য।",
      primaryCta: "ফ্রি শুরু করুন",
      heroTrust1: "অ্যাপ ডাউনলোড নেই",
      heroTrust2: "সাইনআপ বা OTP নেই",
      heroTrust3: "0% কমিশন",
      stepsHeading: "“Hi” পাঠান। ওটাই গোটা ফানেল।",
      stepsSubheading:
        "কার্ট ফেলে চলে যাওয়ার সবচেয়ে বড় কারণ ঝামেলা — ডাউনলোড, সাইনআপ, পাসওয়ার্ড। WhatsApp অর্ডারিং সেসব একেবারে সরিয়ে দেয়। চারটে ধাপ, আর গ্রাহককে চেনা জায়গাটা ছেড়েই যেতে হয় না।",
      step1Title: "গ্রাহক “Hi” পাঠান",
      step1Body:
        "স্টিকার, টেবিলের QR, বায়োর লিঙ্ক কিংবা Google প্রোফাইল — যেখান থেকেই হোক, গ্রাহক ট্যাপ করে WhatsApp-এ এসে আপনার নম্বরে Hi পাঠান। অ্যাপ ডাউনলোড নেই, ফর্ম ভরাও নেই।",
      step2Title: "সঙ্গে সঙ্গে আসে Order Now লিঙ্ক",
      step2Body:
        "আপনার নম্বর এক সেকেন্ডেই উত্তর দেয় একটা ট্যাপযোগ্য Order Now বোতাম দিয়ে। লিঙ্কেই তাঁরা নিজে থেকে লগ ইন হয়ে যান — OTP নেই, পাসওয়ার্ড নেই, অ্যাকাউন্ট খোলাও নেই।",
      step3Title: "ছবিওয়ালা মেনুতে অর্ডার করেন",
      step3Body:
        "লিঙ্ক খুললেই আপনার ব্র্যান্ডের ওয়েব মেনু — আগে থেকেই লগ ইন করা। তাঁরা ছবি দেখেন, কার্টে যোগ করেন, UPI বা ক্যাশ বেছে নেন, আর কয়েক ট্যাপেই অর্ডার দিয়ে দেন।",
      step4Title: "আপডেট ফিরে আসে WhatsApp-এ",
      step4Body:
        "অর্ডার পাওয়া গেছে, নেওয়া হয়েছে, খাবার তৈরি, লাইভ ট্র্যাকিং লিঙ্ক সহ ডেলিভারিতে রওনা, পৌঁছে গেছে — সঙ্গে লয়্যালটি পয়েন্ট। প্রতিটি আপডেট আসে সেই চ্যাটেই।",
      featuresHeading: "শুধু গল্প করার জন্য নয়, বিক্রি করার জন্য তৈরি।",
      featuresSubheading:
        "WhatsApp-এ পেশাদারের মতো অর্ডারিং চালাতে যা যা দরকার — আপনার ব্র্যান্ডে, আপনার শর্তে।",
      feature1Title: "অ্যাপ নেই, সাইনআপ নেই",
      feature1Body:
        "WhatsApp আছে এমন যেকোনো ফোনে চলে। “Hi” পাঠালেই গ্রাহক নিঃশব্দে তৈরি ও চিহ্নিত হয়ে যান, তাই লগইনের দেয়ালে তাঁদের কখনো আটকাতে হয় না।",
      feature2Title: "আপনার নিজের ব্র্যান্ডের নম্বর",
      feature2Body:
        "Meta-র মাধ্যমে কয়েক মিনিটেই যুক্ত করুন আপনার আসল WhatsApp Business নম্বর — এমনকি এখন যেটা ব্যবহার করছেন সেটাও। নয়তো আমাদের শেয়ার করা নম্বরে সঙ্গে সঙ্গে লাইভ হয়ে যান।",
      feature3Title: "নিজের ডোমেনে অর্ডার লিঙ্ক",
      feature3Body:
        "অর্ডার লিঙ্ক চলতে পারে আপনার নিজের ডোমেনে (yourbrand.com), কোনো সাধারণ থার্ড-পার্টি URL-এ নয় — তাই প্রতিটি ছোঁয়াই থাকে আপনার ব্র্যান্ডে।",
      feature4Title: "স্বয়ংক্রিয় স্ট্যাটাস আপডেট",
      feature4Body:
        "পুরো বিল সহ অর্ডার নেওয়া, গ্রহণ, তৈরি, লাইভ ট্র্যাকিং ম্যাপ লিঙ্ক সহ রওনা, সম্পন্ন আর লয়্যালটি পয়েন্ট — সবই যায় নিজে থেকে।",
      feature5Title: "নিরাপদ, একবার-ব্যবহারের লিঙ্ক",
      feature5Body:
        "প্রতিটি লিঙ্ক সই করা, কয়েক মিনিটেই মেয়াদ ফুরোয় আর যিনি প্রথম খোলেন তাঁর সঙ্গেই বাঁধা পড়ে — ফরওয়ার্ড করা লিঙ্ক দিয়ে কারও লগ ইন করা সেশন কখনোই দখল করা যায় না।",
      feature6Title: "কোড ছাড়াই মেসেজ ফ্লো",
      feature6Body:
        "আপনার স্বাগত ও অর্ডার মেসেজ হলো সম্পাদনাযোগ্য ফ্লো — কিওয়ার্ড ট্রিগার, বোতাম আর মিডিয়া সমেত; কোডে হাত না দিয়েই লেখা বদলান।",
      feature7Title: "এক জায়গায় WhatsApp ইনবক্স",
      feature7Body:
        "আসা-যাওয়া প্রতিটি মেসেজ জমা থাকে আর ড্যাশবোর্ডেই দেখা যায়, তাই ব্যস্ত সময়েও কিছু হাতছাড়া হয় না।",
      feature8Title: "চ্যানেল-ট্যাগ করা অ্যানালিটিক্স",
      feature8Body:
        "WhatsApp-এ আসা অর্ডার নিজে থেকেই ট্যাগ হয়ে যায়। অ্যাপ, ওয়েবসাইট ও WhatsApp — কোথায় কত অর্ডার আর কত আয়, দেখুন পাশাপাশি।",
      frictionHeading: "ট্যাপ গুনে দেখুন। গ্রাহকরা গোনেন।",
      frictionSubheading:
        "খিদে থেকে অর্ডার — মাঝের প্রতিটি বাড়তি ধাপ মানে একজন গ্রাহক হারানো। একই অর্ডার, দুই রকমে।",
      frictionAggregatorLabel: "অ্যাগ্রিগেটর অ্যাপ",
      frictionAggregatorStep1: "অ্যাপ ইনস্টল করা",
      frictionAggregatorStep2: "সাইন আপ + OTP যাচাই",
      frictionAggregatorStep3: "আপনার রেস্তোরাঁ খোঁজা",
      frictionAggregatorStep4: "অর্ডার (ওরা নেয় 20–33%)",
      frictionAggregatorStep5: "গ্রাহককে আপনি কখনো দেখেনই না",
      frictionWhatsappLabel: "WhatsApp অর্ডারিং",
      frictionWhatsappStep1: "“Hi” পাঠানো",
      frictionWhatsappStep2: "Order Now ট্যাপ (নিজে থেকেই লগ ইন)",
      frictionWhatsappStep3: "আপনার মেনুতে অর্ডার",
      frictionHighlight: "অর্ডারের 100% মূল্যই থাকে আপনার কাছে।",
      comparisonHeading: "তুলনায় কোথায় দাঁড়ায়।",
      comparisonSubheading:
        "Menuthere WhatsApp অর্ডারিং বনাম ফুড অ্যাগ্রিগেটর বনাম সাধারণ “চ্যাটবট” অর্ডারিং টুল।",
      comparisonColAggregators: "ফুড অ্যাগ্রিগেটর",
      comparisonColChatbots: "সাধারণ চ্যাটবট",
      comparisonValueYes: "হ্যাঁ",
      comparisonValueNo: "না",
      comparisonRow1Label: "প্রতি অর্ডারে কমিশন",
      comparisonRow1Aggregator: "20–33%",
      comparisonRow1Chatbot: "মাসিক ফি + প্রতি মেসেজে",
      comparisonRow2Label: "অ্যাপ ডাউনলোড লাগে",
      comparisonRow2Us: "কখনোই না",
      comparisonRow3Label: "গ্রাহকের লগ ইন / OTP",
      comparisonRow3Us: "নিজে থেকেই — কিছুই লাগে না",
      comparisonRow3Aggregator: "অ্যাকাউন্ট + OTP",
      comparisonRow3Chatbot: "সাধারণত লাগে",
      comparisonRow4Label: "অর্ডারের অভিজ্ঞতা",
      comparisonRow4Us: "পুরো ছবিওয়ালা মেনু",
      comparisonRow4Aggregator: "ওদের অ্যাপের ভিতরে",
      comparisonRow4Chatbot: "চ্যাটে আইটেম টাইপ করা",
      comparisonRow5Label: "আপনার নিজের নম্বর থেকে যায়",
      comparisonRow5Chatbot: "মাঝেমধ্যে",
      comparisonRow6Label: "লাইভ অর্ডার ও ডেলিভারি ট্র্যাকিং",
      comparisonRow6Us: "WhatsApp-এ",
      comparisonRow6Aggregator: "ওদের অ্যাপে",
      comparisonRow6Chatbot: "কদাচিৎ",
      comparisonRow7Label: "গ্রাহকের তথ্যের মালিক আপনি",
      comparisonRow7Us: "হ্যাঁ, পুরোপুরি",
      comparisonRow7Chatbot: "আংশিক",
      comparisonRow8Label: "সেটআপের সময়",
      comparisonRow8Us: "কয়েক মিনিট",
      comparisonRow8Aggregator: "সপ্তাহ ধরে অনবোর্ডিং",
      comparisonRow8Chatbot: "কয়েক দিন + স্ক্রিপ্টিং",
      outcome1Value: "≈ 10 সেকেন্ড",
      outcome1Label: "“Hi” থেকে গ্রাহকের হাতে লাইভ অর্ডারিং লিঙ্ক।",
      outcome2Label: "কমিশন। অর্ডারের প্রতিটি টাকা থাকে আপনার।",
      outcome3Value: "শুরু থেকে শেষ",
      outcome3Label:
        "অর্ডার → গ্রহণ → ডেলিভারিতে রওনা → ট্র্যাকিং, সবই WhatsApp-এ।",
      faqHeading: "প্রশ্ন, আর তার উত্তর।",
      faq1Question: "আমার গ্রাহকদের কি কিছু ইনস্টল করতে হবে?",
      faq1Answer:
        "না। WhatsApp থাকলেই তাঁরা অর্ডার করতে পারবেন। “Hi” পাঠান, Order Now লিঙ্কে ট্যাপ করেন, আর সঙ্গে সঙ্গে চলে আসেন আপনার মেনুতে — আগে থেকেই লগ ইন করা। কোনো অ্যাপ ডাউনলোড নেই, অ্যাকাউন্ট খোলাও নেই।",
      faq2Question: "গ্রাহক কি চ্যাটের ভিতরেই অর্ডার টাইপ করেন?",
      faq2Answer:
        "না — আর সেটাই আসল কথা। WhatsApp হলো সদর দরজা, চেকআউট নয়। “Hi” পাঠালেই তাঁরা পান আপনার আসল, ছবিওয়ালা মেনুর লিঙ্ক — ক্যাটাগরি আর সার্চ সমেত; তাই অর্ডার হয় দ্রুত, ভুলও হয় কম। এরপর স্ট্যাটাস আপডেট ফিরে আসে WhatsApp-এ।",
      faq3Question: "এটা কি আমার নিজের WhatsApp নম্বর থেকে পাঠাতে পারে?",
      faq3Answer:
        "হ্যাঁ। Meta-র অফিসিয়াল অনবোর্ডিংয়ের মাধ্যমে কয়েক মিনিটেই নিজের WhatsApp Business নম্বর যুক্ত করতে পারেন — এমনকি WhatsApp Business অ্যাপে এখন যে নম্বরটি ব্যবহার করছেন সেটিও। সেটআপের ঝামেলাই চান না? আমাদের শেয়ার করা নম্বরে সঙ্গে সঙ্গে লাইভ হয়ে যান, পরে বদলে নেবেন।",
      faq4Question: "অর্ডারিং লিঙ্ক শেয়ার করা কি নিরাপদ?",
      faq4Answer:
        "প্রতিটি লিঙ্ক ক্রিপ্টোগ্রাফিকভাবে সই করা, কয়েক মিনিটেই মেয়াদ ফুরোয় আর যিনি প্রথম খোলেন তাঁর সঙ্গেই বাঁধা পড়ে। কেউ ফরওয়ার্ড করলে সেটি আর কারও কাছে কাজ করবে না — তাই লগ ইন করা সেশন কখনোই ফাঁস হয় না।",
      faq5Question: "অর্ডারের পর গ্রাহক কী কী পান?",
      faq5Answer:
        "প্রতিটি ধাপে স্বয়ংক্রিয় WhatsApp মেসেজ: পুরো বিল সহ অর্ডার পাওয়ার খবর, গ্রহণ, খাবার তৈরি, লাইভ ট্র্যাকিং লিঙ্ক সহ ডেলিভারিতে রওনা, সম্পন্ন, আর অর্জিত লয়্যালটি পয়েন্ট (আপনি লয়্যালটি চালালে)।",
      faq6Question: "Menuthere কত কমিশন নেয়?",
      faq6Answer:
        "অর্ডারে কোনো কমিশন নেই। WhatsApp অর্ডারিং আপনার নিজের সরাসরি চ্যানেলেরই অংশ — প্রতিটি অর্ডারের 100% মূল্য আপনার থাকে, আর টাকা সোজা জমা পড়ে আপনার ব্যাঙ্কে।",
      faqCtaPrompt: "গ্রাহকরা একটাই “Hi”-তে অর্ডার করুক — তৈরি তো?",
      faqSecondaryLink: "শূন্য-কমিশন অর্ডারিং দেখুন",
      trialHeading:
        "2 মিনিটেরও কমে চালু করুন আপনার WhatsApp অর্ডারিং সিস্টেম।",
      trialDescription:
        "WhatsApp নম্বর যুক্ত করুন, মেনু আপলোড করুন, আর গ্রাহকদের একটাই “Hi”-তে অর্ডার করতে দিন — অটো-লগইন লিঙ্ক, লাইভ স্ট্যাটাস আপডেট, কমিশন শূন্য। Menuthere-এর সঙ্গে বেড়ে ওঠা 600+ রেস্তোরাঁর দলে যোগ দিন।",
    },
  },
  solutionsSlug: {
    heroPrimaryCta: "ফ্রি শুরু করুন",
    heroSecondaryCta: "ডেমো বুক করুন",
    benefitsHeadingLead: "কেন Menuthere বেছে নেবেন",
    benefitsHeadingIndustry: "{industry}-এর জন্য?",
    benefitsHeadingIndustryFallback: "আপনার ব্যবসা",
    benefitsSubheading: "আপনার ইন্ডাস্ট্রির কথা ভেবেই বানানো ফিচার।",
    featuresHeadingLead: "সফল হতে যা যা দরকার,",
    featuresHeadingEmphasis: "সবই এখানে।",
    featuresSubheading:
      "আপনার মেনুকে আধুনিক করতে আর গ্রাহককে মুগ্ধ করতে তৈরি সম্পূর্ণ টুলকিট।",
    featuresCtaCardHeading: "শুরু করতে তৈরি?",
    featuresCtaCardBody:
      "মেনুর অভিজ্ঞতা বদলে ফেলতে Menuthere ব্যবহার করছে হাজার হাজার ব্যবসা — আপনিও যোগ দিন।",
    featuresCtaCardButton: "ফ্রি ট্রায়াল শুরু করুন",
    useCasesHeadingLead: "উপযুক্ত",
    useCasesHeadingIndustry: "প্রতিটি ধরনের {industry}-এর জন্য।",
    useCasesHeadingIndustryFallback: "ব্যবসা",
    faqHeadingLead: "প্রায়ই জিজ্ঞাসা করা",
    faqHeadingEmphasis: "প্রশ্ন।",
    notFoundMetaTitle: "সমাধান পাওয়া যায়নি",
    breadcrumbHome: "হোম",
    breadcrumbSolutions: "সমাধান",
  },
  downloadApp: {
    heroHeadingLead: "Menuthere এখন",
    heroHeadingHighlight: "মোবাইল ও ডেস্কটপে।",
    heroSubheading:
      "রেস্তোরাঁ সামলান চলতে-ফিরতে কিংবা নিজের ডেস্ক থেকে। রিয়েল-টাইম অর্ডার নোটিফিকেশন পান, মেনু আপডেট করুন আর সব ডিভাইসে বিক্রির হিসেব রাখুন।",
    appStoreBadgePrefix: "ডাউনলোড করুন",
    playStoreBadgePrefix: "পাওয়া যাচ্ছে",
    windowsBadgePrefix: "ডাউনলোড করুন",
    windowsBadgePlatform: "Windows",
    heroImageAlt: "Menuthere অ্যাপের ইন্টারফেস",
  },
  blog: {
    metaTitle: "ব্লগ | Menuthere - রেস্তোরাঁ ও ক্যাফের ইনসাইট",
    metaDescription:
      "ডিজিটাল মেনু, QR কোড, Google Business সিঙ্ক আর খাদ্য ব্যবসা বাড়ানো নিয়ে রেস্তোরাঁ মালিকদের জন্য টিপস, গাইড ও ইনসাইট।",
    ogTitle: "ব্লগ | Menuthere",
    ogDescription:
      "ডিজিটাল মেনু, QR কোড আর খাদ্য ব্যবসা বাড়ানো নিয়ে রেস্তোরাঁ মালিকদের জন্য টিপস, গাইড ও ইনসাইট।",
    heroHeading: "সবশেষ আপডেট আর ইনসাইট",
    heroHeadingAccent: "Menuthere থেকে",
    categoryLabel: "ব্লগ",
    emptyState: "এখনও কোনো লেখা প্রকাশিত হয়নি। সঙ্গে থাকুন!",
    postMetaTitleTemplate: "{title} | Menuthere ব্লগ",
    postNotFoundMetaTitle: "লেখা পাওয়া যায়নি",
    backToIndexLink: "← ব্লগ",
    relatedHeading: "আরও লেখা",
  },
};

export default bn;
