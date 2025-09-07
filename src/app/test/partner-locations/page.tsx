'use client';
import { fetchFromHasura } from '@/lib/hasuraClient'
import React, { useState } from 'react'
import convertLocToCoord from '../../actions/convertLocToCoord';

const isValidLocation = (location: string | null): boolean => {
  if (!location) return false;
  
  return location.match(
    /^(https?:\/\/)?(www\.)?(google\.com\/maps|maps\.app\.goo\.gl)\/.+/i
  ) !== null;
}

const updatePartnerGeoLocation = async (id: string, geoLocation: string) => {
  await fetchFromHasura(
    `mutation UpdatePartnerGeoLocation($id: uuid!, $geoLocation: geography!) {
      update_partners_by_pk(
        pk_columns: { id: $id },
        _set: { geo_location: $geoLocation }
      ) {
        id
      }
    }`,
    {
      id,
      geoLocation
    }
  );
}

const updatePartnerLocation = async (id: string, location: string) => {
  await fetchFromHasura(
    `mutation UpdatePartnerLocation($id: uuid!, $location: String!) {
      update_partners_by_pk(
        pk_columns: { id: $id },
        _set: { location: $location }
      ) {
        id
      }
    }`,
    {
      id,
      location
    }
  );
}

const Page = () => {
    const [partners, setPartners] = useState<Array<{
      id: string;
      store_name: string;
      location: string | null;
      geo_location: string | null;
    }>>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingLocation, setEditingLocation] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    React.useEffect(() => {
      fetchPartners();
    }, []);

    const fetchPartners = async () => {
      const { partners } = await fetchFromHasura(
        `query PartnersWithMissingLocationData {
          partners(where: {
            _or: [
              { geo_location: { _is_null: true } },
              { location: { _is_null: true } }
            ]
          }) {
            id
            location
            geo_location
            store_name
          }
        }`
      );
      setPartners(partners);
    };

    const handleEdit = (partner: { id: string; location: string | null }) => {
      setEditingId(partner.id);
      setEditingLocation(partner.location || '');
    };

    const handleUpdate = async (partnerId: string) => {
      if (!editingLocation) return;
      
      setLoading(true);
      try {
        // Update location
        await updatePartnerLocation(partnerId, editingLocation);
        
        // If location is valid, update geo_location
        if (isValidLocation(editingLocation)) {
          const coords = await convertLocToCoord(editingLocation);
          if (coords) {
            await updatePartnerGeoLocation(partnerId, coords);
          }
        }
        
        // Update local state
        setPartners(partners.map(p => {
          if (p.id === partnerId) {
            return {
              ...p,
              location: editingLocation,
              geo_location: isValidLocation(editingLocation) ? 'Updated' : null
            };
          }
          return p;
        }));
        
        setEditingId(null);
      } catch (error) {
        console.error('Failed to update partner:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleCancel = () => {
      setEditingId(null);
      setEditingLocation('');
    };

    return (
      <div className="p-4 max-w-[100vw]">
        <h1 className="text-2xl font-bold mb-4">Partners with missing location data</h1>
        <p className="mb-4">Total partners: {partners.length}</p>
        <div className="w-full">
          <table className="w-full table-fixed border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 w-1/4">Store Name</th>
                <th className="border border-gray-300 px-4 py-2 w-2/5">Location</th>
                <th className="border border-gray-300 px-4 py-2 w-[25%]">Geo Location</th>
                <th className="border border-gray-300 px-4 py-2 w-[10%]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((partner) => (
                <tr key={partner.id}>
                  <td className="border border-gray-300 px-4 py-2 break-words">{partner.store_name}</td>
                  <td className={`border border-gray-300 px-4 py-2 break-words ${!isValidLocation(partner.location) ? 'bg-red-200' : ''}`}>
                    {editingId === partner.id ? (
                      <input
                        type="text"
                        value={editingLocation}
                        onChange={(e) => setEditingLocation(e.target.value)}
                        className="w-full p-1 border rounded bg-white"
                      />
                    ) : (
                      partner.location || 'N/A'
                    )}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 break-words">{partner.geo_location || 'N/A'}</td>
                  <td className="border border-gray-300 px-4 py-2">
                    {editingId === partner.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(partner.id)}
                          disabled={loading}
                          className="bg-green-500 text-white px-2 py-1 rounded text-sm"
                        >
                          {loading ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={loading}
                          className="bg-gray-500 text-white px-2 py-1 rounded text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(partner)}
                        className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
}

export default Page