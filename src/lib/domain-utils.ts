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

export function getDomainConfig(host?: string | null): DomainConfig {
    if (!host) return domainConfig['default'];

    const cleanHost = host.toLowerCase();

    if (cleanHost.includes('menuthere.com')) {
        return domainConfig['menuthere.com'];
    }

    // Fallback to default (Menuthere)
    return domainConfig['default'];
}
