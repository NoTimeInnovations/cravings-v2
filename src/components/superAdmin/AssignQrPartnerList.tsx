"use client";

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { UpdateUpiModal } from "./UpdateUpiModal";
import { Hotel } from "./UpdateHotelUpiId";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { QrManagementModal } from './QrManagementModal';

export function AssignQrPartnerList({ initialHotels }: { initialHotels: Hotel[] }) {
  const [hotels, setHotels] = useState<Hotel[]>(initialHotels);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const filteredHotels = hotels.filter(hotel =>
    hotel.store_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateSuccess = (updatedHotel: Hotel) => {
    setHotels(prevHotels => 
      prevHotels.map(hotel => 
        hotel.id === updatedHotel.id ? updatedHotel : hotel
      )
    );
  };

  const handleViewQrCodes = (partnerId: string,store_name:string) => {
    router.push(`/superadmin/${partnerId}/qrcodes?store_name=${store_name}`);
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-white rounded-md">
        <Search className="absolute bg-white rounded-l-md left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search hotels by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hotel Name</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredHotels.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-4">
                No hotels found
              </TableCell>
            </TableRow>
          ) : (
            filteredHotels.map((hotel) => (
              <TableRow key={hotel.id}>
                <TableCell>{hotel.store_name}</TableCell>
                <TableCell className="flex space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => handleViewQrCodes(hotel.id,hotel.store_name)}
                  >
                    View QR Codes
                  </Button>
                  <QrManagementModal 
                    partnerId={hotel.id}
                    onSuccess={() => {
                      // Refresh data or handle success
                      handleViewQrCodes(hotel.id,hotel.store_name);
                    }}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}