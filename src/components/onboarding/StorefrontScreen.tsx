"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Phone, Mail, ArrowRight, Star, Menu as MenuIcon, X, ChevronDown } from "lucide-react";

const BRAND_COLOR_MAP: Record<string, string> = {
    "burnt-orange": "#e85d04",
    "obsidian-gold": "#b8860b",
    "royal-burgundy": "#8b1a4a",
    "midnight-emerald": "#0d6b4e",
    "sapphire": "#1e4db7",
    "charcoal-noir": "#2c2c2c",
    "deep-violet": "#6b21a8",
    "rose-blush": "#be185d",
    "teal-luxe": "#0f766e",
    "warm-copper": "#b45309",
};

interface NavbarLink {
    id: string;
    label: string;
    url: string;
    children?: NavbarLink[];
}

interface StorefrontData {
    enabled: boolean;
    logoType: "emoji" | "image";
    logoEmoji: string;
    logoImage: string;
    brandName: string;
    brandColor?: string;
    sections: StorefrontSection[];
}

function buildNavLinks(): NavbarLink[] {
    if (typeof window === "undefined") return [];
    const username = window.location.pathname.split("/").filter(Boolean)[0] || "";
    const base = username ? `/${username}` : "";
    return [
        { id: "about-us", label: "About Us", url: `${base}/about-us` },
        { id: "contact-us", label: "Contact Us", url: `${base}/contact-us` },
        {
            id: "policies",
            label: "Privacy Policy",
            url: `${base}/privacy-policy`,
            children: [
                { id: "pp", label: "Privacy Policy", url: `${base}/privacy-policy` },
                { id: "rc", label: "Refund & Cancellation", url: `${base}/refund-and-cancellation-policy` },
                { id: "tc", label: "Terms & Conditions", url: `${base}/terms-and-conditions` },
                { id: "sd", label: "Shipping & Delivery", url: `${base}/shipping-and-delivery-policy` },
            ],
        },
    ];
}

interface StorefrontSection {
    id: string;
    type: string;
    enabled: boolean;
    content: Record<string, any>;
}

interface StorefrontScreenProps {
    storefront: StorefrontData;
    storeName: string;
    storeBanner?: string;
    onContinue: () => void;
}

function cn(...classes: (string | boolean | undefined | null)[]) {
    return classes.filter(Boolean).join(" ");
}

