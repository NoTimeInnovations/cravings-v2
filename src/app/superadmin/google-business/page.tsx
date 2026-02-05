'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, RefreshCw, Terminal, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Partner {
  id: string;
  store_name: string;
}

export default function GoogleBusinessPage() {
  const [partnerId, setPartnerId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [fetchingLocations, setFetchingLocations] = useState(false);
  
  // Sync State
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-fetch locations when partner is selected
  useEffect(() => {
      if (partnerId) {
          fetchLocations();
      } else {
          setLocations([]);
          setSelectedLocation("");
      }
  }, [partnerId]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [syncLogs]);

  const addLog = (msg: string) => {
    setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const fetchLocations = async () => {
    if (!partnerId) return;
    setFetchingLocations(true);
    setLocations([]); // Reset
    try {
      const res = await fetch(`/api/google-business/locations?partnerId=${partnerId}`);
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations);
      } else {
        // alert('Error: ' + data.error);
        console.error("Fetch Locations Error:", data.error);
      }
    } catch (e) {
      console.error('Failed to fetch locations');
    } finally {
      setFetchingLocations(false);
    }
  };

  const handleSync = async () => {
    if (!partnerId || !selectedLocation) return;
    if (!confirm(`Sync menu for ${selectedPartner?.store_name} to Google?`)) return;
    
    setSyncLoading(true);
    setShowLogs(true);
    setSyncLogs([]); // Clear previous logs
    addLog("Starting menu sync...");
    addLog(`Target Location: ${selectedLocation}`);
    addLog("Fetching menu items from database...");
    addLog("This may take a few minutes (uploading images via Proxy)...");

    try {
        const res = await fetch('/api/google-business/menu/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ partnerId, locationId: selectedLocation })
        });
        
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            addLog("Error parsing response: " + text.substring(0, 100));
            throw new Error("Invalid response from server");
        }

        if (data.success) {
            addLog(`✅ Success! Synced ${data.itemCount} items.`);
            addLog(`📸 Images: ${data.uploadedImages} uploaded, ${data.failedImages} failed.`);
            
            if (data.failedImages > 0) {
                addLog("⚠️ Failed Images for:");
                data.failedItemsList.forEach((name: string) => addLog(`   - ${name}`));
            }
            
            addLog("Menu is LIVE on Google.");
        } else {
            addLog("❌ Sync Failed: " + (data.error || "Unknown error"));
        }
    } catch (e: any) {
        addLog("❌ Network/Server Error: " + e.message);
    } finally {
        setSyncLoading(false);
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

  return (
    <div className="container mx-auto py-10 pt-24 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <img src="https://www.gstatic.com/images/branding/product/1x/google_my_business_48dp.png" alt="GMB" className="w-8 h-8" />
        Google Business Integration
      </h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Partner Selection</CardTitle>
            <CardDescription>Select a partner to manage their Google Menu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Search Section */}
            <div className="relative">
              <label className="text-sm font-medium mb-1 block">Select Partner</label>
              {selectedPartner ? (
                <div className="flex items-center justify-between p-3 border rounded bg-gray-50">
                  <span className="font-bold text-lg">{selectedPartner.store_name}</span>
                  <button 
                    onClick={() => { setSelectedPartner(null); setPartnerId(''); localStorage.removeItem('selected_google_partner'); setLocations([]); setSyncLogs([]); setShowLogs(false); }}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Change Partner
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
          </CardContent>
        </Card>

        {/* Sync Controls (Only show if partner selected) */}
        {selectedPartner && (
            <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                    <CardTitle>Menu Sync Operations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    
                    {/* Location Selector */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">Target Google Location</label>
                        {fetchingLocations ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Loader2 className="h-4 w-4 animate-spin" /> Fetching locations from Master Account...
                            </div>
                        ) : (
                            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                                <SelectTrigger className="w-full bg-white">
                                    <SelectValue placeholder="Select a location..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {locations.map((loc) => (
                                        <SelectItem key={loc.name} value={loc.name}>
                                            <span className="font-medium">{loc.title}</span> 
                                            <span className="text-gray-400 text-xs ml-2">({loc.storeCode || 'No Code'})</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        {locations.length === 0 && !fetchingLocations && (
                            <p className="text-xs text-red-500 mt-1">No locations found. Make sure Master Account is connected.</p>
                        )}
                    </div>

                    {/* Sync Button */}
                    <Button 
                        onClick={handleSync} 
                        disabled={syncLoading || !selectedLocation} 
                        size="lg"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                        {syncLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Syncing Menu to Google...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-5 w-5" />
                                Start Sync
                            </>
                        )}
                    </Button>

                    {/* Terminal Logs */}
                    {showLogs && (
                        <div className="mt-4">
                            <div className="bg-black text-green-400 p-4 rounded-md font-mono text-xs h-64 overflow-y-auto border border-gray-800 shadow-2xl relative">
                                <div className="absolute top-0 left-0 right-0 bg-gray-900/90 border-b border-gray-700 p-2 flex items-center gap-2 text-gray-300 text-xs">
                                    <Terminal className="w-3 h-3" />
                                    <span>Sync Process Logs</span>
                                </div>
                                <div className="pt-8 space-y-1">
                                    {syncLogs.map((log, i) => (
                                        <div key={i} className="break-all">{log}</div>
                                    ))}
                                    <div ref={logsEndRef} />
                                </div>
                            </div>
                        </div>
                    )}

                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
