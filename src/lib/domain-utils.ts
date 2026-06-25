import domainConfig from '@/data/domains.json';

export interface DomainConfig {
    name: string;
    title: string;
    description: string;
    logo?: string;
    logowhite?: string;
    icon?: string;
    ogImage?: string;
}

/**
 * True when running on a partner custom domain (i.e. NOT menuthere.com, a
 * *.menuthere.com subdomain, localhost, or a *.vercel.app preview). On a custom
 * domain the proxy serves the storefront at root (`/` → `/{username}`), so
 * partner-scoped links must be root-relative (`/user-profile`) — prefixing them
 * with the username produces `/{username}/{username}/…`, which 404s.
 *
 * Client-only: returns false during SSR / when `window` is unavailable.
 */
export function isCustomDomainHost(): boolean {
    if (typeof window === "undefined") return false;
    const host = window.location.hostname.toLowerCase();
    return (
        host !== "menuthere.com" &&
        !host.endsWith(".menuthere.com") &&
        !host.includes("localhost") &&
        !host.endsWith(".vercel.app")
    );
}

export function getDomainConfig(host?: string | null): DomainConfig {
    if (!host) return domainConfig['default'];

    const cleanHost = host.toLowerCase();

    if (cleanHost.includes('menuthere.com')) {
        return domainConfig['menuthere.com'];
    }

    // Fallback to default (Menuthere)
    return domainConfig['default'];
}
