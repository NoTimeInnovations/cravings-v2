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

export function HotelUpiTable({ initialHotels }: { initialHotels: Hotel[] }) {
  const [hotels, setHotels] = useState<Hotel[]>(initialHotels);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter hotels based on search query
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
            <TableHead>UPI ID</TableHead>
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
                <TableCell>{hotel.upi_id || 'Not Set'}</TableCell>
                <TableCell>
                  <UpdateUpiModal 
                    hotel={hotel} 
                    onSuccess={handleUpdateSuccess} 
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