function Html({ html, className, style, as: Tag = "div" }: { html: string; className?: string; style?: React.CSSProperties; as?: any }) {
    return <Tag className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function StorefrontScreen({ storefront, storeName, storeBanner, onContinue }: StorefrontScreenProps) {
    const brandName = storefront?.brandName || storeName;
    const sections = storefront?.sections || [];
    const bc = storefront?.brandColor || "burnt-orange";
    const accent = bc.startsWith("custom:") ? bc.replace("custom:", "") : (BRAND_COLOR_MAP[bc] || "#e85d04");

    return (
        <div className="min-h-dvh bg-white flex flex-col overflow-x-hidden scrollbar-hidden">
            <StorefrontHeader storefront={storefront} brandName={brandName} storeBanner={storeBanner} onContinue={onContinue} accent={accent} />
            <main className="flex-1">
                {sections.map((sec) => (
                    <SectionRenderer key={sec.id} section={sec} storefront={storefront} brandName={brandName} storeBanner={storeBanner} onContinue={onContinue} accent={accent} />
                ))}
            </main>
        </div>
    );
}

/* ================== HEADER ================== */
function StorefrontHeader({ storefront, brandName, storeBanner, onContinue, accent }: { storefront: StorefrontData; brandName: string; storeBanner?: string; onContinue: () => void; accent: string }) {
    const [open, setOpen] = useState(false);

    return (
        <header className="sticky top-0 z-40 w-full border-b border-black/5 bg-white/90 backdrop-blur-xl hidden">
            <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 lg:px-8">
                <div className="flex items-center gap-2">
                    {storeBanner ? (
                        <img
                            src={storeBanner}
                            alt={brandName}
                            className="h-9 w-9 rounded-full object-cover ring-1 ring-black/10"
                        />
                    ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                            {(brandName || "R").charAt(0)}
                        </span>
                    )}
                    <span className="text-base font-extrabold tracking-tight">
                        {brandName}
                    </span>
                </div>

                {/* Desktop nav */}
                <nav className="ml-auto hidden md:flex items-center gap-1">
                    {["Home", "Menu"].map((label) => (
                        <button
                            key={label}
                            onClick={onContinue}
                            className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
                        >
                            {label}
                        </button>
                    ))}
                    <button
                        onClick={onContinue}
                        className="ml-2 rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition"
                    >
                        Order Online
                    </button>
                </nav>

                {/* Mobile hamburger */}
                <button
                    onClick={() => setOpen((v) => !v)}
                    className="ml-auto flex md:hidden h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition"
                    aria-label="Toggle menu"
                >
                    {open ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
                </button>
            </div>

            {open && (
                <div className="mx-auto max-w-6xl border-t bg-white/95 px-4 py-3 md:hidden">
                    <nav className="flex flex-col gap-1">
                        {["Home", "Order Online", "Menu"].map((label) => (
                            <button
                                key={label}
                                onClick={() => { setOpen(false); onContinue(); }}
                                className="rounded-lg px-3 py-2 text-sm font-bold text-gray-900 hover:bg-gray-100 text-left"
                            >
                                {label}
                            </button>
                        ))}
                    </nav>
                </div>
            )}
        </header>
    );
}

/* ================== SECTION RENDERER ================== */
function SectionRenderer({
    section,
    storefront,
    brandName,
    storeBanner,
    onContinue,
    accent,
}: {
    section: StorefrontSection;
    storefront: StorefrontData;
    brandName: string;
    storeBanner?: string;
    onContinue: () => void;
    accent: string;
}) {
    if (!section?.enabled) return null;

    switch (section.type) {
        case "navbar": return <NavbarSection content={section.content} brandName={brandName} storeBanner={storeBanner} onContinue={onContinue} accent={accent} />;
        case "hero": return <HeroSection content={section.content} onContinue={onContinue} accent={accent} />;
        case "carousel": return <BannerCarousel content={section.content} />;
        case "imageText": return <ImageTextBlock content={section.content} onContinue={onContinue} />;
        case "cta": return <CTASection content={section.content} onContinue={onContinue} accent={accent} />;
        case "testimonials": return <TestimonialsSection content={section.content} accent={accent} />;
        case "about": return <AboutSection content={section.content} />;
        case "footer": return <FooterSection content={section.content} brandName={brandName} storeBanner={storeBanner} accent={accent} />;
        case "customHtml": return <CustomHtmlSection content={section.content} />;
        default: return null;
    }
}

/* ================== CTA ACTION ================== */
function CtaAction({
    link,
    onContinue,
    className,
    style,
    children,
}: {
    link?: string;
    onContinue: () => void;
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
}) {
    const trimmed = (link || "").trim();
    if (!trimmed || trimmed === "/") {
        const handleClick = () => {
            if (typeof window !== "undefined" && window.location.search) {
                window.history.replaceState(null, "", window.location.pathname);
            }
            onContinue();
        };
        return (
            <button onClick={handleClick} className={className} style={style}>
                {children}
            </button>
        );
    }
    const isExternal = /^(https?:|tel:|mailto:)/i.test(trimmed);
    const isHttp = /^https?:/i.test(trimmed);
    return (
        <a
            href={trimmed}
            target={isHttp ? "_blank" : undefined}
            rel={isHttp ? "noopener noreferrer" : undefined}
            className={className}
            style={style}
        >
            {children}
        </a>
    );
}

/* ================== NAV LINK ITEMS (desktop / mobile) ================== */
function DesktopNavItem({ link, accent }: { link: NavbarLink; accent: string }) {
    const [open, setOpen] = useState(false);
    const childrenVisible = link.children || [];
    const hasChildren = childrenVisible.length > 0;
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleEnter = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        if (hasChildren) setOpen(true);
    };
    const handleLeave = () => {
        if (!hasChildren) return;
        closeTimer.current = setTimeout(() => setOpen(false), 120);
    };

    if (!hasChildren) {
        return (
            <a
                href={link.url}
                className="group relative inline-flex px-3 py-2 text-[13px] font-semibold text-gray-700 transition-colors hover:text-gray-900"
            >
                <span>{link.label}</span>
                <span
                    className="pointer-events-none absolute inset-x-3 -bottom-0.5 h-[2px] origin-center scale-x-0 rounded-full transition-transform duration-300 group-hover:scale-x-100"
                    style={{ backgroundColor: accent }}
                />
            </a>
        );
    }

    return (
        <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="menu"
                className="group relative inline-flex items-center gap-1 px-3 py-2 text-[13px] font-semibold text-gray-700 transition-colors hover:text-gray-900"
            >
                <span>{link.label}</span>
                <ChevronDown
                    className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        open && "rotate-180"
                    )}
                />
                <span
                    className="pointer-events-none absolute inset-x-3 -bottom-0.5 h-[2px] origin-center scale-x-0 rounded-full transition-transform duration-300 group-hover:scale-x-100"
                    style={{ backgroundColor: accent }}
                />
            </button>
            <div
                role="menu"
                className={cn(
                    "absolute left-0 top-full mt-1 min-w-[220px] origin-top rounded-xl border border-black/5 bg-white p-1.5 shadow-xl ring-1 ring-black/5 transition-all duration-200",
                    open
                        ? "opacity-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 -translate-y-1 pointer-events-none"
                )}
            >
                {childrenVisible.map((child) => (
                    <a
                        key={child.id}
                        href={child.url}
                        role="menuitem"
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
                    >
                        <span>{child.label}</span>
                    </a>
                ))}
            </div>
        </div>
    );
}

