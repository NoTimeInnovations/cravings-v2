import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getDomainConfig } from '@/lib/domain-utils'

export async function generateMetadata(): Promise<Metadata> {
    const headersList = await headers()
    const host = headersList.get('host')
    const config = getDomainConfig(host)

    return {
        title: `Get Started | ${config.title}`,
        description: `Create your free digital menu with ${config.name}.`,
    }
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children
}
