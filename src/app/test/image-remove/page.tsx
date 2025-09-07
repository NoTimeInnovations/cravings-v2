'use client'

import React, { useState } from 'react'
import { fetchFromHasura } from '@/lib/hasuraClient'

const getMenuItems = `
  query GetMenu($partner_id: uuid!) {
    menu(where: {partner_id: {_eq: $partner_id}, deletion_status: {_eq: 0}}) {
      id
      name
      category {
        id
        name
      }
      price
      description
      is_available
      image_url
    }
  }
`

const updateMenuItem = `
  mutation UpdateMenuItem($id: uuid!, $image_url: String) {
    update_menu_by_pk(
      pk_columns: { id: $id }
      _set: { image_url: $image_url }
    ) {
      id
      image_url
    }
  }
`

const bulkUpdateMenuItems = `
  mutation BulkUpdateMenuItems($items: [menu_updates!]!) {
    update_menu_many(updates: $items) {
      affected_rows
    }
  }
`

type SearchType = 'name' | 'category' | 'price'

const Page = () => {
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchType, setSearchType] = useState<SearchType>('name')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const partnerId = '61904ad5-404e-44b3-9624-e3003a949848'

  const fetchMenuItems = async () => {
    try {
      const response = await fetchFromHasura(getMenuItems, {
        partner_id: partnerId
      })
      setMenuItems(response.menu || [])
    } catch (error) {
      console.error('Error fetching menu items:', error)
    }
  }

  const handleDeleteImage = async (itemId: string) => {
    try {
      await fetchFromHasura(updateMenuItem, {
        id: itemId,
        image_url: ''
      })
      // Refresh the menu items after deletion
      fetchMenuItems()
    } catch (error) {
      console.error('Error deleting image:', error)
    }
  }

  // Get unique categories from menu items
  const categories = React.useMemo(() => {
    const uniqueCategories = new Set(menuItems.map(item => item.category.name))
    return Array.from(uniqueCategories)
  }, [menuItems])

  const handleCategorySelection = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category)
      } else {
        return [...prev, category]
      }
    })
  }

  const handleBulkDeleteImages = async () => {
    if (selectedCategories.length === 0) {
      alert('Please select at least one category')
      return
    }

    try {
      setIsDeleting(true)
      // Get all items that have images in the selected categories
      const itemsToUpdate = menuItems
        .filter(item => 
          item.image_url && selectedCategories.includes(item.category.name)
        )
        .map(item => ({
          where: { id: { _eq: item.id } },
          _set: { image_url: '' }
        }))

      if (itemsToUpdate.length === 0) {
        alert('No images to delete in the selected categories')
        return
      }

      // Confirm before deletion
      const confirmMessage = `This will delete images from ${itemsToUpdate.length} items in the following categories: "${selectedCategories.join('", "')}". Are you sure?`
      if (!window.confirm(confirmMessage)) {
        return
      }

      await fetchFromHasura(bulkUpdateMenuItems, {
        items: itemsToUpdate
      })

      // Refresh the menu items after deletion
      await fetchMenuItems()
      alert('Images deleted successfully')
    } catch (error) {
      console.error('Error deleting images:', error)
      alert('Error deleting images')
    } finally {
      setIsDeleting(false)
    }
  }

  // Fetch menu items on component mount
  React.useEffect(() => {
    fetchMenuItems()
  }, [])

  // Filter menu items based on search term and type
  const filteredMenuItems = menuItems.filter(item => {
    if (!searchTerm) return true

    switch (searchType) {
      case 'name':
        return item.name.toLowerCase().includes(searchTerm.toLowerCase())
      case 'category':
        return item.category.name.toLowerCase().includes(searchTerm.toLowerCase())
      case 'price':
        // Handle price search with range (e.g., "<100", ">100", "100-200")
        const price = item.price
        const term = searchTerm.trim()
        
        if (term.includes('-')) {
          const [min, max] = term.split('-').map(Number)
          return price >= min && price <= max
        } else if (term.startsWith('<')) {
          return price < Number(term.slice(1))
        } else if (term.startsWith('>')) {
          return price > Number(term.slice(1))
        } else {
          return price === Number(term)
        }
      default:
        return true
    }
  })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Menu Items</h1>
      
      {/* Bulk Delete Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Delete Images by Category</h2>
        <div className="space-y-4">
          {/* Category Selection */}
          <div>
            <p className="text-sm text-gray-600 mb-2">Select categories to delete images from:</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <label
                  key={category}
                  className={`
                    inline-flex items-center px-3 py-2 rounded-full border cursor-pointer transition-colors
                    ${selectedCategories.includes(category)
                      ? 'bg-red-100 border-red-500 text-red-700'
                      : 'bg-white border-gray-300 hover:bg-gray-50'}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => handleCategorySelection(category)}
                    className="hidden"
                  />
                  {category}
                </label>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div>
            <button
              onClick={handleBulkDeleteImages}
              disabled={selectedCategories.length === 0 || isDeleting}
              className={`px-4 py-2 rounded-lg text-white ${
                selectedCategories.length === 0 || isDeleting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isDeleting ? 'Deleting...' : `Delete Images from Selected Categories`}
            </button>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="mb-6 flex gap-4">
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value as SearchType)}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
        >
          <option value="name">Search by Name</option>
          <option value="category">Search by Category</option>
          <option value="price">Search by Price</option>
        </select>
        
        <div className="flex-1">
          <input
            type={searchType === 'price' ? 'text' : 'search'}
            placeholder={
              searchType === 'price' 
                ? 'Enter price (e.g., 100, <100, >100, 100-200)' 
                : `Search by ${searchType}...`
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          />
        </div>
      </div>

      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3">Name</th>
              <th scope="col" className="px-6 py-3">Category</th>
              <th scope="col" className="px-6 py-3">Price</th>
              <th scope="col" className="px-6 py-3">Description</th>
              <th scope="col" className="px-6 py-3">Status</th>
              <th scope="col" className="px-6 py-3">Image URL</th>
              <th scope="col" className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMenuItems.map((item: any) => (
              <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                <td className="px-6 py-4">{item.category.name}</td>
                <td className="px-6 py-4">₹{item.price}</td>
                <td className="px-6 py-4">{item.description || '-'}</td>
                <td className="px-6 py-4">{item.is_available ? 'Available' : 'Not Available'}</td>
                <td className="px-6 py-4">
                  {item.image_url ? (
                    <div className="flex flex-col gap-2">
                      <a 
                        href={item.image_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-600 hover:underline break-all"
                      >
                        {item.image_url}
                      </a>
                      <img 
                        src={item.image_url} 
                        alt={item.name} 
                        className="w-20 h-20 object-cover rounded"
                      />
                    </div>
                  ) : '-'}
                </td>
                <td className="px-6 py-4">
                  {item.image_url && (
                    <button
                      onClick={() => handleDeleteImage(item.id)}
                      className="font-medium text-red-600 hover:underline"
                    >
                      Delete Image
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Page