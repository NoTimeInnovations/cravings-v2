"use client";

import React, { useState, useEffect } from 'react';
import { fetchFromHasura } from '@/lib/hasuraClient';

// GraphQL Mutation to update the category for a list of items
const UpdateItemCategoryMutation = `
  mutation UpdateItemCategory($ids: [uuid!]!, $newCategoryId: uuid!) {
    update_menu(
      where: { id: { _in: $ids } },
      _set: { category_id: $newCategoryId }
    ) {
      affected_rows
    }
  }
`;

// GraphQL Query to fetch items by partner and category
const GetItemsByCategoryQuery = `
  query GetItemsByCategory($id: uuid!, $categoryName: String!) {
    menu(where: {
      _and: [
        { partner_id: { _eq: $id } },
        { category: { name: { _eq: $categoryName } } }
      ]
    }) {
      id
      name
      category {
        id
        name
      }
    }
  }
`;

// TypeScript interface for a single item
interface PurchaseItem {
  id: string;
  name: string;
  category: {
    id: string;
    name: string;
  };
}

// Keys for localStorage
const PARTNER_ID_KEY = 'lastPartnerId';
const CATEGORY_NAME_KEY = 'lastCategoryName';

const Page: React.FC = () => {
    // State for inputs and fetched data
    const [partnerId, setPartnerId] = useState<string>('');
    const [categoryName, setCategoryName] = useState<string>('');
    const [items, setItems] = useState<PurchaseItem[]>([]);
    
    // State for loading and error messages
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // State for the update functionality
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [newCategoryId, setNewCategoryId] = useState<string>('');
    const [isUpdating, setIsUpdating] = useState<boolean>(false);

    // Effects for localStorage are unchanged
    useEffect(() => {
        const savedPartnerId = localStorage.getItem(PARTNER_ID_KEY);
        const savedCategoryName = localStorage.getItem(CATEGORY_NAME_KEY);
        if (savedPartnerId) setPartnerId(savedPartnerId);
        if (savedCategoryName) setCategoryName(savedCategoryName);
    }, []);

    useEffect(() => {
        if (partnerId) localStorage.setItem(PARTNER_ID_KEY, partnerId);
        if (categoryName) localStorage.setItem(CATEGORY_NAME_KEY, categoryName);
    }, [partnerId, categoryName]);
    
    // Fetches items from the API
    const fetchItems = async (e?: React.FormEvent<HTMLFormElement>) => {
        if (e) e.preventDefault();
        if (!partnerId || !categoryName) {
            setError("Partner ID and Category Name are required.");
            return
        };

        setIsLoading(true);
        setError(null);
        setItems([]);
        try {
            const variables = { id: partnerId, categoryName };
            const response = await fetchFromHasura(GetItemsByCategoryQuery, variables);
            setItems(response.menu);
        } catch (err: any) {
            setError(err.message || 'An error occurred while fetching.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handles changes to individual selection checkboxes
    const handleSelectChange = (itemId: string, isSelected: boolean) => {
        setSelectedItemIds(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(itemId);
            } else {
                newSet.delete(itemId);
            }
            return newSet;
        });
    };

    // --- NEW: Handler for the "Select All" checkbox ---
    const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            // If checking the box, add all current item IDs to the selection
            const allItemIds = items.map(item => item.id);
            setSelectedItemIds(new Set(allItemIds));
        } else {
            // If unchecking, clear the selection completely
            setSelectedItemIds(new Set());
        }
    };

    // Submits the category update mutation
    const handleUpdateCategory = async () => {
        if (selectedItemIds.size === 0 || !newCategoryId) {
            alert("Please select items and enter a new category ID.");
            return;
        }

        setIsUpdating(true);
        setError(null);

        try {
            const variables = {
                ids: Array.from(selectedItemIds),
                newCategoryId: newCategoryId
            };
            
            const response = await fetchFromHasura(UpdateItemCategoryMutation, variables);

            if (response.errors) {
                throw new Error(response.errors[0].message);
            }
            
            alert(`Successfully updated ${response.update_menu.affected_rows} items!`);
            
            setSelectedItemIds(new Set());
            setNewCategoryId('');
            fetchItems();

        } catch (err: any) {
            setError(err.message || 'An error occurred during the update.');
        } finally {
            setIsUpdating(false);
        }
    };
    
    // --- NEW: A derived value to determine the state of the "Select All" checkbox ---
    const areAllItemsSelected = items.length > 0 && selectedItemIds.size === items.length;

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: 'auto', fontFamily: 'sans-serif' }}>
            <h1>Find and Update Items</h1>
            <form onSubmit={fetchItems} style={{ marginBottom: '2rem' }}>
              {/* Form inputs are unchanged */}
               <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor="partnerId" style={{ display: 'block', marginBottom: '0.5rem' }}>Partner ID</label>
                    <input
                        id="partnerId"
                        type="text"
                        value={partnerId}
                        onChange={(e) => setPartnerId(e.target.value)}
                        placeholder="Enter partner UUID"
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="categoryName" style={{ display: 'block', marginBottom: '0.5rem' }}>Category Name</label>
                    <input
                        id="categoryName"
                        type="text"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="e.g., juice, j4 elite shakes"
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                <button type="submit" disabled={isLoading} style={{ padding: '10px 15px', cursor: 'pointer' }}>
                    {isLoading ? 'Fetching...' : 'Fetch Items'}
                </button>
            </form>

            {error && <p style={{ color: 'red', marginTop: '1rem', backgroundColor: '#ffebee', padding: '10px', borderRadius: '4px' }}>Error: {error}</p>}

            <div>
                <h2>Results</h2>
                {isLoading ? <p>Loading...</p> : items?.length > 0 ? (
                    <>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f2f2f2' }}>
                                    <th style={{ padding: '12px', border: '1px solid #ddd' }}>
                                        {/* --- NEW: The "Select All" checkbox is added here --- */}
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAllChange}
                                            checked={areAllItemsSelected}
                                            disabled={items.length === 0}
                                        />
                                    </th>
                                    <th style={{ padding: '12px', border: '1px solid #ddd' }}>Item Name</th>
                                    <th style={{ padding: '12px', border: '1px solid #ddd' }}>Category Name</th>
                                    <th style={{ padding: '12px', border: '1px solid #ddd' }}>Category ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #ddd' }}>
                                        <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedItemIds.has(item.id)}
                                                onChange={(e) => handleSelectChange(item.id, e.target.checked)}
                                            />
                                        </td>
                                        <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.name}</td>
                                        <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.category.name}</td>
                                        <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.category.id}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#fafafa' }}>
                          {/* Update section is unchanged */}
                           <h3>Update Category for Selected Items</h3>
                            <p><b>{selectedItemIds.size}</b> item(s) selected.</p>
                            <input
                                type="text"
                                placeholder="Enter new Category ID (UUID)"
                                value={newCategoryId}
                                onChange={(e) => setNewCategoryId(e.target.value)}
                                style={{ padding: '8px', width: '300px', marginRight: '1rem', boxSizing: 'border-box' }}
                            />
                            <button
                                onClick={handleUpdateCategory}
                                disabled={isUpdating || selectedItemIds.size === 0 || !newCategoryId}
                                style={{ padding: '8px 12px', cursor: 'pointer' }}
                            >
                                {isUpdating ? 'Updating...' : 'Update Category'}
                            </button>
                        </div>
                    </>
                ) : (
                    <p>No items found. Submit the form to see results.</p>
                )}
            </div>
        </div>
    );
}

export default Page;