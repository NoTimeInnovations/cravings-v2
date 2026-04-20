"use client";

import { useState } from "react";
import { Phone, Mail, ArrowRight, Star, Menu as MenuIcon, X } from "lucide-react";

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

interface StorefrontData {
    enabled: boolean;
    logoType: "emoji" | "image";
    logoEmoji: string;
    logoImage: string;
    brandName: string;
    brandColor?: string;
    sections: StorefrontSection[];
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
        <div className="min-h-dvh bg-white flex flex-col overflow-x-hidden">
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
        <header className="sticky top-0 z-40 w-full border-b border-black/5 bg-white/90 backdrop-blur-xl">
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
        case "hero": return <HeroSection content={section.content} onContinue={onContinue} accent={accent} />;
        case "carousel": return <BannerCarousel content={section.content} />;
        case "imageText": return <ImageTextBlock content={section.content} onContinue={onContinue} />;
        case "cta": return <CTASection content={section.content} onContinue={onContinue} accent={accent} />;
        case "testimonials": return <TestimonialsSection content={section.content} accent={accent} />;
        case "about": return <AboutSection content={section.content} />;
        case "footer": return <FooterSection content={section.content} brandName={brandName} storeBanner={storeBanner} accent={accent} />;
        default: return null;
    }
}

/* ================== HERO ================== */
function HeroSection({ content, onContinue, accent }: { content: Record<string, any>; onContinue: () => void; accent: string }) {
    const {
        heading,
        subheading,
        eyebrow,
        backgroundImage,
        overlayOpacity = 55,
        ctaPrimary,
        ctaSecondary,
    } = content || {};

    return (
        <section className="relative overflow-hidden">
            {backgroundImage && (
                <img
                    src={backgroundImage}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                />
            )}
            <div
                className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/90"
                style={{ opacity: overlayOpacity / 100 + 0.2 }}
            />

            <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-6 pb-14 pt-28 text-white lg:px-8 lg:min-h-[85vh]">
                {eyebrow && (
                    <Html html={eyebrow} as="span" className="inline-flex w-fit items-center rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white shadow-lg lg:text-xs lg:px-4 lg:py-2" style={{ backgroundColor: accent }} />
                )}
                <Html html={heading} as="h1" className="mt-5 text-[38px] font-extrabold leading-[1.05] tracking-tight drop-shadow-lg sm:text-5xl lg:text-6xl lg:max-w-2xl" />
                {subheading && (
                    <Html html={subheading} as="p" className="mt-4 max-w-md text-[15px] font-medium leading-relaxed text-white/90 drop-shadow sm:text-base lg:text-lg lg:max-w-xl" />
                )}

                <div className="mt-7 flex flex-wrap gap-3">
                    {ctaPrimary?.label && (
                        <button
                            onClick={onContinue}
                            className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold text-white shadow-xl transition lg:px-8 lg:py-3.5 lg:text-base"
                            style={{ backgroundColor: accent }}
                        >
                            {ctaPrimary.label}
                        </button>
                    )}
                    {ctaSecondary?.label && (
                        <button
                            onClick={onContinue}
                            className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/20 transition lg:px-8 lg:py-3.5 lg:text-base"
                        >
                            {ctaSecondary.label}
                        </button>
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
    const { image, heading, description, ctaLabel, imagePosition = "top" } = content || {};

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
                <button
                    onClick={onContinue}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-gray-800 transition lg:px-6 lg:py-3"
                >
                    {ctaLabel} <ArrowRight className="h-4 w-4" />
                </button>
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
    const { heading, description, ctaLabel, backgroundImage, variant = "primary" } = content || {};

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
                    <button
                        onClick={onContinue}
                        className={cn(
                            "mt-7 inline-flex items-center justify-center rounded-full px-7 py-3 text-sm font-bold shadow-xl transition lg:px-8 lg:py-3.5 lg:text-base",
                            (variant === "primary" || variant === "dark")
                                ? "bg-white text-gray-900 hover:bg-white/90"
                                : "bg-gray-900 text-white hover:bg-gray-800"
                        )}
                    >
                        {ctaLabel}
                    </button>
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
    const hasFullContent = (showLogo !== false) || phone || email;

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
