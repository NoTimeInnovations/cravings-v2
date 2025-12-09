"use client";
import React, { useState, useEffect, useRef } from "react";
import {
    QrCode,
    X,
    Loader2,
    Trash2,
    Save,
    ArrowLeft,
} from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

declare global {
    interface Window {
        Html5Qrcode: any;
    }
}

// --- GraphQL Queries & Mutations ---
const GET_QR_BY_PK = `
  query GetQrByPk($id: uuid!) {
    qr_codes_by_pk(id: $id) {
      id
      qr_number
      table_number
      table_name
      no_of_scans
      partner_id
      partner {
        id
        store_name
      }
    }
  }
`;

const UPDATE_QR_DETAILS_MUTATION = `
  mutation UpdateQrDetails($id: uuid!, $partnerId: uuid) {
    update_qr_codes_by_pk(
      pk_columns: {id: $id},
      _set: {
        partner_id: $partnerId
      }
    ) {
      id
    }
  }
`;

type QrDetails = {
    id: string;
    qr_number: string;
    table_number: number | null;
    table_name?: string | null;
    no_of_scans: number;
    partner_id: string | null;
    partner: {
        id: string;
        store_name: string;
    } | null;
};

export function AdminV2QrScanAssignBulk() {
    const { userData } = useAuthStore();
    const [isBulkInterfaceOpen, setIsBulkInterfaceOpen] = useState(false);
    const [viewMode, setViewMode] = useState<"scanner" | "list">("scanner");
    const [scannedQrs, setScannedQrs] = useState<QrDetails[]>([]);

    // Status states
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const scannerRef = useRef<any | null>(null);

    // --- EFFECTS ---

    // Effect to initialize and clean up the QR scanner
    useEffect(() => {
        if (isBulkInterfaceOpen && viewMode === "scanner") {
            const scriptId = "html5-qrcode-script";
            let script = document.getElementById(scriptId) as HTMLScriptElement;

            const onScriptLoad = () => {
                if (window.Html5Qrcode && !scannerRef.current) {
                    const html5QrCode = new window.Html5Qrcode("qr-reader-bulk-user");
                    scannerRef.current = html5QrCode;
                    startScanner(html5QrCode);
                }
            };

            if (!script) {
                script = document.createElement("script");
                script.id = scriptId;
                script.src = "https://unpkg.com/html5-qrcode";
                script.async = true;
                script.onload = onScriptLoad;
                document.body.appendChild(script);
            } else if (!scannerRef.current) {
                onScriptLoad();
            }

            return () => {
                if (scannerRef.current && scannerRef.current.isScanning) {
                    scannerRef.current
                        .stop()
                        .catch((err: any) => console.error("Failed to stop scanner:", err));
                    scannerRef.current = null;
                }
            };
        }
    }, [isBulkInterfaceOpen, viewMode]);

    // --- SCANNER LOGIC ---

    const startScanner = (scannerInstance: any) => {
        setStatusMessage("Initializing camera...");
        scannerInstance
            .start(
                { facingMode: "environment" },
                { fps: 5, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                (decodedText: string) => handleScanSuccess(decodedText),
                (errorMessage: string) => {
                    if (!statusMessage?.includes("Point camera")) {
                        setStatusMessage("Point camera at a QR code.");
                    }
                }
            )
            .catch((err: any) => {
                setError(`Scanner Error: ${err.message}. Check camera permissions.`);
                setViewMode("list");
            });
    };

    const extractUuidFromUrl = (url: string): string | null => {
        const uuidRegex =
            /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/;
        const match = url.match(uuidRegex);
        return match ? match[0] : null;
    };

    const handleScanSuccess = async (decodedText: string) => {
        if (isLoading) return;
        const extractedId = extractUuidFromUrl(decodedText);

        if (!extractedId) {
            setStatusMessage("Invalid QR code format.");
            setTimeout(() => setStatusMessage("Point camera at a QR code."), 2000);
            return;
        }

        setIsLoading(true);
        setStatusMessage(`QR Detected! Fetching ${extractedId.substring(0, 8)}...`);

        try {
            const response = await fetchFromHasura(GET_QR_BY_PK, { id: extractedId });

            if (response.qr_codes_by_pk) {
                const newQr = response.qr_codes_by_pk;

                // Check if already assigned to someone else
                if (newQr.partner_id && newQr.partner_id !== userData?.id) {
                    setStatusMessage(`QR is already assigned to another partner: ${newQr.partner?.store_name || 'Unknown'}`);
                    // Optional: Decide if we want to allow re-assigning here. Let's assume re-assigning needs current owner to release first or superAdmin mostly. 
                    // But usually for "Claiming", if it's assigned, you can't just take it. 
                    // However, for this requirement "create qr code ... assign to a qr group", let's assume this is for NEW unclaimed QRs or re-claiming own QRs.
                    // Let's warn but allow adding to list, the actual mutation might fail if there are permissions.
                    // Wait, usually the physical QR is just a pointer. If I have the physical QR, I should be able to claim it if I am an admin?
                    // Safest for Partner: Only allow claiming if partner_id is null OR partner_id is ME.
                    if (newQr.partner_id !== userData?.id) {
                        toast.error("This QR code belongs to another partner. You cannot claim it.");
                        setTimeout(() => setStatusMessage("Point camera at a QR code."), 2000);
                        return;
                    }
                }

                setScannedQrs((prevScannedQrs) => {
                    if (prevScannedQrs.some((qr) => qr.id === newQr.id)) {
                        setStatusMessage(`QR ${newQr.id.substring(0, 8)}... already in list.`);
                        return prevScannedQrs;
                    }
                    setStatusMessage(`Added QR ${newQr.id.substring(0, 8)}...`);
                    return [...prevScannedQrs, newQr];
                });
            } else {
                setStatusMessage(`No QR found with ID: ${extractedId.substring(0, 8)}...`);
            }
        } catch (err) {
            console.error("Error fetching QR details:", err);
            setStatusMessage("Failed to fetch QR details.");
        } finally {
            setIsLoading(false);
            setTimeout(() => {
                if (scannerRef.current) {
                    setStatusMessage("Point camera at a QR code.");
                }
            }, 2000);
        }
    };

    // --- HANDLERS ---
    const handleOpenBulkInterface = () => {
        setIsBulkInterfaceOpen(true);
        setViewMode("scanner");
    };

    const handleCloseBulkInterface = () => {
        handleClearAll();
        setIsBulkInterfaceOpen(false);
    };

    const handleRemoveQr = (id: string) => {
        setScannedQrs((prev) => prev.filter((qr) => qr.id !== id));
    };

    const handleClearAll = () => {
        setScannedQrs([]);
        setError(null);
        setStatusMessage(null);
    };

    const handleAssignAllToMe = async () => {
        if (!userData?.id) return;
        setIsUpdating(true);
        setError(null);
        setStatusMessage(`Assigning ${scannedQrs.length} QR codes to you...`);

        const updatePromises = scannedQrs.map((qr) => {
            // If already assigned to me, skip? No, just ensure it is.
            if (qr.partner_id === userData.id) return Promise.resolve();

            const variables = {
                id: qr.id,
                partnerId: userData.id,
            };
            return fetchFromHasura(UPDATE_QR_DETAILS_MUTATION, variables);
        });

        try {
            await Promise.all(updatePromises);
            setStatusMessage("All QRs successfully assigned to you!");
            toast.success("QRs assigned successfully!");
            setTimeout(() => {
                handleCloseBulkInterface();
                window.location.reload(); // Refresh to show in main list
            }, 2000);
        } catch (err) {
            console.error("Error saving bulk changes:", err);
            setError("Failed to assign some QRs. Please try again.");
        } finally {
            setIsUpdating(false);
        }
    };

    // --- RENDER LOGIC ---

    const renderScannerView = () => (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Scan QR Codes</h2>
                <p className="text-gray-300 mb-4 text-sm">Scan unassigned QR codes to claim them for your restaurant.</p>
                <div
                    id="qr-reader-bulk-user"
                    className="w-full h-auto aspect-square max-h-[300px] bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600"
                ></div>
                <div className="mt-4 h-12 flex items-center justify-center">
                    {isLoading && <Loader2 className="h-8 w-8 text-white animate-spin" />}
                    {statusMessage && (
                        <p className="text-white text-lg font-medium">{statusMessage}</p>
                    )}
                </div>
            </div>
            <button
                onClick={() => setViewMode("list")}
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg shadow-md hover:bg-orange-700"
            >
                <ArrowLeft className="h-5 w-5" />
                View Scanned ({scannedQrs.length})
            </button>
        </div>
    );

    const renderListView = () => (
        <div className="w-full h-full flex flex-col bg-orange-100">
            <header className="bg-white shadow-md p-4 flex justify-between items-center">
                <h2 className="font-bold text-gray-800">
                    Scanned QRs ({scannedQrs.length})
                </h2>
                <div className="flex items-center gap-2">
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => setViewMode("scanner")}
                        className="bg-orange-600 hover:bg-orange-700"
                    >
                        <QrCode className="h-4 w-4 mr-2" /> Scan More
                    </Button>
                    <button
                        onClick={handleCloseBulkInterface}
                        className="text-black ml-2"
                        aria-label="Close"
                    >
                        <X className="h-8 w-8" />
                    </button>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                {scannedQrs.length > 0 ? (
                    <div>
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <ul className="divide-y divide-gray-200">
                                {scannedQrs.map((qr) => (
                                    <li key={qr.id} className="p-4 hover:bg-gray-50">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-orange-600">
                                                    QR: {qr.qr_number || "N/A"}
                                                </p>
                                                <p className="text-xs text-gray-500">ID: {qr.id}</p>
                                                <p className="text-sm text-gray-900 mt-1">
                                                    Status: <span className={qr.partner_id === userData?.id ? "text-green-600" : "text-yellow-600"}>
                                                        {qr.partner_id === userData?.id ? "Already Yours" : "Ready to Claim"}
                                                    </span>
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveQr(qr.id)}
                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16 px-6 bg-white rounded-lg shadow">
                        <QrCode className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-lg font-medium text-gray-900">
                            No QRs Scanned
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Go back and scan some codes.
                        </p>
                    </div>
                )}
            </main>
            {scannedQrs.length > 0 && (
                <footer className="bg-white p-4 border-t border-gray-200 flex flex-col sm:flex-row gap-4">
                    <Button
                        variant="destructive"
                        onClick={handleClearAll}
                        disabled={isUpdating}
                        className="w-full sm:w-auto"
                    >
                        Clear All
                    </Button>
                    <Button
                        onClick={handleAssignAllToMe}
                        disabled={isUpdating}
                        className="w-full sm:flex-1 bg-green-600 hover:bg-green-700"
                    >
                        {isUpdating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assigning...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" /> Claim All ({scannedQrs.length})
                            </>
                        )}
                    </Button>
                </footer>
            )}
            {error && (
                <p className="text-red-600 text-center p-4 bg-red-50">{error}</p>
            )}
        </div>
    );

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button
                    onClick={handleOpenBulkInterface}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                    <QrCode className="mr-2 h-4 w-4" /> Scan & Assign QRs
                </Button>
            </div>

            {isBulkInterfaceOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-[9999] flex flex-col">
                    <button
                        onClick={handleCloseBulkInterface}
                        className="absolute top-4 right-4 text-white hover:text-orange-300 z-[10001]"
                        aria-label="Close"
                    >
                        <X className="h-8 w-8" />
                    </button>
                    {viewMode === "scanner" ? renderScannerView() : renderListView()}
                </div>
            )}
        </>
    );
}
