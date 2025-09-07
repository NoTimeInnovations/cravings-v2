import { useState, useEffect } from 'react';

const MAX_RECENT_ITEMS = 10;
const STORAGE_KEY = 'recentlyViewedOffers';

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);

  useEffect(() => {
    // Load recently viewed offers from localStorage? on mount
    const stored = localStorage?.getItem(STORAGE_KEY);
    if (stored) {
      setRecentlyViewed(JSON.parse(stored));
    }
  }, []);

  const addToRecentlyViewed = (offerId: string) => {
    setRecentlyViewed((current) => {
      // Remove the offerId if it already exists
      const filtered = current.filter(id => id !== offerId);
      
      // Add the new offerId to the beginning
      const updated = [offerId, ...filtered];
      
      // Keep only the most recent MAX_RECENT_ITEMS
      const limited = updated.slice(0, MAX_RECENT_ITEMS);
      
      // Save to localStorage?
      localStorage?.setItem(STORAGE_KEY, JSON.stringify(limited));
      
      return limited;
    });
  };

  return {
    recentlyViewed,
    addToRecentlyViewed
  };
}