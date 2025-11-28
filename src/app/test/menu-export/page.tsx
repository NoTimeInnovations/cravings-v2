"use client"; // Mark this as a client component

import { fetchFromHasura } from "@/lib/hasuraClient";
import React, { useEffect, useState } from "react";
import { getAllPartnersQuery } from "@/api/partners";

// --- Type Definitions ---

type MenuItem = {
  category: {
    name: string;
  } | null; // Allow category to be null
  name: string;
  price: number;
  variants: {
    name: string;
    price: number;
  }[];
};

// Flattened data type
type MenuExtractType = {
  category: string;
  name: string;
  price: number;
};

type Partner = {
  id: string;
  store_name: string;
  location: string;
};

// --- Helper Functions (defined outside the component) ---

/**
 * Fetches menu data from Hasura.
 */
const fetchData = async (partnerId: string) => {
  const { menu, menu_aggregate } = await fetchFromHasura(`query MyQuery {
    menu(where: {partner_id: {_eq: "${partnerId}"}}) {
      category {
        name
      }
      name
      price
      variants
    }
    menu_aggregate(where: {partner_id: {_eq: "${partnerId}"}}) {
      aggregate {
        count
      }
    }
  }
`);

  return { menu: menu as MenuItem[], menu_aggregate };
};

/**
 * Processes the raw menu data, flattening items with variants into multiple rows.
 */
const flattenMenuData = (menuItems: MenuItem[]): MenuExtractType[] => {
  const flattenedData: MenuExtractType[] = [];

  if (!menuItems) {
    return flattenedData;
  }

  menuItems.forEach((item) => {
    const categoryName = item.category?.name || "Uncategorized";

    // Check if variants exist and if all of them have 0 price
    const hasVariants = item.variants && item.variants.length > 0;
    const allVariantsZeroPrice = hasVariants && item.variants.every((v) => (v.price || 0) === 0);

    // If there are no variants, or all variants have 0 price, add the base item
    if (!hasVariants || allVariantsZeroPrice) {
      flattenedData.push({
        category: categoryName,
        name: item.name,
        price: item.price || 0,
      });
    } else {
      // If there are variants with non-zero prices, add each variant as a separate item
      item.variants.forEach((variant) => {
        flattenedData.push({
          category: categoryName,
          name: `${item.name} - ${variant.name}`,
          price: variant.price || 0,
        });
      });
    }
  });

  return flattenedData;
};


// --- Main Client Component ---

/**
 * The main Page component. It's a client component that fetches its own data
 * and handles all UI rendering and logic.
 */
const Page = () => {
  // State for data
  const [data, setData] = useState<MenuExtractType[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);

  // State for partner selection
  const [searchQuery, setSearchQuery] = useState("");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // State for loading and errors
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch partners on search
  useEffect(() => {
    const fetchPartners = async () => {
      if (!searchQuery) {
        setPartners([]);
        return;
      }

      setIsSearching(true);
      try {
        const { partners } = await fetchFromHasura(getAllPartnersQuery, {
          query: `%${searchQuery}%`,
          limit: 10,
          offset: 0
        });
        setPartners(partners);
      } catch (err) {
        console.error("Failed to fetch partners:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(fetchPartners, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Data fetching logic when partner is selected
  useEffect(() => {
    const loadData = async () => {
      if (!selectedPartner) return;

      try {
        setIsLoading(true);
        setError(null);

        const fetchedData = await fetchData(selectedPartner.id);
        const flattenedData = flattenMenuData(fetchedData.menu);

        setData(flattenedData);
        setTotalItems(fetchedData.menu_aggregate?.aggregate?.count || 0);

      } catch (err) {
        console.error("Failed to fetch menu data:", err);
        setError("Failed to load menu. Please try refreshing.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedPartner]);

  // CSV Download logic
  const handleDownloadCSV = () => {
    console.log("Preparing to download CSV...");

    if (data.length === 0) {
      console.error("No data to download");
      return;
    }

    // 1. Create CSV Header (Using your updated order)
    const headers = ["Name", "Category", "Price"];
    let csvContent = headers.join(",") + "\n";

    // 2. Create CSV Rows
    data.forEach((row) => {
      // Handle potential commas or quotes in data by wrapping in double quotes
      // and escaping existing double quotes.
      const category = `"${row.category.replace(/"/g, '""')}"`;
      const name = `"${row.name.replace(/"/g, '""')}"`;
      const price = row.price.toFixed(2);

      csvContent += [name, category, price].join(",") + "\n";
    });

    // 3. Create Blob
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    // 4. Create Download Link
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedPartner?.store_name || 'menu'}.csv`);
    link.style.visibility = "hidden";

    // 5. Trigger Download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 6. Clean up
    URL.revokeObjectURL(url);
  };

  // --- Render Logic ---

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Partner Selection Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Select Partner</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search for a partner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {isSearching && (
              <div className="absolute right-3 top-2.5 text-gray-400">
                Searching...
              </div>
            )}

            {/* Search Results Dropdown */}
            {partners.length > 0 && !selectedPartner && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {partners.map((partner) => (
                  <button
                    key={partner.id}
                    onClick={() => {
                      setSelectedPartner(partner);
                      setSearchQuery("");
                      setPartners([]);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <div className="font-medium text-gray-900">{partner.store_name}</div>
                    <div className="text-sm text-gray-500">{partner.location}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPartner && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 flex justify-between items-center">
              <div>
                <div className="font-semibold text-blue-900">{selectedPartner.store_name}</div>
                <div className="text-sm text-blue-700">{selectedPartner.location}</div>
              </div>
              <button
                onClick={() => {
                  setSelectedPartner(null);
                  setData([]);
                  setTotalItems(0);
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Menu Data Section */}
        {selectedPartner && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Menu Items</h1>
                <p className="text-sm text-gray-500">
                  {totalItems} base items. (Showing {data.length} total rows)
                </p>
              </div>
              <button
                onClick={handleDownloadCSV}
                disabled={data.length === 0}
                className="mt-4 sm:mt-0 w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg text-sm shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Download CSV
              </button>
            </div>

            {/* Loading/Error/Table */}
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading menu data...</div>
            ) : error ? (
              <div className="p-8 text-center text-red-500">{error}</div>
            ) : (
              <div className="overflow-x-auto">
                {data.length > 0 ? (
                  <table className="w-full min-w-full text-left text-sm text-gray-700">
                    <thead className="bg-gray-100 text-xs text-gray-700 uppercase tracking-wider">
                      <tr>
                        <th scope="col" className="px-6 py-3">Category</th>
                        <th scope="col" className="px-6 py-3">Name</th>
                        <th scope="col" className="px-6 py-3 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.map((item, index) => (
                        <tr key={index} className="bg-white hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                            {item.category}
                          </td>
                          <td className="px-6 py-4">{item.name}</td>
                          <td className="px-6 py-4 text-right font-mono">
                            ${item.price.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    No menu items found for this partner.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;

