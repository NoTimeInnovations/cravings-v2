

interface Route {
  path: string
  label: string
}

export function getTestRoutes(): Route[] {
  const routes: Route[] = [
    { path: '/test/change-item-category', label: 'Change Item Category' },
    { path: '/test/explore-tags', label: 'Explore Tags' },
    { path: '/test/get-last-order', label: 'Get Last Order' },
    { path: '/test/image-remove', label: 'Image Remove' },
    { path: '/test/menu-export', label: 'Menu Export' },
    { path: '/test/menu-extract', label: 'Menu Extract' },
    { path: '/test/partner-locations', label: 'Partner Locations' },
    { path: '/test/phone-correction', label: 'Phone Correction' },
  ]

  return routes.sort((a, b) => a.label.localeCompare(b.label))
} 