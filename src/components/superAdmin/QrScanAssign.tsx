"use client";
import React, { useState, useEffect, useRef } from "react";
import { QrCode, X, Search, Loader2 } from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient"; // Assuming you have this helper

declare global {
  interface Window {
    Html5Qrcode: any;
  }
}

interface Html5QrcodeScanner {
  isScanning: boolean;
  stop: () => Promise<void>;
  start: (
    cameraId: any,
    config: any,
    onSuccess: (text: string) => void,
    onError: (error: string) => void
  ) => Promise<void>;
}

// --- Component Props and Types ---
type QrDetails = {
  id: string;
  qr_number: string;
  table_number: number | null;
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
  mutation UpdateQrDetails($id: uuid!, $qrNumber: Int, $tableNumber: Int, $partnerId: uuid) {
    update_qr_codes_by_pk(
      pk_columns: {id: $id},
      _set: {
        qr_number: $qrNumber,
        table_number: $tableNumber,
        partner_id: $partnerId
      }
    ) {
      id
    }
  }
`;

const QrScanAssign = () => {
  // --- STATE MANAGEMENT ---
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedQrId, setScannedQrId] = useState<string | null>(null);
  const [qrDetails, setQrDetails] = useState<Partial<QrDetails>>({});
  const [initialQrDetails, setInitialQrDetails] = useState<Partial<QrDetails>>(
    {}
  );

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Partner search states
  const [partnerSearchTerm, setPartnerSearchTerm] = useState("");
  const [partnerSearchResults, setPartnerSearchResults] = useState<Partner[]>(
    []
  );
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isPartnerSearching, setIsPartnerSearching] = useState(false);
  const partnerSearchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isScannerOpen && !scannedQrId) {
      // Dynamically load the scanner script
      const script = document.createElement("script");
      script.src = "https://unpkg.com/html5-qrcode";
      script.async = true;
      script.onload = () => {
        const html5QrCode = new window.Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;
        startScanner(html5QrCode);
      };
      document.body.appendChild(script);

      return () => {
        if (scannerRef.current && scannerRef.current?.isScanning) {
          scannerRef.current
            .stop()
            .catch((err) => console.error("Failed to stop scanner:", err));
        }
        document.body.removeChild(script);
      };
    }
  }, [isScannerOpen, scannedQrId]);

  const startScanner = (scannerInstance: any) => {
    setStatusMessage("Initializing camera...");
    scannerInstance
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText: string) =>
          handleScanSuccess(decodedText, scannerInstance),
        (errorMessage: string) => {
          // This callback is called frequently, so we only set a message once.
          if (statusMessage !== "Point camera at a QR code.") {
            setStatusMessage("Point camera at a QR code.");
          }
        }
      )
      .catch((err: any) => {
        setError(
          `Scanner Error: ${err.message}. Ensure you have a camera and have granted permissions.`
        );
      });
  };

  // Function to extract UUID from URL
  const extractUuidFromUrl = (url: string): string | null => {
    const uuidRegex =
      /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/;
    const match = url.match(uuidRegex);
    return match ? match[0] : null;
  };

  // Handler for successful scan
  const handleScanSuccess = (decodedText: string, scannerInstance: any) => {
    if (isLoading) return;
    setStatusMessage("QR Code detected! Processing...");
    if (scannerInstance && scannerInstance.isScanning) {
      scannerInstance.stop();
    }
    const extractedId = extractUuidFromUrl(decodedText);
    if (extractedId) {
      setScannedQrId(extractedId);
      fetchQrDetails(extractedId);
    } else {
      setError("Scanned QR code does not contain a valid ID.");
      setTimeout(resetScanner, 3000);
    }
  };

  // Fetch QR details from Hasura
  const fetchQrDetails = async (id: string) => {
    setIsLoading(true);
    setError(null);
    setStatusMessage(`Fetching details for ID: ${id.substring(0, 8)}...`);
    try {
      const response = await fetchFromHasura(GET_QR_BY_PK, { id });
      if (response.qr_codes_by_pk) {
        setQrDetails(response.qr_codes_by_pk);
        setInitialQrDetails(response.qr_codes_by_pk); // Store initial state for comparison
        setPartnerSearchTerm(response.qr_codes_by_pk.partner?.store_name || "");
      } else {
        setError(`No QR code found with ID: ${id}`);
        setTimeout(resetScanner, 3000);
      }
    } catch (err) {
      console.error("Error fetching QR details:", err);
      setError("Failed to fetch QR details. Please try again.");
      setTimeout(resetScanner, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced Partner Search Effect
  useEffect(() => {
    if (partnerSearchDebounceTimer.current) {
      clearTimeout(partnerSearchDebounceTimer.current);
    }
    if (
      partnerSearchTerm.trim() !== "" &&
      partnerSearchTerm !== initialQrDetails.partner?.store_name
    ) {
      partnerSearchDebounceTimer.current = setTimeout(async () => {
        setIsPartnerSearching(true);
        try {
          const { partners } = await fetchFromHasura(SEARCH_PARTNERS_QUERY, {
            search: `%${partnerSearchTerm}%`,
          });
          setPartnerSearchResults(partners || []);
        } catch (error) {
          console.error("Error searching partners:", error);
          setPartnerSearchResults([]);
        } finally {
          setIsPartnerSearching(false);
        }
      }, 300);
    } else {
      setPartnerSearchResults([]);
    }
  }, [partnerSearchTerm, initialQrDetails]);

  // --- HANDLERS ---
  const handleOpenScanner = () => {
    resetScanner();
    setIsScannerOpen(true);
  };

  const handleCloseScanner = () => {
    setIsScannerOpen(false);
    resetScanner();
  };

  const resetScanner = () => {
    setScannedQrId(null);
    setQrDetails({});
    setInitialQrDetails({});
    setError(null);
    setStatusMessage(null);
    setPartnerSearchTerm("");
    setPartnerSearchResults([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setQrDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectPartner = (partner: Partner) => {
    setQrDetails((prev) => ({ ...prev, partner_id: partner.id, partner }));
    setInitialQrDetails((prev) => ({
      ...prev,
      partner_id: partner.id,
      partner,
    })); // Lock in the new partner choice
    setPartnerSearchTerm(partner.store_name);
    setPartnerSearchResults([]);
  };

  const handleSaveChanges = async () => {
    if (!qrDetails.id) return;
    setIsUpdating(true);
    setError(null);
    try {
      const variables = {
        id: qrDetails.id,
        qrNumber: qrDetails.qr_number,
        tableNumber: qrDetails.table_number
          ? parseInt(String(qrDetails.table_number), 10)
          : null,
        partnerId: qrDetails.partner_id,
      };
      await fetchFromHasura(UPDATE_QR_DETAILS_MUTATION, variables);
      setStatusMessage("QR details updated successfully!");
      setTimeout(() => {
        resetScanner(); // Reset for next scan
      }, 2000);
    } catch (err) {
      console.error("Error updating QR details:", err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  // --- RENDER LOGIC ---
  const renderScannerContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-white gap-4">
          <Loader2 className="h-12 w-12 animate-spin" />
          <p className="text-lg font-medium">{statusMessage || "Loading..."}</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center text-white text-center p-4">
          <p className="text-lg font-semibold text-red-400">Error</p>
          <p>{error}</p>
          <button
            onClick={resetScanner}
            className="mt-4 bg-white text-black rounded-md px-4 py-2 font-semibold"
          >
            Scan Again
          </button>
        </div>
      );
    }

    if (scannedQrId && qrDetails.id) {
      return renderEditForm();
    }

    return (
      <div className="flex flex-col items-center justify-center text-white">
        <div
          id="qr-reader"
          className="w-[300px] h-auto max-h-[300px] bg-black rounded-lg overflow-hidden"
        ></div>
        <p className="text-white mt-4 text-center">{statusMessage}</p>
      </div>
    );
  };

  const renderEditForm = () => {
    return (
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-auto text-gray-800">
        <h2 className="text-2xl font-bold mb-1">Edit QR Code</h2>
        <p className="text-sm text-gray-500 mb-4 break-all">
          ID: {qrDetails.id}
        </p>

        {statusMessage && !error && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 rounded-md mb-4">
            {statusMessage}
          </div>
        )}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* QR Number */}
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
              value={qrDetails.qr_number || ""}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Table Number */}
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
              value={qrDetails.table_number || ""}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Partner Assignment */}
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
                className="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                    onClick={() => handleSelectPartner(p)}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                  >
                    {p.store_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Number of Scans (Read-only) */}
          <div>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Total Scans:</span>{" "}
              {qrDetails.no_of_scans}
            </p>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between">
          <button
            onClick={resetScanner}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Scan New
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={isUpdating}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUpdating ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-4">
      <div className="flex justify-end absolute top-[85px] right-4 z-[50]">
        <button
        onClick={handleOpenScanner}
        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg shadow-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75"
      >
        <QrCode className="h-5 w-5" />
      </button>
      </div>

      {isScannerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999] p-4">
          <button
            onClick={handleCloseScanner}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            aria-label="Close scanner"
          >
            <X className="h-8 w-8" />
          </button>

          {renderScannerContent()}
        </div>
      )}
    </div>
  );
};

export default QrScanAssign;
