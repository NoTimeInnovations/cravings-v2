"use client";
import { fetchFromHasura } from "@/lib/hasuraClient";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import * as ExcelJS from "exceljs";
import * as QRCode from "qrcode";
import { saveAs } from "file-saver";

type Partner = {
  id: string;
  store_name: string;
};

type WhatsappGroup = {
  id: string;
  name: string;
  link: string;
  location: string;
};

type WhatsappQrCode = {
  id: string;
  number: number;
  partner_id: string;
  whatsapp_group_id: string;
  no_of_scans: number;
  created_at: string;
  link: string;
  location: string;
  whatsapp_group?: WhatsappGroup;
  partner?: Partner;
};

type EditableQrCodeFields = Pick<
  WhatsappQrCode,
  "partner_id" | "whatsapp_group_id"
> & {
  numberOfCodes?: number;
};

type NewWhatsappGroup = Omit<WhatsappGroup, "id">;

// --- API & PROP TYPES ---
type HasuraError = {
  message: string;
};

type HasuraResponse<T> = {
  data?: T;
  errors?: HasuraError[];
};

type QrCodeTableProps = {
  qrCodes: WhatsappQrCode[];
  onEdit: (code: WhatsappQrCode) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  onBulkDelete: () => void;
  onDownload: () => void;
};

type QrCodeFormProps = {
  qrCode: WhatsappQrCode | null;
  partners: Partner[];
  whatsappGroups: WhatsappGroup[];
  onSave: (data: EditableQrCodeFields & { numberOfCodes?: number }) => void;
  onCancel: () => void;
  onCreateGroup: () => void;
  onSearchPartners: (searchTerm: string) => Promise<void>;
  partnerSearchResults: Partner[];
  partnerSearchLoading: boolean;
};

type WhatsappGroupFormProps = {
  onSave: (group: NewWhatsappGroup) => void;
  onCancel: () => void;
};

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
};

const DeleteMultipleQrCodesMutation = `mutation DeleteMultipleQrCodes($ids: [uuid!]!) {
  delete_whatsapp_qr_codes(where: {id: {_in: $ids}}) {
    affected_rows
  }
}`;

// --- GRAPHQL QUERIES & MUTATIONS ---
const GetInitialDataQuery = `query GetInitialData {
  whatsapp_qr_codes(order_by: {created_at: desc}) {
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
   whatsapp_groups(order_by: {name: asc}) {
    id
    name
    link
    location
  }
}`;

const SearchPartnersQuery = `query SearchPartners($searchTerm: String!) {
  partners(where: {store_name: {_ilike: $searchTerm}}, limit: 10) {
    id
    store_name
  }
}`;

const CreateGroupMutation = `mutation CreateGroup($name: String!, $link: String!, $location: String!) {
  insert_whatsapp_groups_one(object: {name: $name, link: $link, location: $location}) {
    id
    name
    link
    location
  }
}`;

const CreateQrCodeMutation = `mutation CreateQrCode($partnerId: uuid = null, $groupId: uuid = null) {
  insert_whatsapp_qr_codes_one(object: {partner_id: $partnerId, whatsapp_group_id: $groupId}) {
    id
    number
    created_at
    no_of_scans
    partner_id
    whatsapp_group_id
  }
}`;

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

const DeleteQrCodeMutation = `mutation DeleteQrCode($id: uuid!) {
  delete_whatsapp_qr_codes_by_pk(id: $id) {
    id
  }
}`;

// --- UI COMPONENTS ---
const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center gap-2">
        <div className="h-8 bg-gray-200 rounded w-16"></div>
        <div className="h-8 bg-gray-200 rounded w-16"></div>
      </div>
    </td>
  </tr>
);

