import React from 'react'
import Link from 'next/link'
import { getTestRoutes } from '@/utils/getTestRoutes'

const Page = async () => {
  const routes = getTestRoutes()

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Test Pages</h1>
      <div className="flex flex-col gap-4">
        {routes.map((route) => (
          <Link 
            key={route.path}
            href={route.path} 
            className="text-blue-500 hover:underline p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {route.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Page