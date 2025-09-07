"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, ChevronRight } from "lucide-react";
import Image from "next/image";
import { BusinessRegistrationData, MenuItem } from "../page";

interface BusinessPreviewProps {
  businessData: BusinessRegistrationData;
  menuItems: MenuItem[];
  onPrevious: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function BusinessPreview({
  businessData,
  menuItems,
  onPrevious,
  onSubmit,
  isSubmitting,
}: BusinessPreviewProps) {
  // Get must-try items
  const mustTryItems = menuItems.filter(item => item.mustTry);
  
  const handleUpgradeClick = () => {
    // Submit the business data first
    onSubmit();
    
    // Only open WhatsApp if not in a submitting state
    if (!isSubmitting) {
      // Open WhatsApp link
      window.open("https://wa.me/918590115462?text=Hi!%20I'm%20interested%20in%20partnering%20with%20Cravings.%20Can%20you%20share%20the%20details", "_blank");
    }
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Preview Your Business Page</h2>
      <p className="text-gray-500">
        This is how your page will appear to customers in our app.
      </p>

      {/* Restaurant Preview - Mobile App Style */}
      <Card className="p-0 overflow-hidden">
        {/* Cravings Brand Header */}
        <div className="bg-white p-3 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl text-orange-500">Cravings</span>
              <span className="text-sm bg-orange-100 text-orange-800 px-2 py-0.5 rounded">Business</span>
            </div>
          </div>
        </div>
        
        {/* Restaurant Header */}
        <div className="bg-white p-4 flex items-center space-x-3">
          <div className="relative w-16 h-16 overflow-hidden rounded-full border border-gray-100">
            {businessData.logo ? (
              <Image
                src={businessData.logo}
                alt={businessData.businessName}
                width={64}
                height={64}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-orange-100 flex items-center justify-center">
                <span className="text-2xl">🍽️</span>
              </div>
            )}
          </div>
          <div>
            <h1 className="font-bold text-lg">{businessData.businessName}</h1>
            <p className="text-sm text-gray-500">{businessData.area}</p>
          </div>
        </div>
        
        {/* Search Bar (Non-functional) */}
        <div className="bg-white p-4 border-t border-b border-gray-100">
          <div className="bg-gray-100 rounded-full py-2 px-4 flex items-center">
            <svg className="w-4 h-4 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-gray-400 text-sm">Search</span>
          </div>
        </div>
        
        {/* Must Try Section */}
        <div className="bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-xl">Must<span className="text-orange-500">Try</span></h2>
          </div>
          
          <div className="overflow-x-auto pb-2">
            <div className="flex space-x-4">
              {mustTryItems.length > 0 ? (
                mustTryItems.map(item => (
                  <div key={item.id} className="min-w-[200px] rounded-lg overflow-hidden shadow-sm border">
                    <div className="h-32 relative">
                      {item.image ? (
                        <Image 
                          src={item.image} 
                          alt={item.name} 
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-400">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <h3 className="font-medium">{item.name}</h3>
                      <div className="flex justify-between items-center mt-1">
                        <p className="font-bold text-orange-500">₹{item.price}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 bg-orange-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-orange-600">
                    Mark items as &quot;Must Try&quot; to highlight them here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Category Pills */}
        <div className="bg-white p-4 border-t border-gray-100">
          <div className="flex overflow-x-auto pb-2 gap-2">
            <div className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm whitespace-nowrap">
              All items
            </div>
            <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm whitespace-nowrap">
              Combo Packs
            </div>
            <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm whitespace-nowrap">
              Meal Deals
            </div>
            <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm whitespace-nowrap">
              Spicy Fried
            </div>
          </div>
        </div>
        
        {/* Menu Items */}
        <div className="bg-white p-4 border-t border-gray-100">
          <div className="space-y-4">
            {menuItems.map(item => (
              <div key={item.id} className="flex gap-4 border-b pb-4 last:border-0">
                <div className="flex-1">
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                  <p className="font-bold mt-2">₹{item.price}</p>
                </div>
                <div className="w-20 h-20 rounded overflow-hidden">
                  {item.image ? (
                    <Image 
                      src={item.image} 
                      alt={item.name} 
                      width={80}
                      height={80}
                      className="object-cover w-full h-full" 
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No image</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Upgrade Button */}
        <div className="bg-gray-50 p-4 border-t">
          <Button 
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white"
            onClick={handleUpgradeClick}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
              </>
            ) : (
              <>
                Upgrade to Premium <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
      </div>
    </div>
  );
} 