const Modal = ({ isOpen, onClose, children, title }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const QrCodeTable = ({
  qrCodes,
  onEdit,
  onDelete,
  onCreate,
  selectedIds,
  setSelectedIds,
  onBulkDelete,
  onDownload,
}: QrCodeTableProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(qrCodes.map((code) => code.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isAllSelected =
    qrCodes.length > 0 && selectedIds.length === qrCodes.length;

  const handleDeleteClick = (id: string) => {
    if (deletingId === id) {
      onDelete(id);
    } else {
      setDeletingId(id);
    }
  };

  useEffect(() => {
    const reset = () => setDeletingId(null);
    window.addEventListener("click", reset);
    return () => window.removeEventListener("click", reset);
  }, []);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
      {selectedIds.length > 0 ? (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-lg font-semibold text-gray-700">
            {selectedIds.length} item(s) selected
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Download
            </button>
            <button
              onClick={onBulkDelete}
              className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              WhatsApp QR Codes
            </h1>
            <p className="mt-1 text-gray-500">
              Manage all your QR codes in one place.
            </p>
          </div>
          <button
            onClick={onCreate}
            className="w-full sm:w-auto bg-orange-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            Create New
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  aria-label="Select all QR codes"
                />
              </th>
              {["Number", "Partner Name", "Scans", "Location", "Actions"].map(
                (header) => (
                  <th
                    key={header}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {qrCodes.map((code) => (
              <tr
                key={code.id}
                className={`hover:bg-gray-50 ${
                  selectedIds.includes(code.id) ? "bg-orange-50" : ""
                }`}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    checked={selectedIds.includes(code.id)}
                    onChange={() => handleSelectOne(code.id)}
                    aria-label={`Select QR code number ${code.number}`}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">
                  {code.number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {code.partner?.store_name || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                  {code.no_of_scans}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {code.location}
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(code)}
                      className="text-orange-600 hover:text-orange-800 font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(code.id)}
                      className={`font-semibold px-3 py-1 rounded ${
                        deletingId === code.id
                          ? "bg-red-500 text-white"
                          : "text-red-600 hover:text-red-800"
                      }`}
                    >
                      {deletingId === code.id ? "Confirm?" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {qrCodes.length === 0 && (
          <p className="text-center py-12 text-gray-500">No QR codes found.</p>
        )}
      </div>
    </div>
  );
};


const WhatsappGroupForm = ({ onSave, onCancel }: WhatsappGroupFormProps) => {
  const [group, setGroup] = useState<NewWhatsappGroup>({
    name: "",
    link: "",
    location: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setGroup({ ...group, [e.target.id]: e.target.value });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSave(group);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Group Name
        </label>
        <input
          id="name"
          type="text"
          value={group.name}
          onChange={handleChange}
          placeholder="e.g., Summer Sale Group"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      <div>
        <label
          htmlFor="link"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          WhatsApp Invite Link
        </label>
        <input
          id="link"
          type="url"
          value={group.link}
          onChange={handleChange}
          placeholder="https://chat.whatsapp.com/..."
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      <div>
        <label
          htmlFor="location"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Location
        </label>
        <input
          id="location"
          type="text"
          value={group.location}
          onChange={handleChange}
          placeholder="e.g., Downtown Store"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      <div className="flex justify-end gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-orange-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors"
        >
          Save Group
        </button>
      </div>
    </form>
  );
};

const QrCodeForm = ({
  qrCode,
  partners,
  whatsappGroups,
  onSave,
  onCancel,
  onCreateGroup,
  onSearchPartners,
  partnerSearchResults,
  partnerSearchLoading,
}: QrCodeFormProps) => {
  const [formData, setFormData] = useState<
    EditableQrCodeFields & { numberOfCodes: number }
  >({
    whatsapp_group_id: qrCode?.whatsapp_group_id || "",
    partner_id: qrCode?.partner_id || "",
    numberOfCodes: 1, // Default to 1
  });

  const [partnerSearch, setPartnerSearch] = useState(() =>
    qrCode
      ? partners.find((p) => p.id === qrCode.partner_id)?.store_name || ""
      : ""
  );

  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!qrCode;

  // Debounced search for partners
  useEffect(() => {
    if (partnerSearch.trim() === "") {
      return;
    }

    const timerId = setTimeout(() => {
      onSearchPartners(partnerSearch);
      setShowPartnerDropdown(true);
    }, 300);

    return () => clearTimeout(timerId);
  }, [partnerSearch, onSearchPartners]);

  const handlePartnerSelect = (partner: Partner) => {
    setPartnerSearch(partner.store_name);
    setFormData({ ...formData, partner_id: partner.id });
    setShowPartnerDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const dataToSend = isEditing
      ? {
          whatsapp_group_id: formData.whatsapp_group_id,
          partner_id: formData.partner_id,
        }
      : { ...formData, numberOfCodes: formData.numberOfCodes };

    onSave(dataToSend);
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isEditing ? "Edit QR Code" : "Create QR Codes"}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {!isEditing && (
          <div>
            <label
              htmlFor="numberOfCodes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Number of QR Codes to Create
            </label>
            <input
              id="numberOfCodes"
              type="number"
              min="1"
              max="100"
              value={formData.numberOfCodes}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  numberOfCodes: Math.max(1, parseInt(e.target.value) || 1),
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter how many QR codes you want to create with these settings
            </p>
          </div>
        )}

        <div>
          <label
            htmlFor="whatsapp_group_id"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            WhatsApp Group (Optional)
          </label>
          <div className="flex items-center gap-2">
            <select
              id="whatsapp_group_id"
              value={formData.whatsapp_group_id}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  whatsapp_group_id: e.target.value,
                }))
              }
              className="flex-grow w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">-- Select a group (optional) --</option>
              {whatsappGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.location})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onCreateGroup}
              className="shrink-0 bg-orange-100 text-orange-700 font-bold py-2 px-4 rounded-lg hover:bg-orange-200 transition-colors"
            >
              Create New
            </button>
          </div>
        </div>

        <div className="relative">
          <label
            htmlFor="partner-search"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Partner (Optional)
          </label>
          <input
            id="partner-search"
            value={partnerSearch}
            onChange={(e) => setPartnerSearch(e.target.value)}
            onFocus={() => setShowPartnerDropdown(true)}
            placeholder="Search partner by store name (optional)..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />

          {showPartnerDropdown && partnerSearch.trim() && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
              {partnerSearchLoading ? (
                <div className="p-2 text-center text-gray-500">Loading...</div>
              ) : partnerSearchResults.length > 0 ? (
                partnerSearchResults.map((partner) => (
                  <div
                    key={partner.id}
                    className="p-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => handlePartnerSelect(partner)}
                  >
                    {partner.store_name}
                  </div>
                ))
              ) : (
                <div className="p-2 text-center text-gray-500">
                  No partners found
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-orange-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors"
          >
            {isEditing
              ? "Save Changes"
              : `Create ${formData.numberOfCodes} QR Code${
                  formData.numberOfCodes > 1 ? "s" : ""
                }`}
          </button>
        </div>
      </form>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
const App = () => {
  const [qrCodes, setQrCodes] = useState<WhatsappQrCode[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsappGroup[]>([]);
  const [view, setView] = useState<"list" | "form">("list");
  const [selectedQrCode, setSelectedQrCode] = useState<WhatsappQrCode | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [isGroupModalOpen, setGroupModalOpen] = useState<boolean>(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [partnerSearchResults, setPartnerSearchResults] = useState<Partner[]>(
    []
  );
  const [partnerSearchLoading, setPartnerSearchLoading] =
    useState<boolean>(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setAppError(null);

      try {
        const { whatsapp_qr_codes, whatsapp_groups } = await fetchFromHasura(
          GetInitialDataQuery
        );

        if (whatsapp_qr_codes) {
          const formattedQrCodes =
            whatsapp_qr_codes?.map((c: any) => ({
              ...c,
              link: c.whatsapp_group?.link || "N/A",
              location:
                c.whatsapp_group?.location || c.whatsapp_group?.name || "N/A",
            })) || [];

          setQrCodes(formattedQrCodes);
          setWhatsappGroups(whatsapp_groups || []);
        }
      } catch (error) {
        setAppError(
          error instanceof Error
            ? error.message
            : "An unknown error occurred while fetching data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSearchPartners = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setPartnerSearchResults([]);
      return;
    }

    setPartnerSearchLoading(true);
    try {
      const { partners } = await fetchFromHasura(SearchPartnersQuery, {
        searchTerm: `%${searchTerm}%`,
      });

      if (partners) {
        setPartnerSearchResults(partners || []);
      }
    } catch (error) {
      console.error("Error searching partners:", error);
      setPartnerSearchResults([]);
    } finally {
      setPartnerSearchLoading(false);
    }
  }, []);

  const handleCreate = () => {
    setSelectedQrCode(null);
    setView("form");
  };

  const handleEdit = (code: WhatsappQrCode) => {
    setSelectedQrCode(code);
    setView("form");
  };

  const handleCancel = () => {
    setSelectedQrCode(null);
    setView("list");
  };

  const handleDelete = async (id: string) => {
    try {
      await fetchFromHasura(DeleteQrCodeMutation, { id });
      setQrCodes((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      setAppError(
        error instanceof Error ? error.message : "Could not delete QR code."
      );
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedIds.length} QR code(s)?`
      )
    ) {
      return;
    }

    try {
      await fetchFromHasura(DeleteMultipleQrCodesMutation, { ids: selectedIds });
      setQrCodes((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
      setSelectedIds([]);
    } catch (error) {
      setAppError(
        error instanceof Error
          ? error.message
          : "Could not delete selected QR codes."
      );
    }
  };

const handleDownload = async () => {
    if (selectedIds.length === 0) return;

    // 1. Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("QR Codes");

    // 2. Define columns and set headers
    worksheet.columns = [
      { header: "QR Number", key: "number", width: 15 },
      { header: "QR Link", key: "link", width: 50 },
      { header: "QR Code", key: "qrCode", width: 25 },
    ];
    // Make header bold
    worksheet.getRow(1).font = { bold: true };

    const selectedCodes = qrCodes.filter((code) =>
      selectedIds.includes(code.id)
    );

    // 3. Generate QR codes and add rows with images
    for (const code of selectedCodes) {
      const qrLink = `https://www.cravings.live/whatsappQr/${code.id}`;
      
      // Add the text data for the row
      const row = worksheet.addRow({
        number: code.number,
        link: qrLink,
      });

      // Set the row height to accommodate the image
      row.height = 80;

      // Generate QR code image as a base64 string
      const qrImage = await QRCode.toDataURL(qrLink, {
        width: 150,
        margin: 1,
      });
      
      // Add the image to the workbook
      const imageId = workbook.addImage({
        base64: qrImage,
        extension: "png",
      });

      // Embed the image in the 'QR Code' column for the current row
      worksheet.addImage(imageId, {
        tl: { col: 2, row: row.number - 1 }, // col is 0-indexed, row is 1-indexed
        ext: { width: 100, height: 100 },
      });
    }

    // 4. Write to buffer and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    saveAs(blob, "qr-codes.xlsx");
    setSelectedIds([]);
  };

  const handleSaveGroup = async (newGroupData: NewWhatsappGroup) => {
    try {
      const { insert_whatsapp_groups_one } = await fetchFromHasura(
        CreateGroupMutation,
        newGroupData
      );

      if (insert_whatsapp_groups_one) {
        setWhatsappGroups((prev) => [...prev, insert_whatsapp_groups_one]);
        setGroupModalOpen(false);
      }
    } catch (error) {
      setAppError(
        error instanceof Error ? error.message : "Could not save the new group."
      );
    }
  };

  const handleSaveQr = async (
    formFields: EditableQrCodeFields & { numberOfCodes?: number }
  ) => {
    const numberOfCodes = formFields.numberOfCodes || 1;
    const { numberOfCodes: _, ...qrData } = formFields;

    const selectedGroup = whatsappGroups.find(
      (g) => g.id === qrData.whatsapp_group_id
    );

    try {
      if (selectedQrCode) {
        const { update_whatsapp_qr_codes_by_pk } = await fetchFromHasura(
          UpdateQrCodeMutation,
          {
            id: selectedQrCode.id,
            partnerId: qrData.partner_id !== "" ? qrData.partner_id : null,
            groupId:
              qrData.whatsapp_group_id !== "" ? qrData.whatsapp_group_id : null,
          }
        );

        setQrCodes((prev) =>
          prev.map((c) =>
            c.id === selectedQrCode.id
              ? {
                  ...c,
                  ...update_whatsapp_qr_codes_by_pk,
                  link: selectedGroup?.link || "N/A",
                  location: selectedGroup?.location || "N/A",
                }
              : c
          )
        );
      } else {
        const createdCodes: WhatsappQrCode[] = [];

        for (let i = 0; i < numberOfCodes; i++) {
          const { insert_whatsapp_qr_codes_one } = await fetchFromHasura(
            CreateQrCodeMutation,
            {
              partnerId: qrData.partner_id || null,
              groupId: qrData.whatsapp_group_id || null,
            }
          );

          if (insert_whatsapp_qr_codes_one) {
            const newCode = {
              ...insert_whatsapp_qr_codes_one,
              link: selectedGroup?.link || "N/A",
              location: selectedGroup?.location || "N/A",
              partner: qrData.partner_id
                ? partners.find((p) => p.id === qrData.partner_id)
                : undefined,
            };
            createdCodes.push(newCode);
          }
        }

        setQrCodes((prev) => [...createdCodes, ...prev]);
      }
      handleCancel();
    } catch (error) {
      setAppError(
        error instanceof Error
          ? error.message
          : "Could not save the QR code(s)."
      );
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="animate-pulse flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-80"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded w-full sm:w-32"></div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <th key={i} className="px-6 py-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (appError) {
      return (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg"
          role="alert"
        >
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline ml-2">{appError}</span>
        </div>
      );
    }

    if (view === "form") {
      return (
        <QrCodeForm
          onSave={handleSaveQr}
          qrCode={selectedQrCode}
          partners={partners}
          whatsappGroups={whatsappGroups}
          onCancel={handleCancel}
          onCreateGroup={() => setGroupModalOpen(true)}
          onSearchPartners={handleSearchPartners}
          partnerSearchResults={partnerSearchResults}
          partnerSearchLoading={partnerSearchLoading}
        />
      );
    }

    return (
      <QrCodeTable
        qrCodes={qrCodes}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        onBulkDelete={handleBulkDelete}
        onDownload={handleDownload}
      />
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        {renderContent()}
      </div>
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        title="Create New WhatsApp Group"
      >
        <WhatsappGroupForm
          onSave={handleSaveGroup}
          onCancel={() => setGroupModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default App;