function MobileNavItem({
    link,
    onLinkClick,
}: {
    link: NavbarLink;
    onLinkClick: () => void;
}) {
    const [open, setOpen] = useState(false);
    const childrenVisible = link.children || [];
    const hasChildren = childrenVisible.length > 0;

    if (!hasChildren) {
        return (
            <a
                href={link.url}
                onClick={onLinkClick}
                className="flex items-center justify-between rounded-xl px-3 py-3.5 text-[15px] font-bold text-gray-900 transition hover:bg-gray-100 active:bg-gray-200"
            >
                <span>{link.label}</span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
            </a>
        );
    }

    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3.5 text-[15px] font-bold text-gray-900 transition hover:bg-gray-100 active:bg-gray-200"
            >
                <span>{link.label}</span>
                <ChevronDown
                    className={cn(
                        "h-4 w-4 text-gray-400 transition-transform duration-200",
                        open && "rotate-180"
                    )}
                />
            </button>
            <div
                className={cn(
                    "grid overflow-hidden transition-all duration-300 ease-out",
                    open ? "grid-rows-[1fr] opacity-100 mt-0.5" : "grid-rows-[0fr] opacity-0"
                )}
            >
                <div className="min-h-0">
                    <ul className="ml-3 border-l-2 border-gray-100 pl-2 py-1 flex flex-col gap-0.5">
                        {childrenVisible.map((child) => (
                            <li key={child.id}>
                                <a
                                    href={child.url}
                                    onClick={onLinkClick}
                                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[14px] font-semibold text-gray-700 transition hover:bg-gray-100 active:bg-gray-200"
                                >
                                    <span>{child.label}</span>
                                    <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

/* ================== NAVBAR ================== */
function NavbarSection({
    content,
    brandName,
    storeBanner,
    onContinue,
    accent,
}: {
    content: Record<string, any>;
    brandName: string;
    storeBanner?: string;
    onContinue: () => void;
    accent: string;
}) {
    const showLogo = content?.showLogo !== false;
    const sticky = content?.sticky !== false;
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [navbarLinks, setNavbarLinks] = useState<NavbarLink[]>([]);

    useEffect(() => {
        setNavbarLinks(buildNavLinks());
    }, []);

    useEffect(() => {
        if (!sticky) return;
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [sticky]);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    const Logo = (
        <>
            {storeBanner ? (
                <img
                    src={storeBanner}
                    alt={brandName}
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-black/10 shadow-sm"
                />
            ) : (
                <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ring-1 ring-black/10"
                    style={{ backgroundColor: accent }}
                >
                    {(brandName || "R").charAt(0)}
                </span>
            )}
            <span className="text-[15px] font-extrabold tracking-tight text-gray-900 leading-none">
                {brandName}
            </span>
        </>
    );

    return (
        <>
            <header
                className={cn(
                    "z-40 w-full transition-all duration-300",
                    sticky && "sticky top-0",
                    scrolled
                        ? "bg-white/95 backdrop-blur-xl border-b border-black/5 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.12)]"
                        : "bg-white/85 backdrop-blur-md border-b border-transparent"
                )}
            >
                <div
                    className={cn(
                        "mx-auto flex max-w-6xl items-center gap-4 px-4 transition-all duration-300 lg:px-8",
                        scrolled ? "h-14" : "h-16 lg:h-[68px]"
                    )}
                >
                    {showLogo && (
                        <a
                            href="#top"
                            onClick={(e) => {
                                e.preventDefault();
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
                        >
                            {Logo}
                        </a>
                    )}

                    {/* Desktop nav */}
                    <nav className="ml-auto hidden items-center md:flex">
                        <ul className="flex items-center gap-0.5">
                            {navbarLinks.map((link) => (
                                <li key={link.id}>
                                    <DesktopNavItem link={link} accent={accent} />
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={onContinue}
                            className="ml-4 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                            style={{ backgroundColor: accent, boxShadow: `0 8px 22px -10px ${accent}` }}
                        >
                            Order Online
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </nav>

                    {/* Mobile right cluster */}
                    <div className="ml-auto flex items-center gap-2 md:hidden">
                        <button
                            onClick={onContinue}
                            className="rounded-full px-4 py-2 text-xs font-bold text-white transition-transform active:scale-95"
                            style={{ backgroundColor: accent, boxShadow: `0 6px 16px -8px ${accent}` }}
                        >
                            Order
                        </button>
                        <button
                            onClick={() => setOpen((v) => !v)}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-900 transition active:scale-95 hover:bg-gray-100"
                            aria-label={open ? "Close menu" : "Open menu"}
                            aria-expanded={open}
                        >
                            {open ? (
                                <X className="h-5 w-5" strokeWidth={2.25} />
                            ) : (
                                <MenuIcon className="h-5 w-5" strokeWidth={2.25} />
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile drawer */}
            <div
                className={cn(
                    "fixed inset-0 z-50 md:hidden",
                    open ? "pointer-events-auto" : "pointer-events-none"
                )}
                aria-hidden={!open}
            >
                <button
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    tabIndex={open ? 0 : -1}
                    className={cn(
                        "absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-300",
                        open ? "opacity-100" : "opacity-0"
                    )}
                />
                <aside
                    className={cn(
                        "absolute right-0 top-0 flex h-full w-[84%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
                        open ? "translate-x-0" : "translate-x-full"
                    )}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-4">
                        {showLogo ? (
                            <div className="flex min-w-0 items-center gap-2.5">{Logo}</div>
                        ) : <span />}
                        <button
                            onClick={() => setOpen(false)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-gray-100"
                            aria-label="Close menu"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex flex-1 flex-col overflow-y-auto px-5 py-5">
                        <p className="px-2 pb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">
                            Menu
                        </p>
                        <nav>
                            <ul className="flex flex-col gap-0.5">
                                {navbarLinks.map((link) => (
                                    <li key={link.id}>
                                        <MobileNavItem
                                            link={link}
                                            onLinkClick={() => setOpen(false)}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </nav>

                        <div className="mt-auto pt-6">
                            <button
                                onClick={() => { setOpen(false); onContinue(); }}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white transition active:scale-[0.98]"
                                style={{ backgroundColor: accent, boxShadow: `0 10px 28px -10px ${accent}` }}
                            >
                                Order Online
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        </>
    );
}

/* ================== HERO ================== */
function HeroSection({ content, onContinue, accent }: { content: Record<string, any>; onContinue: () => void; accent: string }) {
    const { ctaPrimary, ctaSecondary, autoScrollInterval = 5 } = content || {};

    const slides: any[] = content.slides || (content.heading ? [{
        heading: content.heading,
        subheading: content.subheading,
        eyebrow: content.eyebrow,
        backgroundImage: content.backgroundImage,
        overlayOpacity: content.overlayOpacity ?? 55,
    }] : []);

    const [current, setCurrent] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const touchStartRef = useRef<number>(0);
    const touchStartYRef = useRef<number>(0);

    const goTo = useCallback((index: number) => {
        if (isTransitioning || slides.length <= 1) return;
        setIsTransitioning(true);
        setCurrent(index);
        setTimeout(() => setIsTransitioning(false), 700);
    }, [isTransitioning, slides.length]);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (slides.length > 1) {
            timerRef.current = setInterval(() => {
                setCurrent((prev) => (prev + 1) % slides.length);
            }, autoScrollInterval * 1000);
        }
    }, [slides.length, autoScrollInterval]);

    useEffect(() => {
        resetTimer();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [resetTimer]);

    const sectionRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (slides.length <= 1) return;
        const el = sectionRef.current;
        if (!el) return;

        const onStart = (e: TouchEvent) => {
            touchStartRef.current = e.touches[0].clientX;
            touchStartYRef.current = e.touches[0].clientY;
        };
        const onEnd = (e: TouchEvent) => {
            const diffX = touchStartRef.current - e.changedTouches[0].clientX;
            const diffY = touchStartYRef.current - e.changedTouches[0].clientY;
            if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
                setCurrent((prev) => diffX > 0 ? (prev + 1) % slides.length : (prev - 1 + slides.length) % slides.length);
                resetTimer();
            }
        };

        el.addEventListener("touchstart", onStart, { passive: true });
        el.addEventListener("touchend", onEnd, { passive: true });
        return () => {
            el.removeEventListener("touchstart", onStart);
            el.removeEventListener("touchend", onEnd);
        };
    }, [slides.length, resetTimer]);

    if (!slides.length) return null;
    const slide = slides[current] || slides[0];

    return (
        <section ref={sectionRef} className="relative overflow-hidden">
            {slides.map((s: any, i: number) => (
                <img
                    key={s.id || i}
                    src={s.backgroundImage}
                    alt=""
                    className={cn(
                        "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
                        i === current ? "opacity-100" : "opacity-0"
                    )}
                />
            ))}
            <div
                className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/90"
                style={{ opacity: (slide.overlayOpacity ?? 55) / 100 + 0.2 }}
            />

            <div className="relative mx-auto flex min-h-[100dvh] max-w-6xl flex-col justify-end px-6 pb-14 pt-28 text-white lg:px-8 lg:min-h-[100dvh]">
                <div key={current} className="animate-[fadeUp_0.6s_ease-out]">
                    {slide.eyebrow && (
                        <Html html={slide.eyebrow} as="span" className="inline-flex w-fit items-center rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white shadow-lg lg:text-xs lg:px-4 lg:py-2" style={{ backgroundColor: accent }} />
                    )}
                    <Html html={slide.heading} as="h1" className="mt-5 text-[38px] font-extrabold leading-[1.05] tracking-tight drop-shadow-lg sm:text-5xl lg:text-6xl lg:max-w-2xl" />
                    {slide.subheading && (
                        <Html html={slide.subheading} as="p" className="mt-4 max-w-md text-[15px] font-medium leading-relaxed text-white/90 drop-shadow sm:text-base lg:text-lg lg:max-w-xl" />
                    )}
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                    {ctaPrimary?.label && (
                        <CtaAction
                            link={ctaPrimary.link}
                            onContinue={onContinue}
                            className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold text-white shadow-xl transition lg:px-8 lg:py-3.5 lg:text-base"
                            style={{ backgroundColor: accent }}
                        >
                            {ctaPrimary.label}
                        </CtaAction>
                    )}
                    {ctaSecondary?.label && (
                        <CtaAction
                            link={ctaSecondary.link}
                            onContinue={onContinue}
                            className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/20 transition lg:px-8 lg:py-3.5 lg:text-base"
                        >
                            {ctaSecondary.label}
                        </CtaAction>
                    )}

                    {slides.length > 1 && (
                        <div className="ml-auto flex gap-1.5">
                            {slides.map((_: any, i: number) => (
                                <button
                                    key={i}
                                    onClick={() => { goTo(i); resetTimer(); }}
                                    className={cn(
                                        "h-2 rounded-full transition-all duration-300",
                                        i === current ? "w-6 bg-white" : "w-2 bg-white/50"
                                    )}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

/* ================== BANNER CAROUSEL ================== */
function BannerCarousel({ content }: { content: Record<string, any> }) {
    const { title, slides = [] } = content || {};
    if (!slides.length) return null;

    return (
        <section className="bg-white py-10 lg:py-16">
            {title && (
                <div className="mx-auto max-w-6xl px-6 lg:px-8">
                    <Html html={title} as="h2" className="text-2xl font-extrabold tracking-tight lg:text-3xl" />
                </div>
            )}
            <div className="mx-auto max-w-6xl mt-5 flex gap-4 overflow-x-auto px-6 lg:px-8 pb-2 snap-x snap-mandatory lg:gap-6" style={{ scrollbarWidth: "none" }}>
                {slides.map((s: any) => (
                    <article
                        key={s.id}
                        className="relative h-72 w-[86%] sm:w-[60%] lg:w-[40%] shrink-0 snap-start overflow-hidden rounded-2xl bg-gray-100 shadow-md ring-1 ring-black/5"
                    >
                        {s.image && (
                            <img src={s.image} alt={s.heading} className="absolute inset-0 h-full w-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 text-white">
                            {s.heading && (
                                <Html html={s.heading} as="h3" className="text-xl font-extrabold leading-tight drop-shadow" />
                            )}
                            {s.description && (
                                <Html html={s.description} as="p" className="line-clamp-2 text-[13px] font-medium leading-snug text-white/90 drop-shadow" />
                            )}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

/* ================== IMAGE + TEXT ================== */
function ImageTextBlock({ content, onContinue }: { content: Record<string, any>; onContinue: () => void }) {
    const { image, heading, description, ctaLabel, ctaLink, imagePosition = "top" } = content || {};

    const imageBlock = image && (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 lg:aspect-auto lg:h-full lg:min-h-[400px]">
            <img src={image} alt={heading} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105" loading="lazy" />
        </div>
    );

    const textBlock = (
        <div className="px-6 py-10 sm:py-12 lg:px-10 lg:py-16 lg:flex lg:flex-col lg:justify-center">
            {heading && (
                <Html html={heading} as="h2" className="text-[28px] font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-3xl lg:text-4xl" />
            )}
            {description && (
                <Html html={description} as="div" className="mt-4 text-[15px] leading-[1.7] text-gray-600 lg:text-base lg:max-w-lg" />
            )}
            {ctaLabel && (
                <CtaAction
                    link={ctaLink}
                    onContinue={onContinue}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-gray-800 transition lg:px-6 lg:py-3"
                >
                    {ctaLabel} <ArrowRight className="h-4 w-4" />
                </CtaAction>
            )}
        </div>
    );

    const isBottom = imagePosition === "bottom";

    return (
        <section className="bg-white">
            <div className={cn(
                "mx-auto max-w-6xl flex",
                isBottom ? "flex-col-reverse" : "flex-col",
                !isBottom && image && "lg:grid lg:grid-cols-2 lg:gap-0"
            )}>
                {imageBlock}
                {textBlock}
            </div>
        </section>
    );
}

/* ================== CTA ================== */
function CTASection({ content, onContinue, accent }: { content: Record<string, any>; onContinue: () => void; accent: string }) {
    const { heading, description, ctaLabel, ctaLink, backgroundImage, variant = "primary" } = content || {};

    const variants: Record<string, string> = {
        primary: "text-white",
        dark: "bg-gray-900 text-white",
        light: "bg-gray-100 text-gray-900",
    };

    return (
        <section
            className={cn("relative overflow-hidden", variants[variant] || variants.primary)}
            style={variant === "primary" ? { backgroundColor: accent } : undefined}
        >
            {backgroundImage && (
                <>
                    <img src={backgroundImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
                    <div className="absolute inset-0 bg-black/50" />
                </>
            )}
            <div className="relative mx-auto max-w-6xl px-6 py-14 text-center lg:px-8 lg:py-20">
                {heading && (
                    <Html html={heading} as="h2" className="mx-auto max-w-lg text-[28px] font-extrabold leading-[1.1] tracking-tight sm:text-3xl lg:text-4xl lg:max-w-2xl" />
                )}
                {description && (
                    <Html html={description} as="div" className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed opacity-90 lg:text-base lg:max-w-xl" />
                )}
                {ctaLabel && (
                    <CtaAction
                        link={ctaLink}
                        onContinue={onContinue}
                        className={cn(
                            "mt-7 inline-flex items-center justify-center rounded-full px-7 py-3 text-sm font-bold shadow-xl transition lg:px-8 lg:py-3.5 lg:text-base",
                            (variant === "primary" || variant === "dark")
                                ? "bg-white text-gray-900 hover:bg-white/90"
                                : "bg-gray-900 text-white hover:bg-gray-800"
                        )}
                    >
                        {ctaLabel}
                    </CtaAction>
                )}
            </div>
        </section>
    );
}

/* ================== TESTIMONIALS ================== */
function TestimonialsSection({ content, accent }: { content: Record<string, any>; accent: string }) {
    const { title, quotes = [] } = content || {};
    if (!quotes.length) return null;

    return (
        <section className="bg-gray-50 py-12 lg:py-16">
            <div className="mx-auto max-w-6xl px-6 lg:px-8">
                {title && <Html html={title} as="h2" className="text-2xl font-extrabold tracking-tight lg:text-3xl" />}
            </div>
            <div className="mx-auto max-w-6xl mt-6 flex gap-4 overflow-x-auto px-6 lg:px-8 pb-2 snap-x lg:gap-6 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:overflow-visible" style={{ scrollbarWidth: "none" }}>
                {quotes.map((q: any) => (
                    <figure
                        key={q.id}
                        className="flex w-[86%] sm:w-[70%] lg:w-auto shrink-0 lg:shrink snap-start flex-col gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
                    >
                        <span className="text-2xl" style={{ color: `${accent}B3` }}>&ldquo;</span>
                        <Html html={q.text} as="blockquote" className="text-[15px] leading-[1.7] text-gray-700" />
                        <figcaption className="mt-auto flex items-center justify-between border-t pt-4">
                            <span className="text-sm font-extrabold">{q.name}</span>
                            <span className="flex items-center gap-0.5">
                                {Array.from({ length: q.rating || 0 }).map((_, i) => (
                                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                ))}
                            </span>
                        </figcaption>
                    </figure>
                ))}
            </div>
        </section>
    );
}

/* ================== ABOUT ================== */
function AboutSection({ content }: { content: Record<string, any> }) {
    const { heading, description, image } = content || {};

    return (
        <section className="bg-white py-12 lg:py-16">
            <div className="mx-auto max-w-6xl px-6 lg:px-8">
                {image && (
                    <div className="mb-7 aspect-[16/10] w-full overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-black/5 lg:aspect-[21/9]">
                        <img src={image} alt={heading} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                )}
                <div className="lg:max-w-3xl">
                    {heading && (
                        <Html html={heading} as="h2" className="text-[28px] font-extrabold leading-[1.1] tracking-tight sm:text-3xl lg:text-4xl" />
                    )}
                    {description && (
                        <Html html={description} as="div" className="mt-4 text-[15px] leading-[1.7] text-gray-600 lg:text-base" />
                    )}
                </div>
            </div>
        </section>
    );
}

/* ================== FOOTER ================== */
function FooterSection({
    content,
    brandName,
    storeBanner,
    accent,
}: {
    content: Record<string, any>;
    brandName: string;
    storeBanner?: string;
    accent: string;
}) {
    const { description, phone, email, copyright, showLogo = true } = content || {};
    const [footerLinks, setFooterLinks] = useState<NavbarLink[]>([]);
    useEffect(() => {
        setFooterLinks(buildNavLinks());
    }, []);
    const hasLinks = footerLinks.length > 0;
    const hasFullContent = (showLogo !== false) || phone || email || hasLinks;

    if (!hasFullContent && !description && copyright) {
        return (
            <footer style={{ backgroundColor: accent }}>
                <div className="mx-auto max-w-6xl px-6 py-4 lg:px-8">
                    <Html html={copyright} as="p" className="text-center text-xs text-white/80" />
                </div>
            </footer>
        );
    }

    return (
        <footer style={{ backgroundColor: accent }}>
            <div className={cn(
                "mx-auto max-w-6xl px-6 lg:px-8",
                hasFullContent ? "py-12 lg:py-16" : "py-6 lg:py-8"
            )}>
                {hasFullContent && (
                    <div className="lg:flex lg:items-start lg:justify-between lg:gap-12">
                        <div className="lg:max-w-md">
                            {showLogo !== false && (
                                <div className="flex items-center gap-3">
                                    {storeBanner ? (
                                        <img
                                            src={storeBanner}
                                            alt=""
                                            className="h-11 w-11 rounded-full object-cover ring-2 ring-white/20"
                                        />
                                    ) : (
                                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-white">
                                            {(brandName || "R").charAt(0)}
                                        </span>
                                    )}
                                    <p className="text-xl font-extrabold text-white">{brandName}</p>
                                </div>
                            )}

                            {description && (
                                <Html html={description} as="div" className={cn(showLogo !== false ? "mt-4" : "", "max-w-md text-sm leading-relaxed text-white/80")} />
                            )}
                        </div>

                        {hasLinks && (
                            <div className="mt-7 lg:mt-0">
                                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/50 mb-3">Quick Links</p>
                                <ul className="space-y-2 text-sm">
                                    {footerLinks.map((link) => {
                                        const children = link.children || [];
                                        const hasChildren = children.length > 0;
                                        return (
                                            <li key={link.id}>
                                                {hasChildren ? (
                                                    <div>
                                                        <p className="font-semibold text-white">{link.label}</p>
                                                        <ul className="mt-1.5 space-y-1.5 pl-3 border-l border-white/15">
                                                            {children.map((child) => (
                                                                <li key={child.id}>
                                                                    <a
                                                                        href={child.url}
                                                                        className="text-white/80 hover:text-white"
                                                                    >
                                                                        {child.label}
                                                                    </a>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                ) : (
                                                    <a
                                                        href={link.url}
                                                        className="text-white/90 hover:text-white"
                                                    >
                                                        {link.label}
                                                    </a>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}

                        {(phone || email) && (
                            <div className="mt-7 space-y-2.5 text-sm lg:mt-0">
                                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/50 mb-3">Contact</p>
                                {phone && (
                                    <a href={`tel:${phone}`} className="flex items-center gap-2.5 text-white/90 hover:text-white">
                                        <Phone className="h-4 w-4" /> {phone}
                                    </a>
                                )}
                                {email && (
                                    <a href={`mailto:${email}`} className="flex items-center gap-2.5 text-white/90 hover:text-white">
                                        <Mail className="h-4 w-4" /> {email}
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {!hasFullContent && description && (
                    <Html html={description} as="div" className="text-sm leading-relaxed text-white/80 text-center" />
                )}

                {copyright && (
                    <div className={cn(hasFullContent ? "mt-10 border-t border-white/10 pt-5" : description ? "mt-4" : "")}>
                        <Html html={copyright} as="p" className={cn("text-xs text-white/60", !hasFullContent && "text-center")} />
                    </div>
                )}
            </div>
        </footer>
    );
}

/* ================== CUSTOM HTML ================== */
function CustomHtmlSection({ content }: { content: Record<string, any> }) {
    if (!content?.html) return null;
    return <div dangerouslySetInnerHTML={{ __html: content.html }} />;
}
