"use client";
import { useEffect, useState } from "react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { updatePartnerMutation } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { countryCodes } from "@/utils/countryCodes";

// Query to fetch all partners with phone, whatsapp_numbers, and country
interface WhatsappNumber {
  area: string;
  number: string;
}

interface Partner {
  id: string;
  store_name: string;
  phone: string | null;
  whatsapp_numbers: WhatsappNumber[] | null;
  country: string | null;
  country_code: string | null;
}

const emptyPartner: Partner = {
  id: '',
  store_name: '',
  phone: null,
  whatsapp_numbers: [],
  country: null,
  country_code: null,
};

const getAllPartnersPhoneQuery = `
  query GetAllPartnersPhone {
    partners(order_by: {store_name: asc}) {
      id
      store_name
      phone
      whatsapp_numbers
      country
      country_code
    }
  }
`;

// Add a mutation for updating country_code if needed
const updatePartnerCountryCodeMutation = `
  mutation UpdatePartnerCountryCode($id: uuid!, $country_code: String) {
    update_partners_by_pk(pk_columns: {id: $id}, _set: {country_code: $country_code}) {
      id
      country_code
    }
  }
`;

// Helper to check if a phone number has spaces
function hasSpace(num: string | null | undefined): boolean {
  return !!num && num.includes(" ");
}

// Helper to check if any phone or whatsapp number has a problem
function partnerHasPhoneProblem(partner: Partner): boolean {
  if (hasSpace(partner.phone)) return true;
  if (partner.whatsapp_numbers && partner.whatsapp_numbers.some(w => hasSpace(w.number))) return true;
  return false;
}

export default function PhoneCorrectionPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editIdx, setEditIdx] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partner>(emptyPartner);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPartners();
  }, []);

  async function fetchPartners() {
    setLoading(true);
    try {
      const res = await fetchFromHasura(getAllPartnersPhoneQuery);
      setPartners(res.partners);
    } catch (err) {
      console.log("err", err);
      toast.error("Failed to fetch partners");
    } finally {
      setLoading(false);
    }
  }

  // Sort partners: those with problems first, then those without
  const sortedPartners = [
    ...partners.filter(partnerHasPhoneProblem),
    ...partners.filter(p => !partnerHasPhoneProblem(p)),
  ];

  function handleEdit(partnerId: string) {
    // Find the partner in the original partners array by id
    const partner = partners.find(p => p.id === partnerId);
    if (!partner) return;
    setEditIdx(partnerId);
    setEditData({
      ...partner,
      whatsapp_numbers: partner.whatsapp_numbers ? [...partner.whatsapp_numbers] : [],
    });
  }

  function handleCancel() {
    setEditIdx(null);
    setEditData(emptyPartner);
  }

  function handleChange(field: keyof Partner, value: string | null) {
    setEditData((prev) => ({ ...prev, [field]: value }));
  }

  function handleWhatsappNumberChange(i: number, value: string) {
    setEditData((prev) => ({
      ...prev,
      whatsapp_numbers: (prev.whatsapp_numbers || []).map((item, idx) =>
        idx === i ? { ...item, number: value } : item
      ),
    }));
  }

  function handleWhatsappAreaChange(i: number, value: string) {
    setEditData((prev) => ({
      ...prev,
      whatsapp_numbers: (prev.whatsapp_numbers || []).map((item, idx) =>
        idx === i ? { ...item, area: value } : item
      ),
    }));
  }

  function handleAddWhatsapp() {
    setEditData((prev) => ({
      ...prev,
      whatsapp_numbers: [...(prev.whatsapp_numbers || []), { number: "", area: "" }],
    }));
  }

  function handleRemoveWhatsapp(i: number) {
    setEditData((prev) => ({
      ...prev,
      whatsapp_numbers: (prev.whatsapp_numbers || []).filter((_, idx) => idx !== i),
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Only update phone, whatsapp_numbers, and country_code
      await fetchFromHasura(updatePartnerMutation, {
        id: editData.id,
        updates: {
          phone: editData.phone,
          whatsapp_numbers: editData.whatsapp_numbers,
        },
      });
      // Update country_code separately if changed
      if (editData.country_code) {
        await fetchFromHasura(updatePartnerCountryCodeMutation, {
          id: editData.id,
          country_code: editData.country_code,
        });
      }
      revalidateTag(editData.id);
      toast.success("Partner updated successfully");
      setEditIdx(null);
      setEditData(emptyPartner);
      fetchPartners();
    } catch {
      toast.error("Failed to update partner");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Phone Number Correction</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Whatsapp Numbers</TableHead>
              <TableHead>Country Code</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPartners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell>{partner.store_name}</TableCell>
                <TableCell>
                  {editIdx === partner.id ? (
                    <Input
                      value={editData.phone || ""}
                      onChange={e => handleChange("phone", e.target.value)}
                    />
                  ) : (
                    <span>
                      {partner.phone || "-"}
                      {hasSpace(partner.phone) && (
                        <span className="text-red-500 ml-2 text-xs">Problem: contains space</span>
                      )}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {editIdx === partner.id ? (
                    <div className="space-y-2">
                      {(editData.whatsapp_numbers || []).map((item, i) => (
                        <div key={i} className="flex gap-2 mb-1">
                          <Input
                            className="w-32"
                            placeholder="Area"
                            value={item.area || ""}
                            onChange={e => handleWhatsappAreaChange(i, e.target.value)}
                          />
                          <Input
                            className="w-40"
                            placeholder="Whatsapp Number"
                            value={item.number || ""}
                            onChange={e => handleWhatsappNumberChange(i, e.target.value)}
                          />
                          <Button variant="ghost" onClick={() => handleRemoveWhatsapp(i)}>
                            Remove
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" onClick={handleAddWhatsapp}>
                        Add Whatsapp
                      </Button>
                    </div>
                  ) : (
                    (partner.whatsapp_numbers && partner.whatsapp_numbers.length > 0) ? (
                      <div className="space-y-1">
                        {partner.whatsapp_numbers.map((item, i) => (
                          <div key={i}>
                            <span className="font-medium">{item.area || "-"}:</span> {item.number}
                            {hasSpace(item.number) && (
                              <span className="text-red-500 ml-2 text-xs">Problem: contains space</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )
                  )}
                </TableCell>
                <TableCell>
                  {editIdx === partner.id ? (
                    <Select
                      value={editData.country_code || ""}
                      onValueChange={val => handleChange("country_code", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country code" />
                      </SelectTrigger>
                      <SelectContent>
                        {countryCodes.map(c => (
                          <SelectItem key={c.country} value={c.code}>
                            {c.country} ({c.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    partner.country_code || "-"
                  )}
                </TableCell>
                <TableCell>
                  {editIdx === partner.id ? (
                    <div className="flex gap-2">
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                      </Button>
                      <Button variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => handleEdit(partner.id)}>
                      Edit
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
} 