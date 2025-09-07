import { useState, useEffect } from 'react';

const STORAGE_KEY = 'claimedOffers';

interface ClaimedOffer {
  offerId: string;
  token: string;
  claimedAt: string;
}

export function useClaimedOffers() {
  const [claimedOffers, setClaimedOffers] = useState<ClaimedOffer[]>([]);

  useEffect(() => {
    const stored = localStorage?.getItem(STORAGE_KEY);
    if (stored) {
      setClaimedOffers(JSON.parse(stored));
    }
  }, []);

  const addClaimedOffer = (offerId: string, token: string) => {
    const newClaim: ClaimedOffer = {
      offerId,
      token,
      claimedAt: new Date().toISOString(),
    };

    setClaimedOffers((current) => {
      const updated = [...current, newClaim];
      localStorage?.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const isOfferClaimed = (offerId: string) => {
    return claimedOffers.some((claim) => claim.offerId === offerId);
  };

  const getClaimToken = (offerId: string) => {
    return claimedOffers.find((claim) => claim.offerId === offerId)?.token;
  };

  return {
    claimedOffers,
    addClaimedOffer,
    isOfferClaimed,
    getClaimToken,
  };
}