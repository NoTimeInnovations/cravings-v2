"use client";
import { QrType } from "@/app/whatsappQr/[id]/page";
import { fetchFromHasura } from "@/lib/hasuraClient";
import React, { useState, useEffect, useRef } from "react";

const UpdateQrCodeMutation = `mutation UpdateQrCode($id: uuid!, $partnerId: uuid, $groupId: uuid) {
  update_whatsapp_qr_codes_by_pk(pk_columns: {id: $id}, _set: {partner_id: $partnerId, whatsapp_group_id: $groupId}) {
    id
    number
    partner_id
    no_of_scans
    created_at
    whatsapp_group_id
    whatsapp_group {
      name
      link
      location
    }
    partner {
      id
      store_name
    }
  }
}`;

const ResetScansMutation = `mutation ResetScans($id: uuid!) {
  update_whatsapp_qr_codes_by_pk(pk_columns: {id: $id}, _set: {no_of_scans: 0}) {
    id
    no_of_scans
  }
}`;

const SearchPartnersQuery = `query SearchPartners($searchTerm: String!) {
  partners(where: {store_name: {_ilike: $searchTerm}}, limit: 10) {
    id
    store_name
  }
}`;

const getAllWhatsAppGroups = `query GetAllWhatsAppGroups {
  whatsapp_groups {
    id
    name
    link
    location
  }
}`;

