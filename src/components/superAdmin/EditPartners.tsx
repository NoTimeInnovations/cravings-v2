"use client";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Partner } from "@/store/authStore";
import React, { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { revalidateTag } from "@/app/actions/revalidate";
import { deletePartnerFullData } from "@/app/test/remove-partner-fulldata/actions";
import { toast } from "sonner";
import {
  // DialogHeader,
  // DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countryCodes } from "@/utils/countryCodes";
import { useLocationStore } from "@/store/locationStore";
import BranchesPanel from "./BranchesPanel";
import { FeatureFlags, getFeatures, revertFeatureToString } from "@/lib/getFeatures";
import { provisionDefaultFlows } from "@/app/actions/provisionDefaultFlows";
import { Trash2, ArrowLeft } from "lucide-react";

interface PartnerWithDetails extends Partner {
  place_id?: string;
  currency: string;
  show_price_data?: boolean;
  razorpay_linked_account_id?: string;
  business_type?: string;
  country?: string;
  state?: string;
  username?: string;
  identifier?: string | null;
  feature_flags?: string;
}

// Short human-readable description per feature flag (shown as a tooltip-ish hint).
const FEATURE_DESCRIPTIONS: Record<string, string> = {
  ordering: "Ordering on the QR Scan page.",
  delivery: "Ordering on the Hotel Details page.",
  multiwhatsapp: "Multiple WhatsApp numbers for the partner.",
  pos: "POS feature.",
  stockmanagement: "Stock management.",
  captainordering: "Captain account creation & management.",
  purchasemanagement: "Purchase management.",
  whatsappnotifications: "WhatsApp order notifications to customers.",
  newonboarding: "New onboarding flow (login, order type, delivery address).",
  storefront: "Storefront.",
  growjet_delivery: "Routes delivery dispatch through Growjet.",
  delivery_agent: "Provider-agnostic delivery hub (fires on accepted).",
  whatsappOrdering: "Gates the Manage WhatsApp Templates surface.",
  porter_bridge: "Routes dispatch through porter-bridge.",
  prebooking: "Scheduled / prebooked orders for a future date & time.",
  loyalty_points: "Partner-scoped loyalty points.",
};

interface DeleteStats {
  orders: number;
  scans: number;
  menuItems: number;
  petpoojaConnected: boolean;
  cashfreeConnected: boolean;
}

const EditPartners = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [partners, setPartners] = useState<PartnerWithDetails[]>([]);
  // Seed the search box from the URL so a typed-and-reloaded list keeps its filter.
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") || "");
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<PartnerWithDetails | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);
  const { countries, locationData } = useLocationStore();
  const [countryCodeSearch, setCountryCodeSearch] = useState("");
  const searchUrlTimeout = useRef<NodeJS.Timeout | null>(null);

  // Delete-confirmation state. Stats are fetched lazily only when delete is clicked.
  const [deleteTarget, setDeleteTarget] = useState<PartnerWithDetails | null>(null);
  const [deleteStats, setDeleteStats] = useState<DeleteStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getAllPartners = async () => {
    setLoading(true);
    try {
      const res = await fetchFromHasura(
        `query {
          partners {
            id
            name
            email
            store_name
            location
            status
            upi_id
            description
            password
            phone
            district
            place_id
            currency
            show_price_data
            razorpay_linked_account_id
            business_type
            country_code
            state
            country
            username
            identifier
            petpooja_restaurant_id
            feature_flags
          }
        }`
      );

      if (res) {
        setPartners(res.partners);
      }
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Failed to fetch partners");
    } finally {
      setLoading(false);
    }
  };

  const searchPartner = () => {
    if (!searchQuery) return partners;
    return partners.filter((partner) =>
      (partner.store_name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const updatePartner = async (partnerId: string, updates: Partial<PartnerWithDetails>) => {
    try {
      await fetchFromHasura(
        `mutation UpdatePartner($partnerId: uuid!, $updates: partners_set_input!) {
          update_partners_by_pk(pk_columns: {id: $partnerId}, _set: $updates) {
            id
          }
        }`,
        {
          partnerId,
          updates,
        }
      );
      revalidateTag(partnerId);
      toast.success("Partner updated successfully");
      getAllPartners();
    } catch (error) {
      console.error("Error updating partner:", error);
      toast.error("Failed to update partner");
    }
  };

  // Merge query-param updates into the URL (null removes a param) so list state
  // — the open partner and the typed search — survives a reload.
  const updateUrlParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const setPartnerIdInUrl = (partnerId: string | null) => {
    updateUrlParams({ partnerId });
  };

  // Persist the typed search term in the URL (debounced to avoid a navigation per keystroke).
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchUrlTimeout.current) clearTimeout(searchUrlTimeout.current);
    searchUrlTimeout.current = setTimeout(() => {
      updateUrlParams({ q: value || null });
    }, 300);
  };

  const selectPartner = (partner: PartnerWithDetails) => {
    setSelectedPartner(partner);
    setFeatureFlags(getFeatures(partner.feature_flags || ""));
    setUsernameStatus("idle");
    originalUsernameRef.current = partner.username || "";
  };

  const handleEdit = (partner: PartnerWithDetails) => {
    selectPartner(partner);
    setPartnerIdInUrl(partner.id);
  };

  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);
  const originalUsernameRef = useRef<string>("");

  const validateAndCheckUsername = (username: string) => {
    if (usernameCheckTimeout.current) clearTimeout(usernameCheckTimeout.current);
    if (!username || username.length < 3) { setUsernameStatus("idle"); return; }
    if (username === originalUsernameRef.current) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    usernameCheckTimeout.current = setTimeout(async () => {
      try {
        const { checkUsernameAvailable } = await import("@/app/actions/checkUsername");
        const { isAvailable } = await checkUsernameAvailable(username);
        setUsernameStatus(isAvailable ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);
  };

  // Toggle a feature flag locally only. Persisted on Save Changes, mirroring the
  // access/enabled coupling used in the Feature Flag Management section.
  const updateLocalFeatureFlag = (
    feature: keyof FeatureFlags,
    type: "access" | "enabled",
    value: boolean
  ) => {
    setFeatureFlags((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [feature]: {
          ...prev[feature],
          [type]: value,
          ...(type === "enabled" && value ? { access: true } : {}),
          ...(type === "access" && !value ? { enabled: false } : {}),
        },
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;

    const newUsername = selectedPartner.username || undefined;

    // Validate username uniqueness if changed
    if (newUsername && newUsername !== originalUsernameRef.current) {
      if (newUsername.length < 3) {
        toast.error("Username must be at least 3 characters");
        return;
      }
      if (!/^[a-z0-9_]+$/.test(newUsername)) {
        toast.error("Username can only contain lowercase letters, numbers, and underscores");
        return;
      }
      const { checkUsernameAvailable } = await import("@/app/actions/checkUsername");
      const { isAvailable } = await checkUsernameAvailable(newUsername);
      if (!isAvailable) {
        toast.error("This username is already taken");
        setUsernameStatus("taken");
        return;
      }
    }

    const updates = {
      name: selectedPartner.name,
      email: selectedPartner.email,
      store_name: selectedPartner.store_name,
      location: selectedPartner.location,
      status: selectedPartner.status,
      upi_id: selectedPartner.upi_id,
      description: selectedPartner.description,
      password: selectedPartner.password,
      phone: selectedPartner.phone,
      district: selectedPartner.district,
      place_id: selectedPartner.place_id,
      currency: selectedPartner.currency,
      show_price_data: selectedPartner.show_price_data,
      razorpay_linked_account_id: selectedPartner.razorpay_linked_account_id,
      business_type: selectedPartner.business_type,
      country: selectedPartner.country,
      country_code: selectedPartner.country_code,
      state: selectedPartner.state,
      username: newUsername,
      identifier: selectedPartner.identifier || null,
      petpooja_restaurant_id: selectedPartner.petpooja_restaurant_id || undefined,
      ...(featureFlags ? { feature_flags: revertFeatureToString(featureFlags) } : {}),
    };
    updatePartner(selectedPartner.id, updates);
    // When WhatsApp ordering is enabled, seed the partner's built-in flow set
    // (welcome + order-status). Idempotent, so re-saving never duplicates.
    if (featureFlags?.whatsappOrdering?.enabled) {
      provisionDefaultFlows(selectedPartner.id)
        .then((r) => {
          if (r.created > 0) toast.success(`Added ${r.created} WhatsApp flow${r.created > 1 ? "s" : ""}`);
        })
        .catch(() => {});
    }
    closeEditor();
  };

  const closeEditor = () => {
    setSelectedPartner(null);
    setFeatureFlags(null);
    setPartnerIdInUrl(null);
  };

  const handleCancel = () => {
    closeEditor();
  };

  // ----- Delete flow -----
  const openDeleteDialog = async (partner: PartnerWithDetails) => {
    setDeleteTarget(partner);
    setDeleteStats(null);
    setStatsLoading(true);
    try {
      const res = await fetchFromHasura(
        `query PartnerDeleteStats($id: uuid!) {
          orders_aggregate(where: { partner_id: { _eq: $id } }) { aggregate { count } }
          menu_aggregate(where: { partner_id: { _eq: $id } }) { aggregate { count } }
          qr_codes(where: { partner_id: { _eq: $id } }) { id }
          partners_by_pk(id: $id) {
            petpooja_restaurant_id
            accept_payments_via_cashfree
            cashfree_merchant_id
          }
        }`,
        { id: partner.id }
      );

      const qrIds: string[] = (res?.qr_codes || []).map((q: any) => q.id);
      let scans = 0;
      if (qrIds.length > 0) {
        const scanRes = await fetchFromHasura(
          `query PartnerScanCount($qr_ids: [uuid!]!) {
            qr_scans_aggregate(where: { qr_id: { _in: $qr_ids } }) { aggregate { count } }
          }`,
          { qr_ids: qrIds }
        );
        scans = scanRes?.qr_scans_aggregate?.aggregate?.count || 0;
      }

      const pk = res?.partners_by_pk;
      setDeleteStats({
        orders: res?.orders_aggregate?.aggregate?.count || 0,
        scans,
        menuItems: res?.menu_aggregate?.aggregate?.count || 0,
        petpoojaConnected: !!pk?.petpooja_restaurant_id,
        cashfreeConnected: pk?.accept_payments_via_cashfree === true && !!pk?.cashfree_merchant_id,
      });
    } catch (error) {
      console.error("Error fetching delete stats:", error);
      toast.error("Failed to load partner data");
    } finally {
      setStatsLoading(false);
    }
  };

  const closeDeleteDialog = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteStats(null);
    setStatsLoading(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deletePartnerFullData(deleteTarget.id);
      if (result.success) {
        toast.success("Partner and all related data deleted");
      } else {
        toast.error(`Deleted with some errors: ${result.errors.join("; ")}`);
      }
      revalidateTag(deleteTarget.id);
      // If the deleted partner was open in the editor, close it.
      if (selectedPartner?.id === deleteTarget.id) {
        closeEditor();
      }
      setDeleteTarget(null);
      setDeleteStats(null);
      await getAllPartners();
    } catch (error) {
      console.error("Error deleting partner:", error);
      toast.error("Failed to delete partner");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    getAllPartners();
  }, []);

  // Restore the open partner from the URL once partners are loaded (e.g. after a reload).
  useEffect(() => {
    if (loading) return;
    const partnerId = searchParams.get("partnerId");
    if (partnerId && selectedPartner?.id !== partnerId) {
      const match = partners.find((p) => p.id === partnerId);
      if (match) selectPartner(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, partners, searchParams]);

  const filteredPartners = searchPartner();

  return (
    <div className="p-0 md:p-6">


      {selectedPartner ? (
        <div className="flex items-center justify-center">
          <div className="bg-[#FFF7EC] rounded-lg shadow-lg w-full mx-auto p-5 md:p-8">
            <Button
              type="button"
              variant="ghost"
              className="mb-4 -ml-2 text-gray-700"
              onClick={closeEditor}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to list
            </Button>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Edit Partner Details</h2>
              <p className="text-gray-600">Make changes to the partners information here.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={selectedPartner.name}
                    onChange={(e) =>
                      setSelectedPartner({ ...selectedPartner, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={selectedPartner.email}
                    onChange={(e) =>
                      setSelectedPartner({ ...selectedPartner, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store_name">Store Name</Label>
                  <Input
                    id="store_name"
                    value={selectedPartner.store_name}
                    onChange={(e) =>
                      setSelectedPartner({ ...selectedPartner, store_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={selectedPartner.username || ""}
                    placeholder="e.g. the_burger_joint"
                    onChange={(e) => {
                      const raw = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                      setSelectedPartner({ ...selectedPartner, username: raw });
                      validateAndCheckUsername(raw);
                    }}
                  />
                  <p className="text-xs text-gray-500">
                    menuthere.com/{selectedPartner.username || "username"}
                  </p>
                  {usernameStatus === "checking" && (
                    <p className="text-xs text-gray-400">Checking availability...</p>
                  )}
                  {usernameStatus === "available" && (
                    <p className="text-xs text-green-600">Username is available</p>
                  )}
                  {usernameStatus === "taken" && (
                    <p className="text-xs text-red-500">This username is already taken</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="identifier">Identifier</Label>
                  <Input
                    id="identifier"
                    placeholder="Internal note to identify this partner"
                    value={selectedPartner.identifier || ""}
                    onChange={(e) =>
                      setSelectedPartner({ ...selectedPartner, identifier: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={selectedPartner.location}
                    onChange={(e) =>
                      setSelectedPartner({ ...selectedPartner, location: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={selectedPartner.status}
                    onValueChange={(value) =>
                      setSelectedPartner({ ...selectedPartner, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upi_id">UPI ID</Label>
                  <Input
                    id="upi_id"
                    value={selectedPartner.upi_id}
                    onChange={(e) =>
                      setSelectedPartner({ ...selectedPartner, upi_id: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={selectedPartner.description || ""}
                    onChange={(e) =>
                      setSelectedPartner({ ...selectedPartner, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={selectedPartner.password || ""}
                    onChange={(e) =>
                      setSelectedPartner({ ...selectedPartner, password: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={selectedPartner.phone || ""}
                    onChange={(e) =>
                      setSelectedPartner({ ...selectedPartner, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    value={selectedPartner.district || ""}
                    onChange={(e) =>
                      setSelectedPartner({ ...selectedPartner, district: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="place_id">Place ID</Label>
                  <Input
                    id="place_id"
                    value={selectedPartner.place_id || ""}
                    onChange={(e) =>
                      setSelectedPartner({ ...selectedPartner, place_id: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={selectedPartner.currency || "₹"}
                    onChange={(e) =>
                      setSelectedPartner({ ...selectedPartner, currency: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razorpay_linked_account_id">Razorpay Account ID</Label>
                  <Input
                    id="razorpay_linked_account_id"
                    value={selectedPartner.razorpay_linked_account_id || ""}
                    onChange={(e) =>
                      setSelectedPartner({
                        ...selectedPartner,
                        razorpay_linked_account_id: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="petpooja_restaurant_id">PetPooja Restaurant ID</Label>
                  <Input
                    id="petpooja_restaurant_id"
                    placeholder="PetPooja restaurant identifier"
                    value={selectedPartner.petpooja_restaurant_id || ""}
                    onChange={(e) =>
                      setSelectedPartner({
                        ...selectedPartner,
                        petpooja_restaurant_id: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_type">Business Type</Label>
                  <Select
                    value={selectedPartner.business_type || "restaurant"}
                    onValueChange={(value) =>
                      setSelectedPartner({ ...selectedPartner, business_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="resort">Resort</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-normal items-center gap-3">
                  <Label htmlFor="show_price_data">Show Price Data</Label>
                  <Switch
                    id="show_price_data"
                    checked={selectedPartner.show_price_data ?? true}
                    onCheckedChange={(checked) =>
                      setSelectedPartner({
                        ...selectedPartner,
                        show_price_data: checked,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={selectedPartner.country || ""}
                    onValueChange={(value) => {
                      setSelectedPartner({
                        ...selectedPartner,
                        country: value,
                        state: value === "India" ? selectedPartner.state : "",
                        district: value === "India" ? selectedPartner.district : "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country_code">Country Code</Label>
                  <Select
                    value={selectedPartner.country_code || ""}
                    onValueChange={(value) => setSelectedPartner({ ...selectedPartner, country_code: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country code" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <div className="p-2 sticky top-0 bg-white z-10">
                        <input
                          type="text"
                          placeholder="Search country or code..."
                          value={countryCodeSearch}
                          onChange={e => setCountryCodeSearch(e.target.value)}
                          className="w-full border rounded p-2"
                        />
                      </div>
                      {countryCodes
                        .filter(item =>
                          item.country.toLowerCase().includes(countryCodeSearch.toLowerCase()) ||
                          item.code.includes(countryCodeSearch)
                        )
                        .map(item => (
                          <SelectItem key={item.code} value={item.code}>
                            {item.code} ({item.country})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {(selectedPartner.country === "India" || selectedPartner.country === "IN") && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Select
                        value={selectedPartner.state || ""}
                        onValueChange={(value) => {
                          setSelectedPartner({
                            ...selectedPartner,
                            state: value,
                            district: "",
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {locationData.map((stateData) => (
                            <SelectItem key={stateData.state} value={stateData.state}>
                              {stateData.state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedPartner.state && (
                      <div className="space-y-2">
                        <Label htmlFor="district">District</Label>
                        <Select
                          value={selectedPartner.district || ""}
                          onValueChange={(value) => setSelectedPartner({ ...selectedPartner, district: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select district" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {locationData
                              .find((state) => state.state === selectedPartner.state)
                              ?.districts.map((district) => (
                                <SelectItem key={district} value={district}>
                                  {district}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Feature flags — editable inline, persisted only on Save Changes. */}
              {featureFlags && (
                <div className="pt-4">
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold">Feature Flags</h3>
                    <p className="text-sm text-gray-500">
                      Changes are saved only when you click &quot;Save Changes&quot;.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(Object.keys(featureFlags) as (keyof FeatureFlags)[]).map((feature) => {
                      const config = featureFlags[feature];
                      return (
                        <div
                          key={feature}
                          className="rounded-md border border-[#ffba79]/30 bg-[#fffefd] p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium capitalize truncate">{feature}</p>
                              {FEATURE_DESCRIPTIONS[feature] && (
                                <p className="text-xs text-gray-500">
                                  {FEATURE_DESCRIPTIONS[feature]}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-6">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox
                                checked={config.access}
                                onCheckedChange={(checked) =>
                                  updateLocalFeatureFlag(feature, "access", checked as boolean)
                                }
                              />
                              Access
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox
                                checked={config.enabled}
                                disabled={!config.access}
                                onCheckedChange={(checked) =>
                                  updateLocalFeatureFlag(feature, "enabled", checked as boolean)
                                }
                              />
                              Enabled
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 gap-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>

            <div className="mt-6">
              <BranchesPanel
                partnerId={selectedPartner.id}
                partnerStoreName={selectedPartner.store_name || ""}
              />
            </div>
          </div>
        </div>
      ) : loading ? (
        <div>Loading partners...</div>
      ) : (
        <>
          <div className="mb-6">
            <Input
              placeholder="Search partners by name..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="max-w-md"
            />
          </div>
          <Table>
            <TableCaption>A list of partners and their details.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Store Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell>
                    <div>{partner.store_name}</div>
                    {partner.identifier && (
                      <div className="text-xs text-gray-500 mt-0.5">{partner.identifier}</div>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{partner.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleEdit(partner)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={() => openDeleteDialog(partner)}
                      >
                        <Trash2 className="h-4 w-4 md:mr-1" />
                        <span className="hidden md:inline">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) closeDeleteDialog(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.store_name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This permanently removes <strong>all</strong> of this partner&apos;s data —
                  orders, menu, QR codes, scans, offers, payments and the partner record itself.
                  This cannot be undone.
                </p>
                {statsLoading ? (
                  <p className="text-sm text-gray-500">Loading partner data…</p>
                ) : deleteStats ? (
                  <div className="rounded-md border bg-gray-50 p-3 text-sm text-gray-700 space-y-1">
                    <div className="flex justify-between">
                      <span>Orders</span>
                      <span className="font-medium">{deleteStats.orders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Scans</span>
                      <span className="font-medium">{deleteStats.scans}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Menu items</span>
                      <span className="font-medium">{deleteStats.menuItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Petpooja connected</span>
                      <span className="font-medium">{deleteStats.petpoojaConnected ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cashfree connected</span>
                      <span className="font-medium">{deleteStats.cashfreeConnected ? "Yes" : "No"}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog} disabled={deleting}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDelete}
              disabled={deleting || statsLoading}
            >
              {deleting ? "Deleting…" : "Delete all data"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EditPartners;
