import type { Dictionary } from "./en";

/**
 * Tamil. Typed as `Dictionary`, so this file cannot drift from the English
 * source: add a key to en.ts and TypeScript fails here until it is translated,
 * rather than letting English leak onto a Tamil page.
 *
 * Brand nouns (Menuthere, WhatsApp, Google, Petpooja, Zomato, Swiggy, Stripe,
 * Product Hunt, QR, POS, SaaS, SEO) stay in Latin script on purpose — that is
 * how Tamil Nadu's restaurant and software market actually writes them.
 *
 * Dashboard labels a user will hunt for on screen (Menu, Offers, Settings,
 * Availability, Priority, View Menu) are left in English inside the help-centre
 * answers: the product UI is English, so translating the button name would send
 * the reader looking for something that is not there.
 */
/**
 * IN PROGRESS — typed `Partial<Dictionary>` while sections are still being
 * translated, and deliberately NOT registered in dictionaries/index.ts.
 *
 * The invariant that matters is "English or complete, never half English", and
 * it is enforced where it counts: DICTIONARIES only contains finished
 * dictionaries, so an unregistered file cannot render to anyone. Typing this
 * one `Dictionary` while it is half-written only breaks the build; it does not
 * protect a user from anything.
 *
 * When the remaining sections land: change this back to `Dictionary` (which
 * will then compile) and add it to DICTIONARIES.
 */
const ta: Dictionary = {
  common: {
    language: "மொழி",
    changeLanguage: "மொழியை மாற்று",
  },

  nav: {
    products: "தயாரிப்புகள்",
    solutions: "தீர்வுகள்",
    businesses: "வணிகங்கள்",
    pricing: "விலை",
    resources: "வளங்கள்",
    blog: "வலைப்பதிவு",
    login: "உள்நுழைவு",
    bookDemo: "டெமோ முன்பதிவு",
    getStarted: "இலவசமாகத் தொடங்கு",
    openMenu: "மெனுவைத் திற",
    closeMenu: "மெனுவை மூடு",
  },

  navItems: {
    ownDeliveryWebsite: {
      title: "சொந்த டெலிவரி வலைத்தளம்",
      description: "கமிஷன் இல்லாத டெலிவரி தளம்",
    },
    digitalMenuCreator: {
      title: "டிஜிட்டல் மெனு உருவாக்கி",
      description: "மேசையிலேயே ஆர்டர் செய்ய QR மெனு",
    },
    pos: {
      title: "விற்பனை மையம் (POS)",
      description: "பில்லிங்கும் நடவடிக்கைகளும் ஒரே இடத்தில்",
    },
    tableOrdering: {
      title: "டேபிள் ஆர்டரிங்",
      description: "வாடிக்கையாளர்களுக்கு சிரமமில்லா அனுபவம்",
    },
    captainOrdering: {
      title: "கேப்டன் ஆர்டரிங்",
      description: "ஊழியர்கள் விரைவாக ஆர்டர் எடுக்க",
    },
    googleBusinessSync: {
      title: "Google Business ஒத்திசைவு",
      description: "மெனுவை Google Maps-இல் காட்டுங்கள்",
    },
    owners: {
      title: "உரிமையாளர்கள்",
      description: "நடவடிக்கைகளைக் கவனித்து வருவாயை வளர்க்கலாம்",
    },
    agencies: {
      title: "ஏஜென்சிகள்",
      description: "பல வாடிக்கையாளர் கணக்குகளை எளிதாக நிர்வகிக்கலாம்",
    },
    restaurants: {
      title: "உணவகங்கள்",
      description: "டைன்-இன்-க்கான ஸ்மார்ட் டிஜிட்டல் மெனு",
    },
    cafes: {
      title: "கஃபேக்கள் & காபி ஷாப்புகள்",
      description: "சிறந்த காபிக்கு ஏற்ற நவீன மெனு",
    },
    bakeries: {
      title: "பேக்கரிகள்",
      description: "ஃப்ரெஷ் பேக்குகளை அழகாகக் காட்டுங்கள்",
    },
    cloudKitchens: {
      title: "கிளவுட் கிச்சன்கள்",
      description: "பல பிராண்டுகளின் மெனு நிர்வாகம்",
    },
    hotels: {
      title: "ஹோட்டல்கள் & ரிசார்ட்டுகள்",
      description: "விருந்தினர்களுக்கு நேர்த்தியான உணவு அனுபவம்",
    },
    foodTrucks: {
      title: "ஃபுட் டிரக்குகள்",
      description: "எங்கு சென்றாலும் உடன் வரும் மெனு",
    },
    bars: {
      title: "பார்கள் & பப்புகள்",
      description: "ஸ்டைலாக மாறும் பானங்கள் மெனு",
    },
  },

  hero: {
    productHunt: "Product Hunt-இல் இப்போது லைவ்",
    headlineA: "உங்கள் ஆர்டர்கள் உங்களுடையது.",
    headlineB: "உங்கள் வாடிக்கையாளர்களும் உங்களுடையவர்கள்.",
    subhead:
      "அக்ரிகேட்டர்களின் 30% கமிஷனுக்கு முற்றுப்புள்ளி. உங்கள் சொந்த பிராண்டில் ஆர்டர் & டெலிவரி தளத்தை Menuthere சில நிமிடங்களில் தயார் செய்யும்.",
    searchPlaceholder: '"{name}" எனத் தேடுங்கள்',
    generate: "உருவாக்கு",
    working: "செயலில்…",
    clear: "அழி",
    pickFromDropdown: "பட்டியலிலிருந்து உங்கள் வணிகத்தைத் தேர்ந்தெடுங்கள்",
    bulletNoCommission: "கமிஷன் இல்லை",
    bulletYourBrand: "உங்கள் பிராண்ட்",
    bulletLiveInMinutes: "நிமிடங்களில் லைவ்",
    whatsappTitle: "WhatsApp ஆர்டரிங்",
    whatsappNew: "புதியது",
    whatsappBlurb:
      "வாடிக்கையாளர்கள் WhatsApp-இலேயே ஆர்டர் செய்யலாம் — ஆப் வேண்டாம், லாகின் வேண்டாம்.",
    whatsappExplore: "WhatsApp ஆர்டரிங்கைப் பாருங்கள்",
    trustedBy: "தங்கள் பிராண்டை வளர்க்கும் உணவகங்களின் நம்பிக்கை",
  },

  footer: {
    solutions: "தீர்வுகள்",
    resources: "வளங்கள்",
    legal: "சட்டரீதியானவை",
    tagline: "உணவகங்களுக்கான கமிஷன் இல்லாத ஆர்டரிங்.",
    rights: "அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.",
  },

  metadata: {
    title: "Menuthere | உணவகங்களுக்கான ஆன்லைன் ஆர்டர் & டெலிவரி தளம்",
    description:
      "Petpooja POS இணைப்பு, நேரடி ஆர்டர்கள் & அனலிட்டிக்ஸுடன் உங்கள் உணவகத்திற்கே சொந்த டெலிவரி ஆப்பைத் தொடங்குங்கள். இந்தியா முழுவதும் 600+ உணவகங்களின் நம்பிக்கை.",
  },

  solutionsOwners: {
    metaTitle: "உணவக உரிமையாளர் தீர்வுகள் | Menuthere",
    metaDescription:
      "Menuthere-உடன் உங்கள் உணவகத்தின் கட்டுப்பாட்டை மீட்டெடுங்கள். மெனு, POS, கேப்டன், இன்வென்டரி — அனைத்தும் ஒரே டாஷ்போர்டில். கமிஷன் இல்லை, லாபம் அதிகம்.",
    heroPrimaryCta: "தொடங்குங்கள்",
    heroSecondaryCta: "டெமோ முன்பதிவு",
    benefitsHeading: "உரிமையாளர்களுக்கு ஏன்",
    benefitsHeadingAccent: "Menuthere?",
    reviewsHeading: "உணவக",
    reviewsHeadingAccent: "உரிமையாளர்களின் விருப்பம்.",
  },

  solutionsAgencies: {
    metaTitle: "ஏஜென்சி பார்ட்னர் திட்டம் | தொடர் கமிஷன் | Menuthere",
    metaDescription:
      "Menuthere-இன் அங்கீகரிக்கப்பட்ட பார்ட்னராகுங்கள். உணவகங்களுக்கு பிரீமியம் டிஜிட்டல் மெனு தீர்வுகளை விற்று 30% வரை வாழ்நாள் தொடர் கமிஷன் பெறுங்கள்.",
    heroBadge: "ஏஜென்சி பார்ட்னர் திட்டம்",
    heroApplyCta: "விண்ணப்பியுங்கள்",
    heroDemoCta: "டெமோ முன்பதிவு",
    problemHeading: "உணவகங்களுக்கு வருவாய்,",
    problemHeadingAccent: "உங்களுக்கு நிலையான வருமானம்",
    problemBody:
      "நிலையான PDF மெனுக்கள் நேரடி மாற்றங்களைக் காட்டுவதில்லை; அதனால் சுயேச்சை உணவகங்கள் விற்பனையை இழக்கின்றன. மாதம் $30 என்ற நிரூபிக்கப்பட்ட தளத்துடன், 600+ இடங்கள் நம்பும் உடனடி QR புதுப்பிப்புகளுடன், Menuthere பார்ட்னராக நீங்கள் இதைத் தீர்க்கிறீர்கள் — அவர்களின் நம்பிக்கைக்குரிய ஆலோசகராகவும் மாறுகிறீர்கள்.",
    benefitsHeading: "எங்களுடன் ஏன்",
    benefitsHeadingAccent: "இணைய வேண்டும்?",
    earningsBadge: "அதிக வருவாய் வாய்ப்பு",
    earningsHeading: "செயல்திறன் அடிப்படையிலான கமிஷன்",
    earningsHeadingAccent: "கட்டமைப்பு.",
    earningsSubheading:
      "வருவாயுடன் நேரடியாக இணைந்த பேஅவுட். சந்தாத் தொகை எங்களுக்கு வந்த அதே நாளில், மாதந்தோறும் Stripe வழியாக.",
    earningsTableTierHeader: "நிலை",
    earningsTableRevenueHeader: "வாழ்நாள் பரிந்துரை வருவாய்",
    earningsTableCommissionHeader: "கமிஷன் ($30 சந்தாவுக்கு)",
    tierStarterName: "தொடக்கம்",
    tierStarterRevenue: "$0 முதல் $1,000 வரை",
    tierStarterRate: "20%",
    tierStarterPayout: "($6/மாதம்)",
    tierStarterPayoutPerSub: "சந்தா ஒன்றுக்கு $6/மாதம்",
    tierGrowthName: "வளர்ச்சி",
    tierGrowthRevenue: "$1,001 முதல் $5,000 வரை",
    tierGrowthRate: "25%",
    tierGrowthPayout: "($7.50/மாதம்)",
    tierGrowthPayoutPerSub: "சந்தா ஒன்றுக்கு $7.50/மாதம்",
    tierEliteName: "உயர்நிலை",
    tierEliteRevenue: "$5,001+",
    tierEliteRate: "30%",
    tierElitePayout: "($9/மாதம்)",
    tierElitePayoutPerSub: "சந்தா ஒன்றுக்கு $9/மாதம்",
    tierCardRevenueLabel: "வருவாய்",
    tierCardCommissionLabel: "கமிஷன்",
    processHeading: "பார்ட்னர் ஆன்போர்டிங்",
    processHeadingAccent: "செயல்முறை.",
    processStepOneTitle: "விண்ணப்பப் பரிசீலனை",
    processStepOneDescription:
      "விரைவான ஒப்புதல்; ரீசெல்லர் போர்ட்டல் அணுகல் (டெமோ லிங்குகள், பிராண்ட் பொருட்கள்).",
    processStepTwoTitle: "களப் பணி",
    processStepTwoDescription:
      "உணவகங்களைக் குறிவையுங்கள், 5 நிமிட டெமோ காட்டுங்கள், ஒப்பந்தத்தை உறுதி செய்யுங்கள்.",
    processStepThreeTitle: "வருவாய்ப் பங்கு",
    processStepThreeDescription:
      "தானியங்கிக் கண்காணிப்பு; வசூலான தொகைக்கு அதே நாளில் பேஅவுட்.",
    idealPartnerHeading: "நாங்கள் தேடும் மூலோபாய",
    idealPartnerHeadingAccent: "பார்ட்னர்கள்",
    idealPartnerBody:
      "உணவக உறவுகளை வளர்க்கத் தெரிந்த, களத்தில் நிரூபித்த விற்பனைத் தலைவர்கள். சாதித்தவர்களுக்கு மட்டுமான தேர்ந்தெடுக்கப்பட்ட திட்டம்.",
    partnerTypeRestaurantAdvisors: "உணவக ஆலோசகர்கள்",
    partnerTypeChannelPartners: "B2B சேனல் பார்ட்னர்கள்",
    partnerTypeSalesExecutives: "விற்பனை நிர்வாகிகள்",
    partnerTypeFranchiseSpecialists: "ஃபிரான்சைஸ் நிபுணர்கள்",
    partnerTypeSaasResellers: "SaaS ரீசெல்லர்கள்",
    partnerTypeBizDevPros: "வணிக வளர்ச்சி நிபுணர்கள்",
    faqHeading: "பார்ட்னர்",
    faqHeadingAccent: "கேள்வி–பதில்.",
    faqProductOverviewQuestion: "தயாரிப்பு அறிமுகம்",
    faqProductOverviewAnswer:
      "உலகெங்கும் உள்ள உணவகங்களுக்கான, மாதம் $30 பிரீமியம் QR டிஜிட்டல் மெனு தளம்.",
    faqExperienceRequiredQuestion: "தேவையான அனுபவம்",
    faqExperienceRequiredAnswer:
      "களவிற்பனை அனுபவம்; தேவையான அனைத்துப் பொருட்களையும் நாங்கள் தருகிறோம்.",
    faqPayoutMechanicsQuestion: "பேஅவுட் முறை",
    faqPayoutMechanicsAnswer:
      "வசூல் நாளில் மாதந்தோறும் Stripe மூலம்; செயலில் உள்ள ஒவ்வொரு சந்தாவுக்கும் வாழ்நாள் முழுவதும்.",
    faqCostsInvolvedQuestion: "செலவுகள்",
    faqCostsInvolvedAnswer: "எதுவும் இல்லை — முழுக்க முழுக்க கமிஷன் அடிப்படையில்.",
    faqTerritoryQuestion: "பகுதி",
    faqTerritoryAnswer: "உலகெங்கும் உள்ள சுயேச்சை உணவகங்கள்; US-க்கு முன்னுரிமை.",
    faqResourcesQuestion: "வளங்கள்",
    faqResourcesAnswer:
      "வீடியோ, ஸ்கிரிப்ட், பிரசன்டேஷன் அடங்கிய போர்ட்டல்; தயார்நிலை லீடுகளும் உண்டு.",
    trustBadgeDeployments: "600+ லைவ் அமைப்புகள்",
    trustBadgeFieldTested: "களத்தில் சோதிக்கப்பட்ட மாடல்",
    trustBadgeRevenueShare: "வருவாய்ப் பங்கு மட்டுமே",
    trustBadgeExclusiveAccess: "பிரத்யேக அணுகல்",
    termsHeading: "பார்ட்னர் திட்ட விதிமுறைகள்",
    termsIncomeContinuity:
      "வருமானத் தொடர்ச்சி: செயலில் உள்ள சந்தாக்களுக்கு மட்டுமே கமிஷன் தொடரும்.",
    termsTerminationRights:
      "நிறுத்தும் உரிமை: பிராண்டுக்குப் பொருந்தாத நடத்தை இருந்தால் பார்ட்னர்ஷிப்பை நிறுத்தும் உரிமை Menuthere-க்கு உண்டு.",
    termsPayoutTiming:
      "பேஅவுட் நேரம்: சந்தா வசூலான அதே நாளில், கட்டணங்கள் போக மீதித் தொகை.",
    termsEligibility:
      "தகுதி: உலகெங்கும் உள்ள பார்ட்னர்கள் வரவேற்கப்படுகிறார்கள்; ஒப்புதலுக்கு உட்பட்டது.",
  },

  solutionsIndex: {
    metaTitle: "ஒவ்வொரு உணவு வணிகத்திற்கும் டிஜிட்டல் மெனு | Menuthere",
    metaDescription:
      "ஸ்மார்ட் டிஜிட்டல் மெனுவால் உணவு வணிகத்தை மாற்றுங்கள். உணவகம், கஃபே, பேக்கரி, கிளவுட் கிச்சன், ஹோட்டல், பார் அனைத்திற்கும் QR மெனு, நேரடி புதுப்பிப்பு.",
    ogTitle: "டிஜிட்டல் மெனு தீர்வுகள் | Menuthere",
    ogDescription:
      "உணவகம், கஃபே, பேக்கரி என அனைத்திற்கும் ஸ்மார்ட் டிஜிட்டல் மெனு. நேரடி புதுப்பிப்புகள், அழகான வடிவமைப்புகள், அச்சுச் செலவே இல்லை.",
    heroTitleLead: "உங்கள் வணிகத்தை",
    heroTitleEmphasis: "மாற்றியமைக்கும்",
    heroTitleTail: "டிஜிட்டல் மெனு.",
    heroSubtitle:
      "அமைதியான கஃபேயோ, பரபரப்பான உணவகமோ, கிளவுட் கிச்சன் சாம்ராஜ்யமோ — உங்கள் தனித்துவமான தேவைக்கேற்ப எங்கள் தளம் மாறிக்கொள்ளும்.",
    heroPrimaryCta: "இலவசமாகத் தொடங்கு",
    heroSecondaryCta: "டெமோ முன்பதிவு",
    industriesHeadingLead: "உங்கள் துறையைத் தேர்வு செய்து,",
    industriesHeadingEmphasis: "தொடங்குங்கள்.",
    industriesIntro:
      "உங்கள் வகை உணவு வணிகத்திற்கென பிரத்யேகமாக வடிவமைக்கப்பட்ட டிஜிட்டல் மெனு தீர்வுகள்.",
    cardRestaurantsTitle: "உணவகங்கள்",
    cardRestaurantsDesc: "டைன்-இன்-ஐ சிறப்பாக்கும் ஸ்மார்ட் டிஜிட்டல் மெனு",
    cardCafesTitle: "கஃபேக்கள் & காபி ஷாப்புகள்",
    cardCafesDesc: "சிறந்த காபி அனுபவத்திற்கு நவீன மெனு",
    cardBakeriesTitle: "பேக்கரிகள் & பேஸ்ட்ரி கடைகள்",
    cardBakeriesDesc: "ஃப்ரெஷ் பேக்குகளை அழகாகக் காட்டுங்கள்",
    cardCloudKitchensTitle: "கிளவுட் கிச்சன்கள்",
    cardCloudKitchensDesc: "பல பிராண்டுகளின் மெனு நிர்வாகம் இனி எளிது",
    cardHotelsTitle: "ஹோட்டல்கள் & ரிசார்ட்டுகள்",
    cardHotelsDesc: "விருந்தினர்களுக்கு நேர்த்தியான உணவு அனுபவம்",
    cardFoodTrucksTitle: "ஃபுட் டிரக்குகள்",
    cardFoodTrucksDesc: "நீங்கள் செல்லும் இடமெல்லாம் உடன் வரும் மெனு",
    cardBarsTitle: "பார்கள் & பப்புகள்",
    cardBarsDesc: "ஸ்டைலாக மாறும் பானங்கள் மெனு",
    cardCateringTitle: "கேட்டரிங் சேவைகள்",
    cardCateringDesc: "ஒவ்வொரு நிகழ்விற்கும் தொழில்முறை மெனு",
    cardOwnersTitle: "உணவக உரிமையாளர்கள்",
    cardOwnersDesc: "உங்கள் உணவக நடவடிக்கைகளின் கட்டுப்பாட்டை மீட்டெடுங்கள்",
    cardAgenciesTitle: "ஏஜென்சிகள் & ஆலோசகர்கள்",
    cardAgenciesDesc: "பல வாடிக்கையாளர் கணக்குகளை எளிதாக நிர்வகியுங்கள்",
    cardPetpoojaTitle: "நேரடி ஆர்டர் & Petpooja",
    cardPetpoojaDesc: "Swiggy, Zomato-க்கு கமிஷன் இல்லாத மாற்று",
    cardWhatsappOrderingTitle: "WhatsApp ஆர்டரிங்",
    cardWhatsappOrderingDesc:
      "“Hi” அனுப்பினாலே ஆர்டர் — ஆப் வேண்டாம், பதிவு வேண்டாம்",
    cardLearnMoreLink: "மேலும் அறிக",
    featuresHeadingLead: "சக்திவாய்ந்த அம்சங்கள்,",
    featuresHeadingEmphasis: "எல்லா வணிகத்திற்கும்.",
    featureQrTitle: "QR கோட் மெனு",
    featureQrDesc:
      "ஸ்மார்ட்போனில் ஸ்கேன் செய்தாலே உடனடி அணுகல். ஆப் டவுன்லோட் தேவையில்லை.",
    featureRealtimeTitle: "நேரடிப் புதுப்பிப்புகள்",
    featureRealtimeDesc:
      "விலை மாற்றம், புதிய உணவு, சோல்ட்-அவுட் குறிப்பு — எல்லாம் உடனடியாக.",
    featureGoogleSyncTitle: "Google Business ஒத்திசைவு",
    featureGoogleSyncDesc:
      "உங்கள் Google Business Profile மெனு தானாகவே புதுப்பிக்கும்.",
    featureAnalyticsTitle: "அனலிட்டிக்ஸ் & இன்சைட்ஸ்",
    featureAnalyticsDesc:
      "பிரபலமான உணவுகளையும் வாடிக்கையாளர் விருப்பங்களையும் அறியுங்கள்.",
    googleBadge: "Google Business இணைப்பு",
    googleHeading: "உங்கள் மெனுவை Google Business Profile-உடன் ஒத்திசையுங்கள்",
    googleBody:
      "நீங்கள் மாற்றம் செய்யும் ஒவ்வொரு முறையும் உங்கள் Google Business Profile மெனு தானாகவே புதுப்பிக்கப்படும். Google Maps-இல் உங்களைத் தேடும் வாடிக்கையாளர்கள் எப்போதும் சமீபத்திய மெனுவையே பார்ப்பார்கள்.",
    googleBenefitOneClickSync: "ஒரே கிளிக்கில் Google Business Profile-க்கு ஒத்திசைவு",
    googleBenefitRealtimeUpdates: "எல்லா தளங்களிலும் நேரடி மெனு புதுப்பிப்பு",
    googleBenefitLocalSeo: "மேம்பட்ட லோக்கல் SEO மற்றும் தெரிவுநிலை",
    googleBenefitMoreCustomers: "Google Search & Maps வழியாக அதிக வாடிக்கையாளர்கள்",
    googleManagerLink: "Google Business Manager பற்றி அறிக",
    googleCardTitle: "Google Business Profile",
    googleCardSubtitle: "மெனு மேனேஜர்",
    googleCardSyncedLabel: "ஒத்திசைக்கப்பட்ட மெனு உணவுகள்",
    googleCardLastSyncLabel: "கடைசி ஒத்திசைவு",
    googleCardLastSyncValue: "இப்போதுதான்",
  },

  getStarted: {
    metaTitle: "தொடங்குங்கள் | Menuthere",
    metaDescription: "Menuthere மூலம் உங்கள் டிஜிட்டல் மெனுவை உருவாக்குங்கள்.",
    stepIndicator: "படி {step} / 3",
    publishingLoader1: "உங்கள் கணக்கை உருவாக்குகிறோம்...",
    publishingLoader2: "உங்கள் டிஜிட்டல் மெனுவை அமைக்கிறோம்...",
    publishingLoader3: "டாஷ்போர்டை உள்ளமைக்கிறோம்...",
    publishingLoader4: "கிட்டத்தட்ட முடிந்துவிட்டது...",
    step1Title: "உங்கள் மெனுவைப் பதிவேற்றுங்கள்",
    step1Subtitle:
      "உங்கள் மெனுவை ஒரு புகைப்படம் எடுத்து அனுப்புங்கள் — உடனே டிஜிட்டலாக்கித் தருகிறோம்.",
    filesSelectedCount: "{count} கோப்பு(கள்) தேர்ந்தெடுக்கப்பட்டன",
    uploadDropzonePrompt: "கிளிக் செய்து பதிவேற்றுங்கள், இழுத்துப் போடுங்கள் அல்லது ஒட்டுங்கள்",
    uploadFormatsHint: "JPG, PNG, PDF — அதிகபட்சம் 10MB",
    uploadAddMoreHint: "மேலும் சேர்க்க இந்தப் பகுதியில் கிளிக் செய்யுங்கள்",
    fileTooLargeBadge: "மிகப் பெரியது ({size}MB)",
    filePreviewAlt: "பக்கம் {number}",
    aiInstructionLabel: "எங்கள் AI-க்கான வழிமுறைகள்",
    optionalSuffix: "(விருப்பம்)",
    aiInstructionPlaceholder:
      "உங்கள் மெனுவில் ஏதேனும் சிறப்பு உண்டா? உ.ம். \"பானங்கள் அனைத்தையும் விட்டுவிடு\", \"Combos-ஐ தனி வகையாகக் கொள்\", \"விலைகள் AED-இல் உள்ளன\"",
    aiInstructionHint:
      "உங்கள் கோப்புகளை AI படிக்கும்போது உங்கள் வழிமுறைக்கே முன்னுரிமை.",
    removeInvalidFilesButton: "தொடர, செல்லாத கோப்புகளை நீக்குங்கள்",
    nextStepButton: "அடுத்த படி",
    uploadOrDivider: "அல்லது",
    sampleMenuButton: "மாதிரி மெனுவுடன் முயற்சியுங்கள்",
    sampleMenuDialogTitle: "ஒரு மாதிரி மெனுவைத் தேர்ந்தெடுங்கள்",
    sampleMenuDialogSubtitle:
      "தயாராக உள்ள மெனுவுடன் தொடங்க, உணவக வகையைத் தேர்வு செய்யுங்கள்.",
    sampleMenuComingSoonBadge: "விரைவில்",
    filesTooLargeToast:
      "{count} கோப்பு(கள்) 10MB வரம்பைத் தாண்டுகின்றன. சிறிய கோப்புகளைப் பதிவேற்றுங்கள்.",
    filesAddedToast: "{count} கோப்பு(கள்) சேர்க்கப்பட்டன!",
    sampleMenuLoadedToast: "\"{name}\" மாதிரி மெனு ஏற்றப்பட்டது!",
    step2Title: "உணவக விவரங்கள்",
    step2Subtitle:
      "உங்கள் மெனுவைத் தனிப்பயனாக்க, உங்கள் இடத்தைப் பற்றி சிறிது சொல்லுங்கள்.",
    restaurantNameLabel: "உணவகத்தின் பெயர்",
    restaurantNamePlaceholder: "உ.ம். The Burger Joint",
    usernameLabel: "பயனர்பெயர்",
    usernamePlaceholder: "your_store_name",
    usernameCheckingStatus: "கிடைக்குமா எனப் பார்க்கிறோம்...",
    usernameAvailableStatus: "இந்தப் பயனர்பெயர் கிடைக்கிறது",
    usernameTakenStatus: "இந்தப் பயனர்பெயர் ஏற்கனவே பயன்பாட்டில் உள்ளது",
    usernameMinLengthHint: "பயனர்பெயரில் குறைந்தது 3 எழுத்துகள் இருக்க வேண்டும்",
    phoneNumberLabel: "தொலைபேசி எண்",
    phoneCodePlaceholder: "குறியீடு",
    phoneInvalidError: "தவறான தொலைபேசி எண்",
    countryLabel: "நாடு",
    countryPlaceholder: "நாட்டைத் தேர்வு செய்யுங்கள் அல்லது தட்டச்சு செய்யுங்கள்",
    addressLabel: "முகவரி",
    addressPlaceholder: "தெரு, பகுதி, நகரம்…",
    currencyLabel: "நாணயம்",
    currencyPlaceholder: "நாணயத்தைத் தேர்வு செய்யுங்கள் அல்லது தேடுங்கள்",
    currencySearchPlaceholder: "நாணயத்தைத் தேடுங்கள் (உ.ம். USD, Euro, ₹)",
    currencySelectFallback: "நாணயத்தைத் தேர்வு செய்யுங்கள்",
    currencyNoMatch: "பொருத்தம் இல்லை",
    logoLabel: "லோகோ (விருப்பம்)",
    logoPreviewAlt: "லோகோ முன்னோட்டம்",
    changeLogoButton: "லோகோவை மாற்று",
    uploadLogoButton: "லோகோவைப் பதிவேற்று",
    removeLogoButton: "நீக்கு",
    logoSizeLabel: "அளவு (%)",
    logoBackgroundLabel: "பின்னணி",
    createMenuButton: "மெனுவை உருவாக்கு",
    logoNotAnImageToast: "லோகோவுக்கு ஒரு படக் கோப்பைத் தேர்வு செய்யுங்கள்",
    logoTooLargeToast: "லோகோ 10MB-க்கு குறைவாக இருக்க வேண்டும்",
    logoReadFailedToast: "அந்தப் படத்தைப் படிக்க முடியவில்லை",
    missingDetailsToast: "அனைத்து விவரங்களையும் நிரப்புங்கள்",
    invalidPhoneToast: "சரியான தொலைபேசி எண்ணை உள்ளிடுங்கள்",
    extractingTitle: "உங்கள் மெனுவை எடுக்கிறோம்",
    extractingSubtitle: "உங்கள் மெனுப் படத்தைச் செயலாக்கும் வரை காத்திருங்கள்...",
    extractionErrorTitle: "எடுக்க முடியவில்லை",
    menuUnreadableError:
      "உங்கள் மெனுவைப் படிக்க முடியவில்லை. தெளிவான கோப்புகளை முயற்சியுங்கள் அல்லது உணவுகளை நேரடியாகச் சேருங்கள்.",
    extractionFailedToast: "மெனுவை எடுக்க முடியவில்லை. மீண்டும் முயற்சியுங்கள்.",
    retryExtractionButton: "மீண்டும் முயற்சி",
    cancelExtractionButton: "ரத்து செய்து மீண்டும் பதிவேற்று",
    step3Title: "உங்கள் மெனு தயார்!",
    step3Subtitle:
      "{count} உணவுகளை எடுத்துவிட்டோம். கீழே தீம் ஒன்றைத் தேர்ந்தெடுத்துத் தனிப்பயனாக்குங்கள்.",
    themePickerTitle: "ஒரு தீம் தேர்வு செய்யுங்கள்",
    themeSwatchSample: "Aa",
    themeClassicLabel: "கிளாசிக்",
    themeMidnightLabel: "மிட்நைட்",
    themeFreshLabel: "ஃப்ரெஷ்",
    publishButton: "லைவ் ஆக்கு",
    authModalSignInTitle: "வெளியிட உள்நுழையுங்கள்",
    authModalEmailHint:
      "உங்கள் டாஷ்போர்டு லாகின் விவரங்களை மின்னஞ்சலுக்கு அனுப்புவோம்.",
    googleSignInButton: "Google மூலம் உள்நுழைக",
    authDividerOr: "அல்லது",
    emailPlaceholder: "you@example.com",
    continueWithEmailButton: "மின்னஞ்சலுடன் தொடரவும்",
    authModalPasswordTitle: "கடவுச்சொல்லை உருவாக்குங்கள்",
    authModalPasswordHint: "உங்கள் டாஷ்போர்டு கணக்குக்கு ஒரு கடவுச்சொல்லை அமையுங்கள்.",
    passwordPlaceholder: "கடவுச்சொல் (குறைந்தது 6 எழுத்துகள்)",
    confirmPasswordPlaceholder: "கடவுச்சொல்லை உறுதிப்படுத்துங்கள்",
    continueButton: "தொடரவும்",
    invalidEmailToast: "சரியான மின்னஞ்சல் முகவரியை உள்ளிடுங்கள்",
    passwordTooShortToast: "கடவுச்சொல்லில் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்",
    passwordMismatchToast: "கடவுச்சொற்கள் பொருந்தவில்லை",
    emailAlreadyRegisteredToast:
      "இந்த மின்னஞ்சல் ஏற்கனவே பதிவாகியுள்ளது. வேறு மின்னஞ்சலைப் பயன்படுத்துங்கள்.",
    googleSignInSuccessToast: "Google மூலம் உள்நுழைந்துவிட்டீர்கள்!",
    googleSignInFailedToast: "Google உள்நுழைவு தோல்வியடைந்தது. மீண்டும் முயற்சியுங்கள்.",
    publishSuccessToast: "மெனு வெளியிடப்பட்டது! டாஷ்போர்டுக்குச் செல்கிறோம்...",
    publishFailedToast: "பதிவை முடிக்க முடியவில்லை. மீண்டும் முயற்சியுங்கள்.",
    successTitle: "உங்கள் மின்னஞ்சலைப் பாருங்கள்!",
    successSubtitle:
      "உங்கள் மெனு லிங்கையும் டாஷ்போர்டு லாகின் விவரங்களையும் இங்கே அனுப்பியுள்ளோம்:",
    successSpamHint:
      "கிடைக்கவில்லையா? ஸ்பேம் ஃபோல்டரைப் பாருங்கள் அல்லது கீழே உங்கள் மின்னஞ்சலை மாற்றுங்கள்.",
    successMobileSubtitle:
      "உங்கள் மெனு லிங்கையும் டாஷ்போர்டு விவரங்களையும் உங்கள் மின்னஞ்சலுக்கு அனுப்பிவிட்டோம்.",
    changeEmailButton: "தவறான மின்னஞ்சலா? மாற்றுங்கள்",
    loginToDashboardButton: "டாஷ்போர்டில் உள்நுழைக",
    changeEmailTitle: "மின்னஞ்சலை மாற்று",
    changeEmailSubtitle:
      "சரியான மின்னஞ்சல் முகவரியை உள்ளிடுங்கள். உங்கள் மெனு லிங்கையும் டாஷ்போர்டு விவரங்களையும் அங்கே அனுப்புவோம்.",
    newEmailLabel: "புதிய மின்னஞ்சல் முகவரி",
    updatingEmailButton: "புதுப்பிக்கிறோம்...",
    updateAndResendButton: "புதுப்பித்து மீண்டும் அனுப்பு",
    emailUpdatedToast: "மின்னஞ்சல் புதுப்பிக்கப்பட்டது! புதிய இன்பாக்ஸைப் பாருங்கள்.",
    emailUpdateFailedToast:
      "மின்னஞ்சலைப் புதுப்பிக்க முடியவில்லை. மீண்டும் முயற்சியுங்கள்.",
  },

  helpCenter: {
    metaTitle: "உதவி & ஆதரவு | Menuthere டிஜிட்டல் மெனு",
    metaDescription:
      "உங்கள் Menuthere டிஜிட்டல் மெனுவுக்கான உதவி. FAQ, WhatsApp ஆதரவு, மின்னஞ்சல் தொடர்பு. மெனு நிர்வாகம், ஆஃபர்கள் குறித்த விரைவான பதில்கள்.",
    heroTitle: "உதவி &",
    heroTitleAccent: "ஆதரவு.",
    heroSubtitle:
      "உதவி வேண்டுமா? மின்னஞ்சல் அனுப்புங்கள் அல்லது WhatsApp-இல் நேரடியாகச் சாட் செய்யுங்கள்.",
    faqSectionTitle: "அடிக்கடி கேட்கப்படும்",
    faqSectionTitleAccent: "கேள்விகள்.",
    faq1Question: "Google-இலோ ஆப்களிலோ பழைய மெனு தெரிவதை எப்படி நிறுத்துவது?",
    faq1Answer:
      "உணவு, விலை, விவரம், கிடைக்கும் தன்மை — எந்த மாற்றமும் உங்கள் டிஜிட்டல் மெனுவில் உடனடியாகப் பதிவாகும். டாஷ்போர்டில் View Menu கிளிக் செய்து சரிபாருங்கள்; தாமதமும் இல்லை, மறு அச்சடிப்பும் இல்லை.",
    faq2Question: "ஸ்டாக் இல்லாத உணவுகள் இன்னும் என் QR/டிஜிட்டல் மெனுவில் தெரிகின்றனவே?",
    faq2Answer:
      "Menu பகுதியில் மேலே உள்ள Availability-ஐ கிளிக் செய்யுங்கள். ஒரே கிளிக்கில் முழு வகையையோ தனி உணவையோ ஆன்/ஆஃப் செய்யலாம் — சோல்ட்-அவுட் உணவுகள் எல்லா இடத்திலிருந்தும் உடனே மறையும்.",
    faq3Question: "மெனு புதுப்பிப்பு நிறைய நேரம் எடுக்கிறது, டிசைனர் செலவும் அதிகம்.",
    faq3Answer:
      "திருத்துவது மிக எளிது, சில நொடிகளில் முடியும் — தொழில்நுட்ப அறிவே தேவையில்லை. Menu பகுதிக்குச் சென்று எந்த உணவையும் கிளிக் செய்து பெயர், விலை, படம், விவரம், ஆஃபர் அல்லது வேரியன்ட்டை மாற்றி சேமியுங்கள். மாற்றங்கள் உடனே லைவ் ஆகும்.",
    faq4Question: "என் மெனு உணவுகளை உடனடியாக எப்படிப் புதுப்பிப்பது?",
    faq4Answer:
      "டாஷ்போர்டில் Menu பகுதிக்குச் செல்லுங்கள். அனைத்து வகைகளும் உணவுகளும் பட்டியலாகத் தெரியும் — எதையும் கிளிக் செய்து பெயர், விலை, படம், விவரம் போன்றவற்றைத் திருத்திச் சேமித்தால் உடனடியாகப் புதுப்பிக்கப்படும்.",
    faq5Question: "மெனு உணவுகளையோ வகைகளையோ எப்படி வரிசை மாற்றுவது?",
    faq5Answer:
      "Menu பகுதியைத் திறந்து Priority கிளிக் செய்யுங்கள். வகைகளையும் உணவுகளையும் இழுத்துவிடுங்கள் அல்லது முன்னுரிமை எண்களை அமையுங்கள், பிறகு சேமியுங்கள் — புதிய வரிசை உடனே தெரியும்.",
    faq6Question: "மெனு உணவுகளுக்கு ஆஃபர் அல்லது ஸ்பெஷல்களை எப்படிச் சேர்ப்பது?",
    faq6Answer:
      "Specials/Best Sellers-க்கு: Menu பகுதியில் ஒவ்வொரு உணவுக்கும் அந்த விருப்பத்தை ஆன் செய்யுங்கள் — அவை Must-Try ஆக மேலே தெரியும். தனிப்பயன் ஆஃபர்களுக்கு: Offers பகுதிக்குச் சென்று ஒற்றை/பல உணவு டீல்களை உருவாக்குங்கள், அவை உடனே செயல்படும்.",
    faq7Question: "தொழில்நுட்ப உதவி இல்லாமல் பேனரையோ உணவுப் படங்களையோ மாற்றுவது கடினமா?",
    faq7Answer:
      "Settings → General Settings சென்று உங்கள் உணவகப் பேனரைப் பதிவேற்றலாம் அல்லது மாற்றலாம். உணவுகளுக்கு, Menu பகுதியிலேயே படங்களைத் திருத்துங்கள் — இழுத்துப் போடும் அளவு எளிது, உடனே லைவ்.",
    faq8Question: "தினசரி ஸ்பெஷல்கள் போன்ற மாற்றங்களை முன்னோட்டம் பார்க்கவோ திட்டமிடவோ முடியுமா?",
    faq8Answer:
      "ஆம் — சேமிக்கும் முன் View Menu மூலம் எந்த மாற்றத்தையும் முன்னோட்டம் பார்க்கலாம். திட்டமிட, Offers பகுதியில் நேரம் குறித்த புதுப்பிப்புகளை (உ.ம். தினசரி ஸ்பெஷல்) அமையுங்கள் — தினமும் லாகின் செய்யத் தேவையில்லை.",
    faq9Question: "கடை மூடியிருக்கும் நேரங்களில் ஸ்டோரை ஆஃப் செய்ய முடியுமா?",
    faq9Answer:
      "முடியும். Settings-க்குச் சென்று எப்போது வேண்டுமானாலும் உங்கள் உணவகத்தை ஆஃப் செய்யலாம் — கடை மூடும் நேரம், விடுமுறை அல்லது பராமரிப்புக்கு ஏற்றது. தயாரானதும் மீண்டும் ஆன் செய்யுங்கள்.",
    faq10Question: "மொத்தத்தில் மெனு உணவுகளைத் திருத்துவது எவ்வளவு எளிது?",
    faq10Answer:
      "மிக எளிது — ஒரு மாற்றத்திற்கு சில நொடிகள். Menu பகுதியில் உள்ள எளிய டாகிள்/டிராப்டவுன் மூலம் விலை, பெயர், படம், கிடைக்கும் தன்மை, ஆஃபர்களை மாற்றலாம்; கோடிங்கும் வேண்டாம், டிசைனரும் வேண்டாம்.",
    faq11Question: "எப்போது வேண்டுமானாலும் என் சந்தாவை ரத்து செய்யலாமா?",
    faq11Answer:
      "ஆம் — உங்கள் கணக்கிலிருந்தே எப்போது வேண்டுமானாலும் ரத்து செய்யலாம். நடப்பு பில்லிங் காலம் முடியும் வரை உங்கள் திட்டம் செயலில் இருக்கும்; புதுப்பிக்காத வரை கூடுதல் கட்டணம் இல்லை.",
  },

  landing: {
    socialProofEyebrow: "கடந்த 30 நாட்களின் உண்மையான எண்கள்",
    statOrdersLabel: "பெற்ற ஆர்டர்கள்",
    statRevenueLabel: "ஈட்டிய வருவாய்",
    statAvgOrderValueLabel: "சராசரி ஆர்டர் மதிப்பு",
    statSuffixLakh: "L+",
    statSuffixThousand: "K+",
    platformHeadingLead: "உங்கள் உணவகத்திற்குத் தேவையான அனைத்தும்,",
    platformHeadingAccent: "ஒரே தளத்தில்.",
    featureWebsiteAppTitle: "உங்கள் சொந்த வலைத்தளமும் பிராண்டட் ஆப்பும்",
    featureWebsiteAppBody:
      "உங்கள் பெயரிலேயே பிராண்டட் ஆர்டரிங் வலைத்தளத்தையும், App Store மற்றும் Play Store-இல் சொந்த ஆப்பையும் தொடங்குங்கள். வாடிக்கையாளர்கள் நேரடியாக உங்களிடமே ஆர்டர் செய்வார்கள் — அக்ரிகேட்டர் இடைத்தரகர்கள் இல்லை, 20-33% கமிஷன் இல்லை. ஒரே தட்டில் அவர்கள் மெனுவைப் பார்த்து, ஆர்டர் செய்து, டெலிவரியைக் கண்காணித்து, மீண்டும் ஆர்டர் செய்யலாம்; வாடிக்கையாளர் உறவும், விலைக் கட்டுப்பாடும், ஒவ்வொரு ரூபாய் லாபமும் உங்களுக்கே.",
    featureWebsiteAppCta: "எப்படி வேலை செய்கிறது எனப் பாருங்கள்",
    featureWhatsappOrderingTitle: "WhatsApp-இல் ஆர்டர் — ஒரு “Hi” போதும்",
    featureWhatsappOrderingBody:
      "உங்கள் WhatsApp எண்ணையே எளிதான ஆர்டரிங் சேனலாக மாற்றுங்கள். வாடிக்கையாளர் ஒரு “Hi” அனுப்பினால் போதும், உங்கள் மெனுவுக்கான தானியங்கி-லாகின் லிங்க் உடனே கிடைக்கும் — ஆப் டவுன்லோட் இல்லை, பதிவு இல்லை, OTP இல்லை. சில தட்டுகளில் ஆர்டர் செய்வார்கள், நிலை புதுப்பிப்புகள் WhatsApp-இலேயே வரும்; வாடிக்கையாளரும் உங்களுக்கே, கமிஷனும் பூஜ்ஜியம்.",
    featureWhatsappOrderingCta: "WhatsApp ஆர்டரிங்கைப் பாருங்கள்",
    featurePetpoojaTitle: "Petpooja POS இணைப்பு",
    featurePetpoojaBody:
      "ஒவ்வொரு ஆன்லைன் ஆர்டரும் உடனுக்குடன் நேரடியாக உங்கள் Petpooja POS-க்கு வந்துசேரும். கையால் பதிவு இல்லை, தவறவிட்ட ஆர்டர் இல்லை, இரட்டை வேலை இல்லை. மெனு உணவுகள், விலைகள், வகைகள் உங்கள் POS-க்கும் டெலிவரி வலைத்தளத்திற்கும் இடையே தானாகவே ஒத்திசையும். Petpooja-வுடன் ஆழமான இணைப்பு உள்ளமைக்கப்பட்ட ஒரே தளம் இந்தியாவில் இதுதான்.",
    featurePetpoojaCta: "Petpooja இணைப்பு பற்றி அறிக",
    featurePaymentsTitle: "பேமெண்ட் இணைப்பு",
    featurePaymentsBody:
      "UPI, கார்டு, நெட் பேங்கிங், வாலட் — அனைத்தும் உள்ளமைக்கப்பட்டு உடனடியாகப் பணம் பெறுங்கள்; காசு ஆன் டெலிவரியும் உண்டு. Cashfree இயக்கும் பாதுகாப்பான, PCI-இணக்கமான செக்அவுட்; பணம் நேரடியாக உங்கள் வங்கிக் கணக்கிற்கே. உங்கள் பணத்தை வைத்திருக்கும் அக்ரிகேட்டரும் இல்லை, பேஅவுட் தாமதமும் இல்லை. ஒவ்வொரு ரூபாயும் உங்களைச் சேரும்.",
    featurePaymentsCta: "பேமெண்ட் வழிகளைப் பாருங்கள்",
    featureOrderManagementTitle: "நேரடி ஆர்டர் நிர்வாகம்",
    featureOrderManagementBody:
      "டெலிவரி ஆர்டர்களை ஒரே டாஷ்போர்டில் ஏற்று, கண்காணித்து, நிர்வகியுங்கள். புதிய ஆர்டருக்கு உடனடி அறிவிப்பு, நேரடி நிலை புதுப்பிப்பு, சமையலறையும் டெலிவரி குழுவும் ஒரே சீராக. பல டேப்லெட்டுகளை சமாளிக்க வேண்டாம், பரபரப்பான நேரத்தில் ஆர்டர் தவறவிடவும் வேண்டாம்.",
    featureOrderManagementCta: "ஆர்டர் நிர்வாகத்தைப் பாருங்கள்",
    featureDigitalMenuTitle: "டிஜிட்டல் மெனு நிர்வாகம்",
    featureDigitalMenuBody:
      "உங்கள் முழு மெனுவையும் ஒரே டாஷ்போர்டில் நிர்வகியுங்கள்: உணவு, விலை, வகை, படம், வேரியன்ட் — எல்லாவற்றையும் நேரடியாகச் சேர்க்கலாம், மாற்றலாம். உணவுகளை உடனடியாக ஸ்டாக் இல்லை எனக் குறிக்கலாம், உணவுமுறை வடிகட்டிகளையும் ஸ்மார்ட் தேடலையும் அமைக்கலாம்; வலைத்தளம், ஆப், QR கோடு எல்லாவற்றிலும் ஒரே சீராக இருக்கும். மறு அச்சடிப்பு வேண்டாம், டெவலப்பர் வேண்டாம். சேமித்த நொடியில் மாற்றம் லைவ்.",
    featureDigitalMenuCta: "டிஜிட்டல் மெனு பற்றி மேலும் அறிக",
    featureOffersTitle: "மாறும் ஆஃபர்களும் விளம்பரங்களும்",
    featureOffersBody:
      "ஃபிளாஷ் டீல், ஹேப்பி-அவர் ஸ்பெஷல், நேரம் சார்ந்த தள்ளுபடி — தானாகவே தொடங்கி, தானாகவே முடியும். Must-Try பேட்ஜ், Chef's Choice டேக் மூலம் அதிகம் விற்பனையாகும் உணவுகளை முன்னிலைப்படுத்துங்கள். ஒரு நோட்டீஸ் கூட அச்சடிக்காமல் மீண்டும் மீண்டும் ஆர்டர்களையும் வருவாயையும் பெருக்குங்கள்.",
    featureOffersCta: "ஆஃபர்கள் எப்படி வேலை செய்கின்றன",
    featureGoogleSyncTitle: "Google Business மெனு ஒத்திசைவு",
    featureGoogleSyncBody:
      "உங்கள் முழு மெனுவையும் (வகைகள், உணவுகள், விலைகள், படங்கள்) ஒரே கிளிக்கில் Google Business Profile-க்கு தானாக ஒத்திசையுங்கள். Google Maps-இல் முழு மெனுவுடன் தெரியுங்கள். முழுமையான ப்ரொஃபைல் உள்ள உணவகங்களுக்கு 7 மடங்கு அதிக கிளிக்குகளும், 30% அதிக வாடிக்கையாளர் வருகையும் கிடைக்கிறது.",
    featureGoogleSyncCta: "Google ஒத்திசைவு எப்படி வேலை செய்கிறது",
    featureDeliveryAppTitle: "டெலிவரி பாய் ஆப்",
    featureDeliveryAppBody:
      "உங்கள் டெலிவரி குழுவுக்கென தனி ஆப். டெலிவரி பாய்கள் ஆர்டர் அறிவிப்பைப் பெற்று, வாடிக்கையாளர் இடத்திற்கு வழிகாட்டல் பெற்று, டெலிவரி நிலையை உடனுக்குடன் புதுப்பிக்கலாம். நேரடி இருப்பிடக் கண்காணிப்பு, தானியங்கி ஆர்டர் ஒதுக்கீடு, முழுத் தெளிவுடன் வேகமான டெலிவரி.",
    featureDeliveryAppCta: "டெலிவரி ஆப் பற்றி அறிக",
    featureAnalyticsTitle: "அனலிட்டிக்ஸ் & இன்சைட்ஸ்",
    featureAnalyticsBody:
      "ஆர்டர் அளவு, வருவாய் போக்கு, கூட்ட நேரம், அதிகம் விற்கும் உணவுகள் — அனைத்தையும் கண்காணியுங்கள். விலை, விளம்பரம், டெலிவரி நடவடிக்கைகள் குறித்து தரவின் அடிப்படையில் முடிவெடுங்கள். எது வேலை செய்கிறது, எங்கே மேம்படுத்த வேண்டும் என்பது தெளிவாகத் தெரியும்.",
    featureAnalyticsCta: "அனலிட்டிக்ஸ் பற்றி அறிக",
    ctaBannerHeadingDefault: "2 நிமிடத்திற்குள் உங்கள் டெலிவரி வலைத்தளத்தைத் தொடங்குங்கள்.",
    ctaBannerBodyDefault:
      "மெனுவைப் பதிவேற்றி, டெலிவரி பகுதிகளை அமைத்து, முழு Petpooja POS இணைப்புடன் வாடிக்கையாளர்களிடமிருந்து நேரடியாக ஆர்டர் பெறத் தொடங்குங்கள். Menuthere-உடன் ஏற்கனவே வளர்ந்து வரும் 600+ உணவகங்களுடன் இணையுங்கள்.",
    ctaBannerPrimaryButton: "இலவசமாகத் தொடங்கு",
    ctaBannerSecondaryButton: "எல்லா திட்டங்களும்",
    faqHeadingLead: "அடிக்கடி கேட்கப்படும்",
    faqHeadingAccent: "கேள்விகள்.",
    faqVsAggregatorsQuestion: "Zomato, Swiggy-யிலிருந்து Menuthere எப்படி வேறுபடுகிறது?",
    faqVsAggregatorsAnswer:
      "Zomato, Swiggy போன்ற அக்ரிகேட்டர்கள் ஒவ்வொரு ஆர்டருக்கும் 20-33% கமிஷன் வசூலிக்கின்றன. Menuthere உங்களுக்கே சொந்தமான பிராண்டட் டெலிவரி வலைத்தளத்தைத் தருகிறது; வாடிக்கையாளர்கள் நேரடியாக உங்களிடமே ஆர்டர் செய்வார்கள், கமிஷன் வெறும் 1%. வாடிக்கையாளர் தரவு உங்களுக்கே, விலைக் கட்டுப்பாடு உங்களுக்கே, பிராண்ட் விசுவாசமும் உங்களுக்கே.",
    faqPetpoojaIntegrationQuestion: "Petpooja POS இணைப்பு எப்படி வேலை செய்கிறது?",
    faqPetpoojaIntegrationAnswer:
      "ஒருமுறை இணைத்தால் போதும், உங்கள் Petpooja மெனு Menuthere டெலிவரி வலைத்தளத்துடன் தானாகவே ஒத்திசையும். ஒவ்வொரு ஆன்லைன் ஆர்டரும் உடனுக்குடன் நேரடியாக உங்கள் POS-க்கு அனுப்பப்படும். கையால் பதிவு இல்லை, தவறவிட்ட ஆர்டர் இல்லை. உணவுகள், விலைகள், வகைகள் இரு அமைப்புகளிலும் ஒரே சீராக இருக்கும்.",
    faqDeliveryZonesQuestion: "என் டெலிவரி பகுதிகளையும் கட்டணங்களையும் எப்படி அமைப்பது?",
    faqDeliveryZonesAnswer:
      "டாஷ்போர்டில் Delivery Settings-க்குச் செல்லுங்கள். தூரம் அல்லது பின் கோடு அடிப்படையில் டெலிவரி பகுதிகளை வரையறுத்து, ஒவ்வொரு பகுதிக்கும் கட்டணத்தை அமைத்து, குறைந்தபட்ச ஆர்டர் தொகையை நிர்ணயிக்கலாம். குறிப்பிட்ட பகுதிகளுக்கு டெலிவரியை எப்போது வேண்டுமானாலும் ஆன்/ஆஃப் செய்யலாம்.",
    faqPickupOrdersQuestion: "டெலிவரி மட்டுமின்றி பிக்-அப் ஆர்டரும் செய்ய முடியுமா?",
    faqPickupOrdersAnswer:
      "ஆம், உங்கள் டெலிவரி வலைத்தளம் டெலிவரி மற்றும் பிக்-அப் இரண்டையும் ஆதரிக்கிறது. வாடிக்கையாளர் செக்அவுட்டில் தனக்கு விருப்பமானதைத் தேர்வு செய்யலாம். டாஷ்போர்டு அமைப்புகளில் இரண்டில் எதையும் ஆன்/ஆஃப் செய்யலாம்.",
    faqRushHourOrdersQuestion: "கூட்ட நேரங்களில் வரும் ஆர்டர்களை எப்படிச் சமாளிப்பது?",
    faqRushHourOrdersAnswer:
      "எல்லா ஆர்டர்களும் உடனடி அறிவிப்புடன் உங்கள் டாஷ்போர்டில் நேரடியாகத் தோன்றும். ஒரே திரையிலிருந்து ஏற்று, தயார் செய்து, நிலையைப் புதுப்பிக்கலாம். Petpooja POS இணைக்கப்பட்டிருந்தால் ஆர்டர்கள் அங்கும் ஒத்திசையும் — சமையலறைக்கும் தகவல் உடனே போய்ச்சேரும்.",
    faqTechnicalSkillsQuestion: "இதை அமைக்க தொழில்நுட்ப அறிவு தேவையா?",
    faqTechnicalSkillsAnswer:
      "சிறிதும் தேவையில்லை. மெனுவைப் பதிவேற்றுங்கள் (அல்லது Petpooja-விலிருந்து ஒத்திசையுங்கள்), உங்கள் பிராண்டிங்கைத் தனிப்பயனாக்குங்கள் — சில நிமிடங்களில் உங்கள் டெலிவரி வலைத்தளம் லைவ். கோடிங் வேண்டாம், டிசைனர் வேண்டாம், ஆப் டவுன்லோடும் வேண்டாம்.",
    faqOffersDiscountsQuestion: "என் டெலிவரி வலைத்தளத்தில் ஆஃபர், தள்ளுபடி வழங்க முடியுமா?",
    faqOffersDiscountsAnswer:
      "நிச்சயமாக! ஃபிளாஷ் டீல், கூப்பன் கோடு, முதல் ஆர்டர் தள்ளுபடி அல்லது நேரம் சார்ந்த ஸ்பெஷல்களை அமையுங்கள் — தானாகவே தொடங்கி, தானாகவே முடியும். Must-Try பேட்ஜ் மூலம் அதிகம் விற்கும் உணவுகளை முன்னிலைப்படுத்தி சராசரி ஆர்டர் மதிப்பை உயர்த்துங்கள்.",
    faqCustomerDiscoveryQuestion:
      "என் டெலிவரி வலைத்தளத்தை வாடிக்கையாளர்கள் எப்படிக் கண்டுபிடிப்பார்கள்?",
    faqCustomerDiscoveryAnswer:
      "உங்கள் வலைத்தள லிங்கை சமூக ஊடகங்கள், WhatsApp, Google Business Profile மற்றும் கடையில் உள்ள QR கோடுகளில் பகிருங்கள். Menuthere உங்கள் மெனுவை Google Maps-க்கும் ஒத்திசைப்பதால் வாடிக்கையாளர்கள் தாமாகவே உங்களைக் கண்டடைவார்கள். உங்கள் வலைத்தளம் ஆரம்பத்திலிருந்தே SEO-க்கு ஏற்றது.",
    faqPauseOrderingQuestion: "கடை மூடியிருக்கும் நேரங்களில் ஆர்டரை நிறுத்த முடியுமா?",
    faqPauseOrderingAnswer:
      "முடியும். Settings-க்குச் சென்று எப்போது வேண்டுமானாலும் உங்கள் உணவகத்தை ஆஃப் செய்யலாம் — கடை மூடும் நேரம், விடுமுறை அல்லது பராமரிப்புக்கு ஏற்றது. தயாரானதும் மீண்டும் ஆன் செய்யுங்கள். தானியங்கி திறப்பு/மூடும் நேர அட்டவணையையும் அமைக்கலாம்.",
    faqCancelSubscriptionQuestion: "எப்போது வேண்டுமானாலும் என் சந்தாவை ரத்து செய்யலாமா?",
    faqCancelSubscriptionAnswer:
      "ஆம், உங்கள் கணக்கிலிருந்தே எப்போது வேண்டுமானாலும் ரத்து செய்யலாம். நடப்பு பில்லிங் காலம் முடியும் வரை உங்கள் திட்டம் செயலில் இருக்கும்; புதுப்பிக்காத வரை கூடுதல் கட்டணம் இல்லை.",
    reviewExpandButton: "மேலும் காட்டு",
    reviewCollapseButton: "சுருக்கு",
    reviewOneAuthorName: "Hotel Colombo",
    reviewOneAuthorLocation: "எம்.ஜி. ரோடு, எடப்பள்ளி",
    reviewOneAuthorInitials: "HC",
    reviewOneParagraphOne:
      "உண்மையாகவே, ஒரு ஆப் உருவாக்குவது இவ்வளவு எளிதாக இருக்கும் என்று நான் நினைக்கவே இல்லை 😅 எல்லாவற்றையும் அவர்கள் அமைதியாகக் கவனித்து, முழு செயல்முறையையும் எங்களுக்கு மிக எளிதாக்கினார்கள்.",
    reviewOneParagraphTwo:
      "நான் விரும்பியது போலவே அப்படியே செய்து கொடுத்தார்கள். சில விஷயங்களில் நான் மிகவும் கறாராக இருந்தேன், சிறிதும் விட்டுக்கொடுக்கத் தயாராக இல்லை — பல முறை மாற்றி மாற்றிச் செய்தோம், ஆனால் அவர்கள் பொறுமையாகவும் நிதானமாகவும் இருந்து சரியாகவே செய்து முடித்தார்கள்.",
    reviewOneParagraphThree: "மிகவும் நேர்த்தியான வேலை, ரொம்ப நன்றி நண்பர்களே.",
    reviewTwoAuthorName: "Rimaal Mandi & Grills",
    reviewTwoAuthorLocation: "புனே",
    reviewTwoAuthorInitials: "RM",
    reviewTwoParagraphOne:
      "எங்கள் ஆப்பை உருவாக்கிக் கொடுத்த MenuThere குழுவுக்கு நன்றி. வாடிக்கையாளர்கள் நேரடியாக எங்களிடமே ஆர்டர் செய்ய இந்த ஆப் உதவுகிறது, டெலிவரி நிர்வாகமும் மிக எளிதாகிவிட்டது. Porter போன்ற மூன்றாம் தரப்பு டெலிவரி வசதிகளையும் நாங்கள் வழங்கினோம்; அவற்றை அவர்கள் வெற்றிகரமாக அமைப்பில் இணைத்தார்கள். எல்லாம் சீராக இயங்குகிறது, மிகச் சிறப்பான வேலை.",
    reviewTwoParagraphTwo:
      "இந்த ஆப்பை நாங்கள் தொடங்கியதற்கு முக்கியக் காரணம்: Zomato, Swiggy போன்ற தளங்கள் நல்ல வியாபாரத்தையும் வாடிக்கையாளர் வரவையும் தருகின்றன என்றாலும், கமிஷன் மற்றும் பிற செலவுகளால் பேஅவுட் பக்கம் சில சமயம் சிரமமாக இருக்கிறது. நிச்சயமாக Zomato, Swiggy-யைத் தவிர்க்க முடியாது — பல வாடிக்கையாளர்கள் அவற்றின் வழியாகவே ஆர்டர் செய்யப் பழகிவிட்டார்கள், நாங்களும் அவர்களுடன் தொடர்ந்து பணியாற்றுவோம்.",
    reviewTwoParagraphThree:
      "அதே நேரத்தில், வாடிக்கையாளர்களுடன் நேரடியாக இணைந்து அவர்களுக்கு இன்னும் சிறப்பாகச் சேவை செய்ய இந்த ஆப் இன்னொரு வழியைத் தருகிறது.",
    reviewTwoParagraphFour:
      "உங்கள் ஆதரவுக்கும் சிறந்த பணிக்கும் நன்றி, MenuThere குழுவே.",
  },

  footerLinks: {
    brandBlurb:
      "உணவகங்களுக்கான ஆல்-இன்-ஒன் ஆன்லைன் ஆர்டரிங் & டெலிவரி தளம். உங்கள் சொந்த வலைத்தளத்தைத் தொடங்குங்கள், அக்ரிகேட்டர் கமிஷனைத் தவிருங்கள், உங்கள் வணிகத்தை வளர்த்துக்கொள்ளுங்கள்.",
    solutionsGoogleBusinessSync: "Google Business ஒத்திசைவு",
    solutionsOwners: "உரிமையாளர்கள்",
    solutionsAgencies: "ஏஜென்சிகள்",
    solutionsPetpoojaIntegration: "PetPooja இணைப்பு",
    solutionsRestaurants: "உணவகங்கள்",
    solutionsCafes: "கஃபேக்கள்",
    resourcesHelpCenter: "உதவி மையம்",
    resourcesDownloadApp: "ஆப்பைப் பதிவிறக்கு",
    resourcesGetStarted: "தொடங்குங்கள்",
    legalPrivacyPolicy: "தனியுரிமைக் கொள்கை",
    legalTermsOfService: "சேவை விதிமுறைகள்",
    legalRefundPolicy: "பணத்திருப்பிக் கொள்கை",
    copyright: "© 2026 Menuthere.",
  },

  solutionsRest: {
    shared: {
      breadcrumbHome: "முகப்பு",
      breadcrumbSolutions: "தீர்வுகள்",
      bookDemoCta: "டெமோ முன்பதிவு",
      stepLabel: "படி {step}",
      faqHeading: "அடிக்கடி கேட்கப்படும் கேள்விகள்.",
      zeroPercentValue: "0%",
    },
    googleBusiness: {
      metaTitle: "மெனுவை Google Business-இல் ஒத்திசையுங்கள் | Menuthere",
      metaDescription:
        "உங்கள் உணவக மெனுவை Google Business Profile-க்கு தானாக ஒத்திசையுங்கள். ஒரே கிளிக் அமைப்பு, நேரடி புதுப்பிப்பு, சிறந்த லோக்கல் SEO. 600+ உணவகங்களின் நம்பிக்கை.",
      ogDescription:
        "உங்கள் உணவக மெனுவை Google Maps-இல் தானாக ஒத்திசையுங்கள். எப்போதும் புதுப்பித்த நிலையில், கைமுறை உழைப்பே இல்லாமல்.",
      breadcrumbCurrent: "Google Business Profile மெனு ஒத்திசைவு",
      heroBadge: "Google Business இணைப்பு",
      heroTitle: "உங்கள் மெனுவை Google Maps-இல் தானாகவே ஒத்திசையுங்கள்",
      heroSubtitle:
        "உங்கள் Google Business Profile மெனு எப்போதும் புதுப்பித்த நிலையில் இருக்கட்டும். Menuthere-இலிருந்து ஒரே கிளிக்கில் ஒத்திசைவு — Google Search & Maps-இல் உங்கள் மெனு, ஒவ்வொரு முறையும் துல்லியமாக.",
      heroPrimaryCta: "மெனுவை ஒத்திசையுங்கள்",
      mockupCardTitle: "Google Business Profile",
      mockupCardSubtitle: "மெனு ஒத்திசைவு மேனேஜர்",
      mockupSyncStatusTitle: "மெனு வெற்றிகரமாக ஒத்திசைக்கப்பட்டது",
      mockupSyncStatusMeta: "கடைசி ஒத்திசைவு: இப்போதுதான்",
      mockupStatItemsLabel: "ஒத்திசைந்த உணவுகள்",
      mockupStatCategoriesLabel: "வகைகள்",
      mockupStatImagesLabel: "படங்களுடன்",
      mockupRecentlySyncedLabel: "சமீபத்தில் ஒத்திசைந்தவை",
      mockupItem1Name: "பட்டர் சிக்கன்",
      mockupItem1Category: "மெயின் கோர்ஸ்",
      mockupItem2Name: "பன்னீர் டிக்கா",
      mockupItem2Category: "ஸ்டார்ட்டர்கள்",
      mockupItem3Name: "குலாப் ஜாமூன்",
      mockupItem3Category: "இனிப்புகள்",
      mockupBadgeTitle: "ப்ரொஃபைல் பார்வைகள்",
      mockupBadgeValue: "இந்த மாதம் +340%",
      statSyncingValue: "500+",
      statSyncingLabel: "ஒத்திசைக்கும் உணவகங்கள்",
      statClicksValue: "7x",
      statClicksLabel: "அதிக ப்ரொஃபைல் கிளிக்குகள்",
      statSyncTimeValue: "< 30s",
      statSyncTimeLabel: "ஒத்திசைவு நேரம்",
      statFootfallValue: "30%",
      statFootfallLabel: "அதிக வாடிக்கையாளர் வருகை",
      howItWorksBadge: "எளிய 3-படி செயல்முறை",
      howItWorksHeading: "எப்படி வேலை செய்கிறது",
      howItWorksSubheading:
        "உங்கள் மெனு டாஷ்போர்டிலிருந்து Google Maps வரை மூன்றே எளிய படிகள்",
      step1Title: "உங்கள் மெனுவை உருவாக்குங்கள்",
      step1Body:
        "வகைகள், உணவுகள், விலைகள், படங்களுடன் எங்கள் தளத்தில் மெனுவை உருவாக்குங்கள். சில நிமிடங்கள் போதும்.",
      step2Title: "Google Profile-ஐ இணையுங்கள்",
      step2Body:
        "ஒரே கிளிக்கில் உங்கள் Google Business Profile-ஐ இணையுங்கள். OAuth மற்றும் API அமைப்பு அனைத்தையும் நாங்களே கவனித்துக்கொள்கிறோம்.",
      step3Title: "ஒத்திசைத்து லைவ் ஆகுங்கள்",
      step3Body:
        "Sync அழுத்தினால் உங்கள் முழு மெனுவும் Google Maps-இல் தோன்றும். எப்போது வேண்டுமானாலும் மாற்றலாம் — மாற்றங்கள் உடனே பிரதிபலிக்கும்.",
      benefitsHeading: "Google மெனு ஒத்திசைவை உணவகங்கள் ஏன் விரும்புகின்றன",
      benefitsSubheading:
        "உங்கள் மெனுதான் உங்கள் மிகச் சக்திவாய்ந்த மார்க்கெட்டிங் கருவி — வாடிக்கையாளர்கள் தேடும் இடத்திலேயே அது தெரிய வேண்டும்",
      benefit1Title: "லோக்கல் SEO-வை உயர்த்துங்கள்",
      benefit1Body:
        "முழுமையான Google Business Profile உள்ள உணவகங்களுக்கு 7 மடங்கு அதிக கிளிக்குகள் கிடைக்கின்றன. ஒத்திசைந்த மெனு வலிமையான லோக்கல் ரேங்கிங் சிக்னல்களில் ஒன்று — \"restaurants near me\" தேடல்களில் மேலே வர இது உதவும்.",
      benefit2Title: "Google Maps-இல் தெரியுங்கள்",
      benefit2Body:
        "வாடிக்கையாளர்கள் Google Maps-இல் உணவைத் தேடும்போது உங்கள் முழு மெனுவும் — விலைகள், வகைகள், உணவுகள் — அங்கேயே தெரியும். உங்களை அழைக்கும் முன்பே வர முடிவெடுப்பார்கள்.",
      benefit3Title: "எப்போதும் புதுப்பித்த நிலையில்",
      benefit3Body:
        "விலை மாறியதா? புதிய உணவு சேர்த்தீர்களா? சீசன் உணவை நீக்கினீர்களா? ஒரே ஒத்திசைவில் உங்கள் Google Business Profile மெனு சமீபத்திய நிலைக்கு மாறும். Google-இல் கையால் திருத்தத் தேவையில்லை.",
      benefit4Title: "வாரம்தோறும் மணிக்கணக்கில் நேரம் மிச்சம்",
      benefit4Body:
        "Google Business மெனுவைக் கையால் புதுப்பிப்பது சலிப்பானது, தவறுகளுக்கும் வாய்ப்பு அதிகம். எங்கள் ஒத்திசைவு அதை மணிக்கணக்கில் அல்ல, நொடிகளில் முடிக்கும். காபி-பேஸ்ட்டில் அல்ல, சமையலில் கவனம் செலுத்துங்கள்.",
      benefit5Title: "அதிக வாடிக்கையாளர் வருகை",
      benefit5Body:
        "Google-இல் விரிவான மெனுவைப் பார்க்கும் வாடிக்கையாளர்கள் 30% அதிகமாக வருகை தருகிறார்கள். போட்டியாளர்களை விட உங்களைத் தேர்ந்தெடுக்கத் தேவையான தகவலை அவர்களுக்குக் கொடுங்கள்.",
      benefit6Title: "துல்லியமும் நம்பகத்தன்மையும்",
      benefit6Body:
        "உங்கள் உண்மையான மெனுவுக்கும் Google காட்டுவதற்கும் இடையே விலை வேறுபாடு இனி இல்லை. Maps-இல் பழைய தகவல் குறித்த வாடிக்கையாளர் புகார்களுக்கு முற்றுப்புள்ளி.",
      comparisonHeading: "ஒத்திசைவு இல்லாமல் vs. Menuthere-உடன்",
      comparisonSubheading:
        "தானியங்கி மெனு ஒத்திசைவு ஏற்படுத்தும் வித்தியாசத்தைப் பாருங்கள்",
      comparisonWithoutBadge: "✕ ஒத்திசைவு இல்லாமல்",
      comparisonWithout1: "Google-இல் ஒவ்வொரு உணவையும் கையால் தனித்தனியே சேர்க்க வேண்டும்",
      comparisonWithout2: "Google-இல் உள்ள மெனு சில நாட்களிலேயே பழையதாகிவிடும்",
      comparisonWithout3: "விலை வேறுபாடுகள் வாடிக்கையாளர் புகார்களை உண்டாக்கும்",
      comparisonWithout4: "ஒவ்வொரு மாதமும் மணிக்கணக்கில் தரவு பதிவு வேலை",
      comparisonWithout5: "படங்களே இல்லை — வெறும் உரைப் பட்டியல்",
      comparisonWithout6: "தளங்களுக்கிடையே ஒத்துப்போகாத தகவல்",
      comparisonWithBadge: "✓ Menuthere-உடன்",
      comparisonWith1: "ஒரே கிளிக் உங்கள் முழு மெனுவையும் அனுப்பும்",
      comparisonWith2: "Google மெனு எப்போதும் உங்கள் சமீபத்திய மெனுவுடன் ஒத்திருக்கும்",
      comparisonWith3: "துல்லியமான விலைகள் வாடிக்கையாளர் நம்பிக்கையை வளர்க்கும்",
      comparisonWith4: "மணிக்கணக்கான கைவேலை அல்ல, நொடிகளில் ஒத்திசைவு",
      comparisonWith5: "பார்வைக்கு ஈர்க்கும் முழு பட ஆதரவு",
      comparisonWith6: "வலைத்தளம், QR, Google — எல்லாவற்றிலும் ஒரே மெனு",
      featuresHeading: "Google மெனு ஒத்திசைவில் உங்களுக்குக் கிடைப்பவை",
      featuresSubheading:
        "உங்கள் Google இருப்பைத் துல்லியமாகவும் கவர்ச்சிகரமாகவும் வைத்திருக்கத் தேவையான முழுத் தொகுப்பு.",
      feature1: "ஒரே கிளிக்கில் Google Business Profile-க்கு முழு மெனு ஒத்திசைவு",
      feature2: "தானியங்கி வகை மேப்பிங்கும் கட்டமைப்பும்",
      feature3: "மெனு உணவுகளுக்கு பட பதிவேற்ற ஆதரவு",
      feature4: "விலை மற்றும் கிடைக்கும் தன்மை ஒத்திசைவு",
      feature5: "செயின்களுக்கு பல கிளை ஆதரவு",
      feature6: "ஒத்திசைவு வரலாறும் நிலைக் கண்காணிப்பும்",
      feature7: "எந்த Google Business கணக்குடனும் இயங்கும்",
      feature8: "தொழில்நுட்ப அறிவு தேவையில்லை",
      feature9: "வெஜ்/நான்-வெஜ் லேபிளிங் ஆதரவு",
      feature10: "சிறப்பு எழுத்துகளும் பல மொழி மெனுக்களும் கையாளப்படும்",
      ctaBoxHeading: "உங்கள் மெனுவை ஒத்திசைக்கத் தயாரா?",
      ctaBoxBody:
        "தங்கள் Google இருப்பைப் புதுப்பித்த நிலையில் வைக்க Menuthere-ஐ ஏற்கனவே பயன்படுத்தும் நூற்றுக்கணக்கான உணவகங்களுடன் இணையுங்கள். அமைக்க 5 நிமிடம் கூட ஆகாது.",
      ctaBoxButton: "இலவச டிரையலைத் தொடங்கு",
      comingSoonBadge: "விரைவில்",
      comingSoonHeading: "உங்கள் Google இருப்பின் எதிர்காலம்",
      comingSoonBody:
        "மெனுவுக்கு அப்பால், உங்கள் முழு Google Business Profile-ஐயும் நிர்வகிக்க உதவும் சக்திவாய்ந்த புதிய அம்சங்களை உருவாக்கி வருகிறோம்.",
      autoPostTitle: "Google-இல் தானியங்கி போஸ்ட்",
      autoPostBody:
        "போஸ்ட்கள், ஆஃபர்கள், நிகழ்வுகள், புதுப்பிப்புகளை நேரடியாக உங்கள் Google Business Profile-இல் தானாகவே வெளியிடுங்கள். இன்றைய ஸ்பெஷல், புதிய உணவு அறிமுகம் அல்லது பண்டிகை ஆஃபர் — Google-இல் லாகின் செய்யாமலேயே பகிரலாம்.",
      autoPostPoint1: "படங்கள், CTA-க்களுடன் போஸ்ட்களைத் திட்டமிடலாம்",
      autoPostPoint2: "தினசரி ஸ்பெஷல்களையும் சீசன் ஆஃபர்களையும் விளம்பரப்படுத்தலாம்",
      autoPostPoint3: "நிகழ்வு அறிவிப்புகள் தானாகவே வெளியாகும்",
      autoPostPoint4: "போஸ்ட் அனலிட்டிக்ஸும் ஈடுபாட்டுக் கண்காணிப்பும்",
      reviewRepliesTitle: "AI ரிவ்யூ பதில்கள்",
      reviewRepliesBody:
        "நல்லதோ கெட்டதோ, ஒவ்வொரு Google ரிவ்யூவுக்கும் சிந்தனையான, தனிப்பயன் பதிலை AI எழுதட்டும். வேகமாகப் பதிலளியுங்கள், உங்கள் நற்பெயரைக் காத்துக்கொள்ளுங்கள், 24/7 அக்கறை காட்டுங்கள்.",
      reviewRepliesPoint1: "AI உருவாக்கும் தொழில்முறையான, அன்பான பதில்கள்",
      reviewRepliesPoint2: "நேர்மறை, எதிர்மறை இரு ரிவ்யூக்களையும் கையாளும்",
      reviewRepliesPoint3: "உங்கள் உணவகத்தின் தொனிக்கு ஏற்ப அமையும்",
      reviewRepliesPoint4: "வெளியிடும் முன் ஒரே கிளிக்கில் ஒப்புதல் அல்லது திருத்தம்",
      testimonialQuote:
        "“Google-இல் மெனுவைப் புதுப்பிக்க ஒவ்வொரு மாதமும் ஒரு முழு மதியப்பொழுதைச் செலவிடுவோம். Menuthere-உடன் ஒரே பட்டனை அழுத்தினால் போதும் — உணவுகள், விலைகள், படங்கள் எல்லாம் ஒத்திசைந்துவிடும். எங்கள் Google Maps பட்டியல் இப்போது தொழில்முறையாகத் தெரிகிறது; ஆன்லைனில் மெனுவைப் பார்த்ததாகச் சொல்லி வரும் வாடிக்கையாளர்களின் எண்ணிக்கையும் கணிசமாக அதிகரித்திருக்கிறது.”",
      testimonialAuthor: "அர்ஜுன் & பிரியா நாயர்",
      testimonialRole: "உரிமையாளர்கள், Spice Route Kitchen",
      testimonialLocation: "கொச்சி, கேரளா",
      faqSubheading:
        "Google Business Profile மெனு ஒத்திசைவு பற்றி நீங்கள் தெரிந்துகொள்ள வேண்டிய அனைத்தும்",
      faq1Question: "Google Business Profile மெனு ஒத்திசைவு என்றால் என்ன?",
      faq1Answer:
        "உங்கள் உணவக மெனுவை எங்கள் தளத்திலிருந்து உங்கள் Google Business Profile-க்கு (Google Search மற்றும் Google Maps-இல் தோன்றும் பட்டியல்) தானாகவே நகலெடுக்கும் அம்சம் இது. Google-இல் ஒவ்வொரு உணவையும் கையால் சேர்ப்பதற்குப் பதிலாக, ஒரே கிளிக்கில் எல்லாவற்றையும் ஒத்திசைக்கலாம்.",
      faq2Question: "இதைப் பயன்படுத்த Google Business Profile கட்டாயமா?",
      faq2Answer:
        "ஆம், உங்கள் உணவகத்திற்கு சரிபார்க்கப்பட்ட Google Business Profile தேவை. இன்னும் இல்லையென்றால் business.google.com-இல் இலவசமாக உருவாக்கலாம். சரிபார்த்த பிறகு எங்கள் தளத்துடன் இணைத்து ஒத்திசைக்கத் தொடங்கலாம்.",
      faq3Question: "எத்தனை முறை மெனுவை ஒத்திசைக்க வேண்டும்?",
      faq3Answer:
        "மெனுவில் மாற்றம் செய்யும் ஒவ்வொரு முறையும் — புதிய உணவு, விலை மாற்றம், சீசன் புதுப்பிப்பு — ஒத்திசைப்பது நல்லது. ஒத்திசைவுக்கு சில நொடிகளே ஆகும், எனவே புதுப்பித்த நிலையில் வைத்திருப்பதில் சிரமமே இல்லை. சில உணவகங்கள் தினமும், சில வாரம் ஒருமுறை ஒத்திசைக்கின்றன.",
      faq4Question: "ஒத்திசைத்தால் என் தற்போதைய Google மெனு அழிந்துவிடுமா?",
      faq4Answer:
        "ஆம், ஒவ்வொரு ஒத்திசைவும் உங்கள் Google Business Profile மெனுவை எங்கள் தளத்தின் சமீபத்திய பதிப்பால் மாற்றியமைக்கும். இதனால் முழுத் துல்லியம் உறுதியாகும். உங்கள் மற்ற Google Business Profile தகவல்கள் (படங்கள், ரிவ்யூக்கள், நேரம்) பாதிக்கப்படாது.",
      faq5Question: "பல உணவகக் கிளைகளுக்கு இது வேலை செய்யுமா?",
      faq5Answer:
        "ஆம்! ஒரே Google Business கணக்கின் கீழ் பல கிளைகளை நிர்வகித்தால், எந்தக் கிளைக்கு ஒத்திசைக்க வேண்டும் என்பதைத் தேர்வு செய்யலாம். ஒவ்வொரு கிளைக்கும் தனி மெனு வைக்கலாம். கிளைக்கு ஒரு மெனு வைக்கும் உணவகச் சங்கிலிகளுக்கு இது ஏற்றது.",
      faq6Question: "என் Google கணக்குத் தரவு பாதுகாப்பானதா?",
      faq6Answer:
        "நிச்சயமாக. Google-இன் அதிகாரப்பூர்வ OAuth 2.0 மற்றும் Business Profile API-யையே பயன்படுத்துகிறோம். உங்கள் மெனுவை நிர்வகிக்கத் தேவையான குறைந்தபட்ச அனுமதிகளை மட்டுமே கேட்கிறோம். உங்கள் அங்கீகார விவரங்கள் எப்போதும் சேமிக்கப்படுவதில்லை — பாதுகாப்பான டோக்கன் அடிப்படையிலான அங்கீகாரமே பயன்படுகிறது.",
      faq7Question: "ஒத்திசைவின்போது மெனு படங்களுக்கு என்ன ஆகும்?",
      faq7Answer:
        "உங்கள் ப்ரொஃபைலில் உள்ள மெனு உணவுப் படங்கள் மெனு தரவுடன் சேர்த்து Google-க்கு பதிவேற்றப்படும். பெரிய படங்கள் Google-இன் தேவைக்கேற்ப தானாக மேம்படுத்தப்படும். ஒரு படம் பதிவேற்றத் தவறினாலும் அந்த உணவு ஒத்திசைக்கப்படும் — படம் மட்டும் இருக்காது.",
      faq8Question: "இந்த அம்சம் எல்லா திட்டங்களிலும் உள்ளதா?",
      faq8Answer:
        "Google Business Profile மெனு ஒத்திசைவு எங்கள் Pro மற்றும் Business திட்டங்களில் கிடைக்கிறது. ஒவ்வொரு திட்டத்திலும் என்னென்ன உள்ளன என்பதற்கு எங்கள் விலைப் பக்கத்தைப் பாருங்கள்.",
    },
    petpooja: {
      metaTitle:
        "மூன்றாம் தரப்பு டெலிவரி தளங்களுக்கு 30% கமிஷன் கட்டுவதை நிறுத்துங்கள் | Menuthere நேரடி ஆர்டரிங்",
      metaDescription:
        "மூன்றாம் தரப்பு டெலிவரி தளங்கள் ஒவ்வொரு ஆர்டருக்கும் 20-30%+ கமிஷன் வசூலிக்கின்றன. வெறும் 0% கமிஷன், முழு வாடிக்கையாளர் தரவு உரிமை, PetPooja POS இணைப்புடன் உங்களுக்கே சொந்தமான ஆர்டரிங் ஆப்பை Menuthere தருகிறது. உங்கள் உணவகத்தின் கட்டுப்பாட்டை மீட்டெடுங்கள்.",
      ogTitle: "30% கமிஷன் கட்டுவதை நிறுத்துங்கள் | உணவகங்களுக்கான நேரடி ஆர்டரிங்",
      ogDescription:
        "மற்ற டெலிவரி தளங்களுக்கு ஏன் 20-30% கட்ட வேண்டும்? வெறும் 0% கமிஷனுடன் உங்கள் சொந்த ஆர்டரிங் வலைத்தளத்தைப் பெறுங்கள். PetPooja POS இணைப்பு, முழு வாடிக்கையாளர் தரவு, முழுக் கட்டுப்பாடு.",
      breadcrumbCurrent: "நேரடி ஆர்டரிங் & PetPooja இணைப்பு",
      heroTitle: "மூன்றாம் தரப்பு டெலிவரி தளங்களுக்கு 30% கமிஷன் கட்டுவதை நிறுத்துங்கள்",
      heroSubtitle:
        "முழு வாடிக்கையாளர் உரிமையுடன் உங்கள் சொந்த ஆர்டரிங் வலைத்தளம், PetPooja POS இணைப்புடன்",
      heroPrimaryCta: "நேரடி விற்பனையைத் தொடங்கு",
      statCommissionLabel: "ஒரு ஆர்டருக்கு கமிஷன்",
      value35Percent: "35%",
      statQuitLabel: "அக்ரிகேட்டர்களை விட்டு விலக விரும்பும் உணவகங்கள்",
      statFeeValue: "45%",
      statFeeLabel: "உண்மையான அக்ரிகேட்டர் கட்டணம்",
      statDataValue: "100%",
      statDataLabel: "உங்களுக்கே சொந்தமான வாடிக்கையாளர் தரவு",
      introParagraph1:
        "அக்ரிகேட்டர்கள் ஒவ்வொரு ஆர்டருக்கும் 20-33% கமிஷனும் மறைமுகக் கட்டணங்களும் வசூலிக்கின்றன. ரூ. 500 ஆர்டரில் ரூ. 225 வரை இழக்கிறீர்கள். அது கூட்டாண்மை அல்ல — உங்கள் உழைப்பின் மீதான வரி. முக்கிய டெலிவரி தளங்கள் போட்டிச் சட்டங்களை மீறியதாக CCI விசாரணைகள் கண்டறிந்துள்ளன.",
      introParagraph2:
        "Menuthere உங்களுக்கே சொந்தமான பிராண்டட் ஆர்டரிங் வலைத்தளத்தை வெறும் 1% கமிஷனுடனும், முழு வாடிக்கையாளர் தரவு உரிமையுடனும் தருகிறது. PetPooja POS இணைப்புடன் ஆர்டர்கள் நேரடியாக உங்கள் சமையலறைக்கே வந்துசேரும் — இடைத்தரகர் இல்லை, வருவாய்ப் பங்கீடு இல்லை, கட்டுப்பாட்டை இழப்பதும் இல்லை.",
      problemsHeading: "மற்ற டெலிவரி தளங்கள் உங்கள் உணவகத்தை எப்படிப் பாதிக்கின்றன.",
      problemsSubheading:
        "இரு தளங்களும் போட்டிச் சட்டங்களை மீறியதாக CCI விசாரணைகள் கண்டறிந்தன. உங்கள் வணிகத்திற்கு அவை என்ன செய்கின்றன என்று பாருங்கள்.",
      problem1Title: "ஒரு ஆர்டருக்கு 20-33% கமிஷன்",
      problem1Body:
        "மூன்றாம் தரப்பு டெலிவரி தளங்கள் சமீபத்தில் கமிஷனை 33% வரை உயர்த்தியுள்ளன. ரூ. 500 ஆர்டரில், மற்ற எந்தக் கழிவுக்கும் முன்பே ரூ. 100-165 போய்விடுகிறது. உங்கள் உணவுச் செலவு, வாடகை, ஊழியர் சம்பளம் எல்லாம் மீதியிலிருந்துதான்.",
      problem2Title: "மறைமுகக் கட்டணங்கள் சேர்ந்து 45% வரை",
      problem2Body:
        "கமிஷன் மீது GST (18%), பேமெண்ட் கேட்வே கட்டணம் (2-3%), பேக்கேஜிங் மார்க்அப் (ஆர்டருக்கு ரூ. 2-5), கட்டாய தள்ளுபடிப் பங்கீடு. ரூ. 500 ஆர்டருக்கு மொத்தத் தளக் கட்டணமே ரூ. 212-227 ஆகலாம் — அதாவது 42-45% போய்விடும்.",
      problem3Title: "உங்கள் வாடிக்கையாளர் தரவு அவர்களுக்குச் சொந்தம்",
      problem3Body:
        "ஆயிரக்கணக்கான வாடிக்கையாளர்களுக்குச் சேவை செய்கிறீர்கள், ஆனால் யாருடனும் நேரடித் தொடர்பு இல்லை. பெயர், தொலைபேசி எண், ஆர்டர் வரலாறு — வாடிக்கையாளர் விவரங்களை தளங்கள் வேண்டுமென்றே மறைக்கின்றன. விசுவாசத்தை வளர்க்கவோ, குறிவைத்த ஆஃபர்களை அனுப்பவோ முடியாது.",
      problem4Title: "பணம் கொடுத்தால்தான் தெரிவுநிலை",
      problem4Body:
        "மற்ற டெலிவரி தளங்களில் முதல் 10 தேடல் முடிவுகள் கிட்டத்தட்ட எப்போதும் பணம் கட்டிய இடங்களே. விளம்பரப் பட்டியல்களுக்குச் செலவழிக்காவிட்டால் உங்கள் உணவகம் கீழேயே புதைந்துவிடும். விளம்பரச் செலவுடன் சேர்த்தால் உண்மையான கமிஷன் 25-40% ஆக உயரும்.",
      problem5Title: "விலை நிர்ணய சுதந்திரம் இல்லை",
      problem5Body:
        "மூன்றாம் தரப்பு டெலிவரி தளங்கள் விலைக் கட்டுப்பாடுகளை விதித்து, மீறினால் அபராதம் விதிக்கின்றன; வேறு இடங்களில் குறைந்த விலை வைத்தால் ரேங்க் குறைக்கப்படும் என்றும் எச்சரிக்கின்றன. உங்கள் சொந்த விலைக் கொள்கையைக் கூட நீங்கள் தீர்மானிக்க முடியாது.",
      problem6Title: "தளங்களே இப்போது உங்களுடன் போட்டி",
      problem6Body:
        "மூன்றாம் தரப்பு டெலிவரி தளங்கள் இப்போது தங்கள் சொந்த உணவு பிராண்டுகளையும் க்விக்-காமர்ஸ் ஆப்களையும் தொடங்குகின்றன. உங்கள் வாடிக்கையாளர் தரவை வைத்தே போட்டித் தயாரிப்புகளை உருவாக்குகிறார்கள். இதை NRAI 'அதிகார துஷ்பிரயோகம்' என்கிறது.",
      commissionHeading: "ரூ. 500 ஆர்டரின் உண்மையான செலவு.",
      commissionSubheading:
        "அக்ரிகேட்டர் தளங்களிலும் நேரடி ஆர்டரிங்கிலும் உங்கள் பணம் எங்கே போகிறது என்பதை அப்படியே பாருங்கள்.",
      commissionColCharge: "கட்டண வகை",
      commissionColPlatforms: "டெலிவரி தளங்கள்",
      commissionRow1Label: "அடிப்படை கமிஷன்",
      commissionRow1Aggregator: "18-33%",
      commissionRow2Label: "GST",
      commissionRow2Aggregator: "~3-5%",
      commissionRow3Label: "பேமெண்ட் கேட்வே",
      commissionRow3Aggregator: "2-3%",
      commissionRow3Menuthere: "2%",
      commissionRow4Label: "கட்டாய தள்ளுபடிகள்",
      commissionRow4Aggregator: "5-15%",
      commissionRow4Menuthere: "நீங்கள் முடிவு செய்யுங்கள்",
      commissionRow5Label: "பேக்கேஜிங் மார்க்அப்",
      commissionRow5Aggregator: "ஆர்டருக்கு ரூ. 2-5",
      commissionRow6Label: "விளம்பரப் பட்டியல்கள்",
      commissionRow6Aggregator: "கூடுதலாக 5-10%",
      commissionRow6Menuthere: "இலவசத் தெரிவுநிலை",
      commissionTotalLabel: "மொத்த உண்மையான இழப்பு",
      commissionTotalAggregator: "ரூ. 212-227 (42-45%)",
      commissionTotalMenuthere: "~3%",
      commissionFootnote:
        "* NRAI, Menuviel, Billboox அறிக்கைகளின் (2025-2026) தொழில்துறைத் தரவுகளின் அடிப்படையில்",
      solutionHeading: "உங்கள் உணவகத்தின் கட்டுப்பாட்டை மீட்டெடுங்கள்.",
      solutionSubheading:
        "உங்கள் சொந்த ஆர்டரிங் வலைத்தளம். வெறும் 1% கமிஷன். முழு வாடிக்கையாளர் தரவு. PetPooja POS இணைப்பு.",
      solution1Title: "ஆர்டர்களுக்கு வெறும் 0% கமிஷன்",
      solution1Body:
        "வெறும் 0% கமிஷன் என்பதால், வாடிக்கையாளர் கட்டும் கிட்டத்தட்ட ஒவ்வொரு ரூபாயும் உங்களுக்கே. மறைமுகக் கட்டணம் இல்லை, வருவாய்ப் பங்கீடு இல்லை. உங்கள் மார்ஜின் அப்படியே இருக்கும் — அப்படித்தானே இருக்க வேண்டும்.",
      solution2Title: "வாடிக்கையாளர் தரவு 100% உங்களுக்கே",
      solution2Body:
        "ஒவ்வொரு ஆர்டரும் வாடிக்கையாளரின் பெயர், தொலைபேசி எண், ஆர்டர் வரலாறு, விருப்பங்களை உங்களுக்குத் தருகிறது. விசுவாசத் திட்டங்களை உருவாக்குங்கள், குறிவைத்த ஆஃபர்களை அனுப்புங்கள், வாடிக்கையாளர்களுடன் உண்மையான உறவை வளர்க்குங்கள்.",
      solution3Title: "உங்கள் சொந்த பிராண்டட் ஆர்டரிங் வலைத்தளம்",
      solution3Body:
        "உங்கள் உணவகத்தின் பிராண்டிங், நிறங்கள், டொமைனுடன் ஒரு தொழில்முறை ஆர்டரிங் வலைத்தளம். வாடிக்கையாளர்கள் நேரடியாக உங்களிடமே ஆர்டர் செய்வார்கள் — வளர்வது உங்கள் பிராண்ட், அக்ரிகேட்டரின் பிராண்ட் அல்ல.",
      solution4Title: "முழுமையான அனலிட்டிக்ஸும் இன்சைட்ஸும்",
      solution4Body:
        "ஒவ்வொரு ஆர்டர், கூட்ட நேரம், பிரபல உணவுகள், வாடிக்கையாளர் நடத்தை, வருவாய்ப் போக்கு — அனைத்தையும் கண்காணியுங்கள். மெனு, விலை, விளம்பரம் குறித்து தரவின் அடிப்படையில் முடிவெடுங்கள்.",
      solution5Title: "உண்மையான வாடிக்கையாளர் விசுவாசம்",
      solution5Body:
        "மார்ஜினைப் பங்கிடாமல் உங்கள் சொந்த ஆஃபர்கள், தள்ளுபடிகள், விசுவாசப் பரிசுகளை வழங்குங்கள். WhatsApp அறிவிப்புகள், பண்டிகை வாழ்த்துகள், தனிப்பயன் டீல்களை நேரடியாக வாடிக்கையாளர்களுக்கே அனுப்புங்கள்.",
      solution6Title: "PetPooja POS இணைப்பு",
      solution6Body:
        "உங்கள் Menuthere வலைத்தள ஆர்டர்கள் நேரடியாக PetPooja POS-க்கு சீராக ஒத்திசையும். கையால் பதிவு இல்லை, தவறவிட்ட ஆர்டர் இல்லை. மற்ற எந்த சேனலைப் போலவே உங்கள் சமையலறைக்கு ஆர்டர்கள் உடனே கிடைக்கும்.",
      realNumbersHeading: "அக்ரிகேட்டர் சார்பு vs. நேரடி ஆர்டரிங்.",
      realNumbersSubheading: "தளங்கள் உங்களுக்குக் காட்ட விரும்பாத உண்மையான ஒப்பீடு.",
      realNumbersColAggregators: "அக்ரிகேட்டர்கள்",
      realNumbersRow1Metric: "ஒரு ஆர்டருக்கு கமிஷன்",
      realNumbersRow1Aggregator: "18-33% + கட்டணங்கள் (உண்மையில் 35-45%)",
      realNumbersRow1Direct: "வெறும் 0%",
      realNumbersRow2Metric: "வாடிக்கையாளர் தரவு உரிமை",
      realNumbersRow2Aggregator: "எல்லாம் தளத்திற்கே சொந்தம்",
      realNumbersRow2Direct: "100% உங்களுக்கே",
      realNumbersRow3Metric: "விலைக் கட்டுப்பாடு",
      realNumbersRow3Aggregator: "அபராதங்களுடன் கட்டுப்படுத்தப்பட்டது",
      realNumbersRow3Direct: "முழுச் சுதந்திரம்",
      realNumbersRow4Metric: "பிராண்ட் கட்டமைப்பு",
      realNumbersRow4Aggregator: "விசுவாசம் தளத்திற்குப் போகிறது",
      realNumbersRow4Direct: "விசுவாசம் உங்கள் உணவகத்திற்கே",
      realNumbersRow5Metric: "டெலிவரியில் லாப மார்ஜின்",
      realNumbersRow5Aggregator: "பெரும்பாலும் 10%-க்கும் கீழே",
      realNumbersRow5Direct: "25-35%+ சாத்தியம்",
      realNumbersRow6Metric: "மார்க்கெட்டிங் கட்டுப்பாடு",
      realNumbersRow6Aggregator: "பணம் கட்டினால்தான், ரூ. 250-4000+",
      realNumbersRow6Direct: "முழுக் கட்டுப்பாடு, சொந்தப் பிரச்சாரங்கள்",
      realNumbersRow7Metric: "மெனு & தள்ளுபடிக் கட்டுப்பாடு",
      realNumbersRow7Aggregator: "உங்கள் ஒப்புதலின்றி தளம் திணிக்கலாம்",
      realNumbersRow7Direct: "100% உங்கள் முடிவு",
      transparencyHeading: "தெரிந்துகொள்ள வேண்டியவை — முழு வெளிப்படைத்தன்மை.",
      transparencySubheading:
        "நேரடியாகச் சொல்வதில் எங்களுக்கு நம்பிக்கை. நாங்கள் தருவது என்ன, தராதது என்ன என்பது இதோ.",
      deliveryTitle: "நாங்கள் டெலிவரி பாய்களைத் தருவதில்லை",
      deliveryBody:
        "சிறந்த ஆர்டரிங் தளம், வாடிக்கையாளர் நிர்வாகம், POS இணைப்பு — இவற்றில்தான் Menuthere கவனம் செலுத்துகிறது. டெலிவரிக்கு உங்களுக்குப் பல வழிகள் உண்டு:",
      deliveryPoint1: "முழுக் கட்டுப்பாட்டுக்கு உங்கள் சொந்த டெலிவரி ஊழியர்களைப் பயன்படுத்துங்கள்",
      deliveryPoint2: "Porter, Dunzo, Shadowfax போன்ற மூன்றாம் தரப்பு சேவைகளுடன் இணையுங்கள்",
      deliveryPoint3: "பிக்-அப் மட்டும் வழங்குங்கள் — பல வாடிக்கையாளர்கள் அதையே விரும்புகிறார்கள்",
      deliveryPoint4: "டைன்-இன் QR ஆர்டரிங்கிற்கு டெலிவரியே தேவையில்லை",
      deliveryNote:
        "30% கமிஷனில் அக்ரிகேட்டர் வழியாக டெலிவரி செய்யப்படும் ஆர்டர்களை விட, நேரடி சேனல் வழியான பிக்-அப் ஆர்டர்களே அதிக லாபம் தரும்.",
      paymentTitle: "பேமெண்ட் இணைப்பு",
      paymentBadge: "1% மட்டுமே",
      paymentBody:
        "வெறும் 1% கட்டணத்தில் (வாடிக்கையாளர் சேவைக்கு மட்டும்) ஒருங்கிணைந்த பேமெண்ட் கேட்வே. உங்கள் ஆர்டரிங் வலைத்தளத்திலேயே வாடிக்கையாளர்கள் ஆன்லைனில் பணம் செலுத்தலாம்:",
      paymentPoint1: "UPI பேமெண்ட் (Google Pay, PhonePe, Paytm)",
      paymentPoint2: "கிரெடிட் & டெபிட் கார்டு ஆதரவு",
      paymentPoint3: "டிஜிட்டல் வாலட் இணைப்பு",
      paymentPoint4: "PetPooja POS-உடன் தானியங்கி கணக்கு ஒப்பீடு",
      paymentNote:
        "காசு ஆன் டெலிவரியையும் ஏற்கலாம் அல்லது உங்கள் தற்போதைய பேமெண்ட் அமைப்பையே பயன்படுத்தலாம்.",
      factsHeading: "எண்கள் பொய் சொல்வதில்லை.",
      factsSubheading:
        "தொழில்துறை கணக்கெடுப்புகள், CCI விசாரணைகள், NRAI அறிக்கைகளின் உண்மையான தரவு.",
      fact1Text:
        "இந்திய உணவகங்கள் மற்ற டெலிவரி தளங்களை விட்டு விலக விரும்புகின்றன (டிசம்பர் 2025 கணக்கெடுப்பு)",
      fact2Value: "60%",
      fact2Text:
        "புதிய உணவகங்கள் முதல் ஆண்டிலேயே மூடப்படுகின்றன — தளச் சார்பு ஒரு முக்கியக் காரணம்",
      fact3Value: "ரூ. 400 கோடி",
      fact3Text:
        "பேக்கேஜிங் கட்டண மார்க்அப் மூலம் தளங்கள் ஆண்டுதோறும் கூடுதலாக வசூலிக்கும் தொகை",
      fact4Value: "2,000+",
      fact4Text: "அக்ரிகேட்டர் தளங்களுக்கு எதிரான #Logout புறக்கணிப்பில் பங்கேற்ற உணவகங்கள்",
      howItWorksHeading: "3 எளிய படிகளில் நேரடியாகச் செல்லுங்கள்.",
      howItWorksSubheading: "10 நிமிடத்திற்குள் உங்கள் சொந்த ஆர்டரிங் சேனலை அமையுங்கள்.",
      step1Title: "மெனுவையும் வலைத்தளத்தையும் உருவாக்குங்கள்",
      step1Body:
        "மெனுவைப் பதிவேற்றி, பிராண்டிங்கைத் தனிப்பயனாக்கி, உங்கள் சொந்த ஆர்டரிங் வலைத்தளத்தை லைவ் ஆக்குங்கள். 10 நிமிடத்திற்குள் முடியும்.",
      step2Title: "PetPooja POS-ஐ இணையுங்கள்",
      step2Body:
        "தானியங்கி ஆர்டர் ஒத்திசைவுக்கு உங்கள் PetPooja POS-ஐ இணையுங்கள். ஆர்டர்கள் நேரடியாக உங்கள் சமையலறைக்கே — கைவேலையே இல்லை.",
      step3Title: "பகிர்ந்து விற்கத் தொடங்குங்கள்",
      step3Body:
        "உங்கள் ஆர்டரிங் லிங்கை WhatsApp, சமூக ஊடகங்கள், QR கோடுகள் வழியாகப் பகிருங்கள். நேரடி ஆர்டர்கள் வருவதைப் பாருங்கள்.",
      savingsHeading: "மற்ற டெலிவரி தளங்களில் ஒவ்வொரு ஆர்டரும் உங்களுக்கு ரூ. 100-225 இழப்பு",
      savingsBody:
        "நாளொன்றுக்கு 50 டெலிவரி ஆர்டர்கள் என்றால், தினமும் ரூ. 5,000-11,250 இழப்பு. மாதம் ரூ. 1.5-3.3 லட்சம். உங்கள் சொந்த ஆர்டரிங் வலைத்தளம் முதல் நாளிலிருந்தே தன் செலவை ஈடுகட்டும்.",
      savingsSecondaryCta: "விலையைப் பாருங்கள்",
      faqSubheading:
        "Menuthere-உடன் நேரடி ஆர்டரிங் பற்றி நீங்கள் தெரிந்துகொள்ள வேண்டிய அனைத்தும்.",
      faq1Question: "மற்ற டெலிவரி தளங்களுக்கு கமிஷன் கட்டுவதை நிறுத்த Menuthere எப்படி உதவுகிறது?",
      faq1Answer:
        "வாடிக்கையாளர்கள் நேரடியாக ஆர்டர் செய்யக்கூடிய, உங்களுக்கே சொந்தமான பிராண்டட் ஆர்டரிங் வலைத்தளத்தை Menuthere தருகிறது. வெறும் 0% கமிஷன் என்பதால் ஆர்டர் வருவாய் கிட்டத்தட்ட முழுவதும் உங்களுக்கே. ஒவ்வொரு ஆர்டரிலும் 20-30% பங்கு அல்ல — எளிய சந்தாக் கட்டணமே வசூலிக்கிறோம்.",
      faq2Question: "Menuthere டெலிவரி பாய்களைத் தருகிறதா?",
      faq2Answer:
        "இல்லை, Menuthere டெலிவரி ரைடர்களைத் தருவதில்லை. சிறந்த ஆர்டரிங் தளம், வாடிக்கையாளர் நிர்வாகம், POS இணைப்பு — இவற்றில்தான் நாங்கள் கவனம் செலுத்துகிறோம். டெலிவரிக்கு உங்கள் சொந்த ஊழியர்களைப் பயன்படுத்தலாம், Porter, Dunzo, Shadowfax போன்ற மூன்றாம் தரப்பு சேவைகளுடன் இணையலாம், அல்லது பிக்-அப் மட்டும் வழங்கலாம். 30% கமிஷனுடன் அக்ரிகேட்டர் வழியாக டெலிவரி செய்யப்படும் ஆர்டர்களை விட நேரடி சேனல் பிக்-அப் ஆர்டர்களே அதிக லாபம் தருவதாக பல உணவகங்கள் கண்டறிந்துள்ளன.",
      faq3Question: "PetPooja இணைப்பு எப்படி வேலை செய்கிறது?",
      faq3Answer:
        "உங்கள் Menuthere வலைத்தளத்தில் வரும் ஆர்டர்கள் உடனுக்குடன் தானாகவே உங்கள் PetPooja POS டெர்மினலுக்கு அனுப்பப்படும். ஆர்டரை உங்கள் சமையலறை உடனே பார்க்கும் — கையால் பதிவு இல்லை, காபி-பேஸ்ட் இல்லை, தவறவிட்ட ஆர்டர் இல்லை. உங்கள் POS-இல் வேறு எந்த சேனலிலிருந்து ஆர்டர் வருகிறதோ அதே போலவே இதுவும் வேலை செய்கிறது.",
      faq4Question: "வாடிக்கையாளர்களிடமிருந்து பணம் வசூலிப்பது எப்படி?",
      faq4Answer:
        "வெறும் 0% கட்டணத்துடன் (வாடிக்கையாளர் சேவைக்கு மட்டும்) ஒருங்கிணைந்த பேமெண்ட் கேட்வே ஆதரவு Menuthere-இல் உள்ளது. உங்கள் ஆர்டரிங் வலைத்தளத்திலேயே UPI, கார்டு, வாலட் வழியாக வாடிக்கையாளர்கள் ஆன்லைனில் பணம் செலுத்தலாம். காசு ஆன் டெலிவரியையும் ஏற்கலாம் அல்லது உங்கள் தற்போதைய பேமெண்ட் அமைப்பையே பயன்படுத்தலாம்.",
      faq5Question: "மற்ற டெலிவரி தளங்களை முற்றிலும் விட்டுவிட வேண்டுமா?",
      faq5Answer:
        "அவசியமில்லை. புதிய வாடிக்கையாளர்கள் கண்டறிவதற்காக மற்ற டெலிவரி தளங்களைத் தொடர்ந்து பயன்படுத்தி, மீண்டும் வரும் வாடிக்கையாளர்களை அதிக மார்ஜின் தரும் சொந்த வலைத்தளத்திற்குத் திருப்பும் உணவகங்கள் பல. இலக்கு சார்பைக் குறைப்பதே — முற்றிலும் ஒழிப்பது அவசியமில்லை — உங்கள் வருவாயில் அதிகம் உங்களிடமே தங்க வேண்டும்.",
      faq6Question: "Menuthere-க்கு எவ்வளவு செலவாகும்?",
      faq6Answer:
        "Menuthere ஆர்டர்களில் சதவீதம் அல்ல, எளிய மாதச் சந்தாவே வசூலிக்கிறது. கட்டணத் திட்டங்களில் கூட, அக்ரிகேட்டர் கமிஷனைத் தவிர்ப்பதன் மூலம் நீங்கள் செலவழிப்பதை விட மிக அதிகமாகச் சேமிப்பீர்கள். தற்போதைய திட்டங்களுக்கு எங்கள் விலைப் பக்கத்தைப் பாருங்கள்.",
      faq7Question: "உண்மையிலேயே 35% உணவகங்கள் அக்ரிகேட்டர்களை விட விரும்புகின்றனவா?",
      faq7Answer:
        "ஆம். டிசம்பர் 2025 தொழில்துறை கணக்கெடுப்பின்படி, 35% இந்திய உணவகங்கள் மற்ற டெலிவரி தளங்களைப் பயன்படுத்துவதை நிறுத்த விரும்புகின்றன — அதிக கமிஷன், மோசமான வாடிக்கையாளர் சேவை, போதாத லாபம், வாடிக்கையாளர் தரவு கிடைக்காதது ஆகியவை முக்கியக் காரணங்கள்.",
      faq8Question: "Menuthere-உடன் சேர்த்து மற்ற டெலிவரி தளங்களையும் பயன்படுத்தலாமா?",
      faq8Answer:
        "நிச்சயமாக. எங்கள் பெரும்பாலான உணவக பார்ட்னர்கள் இரண்டையும் பயன்படுத்துகிறார்கள். புதிய வாடிக்கையாளர்களைப் பெற மற்ற டெலிவரி தளங்களை வைத்துக்கொண்டு, மீண்டும் வரும் வாடிக்கையாளர்களை அதிக மார்ஜின் தரும் Menuthere வலைத்தளத்திற்குத் தீவிரமாகத் திருப்புகிறார்கள். காலப்போக்கில் வாடிக்கையாளர்கள் நேரடியாக ஆர்டர் செய்யவே விரும்புவதால் நேரடி ஆர்டர்களின் பங்கு வளர்கிறது.",
    },
    whatsappOrdering: {
      metaTitle:
        "உணவகங்களுக்கான WhatsApp ஆர்டரிங் — வாடிக்கையாளர் 'Hi' அனுப்பினால் போதும் | Menuthere",
      metaDescription:
        "உங்கள் WhatsApp எண்ணையே ஆர்டரிங் சேனலாக மாற்றுங்கள். வாடிக்கையாளர் 'Hi' அனுப்பினால் உடனடி தானியங்கி-லாகின் லிங்க், படங்களுடன் கூடிய மெனுவில் ஆர்டர், நேரடி நிலை புதுப்பிப்புகள் — ஆப் டவுன்லோட் இல்லை, பதிவு இல்லை, கமிஷன் பூஜ்ஜியம்.",
      metaKeywords:
        "whatsapp ஆர்டரிங், உணவகங்களுக்கான whatsapp ஆர்டரிங் அமைப்பு, whatsapp-இல் ஆர்டர், whatsapp business ஆர்டரிங், உணவக whatsapp மெனு, ஆர்டர் செய்ய Hi அனுப்புங்கள், whatsapp உணவு ஆர்டரிங், உரையாடல் ஆர்டரிங், கமிஷன் இல்லாத ஆர்டரிங்",
      ogTitle: "WhatsApp ஆர்டரிங் — வாடிக்கையாளர் 'Hi' அனுப்பினால் போதும் | Menuthere",
      ogDescription:
        "உணவகங்களுக்கான மிகக் குறைந்த சிரமமுள்ள ஆர்டரிங் சேனல். 'Hi' → உடனடி லிங்க் → உங்கள் மெனுவில் ஆர்டர் → WhatsApp-இல் நேரடி புதுப்பிப்புகள். ஆப் இல்லை, பதிவு இல்லை, கமிஷன் பூஜ்ஜியம்.",
      structuredDataProductName: "Menuthere WhatsApp ஆர்டரிங்",
      structuredDataProductDescription:
        "உணவகங்களுக்கான WhatsApp ஆர்டரிங் அமைப்பு. வாடிக்கையாளர்கள் 'Hi' அனுப்பி உடனடி தானியங்கி-லாகின் லிங்கைப் பெற்று, படங்களுடன் கூடிய வலை மெனுவில் ஆர்டர் செய்து, ஆர்டர் நிலை புதுப்பிப்புகளை WhatsApp-இலேயே பெறுவார்கள்.",
      heroBadge: "WhatsApp ஆர்டரிங்",
      heroBadgeNew: "புதியது",
      heroTitle: "ஒரு “Hi” அனுப்பினாலே உங்கள் வாடிக்கையாளர்கள் ஆர்டர் செய்வார்கள்.",
      heroSubtitle:
        "உங்கள் WhatsApp எண்ணையே எளிதான ஆர்டரிங் சேனலாக மாற்றுங்கள். ஒரே “Hi” ஒவ்வொரு வாடிக்கையாளருக்கும் உங்கள் மெனுவுக்கான உடனடி, தானியங்கி-லாகின் லிங்கைத் தருகிறது — ஆப் நிறுவல் இல்லை, பதிவு இல்லை, OTP இல்லை. வாடிக்கையாளரும் உங்களுக்கே, கமிஷனும் பூஜ்ஜியம்.",
      primaryCta: "இலவசமாகத் தொடங்கு",
      heroTrust1: "ஆப் டவுன்லோட் இல்லை",
      heroTrust2: "பதிவும் OTP-யும் இல்லை",
      heroTrust3: "0% கமிஷன்",
      stepsHeading: "“Hi” அனுப்புங்கள். அதுதான் ஃபன்னல்.",
      stepsSubheading:
        "கார்ட் கைவிடப்படுவதற்கு மிகப் பெரிய காரணம் சிரமம் — டவுன்லோட், பதிவு, கடவுச்சொல். WhatsApp ஆர்டரிங் இவை அனைத்தையும் நீக்குகிறது. நான்கே படிகள்; வாடிக்கையாளர் ஏற்கனவே நம்பும் சேனலை விட்டு வெளியேறவே தேவையில்லை.",
      step1Title: "வாடிக்கையாளர் “Hi” அனுப்புகிறார்",
      step1Body:
        "ஸ்டிக்கர், மேசை QR, பயோ லிங்க் அல்லது Google ப்ரொஃபைல் — எதிலிருந்தும் தட்டி WhatsApp-க்கு வந்து உங்கள் எண்ணுக்கு Hi அனுப்புகிறார். ஆப் டவுன்லோட் இல்லை, படிவம் நிரப்புவதும் இல்லை.",
      step2Title: "உடனே Order Now லிங்க் கிடைக்கிறது",
      step2Body:
        "உங்கள் எண் ஒரு நொடியில் தட்டக்கூடிய Order Now பட்டனுடன் பதிலளிக்கிறது. அந்த லிங்க் அவரைத் தானாகவே உள்நுழையச் செய்யும் — OTP இல்லை, கடவுச்சொல் இல்லை, கணக்கு உருவாக்கமும் இல்லை.",
      step3Title: "படங்களுடன் கூடிய உங்கள் மெனுவில் ஆர்டர்",
      step3Body:
        "லிங்க் உங்கள் பிராண்டட் வலை மெனுவைத் திறக்கும் — ஏற்கனவே உள்நுழைந்த நிலையில். படங்களைப் பார்த்து, கார்ட்டில் சேர்த்து, UPI அல்லது காசு தேர்வு செய்து, சில தட்டுகளில் ஆர்டர் செய்வார்.",
      step4Title: "புதுப்பிப்புகள் WhatsApp-இலேயே வரும்",
      step4Body:
        "ஆர்டர் பெறப்பட்டது, ஏற்கப்பட்டது, உணவு தயார், நேரடி டிராக்கிங் லிங்குடன் டெலிவரிக்குப் புறப்பட்டது, டெலிவரி முடிந்தது — கூடவே விசுவாசப் புள்ளிகள். ஒவ்வொரு புதுப்பிப்பும் சாட்டிலேயே வந்து சேரும்.",
      featuresHeading: "பேசுவதற்கு மட்டுமல்ல, விற்பதற்கே உருவாக்கப்பட்டது.",
      featuresSubheading:
        "WhatsApp வழி ஆர்டரிங்கை தொழில்முறையாக நடத்தத் தேவையான அனைத்தும் — உங்கள் பிராண்டில், உங்கள் விதிகளின்படி.",
      feature1Title: "ஆப் இல்லை, பதிவும் இல்லை",
      feature1Body:
        "WhatsApp உள்ள எந்த ஃபோனிலும் வேலை செய்யும். “Hi” அனுப்பினாலே வாடிக்கையாளர் அமைதியாக உருவாக்கப்பட்டு அடையாளம் காணப்படுவார்; லாகின் தடை எதுவும் இல்லை.",
      feature2Title: "உங்கள் சொந்த பிராண்டட் எண்",
      feature2Body:
        "Meta வழியாக சில நிமிடங்களில் உங்கள் உண்மையான WhatsApp Business எண்ணை இணையுங்கள் — ஏற்கனவே பயன்படுத்தும் எண்ணைக் கூட. அல்லது எங்கள் பொது எண்ணில் உடனே லைவ் ஆகுங்கள்.",
      feature3Title: "சொந்த டொமைன் ஆர்டர் லிங்க்",
      feature3Body:
        "ஆர்டர் லிங்குகள் ஒரு பொதுவான மூன்றாம் தரப்பு URL-இல் அல்ல, உங்கள் சொந்த டொமைனிலேயே (yourbrand.com) இயங்கும் — ஒவ்வொரு தொடுபுள்ளியும் உங்கள் பிராண்டிலேயே.",
      feature4Title: "தானியங்கி நிலை புதுப்பிப்புகள்",
      feature4Body:
        "முழு பில்லுடன் ஆர்டர் பதிவு, ஏற்பு, தயார் நிலை, நேரடி டிராக்கிங் மேப் லிங்குடன் புறப்பாடு, நிறைவு, விசுவாசப் புள்ளிகள் — அனைத்தும் தானாகவே அனுப்பப்படும்.",
      feature5Title: "பாதுகாப்பான ஒருமுறை லிங்குகள்",
      feature5Body:
        "ஒவ்வொரு லிங்கும் கையொப்பமிடப்பட்டு, சில நிமிடங்களில் காலாவதியாகி, முதலில் திறப்பவருக்கே பூட்டப்படும் — பகிரப்பட்ட லிங்கால் யாரோ ஒருவரின் உள்நுழைந்த அமர்வை ஒருபோதும் கைப்பற்ற முடியாது.",
      feature6Title: "கோடு இல்லாத மெசேஜ் ஃப்ளோக்கள்",
      feature6Body:
        "உங்கள் வரவேற்பு மற்றும் ஆர்டர் செய்திகள் கீவேர்டு டிரிக்கர், பட்டன், மீடியாவுடன் திருத்தக்கூடிய ஃப்ளோக்கள் — கோடைத் தொடாமலேயே வாசகத்தை மாற்றலாம்.",
      feature7Title: "ஒருங்கிணைந்த WhatsApp இன்பாக்ஸ்",
      feature7Body:
        "உள்வரும், வெளிச்செல்லும் ஒவ்வொரு செய்தியும் சேமிக்கப்பட்டு உங்கள் டாஷ்போர்டில் தெரியும்; கூட்ட நேரத்தில் எதுவும் தவறிப்போகாது.",
      feature8Title: "சேனல் அடிப்படையிலான அனலிட்டிக்ஸ்",
      feature8Body:
        "WhatsApp வழியாக வரும் ஆர்டர்கள் தானாகவே டேக் செய்யப்படும். ஆப் vs வலைத்தளம் vs WhatsApp ஆர்டர் எண்ணிக்கையையும் வருவாயையும் அருகருகே பாருங்கள்.",
      frictionHeading: "தட்டுகளை எண்ணுங்கள். வாடிக்கையாளர்கள் எண்ணுகிறார்கள்.",
      frictionSubheading:
        "பசிக்கும் ஆர்டருக்கும் இடையே உள்ள ஒவ்வொரு கூடுதல் படியும் ஒரு வாடிக்கையாளரை இழக்க வைக்கும். ஒரே ஆர்டர், இரண்டு வழிகள்.",
      frictionAggregatorLabel: "அக்ரிகேட்டர் ஆப்",
      frictionAggregatorStep1: "ஆப்பை நிறுவுங்கள்",
      frictionAggregatorStep2: "பதிவு + OTP சரிபார்ப்பு",
      frictionAggregatorStep3: "உங்கள் உணவகத்தைத் தேடுங்கள்",
      frictionAggregatorStep4: "ஆர்டர் (அவர்கள் 20–33% எடுப்பார்கள்)",
      frictionAggregatorStep5: "வாடிக்கையாளர் யாரென்றே உங்களுக்குத் தெரியாது",
      frictionWhatsappLabel: "WhatsApp ஆர்டரிங்",
      frictionWhatsappStep1: "“Hi” அனுப்புங்கள்",
      frictionWhatsappStep2: "Order Now தட்டுங்கள் (தானாக உள்நுழைவு)",
      frictionWhatsappStep3: "உங்கள் மெனுவில் ஆர்டர்",
      frictionHighlight: "ஆர்டர் மதிப்பில் 100% உங்களுக்கே.",
      comparisonHeading: "ஒப்பீட்டில் எப்படி நிற்கிறது.",
      comparisonSubheading:
        "Menuthere WhatsApp ஆர்டரிங் vs. உணவு அக்ரிகேட்டர்கள் vs. பொதுவான “சாட்பாட்” ஆர்டரிங் கருவிகள்.",
      comparisonColAggregators: "உணவு அக்ரிகேட்டர்கள்",
      comparisonColChatbots: "பொது சாட்பாட்கள்",
      comparisonValueYes: "உண்டு",
      comparisonValueNo: "இல்லை",
      comparisonRow1Label: "ஒரு ஆர்டருக்கு கமிஷன்",
      comparisonRow1Aggregator: "20–33%",
      comparisonRow1Chatbot: "மாதக் கட்டணம் + செய்திக்குக் கட்டணம்",
      comparisonRow2Label: "ஆப் டவுன்லோட் தேவையா",
      comparisonRow2Us: "ஒருபோதும் இல்லை",
      comparisonRow3Label: "வாடிக்கையாளர் லாகின் / OTP",
      comparisonRow3Us: "தானாகவே — எதுவும் இல்லை",
      comparisonRow3Aggregator: "கணக்கு + OTP",
      comparisonRow3Chatbot: "பொதுவாகத் தேவை",
      comparisonRow4Label: "ஆர்டர் அனுபவம்",
      comparisonRow4Us: "படங்களுடன் முழு மெனு",
      comparisonRow4Aggregator: "அவர்கள் ஆப்பிற்குள்",
      comparisonRow4Chatbot: "சாட்டில் உணவைத் தட்டச்சு செய்ய வேண்டும்",
      comparisonRow5Label: "உங்கள் சொந்த எண்ணிலிருந்து அனுப்பும்",
      comparisonRow5Chatbot: "சில சமயம்",
      comparisonRow6Label: "நேரடி ஆர்டர் + டெலிவரி கண்காணிப்பு",
      comparisonRow6Us: "WhatsApp-இல்",
      comparisonRow6Aggregator: "அவர்கள் ஆப்பில்",
      comparisonRow6Chatbot: "அரிதாகவே",
      comparisonRow7Label: "வாடிக்கையாளர் தரவு உங்களுக்கே",
      comparisonRow7Us: "ஆம், முழுமையாக",
      comparisonRow7Chatbot: "ஓரளவு",
      comparisonRow8Label: "அமைக்கும் நேரம்",
      comparisonRow8Us: "சில நிமிடங்கள்",
      comparisonRow8Aggregator: "வாரக்கணக்கில் ஆன்போர்டிங்",
      comparisonRow8Chatbot: "நாட்கள் + ஸ்கிரிப்டிங்",
      outcome1Value: "≈ 10 வினாடி",
      outcome1Label: "“Hi”-யிலிருந்து வாடிக்கையாளர் கையில் லைவ் ஆர்டரிங் லிங்க் வரை.",
      outcome2Label: "கமிஷன். ஆர்டர் மதிப்பின் ஒவ்வொரு ரூபாயும் உங்களுக்கே.",
      outcome3Value: "முழுப் பயணமும்",
      outcome3Label:
        "ஆர்டர் → ஏற்பு → டெலிவரிக்குப் புறப்பாடு → கண்காணிப்பு, அனைத்தும் WhatsApp-இல்.",
      faqHeading: "கேள்விகள், பதில்கள்.",
      faq1Question: "என் வாடிக்கையாளர்கள் ஏதாவது நிறுவ வேண்டுமா?",
      faq1Answer:
        "தேவையில்லை. WhatsApp இருந்தால் போதும், ஆர்டர் செய்யலாம். “Hi” அனுப்பி, Order Now லிங்கைத் தட்டினால் உங்கள் மெனுவில் — ஏற்கனவே உள்நுழைந்த நிலையில் — வந்துவிடுவார்கள். டவுன்லோட் செய்ய ஆப்பும் இல்லை, உருவாக்க கணக்கும் இல்லை.",
      faq2Question: "வாடிக்கையாளர் சாட்டிலேயே ஆர்டரைத் தட்டச்சு செய்ய வேண்டுமா?",
      faq2Answer:
        "இல்லை — அதுதான் முக்கியம். WhatsApp என்பது நுழைவாயில், செக்அவுட் அல்ல. “Hi” அவர்களுக்கு உங்கள் உண்மையான மெனுவுக்கான உடனடி லிங்கைத் தரும் — படங்கள், வகைகள், தேடலுடன். ஆர்டர் வேகமாக முடியும், தவறுகளும் அரிது. நிலை புதுப்பிப்புகள் மட்டும் WhatsApp-இல் வரும்.",
      faq3Question: "என் சொந்த WhatsApp எண்ணிலிருந்து அனுப்ப முடியுமா?",
      faq3Answer:
        "முடியும். Meta-வின் அதிகாரப்பூர்வ ஆன்போர்டிங் வழியாக சில நிமிடங்களில் உங்கள் சொந்த WhatsApp Business எண்ணை இணைக்கலாம் — WhatsApp Business ஆப்பில் ஏற்கனவே பயன்படுத்தும் எண்ணையும் சேர்த்து. அமைப்பே வேண்டாமா? எங்கள் பொது எண்ணில் உடனே லைவ் ஆகி, பிறகு மாற்றிக்கொள்ளலாம்.",
      faq4Question: "ஆர்டரிங் லிங்கைப் பகிர்வது பாதுகாப்பானதா?",
      faq4Answer:
        "ஒவ்வொரு லிங்கும் கிரிப்டோகிராஃபிக் முறையில் கையொப்பமிடப்பட்டு, சில நிமிடங்களில் காலாவதியாகி, முதலில் திறப்பவருக்கே பூட்டப்படும். யாராவது அதைப் பகிர்ந்தால் வேறு யாருக்கும் அது வேலை செய்யாது — உள்நுழைந்த அமர்வு ஒருபோதும் கசியாது.",
      faq5Question: "ஆர்டர் செய்த பிறகு வாடிக்கையாளருக்கு என்ன கிடைக்கும்?",
      faq5Answer:
        "ஒவ்வொரு கட்டத்திற்கும் தானியங்கி WhatsApp செய்திகள்: முழு பில்லுடன் ஆர்டர் பெறப்பட்டது, ஏற்கப்பட்டது, உணவு தயார், நேரடி டிராக்கிங் லிங்குடன் டெலிவரிக்குப் புறப்பட்டது, நிறைவு, மற்றும் (விசுவாசத் திட்டம் இருந்தால்) பெற்ற விசுவாசப் புள்ளிகள்.",
      faq6Question: "Menuthere எவ்வளவு கமிஷன் எடுக்கிறது?",
      faq6Answer:
        "ஆர்டர்களுக்கு கமிஷனே இல்லை. WhatsApp ஆர்டரிங் உங்கள் சொந்த நேரடி சேனலின் ஒரு பகுதி — ஒவ்வொரு ஆர்டர் மதிப்பிலும் 100% உங்களுக்கே, பணமும் நேராக உங்கள் வங்கிக்கே வந்துசேரும்.",
      faqCtaPrompt: "ஒரே “Hi”-யில் வாடிக்கையாளர்கள் ஆர்டர் செய்யத் தயாரா?",
      faqSecondaryLink: "கமிஷன் இல்லாத ஆர்டரிங்கைப் பாருங்கள்",
      trialHeading: "2 நிமிடத்திற்குள் உங்கள் WhatsApp ஆர்டரிங் அமைப்பைத் தொடங்குங்கள்.",
      trialDescription:
        "உங்கள் WhatsApp எண்ணை இணையுங்கள், மெனுவைப் பதிவேற்றுங்கள், ஒரே “Hi”-யில் வாடிக்கையாளர்கள் ஆர்டர் செய்யட்டும் — தானியங்கி-லாகின் லிங்க், நேரடி நிலை புதுப்பிப்புகள், கமிஷன் பூஜ்ஜியம். Menuthere-உடன் ஏற்கனவே வளர்ந்து வரும் 600+ உணவகங்களுடன் இணையுங்கள்.",
    },
  },

  solutionsSlug: {
    heroPrimaryCta: "இலவசமாகத் தொடங்கு",
    heroSecondaryCta: "டெமோ முன்பதிவு",
    benefitsHeadingLead: "ஏன் Menuthere,",
    benefitsHeadingIndustry: "{industry} வணிகத்திற்கு?",
    benefitsHeadingIndustryFallback: "உங்கள்",
    benefitsSubheading: "உங்கள் துறைக்கென்றே சிறப்பாக வடிவமைக்கப்பட்ட அம்சங்கள்.",
    featuresHeadingLead: "வெற்றிபெறத் தேவையான",
    featuresHeadingEmphasis: "அனைத்தும்.",
    featuresSubheading:
      "உங்கள் மெனுவை நவீனமாக்கி வாடிக்கையாளர்களை மகிழ்விக்க வடிவமைக்கப்பட்ட முழுமையான தொகுப்பு.",
    featuresCtaCardHeading: "தொடங்கத் தயாரா?",
    featuresCtaCardBody:
      "தங்கள் மெனு அனுபவத்தை மாற்றியமைக்க Menuthere-ஐ ஏற்கனவே பயன்படுத்தும் ஆயிரக்கணக்கான வணிகங்களுடன் இணையுங்கள்.",
    featuresCtaCardButton: "இலவச டிரையலைத் தொடங்கு",
    useCasesHeadingLead: "ஒவ்வொரு வகை",
    useCasesHeadingIndustry: "{industry} வணிகத்திற்கும் ஏற்றது.",
    useCasesHeadingIndustryFallback: "உங்கள்",
    faqHeadingLead: "அடிக்கடி கேட்கப்படும்",
    faqHeadingEmphasis: "கேள்விகள்.",
    notFoundMetaTitle: "தீர்வு கிடைக்கவில்லை",
    breadcrumbHome: "முகப்பு",
    breadcrumbSolutions: "தீர்வுகள்",
  },

  downloadApp: {
    heroHeadingLead: "Menuthere —",
    heroHeadingHighlight: "மொபைல் & டெஸ்க்டாப்பில்.",
    heroSubheading:
      "வெளியில் இருந்தாலும், மேசையில் இருந்தாலும் உங்கள் உணவகத்தை நிர்வகியுங்கள். நேரடி ஆர்டர் அறிவிப்புகள், மெனு புதுப்பிப்பு, விற்பனைக் கண்காணிப்பு — எல்லா சாதனங்களிலும்.",
    appStoreBadgePrefix: "இதிலிருந்து பதிவிறக்கு",
    playStoreBadgePrefix: "இதில் கிடைக்கும்",
    windowsBadgePrefix: "இதற்குப் பதிவிறக்கு",
    windowsBadgePlatform: "Windows",
    heroImageAlt: "Menuthere ஆப் இடைமுகம்",
  },

  blog: {
    metaTitle: "வலைப்பதிவு | Menuthere - உணவகம் & கஃபே இன்சைட்ஸ்",
    metaDescription:
      "டிஜிட்டல் மெனு, QR கோடு, Google Business ஒத்திசைவு மற்றும் உணவு வணிக வளர்ச்சி குறித்த குறிப்புகள், வழிகாட்டிகள், இன்சைட்ஸ் — உணவக உரிமையாளர்களுக்காக.",
    ogTitle: "வலைப்பதிவு | Menuthere",
    ogDescription:
      "டிஜிட்டல் மெனு, QR கோடு மற்றும் உணவு வணிக வளர்ச்சி குறித்த குறிப்புகள், வழிகாட்டிகள், இன்சைட்ஸ் — உணவக உரிமையாளர்களுக்காக.",
    heroHeading: "சமீபத்திய புதுப்பிப்புகளும் இன்சைட்ஸும்",
    heroHeadingAccent: "Menuthere-இலிருந்து",
    categoryLabel: "வலைப்பதிவு",
    emptyState: "இதுவரை கட்டுரைகள் எதுவும் வெளியிடப்படவில்லை. விரைவில் வரும்!",
    postMetaTitleTemplate: "{title} | Menuthere வலைப்பதிவு",
    postNotFoundMetaTitle: "பதிவு கிடைக்கவில்லை",
    backToIndexLink: "← வலைப்பதிவு",
    relatedHeading: "மேலும் கட்டுரைகள்",
  },
};

export default ta;
