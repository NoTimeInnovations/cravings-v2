"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  QrCode,
  X,
  Search,
  Loader2,
  Trash2,
  Edit,
  Save,
  ArrowLeft,
} from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { toast } from "sonner";

declare global {
  interface Window {
    Html5Qrcode: any;
  }
}

// --- Component Props and Types ---
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

type Partner = {
  id: string;
  store_name: string;
};

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

const SEARCH_PARTNERS_QUERY = `
  query SearchPartners($search: String!) {
    partners(where: {store_name: {_ilike: $search}}, limit: 5) {
      id
      store_name
    }
  }
`;

const UPDATE_QR_DETAILS_MUTATION = `
  mutation UpdateQrDetails($id: uuid!, $qrNumber: Int, $tableNumber: Int, $partnerId: uuid, $tableName: String) {
    update_qr_codes_by_pk(
      pk_columns: {id: $id},
      _set: {
        qr_number: $qrNumber,
        table_number: $tableNumber,
        partner_id: $partnerId
        table_name: $tableName
      }
    ) {
      id
    }
  }
`;

const QrScanAssignBulk = () => {
  // --- STATE MANAGEMENT ---
  const [isBulkInterfaceOpen, setIsBulkInterfaceOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"scanner" | "list">("scanner");
  const [scannedQrs, setScannedQrs] = useState<QrDetails[]>([]);
  const [editingQr, setEditingQr] = useState<QrDetails | null>(null);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Partner search states for the modal
  const [partnerSearchTerm, setPartnerSearchTerm] = useState("");
  const [partnerSearchResults, setPartnerSearchResults] = useState<Partner[]>(
    []
  );
  const [isPartnerSearching, setIsPartnerSearching] = useState(false);
  const partnerSearchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Bulk edit states
  const [bulkPartner, setBulkPartner] = useState<Partner | null>(null);
  const [bulkPartnerSearch, setBulkPartnerSearch] = useState("");
  const [bulkPartnerResults, setBulkPartnerResults] = useState<Partner[]>([]);

  const scannerRef = useRef<any | null>(null);

  // --- EFFECTS ---

  // Effect to initialize and clean up the QR scanner
  useEffect(() => {
    if (isBulkInterfaceOpen && viewMode === "scanner") {
      const scriptId = "html5-qrcode-script";
      let script = document.getElementById(scriptId) as HTMLScriptElement;

      const onScriptLoad = () => {
        if (window.Html5Qrcode && !scannerRef.current) {
          const html5QrCode = new window.Html5Qrcode("qr-reader-bulk");
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

  // Debounced Partner Search Effect for the editing modal
  useEffect(() => {
    if (partnerSearchDebounceTimer.current)
      clearTimeout(partnerSearchDebounceTimer.current);
    if (partnerSearchTerm.trim() !== "") {
      partnerSearchDebounceTimer.current = setTimeout(async () => {
        setIsPartnerSearching(true);
        try {
          const { partners } = await fetchFromHasura(SEARCH_PARTNERS_QUERY, {
            search: `%${partnerSearchTerm}%`,
          });
          setPartnerSearchResults(partners || []);
        } catch (error) {
          console.error("Error searching partners:", error);
        } finally {
          setIsPartnerSearching(false);
        }
      }, 300);
    } else {
      setPartnerSearchResults([]);
    }
  }, [partnerSearchTerm]);

  // Debounced Partner Search Effect for the bulk edit
  useEffect(() => {
    if (partnerSearchDebounceTimer.current)
      clearTimeout(partnerSearchDebounceTimer.current);
    if (bulkPartnerSearch.trim() !== "") {
      partnerSearchDebounceTimer.current = setTimeout(async () => {
        try {
          const { partners } = await fetchFromHasura(SEARCH_PARTNERS_QUERY, {
            search: `%${bulkPartnerSearch}%`,
          });
          setBulkPartnerResults(partners || []);
        } catch (error) {
          console.error("Error searching partners:", error);
        }
      }, 300);
    } else {
      setBulkPartnerResults([]);
    }
  }, [bulkPartnerSearch]);

  // --- SCANNER LOGIC ---

  const startScanner = (scannerInstance: any) => {
    setStatusMessage("Initializing camera...");
    scannerInstance
      .start(
        { facingMode: "environment" },
        { fps: 5, qrbox: { width: 250, height: 250 } , aspectRatio: 1.0 },
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

  useEffect(() => {
    console.log("Scanned QR Codes useeffect:", scannedQrs);
  }, [scannedQrs]);

  const handleScanSuccess = async (decodedText: string) => {
    // This guard prevents processing new scans while one is already loading.
    if (isLoading) return;
    const extractedId = extractUuidFromUrl(decodedText);

    if (!extractedId) {
      setStatusMessage("Invalid QR code format.");
      setTimeout(() => setStatusMessage("Point camera at a QR code."), 2000);
      return;
    }

    // The duplicate check is moved inside the functional update below.
    // The `scannedQrs` array here in this scope is stale and will always be empty.
    console.log("Scanned QR ID:", extractedId);

    setIsLoading(true);
    setStatusMessage(`QR Detected! Fetching ${extractedId.substring(0, 8)}...`);

    try {
      const response = await fetchFromHasura(GET_QR_BY_PK, { id: extractedId });

      if (response.qr_codes_by_pk) {
        const newQr = response.qr_codes_by_pk;

        // **THE FIX:** Use a functional update for `setScannedQrs`.
        // `prevScannedQrs` is guaranteed by React to be the latest state.
        setScannedQrs((prevScannedQrs) => {
          console.log("scannedQrs inside setter:", prevScannedQrs);
          // Now perform the duplicate check against the most recent state.
          if (prevScannedQrs.some((qr) => qr.id === newQr.id)) {
            setStatusMessage(
              `QR ${newQr.id.substring(0, 8)}... already in list.`
            );
            // If it's a duplicate, return the state unchanged.
            return prevScannedQrs;
          }

          // If it's not a duplicate, add it to the array.
          setStatusMessage(`Added QR ${newQr.id.substring(0, 8)}...`);
          return [...prevScannedQrs, newQr];
        });
      } else {
        setStatusMessage(
          `No QR found with ID: ${extractedId.substring(0, 8)}...`
        );
      }
    } catch (err) {
      console.error("Error fetching QR details:", err);
      setStatusMessage("Failed to fetch QR details.");
    } finally {
      setIsLoading(false);
      // This timeout gives the user feedback before reverting the message.
      setTimeout(() => {
        if (scannerRef.current) {
          // Check if scanner is still active
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
    setBulkPartner(null);
    setBulkPartnerSearch("");
    setError(null);
    setStatusMessage(null);
  };

  const handleEditQr = (qr: QrDetails) => {
    setEditingQr(qr);
    console.log(qr)
    setPartnerSearchTerm(qr.partner?.store_name || "");
  };

  const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingQr) return;
    const { name, value } = e.target;
    setEditingQr((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSelectPartnerInModal = (partner: Partner) => {
    setEditingQr((prev) =>
      prev ? { ...prev, partner_id: partner.id, partner } : null
    );
    setPartnerSearchTerm(partner.store_name);
    setPartnerSearchResults([]);
  };

  const handleSaveChangesInModal = () => {
    if (!editingQr) return;
    setScannedQrs((prev) =>
      prev.map((qr) => (qr.id === editingQr.id ? editingQr : qr))
    );
    setEditingQr(null);
    setPartnerSearchTerm("");
  };

  const handleSelectBulkPartner = (partner: Partner) => {
    setBulkPartner(partner);
    setBulkPartnerSearch(partner.store_name);
    setBulkPartnerResults([]);
  };

  const handleApplyBulkPartner = () => {
    if (!bulkPartner) return;
    setScannedQrs((prev) =>
      prev.map((qr) => ({
        ...qr,
        partner_id: bulkPartner.id,
        partner: bulkPartner,
      }))
    );
    setStatusMessage(`Applied partner '${bulkPartner.store_name}' to all QRs.`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSaveAllToBackend = async () => {
    setIsUpdating(true);
    setError(null);
    setStatusMessage(`Saving ${scannedQrs.length} QR codes...`);

    const updatePromises = scannedQrs.map((qr) => {
      const variables = {
        id: qr.id,
        qrNumber: qr.qr_number,
        tableNumber: qr.table_number
          ? parseInt(String(qr.table_number), 10)
          : null,
        partnerId: qr.partner_id,
        tableName: qr.table_name,
      };
      return fetchFromHasura(UPDATE_QR_DETAILS_MUTATION, variables);
    });

    try {
      await Promise.all(updatePromises);
      setStatusMessage("All changes saved successfully!");
      toast.success("All changes saved successfully!");
      setTimeout(() => {
        handleCloseBulkInterface();
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error("Error saving bulk changes:", err);
      setError("Failed to save some changes. Please review and try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  // --- RENDER LOGIC ---

  const renderScannerView = () => (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Scan QR Codes</h2>
        <div
          id="qr-reader-bulk"
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
        View List ({scannedQrs.length})
      </button>
    </div>
  );

  const renderListView = () => (
    <div className="w-full h-full flex flex-col bg-orange-100">
      <header className="bg-white shadow-md p-4 flex justify-between items-center">
        <h2 className=" font-bold text-gray-800">
          Scanned QR List ({scannedQrs.length})
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("scanner")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg shadow-md hover:bg-orange-700"
          >
            <QrCode className="h-5 w-5" />
          </button>
          <button
            onClick={handleCloseBulkInterface}
            className=" text-black "
            aria-label="Close"
          >
            <X className="h-8 w-8" />
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {scannedQrs.length > 0 ? (
          <div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                Bulk Actions
              </h3>
              <div className="grid sm:grid-cols-3 gap-4 items-end">
                <div className="relative sm:col-span-2">
                  <label
                    htmlFor="bulk_partner"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Assign Partner to All
                  </label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      id="bulk_partner"
                      placeholder="Search for a partner..."
                      value={bulkPartnerSearch}
                      onChange={(e) => setBulkPartnerSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  {bulkPartnerResults.length > 0 && (
                    <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {bulkPartnerResults.map((p) => (
                        <li
                          key={p.id}
                          onClick={() => handleSelectBulkPartner(p)}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                        >
                          {p.store_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <button
                    onClick={handleApplyBulkPartner}
                    disabled={!bulkPartner}
                    className="w-full text-sm inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed"
                  >
                    Apply to All
                  </button>
                </div>
              </div>
              {statusMessage && !isUpdating && (
                <p className="text-green-600 text-sm mt-2">{statusMessage}</p>
              )}
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {scannedQrs.map((qr) => (
                  <li key={qr.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex-1 min-w-[200px]">
                        <p className="text-sm font-medium text-orange-600 truncate">
                          QR: {qr.qr_number || "N/A"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          ID: {qr.id}
                        </p>
                        <p className="text-sm text-gray-900 mt-1">
                          Partner:{" "}
                          <span className="font-semibold">
                            {qr.partner?.store_name || (
                              <span className="text-gray-400">
                                Not Assigned
                              </span>
                            )}
                          </span>
                        </p>
                        <p className="text-sm text-gray-900">
                          Table:{" "}
                          <span className="font-semibold">
                            {qr.table_name || qr.table_number || (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditQr(qr)}
                          className="p-2 text-gray-500 hover:text-orange-600 hover:bg-gray-100 rounded-full"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleRemoveQr(qr.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
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
              The list is empty
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Click "Scan More" to add QR codes.
            </p>
          </div>
        )}
      </main>
      {scannedQrs.length > 0 && (
        <footer className="bg-white p-4 border-t border-gray-200 flex justify-between items-center gap-4">
          <button
            onClick={handleClearAll}
            disabled={isUpdating}
            className="inline-flex items-center gap-2 text-nowrap text-sm font-medium text-red-600 hover:text-red-800 disabled:text-gray-400"
          >
            <Trash2 className="h-4 w-4" /> Clear All
          </button>
          <button
            onClick={handleSaveAllToBackend}
            disabled={isUpdating || scannedQrs.length === 0}
            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Save className="mr-2 h-5 w-5" />
            )}
            {isUpdating ? "Saving..." : `Save All`}
          </button>
        </footer>
      )}
      {error && (
        <p className="text-red-600 text-center p-4 bg-red-50">{error}</p>
      )}
    </div>
  );

  const renderEditModal = () => {
    if (!editingQr) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[10000] p-4">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-auto text-gray-800">
          <h2 className="text-2xl font-bold mb-1">Edit QR Code</h2>
          <p className="text-sm text-gray-500 mb-4 break-all">
            ID: {editingQr.id}
          </p>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="qr_number"
                className="block text-sm font-medium text-gray-700"
              >
                QR Number
              </label>
              <input
                type="text"
                id="qr_number"
                name="qr_number"
                value={editingQr.qr_number || ""}
                onChange={handleModalInputChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label
                htmlFor="table_number"
                className="block text-sm font-medium text-gray-700"
              >
                Table Number
              </label>
              <input
                type="number"
                id="table_number"
                name="table_number"
                value={editingQr.table_number || ""}
                onChange={handleModalInputChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label
                htmlFor="table_name"
                className="block text-sm font-medium text-gray-700"
              >
                Table Name
              </label>
              <input
                type="text"
                id="table_name"
                name="table_name"
                value={editingQr.table_name || ""}
                onChange={handleModalInputChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div className="relative">
              <label
                htmlFor="partner"
                className="block text-sm font-medium text-gray-700"
              >
                Partner
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="partner"
                  placeholder="Search for a partner..."
                  value={partnerSearchTerm}
                  onChange={(e) => setPartnerSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              {isPartnerSearching && (
                <p className="text-xs text-gray-500 mt-1">Searching...</p>
              )}
              {partnerSearchResults.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {partnerSearchResults.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => handleSelectPartnerInModal(p)}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                    >
                      {p.store_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={() => setEditingQr(null)}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveChangesInModal}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="">
      <div className="flex justify-end absolute top-[85px] right-4 z-[50]">
        <button
          onClick={handleOpenBulkInterface}
          className="inline-flex items-center gap-3 px-2 py-2 bg-orange-600 text-white font-bold text-sm rounded-lg shadow-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75"
        >
          <QrCode className="h-6 w-6" />
        </button>
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

      {editingQr && renderEditModal()}
    </div>
  );
};

export default QrScanAssignBulk;
