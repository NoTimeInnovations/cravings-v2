"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, X, Unlink as UnlinkIcon, Trash2, Plus, Store } from "lucide-react";
import { toast } from "sonner";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  createBranchMutation,
  disbandBranchMutation,
  getPartnerBranchInfoQuery,
  setPartnerBranchMutation,
  updateBranchMutation,
  type PartnerBranchInfo,
} from "@/api/branches";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";

interface BranchesPanelProps {
  partnerId: string;
  partnerStoreName: string;
}

interface PartnerSearchRow {
  id: string;
  store_name: string;
  username: string | null;
  branch_id: string | null;
}

const PARTNER_SEARCH_QUERY = `
query SearchPartnersForBranch($query: String!) {
  partners(
    where: {
      _or: [
        {store_name: {_ilike: $query}},
        {username: {_ilike: $query}},
        {email: {_ilike: $query}}
      ]
    },
    order_by: {store_name: asc},
    limit: 20
  ) {
    id
    store_name
    username
    branch_id
  }
}
`;

export default function BranchesPanel({
  partnerId,
  partnerStoreName,
}: BranchesPanelProps) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<PartnerBranchInfo | null>(null);
  const [busy, setBusy] = useState(false);

  // Edit-brand form state
  const [editName, setEditName] = useState("");
  const [editTagline, setEditTagline] = useState("");

  // Per-outlet "branch label" (partners.store_tagline) drafts, keyed by outlet id
  const [outletLabelDrafts, setOutletLabelDrafts] = useState<Record<string, string>>({});
  const [savingOutletId, setSavingOutletId] = useState<string | null>(null);
  const [hidingOutletId, setHidingOutletId] = useState<string | null>(null);

  // Add-outlet picker state
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PartnerSearchRow[]>([]);
  const [searching, setSearching] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchFromHasura(getPartnerBranchInfoQuery, {
        partner_id: partnerId,
      });
      const row = res?.partners_by_pk as PartnerBranchInfo | null;
      setInfo(row);
      if (row?.branch) {
        setEditName(row.branch.name || "");
        setEditTagline(row.branch.tagline || "");
        const drafts: Record<string, string> = {};
        for (const o of row.branch.outlets || []) {
          drafts[o.id] = o.store_tagline || "";
        }
        setOutletLabelDrafts(drafts);
      } else {
        setEditName("");
        setEditTagline("");
        setOutletLabelDrafts({});
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load branch info");
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isBrandParent = useMemo(() => {
    if (!info?.branch) return false;
    return info.branch.parent_partner_id === partnerId;
  }, [info, partnerId]);

  const isChildOutlet = useMemo(() => {
    if (!info?.branch) return false;
    return info.branch.parent_partner_id !== partnerId;
  }, [info, partnerId]);

  const childOutlets = useMemo(() => {
    if (!info?.branch) return [];
    return (info.branch.outlets || []).filter((o) => o.id !== partnerId);
  }, [info, partnerId]);

  const allOutlets = useMemo(() => {
    if (!info?.branch) return [];
    const outlets = [...(info.branch.outlets || [])];
    return outlets.sort((a, b) => {
      if (a.id === partnerId) return -1;
      if (b.id === partnerId) return 1;
      return (a.store_name || "").localeCompare(b.store_name || "");
    });
  }, [info, partnerId]);

  const handleSaveOutletLabel = async (outletId: string) => {
    const value = (outletLabelDrafts[outletId] ?? "").trim();
    setSavingOutletId(outletId);
    try {
      await updatePartner(outletId, { store_tagline: value || null });
      revalidateTag(outletId);
      toast.success("Branch label saved");
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save branch label");
    } finally {
      setSavingOutletId(null);
    }
  };

  // Hide/show a single outlet in the brand's outlet picker.
  const handleToggleHide = async (outletId: string, hidden: boolean) => {
    setHidingOutletId(outletId);
    try {
      await updatePartner(outletId, { hide_from_outlets: hidden });
      revalidateTag(outletId);
      toast.success(hidden ? "Hidden from outlet picker" : "Shown in outlet picker");
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update outlet visibility");
    } finally {
      setHidingOutletId(null);
    }
  };

  const handleConvertToBrand = async () => {
    setBusy(true);
    try {
      const created = await fetchFromHasura(createBranchMutation, {
        name: partnerStoreName || "Brand",
        parent_partner_id: partnerId,
        tagline: null,
      });
      const branchId = created?.insert_branches_one?.id;
      if (!branchId) throw new Error("No branch id returned");
      await fetchFromHasura(setPartnerBranchMutation, {
        partner_id: partnerId,
        branch_id: branchId,
      });
      revalidateTag(partnerId);
      toast.success("Brand created");
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Failed to create brand");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveBrand = async () => {
    if (!info?.branch) return;
    setBusy(true);
    try {
      await fetchFromHasura(updateBranchMutation, {
        id: info.branch.id,
        updates: {
          name: editName.trim() || partnerStoreName || "Brand",
          tagline: editTagline.trim() || null,
        },
      });
      toast.success("Brand updated");
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update brand");
    } finally {
      setBusy(false);
    }
  };

  const handleDisband = async () => {
    if (!info?.branch) return;
    if (!confirm("Disband this brand? All linked outlets will be detached.")) return;
    setBusy(true);
    try {
      const branchId = info.branch.id;
      await fetchFromHasura(disbandBranchMutation, { id: branchId });
      revalidateTag(partnerId);
      childOutlets.forEach((o) => revalidateTag(o.id));
      toast.success("Brand disbanded");
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Failed to disband brand");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveOutlet = async (outletId: string) => {
    if (!confirm("Remove this outlet from the brand?")) return;
    setBusy(true);
    try {
      await fetchFromHasura(setPartnerBranchMutation, {
        partner_id: outletId,
        branch_id: null,
      });
      revalidateTag(outletId);
      toast.success("Outlet removed");
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Failed to remove outlet");
    } finally {
      setBusy(false);
    }
  };

  const handleUnlinkSelf = async () => {
    if (!confirm("Unlink this partner from its parent brand?")) return;
    setBusy(true);
    try {
      await fetchFromHasura(setPartnerBranchMutation, {
        partner_id: partnerId,
        branch_id: null,
      });
      revalidateTag(partnerId);
      toast.success("Unlinked from brand");
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Failed to unlink");
    } finally {
      setBusy(false);
    }
  };

  const runSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetchFromHasura(PARTNER_SEARCH_QUERY, {
        query: `%${q}%`,
      });
      const rows = (res?.partners || []) as PartnerSearchRow[];
      // Exclude self and any partner already in a different brand
      const filtered = rows.filter(
        (r) =>
          r.id !== partnerId &&
          (!r.branch_id || r.branch_id === info?.branch?.id),
      );
      setSearchResults(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }, [partnerId, info?.branch?.id]);

  useEffect(() => {
    const t = setTimeout(() => {
      runSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, runSearch]);

  const handleAddOutlet = async (outlet: PartnerSearchRow) => {
    if (!info?.branch) return;
    setBusy(true);
    try {
      await fetchFromHasura(setPartnerBranchMutation, {
        partner_id: outlet.id,
        branch_id: info.branch.id,
      });
      revalidateTag(outlet.id);
      toast.success(`Added ${outlet.store_name}`);
      setSearchQuery("");
      setSearchResults([]);
      setShowAdd(false);
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Failed to add outlet");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 p-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading branch info...
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Store className="w-5 h-5 text-gray-700" />
        <h3 className="text-lg font-semibold">Branches</h3>
      </div>

      {/* Case 1: standalone — no branch link */}
      {!info?.branch && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            This partner is not part of a multi-outlet brand. Convert it to a
            brand parent to link other partners as outlets under it.
          </p>
          <Button
            type="button"
            onClick={handleConvertToBrand}
            disabled={busy}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Convert to brand
          </Button>
        </div>
      )}

      {/* Case 2: brand parent */}
      {info?.branch && isBrandParent && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand_name">Brand name</Label>
              <Input
                id="brand_name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand_tagline">Tagline (optional)</Label>
              <Input
                id="brand_tagline"
                value={editTagline}
                placeholder="e.g. LULU KOCHI"
                onChange={(e) => setEditTagline(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={handleSaveBrand} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save brand
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDisband}
              disabled={busy}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Disband brand
            </Button>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold">Outlets ({allOutlets.length})</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAdd((v) => !v)}
              >
                <Plus className="w-4 h-4 mr-1" />
                {showAdd ? "Close" : "Add outlet"}
              </Button>
            </div>

            {showAdd && (
              <div className="mb-4 bg-gray-50 rounded-md p-3 space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by store name, username or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {searching && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Searching...
                  </p>
                )}
                {!searching && searchResults.length > 0 && (
                  <ul className="divide-y divide-gray-200 bg-white rounded border border-gray-200">
                    {searchResults.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between p-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{r.store_name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {r.username ? `@${r.username}` : "(no username)"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddOutlet(r)}
                          disabled={busy}
                        >
                          Add
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {!searching &&
                  searchQuery.trim().length >= 2 &&
                  searchResults.length === 0 && (
                    <p className="text-xs text-gray-500">No matches.</p>
                  )}
              </div>
            )}

            {allOutlets.length === 0 ? (
              <p className="text-sm text-gray-500">
                No outlets linked yet. Use "Add outlet" to connect partners.
              </p>
            ) : (
              <ul className="divide-y divide-gray-200 border border-gray-200 rounded">
                {allOutlets.map((o) => {
                  const isParentRow = o.id === partnerId;
                  const draft = outletLabelDrafts[o.id] ?? "";
                  const original = o.store_tagline || "";
                  const dirty = draft.trim() !== original.trim();
                  const saving = savingOutletId === o.id;
                  return (
                    <li key={o.id} className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate flex items-center gap-2">
                            {o.store_name}
                            {isParentRow && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                Parent
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {o.username ? `@${o.username}` : "(no username)"}
                            {o.location ? ` • ${o.location}` : ""}
                            {o.status && o.status !== "active"
                              ? ` • ${o.status}`
                              : ""}
                          </p>
                        </div>
                        {!isParentRow && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveOutlet(o.id)}
                            disabled={busy}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                        <div className="flex-1 space-y-1">
                          <Label
                            htmlFor={`outlet_label_${o.id}`}
                            className="text-xs text-gray-600"
                          >
                            Branch label (shown in outlet picker)
                          </Label>
                          <Input
                            id={`outlet_label_${o.id}`}
                            value={draft}
                            placeholder="e.g. Hosabettu Branch"
                            onChange={(e) =>
                              setOutletLabelDrafts((prev) => ({
                                ...prev,
                                [o.id]: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSaveOutletLabel(o.id)}
                          disabled={saving || !dirty}
                        >
                          {saving && (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          )}
                          Save
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Switch
                          id={`hide_${o.id}`}
                          checked={!!o.hide_from_outlets}
                          disabled={hidingOutletId === o.id}
                          onCheckedChange={(checked) => handleToggleHide(o.id, checked)}
                        />
                        <Label htmlFor={`hide_${o.id}`} className="text-xs text-gray-600">
                          Hide this branch from the outlet picker
                          {hidingOutletId === o.id && (
                            <Loader2 className="inline w-3 h-3 animate-spin ml-1.5" />
                          )}
                        </Label>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Case 3: child outlet */}
      {info?.branch && isChildOutlet && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded p-3">
            <Store className="w-4 h-4 text-gray-500" />
            <p className="text-sm">
              Branch of{" "}
              <span className="font-semibold">
                {info.branch.parent_partner?.store_name || info.branch.name}
              </span>
              {info.branch.parent_partner?.username && (
                <span className="text-gray-500">
                  {" "}
                  (@{info.branch.parent_partner.username})
                </span>
              )}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleUnlinkSelf}
            disabled={busy}
          >
            <UnlinkIcon className="w-4 h-4 mr-2" /> Unlink from brand
          </Button>
        </div>
      )}
    </div>
  );
}
