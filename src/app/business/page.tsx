import { getAllPartnersQuery } from '@/api/partners'
import { fetchFromHasura } from "@/lib/hasuraClient";
import Image from 'next/image'
import Link from 'next/link'

export default async function HotelsPage() {
  const { partners } = await fetchFromHasura(getAllPartnersQuery);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12 text-gray-800">
        Our Partner Restaurants
      </h1>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {partners.map((partner: any) => (
          <div 
            key={partner.id} 
            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col border-2"
          >
            <div className="relative h-32 w-full">
              <Image
                src={partner.store_banner || '/default-banner.jpg'}
                alt={partner.store_name}
                fill
                className="object-cover rounded-t-lg"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                priority={false}
              />
            </div>
            
            <div className="p-3 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-1">
                <h2 className="text-sm md:text-base font-semibold text-gray-800 line-clamp-1">
                  {partner.store_name}
                </h2>
                <span className="bg-orange-100 text-orange-800 text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  {partner.district}
                </span>
              </div>
              
              <p className="text-xs md:text-sm text-gray-600 mb-2 line-clamp-2">
                {partner.description}
              </p>
              
              <div className="mt-auto flex flex-row-reverse items-center justify-between">
                <Link 
                  href={partner?.location || "/"}
                  target="_blank"
                  className=" hover:text-orange-500  p-1 bg-orange-500 text-white text-sm md:text-sm font-medium py-1.5 px-2 rounded transition-colors duration-200 text-center"
                  aria-label="View location on map"
                >
                  <svg className="md:size-5 size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>
                
                <Link 
                  href={`/hotels/${partner.store_name.replaceAll(" ","-")}/${partner.id}`}
                  className="w-[75%] bg-orange-500 hover:bg-orange-600 text-white text-xs md:text-sm font-medium py-1.5 px-2 rounded transition-colors duration-200 text-center"
                >
                  View Menu
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}