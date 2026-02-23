import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Get Started | Menuthere',
    description: 'Create your digital menu with Menuthere.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children
}
