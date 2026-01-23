import domainConfig from '@/data/domains.json';

export type DomainConfig = typeof domainConfig['default'];

export function getDomainConfig(host?: string | null): DomainConfig {
    if (!host) return domainConfig['default'];

    const cleanHost = host.toLowerCase();

    // Check for specific domains
    if (cleanHost.includes('menuthere.com')) {
        return domainConfig['menuthere.com'];
    }

    if (cleanHost.includes('cravings.live')) {
        return domainConfig['cravings.live'];
    }

    // Fallback to default
    return domainConfig['default'];
}
