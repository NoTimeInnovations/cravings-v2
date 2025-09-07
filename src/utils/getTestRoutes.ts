import fs from 'fs'
import path from 'path'

interface Route {
  path: string
  label: string
}

export function getTestRoutes(): Route[] {
  const testDir = path.join(process.cwd(), 'src/app/test')
  const entries = fs.readdirSync(testDir, { withFileTypes: true })
  
  const routes: Route[] = []
  
  for (const entry of entries) {
    // Skip if it's not a directory or if it's the current page
    if (!entry.isDirectory() || entry.name === 'page.tsx') continue
    
    // Convert directory name to route path and label
    const routePath = `/test/${entry.name}`
    const label = entry.name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    
    routes.push({ path: routePath, label })
  }
  
  return routes.sort((a, b) => a.label.localeCompare(b.label))
} 