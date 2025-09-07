"use client";
import { fetchFromHasura } from "@/lib/hasuraClient";
import React, { useEffect, useState, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { X } from "lucide-react";
import QrScanAssign from "./QrScanAssign";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import QRCode from "qrcode";
import QrScanAssignBulk from "./QrScanAssignBulk";
import { QrCode } from "@/store/qrDataStore";



type Partner = {
  id: string;
  store_name: string;
};

const GET_QRS_QUERY = `
  query GetQrsWithPagination($limit: Int!, $offset: Int!, $where: qr_codes_bool_exp!) {
    qr_codes(order_by: {created_at: desc_nulls_last}, limit: $limit, offset: $offset, where: $where) {
      id
      qr_number
      table_number
      table_name
      partner_id
      partner {
        store_name
      }
    }
    qr_codes_aggregate(where: $where) {
      aggregate {
        count
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

const ASSIGN_QRS_TO_PARTNER_MUTATION = `
  mutation AssignQrsToPartner($qrIds: [uuid!], $partnerId: uuid!) {
    update_qr_codes_many(updates: {where: {id: {_in: $qrIds}}, _set: {partner_id: $partnerId}}) {
      affected_rows
    }
  }
`;

const INSERT_QR_CODES_MUTATION = `
  mutation InsertQrCodes($objects: [qr_codes_insert_input!]!) {
    insert_qr_codes(objects: $objects) {
      affected_rows
    }
  }
`;

const DELETE_QRS_MUTATION = `
  mutation DeleteQrs($qrIds: [uuid!]) {
    delete_qr_codes(where: {id: {_in: $qrIds}}) {
      affected_rows
    }
  }
`;

const UPDATE_QR_TABLE_NUMBER_MUTATION = `
  mutation UpdateQrTableNumber($qrId: uuid!, $tableNumber: Int) {
    update_qr_codes_by_pk(pk_columns: {id: $qrId}, _set: {table_number: $tableNumber}) {
      id
    }
  }
`;

const UPDATE_QR_TABLE_NAME_MUTATION = `
  mutation UpdateQrTableName($qrId: uuid!, $tableName: String) {
    update_qr_codes_by_pk(pk_columns: {id: $qrId}, _set: {table_name: $tableName}) {
      id
    }
  }
`;

const QrManagement_v2 = () => {
  const [qrs, setQrs] = useState<QrCode[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [limit, setLimit] = useState(() => {
    if (typeof window === "undefined") return 10;
    const savedLimit = localStorage?.getItem("qrManagementLimit");
    return savedLimit ? parseInt(savedLimit, 10) : 10;
  });

  const [selectedDomain, setSelectedDomain] = useState(() => {
    if (typeof window === "undefined") return "cravings.live";
    const savedDomain = localStorage?.getItem("qrManagementDomain");
    return savedDomain || "cravings.live";
  });

  const [limitInput, setLimitInput] = useState(limit.toString());
  const [mainSearch, setMainSearch] = useState("");
  const [debouncedMainSearch, setDebouncedMainSearch] = useState("");
  const mainSearchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  const [selectedQrs, setSelectedQrs] = useState(new Set<string>());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isTouchEvent = useRef(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [totalQrs, setTotalQrs] = useState(0);

  useEffect(() => {
    localStorage?.setItem("qrManagementLimit", limit.toString());
    setLimitInput(limit.toString());
  }, [limit]);

  useEffect(() => {
    localStorage?.setItem("qrManagementDomain", selectedDomain);
  }, [selectedDomain]);

  const fetchQrs = async () => {
    setLoading(true);
    exitSelectionMode();
    try {
      const offset = (page - 1) * limit;
      let whereClause = {};
      if (debouncedMainSearch.trim()) {
        const searchPattern = `%${debouncedMainSearch.trim()}%`;
        whereClause = {
          _or: [{ partner: { store_name: { _ilike: searchPattern } } }],
        };
      }

      const { qr_codes, qr_codes_aggregate } = await fetchFromHasura(
        GET_QRS_QUERY,
        { limit, offset, where: whereClause }
      );

      setQrs(qr_codes);
      setTotalQrs(qr_codes_aggregate.aggregate.count);
    } catch (error) {
      console.error("Error fetching QR codes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQrs();
  }, [page, debouncedMainSearch, limit]);

  useEffect(() => {
    if (mainSearchDebounceTimer.current) {
      clearTimeout(mainSearchDebounceTimer.current);
    }
    mainSearchDebounceTimer.current = setTimeout(() => {
      setPage(1);
      setDebouncedMainSearch(mainSearch);
    }, 500);

    return () => {
      if (mainSearchDebounceTimer.current) {
        clearTimeout(mainSearchDebounceTimer.current);
      }
    };
  }, [mainSearch]);

  useEffect(() => {
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }
    if (searchTerm.trim() !== "" && !selectedPartner) {
      searchDebounceTimer.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const { partners } = await fetchFromHasura(SEARCH_PARTNERS_QUERY, {
            search: `%${searchTerm}%`,
          });
          setSearchResults(partners);
        } catch (error) {
          console.error("Error searching for partners:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, selectedPartner]);

  const exitSelectionMode = () => {
    setSelectedQrs(new Set());
    setLastSelectedId(null);
    setSelectionMode(false);
    setSearchTerm("");
    setSelectedPartner(null);
    setSearchResults([]);
  };

  const handleCreateQrs = async () => {
    const numToCreateStr = prompt(
      "How many QR codes do you want to create? (Max 1000)"
    );
    if (!numToCreateStr) return;

    const numToCreate = parseInt(numToCreateStr, 10);
    if (isNaN(numToCreate) || numToCreate <= 0 || numToCreate > 1000) {
      alert("Please enter a valid positive number up to 1000.");
      return;
    }

    const newQrObjects = Array.from({ length: numToCreate }, (_, i) => ({
      qr_number: i + 1,
      created_at: new Date().toISOString(),
    }));

    setIsCreating(true);
    try {
      await fetchFromHasura(INSERT_QR_CODES_MUTATION, {
        objects: newQrObjects,
      });
      alert(`${numToCreate} QR codes created successfully!`);
      if (mainSearch) {
        setMainSearch("");
      } else {
        if (page !== 1) setPage(1);
        else await fetchQrs();
      }
    } catch (error) {
      console.error("Error creating QR codes:", error);
      alert("Failed to create QR codes. Check the console for details.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssignQrs = async () => {
    if (!selectedPartner || selectedQrs.size === 0) return;
    setIsAssigning(true);
    try {
      await fetchFromHasura(ASSIGN_QRS_TO_PARTNER_MUTATION, {
        qrIds: Array.from(selectedQrs),
        partnerId: selectedPartner.id,
      });
      setQrs((prev) =>
        prev.map((qr) =>
          selectedQrs.has(qr.id)
            ? {
                ...qr,
                partner_id: selectedPartner.id,
                partner: { store_name: selectedPartner.store_name },
              }
            : qr
        )
      );
    } catch (error) {
      console.error("Error assigning QRs:", error);
      alert("Failed to assign QR codes.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeleteQrs = async () => {
    if (selectedQrs.size === 0) return;

    const confirmation = window.confirm(
      `Are you sure you want to delete ${selectedQrs.size} QR code(s)? This action cannot be undone.`
    );
    if (!confirmation) return;

    setIsDeleting(true);
    try {
      await fetchFromHasura(DELETE_QRS_MUTATION, {
        qrIds: Array.from(selectedQrs),
      });
      alert(`${selectedQrs.size} QR code(s) deleted successfully!`);
      setQrs((prev) => prev.filter((qr) => !selectedQrs.has(qr.id)));
      exitSelectionMode();
    } catch (error) {
      console.error("Error deleting QR codes:", error);
      alert("Failed to delete QR codes.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChangeTableNumber = async () => {
    if (selectedQrs.size !== 1) return;
    const qrId = Array.from(selectedQrs)[0];
    const currentQr = qrs.find((qr) => qr.id === qrId);
    const newTableNumStr = prompt(
      `Enter new table number for QR: ${currentQr?.id}`,
      currentQr?.table_number?.toString() || ""
    );

    if (newTableNumStr === null || newTableNumStr.trim() === "") return;
    const newTableNumber = parseInt(newTableNumStr, 10);
    if (isNaN(newTableNumber)) {
      alert("Please enter a valid number.");
      return;
    }

    setIsUpdating(true);
    try {
      await fetchFromHasura(UPDATE_QR_TABLE_NUMBER_MUTATION, {
        qrId,
        tableNumber: newTableNumber,
      });
      setQrs((prev) =>
        prev.map((qr) =>
          qr.id === qrId ? { ...qr, table_number: newTableNumber } : qr
        )
      );
      exitSelectionMode();
    } catch (error) {
      console.error("Error updating table number:", error);
      alert("Failed to update table number.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangeTableName = async () => {
    if (selectedQrs.size !== 1) return;
    const qrId = Array.from(selectedQrs)[0];
    const currentQr = qrs.find((qr) => qr.id === qrId);
    let newTableName = prompt(
      `Enter new table name for QR: ${currentQr?.id}`,
      currentQr?.table_name || ""
    );

    setIsUpdating(true);

    if (newTableName === null || newTableName.trim() === "") {
      newTableName = null;
    }

    try {
      await fetchFromHasura(UPDATE_QR_TABLE_NAME_MUTATION, {
        qrId,
        tableName: newTableName,
      });
      setQrs((prev) =>
        prev.map((qr) =>
          qr.id === qrId ? { ...qr, table_name: newTableName } : qr
        )
      );
      exitSelectionMode();
    } catch (error) {
      console.error("Error updating table name:", error);
      alert("Failed to update table name.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRowInteraction = (
    clickedId: string,
    event: React.MouseEvent<HTMLTableRowElement>
  ) => {
    if (isTouchEvent.current) {
      isTouchEvent.current = false;
      if (selectionMode) {
        const newSelection = new Set(selectedQrs);
        if (newSelection.has(clickedId)) newSelection.delete(clickedId);
        else newSelection.add(clickedId);
        if (newSelection.size === 0) exitSelectionMode();
        else setSelectedQrs(newSelection);
      }
      return;
    }
    const isCtrlOrCmdClick = event.ctrlKey || event.metaKey;
    const newSelection = new Set(selectedQrs);
    if (event.shiftKey && lastSelectedId) {
      const lastIndex = qrs.findIndex((qr) => qr.id === lastSelectedId);
      const currentIndex = qrs.findIndex((qr) => qr.id === clickedId);
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      for (let i = start; i <= end; i++) newSelection.add(qrs[i].id);
      setSelectedQrs(newSelection);
      return;
    }
    if (isCtrlOrCmdClick) {
      if (newSelection.has(clickedId)) newSelection.delete(clickedId);
      else newSelection.add(clickedId);
      setLastSelectedId(clickedId);
      setSelectedQrs(newSelection);
      return;
    }
    if (newSelection.has(clickedId) && newSelection.size === 1) {
      exitSelectionMode();
    } else {
      setSelectedQrs(new Set([clickedId]));
      setLastSelectedId(clickedId);
    }
  };

  const handleCopyAllLinks = () => {
    const links = Array.from(selectedQrs)
      .map((qrId) => {
        const qrData = qrs.find((item) => item.id === qrId);
        if (!qrData) return "";
        return `https://${selectedDomain}/qrScan/${qrData.partner?.store_name.replace(
          /\s+/g,
          "-"
        )}/${qrData.id}`;
      })
      .filter(Boolean)
      .join("\n");
    navigator.clipboard
      .writeText(links)
      .then(() => toast.success("All QR links copied to clipboard"))
      .catch((error) => {
        console.error("Failed to copy links:", error);
        toast.error("Failed to copy links to clipboard");
      });
  };

  const generateTableSheet = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Table QR Codes");
      worksheet.columns = [
        { header: "Table No", key: "table_no", width: 15 },
        { header: "QR Code", key: "qr_code", width: 30 },
      ];
      const selectedQrsArray = Array.from(selectedQrs);
      for (let i = 0; i < selectedQrsArray.length; i++) {
        const qrId = selectedQrsArray[i];
        const qrdata = qrs.find((item) => item.id === qrId);
        if (!qrdata) continue;
        const qrUrl = `https://${selectedDomain}/qrScan/${qrdata.partner?.store_name.replace(
          /\s+/g,
          "-"
        )}/${qrdata.id}`;
        const base64 = await QRCode.toDataURL(qrUrl);
        worksheet.addRow([qrdata.table_number, ""]);
        const imageId = workbook.addImage({ base64, extension: "png" });
        worksheet.addImage(imageId, {
          tl: { col: 1, row: i + 1 },
          ext: { width: 100, height: 100 },
        });
        worksheet.getRow(i + 2).height = 80;
      }
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "TableQRs.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Table sheet with QR codes generated!");
    } catch (error) {
      console.error("Error generating Excel sheet:", error);
      toast.error("Failed to generate table sheet");
    }
  };

  const handleLimitChange = () => {
    const newLimit = parseInt(limitInput, 10);
    if (!isNaN(newLimit) && newLimit > 0) {
      if (newLimit !== limit) {
        setLimit(newLimit);
        setPage(1);
      }
    } else {
      setLimitInput(limit.toString());
    }
  };

  const totalPages = Math.ceil(totalQrs / limit);
  const isAnythingSelected = selectedQrs.size > 0;
  const isActionRunning = isAssigning || isDeleting || isUpdating;

  return (
    <div className="p-4">
      <QrScanAssignBulk />

      <div className="flex items-center justify-between mb-4 h-auto">
        {isAnythingSelected || selectionMode ? (
          <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-wrap items-center gap-2 w-full">
              <Button variant="ghost" size="icon" onClick={exitSelectionMode}>
                <X className="h-5 w-5" />
              </Button>
              <span className="font-medium text-sm whitespace-nowrap">
                {selectedQrs.size} selected
              </span>
              <div className="relative flex-grow min-w-[200px]">
                <Input
                  placeholder="Search for a partner to assign..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedPartner(null);
                  }}
                  className="text-sm"
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                    <ul>
                      {searchResults.map((partner) => (
                        <li
                          key={partner.id}
                          onClick={() => {
                            setSelectedPartner(partner);
                            setSearchTerm(partner.store_name);
                            setSearchResults([]);
                          }}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                        >
                          {partner.store_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleAssignQrs}
                disabled={!selectedPartner || isActionRunning}
              >
                {isAssigning ? "Assigning..." : "Assign"}
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAllLinks}
                disabled={!isAnythingSelected}
              >
                Copy Links
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateTableSheet}
                disabled={!isAnythingSelected || isActionRunning}
              >
                Generate Table Sheet
              </Button>
              {selectedQrs.size === 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleChangeTableNumber}
                    disabled={isActionRunning}
                  >
                    {isUpdating ? "Saving..." : "Change Table Number"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleChangeTableName}
                    disabled={isActionRunning}
                  >
                    {isUpdating ? "Saving..." : "Change Table Name"}
                  </Button>
                </>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteQrs}
                disabled={isActionRunning}
              >
                {isDeleting ? "Deleting..." : `Delete (${selectedQrs.size})`}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4 w-full">
            <div className="relative flex-1 min-w-[250px]">
              <Input
                placeholder="Search by Partner Name..."
                value={mainSearch}
                onChange={(e) => setMainSearch(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                Link Domain:
              </span>
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger className="w-auto sm:w-[180px] text-sm">
                  <SelectValue placeholder="Select Domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cravings.live">cravings.live</SelectItem>
                  <SelectItem value="app.cravings.live">
                    app.cravings.live
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={handleCreateQrs}
              disabled={isCreating || loading}
            >
              {isCreating ? "Creating..." : "Create New QR"}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table className="bg-white overflow-hidden">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>QR Id</TableHead>
              <TableHead>Table Number</TableHead>
              <TableHead>Table Name</TableHead>
              <TableHead>Partner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : qrs.length > 0 ? (
              qrs.map((qr) => (
                <TableRow
                  key={qr.id}
                  onClick={(e) => handleRowInteraction(qr.id, e)}
                  onTouchStart={() => {
                    isTouchEvent.current = true;
                    longPressTimer.current = setTimeout(() => {
                      setSelectionMode(true);
                      setSelectedQrs(new Set([qr.id]));
                    }, 500);
                  }}
                  onTouchEnd={() => {
                    if (longPressTimer.current)
                      clearTimeout(longPressTimer.current);
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  data-state={selectedQrs.has(qr.id) ? "selected" : ""}
                  className="cursor-pointer data-[state=selected]:bg-green-100 select-none"
                >
                  <TableCell className="pl-4">
                    <Checkbox
                      checked={selectedQrs.has(qr.id)}
                      aria-label={`Select QR code ${qr.id}`}
                      className={
                        isAnythingSelected || selectionMode
                          ? "opacity-100 transition-opacity"
                          : "opacity-0 transition-opacity"
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium text-xs sm:text-base">
                    {qr.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    {qr.table_number}
                  </TableCell>
                  <TableCell className="font-medium">
                    {qr.table_name ?? "N/A"}
                  </TableCell>
                  <TableCell>
                    {qr.partner?.store_name ?? (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  No QR codes found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-end gap-4 py-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Input
            type="number"
            disabled={loading}
            value={loading ? 0 : limitInput}
            onChange={(e) => setLimitInput(e.target.value)}
            onBlur={handleLimitChange}
            onKeyDown={(e) => e.key === "Enter" && handleLimitChange()}
            className="h-8 w-[70px]"
            min="1"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1 || loading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages || loading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QrManagement_v2;
