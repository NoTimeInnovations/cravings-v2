import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Offer } from '@/store/offerStore_hasura';
import { useState } from 'react';

interface OfferTicketProps {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer;
  token: string; // Token is now passed directly
}

export function OfferTicket({ isOpen, onClose, offer, token }: OfferTicketProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClaim = async () => {
    try {
      setIsLoading(true);
      // console.log(offer.partner?.district);
      window.open(offer.partner?.district, '_blank');
    } catch (error) {
      console.error('Failed to process claim:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your Offer Ticket</DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-6">
          <div className="bg-orange-50 p-6 rounded-lg border-2 border-dashed border-orange-200">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-xl">{offer.menu.name}</h3>
                  <p className="text-gray-600">{offer.partner?.store_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 line-through">₹{offer.menu.price}</p>
                  <p className="text-xl font-bold text-orange-600">₹{offer.offer_price}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-orange-200">
                <p className="text-sm text-gray-600 mb-2">Offer Token:</p>
                <p className="font-mono text-2xl font-bold text-center bg-white py-2 rounded">
                  {token}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-500 text-center">
              Take a screenshot of this ticket and show it at the restaurant
            </p>
            <Button
              onClick={handleClaim}
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {isLoading ? 'Processing...' : "Let's Go"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}