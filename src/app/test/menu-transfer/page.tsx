"use client";

import React, { useState, useEffect } from "react";
import { searchPartners } from "@/app/test/remove-partner-fulldata/actions";
import { copyMenu } from "./actions";
import { Loader2, ArrowRight, Check, X } from "lucide-react";

type Partner = {
    id: string;
    store_name: string;
    name: string;
    email: string;
    location: string;
};

export default function MenuTransferPage() {
    const [sourceSearch, setSourceSearch] = useState("");
    const [targetSearch, setTargetSearch] = useState("");

    const [sourceResults, setSourceResults] = useState<Partner[]>([]);
    const [targetResults, setTargetResults] = useState<Partner[]>([]);

    const [sourcePartner, setSourcePartner] = useState<Partner | null>(null);
    const [targetPartner, setTargetPartner] = useState<Partner | null>(null);

    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    // Helpers for search
    const handleSearch = async (query: string, setResults: (p: Partner[]) => void) => {
        if (query.length < 2) {
            setResults([]);
            return;
        }
        const res = await searchPartners(query);
        if (res.success) {
            setResults(res.partners);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => handleSearch(sourceSearch, setSourceResults), 300);
        return () => clearTimeout(timer);
    }, [sourceSearch]);

    useEffect(() => {
        const timer = setTimeout(() => handleSearch(targetSearch, setTargetResults), 300);
        return () => clearTimeout(timer);
    }, [targetSearch]);


    const handleTransfer = async () => {
        if (!sourcePartner || !targetPartner) return;
        if (sourcePartner.id === targetPartner.id) {
            setLogs(prev => [...prev, "❌ Source and Target cannot be the same partner."]);
            return;
        }

        setLoading(true);
        setLogs([]);
        setLogs(prev => [...prev, `🚀 Starting transfer from ${sourcePartner.store_name} to ${targetPartner.store_name}...`]);

        try {
            const res = await copyMenu(sourcePartner.id, targetPartner.id);

            if (res.results) {
                setLogs(prev => [...prev, ...res.results]);
            }

            if (res.success) {
                setLogs(prev => [...prev, "✅ Transfer Completed Successfully!"]);
            } else {
                setLogs(prev => [...prev, "❌ Transfer Failed with errors:"]);
                if (res.errors) {
                    setLogs(prev => [...prev, ...res.errors]);
                }
            }

        } catch (e: any) {
            setLogs(prev => [...prev, `❌ Critical Error: ${e.message}`]);
        } finally {
            setLoading(false);
        }
    };

    const PartnerSearch = ({
        title,
        search,
        setSearch,
        results,
        selected,
        setSelected
    }: {
        title: string,
        search: string,
        setSearch: (s: string) => void,
        results: Partner[],
        selected: Partner | null,
        setSelected: (p: Partner | null) => void
    }) => (
        <div className="flex flex-col gap-2 w-full">
            <h3 className="font-semibold text-lg">{title}</h3>

            {!selected ? (
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search name, store, email..."
                        className="w-full border p-2 rounded"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {results.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border rounded mt-1 max-h-60 overflow-y-auto shadow-lg z-10">
                            {results.map(p => (
                                <div
                                    key={p.id}
                                    className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-0"
                                    onClick={() => {
                                        setSelected(p);
                                        setSearch("");
                                    }}
                                >
                                    <div className="font-bold">{p.store_name}</div>
                                    <div className="text-xs text-gray-500">{p.name} | {p.email}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                    <div>
                        <div className="font-bold text-green-800">{selected.store_name}</div>
                        <div className="text-xs text-green-600">{selected.id}</div>
                    </div>
                    <button onClick={() => setSelected(null)} className="p-1 hover:bg-green-200 rounded">
                        <X className="w-4 h-4 text-green-700" />
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Menu Transfer Tool</h1>
                <p className="text-gray-500">Copy full menu (categories, items, variants) from one partner to another.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-start">
                <PartnerSearch
                    title="Source Partner (Copy From)"
                    search={sourceSearch}
                    setSearch={setSourceSearch}
                    results={sourceResults}
                    selected={sourcePartner}
                    setSelected={setSourcePartner}
                />

                <div className="hidden md:flex justify-center pt-8">
                    <ArrowRight className="w-8 h-8 text-gray-400" />
                </div>

                <PartnerSearch
                    title="Target Partner (Copy To)"
                    search={targetSearch}
                    setSearch={setTargetSearch}
                    results={targetResults}
                    selected={targetPartner}
                    setSelected={setTargetPartner}
                />
            </div>

            <div className="pt-4 border-t">
                <button
                    onClick={handleTransfer}
                    disabled={!sourcePartner || !targetPartner || loading}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" /> : "Start Menu Transfer"}
                </button>
            </div>

            {logs.length > 0 && (
                <div className="bg-slate-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
                    {logs.map((log, i) => (
                        <div key={i} className="mb-1">{log}</div>
                    ))}
                </div>
            )}
        </div>
    );
}
