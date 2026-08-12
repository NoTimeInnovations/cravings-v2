import type { Dictionary } from "./en";

/**
 * French. Typed as `Dictionary`, so this file cannot drift from the
 * English source: add a key to en.ts and TypeScript fails here until it is
 * translated, rather than letting English leak onto a French page.
 *
 * Brand nouns (Menuthere, WhatsApp, Google, Product Hunt, QR, POS) stay in
 * Latin script on purpose — that is how the market writes them.
 */
const fr: Dictionary = {
  common: {
    language: "Langue",
    changeLanguage: "Changer de langue",
  },
  nav: {
    products: "Produits",
    solutions: "Solutions",
    businesses: "Secteurs",
    pricing: "Tarifs",
    resources: "Ressources",
    blog: "Blog",
    login: "Connexion",
    bookDemo: "Réserver une démo",
    getStarted: "Commencer gratuitement",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
  },
  navItems: {
    ownDeliveryWebsite: {
      title: "Votre site de livraison",
      description: "Plateforme de livraison sans commission",
    },
    digitalMenuCreator: {
      title: "Créateur de menu digital",
      description: "Menus QR pour commander à table",
    },
    pos: {
      title: "Point de vente (POS)",
      description: "Gérez la facturation et les opérations",
    },
    tableOrdering: {
      title: "Commande à table",
      description: "Une expérience fluide pour vos clients",
    },
    captainOrdering: {
      title: "Prise de commande serveur",
      description: "Une prise de commande efficace en salle",
    },
    googleBusinessSync: {
      title: "Sync Google Business",
      description: "Synchronisez votre carte sur Google Maps",
    },
    owners: {
      title: "Restaurateurs",
      description: "Pilotez l'exploitation et faites croître le chiffre",
    },
    agencies: {
      title: "Agences",
      description: "Gérez plusieurs comptes clients sans effort",
    },
    restaurants: {
      title: "Restaurants",
      description: "Des menus digitaux intelligents pour la salle",
    },
    cafes: {
      title: "Cafés & coffee shops",
      description: "Des menus modernes pour le meilleur café",
    },
    bakeries: {
      title: "Boulangeries",
      description: "Mettez vos produits frais en valeur",
    },
    cloudKitchens: {
      title: "Dark kitchens",
      description: "Gestion de menus multi-marques",
    },
    hotels: {
      title: "Hôtels & resorts",
      description: "Une expérience de table élégante",
    },
    foodTrucks: {
      title: "Food trucks",
      description: "Des menus mobiles qui vous suivent",
    },
    bars: {
      title: "Bars & pubs",
      description: "Des cartes de boissons dynamiques et stylées",
    },
  },
  hero: {
    productHunt: "En ligne sur Product Hunt",
    headlineA: "Vos commandes vous appartiennent.",
    headlineB: "Vos clients aussi.",
    subhead:
      "Fini les 30% prélevés par les agrégateurs. Menuthere déploie en quelques minutes votre plateforme de commande et de livraison, à vos couleurs.",
    searchPlaceholder: "Rechercher « {name} »",
    generate: "Générer",
    working: "En cours…",
    clear: "Effacer",
    pickFromDropdown: "Sélectionnez votre établissement dans la liste",
    bulletNoCommission: "Zéro commission",
    bulletYourBrand: "Votre marque",
    bulletLiveInMinutes: "En ligne en quelques minutes",
    whatsappTitle: "Commande sur WhatsApp",
    whatsappNew: "Nouveau",
    whatsappBlurb: "Vos clients commandent sur WhatsApp — sans appli, sans compte.",
    whatsappExplore: "Découvrir la commande WhatsApp",
    trustedBy: "Adopté par les restaurants qui développent leur marque",
  },
  footer: {
    solutions: "Solutions",
    resources: "Ressources",
    legal: "Mentions légales",
    tagline: "La commande sans commission pour les restaurants.",
    rights: "Tous droits réservés.",
  },
  metadata: {
    title: "Menuthere | Commande en ligne et livraison pour restaurants",
    description:
      "Lancez l'app de livraison de votre restaurant : intégration POS Petpooja, commandes et analyses en temps réel. Plus de 600 restaurants en Inde.",
  },
  solutionsOwners: {
    metaTitle: "Solutions pour restaurateurs | Menuthere",
    metaDescription:
      "Reprenez le contrôle de votre restaurant : carte, POS, serveurs et stocks dans un seul tableau de bord. Zéro commission, marge maximale avec Menuthere.",
    heroPrimaryCta: "Commencer",
    heroSecondaryCta: "Réserver une démo",
    benefitsHeading: "Pourquoi Menuthere",
    benefitsHeadingAccent: "pour les restaurateurs ?",
    reviewsHeading: "Adoré par les",
    reviewsHeadingAccent: "restaurateurs.",
  },
  solutionsAgencies: {
    metaTitle: "Programme partenaires agences | Menuthere",
    metaDescription:
      "Devenez partenaire agréé Menuthere. Jusqu'à 30% de commissions récurrentes à vie en vendant nos menus digitaux premium aux restaurants.",
    heroBadge: "Programme partenaires agences",
    heroApplyCta: "Postuler",
    heroDemoCta: "Réserver une démo",
    problemHeading: "Créez du chiffre pour les restaurants,",
    problemHeadingAccent: "et pour vous",
    problemBody:
      "Les restaurants indépendants perdent des ventes à cause de PDF figés, incapables de refléter le moindre changement. En tant que partenaire Menuthere, vous réglez le problème avec une plateforme éprouvée à 30 $/mois : des mises à jour QR instantanées, déjà adoptées par plus de 600 établissements. De quoi devenir leur conseiller de référence.",
    benefitsHeading: "Pourquoi devenir",
    benefitsHeadingAccent: "partenaire ?",
    earningsBadge: "Fort potentiel de revenus",
    earningsHeading: "Une commission indexée",
    earningsHeadingAccent: "sur la performance.",
    earningsSubheading:
      "Vos gains suivent directement le chiffre d'affaires. Versement mensuel via Stripe, le jour même où nous encaissons l'abonnement.",
    earningsTableTierHeader: "Palier",
    earningsTableRevenueHeader: "Chiffre d'affaires apporté (à vie)",
    earningsTableCommissionHeader: "Commission (par abo. à 30 $)",
    tierStarterName: "Starter",
    tierStarterRevenue: "0 $ à 1 000 $",
    tierStarterRate: "20%",
    tierStarterPayout: "(6 $/mois)",
    tierStarterPayoutPerSub: "6 $/mois par abonnement",
    tierGrowthName: "Growth",
    tierGrowthRevenue: "1 001 $ à 5 000 $",
    tierGrowthRate: "25%",
    tierGrowthPayout: "(7,50 $/mois)",
    tierGrowthPayoutPerSub: "7,50 $/mois par abonnement",
    tierEliteName: "Elite",
    tierEliteRevenue: "5 001 $+",
    tierEliteRate: "30%",
    tierElitePayout: "(9 $/mois)",
    tierElitePayoutPerSub: "9 $/mois par abonnement",
    tierCardRevenueLabel: "Chiffre d'affaires",
    tierCardCommissionLabel: "Commission",
    processHeading: "L'intégration",
    processHeadingAccent: "partenaire.",
    processStepOneTitle: "Étude de la candidature",
    processStepOneDescription:
      "Validation rapide et accès au portail revendeur : liens de démo, supports à votre marque.",
    processStepTwoTitle: "Déploiement terrain",
    processStepTwoDescription:
      "Ciblez les restaurants, faites des démos de 5 minutes et décrochez les signatures.",
    processStepThreeTitle: "Partage des revenus",
    processStepThreeDescription:
      "Suivi automatisé et versement le jour même de l'encaissement.",
    idealPartnerHeading: "Les partenaires",
    idealPartnerHeadingAccent: "que nous cherchons",
    idealPartnerBody:
      "Des commerciaux aguerris, capables de nouer des relations durables avec les restaurateurs. Programme sélectif, réservé aux profils qui ont fait leurs preuves.",
    partnerTypeRestaurantAdvisors: "Consultants restauration",
    partnerTypeChannelPartners: "Partenaires B2B",
    partnerTypeSalesExecutives: "Commerciaux",
    partnerTypeFranchiseSpecialists: "Spécialistes de la franchise",
    partnerTypeSaasResellers: "Revendeurs SaaS",
    partnerTypeBizDevPros: "Experts du développement commercial",
    faqHeading: "Questions",
    faqHeadingAccent: "partenaires.",
    faqProductOverviewQuestion: "Le produit",
    faqProductOverviewAnswer:
      "Une plateforme de menu digital QR premium à 30 $/mois, pour les restaurants du monde entier.",
    faqExperienceRequiredQuestion: "Expérience requise",
    faqExperienceRequiredAnswer:
      "Expérience de la vente terrain ; tous les supports sont fournis.",
    faqPayoutMechanicsQuestion: "Modalités de versement",
    faqPayoutMechanicsAnswer:
      "Versement mensuel via Stripe le jour de l'encaissement, à vie pour chaque abonnement actif.",
    faqCostsInvolvedQuestion: "Coûts à prévoir",
    faqCostsInvolvedAnswer: "Aucun : 100% à la commission.",
    faqTerritoryQuestion: "Territoire",
    faqTerritoryAnswer: "Indépendants du monde entier, priorité aux États-Unis.",
    faqResourcesQuestion: "Ressources",
    faqResourcesAnswer:
      "Portail avec vidéos, scripts et présentations ; leads qualifiés disponibles.",
    trustBadgeDeployments: "600+ déploiements en ligne",
    trustBadgeFieldTested: "Modèle éprouvé sur le terrain",
    trustBadgeRevenueShare: "Uniquement à la commission",
    trustBadgeExclusiveAccess: "Accès exclusif",
    termsHeading: "Conditions du programme partenaires",
    termsIncomeContinuity:
      "Continuité des revenus : les commissions courent tant que l'abonnement reste actif.",
    termsTerminationRights:
      "Résiliation : Menuthere se réserve le droit de mettre fin au partenariat en cas d'incompatibilité avec la marque.",
    termsPayoutTiming:
      "Date de versement : le jour même de l'encaissement de l'abonnement, net de frais.",
    termsEligibility:
      "Éligibilité : partenaires acceptés dans le monde entier, sous réserve de validation.",
  },
  solutionsIndex: {
    metaTitle: "Solutions de menu digital pour la restauration | Menuthere",
    metaDescription:
      "Menus digitaux pour restaurants, cafés, boulangeries, dark kitchens, hôtels, food trucks et bars : QR code, mises à jour en temps réel, sync Google.",
    ogTitle: "Solutions de menu digital | Menuthere",
    ogDescription:
      "Des menus digitaux intelligents pour restaurants, cafés, boulangeries et bien d'autres. Mises à jour en temps réel, design soigné, zéro frais d'impression.",
    heroTitleLead: "Des menus digitaux qui",
    heroTitleEmphasis: "transforment",
    heroTitleTail: "votre établissement.",
    heroSubtitle:
      "Café de quartier, restaurant qui ne désemplit pas ou réseau de dark kitchens : la plateforme s'adapte à votre façon de travailler.",
    heroPrimaryCta: "Commencer gratuitement",
    heroSecondaryCta: "Réserver une démo",
    industriesHeadingLead: "Choisissez votre secteur,",
    industriesHeadingEmphasis: "c'est parti.",
    industriesIntro:
      "Des solutions de menu digital pensées pour votre type d'établissement.",
    cardRestaurantsTitle: "Restaurants",
    cardRestaurantsDesc: "Des menus digitaux intelligents pour la salle",
    cardCafesTitle: "Cafés & coffee shops",
    cardCafesDesc: "Des menus modernes pour le meilleur café",
    cardBakeriesTitle: "Boulangeries & pâtisseries",
    cardBakeriesDesc: "Mettez vos produits frais en valeur",
    cardCloudKitchensTitle: "Dark kitchens",
    cardCloudKitchensDesc: "La gestion multi-marques enfin simple",
    cardHotelsTitle: "Hôtels & resorts",
    cardHotelsDesc: "Une expérience de table élégante pour vos clients",
    cardFoodTrucksTitle: "Food trucks",
    cardFoodTrucksDesc: "Des menus mobiles qui vous suivent partout",
    cardBarsTitle: "Bars & pubs",
    cardBarsDesc: "Des cartes de boissons dynamiques et stylées",
    cardCateringTitle: "Traiteurs",
    cardCateringDesc: "Des menus professionnels pour chaque événement",
    cardOwnersTitle: "Restaurateurs",
    cardOwnersDesc: "Reprenez le contrôle de votre exploitation",
    cardAgenciesTitle: "Agences & consultants",
    cardAgenciesDesc: "Gérez plusieurs comptes clients sans effort",
    cardPetpoojaTitle: "Commande directe & PetPooja",
    cardPetpoojaDesc: "L'alternative sans commission à Swiggy et Zomato",
    cardWhatsappOrderingTitle: "Commande sur WhatsApp",
    cardWhatsappOrderingDesc:
      "Vos clients envoient « Hi » et commandent — sans appli, sans inscription",
    cardLearnMoreLink: "En savoir plus",
    featuresHeadingLead: "Des fonctionnalités puissantes,",
    featuresHeadingEmphasis: "pour chaque établissement.",
    featureQrTitle: "Menus QR code",
    featureQrDesc:
      "Accès immédiat en scannant avec le smartphone. Aucune application à installer.",
    featureRealtimeTitle: "Mises à jour en temps réel",
    featureRealtimeDesc:
      "Modifiez les prix, ajoutez des plats, signalez une rupture en un instant.",
    featureGoogleSyncTitle: "Sync Google Business",
    featureGoogleSyncDesc:
      "Mettez à jour automatiquement le menu de votre fiche Google Business.",
    featureAnalyticsTitle: "Analyses & statistiques",
    featureAnalyticsDesc:
      "Suivez les plats qui marchent et les préférences de vos clients.",
    googleBadge: "Intégration Google Business",
    googleHeading: "Synchronisez votre carte avec Google Business Profile",
    googleBody:
      "Votre fiche Google Business se met à jour automatiquement à chaque modification. Les clients qui vous cherchent sur Google Maps voient toujours votre carte du jour.",
    googleBenefitOneClickSync: "Synchronisation en un clic vers Google Business Profile",
    googleBenefitRealtimeUpdates: "Carte à jour en temps réel sur toutes les plateformes",
    googleBenefitLocalSeo: "Meilleur référencement local et plus de visibilité",
    googleBenefitMoreCustomers: "Plus de clients venus de Google Search et Maps",
    googleManagerLink: "Découvrir Google Business Manager",
    googleCardTitle: "Google Business Profile",
    googleCardSubtitle: "Gestionnaire de menu",
    googleCardSyncedLabel: "Plats synchronisés",
    googleCardLastSyncLabel: "Dernière sync",
    googleCardLastSyncValue: "À l'instant",
  },
  getStarted: {
    metaTitle: "Commencer | Menuthere",
    metaDescription: "Créez votre menu digital avec Menuthere.",
    stepIndicator: "Étape {step} sur 3",
    publishingLoader1: "Création de votre compte...",
    publishingLoader2: "Configuration de votre menu digital...",
    publishingLoader3: "Préparation du tableau de bord...",
    publishingLoader4: "Presque terminé...",
    step1Title: "Importez votre carte",
    step1Subtitle:
      "Prenez votre carte en photo, nous la digitalisons instantanément.",
    filesSelectedCount: "{count} fichier(s) sélectionné(s)",
    uploadDropzonePrompt: "Cliquez pour importer, glissez-déposez ou collez",
    uploadFormatsHint: "JPG, PNG, PDF jusqu'à 10 Mo",
    uploadAddMoreHint: "Cliquez ici pour en ajouter",
    fileTooLargeBadge: "Trop lourd ({size} Mo)",
    filePreviewAlt: "Page {number}",
    aiInstructionLabel: "Instructions pour notre IA",
    optionalSuffix: "(facultatif)",
    aiInstructionPlaceholder:
      "Une particularité sur votre carte ? Ex. : « Ignore les boissons », « Traite les formules comme une catégorie à part », « Les prix sont en AED »",
    aiInstructionHint: "Votre consigne prime lorsque l'IA lit vos fichiers.",
    removeInvalidFilesButton: "Retirez les fichiers non valides pour continuer",
    nextStepButton: "Étape suivante",
    uploadOrDivider: "Ou",
    sampleMenuButton: "Essayer avec une carte type",
    sampleMenuDialogTitle: "Choisissez une carte type",
    sampleMenuDialogSubtitle:
      "Choisissez un type d'établissement pour démarrer avec une carte prête à l'emploi.",
    sampleMenuComingSoonBadge: "Bientôt disponible",
    filesTooLargeToast:
      "{count} fichier(s) dépassent la limite de 10 Mo. Importez des fichiers plus légers.",
    filesAddedToast: "{count} fichier(s) ajouté(s) !",
    sampleMenuLoadedToast: "Carte type « {name} » chargée !",
    step2Title: "Informations sur le restaurant",
    step2Subtitle:
      "Parlez-nous de votre établissement pour personnaliser votre carte.",
    restaurantNameLabel: "Nom du restaurant",
    restaurantNamePlaceholder: "Ex. : Le Comptoir du Burger",
    usernameLabel: "Identifiant",
    usernamePlaceholder: "nom_de_votre_etablissement",
    usernameCheckingStatus: "Vérification de la disponibilité...",
    usernameAvailableStatus: "Identifiant disponible",
    usernameTakenStatus: "Cet identifiant est déjà pris",
    usernameMinLengthHint: "L'identifiant doit contenir au moins 3 caractères",
    phoneNumberLabel: "Numéro de téléphone",
    phoneCodePlaceholder: "Indicatif",
    phoneInvalidError: "Numéro de téléphone non valide",
    countryLabel: "Pays",
    countryPlaceholder: "Sélectionnez ou saisissez un pays",
    addressLabel: "Adresse",
    addressPlaceholder: "Rue, quartier, ville…",
    currencyLabel: "Devise",
    currencyPlaceholder: "Sélectionnez ou recherchez une devise",
    currencySearchPlaceholder: "Rechercher une devise (ex. : EUR, dollar, ₹)",
    currencySelectFallback: "Choisir la devise",
    currencyNoMatch: "Aucun résultat",
    logoLabel: "Logo (facultatif)",
    logoPreviewAlt: "Aperçu du logo",
    changeLogoButton: "Changer de logo",
    uploadLogoButton: "Importer un logo",
    removeLogoButton: "Supprimer",
    logoSizeLabel: "Taille (%)",
    logoBackgroundLabel: "Arrière-plan",
    createMenuButton: "Créer la carte",
    logoNotAnImageToast: "Choisissez un fichier image pour votre logo",
    logoTooLargeToast: "Le logo doit faire moins de 10 Mo",
    logoReadFailedToast: "Impossible de lire cette image",
    missingDetailsToast: "Merci de renseigner tous les champs",
    invalidPhoneToast: "Saisissez un numéro de téléphone valide",
    extractingTitle: "Extraction de votre carte",
    extractingSubtitle:
      "Merci de patienter pendant le traitement de l'image de votre carte...",
    extractionErrorTitle: "Échec de l'extraction",
    menuUnreadableError:
      "Nous n'avons pas pu lire votre carte. Essayez des fichiers plus nets ou ajoutez les plats manuellement.",
    extractionFailedToast: "Échec de l'extraction de la carte. Réessayez.",
    retryExtractionButton: "Réessayer",
    cancelExtractionButton: "Annuler et réimporter",
    step3Title: "Votre carte est prête !",
    step3Subtitle:
      "Nous avons extrait {count} plats. Personnalisez votre thème ci-dessous.",
    themePickerTitle: "Choisissez un thème",
    themeSwatchSample: "Aa",
    themeClassicLabel: "Classique",
    themeMidnightLabel: "Minuit",
    themeFreshLabel: "Fraîcheur",
    publishButton: "Publier en ligne",
    authModalSignInTitle: "Connectez-vous pour publier",
    authModalEmailHint:
      "Nous enverrons vos identifiants de tableau de bord par e-mail.",
    googleSignInButton: "Continuer avec Google",
    authDividerOr: "ou",
    emailPlaceholder: "vous@exemple.com",
    continueWithEmailButton: "Continuer avec l'e-mail",
    authModalPasswordTitle: "Créez un mot de passe",
    authModalPasswordHint:
      "Définissez un mot de passe pour votre tableau de bord.",
    passwordPlaceholder: "Mot de passe (6 caractères min.)",
    confirmPasswordPlaceholder: "Confirmez le mot de passe",
    continueButton: "Continuer",
    invalidEmailToast: "Saisissez une adresse e-mail valide",
    passwordTooShortToast: "Le mot de passe doit contenir au moins 6 caractères",
    passwordMismatchToast: "Les mots de passe ne correspondent pas",
    emailAlreadyRegisteredToast:
      "Cette adresse e-mail est déjà utilisée. Essayez-en une autre.",
    googleSignInSuccessToast: "Connexion avec Google réussie !",
    googleSignInFailedToast: "Échec de la connexion avec Google. Réessayez.",
    publishSuccessToast: "Carte publiée ! Redirection vers le tableau de bord...",
    publishFailedToast: "Impossible de finaliser l'inscription. Réessayez.",
    successTitle: "Consultez vos e-mails !",
    successSubtitle:
      "Nous avons envoyé le lien de votre carte et vos identifiants à :",
    successSpamHint:
      "Vous ne trouvez rien ? Vérifiez vos spams ou modifiez votre adresse ci-dessous.",
    successMobileSubtitle:
      "Nous avons envoyé par e-mail le lien de votre carte et vos identifiants.",
    changeEmailButton: "Mauvaise adresse ? Modifier",
    loginToDashboardButton: "Accéder au tableau de bord",
    changeEmailTitle: "Modifier l'e-mail",
    changeEmailSubtitle:
      "Saisissez la bonne adresse e-mail. Nous y enverrons le lien de votre carte et vos identifiants.",
    newEmailLabel: "Nouvelle adresse e-mail",
    updatingEmailButton: "Mise à jour...",
    updateAndResendButton: "Mettre à jour et renvoyer",
    emailUpdatedToast:
      "Adresse mise à jour ! Consultez votre nouvelle boîte de réception.",
    emailUpdateFailedToast:
      "Impossible de mettre à jour l'adresse. Réessayez.",
  },
  helpCenter: {
    metaTitle: "Aide & support | Menu digital Menuthere",
    metaDescription:
      "Obtenez de l'aide sur votre menu digital Menuthere : FAQ, support WhatsApp et contact e-mail. Réponses rapides sur la carte, les offres et plus encore.",
    heroTitle: "Aide &",
    heroTitleAccent: "support.",
    heroSubtitle:
      "Besoin d'un coup de main ? Écrivez-nous par e-mail ou discutez directement sur WhatsApp.",
    faqSectionTitle: "Questions",
    faqSectionTitleAccent: "fréquentes.",
    faq1Question:
      "Comment éviter que mes clients tombent sur d'anciennes cartes sur Google ou dans les applis ?",
    faq1Answer:
      "Toute modification — plats, prix, descriptions ou disponibilité — s'applique instantanément à votre menu digital. Vérifiez-le en cliquant sur Voir le menu depuis votre tableau de bord : aucun délai, aucune réimpression.",
    faq2Question:
      "Les plats en rupture s'affichent encore sur mon menu QR/digital, pourquoi ?",
    faq2Answer:
      "Dans la section Menu, cliquez sur Disponibilité en haut. Activez ou désactivez des catégories entières ou des plats un par un en un seul clic : les articles en rupture disparaissent partout immédiatement.",
    faq3Question:
      "Mettre à jour la carte prend un temps fou et coûte cher en graphistes.",
    faq3Answer:
      "L'édition est d'une simplicité extrême et prend quelques secondes, sans aucune compétence technique. Allez dans la section Menu, cliquez sur un plat pour modifier son nom, son prix, sa photo, sa description, ses offres ou ses variantes, puis enregistrez. Les changements sont en ligne instantanément.",
    faq4Question: "Comment mettre à jour mes plats instantanément ?",
    faq4Answer:
      "Rendez-vous dans la section Menu de votre tableau de bord. Toutes les catégories et tous les plats y sont listés : cliquez sur l'un d'eux pour modifier le nom, le prix, la photo ou la description, puis enregistrez pour une mise à jour immédiate.",
    faq5Question: "Comment réorganiser les plats ou les catégories ?",
    faq5Answer:
      "Ouvrez la section Menu et cliquez sur Priorité. Faites glisser les éléments ou saisissez un ordre de priorité pour les catégories et les plats, puis enregistrez : le nouvel ordre apparaît aussitôt en ligne.",
    faq6Question:
      "Comment ajouter des offres ou des suggestions du jour à ma carte ?",
    faq6Answer:
      "Pour les Spécialités / Best-sellers : dans la section Menu, activez l'option sur le plat concerné, il s'affichera en tête sous le label À ne pas manquer. Pour des offres sur mesure : allez dans la section Offres, créez des promotions sur un ou plusieurs plats, elles s'activent instantanément.",
    faq7Question:
      "Difficile de changer les bannières ou les photos sans aide technique ?",
    faq7Answer:
      "Allez dans Paramètres → Paramètres généraux pour importer ou changer la bannière de votre restaurant. Pour les plats, modifiez les images directement dans la section Menu : un simple glisser-déposer, en ligne immédiatement.",
    faq8Question:
      "Puis-je prévisualiser ou programmer facilement des changements, comme les suggestions du jour ?",
    faq8Answer:
      "Oui : prévisualisez chaque modification via Voir le menu avant d'enregistrer. Pour la programmation, utilisez la section Offres afin de planifier des mises à jour (les suggestions du jour, par exemple) et tout automatiser sans vous connecter chaque jour.",
    faq9Question:
      "Puis-je fermer la boutique en dehors des heures de service ?",
    faq9Answer:
      "Oui. Allez dans Paramètres et désactivez votre restaurant à tout moment : idéal pour les heures de fermeture, les congés ou la maintenance. Réactivez-le dès que vous êtes prêt.",
    faq10Question: "Globalement, est-ce simple de modifier les plats ?",
    faq10Answer:
      "Extrêmement : quelques secondes par modification. Prix, noms, photos, disponibilité ou offres se changent via des interrupteurs et des menus déroulants intuitifs dans la section Menu, sans code ni graphiste.",
    faq11Question: "Puis-je résilier mon abonnement à tout moment ?",
    faq11Answer:
      "Oui : résiliez quand vous voulez depuis votre compte. Votre offre reste active jusqu'à la fin de la période de facturation en cours, sans prélèvement supplémentaire sauf renouvellement.",
  },
  landing: {
    socialProofEyebrow: "Chiffres réels des 30 derniers jours",
    statOrdersLabel: "Commandes reçues",
    statRevenueLabel: "Chiffre d'affaires généré",
    statAvgOrderValueLabel: "Panier moyen",
    statSuffixLakh: "L+",
    statSuffixThousand: "K+",
    platformHeadingLead: "Tout ce dont votre restaurant a besoin,",
    platformHeadingAccent: "sur une seule plateforme.",
    featureWebsiteAppTitle: "Votre site et votre application à votre marque",
    featureWebsiteAppBody:
      "Lancez un site de commande et votre propre application sur l'App Store et le Play Store, entièrement à votre nom. Vos clients commandent directement chez vous : plus d'intermédiaire, plus de commissions de 20 à 33%. Ils parcourent la carte, commandent, suivent la livraison et recommandent en un geste, pendant que vous gardez la relation client, maîtrisez vos prix et conservez chaque euro de marge.",
    featureWebsiteAppCta: "Voir comment ça marche",
    featureWhatsappOrderingTitle: "Commander sur WhatsApp — un simple « Hi »",
    featureWhatsappOrderingBody:
      "Faites de votre numéro WhatsApp votre canal de commande le plus simple. Le client envoie « Hi » et reçoit aussitôt un lien de connexion automatique vers votre carte : aucune application à télécharger, aucune inscription, aucun code OTP. Il commande en quelques gestes et reçoit le suivi de sa commande sur WhatsApp, pendant que vous gardez le client et ne payez aucune commission.",
    featureWhatsappOrderingCta: "Voir la commande WhatsApp",
    featurePetpoojaTitle: "Intégration POS Petpooja",
    featurePetpoojaBody:
      "Chaque commande en ligne arrive directement dans votre POS Petpooja, en temps réel. Aucune saisie manuelle, aucune commande oubliée, aucun double traitement. Plats, prix et catégories se synchronisent automatiquement entre votre POS et votre site de livraison. La seule plateforme en Inde à intégrer Petpooja en profondeur.",
    featurePetpoojaCta: "En savoir plus sur l'intégration Petpooja",
    featurePaymentsTitle: "Intégration des paiements",
    featurePaymentsBody:
      "Encaissez immédiatement : UPI, cartes, virement et portefeuilles intégrés, plus le paiement à la livraison. Un tunnel de paiement sécurisé et conforme PCI, propulsé par Cashfree, avec des fonds versés directement sur votre compte bancaire. Aucun agrégateur ne retient votre argent, aucun délai de versement. Chaque euro vous revient.",
    featurePaymentsCta: "Voir les moyens de paiement",
    featureOrderManagementTitle: "Gestion des commandes en temps réel",
    featureOrderManagementBody:
      "Acceptez, suivez et gérez les commandes de livraison depuis un seul tableau de bord. Notifications instantanées à chaque nouvelle commande, statut mis à jour en temps réel, cuisine et livreurs toujours synchronisés. Fini les tablettes qui s'empilent et les commandes perdues au coup de feu.",
    featureOrderManagementCta: "Découvrir la gestion des commandes",
    featureDigitalMenuTitle: "Gestion du menu digital",
    featureDigitalMenuBody:
      "Pilotez toute votre carte depuis un seul tableau de bord : ajoutez ou modifiez plats, prix, catégories, photos et variantes en temps réel. Basculez un plat en rupture d'un geste, définissez des filtres alimentaires et une recherche intelligente, et gardez tout synchronisé entre votre site, votre application et vos QR codes. Aucune réimpression, aucun développeur : c'est en ligne dès l'enregistrement.",
    featureDigitalMenuCta: "En savoir plus sur le menu digital",
    featureOffersTitle: "Offres et promotions dynamiques",
    featureOffersBody:
      "Lancez des ventes flash, des happy hours ou des remises programmées qui s'activent et expirent toutes seules. Mettez vos best-sellers en avant avec les badges À ne pas manquer et Choix du chef. Faites revenir vos clients et augmentez votre chiffre sans imprimer un seul flyer.",
    featureOffersCta: "Voir comment fonctionnent les offres",
    featureGoogleSyncTitle: "Sync de la carte sur Google Business",
    featureGoogleSyncBody:
      "Synchronisez automatiquement toute votre carte — catégories, plats, prix et photos — vers votre fiche Google Business, en un clic. Apparaissez sur Google Maps avec une carte complète. Les restaurants dont la fiche est complète obtiennent 7 fois plus de clics et 30% de fréquentation en plus.",
    featureGoogleSyncCta: "Voir comment fonctionne la sync Google",
    featureDeliveryAppTitle: "Application livreur",
    featureDeliveryAppBody:
      "Une application dédiée à votre équipe de livraison. Vos livreurs reçoivent les notifications de commande, se guident jusqu'au client et mettent à jour le statut de livraison, le tout en temps réel. Suivez les positions en direct, attribuez les courses automatiquement et livrez plus vite, avec une visibilité totale.",
    featureDeliveryAppCta: "En savoir plus sur l'application livreur",
    featureAnalyticsTitle: "Analyses et statistiques",
    featureAnalyticsBody:
      "Suivez le volume de commandes, l'évolution du chiffre d'affaires, les heures de pointe et les plats les plus vendus. Pilotez vos prix, vos promotions et vos livraisons avec des données concrètes. Vous savez exactement ce qui fonctionne et ce qu'il faut optimiser.",
    featureAnalyticsCta: "En savoir plus sur les analyses",
    ctaBannerHeadingDefault:
      "Lancez votre site de livraison en moins de 2 minutes.",
    ctaBannerBodyDefault:
      "Importez votre carte, définissez vos zones de livraison et commencez à recevoir des commandes directement de vos clients, avec l'intégration POS Petpooja complète. Rejoignez les 600+ restaurants qui grandissent déjà avec Menuthere.",
    ctaBannerPrimaryButton: "Commencer gratuitement",
    ctaBannerSecondaryButton: "Voir toutes les offres",
    faqHeadingLead: "Questions",
    faqHeadingAccent: "fréquentes.",
    faqVsAggregatorsQuestion:
      "En quoi Menuthere est-il différent de Zomato ou Swiggy ?",
    faqVsAggregatorsAnswer:
      "Les agrégateurs comme Zomato et Swiggy prélèvent 20 à 33% de commission sur chaque commande. Menuthere vous donne votre propre site de livraison à votre marque, où les clients commandent directement chez vous, avec seulement 1% de commission. Vous détenez les données clients, maîtrisez vos prix et construisez la fidélité à votre nom.",
    faqPetpoojaIntegrationQuestion:
      "Comment fonctionne l'intégration POS Petpooja ?",
    faqPetpoojaIntegrationAnswer:
      "Une fois connecté, votre menu Petpooja se synchronise automatiquement avec votre site de livraison Menuthere. Chaque commande en ligne est envoyée directement à votre POS, en temps réel. Aucune saisie manuelle, aucune commande oubliée. Plats, prix et catégories restent alignés entre les deux systèmes.",
    faqDeliveryZonesQuestion:
      "Comment configurer mes zones et mes frais de livraison ?",
    faqDeliveryZonesAnswer:
      "Depuis votre tableau de bord, ouvrez les Paramètres de livraison. Définissez vos zones par rayon ou par code postal, fixez des frais par zone et paramétrez un montant minimum de commande. Vous pouvez aussi activer ou désactiver la livraison sur certaines zones à tout moment.",
    faqPickupOrdersQuestion:
      "Les clients peuvent-ils commander à emporter comme en livraison ?",
    faqPickupOrdersAnswer:
      "Oui, votre site gère la livraison et la vente à emporter. Le client choisit au moment du paiement. Vous pouvez activer ou désactiver l'une ou l'autre option depuis les paramètres de votre tableau de bord.",
    faqRushHourOrdersQuestion:
      "Comment gérer les commandes qui arrivent pendant le coup de feu ?",
    faqRushHourOrdersAnswer:
      "Toutes les commandes s'affichent en temps réel dans votre tableau de bord, avec des notifications instantanées. Vous les acceptez, les préparez et mettez à jour leur statut depuis un seul écran. Elles sont aussi transmises à votre POS Petpooja s'il est connecté, pour que la cuisine reste dans la boucle.",
    faqTechnicalSkillsQuestion:
      "Faut-il des compétences techniques pour se lancer ?",
    faqTechnicalSkillsAnswer:
      "Pas du tout. Importez votre carte (ou synchronisez-la depuis Petpooja), personnalisez votre identité visuelle, et votre site de livraison est en ligne en quelques minutes. Sans code, sans graphiste, sans application à télécharger.",
    faqOffersDiscountsQuestion:
      "Puis-je proposer des offres et des remises sur mon site de livraison ?",
    faqOffersDiscountsAnswer:
      "Oui ! Lancez des ventes flash, des codes promo, des remises première commande ou des offres programmées qui s'activent et expirent automatiquement. Mettez vos best-sellers en avant avec le badge À ne pas manquer pour augmenter le panier moyen.",
    faqCustomerDiscoveryQuestion:
      "Comment mes clients trouvent-ils mon site de livraison ?",
    faqCustomerDiscoveryAnswer:
      "Partagez le lien de votre site sur les réseaux sociaux, WhatsApp, votre fiche Google Business et via des QR codes en salle. Menuthere synchronise aussi votre carte sur Google Maps pour que les clients vous découvrent naturellement. Votre site est optimisé pour le référencement dès le départ.",
    faqPauseOrderingQuestion:
      "Puis-je désactiver les commandes en dehors des heures de service ?",
    faqPauseOrderingAnswer:
      "Oui. Allez dans Paramètres et désactivez votre restaurant à tout moment : idéal pour les heures de fermeture, les jours fériés ou la maintenance. Réactivez-le quand vous voulez. Vous pouvez aussi programmer des horaires d'ouverture et de fermeture automatiques.",
    faqCancelSubscriptionQuestion:
      "Puis-je résilier mon abonnement à tout moment ?",
    faqCancelSubscriptionAnswer:
      "Oui, résiliez quand vous voulez depuis votre compte. Votre offre reste active jusqu'à la fin de la période de facturation en cours, sans prélèvement supplémentaire sauf renouvellement.",
    reviewExpandButton: "Voir plus",
    reviewCollapseButton: "Voir moins",
    reviewOneAuthorName: "Hotel Colombo",
    reviewOneAuthorLocation: "MG Road, Edappally",
    reviewOneAuthorInitials: "HC",
    reviewOneParagraphOne:
      "Franchement, je n'aurais jamais cru que créer une application serait aussi simple 😅 ils ont tout géré sans accroc et nous ont rendu le processus très facile.",
    reviewOneParagraphTwo:
      "Et ils l'ont faite exactement comme je la voulais. J'étais très exigeant sur certains points et je ne voulais rien lâcher — on a fait plusieurs allers-retours, mais ils sont restés patients et calmes du début à la fin, et le résultat est exactement celui que j'espérais.",
    reviewOneParagraphThree:
      "Du travail très propre, un grand merci à toute l'équipe.",
    reviewTwoAuthorName: "Rimaal Mandi & Grills",
    reviewTwoAuthorLocation: "Pune",
    reviewTwoAuthorInitials: "RM",
    reviewTwoParagraphOne:
      "Merci à l'équipe MenuThere d'avoir développé notre application. Elle permet à nos clients de commander directement chez nous et simplifie beaucoup la gestion des livraisons. Nous avons aussi proposé des options de livraison tierces comme Porter, que l'équipe a intégrées avec succès. Tout fonctionne parfaitement, ils ont fait un excellent travail.",
    reviewTwoParagraphTwo:
      "La raison principale du lancement de cette application, c'est que des plateformes comme Zomato et Swiggy nous apportent du volume et de la visibilité, mais que les reversements peuvent être compliqués à cause des commissions et des autres frais. Bien sûr, nous ne pouvons pas nous passer de Zomato et Swiggy, beaucoup de clients ont l'habitude de commander là-bas, et nous continuerons à travailler avec eux.",
    reviewTwoParagraphThree:
      "En parallèle, cette application nous offre un canal supplémentaire pour rester en lien direct avec nos clients et mieux les servir.",
    reviewTwoParagraphFour:
      "Merci à l'équipe MenuThere pour son accompagnement et son excellent travail.",
  },
  footerLinks: {
    brandBlurb:
      "La plateforme tout-en-un de commande en ligne et de livraison pour les restaurants. Lancez votre propre site, évitez les commissions des agrégateurs et développez votre activité.",
    solutionsGoogleBusinessSync: "Sync Google Business",
    solutionsOwners: "Restaurateurs",
    solutionsAgencies: "Agences",
    solutionsPetpoojaIntegration: "Intégration PetPooja",
    solutionsRestaurants: "Restaurants",
    solutionsCafes: "Cafés",
    resourcesHelpCenter: "Centre d'aide",
    resourcesDownloadApp: "Télécharger l'app",
    resourcesGetStarted: "Commencer",
    legalPrivacyPolicy: "Politique de confidentialité",
    legalTermsOfService: "Conditions d'utilisation",
    legalRefundPolicy: "Politique de remboursement",
    copyright: "© 2026 Menuthere.",
  },
  solutionsRest: {
    shared: {
      breadcrumbHome: "Accueil",
      breadcrumbSolutions: "Solutions",
      bookDemoCta: "Réserver une démo",
      stepLabel: "Étape {step}",
      faqHeading: "Questions fréquentes.",
      zeroPercentValue: "0%",
    },
    googleBusiness: {
      metaTitle: "Synchroniser sa carte avec Google Business | Menuthere",
      metaDescription:
        "Synchronisez la carte de votre restaurant avec Google Business Profile : un clic, mises à jour en temps réel, meilleur SEO local. 600+ restaurants.",
      ogDescription:
        "Synchronisez automatiquement la carte de votre restaurant sur Google Maps. Toujours à jour, zéro effort manuel.",
      breadcrumbCurrent: "Sync du menu Google Business Profile",
      heroBadge: "Intégration Google Business",
      heroTitle: "Synchronisez votre carte sur Google Maps, automatiquement",
      heroSubtitle:
        "Gardez le menu de votre fiche Google Business toujours à jour. Une synchronisation en un clic depuis Menuthere : votre carte sur Google Search et Maps, juste à chaque fois.",
      heroPrimaryCta: "Synchroniser ma carte",
      mockupCardTitle: "Google Business Profile",
      mockupCardSubtitle: "Gestionnaire de synchronisation",
      mockupSyncStatusTitle: "Carte synchronisée avec succès",
      mockupSyncStatusMeta: "Dernière sync : à l'instant",
      mockupStatItemsLabel: "Plats synchronisés",
      mockupStatCategoriesLabel: "Catégories",
      mockupStatImagesLabel: "Avec photo",
      mockupRecentlySyncedLabel: "Synchronisés récemment",
      mockupItem1Name: "Butter Chicken",
      mockupItem1Category: "Plat principal",
      mockupItem2Name: "Paneer Tikka",
      mockupItem2Category: "Entrées",
      mockupItem3Name: "Gulab Jamun",
      mockupItem3Category: "Desserts",
      mockupBadgeTitle: "Vues de la fiche",
      mockupBadgeValue: "+340% ce mois-ci",
      statSyncingValue: "500+",
      statSyncingLabel: "Restaurants synchronisés",
      statClicksValue: "7x",
      statClicksLabel: "Plus de clics sur la fiche",
      statSyncTimeValue: "< 30 s",
      statSyncTimeLabel: "Temps de synchronisation",
      statFootfallValue: "30%",
      statFootfallLabel: "De fréquentation en plus",
      howItWorksBadge: "3 étapes, c'est tout",
      howItWorksHeading: "Comment ça marche",
      howItWorksSubheading:
        "De votre tableau de bord à Google Maps en trois étapes simples",
      step1Title: "Créez votre carte",
      step1Body:
        "Construisez votre carte sur la plateforme : catégories, plats, prix et photos. Quelques minutes suffisent.",
      step2Title: "Connectez votre fiche Google",
      step2Body:
        "Reliez votre fiche Google Business en un clic. Nous gérons tout l'OAuth et la configuration de l'API pour vous.",
      step3Title: "Synchronisez et publiez",
      step3Body:
        "Lancez la synchronisation et toute votre carte apparaît sur Google Maps. Modifiez quand vous voulez : les changements sont répercutés instantanément.",
      benefitsHeading: "Pourquoi les restaurants adorent la sync Google",
      benefitsSubheading:
        "Votre carte est votre meilleur outil marketing : faites en sorte qu'elle s'affiche là où vos clients cherchent",
      benefit1Title: "Boostez votre SEO local",
      benefit1Body:
        "Les restaurants dont la fiche Google Business est complète reçoivent 7 fois plus de clics. Une carte synchronisée est l'un des signaux de classement local les plus forts : elle vous fait remonter sur les recherches « restaurant près de moi ».",
      benefit2Title: "Apparaissez sur Google Maps",
      benefit2Body:
        "Quand un client cherche où manger sur Google Maps, votre carte complète est là : prix, catégories et plats. Il peut décider de venir sans même vous appeler.",
      benefit3Title: "Toujours à jour",
      benefit3Body:
        "Un prix modifié ? Un nouveau plat ? Une suggestion de saison retirée ? Une synchronisation et le menu de votre fiche Google reflète la dernière version. Aucune retouche manuelle sur Google.",
      benefit4Title: "Des heures gagnées chaque semaine",
      benefit4Body:
        "Mettre à jour son menu Google à la main est fastidieux et source d'erreurs. Notre synchronisation le fait en quelques secondes, pas en quelques heures. Concentrez-vous sur la cuisine, pas sur le copier-coller.",
      benefit5Title: "Attirez plus de monde",
      benefit5Body:
        "Un client qui voit une carte détaillée sur Google a 30% de chances de plus de venir. Donnez-lui les informations dont il a besoin pour vous choisir plutôt qu'un concurrent.",
      benefit6Title: "Fiable et exact",
      benefit6Body:
        "Fini les écarts de prix entre votre vraie carte et ce qu'affiche Google. Plus de réclamations clients à cause d'informations périmées sur Maps.",
      comparisonHeading: "Sans sync vs. avec Menuthere",
      comparisonSubheading:
        "Voyez la différence que fait une synchronisation automatique de la carte",
      comparisonWithoutBadge: "✕ Sans sync",
      comparisonWithout1: "Ajouter chaque plat sur Google, un par un",
      comparisonWithout2: "Le menu sur Google est périmé en quelques jours",
      comparisonWithout3:
        "Des prix qui ne correspondent pas et des clients mécontents",
      comparisonWithout4: "Des heures de saisie tous les mois",
      comparisonWithout5: "Aucune photo, juste du texte brut",
      comparisonWithout6:
        "Des informations incohérentes d'une plateforme à l'autre",
      comparisonWithBadge: "✓ Avec Menuthere",
      comparisonWith1: "Un clic et toute votre carte part sur Google",
      comparisonWith2:
        "Le menu Google correspond toujours à votre carte du jour",
      comparisonWith3: "Des prix justes qui inspirent confiance",
      comparisonWith4: "Quelques secondes de sync, pas des heures de saisie",
      comparisonWith5: "Photos prises en charge pour un rendu attractif",
      comparisonWith6: "Une carte unifiée sur le site, les QR codes et Google",
      featuresHeading: "Tout ce que comprend la sync du menu Google",
      featuresSubheading:
        "Une boîte à outils complète pour garder une présence Google exacte et attractive.",
      feature1:
        "Synchronisation complète de la carte en un clic vers Google Business Profile",
      feature2:
        "Mise en correspondance et structuration automatiques des catégories",
      feature3: "Import des photos pour chaque plat",
      feature4: "Synchronisation des prix et de la disponibilité",
      feature5: "Gestion multi-établissements pour les chaînes",
      feature6: "Historique et suivi des synchronisations",
      feature7: "Compatible avec n'importe quel compte Google Business",
      feature8: "Aucune compétence technique requise",
      feature9: "Prise en charge des mentions végétarien / non végétarien",
      feature10: "Gère les caractères spéciaux et les cartes multilingues",
      ctaBoxHeading: "Prêt à synchroniser votre carte ?",
      ctaBoxBody:
        "Rejoignez les centaines de restaurants qui utilisent déjà Menuthere pour garder leur présence Google à jour. La configuration prend moins de 5 minutes.",
      ctaBoxButton: "Essai gratuit",
      comingSoonBadge: "Bientôt disponible",
      comingSoonHeading: "L'avenir de votre présence sur Google",
      comingSoonBody:
        "Nous préparons de nouvelles fonctionnalités pour gérer toute votre fiche Google Business, bien au-delà du menu.",
      autoPostTitle: "Publication automatique sur Google",
      autoPostBody:
        "Publiez automatiquement posts, offres, événements et actualités directement sur votre fiche Google Business. Annoncez le plat du jour, une nouveauté ou une offre de fête, sans jamais vous connecter à Google.",
      autoPostPoint1: "Programmez des posts avec photos et boutons d'action",
      autoPostPoint2: "Mettez en avant plats du jour et offres de saison",
      autoPostPoint3: "Annonces d'événements publiées automatiquement",
      autoPostPoint4: "Statistiques et suivi de l'engagement des posts",
      reviewRepliesTitle: "Réponses aux avis par IA",
      reviewRepliesBody:
        "Laissez l'IA rédiger des réponses personnalisées et pertinentes à chaque avis Google, positif comme négatif. Répondez plus vite, protégez votre réputation et montrez à vos clients que vous êtes là, 24h/24.",
      reviewRepliesPoint1:
        "Des réponses professionnelles et chaleureuses générées par l'IA",
      reviewRepliesPoint2: "Gère les avis positifs comme les négatifs",
      reviewRepliesPoint3: "S'adapte au ton et à la voix de votre restaurant",
      reviewRepliesPoint4:
        "Validation ou modification en un clic avant publication",
      testimonialQuote:
        "« Nous passions un après-midi entier chaque mois à mettre à jour notre carte sur Google. Avec Menuthere, j'appuie sur un bouton et tout se synchronise : plats, prix, et même les photos. Notre fiche Google Maps a l'air professionnelle, et nous voyons nettement plus de clients pousser la porte en disant avoir vu notre carte en ligne. »",
      testimonialAuthor: "Arjun & Priya Nair",
      testimonialRole: "Propriétaires, Spice Route Kitchen",
      testimonialLocation: "Kochi, Kerala",
      faqSubheading:
        "Tout ce qu'il faut savoir sur la synchronisation du menu Google Business Profile",
      faq1Question: "Qu'est-ce que la sync du menu Google Business Profile ?",
      faq1Answer:
        "C'est une fonctionnalité qui copie automatiquement la carte de votre restaurant depuis notre plateforme vers votre fiche Google Business (celle qui apparaît sur Google Search et Google Maps). Au lieu d'ajouter chaque plat à la main sur Google, vous synchronisez tout en un clic.",
      faq2Question: "Faut-il une fiche Google Business pour l'utiliser ?",
      faq2Answer:
        "Oui, il vous faut une fiche Google Business vérifiée pour votre restaurant. Si vous n'en avez pas encore, créez-la gratuitement sur business.google.com. Une fois vérifiée, connectez-la à notre plateforme et lancez la synchronisation.",
      faq3Question: "À quelle fréquence faut-il synchroniser ma carte ?",
      faq3Answer:
        "Nous recommandons de synchroniser dès que vous modifiez votre carte : nouveaux plats, changement de prix ou nouveautés de saison. La synchronisation ne prend que quelques secondes, autant rester à jour. Certains restaurants synchronisent tous les jours, d'autres chaque semaine.",
      faq4Question: "La synchronisation écrase-t-elle mon menu Google existant ?",
      faq4Answer:
        "Oui, chaque synchronisation remplace le menu de votre fiche Google Business par la dernière version issue de notre plateforme. C'est ce qui garantit une exactitude totale. Le reste de votre fiche Google Business (photos, avis, horaires) n'est pas affecté.",
      faq5Question: "Est-ce que cela fonctionne pour plusieurs établissements ?",
      faq5Answer:
        "Oui ! Si vous gérez plusieurs établissements sous un même compte Google Business, vous choisissez celui à synchroniser. Chaque établissement peut avoir sa propre carte. Idéal pour les chaînes dont le menu varie d'un point de vente à l'autre.",
      faq6Question: "Mes données Google sont-elles en sécurité ?",
      faq6Answer:
        "Absolument. Nous utilisons l'OAuth 2.0 officiel de Google et l'API Business Profile, en demandant uniquement les autorisations nécessaires à la gestion de votre menu. Vos identifiants ne sont jamais stockés : l'authentification repose sur des jetons sécurisés.",
      faq7Question:
        "Que deviennent les photos des plats pendant la synchronisation ?",
      faq7Answer:
        "Les photos de vos plats sont envoyées à Google en même temps que les données de la carte. Les images trop lourdes sont automatiquement optimisées selon les exigences de Google. Si une photo échoue, le plat est quand même synchronisé, simplement sans image.",
      faq8Question: "Cette fonctionnalité est-elle incluse dans toutes les offres ?",
      faq8Answer:
        "La synchronisation du menu Google Business Profile est disponible sur nos offres Pro et Business. Consultez notre page tarifs pour voir ce que comprend chaque offre.",
    },
    petpooja: {
      metaTitle: "Fini les 30% de commission : la commande directe | Menuthere",
      metaDescription:
        "Les plateformes de livraison prennent 20 à 30% par commande. Menuthere : votre appli de commande à 0% de commission, vos données clients, POS PetPooja.",
      ogTitle: "Fini les 30% de commission | La commande directe pour restaurants",
      ogDescription:
        "Pourquoi verser 20 à 30% aux autres plateformes de livraison ? Obtenez votre propre site de commande avec 0% de commission. Intégration POS PetPooja, données clients complètes et contrôle total.",
      breadcrumbCurrent: "Commande directe & intégration PetPooja",
      heroTitle:
        "Arrêtez de verser 30% de commission aux plateformes de livraison tierces",
      heroSubtitle:
        "Votre propre site de commande, la pleine propriété de vos clients et l'intégration POS PetPooja",
      heroPrimaryCta: "Vendre en direct",
      statCommissionLabel: "De commission par commande",
      value35Percent: "35%",
      statQuitLabel: "Des restaurants veulent quitter les agrégateurs",
      statFeeValue: "45%",
      statFeeLabel: "Coût réel des agrégateurs",
      statDataValue: "100%",
      statDataLabel: "Des données clients vous appartiennent",
      introParagraph1:
        "Les agrégateurs prélèvent 20 à 33% de commission, plus des frais cachés, sur chaque commande. Sur une commande de 500 Rs, vous perdez jusqu'à 225 Rs. Ce n'est pas un partenariat, c'est un impôt sur votre travail. Les enquêtes de la CCI ont conclu que les grandes plateformes de livraison enfreignaient le droit de la concurrence.",
      introParagraph2:
        "Menuthere vous donne votre propre site de commande à votre marque, avec seulement 1% de commission et la pleine propriété de vos données clients. Couplé à l'intégration POS PetPooja, les commandes arrivent directement en cuisine : pas d'intermédiaire, pas de partage de revenus, pas de perte de contrôle.",
      problemsHeading:
        "Ce que les autres plateformes de livraison font à votre restaurant.",
      problemsSubheading:
        "Les enquêtes de la CCI ont conclu que les deux plateformes enfreignaient le droit de la concurrence. Voici ce qu'elles font à votre activité.",
      problem1Title: "20 à 33% de commission par commande",
      problem1Body:
        "Les plateformes de livraison tierces ont récemment relevé leurs commissions jusqu'à 33%. Sur une commande de 500 Rs, vous perdez 100 à 165 Rs avant toute autre retenue. Votre coût matière, votre loyer et vos salaires sortent de ce qu'il reste.",
      problem2Title: "Des frais cachés qui montent à 45%",
      problem2Body:
        "TVA sur la commission (18%), frais de paiement (2 à 3%), majoration sur l'emballage (2 à 5 Rs par commande) et partage forcé des remises. Une commande de 500 Rs peut vous coûter 212 à 227 Rs de frais de plateforme, soit 42 à 45% envolés.",
      problem3Title: "Vos données clients leur appartiennent",
      problem3Body:
        "Vous servez des milliers de clients sans avoir la moindre relation directe avec eux. Les plateformes masquent activement leurs coordonnées : noms, numéros de téléphone, historique de commandes. Impossible de fidéliser ou de lancer des promotions ciblées.",
      problem4Title: "Une visibilité qui se paie",
      problem4Body:
        "Les 10 premiers résultats de recherche sur les autres plateformes de livraison sont presque toujours des emplacements payants. Sans budget publicitaire, votre restaurant disparaît. La commission réelle grimpe alors à 25-40%.",
      problem5Title: "Aucune liberté tarifaire",
      problem5Body:
        "Les plateformes de livraison tierces imposent des restrictions de prix, assorties de pénalités en cas de non-respect, et menacent de déclasser votre référencement si vous proposez des prix plus bas ailleurs. Vous ne maîtrisez même plus votre propre stratégie tarifaire.",
      problem6Title: "Les plateformes vous concurrencent désormais",
      problem6Body:
        "Les plateformes de livraison tierces lancent leurs propres marques de restauration et leurs applications de quick-commerce. Elles utilisent VOS données clients pour bâtir des produits concurrents. La NRAI parle d'« abus de position ».",
      commissionHeading: "Le vrai coût d'une commande de 500 Rs.",
      commissionSubheading:
        "Voyez exactement où part votre argent chez les agrégateurs, et en commande directe.",
      commissionColCharge: "Type de frais",
      commissionColPlatforms: "Plateformes de livraison",
      commissionRow1Label: "Commission de base",
      commissionRow1Aggregator: "18-33%",
      commissionRow2Label: "TVA",
      commissionRow2Aggregator: "~3-5%",
      commissionRow3Label: "Passerelle de paiement",
      commissionRow3Aggregator: "2-3%",
      commissionRow3Menuthere: "2%",
      commissionRow4Label: "Remises imposées",
      commissionRow4Aggregator: "5-15%",
      commissionRow4Menuthere: "Vous décidez",
      commissionRow5Label: "Majoration sur l'emballage",
      commissionRow5Aggregator: "2-5 Rs/commande",
      commissionRow6Label: "Mise en avant payante",
      commissionRow6Aggregator: "5-10% en plus",
      commissionRow6Menuthere: "Visibilité gratuite",
      commissionTotalLabel: "Perte réelle totale",
      commissionTotalAggregator: "212-227 Rs (42-45%)",
      commissionTotalMenuthere: "~3%",
      commissionFootnote:
        "* D'après les données sectorielles des rapports NRAI, Menuviel et Billboox (2025-2026)",
      solutionHeading: "Reprenez le contrôle de votre restaurant.",
      solutionSubheading:
        "Votre propre site de commande. 1% de commission seulement. Vos données clients. L'intégration POS PetPooja.",
      solution1Title: "0% de commission sur les commandes",
      solution1Body:
        "Avec 0% de commission, presque chaque roupie payée par votre client vous revient. Aucun frais caché, aucun partage de revenus. Vos marges restent intactes, comme il se doit.",
      solution2Title: "100% de vos données clients",
      solution2Body:
        "Chaque commande vous donne le nom du client, son numéro, son historique et ses préférences. Créez des programmes de fidélité, envoyez des offres ciblées et nouez de vraies relations avec vos clients.",
      solution3Title: "Votre site de commande, à votre marque",
      solution3Body:
        "Un site de commande professionnel aux couleurs, au logo et au domaine de votre restaurant. Vos clients commandent directement chez vous : c'est votre marque qui grandit, pas celle d'un agrégateur.",
      solution4Title: "Analyses et statistiques complètes",
      solution4Body:
        "Suivez chaque commande, les heures de pointe, les plats populaires, le comportement de vos clients et l'évolution du chiffre d'affaires. Décidez de votre carte, de vos prix et de vos promotions sur la base de données réelles.",
      solution5Title: "Construisez une vraie fidélité",
      solution5Body:
        "Lancez vos propres offres, remises et récompenses de fidélité sans partager vos marges. Envoyez des notifications WhatsApp, des vœux de fête et des promotions personnalisées directement à vos clients.",
      solution6Title: "Intégration POS PetPooja",
      solution6Body:
        "Synchronisez sans effort les commandes de votre site Menuthere vers votre POS PetPooja. Aucune saisie manuelle, aucune commande oubliée. Votre cuisine les reçoit immédiatement, comme depuis n'importe quel autre canal.",
      realNumbersHeading: "Dépendance aux agrégateurs vs. commande directe.",
      realNumbersSubheading:
        "La comparaison que les plateformes préfèrent vous cacher.",
      realNumbersColAggregators: "Agrégateurs",
      realNumbersRow1Metric: "Commission par commande",
      realNumbersRow1Aggregator: "18-33% + frais (35-45% en réel)",
      realNumbersRow1Direct: "0% seulement",
      realNumbersRow2Metric: "Propriété des données clients",
      realNumbersRow2Aggregator: "La plateforme possède tout",
      realNumbersRow2Direct: "Vous possédez 100%",
      realNumbersRow3Metric: "Maîtrise des prix",
      realNumbersRow3Aggregator: "Restreinte, avec pénalités",
      realNumbersRow3Direct: "Liberté totale",
      realNumbersRow4Metric: "Construction de la marque",
      realNumbersRow4Aggregator: "La fidélité va à la plateforme",
      realNumbersRow4Direct: "La fidélité va à VOTRE restaurant",
      realNumbersRow5Metric: "Marge sur la livraison",
      realNumbersRow5Aggregator: "Souvent sous les 10%",
      realNumbersRow5Direct: "25-35% et plus, atteignables",
      realNumbersRow6Metric: "Maîtrise du marketing",
      realNumbersRow6Aggregator: "Payer pour exister, 250 à 4 000 Rs et plus",
      realNumbersRow6Direct: "Contrôle total, vos propres campagnes",
      realNumbersRow7Metric: "Maîtrise de la carte et des remises",
      realNumbersRow7Aggregator: "La plateforme peut imposer sans votre accord",
      realNumbersRow7Direct: "100% votre décision",
      transparencyHeading: "Bon à savoir — en toute transparence.",
      transparencySubheading:
        "Nous préférons être clairs. Voici ce que nous proposons, et ce que nous ne proposons pas.",
      deliveryTitle: "Nous ne fournissons pas de livreurs",
      deliveryBody:
        "Menuthere se concentre sur la meilleure plateforme de commande, la gestion des clients et l'intégration POS. Pour la livraison, plusieurs options s'offrent à vous :",
      deliveryPoint1: "Utiliser vos propres livreurs pour tout maîtriser",
      deliveryPoint2:
        "Passer par des services tiers comme Porter, Dunzo ou Shadowfax",
      deliveryPoint3:
        "Proposer uniquement la vente à emporter, beaucoup de clients la préfèrent",
      deliveryPoint4: "La commande QR en salle ne demande aucune livraison",
      deliveryNote:
        "Même une commande à emporter passée en direct est plus rentable qu'une commande livrée via un agrégateur à 30% de commission.",
      paymentTitle: "Intégration des paiements",
      paymentBadge: "1% seulement",
      paymentBody:
        "Passerelle de paiement intégrée à seulement 1% (frais de service client uniquement). Vos clients paient en ligne directement sur votre site de commande :",
      paymentPoint1: "Paiements UPI (Google Pay, PhonePe, Paytm)",
      paymentPoint2: "Cartes de crédit et de débit",
      paymentPoint3: "Portefeuilles électroniques",
      paymentPoint4: "Rapprochement automatique avec le POS PetPooja",
      paymentNote:
        "Vous pouvez aussi accepter le paiement à la livraison ou conserver votre solution de paiement actuelle.",
      factsHeading: "Les chiffres sont sans appel.",
      factsSubheading:
        "Données réelles issues d'enquêtes sectorielles, d'investigations de la CCI et de rapports de la NRAI.",
      fact1Text:
        "des restaurants indiens veulent quitter les autres plateformes de livraison (enquête de déc. 2025)",
      fact2Value: "60%",
      fact2Text:
        "des nouveaux restaurants ferment dès la première année, la dépendance aux plateformes y étant pour beaucoup",
      fact3Value: "400 Cr Rs",
      fact3Text:
        "extraits en plus chaque année par les plateformes via les majorations sur les frais d'emballage",
      fact4Value: "2 000+",
      fact4Text:
        "restaurants ont participé au boycott #Logout contre les plateformes agrégatrices",
      howItWorksHeading: "Passez en direct en 3 étapes simples.",
      howItWorksSubheading:
        "Mettez en place votre propre canal de commande en moins de 10 minutes.",
      step1Title: "Créez votre carte et votre site",
      step1Body:
        "Importez votre carte, personnalisez votre identité visuelle et mettez votre site de commande en ligne. Moins de 10 minutes.",
      step2Title: "Connectez votre POS PetPooja",
      step2Body:
        "Reliez votre POS PetPooja pour synchroniser les commandes automatiquement. Elles arrivent directement en cuisine, sans aucune saisie.",
      step3Title: "Partagez et vendez",
      step3Body:
        "Diffusez votre lien de commande sur WhatsApp, les réseaux sociaux et via des QR codes. Regardez les commandes directes arriver.",
      savingsHeading:
        "Chaque commande sur les autres plateformes vous coûte 100 à 225 Rs",
      savingsBody:
        "Avec 50 commandes livrées par jour, ce sont 5 000 à 11 250 Rs perdus chaque jour. Soit 150 000 à 330 000 Rs chaque mois. Votre propre site de commande est rentabilisé dès le premier jour.",
      savingsSecondaryCta: "Voir les tarifs",
      faqSubheading:
        "Tout ce qu'il faut savoir sur la commande directe avec Menuthere.",
      faq1Question:
        "Comment Menuthere m'aide-t-il à ne plus payer de commissions aux autres plateformes de livraison ?",
      faq1Answer:
        "Menuthere vous donne votre propre site de commande à votre marque, où vos clients commandent directement. Avec 0% de commission, vous conservez la quasi-totalité du chiffre d'affaires de vos commandes. Nous facturons un simple abonnement, pas 20 à 30% sur chaque commande.",
      faq2Question: "Menuthere fournit-il des livreurs ?",
      faq2Answer:
        "Non, Menuthere ne fournit pas de livreurs. Nous nous concentrons sur la meilleure plateforme de commande, la gestion des clients et l'intégration POS. Pour la livraison, vous pouvez utiliser votre propre équipe, passer par des services tiers comme Porter, Dunzo ou Shadowfax, ou ne proposer que la vente à emporter. Beaucoup de restaurants constatent qu'une commande à emporter passée en direct est plus rentable qu'une commande livrée via un agrégateur.",
      faq3Question: "Comment fonctionne l'intégration PetPooja ?",
      faq3Answer:
        "Les commandes passées sur votre site Menuthere sont automatiquement transmises à votre terminal POS PetPooja, en temps réel. Votre cuisine voit la commande immédiatement : aucune saisie, aucun copier-coller, aucune commande oubliée. Cela fonctionne exactement comme une commande venue de n'importe quel autre canal.",
      faq4Question: "Comment se passe l'encaissement des clients ?",
      faq4Answer:
        "Menuthere inclut une passerelle de paiement intégrée avec 0% de frais (frais de service client uniquement). Vos clients paient en ligne par UPI, carte ou portefeuille, directement sur votre site de commande. Vous pouvez aussi accepter le paiement à la livraison ou conserver votre solution actuelle.",
      faq5Question:
        "Faut-il quitter complètement les autres plateformes de livraison ?",
      faq5Answer:
        "Pas forcément. Beaucoup de restaurants utilisent les autres plateformes pour se faire découvrir par de nouveaux clients, tout en dirigeant les habitués vers leur propre site de commande, bien plus rentable. L'objectif est de réduire la dépendance, pas nécessairement de l'éliminer, et de faire en sorte qu'une plus grande part de vos revenus reste chez vous.",
      faq6Question: "Combien coûte Menuthere ?",
      faq6Answer:
        "Menuthere facture un simple abonnement mensuel, pas un pourcentage de vos commandes. Même sur nos offres payantes, vous économiserez bien plus que vous ne dépensez en évitant les commissions des agrégateurs. Consultez notre page tarifs pour voir les offres en cours.",
      faq7Question:
        "Est-il vrai que 35% des restaurants veulent quitter les agrégateurs ?",
      faq7Answer:
        "Oui. Une enquête sectorielle de décembre 2025 a montré que 35% des restaurants indiens souhaitent cesser d'utiliser les autres plateformes de livraison, invoquant des commissions élevées, un service client insuffisant, des marges trop faibles et l'absence d'accès aux données clients.",
      faq8Question:
        "Puis-je continuer à utiliser les autres plateformes de livraison en parallèle de Menuthere ?",
      faq8Answer:
        "Bien sûr. La plupart de nos restaurants partenaires font les deux. Ils gardent les autres plateformes pour acquérir de nouveaux clients tout en poussant activement les habitués vers leur site Menuthere, où les marges sont bien plus élevées. Avec le temps, la part des commandes directes augmente, car les clients préfèrent commander en direct.",
    },
    whatsappOrdering: {
      metaTitle: "Commande WhatsApp pour restaurants | Menuthere",
      metaDescription:
        "Faites de votre numéro WhatsApp un canal de commande : le client envoie « Hi », reçoit un lien auto-connecté et commande. Sans appli, zéro commission.",
      metaKeywords:
        "commande whatsapp, système de commande whatsapp pour restaurant, commander sur whatsapp, whatsapp business commande, carte whatsapp restaurant, envoyer hi pour commander, commande de repas whatsapp, commande conversationnelle, commande sans commission",
      ogTitle: "Commande WhatsApp — un simple « Hi » suffit | Menuthere",
      ogDescription:
        "Le canal de commande le plus fluide pour les restaurants. « Hi » → lien instantané → commande sur votre carte → suivi en direct sur WhatsApp. Sans appli, sans inscription, zéro commission.",
      structuredDataProductName: "Commande WhatsApp Menuthere",
      structuredDataProductDescription:
        "Système de commande WhatsApp pour restaurants. Le client envoie « Hi », reçoit un lien de connexion automatique, commande sur une carte web visuelle et reçoit le suivi de sa commande sur WhatsApp.",
      heroBadge: "Commande WhatsApp",
      heroBadgeNew: "NOUVEAU",
      heroTitle: "Vos clients commandent en envoyant simplement « Hi ».",
      heroSubtitle:
        "Faites de votre numéro WhatsApp votre canal de commande le plus simple. Un seul « Hi » donne à chaque client un lien instantané et auto-connecté vers votre carte : aucune application à installer, aucune inscription, aucun code OTP. Vous gardez le client et ne payez aucune commission.",
      primaryCta: "Commencer gratuitement",
      heroTrust1: "Aucune appli à télécharger",
      heroTrust2: "Aucune inscription ni OTP",
      heroTrust3: "0% de commission",
      stepsHeading: "Un « Hi ». C'est tout le tunnel.",
      stepsSubheading:
        "La première cause d'abandon de panier, c'est la friction : téléchargements, inscriptions, mots de passe. La commande WhatsApp les supprime tous. Quatre étapes, et le client ne quitte jamais un canal qu'il connaît déjà.",
      step1Title: "Le client envoie « Hi »",
      step1Body:
        "Depuis un sticker, un QR code sur la table, le lien de votre bio ou votre fiche Google, le client ouvre WhatsApp et envoie Hi à votre numéro. Aucune appli à télécharger, aucun formulaire à remplir.",
      step2Title: "Il reçoit aussitôt un lien Commander",
      step2Body:
        "Votre numéro répond en une seconde avec un bouton Commander. Le lien le connecte automatiquement : sans OTP, sans mot de passe, sans création de compte.",
      step3Title: "Il commande sur votre carte visuelle",
      step3Body:
        "Le lien ouvre votre carte web à votre marque, déjà connecté. Il parcourt les photos, remplit son panier, choisit UPI ou espèces et valide en quelques gestes.",
      step4Title: "Le suivi revient sur WhatsApp",
      step4Body:
        "Commande reçue, acceptée, plat prêt, en cours de livraison avec un lien de suivi en direct, livrée — et les points de fidélité. Chaque mise à jour arrive dans la conversation.",
      featuresHeading: "Conçu pour convertir, pas seulement pour discuter.",
      featuresSubheading:
        "Tout ce qu'il faut pour gérer la commande sur WhatsApp comme un pro, à votre marque et à vos conditions.",
      feature1Title: "Sans appli, sans inscription",
      feature1Body:
        "Fonctionne sur tout téléphone équipé de WhatsApp. L'envoi de « Hi » crée et reconnaît le client en silence : il ne rencontre jamais de mur de connexion.",
      feature2Title: "Votre propre numéro, à votre marque",
      feature2Body:
        "Connectez votre vrai numéro WhatsApp Business en quelques minutes via Meta, même celui que vous utilisez déjà. Ou lancez-vous immédiatement sur notre numéro partagé.",
      feature3Title: "Liens de commande sur votre domaine",
      feature3Body:
        "Les liens de commande peuvent tourner sur votre propre domaine (votremarque.com) plutôt que sur une URL tierce générique : chaque point de contact reste à votre marque.",
      feature4Title: "Mises à jour de statut automatiques",
      feature4Body:
        "Commande passée avec l'addition complète, acceptée, prête, expédiée avec un lien de suivi en direct, terminée, points de fidélité : tout part automatiquement.",
      feature5Title: "Liens sécurisés à usage unique",
      feature5Body:
        "Chaque lien est signé, expire en quelques minutes et se verrouille sur la première personne qui l'ouvre : un lien transféré ne peut jamais détourner une session connectée.",
      feature6Title: "Scénarios de messages sans code",
      feature6Body:
        "Vos messages d'accueil et de commande sont des scénarios modifiables, avec mots-clés déclencheurs, boutons et médias : changez le texte sans toucher au code.",
      feature7Title: "Boîte de réception WhatsApp unifiée",
      feature7Body:
        "Chaque message entrant et sortant est conservé et consultable dans votre tableau de bord : rien ne passe à la trappe au coup de feu.",
      feature8Title: "Statistiques par canal",
      feature8Body:
        "Les commandes passées sur WhatsApp sont taguées automatiquement. Comparez côte à côte le nombre de commandes et le chiffre d'affaires App, Site et WhatsApp.",
      frictionHeading: "Comptez les gestes. Vos clients le font.",
      frictionSubheading:
        "Chaque étape supplémentaire entre l'envie et la commande est un client perdu. Voici la même commande, de deux façons.",
      frictionAggregatorLabel: "Appli d'agrégateur",
      frictionAggregatorStep1: "Installer l'application",
      frictionAggregatorStep2: "S'inscrire + valider un OTP",
      frictionAggregatorStep3: "Chercher votre restaurant",
      frictionAggregatorStep4: "Commander (ils prennent 20 à 33%)",
      frictionAggregatorStep5: "Vous ne voyez jamais le client",
      frictionWhatsappLabel: "Commande WhatsApp",
      frictionWhatsappStep1: "Envoyer « Hi »",
      frictionWhatsappStep2: "Toucher Commander (déjà connecté)",
      frictionWhatsappStep3: "Commander sur votre carte",
      frictionHighlight: "100% de la valeur de la commande vous reste.",
      comparisonHeading: "Le match, point par point.",
      comparisonSubheading:
        "La commande WhatsApp Menuthere face aux agrégateurs et aux « chatbots » de commande génériques.",
      comparisonColAggregators: "Agrégateurs",
      comparisonColChatbots: "Chatbots génériques",
      comparisonValueYes: "Oui",
      comparisonValueNo: "Non",
      comparisonRow1Label: "Commission par commande",
      comparisonRow1Aggregator: "20-33%",
      comparisonRow1Chatbot: "Abonnement + coût par message",
      comparisonRow2Label: "Téléchargement d'appli requis",
      comparisonRow2Us: "Jamais",
      comparisonRow3Label: "Connexion client / OTP",
      comparisonRow3Us: "Automatique — aucune",
      comparisonRow3Aggregator: "Compte + OTP",
      comparisonRow3Chatbot: "Généralement requis",
      comparisonRow4Label: "Expérience de commande",
      comparisonRow4Us: "Carte visuelle complète, avec photos",
      comparisonRow4Aggregator: "Dans leur appli",
      comparisonRow4Chatbot: "Saisir les plats dans le chat",
      comparisonRow5Label: "Envoi depuis votre propre numéro",
      comparisonRow5Chatbot: "Parfois",
      comparisonRow6Label: "Suivi commande et livraison en direct",
      comparisonRow6Us: "Sur WhatsApp",
      comparisonRow6Aggregator: "Dans leur appli",
      comparisonRow6Chatbot: "Rarement",
      comparisonRow7Label: "Vous détenez les données clients",
      comparisonRow7Us: "Oui, entièrement",
      comparisonRow7Chatbot: "Partiellement",
      comparisonRow8Label: "Temps de mise en place",
      comparisonRow8Us: "Quelques minutes",
      comparisonRow8Aggregator: "Des semaines d'onboarding",
      comparisonRow8Chatbot: "Des jours et du scripting",
      outcome1Value: "≈ 10 s",
      outcome1Label:
        "Entre le « Hi » et le lien de commande dans la main du client.",
      outcome2Label:
        "De commission. Chaque euro de la valeur de la commande vous revient.",
      outcome3Value: "De bout en bout",
      outcome3Label:
        "Commande passée → acceptée → en livraison → suivie, tout sur WhatsApp.",
      faqHeading: "Vos questions, nos réponses.",
      faq1Question: "Mes clients doivent-ils installer quelque chose ?",
      faq1Answer:
        "Non. S'ils ont WhatsApp, ils peuvent commander. Ils envoient « Hi », touchent le lien Commander et arrivent sur votre carte, déjà connectés. Aucune application à télécharger, aucun compte à créer.",
      faq2Question: "Le client tape-t-il sa commande dans la conversation ?",
      faq2Answer:
        "Non, et c'est tout l'intérêt. WhatsApp est la porte d'entrée, pas la caisse. Le « Hi » lui donne un lien instantané vers votre vraie carte visuelle, avec photos, catégories et recherche : la commande est rapide et les erreurs rares. Le suivi, lui, revient sur WhatsApp.",
      faq3Question: "Est-ce que cela peut partir de mon propre numéro WhatsApp ?",
      faq3Answer:
        "Oui. Vous pouvez connecter votre propre numéro WhatsApp Business via l'onboarding officiel de Meta, en quelques minutes, y compris un numéro que vous utilisez déjà sur l'application WhatsApp Business. Vous préférez zéro configuration ? Démarrez immédiatement sur notre numéro partagé et changez plus tard.",
      faq4Question: "Le lien de commande est-il sûr à partager ?",
      faq4Answer:
        "Chaque lien est signé cryptographiquement, expire en quelques minutes et se verrouille sur la première personne qui l'ouvre. S'il est transféré, il ne fonctionnera tout simplement pour personne d'autre : une session connectée ne peut jamais fuiter.",
      faq5Question: "Que reçoit le client après avoir commandé ?",
      faq5Answer:
        "Des messages WhatsApp automatiques à chaque étape : commande reçue avec l'addition complète, acceptée, plat prêt, en cours de livraison avec un lien de suivi en direct, terminée, et points de fidélité gagnés (si vous avez un programme de fidélité).",
      faq6Question: "Quelle commission Menuthere prend-il ?",
      faq6Answer:
        "Zéro commission sur les commandes. La commande WhatsApp fait partie de votre canal direct : vous gardez 100% de la valeur de chaque commande, et les paiements arrivent directement sur votre compte bancaire.",
      faqCtaPrompt:
        "Prêt à laisser vos clients commander avec un simple « Hi » ?",
      faqSecondaryLink: "Découvrir la commande sans commission",
      trialHeading:
        "Lancez votre système de commande WhatsApp en moins de 2 minutes.",
      trialDescription:
        "Connectez votre numéro WhatsApp, importez votre carte et laissez vos clients commander avec un simple « Hi » : lien de connexion automatique, suivi en direct et zéro commission. Rejoignez les 600+ restaurants qui grandissent déjà avec Menuthere.",
    },
  },
  solutionsSlug: {
    heroPrimaryCta: "Commencer gratuitement",
    heroSecondaryCta: "Réserver une démo",
    benefitsHeadingLead: "Pourquoi choisir Menuthere",
    benefitsHeadingIndustry: "pour {industry} ?",
    benefitsHeadingIndustryFallback: "votre établissement",
    benefitsSubheading:
      "Des fonctionnalités pensées spécifiquement pour votre secteur.",
    featuresHeadingLead: "Tout ce qu'il vous faut",
    featuresHeadingEmphasis: "pour réussir.",
    featuresSubheading:
      "Une boîte à outils complète pour moderniser votre carte et ravir vos clients.",
    featuresCtaCardHeading: "Prêt à vous lancer ?",
    featuresCtaCardBody:
      "Rejoignez les milliers d'établissements qui utilisent déjà Menuthere pour transformer l'expérience de leur carte.",
    featuresCtaCardButton: "Essai gratuit",
    useCasesHeadingLead: "Parfait pour chaque type",
    useCasesHeadingIndustry: "de {industry}.",
    useCasesHeadingIndustryFallback: "établissement",
    faqHeadingLead: "Questions",
    faqHeadingEmphasis: "fréquentes.",
    notFoundMetaTitle: "Solution introuvable",
    breadcrumbHome: "Accueil",
    breadcrumbSolutions: "Solutions",
  },
  downloadApp: {
    heroHeadingLead: "Menuthere pour",
    heroHeadingHighlight: "mobile et ordinateur.",
    heroSubheading:
      "Gérez votre restaurant en déplacement ou depuis votre bureau. Notifications de commande en temps réel, mise à jour de la carte et suivi des ventes sur tous vos appareils.",
    appStoreBadgePrefix: "Télécharger sur l'",
    playStoreBadgePrefix: "Disponible sur",
    windowsBadgePrefix: "Télécharger pour",
    windowsBadgePlatform: "Windows",
    heroImageAlt: "Interface de l'application Menuthere",
  },
  blog: {
    metaTitle: "Blog | Menuthere - Conseils pour restaurants et cafés",
    metaDescription:
      "Conseils, guides et analyses pour les restaurateurs : menus digitaux, QR codes, synchronisation Google Business et croissance de votre activité.",
    ogTitle: "Blog | Menuthere",
    ogDescription:
      "Conseils, guides et analyses pour les restaurateurs : menus digitaux, QR codes et croissance de votre activité.",
    heroHeading: "Actualités et analyses",
    heroHeadingAccent: "de Menuthere",
    categoryLabel: "Blog",
    emptyState: "Aucun article publié pour l'instant. Revenez bientôt !",
    postMetaTitleTemplate: "{title} | Blog Menuthere",
    postNotFoundMetaTitle: "Article introuvable",
    backToIndexLink: "← Blog",
    relatedHeading: "Plus d'articles",
  },
};

export default fr;
