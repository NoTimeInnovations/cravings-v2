"use client"; // Mark this as a client component


import { fetchFromHasura } from "@/lib/hasuraClient";
import React, { useEffect, useState } from "react";

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

// --- Helper Functions (defined outside the component) ---


const partnerId = "d68d1ecd-adc6-48cf-b927-9ba831d70a57"; // Replace with actual partner ID

/**
 * Fetches menu data from Hasura.
 */
const fetchData = async () => {
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

    // If there are no variants, or variants array is empty, add the base item
    if (!item.variants || item.variants.length === 0) {
      flattenedData.push({
        category: categoryName,
        name: item.name,
        price: item.price,
      });
    } else {
      // If there are variants, add each variant as a separate item
      item.variants.forEach((variant) => {
        flattenedData.push({
          category: categoryName,
          name: `${item.name} - ${variant.name}`,
          price: variant.price,
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
  
  // State for loading and errors
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data fetching logic
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const fetchedData = await fetchData();
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
  }, []); // Empty dependency array means this runs once on mount

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
    link.setAttribute("download", "menu.csv");
    link.style.visibility = "hidden";

    // 5. Trigger Download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 6. Clean up
    URL.revokeObjectURL(url);
  };

  // --- Render Logic ---

  // Handle Loading State
  if (isLoading) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans flex items-center justify-center">
        <div className="text-gray-500">Loading menu data...</div>
      </div>
    );
  }

  // Handle Error State
  if (error) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans flex items-center justify-center">
        <div className="text-red-500 bg-red-100 p-4 rounded-lg shadow-md">{error}</div>
      </div>
    );
  }

  // Main Render (Data Loaded)
  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
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

        {/* Table */}
        <div className="overflow-x-auto">
          {data.length > 0 ? (
            <table className="w-full min-w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-100 text-xs text-gray-700 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-right">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map((item, index) => (
                  <tr key={index} className="bg-white hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {item.category}
                    </td>
                    <td className="px-6 py-4">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      ${item.price.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-gray-500">
              No menu items found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Page;