const SuperAdminSettings = ({ QR } : { QR: QrType }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<any>(QR.partner || null);
  const [whatsappGroups, setWhatsappGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(QR.whatsapp_group || null);
  const [groupSearch, setGroupSearch] = useState("");
  const [filteredGroups, setFilteredGroups] = useState<any[]>([]);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Format date consistently to avoid hydration mismatch
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  useEffect(() => {
    fetchWhatsAppGroups();
  }, []);

  useEffect(() => {
    // Filter groups based on search term
    if (groupSearch.length === 0) {
      setFilteredGroups(whatsappGroups);
    } else {
      const filtered = whatsappGroups.filter(group => 
        group.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
        group.location.toLowerCase().includes(groupSearch.toLowerCase())
      );
      setFilteredGroups(filtered);
    }
  }, [groupSearch, whatsappGroups]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target as Node)) {
        setShowGroupDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchWhatsAppGroups = async () => {
    try {
      const response = await fetchFromHasura(getAllWhatsAppGroups, {});
      setWhatsappGroups(response.whatsapp_groups || []);
      setFilteredGroups(response.whatsapp_groups || []);
    } catch (error) {
      console.error("Error fetching WhatsApp groups:", error);
    }
  };

  const handlePartnerSearch = async (searchTerm: string) => {
    setPartnerSearch(searchTerm);
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetchFromHasura(SearchPartnersQuery, {
        searchTerm: `%${searchTerm}%`
      });
      setSearchResults(response.partners || []);
    } catch (error) {
      console.error("Error searching partners:", error);
    }
  };

  const handleUpdate = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      // Ensure we preserve the existing group if not changing it
      const groupId = selectedGroup?.id || (QR.whatsapp_group ? QR.whatsapp_group.id : null);
      
      const response = await fetchFromHasura(UpdateQrCodeMutation, {
        id: QR.id,
        partnerId: selectedPartner?.id || null,
        groupId: groupId,
      });
      
      setMessage("QR code updated successfully!");
      setTimeout(() => setMessage(""), 3000);
      window.location.reload();
    } catch (error) {
      console.error("Error updating QR code:", error);
      setMessage("Error updating QR code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetScans = async () => {
    if (!confirm("Are you sure you want to reset the scan count to 0?")) return;
    
    setIsLoading(true);
    setMessage("");
    try {
      const response = await fetchFromHasura(ResetScansMutation, {
        id: QR.id,
      });
      
      setMessage("Scan count reset to 0!");
      setTimeout(() => setMessage(""), 3000);
      // Refresh the page to show updated scan count
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error("Error resetting scans:", error);
      setMessage("Error resetting scans. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-slate-950 text-white">
      <h2 
        onClick={() => setIsExpanded(!isExpanded)} 
        className="text-xl font-bold mb-0 border-b border-gray-700 pb-2 cursor-pointer"
      >
        Superadmin Settings
      </h2>
      
      <div 
        ref={contentRef}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {/* QR Code Info */}
        <div className="mb-8 p-4 bg-emerald-500/5 rounded-lg mt-4">
          <h3 className="text-lg font-semibold mb-2">QR Code Information</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-400">ID:</div>
            <div className="truncate">{QR.id}</div>
            
            <div className="text-gray-400">Number:</div>
            <div>{QR.number}</div>
            
            <div className="text-gray-400">Scans:</div>
            <div>{QR.no_of_scans}</div>
            
            <div className="text-gray-400">Created:</div>
            <div>{formatDate(QR.created_at)}</div>
          </div>
        </div>
        
        {/* Change Partner */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Change Partner</h3>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Current Partner:</label>
            <div className="p-2 bg-emerald-500/5 rounded">
              {selectedPartner ? selectedPartner.store_name : "No partner assigned"}
            </div>
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Search Partners:</label>
            <input
              type="text"
              value={partnerSearch}
              onChange={(e) => handlePartnerSearch(e.target.value)}
              placeholder="Type to search partners..."
              className="w-full p-2 bg-emerald-500/5 border border-gray-700 rounded text-white"
            />
          </div>
          
          {searchResults.length > 0 && (
            <div className="mb-3 max-h-40 overflow-y-auto border border-gray-700 rounded">
              {searchResults.map((partner) => (
                <div
                  key={partner.id}
                  className="p-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                  onClick={() => {
                    setSelectedPartner(partner);
                    setSearchResults([]);
                    setPartnerSearch("");
                  }}
                >
                  {partner.store_name}
                </div>
              ))}
            </div>
          )}
          
          {selectedPartner && (
            <button
              onClick={() => setSelectedPartner(null)}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Clear Selection
            </button>
          )}
        </div>
        
        {/* Change WhatsApp Group */}
        <div className="mb-6 relative" ref={groupDropdownRef}>
          <h3 className="text-lg font-semibold mb-3">Change WhatsApp Group</h3>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Current Group:</label>
            <div className="p-2 bg-emerald-500/5 rounded">
              {selectedGroup ? `${selectedGroup.name} (${selectedGroup.location})` : "No group assigned"}
            </div>
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Search Groups:</label>
            <input
              type="text"
              value={groupSearch}
              onChange={(e) => {
                setGroupSearch(e.target.value);
                setShowGroupDropdown(true);
              }}
              onFocus={() => setShowGroupDropdown(true)}
              placeholder="Type to search groups..."
              className="w-full p-2 bg-emerald-500/5 border border-gray-700 rounded text-white"
            />
          </div>
          
          {showGroupDropdown && (
            <div className="mb-3 max-h-40 overflow-y-auto border border-gray-700 rounded absolute z-10 w-full bg-slate-900">
              {filteredGroups.length > 0 ? (
                filteredGroups.map((group) => (
                  <div
                    key={group.id}
                    className="p-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                    onClick={() => {
                      setSelectedGroup(group);
                      setGroupSearch("");
                      setShowGroupDropdown(false);
                    }}
                  >
                    {group.name} ({group.location})
                  </div>
                ))
              ) : (
                <div className="p-2 text-gray-400">No groups found</div>
              )}
            </div>
          )}
          
          {selectedGroup && (
            <button
              onClick={() => {
                setSelectedGroup(null);
                setGroupSearch("");
              }}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Clear Selection
            </button>
          )}
        </div>
        
        {/* Reset Scans */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Reset Scan Count</h3>
          <p className="text-sm text-gray-400 mb-3">Current scans: {QR.no_of_scans}</p>
          <button
            onClick={handleResetScans}
            disabled={isLoading}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded disabled:opacity-50"
          >
            {isLoading ? "Processing..." : "Reset to 0"}
          </button>
        </div>
        
        {/* Update Button */}
        <div className="mb-6">
          <button
            onClick={handleUpdate}
            disabled={isLoading}
            className="w-full py-3 bg-orange-700 hover:bg-orange-600 rounded disabled:opacity-50 font-medium"
          >
            {isLoading ? "Updating..." : "Save Changes"}
          </button>
        </div>
        
        {/* Message */}
        {message && (
          <div className={`p-3 rounded text-center ${message.includes("Error") ? "bg-red-800" : "bg-green-800"}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminSettings;