import type { Dictionary } from "./en";

/**
 * Brazilian Portuguese. Typed as `Dictionary`, so this file cannot drift from
 * the English source: add a key to en.ts and TypeScript fails here until it is
 * translated, rather than letting English leak onto a Portuguese page.
 *
 * Brand nouns (Menuthere, WhatsApp, Google, Product Hunt, QR, POS, Stripe,
 * Petpooja) stay in Latin script on purpose — that is how the market writes
 * them. Dollar amounts are written "US$" with Brazilian separators, the
 * conventional way pt-BR renders a US price.
 */
const pt: Dictionary = {
  common: {
    language: "Idioma",
    changeLanguage: "Alterar idioma",
  },
  nav: {
    products: "Produtos",
    solutions: "Soluções",
    businesses: "Negócios",
    pricing: "Preços",
    resources: "Recursos",
    blog: "Blog",
    login: "Entrar",
    bookDemo: "Agendar demo",
    getStarted: "Começar grátis",
    openMenu: "Abrir menu",
    closeMenu: "Fechar menu",
  },
  navItems: {
    ownDeliveryWebsite: {
      title: "Site de delivery próprio",
      description: "Plataforma de delivery sem comissão",
    },
    digitalMenuCreator: {
      title: "Criador de cardápio digital",
      description: "Cardápios em QR para pedir na mesa",
    },
    pos: {
      title: "Ponto de venda (POS)",
      description: "Controle o faturamento e a operação",
    },
    tableOrdering: {
      title: "Pedidos na mesa",
      description: "Experiência fluida para os clientes",
    },
    captainOrdering: {
      title: "Comanda digital",
      description: "A equipe registra pedidos em segundos",
    },
    googleBusinessSync: {
      title: "Sincronização com Google Business",
      description: "Publique o cardápio no Google Maps",
    },
    owners: {
      title: "Proprietários",
      description: "Controle a operação e aumente o faturamento",
    },
    agencies: {
      title: "Agências",
      description: "Várias contas de clientes em um só lugar",
    },
    restaurants: {
      title: "Restaurantes",
      description: "Cardápios digitais inteligentes para o salão",
    },
    cafes: {
      title: "Cafeterias e cafés",
      description: "Cardápios modernos para o café perfeito",
    },
    bakeries: {
      title: "Padarias",
      description: "Uma vitrine bonita para o que sai do forno",
    },
    cloudKitchens: {
      title: "Dark kitchens",
      description: "Gestão de cardápios de várias marcas",
    },
    hotels: {
      title: "Hotéis e resorts",
      description: "Gastronomia elegante para os hóspedes",
    },
    foodTrucks: {
      title: "Food trucks",
      description: "Cardápios móveis, em qualquer lugar",
    },
    bars: {
      title: "Bares e pubs",
      description: "Carta de bebidas dinâmica e com estilo",
    },
  },
  hero: {
    productHunt: "No ar no Product Hunt",
    headlineA: "Os pedidos são seus.",
    headlineB: "Os clientes, também.",
    subhead:
      "Chega de entregar 30% para os aplicativos. A Menuthere coloca no ar a sua plataforma de pedidos e delivery, com a sua marca, em minutos.",
    searchPlaceholder: "Buscar “{name}”",
    generate: "Gerar",
    working: "Gerando…",
    clear: "Limpar",
    pickFromDropdown: "Selecione o seu negócio na lista",
    bulletNoCommission: "Sem comissão",
    bulletYourBrand: "Sua marca",
    bulletLiveInMinutes: "No ar em minutos",
    whatsappTitle: "Pedidos pelo WhatsApp",
    whatsappNew: "Novo",
    whatsappBlurb: "Os clientes pedem pelo WhatsApp — sem app, sem cadastro.",
    whatsappExplore: "Conheça os pedidos pelo WhatsApp",
    trustedBy: "A escolha de restaurantes que estão construindo marca",
  },
  footer: {
    solutions: "Soluções",
    resources: "Recursos",
    legal: "Jurídico",
    tagline: "Pedidos sem comissão para restaurantes.",
    rights: "Todos os direitos reservados.",
  },
  metadata: {
    title: "Menuthere | Pedidos e delivery online para restaurantes",
    description:
      "Lance o app de delivery do seu restaurante com integração Petpooja POS, pedidos em tempo real e relatórios. Mais de 600 restaurantes na Índia já usam.",
  },

  // ---- Phase 2: the remaining marketing pages -------------------------------
  // Extracted from the live pages, so switching a component onto these keys
  // cannot silently reword the English a visitor already sees.
  solutionsOwners: {
    metaTitle: "Soluções para donos de restaurante | Menuthere",
    metaDescription:
      "Retome o controle do seu restaurante com a Menuthere. Cardápio, POS, comandas e estoque em um só painel. Zero comissão, lucro máximo.",
    heroPrimaryCta: "Começar agora",
    heroSecondaryCta: "Agendar demo",
    benefitsHeading: "Por que a Menuthere",
    benefitsHeadingAccent: "para donos?",
    reviewsHeading: "Aprovada por donos de",
    reviewsHeadingAccent: "restaurante.",
  },
  solutionsAgencies: {
    metaTitle: "Programa de Parceiros | Comissão recorrente | Menuthere",
    metaDescription:
      "Torne-se parceiro autorizado da Menuthere. Ganhe até 30% de comissão recorrente vitalícia vendendo cardápios digitais premium para restaurantes.",
    heroBadge: "Programa de Parceiros",
    heroApplyCta: "Inscreva-se",
    heroDemoCta: "Agendar demo",
    problemHeading: "Gere receita para os restaurantes,",
    problemHeadingAccent: "garanta a sua",
    problemBody:
      "Restaurantes independentes perdem vendas com PDFs estáticos que não acompanham as mudanças do dia. Como parceiro Menuthere, você resolve isso com uma plataforma consolidada de US$ 30/mês: atualizações instantâneas por QR em que mais de 600 estabelecimentos já confiam — e vira o consultor de referência deles.",
    benefitsHeading: "Por que ser parceiro",
    benefitsHeadingAccent: "da Menuthere?",
    earningsBadge: "Alto potencial de ganhos",
    earningsHeading: "Estrutura de comissão",
    earningsHeadingAccent: "por performance.",
    earningsSubheading:
      "O pagamento acompanha a receita. Todo mês, via Stripe, no mesmo dia em que a assinatura é recebida.",
    earningsTableTierHeader: "Nível",
    earningsTableRevenueHeader: "Receita indicada acumulada",
    earningsTableCommissionHeader: "Comissão (por assinatura de US$ 30)",
    tierStarterName: "Inicial",
    tierStarterRevenue: "US$ 0 a US$ 1.000",
    tierStarterRate: "20%",
    tierStarterPayout: "(US$ 6/mês)",
    tierStarterPayoutPerSub: "US$ 6/mês por assinatura",
    tierGrowthName: "Crescimento",
    tierGrowthRevenue: "US$ 1.001 a US$ 5.000",
    tierGrowthRate: "25%",
    tierGrowthPayout: "(US$ 7,50/mês)",
    tierGrowthPayoutPerSub: "US$ 7,50/mês por assinatura",
    tierEliteName: "Elite",
    tierEliteRevenue: "US$ 5.001+",
    tierEliteRate: "30%",
    tierElitePayout: "(US$ 9/mês)",
    tierElitePayoutPerSub: "US$ 9/mês por assinatura",
    tierCardRevenueLabel: "Receita",
    tierCardCommissionLabel: "Comissão",
    processHeading: "Processo de onboarding",
    processHeadingAccent: "de parceiros.",
    processStepOneTitle: "Análise da candidatura",
    processStepOneDescription:
      "Aprovação rápida e acesso ao portal de revenda, com links de demo e materiais de marca.",
    processStepTwoTitle: "Atuação em campo",
    processStepTwoDescription:
      "Prospecte restaurantes, faça demos de 5 minutos e feche o acordo.",
    processStepThreeTitle: "Divisão da receita",
    processStepThreeDescription:
      "Acompanhamento automático e repasse no mesmo dia do recebimento.",
    idealPartnerHeading: "Os parceiros estratégicos",
    idealPartnerHeadingAccent: "que buscamos",
    idealPartnerBody:
      "Líderes comerciais com rodagem em campo e boa relação com restaurantes. Programa seletivo, só para quem já tem resultado comprovado.",
    partnerTypeRestaurantAdvisors: "Consultores de restaurante",
    partnerTypeChannelPartners: "Parceiros de canal B2B",
    partnerTypeSalesExecutives: "Executivos de vendas",
    partnerTypeFranchiseSpecialists: "Especialistas em franquias",
    partnerTypeSaasResellers: "Revendedores SaaS",
    partnerTypeBizDevPros: "Profissionais de desenvolvimento de negócios",
    faqHeading: "Perguntas frequentes",
    faqHeadingAccent: "de parceiros.",
    faqProductOverviewQuestion: "Sobre o produto",
    faqProductOverviewAnswer:
      "Plataforma premium de cardápio digital em QR por US$ 30/mês, para restaurantes do mundo todo.",
    faqExperienceRequiredQuestion: "Experiência necessária",
    faqExperienceRequiredAnswer:
      "Vivência em vendas de campo; todo o material de apoio é por nossa conta.",
    faqPayoutMechanicsQuestion: "Como é o pagamento",
    faqPayoutMechanicsAnswer:
      "Repasses mensais via Stripe no dia do recebimento, vitalícios por assinatura ativa.",
    faqCostsInvolvedQuestion: "Custos envolvidos",
    faqCostsInvolvedAnswer: "Nenhum: o modelo é 100% comissionado.",
    faqTerritoryQuestion: "Território",
    faqTerritoryAnswer:
      "Restaurantes independentes do mundo todo, com prioridade nos EUA.",
    faqResourcesQuestion: "Materiais de apoio",
    faqResourcesAnswer:
      "Portal com vídeos, scripts e apresentações; e ainda repassamos leads quentes.",
    trustBadgeDeployments: "Mais de 600 operações no ar",
    trustBadgeFieldTested: "Modelo testado em campo",
    trustBadgeRevenueShare: "Só comissão",
    trustBadgeExclusiveAccess: "Acesso exclusivo",
    termsHeading: "Regras do programa de parceiros",
    termsIncomeContinuity:
      "Continuidade da receita: a comissão vale enquanto a assinatura estiver ativa.",
    termsTerminationRights:
      "Direito de encerramento: a Menuthere pode encerrar a parceria em caso de desalinhamento com a marca.",
    termsPayoutTiming:
      "Data do repasse: no mesmo dia do recebimento da assinatura, já descontadas as taxas.",
    termsEligibility:
      "Elegibilidade: aceitamos parceiros do mundo todo, mediante aprovação.",
  },
  solutionsIndex: {
    metaTitle: "Cardápio digital para todo tipo de negócio | Menuthere",
    metaDescription:
      "Cardápios digitais para restaurantes, cafeterias, padarias, dark kitchens, hotéis, food trucks e bares. QR code, atualização na hora e sync com o Google.",
    ogTitle: "Soluções de cardápio digital | Menuthere",
    ogDescription:
      "Cardápios digitais inteligentes para restaurantes, cafeterias, padarias e muito mais. Atualização na hora, design bonito e zero custo de impressão.",
    heroTitleLead: "Cardápios digitais que",
    heroTitleEmphasis: "transformam",
    heroTitleTail: "o seu negócio.",
    heroSubtitle:
      "Seja uma cafeteria aconchegante, um restaurante lotado ou um império de dark kitchens: a plataforma se adapta à sua operação.",
    heroPrimaryCta: "Começar grátis",
    heroSecondaryCta: "Agendar demo",
    industriesHeadingLead: "Escolha o seu segmento,",
    industriesHeadingEmphasis: "comece hoje.",
    industriesIntro:
      "Cardápios digitais sob medida, pensados para o seu tipo de negócio de alimentação.",
    cardRestaurantsTitle: "Restaurantes",
    cardRestaurantsDesc: "Cardápios digitais inteligentes para o salão",
    cardCafesTitle: "Cafeterias e cafés",
    cardCafesDesc: "Cardápios modernos para a melhor experiência de café",
    cardBakeriesTitle: "Padarias e confeitarias",
    cardBakeriesDesc: "Mostre o que sai do forno do jeito que merece",
    cardCloudKitchensTitle: "Dark kitchens",
    cardCloudKitchensDesc: "Gestão de cardápios de várias marcas sem complicação",
    cardHotelsTitle: "Hotéis e resorts",
    cardHotelsDesc: "Experiências gastronômicas elegantes para os hóspedes",
    cardFoodTrucksTitle: "Food trucks",
    cardFoodTrucksDesc: "Cardápios móveis que vão junto para onde você for",
    cardBarsTitle: "Bares e pubs",
    cardBarsDesc: "Carta de bebidas dinâmica e com estilo",
    cardCateringTitle: "Buffets e catering",
    cardCateringDesc: "Cardápios profissionais para cada evento",
    cardOwnersTitle: "Donos de restaurante",
    cardOwnersDesc: "Retome o controle da operação do seu restaurante",
    cardAgenciesTitle: "Agências e consultorias",
    cardAgenciesDesc: "Gerencie várias contas de clientes sem esforço",
    cardPetpoojaTitle: "Pedido direto e PetPooja",
    cardPetpoojaDesc: "A alternativa sem comissão ao Swiggy e ao Zomato",
    cardWhatsappOrderingTitle: "Pedidos pelo WhatsApp",
    cardWhatsappOrderingDesc:
      "O cliente manda um “Oi” e já pede — sem app, sem cadastro",
    cardLearnMoreLink: "Saiba mais",
    featuresHeadingLead: "Recursos poderosos,",
    featuresHeadingEmphasis: "para todo negócio.",
    featureQrTitle: "Cardápios em QR code",
    featureQrDesc:
      "Acesso na hora com um scan do celular. Sem baixar nenhum app.",
    featureRealtimeTitle: "Atualização em tempo real",
    featureRealtimeDesc:
      "Mude preços, inclua itens e marque esgotados na hora.",
    featureGoogleSyncTitle: "Sync com Google Business",
    featureGoogleSyncDesc:
      "Atualização automática do cardápio no seu Perfil da Empresa no Google.",
    featureAnalyticsTitle: "Relatórios e insights",
    featureAnalyticsDesc:
      "Acompanhe os itens mais pedidos e a preferência dos clientes.",
    googleBadge: "Integração com Google Business",
    googleHeading: "Sincronize o seu cardápio com o Perfil da Empresa no Google",
    googleBody:
      "Toda alteração que você faz atualiza automaticamente o cardápio do seu Perfil da Empresa no Google. Quem procurar o seu restaurante no Google Maps vê sempre a versão mais recente.",
    googleBenefitOneClickSync:
      "Sincronização em um clique com o Perfil da Empresa no Google",
    googleBenefitRealtimeUpdates:
      "Cardápio atualizado em tempo real em todas as plataformas",
    googleBenefitLocalSeo: "Mais SEO local e mais visibilidade",
    googleBenefitMoreCustomers:
      "Atraia mais clientes vindos da Busca do Google e do Google Maps",
    googleManagerLink: "Conheça o Google Business Manager",
    googleCardTitle: "Perfil da Empresa no Google",
    googleCardSubtitle: "Gerenciador de cardápio",
    googleCardSyncedLabel: "Itens sincronizados",
    googleCardLastSyncLabel: "Última sincronização",
    googleCardLastSyncValue: "Agora mesmo",
  },
  getStarted: {
    metaTitle: "Comece agora | Menuthere",
    metaDescription: "Crie o seu cardápio digital com a Menuthere.",
    stepIndicator: "Etapa {step} de 3",
    publishingLoader1: "Criando sua conta...",
    publishingLoader2: "Preparando seu cardápio digital...",
    publishingLoader3: "Configurando o painel...",
    publishingLoader4: "Quase lá...",
    step1Title: "Envie o seu cardápio",
    step1Subtitle:
      "Tire uma foto do seu cardápio e a gente digitaliza na hora.",
    filesSelectedCount: "{count} arquivo(s) selecionado(s)",
    uploadDropzonePrompt: "Clique para enviar, arraste e solte ou cole",
    uploadFormatsHint: "JPG, PNG ou PDF de até 10 MB",
    uploadAddMoreHint: "Clique na área para adicionar mais",
    fileTooLargeBadge: "Muito grande ({size} MB)",
    filePreviewAlt: "Página {number}",
    aiInstructionLabel: "Instruções para a nossa IA",
    optionalSuffix: "(opcional)",
    aiInstructionPlaceholder:
      "Algo especial no seu cardápio? Ex.: “Ignore as bebidas”, “Combos é uma categoria à parte”, “Os preços estão em AED”",
    aiInstructionHint:
      "A sua instrução tem prioridade quando a IA lê os arquivos.",
    removeInvalidFilesButton: "Remova os arquivos inválidos para continuar",
    nextStepButton: "Próxima etapa",
    uploadOrDivider: "Ou",
    sampleMenuButton: "Testar com cardápio de exemplo",
    sampleMenuDialogTitle: "Escolha um cardápio de exemplo",
    sampleMenuDialogSubtitle:
      "Escolha um tipo de restaurante e comece com um cardápio pronto.",
    sampleMenuComingSoonBadge: "Em breve",
    filesTooLargeToast:
      "{count} arquivo(s) passam do limite de 10 MB. Envie arquivos menores.",
    filesAddedToast: "{count} arquivo(s) adicionado(s)!",
    sampleMenuLoadedToast: "Cardápio de exemplo “{name}” carregado!",
    step2Title: "Dados do restaurante",
    step2Subtitle:
      "Conte um pouco sobre o seu estabelecimento para personalizar o cardápio.",
    restaurantNameLabel: "Nome do restaurante",
    restaurantNamePlaceholder: "Ex.: Casa do Hambúrguer",
    usernameLabel: "Nome de usuário",
    usernamePlaceholder: "nome_do_seu_local",
    usernameCheckingStatus: "Verificando disponibilidade...",
    usernameAvailableStatus: "Nome de usuário disponível",
    usernameTakenStatus: "Esse nome de usuário já está em uso",
    usernameMinLengthHint:
      "O nome de usuário precisa ter pelo menos 3 caracteres",
    phoneNumberLabel: "Telefone",
    phoneCodePlaceholder: "DDI",
    phoneInvalidError: "Telefone inválido",
    countryLabel: "País",
    countryPlaceholder: "Selecione ou digite o país",
    addressLabel: "Endereço",
    addressPlaceholder: "Rua, bairro, cidade…",
    currencyLabel: "Moeda",
    currencyPlaceholder: "Selecione ou busque a moeda",
    currencySearchPlaceholder: "Buscar moeda (ex.: BRL, real, R$)",
    currencySelectFallback: "Selecionar moeda",
    currencyNoMatch: "Nenhum resultado",
    logoLabel: "Logo (opcional)",
    logoPreviewAlt: "Prévia do logo",
    changeLogoButton: "Trocar logo",
    uploadLogoButton: "Enviar logo",
    removeLogoButton: "Remover",
    logoSizeLabel: "Tamanho (%)",
    logoBackgroundLabel: "Fundo",
    createMenuButton: "Criar cardápio",
    logoNotAnImageToast: "Escolha um arquivo de imagem para o logo",
    logoTooLargeToast: "O logo precisa ter menos de 10 MB",
    logoReadFailedToast: "Não foi possível ler essa imagem",
    missingDetailsToast: "Preencha todos os dados",
    invalidPhoneToast: "Digite um telefone válido",
    extractingTitle: "Extraindo o seu cardápio",
    extractingSubtitle:
      "Aguarde enquanto processamos a imagem do seu cardápio...",
    extractionErrorTitle: "Não foi possível extrair",
    menuUnreadableError:
      "Não conseguimos ler o seu cardápio. Tente arquivos mais nítidos ou adicione os itens manualmente.",
    extractionFailedToast: "Falha ao extrair o cardápio. Tente de novo.",
    retryExtractionButton: "Tentar de novo",
    cancelExtractionButton: "Cancelar e enviar de novo",
    step3Title: "Seu cardápio está pronto!",
    step3Subtitle: "Extraímos {count} itens. Personalize o tema abaixo.",
    themePickerTitle: "Escolha um tema",
    themeSwatchSample: "Aa",
    themeClassicLabel: "Clássico",
    themeMidnightLabel: "Meia-noite",
    themeFreshLabel: "Natural",
    publishButton: "Publicar agora",
    authModalSignInTitle: "Entre para publicar",
    authModalEmailHint:
      "Enviamos os dados de acesso ao painel para o seu e-mail.",
    googleSignInButton: "Entrar com o Google",
    authDividerOr: "ou",
    emailPlaceholder: "voce@exemplo.com",
    continueWithEmailButton: "Continuar com e-mail",
    authModalPasswordTitle: "Crie uma senha",
    authModalPasswordHint: "Defina uma senha para a sua conta no painel.",
    passwordPlaceholder: "Senha (mín. 6 caracteres)",
    confirmPasswordPlaceholder: "Confirme a senha",
    continueButton: "Continuar",
    invalidEmailToast: "Digite um e-mail válido",
    passwordTooShortToast: "A senha precisa ter pelo menos 6 caracteres",
    passwordMismatchToast: "As senhas não coincidem",
    emailAlreadyRegisteredToast:
      "Esse e-mail já está cadastrado. Use outro e-mail.",
    googleSignInSuccessToast: "Login feito com o Google!",
    googleSignInFailedToast:
      "Não foi possível entrar com o Google. Tente de novo.",
    publishSuccessToast: "Cardápio publicado! Levando você para o painel...",
    publishFailedToast: "Não foi possível concluir o cadastro. Tente de novo.",
    successTitle: "Confira o seu e-mail!",
    successSubtitle:
      "Enviamos o link do seu cardápio e os dados de acesso ao painel para:",
    successSpamHint:
      "Não achou? Veja a caixa de spam ou atualize o seu e-mail abaixo.",
    successMobileSubtitle:
      "Enviamos para o seu e-mail o link do cardápio e os dados de acesso ao painel.",
    changeEmailButton: "E-mail errado? Trocar",
    loginToDashboardButton: "Entrar no painel",
    changeEmailTitle: "Trocar e-mail",
    changeEmailSubtitle:
      "Digite o seu e-mail correto. É para lá que enviamos o link do cardápio e os dados de acesso ao painel.",
    newEmailLabel: "Novo e-mail",
    updatingEmailButton: "Atualizando...",
    updateAndResendButton: "Atualizar e reenviar",
    emailUpdatedToast: "E-mail atualizado! Confira a nova caixa de entrada.",
    emailUpdateFailedToast:
      "Não foi possível atualizar o e-mail. Tente de novo.",
  },
  helpCenter: {
    metaTitle: "Ajuda e suporte | Cardápio digital Menuthere",
    metaDescription:
      "Ajuda para o seu cardápio digital Menuthere: perguntas frequentes, suporte no WhatsApp e contato por e-mail. Respostas rápidas sobre cardápio e ofertas.",
    heroTitle: "Ajuda e",
    heroTitleAccent: "suporte.",
    heroSubtitle:
      "Precisa de ajuda? Fale com a gente por e-mail ou direto no WhatsApp.",
    faqSectionTitle: "Perguntas",
    faqSectionTitleAccent: "frequentes.",
    faq1Question:
      "Como evito que os clientes achem cardápios antigos no Google ou nos apps?",
    faq1Answer:
      "Toda alteração — produtos, preços, descrições ou disponibilidade — entra no ar na hora no seu cardápio digital. Confira clicando em Ver cardápio no painel: sem espera e sem reimpressão.",
    faq2Question:
      "Itens esgotados continuam aparecendo no meu cardápio em QR. Por quê?",
    faq2Answer:
      "Na seção Cardápio, clique em Disponibilidade, no topo. Ligue ou desligue categorias inteiras ou itens avulsos com um clique — o que está esgotado some de todos os lugares na mesma hora.",
    faq3Question:
      "Atualizar o cardápio demora uma eternidade e custa caro com designer.",
    faq3Answer:
      "Editar é simples e leva segundos, sem nenhum conhecimento técnico. Vá até a seção Cardápio, clique em qualquer produto para mudar nome, preço, imagem, descrição, ofertas ou variações e salve. As mudanças entram no ar na hora.",
    faq4Question: "Como atualizo os produtos do cardápio na hora?",
    faq4Answer:
      "Vá até a seção Cardápio do painel. Todas as categorias e produtos ficam listados: clique em qualquer um para editar nome, preço, imagem ou descrição e salve para atualizar na hora.",
    faq5Question: "Como reorganizo os itens ou as categorias do cardápio?",
    faq5Answer:
      "Abra a seção Cardápio e clique em Prioridade. Arraste ou defina números de prioridade para categorias e itens e salve — a nova ordem aparece na hora.",
    faq6Question: "Como coloco ofertas ou pratos especiais no cardápio?",
    faq6Answer:
      "Para Especiais/Mais vendidos: na seção Cardápio, ative a opção em cada item — eles aparecem como Imperdíveis no topo. Para ofertas personalizadas: vá até a seção Ofertas, crie promoções de um ou vários itens e elas entram no ar na hora.",
    faq7Question:
      "É difícil trocar banners ou fotos de produtos sem ajuda técnica?",
    faq7Answer:
      "Vá em Configurações → Configurações gerais para enviar ou trocar o banner do restaurante. As fotos dos produtos são editadas direto na seção Cardápio: arrasta e solta, e já está no ar.",
    faq8Question:
      "Dá para pré-visualizar ou programar mudanças, como os especiais do dia?",
    faq8Answer:
      "Sim — pré-visualize qualquer edição em Ver cardápio antes de salvar. Para programar, use a seção Ofertas e defina atualizações com horário (os especiais do dia, por exemplo). Tudo automático, sem precisar entrar todo dia.",
    faq9Question: "Consigo desligar a loja fora do horário de funcionamento?",
    faq9Answer:
      "Sim. Vá em Configurações e desligue o restaurante quando quiser — ideal para horário fechado, folgas ou manutenção. É só religar depois.",
    faq10Question: "No geral, é fácil editar os itens do cardápio?",
    faq10Answer:
      "Muito — segundos por alteração. Atualize preços, nomes, imagens, disponibilidade ou ofertas com botões e listas simples na seção Cardápio, sem código e sem designer.",
    faq11Question: "Posso cancelar a assinatura quando quiser?",
    faq11Answer:
      "Sim — cancele quando quiser pela sua conta. O plano continua ativo até o fim do ciclo de cobrança atual, sem novas cobranças a não ser que você renove.",
  },

  // ---- Phase 3: landing sections below the hero, footer links, the
  // remaining solutions pages, /download-app and the blog chrome. ------------
  landing: {
    socialProofEyebrow: "Números reais dos últimos 30 dias",
    statOrdersLabel: "Pedidos recebidos",
    statRevenueLabel: "Faturamento gerado",
    statAvgOrderValueLabel: "Ticket médio",
    statSuffixLakh: "L+",
    statSuffixThousand: "K+",
    platformHeadingLead: "Tudo o que o seu restaurante precisa,",
    platformHeadingAccent: "em uma só plataforma.",
    featureWebsiteAppTitle: "Site próprio e app com a sua marca",
    featureWebsiteAppBody:
      "Lance um site de pedidos e o seu próprio app na App Store e na Play Store, tudo no seu nome. Os clientes pedem direto de você. Sem intermediário de aplicativo, sem comissão de 20% a 33%. Eles navegam, pedem, acompanham a entrega e repetem o pedido em um toque, enquanto você fica com o relacionamento, controla os preços e mantém cada centavo do lucro.",
    featureWebsiteAppCta: "Veja como funciona",
    featureWhatsappOrderingTitle: "Peça no WhatsApp — é só mandar um “Oi”",
    featureWhatsappOrderingBody:
      "Transforme o seu número de WhatsApp no canal de pedidos mais fácil que você tem. O cliente manda um “Oi” e recebe na hora um link de acesso automático ao seu cardápio — sem baixar app, sem cadastro, sem OTP. Ele pede em poucos toques e acompanha o status ao vivo no próprio WhatsApp, enquanto você fica com o cliente e paga zero de comissão.",
    featureWhatsappOrderingCta: "Ver pedidos pelo WhatsApp",
    featurePetpoojaTitle: "Integração com Petpooja POS",
    featurePetpoojaBody:
      "Todo pedido online cai direto no seu Petpooja POS em tempo real. Sem digitação manual, sem pedido perdido, sem retrabalho. Itens, preços e categorias sincronizam automaticamente entre o POS e o seu site de delivery. É a única plataforma na Índia com integração profunda ao Petpooja já embutida.",
    featurePetpoojaCta: "Conheça a integração Petpooja",
    featurePaymentsTitle: "Integração de pagamentos",
    featurePaymentsBody:
      "Receba na hora com UPI, cartões, transferência bancária e carteiras digitais já integrados, além do pagamento na entrega. Checkout seguro e compatível com PCI, com tecnologia Cashfree, e o dinheiro cai direto na sua conta. Nenhum aplicativo segurando o seu caixa, nenhum atraso de repasse. Cada centavo chega até você.",
    featurePaymentsCta: "Ver formas de pagamento",
    featureOrderManagementTitle: "Gestão de pedidos em tempo real",
    featureOrderManagementBody:
      "Aceite, acompanhe e gerencie os pedidos de delivery em um só painel. Receba notificação instantânea de cada novo pedido, atualize o status em tempo real e mantenha cozinha e entregadores alinhados. Chega de malabarismo com vários tablets e de pedido perdido no pico do movimento.",
    featureOrderManagementCta: "Explorar a gestão de pedidos",
    featureDigitalMenuTitle: "Gestão de cardápio digital",
    featureDigitalMenuBody:
      "Cuide de todo o cardápio em um painel só: inclua ou edite itens, preços, categorias, fotos e variações em tempo real. Marque pratos como esgotados na hora, defina filtros de dieta e busca inteligente, e mantenha tudo sincronizado entre site, app e QR codes. Sem reimpressão e sem desenvolvedor. A alteração entra no ar no instante em que você salva.",
    featureDigitalMenuCta: "Saiba mais sobre o cardápio digital",
    featureOffersTitle: "Ofertas e promoções dinâmicas",
    featureOffersBody:
      "Rode promoções relâmpago, happy hour e descontos por horário que começam e terminam sozinhos. Destaque os campeões de venda com selos de Imperdível e Escolha do Chef. Traga o cliente de volta e aumente o faturamento sem imprimir um panfleto sequer.",
    featureOffersCta: "Veja como as ofertas funcionam",
    featureGoogleSyncTitle: "Sync do cardápio com Google Business",
    featureGoogleSyncBody:
      "Sincronize automaticamente o cardápio completo (categorias, itens, preços e fotos) com o seu Perfil da Empresa no Google em um clique. Apareça no Google Maps com o cardápio inteiro. Restaurantes com perfil completo recebem 7x mais cliques e levam 30% mais gente até a porta.",
    featureGoogleSyncCta: "Veja como o Google Sync funciona",
    featureDeliveryAppTitle: "App do entregador",
    featureDeliveryAppBody:
      "Um app dedicado para a sua equipe de entrega. Os entregadores recebem a notificação do pedido, navegam até o endereço do cliente e atualizam o status da entrega, tudo em tempo real. Acompanhe a localização ao vivo, distribua pedidos automaticamente e entregue mais rápido com visibilidade total.",
    featureDeliveryAppCta: "Conheça o app do entregador",
    featureAnalyticsTitle: "Relatórios e insights",
    featureAnalyticsBody:
      "Acompanhe volume de pedidos, evolução do faturamento, horários de pico e itens mais vendidos. Tome decisões com dados na mão sobre preço, promoção e operação de entrega. Saiba exatamente o que está funcionando e onde dá para melhorar.",
    featureAnalyticsCta: "Conheça os relatórios",
    ctaBannerHeadingDefault:
      "Coloque o seu site de delivery no ar em menos de 2 minutos.",
    ctaBannerBodyDefault:
      "Suba o cardápio, defina as áreas de entrega e comece a receber pedidos direto dos seus clientes, com integração completa ao Petpooja POS. Junte-se a mais de 600 restaurantes que já crescem com a Menuthere.",
    ctaBannerPrimaryButton: "Comece grátis",
    ctaBannerSecondaryButton: "Ver todos os planos",
    faqHeadingLead: "Perguntas",
    faqHeadingAccent: "frequentes.",
    faqVsAggregatorsQuestion:
      "Qual é a diferença da Menuthere para Zomato ou Swiggy?",
    faqVsAggregatorsAnswer:
      "Aplicativos como Zomato e Swiggy cobram de 20% a 33% de comissão em cada pedido. A Menuthere entrega um site de delivery com a sua marca, em que o cliente pede direto de você, com apenas 1% de comissão. Os dados do cliente são seus, o preço é você quem define e a fidelidade fica com a sua marca.",
    faqPetpoojaIntegrationQuestion:
      "Como funciona a integração com o Petpooja POS?",
    faqPetpoojaIntegrationAnswer:
      "Depois de conectado, o seu cardápio do Petpooja sincroniza automaticamente com o site de delivery da Menuthere. Todo pedido online vai direto para o POS em tempo real. Sem digitação manual e sem pedido perdido. Itens, preços e categorias ficam iguais nos dois sistemas.",
    faqDeliveryZonesQuestion: "Como configuro as áreas de entrega e as taxas?",
    faqDeliveryZonesAnswer:
      "No painel, vá em Configurações de entrega. Defina as áreas por raio ou por CEP, ajuste a taxa de cada área e configure o valor mínimo do pedido. Também dá para ativar ou desativar a entrega em regiões específicas quando quiser.",
    faqPickupOrdersQuestion:
      "O cliente pode pedir para retirar, além de receber em casa?",
    faqPickupOrdersAnswer:
      "Sim, o seu site aceita pedidos para entrega e para retirada. O cliente escolhe a preferência no checkout. Você ativa ou desativa cada opção nas configurações do painel.",
    faqRushHourOrdersQuestion: "Como gerencio os pedidos no pico do movimento?",
    faqRushHourOrdersAnswer:
      "Todos os pedidos aparecem no painel em tempo real, com notificação instantânea. Você aceita, prepara e atualiza o status em uma tela só. Se o Petpooja POS estiver conectado, os pedidos também são enviados para lá, então a cozinha nunca fica por fora.",
    faqTechnicalSkillsQuestion:
      "Preciso de conhecimento técnico para colocar isso no ar?",
    faqTechnicalSkillsAnswer:
      "Nada disso. Suba o cardápio (ou sincronize a partir do Petpooja), personalize a marca e o seu site de delivery está no ar em minutos. Sem código, sem designer, sem app para baixar.",
    faqOffersDiscountsQuestion:
      "Posso rodar ofertas e descontos no meu site de delivery?",
    faqOffersDiscountsAnswer:
      "Pode! Rode promoções relâmpago, cupons, desconto de primeira compra ou ofertas por horário que começam e terminam sozinhas. Destaque os campeões de venda com selos de Imperdível para aumentar o ticket médio.",
    faqCustomerDiscoveryQuestion:
      "Como os clientes encontram o meu site de delivery?",
    faqCustomerDiscoveryAnswer:
      "Divulgue o link nas redes sociais, no WhatsApp, no Perfil da Empresa no Google e em QR codes dentro da loja. A Menuthere ainda sincroniza o seu cardápio com o Google Maps, para você ser descoberto de forma orgânica. O site já vem otimizado para SEO.",
    faqPauseOrderingQuestion:
      "Consigo desligar os pedidos fora do horário de funcionamento?",
    faqPauseOrderingAnswer:
      "Sim. Vá em Configurações e desligue o restaurante quando quiser — ideal para horário fechado, feriados ou manutenção. É só religar depois. Também dá para programar a abertura e o fechamento automáticos.",
    faqCancelSubscriptionQuestion: "Posso cancelar a assinatura quando quiser?",
    faqCancelSubscriptionAnswer:
      "Sim, cancele quando quiser pela sua conta. O plano continua ativo até o fim do ciclo de cobrança atual, sem novas cobranças a não ser que você renove.",
    reviewExpandButton: "Ver mais",
    reviewCollapseButton: "Ver menos",
    reviewOneAuthorName: "Hotel Colombo",
    reviewOneAuthorLocation: "MG Road, Edappally",
    reviewOneAuthorInitials: "HC",
    reviewOneParagraphOne:
      "Sinceramente, eu nunca imaginei que fazer um app fosse tão fácil 😅 eles cuidaram de tudo com tranquilidade e deixaram o processo inteiro bem simples para a gente.",
    reviewOneParagraphTwo:
      "E entregaram exatamente do jeito que eu queria. Eu era bem exigente com alguns detalhes e não estava disposto a abrir mão de nada — passamos por várias rodadas de ajuste, e eles foram pacientes e calmos o tempo todo até ficar perfeito.",
    reviewOneParagraphThree:
      "Trabalho muito caprichado, muito obrigado, pessoal.",
    reviewTwoAuthorName: "Rimaal Mandi & Grills",
    reviewTwoAuthorLocation: "Pune",
    reviewTwoAuthorInitials: "RM",
    reviewTwoParagraphOne:
      "Obrigado ao time da MenuThere por desenvolver o nosso app. Ele ajuda os clientes a pedirem direto da gente e facilita muito a gestão das entregas. Também oferecemos opções de entrega terceirizada, como a Porter, e o time integrou tudo direitinho ao sistema. Está funcionando muito bem, fizeram um ótimo trabalho.",
    reviewTwoParagraphTwo:
      "O principal motivo de lançarmos esse app é que, embora plataformas como Zomato e Swiggy tragam bom movimento e alcance, o lado do repasse às vezes complica por causa das comissões e de outros custos. Claro que não dá para abrir mão do Zomato e do Swiggy, porque muita gente já está acostumada a pedir por lá, e vamos continuar trabalhando com eles.",
    reviewTwoParagraphThree:
      "Ao mesmo tempo, esse app nos dá mais um canal para falar direto com os nossos clientes e atendê-los melhor.",
    reviewTwoParagraphFour:
      "Obrigado, time da MenuThere, pelo apoio e pelo excelente trabalho.",
  },
  footerLinks: {
    brandBlurb:
      "A plataforma completa de pedidos online e delivery para restaurantes. Lance o seu próprio site, fuja das comissões dos aplicativos e faça o negócio crescer.",
    solutionsGoogleBusinessSync: "Sync com Google Business",
    solutionsOwners: "Proprietários",
    solutionsAgencies: "Agências",
    solutionsPetpoojaIntegration: "Integração PetPooja",
    solutionsRestaurants: "Restaurantes",
    solutionsCafes: "Cafeterias",
    resourcesHelpCenter: "Central de ajuda",
    resourcesDownloadApp: "Baixar o app",
    resourcesGetStarted: "Comece agora",
    legalPrivacyPolicy: "Política de Privacidade",
    legalTermsOfService: "Termos de Serviço",
    legalRefundPolicy: "Política de Reembolso",
    copyright: "© 2026 Menuthere.",
  },
  solutionsRest: {
    shared: {
      breadcrumbHome: "Início",
      breadcrumbSolutions: "Soluções",
      bookDemoCta: "Agendar demo",
      stepLabel: "Etapa {step}",
      faqHeading: "Perguntas frequentes.",
      zeroPercentValue: "0%",
    },
    googleBusiness: {
      metaTitle: "Sincronize o cardápio com o Google Business | Menuthere",
      metaDescription:
        "Sincronize o cardápio do seu restaurante com o Perfil da Empresa no Google automaticamente. Um clique, atualização em tempo real e mais SEO local.",
      ogDescription:
        "Sincronize automaticamente o cardápio do seu restaurante com o Google Maps. Sempre atualizado, sem nenhum trabalho manual.",
      breadcrumbCurrent:
        "Sync do cardápio com o Perfil da Empresa no Google",
      heroBadge: "Integração com Google Business",
      heroTitle: "Sincronize o seu cardápio com o Google Maps automaticamente",
      heroSubtitle:
        "Mantenha o cardápio do seu Perfil da Empresa no Google sempre atualizado. Sincronização em um clique a partir da Menuthere — o seu cardápio na Busca do Google e no Google Maps, certinho toda vez.",
      heroPrimaryCta: "Sincronizar cardápio",
      mockupCardTitle: "Perfil da Empresa no Google",
      mockupCardSubtitle: "Gerenciador de sincronização",
      mockupSyncStatusTitle: "Cardápio sincronizado com sucesso",
      mockupSyncStatusMeta: "Última sincronização: agora mesmo",
      mockupStatItemsLabel: "Itens sincronizados",
      mockupStatCategoriesLabel: "Categorias",
      mockupStatImagesLabel: "Com imagem",
      mockupRecentlySyncedLabel: "Sincronizados recentemente",
      mockupItem1Name: "Butter Chicken",
      mockupItem1Category: "Prato principal",
      mockupItem2Name: "Paneer Tikka",
      mockupItem2Category: "Entradas",
      mockupItem3Name: "Gulab Jamun",
      mockupItem3Category: "Sobremesas",
      mockupBadgeTitle: "Visualizações do perfil",
      mockupBadgeValue: "+340% neste mês",
      statSyncingValue: "500+",
      statSyncingLabel: "Restaurantes sincronizando",
      statClicksValue: "7x",
      statClicksLabel: "Mais cliques no perfil",
      statSyncTimeValue: "< 30s",
      statSyncTimeLabel: "Tempo de sincronização",
      statFootfallValue: "30%",
      statFootfallLabel: "Mais movimento na loja",
      howItWorksBadge: "Processo simples em 3 etapas",
      howItWorksHeading: "Como funciona",
      howItWorksSubheading:
        "Do painel do seu cardápio até o Google Maps em três etapas simples",
      step1Title: "Monte o seu cardápio",
      step1Body:
        "Monte o cardápio na nossa plataforma com categorias, itens, preços e fotos. Leva só alguns minutos.",
      step2Title: "Conecte o perfil do Google",
      step2Body:
        "Conecte o seu Perfil da Empresa no Google em um clique. Cuidamos de todo o OAuth e da configuração da API para você.",
      step3Title: "Sincronize e entre no ar",
      step3Body:
        "Clique em sincronizar e o cardápio inteiro aparece no Google Maps. Atualize quando quiser — a mudança aparece na hora.",
      benefitsHeading: "Por que os restaurantes amam o sync com o Google",
      benefitsSubheading:
        "O seu cardápio é a sua ferramenta de marketing mais forte — garanta que ele apareça onde o cliente procura",
      benefit1Title: "Impulsione o SEO local",
      benefit1Body:
        "Restaurantes com Perfil da Empresa no Google completo recebem 7x mais cliques. Um cardápio sincronizado é um dos sinais mais fortes de ranqueamento local — e ajuda você a aparecer mais acima nas buscas por \"restaurante perto de mim\".",
      benefit2Title: "Apareça no Google Maps",
      benefit2Body:
        "Quando o cliente busca comida no Google Maps, o seu cardápio completo está ali — preços, categorias e itens. Ele já decide visitar antes mesmo de ligar.",
      benefit3Title: "Sempre atualizado",
      benefit3Body:
        "Mudou um preço? Entrou um prato novo? Saiu um item de temporada? Uma sincronização e o cardápio do seu Perfil da Empresa no Google já mostra a versão mais recente. Sem edição manual no Google.",
      benefit4Title: "Economize horas toda semana",
      benefit4Body:
        "Atualizar o cardápio do Google na mão é trabalhoso e cheio de erro. A nossa sincronização faz isso em segundos, não em horas. Foque na cozinha, não em copiar e colar.",
      benefit5Title: "Traga mais gente para a loja",
      benefit5Body:
        "Clientes que veem um cardápio detalhado no Google têm 30% mais chance de visitar. Dê a informação que eles precisam para escolher você em vez do concorrente.",
      benefit6Title: "Preciso e confiável",
      benefit6Body:
        "Chega de divergência de preço entre o seu cardápio real e o que o Google mostra. Acabe com as reclamações sobre informação desatualizada no Maps.",
      comparisonHeading: "Sem sync x com a Menuthere",
      comparisonSubheading:
        "Veja a diferença que a sincronização automática do cardápio faz",
      comparisonWithoutBadge: "✕ Sem sync",
      comparisonWithout1: "Cadastrar cada item no Google, um por um",
      comparisonWithout2:
        "O cardápio no Google fica desatualizado em poucos dias",
      comparisonWithout3: "Divergência de preço gera reclamação de cliente",
      comparisonWithout4: "Horas de digitação todo mês",
      comparisonWithout5: "Sem imagens — só texto puro",
      comparisonWithout6: "Informação inconsistente entre as plataformas",
      comparisonWithBadge: "✓ Com a Menuthere",
      comparisonWith1: "Um clique envia o cardápio inteiro",
      comparisonWith2: "O cardápio no Google sempre igual ao mais recente",
      comparisonWith3: "Preço correto gera confiança no cliente",
      comparisonWith4: "Segundos para sincronizar, e não horas de trabalho manual",
      comparisonWith5: "Suporte completo a imagens para dar apetite",
      comparisonWith6: "Cardápio único no site, no QR e no Google",
      featuresHeading: "Tudo o que vem junto com o sync do Google",
      featuresSubheading:
        "Um kit completo para manter a sua presença no Google precisa e atraente.",
      feature1:
        "Sincronização do cardápio completo com o Perfil da Empresa no Google em um clique",
      feature2: "Mapeamento e estruturação automáticos das categorias",
      feature3: "Suporte a upload de imagem dos itens",
      feature4: "Sincronização de preço e disponibilidade",
      feature5: "Suporte a várias unidades para redes",
      feature6: "Histórico e status das sincronizações",
      feature7: "Funciona com qualquer conta do Google Business",
      feature8: "Sem exigir conhecimento técnico",
      feature9: "Suporte a marcação vegetariano/não vegetariano",
      feature10: "Lida com caracteres especiais e cardápios multilíngues",
      ctaBoxHeading: "Pronto para sincronizar o seu cardápio?",
      ctaBoxBody:
        "Junte-se a centenas de restaurantes que já usam a Menuthere para manter a presença no Google em dia. A configuração leva menos de 5 minutos.",
      ctaBoxButton: "Testar grátis",
      comingSoonBadge: "Em breve",
      comingSoonHeading: "O futuro da sua presença no Google",
      comingSoonBody:
        "Estamos construindo novos recursos para você gerenciar todo o seu Perfil da Empresa no Google — muito além do cardápio.",
      autoPostTitle: "Publicação automática no Google",
      autoPostBody:
        "Publique automaticamente posts, ofertas, eventos e novidades direto no seu Perfil da Empresa no Google. Divulgue o prato do dia, o lançamento de um item ou a promoção de festa — sem precisar entrar no Google.",
      autoPostPoint1: "Agende posts com fotos e botões de ação",
      autoPostPoint2: "Divulgue pratos do dia e ofertas de temporada",
      autoPostPoint3: "Anúncio de eventos publicado sozinho",
      autoPostPoint4: "Métricas de post e acompanhamento de engajamento",
      reviewRepliesTitle: "Respostas de avaliação com IA",
      reviewRepliesBody:
        "Deixe a IA escrever respostas atenciosas e personalizadas para cada avaliação no Google — positiva ou negativa. Responda mais rápido, cuide da reputação e mostre ao cliente que você se importa, 24 horas por dia.",
      reviewRepliesPoint1:
        "Respostas profissionais e acolhedoras geradas por IA",
      reviewRepliesPoint2: "Lida com avaliações positivas e negativas",
      reviewRepliesPoint3: "Segue o tom e a voz do seu restaurante",
      reviewRepliesPoint4: "Aprove com um clique ou edite antes de publicar",
      testimonialQuote:
        "“A gente gastava uma tarde inteira todo mês atualizando o cardápio no Google. Com a Menuthere, aperto um botão e tudo sincroniza — itens, preços, até as imagens. A nossa ficha no Google Maps ficou profissional e já sentimos um aumento claro de clientes que chegam dizendo que viram o cardápio online.”",
      testimonialAuthor: "Arjun & Priya Nair",
      testimonialRole: "Proprietários, Spice Route Kitchen",
      testimonialLocation: "Kochi, Kerala",
      faqSubheading:
        "Tudo o que você precisa saber sobre a sincronização de cardápio com o Perfil da Empresa no Google",
      faq1Question:
        "O que é a sincronização de cardápio com o Perfil da Empresa no Google?",
      faq1Answer:
        "É um recurso que copia automaticamente o cardápio do seu restaurante da nossa plataforma para o seu Perfil da Empresa no Google (a ficha que aparece na Busca do Google e no Google Maps). Em vez de cadastrar cada item na mão no Google, você sincroniza tudo com um clique.",
      faq2Question: "Preciso ter um Perfil da Empresa no Google para usar?",
      faq2Answer:
        "Sim, é preciso ter um Perfil da Empresa no Google verificado para o seu restaurante. Se ainda não tiver, dá para criar de graça em business.google.com. Depois de verificado, você conecta o perfil à nossa plataforma e começa a sincronizar.",
      faq3Question: "Com que frequência devo sincronizar o cardápio?",
      faq3Answer:
        "Recomendamos sincronizar sempre que houver mudança no cardápio — item novo, alteração de preço ou ajuste de temporada. A sincronização leva poucos segundos, então não há motivo para deixar desatualizado. Alguns restaurantes sincronizam todo dia; outros, uma vez por semana.",
      faq4Question: "A sincronização apaga o cardápio que já está no Google?",
      faq4Answer:
        "Sim, cada sincronização substitui o cardápio do seu Perfil da Empresa no Google pela versão mais recente da nossa plataforma. É isso que garante precisão total. As outras informações do perfil (fotos, avaliações, horários) não são afetadas.",
      faq5Question: "Funciona para restaurantes com várias unidades?",
      faq5Answer:
        "Sim! Se você administra várias unidades em uma mesma conta do Google Business, dá para escolher para qual unidade sincronizar. Cada uma pode ter o seu próprio cardápio. Perfeito para redes com cardápios diferentes por loja.",
      faq6Question: "Os dados da minha conta do Google estão seguros?",
      faq6Answer:
        "Totalmente. Usamos o OAuth 2.0 oficial do Google e a API do Business Profile. Pedimos apenas as permissões mínimas necessárias para gerenciar o cardápio. As suas credenciais nunca são armazenadas — a autenticação é feita por token seguro.",
      faq7Question:
        "O que acontece com as imagens do cardápio na sincronização?",
      faq7Answer:
        "As imagens dos itens do seu perfil sobem para o Google junto com os dados do cardápio. Imagens grandes são otimizadas automaticamente para os requisitos do Google. Se alguma falhar no envio, o item sincroniza mesmo assim — só sem a foto.",
      faq8Question: "Esse recurso está em todos os planos?",
      faq8Answer:
        "A sincronização de cardápio com o Perfil da Empresa no Google está disponível nos planos Pro e Business. Confira a página de preços para ver o que cada plano inclui.",
    },
    petpooja: {
      metaTitle:
        "Pare de pagar 30% de comissão aos aplicativos de delivery | Pedido direto com a Menuthere",
      metaDescription:
        "Os aplicativos de delivery cobram de 20% a 30%+ de comissão por pedido. A Menuthere dá a você um app de pedidos próprio com apenas 0% de comissão, propriedade total dos dados do cliente e integração com o PetPooja POS. Retome o controle do seu restaurante.",
      ogTitle:
        "Pare de pagar 30% de comissão | Pedido direto para restaurantes",
      ogDescription:
        "Por que pagar de 20% a 30% para outras plataformas de delivery? Tenha o seu site de pedidos com apenas 0% de comissão. Integração com PetPooja POS, dados completos do cliente e controle total.",
      breadcrumbCurrent: "Pedido direto e integração PetPooja",
      heroTitle:
        "Pare de pagar 30% de comissão aos aplicativos de delivery",
      heroSubtitle:
        "Um site de pedidos próprio, com propriedade total do cliente e integração com o PetPooja POS",
      heroPrimaryCta: "Vender direto",
      statCommissionLabel: "Comissão por pedido",
      value35Percent: "35%",
      statQuitLabel: "Dos restaurantes querem largar os aplicativos",
      statFeeValue: "45%",
      statFeeLabel: "Taxa efetiva dos aplicativos",
      statDataValue: "100%",
      statDataLabel: "Dos dados do cliente são seus",
      introParagraph1:
        "Os aplicativos cobram de 20% a 33% de comissão + taxas escondidas em cada pedido. Em um pedido de Rs 500, você perde até Rs 225. Isso não é parceria — é um imposto sobre o seu trabalho. Investigações da CCI concluíram que grandes plataformas de delivery violaram a lei de concorrência.",
      introParagraph2:
        "A Menuthere dá a você um site de pedidos com a sua marca, apenas 1% de comissão e propriedade total dos dados do cliente. Junto com a integração ao PetPooja POS, os pedidos vão direto para a cozinha — sem intermediário, sem divisão de receita, sem perda de controle.",
      problemsHeading:
        "Como as outras plataformas de delivery prejudicam o seu restaurante.",
      problemsSubheading:
        "Investigações da CCI concluíram que as duas plataformas violaram a lei de concorrência. Veja o que elas estão fazendo com o seu negócio.",
      problem1Title: "20% a 33% de comissão por pedido",
      problem1Body:
        "As plataformas de delivery aumentaram a comissão para até 33% recentemente. Em um pedido de Rs 500, você perde de Rs 100 a Rs 165 antes de qualquer outro desconto. O custo do insumo, o aluguel e o salário da equipe saem do que sobra.",
      problem2Title: "Taxas escondidas chegam a 45%",
      problem2Body:
        "GST sobre a comissão (18%), taxa de gateway de pagamento (2% a 3%), acréscimo na embalagem (Rs 2 a 5 por pedido) e desconto rateado à força. Um pedido de Rs 500 pode custar de Rs 212 a Rs 227 em taxas de plataforma — de 42% a 45% do valor.",
      problem3Title: "Os dados do seu cliente são deles",
      problem3Body:
        "Você atende milhares de clientes e não tem relação direta com nenhum deles. As plataformas escondem ativamente os dados — nome, telefone, histórico de pedidos. Não dá para criar fidelidade nem rodar promoção segmentada.",
      problem4Title: "Visibilidade só pagando",
      problem4Body:
        "Os 10 primeiros resultados de busca nas outras plataformas de delivery são quase sempre posições pagas. Sem investir em anúncio, o seu restaurante fica soterrado. Com a verba de mídia, a comissão efetiva sobe para 25% a 40%.",
      problem5Title: "Nenhuma liberdade de preço",
      problem5Body:
        "As plataformas de delivery impõem restrições de preço com multa por descumprimento e avisam que podem rebaixar o seu ranking se você cobrar mais barato em outro canal. Você nem controla a própria estratégia de preço.",
      problem6Title: "As plataformas agora competem com você",
      problem6Body:
        "As plataformas de delivery estão lançando as próprias marcas de comida e apps de quick commerce. Elas usam os dados DOS SEUS clientes para construir produtos concorrentes. A NRAI chama isso de 'abuso de poder'.",
      commissionHeading: "O custo real de um pedido de Rs 500.",
      commissionSubheading:
        "Veja exatamente para onde vai o seu dinheiro nos aplicativos e no pedido direto.",
      commissionColCharge: "Tipo de cobrança",
      commissionColPlatforms: "Plataformas de delivery",
      commissionRow1Label: "Comissão base",
      commissionRow1Aggregator: "18-33%",
      commissionRow2Label: "GST",
      commissionRow2Aggregator: "~3-5%",
      commissionRow3Label: "Gateway de pagamento",
      commissionRow3Aggregator: "2-3%",
      commissionRow3Menuthere: "2%",
      commissionRow4Label: "Descontos obrigatórios",
      commissionRow4Aggregator: "5-15%",
      commissionRow4Menuthere: "Você decide",
      commissionRow5Label: "Acréscimo na embalagem",
      commissionRow5Aggregator: "Rs 2-5/pedido",
      commissionRow6Label: "Anúncios de destaque",
      commissionRow6Aggregator: "5-10% a mais",
      commissionRow6Menuthere: "Visibilidade grátis",
      commissionTotalLabel: "Perda efetiva total",
      commissionTotalAggregator: "Rs 212-227 (42-45%)",
      commissionTotalMenuthere: "~3%",
      commissionFootnote:
        "* Com base em dados de mercado dos relatórios da NRAI, Menuviel e Billboox (2025-2026)",
      solutionHeading: "Retome o controle do seu restaurante.",
      solutionSubheading:
        "Um site de pedidos próprio. Apenas 1% de comissão. Dados completos do cliente. Integração com o PetPooja POS.",
      solution1Title: "Apenas 0% de comissão nos pedidos",
      solution1Body:
        "Com apenas 0% de comissão, quase tudo o que o cliente paga fica com você. Sem taxa escondida, sem divisão de receita. A sua margem permanece intacta — como deveria ser.",
      solution2Title: "100% dos dados do cliente são seus",
      solution2Body:
        "Cada pedido traz nome, telefone, histórico e preferências do cliente. Monte programas de fidelidade, envie ofertas segmentadas e crie relações de verdade com quem compra de você.",
      solution3Title: "Um site de pedidos com a sua marca",
      solution3Body:
        "Tenha um site de pedidos profissional com a identidade, as cores e o domínio do seu restaurante. O cliente pede direto de você — quem cresce é a sua marca, não a do aplicativo.",
      solution4Title: "Relatórios e insights completos",
      solution4Body:
        "Acompanhe cada pedido, horários de pico, itens populares, comportamento do cliente e evolução do faturamento. Decida com dados sobre cardápio, preço e promoção.",
      solution5Title: "Construa fidelidade de verdade",
      solution5Body:
        "Rode as suas ofertas, descontos e recompensas sem dividir margem com ninguém. Envie avisos no WhatsApp, mensagens de festa e promoções personalizadas direto para os seus clientes.",
      solution6Title: "Integração com PetPooja POS",
      solution6Body:
        "Sincronize sem esforço os pedidos do seu site Menuthere direto com o PetPooja POS. Sem digitação manual, sem pedido perdido. A cozinha recebe o pedido na hora, como em qualquer outro canal.",
      realNumbersHeading: "Dependência dos aplicativos x pedido direto.",
      realNumbersSubheading:
        "A comparação real que as plataformas não querem que você veja.",
      realNumbersColAggregators: "Aplicativos",
      realNumbersRow1Metric: "Comissão por pedido",
      realNumbersRow1Aggregator: "18-33% + taxas (efetivo de 35-45%)",
      realNumbersRow1Direct: "Apenas 0%",
      realNumbersRow2Metric: "Propriedade dos dados do cliente",
      realNumbersRow2Aggregator: "A plataforma fica com tudo",
      realNumbersRow2Direct: "100% seus",
      realNumbersRow3Metric: "Controle de preço",
      realNumbersRow3Aggregator: "Restrito, com multas",
      realNumbersRow3Direct: "Liberdade total",
      realNumbersRow4Metric: "Construção de marca",
      realNumbersRow4Aggregator: "A fidelidade vai para a plataforma",
      realNumbersRow4Direct: "A fidelidade vai para o SEU restaurante",
      realNumbersRow5Metric: "Margem de lucro no delivery",
      realNumbersRow5Aggregator: "Muitas vezes abaixo de 10%",
      realNumbersRow5Direct: "25-35%+ é possível",
      realNumbersRow6Metric: "Controle de marketing",
      realNumbersRow6Aggregator: "Só pagando, Rs 250-4000+",
      realNumbersRow6Direct: "Controle total, campanhas próprias",
      realNumbersRow7Metric: "Controle de cardápio e desconto",
      realNumbersRow7Aggregator: "A plataforma pode impor sem consentimento",
      realNumbersRow7Direct: "100% decisão sua",
      transparencyHeading: "Bom saber — transparência total.",
      transparencySubheading:
        "A gente prefere falar aberto. Veja o que oferecemos e o que não oferecemos.",
      deliveryTitle: "Não fornecemos entregadores",
      deliveryBody:
        "A Menuthere foca em entregar a melhor plataforma de pedidos, gestão de clientes e integração com POS. Para a entrega, você tem opções flexíveis:",
      deliveryPoint1: "Use a sua própria equipe e tenha controle total",
      deliveryPoint2:
        "Contrate serviços terceirizados como Porter, Dunzo ou Shadowfax",
      deliveryPoint3: "Ofereça só retirada — muita gente prefere",
      deliveryPoint4: "Pedido por QR na mesa nem precisa de entrega",
      deliveryNote:
        "Mesmo os pedidos só de retirada em canais diretos são mais lucrativos que pedidos entregues por aplicativos com 30% de comissão.",
      paymentTitle: "Integração de pagamentos",
      paymentBadge: "Só 1%",
      paymentBody:
        "Gateway de pagamento integrado por apenas 1% (só o serviço ao cliente). Os seus clientes podem pagar online direto no seu site de pedidos:",
      paymentPoint1: "Pagamentos por UPI (Google Pay, PhonePe, Paytm)",
      paymentPoint2: "Suporte a cartão de crédito e débito",
      paymentPoint3: "Integração com carteiras digitais",
      paymentPoint4: "Conciliação automática com o PetPooja POS",
      paymentNote:
        "Você também pode aceitar pagamento na entrega ou usar a sua estrutura de pagamento atual.",
      factsHeading: "Os números não mentem.",
      factsSubheading:
        "Dados reais de pesquisas de mercado, investigações da CCI e relatórios da NRAI.",
      fact1Text:
        "dos restaurantes indianos querem parar de usar outras plataformas de delivery (pesquisa de dez. 2025)",
      fact2Value: "60%",
      fact2Text:
        "dos restaurantes novos fecham no primeiro ano — a dependência de plataforma é um fator importante",
      fact3Value: "Rs 400 Cr",
      fact3Text:
        "a mais por ano extraídos pelas plataformas com acréscimos na taxa de embalagem em todo o setor",
      fact4Value: "2,000+",
      fact4Text:
        "restaurantes participaram do boicote #Logout contra as plataformas de aplicativo",
      howItWorksHeading: "Vá direto em 3 passos simples.",
      howItWorksSubheading:
        "Monte o seu próprio canal de pedidos em menos de 10 minutos.",
      step1Title: "Crie o cardápio e o site",
      step1Body:
        "Suba o cardápio, personalize a marca e coloque o seu site de pedidos no ar. Leva menos de 10 minutos.",
      step2Title: "Conecte o PetPooja POS",
      step2Body:
        "Conecte o seu PetPooja POS para sincronizar os pedidos automaticamente. Eles vão direto para a cozinha — zero trabalho manual.",
      step3Title: "Divulgue e comece a vender",
      step3Body:
        "Compartilhe o link de pedidos pelo WhatsApp, nas redes sociais e em QR codes. Veja os pedidos diretos chegarem.",
      savingsHeading:
        "Cada pedido em outras plataformas de delivery custa de Rs 100 a Rs 225",
      savingsBody:
        "Se você recebe 50 pedidos de entrega por dia, são de Rs 5.000 a Rs 11.250 perdidos todo dia. De Rs 1,5 a 3,3 lakhs por mês. O seu próprio site de pedidos se paga já no primeiro dia.",
      savingsSecondaryCta: "Ver preços",
      faqSubheading:
        "Tudo o que você precisa saber sobre pedido direto com a Menuthere.",
      faq1Question:
        "Como a Menuthere me ajuda a parar de pagar comissão para outras plataformas de delivery?",
      faq1Answer:
        "A Menuthere entrega um site de pedidos com a sua marca, em que o cliente compra direto de você. Com apenas 0% de comissão, quase toda a receita do pedido fica com você. Cobramos uma assinatura simples — e não uma fatia de 20% a 30% de cada pedido.",
      faq2Question: "A Menuthere fornece entregadores?",
      faq2Answer:
        "Não, a Menuthere não fornece entregadores. Nosso foco é entregar a melhor plataforma de pedidos, gestão de clientes e integração com POS. Para a entrega, você pode usar a sua própria equipe, contratar serviços terceirizados como Porter, Dunzo ou Shadowfax, ou oferecer só retirada. Muitos restaurantes descobrem que até os pedidos de retirada em canais diretos são mais lucrativos que os entregues por aplicativos.",
      faq3Question: "Como funciona a integração com o PetPooja?",
      faq3Answer:
        "Os pedidos feitos no seu site Menuthere são enviados automaticamente para o terminal PetPooja POS em tempo real. A cozinha vê o pedido na hora — sem digitação manual, sem copiar e colar, sem pedido perdido. Funciona igual a receber um pedido de qualquer outro canal no seu POS.",
      faq4Question: "E a cobrança dos clientes, como fica?",
      faq4Answer:
        "A Menuthere já inclui suporte a gateway de pagamento com apenas 0% de taxa (só o serviço ao cliente). Os clientes pagam online por UPI, cartão e carteiras digitais direto no seu site de pedidos. Você também pode aceitar pagamento na entrega ou usar a sua estrutura atual.",
      faq5Question: "Devo sair de vez das outras plataformas de delivery?",
      faq5Answer:
        "Não necessariamente. Muitos restaurantes usam as outras plataformas para descoberta (atrair cliente novo) e direcionam quem já compra para o site próprio, onde a margem é maior. O objetivo é reduzir a dependência — não obrigatoriamente eliminá-la — e garantir que mais receita fique com você.",
      faq6Question: "Quanto custa a Menuthere?",
      faq6Answer:
        "A Menuthere cobra uma assinatura mensal simples — e não um percentual dos seus pedidos. Mesmo nos planos pagos, você economiza muito mais do que gasta ao fugir das comissões dos aplicativos. Confira a página de preços para ver os planos atuais.",
      faq7Question:
        "É verdade que 35% dos restaurantes querem largar os aplicativos?",
      faq7Answer:
        "Sim. Uma pesquisa de dezembro de 2025 mostrou que 35% dos restaurantes indianos querem parar de usar outras plataformas de delivery, citando comissão alta, atendimento ruim, lucro insuficiente e falta de acesso aos dados do cliente como principais motivos.",
      faq8Question:
        "Dá para continuar nas outras plataformas junto com a Menuthere?",
      faq8Answer:
        "Com certeza. A maioria dos nossos parceiros usa os dois. Eles mantêm as outras plataformas para captar cliente novo e, ao mesmo tempo, empurram quem já compra para o site Menuthere, onde a margem é bem maior. Com o tempo, a fatia de pedidos diretos cresce, porque o cliente passa a preferir pedir direto.",
    },
    whatsappOrdering: {
      metaTitle:
        "Pedidos no WhatsApp para restaurantes — é só mandar 'Oi' | Menuthere",
      metaDescription:
        "Transforme o seu número de WhatsApp em canal de pedidos. O cliente manda 'Oi', recebe na hora um link de acesso automático, pede no seu cardápio visual e acompanha o status ao vivo — sem baixar app, sem cadastro, zero comissão.",
      metaKeywords:
        "pedidos no whatsapp, sistema de pedidos por whatsapp para restaurantes, pedir pelo whatsapp, whatsapp business pedidos, cardápio de restaurante no whatsapp, mandar oi para pedir, pedido de comida pelo whatsapp, pedido por conversa, pedidos sem comissão",
      ogTitle: "Pedidos no WhatsApp — é só mandar 'Oi' | Menuthere",
      ogDescription:
        "O canal de pedidos com menos atrito para restaurantes. Manda 'Oi' → link na hora → pede no seu cardápio → status ao vivo no WhatsApp. Sem app, sem cadastro, zero comissão.",
      structuredDataProductName: "Pedidos no WhatsApp da Menuthere",
      structuredDataProductDescription:
        "Sistema de pedidos por WhatsApp para restaurantes. O cliente manda 'Oi', recebe na hora um link de acesso automático, pede em um cardápio web visual e acompanha o status do pedido ao vivo no WhatsApp.",
      heroBadge: "Pedidos no WhatsApp",
      heroBadgeNew: "NOVO",
      heroTitle: "Seus clientes pedem só mandando um “Oi”.",
      heroSubtitle:
        "Transforme o seu número de WhatsApp no canal de pedidos mais fácil que você tem. Um simples “Oi” dá a cada cliente um link instantâneo, com acesso automático, para o seu cardápio — sem instalar app, sem cadastro, sem OTP. Você fica com o cliente e paga zero de comissão.",
      primaryCta: "Começar grátis",
      heroTrust1: "Sem baixar app",
      heroTrust2: "Sem cadastro nem OTP",
      heroTrust3: "0% de comissão",
      stepsHeading: "Mande “Oi”. O funil é esse.",
      stepsSubheading:
        "O maior motivo de carrinho abandonado é o atrito — download, cadastro, senha. Pedir pelo WhatsApp elimina tudo isso. São quatro passos, e o cliente nunca sai de um canal em que já confia.",
      step1Title: "O cliente manda “Oi”",
      step1Body:
        "De um adesivo, do QR da mesa, do link da bio ou do perfil no Google, o cliente toca e manda um Oi para o seu número. Sem app para baixar, sem formulário para preencher.",
      step2Title: "Ele recebe na hora um link Pedir agora",
      step2Body:
        "O seu número responde em um segundo com um botão Pedir agora. O link já faz o login sozinho — sem OTP, sem senha, sem criar conta.",
      step3Title: "Ele pede no seu cardápio visual",
      step3Body:
        "O link abre o seu cardápio web, com a sua marca — e já logado. Ele vê as fotos, monta o carrinho, escolhe UPI ou dinheiro e fecha o pedido em poucos toques.",
      step4Title: "As atualizações voltam pelo WhatsApp",
      step4Body:
        "Pedido recebido, aceito, comida pronta, saiu para entrega com link de rastreio ao vivo, entregue — e ainda os pontos de fidelidade. Cada atualização chega direto na conversa.",
      featuresHeading: "Feito para converter, não só para conversar.",
      featuresSubheading:
        "Tudo o que você precisa para vender pelo WhatsApp como gente grande — com a sua marca e nas suas regras.",
      feature1Title: "Sem app, sem cadastro",
      feature1Body:
        "Funciona em qualquer celular que tenha WhatsApp. Mandar “Oi” já cria e reconhece o cliente nos bastidores, então ele nunca esbarra em tela de login.",
      feature2Title: "O seu próprio número, com a sua marca",
      feature2Body:
        "Conecte o seu número real do WhatsApp Business em minutos pela Meta — até aquele que você já usa. Ou entre no ar na hora com o nosso número compartilhado.",
      feature3Title: "Links de pedido em domínio próprio",
      feature3Body:
        "Os links de pedido podem rodar no seu domínio (suamarca.com), e não em uma URL genérica de terceiros — assim todo ponto de contato continua sendo seu.",
      feature4Title: "Atualizações de status automáticas",
      feature4Body:
        "Pedido feito com a conta completa, aceito, pronto, despachado com link de mapa ao vivo, concluído e pontos de fidelidade — tudo enviado sozinho.",
      feature5Title: "Links seguros de uso único",
      feature5Body:
        "Todo link é assinado, expira em minutos e trava no primeiro que abrir — um link encaminhado nunca consegue sequestrar a sessão de outra pessoa.",
      feature6Title: "Fluxos de mensagem sem código",
      feature6Body:
        "As mensagens de boas-vindas e de pedido são fluxos editáveis, com gatilhos por palavra-chave, botões e mídia — mude o texto sem tocar em código.",
      feature7Title: "Caixa de entrada unificada do WhatsApp",
      feature7Body:
        "Toda mensagem recebida e enviada fica salva e visível no seu painel, então nada escapa no meio da correria.",
      feature8Title: "Relatórios por canal",
      feature8Body:
        "Os pedidos feitos pelo WhatsApp são marcados automaticamente. Compare lado a lado a quantidade e o faturamento de App, Site e WhatsApp.",
      frictionHeading: "Conte os toques. O cliente conta.",
      frictionSubheading:
        "Cada passo a mais entre a fome e o pedido é um cliente que você perde. Aqui está o mesmo pedido, de dois jeitos.",
      frictionAggregatorLabel: "App agregador",
      frictionAggregatorStep1: "Instalar o app",
      frictionAggregatorStep2: "Cadastrar + confirmar OTP",
      frictionAggregatorStep3: "Procurar o seu restaurante",
      frictionAggregatorStep4: "Pedir (eles ficam com 20–33%)",
      frictionAggregatorStep5: "Você nunca vê o cliente",
      frictionWhatsappLabel: "Pedidos no WhatsApp",
      frictionWhatsappStep1: "Mandar “Oi”",
      frictionWhatsappStep2: "Tocar em Pedir agora (já logado)",
      frictionWhatsappStep3: "Pedir no seu cardápio",
      frictionHighlight: "100% do valor do pedido fica com você.",
      comparisonHeading: "Como se compara.",
      comparisonSubheading:
        "Pedidos no WhatsApp da Menuthere x aplicativos de delivery x ferramentas genéricas de “chatbot”.",
      comparisonColAggregators: "Aplicativos de delivery",
      comparisonColChatbots: "Chatbots genéricos",
      comparisonValueYes: "Sim",
      comparisonValueNo: "Não",
      comparisonRow1Label: "Comissão por pedido",
      comparisonRow1Aggregator: "20–33%",
      comparisonRow1Chatbot: "Mensalidade + por mensagem",
      comparisonRow2Label: "Precisa baixar app",
      comparisonRow2Us: "Nunca",
      comparisonRow3Label: "Login / OTP do cliente",
      comparisonRow3Us: "Automático — nenhum",
      comparisonRow3Aggregator: "Conta + OTP",
      comparisonRow3Chatbot: "Quase sempre exigido",
      comparisonRow4Label: "Experiência de pedido",
      comparisonRow4Us: "Cardápio visual completo, com fotos",
      comparisonRow4Aggregator: "Dentro do app deles",
      comparisonRow4Chatbot: "Digitar os itens no chat",
      comparisonRow5Label: "Envia do seu próprio número",
      comparisonRow5Chatbot: "Às vezes",
      comparisonRow6Label: "Pedido e entrega rastreados ao vivo",
      comparisonRow6Us: "No WhatsApp",
      comparisonRow6Aggregator: "No app deles",
      comparisonRow6Chatbot: "Raramente",
      comparisonRow7Label: "Os dados do cliente são seus",
      comparisonRow7Us: "Sim, totalmente",
      comparisonRow7Chatbot: "Em parte",
      comparisonRow8Label: "Tempo de configuração",
      comparisonRow8Us: "Minutos",
      comparisonRow8Aggregator: "Semanas de onboarding",
      comparisonRow8Chatbot: "Dias + programação",
      outcome1Value: "≈ 10 s",
      outcome1Label: "Do “Oi” até um link de pedido na mão do cliente.",
      outcome2Label:
        "De comissão. Cada centavo do valor do pedido continua sendo seu.",
      outcome3Value: "Ponta a ponta",
      outcome3Label:
        "Feito → aceito → saiu para entrega → rastreado, tudo no WhatsApp.",
      faqHeading: "Perguntas, respondidas.",
      faq1Question: "Meus clientes precisam instalar alguma coisa?",
      faq1Answer:
        "Não. Basta ter WhatsApp para pedir. Eles mandam “Oi”, tocam no link Pedir agora e já caem no seu cardápio — logados. Não tem app para baixar nem conta para criar.",
      faq2Question: "O cliente digita o pedido dentro da conversa?",
      faq2Answer:
        "Não — e é justamente esse o ponto. O WhatsApp é a porta de entrada, não o caixa. O “Oi” entrega na hora um link para o seu cardápio visual de verdade, com fotos, categorias e busca, então pedir é rápido e o erro é raro. Depois, as atualizações de status voltam pelo WhatsApp.",
      faq3Question: "Dá para enviar do meu próprio número de WhatsApp?",
      faq3Answer:
        "Sim. Você conecta o seu número do WhatsApp Business pelo onboarding oficial da Meta em poucos minutos — inclusive um número que já usa no app WhatsApp Business. Prefere zero configuração? Entre no ar na hora com o nosso número compartilhado e mude depois.",
      faq4Question: "É seguro compartilhar o link de pedido?",
      faq4Answer:
        "Cada link é assinado criptograficamente, expira em minutos e trava na primeira pessoa que abrir. Se alguém encaminhar, simplesmente não funciona para mais ninguém — então uma sessão logada nunca vaza.",
      faq5Question: "O que o cliente recebe depois de pedir?",
      faq5Answer:
        "Mensagens automáticas no WhatsApp em cada etapa: pedido recebido com a conta completa, aceito, comida pronta, saiu para entrega com link de rastreio ao vivo, concluído e pontos de fidelidade acumulados (se você tiver programa de fidelidade).",
      faq6Question: "Quanto de comissão a Menuthere cobra?",
      faq6Answer:
        "Zero de comissão nos pedidos. Os pedidos no WhatsApp fazem parte do seu canal direto — você fica com 100% do valor de cada pedido, e o pagamento cai direto na sua conta.",
      faqCtaPrompt: "Pronto para deixar o cliente pedir com um simples “Oi”?",
      faqSecondaryLink: "Conheça os pedidos sem comissão",
      trialHeading:
        "Coloque o seu sistema de pedidos no WhatsApp no ar em menos de 2 minutos.",
      trialDescription:
        "Conecte o seu número de WhatsApp, suba o cardápio e deixe o cliente pedir com um simples “Oi” — link de acesso automático, status ao vivo e zero comissão. Junte-se a mais de 600 restaurantes que já crescem com a Menuthere.",
    },
  },
  solutionsSlug: {
    heroPrimaryCta: "Começar grátis",
    heroSecondaryCta: "Agendar demo",
    benefitsHeadingLead: "Por que escolher a Menuthere",
    benefitsHeadingIndustry: "para {industry}?",
    benefitsHeadingIndustryFallback: "o seu negócio",
    benefitsSubheading: "Recursos feitos sob medida para o seu setor.",
    featuresHeadingLead: "Tudo o que você precisa",
    featuresHeadingEmphasis: "para dar certo.",
    featuresSubheading:
      "Um kit completo pensado para modernizar o seu cardápio e encantar os seus clientes.",
    featuresCtaCardHeading: "Pronto para começar?",
    featuresCtaCardBody:
      "Junte-se a milhares de negócios que já usam a Menuthere para transformar a experiência do cardápio.",
    featuresCtaCardButton: "Testar grátis",
    useCasesHeadingLead: "Perfeito para todo tipo",
    useCasesHeadingIndustry: "de {industry}.",
    useCasesHeadingIndustryFallback: "negócio",
    faqHeadingLead: "Perguntas",
    faqHeadingEmphasis: "frequentes.",
    notFoundMetaTitle: "Solução não encontrada",
    breadcrumbHome: "Início",
    breadcrumbSolutions: "Soluções",
  },
  downloadApp: {
    heroHeadingLead: "Menuthere para",
    heroHeadingHighlight: "celular e desktop.",
    heroSubheading:
      "Gerencie o seu restaurante na rua ou na mesa do escritório. Receba notificação de pedido em tempo real, atualize o cardápio e acompanhe as vendas em todos os aparelhos.",
    appStoreBadgePrefix: "Baixe na",
    playStoreBadgePrefix: "Disponível no",
    windowsBadgePrefix: "Baixe para",
    windowsBadgePlatform: "Windows",
    heroImageAlt: "Interface do app Menuthere",
  },
  blog: {
    metaTitle: "Blog | Menuthere - Insights para restaurantes e cafés",
    metaDescription:
      "Dicas, guias e insights para donos de restaurante sobre cardápio digital, QR code, sync com Google Business e crescimento do negócio de alimentação.",
    ogTitle: "Blog | Menuthere",
    ogDescription:
      "Dicas, guias e insights para donos de restaurante sobre cardápio digital, QR code e crescimento do negócio de alimentação.",
    heroHeading: "Novidades e insights",
    heroHeadingAccent: "da Menuthere",
    categoryLabel: "Blog",
    emptyState: "Nenhum artigo publicado ainda. Fique de olho!",
    postMetaTitleTemplate: "{title} | Blog da Menuthere",
    postNotFoundMetaTitle: "Post não encontrado",
    backToIndexLink: "← Blog",
    relatedHeading: "Mais artigos",
  },
};

export default pt;
