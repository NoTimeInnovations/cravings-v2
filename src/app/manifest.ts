import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { getDomainConfig } from '@/lib/domain-utils'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const headersList = await headers()
  const host = headersList.get('host')
  const config = getDomainConfig(host)

  return {
    name: config.title,
    short_name: config.name,
    description: config.description,
    start_url: '/',
    display: 'fullscreen',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}