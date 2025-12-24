"use client";

import { useState } from "react";
import { deletePartnerFullData, searchPartners } from "./actions"; // Import searchPartners
import { toast } from "sonner";

interface Partner {
    id: string;
    store_name: string;
    name: string;
    email: string;
    location: string;
}

export default function RemovePartnerPage() {
    // const [partnerId, setPartnerId] = useState(""); // Removed single ID state
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Partner[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Bulk Selection State
    const [selectedPartners, setSelectedPartners] = useState<Partner[]>([]);

    const AVAILABLE_TABLES = [
        "qr_scans", "order_items", "orders", "offers",
        "qr_codes", "qr_groups", "stocks", "menu", "category",
        "device_tokens", "captain", "payments", "partner_payments",
        "followers", "partner"
    ];

    const [selectedTableKeys, setSelectedTableKeys] = useState<string[]>(AVAILABLE_TABLES);

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await searchPartners(query);
            if (res.success) {
                setSearchResults(res.partners);
            } else {
                toast.error("Failed to search partners");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    const togglePartnerSelection = (partner: Partner) => {
        setSelectedPartners(prev => {
            const exists = prev.find(p => p.id === partner.id);
            if (exists) {
                return prev.filter(p => p.id !== partner.id);
            } else {
                return [...prev, partner];
            }
        });
    };

    const removeSelected = (partnerId: string) => {
        setSelectedPartners(prev => prev.filter(p => p.id !== partnerId));
    };

    const clearAllSelections = () => {
        setSelectedPartners([]);
        setSearchQuery("");
        setSearchResults([]);
        setLogs([]);
    };

    const toggleTableSelection = (tableKey: string) => {
        setSelectedTableKeys(prev => {
            if (prev.includes(tableKey)) {
                return prev.filter(k => k !== tableKey);
            } else {
                return [...prev, tableKey];
            }
        });
    };

    const toggleAllTables = () => {
        if (selectedTableKeys.length === AVAILABLE_TABLES.length) {
            setSelectedTableKeys([]);
        } else {
            setSelectedTableKeys(AVAILABLE_TABLES);
        }
    };

    const handleDelete = async () => {
        if (selectedPartners.length === 0) {
            toast.error("Please select at least one Partner");
            return;
        }

        const confirmDelete = window.confirm(
            `Are you sure you want to PERMANENTLY DELETE data for ${selectedPartners.length} partner(s)?\n\nTables selected: ${selectedTableKeys.join(", ")}\n\nThis cannot be undone.`
        );
        if (!confirmDelete) return;

        setLoading(true);
        setLogs([]); // Clear previous logs

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < selectedPartners.length; i++) {
            const partner = selectedPartners[i];
            const progressPrefix = `[${i + 1}/${selectedPartners.length}]`;

            setLogs((prev) => [...prev, `\n${progressPrefix} Starting deletion for: ${partner.store_name} (${partner.id})...`]);

            try {
                const result = await deletePartnerFullData(partner.id, selectedTableKeys);

                if (result.success) {
                    setLogs((prev) => [...prev, `${progressPrefix} ✅ Success`]);
                    successCount++;
                } else {
                    setLogs((prev) => [...prev, `${progressPrefix} ❌ Failed`]);
                    failCount++;
                }

                // Simplified log details for batch view
                Object.entries(result.results).forEach(([key, val]: [string, any]) => {
                    if (val.error) {
                        setLogs((prev) => [...prev, `   ❌ ${key}: ${val.error}`]);
                    } else if (val.skipped) {
                        // setLogs((prev) => [...prev, `   ⏭️ ${key}: Skipped`]); 
                    }
                });

            } catch (error: any) {
                setLogs((prev) => [...prev, `${progressPrefix} CRITICAL ERROR: ${error.message}`]);
                failCount++;
            }
        }

        setLoading(false);
        toast.info(`Deletion Complete. Success: ${successCount}, Failed: ${failCount}`);

        if (successCount === selectedPartners.length) {
            // Option: clear selections on full success
            // setSelectedPartners([]); 
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-red-600">
                ⚠️ Bulk Partner Data Removal Tool
            </h1>

            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p className="text-red-800 text-sm">
                    This tool will permanently delete selected partners and ALL associated data.
                    <strong>Use with extreme caution.</strong>
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Search & Select */}
                <div className="space-y-4">
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search Partner</label>
                        <input
                            type="text"
                            placeholder="Search by name, store name or email..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full p-2 border rounded shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        {isSearching && <div className="absolute right-3 top-9 text-gray-400 text-xs">Searching...</div>}

                        {searchResults.length > 0 && (
                            <div className="w-full mt-1 bg-white border rounded-md shadow-sm max-h-80 overflow-y-auto">
                                {searchResults.map((p) => {
                                    const isSelected = selectedPartners.some(sp => sp.id === p.id);
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => togglePartnerSelection(p)}
                                            className={`w-full text-left p-3 border-b last:border-0 hover:bg-gray-50 flex items-start gap-3 ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : ''}`}
                                        >
                                            <div className={`mt-1 w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                                {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{p.store_name || "No Store Name"}</div>
                                                <div className="text-xs text-gray-500">{p.name} • {p.email}</div>
                                                <div className="text-[10px] text-gray-400 font-mono mt-0.5">{p.id}</div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Key Selection List */}
                <div className="flex flex-col h-[500px]">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-gray-700">Selected Partners ({selectedPartners.length})</h3>
                        {selectedPartners.length > 0 && (
                            <button onClick={clearAllSelections} className="text-xs text-red-500 hover:text-red-700 underline">Clear All</button>
                        )}
                    </div>

                    <div className="flex-1 border rounded bg-gray-50 overflow-y-auto p-2 space-y-2 mb-4">
                        {selectedPartners.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
                                No partners selected
                            </div>
                        ) : (
                            selectedPartners.map(p => (
                                <div key={p.id} className="bg-white p-2 rounded shadow-sm border flex justify-between items-center group">
                                    <div className="min-w-0">
                                        <div className="font-medium text-sm truncate">{p.store_name}</div>
                                        <div className="text-xs text-gray-500 truncate">{p.id}</div>
                                    </div>
                                    <button
                                        onClick={() => removeSelected(p.id)}
                                        className="text-gray-400 hover:text-red-500 p-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        onClick={handleDelete}
                        disabled={loading || selectedPartners.length === 0}
                        className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                    >
                        {loading ? "Processing Batch..." : `DELETE ${selectedPartners.length} PARTNER(S)`}
                    </button>
                </div>
            </div>

            {/* Table Selection Scope */}
            <div className="bg-white p-4 rounded-lg border shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-bold text-gray-700">Data Deletion Scope (Tables)</h3>
                    <div className="space-x-2">
                        <span className="text-xs text-gray-500 mr-2">{selectedTableKeys.length}/{AVAILABLE_TABLES.length} Selected</span>
                        <button
                            onClick={toggleAllTables}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                            {selectedTableKeys.length === AVAILABLE_TABLES.length ? "Deselect All" : "Select All"}
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {AVAILABLE_TABLES.map(table => (
                        <label key={table} className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input
                                type="checkbox"
                                checked={selectedTableKeys.includes(table)}
                                onChange={() => toggleTableSelection(table)}
                                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                            />
                            <span className="font-mono text-xs">{table}</span>
                        </label>
                    ))}
                </div>
                <p className="text-xs text-yellow-600 mt-2">
                    ⚠️ Note: Unselecting tables may cause foreign key constraint errors if dependent child rows are not deleted first.
                    Default selection preserves the correct deletion order.
                </p>
            </div>

            {/* Logs Section */}
            <div className="bg-gray-900 text-green-400 p-4 rounded h-64 overflow-y-auto font-mono text-xs border shadow-inner">
                <h3 className="font-bold mb-2 text-gray-500 sticky top-0 bg-gray-900 pb-2 border-b border-gray-800">Operation Logs:</h3>
                {logs.length === 0 && <span className="text-gray-600 italic">Logs will appear here...</span>}
                {logs.map((log, i) => (
                    <div key={i} className="mb-1 whitespace-pre-wrap">
                        {log}
                    </div>
                ))}
            </div>
        </div>
    );
}

