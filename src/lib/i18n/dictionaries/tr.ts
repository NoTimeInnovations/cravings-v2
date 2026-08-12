import type { Dictionary } from "./en";

/**
 * Turkish. Typed as `Dictionary`, so this file cannot drift from the
 * English source: add a key to en.ts and TypeScript fails here until it is
 * translated, rather than letting English leak onto a Turkish page.
 *
 * Brand nouns (Menuthere, WhatsApp, Google, Product Hunt, QR, POS) stay in
 * Latin script on purpose — that is how the Turkish market writes them.
 */
const tr: Dictionary = {
  common: {
    language: "Dil",
    changeLanguage: "Dili değiştir",
  },
  nav: {
    products: "Ürünler",
    solutions: "Çözümler",
    businesses: "İşletmeler",
    pricing: "Fiyatlar",
    resources: "Kaynaklar",
    blog: "Blog",
    login: "Giriş yap",
    bookDemo: "Demo talep et",
    getStarted: "Ücretsiz başla",
    openMenu: "Menüyü aç",
    closeMenu: "Menüyü kapat",
  },
  navItems: {
    ownDeliveryWebsite: {
      title: "Kendi Sipariş Siteniz",
      description: "Komisyonsuz teslimat platformu",
    },
    digitalMenuCreator: {
      title: "Dijital Menü Oluşturucu",
      description: "Masadan sipariş için QR menüler",
    },
    pos: {
      title: "Satış Noktası (POS)",
      description: "Adisyon ve operasyonu yönetin",
    },
    tableOrdering: {
      title: "Masadan Sipariş",
      description: "Misafirler için kusursuz deneyim",
    },
    captainOrdering: {
      title: "Garson Siparişi",
      description: "Personel için hızlı sipariş alma",
    },
    googleBusinessSync: {
      title: "Google Business Senkronu",
      description: "Menüyü Google Maps'e aktarın",
    },
    owners: {
      title: "İşletme Sahipleri",
      description: "Operasyonu yönetin, ciroyu büyütün",
    },
    agencies: {
      title: "Ajanslar",
      description: "Birden çok müşteriyi kolayca yönetin",
    },
    restaurants: {
      title: "Restoranlar",
      description: "Salon servisi için akıllı dijital menüler",
    },
    cafes: {
      title: "Kafeler ve Kahveciler",
      description: "Mükemmel kahveye yakışan menüler",
    },
    bakeries: {
      title: "Fırın ve Pastaneler",
      description: "Taze ürünlerinizi şık şekilde sergileyin",
    },
    cloudKitchens: {
      title: "Bulut Mutfaklar",
      description: "Çoklu marka menü yönetimi",
    },
    hotels: {
      title: "Oteller ve Tatil Köyleri",
      description: "Misafirlere zarif bir yeme içme deneyimi",
    },
    foodTrucks: {
      title: "Food Truck'lar",
      description: "Yolda da yanınızda olan menüler",
    },
    bars: {
      title: "Barlar ve Pub'lar",
      description: "Tarz sahibi, dinamik içki menüleri",
    },
  },
  hero: {
    productHunt: "Product Hunt'ta yayında",
    headlineA: "Siparişleriniz sizin.",
    headlineB: "Müşterileriniz de.",
    subhead:
      "Aracı platformların %30'luk payını unutun. Menuthere, markanıza özel sipariş ve teslimat platformunu dakikalar içinde kurar.",
    searchPlaceholder: "\"{name}\" ara",
    generate: "Oluştur",
    working: "Çalışıyor…",
    clear: "Temizle",
    pickFromDropdown: "İşletmenizi listeden seçin",
    bulletNoCommission: "Komisyon yok",
    bulletYourBrand: "Kendi markanız",
    bulletLiveInMinutes: "Dakikalar içinde yayında",
    whatsappTitle: "WhatsApp'tan Sipariş",
    whatsappNew: "Yeni",
    whatsappBlurb: "Müşteriler WhatsApp'tan sipariş verir — uygulama yok, giriş yok.",
    whatsappExplore: "WhatsApp siparişini keşfet",
    trustedBy: "Markasını büyüten restoranların tercihi",
  },
  footer: {
    solutions: "Çözümler",
    resources: "Kaynaklar",
    legal: "Yasal",
    tagline: "Restoranlar için komisyonsuz sipariş.",
    rights: "Tüm hakları saklıdır.",
  },
  metadata: {
    title: "Menuthere | Restoranlara Özel Online Sipariş ve Teslimat",
    description:
      "Petpooja POS entegrasyonu, anlık siparişler ve analizlerle restoranınıza özel teslimat uygulamasını açın. Hindistan genelinde 600+ restoranın tercihi.",
  },

  solutionsOwners: {
    metaTitle: "Restoran Sahiplerine Özel Çözümler | Menuthere",
    metaDescription:
      "Menuthere ile restoranınızın kontrolünü geri alın. Menü, POS, garson ve stok yönetimi tek panelde. Sıfır komisyon, maksimum kâr.",
    heroPrimaryCta: "Hemen başla",
    heroSecondaryCta: "Demo talep et",
    benefitsHeading: "İşletme sahipleri için neden",
    benefitsHeadingAccent: "Menuthere?",
    reviewsHeading: "Restoran sahiplerinin",
    reviewsHeadingAccent: "favorisi.",
  },
  solutionsAgencies: {
    metaTitle: "Ajans Ortaklık Programı | Sürekli Komisyon | Menuthere",
    metaDescription:
      "Menuthere'in yetkili iş ortağı olun. Restoranlara premium dijital menü çözümleri satarak ömür boyu %30'a varan yinelenen komisyon kazanın.",
    heroBadge: "Ajans Ortaklık Programı",
    heroApplyCta: "Hemen başvur",
    heroDemoCta: "Demo talep et",
    problemHeading: "Restoranlara Ciro Kazandırın,",
    problemHeadingAccent: "Kendinize de",
    problemBody:
      "Bağımsız restoranlar, anlık değişiklikleri yansıtamayan statik PDF'ler yüzünden satış kaybediyor. Menuthere iş ortağı olarak bu sorunu ayda 30 $'lık kanıtlanmış platformumuzla ve 600'den fazla işletmenin güvendiği anında QR güncellemeleriyle çözer, onların baş danışmanı konumuna yerleşirsiniz.",
    benefitsHeading: "Neden bizimle",
    benefitsHeadingAccent: "çalışmalısınız?",
    earningsBadge: "Yüksek Kazanç Potansiyeli",
    earningsHeading: "Performansa Dayalı Komisyon",
    earningsHeadingAccent: "Yapısı.",
    earningsSubheading:
      "Ödemeler doğrudan ciroya bağlı. Abonelik geliri bize ulaştığı gün, Stripe üzerinden aylık ödeme.",
    earningsTableTierHeader: "Kademe",
    earningsTableRevenueHeader: "Ömür Boyu Yönlendirilen Ciro",
    earningsTableCommissionHeader: "Komisyon (30 $ Abonelik Başına)",
    tierStarterName: "Başlangıç",
    tierStarterRevenue: "0 $ – 1.000 $",
    tierStarterRate: "20%",
    tierStarterPayout: "(ayda 6 $)",
    tierStarterPayoutPerSub: "abonelik başına ayda 6 $",
    tierGrowthName: "Büyüme",
    tierGrowthRevenue: "1.001 $ – 5.000 $",
    tierGrowthRate: "25%",
    tierGrowthPayout: "(ayda 7,50 $)",
    tierGrowthPayoutPerSub: "abonelik başına ayda 7,50 $",
    tierEliteName: "Elit",
    tierEliteRevenue: "5.001 $+",
    tierEliteRate: "30%",
    tierElitePayout: "(ayda 9 $)",
    tierElitePayoutPerSub: "abonelik başına ayda 9 $",
    tierCardRevenueLabel: "Ciro",
    tierCardCommissionLabel: "Komisyon",
    processHeading: "İş ortağı katılım",
    processHeadingAccent: "süreci.",
    processStepOneTitle: "Başvuru İncelemesi",
    processStepOneDescription:
      "Hızlı onay ve bayi portalı erişimi (demo bağlantıları, markalı materyaller).",
    processStepTwoTitle: "Sahaya Çıkış",
    processStepTwoDescription:
      "Restoranları hedefleyin, 5 dakikalık demolar yapın ve anlaşmayı bağlayın.",
    processStepThreeTitle: "Gelir Paylaşımı",
    processStepThreeDescription:
      "Otomatik takip ve tahsil edilen tutarlar için aynı gün ödeme.",
    idealPartnerHeading: "Aradığımız",
    idealPartnerHeadingAccent: "Stratejik Ortaklar",
    idealPartnerBody:
      "Restoranlarla ilişki kurmayı bilen, sahada denenmiş satış profesyonelleri. Kanıtlanmış performansa açık, seçici bir program.",
    partnerTypeRestaurantAdvisors: "Restoran Danışmanları",
    partnerTypeChannelPartners: "B2B Kanal Ortakları",
    partnerTypeSalesExecutives: "Satış Yöneticileri",
    partnerTypeFranchiseSpecialists: "Franchise Uzmanları",
    partnerTypeSaasResellers: "SaaS Bayileri",
    partnerTypeBizDevPros: "İş Geliştirme Uzmanları",
    faqHeading: "İş ortaklığı",
    faqHeadingAccent: "SSS.",
    faqProductOverviewQuestion: "Ürüne genel bakış",
    faqProductOverviewAnswer:
      "Dünya genelindeki restoranlar için ayda 30 $'lık premium QR dijital menü platformu.",
    faqExperienceRequiredQuestion: "Gereken deneyim",
    faqExperienceRequiredAnswer:
      "Saha satış tecrübesi; tüm materyaller tarafımızdan sağlanır.",
    faqPayoutMechanicsQuestion: "Ödeme işleyişi",
    faqPayoutMechanicsAnswer:
      "Tahsilat günü Stripe üzerinden aylık ödeme; aktif abonelik sürdükçe ömür boyu.",
    faqCostsInvolvedQuestion: "Maliyetler",
    faqCostsInvolvedAnswer: "Sıfır; tamamen komisyon esaslı.",
    faqTerritoryQuestion: "Bölge",
    faqTerritoryAnswer: "Dünya genelinde bağımsız işletmeler; öncelik ABD.",
    faqResourcesQuestion: "Kaynaklar",
    faqResourcesAnswer:
      "Videolar, satış metinleri ve sunumların bulunduğu portal; sıcak müşteri adayları mevcut.",
    trustBadgeDeployments: "600+ Aktif Kurulum",
    trustBadgeFieldTested: "Sahada Denenmiş Model",
    trustBadgeRevenueShare: "Yalnızca Gelir Paylaşımı",
    trustBadgeExclusiveAccess: "Ayrıcalıklı Erişim",
    termsHeading: "İş Ortaklığı Programı Koşulları",
    termsIncomeContinuity:
      "Gelir sürekliliği: Komisyonlar yalnızca aktif abonelikler için devam eder.",
    termsTerminationRights:
      "Fesih hakkı: Menuthere, marka uyumsuzluğu durumunda ortaklığı sonlandırma hakkını saklı tutar.",
    termsPayoutTiming:
      "Ödeme zamanı: Abonelik tahsilatının yapıldığı gün, kesintiler düşülerek.",
    termsEligibility:
      "Uygunluk: Dünya genelinden ortaklar kabul edilir; onaya tabidir.",
  },
  solutionsIndex: {
    metaTitle: "Her Yeme İçme İşletmesine Dijital Menü | Menuthere",
    metaDescription:
      "Akıllı dijital menülerle işletmenizi dönüştürün. Restoran, kafe, fırın, bulut mutfak, otel ve barlar için QR menü, anlık güncelleme, Google Business senkronu.",
    ogTitle: "Dijital Menü Çözümleri | Menuthere",
    ogDescription:
      "Restoranlar, kafeler, fırınlar ve dahası için akıllı dijital menüler. Anlık güncelleme, şık tasarımlar, sıfır baskı maliyeti.",
    heroTitleLead: "İşletmenizi",
    heroTitleEmphasis: "dönüştüren",
    heroTitleTail: "dijital menüler.",
    heroSubtitle:
      "İster küçük bir kafe, ister yoğun bir restoran, ister bulut mutfak imparatorluğu işletin — platformumuz sizin ihtiyaçlarınıza uyum sağlar.",
    heroPrimaryCta: "Ücretsiz başla",
    heroSecondaryCta: "Demo talep et",
    industriesHeadingLead: "Sektörünüzü seçin,",
    industriesHeadingEmphasis: "hemen başlayın.",
    industriesIntro:
      "Yeme içme işletmenizin türüne özel olarak tasarlanmış dijital menü çözümleri.",
    cardRestaurantsTitle: "Restoranlar",
    cardRestaurantsDesc: "Kusursuz salon servisi için akıllı dijital menüler",
    cardCafesTitle: "Kafeler ve Kahveciler",
    cardCafesDesc: "Mükemmel kahve deneyimine yakışan modern menüler",
    cardBakeriesTitle: "Fırınlar ve Pastaneler",
    cardBakeriesDesc: "Taze ürünlerinizi en şık haliyle sergileyin",
    cardCloudKitchensTitle: "Bulut Mutfaklar",
    cardCloudKitchensDesc: "Çoklu marka menü yönetimi artık çok kolay",
    cardHotelsTitle: "Oteller ve Tatil Köyleri",
    cardHotelsDesc: "Misafirlere zarif yeme içme deneyimleri",
    cardFoodTrucksTitle: "Food Truck'lar",
    cardFoodTrucksDesc: "Nereye giderseniz gidin yanınızdaki menüler",
    cardBarsTitle: "Barlar ve Pub'lar",
    cardBarsDesc: "Tarz sahibi, dinamik içki menüleri",
    cardCateringTitle: "Catering Hizmetleri",
    cardCateringDesc: "Her etkinliğe profesyonel menüler",
    cardOwnersTitle: "Restoran Sahipleri",
    cardOwnersDesc: "Restoranınızın operasyon kontrolünü geri alın",
    cardAgenciesTitle: "Ajanslar ve Danışmanlar",
    cardAgenciesDesc: "Birden çok müşteri hesabını kolayca yönetin",
    cardPetpoojaTitle: "Doğrudan Sipariş ve PetPooja",
    cardPetpoojaDesc: "Zomato ve Swiggy'ye komisyonsuz alternatif",
    cardWhatsappOrderingTitle: "WhatsApp'tan Sipariş",
    cardWhatsappOrderingDesc:
      "Müşteriler sadece “Merhaba” yazarak sipariş verir — uygulama yok, kayıt yok",
    cardLearnMoreLink: "Daha fazla bilgi",
    featuresHeadingLead: "Güçlü özellikler,",
    featuresHeadingEmphasis: "her işletme için.",
    featureQrTitle: "QR Menüler",
    featureQrDesc: "Telefonla taratın, anında açılsın. Uygulama indirmeye gerek yok.",
    featureRealtimeTitle: "Anlık Güncelleme",
    featureRealtimeDesc: "Fiyat değiştirin, ürün ekleyin, tükendi işaretleyin — anında.",
    featureGoogleSyncTitle: "Google Business Senkronu",
    featureGoogleSyncDesc: "Google Business Profile menünüz otomatik güncellensin.",
    featureAnalyticsTitle: "Analiz ve İçgörüler",
    featureAnalyticsDesc: "Popüler ürünleri ve müşteri tercihlerini takip edin.",
    googleBadge: "Google Business Entegrasyonu",
    googleHeading: "Menünüzü Google Business Profile ile senkronize edin",
    googleBody:
      "Her değişiklik yaptığınızda Google Business Profile menünüz otomatik güncellensin. Sizi Google Maps'te arayan müşteriler her zaman en güncel menünüzü görsün.",
    googleBenefitOneClickSync: "Google Business Profile'a tek tıkla senkron",
    googleBenefitRealtimeUpdates: "Tüm platformlarda anlık menü güncellemesi",
    googleBenefitLocalSeo: "Daha güçlü yerel SEO ve görünürlük",
    googleBenefitMoreCustomers: "Google Arama ve Maps'ten daha çok müşteri",
    googleManagerLink: "Google Business Manager hakkında bilgi alın",
    googleCardTitle: "Google Business Profile",
    googleCardSubtitle: "Menü Yöneticisi",
    googleCardSyncedLabel: "Senkronize Edilen Ürün",
    googleCardLastSyncLabel: "Son Senkron",
    googleCardLastSyncValue: "Az önce",
  },
  getStarted: {
    metaTitle: "Hemen Başlayın | Menuthere",
    metaDescription: "Menuthere ile dijital menünüzü oluşturun.",
    stepIndicator: "Adım {step}/3",
    publishingLoader1: "Hesabınız oluşturuluyor...",
    publishingLoader2: "Dijital menünüz hazırlanıyor...",
    publishingLoader3: "Panel yapılandırılıyor...",
    publishingLoader4: "Neredeyse tamam...",
    step1Title: "Menünüzü Yükleyin",
    step1Subtitle: "Menünüzün fotoğrafını çekin, biz anında dijitalleştirelim.",
    filesSelectedCount: "{count} dosya seçildi",
    uploadDropzonePrompt: "Yüklemek için tıklayın, sürükleyip bırakın veya yapıştırın",
    uploadFormatsHint: "JPG, PNG, PDF — en fazla 10 MB",
    uploadAddMoreHint: "Daha fazlası için alana tıklayın",
    fileTooLargeBadge: "Çok büyük ({size} MB)",
    filePreviewAlt: "Sayfa {number}",
    aiInstructionLabel: "Yapay zekâmız için yönergeler",
    optionalSuffix: "(isteğe bağlı)",
    aiInstructionPlaceholder:
      "Menünüzde özel bir durum var mı? Örn. \"İçecekleri atla\", \"Combo'ları ayrı kategori say\", \"Fiyatlar AED cinsinden\"",
    aiInstructionHint:
      "Yapay zekâ dosyalarınızı okurken sizin yönergeniz önceliklidir.",
    removeInvalidFilesButton: "Devam etmek için geçersiz dosyaları kaldırın",
    nextStepButton: "Sonraki adım",
    uploadOrDivider: "veya",
    sampleMenuButton: "Örnek menüyle dene",
    sampleMenuDialogTitle: "Bir Örnek Menü Seçin",
    sampleMenuDialogSubtitle:
      "Hazır bir menüyle başlamak için işletme türünü seçin.",
    sampleMenuComingSoonBadge: "Yakında",
    filesTooLargeToast:
      "{count} dosya 10 MB sınırını aşıyor. Lütfen daha küçük dosyalar yükleyin.",
    filesAddedToast: "{count} dosya eklendi!",
    sampleMenuLoadedToast: "\"{name}\" örnek menüsü yüklendi!",
    step2Title: "Restoran Bilgileri",
    step2Subtitle:
      "Menünüzü kişiselleştirebilmemiz için işletmenizden biraz bahsedin.",
    restaurantNameLabel: "Restoran Adı",
    restaurantNamePlaceholder: "örn. The Burger Joint",
    usernameLabel: "Kullanıcı Adı",
    usernamePlaceholder: "isletme_adiniz",
    usernameCheckingStatus: "Uygunluk kontrol ediliyor...",
    usernameAvailableStatus: "Kullanıcı adı uygun",
    usernameTakenStatus: "Bu kullanıcı adı zaten alınmış",
    usernameMinLengthHint: "Kullanıcı adı en az 3 karakter olmalı",
    phoneNumberLabel: "Telefon Numarası",
    phoneCodePlaceholder: "Kod",
    phoneInvalidError: "Geçersiz telefon numarası",
    countryLabel: "Ülke",
    countryPlaceholder: "Ülke seçin veya yazın",
    addressLabel: "Adres",
    addressPlaceholder: "Sokak, semt, şehir…",
    currencyLabel: "Para Birimi",
    currencyPlaceholder: "Para birimi seçin veya arayın",
    currencySearchPlaceholder: "Para birimi ara (örn. USD, Euro, ₺)",
    currencySelectFallback: "Para Birimi Seç",
    currencyNoMatch: "Sonuç yok",
    logoLabel: "Logo (isteğe bağlı)",
    logoPreviewAlt: "Logo önizlemesi",
    changeLogoButton: "Logoyu değiştir",
    uploadLogoButton: "Logo yükle",
    removeLogoButton: "Kaldır",
    logoSizeLabel: "Boyut (%)",
    logoBackgroundLabel: "Arka plan",
    createMenuButton: "Menüyü oluştur",
    logoNotAnImageToast: "Logo için lütfen bir görsel dosyası seçin",
    logoTooLargeToast: "Logo 10 MB'ın altında olmalı",
    logoReadFailedToast: "Bu görsel okunamadı",
    missingDetailsToast: "Lütfen tüm bilgileri doldurun",
    invalidPhoneToast: "Lütfen geçerli bir telefon numarası girin",
    extractingTitle: "Menünüz Çıkarılıyor",
    extractingSubtitle: "Menü görselinizi işlerken lütfen bekleyin...",
    extractionErrorTitle: "Çıkarma Başarısız",
    menuUnreadableError:
      "Menünüzü okuyamadık. Lütfen daha net dosyalar deneyin veya ürünleri elle ekleyin.",
    extractionFailedToast: "Menü çıkarılamadı. Lütfen tekrar deneyin.",
    retryExtractionButton: "Tekrar dene",
    cancelExtractionButton: "İptal et ve yeniden yükle",
    step3Title: "Menünüz Hazır!",
    step3Subtitle: "{count} ürün çıkardık. Şimdi temanızı özelleştirin.",
    themePickerTitle: "Bir Tema Seçin",
    themeSwatchSample: "Aa",
    themeClassicLabel: "Klasik",
    themeMidnightLabel: "Gece",
    themeFreshLabel: "Ferah",
    publishButton: "Yayına al",
    authModalSignInTitle: "Yayınlamak için giriş yapın",
    authModalEmailHint: "Panel giriş bilgilerinizi e-postanıza göndereceğiz.",
    googleSignInButton: "Google ile giriş yap",
    authDividerOr: "veya",
    emailPlaceholder: "siz@ornek.com",
    continueWithEmailButton: "E-posta ile devam et",
    authModalPasswordTitle: "Bir şifre oluşturun",
    authModalPasswordHint: "Panel hesabınız için bir şifre belirleyin.",
    passwordPlaceholder: "Şifre (en az 6 karakter)",
    confirmPasswordPlaceholder: "Şifreyi onaylayın",
    continueButton: "Devam et",
    invalidEmailToast: "Lütfen geçerli bir e-posta adresi girin",
    passwordTooShortToast: "Şifre en az 6 karakter olmalı",
    passwordMismatchToast: "Şifreler eşleşmiyor",
    emailAlreadyRegisteredToast:
      "Bu e-posta zaten kayıtlı. Lütfen farklı bir e-posta kullanın.",
    googleSignInSuccessToast: "Google ile giriş yapıldı!",
    googleSignInFailedToast: "Google ile giriş başarısız. Lütfen tekrar deneyin.",
    publishSuccessToast: "Menü yayınlandı! Panele yönlendiriliyorsunuz...",
    publishFailedToast: "Kayıt tamamlanamadı. Lütfen tekrar deneyin.",
    successTitle: "E-postanızı Kontrol Edin!",
    successSubtitle:
      "Menü bağlantınızı ve panel giriş bilgilerinizi şuraya gönderdik:",
    successSpamHint:
      "Bulamadınız mı? Spam klasörünüze bakın veya aşağıdan e-postanızı güncelleyin.",
    successMobileSubtitle:
      "Menü bağlantınızı ve panel bilgilerinizi e-postanıza gönderdik.",
    changeEmailButton: "E-posta yanlış mı? Değiştir",
    loginToDashboardButton: "Panele giriş yap",
    changeEmailTitle: "E-postayı Değiştir",
    changeEmailSubtitle:
      "Doğru e-posta adresinizi girin. Menü bağlantınızı ve panel bilgilerinizi oraya gönderelim.",
    newEmailLabel: "Yeni E-posta Adresi",
    updatingEmailButton: "Güncelleniyor...",
    updateAndResendButton: "Güncelle ve gönder",
    emailUpdatedToast: "E-posta güncellendi! Yeni gelen kutunuzu kontrol edin.",
    emailUpdateFailedToast: "E-posta güncellenemedi. Lütfen tekrar deneyin.",
  },
  helpCenter: {
    metaTitle: "Yardım ve Destek | Menuthere Dijital Menü",
    metaDescription:
      "Menuthere dijital menünüzle ilgili yardım alın. SSS, WhatsApp desteği ve e-posta. Menü yönetimi ve kampanyalar hakkında hızlı yanıtlar.",
    heroTitle: "Yardım ve",
    heroTitleAccent: "Destek.",
    heroSubtitle:
      "Desteğe mi ihtiyacınız var? Bize e-posta gönderin ya da doğrudan WhatsApp'tan yazın.",
    faqSectionTitle: "Sıkça sorulan",
    faqSectionTitleAccent: "sorular.",
    faq1Question:
      "Müşterilerin Google'da veya uygulamalarda eski menüyü görmesini nasıl engellerim?",
    faq1Answer:
      "Ürün, fiyat, açıklama veya stok durumu gibi tüm değişiklikler dijital menünüze anında yansır. Panelinizden Menüyü Görüntüle'ye tıklayarak doğrulayabilirsiniz; bekleme ya da yeniden baskı yok.",
    faq2Question: "Tükenen ürünler QR/dijital menümde hâlâ görünüyor, neden?",
    faq2Answer:
      "Menü bölümünde üstteki Stok Durumu'na tıklayın. Kategorilerin ya da tek tek ürünlerin tamamını tek tıkla açıp kapatın; tükenen ürünler her yerden anında kalkar.",
    faq3Question: "Menü güncellemek çok uzun sürüyor ve tasarımcıya servet ödüyorum.",
    faq3Answer:
      "Düzenleme son derece basit ve saniyeler sürer; teknik bilgi gerekmez. Menü bölümüne gidin, herhangi bir ürüne tıklayıp adını, fiyatını, görselini, açıklamasını, kampanyalarını veya varyantlarını güncelleyip kaydedin. Değişiklikler anında yayına girer.",
    faq4Question: "Menü ürünlerimi anında nasıl güncellerim?",
    faq4Answer:
      "Panelinizdeki Menü bölümüne gidin. Tüm kategorileri ve ürünleri listede görürsünüz; ad, fiyat, görsel ya da açıklama gibi detayları düzenlemek için birine tıklayıp kaydedin, güncelleme anında yayınlanır.",
    faq5Question: "Menü ürünlerini veya kategorileri nasıl yeniden sıralarım?",
    faq5Answer:
      "Menü bölümünü açıp Öncelik'e tıklayın. Kategori ve ürünleri sürükleyin ya da öncelik numarası verin, kaydedin; yeni sıralama anında yayında görünür.",
    faq6Question: "Menü ürünlerine kampanya veya özel teklif nasıl eklerim?",
    faq6Answer:
      "Özel/Çok Satan ürünler için: Menü bölümünde ilgili ürünün seçeneğini açın; ürün en üstte Mutlaka Deneyin olarak görünür. Özel kampanyalar için: Kampanyalar bölümünde tek ya da çok ürünlü teklifler oluşturun, anında etkinleşir.",
    faq7Question:
      "Banner veya ürün görsellerini teknik destek olmadan güncellemek zor mu?",
    faq7Answer:
      "Ayarlar → Genel Ayarlar'a giderek restoran banner'ınızı yükleyin veya değiştirin. Ürün görsellerini ise doğrudan Menü bölümünde düzenleyin; sürükle bırak kadar kolay, anında yayında.",
    faq8Question:
      "Günün önerisi gibi değişiklikleri kolayca önizleyebilir veya zamanlayabilir miyim?",
    faq8Answer:
      "Evet; kaydetmeden önce Menüyü Görüntüle ile her düzenlemeyi önizleyin. Zamanlama için Kampanyalar bölümünü kullanarak süreli güncellemeler (örn. günün önerisi) kurun; her gün giriş yapmanıza gerek kalmaz.",
    faq9Question: "Kapalı olduğumuz saatlerde mağazayı kapatabilir miyim?",
    faq9Answer:
      "Evet. Ayarlar'a gidip restoranınızı istediğiniz an kapatın; kapalı saatler, tatiller veya bakım için birebir. Hazır olduğunuzda tekrar açın.",
    faq10Question: "Menü ürünlerini düzenlemek genel olarak ne kadar kolay?",
    faq10Answer:
      "Son derece kolay; her değişiklik saniyeler sürer. Fiyat, ad, görsel, stok durumu veya kampanyaları Menü bölümündeki sezgisel anahtar ve menülerle güncelleyin; kod da tasarımcı da gerekmez.",
    faq11Question: "Aboneliğimi istediğim zaman iptal edebilir miyim?",
    faq11Answer:
      "Evet; hesabınızdan istediğiniz an iptal edebilirsiniz. Planınız mevcut fatura dönemi bitene kadar aktif kalır, yenilemediğiniz sürece ek ücret alınmaz.",
  },

  landing: {
    socialProofEyebrow: "Son 30 günün gerçek rakamları",
    statOrdersLabel: "Alınan Sipariş",
    statRevenueLabel: "Elde Edilen Ciro",
    statAvgOrderValueLabel: "Ortalama Sepet",
    statSuffixLakh: "L+",
    statSuffixThousand: "K+",
    platformHeadingLead: "Restoranınızın ihtiyacı olan her şey,",
    platformHeadingAccent: "tek platformda.",
    featureWebsiteAppTitle: "Kendi Siteniz ve Markalı Uygulamanız",
    featureWebsiteAppBody:
      "Markalı bir sipariş sitesini ve App Store ile Play Store'daki kendi uygulamanızı tamamen kendi adınıza yayına alın. Müşteriler doğrudan sizden sipariş verir. Aracı yok, %20-33 komisyon yok. Onlar tek dokunuşla gezinir, sipariş verir, teslimatı takip eder ve yeniden sipariş verir; siz müşteri ilişkisinin sahibi olur, fiyatınızı belirler ve kârın son kuruşunu elinizde tutarsınız.",
    featureWebsiteAppCta: "Nasıl çalıştığını gör",
    featureWhatsappOrderingTitle: "WhatsApp'tan sipariş — tek bir “Merhaba” yeter",
    featureWhatsappOrderingBody:
      "WhatsApp numaranızı en kolay sipariş kanalınıza dönüştürün. Müşteri sadece “Merhaba” yazar ve menünüze otomatik giriş yapan bir bağlantı anında elinde olur — indirilecek uygulama, kayıt ya da OTP yok. Birkaç dokunuşla sipariş verir, durum güncellemelerini WhatsApp'tan alır; müşteri sizde kalır, komisyon ödemezsiniz.",
    featureWhatsappOrderingCta: "WhatsApp siparişini gör",
    featurePetpoojaTitle: "Petpooja POS Entegrasyonu",
    featurePetpoojaBody:
      "Her online sipariş gerçek zamanlı olarak doğrudan Petpooja POS'unuza düşer. Elle giriş yok, kaçan sipariş yok, çift iş yok. Ürünler, fiyatlar ve kategoriler POS'unuzla sipariş siteniz arasında otomatik senkronize olur. Hindistan'da derin Petpooja entegrasyonu hazır gelen tek platform.",
    featurePetpoojaCta: "Petpooja entegrasyonunu incele",
    featurePaymentsTitle: "Ödeme Entegrasyonu",
    featurePaymentsBody:
      "UPI, kart, internet bankacılığı ve cüzdanlarla anında ödeme alın; kapıda ödemeyi de ekleyin. Cashfree altyapılı, PCI uyumlu güvenli ödeme ve doğrudan banka hesabınıza geçen para. Paranızı tutan aracı yok, ödeme gecikmesi yok. Her kuruş size ulaşır.",
    featurePaymentsCta: "Ödeme seçeneklerini gör",
    featureOrderManagementTitle: "Gerçek Zamanlı Sipariş Yönetimi",
    featureOrderManagementBody:
      "Teslimat siparişlerini tek panelden kabul edin, izleyin ve yönetin. Yeni siparişlerde anında bildirim alın, durumu canlı güncelleyin, mutfağınızla kurye ekibinizi aynı sayfada tutun. Yoğun saatlerde tablet trafiği ya da kaçan sipariş kalmaz.",
    featureOrderManagementCta: "Sipariş yönetimini keşfet",
    featureDigitalMenuTitle: "Dijital Menü Yönetimi",
    featureDigitalMenuBody:
      "Menünüzün tamamını tek panelden yönetin: ürün, fiyat, kategori, fotoğraf ve varyantları anlık ekleyin veya düzenleyin. Ürünleri saniyesinde stokta ya da tükendi yapın, diyet filtreleri ve akıllı arama kurun, siteniz, uygulamanız ve QR kodlarınız arasında her şeyi senkron tutun. Yeniden baskı yok, yazılımcı yok. Kaydettiğiniz an yayında.",
    featureDigitalMenuCta: "Dijital menü hakkında bilgi al",
    featureOffersTitle: "Dinamik Kampanyalar ve Fırsatlar",
    featureOffersBody:
      "Otomatik başlayıp biten flaş fırsatlar, happy hour teklifleri veya saatli indirimler kurun. Çok satanları Mutlaka Deneyin rozetleri ve Şefin Seçimi etiketleriyle öne çıkarın. Tek bir broşür bastırmadan tekrar siparişleri ve ciroyu artırın.",
    featureOffersCta: "Kampanyalar nasıl işliyor",
    featureGoogleSyncTitle: "Google Business Menü Senkronu",
    featureGoogleSyncBody:
      "Menünüzün tamamını (kategoriler, ürünler, fiyatlar ve fotoğraflar) tek tıkla Google Business Profile'a otomatik aktarın. Google Maps'te eksiksiz bir menüyle görünün. Profili tam olan restoranlar 7 kat daha fazla tıklanma ve %30 daha fazla ziyaretçi alıyor.",
    featureGoogleSyncCta: "Google senkronu nasıl çalışıyor",
    featureDeliveryAppTitle: "Kurye Uygulaması",
    featureDeliveryAppBody:
      "Teslimat ekibiniz için özel bir uygulama. Kuryeler sipariş bildirimi alır, müşteri adresine yönlendirilir ve teslimat durumunu anlık günceller. Canlı konumu izleyin, siparişleri otomatik atayın, tam görünürlükle daha hızlı teslim edin.",
    featureDeliveryAppCta: "Kurye uygulamasını incele",
    featureAnalyticsTitle: "Analiz ve İçgörüler",
    featureAnalyticsBody:
      "Sipariş adetlerini, ciro eğilimlerini, yoğun saatleri ve en çok satan ürünleri takip edin. Fiyatlama, kampanya ve teslimat operasyonunuz için veriye dayalı kararlar alın. Neyin işe yaradığını ve nerede iyileşeceğinizi net görün.",
    featureAnalyticsCta: "Analiz özelliklerini incele",
    ctaBannerHeadingDefault: "Sipariş sitenizi 2 dakikadan kısa sürede açın.",
    ctaBannerBodyDefault:
      "Menünüzü yükleyin, teslimat bölgelerinizi tanımlayın ve tam Petpooja POS entegrasyonuyla doğrudan müşterilerinizden sipariş almaya başlayın. Menuthere ile büyüyen 600'den fazla restorana katılın.",
    ctaBannerPrimaryButton: "Ücretsiz başla",
    ctaBannerSecondaryButton: "Tüm planları gör",
    faqHeadingLead: "Sıkça sorulan",
    faqHeadingAccent: "sorular.",
    faqVsAggregatorsQuestion: "Menuthere'in Zomato veya Swiggy'den farkı ne?",
    faqVsAggregatorsAnswer:
      "Zomato ve Swiggy gibi platformlar her siparişten %20-33 komisyon alır. Menuthere ise müşterilerin doğrudan sizden sipariş verdiği, size ait markalı bir sipariş sitesi sunar; komisyon yalnızca %1. Müşteri verisi sizde kalır, fiyatı siz belirlersiniz, marka sadakatini siz kurarsınız.",
    faqPetpoojaIntegrationQuestion: "Petpooja POS entegrasyonu nasıl çalışıyor?",
    faqPetpoojaIntegrationAnswer:
      "Bağlantı kurulduğunda Petpooja menünüz Menuthere sipariş sitenizle otomatik senkronize olur. Her online sipariş gerçek zamanlı olarak POS'unuza iletilir. Elle giriş yok, kaçan sipariş yok. Ürünler, fiyatlar ve kategoriler iki sistemde de aynı kalır.",
    faqDeliveryZonesQuestion: "Teslimat bölgelerimi ve ücretlerimi nasıl ayarlarım?",
    faqDeliveryZonesAnswer:
      "Panelinizden Teslimat Ayarları'na gidin. Bölgeleri yarıçapa veya posta koduna göre tanımlayın, her bölge için teslimat ücreti belirleyin ve minimum sepet tutarını ayarlayın. Dilediğiniz zaman belirli bölgelerde teslimatı açıp kapatabilirsiniz.",
    faqPickupOrdersQuestion:
      "Müşteriler teslimatın yanı sıra gel-al sipariş verebilir mi?",
    faqPickupOrdersAnswer:
      "Evet, sipariş siteniz hem teslimat hem gel-al siparişlerini destekler. Müşteriler ödeme adımında tercihini seçer. İki seçeneği de panel ayarlarınızdan açıp kapatabilirsiniz.",
    faqRushHourOrdersQuestion: "Yoğun saatlerde gelen siparişleri nasıl yönetirim?",
    faqRushHourOrdersAnswer:
      "Tüm siparişler anlık bildirimlerle panelinize gerçek zamanlı düşer. Kabul, hazırlama ve durum güncellemesini tek ekrandan yaparsınız. Bağlıysa siparişler Petpooja POS'unuza da işlenir, böylece mutfağınız süreci kaçırmaz.",
    faqTechnicalSkillsQuestion: "Kurulum için teknik bilgiye ihtiyacım var mı?",
    faqTechnicalSkillsAnswer:
      "Hiç yok. Menünüzü yükleyin (veya Petpooja'dan çekin), markanızı özelleştirin; sipariş siteniz dakikalar içinde yayında. Kod yok, tasarımcı yok, uygulama indirmeye gerek yok.",
    faqOffersDiscountsQuestion:
      "Sipariş sitemde kampanya ve indirim yapabilir miyim?",
    faqOffersDiscountsAnswer:
      "Elbette! Otomatik başlayıp biten flaş fırsatlar, kupon kodları, ilk siparişe indirim veya saatli teklifler kurun. Çok satanları Mutlaka Deneyin rozetiyle öne çıkarıp ortalama sepeti büyütün.",
    faqCustomerDiscoveryQuestion: "Müşteriler sipariş sitemi nasıl bulacak?",
    faqCustomerDiscoveryAnswer:
      "Site bağlantınızı sosyal medyada, WhatsApp'ta, Google Business Profile'da ve mağaza içi QR kodlarında paylaşın. Menuthere menünüzü Google Maps ile de senkronize eder, böylece müşteriler sizi organik olarak keşfeder. Siteniz kutudan çıktığı gibi SEO uyumludur.",
    faqPauseOrderingQuestion:
      "Kapalı olduğumuz saatlerde siparişi kapatabilir miyim?",
    faqPauseOrderingAnswer:
      "Evet. Ayarlar'a gidip restoranınızı istediğiniz an kapatın; kapalı saatler, tatiller veya bakım için birebir. Hazır olduğunuzda tekrar açın. Otomatik açılış/kapanış saatleri de tanımlayabilirsiniz.",
    faqCancelSubscriptionQuestion:
      "Aboneliğimi istediğim zaman iptal edebilir miyim?",
    faqCancelSubscriptionAnswer:
      "Evet, hesabınızdan istediğiniz an iptal edebilirsiniz. Planınız mevcut fatura dönemi bitene kadar aktif kalır, yenilemediğiniz sürece ek ücret alınmaz.",
    reviewExpandButton: "Devamını gör",
    reviewCollapseButton: "Daha az göster",
    reviewOneAuthorName: "Hotel Colombo",
    reviewOneAuthorLocation: "MG Road, Edappally",
    reviewOneAuthorInitials: "HC",
    reviewOneParagraphOne:
      "Açıkçası uygulama yaptırmanın bu kadar kolay olacağını hiç düşünmemiştim 😅 her şeyi pürüzsüzce hallettiler ve tüm süreci bizim için son derece basitleştirdiler.",
    reviewOneParagraphTwo:
      "Üstelik tam istediğim gibi görünmesini sağladılar. Bazı konularda çok titizdim ve hiç taviz vermeye niyetim yoktu — defalarca revizyon yaptık ama baştan sona çok sabırlı ve sakin kaldılar, sonunda tam istediğim gibi oldu.",
    reviewOneParagraphThree: "Çok temiz bir iş, çok teşekkürler arkadaşlar.",
    reviewTwoAuthorName: "Rimaal Mandi & Grills",
    reviewTwoAuthorLocation: "Pune",
    reviewTwoAuthorInitials: "RM",
    reviewTwoParagraphOne:
      "Uygulamamızı geliştirdikleri için MenuThere ekibine teşekkürler. Uygulama, müşterilerin doğrudan bizden sipariş vermesini sağlıyor ve teslimat yönetimini çok kolaylaştırıyor. Porter gibi üçüncü taraf teslimat seçeneklerini de sunduk; ekip bunları sisteme başarıyla entegre etti. Her şey sorunsuz çalışıyor, gerçekten çok iyi bir iş çıkardılar.",
    reviewTwoParagraphTwo:
      "Bu uygulamayı çıkarmamızın asıl nedeni şu: Zomato ve Swiggy gibi platformlar bize iyi iş ve geniş bir müşteri erişimi getiriyor, ancak komisyonlar ve diğer maliyetler yüzünden ödeme tarafı zaman zaman zorlayıcı olabiliyor. Elbette Zomato ve Swiggy'den tamamen vazgeçemeyiz; birçok müşteri oradan sipariş vermeye alışkın ve onlarla çalışmaya devam edeceğiz.",
    reviewTwoParagraphThree:
      "Aynı zamanda bu uygulama, müşterilerimizle doğrudan bağ kurup onlara daha iyi hizmet verebileceğimiz ikinci bir kanal sunuyor.",
    reviewTwoParagraphFour:
      "Desteğiniz ve mükemmel işiniz için teşekkürler MenuThere ekibi.",
  },
  footerLinks: {
    brandBlurb:
      "Restoranlar için hepsi bir arada online sipariş ve teslimat platformu. Kendi sitenizi açın, aracı komisyonlarını atlayın ve işinizi büyütün.",
    solutionsGoogleBusinessSync: "Google Business Senkronu",
    solutionsOwners: "İşletme Sahipleri",
    solutionsAgencies: "Ajanslar",
    solutionsPetpoojaIntegration: "PetPooja Entegrasyonu",
    solutionsRestaurants: "Restoranlar",
    solutionsCafes: "Kafeler",
    resourcesHelpCenter: "Yardım Merkezi",
    resourcesDownloadApp: "Uygulamayı İndir",
    resourcesGetStarted: "Hemen Başla",
    legalPrivacyPolicy: "Gizlilik Politikası",
    legalTermsOfService: "Kullanım Koşulları",
    legalRefundPolicy: "İade Politikası",
    copyright: "© 2026 Menuthere.",
  },
  solutionsRest: {
    shared: {
      breadcrumbHome: "Ana sayfa",
      breadcrumbSolutions: "Çözümler",
      bookDemoCta: "Demo talep et",
      stepLabel: "Adım {step}",
      faqHeading: "Sıkça sorulan sorular.",
      zeroPercentValue: "0%",
    },
    googleBusiness: {
      metaTitle: "Restoran Menüsünü Google Business'a Aktarın | Menuthere",
      metaDescription:
        "Restoran menünüzü Google Business Profile ile otomatik senkronize edin. Tek tıkla kurulum, anlık güncelleme, daha iyi yerel SEO. 600+ restoranın tercihi.",
      ogDescription:
        "Restoran menünüzü Google Maps'e otomatik aktarın. Her zaman güncel, sıfır manuel çaba.",
      breadcrumbCurrent: "Google Business Profile Menü Senkronu",
      heroBadge: "Google Business Entegrasyonu",
      heroTitle: "Menünüzü Google Maps'e Otomatik Aktarın",
      heroSubtitle:
        "Google Business Profile menünüz her zaman güncel kalsın. Menuthere'den tek tıkla senkron — menünüz Google Arama ve Maps'te, her seferinde doğru.",
      heroPrimaryCta: "Menünü senkronize et",
      mockupCardTitle: "Google Business Profile",
      mockupCardSubtitle: "Menü Senkron Yöneticisi",
      mockupSyncStatusTitle: "Menü Başarıyla Senkronize Edildi",
      mockupSyncStatusMeta: "Son senkron: Az önce",
      mockupStatItemsLabel: "Aktarılan Ürün",
      mockupStatCategoriesLabel: "Kategori",
      mockupStatImagesLabel: "Görselli",
      mockupRecentlySyncedLabel: "Son Aktarılanlar",
      mockupItem1Name: "Butter Chicken",
      mockupItem1Category: "Ana Yemek",
      mockupItem2Name: "Paneer Tikka",
      mockupItem2Category: "Başlangıçlar",
      mockupItem3Name: "Gulab Jamun",
      mockupItem3Category: "Tatlılar",
      mockupBadgeTitle: "Profil Görüntüleme",
      mockupBadgeValue: "Bu ay +%340",
      statSyncingValue: "500+",
      statSyncingLabel: "Senkronize Eden Restoran",
      statClicksValue: "7x",
      statClicksLabel: "Daha Fazla Profil Tıklaması",
      statSyncTimeValue: "< 30 sn",
      statSyncTimeLabel: "Senkron Süresi",
      statFootfallValue: "30%",
      statFootfallLabel: "Daha Fazla Ziyaretçi",
      howItWorksBadge: "Basit 3 Adımlı Süreç",
      howItWorksHeading: "Nasıl Çalışır",
      howItWorksSubheading:
        "Menü panelinizden Google Maps'e üç basit adımda",
      step1Title: "Menünüzü Oluşturun",
      step1Body:
        "Kategori, ürün, fiyat ve fotoğraflarla menünüzü platformumuzda kurun. Yalnızca birkaç dakika sürer.",
      step2Title: "Google Profilinizi Bağlayın",
      step2Body:
        "Google Business Profile'ınızı tek tıkla bağlayın. Tüm OAuth ve API kurulumunu sizin yerinize biz hallederiz.",
      step3Title: "Senkronize Edin, Yayına Alın",
      step3Body:
        "Senkron'a basın, menünüzün tamamı Google Maps'te görünsün. İstediğiniz an güncelleyin — değişiklikler anında yansır.",
      benefitsHeading: "Restoranlar Google Menü Senkronunu Neden Seviyor",
      benefitsSubheading:
        "Menünüz en güçlü pazarlama aracınız; müşterilerin aradığı yerde göründüğünden emin olun",
      benefit1Title: "Yerel SEO'nuzu Güçlendirin",
      benefit1Body:
        "Google Business Profile'ı eksiksiz olan restoranlar 7 kat daha fazla tıklanma alıyor. Senkronize bir menü, en güçlü yerel sıralama sinyallerinden biridir; \"yakınımdaki restoranlar\" aramalarında üst sıralara çıkmanıza yardımcı olur.",
      benefit2Title: "Google Maps'te Görünün",
      benefit2Body:
        "Müşteriler Google Maps'te yemek ararken menünüzün tamamını orada görür: fiyatlar, kategoriler, ürünler. Sizi aramadan önce gelmeye karar verebilirler.",
      benefit3Title: "Her Zaman Güncel",
      benefit3Body:
        "Fiyat mı değişti? Yeni bir yemek mi eklediniz? Sezonluk bir ürünü mü kaldırdınız? Tek senkronla Google Business Profile menünüz en güncel haline döner. Google üzerinde elle düzenleme yok.",
      benefit4Title: "Her Hafta Saatler Kazanın",
      benefit4Body:
        "Google Business menünüzü elle güncellemek hem yorucu hem hataya açık. Senkronumuz bu işi saatlerde değil saniyelerde yapar. Siz kopyala yapıştıra değil yemeğe odaklanın.",
      benefit5Title: "Daha Fazla Ziyaretçi Çekin",
      benefit5Body:
        "Google'da ayrıntılı bir menü gören müşterilerin gelme olasılığı %30 daha yüksek. Sizi rakiplerinize tercih etmeleri için gereken bilgiyi verin.",
      benefit6Title: "Doğru ve Güvenilir",
      benefit6Body:
        "Gerçek menünüzle Google'da görünen fiyatlar arasında artık uyuşmazlık olmaz. Maps'teki eski bilgilerden kaynaklanan müşteri şikâyetlerini ortadan kaldırın.",
      comparisonHeading: "Senkronsuz vs. Menuthere ile",
      comparisonSubheading: "Otomatik menü senkronunun yarattığı farkı görün",
      comparisonWithoutBadge: "✕ Senkron olmadan",
      comparisonWithout1: "Her ürünü Google'a tek tek elle eklemek",
      comparisonWithout2: "Google'daki menü günler içinde eskiyor",
      comparisonWithout3: "Fiyat uyuşmazlığı müşteri şikâyeti getiriyor",
      comparisonWithout4: "Her ay saatler süren veri girişi",
      comparisonWithout5: "Görsel yok — sadece düz metin listeler",
      comparisonWithout6: "Platformlar arasında tutarsız bilgi",
      comparisonWithBadge: "✓ Menuthere ile",
      comparisonWith1: "Tek tıkla menünüzün tamamı aktarılıyor",
      comparisonWith2: "Google menüsü her zaman en güncel halinde",
      comparisonWith3: "Doğru fiyatlar müşteri güveni kazandırıyor",
      comparisonWith4: "Saatlerce elle iş değil, saniyelik senkron",
      comparisonWith5: "Tam görsel desteğiyle iştah açan bir menü",
      comparisonWith6: "Site, QR ve Google'da tek ve aynı menü",
      featuresHeading: "Google Menü Senkronuyla Elde Ettikleriniz",
      featuresSubheading:
        "Google'daki görünürlüğünüzü doğru ve etkileyici tutmak için eksiksiz bir araç seti.",
      feature1: "Google Business Profile'a tek tıkla tam menü senkronu",
      feature2: "Otomatik kategori eşleme ve yapılandırma",
      feature3: "Menü ürünleri için görsel yükleme desteği",
      feature4: "Fiyat ve stok durumu senkronu",
      feature5: "Zincirler için çoklu şube desteği",
      feature6: "Senkron geçmişi ve durum takibi",
      feature7: "Her Google Business hesabıyla uyumlu",
      feature8: "Teknik bilgi gerektirmez",
      feature9: "Vejetaryen/etli etiketlemesi desteği",
      feature10: "Özel karakterleri ve çok dilli menüleri destekler",
      ctaBoxHeading: "Menünüzü senkronize etmeye hazır mısınız?",
      ctaBoxBody:
        "Google'daki görünürlüğünü güncel tutmak için Menuthere kullanan yüzlerce restorana katılın. Kurulum 5 dakikadan kısa sürüyor.",
      ctaBoxButton: "Ücretsiz denemeyi başlat",
      comingSoonBadge: "Yakında",
      comingSoonHeading: "Google Görünürlüğünüzün Geleceği",
      comingSoonBody:
        "Yalnızca menünün ötesine geçip Google Business Profile'ınızın tamamını yönetmenizi sağlayacak güçlü yeni özellikler geliştiriyoruz.",
      autoPostTitle: "Google'a Otomatik Gönderi",
      autoPostBody:
        "Gönderileri, kampanyaları, etkinlikleri ve duyuruları doğrudan Google Business Profile'ınızda otomatik yayınlayın. Günün spesiyalini, yeni bir yemeği ya da bayram kampanyasını Google'a giriş yapmadan paylaşın.",
      autoPostPoint1: "Fotoğraflı ve butonlu gönderileri zamanlayın",
      autoPostPoint2: "Günün spesiyallerini ve sezonluk kampanyaları duyurun",
      autoPostPoint3: "Etkinlik duyuruları otomatik yayınlansın",
      autoPostPoint4: "Gönderi analizleri ve etkileşim takibi",
      reviewRepliesTitle: "Yapay Zekâ ile Yorum Yanıtları",
      reviewRepliesBody:
        "Olumlu ya da olumsuz her Google yorumuna yapay zekâ özenli ve kişiselleştirilmiş yanıtlar yazsın. Daha hızlı yanıt verin, itibarınızı koruyun, müşterilerinize 7/24 değer verdiğinizi gösterin.",
      reviewRepliesPoint1: "Yapay zekâ üretimi profesyonel ve samimi yanıtlar",
      reviewRepliesPoint2: "Olumlu ve olumsuz yorumların ikisini de yönetir",
      reviewRepliesPoint3: "Restoranınızın üslubuna ve diline uyar",
      reviewRepliesPoint4: "Yayınlamadan önce tek tıkla onay veya düzenleme",
      testimonialQuote:
        "“Her ay Google'daki menümüzü güncellemek için bir öğleden sonramızı harcıyorduk. Menuthere ile tek bir düğmeye basıyorum ve her şey senkronize oluyor: ürünler, fiyatlar, hatta görseller. Google Maps kaydımız artık profesyonel görünüyor ve menümüzü internette gördüğünü söyleyerek gelen müşterilerde gözle görülür bir artış var.”",
      testimonialAuthor: "Arjun & Priya Nair",
      testimonialRole: "Sahipleri, Spice Route Kitchen",
      testimonialLocation: "Kochi, Kerala",
      faqSubheading:
        "Google Business Profile menü senkronu hakkında bilmeniz gereken her şey",
      faq1Question: "Google Business Profile menü senkronu nedir?",
      faq1Answer:
        "Restoranınızın menüsünü platformumuzdan Google Business Profile'ınıza (Google Arama ve Google Maps'te görünen kayda) otomatik kopyalayan bir özellik. Her ürünü Google'a tek tek eklemek yerine her şeyi tek tıkla senkronize edersiniz.",
      faq2Question: "Bunu kullanmak için Google Business Profile'a ihtiyacım var mı?",
      faq2Answer:
        "Evet, restoranınız için doğrulanmış bir Google Business Profile gerekir. Henüz yoksa business.google.com adresinden ücretsiz oluşturabilirsiniz. Doğrulandıktan sonra platformumuza bağlayıp senkronu başlatabilirsiniz.",
      faq3Question: "Menümü ne sıklıkla senkronize etmeliyim?",
      faq3Answer:
        "Menünüzde bir değişiklik yaptığınızda — yeni ürün, fiyat değişikliği ya da sezonluk güncelleme — senkronize etmenizi öneririz. İşlem yalnızca birkaç saniye sürdüğü için güncel tutmamak için bir sebep yok. Bazı restoranlar her gün, bazıları haftada bir senkronize ediyor.",
      faq4Question: "Senkron, Google'daki mevcut menümün üzerine yazar mı?",
      faq4Answer:
        "Evet, her senkron Google Business Profile menünüzü platformumuzdaki en güncel sürümle değiştirir. Bu da tam doğruluk sağlar. Google Business Profile'ınızdaki diğer bilgiler (fotoğraflar, yorumlar, çalışma saatleri) etkilenmez.",
      faq5Question: "Birden fazla restoran şubesi için çalışır mı?",
      faq5Answer:
        "Evet! Tek bir Google Business hesabı altında birden çok şube yönetiyorsanız hangi şubeye senkronize edeceğinizi seçebilirsiniz. Her şubenin kendi menüsü olabilir. Şubeden şubeye menüsü değişen zincirler için birebir.",
      faq6Question: "Google hesap verilerim güvende mi?",
      faq6Answer:
        "Kesinlikle. Google'ın resmî OAuth 2.0 ve Business Profile API'sini kullanıyoruz. Yalnızca menünüzü yönetmek için gereken minimum izinleri istiyoruz. Kimlik bilgileriniz asla saklanmaz; güvenli, token tabanlı kimlik doğrulama kullanırız.",
      faq7Question: "Senkron sırasında menü görsellerine ne oluyor?",
      faq7Answer:
        "Profilinizdeki ürün görselleri, menü verileriyle birlikte Google'a yüklenir. Büyük görseller Google'ın gereksinimlerine göre otomatik optimize edilir. Bir görsel yüklenemezse ürün yine senkronize olur, yalnızca fotoğrafsız.",
      faq8Question: "Bu özellik tüm planlara dahil mi?",
      faq8Answer:
        "Google Business Profile menü senkronu Pro ve Business planlarımızda sunuluyor. Her planda nelerin yer aldığını görmek için fiyatlandırma sayfamıza göz atın.",
    },
    petpooja: {
      metaTitle: "Aracıya %30 Komisyona Son | Doğrudan Sipariş | Menuthere",
      metaDescription:
        "Aracı platformlar sipariş başına %20-30+ komisyon alıyor. Menuthere ile kendi sipariş uygulamanız, %0 komisyon, tam müşteri verisi ve PetPooja entegrasyonu.",
      ogTitle: "%30 Komisyona Son | Restoranlar için Doğrudan Sipariş",
      ogDescription:
        "Neden başka teslimat platformlarına %20-30 ödeyesiniz? Yalnızca %0 komisyonla kendi sipariş sitenizi alın. PetPooja POS entegrasyonu, tam müşteri verisi ve tam kontrol.",
      breadcrumbCurrent: "Doğrudan Sipariş ve PetPooja Entegrasyonu",
      heroTitle:
        "Üçüncü Taraf Teslimat Platformlarına %30 Komisyon Ödemeyi Bırakın",
      heroSubtitle:
        "Müşterinin tamamen size ait olduğu kendi sipariş siteniz ve PetPooja POS entegrasyonu",
      heroPrimaryCta: "Doğrudan satışa başla",
      statCommissionLabel: "Sipariş Başına Komisyon",
      value35Percent: "35%",
      statQuitLabel: "Restoran Aracılardan Ayrılmak İstiyor",
      statFeeValue: "45%",
      statFeeLabel: "Efektif Aracı Kesintisi",
      statDataValue: "100%",
      statDataLabel: "Size Ait Müşteri Verisi",
      introParagraph1:
        "Aracılar her siparişte %20-33 komisyon ve gizli ücretler alıyor. 500 Rs'lik bir siparişte 225 Rs'ye kadar kaybediyorsunuz. Bu bir ortaklık değil, emeğinizden alınan bir vergi. CCI soruşturmaları büyük teslimat platformlarını rekabet yasalarını ihlalden suçlu buldu.",
      introParagraph2:
        "Menuthere size yalnızca %1 komisyonla markanıza ait bir sipariş sitesi ve müşteri verisinin tamamını verir. PetPooja POS entegrasyonuyla birlikte siparişler doğrudan mutfağınıza akar — aracı yok, gelir paylaşımı yok, kontrol kaybı yok.",
      problemsHeading: "Diğer teslimat platformları restoranınıza nasıl zarar veriyor.",
      problemsSubheading:
        "CCI soruşturmaları her iki platformu da rekabet yasalarını ihlalden suçlu buldu. İşte işletmenize yaptıkları.",
      problem1Title: "Sipariş Başına %20-33 Komisyon",
      problem1Body:
        "Üçüncü taraf teslimat platformları komisyonları yakın zamanda %33'e kadar çıkardı. 500 Rs'lik bir siparişte, başka hiçbir kesinti olmadan 100-165 Rs kaybediyorsunuz. Gıda maliyetiniz, kiranız ve personel maaşlarınız geriye kalandan çıkıyor.",
      problem2Title: "Gizli Ücretler %45'e Kadar Çıkıyor",
      problem2Body:
        "Komisyon üzerinden GST (%18), ödeme altyapısı ücretleri (%2-3), ambalaj farkı (sipariş başına 2-5 Rs) ve zorunlu indirim paylaşımı. 500 Rs'lik bir sipariş toplamda 212-227 Rs platform ücretine mal olabiliyor — yani %42-45'i uçup gidiyor.",
      problem3Title: "Müşteri Verisinin Sahibi Onlar",
      problem3Body:
        "Binlerce müşteriye hizmet ediyorsunuz ama hiçbiriyle doğrudan bir ilişkiniz yok. Platformlar müşteri bilgilerini — ad, telefon, sipariş geçmişi — bilinçli olarak gizliyor. Sadakat kuramaz, hedefli kampanya yapamazsınız.",
      problem4Title: "Görünürlük Paraya Bağlı",
      problem4Body:
        "Diğer teslimat platformlarında ilk 10 arama sonucu neredeyse her zaman ücretli yerleşimdir. Öne çıkarılan listelere bütçe ayırmazsanız restoranınız görünmez olur. Reklam harcamasıyla efektif komisyon %25-40'a çıkar.",
      problem5Title: "Fiyat Özgürlüğü Yok",
      problem5Body:
        "Üçüncü taraf teslimat platformları fiyat kısıtlamaları koyuyor, uymayanlara ceza uyguluyor ve başka bir yerde daha düşük fiyat verirseniz sıralamanızı düşürmekle uyarıyor. Kendi fiyat stratejinizi bile belirleyemiyorsunuz.",
      problem6Title: "Artık Sizinle Rekabet Ediyorlar",
      problem6Body:
        "Üçüncü taraf teslimat platformları artık kendi yemek markalarını ve hızlı ticaret uygulamalarını kuruyor. SİZİN müşteri verinizi kullanarak rakip ürünler geliştiriyorlar. NRAI bunu 'güç istismarı' olarak nitelendiriyor.",
      commissionHeading: "500 Rs'lik bir siparişin gerçek maliyeti.",
      commissionSubheading:
        "Aracı platformlarda ve doğrudan siparişte paranızın tam olarak nereye gittiğini görün.",
      commissionColCharge: "Kesinti Türü",
      commissionColPlatforms: "Teslimat Platformları",
      commissionRow1Label: "Temel Komisyon",
      commissionRow1Aggregator: "18-33%",
      commissionRow2Label: "GST",
      commissionRow2Aggregator: "~3-5%",
      commissionRow3Label: "Ödeme Altyapısı",
      commissionRow3Aggregator: "2-3%",
      commissionRow3Menuthere: "2%",
      commissionRow4Label: "Zorunlu İndirimler",
      commissionRow4Aggregator: "5-15%",
      commissionRow4Menuthere: "Siz karar verin",
      commissionRow5Label: "Ambalaj Farkı",
      commissionRow5Aggregator: "Sipariş başına 2-5 Rs",
      commissionRow6Label: "Öne Çıkarılan Listeler",
      commissionRow6Aggregator: "ek %5-10",
      commissionRow6Menuthere: "Ücretsiz görünürlük",
      commissionTotalLabel: "Efektif Toplam Kayıp",
      commissionTotalAggregator: "212-227 Rs (%42-45)",
      commissionTotalMenuthere: "~3%",
      commissionFootnote:
        "* NRAI, Menuviel ve Billboox raporlarındaki sektör verilerine dayanmaktadır (2025-2026)",
      solutionHeading: "Restoranınızın kontrolünü geri alın.",
      solutionSubheading:
        "Kendi sipariş siteniz. Sadece %1 komisyon. Müşteri verisinin tamamı. PetPooja POS entegrasyonu.",
      solution1Title: "Siparişlerde Sadece %0 Komisyon",
      solution1Body:
        "Sadece %0 komisyonla, müşterinizin ödediği paranın neredeyse tamamı size kalır. Gizli ücret yok, gelir paylaşımı yok. Kâr marjınız olması gerektiği gibi korunur.",
      solution2Title: "Müşteri Verisinin %100'ü Sizin",
      solution2Body:
        "Her sipariş size müşterinin adını, telefon numarasını, sipariş geçmişini ve tercihlerini verir. Sadakat programları kurun, hedefli teklifler gönderin, müşterilerinizle gerçek ilişkiler kurun.",
      solution3Title: "Markanıza Ait Sipariş Siteniz",
      solution3Body:
        "Restoranınızın markası, renkleri ve alan adıyla profesyonel bir sipariş sitesi edinin. Müşteriler doğrudan sizden sipariş verir — aracının değil, sizin markanız büyür.",
      solution4Title: "Eksiksiz Analiz ve İçgörü",
      solution4Body:
        "Her siparişi, yoğun saatleri, popüler ürünleri, müşteri davranışını ve ciro eğilimlerini takip edin. Menünüz, fiyatlarınız ve kampanyalarınız için veriye dayalı kararlar alın.",
      solution5Title: "Gerçek Müşteri Sadakati Kurun",
      solution5Body:
        "Marjınızı paylaşmadan kendi kampanyalarınızı, indirimlerinizi ve sadakat ödüllerinizi yürütün. WhatsApp bildirimlerini, bayram kutlamalarını ve kişiye özel teklifleri doğrudan müşterilerinize gönderin.",
      solution6Title: "PetPooja POS Entegrasyonu",
      solution6Body:
        "Menuthere sitenizdeki siparişleri doğrudan PetPooja POS'unuza sorunsuzca aktarın. Elle giriş yok, kaçan sipariş yok. Mutfağınız siparişi tıpkı diğer kanallardaki gibi anında görür.",
      realNumbersHeading: "Aracıya bağımlılık mı, doğrudan sipariş mi.",
      realNumbersSubheading:
        "Platformların görmenizi istemediği gerçek karşılaştırma.",
      realNumbersColAggregators: "Aracılar",
      realNumbersRow1Metric: "Sipariş başına komisyon",
      realNumbersRow1Aggregator: "%18-33 + ücretler (efektif %35-45)",
      realNumbersRow1Direct: "Sadece %0",
      realNumbersRow2Metric: "Müşteri verisi sahipliği",
      realNumbersRow2Aggregator: "Her şey platformun",
      realNumbersRow2Direct: "%100 sizin",
      realNumbersRow3Metric: "Fiyat kontrolü",
      realNumbersRow3Aggregator: "Cezalarla kısıtlı",
      realNumbersRow3Direct: "Tam serbestlik",
      realNumbersRow4Metric: "Marka inşası",
      realNumbersRow4Aggregator: "Sadakat platforma gider",
      realNumbersRow4Direct: "Sadakat SİZİN restoranınıza gider",
      realNumbersRow5Metric: "Teslimatta kâr marjı",
      realNumbersRow5Aggregator: "Çoğu zaman %10'un altında",
      realNumbersRow5Direct: "%25-35+ mümkün",
      realNumbersRow6Metric: "Pazarlama kontrolü",
      realNumbersRow6Aggregator: "Paraya bağlı, 250-4000+ Rs",
      realNumbersRow6Direct: "Tam kontrol, kendi kampanyalarınız",
      realNumbersRow7Metric: "Menü ve indirim kontrolü",
      realNumbersRow7Aggregator: "Platform onayınız olmadan dayatabilir",
      realNumbersRow7Direct: "%100 sizin kararınız",
      transparencyHeading: "Bilmeniz gerekenler — tam şeffaflık.",
      transparencySubheading:
        "Açık olmaya inanıyoruz. İşte sunduklarımız ve sunmadıklarımız.",
      deliveryTitle: "Kurye Sağlamıyoruz",
      deliveryBody:
        "Menuthere size en iyi sipariş platformunu, müşteri yönetimini ve POS entegrasyonunu sunmaya odaklanır. Teslimat içinse esnek seçenekleriniz var:",
      deliveryPoint1: "Tam kontrol için kendi kurye ekibinizi kullanın",
      deliveryPoint2:
        "Porter, Dunzo veya Shadowfax gibi üçüncü taraf hizmetlerle çalışın",
      deliveryPoint3: "Yalnızca gel-al sunun — birçok müşteri bunu tercih ediyor",
      deliveryPoint4: "Masada QR ile siparişte teslimata hiç gerek yok",
      deliveryNote:
        "Doğrudan kanallardan gelen yalnızca gel-al siparişler bile, %30 komisyonla aracılar üzerinden teslim edilen siparişlerden daha kârlıdır.",
      paymentTitle: "Ödeme Entegrasyonu",
      paymentBadge: "Sadece %1",
      paymentBody:
        "Sadece %1'lik entegre ödeme altyapısı (yalnızca müşteri hizmeti). Müşterileriniz doğrudan sipariş sitenizde online ödeyebilir:",
      paymentPoint1: "UPI ödemeleri (Google Pay, PhonePe, Paytm)",
      paymentPoint2: "Kredi ve banka kartı desteği",
      paymentPoint3: "Dijital cüzdan entegrasyonu",
      paymentPoint4: "PetPooja POS ile otomatik mutabakat",
      paymentNote:
        "Kapıda ödeme alabilir ya da mevcut ödeme altyapınızı kullanmaya devam edebilirsiniz.",
      factsHeading: "Rakamlar yalan söylemez.",
      factsSubheading:
        "Sektör anketlerinden, CCI soruşturmalarından ve NRAI raporlarından gerçek veriler.",
      fact1Text:
        "Hintli restoran diğer teslimat platformlarını bırakmak istiyor (Aralık 2025 anketi)",
      fact2Value: "60%",
      fact2Text:
        "yeni restoran ilk yılını dolduramadan kapanıyor — platform bağımlılığı başlıca etkenlerden biri",
      fact3Value: "Rs 400 Cr",
      fact3Text:
        "ekosistem genelinde ambalaj ücreti farklarıyla platformların her yıl çektiği ek tutar",
      fact4Value: "2,000+",
      fact4Text: "restoran, aracı platformlara karşı #Logout boykotuna katıldı",
      howItWorksHeading: "3 basit adımda doğrudan siparişe geçin.",
      howItWorksSubheading:
        "Kendi sipariş kanalınızı 10 dakikadan kısa sürede kurun.",
      step1Title: "Menünüzü ve Sitenizi Oluşturun",
      step1Body:
        "Menünüzü yükleyin, markanızı özelleştirin ve kendi sipariş sitenizi yayına alın. 10 dakikadan kısa sürer.",
      step2Title: "PetPooja POS'u Bağlayın",
      step2Body:
        "Otomatik sipariş senkronu için PetPooja POS'unuzu bağlayın. Siparişler doğrudan mutfağınıza akar — sıfır elle iş.",
      step3Title: "Paylaşın ve Satmaya Başlayın",
      step3Body:
        "Sipariş bağlantınızı WhatsApp'ta, sosyal medyada ve QR kodlarıyla paylaşın. Doğrudan siparişlerin akışını izleyin.",
      savingsHeading:
        "Diğer Teslimat Platformlarındaki Her Sipariş Size 100-225 Rs'ye Mal Oluyor",
      savingsBody:
        "Günde 50 teslimat siparişi alıyorsanız bu her gün 5.000-11.250 Rs kayıp demek. Ayda 1,5-3,3 lakh Rs. Kendi sipariş siteniz ilk günden kendini amorti eder.",
      savingsSecondaryCta: "Fiyatları gör",
      faqSubheading:
        "Menuthere ile doğrudan sipariş hakkında bilmeniz gereken her şey.",
      faq1Question:
        "Menuthere, diğer teslimat platformlarına komisyon ödemeyi bırakmama nasıl yardımcı oluyor?",
      faq1Answer:
        "Menuthere size, müşterilerin doğrudan sipariş verebildiği markalı bir sipariş sitesi verir. Sadece %0 komisyonla sipariş cironuzun neredeyse tamamı sizde kalır. Biz her siparişten %20-30 pay değil, sade bir abonelik ücreti alırız.",
      faq2Question: "Menuthere kurye sağlıyor mu?",
      faq2Answer:
        "Hayır, Menuthere kurye sağlamıyor. Biz size en iyi sipariş platformunu, müşteri yönetimini ve POS entegrasyonunu sunmaya odaklanıyoruz. Teslimat için kendi ekibinizi kullanabilir, Porter, Dunzo veya Shadowfax gibi üçüncü taraf hizmetlerle çalışabilir ya da yalnızca gel-al sunabilirsiniz. Birçok restoran, doğrudan kanallardan gelen gel-al siparişlerin bile aracılar üzerinden teslim edilen siparişlerden daha kârlı olduğunu görüyor.",
      faq3Question: "PetPooja entegrasyonu nasıl çalışıyor?",
      faq3Answer:
        "Menuthere sitenizde verilen siparişler gerçek zamanlı olarak PetPooja POS terminalinize otomatik iletilir. Mutfağınız siparişi anında görür — elle giriş yok, kopyala yapıştır yok, kaçan sipariş yok. Tıpkı POS'unuzda diğer kanallardan sipariş almak gibi çalışır.",
      faq4Question: "Müşterilerden ödeme tahsilatı nasıl oluyor?",
      faq4Answer:
        "Menuthere, sadece %0 ücretle entegre ödeme altyapısı desteği içerir (yalnızca müşteri hizmeti). Müşteriler doğrudan sipariş sitenizde UPI, kart ve cüzdanlarla online ödeyebilir. Kapıda ödeme alabilir ya da mevcut ödeme altyapınızı kullanabilirsiniz.",
      faq5Question: "Diğer teslimat platformlarını tamamen bırakmalı mıyım?",
      faq5Answer:
        "Şart değil. Birçok restoran keşif için (yeni müşterilerin kendilerini bulması) diğer platformları kullanırken, tekrar eden müşterileri daha yüksek marjlı siparişler için kendi sipariş sitesine yönlendiriyor. Amaç bağımlılığı azaltmak — mutlaka sonlandırmak değil — ve cironuzun daha büyük kısmının sizde kalmasını sağlamak.",
      faq6Question: "Menuthere ne kadar tutuyor?",
      faq6Answer:
        "Menuthere siparişlerinizden yüzde almaz; sade bir aylık abonelik ücreti alır. Ücretli planlarımızda bile aracı komisyonlarından kurtularak harcadığınızdan çok daha fazlasını kazanırsınız. Güncel planlar için fiyatlandırma sayfamıza göz atın.",
      faq7Question:
        "Restoranların %35'i gerçekten aracılardan ayrılmak mı istiyor?",
      faq7Answer:
        "Evet. Aralık 2025'te yapılan bir sektör anketi, Hindistan'daki restoranların %35'inin yüksek komisyonlar, zayıf müşteri hizmeti, yetersiz kâr ve müşteri verisine erişememe nedeniyle diğer teslimat platformlarını kullanmayı bırakmak istediğini ortaya koydu.",
      faq8Question:
        "Menuthere'in yanında diğer teslimat platformlarını da kullanabilir miyim?",
      faq8Answer:
        "Kesinlikle. Restoran ortaklarımızın çoğu ikisini birden kullanıyor. Yeni müşteri kazanımı için diğer platformlarda kalırken, tekrar eden müşterileri marjın belirgin şekilde yüksek olduğu Menuthere sipariş sitelerine yönlendiriyorlar. Zamanla, müşteriler doğrudan sipariş vermeyi tercih ettikçe doğrudan siparişlerin payı büyüyor.",
    },
    whatsappOrdering: {
      metaTitle:
        "WhatsApp'tan Sipariş — Müşteri 'Merhaba' Yazsın | Menuthere",
      metaDescription:
        "WhatsApp numaranızı sipariş kanalına dönüştürün. Müşteri 'Merhaba' yazar, otomatik giriş bağlantısıyla sipariş verir. Uygulama, kayıt ve komisyon yok.",
      metaKeywords:
        "whatsapp sipariş, restoranlar için whatsapp sipariş sistemi, whatsapp'tan sipariş, whatsapp business sipariş, restoran whatsapp menü, merhaba yazarak sipariş, whatsapp yemek siparişi, sohbetten sipariş, komisyonsuz sipariş",
      ogTitle: "WhatsApp'tan Sipariş — Tek Bir 'Merhaba' Yeter | Menuthere",
      ogDescription:
        "Restoranlar için en az sürtünmeli sipariş kanalı. 'Merhaba' → anında bağlantı → menünüzden sipariş → canlı WhatsApp güncellemeleri. Uygulama yok, kayıt yok, komisyon yok.",
      structuredDataProductName: "Menuthere WhatsApp'tan Sipariş",
      structuredDataProductDescription:
        "Restoranlar için WhatsApp sipariş sistemi. Müşteriler 'Merhaba' yazarak anında otomatik giriş bağlantısı alır, görsel web menüsünden sipariş verir ve sipariş durumunu canlı olarak WhatsApp'tan takip eder.",
      heroBadge: "WhatsApp'tan Sipariş",
      heroBadgeNew: "YENİ",
      heroTitle: "Müşterileriniz tek bir “Merhaba” yazarak sipariş versin.",
      heroSubtitle:
        "WhatsApp numaranızı en kolay sipariş kanalınıza dönüştürün. Tek bir “Merhaba”, her müşteriye menünüze otomatik giriş yapan anlık bir bağlantı verir — kurulacak uygulama, kayıt ya da OTP yok. Müşteri sizde kalır, komisyon ödemezsiniz.",
      primaryCta: "Ücretsiz başla",
      heroTrust1: "Uygulama indirmek yok",
      heroTrust2: "Kayıt ya da OTP yok",
      heroTrust3: "%0 komisyon",
      stepsHeading: "“Merhaba” deyin. Huni bundan ibaret.",
      stepsSubheading:
        "Sepetlerin terk edilmesinin en büyük nedeni sürtünmedir: indirmeler, kayıtlar, şifreler. WhatsApp'tan sipariş bunların hepsini ortadan kaldırır. Dört adım ve müşteri zaten güvendiği kanaldan hiç çıkmıyor.",
      step1Title: "Müşteri “Merhaba” yazar",
      step1Body:
        "Bir çıkartmadan, masadaki QR'dan, biyografi bağlantınızdan ya da Google profilinizden WhatsApp'a geçip numaranıza Merhaba yazar. İndirilecek uygulama, doldurulacak form yok.",
      step2Title: "Anında Sipariş Ver bağlantısı alır",
      step2Body:
        "Numaranız saniyeler içinde dokunulabilir bir Sipariş Ver butonuyla yanıt verir. Bağlantı müşterinin oturumunu otomatik açar — OTP yok, şifre yok, hesap oluşturma yok.",
      step3Title: "Görsel menünüzden sipariş verir",
      step3Body:
        "Bağlantı, markanıza ait web menüsünü zaten giriş yapılmış halde açar. Fotoğraflara bakar, sepete ekler, UPI ya da nakit seçer ve birkaç dokunuşta siparişi verir.",
      step4Title: "Güncellemeler WhatsApp'a döner",
      step4Body:
        "Sipariş alındı, kabul edildi, yemek hazır, canlı takip bağlantısıyla yola çıktı, teslim edildi — üstelik sadakat puanlarıyla. Her güncelleme doğrudan sohbete düşer.",
      featuresHeading: "Sohbet için değil, satış için tasarlandı.",
      featuresSubheading:
        "WhatsApp üzerinden siparişi profesyonelce yürütmek için ihtiyacınız olan her şey — sizin markanızda, sizin kurallarınızla.",
      feature1Title: "Uygulama yok, kayıt yok",
      feature1Body:
        "WhatsApp'ı olan her telefonda çalışır. “Merhaba” yazmak müşteriyi sessizce oluşturur ve tanır; böylece asla bir giriş duvarına çarpmazlar.",
      feature2Title: "Kendi markalı numaranız",
      feature2Body:
        "Gerçek WhatsApp Business numaranızı Meta üzerinden dakikalar içinde bağlayın — hâlihazırda kullandığınız numarayı bile. Ya da ortak numaramızla anında yayına geçin.",
      feature3Title: "Kendi alan adınızda sipariş bağlantıları",
      feature3Body:
        "Sipariş bağlantıları genel bir üçüncü taraf adresi yerine kendi alan adınızda (markaniz.com) çalışabilir; böylece her temas noktası markanızda kalır.",
      feature4Title: "Otomatik durum güncellemeleri",
      feature4Body:
        "Fatura dökümüyle sipariş alındı, kabul edildi, hazır, canlı takip haritası bağlantısıyla yola çıktı, tamamlandı ve sadakat puanları — hepsi otomatik gönderilir.",
      feature5Title: "Güvenli tek kullanımlık bağlantılar",
      feature5Body:
        "Her bağlantı imzalıdır, dakikalar içinde geçerliliğini yitirir ve onu ilk açan kişiye kilitlenir; iletilen bir bağlantı asla birinin açık oturumunu ele geçiremez.",
      feature6Title: "Kodsuz mesaj akışları",
      feature6Body:
        "Karşılama ve sipariş mesajlarınız; anahtar kelime tetikleyicileri, butonlar ve medya içeren düzenlenebilir akışlardır — metni değiştirmek için koda dokunmanıza gerek yok.",
      feature7Title: "Tek bir WhatsApp gelen kutusu",
      feature7Body:
        "Gelen ve giden her mesaj kaydedilir ve panelinizden görüntülenir; yoğunlukta hiçbir şey gözden kaçmaz.",
      feature8Title: "Kanal etiketli analizler",
      feature8Body:
        "WhatsApp üzerinden verilen siparişler otomatik etiketlenir. Uygulama, web sitesi ve WhatsApp sipariş adetlerini ve cirosunu yan yana görün.",
      frictionHeading: "Dokunuşları sayın. Müşteriler sayıyor.",
      frictionSubheading:
        "Acıkmakla sipariş vermek arasındaki her fazladan adım, kaybettiğiniz bir müşteri. İşte aynı sipariş, iki farklı yoldan.",
      frictionAggregatorLabel: "Aracı uygulaması",
      frictionAggregatorStep1: "Uygulamayı indir",
      frictionAggregatorStep2: "Kayıt ol + OTP doğrula",
      frictionAggregatorStep3: "Restoranınızı ara",
      frictionAggregatorStep4: "Sipariş ver (onlar %20-33 alır)",
      frictionAggregatorStep5: "Müşteriyi hiç göremezsiniz",
      frictionWhatsappLabel: "WhatsApp'tan sipariş",
      frictionWhatsappStep1: "“Merhaba” yaz",
      frictionWhatsappStep2: "Sipariş Ver'e dokun (otomatik giriş)",
      frictionWhatsappStep3: "Menünüzden sipariş ver",
      frictionHighlight: "Sipariş tutarının %100'ü sizde kalır.",
      comparisonHeading: "Karşılaştıralım.",
      comparisonSubheading:
        "Menuthere WhatsApp siparişi, yemek aracıları ve genel “chatbot” sipariş araçları.",
      comparisonColAggregators: "Yemek aracıları",
      comparisonColChatbots: "Genel chatbot'lar",
      comparisonValueYes: "Evet",
      comparisonValueNo: "Hayır",
      comparisonRow1Label: "Sipariş başına komisyon",
      comparisonRow1Aggregator: "20–33%",
      comparisonRow1Chatbot: "Aylık ücret + mesaj başına",
      comparisonRow2Label: "Uygulama indirmek gerekir",
      comparisonRow2Us: "Asla",
      comparisonRow3Label: "Müşteri girişi / OTP",
      comparisonRow3Us: "Otomatik — yok",
      comparisonRow3Aggregator: "Hesap + OTP",
      comparisonRow3Chatbot: "Genellikle gerekir",
      comparisonRow4Label: "Sipariş deneyimi",
      comparisonRow4Us: "Fotoğraflı, tam görsel menü",
      comparisonRow4Aggregator: "Kendi uygulamalarında",
      comparisonRow4Chatbot: "Ürünleri sohbete yazmak",
      comparisonRow5Label: "Kendi numaranızdan gönderim",
      comparisonRow5Chatbot: "Bazen",
      comparisonRow6Label: "Canlı sipariş ve teslimat takibi",
      comparisonRow6Us: "WhatsApp'ta",
      comparisonRow6Aggregator: "Kendi uygulamalarında",
      comparisonRow6Chatbot: "Nadiren",
      comparisonRow7Label: "Müşteri verisi sizin",
      comparisonRow7Us: "Evet, tamamen",
      comparisonRow7Chatbot: "Kısmen",
      comparisonRow8Label: "Kurulum süresi",
      comparisonRow8Us: "Dakikalar",
      comparisonRow8Aggregator: "Haftalar süren kurulum",
      comparisonRow8Chatbot: "Günler + senaryo yazımı",
      outcome1Value: "≈ 10 sn",
      outcome1Label:
        "“Merhaba”dan müşterinin elindeki canlı sipariş bağlantısına.",
      outcome2Label: "Komisyon. Sipariş tutarının son kuruşu sizde kalır.",
      outcome3Value: "Uçtan uca",
      outcome3Label:
        "Verildi → kabul edildi → yola çıktı → takip edildi, hepsi WhatsApp'ta.",
      faqHeading: "Sorular, yanıtlarıyla.",
      faq1Question: "Müşterilerimin bir şey indirmesi gerekiyor mu?",
      faq1Answer:
        "Hayır. WhatsApp'ları olduğu sürece sipariş verebilirler. “Merhaba” yazar, Sipariş Ver bağlantısına dokunur ve zaten giriş yapmış halde menünüze düşerler. İndirilecek uygulama ya da oluşturulacak hesap yok.",
      faq2Question: "Müşteri siparişini sohbetin içine mi yazıyor?",
      faq2Answer:
        "Hayır — ve asıl mesele bu. WhatsApp giriş kapısıdır, kasa değil. “Merhaba”, müşteriye fotoğraflı, kategorili ve aramalı gerçek görsel menünüze anında bir bağlantı verir; böylece sipariş hızlı olur, hata neredeyse hiç çıkmaz. Durum güncellemeleri ise WhatsApp'a geri döner.",
      faq3Question: "Kendi WhatsApp numaramdan gönderebilir mi?",
      faq3Answer:
        "Evet. Kendi WhatsApp Business numaranızı Meta'nın resmî katılım akışıyla birkaç dakikada bağlayabilirsiniz — WhatsApp Business uygulamasında hâlihazırda kullandığınız numara dahil. Hiç kurulumla uğraşmak istemiyor musunuz? Ortak numaramızla anında yayına geçip sonra değiştirin.",
      faq4Question: "Sipariş bağlantısını paylaşmak güvenli mi?",
      faq4Answer:
        "Her bağlantı kriptografik olarak imzalanır, dakikalar içinde geçerliliğini yitirir ve onu ilk açan kişiye kilitlenir. Biri iletirse başkasında çalışmaz; böylece açık bir oturum asla sızmaz.",
      faq5Question: "Müşteri sipariş verdikten sonra ne alıyor?",
      faq5Answer:
        "Her aşama için otomatik WhatsApp mesajları: fatura dökümüyle sipariş alındı, kabul edildi, yemek hazır, canlı takip bağlantısıyla yola çıktı, tamamlandı ve (sadakat programınız varsa) kazanılan puanlar.",
      faq6Question: "Menuthere ne kadar komisyon alıyor?",
      faq6Answer:
        "Siparişlerde sıfır komisyon. WhatsApp'tan sipariş, tamamen size ait doğrudan kanalın bir parçasıdır — sipariş tutarının %100'ü sizde kalır ve ödemeler doğrudan banka hesabınıza geçer.",
      faqCtaPrompt:
        "Müşterilerinizin tek bir “Merhaba” ile sipariş vermesine hazır mısınız?",
      faqSecondaryLink: "Komisyonsuz siparişi keşfet",
      trialHeading:
        "WhatsApp sipariş sisteminizi 2 dakikadan kısa sürede kurun.",
      trialDescription:
        "WhatsApp numaranızı bağlayın, menünüzü yükleyin ve müşteriler tek bir “Merhaba” ile sipariş versin — otomatik giriş bağlantısı, canlı durum güncellemeleri ve sıfır komisyon. Menuthere ile büyüyen 600'den fazla restorana katılın.",
    },
  },
  solutionsSlug: {
    heroPrimaryCta: "Ücretsiz başla",
    heroSecondaryCta: "Demo talep et",
    benefitsHeadingLead: "Neden Menuthere,",
    benefitsHeadingIndustry: "{industry} için?",
    benefitsHeadingIndustryFallback: "işletmeniz",
    benefitsSubheading:
      "Sektörünüz için özel olarak geliştirilmiş, amaca uygun özellikler.",
    featuresHeadingLead: "Başarmanız için",
    featuresHeadingEmphasis: "gereken her şey.",
    featuresSubheading:
      "Menünüzü modernleştirmek ve müşterilerinizi memnun etmek için tasarlanmış kapsamlı bir araç seti.",
    featuresCtaCardHeading: "Başlamaya hazır mısınız?",
    featuresCtaCardBody:
      "Menü deneyimini dönüştürmek için Menuthere kullanan binlerce işletmeye katılın.",
    featuresCtaCardButton: "Ücretsiz denemeyi başlat",
    useCasesHeadingLead: "Her tür",
    useCasesHeadingIndustry: "{industry} için ideal.",
    useCasesHeadingIndustryFallback: "işletme",
    faqHeadingLead: "Sıkça sorulan",
    faqHeadingEmphasis: "sorular.",
    notFoundMetaTitle: "Çözüm Bulunamadı",
    breadcrumbHome: "Ana sayfa",
    breadcrumbSolutions: "Çözümler",
  },
  downloadApp: {
    heroHeadingLead: "Menuthere artık",
    heroHeadingHighlight: "Mobil ve Masaüstünde.",
    heroSubheading:
      "Restoranınızı yolda ya da masanızın başında yönetin. Anlık sipariş bildirimleri alın, menünüzü güncelleyin ve satışları tüm cihazlardan takip edin.",
    appStoreBadgePrefix: "Şuradan indirin",
    playStoreBadgePrefix: "Şuradan edinin",
    windowsBadgePrefix: "Şunun için indirin",
    windowsBadgePlatform: "Windows",
    heroImageAlt: "Menuthere Uygulama Arayüzü",
  },
  blog: {
    metaTitle: "Blog | Menuthere - Restoran ve Kafe İçgörüleri",
    metaDescription:
      "Restoran sahipleri için dijital menüler, QR kodlar, Google Business senkronu ve işini büyütme üzerine ipuçları, rehberler ve içgörüler.",
    ogTitle: "Blog | Menuthere",
    ogDescription:
      "Restoran sahipleri için dijital menüler, QR kodlar ve işini büyütme üzerine ipuçları, rehberler ve içgörüler.",
    heroHeading: "En yeni haberler ve içgörüler",
    heroHeadingAccent: "Menuthere'den",
    categoryLabel: "Blog",
    emptyState: "Henüz yayınlanmış yazı yok. Takipte kalın!",
    postMetaTitleTemplate: "{title} | Menuthere Blog",
    postNotFoundMetaTitle: "Yazı Bulunamadı",
    backToIndexLink: "← Blog",
    relatedHeading: "Diğer yazılar",
  },
};

export default tr;
