import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Menuthere',
    short_name: 'Menuthere',
    description: 'Menuthere is the all-in-one platform for restaurants to manage digital menus, orders, and grow their business.',
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