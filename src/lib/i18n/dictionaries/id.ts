import type { Dictionary } from "./en";

/**
 * Indonesian (Bahasa Indonesia). Typed as `Dictionary`, so this file cannot
 * drift from the English source: add a key to en.ts and TypeScript fails here
 * until it is translated, rather than letting English leak onto an Indonesian
 * page.
 *
 * Brand nouns (Menuthere, WhatsApp, Google, Product Hunt, QR, POS, Petpooja)
 * stay in Latin script on purpose — that is how the market writes them.
 */
const id: Dictionary = {
  common: {
    language: "Bahasa",
    changeLanguage: "Ganti bahasa",
  },
  nav: {
    products: "Produk",
    solutions: "Solusi",
    businesses: "Bisnis",
    pricing: "Harga",
    resources: "Sumber Daya",
    blog: "Blog",
    login: "Masuk",
    bookDemo: "Jadwalkan Demo",
    getStarted: "Mulai gratis",
    openMenu: "Buka menu",
    closeMenu: "Tutup menu",
  },
  navItems: {
    ownDeliveryWebsite: {
      title: "Website Pesan Antar Sendiri",
      description: "Platform pesan antar tanpa komisi",
    },
    digitalMenuCreator: {
      title: "Pembuat Menu Digital",
      description: "Menu QR untuk pesan di meja",
    },
    pos: {
      title: "Point Of Sale (POS)",
      description: "Kelola penagihan dan operasional",
    },
    tableOrdering: {
      title: "Pesan dari Meja",
      description: "Pengalaman bersantap yang mulus bagi pelanggan",
    },
    captainOrdering: {
      title: "Pesanan lewat Kapten",
      description: "Pencatatan pesanan yang efisien untuk staf",
    },
    googleBusinessSync: {
      title: "Sinkron Google Business",
      description: "Sinkronkan menu ke Google Maps",
    },
    owners: {
      title: "Pemilik",
      description: "Pantau operasional dan tumbuhkan omzet",
    },
    agencies: {
      title: "Agensi",
      description: "Kelola banyak akun klien dengan mudah",
    },
    restaurants: {
      title: "Restoran",
      description: "Menu digital cerdas untuk makan di tempat",
    },
    cafes: {
      title: "Kafe & Kedai Kopi",
      description: "Menu modern untuk racikan terbaik",
    },
    bakeries: {
      title: "Toko Roti",
      description: "Tampilkan roti segar Anda dengan memikat",
    },
    cloudKitchens: {
      title: "Cloud Kitchen",
      description: "Kelola menu banyak brand sekaligus",
    },
    hotels: {
      title: "Hotel & Resor",
      description: "Pengalaman bersantap tamu yang elegan",
    },
    foodTrucks: {
      title: "Food Truck",
      description: "Menu mobile ke mana pun Anda pergi",
    },
    bars: {
      title: "Bar & Pub",
      description: "Menu minuman dinamis dan bergaya",
    },
  },
  hero: {
    productHunt: "Live di Product Hunt",
    headlineA: "Kuasai pesanan Anda.",
    headlineB: "Kuasai pelanggan Anda.",
    subhead:
      "Lewati potongan 30% dari agregator. Menuthere menyiapkan platform pemesanan & pengantaran ber-brand Anda dalam hitungan menit.",
    searchPlaceholder: 'Cari "{name}"',
    generate: "Buat",
    working: "Memproses…",
    clear: "Hapus",
    pickFromDropdown: "Pilih bisnis Anda dari daftar",
    bulletNoCommission: "Tanpa komisi",
    bulletYourBrand: "Brand Anda sendiri",
    bulletLiveInMinutes: "Tayang dalam menit",
    whatsappTitle: "Pemesanan WhatsApp",
    whatsappNew: "Baru",
    whatsappBlurb: "Pelanggan memesan lewat WhatsApp — tanpa aplikasi, tanpa login.",
    whatsappExplore: "Jelajahi pemesanan WhatsApp",
    trustedBy: "Dipercaya restoran yang sedang membesarkan brand-nya",
  },
  footer: {
    solutions: "Solusi",
    resources: "Sumber Daya",
    legal: "Legal",
    tagline: "Pemesanan tanpa komisi untuk restoran.",
    rights: "Seluruh hak cipta dilindungi.",
  },
  metadata: {
    title: "Menuthere | Platform Pesan Antar Online untuk Restoran",
    description:
      "Luncurkan aplikasi pesan antar milik restoran Anda sendiri dengan integrasi POS Petpooja, pesanan real-time & analitik. Dipercaya 600+ restoran di India.",
  },

  solutionsOwners: {
    metaTitle: "Solusi untuk Pemilik Restoran | Menuthere",
    metaDescription:
      "Ambil kembali kendali restoran Anda bersama Menuthere. Kelola menu, POS, kapten, dan stok dari satu dasbor. Tanpa komisi, laba maksimal.",
    heroPrimaryCta: "Mulai Sekarang",
    heroSecondaryCta: "Jadwalkan Demo",
    benefitsHeading: "Kenapa Menuthere",
    benefitsHeadingAccent: "untuk Pemilik?",
    reviewsHeading: "Disukai para pemilik",
    reviewsHeadingAccent: "restoran.",
  },
  solutionsAgencies: {
    metaTitle: "Program Mitra Agensi | Komisi Berulang | Menuthere",
    metaDescription:
      "Jadilah mitra resmi Menuthere. Raih komisi berulang seumur hidup hingga 30% dengan menjual solusi menu digital premium ke restoran.",
    heroBadge: "Program Mitra Agensi",
    heroApplyCta: "Daftar Sekarang",
    heroDemoCta: "Jadwalkan Demo",
    problemHeading: "Buka Pendapatan untuk Restoran,",
    problemHeadingAccent: "Amankan Milik Anda",
    problemBody:
      "Restoran independen kehilangan penjualan gara-gara PDF statis yang tak sanggup mengikuti perubahan real-time. Sebagai mitra Menuthere, Anda menjawabnya lewat platform $30/bulan yang sudah terbukti, dengan pembaruan QR instan yang dipercaya 600+ lokasi — dan Anda jadi penasihat andalan mereka.",
    benefitsHeading: "Kenapa bermitra",
    benefitsHeadingAccent: "dengan kami?",
    earningsBadge: "Potensi Penghasilan Tinggi",
    earningsHeading: "Struktur Komisi",
    earningsHeadingAccent: "Berbasis Kinerja.",
    earningsSubheading:
      "Pembayaran selaras langsung dengan pendapatan. Bulanan lewat Stripe, di hari yang sama saat dana langganan kami terima.",
    earningsTableTierHeader: "Tingkat",
    earningsTableRevenueHeader: "Total Pendapatan Referral Seumur Hidup",
    earningsTableCommissionHeader: "Komisi (Per Langganan $30)",
    tierStarterName: "Starter",
    tierStarterRevenue: "$0 hingga $1.000",
    tierStarterRate: "20%",
    tierStarterPayout: "($6/bulan)",
    tierStarterPayoutPerSub: "$6/bulan per langganan",
    tierGrowthName: "Growth",
    tierGrowthRevenue: "$1.001 hingga $5.000",
    tierGrowthRate: "25%",
    tierGrowthPayout: "($7,50/bulan)",
    tierGrowthPayoutPerSub: "$7,50/bulan per langganan",
    tierEliteName: "Elite",
    tierEliteRevenue: "$5.001+",
    tierEliteRate: "30%",
    tierElitePayout: "($9/bulan)",
    tierElitePayoutPerSub: "$9/bulan per langganan",
    tierCardRevenueLabel: "Pendapatan",
    tierCardCommissionLabel: "Komisi",
    processHeading: "Proses onboarding",
    processHeadingAccent: "mitra.",
    processStepOneTitle: "Tinjauan Pendaftaran",
    processStepOneDescription:
      "Persetujuan cepat plus akses portal reseller (tautan demo, materi ber-brand).",
    processStepTwoTitle: "Terjun ke Lapangan",
    processStepTwoDescription:
      "Bidik restoran, berikan demo 5 menit, dan kunci komitmennya.",
    processStepThreeTitle: "Bagi Hasil",
    processStepThreeDescription:
      "Pelacakan otomatis dan pencairan di hari yang sama saat dana masuk.",
    idealPartnerHeading: "Mitra Strategis",
    idealPartnerHeadingAccent: "yang Kami Cari",
    idealPartnerBody:
      "Pemimpin penjualan yang teruji di lapangan dan piawai membangun hubungan dengan restoran. Program selektif untuk performer yang sudah terbukti.",
    partnerTypeRestaurantAdvisors: "Konsultan Restoran",
    partnerTypeChannelPartners: "Mitra Channel B2B",
    partnerTypeSalesExecutives: "Sales Executive",
    partnerTypeFranchiseSpecialists: "Spesialis Waralaba",
    partnerTypeSaasResellers: "Reseller SaaS",
    partnerTypeBizDevPros: "Profesional Business Development",
    faqHeading: "FAQ",
    faqHeadingAccent: "Mitra.",
    faqProductOverviewQuestion: "Sekilas Produk",
    faqProductOverviewAnswer:
      "Platform menu digital QR premium seharga $30/bulan untuk restoran di seluruh dunia.",
    faqExperienceRequiredQuestion: "Pengalaman yang Dibutuhkan",
    faqExperienceRequiredAnswer:
      "Keahlian penjualan lapangan; seluruh materi pendukung kami sediakan.",
    faqPayoutMechanicsQuestion: "Mekanisme Pembayaran",
    faqPayoutMechanicsAnswer:
      "Pencairan Stripe bulanan pada hari penagihan, seumur hidup untuk tiap langganan aktif.",
    faqCostsInvolvedQuestion: "Biaya yang Timbul",
    faqCostsInvolvedAnswer: "Nol, sepenuhnya berbasis komisi.",
    faqTerritoryQuestion: "Wilayah",
    faqTerritoryAnswer: "Restoran independen di seluruh dunia, prioritas AS.",
    faqResourcesQuestion: "Materi Pendukung",
    faqResourcesAnswer:
      "Portal berisi video, skrip, dan presentasi; tersedia juga warm lead.",
    trustBadgeDeployments: "600+ Implementasi Aktif",
    trustBadgeFieldTested: "Model Teruji di Lapangan",
    trustBadgeRevenueShare: "Murni Bagi Hasil",
    trustBadgeExclusiveAccess: "Akses Eksklusif",
    termsHeading: "Ketentuan Program Mitra",
    termsIncomeContinuity:
      "Kelangsungan Penghasilan: Komisi berlanjut hanya untuk langganan yang aktif.",
    termsTerminationRights:
      "Hak Penghentian: Menuthere berhak menghentikan kemitraan yang tidak sejalan dengan brand.",
    termsPayoutTiming:
      "Waktu Pembayaran: Tepat pada hari penagihan langganan, setelah dipotong biaya.",
    termsEligibility:
      "Kelayakan: Mitra dari seluruh dunia diterima; tunduk pada persetujuan.",
  },
  solutionsIndex: {
    metaTitle: "Solusi Menu Digital untuk Semua Bisnis Kuliner | Menuthere",
    metaDescription:
      "Menu digital cerdas untuk restoran, kafe, toko roti, cloud kitchen, hotel, food truck, bar, dan katering. Menu QR, update real-time, sinkron ke Google.",
    ogTitle: "Solusi Menu Digital | Menuthere",
    ogDescription:
      "Menu digital cerdas untuk restoran, kafe, toko roti, dan lainnya. Pembaruan real-time, desain memikat, tanpa biaya cetak.",
    heroTitleLead: "Menu digital yang",
    heroTitleEmphasis: "mengubah",
    heroTitleTail: "bisnis Anda.",
    heroSubtitle:
      "Baik Anda mengelola kafe mungil, restoran yang selalu ramai, atau jaringan cloud kitchen — platform kami menyesuaikan diri dengan kebutuhan unik Anda.",
    heroPrimaryCta: "Mulai Gratis",
    heroSecondaryCta: "Jadwalkan Demo",
    industriesHeadingLead: "Pilih industri Anda,",
    industriesHeadingEmphasis: "mulai sekarang.",
    industriesIntro:
      "Solusi menu digital yang dirancang khusus untuk jenis bisnis kuliner Anda.",
    cardRestaurantsTitle: "Restoran",
    cardRestaurantsDesc: "Menu digital cerdas untuk pengalaman makan di tempat",
    cardCafesTitle: "Kafe & Kedai Kopi",
    cardCafesDesc: "Menu modern untuk pengalaman ngopi terbaik",
    cardBakeriesTitle: "Toko Roti & Kue",
    cardBakeriesDesc: "Tampilkan roti segar Anda dengan memikat",
    cardCloudKitchensTitle: "Cloud Kitchen",
    cardCloudKitchensDesc: "Kelola menu banyak brand jadi mudah",
    cardHotelsTitle: "Hotel & Resor",
    cardHotelsDesc: "Pengalaman bersantap elegan untuk tamu",
    cardFoodTrucksTitle: "Food Truck",
    cardFoodTrucksDesc: "Menu mobile yang ikut ke mana pun Anda pergi",
    cardBarsTitle: "Bar & Pub",
    cardBarsDesc: "Menu minuman dinamis dan bergaya",
    cardCateringTitle: "Jasa Katering",
    cardCateringDesc: "Menu profesional untuk setiap acara",
    cardOwnersTitle: "Pemilik Restoran",
    cardOwnersDesc: "Ambil kembali kendali operasional restoran Anda",
    cardAgenciesTitle: "Agensi & Konsultan",
    cardAgenciesDesc: "Kelola banyak akun klien dengan mudah",
    cardPetpoojaTitle: "Pemesanan Langsung & PetPooja",
    cardPetpoojaDesc: "Alternatif tanpa komisi untuk Swiggy & Zomato",
    cardWhatsappOrderingTitle: "Pemesanan WhatsApp",
    cardWhatsappOrderingDesc:
      "Pelanggan cukup kirim “Hi” untuk memesan — tanpa aplikasi, tanpa daftar",
    cardLearnMoreLink: "Pelajari selengkapnya",
    featuresHeadingLead: "Fitur andal,",
    featuresHeadingEmphasis: "untuk semua bisnis.",
    featureQrTitle: "Menu Kode QR",
    featureQrDesc: "Akses instan lewat pindai smartphone. Tanpa unduh aplikasi.",
    featureRealtimeTitle: "Pembaruan Real-Time",
    featureRealtimeDesc: "Ubah harga, tambah item, tandai habis — seketika.",
    featureGoogleSyncTitle: "Sinkron Google Business",
    featureGoogleSyncDesc:
      "Perbarui otomatis menu di Google Business Profile Anda.",
    featureAnalyticsTitle: "Analitik & Wawasan",
    featureAnalyticsDesc: "Pantau item terlaris dan preferensi pelanggan.",
    googleBadge: "Integrasi Google Business",
    googleHeading: "Sinkronkan menu Anda dengan Google Business Profile",
    googleBody:
      "Menu di Google Business Profile Anda diperbarui otomatis setiap kali Anda melakukan perubahan. Pelanggan yang mencari Anda di Google Maps selalu melihat penawaran terbaru.",
    googleBenefitOneClickSync: "Sinkron sekali klik ke Google Business Profile",
    googleBenefitRealtimeUpdates: "Pembaruan menu real-time di semua platform",
    googleBenefitLocalSeo: "SEO lokal dan visibilitas yang lebih baik",
    googleBenefitMoreCustomers:
      "Datangkan lebih banyak pelanggan dari Google Search & Maps",
    googleManagerLink: "Pelajari Google Business Manager",
    googleCardTitle: "Google Business Profile",
    googleCardSubtitle: "Menu Manager",
    googleCardSyncedLabel: "Item Menu Tersinkron",
    googleCardLastSyncLabel: "Sinkron Terakhir",
    googleCardLastSyncValue: "Baru saja",
  },
  getStarted: {
    metaTitle: "Mulai Sekarang | Menuthere",
    metaDescription: "Buat menu digital Anda bersama Menuthere.",
    stepIndicator: "Langkah {step} dari 3",
    publishingLoader1: "Membuat akun Anda...",
    publishingLoader2: "Menyiapkan menu digital Anda...",
    publishingLoader3: "Mengonfigurasi dasbor...",
    publishingLoader4: "Sedikit lagi...",
    step1Title: "Unggah Menu Anda",
    step1Subtitle: "Foto menu Anda dan kami digitalkan seketika.",
    filesSelectedCount: "{count} File Dipilih",
    uploadDropzonePrompt: "Klik untuk unggah, seret & lepas, atau tempel",
    uploadFormatsHint: "JPG, PNG, PDF hingga 10MB",
    uploadAddMoreHint: "Klik area ini untuk menambah",
    fileTooLargeBadge: "Terlalu besar ({size}MB)",
    filePreviewAlt: "Halaman {number}",
    aiInstructionLabel: "Instruksi untuk AI kami",
    optionalSuffix: "(opsional)",
    aiInstructionPlaceholder:
      "Ada hal khusus dari menu Anda? mis. \"Abaikan semua minuman\", \"Jadikan Combo kategori tersendiri\", \"Harga dalam AED\"",
    aiInstructionHint:
      "Instruksi Anda diprioritaskan saat AI membaca file Anda.",
    removeInvalidFilesButton: "Hapus file tidak valid untuk lanjut",
    nextStepButton: "Langkah Berikutnya",
    uploadOrDivider: "Atau",
    sampleMenuButton: "Coba dengan Menu Contoh",
    sampleMenuDialogTitle: "Pilih Menu Contoh",
    sampleMenuDialogSubtitle:
      "Pilih jenis restoran untuk memulai dengan menu siap pakai.",
    sampleMenuComingSoonBadge: "Segera hadir",
    filesTooLargeToast:
      "{count} file melebihi batas 10MB. Silakan unggah file yang lebih kecil.",
    filesAddedToast: "{count} file ditambahkan!",
    sampleMenuLoadedToast: "Menu contoh \"{name}\" dimuat!",
    step2Title: "Detail Restoran",
    step2Subtitle:
      "Ceritakan sedikit tentang tempat Anda agar menunya terasa personal.",
    restaurantNameLabel: "Nama Restoran",
    restaurantNamePlaceholder: "mis. The Burger Joint",
    usernameLabel: "Nama Pengguna",
    usernamePlaceholder: "nama_toko_anda",
    usernameCheckingStatus: "Memeriksa ketersediaan...",
    usernameAvailableStatus: "Nama pengguna tersedia",
    usernameTakenStatus: "Nama pengguna ini sudah dipakai",
    usernameMinLengthHint: "Nama pengguna minimal 3 karakter",
    phoneNumberLabel: "Nomor Telepon",
    phoneCodePlaceholder: "Kode",
    phoneInvalidError: "Nomor telepon tidak valid",
    countryLabel: "Negara",
    countryPlaceholder: "Pilih atau ketik Negara",
    addressLabel: "Alamat",
    addressPlaceholder: "Jalan, area, kota…",
    currencyLabel: "Mata Uang",
    currencyPlaceholder: "Pilih atau cari mata uang",
    currencySearchPlaceholder: "Cari mata uang (mis. USD, Euro, ₹)",
    currencySelectFallback: "Pilih Mata Uang",
    currencyNoMatch: "Tidak ada yang cocok",
    logoLabel: "Logo (opsional)",
    logoPreviewAlt: "Pratinjau logo",
    changeLogoButton: "Ganti logo",
    uploadLogoButton: "Unggah logo",
    removeLogoButton: "Hapus",
    logoSizeLabel: "Ukuran (%)",
    logoBackgroundLabel: "Latar belakang",
    createMenuButton: "Buat Menu",
    logoNotAnImageToast: "Pilih file gambar untuk logo Anda",
    logoTooLargeToast: "Logo harus di bawah 10MB",
    logoReadFailedToast: "Gambar itu tidak bisa dibaca",
    missingDetailsToast: "Mohon lengkapi semua detail",
    invalidPhoneToast: "Masukkan nomor telepon yang valid",
    extractingTitle: "Mengekstrak Menu Anda",
    extractingSubtitle:
      "Mohon tunggu, kami sedang memproses gambar menu Anda...",
    extractionErrorTitle: "Ekstraksi Gagal",
    menuUnreadableError:
      "Menu Anda tidak terbaca. Coba file yang lebih jelas atau tambahkan item secara manual.",
    extractionFailedToast: "Gagal mengekstrak menu. Silakan coba lagi.",
    retryExtractionButton: "Coba Lagi",
    cancelExtractionButton: "Batal & Unggah Ulang",
    step3Title: "Menu Anda Siap!",
    step3Subtitle:
      "Kami mengekstrak {count} item. Sesuaikan tema Anda di bawah ini.",
    themePickerTitle: "Pilih Tema",
    themeSwatchSample: "Aa",
    themeClassicLabel: "Klasik",
    themeMidnightLabel: "Tengah Malam",
    themeFreshLabel: "Segar",
    publishButton: "Terbitkan Sekarang",
    authModalSignInTitle: "Masuk untuk menerbitkan",
    authModalEmailHint:
      "Kami akan mengirim detail login dasbor Anda ke email Anda.",
    googleSignInButton: "Masuk dengan Google",
    authDividerOr: "atau",
    emailPlaceholder: "anda@contoh.com",
    continueWithEmailButton: "Lanjut dengan Email",
    authModalPasswordTitle: "Buat kata sandi",
    authModalPasswordHint: "Tetapkan kata sandi untuk akun dasbor Anda.",
    passwordPlaceholder: "Kata sandi (min. 6 karakter)",
    confirmPasswordPlaceholder: "Konfirmasi kata sandi",
    continueButton: "Lanjut",
    invalidEmailToast: "Masukkan alamat email yang valid",
    passwordTooShortToast: "Kata sandi minimal 6 karakter",
    passwordMismatchToast: "Kata sandi tidak cocok",
    emailAlreadyRegisteredToast:
      "Email ini sudah terdaftar. Silakan gunakan email lain.",
    googleSignInSuccessToast: "Berhasil masuk dengan Google!",
    googleSignInFailedToast: "Gagal masuk dengan Google. Silakan coba lagi.",
    publishSuccessToast: "Menu diterbitkan! Mengalihkan ke dasbor...",
    publishFailedToast: "Gagal menyelesaikan pendaftaran. Silakan coba lagi.",
    successTitle: "Cek Email Anda!",
    successSubtitle:
      "Kami sudah mengirim tautan menu dan kredensial login dasbor Anda ke:",
    successSpamHint:
      "Tidak menemukannya? Cek folder spam atau perbarui email Anda di bawah ini.",
    successMobileSubtitle:
      "Kami sudah mengirim tautan menu dan kredensial dasbor ke email Anda.",
    changeEmailButton: "Salah email? Ubah di sini",
    loginToDashboardButton: "Masuk ke Dasbor",
    changeEmailTitle: "Ubah Email",
    changeEmailSubtitle:
      "Masukkan alamat email yang benar. Kami akan mengirim tautan menu dan kredensial dasbor ke sana.",
    newEmailLabel: "Alamat Email Baru",
    updatingEmailButton: "Memperbarui...",
    updateAndResendButton: "Perbarui & Kirim Ulang",
    emailUpdatedToast: "Email diperbarui! Cek kotak masuk baru Anda.",
    emailUpdateFailedToast: "Gagal memperbarui email. Silakan coba lagi.",
  },
  helpCenter: {
    metaTitle: "Bantuan & Dukungan | Menu Digital Menuthere",
    metaDescription:
      "Dapatkan bantuan untuk menu digital Menuthere Anda. FAQ, dukungan WhatsApp, dan kontak email. Jawaban cepat soal pengelolaan menu, promo, dan lainnya.",
    heroTitle: "Bantuan &",
    heroTitleAccent: "Dukungan.",
    heroSubtitle:
      "Butuh bantuan? Hubungi kami lewat email atau chat langsung di WhatsApp.",
    faqSectionTitle: "Pertanyaan yang sering",
    faqSectionTitleAccent: "diajukan.",
    faq1Question:
      "Bagaimana caranya agar pelanggan tidak lagi menemukan menu lama di Google atau aplikasi?",
    faq1Answer:
      "Semua perubahan — produk, harga, deskripsi, atau ketersediaan — langsung diterapkan ke menu digital Anda. Cek dengan mengklik Lihat Menu dari dasbor Anda; tanpa jeda, tanpa cetak ulang.",
    faq2Question:
      "Item yang habis masih muncul di menu QR/digital saya — kenapa?",
    faq2Answer:
      "Di bagian Menu, klik Ketersediaan di bagian atas. Aktifkan atau matikan seluruh kategori maupun item satu per satu hanya dengan sekali klik — item yang habis langsung lenyap di semua tempat.",
    faq3Question: "Memperbarui menu makan waktu lama dan biaya desainernya mahal.",
    faq3Answer:
      "Mengedit sangat mudah dan hanya butuh beberapa detik — tanpa pengetahuan teknis. Buka bagian Menu, klik produk mana pun untuk memperbarui nama, harga, gambar, deskripsi, promo, atau varian, lalu simpan. Perubahan langsung tayang.",
    faq4Question: "Bagaimana cara memperbarui produk menu secara instan?",
    faq4Answer:
      "Buka bagian Menu di dasbor Anda. Semua kategori dan produk akan terlihat — klik salah satunya untuk mengedit detail seperti nama, harga, gambar, atau deskripsi, lalu simpan untuk pembaruan instan.",
    faq5Question: "Bagaimana cara menyusun ulang item atau kategori menu?",
    faq5Answer:
      "Buka bagian Menu dan klik Prioritas. Seret atau atur nomor prioritas untuk kategori dan item, lalu simpan — urutan barunya langsung tampil.",
    faq6Question: "Bagaimana cara menambahkan promo atau menu spesial?",
    faq6Answer:
      "Untuk Spesial/Terlaris: di bagian Menu, aktifkan opsinya per item — item akan muncul sebagai Wajib Coba di bagian atas. Untuk promo khusus: buka bagian Promo, buat penawaran satu atau banyak item, dan promonya aktif seketika.",
    faq7Question:
      "Susah memperbarui banner atau foto produk tanpa bantuan teknis?",
    faq7Answer:
      "Buka Pengaturan → Pengaturan Umum untuk mengunggah atau mengganti banner restoran Anda. Untuk produk, edit gambarnya langsung di bagian Menu — cukup seret dan lepas, langsung tayang.",
    faq8Question:
      "Bisakah saya melihat pratinjau atau menjadwalkan perubahan seperti menu spesial harian?",
    faq8Answer:
      "Bisa — lihat pratinjau setiap perubahan lewat Lihat Menu sebelum menyimpan. Untuk penjadwalan, gunakan bagian Promo untuk mengatur pembaruan terjadwal (mis. spesial harian) — otomatis, tanpa login tiap hari.",
    faq9Question: "Bisakah saya menutup toko di luar jam operasional?",
    faq9Answer:
      "Bisa. Buka Pengaturan dan nonaktifkan restoran Anda kapan saja — cocok untuk di luar jam operasional, hari libur, atau perawatan. Aktifkan lagi saat siap.",
    faq10Question: "Seberapa mudah sebenarnya mengedit item menu?",
    faq10Answer:
      "Sangat mudah — hitungan detik per perubahan. Perbarui harga, nama, gambar, ketersediaan, atau promo lewat toggle dan dropdown yang intuitif di bagian Menu, tanpa coding atau desainer.",
    faq11Question: "Bisakah saya membatalkan langganan kapan saja?",
    faq11Answer:
      "Bisa — batalkan kapan saja dari akun Anda. Paket tetap aktif sampai periode penagihan berjalan berakhir, tanpa biaya tambahan kecuali Anda memperpanjang.",
  },

  landing: {
    socialProofEyebrow: "Angka nyata dari 30 hari terakhir",
    statOrdersLabel: "Pesanan Diterima",
    statRevenueLabel: "Pendapatan Dihasilkan",
    statAvgOrderValueLabel: "Rata-rata Nilai Pesanan",
    statSuffixLakh: "L+",
    statSuffixThousand: "K+",
    platformHeadingLead: "Semua kebutuhan restoran Anda,",
    platformHeadingAccent: "dalam satu platform.",
    featureWebsiteAppTitle: "Website & Aplikasi Ber-brand Anda Sendiri",
    featureWebsiteAppBody:
      "Luncurkan website pemesanan ber-brand dan aplikasi Anda sendiri di App Store dan Play Store, semuanya atas nama Anda. Pelanggan memesan langsung dari Anda. Tanpa perantara agregator, tanpa komisi 20-33%. Mereka menjelajah, memesan, melacak pengantaran, dan memesan ulang hanya dengan satu ketukan, sementara hubungan dengan pelanggan tetap milik Anda, harga Anda kendalikan sendiri, dan seluruh keuntungan tetap di tangan Anda.",
    featureWebsiteAppCta: "Lihat cara kerjanya",
    featureWhatsappOrderingTitle: "Pesan lewat WhatsApp — cukup kirim “Hi”",
    featureWhatsappOrderingBody:
      "Ubah nomor WhatsApp Anda menjadi kanal pemesanan termudah. Pelanggan cukup mengirim “Hi” dan langsung menerima tautan auto-login ke menu Anda — tanpa aplikasi yang perlu diunduh, tanpa pendaftaran, tanpa OTP. Mereka memesan dalam beberapa ketukan dan menerima update status langsung di WhatsApp, sementara pelanggan tetap milik Anda dan komisinya nol.",
    featureWhatsappOrderingCta: "Lihat pemesanan WhatsApp",
    featurePetpoojaTitle: "Integrasi POS Petpooja",
    featurePetpoojaBody:
      "Setiap pesanan online mengalir langsung ke POS Petpooja Anda secara real-time. Tanpa input manual, tanpa pesanan terlewat, tanpa kerja ganda. Item menu, harga, dan kategori tersinkron otomatis antara POS dan website pesan antar Anda. Satu-satunya platform di India dengan integrasi Petpooja yang mendalam.",
    featurePetpoojaCta: "Pelajari integrasi Petpooja",
    featurePaymentsTitle: "Integrasi Pembayaran",
    featurePaymentsBody:
      "Terima pembayaran seketika lewat UPI, kartu, net banking, dan dompet digital bawaan, plus bayar di tempat. Checkout aman dan patuh PCI yang didukung Cashfree, dengan dana masuk langsung ke rekening bank Anda. Tak ada agregator yang menahan dana Anda dan tak ada penundaan pencairan. Setiap rupiah sampai ke tangan Anda.",
    featurePaymentsCta: "Lihat opsi pembayaran",
    featureOrderManagementTitle: "Manajemen Pesanan Real-Time",
    featureOrderManagementBody:
      "Terima, lacak, dan kelola pesanan antar dari satu dasbor. Dapatkan notifikasi instan untuk pesanan baru, perbarui status pesanan secara real-time, dan jaga dapur serta tim antar Anda tetap selaras. Tak perlu lagi berpindah-pindah tablet atau kehilangan pesanan saat jam sibuk.",
    featureOrderManagementCta: "Jelajahi manajemen pesanan",
    featureDigitalMenuTitle: "Manajemen Menu Digital",
    featureDigitalMenuBody:
      "Kelola seluruh menu dari satu dasbor: tambah atau ubah item, harga, kategori, foto, dan varian secara real-time. Tandai hidangan tersedia atau habis seketika, atur filter diet dan pencarian cerdas, lalu jaga semuanya tetap sinkron di website, aplikasi, dan kode QR Anda. Tanpa cetak ulang, tanpa developer. Perubahan tayang begitu Anda menyimpan.",
    featureDigitalMenuCta: "Pelajari Menu Digital",
    featureOffersTitle: "Promo & Penawaran Dinamis",
    featureOffersBody:
      "Jalankan flash sale, promo happy hour, atau diskon berbatas waktu yang aktif dan berakhir otomatis. Sorot menu terlaris dengan badge Wajib Coba dan label Pilihan Chef. Dorong pesanan berulang dan naikkan omzet tanpa mencetak satu selebaran pun.",
    featureOffersCta: "Lihat cara kerja promo",
    featureGoogleSyncTitle: "Sinkron Menu Google Business",
    featureGoogleSyncBody:
      "Sinkronkan seluruh menu Anda (kategori, item, harga, dan foto) ke Google Business Profile hanya dengan satu klik. Tampil di Google Maps dengan menu lengkap. Restoran dengan profil lengkap mendapat 7x lebih banyak klik dan 30% lebih banyak kunjungan.",
    featureGoogleSyncCta: "Lihat cara kerja Google Sync",
    featureDeliveryAppTitle: "Aplikasi Kurir",
    featureDeliveryAppBody:
      "Aplikasi khusus untuk tim pengantaran Anda. Kurir menerima notifikasi pesanan, menavigasi ke lokasi pelanggan, dan memperbarui status pengantaran — semuanya real-time. Lacak lokasi langsung, tugaskan pesanan otomatis, dan pastikan pengantaran lebih cepat dengan visibilitas penuh.",
    featureDeliveryAppCta: "Pelajari aplikasi kurir",
    featureAnalyticsTitle: "Analitik & Wawasan",
    featureAnalyticsBody:
      "Pantau volume pesanan, tren pendapatan, jam sibuk, dan item terlaris. Ambil keputusan berbasis data soal harga, promo, dan operasional pengantaran Anda. Ketahui persis apa yang berhasil dan di mana harus dioptimalkan.",
    featureAnalyticsCta: "Pelajari analitik",
    ctaBannerHeadingDefault:
      "Luncurkan website pesan antar Anda dalam kurang dari 2 menit.",
    ctaBannerBodyDefault:
      "Unggah menu, atur zona pengantaran, dan mulai terima pesanan langsung dari pelanggan Anda dengan integrasi POS Petpooja penuh. Bergabunglah dengan 600+ restoran yang sudah tumbuh bersama Menuthere.",
    ctaBannerPrimaryButton: "Mulai gratis",
    ctaBannerSecondaryButton: "Lihat semua paket",
    faqHeadingLead: "Pertanyaan yang sering",
    faqHeadingAccent: "diajukan.",
    faqVsAggregatorsQuestion: "Apa bedanya Menuthere dengan Zomato atau Swiggy?",
    faqVsAggregatorsAnswer:
      "Agregator seperti Zomato dan Swiggy memungut komisi 20-33% dari setiap pesanan. Menuthere memberi Anda website pesan antar ber-brand sendiri tempat pelanggan memesan langsung dari Anda, dengan komisi hanya 1%. Data pelanggan milik Anda, harga Anda kendalikan, dan loyalitas brand Anda bangun sendiri.",
    faqPetpoojaIntegrationQuestion:
      "Bagaimana cara kerja integrasi POS Petpooja?",
    faqPetpoojaIntegrationAnswer:
      "Setelah terhubung, menu Petpooja Anda tersinkron otomatis dengan website pesan antar Menuthere. Setiap pesanan online dikirim langsung ke POS Anda secara real-time. Tanpa input manual, tanpa pesanan terlewat. Item menu, harga, dan kategori tetap selaras di kedua sistem.",
    faqDeliveryZonesQuestion:
      "Bagaimana cara mengatur zona dan ongkos pengantaran saya?",
    faqDeliveryZonesAnswer:
      "Dari dasbor Anda, buka Pengaturan Pengantaran. Tentukan zona berdasarkan radius atau kode pos, atur ongkos kirim per zona, dan tetapkan minimum pemesanan. Anda juga bisa mengaktifkan atau menonaktifkan pengantaran untuk area tertentu kapan saja.",
    faqPickupOrdersQuestion:
      "Bisakah pelanggan memesan untuk ambil sendiri, bukan hanya diantar?",
    faqPickupOrdersAnswer:
      "Bisa, website pesan antar Anda mendukung pesanan antar maupun ambil sendiri. Pelanggan memilih preferensinya saat checkout. Anda bisa mengaktifkan atau menonaktifkan salah satunya dari pengaturan dasbor.",
    faqRushHourOrdersQuestion:
      "Bagaimana cara mengelola pesanan yang masuk saat jam sibuk?",
    faqRushHourOrdersAnswer:
      "Semua pesanan muncul di dasbor Anda secara real-time dengan notifikasi instan. Anda bisa menerima, menyiapkan, dan memperbarui status pesanan dari satu layar. Pesanan juga tersinkron ke POS Petpooja jika terhubung, sehingga dapur Anda selalu tahu.",
    faqTechnicalSkillsQuestion:
      "Apakah saya butuh kemampuan teknis untuk menyiapkannya?",
    faqTechnicalSkillsAnswer:
      "Sama sekali tidak. Unggah menu Anda (atau sinkronkan dari Petpooja), sesuaikan branding, dan website pesan antar Anda tayang dalam hitungan menit. Tanpa coding, tanpa desainer, tanpa unduh aplikasi.",
    faqOffersDiscountsQuestion:
      "Bisakah saya menjalankan promo dan diskon di website pesan antar saya?",
    faqOffersDiscountsAnswer:
      "Bisa! Jalankan flash sale, kode kupon, diskon pesanan pertama, atau promo berbatas waktu yang aktif dan berakhir otomatis. Sorot menu terlaris dengan badge Wajib Coba untuk menaikkan rata-rata nilai pesanan.",
    faqCustomerDiscoveryQuestion:
      "Bagaimana pelanggan menemukan website pesan antar saya?",
    faqCustomerDiscoveryAnswer:
      "Bagikan tautan website Anda di media sosial, WhatsApp, Google Business Profile, dan kode QR di dalam toko. Menuthere juga menyinkronkan menu Anda ke Google Maps agar pelanggan menemukan Anda secara organik. Website Anda sudah dioptimalkan untuk SEO sejak awal.",
    faqPauseOrderingQuestion:
      "Bisakah saya menutup pemesanan di luar jam operasional?",
    faqPauseOrderingAnswer:
      "Bisa. Buka Pengaturan dan nonaktifkan restoran Anda kapan saja — cocok untuk di luar jam operasional, hari libur, atau perawatan. Aktifkan lagi saat siap. Anda juga bisa mengatur jadwal buka/tutup otomatis.",
    faqCancelSubscriptionQuestion:
      "Bisakah saya membatalkan langganan kapan saja?",
    faqCancelSubscriptionAnswer:
      "Bisa, batalkan kapan saja dari akun Anda. Paket tetap aktif sampai periode penagihan berjalan berakhir, tanpa biaya tambahan kecuali Anda memperpanjang.",
    reviewExpandButton: "Selengkapnya",
    reviewCollapseButton: "Sembunyikan",
    reviewOneAuthorName: "Hotel Colombo",
    reviewOneAuthorLocation: "MG Road, Edappally",
    reviewOneAuthorInitials: "HC",
    reviewOneParagraphOne:
      "Jujur, saya tidak pernah menyangka membuat aplikasi bisa semudah ini 😅 mereka menangani semuanya dengan mulus dan membuat seluruh prosesnya jadi sangat sederhana buat kami.",
    reviewOneParagraphTwo:
      "Dan hasilnya persis seperti yang saya inginkan. Saya cukup rewel soal beberapa hal dan sama sekali tidak mau berkompromi — kami melewati banyak revisi, tapi mereka sabar dan tenang sepanjang prosesnya, dan hasilnya tepat seperti yang saya mau.",
    reviewOneParagraphThree:
      "Kerja yang sangat rapi, terima kasih banyak teman-teman.",
    reviewTwoAuthorName: "Rimaal Mandi & Grills",
    reviewTwoAuthorLocation: "Pune",
    reviewTwoAuthorInitials: "RM",
    reviewTwoParagraphOne:
      "Terima kasih kepada tim MenuThere yang telah mengembangkan aplikasi kami. Aplikasi ini membantu pelanggan memesan langsung dari kami dan membuat pengelolaan pengantaran jauh lebih mudah. Kami juga menyediakan opsi pengantaran pihak ketiga seperti Porter, dan tim berhasil mengintegrasikannya ke dalam sistem. Semuanya berjalan lancar, dan mereka bekerja dengan sangat baik.",
    reviewTwoParagraphTwo:
      "Alasan utama kami meluncurkan aplikasi ini adalah karena, meski platform seperti Zomato dan Swiggy membawa bisnis dan jangkauan pelanggan yang bagus, sisi pembayarannya kadang menyulitkan akibat komisi dan biaya lain. Tentu kami tidak bisa lepas dari Zomato dan Swiggy, karena banyak pelanggan sudah terbiasa memesan lewat sana, dan kami akan terus bekerja sama dengan mereka.",
    reviewTwoParagraphThree:
      "Di saat yang sama, aplikasi ini memberi kami kanal lain untuk terhubung langsung dengan pelanggan dan melayani mereka lebih baik.",
    reviewTwoParagraphFour:
      "Terima kasih, tim MenuThere, atas dukungan dan kerja luar biasanya.",
  },
  footerLinks: {
    brandBlurb:
      "Platform pemesanan dan pengantaran online serba ada untuk restoran. Luncurkan website Anda sendiri, lewati komisi agregator, dan kembangkan bisnis Anda.",
    solutionsGoogleBusinessSync: "Sinkron Google Business",
    solutionsOwners: "Pemilik",
    solutionsAgencies: "Agensi",
    solutionsPetpoojaIntegration: "Integrasi PetPooja",
    solutionsRestaurants: "Restoran",
    solutionsCafes: "Kafe",
    resourcesHelpCenter: "Pusat Bantuan",
    resourcesDownloadApp: "Unduh Aplikasi",
    resourcesGetStarted: "Mulai Sekarang",
    legalPrivacyPolicy: "Kebijakan Privasi",
    legalTermsOfService: "Ketentuan Layanan",
    legalRefundPolicy: "Kebijakan Pengembalian Dana",
    copyright: "© 2026 Menuthere.",
  },
  solutionsRest: {
    shared: {
      breadcrumbHome: "Beranda",
      breadcrumbSolutions: "Solusi",
      bookDemoCta: "Jadwalkan Demo",
      stepLabel: "Langkah {step}",
      faqHeading: "Pertanyaan yang sering diajukan.",
      zeroPercentValue: "0%",
    },
    googleBusiness: {
      metaTitle: "Sinkron Menu Restoran ke Google Business | Menuthere",
      metaDescription:
        "Sinkronkan menu restoran Anda ke Google Business Profile secara otomatis. Setup sekali klik, pembaruan real-time, SEO lokal lebih kuat. Dipercaya 600+ restoran.",
      ogDescription:
        "Sinkronkan menu restoran Anda ke Google Maps secara otomatis. Selalu terbaru, tanpa kerja manual.",
      breadcrumbCurrent: "Sinkron Menu Google Business Profile",
      heroBadge: "Integrasi Google Business",
      heroTitle: "Sinkronkan Menu Anda ke Google Maps Secara Otomatis",
      heroSubtitle:
        "Jaga menu Google Business Profile Anda selalu terbaru. Sinkron sekali klik dari Menuthere — menu Anda di Google Search & Maps, akurat setiap saat.",
      heroPrimaryCta: "Sinkronkan menu Anda",
      mockupCardTitle: "Google Business Profile",
      mockupCardSubtitle: "Manajer Sinkron Menu",
      mockupSyncStatusTitle: "Menu Berhasil Disinkronkan",
      mockupSyncStatusMeta: "Sinkron terakhir: Baru saja",
      mockupStatItemsLabel: "Item Tersinkron",
      mockupStatCategoriesLabel: "Kategori",
      mockupStatImagesLabel: "Dengan Gambar",
      mockupRecentlySyncedLabel: "Baru Disinkronkan",
      mockupItem1Name: "Butter Chicken",
      mockupItem1Category: "Menu Utama",
      mockupItem2Name: "Paneer Tikka",
      mockupItem2Category: "Hidangan Pembuka",
      mockupItem3Name: "Gulab Jamun",
      mockupItem3Category: "Hidangan Penutup",
      mockupBadgeTitle: "Kunjungan Profil",
      mockupBadgeValue: "+340% bulan ini",
      statSyncingValue: "500+",
      statSyncingLabel: "Restoran Tersinkron",
      statClicksValue: "7x",
      statClicksLabel: "Klik Profil Lebih Banyak",
      statSyncTimeValue: "< 30 dtk",
      statSyncTimeLabel: "Waktu Sinkron",
      statFootfallValue: "30%",
      statFootfallLabel: "Kunjungan Lebih Banyak",
      howItWorksBadge: "Proses Sederhana 3 Langkah",
      howItWorksHeading: "Cara Kerjanya",
      howItWorksSubheading:
        "Dari dasbor menu Anda ke Google Maps dalam tiga langkah sederhana",
      step1Title: "Buat Menu Anda",
      step1Body:
        "Bangun menu Anda di platform kami lengkap dengan kategori, item, harga, dan foto. Hanya butuh beberapa menit.",
      step2Title: "Hubungkan Profil Google",
      step2Body:
        "Tautkan Google Business Profile Anda dengan sekali klik. Semua urusan OAuth dan API kami yang tangani.",
      step3Title: "Sinkron & Tayang",
      step3Body:
        "Tekan sinkron dan seluruh menu Anda muncul di Google Maps. Perbarui kapan saja — perubahan tampil seketika.",
      benefitsHeading: "Kenapa Restoran Menyukai Sinkron Menu Google",
      benefitsSubheading:
        "Menu adalah alat pemasaran paling ampuh Anda — pastikan ia muncul di tempat pelanggan mencari",
      benefit1Title: "Dongkrak SEO Lokal",
      benefit1Body:
        "Restoran dengan Google Business Profile yang lengkap mendapat 7x lebih banyak klik. Menu yang tersinkron adalah salah satu sinyal peringkat lokal terkuat — membantu Anda muncul lebih tinggi di pencarian \"restoran terdekat\".",
      benefit2Title: "Tampil di Google Maps",
      benefit2Body:
        "Saat pelanggan mencari makanan di Google Maps, menu lengkap Anda langsung terlihat — harga, kategori, dan itemnya. Mereka bisa memutuskan untuk datang bahkan sebelum menelepon Anda.",
      benefit3Title: "Selalu Terbaru",
      benefit3Body:
        "Ganti harga? Tambah hidangan baru? Hapus menu musiman? Sekali sinkron dan menu Google Business Profile Anda menampilkan versi terbaru. Tanpa edit manual di Google.",
      benefit4Title: "Hemat Berjam-jam Tiap Minggu",
      benefit4Body:
        "Memperbarui menu Google Business secara manual itu melelahkan dan rawan salah. Sinkron kami menyelesaikannya dalam hitungan detik, bukan jam. Fokuslah memasak, bukan menyalin-tempel.",
      benefit5Title: "Datangkan Lebih Banyak Kunjungan",
      benefit5Body:
        "Pelanggan yang melihat menu lengkap di Google 30% lebih mungkin datang. Beri mereka informasi yang dibutuhkan untuk memilih Anda dibanding pesaing.",
      benefit6Title: "Akurat & Andal",
      benefit6Body:
        "Tak ada lagi selisih harga antara menu asli Anda dan yang tampil di Google. Hilangkan keluhan pelanggan soal informasi usang di Maps.",
      comparisonHeading: "Tanpa Sinkron vs. Dengan Menuthere",
      comparisonSubheading:
        "Lihat perbedaan yang dibuat oleh sinkron menu otomatis",
      comparisonWithoutBadge: "✕ Tanpa Sinkron",
      comparisonWithout1: "Tambah setiap item di Google satu per satu",
      comparisonWithout2: "Menu di Google jadi usang dalam hitungan hari",
      comparisonWithout3: "Harga yang tak cocok memicu keluhan pelanggan",
      comparisonWithout4: "Berjam-jam input data setiap bulan",
      comparisonWithout5: "Tanpa gambar — hanya daftar teks polos",
      comparisonWithout6: "Informasi tidak konsisten antar platform",
      comparisonWithBadge: "✓ Dengan Menuthere",
      comparisonWith1: "Sinkron sekali klik mengirim seluruh menu",
      comparisonWith2: "Menu Google selalu sama dengan penawaran terbaru",
      comparisonWith3: "Harga akurat membangun kepercayaan pelanggan",
      comparisonWith4: "Hitungan detik, bukan berjam-jam kerja manual",
      comparisonWith5: "Dukungan gambar penuh agar makin menggugah",
      comparisonWith6: "Satu menu selaras di website, QR & Google",
      featuresHeading: "Semua yang Anda Dapat dengan Sinkron Menu Google",
      featuresSubheading:
        "Perangkat lengkap untuk menjaga kehadiran Google Anda tetap akurat dan menarik.",
      feature1: "Sinkron menu penuh sekali klik ke Google Business Profile",
      feature2: "Pemetaan dan penataan kategori otomatis",
      feature3: "Dukungan unggah gambar untuk item menu",
      feature4: "Sinkron harga dan ketersediaan",
      feature5: "Dukungan multi-lokasi untuk jaringan restoran",
      feature6: "Riwayat sinkron dan pelacakan status",
      feature7: "Bekerja dengan akun Google Business mana pun",
      feature8: "Tanpa perlu pengetahuan teknis",
      feature9: "Mendukung label vegetarian/non-vegetarian",
      feature10: "Menangani karakter khusus dan menu multibahasa",
      ctaBoxHeading: "Siap menyinkronkan menu Anda?",
      ctaBoxBody:
        "Bergabunglah dengan ratusan restoran yang sudah memakai Menuthere untuk menjaga kehadiran Google mereka tetap terbaru. Setup-nya kurang dari 5 menit.",
      ctaBoxButton: "Mulai Uji Coba Gratis",
      comingSoonBadge: "Segera Hadir",
      comingSoonHeading: "Masa Depan Kehadiran Google Anda",
      comingSoonBody:
        "Kami sedang membangun fitur-fitur baru yang andal untuk membantu Anda mengelola seluruh Google Business Profile — bukan sekadar menunya.",
      autoPostTitle: "Posting Otomatis ke Google",
      autoPostBody:
        "Terbitkan postingan, promo, acara, dan pembaruan secara otomatis langsung ke Google Business Profile Anda. Bagikan menu spesial hari ini, peluncuran hidangan baru, atau promo hari raya — tanpa perlu login ke Google.",
      autoPostPoint1: "Jadwalkan postingan dengan foto dan tombol CTA",
      autoPostPoint2: "Promosikan spesial harian & penawaran musiman",
      autoPostPoint3: "Pengumuman acara terbit otomatis",
      autoPostPoint4: "Analitik postingan dan pelacakan interaksi",
      reviewRepliesTitle: "Balasan Ulasan dengan AI",
      reviewRepliesBody:
        "Biarkan AI menyusun balasan yang tepat dan personal untuk setiap ulasan Google — positif maupun negatif. Balas lebih cepat, jaga reputasi, dan tunjukkan bahwa Anda peduli, 24/7.",
      reviewRepliesPoint1: "Balasan profesional & hangat yang dibuat AI",
      reviewRepliesPoint2: "Menangani ulasan positif maupun negatif",
      reviewRepliesPoint3: "Menyesuaikan gaya dan suara restoran Anda",
      reviewRepliesPoint4: "Setujui sekali klik atau edit sebelum diposting",
      testimonialQuote:
        "“Dulu kami menghabiskan satu sore penuh setiap bulan hanya untuk memperbarui menu di Google. Dengan Menuthere, saya tekan satu tombol dan semuanya tersinkron — item, harga, bahkan gambarnya. Listing Google Maps kami sekarang terlihat profesional dan kami melihat kenaikan nyata jumlah pelanggan yang datang langsung sambil bilang mereka melihat menu kami online.”",
      testimonialAuthor: "Arjun & Priya Nair",
      testimonialRole: "Pemilik, Spice Route Kitchen",
      testimonialLocation: "Kochi, Kerala",
      faqSubheading:
        "Semua yang perlu Anda tahu tentang sinkron menu Google Business Profile",
      faq1Question: "Apa itu sinkron menu Google Business Profile?",
      faq1Answer:
        "Fitur ini menyalin menu restoran Anda dari platform kami ke Google Business Profile Anda secara otomatis (listing yang muncul di Google Search dan Google Maps). Alih-alih menambahkan setiap item menu di Google secara manual, Anda menyinkronkan semuanya dengan sekali klik.",
      faq2Question: "Apakah saya perlu Google Business Profile untuk memakainya?",
      faq2Answer:
        "Ya, Anda perlu Google Business Profile yang terverifikasi untuk restoran Anda. Jika belum punya, Anda bisa membuatnya gratis di business.google.com. Setelah terverifikasi, hubungkan ke platform kami dan mulai sinkronkan.",
      faq3Question: "Seberapa sering saya perlu menyinkronkan menu?",
      faq3Answer:
        "Kami sarankan sinkron setiap kali Anda mengubah menu — item baru, perubahan harga, atau pembaruan musiman. Sinkron hanya butuh beberapa detik, jadi tak ada alasan membiarkannya usang. Sebagian restoran sinkron setiap hari, sebagian setiap minggu.",
      faq4Question: "Apakah sinkron akan menimpa menu Google saya yang ada?",
      faq4Answer:
        "Ya, setiap sinkron mengganti menu Google Business Profile Anda dengan versi terbaru dari platform kami. Ini menjamin akurasi penuh. Informasi Google Business Profile lainnya (foto, ulasan, jam buka) tidak terpengaruh.",
      faq5Question: "Apakah ini berfungsi untuk beberapa lokasi restoran?",
      faq5Answer:
        "Ya! Jika Anda mengelola beberapa lokasi dalam satu akun Google Business, Anda bisa memilih lokasi mana yang disinkronkan. Setiap lokasi bisa punya menu sendiri. Cocok untuk jaringan restoran dengan menu berbeda di tiap cabang.",
      faq6Question: "Apakah data akun Google saya aman?",
      faq6Answer:
        "Tentu. Kami memakai OAuth 2.0 resmi dan Business Profile API dari Google. Kami hanya meminta izin minimum yang dibutuhkan untuk mengelola menu Anda. Kredensial Anda tidak pernah disimpan — kami memakai autentikasi berbasis token yang aman.",
      faq7Question: "Apa yang terjadi pada gambar menu saat sinkron?",
      faq7Answer:
        "Gambar item menu dari profil Anda diunggah ke Google bersama data menunya. Gambar berukuran besar otomatis dioptimalkan sesuai ketentuan Google. Jika sebuah gambar gagal diunggah, itemnya tetap tersinkron — hanya tanpa foto.",
      faq8Question: "Apakah fitur ini tersedia di semua paket?",
      faq8Answer:
        "Sinkron menu Google Business Profile tersedia pada paket Pro dan Business. Cek halaman harga kami untuk detail isi tiap paket.",
    },
    petpooja: {
      metaTitle: "Stop Bayar Komisi 30% ke Platform Pihak Ketiga | Menuthere",
      metaDescription:
        "Platform pihak ketiga memungut komisi 20-30% per pesanan. Menuthere memberi aplikasi pemesanan sendiri: komisi 0%, data pelanggan milik Anda, POS PetPooja.",
      ogTitle: "Stop Bayar Komisi 30% | Pemesanan Langsung untuk Restoran",
      ogDescription:
        "Kenapa bayar 20-30% ke platform pesan antar lain? Miliki website pemesanan sendiri dengan komisi hanya 0%. Integrasi POS PetPooja, data pelanggan penuh, dan kendali sepenuhnya di tangan Anda.",
      breadcrumbCurrent: "Pemesanan Langsung & Integrasi PetPooja",
      heroTitle:
        "Berhenti Bayar Komisi 30% ke Platform Pesan Antar Pihak Ketiga",
      heroSubtitle:
        "Website pemesanan milik Anda sendiri dengan kepemilikan penuh atas pelanggan, plus integrasi POS PetPooja",
      heroPrimaryCta: "Mulai Jualan Langsung",
      statCommissionLabel: "Komisi Per Pesanan",
      value35Percent: "35%",
      statQuitLabel: "Restoran Ingin Lepas dari Agregator",
      statFeeValue: "45%",
      statFeeLabel: "Biaya Agregator Efektif",
      statDataValue: "100%",
      statDataLabel: "Data Pelanggan Milik Anda",
      introParagraph1:
        "Agregator memungut komisi 20-33% plus biaya tersembunyi di setiap pesanan. Pada pesanan Rs 500, Anda kehilangan hingga Rs 225. Itu bukan kemitraan — itu pajak atas kerja keras Anda. Investigasi CCI menemukan platform pesan antar besar melanggar undang-undang persaingan usaha.",
      introParagraph2:
        "Menuthere memberi Anda website pemesanan ber-brand sendiri dengan komisi hanya 1% dan kepemilikan penuh data pelanggan. Dipadukan dengan integrasi POS PetPooja, pesanan mengalir langsung ke dapur Anda — tanpa perantara, tanpa bagi hasil, tanpa kehilangan kendali.",
      problemsHeading:
        "Bagaimana platform pesan antar lain merugikan restoran Anda.",
      problemsSubheading:
        "Investigasi CCI menemukan kedua platform melanggar undang-undang persaingan usaha. Inilah yang mereka lakukan pada bisnis Anda.",
      problem1Title: "Komisi 20-33% Per Pesanan",
      problem1Body:
        "Platform pesan antar pihak ketiga baru-baru ini menaikkan komisi hingga 33%. Pada pesanan Rs 500, Anda kehilangan Rs 100-165 sebelum potongan lainnya. Biaya bahan, sewa, dan gaji staf diambil dari sisanya.",
      problem2Title: "Biaya Tersembunyi Menumpuk hingga 45%",
      problem2Body:
        "GST atas komisi (18%), biaya payment gateway (2-3%), markup kemasan (Rs 2-5/pesanan), dan diskon yang dipaksa dibagi. Pesanan Rs 500 bisa menghabiskan Rs 212-227 hanya untuk biaya platform — 42-45% lenyap.",
      problem3Title: "Data Pelanggan Anda Milik Mereka",
      problem3Body:
        "Anda melayani ribuan pelanggan tapi tak punya hubungan langsung dengan satu pun. Platform sengaja menyembunyikan detail pelanggan — nama, nomor telepon, riwayat pesanan. Anda tak bisa membangun loyalitas atau menjalankan promo bertarget.",
      problem4Title: "Visibilitas Harus Dibayar",
      problem4Body:
        "10 hasil pencarian teratas di platform pesan antar lain hampir selalu berupa penempatan berbayar. Tanpa belanja iklan, restoran Anda tenggelam. Komisi efektif naik jadi 25-40% begitu biaya iklan dihitung.",
      problem5Title: "Tak Ada Kebebasan Menentukan Harga",
      problem5Body:
        "Platform pesan antar pihak ketiga memberlakukan batasan harga dengan penalti bagi yang melanggar, dan mengancam menurunkan peringkat jika Anda menawarkan harga lebih murah di tempat lain. Anda bahkan tak bisa mengendalikan strategi harga sendiri.",
      problem6Title: "Kini Platform Menjadi Pesaing Anda",
      problem6Body:
        "Platform pesan antar pihak ketiga kini meluncurkan brand makanan dan aplikasi quick-commerce mereka sendiri. Mereka memakai data pelanggan ANDA untuk membangun produk pesaing. NRAI menyebutnya 'penyalahgunaan kekuasaan'.",
      commissionHeading: "Biaya sebenarnya dari satu pesanan Rs 500.",
      commissionSubheading:
        "Lihat persis ke mana uang Anda pergi di platform agregator dibanding pemesanan langsung.",
      commissionColCharge: "Jenis Biaya",
      commissionColPlatforms: "Platform Pesan Antar",
      commissionRow1Label: "Komisi Dasar",
      commissionRow1Aggregator: "18-33%",
      commissionRow2Label: "GST",
      commissionRow2Aggregator: "~3-5%",
      commissionRow3Label: "Payment Gateway",
      commissionRow3Aggregator: "2-3%",
      commissionRow3Menuthere: "2%",
      commissionRow4Label: "Diskon yang Dipaksakan",
      commissionRow4Aggregator: "5-15%",
      commissionRow4Menuthere: "Anda yang tentukan",
      commissionRow5Label: "Markup Kemasan",
      commissionRow5Aggregator: "Rs 2-5/pesanan",
      commissionRow6Label: "Listing Berbayar",
      commissionRow6Aggregator: "5-10% tambahan",
      commissionRow6Menuthere: "Visibilitas gratis",
      commissionTotalLabel: "Total Kerugian Efektif",
      commissionTotalAggregator: "Rs 212-227 (42-45%)",
      commissionTotalMenuthere: "~3%",
      commissionFootnote:
        "* Berdasarkan data industri dari laporan NRAI, Menuviel, dan Billboox (2025-2026)",
      solutionHeading: "Ambil kembali kendali restoran Anda.",
      solutionSubheading:
        "Website pemesanan milik Anda. Komisi hanya 1%. Data pelanggan penuh. Integrasi POS PetPooja.",
      solution1Title: "Komisi Pesanan Hanya 0%",
      solution1Body:
        "Dengan komisi hanya 0%, hampir seluruh uang yang dibayar pelanggan masuk ke Anda. Tanpa biaya tersembunyi, tanpa bagi hasil. Margin Anda tetap utuh — sebagaimana mestinya.",
      solution2Title: "Miliki 100% Data Pelanggan",
      solution2Body:
        "Setiap pesanan memberi Anda nama pelanggan, nomor telepon, riwayat pesanan, dan preferensinya. Bangun program loyalitas, kirim promo bertarget, dan jalin hubungan yang tulus dengan pelanggan Anda.",
      solution3Title: "Website Pemesanan Ber-brand Anda Sendiri",
      solution3Body:
        "Dapatkan website pemesanan profesional dengan branding, warna, dan domain restoran Anda. Pelanggan memesan langsung dari Anda — brand Anda yang tumbuh, bukan brand agregator.",
      solution4Title: "Analitik & Wawasan Lengkap",
      solution4Body:
        "Lacak setiap pesanan, jam sibuk, item populer, perilaku pelanggan, dan tren pendapatan. Ambil keputusan berbasis data soal menu, harga, dan promo Anda.",
      solution5Title: "Bangun Loyalitas Pelanggan Sejati",
      solution5Body:
        "Jalankan promo, diskon, dan hadiah loyalitas Anda sendiri tanpa membagi margin. Kirim notifikasi WhatsApp, ucapan hari raya, dan penawaran personal langsung ke pelanggan Anda.",
      solution6Title: "Integrasi POS PetPooja",
      solution6Body:
        "Sinkronkan pesanan dari website Menuthere Anda langsung ke POS PetPooja tanpa hambatan. Tanpa input manual, tanpa pesanan terlewat. Dapur Anda menerima pesanan seketika, sama seperti kanal lainnya.",
      realNumbersHeading: "Ketergantungan agregator vs. pemesanan langsung.",
      realNumbersSubheading:
        "Perbandingan nyata yang tak ingin platform tunjukkan kepada Anda.",
      realNumbersColAggregators: "Agregator",
      realNumbersRow1Metric: "Komisi per pesanan",
      realNumbersRow1Aggregator: "18-33% + biaya (efektif 35-45%)",
      realNumbersRow1Direct: "Hanya 0%",
      realNumbersRow2Metric: "Kepemilikan data pelanggan",
      realNumbersRow2Aggregator: "Platform memiliki semuanya",
      realNumbersRow2Direct: "100% milik Anda",
      realNumbersRow3Metric: "Kendali harga",
      realNumbersRow3Aggregator: "Dibatasi dengan penalti",
      realNumbersRow3Direct: "Kebebasan penuh",
      realNumbersRow4Metric: "Membangun brand",
      realNumbersRow4Aggregator: "Loyalitas jatuh ke platform",
      realNumbersRow4Direct: "Loyalitas jatuh ke restoran ANDA",
      realNumbersRow5Metric: "Margin laba pengantaran",
      realNumbersRow5Aggregator: "Sering di bawah 10%",
      realNumbersRow5Direct: "25-35%+ bisa dicapai",
      realNumbersRow6Metric: "Kendali pemasaran",
      realNumbersRow6Aggregator: "Bayar untuk tampil, Rs 250-4000+",
      realNumbersRow6Direct: "Kendali penuh, kampanye sendiri",
      realNumbersRow7Metric: "Kendali menu & diskon",
      realNumbersRow7Aggregator: "Platform bisa memaksakan tanpa persetujuan",
      realNumbersRow7Direct: "100% keputusan Anda",
      transparencyHeading: "Perlu Anda tahu — transparansi penuh.",
      transparencySubheading:
        "Kami percaya pada keterbukaan. Inilah yang kami tawarkan dan yang tidak.",
      deliveryTitle: "Kami Tidak Menyediakan Kurir",
      deliveryBody:
        "Menuthere fokus memberi Anda platform pemesanan, manajemen pelanggan, dan integrasi POS terbaik. Untuk pengantaran, Anda punya beberapa pilihan fleksibel:",
      deliveryPoint1: "Pakai kurir Anda sendiri untuk kendali penuh",
      deliveryPoint2:
        "Bermitra dengan layanan pihak ketiga seperti Porter, Dunzo, atau Shadowfax",
      deliveryPoint3:
        "Tawarkan ambil sendiri — banyak pelanggan justru lebih suka",
      deliveryPoint4: "Pemesanan QR di meja sama sekali tak butuh pengantaran",
      deliveryNote:
        "Bahkan pesanan ambil sendiri lewat kanal langsung lebih menguntungkan daripada pesanan diantar lewat agregator dengan komisi 30%.",
      paymentTitle: "Integrasi Pembayaran",
      paymentBadge: "Hanya 1%",
      paymentBody:
        "Payment gateway terintegrasi dengan biaya hanya 1% (khusus layanan pelanggan). Pelanggan Anda bisa membayar online langsung di website pemesanan Anda:",
      paymentPoint1: "Pembayaran UPI (Google Pay, PhonePe, Paytm)",
      paymentPoint2: "Dukungan kartu kredit & debit",
      paymentPoint3: "Integrasi dompet digital",
      paymentPoint4: "Rekonsiliasi otomatis dengan POS PetPooja",
      paymentNote:
        "Anda juga bisa menerima bayar di tempat atau memakai sistem pembayaran yang sudah Anda punya.",
      factsHeading: "Angka tidak berbohong.",
      factsSubheading:
        "Data nyata dari survei industri, investigasi CCI, dan laporan NRAI.",
      fact1Text:
        "restoran India ingin berhenti memakai platform pesan antar lain (survei Des 2025)",
      fact2Value: "60%",
      fact2Text:
        "restoran baru tutup dalam tahun pertama — ketergantungan pada platform jadi faktor utama",
      fact3Value: "Rs 4 Miliar",
      fact3Text:
        "tambahan yang ditarik platform tiap tahun lewat markup biaya kemasan di seluruh ekosistem",
      fact4Value: "2.000+",
      fact4Text:
        "restoran ikut serta dalam boikot #Logout melawan platform agregator",
      howItWorksHeading: "Jualan langsung dalam 3 langkah sederhana.",
      howItWorksSubheading:
        "Siapkan kanal pemesanan Anda sendiri dalam waktu kurang dari 10 menit.",
      step1Title: "Buat Menu & Website Anda",
      step1Body:
        "Unggah menu, sesuaikan branding, dan tayangkan website pemesanan Anda sendiri. Butuh kurang dari 10 menit.",
      step2Title: "Hubungkan POS PetPooja",
      step2Body:
        "Tautkan POS PetPooja untuk sinkron pesanan otomatis. Pesanan mengalir langsung ke dapur Anda — nol kerja manual.",
      step3Title: "Bagikan & Mulai Jualan",
      step3Body:
        "Bagikan tautan pemesanan Anda lewat WhatsApp, media sosial, dan kode QR. Lihat pesanan langsung berdatangan.",
      savingsHeading:
        "Setiap Pesanan di Platform Pesan Antar Lain Merugikan Anda Rs 100-225",
      savingsBody:
        "Jika Anda menerima 50 pesanan antar sehari, itu Rs 5.000-11.250 melayang setiap hari. Rs 150.000-330.000 setiap bulan. Website pemesanan Anda sendiri sudah balik modal sejak hari pertama.",
      savingsSecondaryCta: "Lihat Harga",
      faqSubheading:
        "Semua yang perlu Anda tahu tentang pemesanan langsung dengan Menuthere.",
      faq1Question:
        "Bagaimana Menuthere membantu saya berhenti membayar komisi platform pesan antar lain?",
      faq1Answer:
        "Menuthere memberi Anda website pemesanan ber-brand sendiri tempat pelanggan bisa memesan langsung. Dengan komisi hanya 0%, hampir seluruh pendapatan pesanan tetap milik Anda. Kami hanya mengenakan biaya langganan sederhana — bukan potongan 20-30% dari setiap pesanan.",
      faq2Question: "Apakah Menuthere menyediakan kurir?",
      faq2Answer:
        "Tidak, Menuthere tidak menyediakan kurir. Kami fokus memberi Anda platform pemesanan, manajemen pelanggan, dan integrasi POS terbaik. Untuk pengantaran, Anda bisa memakai staf sendiri, bermitra dengan layanan pihak ketiga seperti Porter, Dunzo, atau Shadowfax, atau menawarkan ambil sendiri. Banyak restoran mendapati bahwa pesanan ambil sendiri lewat kanal langsung pun lebih menguntungkan daripada pesanan diantar lewat agregator.",
      faq3Question: "Bagaimana cara kerja integrasi PetPooja?",
      faq3Answer:
        "Pesanan yang masuk di website Menuthere Anda otomatis dikirim ke terminal POS PetPooja secara real-time. Dapur Anda langsung melihat pesanannya — tanpa input manual, tanpa salin-tempel, tanpa pesanan terlewat. Cara kerjanya sama seperti menerima pesanan dari kanal lain di POS Anda.",
      faq4Question: "Bagaimana dengan penerimaan pembayaran dari pelanggan?",
      faq4Answer:
        "Menuthere menyertakan dukungan payment gateway terintegrasi dengan biaya hanya 0% (khusus layanan pelanggan). Pelanggan bisa membayar online lewat UPI, kartu, dan dompet digital langsung di website pemesanan Anda. Anda juga bisa menerima bayar di tempat atau memakai sistem pembayaran yang sudah ada.",
      faq5Question:
        "Apakah saya harus benar-benar meninggalkan platform pesan antar lain?",
      faq5Answer:
        "Belum tentu. Banyak restoran memakai platform pesan antar lain untuk penemuan (menjaring pelanggan baru) sambil mengarahkan pelanggan setia ke website pemesanan mereka sendiri demi margin yang lebih tinggi. Tujuannya adalah mengurangi ketergantungan — bukan selalu menghapusnya — dan memastikan lebih banyak pendapatan tetap di tangan Anda.",
      faq6Question: "Berapa biaya Menuthere?",
      faq6Answer:
        "Menuthere mengenakan langganan bulanan sederhana — bukan persentase dari pesanan Anda. Bahkan pada paket berbayar, penghematan dari komisi agregator yang Anda hindari jauh lebih besar daripada biayanya. Cek halaman harga kami untuk paket terkini.",
      faq7Question: "Benarkah 35% restoran ingin lepas dari agregator?",
      faq7Answer:
        "Benar. Survei industri Desember 2025 menemukan 35% restoran India ingin berhenti memakai platform pesan antar lain, dengan alasan komisi tinggi, layanan pelanggan buruk, laba tak memadai, dan tak adanya akses ke data pelanggan.",
      faq8Question:
        "Bisakah saya tetap memakai platform pesan antar lain bersama Menuthere?",
      faq8Answer:
        "Tentu saja. Sebagian besar mitra restoran kami memakai keduanya. Mereka mempertahankan platform pesan antar lain untuk menjaring pelanggan baru sambil aktif mengarahkan pelanggan setia ke website pemesanan Menuthere yang marginnya jauh lebih tinggi. Seiring waktu, porsi pesanan langsung terus tumbuh karena pelanggan lebih suka memesan langsung.",
    },
    whatsappOrdering: {
      metaTitle:
        "Pemesanan WhatsApp Restoran — Cukup Kirim 'Hi' | Menuthere",
      metaDescription:
        "Ubah nomor WhatsApp Anda jadi kanal pemesanan. Pelanggan kirim 'Hi', dapat tautan auto-login, pesan dari menu visual, terima update status — nol komisi.",
      metaKeywords:
        "pemesanan whatsapp, sistem pemesanan whatsapp untuk restoran, pesan lewat whatsapp, whatsapp business ordering, menu whatsapp restoran, kirim hi untuk pesan, pesan makanan lewat whatsapp, pemesanan percakapan, pemesanan tanpa komisi",
      ogTitle: "Pemesanan WhatsApp — Pelanggan Cukup Kirim 'Hi' | Menuthere",
      ogDescription:
        "Kanal pemesanan dengan hambatan paling rendah untuk restoran. Kirim 'Hi' → tautan instan → pesan di menu Anda → update langsung di WhatsApp. Tanpa aplikasi, tanpa daftar, nol komisi.",
      structuredDataProductName: "Pemesanan WhatsApp Menuthere",
      structuredDataProductDescription:
        "Sistem pemesanan WhatsApp untuk restoran. Pelanggan mengirim 'Hi' untuk mendapatkan tautan auto-login instan, memesan dari menu web visual, dan menerima update status pesanan langsung di WhatsApp.",
      heroBadge: "Pemesanan WhatsApp",
      heroBadgeNew: "BARU",
      heroTitle: "Pelanggan Anda memesan cukup dengan mengirim “Hi.”",
      heroSubtitle:
        "Ubah nomor WhatsApp Anda menjadi kanal pemesanan termudah. Satu kata “Hi” memberi setiap pelanggan tautan auto-login instan ke menu Anda — tanpa aplikasi yang perlu diinstal, tanpa pendaftaran, tanpa OTP. Pelanggan tetap milik Anda dan komisinya nol.",
      primaryCta: "Mulai Gratis",
      heroTrust1: "Tanpa unduh aplikasi",
      heroTrust2: "Tanpa daftar atau OTP",
      heroTrust3: "Komisi 0%",
      stepsHeading: "Kirim “Hi.” Itu saja funnel-nya.",
      stepsSubheading:
        "Penyebab terbesar keranjang ditinggalkan adalah hambatan — unduhan, pendaftaran, kata sandi. Pemesanan WhatsApp menghapus semuanya. Empat langkah, dan pelanggan tak pernah meninggalkan kanal yang sudah mereka percaya.",
      step1Title: "Pelanggan mengirim “Hi”",
      step1Body:
        "Dari stiker, QR di meja, tautan bio, atau profil Google, pelanggan mengetuk ke WhatsApp dan mengirim Hi ke nomor Anda. Tak ada aplikasi untuk diunduh, tak ada formulir untuk diisi.",
      step2Title: "Mereka langsung dapat tautan Pesan Sekarang",
      step2Body:
        "Nomor Anda membalas dalam sedetik dengan tombol Pesan Sekarang yang bisa diketuk. Tautan itu memasukkan mereka otomatis — tanpa OTP, tanpa kata sandi, tanpa pembuatan akun.",
      step3Title: "Mereka memesan di menu visual Anda",
      step3Body:
        "Tautan membuka menu web ber-brand Anda — sudah dalam keadaan masuk. Mereka melihat foto, menambah ke keranjang, memilih UPI atau tunai, dan memesan dalam beberapa ketukan.",
      step4Title: "Update mengalir kembali di WhatsApp",
      step4Body:
        "Pesanan diterima, dikonfirmasi, makanan siap, sedang diantar dengan tautan pelacakan langsung, sampai tujuan — plus poin loyalitas. Setiap pembaruan mendarat tepat di chat.",
      featuresHeading: "Dibangun untuk mengonversi, bukan sekadar mengobrol.",
      featuresSubheading:
        "Semua yang Anda butuhkan untuk menjalankan pemesanan lewat WhatsApp secara profesional — dengan brand Anda, dengan aturan Anda.",
      feature1Title: "Tanpa aplikasi, tanpa daftar",
      feature1Body:
        "Bekerja di semua ponsel yang punya WhatsApp. Mengirim “Hi” secara diam-diam membuat dan mengenali pelanggan, jadi mereka tak pernah membentur dinding login.",
      feature2Title: "Nomor ber-brand Anda sendiri",
      feature2Body:
        "Hubungkan nomor WhatsApp Business asli Anda dalam hitungan menit lewat Meta — bahkan nomor yang sudah Anda pakai. Atau langsung tayang seketika dengan nomor bersama kami.",
      feature3Title: "Tautan pesanan di domain sendiri",
      feature3Body:
        "Tautan pemesanan bisa berjalan di domain Anda sendiri (brandanda.com), bukan URL pihak ketiga yang generik — sehingga setiap titik sentuh tetap membawa brand Anda.",
      feature4Title: "Update status otomatis",
      feature4Body:
        "Pesanan masuk beserta rincian tagihan, dikonfirmasi, siap, dikirim dengan tautan peta pelacakan langsung, selesai, dan poin loyalitas — semuanya terkirim otomatis.",
      feature5Title: "Tautan aman sekali pakai",
      feature5Body:
        "Setiap tautan ditandatangani, kedaluwarsa dalam hitungan menit, dan terkunci pada pembuka pertama — tautan yang diteruskan tak akan pernah bisa membajak sesi orang lain.",
      feature6Title: "Alur pesan tanpa coding",
      feature6Body:
        "Pesan sambutan dan pesan pesanan Anda berupa alur yang bisa diedit, lengkap dengan pemicu kata kunci, tombol, dan media — ubah teksnya tanpa menyentuh kode.",
      feature7Title: "Inbox WhatsApp terpadu",
      feature7Body:
        "Setiap pesan masuk dan keluar tersimpan dan bisa dilihat di dasbor Anda, jadi tak ada yang terlewat saat sedang ramai.",
      feature8Title: "Analitik bertanda kanal",
      feature8Body:
        "Pesanan lewat WhatsApp ditandai otomatis. Lihat jumlah pesanan dan pendapatan dari Aplikasi vs Website vs WhatsApp secara berdampingan.",
      frictionHeading: "Hitung ketukannya. Pelanggan menghitungnya.",
      frictionSubheading:
        "Setiap langkah tambahan antara lapar dan memesan adalah pelanggan yang hilang. Ini pesanan yang sama, dua cara.",
      frictionAggregatorLabel: "Aplikasi agregator",
      frictionAggregatorStep1: "Instal aplikasinya",
      frictionAggregatorStep2: "Daftar + verifikasi OTP",
      frictionAggregatorStep3: "Cari restoran Anda",
      frictionAggregatorStep4: "Pesan (mereka ambil 20–33%)",
      frictionAggregatorStep5: "Anda tak pernah melihat pelanggannya",
      frictionWhatsappLabel: "Pemesanan WhatsApp",
      frictionWhatsappStep1: "Kirim “Hi”",
      frictionWhatsappStep2: "Ketuk Pesan Sekarang (otomatis masuk)",
      frictionWhatsappStep3: "Pesan di menu Anda",
      frictionHighlight: "100% nilai pesanan tetap milik Anda.",
      comparisonHeading: "Bagaimana perbandingannya.",
      comparisonSubheading:
        "Pemesanan WhatsApp Menuthere vs. agregator makanan vs. alat pemesanan “chatbot” generik.",
      comparisonColAggregators: "Agregator makanan",
      comparisonColChatbots: "Chatbot generik",
      comparisonValueYes: "Ya",
      comparisonValueNo: "Tidak",
      comparisonRow1Label: "Komisi per pesanan",
      comparisonRow1Aggregator: "20–33%",
      comparisonRow1Chatbot: "Biaya bulanan + per pesan",
      comparisonRow2Label: "Wajib unduh aplikasi",
      comparisonRow2Us: "Tidak pernah",
      comparisonRow3Label: "Login / OTP pelanggan",
      comparisonRow3Us: "Otomatis — tidak ada",
      comparisonRow3Aggregator: "Akun + OTP",
      comparisonRow3Chatbot: "Biasanya wajib",
      comparisonRow4Label: "Pengalaman memesan",
      comparisonRow4Us: "Menu visual lengkap, berfoto",
      comparisonRow4Aggregator: "Di dalam aplikasi mereka",
      comparisonRow4Chatbot: "Ketik item di chat",
      comparisonRow5Label: "Terkirim dari nomor Anda sendiri",
      comparisonRow5Chatbot: "Kadang",
      comparisonRow6Label: "Pelacakan pesanan & pengantaran langsung",
      comparisonRow6Us: "Di WhatsApp",
      comparisonRow6Aggregator: "Di aplikasi mereka",
      comparisonRow6Chatbot: "Jarang",
      comparisonRow7Label: "Data pelanggan milik Anda",
      comparisonRow7Us: "Ya, sepenuhnya",
      comparisonRow7Chatbot: "Sebagian",
      comparisonRow8Label: "Waktu setup",
      comparisonRow8Us: "Hitungan menit",
      comparisonRow8Aggregator: "Onboarding berminggu-minggu",
      comparisonRow8Chatbot: "Berhari-hari + scripting",
      outcome1Value: "≈ 10 detik",
      outcome1Label:
        "Dari “Hi” sampai tautan pemesanan aktif ada di tangan pelanggan.",
      outcome2Label:
        "Komisi. Setiap rupiah dari nilai pesanan tetap milik Anda.",
      outcome3Value: "End-to-end",
      outcome3Label:
        "Dipesan → dikonfirmasi → diantar → dilacak, semuanya di WhatsApp.",
      faqHeading: "Pertanyaan, terjawab.",
      faq1Question: "Apakah pelanggan saya perlu menginstal sesuatu?",
      faq1Answer:
        "Tidak. Selama punya WhatsApp, mereka bisa memesan. Mereka kirim “Hi”, ketuk tautan Pesan Sekarang, dan langsung berada di menu Anda — sudah dalam keadaan masuk. Tak ada aplikasi untuk diunduh dan tak ada akun untuk dibuat.",
      faq2Question: "Apakah pelanggan mengetik pesanannya di dalam chat?",
      faq2Answer:
        "Tidak — dan justru itu intinya. WhatsApp adalah pintu depan, bukan kasir. “Hi” memberi mereka tautan instan ke menu visual asli Anda lengkap dengan foto, kategori, dan pencarian, sehingga memesan jadi cepat dan salah pesan jarang terjadi. Update status lalu kembali lewat WhatsApp.",
      faq3Question: "Bisakah dikirim dari nomor WhatsApp saya sendiri?",
      faq3Answer:
        "Bisa. Anda bisa menghubungkan nomor WhatsApp Business Anda sendiri lewat onboarding resmi Meta dalam beberapa menit — termasuk nomor yang sudah Anda pakai di aplikasi WhatsApp Business. Ingin tanpa setup sama sekali? Langsung tayang dengan nomor bersama kami, dan pindah belakangan.",
      faq4Question: "Apakah tautan pemesanan aman dibagikan?",
      faq4Answer:
        "Setiap tautan ditandatangani secara kriptografis, kedaluwarsa dalam hitungan menit, dan terkunci pada orang pertama yang membukanya. Jika ada yang meneruskannya, tautan itu tak akan berfungsi untuk orang lain — sehingga sesi yang sudah masuk tak pernah bocor.",
      faq5Question: "Apa yang diterima pelanggan setelah memesan?",
      faq5Answer:
        "Pesan WhatsApp otomatis untuk setiap tahap: pesanan diterima beserta rincian tagihan, dikonfirmasi, makanan siap, sedang diantar dengan tautan pelacakan langsung, selesai, dan poin loyalitas yang diperoleh (jika Anda menjalankan program loyalitas).",
      faq6Question: "Berapa komisi yang diambil Menuthere?",
      faq6Answer:
        "Nol komisi untuk pesanan. Pemesanan WhatsApp adalah bagian dari kanal langsung Anda sendiri — Anda menyimpan 100% dari setiap nilai pesanan, dan pembayarannya masuk langsung ke rekening bank Anda.",
      faqCtaPrompt:
        "Siap membiarkan pelanggan memesan cukup dengan satu “Hi”?",
      faqSecondaryLink: "Jelajahi pemesanan tanpa komisi",
      trialHeading:
        "Luncurkan sistem pemesanan WhatsApp Anda dalam kurang dari 2 menit.",
      trialDescription:
        "Hubungkan nomor WhatsApp Anda, unggah menu, dan biarkan pelanggan memesan cukup dengan satu “Hi” — tautan auto-login, update status langsung, dan nol komisi. Bergabunglah dengan 600+ restoran yang sudah tumbuh bersama Menuthere.",
    },
  },
  solutionsSlug: {
    heroPrimaryCta: "Mulai Gratis",
    heroSecondaryCta: "Jadwalkan Demo",
    benefitsHeadingLead: "Kenapa memilih Menuthere",
    benefitsHeadingIndustry: "untuk {industry}?",
    benefitsHeadingIndustryFallback: "bisnis Anda",
    benefitsSubheading:
      "Fitur yang dibangun khusus untuk kebutuhan industri Anda.",
    featuresHeadingLead: "Semua yang Anda butuhkan",
    featuresHeadingEmphasis: "untuk sukses.",
    featuresSubheading:
      "Perangkat lengkap yang dirancang untuk memodernkan menu Anda dan menyenangkan pelanggan.",
    featuresCtaCardHeading: "Siap memulai?",
    featuresCtaCardBody:
      "Bergabunglah dengan ribuan bisnis yang sudah memakai Menuthere untuk mengubah pengalaman menu mereka.",
    featuresCtaCardButton: "Mulai Uji Coba Gratis",
    useCasesHeadingLead: "Cocok untuk setiap jenis",
    useCasesHeadingIndustry: "{industry}.",
    useCasesHeadingIndustryFallback: "bisnis",
    faqHeadingLead: "Pertanyaan yang sering",
    faqHeadingEmphasis: "diajukan.",
    notFoundMetaTitle: "Solusi Tidak Ditemukan",
    breadcrumbHome: "Beranda",
    breadcrumbSolutions: "Solusi",
  },
  downloadApp: {
    heroHeadingLead: "Menuthere untuk",
    heroHeadingHighlight: "Mobile & Desktop.",
    heroSubheading:
      "Kelola restoran Anda saat bepergian atau dari meja kerja. Dapatkan notifikasi pesanan real-time, perbarui menu, dan pantau penjualan di semua perangkat.",
    appStoreBadgePrefix: "Unduh di",
    playStoreBadgePrefix: "Dapatkan di",
    windowsBadgePrefix: "Unduh untuk",
    windowsBadgePlatform: "Windows",
    heroImageAlt: "Antarmuka Aplikasi Menuthere",
  },
  blog: {
    metaTitle: "Blog | Menuthere - Wawasan Restoran & Kafe",
    metaDescription:
      "Tips, panduan, dan wawasan untuk pemilik restoran soal menu digital, kode QR, sinkron Google Business, dan cara menumbuhkan bisnis kuliner Anda.",
    ogTitle: "Blog | Menuthere",
    ogDescription:
      "Tips, panduan, dan wawasan untuk pemilik restoran soal menu digital, kode QR, dan cara menumbuhkan bisnis kuliner Anda.",
    heroHeading: "Update dan wawasan terbaru",
    heroHeadingAccent: "dari Menuthere",
    categoryLabel: "Blog",
    emptyState: "Belum ada artikel yang terbit. Nantikan, ya!",
    postMetaTitleTemplate: "{title} | Blog Menuthere",
    postNotFoundMetaTitle: "Artikel Tidak Ditemukan",
    backToIndexLink: "← Blog",
    relatedHeading: "Artikel lainnya",
  },
};

export default id;
