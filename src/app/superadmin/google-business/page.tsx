'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search } from 'lucide-react';

interface Partner {
  id: string;
  store_name: string;
}

export default function GoogleBusinessPage() {
  const [loading, setLoading] = useState(false);
  const [partnerId, setPartnerId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  const [locations, setLocations] = useState<any[]>([]);
  const [fetchingLocations, setFetchingLocations] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('selected_google_partner');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setSelectedPartner(p);
        setPartnerId(p.id);
      } catch (e) {}
    }
  }, []);

  const fetchLocations = async () => {
    if (!partnerId) return;
    setFetchingLocations(true);
    try {
      const res = await fetch(`/api/google-business/locations?partnerId=${partnerId}`);
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Failed to fetch locations');
    } finally {
      setFetchingLocations(false);
    }
  };

  const linkLocation = async (locationName: string) => {
    if (!partnerId) return;
    try {
      const res = await fetch('/api/google-business/locations/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId, locationId: locationName })
      });
      const data = await res.json();
      if (data.success) {
        alert('Location linked successfully!');
        // Ideally, refresh state or show connected status
      } else {
        alert('Failed to link: ' + data.error);
      }
    } catch (e) {
      alert('Error linking location');
    }
  };

  const searchPartners = async (term: string) => {
    if (!term) {
      setPartners([]);
      return;
    }
    setSearching(true);
    try {
      const query = `
        query SearchPartners($term: String!) {
          partners(where: {store_name: {_ilike: $term}}, limit: 5) {
            id
            store_name
          }
        }
      `;
      
      const res = await fetch(process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT || '/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET || ''
        },
        body: JSON.stringify({
          query,
          variables: { term: `%${term}%` }
        })
      });
      
      const json = await res.json();
      if (json.data?.partners) {
        setPartners(json.data.partners);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const selectPartner = (p: Partner) => {
    setSelectedPartner(p);
    setPartnerId(p.id);
    setPartners([]);
    setSearchTerm('');
    localStorage.setItem('selected_google_partner', JSON.stringify(p));
  };

  const handleLogin = () => {
    if (!partnerId) {
      alert('Please select a Partner');
      return;
    }
    setLoading(true);
    window.location.href = `/api/google-business/auth/login?partnerId=${partnerId}`;
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Google Business Profile Integration</h1>
      
      <div className="grid gap-6 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Connect Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Search Section */}
            <div className="relative">
              <label className="text-sm font-medium mb-1 block">Select Partner</label>
              {selectedPartner ? (
                <div className="flex items-center justify-between p-3 border rounded bg-gray-50">
                  <span className="font-bold">{selectedPartner.store_name}</span>
                  <button 
                    onClick={() => { setSelectedPartner(null); setPartnerId(''); localStorage.removeItem('selected_google_partner'); }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input 
                      className="w-full p-2 border rounded" 
                      placeholder="Search store name..." 
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        searchPartners(e.target.value);
                      }}
                    />
                    {searching && <Loader2 className="animate-spin text-gray-400" />}
                  </div>
                  
                  {/* Dropdown */}
                  {partners.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg">
                      {partners.map(p => (
                        <div 
                          key={p.id}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => selectPartner(p)}
                        >
                          {p.store_name}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            
            <p className="text-gray-500 text-sm">
              Connect <strong>{selectedPartner?.store_name || 'Partner'}</strong> to Google Business.
            </p>
            
            <Button onClick={handleLogin} disabled={loading || !partnerId} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect with Google
            </Button>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-bold mb-2">Manage Locations</h3>
              <Button onClick={fetchLocations} disabled={fetchingLocations || !partnerId} variant="outline" className="w-full mb-4">
                {fetchingLocations && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Fetch Locations
              </Button>

              {locations.length > 0 && (
                <div className="space-y-2">
                  {locations.map((loc: any) => (
                    <div key={loc.name} className="border p-3 rounded text-sm flex justify-between items-center">
                      <div>
                        <div className="font-bold">{loc.title}</div>
                        <div className="text-gray-500">{loc.formattedAddress}</div>
                      </div>
                      <Button size="sm" onClick={() => linkLocation(loc.name)}>Link</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
