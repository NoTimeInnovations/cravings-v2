"use client";
import { MenuItem } from "@/store/menuStore_hasura";
import React, { use, useState, useMemo } from "react";
import { Search, Filter, X, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { toast } from "sonner";

const TOGGLE_AVAILABILITY_MUTATION = `
  mutation ToggleMenuItemAvailability($id: uuid! , $is_available: Boolean!) {
    update_menu(where: {id: {_eq: $id}}, _set: {is_available: $is_available}) {
      affected_rows
    }
  }
`;

const ItemAvailabilityManage = ({
  menu,
}: {
  menu: Promise<{ menu: MenuItem[] }>;
}) => {
  const menusData = use(menu);
  const [menusArray, setMenusArray] = React.useState(menusData);
  const [searchTerm, setSearchTerm] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const router = useRouter();

  const handleUpdateDb = async (id: string, is_available: boolean) => {
    try {
      await fetchFromHasura(TOGGLE_AVAILABILITY_MUTATION, { id, is_available });
    } catch (err) {
      console.log(err);
    }
  };

  const toggleAvailability = (itemId: string | undefined) => {
    if (!itemId) return;
    setMenusArray((prevState) => ({
      ...prevState,
      menu: prevState.menu.map((item) =>
        item.id === itemId
          ? { ...item, is_available: !item.is_available }
          : item
      ),
    }));

    const item = menusArray.menu.find((item) => item.id === itemId);
    if (item && item.id) {
      handleUpdateDb(item.id, !item.is_available);
    } else {
      toast.error("Error updating item availability.");
    }

    toast.success("Item availability updated.");
  };

  const clearFilters = () => {
    setSearchTerm("");
    setAvailabilityFilter("all");
  };

  // Filter menu items based on search term and availability
  const filteredMenuItems = useMemo(() => {
    let filtered = menusArray?.menu || [];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by availability
    if (availabilityFilter !== "all") {
      filtered = filtered.filter((item) =>
        availabilityFilter === "available"
          ? item.is_available
          : !item.is_available
      );
    }

    return filtered;
  }, [menusArray?.menu, searchTerm, availabilityFilter]);

  const hasActiveFilters = searchTerm || availabilityFilter !== "all";
  const totalItems = menusArray?.menu?.length || 0;

  return (
    <div className="w-full p-2 sm:p-4 max-w-7xl mx-auto pb-20">
      <h1
        onClick={() => router.back()}
        className=" text-2xl sm:text-2xl font-bold mb-4 cursor-pointer flex items-center"
      >
        <ChevronLeft className="inline-block h-6 w-6 sm:h-10 sm:w-10 mr-1 cursor-pointer" />
        Back
      </h1>

      {/* Filters Section */}
      <div className="my-4 sm:mb-6 space-y-4">
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 ">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search items by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 felx-1 w-full"
            />
          </div>

          <div className="flex items-center gap-4 justify-end">
            {/* Availability Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select
                value={availabilityFilter}
                onValueChange={setAvailabilityFilter}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <span>
            Showing {filteredMenuItems.length} of {totalItems} items
          </span>
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: {searchTerm}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSearchTerm("")}
                  />
                </Badge>
              )}
              {availabilityFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {availabilityFilter === "available"
                    ? "Available only"
                    : "Unavailable only"}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setAvailabilityFilter("all")}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto bg-white rounded-lg shadow-lg border">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Availability
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMenuItems.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50 transition-colors duration-200"
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {item.name}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600 capitalize">
                    {item.category.name?.replace(/_/g, " ")}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => toggleAvailability(item.id)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        item.is_available ? "bg-green-500" : "bg-gray-300"
                      }`}
                      role="switch"
                      aria-checked={item.is_available}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          item.is_available ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <Badge
                      variant={item.is_available ? "default" : "secondary"}
                      className={
                        item.is_available
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : ""
                      }
                    >
                      {item.is_available ? "Available" : "Unavailable"}
                    </Badge>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredMenuItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {hasActiveFilters
              ? "No items found matching your filters."
              : "No menu items available."}
          </div>
        )}
      </div>

      {/* Tablet View */}
      <div className="hidden md:block lg:hidden">
        <div className="grid gap-4">
          {filteredMenuItems.map((item) => (
            <div
              key={`tablet-${item.id}`}
              className="bg-white rounded-lg shadow-md p-4 border border-gray-200"
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <h3 className="text-base font-medium text-gray-900 mb-1">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-600 capitalize">
                    {item.category.name?.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="flex items-center space-x-3 ml-4">
                  <Badge
                    variant={item.is_available ? "default" : "secondary"}
                    className={
                      item.is_available
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : ""
                    }
                  >
                    {item.is_available ? "Available" : "Unavailable"}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => toggleAvailability(item.id)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      item.is_available ? "bg-green-500" : "bg-gray-300"
                    }`}
                    role="switch"
                    aria-checked={item.is_available}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        item.is_available ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredMenuItems.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg border">
              {hasActiveFilters
                ? "No items found matching your filters."
                : "No menu items available."}
            </div>
          )}
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        <div className="space-y-3">
          {filteredMenuItems.map((item) => (
            <div
              key={`mobile-${item.id}`}
              className="bg-white rounded-lg shadow-md p-4 border border-gray-200"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-gray-900 truncate">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 capitalize">
                    {item.category.name?.replace(/_/g, " ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleAvailability(item.id)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ml-3 ${
                    item.is_available ? "bg-green-500" : "bg-gray-300"
                  }`}
                  role="switch"
                  aria-checked={item.is_available}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      item.is_available ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <div className="text-right">
                <Badge
                  variant={item.is_available ? "default" : "secondary"}
                  className={
                    item.is_available
                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                      : ""
                  }
                >
                  {item.is_available ? "Available" : "Unavailable"}
                </Badge>
              </div>
            </div>
          ))}
          {filteredMenuItems.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg border">
              {hasActiveFilters
                ? "No items found matching your filters."
                : "No menu items available."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemAvailabilityManage;
