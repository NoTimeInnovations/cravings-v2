import {
    HotelData,
    HotelDataMenus,
  } from "@/app/hotels/[...id]/page";
  import { Search, X } from "lucide-react";
  import React, { useMemo, useState, useEffect, useRef } from "react";
  import ItemCard from "./ItemCard"; // Assuming ItemCard is in the same directory
  import { DefaultHotelPageProps } from "../Default/Default";
  
  // Import shadcn/ui components
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { ScrollArea } from "@/components/ui/scroll-area";
  
  // The props for SearchItems remain the same
  interface SearchItemsProps {
    menu: HotelDataMenus[];
    styles: DefaultHotelPageProps["styles"];
    hoteldata: HotelData;
    tableNumber: number;
  }
  
  const SearchItems = ({
    menu,
    styles,
    hoteldata,
    tableNumber,
  }: SearchItemsProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
  
    // Memoize the filtered menu to prevent recalculating on every render
    const filteredMenu = useMemo(() => {
      if (!searchQuery) {
        return menu;
      }
      return menu.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [menu, searchQuery]);
  
    // Effect to handle body scroll and input focus when modal is open/closed
    useEffect(() => {
      if (isModalOpen) {
        document.body.style.overflow = "hidden";
        // Delay focus slightly to ensure the input is mounted and ready
        const timer = setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
        return () => clearTimeout(timer);
      } else {
        document.body.style.overflow = "auto";
      }
      // Cleanup function to reset body scroll when component unmounts
      return () => {
        document.body.style.overflow = "auto";
      };
    }, [isModalOpen]);
  
  
    const openModal = () => setIsModalOpen(true);
    const closeModal = () => {
      setIsModalOpen(false);
      setSearchQuery(""); // Reset search query on close
    }
  
    return (
      <div>
        {/* Dummy Search Bar using shadcn/ui Button */}
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground font-normal h-[40px] rounded-full"
          onClick={openModal}
        >
          <Search className="mr-2 h-4 w-4" />
          Search for dishes...
        </Button>
  
        {/* Full-Screen Search Modal */}
        {isModalOpen && (
          <div style={{
            backgroundColor: styles?.backgroundColor || "#000",
          }} className="fixed inset-0 z-[60] flex flex-col animate-in fade-in-0">
            {/* Modal Header with shadcn/ui Input */}
            <div className="flex items-center p-2 border-b">
              <div className="flex-grow flex items-center gap-2">
                <Search className="ml-3 h-5 w-5 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Search for dishes..."
                  className="text-base border-0 shadow-none focus-visible:ring-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="ghost" size="icon" onClick={closeModal} className="mr-2">
                <X className="h-5 w-5" />
                <span className="sr-only">Close search</span>
              </Button>
            </div>
  
            {/* Menu Items List using shadcn/ui ScrollArea */}
            <ScrollArea className="flex-grow">
               <div className="pt-2 pb-4 px-2">
                  {filteredMenu.length > 0 ? (
                  filteredMenu.map((item) => (
                      <ItemCard
                      key={item.id}
                      item={item}
                      styles={styles}
                      hoteldata={hoteldata}
                      feature_flags={hoteldata.feature_flags}
                      tableNumber={tableNumber}
                      />
                  ))
                  ) : (
                  <div className="text-center p-10 text-muted-foreground">
                      <p>No dishes found for "{searchQuery}"</p>
                  </div>
                  )}
               </div>
            </ScrollArea>
          </div>
        )}
      </div>
    );
  };
  
  export default SearchItems;