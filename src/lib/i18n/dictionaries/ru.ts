import type { Dictionary } from "./en";

/**
 * Russian. Typed as `Dictionary`, so this file cannot drift from the
 * English source: add a key to en.ts and TypeScript fails here until it is
 * translated, rather than letting English leak onto a Russian page.
 *
 * Brand nouns (Menuthere, WhatsApp, Google, Product Hunt, QR, POS) stay in
 * Latin script on purpose — that is how the market writes them.
 */
const ru: Dictionary = {
  common: {
    language: "Язык",
    changeLanguage: "Сменить язык",
  },
  nav: {
    products: "Продукты",
    solutions: "Решения",
    businesses: "Отрасли",
    pricing: "Тарифы",
    resources: "Ресурсы",
    blog: "Блог",
    login: "Войти",
    bookDemo: "Заказать демо",
    getStarted: "Начать бесплатно",
    openMenu: "Открыть меню",
    closeMenu: "Закрыть меню",
  },
  navItems: {
    ownDeliveryWebsite: {
      title: "Собственный сайт доставки",
      description: "Платформа доставки без комиссий",
    },
    digitalMenuCreator: {
      title: "Конструктор цифрового меню",
      description: "QR-меню для заказа за столом",
    },
    pos: {
      title: "Касса (POS)",
      description: "Контроль расчётов и операций",
    },
    tableOrdering: {
      title: "Заказ за столом",
      description: "Удобный сценарий для гостей",
    },
    captainOrdering: {
      title: "Приём заказов официантом",
      description: "Быстрый приём заказов персоналом",
    },
    googleBusinessSync: {
      title: "Синхронизация с Google Business",
      description: "Меню публикуется в Google Maps",
    },
    owners: {
      title: "Владельцам",
      description: "Управляйте операциями и растите выручку",
    },
    agencies: {
      title: "Агентствам",
      description: "Легко ведите несколько клиентов",
    },
    restaurants: {
      title: "Рестораны",
      description: "Умные цифровые меню для зала",
    },
    cafes: {
      title: "Кафе и кофейни",
      description: "Современные меню для идеального кофе",
    },
    bakeries: {
      title: "Пекарни",
      description: "Красиво покажите свежую выпечку",
    },
    cloudKitchens: {
      title: "Облачные кухни",
      description: "Меню нескольких брендов в одном месте",
    },
    hotels: {
      title: "Отели и курорты",
      description: "Элегантный сервис питания для гостей",
    },
    foodTrucks: {
      title: "Фудтраки",
      description: "Мобильные меню, которые всегда с вами",
    },
    bars: {
      title: "Бары и пабы",
      description: "Динамичные барные карты со стилем",
    },
  },
  hero: {
    productHunt: "Мы на Product Hunt",
    headlineA: "Ваши заказы.",
    headlineB: "Ваши клиенты.",
    subhead:
      "Больше никаких 30% агрегаторам. Menuthere за считаные минуты запускает вашу собственную платформу заказов и доставки.",
    searchPlaceholder: "Найти «{name}»",
    generate: "Создать",
    working: "Создаём…",
    clear: "Очистить",
    pickFromDropdown: "Выберите своё заведение из списка",
    bulletNoCommission: "Без комиссии",
    bulletYourBrand: "Ваш бренд",
    bulletLiveInMinutes: "Запуск за минуты",
    whatsappTitle: "Заказы в WhatsApp",
    whatsappNew: "Новое",
    whatsappBlurb: "Гости заказывают в WhatsApp — без приложений и регистрации.",
    whatsappExplore: "Узнать о заказах в WhatsApp",
    trustedBy: "Нам доверяют рестораны, которые растят свой бренд",
  },
  footer: {
    solutions: "Решения",
    resources: "Ресурсы",
    legal: "Правовая информация",
    tagline: "Заказы без комиссии для ресторанов.",
    rights: "Все права защищены.",
  },
  metadata: {
    title: "Menuthere | Онлайн-заказы и доставка для ресторанов",
    description:
      "Запустите собственное приложение доставки: интеграция с Petpooja POS, заказы и аналитика в реальном времени. Нам доверяют 600+ ресторанов Индии.",
  },

  solutionsOwners: {
    metaTitle: "Решения для владельцев ресторанов | Menuthere",
    metaDescription:
      "Верните контроль над рестораном с Menuthere. Меню, POS, официанты и склад — в одной панели. Ноль комиссий, максимум прибыли.",
    heroPrimaryCta: "Начать",
    heroSecondaryCta: "Заказать демо",
    benefitsHeading: "Почему Menuthere",
    benefitsHeadingAccent: "для владельцев?",
    reviewsHeading: "Нас любят владельцы",
    reviewsHeadingAccent: "ресторанов.",
  },
  solutionsAgencies: {
    metaTitle: "Партнёрская программа | Регулярный доход | Menuthere",
    metaDescription:
      "Станьте авторизованным партнёром Menuthere. Зарабатывайте до 30% пожизненных регулярных комиссий, продавая ресторанам цифровые меню.",
    heroBadge: "Партнёрская программа для агентств",
    heroApplyCta: "Подать заявку",
    heroDemoCta: "Заказать демо",
    problemHeading: "Дайте ресторанам рост выручки,",
    problemHeadingAccent: "заберите свою долю",
    problemBody:
      "Независимые рестораны теряют продажи из-за статичных PDF-меню, которые невозможно обновить вовремя. Как партнёр Menuthere вы решаете эту проблему платформой за $30 в месяц: мгновенные обновления QR-меню, которым доверяют 600+ заведений, — и становитесь для них главным советником.",
    benefitsHeading: "Почему стоит работать",
    benefitsHeadingAccent: "с нами?",
    earningsBadge: "Высокий потенциал заработка",
    earningsHeading: "Структура комиссий",
    earningsHeadingAccent: "по результатам.",
    earningsSubheading:
      "Выплаты напрямую зависят от выручки. Ежемесячно через Stripe — в тот же день, когда мы получаем оплату по подписке.",
    earningsTableTierHeader: "Уровень",
    earningsTableRevenueHeader: "Приведённая выручка за всё время",
    earningsTableCommissionHeader: "Комиссия (с подписки $30)",
    tierStarterName: "Старт",
    tierStarterRevenue: "от $0 до $1 000",
    tierStarterRate: "20%",
    tierStarterPayout: "($6/мес.)",
    tierStarterPayoutPerSub: "$6/мес. с подписки",
    tierGrowthName: "Рост",
    tierGrowthRevenue: "от $1 001 до $5 000",
    tierGrowthRate: "25%",
    tierGrowthPayout: "($7,50/мес.)",
    tierGrowthPayoutPerSub: "$7,50/мес. с подписки",
    tierEliteName: "Элита",
    tierEliteRevenue: "$5 001+",
    tierEliteRate: "30%",
    tierElitePayout: "($9/мес.)",
    tierElitePayoutPerSub: "$9/мес. с подписки",
    tierCardRevenueLabel: "Выручка",
    tierCardCommissionLabel: "Комиссия",
    processHeading: "Как проходит подключение",
    processHeadingAccent: "партнёра.",
    processStepOneTitle: "Рассмотрение заявки",
    processStepOneDescription:
      "Быстрое одобрение и доступ в партнёрский портал: демо-ссылки и брендированные материалы.",
    processStepTwoTitle: "Работа в полях",
    processStepTwoDescription:
      "Находите рестораны, показываете демо за 5 минут и получаете согласие.",
    processStepThreeTitle: "Доля с выручки",
    processStepThreeDescription:
      "Автоматический учёт и выплаты в день поступления средств.",
    idealPartnerHeading: "Стратегические партнёры,",
    idealPartnerHeadingAccent: "которых мы ищем",
    idealPartnerBody:
      "Опытные продавцы, которые умеют выстраивать отношения с ресторанами. Программа с отбором — только для тех, кто показывает результат.",
    partnerTypeRestaurantAdvisors: "Консультанты ресторанов",
    partnerTypeChannelPartners: "B2B-партнёры по каналам продаж",
    partnerTypeSalesExecutives: "Менеджеры по продажам",
    partnerTypeFranchiseSpecialists: "Специалисты по франшизам",
    partnerTypeSaasResellers: "Реселлеры SaaS",
    partnerTypeBizDevPros: "Специалисты по развитию бизнеса",
    faqHeading: "Вопросы",
    faqHeadingAccent: "партнёров.",
    faqProductOverviewQuestion: "О продукте",
    faqProductOverviewAnswer:
      "Премиальная платформа цифровых QR-меню за $30 в месяц для ресторанов по всему миру.",
    faqExperienceRequiredQuestion: "Нужен ли опыт",
    faqExperienceRequiredAnswer:
      "Нужен опыт активных продаж; все материалы мы предоставляем.",
    faqPayoutMechanicsQuestion: "Как проходят выплаты",
    faqPayoutMechanicsAnswer:
      "Ежемесячно через Stripe в день поступления оплаты, пожизненно за каждую активную подписку.",
    faqCostsInvolvedQuestion: "Какие расходы",
    faqCostsInvolvedAnswer: "Никаких — только комиссия с продаж.",
    faqTerritoryQuestion: "Территория",
    faqTerritoryAnswer: "Независимые заведения по всему миру, приоритет — США.",
    faqResourcesQuestion: "Материалы",
    faqResourcesAnswer:
      "Портал с видео, скриптами и презентациями; есть тёплые лиды.",
    trustBadgeDeployments: "600+ работающих внедрений",
    trustBadgeFieldTested: "Проверенная в полях модель",
    trustBadgeRevenueShare: "Только доля с выручки",
    trustBadgeExclusiveAccess: "Закрытый доступ",
    termsHeading: "Условия партнёрской программы",
    termsIncomeContinuity:
      "Доход: комиссия начисляется только по активным подпискам.",
    termsTerminationRights:
      "Расторжение: Menuthere вправе прекратить сотрудничество при несоответствии бренду.",
    termsPayoutTiming:
      "Сроки выплат: в день списания по подписке, за вычетом сборов.",
    termsEligibility:
      "Участие: принимаем партнёров со всего мира, после одобрения.",
  },
  solutionsIndex: {
    metaTitle: "Цифровые меню для любого пищевого бизнеса | Menuthere",
    metaDescription:
      "Умные цифровые меню для ресторанов, кафе, пекарен, облачных кухонь, отелей, фудтраков и баров. QR-меню, мгновенные обновления, синхронизация с Google.",
    ogTitle: "Решения для цифровых меню | Menuthere",
    ogDescription:
      "Умные цифровые меню для ресторанов, кафе, пекарен и не только. Мгновенные обновления, красивый дизайн, нулевые расходы на печать.",
    heroTitleLead: "Цифровые меню, которые",
    heroTitleEmphasis: "меняют",
    heroTitleTail: "ваш бизнес.",
    heroSubtitle:
      "Уютное кафе, оживлённый ресторан или сеть облачных кухонь — платформа подстраивается под ваши задачи.",
    heroPrimaryCta: "Начать бесплатно",
    heroSecondaryCta: "Заказать демо",
    industriesHeadingLead: "Выберите свою отрасль",
    industriesHeadingEmphasis: "и начните.",
    industriesIntro:
      "Цифровые меню, собранные под конкретный тип пищевого бизнеса.",
    cardRestaurantsTitle: "Рестораны",
    cardRestaurantsDesc: "Умные цифровые меню для безупречного зала",
    cardCafesTitle: "Кафе и кофейни",
    cardCafesDesc: "Современные меню для идеального кофе",
    cardBakeriesTitle: "Пекарни и кондитерские",
    cardBakeriesDesc: "Красиво покажите свежую выпечку",
    cardCloudKitchensTitle: "Облачные кухни",
    cardCloudKitchensDesc: "Меню нескольких брендов — без хаоса",
    cardHotelsTitle: "Отели и курорты",
    cardHotelsDesc: "Элегантный сервис питания для гостей",
    cardFoodTrucksTitle: "Фудтраки",
    cardFoodTrucksDesc: "Мобильные меню, которые едут с вами",
    cardBarsTitle: "Бары и пабы",
    cardBarsDesc: "Динамичные барные карты со стилем",
    cardCateringTitle: "Кейтеринг",
    cardCateringDesc: "Профессиональные меню для любого мероприятия",
    cardOwnersTitle: "Владельцы ресторанов",
    cardOwnersDesc: "Верните контроль над своим заведением",
    cardAgenciesTitle: "Агентства и консультанты",
    cardAgenciesDesc: "Легко ведите несколько клиентов",
    cardPetpoojaTitle: "Прямые заказы и PetPooja",
    cardPetpoojaDesc: "Альтернатива Swiggy и Zomato без комиссии",
    cardWhatsappOrderingTitle: "Заказы в WhatsApp",
    cardWhatsappOrderingDesc:
      "Гость отправляет «Hi» — без приложений и регистрации",
    cardLearnMoreLink: "Подробнее",
    featuresHeadingLead: "Мощные возможности —",
    featuresHeadingEmphasis: "для любого бизнеса.",
    featureQrTitle: "QR-меню",
    featureQrDesc:
      "Мгновенный доступ по сканированию со смартфона. Приложение не нужно.",
    featureRealtimeTitle: "Обновления в реальном времени",
    featureRealtimeDesc:
      "Меняйте цены, добавляйте блюда, отправляйте в стоп-лист мгновенно.",
    featureGoogleSyncTitle: "Синхронизация с Google Business",
    featureGoogleSyncDesc:
      "Меню в Google Business Profile обновляется автоматически.",
    featureAnalyticsTitle: "Аналитика и инсайты",
    featureAnalyticsDesc:
      "Отслеживайте популярные блюда и предпочтения гостей.",
    googleBadge: "Интеграция с Google Business",
    googleHeading: "Синхронизируйте меню с Google Business Profile",
    googleBody:
      "Меню в Google Business Profile обновляется автоматически при каждом изменении. Гости, которые ищут вас в Google Maps, всегда увидят актуальные позиции.",
    googleBenefitOneClickSync:
      "Синхронизация с Google Business Profile в один клик",
    googleBenefitRealtimeUpdates: "Обновления меню сразу на всех площадках",
    googleBenefitLocalSeo: "Лучше локальное SEO и видимость",
    googleBenefitMoreCustomers:
      "Больше гостей из Google Search и Google Maps",
    googleManagerLink: "Узнать о Google Business Manager",
    googleCardTitle: "Google Business Profile",
    googleCardSubtitle: "Менеджер меню",
    googleCardSyncedLabel: "Позиций синхронизировано",
    googleCardLastSyncLabel: "Последняя синхронизация",
    googleCardLastSyncValue: "Только что",
  },
  getStarted: {
    metaTitle: "Начало работы | Menuthere",
    metaDescription: "Создайте своё цифровое меню в Menuthere.",
    stepIndicator: "Шаг {step} из 3",
    publishingLoader1: "Создаём аккаунт...",
    publishingLoader2: "Настраиваем цифровое меню...",
    publishingLoader3: "Готовим панель управления...",
    publishingLoader4: "Почти готово...",
    step1Title: "Загрузите меню",
    step1Subtitle:
      "Сфотографируйте меню — мы мгновенно переведём его в цифровой вид.",
    filesSelectedCount: "Выбрано файлов: {count}",
    uploadDropzonePrompt: "Нажмите, перетащите или вставьте файл",
    uploadFormatsHint: "JPG, PNG, PDF до 10 МБ",
    uploadAddMoreHint: "Нажмите, чтобы добавить ещё",
    fileTooLargeBadge: "Слишком большой ({size} МБ)",
    filePreviewAlt: "Страница {number}",
    aiInstructionLabel: "Инструкции для нашего ИИ",
    optionalSuffix: "(необязательно)",
    aiInstructionPlaceholder:
      "Есть особенности меню? Например: «Не учитывать напитки», «Комбо — отдельная категория», «Цены в AED»",
    aiInstructionHint:
      "Ваша инструкция важнее всего, когда ИИ читает ваши файлы.",
    removeInvalidFilesButton: "Удалите неподходящие файлы, чтобы продолжить",
    nextStepButton: "Далее",
    uploadOrDivider: "или",
    sampleMenuButton: "Попробовать на примере меню",
    sampleMenuDialogTitle: "Выберите пример меню",
    sampleMenuDialogSubtitle:
      "Выберите тип заведения и начните с готового меню.",
    sampleMenuComingSoonBadge: "Скоро",
    filesTooLargeToast:
      "Файлов больше 10 МБ: {count}. Загрузите файлы поменьше.",
    filesAddedToast: "Добавлено файлов: {count}!",
    sampleMenuLoadedToast: "Загружено меню-пример «{name}»!",
    step2Title: "Данные заведения",
    step2Subtitle: "Расскажите о заведении, чтобы меню стало вашим.",
    restaurantNameLabel: "Название заведения",
    restaurantNamePlaceholder: "Например, The Burger Joint",
    usernameLabel: "Имя пользователя",
    usernamePlaceholder: "your_store_name",
    usernameCheckingStatus: "Проверяем доступность...",
    usernameAvailableStatus: "Имя свободно",
    usernameTakenStatus: "Это имя уже занято",
    usernameMinLengthHint: "Имя должно содержать минимум 3 символа",
    phoneNumberLabel: "Номер телефона",
    phoneCodePlaceholder: "Код",
    phoneInvalidError: "Некорректный номер телефона",
    countryLabel: "Страна",
    countryPlaceholder: "Выберите или введите страну",
    addressLabel: "Адрес",
    addressPlaceholder: "Улица, район, город…",
    currencyLabel: "Валюта",
    currencyPlaceholder: "Выберите или найдите валюту",
    currencySearchPlaceholder: "Поиск валюты (например, USD, Euro, ₹)",
    currencySelectFallback: "Выберите валюту",
    currencyNoMatch: "Ничего не найдено",
    logoLabel: "Логотип (необязательно)",
    logoPreviewAlt: "Предпросмотр логотипа",
    changeLogoButton: "Заменить логотип",
    uploadLogoButton: "Загрузить логотип",
    removeLogoButton: "Удалить",
    logoSizeLabel: "Размер (%)",
    logoBackgroundLabel: "Фон",
    createMenuButton: "Создать меню",
    logoNotAnImageToast: "Выберите изображение для логотипа",
    logoTooLargeToast: "Логотип должен быть меньше 10 МБ",
    logoReadFailedToast: "Не удалось прочитать это изображение",
    missingDetailsToast: "Заполните все поля",
    invalidPhoneToast: "Введите корректный номер телефона",
    extractingTitle: "Распознаём меню",
    extractingSubtitle: "Подождите, мы обрабатываем изображение меню...",
    extractionErrorTitle: "Не удалось распознать",
    menuUnreadableError:
      "Мы не смогли прочитать меню. Загрузите файлы почётче или добавьте позиции вручную.",
    extractionFailedToast: "Не удалось распознать меню. Попробуйте ещё раз.",
    retryExtractionButton: "Повторить",
    cancelExtractionButton: "Отменить и загрузить заново",
    step3Title: "Ваше меню готово!",
    step3Subtitle:
      "Мы распознали позиций: {count}. Выберите оформление ниже.",
    themePickerTitle: "Выберите тему",
    themeSwatchSample: "Аа",
    themeClassicLabel: "Классика",
    themeMidnightLabel: "Полночь",
    themeFreshLabel: "Свежесть",
    publishButton: "Опубликовать",
    authModalSignInTitle: "Войдите, чтобы опубликовать",
    authModalEmailHint:
      "Мы отправим данные для входа в панель на вашу почту.",
    googleSignInButton: "Войти через Google",
    authDividerOr: "или",
    emailPlaceholder: "you@example.com",
    continueWithEmailButton: "Продолжить с почтой",
    authModalPasswordTitle: "Создайте пароль",
    authModalPasswordHint: "Задайте пароль для входа в панель управления.",
    passwordPlaceholder: "Пароль (минимум 6 символов)",
    confirmPasswordPlaceholder: "Повторите пароль",
    continueButton: "Продолжить",
    invalidEmailToast: "Введите корректный адрес электронной почты",
    passwordTooShortToast: "Пароль должен содержать минимум 6 символов",
    passwordMismatchToast: "Пароли не совпадают",
    emailAlreadyRegisteredToast:
      "Эта почта уже зарегистрирована. Используйте другой адрес.",
    googleSignInSuccessToast: "Вы вошли через Google!",
    googleSignInFailedToast:
      "Не удалось войти через Google. Попробуйте ещё раз.",
    publishSuccessToast:
      "Меню опубликовано! Переходим в панель управления...",
    publishFailedToast:
      "Не удалось завершить регистрацию. Попробуйте ещё раз.",
    successTitle: "Проверьте почту!",
    successSubtitle:
      "Мы отправили ссылку на меню и данные для входа в панель на адрес:",
    successSpamHint:
      "Не нашли письмо? Загляните в спам или измените адрес ниже.",
    successMobileSubtitle:
      "Мы отправили ссылку на меню и данные для входа на вашу почту.",
    changeEmailButton: "Ошиблись адресом? Измените его",
    loginToDashboardButton: "Войти в панель",
    changeEmailTitle: "Изменить адрес",
    changeEmailSubtitle:
      "Укажите правильный адрес почты. Мы отправим туда ссылку на меню и данные для входа.",
    newEmailLabel: "Новый адрес почты",
    updatingEmailButton: "Обновляем...",
    updateAndResendButton: "Обновить и отправить",
    emailUpdatedToast: "Адрес обновлён! Проверьте новую почту.",
    emailUpdateFailedToast:
      "Не удалось обновить адрес. Попробуйте ещё раз.",
  },
  helpCenter: {
    metaTitle: "Помощь и поддержка | Цифровое меню Menuthere",
    metaDescription:
      "Помощь по цифровому меню Menuthere. Ответы на вопросы, поддержка в WhatsApp и по почте. Быстрые ответы про меню, акции и не только.",
    heroTitle: "Помощь и",
    heroTitleAccent: "поддержка.",
    heroSubtitle:
      "Нужна помощь? Напишите нам на почту или прямо в WhatsApp.",
    faqSectionTitle: "Частые",
    faqSectionTitleAccent: "вопросы.",
    faq1Question:
      "Как сделать, чтобы гости не находили старое меню в Google или приложениях?",
    faq1Answer:
      "Любые изменения — блюда, цены, описания, наличие — применяются к цифровому меню мгновенно. Проверьте через «Посмотреть меню» в панели: никаких задержек и перепечаток.",
    faq2Question:
      "Позиции из стоп-листа всё ещё видны в QR-меню — почему?",
    faq2Answer:
      "В разделе «Меню» нажмите «Наличие» вверху. Одним кликом включайте и выключайте целые категории или отдельные блюда — распроданное сразу исчезает везде.",
    faq3Question:
      "Обновление меню занимает вечность и стоит дорого из-за дизайнеров.",
    faq3Answer:
      "Редактирование занимает секунды и не требует технических знаний. Откройте раздел «Меню», нажмите на любое блюдо, измените название, цену, фото, описание, акции или варианты и сохраните. Изменения появляются сразу.",
    faq4Question: "Как мгновенно обновить позиции меню?",
    faq4Answer:
      "Откройте раздел «Меню» в панели. Там все категории и блюда — нажмите на любое, чтобы изменить название, цену, фото или описание, и сохраните: обновление мгновенное.",
    faq5Question: "Как изменить порядок блюд или категорий?",
    faq5Answer:
      "Откройте раздел «Меню» и нажмите «Приоритет». Перетащите или задайте номера приоритета для категорий и блюд и сохраните — новый порядок появится сразу.",
    faq6Question: "Как добавить акции или спецпредложения к блюдам?",
    faq6Answer:
      "Для хитов и спецпредложений: в разделе «Меню» включите переключатель у блюда — оно появится вверху с меткой «Обязательно попробовать». Для своих акций откройте раздел «Акции», создайте предложение на одно или несколько блюд — оно активируется мгновенно.",
    faq7Question:
      "Сложно менять баннеры или фото блюд без помощи технических специалистов?",
    faq7Answer:
      "Откройте «Настройки» → «Общие настройки», чтобы загрузить или заменить баннер заведения. Фото блюд меняются прямо в разделе «Меню» — перетащили и готово, изменения видны сразу.",
    faq8Question:
      "Можно ли посмотреть изменения заранее или запланировать блюдо дня?",
    faq8Answer:
      "Да — любое изменение можно посмотреть через «Посмотреть меню» до сохранения. Для расписания используйте раздел «Акции»: настройте обновления по времени (например, блюдо дня) и не заходите в панель каждый день.",
    faq9Question: "Смогу ли я отключить заведение в нерабочие часы?",
    faq9Answer:
      "Да. В «Настройках» отключите заведение в любой момент — удобно для нерабочих часов, выходных или ремонта. Включите обратно, когда будете готовы.",
    faq10Question: "Насколько вообще просто редактировать позиции меню?",
    faq10Answer:
      "Очень — секунды на изменение. Цены, названия, фото, наличие и акции меняются переключателями и списками в разделе «Меню». Ни кода, ни дизайнеров.",
    faq11Question: "Можно ли отменить подписку в любой момент?",
    faq11Answer:
      "Да — отмена в любой момент из аккаунта. Тариф действует до конца оплаченного периода, дальше списаний не будет, пока вы не продлите.",
  },

  landing: {
    socialProofEyebrow: "Реальные данные за последние 30 дней",
    statOrdersLabel: "Получено заказов",
    statRevenueLabel: "Заработано выручки",
    statAvgOrderValueLabel: "Средний чек",
    statSuffixLakh: "L+",
    statSuffixThousand: "K+",
    platformHeadingLead: "Всё, что нужно вашему ресторану,",
    platformHeadingAccent: "на одной платформе.",
    featureWebsiteAppTitle: "Собственный сайт и брендированное приложение",
    featureWebsiteAppBody:
      "Запустите брендированный сайт заказов и собственное приложение в App Store и Play Store — всё под вашим именем. Гости заказывают напрямую у вас: без посредников-агрегаторов и комиссий 20–33%. Они выбирают, заказывают, отслеживают доставку и повторяют заказ в одно касание, а вы владеете отношениями с клиентом, управляете ценами и оставляете себе каждую рупию прибыли.",
    featureWebsiteAppCta: "Посмотреть, как это работает",
    featureWhatsappOrderingTitle:
      "Заказы в WhatsApp — достаточно отправить «Hi»",
    featureWhatsappOrderingBody:
      "Превратите номер WhatsApp в самый простой канал заказов. Гость отправляет «Hi» и сразу получает ссылку на меню с автоматическим входом — без установки приложения, регистрации и OTP. Несколько касаний — и заказ оформлен, а статусы приходят обратно в WhatsApp. Клиент остаётся вашим, комиссия — ноль.",
    featureWhatsappOrderingCta: "Посмотреть заказы в WhatsApp",
    featurePetpoojaTitle: "Интеграция с Petpooja POS",
    featurePetpoojaBody:
      "Каждый онлайн-заказ попадает прямо в вашу Petpooja POS в реальном времени. Без ручного ввода, потерянных заказов и двойной работы. Блюда, цены и категории синхронизируются между POS и сайтом доставки автоматически. Единственная платформа в Индии с глубокой встроенной интеграцией с Petpooja.",
    featurePetpoojaCta: "Узнать об интеграции с Petpooja",
    featurePaymentsTitle: "Приём платежей",
    featurePaymentsBody:
      "Принимайте оплату сразу: UPI, карты, интернет-банкинг и кошельки, а также наличные при доставке. Безопасная оплата по стандартам PCI на базе Cashfree, деньги поступают прямо на ваш счёт. Никакой агрегатор не держит ваши средства и не задерживает выплаты. Каждая рупия доходит до вас.",
    featurePaymentsCta: "Посмотреть способы оплаты",
    featureOrderManagementTitle: "Управление заказами в реальном времени",
    featureOrderManagementBody:
      "Принимайте, отслеживайте и ведите заказы на доставку в одной панели. Мгновенные уведомления о новых заказах, обновление статуса в реальном времени, кухня и курьеры всегда в курсе. Больше не нужно жонглировать планшетами и терять заказы в час пик.",
    featureOrderManagementCta: "Узнать об управлении заказами",
    featureDigitalMenuTitle: "Управление цифровым меню",
    featureDigitalMenuBody:
      "Всё меню — в одной панели: добавляйте и меняйте блюда, цены, категории, фото и варианты в реальном времени. Мгновенно отправляйте блюда в стоп-лист, настраивайте фильтры по типу питания и умный поиск, держите всё синхронным на сайте, в приложении и в QR-меню. Без перепечатки и разработчиков — изменения видны сразу после сохранения.",
    featureDigitalMenuCta: "Подробнее о цифровом меню",
    featureOffersTitle: "Динамические акции и промо",
    featureOffersBody:
      "Запускайте флеш-акции, happy hour и скидки по времени, которые включаются и заканчиваются автоматически. Выделяйте хиты метками «Обязательно попробовать» и «Выбор шефа». Растите повторные заказы и выручку, не печатая ни одной листовки.",
    featureOffersCta: "Посмотреть, как работают акции",
    featureGoogleSyncTitle: "Синхронизация меню с Google Business",
    featureGoogleSyncBody:
      "Синхронизируйте всё меню — категории, блюда, цены и фото — с Google Business Profile в один клик. Появляйтесь в Google Maps с полным меню. Заведения с заполненным профилем получают в 7 раз больше кликов и приводят на 30% больше гостей.",
    featureGoogleSyncCta: "Посмотреть, как работает синхронизация с Google",
    featureDeliveryAppTitle: "Приложение для курьеров",
    featureDeliveryAppBody:
      "Отдельное приложение для вашей службы доставки. Курьеры получают уведомления о заказах, строят маршрут к гостю и обновляют статус доставки в реальном времени. Отслеживайте местоположение, назначайте заказы автоматически и доставляйте быстрее с полной прозрачностью.",
    featureDeliveryAppCta: "Узнать о приложении для курьеров",
    featureAnalyticsTitle: "Аналитика и инсайты",
    featureAnalyticsBody:
      "Отслеживайте количество заказов, динамику выручки, часы пик и самые популярные блюда. Принимайте решения по ценам, акциям и доставке на основе данных. Точно знайте, что работает и где можно улучшить.",
    featureAnalyticsCta: "Узнать об аналитике",
    ctaBannerHeadingDefault:
      "Запустите сайт доставки меньше чем за 2 минуты.",
    ctaBannerBodyDefault:
      "Загрузите меню, задайте зоны доставки и начните принимать заказы напрямую от гостей — с полной интеграцией Petpooja POS. Присоединяйтесь к 600+ ресторанам, которые уже растут с Menuthere.",
    ctaBannerPrimaryButton: "Начать бесплатно",
    ctaBannerSecondaryButton: "Все тарифы",
    faqHeadingLead: "Частые",
    faqHeadingAccent: "вопросы.",
    faqVsAggregatorsQuestion: "Чем Menuthere отличается от Zomato или Swiggy?",
    faqVsAggregatorsAnswer:
      "Агрегаторы вроде Zomato и Swiggy берут 20–33% комиссии с каждого заказа. Menuthere даёт вам собственный брендированный сайт доставки, где гости заказывают напрямую, а комиссия — всего 1%. Данные клиентов ваши, цены под вашим контролем, лояльность растёт к вашему бренду.",
    faqPetpoojaIntegrationQuestion: "Как работает интеграция с Petpooja POS?",
    faqPetpoojaIntegrationAnswer:
      "После подключения меню Petpooja синхронизируется с сайтом доставки Menuthere автоматически. Каждый онлайн-заказ уходит в POS в реальном времени: без ручного ввода и потерянных заказов. Блюда, цены и категории остаются одинаковыми в обеих системах.",
    faqDeliveryZonesQuestion: "Как настроить зоны и стоимость доставки?",
    faqDeliveryZonesAnswer:
      "В панели откройте «Настройки доставки». Задайте зоны по радиусу или почтовому индексу, укажите стоимость доставки для каждой зоны и минимальную сумму заказа. Доставку по отдельным районам можно включать и отключать в любой момент.",
    faqPickupOrdersQuestion:
      "Могут ли гости заказывать самовывоз, а не только доставку?",
    faqPickupOrdersAnswer:
      "Да, сайт поддерживает и доставку, и самовывоз. Гость выбирает вариант при оформлении. Любой из режимов можно включить или отключить в настройках панели.",
    faqRushHourOrdersQuestion:
      "Как справляться с потоком заказов в час пик?",
    faqRushHourOrdersAnswer:
      "Все заказы появляются в панели в реальном времени с мгновенными уведомлениями. Принимайте, готовьте и обновляйте статус на одном экране. Если подключена Petpooja POS, заказы уходят и туда — кухня всегда в курсе.",
    faqTechnicalSkillsQuestion: "Нужны ли технические навыки для запуска?",
    faqTechnicalSkillsAnswer:
      "Совсем нет. Загрузите меню (или синхронизируйте его из Petpooja), настройте оформление — и сайт доставки заработает за считаные минуты. Ни кода, ни дизайнеров, ни установки приложений.",
    faqOffersDiscountsQuestion:
      "Можно ли запускать акции и скидки на сайте доставки?",
    faqOffersDiscountsAnswer:
      "Да! Флеш-акции, промокоды, скидка на первый заказ или предложения по времени включаются и заканчиваются автоматически. Выделяйте хиты меткой «Обязательно попробовать», чтобы поднять средний чек.",
    faqCustomerDiscoveryQuestion: "Как гости находят мой сайт доставки?",
    faqCustomerDiscoveryAnswer:
      "Делитесь ссылкой в соцсетях, WhatsApp, Google Business Profile и через QR-коды в зале. Menuthere также синхронизирует меню с Google Maps, чтобы вас находили органически. Сайт уже оптимизирован под SEO.",
    faqPauseOrderingQuestion:
      "Смогу ли я отключить приём заказов в нерабочие часы?",
    faqPauseOrderingAnswer:
      "Да. В «Настройках» отключите заведение в любой момент — удобно для нерабочих часов, праздников или ремонта. Включите обратно, когда будете готовы. Ещё можно задать автоматическое расписание работы.",
    faqCancelSubscriptionQuestion:
      "Можно ли отменить подписку в любой момент?",
    faqCancelSubscriptionAnswer:
      "Да, отмена в любой момент из аккаунта. Тариф действует до конца оплаченного периода, дальше списаний не будет, пока вы не продлите.",
    reviewExpandButton: "Показать больше",
    reviewCollapseButton: "Свернуть",
    reviewOneAuthorName: "Hotel Colombo",
    reviewOneAuthorLocation: "MG Road, Edappally",
    reviewOneAuthorInitials: "HC",
    reviewOneParagraphOne:
      "Честно, я и не думал, что сделать приложение будет так просто 😅 ребята всё взяли на себя и сделали весь процесс максимально лёгким для нас.",
    reviewOneParagraphTwo:
      "И сделали именно так, как я хотел. Я был очень требователен к деталям и не собирался ничем жертвовать — мы прошли несколько переделок, но команда всё время оставалась терпеливой и спокойной и в итоге сделала всё точно.",
    reviewOneParagraphThree: "Очень аккуратная работа, огромное спасибо, ребята.",
    reviewTwoAuthorName: "Rimaal Mandi & Grills",
    reviewTwoAuthorLocation: "Pune",
    reviewTwoAuthorInitials: "RM",
    reviewTwoParagraphOne:
      "Спасибо команде MenuThere за разработку нашего приложения. Оно помогает гостям заказывать напрямую у нас и заметно упрощает управление доставкой. Мы также подключили сторонние службы доставки, например Porter, и команда успешно интегрировала их в систему. Всё работает стабильно, ребята проделали отличную работу.",
    reviewTwoParagraphTwo:
      "Главная причина запуска приложения в том, что площадки вроде Zomato и Swiggy приносят хороший поток заказов и охват, но с выплатами бывает сложно из-за комиссий и других расходов. Конечно, отказаться от Zomato и Swiggy мы не можем — многие гости привыкли заказывать там, и мы продолжим с ними работать.",
    reviewTwoParagraphThree:
      "При этом приложение даёт нам ещё один канал, чтобы общаться с гостями напрямую и обслуживать их лучше.",
    reviewTwoParagraphFour:
      "Спасибо команде MenuThere за поддержку и отличную работу.",
  },
  footerLinks: {
    brandBlurb:
      "Платформа онлайн-заказов и доставки для ресторанов «всё в одном». Запустите собственный сайт, откажитесь от комиссий агрегаторов и растите свой бизнес.",
    solutionsGoogleBusinessSync: "Синхронизация с Google Business",
    solutionsOwners: "Владельцам",
    solutionsAgencies: "Агентствам",
    solutionsPetpoojaIntegration: "Интеграция с PetPooja",
    solutionsRestaurants: "Рестораны",
    solutionsCafes: "Кафе",
    resourcesHelpCenter: "Справочный центр",
    resourcesDownloadApp: "Скачать приложение",
    resourcesGetStarted: "Начать работу",
    legalPrivacyPolicy: "Политика конфиденциальности",
    legalTermsOfService: "Условия использования",
    legalRefundPolicy: "Политика возврата",
    copyright: "© 2026 Menuthere.",
  },
  solutionsRest: {
    shared: {
      breadcrumbHome: "Главная",
      breadcrumbSolutions: "Решения",
      bookDemoCta: "Заказать демо",
      stepLabel: "Шаг {step}",
      faqHeading: "Частые вопросы.",
      zeroPercentValue: "0%",
    },
    googleBusiness: {
      metaTitle: "Синхронизация меню с Google Business | Menuthere",
      metaDescription:
        "Автоматическая синхронизация меню ресторана с Google Business Profile. Настройка в один клик, мгновенные обновления, лучше локальное SEO. 600+ ресторанов.",
      ogDescription:
        "Автоматически синхронизируйте меню ресторана с Google Maps. Всегда актуально, без ручной работы.",
      breadcrumbCurrent: "Синхронизация меню с Google Business Profile",
      heroBadge: "Интеграция с Google Business",
      heroTitle: "Синхронизируйте меню с Google Maps автоматически",
      heroSubtitle:
        "Меню в вашем Google Business Profile всегда актуально. Синхронизация из Menuthere в один клик — ваше меню в Google Search и Google Maps, точно каждый раз.",
      heroPrimaryCta: "Синхронизировать меню",
      mockupCardTitle: "Google Business Profile",
      mockupCardSubtitle: "Менеджер синхронизации меню",
      mockupSyncStatusTitle: "Меню успешно синхронизировано",
      mockupSyncStatusMeta: "Последняя синхронизация: только что",
      mockupStatItemsLabel: "Позиций синхронизировано",
      mockupStatCategoriesLabel: "Категорий",
      mockupStatImagesLabel: "С фото",
      mockupRecentlySyncedLabel: "Недавно синхронизировано",
      mockupItem1Name: "Баттер чикен",
      mockupItem1Category: "Основные блюда",
      mockupItem2Name: "Панир тикка",
      mockupItem2Category: "Закуски",
      mockupItem3Name: "Гулаб джамун",
      mockupItem3Category: "Десерты",
      mockupBadgeTitle: "Просмотры профиля",
      mockupBadgeValue: "+340% за месяц",
      statSyncingValue: "500+",
      statSyncingLabel: "Ресторанов синхронизируют меню",
      statClicksValue: "7x",
      statClicksLabel: "Больше кликов по профилю",
      statSyncTimeValue: "< 30 с",
      statSyncTimeLabel: "Время синхронизации",
      statFootfallValue: "30%",
      statFootfallLabel: "Больше гостей",
      howItWorksBadge: "Простой процесс из 3 шагов",
      howItWorksHeading: "Как это работает",
      howItWorksSubheading:
        "От панели с меню до Google Maps — за три простых шага",
      step1Title: "Создайте меню",
      step1Body:
        "Соберите меню на платформе: категории, блюда, цены и фото. Займёт считаные минуты.",
      step2Title: "Подключите профиль Google",
      step2Body:
        "Свяжите Google Business Profile в один клик. OAuth и настройку API мы берём на себя.",
      step3Title: "Синхронизируйте и публикуйте",
      step3Body:
        "Нажмите синхронизацию — и всё меню появится в Google Maps. Меняйте когда угодно: обновления применяются мгновенно.",
      benefitsHeading:
        "Почему рестораны любят синхронизацию меню с Google",
      benefitsSubheading:
        "Меню — ваш самый сильный маркетинговый инструмент: пусть оно будет там, где вас ищут",
      benefit1Title: "Рост локального SEO",
      benefit1Body:
        "Рестораны с заполненным Google Business Profile получают в 7 раз больше кликов. Синхронизированное меню — один из сильнейших сигналов локального ранжирования: вы выше в поиске «рестораны рядом со мной».",
      benefit2Title: "Видимость в Google Maps",
      benefit2Body:
        "Когда гость ищет еду в Google Maps, ваше меню видно прямо там — цены, категории и блюда. Решение прийти к вам принимается ещё до звонка.",
      benefit3Title: "Всегда актуально",
      benefit3Body:
        "Изменили цену? Добавили новое блюдо? Убрали сезонное? Одна синхронизация — и меню в Google Business Profile соответствует последней версии. Никаких ручных правок в Google.",
      benefit4Title: "Экономия часов каждую неделю",
      benefit4Body:
        "Обновлять меню в Google вручную долго и легко ошибиться. Наша синхронизация делает это за секунды, а не за часы. Занимайтесь кухней, а не копипастом.",
      benefit5Title: "Больше гостей в зале",
      benefit5Body:
        "Гости, которые видят подробное меню в Google, приходят на 30% чаще. Дайте им информацию, чтобы выбрать вас, а не конкурента.",
      benefit6Title: "Точно и надёжно",
      benefit6Body:
        "Больше никаких расхождений между реальным меню и тем, что показывает Google. Забудьте о жалобах на устаревшую информацию в Maps.",
      comparisonHeading: "Без синхронизации и с Menuthere",
      comparisonSubheading:
        "Посмотрите, что меняет автоматическая синхронизация меню",
      comparisonWithoutBadge: "✕ Без синхронизации",
      comparisonWithout1:
        "Каждую позицию приходится добавлять в Google вручную",
      comparisonWithout2: "Меню в Google устаревает за несколько дней",
      comparisonWithout3: "Расхождения в ценах вызывают жалобы гостей",
      comparisonWithout4: "Часы на ввод данных каждый месяц",
      comparisonWithout5: "Без фото — только текстовые списки",
      comparisonWithout6: "Разная информация на разных площадках",
      comparisonWithBadge: "✓ С Menuthere",
      comparisonWith1: "Синхронизация в один клик отправляет всё меню",
      comparisonWith2: "Меню в Google всегда соответствует актуальному",
      comparisonWith3: "Точные цены укрепляют доверие гостей",
      comparisonWith4: "Секунды на синхронизацию вместо часов ручной работы",
      comparisonWith5: "Полная поддержка фото для визуального эффекта",
      comparisonWith6: "Единое меню на сайте, в QR и в Google",
      featuresHeading: "Что вы получаете с синхронизацией меню в Google",
      featuresSubheading:
        "Полный набор инструментов, чтобы ваше присутствие в Google было точным и убедительным.",
      feature1: "Синхронизация всего меню с Google Business Profile в один клик",
      feature2: "Автоматическое сопоставление и структурирование категорий",
      feature3: "Загрузка фото для позиций меню",
      feature4: "Синхронизация цен и наличия",
      feature5: "Поддержка нескольких точек для сетей",
      feature6: "История и статусы синхронизаций",
      feature7: "Работает с любым аккаунтом Google Business",
      feature8: "Технические знания не нужны",
      feature9: "Поддержка меток «вег» и «не вег»",
      feature10: "Корректно обрабатывает спецсимволы и многоязычные меню",
      ctaBoxHeading: "Готовы синхронизировать меню?",
      ctaBoxBody:
        "Присоединяйтесь к сотням ресторанов, которые уже держат своё присутствие в Google актуальным с Menuthere. Настройка занимает меньше 5 минут.",
      ctaBoxButton: "Начать бесплатно",
      comingSoonBadge: "Скоро",
      comingSoonHeading: "Будущее вашего присутствия в Google",
      comingSoonBody:
        "Мы готовим новые возможности, чтобы вы управляли всем Google Business Profile, а не только меню.",
      autoPostTitle: "Автопубликации в Google",
      autoPostBody:
        "Публикуйте посты, акции, события и новости прямо в Google Business Profile автоматически. Блюдо дня, запуск новинки или праздничное предложение — без входа в Google.",
      autoPostPoint1: "Планирование постов с фото и кнопками",
      autoPostPoint2: "Продвижение блюд дня и сезонных акций",
      autoPostPoint3: "Автопубликация анонсов событий",
      autoPostPoint4: "Аналитика постов и вовлечённости",
      reviewRepliesTitle: "ИИ-ответы на отзывы",
      reviewRepliesBody:
        "Пусть ИИ пишет продуманные персональные ответы на каждый отзыв в Google — и положительный, и негативный. Отвечайте быстрее, берегите репутацию и показывайте гостям заботу 24/7.",
      reviewRepliesPoint1: "Профессиональные и тёплые ответы от ИИ",
      reviewRepliesPoint2:
        "Работает и с положительными, и с негативными отзывами",
      reviewRepliesPoint3: "Соответствует тону и голосу вашего заведения",
      reviewRepliesPoint4:
        "Одобрение в один клик или правка перед публикацией",
      testimonialQuote:
        "«Раньше мы тратили целый день каждый месяц на обновление меню в Google. С Menuthere я нажимаю одну кнопку — и синхронизируется всё: блюда, цены, даже фото. Карточка в Google Maps теперь выглядит профессионально, и мы заметили рост числа гостей, которые говорят, что видели наше меню онлайн.»",
      testimonialAuthor: "Арджун и Прия Наир",
      testimonialRole: "Владельцы, Spice Route Kitchen",
      testimonialLocation: "Кочи, Керала",
      faqSubheading:
        "Всё, что нужно знать о синхронизации меню с Google Business Profile",
      faq1Question: "Что такое синхронизация меню с Google Business Profile?",
      faq1Answer:
        "Это функция, которая автоматически переносит меню вашего ресторана с нашей платформы в Google Business Profile — карточку, которая появляется в Google Search и Google Maps. Вместо ручного добавления каждой позиции вы синхронизируете всё в один клик.",
      faq2Question: "Нужен ли для этого Google Business Profile?",
      faq2Answer:
        "Да, нужен подтверждённый Google Business Profile вашего ресторана. Если его ещё нет, создайте бесплатно на business.google.com. После подтверждения подключите его к платформе и начинайте синхронизацию.",
      faq3Question: "Как часто синхронизировать меню?",
      faq3Answer:
        "Рекомендуем синхронизировать при каждом изменении меню — новые блюда, новые цены, сезонные обновления. Синхронизация занимает секунды, так что держать меню актуальным несложно. Одни рестораны делают это ежедневно, другие — раз в неделю.",
      faq4Question: "Перезапишет ли синхронизация текущее меню в Google?",
      faq4Answer:
        "Да, каждая синхронизация заменяет меню в Google Business Profile последней версией с нашей платформы. Так достигается полная точность. Остальная информация профиля — фото, отзывы, часы работы — не затрагивается.",
      faq5Question: "Работает ли это для нескольких точек?",
      faq5Answer:
        "Да! Если вы управляете несколькими точками в одном аккаунте Google Business, вы выбираете, куда синхронизировать. У каждой точки может быть своё меню — идеально для сетей с разными меню в филиалах.",
      faq6Question: "Безопасны ли данные моего аккаунта Google?",
      faq6Answer:
        "Абсолютно. Мы используем официальные Google OAuth 2.0 и Business Profile API и запрашиваем минимум прав, необходимых для управления меню. Ваши учётные данные не хранятся — используется безопасная авторизация по токенам.",
      faq7Question: "Что происходит с фото блюд при синхронизации?",
      faq7Answer:
        "Фото позиций из вашего профиля загружаются в Google вместе с данными меню. Большие изображения автоматически оптимизируются под требования Google. Если фото не загрузилось, позиция всё равно синхронизируется — просто без снимка.",
      faq8Question: "Эта функция входит во все тарифы?",
      faq8Answer:
        "Синхронизация меню с Google Business Profile доступна на тарифах Pro и Business. Подробности о том, что входит в каждый тариф, — на странице тарифов.",
    },
    petpooja: {
      metaTitle: "Хватит платить 30% комиссии агрегаторам | Menuthere",
      metaDescription:
        "Агрегаторы берут 20–30%+ с каждого заказа. Menuthere даёт своё приложение заказов с 0% комиссии, полные данные клиентов и интеграцию с PetPooja POS.",
      ogTitle: "Хватит платить 30% комиссии | Прямые заказы для ресторанов",
      ogDescription:
        "Зачем платить 20–30% другим платформам доставки? Получите свой сайт заказов с 0% комиссии. Интеграция с PetPooja POS, все данные клиентов и полный контроль.",
      breadcrumbCurrent: "Прямые заказы и интеграция с PetPooja",
      heroTitle:
        "Хватит платить 30% комиссии сторонним платформам доставки",
      heroSubtitle:
        "Собственный сайт заказов, полное владение клиентской базой и интеграция с PetPooja POS",
      heroPrimaryCta: "Начать продавать напрямую",
      statCommissionLabel: "Комиссия с заказа",
      value35Percent: "35%",
      statQuitLabel: "Ресторанов хотят уйти от агрегаторов",
      statFeeValue: "45%",
      statFeeLabel: "Реальная плата агрегатору",
      statDataValue: "100%",
      statDataLabel: "Данных о клиентах принадлежат вам",
      introParagraph1:
        "Агрегаторы берут 20–33% комиссии плюс скрытые сборы с каждого заказа. С заказа на 500 ₹ вы теряете до 225 ₹. Это не партнёрство — это налог на вашу работу. Расследования CCI признали крупные платформы доставки нарушителями законов о конкуренции.",
      introParagraph2:
        "Menuthere даёт вам собственный брендированный сайт заказов с комиссией всего 1% и полным владением данными клиентов. Вместе с интеграцией PetPooja POS заказы идут прямо на кухню — без посредников, без дележа выручки, без потери контроля.",
      problemsHeading:
        "Как сторонние платформы доставки вредят вашему ресторану.",
      problemsSubheading:
        "Расследования CCI признали обе платформы нарушителями законов о конкуренции. Вот что они делают с вашим бизнесом.",
      problem1Title: "20–33% комиссии с каждого заказа",
      problem1Body:
        "Сторонние платформы доставки недавно подняли комиссию до 33%. С заказа на 500 ₹ вы теряете 100–165 ₹ ещё до всех остальных вычетов. Себестоимость, аренда и зарплаты — из того, что осталось.",
      problem2Title: "Скрытые сборы доводят потери до 45%",
      problem2Body:
        "GST на комиссию (18%), эквайринг (2–3%), наценка на упаковку (2–5 ₹ за заказ) и принудительное участие в скидках. Заказ на 500 ₹ может обойтись в 212–227 ₹ платформенных сборов — это минус 42–45%.",
      problem3Title: "Данные ваших клиентов принадлежат им",
      problem3Body:
        "Вы обслуживаете тысячи гостей, но не имеете прямой связи ни с одним из них. Платформы намеренно скрывают данные — имена, телефоны, историю заказов. Ни программы лояльности, ни таргетированных акций.",
      problem4Title: "Видимость только за деньги",
      problem4Body:
        "Первые 10 результатов поиска на других платформах доставки почти всегда платные. Без вложений в продвижение ресторан теряется в выдаче. С учётом рекламы реальная комиссия доходит до 25–40%.",
      problem5Title: "Никакой свободы в ценах",
      problem5Body:
        "Сторонние платформы доставки навязывают ценовые ограничения со штрафами за нарушение и грозят понижением в выдаче, если где-то ваши цены ниже. Даже собственной ценовой политикой вы не управляете.",
      problem6Title: "Платформы уже конкурируют с вами",
      problem6Body:
        "Сторонние платформы доставки запускают собственные бренды еды и приложения быстрой доставки. Они используют ВАШИ данные о клиентах, чтобы строить конкурирующие продукты. NRAI называет это «злоупотреблением положением».",
      commissionHeading: "Реальная стоимость заказа на 500 ₹.",
      commissionSubheading:
        "Посмотрите, куда именно уходят ваши деньги на агрегаторах и при прямых заказах.",
      commissionColCharge: "Тип сбора",
      commissionColPlatforms: "Платформы доставки",
      commissionRow1Label: "Базовая комиссия",
      commissionRow1Aggregator: "18–33%",
      commissionRow2Label: "GST",
      commissionRow2Aggregator: "~3–5%",
      commissionRow3Label: "Эквайринг",
      commissionRow3Aggregator: "2–3%",
      commissionRow3Menuthere: "2%",
      commissionRow4Label: "Принудительные скидки",
      commissionRow4Aggregator: "5–15%",
      commissionRow4Menuthere: "Решаете вы",
      commissionRow5Label: "Наценка на упаковку",
      commissionRow5Aggregator: "2–5 ₹ за заказ",
      commissionRow6Label: "Платное продвижение",
      commissionRow6Aggregator: "+5–10%",
      commissionRow6Menuthere: "Видимость бесплатно",
      commissionTotalLabel: "Итоговые потери",
      commissionTotalAggregator: "212–227 ₹ (42–45%)",
      commissionTotalMenuthere: "~3%",
      commissionFootnote:
        "* По отраслевым данным отчётов NRAI, Menuviel и Billboox (2025–2026)",
      solutionHeading: "Верните контроль над своим рестораном.",
      solutionSubheading:
        "Собственный сайт заказов. Комиссия всего 1%. Все данные клиентов. Интеграция с PetPooja POS.",
      solution1Title: "Комиссия с заказов — всего 0%",
      solution1Body:
        "При комиссии 0% почти каждая рупия, которую платит гость, достаётся вам. Без скрытых сборов и дележа выручки. Ваша маржа остаётся вашей — как и должно быть.",
      solution2Title: "100% данных о клиентах — ваши",
      solution2Body:
        "Каждый заказ даёт вам имя гостя, телефон, историю заказов и предпочтения. Стройте программы лояльности, отправляйте адресные предложения и создавайте настоящие отношения с гостями.",
      solution3Title: "Собственный брендированный сайт заказов",
      solution3Body:
        "Профессиональный сайт заказов с вашим брендом, цветами и доменом. Гости заказывают напрямую у вас — растёт ваш бренд, а не бренд агрегатора.",
      solution4Title: "Полная аналитика и инсайты",
      solution4Body:
        "Отслеживайте каждый заказ, часы пик, популярные блюда, поведение гостей и динамику выручки. Принимайте решения по меню, ценам и акциям на основе данных.",
      solution5Title: "Настоящая лояльность гостей",
      solution5Body:
        "Запускайте свои акции, скидки и бонусы, не делясь маржой. Отправляйте уведомления в WhatsApp, праздничные поздравления и персональные предложения напрямую гостям.",
      solution6Title: "Интеграция с PetPooja POS",
      solution6Body:
        "Заказы с сайта Menuthere уходят прямо в вашу PetPooja POS. Без ручного ввода и потерянных заказов. Кухня получает заказ мгновенно — как из любого другого канала.",
      realNumbersHeading: "Зависимость от агрегаторов и прямые заказы.",
      realNumbersSubheading:
        "Честное сравнение, которое платформы предпочли бы вам не показывать.",
      realNumbersColAggregators: "Агрегаторы",
      realNumbersRow1Metric: "Комиссия с заказа",
      realNumbersRow1Aggregator: "18–33% + сборы (реально 35–45%)",
      realNumbersRow1Direct: "Всего 0%",
      realNumbersRow2Metric: "Владение данными клиентов",
      realNumbersRow2Aggregator: "Всё принадлежит платформе",
      realNumbersRow2Direct: "100% принадлежит вам",
      realNumbersRow3Metric: "Контроль цен",
      realNumbersRow3Aggregator: "Ограничен, есть штрафы",
      realNumbersRow3Direct: "Полная свобода",
      realNumbersRow4Metric: "Построение бренда",
      realNumbersRow4Aggregator: "Лояльность достаётся платформе",
      realNumbersRow4Direct: "Лояльность достаётся ВАШЕМУ ресторану",
      realNumbersRow5Metric: "Маржа на доставке",
      realNumbersRow5Aggregator: "Часто ниже 10%",
      realNumbersRow5Direct: "Достижимо 25–35%+",
      realNumbersRow6Metric: "Контроль маркетинга",
      realNumbersRow6Aggregator: "Только за деньги, 250–4000 ₹ и выше",
      realNumbersRow6Direct: "Полный контроль, свои кампании",
      realNumbersRow7Metric: "Контроль меню и скидок",
      realNumbersRow7Aggregator: "Платформа может навязать без согласия",
      realNumbersRow7Direct: "Решение на 100% ваше",
      transparencyHeading: "Важно знать — полная прозрачность.",
      transparencySubheading:
        "Мы говорим прямо. Вот что мы даём, а чего не даём.",
      deliveryTitle: "Мы не предоставляем курьеров",
      deliveryBody:
        "Menuthere сосредоточен на лучшей платформе заказов, работе с клиентами и интеграции с POS. Для доставки у вас есть гибкие варианты:",
      deliveryPoint1: "Свои курьеры — полный контроль",
      deliveryPoint2:
        "Партнёрство со сторонними службами вроде Porter, Dunzo или Shadowfax",
      deliveryPoint3: "Только самовывоз — многие гости его предпочитают",
      deliveryPoint4: "Заказ по QR в зале доставки не требует вовсе",
      deliveryNote:
        "Даже заказы на самовывоз через собственные каналы выгоднее, чем доставленные через агрегатора с комиссией 30%.",
      paymentTitle: "Приём платежей",
      paymentBadge: "Всего 1%",
      paymentBody:
        "Встроенный платёжный шлюз всего за 1% (только сервисный сбор). Гости платят онлайн прямо на вашем сайте заказов:",
      paymentPoint1: "Платежи UPI (Google Pay, PhonePe, Paytm)",
      paymentPoint2: "Кредитные и дебетовые карты",
      paymentPoint3: "Интеграция с цифровыми кошельками",
      paymentPoint4: "Автосверка с PetPooja POS",
      paymentNote:
        "Также можно принимать наличные при доставке или использовать вашу текущую систему оплаты.",
      factsHeading: "Цифры не врут.",
      factsSubheading:
        "Реальные данные отраслевых опросов, расследований CCI и отчётов NRAI.",
      fact1Text:
        "индийских ресторанов хотят уйти со сторонних платформ доставки (опрос, декабрь 2025)",
      fact2Value: "60%",
      fact2Text:
        "новых ресторанов закрываются в первый же год — зависимость от платформ одна из главных причин",
      fact3Value: "4 млрд ₹",
      fact3Text:
        "дополнительно забирают платформы за год через наценку на упаковку по всему рынку",
      fact4Value: "2 000+",
      fact4Text:
        "ресторанов участвовали в бойкоте #Logout против платформ-агрегаторов",
      howItWorksHeading: "Прямые заказы за 3 простых шага.",
      howItWorksSubheading:
        "Запустите собственный канал заказов меньше чем за 10 минут.",
      step1Title: "Создайте меню и сайт",
      step1Body:
        "Загрузите меню, настройте оформление и запустите собственный сайт заказов. Меньше 10 минут.",
      step2Title: "Подключите PetPooja POS",
      step2Body:
        "Свяжите PetPooja POS для автоматической передачи заказов. Заказы идут прямо на кухню — без ручной работы.",
      step3Title: "Делитесь и начинайте продавать",
      step3Body:
        "Отправляйте ссылку на заказ в WhatsApp, соцсети и через QR-коды. Прямые заказы пойдут сами.",
      savingsHeading:
        "Каждый заказ на сторонних платформах доставки стоит вам 100–225 ₹",
      savingsBody:
        "При 50 заказах на доставку в день это 5 000–11 250 ₹ ежедневно. От 150 до 330 тыс. ₹ каждый месяц. Собственный сайт заказов окупается с первого дня.",
      savingsSecondaryCta: "Посмотреть тарифы",
      faqSubheading:
        "Всё, что нужно знать о прямых заказах с Menuthere.",
      faq1Question:
        "Как Menuthere помогает перестать платить комиссии другим платформам доставки?",
      faq1Answer:
        "Menuthere даёт вам собственный брендированный сайт заказов, где гости заказывают напрямую. При комиссии всего 0% вы оставляете себе почти всю выручку с заказов. Мы берём простую абонентскую плату, а не 20–30% с каждого заказа.",
      faq2Question: "Предоставляет ли Menuthere курьеров?",
      faq2Answer:
        "Нет, Menuthere не предоставляет курьеров. Мы даём лучшую платформу заказов, работу с клиентами и интеграцию с POS. Для доставки используйте своих сотрудников, партнёрские службы вроде Porter, Dunzo или Shadowfax либо предлагайте только самовывоз. Многие рестораны видят, что даже самовывоз через собственные каналы выгоднее доставки через агрегаторов.",
      faq3Question: "Как работает интеграция с PetPooja?",
      faq3Answer:
        "Заказы с сайта Menuthere автоматически попадают в терминал PetPooja POS в реальном времени. Кухня видит заказ сразу — без ручного ввода, копипаста и потерь. Это работает так же, как приём заказа из любого другого канала на вашем POS.",
      faq4Question: "А как быть с приёмом оплаты от гостей?",
      faq4Answer:
        "В Menuthere встроен платёжный шлюз со сбором всего 0% (только сервисный сбор). Гости платят онлайн через UPI, карты и кошельки прямо на вашем сайте заказов. Также можно принимать наличные при доставке или использовать вашу текущую систему оплаты.",
      faq5Question:
        "Стоит ли полностью уходить со сторонних платформ доставки?",
      faq5Answer:
        "Не обязательно. Многие рестораны используют сторонние платформы для привлечения новых гостей, а постоянных переводят на собственный сайт заказов с более высокой маржой. Цель — снизить зависимость, а не обязательно отказаться совсем, и оставлять себе больше выручки.",
      faq6Question: "Сколько стоит Menuthere?",
      faq6Answer:
        "Menuthere берёт простую ежемесячную абонентскую плату, а не процент с заказов. Даже на платных тарифах вы сэкономите намного больше, чем потратите, отказавшись от комиссий агрегаторов. Актуальные тарифы — на странице цен.",
      faq7Question:
        "Правда ли, что 35% ресторанов хотят уйти от агрегаторов?",
      faq7Answer:
        "Да. Отраслевой опрос в декабре 2025 года показал, что 35% индийских ресторанов хотят перестать работать со сторонними платформами доставки: причины — высокие комиссии, слабый сервис, недостаточная прибыль и отсутствие доступа к данным о клиентах.",
      faq8Question:
        "Можно ли работать со сторонними платформами вместе с Menuthere?",
      faq8Answer:
        "Конечно. Большинство наших ресторанов-партнёров так и делают. Они оставляют сторонние платформы для привлечения новых гостей и активно переводят постоянных на свой сайт Menuthere, где маржа заметно выше. Со временем доля прямых заказов растёт — гостям удобнее заказывать напрямую.",
    },
    whatsappOrdering: {
      metaTitle: "Заказы в WhatsApp: гость шлёт «Hi» | Menuthere",
      metaDescription:
        "Превратите номер WhatsApp в канал заказов. Гость шлёт «Hi», получает ссылку с автовходом и заказывает по меню. Без приложений, регистрации и комиссии.",
      metaKeywords:
        "заказы в whatsapp, система заказов в whatsapp для ресторанов, заказать в whatsapp, whatsapp business заказы, меню ресторана в whatsapp, отправить hi чтобы заказать, заказ еды в whatsapp, диалоговые заказы, заказы без комиссии",
      ogTitle: "Заказы в WhatsApp — гость просто шлёт «Hi» | Menuthere",
      ogDescription:
        "Самый простой канал заказов для ресторанов. «Hi» → мгновенная ссылка → заказ по меню → статусы в WhatsApp. Без приложений, регистрации и комиссии.",
      structuredDataProductName: "Заказы в WhatsApp от Menuthere",
      structuredDataProductDescription:
        "Система заказов в WhatsApp для ресторанов. Гость отправляет «Hi», получает ссылку с автоматическим входом, заказывает в визуальном веб-меню и получает статусы заказа в WhatsApp.",
      heroBadge: "Заказы в WhatsApp",
      heroBadgeNew: "НОВОЕ",
      heroTitle: "Ваши гости заказывают, просто отправив «Hi».",
      heroSubtitle:
        "Превратите номер WhatsApp в самый простой канал заказов. Одно «Hi» — и у гостя мгновенная ссылка на меню с автоматическим входом: без установки приложения, регистрации и OTP. Клиент остаётся вашим, комиссия — ноль.",
      primaryCta: "Начать бесплатно",
      heroTrust1: "Без установки приложения",
      heroTrust2: "Без регистрации и OTP",
      heroTrust3: "0% комиссии",
      stepsHeading: "Отправьте «Hi». Вот и вся воронка.",
      stepsSubheading:
        "Главная причина брошенных корзин — трение: загрузки, регистрации, пароли. Заказы в WhatsApp убирают всё это. Четыре шага, и гость не покидает канал, которому уже доверяет.",
      step1Title: "Гость отправляет «Hi»",
      step1Body:
        "Со стикера, QR-кода на столе, ссылки в профиле или карточки Google гость переходит в WhatsApp и пишет Hi на ваш номер. Ни приложения, ни анкеты.",
      step2Title: "Мгновенно получает ссылку «Заказать»",
      step2Body:
        "Ваш номер за секунду отвечает кнопкой «Заказать». Ссылка авторизует гостя автоматически — без OTP, пароля и создания аккаунта.",
      step3Title: "Заказывает в вашем визуальном меню",
      step3Body:
        "Ссылка открывает ваше брендированное веб-меню — гость уже вошёл. Он смотрит фото, добавляет в корзину, выбирает UPI или наличные и оформляет заказ в пару касаний.",
      step4Title: "Статусы приходят обратно в WhatsApp",
      step4Body:
        "Заказ получен, принят, блюда готовы, курьер выехал со ссылкой на отслеживание, доставлено — плюс бонусные баллы. Каждое обновление прилетает прямо в чат.",
      featuresHeading: "Сделано, чтобы продавать, а не просто переписываться.",
      featuresSubheading:
        "Всё, чтобы вести заказы в WhatsApp профессионально — под вашим брендом и на ваших условиях.",
      feature1Title: "Без приложений и регистрации",
      feature1Body:
        "Работает на любом телефоне с WhatsApp. Отправка «Hi» незаметно создаёт и узнаёт гостя, так что он никогда не упирается в форму входа.",
      feature2Title: "Ваш собственный номер",
      feature2Body:
        "Подключите свой номер WhatsApp Business через Meta за считаные минуты — даже тот, которым уже пользуетесь. Или начните сразу на нашем общем номере.",
      feature3Title: "Ссылки на заказ на вашем домене",
      feature3Body:
        "Ссылки на заказ могут работать на вашем домене (yourbrand.com), а не на чужом URL — каждая точка контакта остаётся в вашем бренде.",
      feature4Title: "Автоматические статусы",
      feature4Body:
        "Оформлен с полным счётом, принят, готов, передан курьеру со ссылкой на карту отслеживания, завершён и начисленные баллы — всё отправляется автоматически.",
      feature5Title: "Безопасные одноразовые ссылки",
      feature5Body:
        "Каждая ссылка подписана, живёт несколько минут и привязывается к тому, кто открыл её первым — пересланная ссылка не даст доступа к чужой сессии.",
      feature6Title: "Сценарии сообщений без кода",
      feature6Body:
        "Приветствие и сообщения о заказе — это редактируемые сценарии с триггерами по ключевым словам, кнопками и медиа. Меняйте тексты без разработчиков.",
      feature7Title: "Единый входящий WhatsApp",
      feature7Body:
        "Каждое входящее и исходящее сообщение сохраняется и доступно в панели, так что в час пик ничего не теряется.",
      feature8Title: "Аналитика с разбивкой по каналам",
      feature8Body:
        "Заказы из WhatsApp помечаются автоматически. Сравнивайте количество заказов и выручку по приложению, сайту и WhatsApp.",
      frictionHeading: "Посчитайте касания. Гости их считают.",
      frictionSubheading:
        "Каждый лишний шаг между «голоден» и «заказал» — это потерянный гость. Вот один и тот же заказ двумя способами.",
      frictionAggregatorLabel: "Приложение агрегатора",
      frictionAggregatorStep1: "Установить приложение",
      frictionAggregatorStep2: "Регистрация и подтверждение OTP",
      frictionAggregatorStep3: "Найти ваш ресторан",
      frictionAggregatorStep4: "Заказ (они берут 20–33%)",
      frictionAggregatorStep5: "Гостя вы так и не увидите",
      frictionWhatsappLabel: "Заказы в WhatsApp",
      frictionWhatsappStep1: "Отправить «Hi»",
      frictionWhatsappStep2: "Нажать «Заказать» (вход автоматический)",
      frictionWhatsappStep3: "Заказать в вашем меню",
      frictionHighlight: "100% стоимости заказа остаётся у вас.",
      comparisonHeading: "Как это выглядит в сравнении.",
      comparisonSubheading:
        "Заказы в WhatsApp от Menuthere против агрегаторов еды и обычных чат-ботов для заказов.",
      comparisonColAggregators: "Агрегаторы еды",
      comparisonColChatbots: "Обычные чат-боты",
      comparisonValueYes: "Да",
      comparisonValueNo: "Нет",
      comparisonRow1Label: "Комиссия с заказа",
      comparisonRow1Aggregator: "20–33%",
      comparisonRow1Chatbot: "Абонплата + за сообщение",
      comparisonRow2Label: "Нужна установка приложения",
      comparisonRow2Us: "Никогда",
      comparisonRow3Label: "Вход клиента и OTP",
      comparisonRow3Us: "Автоматически — не нужен",
      comparisonRow3Aggregator: "Аккаунт + OTP",
      comparisonRow3Chatbot: "Обычно нужен",
      comparisonRow4Label: "Опыт заказа",
      comparisonRow4Us: "Полное визуальное меню с фото",
      comparisonRow4Aggregator: "Внутри их приложения",
      comparisonRow4Chatbot: "Ввод блюд в чате",
      comparisonRow5Label: "Отправка с вашего номера",
      comparisonRow5Chatbot: "Иногда",
      comparisonRow6Label: "Статус заказа и отслеживание доставки",
      comparisonRow6Us: "В WhatsApp",
      comparisonRow6Aggregator: "В их приложении",
      comparisonRow6Chatbot: "Редко",
      comparisonRow7Label: "Данные о клиентах принадлежат вам",
      comparisonRow7Us: "Да, полностью",
      comparisonRow7Chatbot: "Частично",
      comparisonRow8Label: "Время запуска",
      comparisonRow8Us: "Минуты",
      comparisonRow8Aggregator: "Недели подключения",
      comparisonRow8Chatbot: "Дни и настройка сценариев",
      outcome1Value: "≈ 10 сек",
      outcome1Label: "От «Hi» до рабочей ссылки на заказ в руках гостя.",
      outcome2Label:
        "Комиссия. Каждая рупия из стоимости заказа остаётся вашей.",
      outcome3Value: "Полный цикл",
      outcome3Label:
        "Оформлен → принят → в пути → отслеживание, всё в WhatsApp.",
      faqHeading: "Отвечаем на вопросы.",
      faq1Question: "Нужно ли моим гостям что-то устанавливать?",
      faq1Answer:
        "Нет. Если у них есть WhatsApp — они могут заказать. Отправляют «Hi», нажимают ссылку «Заказать» и попадают в ваше меню уже авторизованными. Ни приложения, ни аккаунта.",
      faq2Question: "Гость набирает заказ прямо в чате?",
      faq2Answer:
        "Нет — и в этом суть. WhatsApp здесь входная дверь, а не касса. «Hi» даёт мгновенную ссылку на настоящее визуальное меню с фото, категориями и поиском: заказывать быстро, ошибки редки. А статусы приходят обратно в WhatsApp.",
      faq3Question: "Может ли всё это работать с моего номера WhatsApp?",
      faq3Answer:
        "Да. Свой номер WhatsApp Business подключается через официальный процесс Meta за несколько минут — в том числе номер, который вы уже используете в приложении WhatsApp Business. Не хотите ничего настраивать? Начните сразу на нашем общем номере и переключитесь позже.",
      faq4Question: "Безопасно ли делиться ссылкой на заказ?",
      faq4Answer:
        "Каждая ссылка криптографически подписана, живёт несколько минут и привязывается к тому, кто открыл её первым. Если её перешлют, у другого человека она просто не сработает — сессия не утечёт.",
      faq5Question: "Что гость получает после заказа?",
      faq5Answer:
        "Автоматические сообщения в WhatsApp на каждом этапе: заказ получен с полным счётом, принят, блюда готовы, курьер выехал со ссылкой на отслеживание, завершён и начислены бонусные баллы (если у вас есть программа лояльности).",
      faq6Question: "Какую комиссию берёт Menuthere?",
      faq6Answer:
        "Нулевую комиссию с заказов. Заказы в WhatsApp — часть вашего собственного прямого канала: вы оставляете себе 100% стоимости каждого заказа, а платежи поступают прямо на ваш счёт.",
      faqCtaPrompt: "Готовы, чтобы гости заказывали одним «Hi»?",
      faqSecondaryLink: "Узнать о заказах без комиссии",
      trialHeading:
        "Запустите заказы в WhatsApp меньше чем за 2 минуты.",
      trialDescription:
        "Подключите номер WhatsApp, загрузите меню — и гости будут заказывать одним «Hi»: ссылка с автовходом, статусы в реальном времени и нулевая комиссия. Присоединяйтесь к 600+ ресторанам, которые уже растут с Menuthere.",
    },
  },
  solutionsSlug: {
    heroPrimaryCta: "Начать бесплатно",
    heroSecondaryCta: "Заказать демо",
    benefitsHeadingLead: "Почему выбирают Menuthere",
    benefitsHeadingIndustry: "для {industry}?",
    benefitsHeadingIndustryFallback: "вашего бизнеса",
    benefitsSubheading:
      "Возможности, созданные специально под вашу отрасль.",
    featuresHeadingLead: "Всё, что нужно,",
    featuresHeadingEmphasis: "чтобы расти.",
    featuresSubheading:
      "Полный набор инструментов, чтобы обновить меню и радовать гостей.",
    featuresCtaCardHeading: "Готовы начать?",
    featuresCtaCardBody:
      "Тысячи заведений уже используют Menuthere, чтобы изменить свой подход к меню.",
    featuresCtaCardButton: "Начать бесплатно",
    useCasesHeadingLead: "Подходит любому типу",
    useCasesHeadingIndustry: "{industry}.",
    useCasesHeadingIndustryFallback: "бизнеса",
    faqHeadingLead: "Частые",
    faqHeadingEmphasis: "вопросы.",
    notFoundMetaTitle: "Решение не найдено",
    breadcrumbHome: "Главная",
    breadcrumbSolutions: "Решения",
  },
  downloadApp: {
    heroHeadingLead: "Menuthere для",
    heroHeadingHighlight: "телефона и компьютера.",
    heroSubheading:
      "Управляйте рестораном в дороге или за рабочим столом. Мгновенные уведомления о заказах, обновление меню и контроль продаж на всех устройствах.",
    appStoreBadgePrefix: "Загрузите в",
    playStoreBadgePrefix: "Доступно в",
    windowsBadgePrefix: "Скачать для",
    windowsBadgePlatform: "Windows",
    heroImageAlt: "Интерфейс приложения Menuthere",
  },
  blog: {
    metaTitle: "Блог | Menuthere — о ресторанах и кафе",
    metaDescription:
      "Советы, руководства и наблюдения для владельцев ресторанов: цифровые меню, QR-коды, синхронизация с Google Business и рост бизнеса.",
    ogTitle: "Блог | Menuthere",
    ogDescription:
      "Советы, руководства и наблюдения для владельцев ресторанов: цифровые меню, QR-коды и рост бизнеса.",
    heroHeading: "Свежие новости и материалы",
    heroHeadingAccent: "от Menuthere",
    categoryLabel: "Блог",
    emptyState: "Пока нет опубликованных статей. Скоро будут!",
    postMetaTitleTemplate: "{title} | Блог Menuthere",
    postNotFoundMetaTitle: "Статья не найдена",
    backToIndexLink: "← Блог",
    relatedHeading: "Ещё статьи",
  },
};

export default ru;
