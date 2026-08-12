import type { Metadata } from 'next'
import { getT } from '@/lib/i18n/server'

// Was a static metadata object, which cannot read the locale — so the browser
// tab and share preview stayed English on an otherwise fully translated page.
export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getT()
    return {
        title: t.getStarted.metaTitle,
        description: t.getStarted.metaDescription,
    }
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children
}
