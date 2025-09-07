"use client";
import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  // TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  // DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { Plus, Trash2 } from "lucide-react";

export interface PricingRule {
  min_amount: number;
  max_amount: number | null; // null means no upper limit
  charge: number;
}

export interface QrGroup {
  id: string;
  name: string;
  extra_charge: PricingRule[];
  charge_type: 'PER_ITEM' | 'FLAT_FEE';
}

interface QrCode {
  id: string;
  table_number: string;
  qr_group: QrGroup | null;
}

interface HasuraQrGroup {
  id: string;
  name: string;
  extra_charge: PricingRule[] | number | { rules: PricingRule[] };
  charge_type: 'PER_ITEM' | 'FLAT_FEE';
}

interface HasuraQrCode {
  id: string;
  table_number: string;
  qr_group: HasuraQrGroup | null;
}

const QrManagementPage = () => {
  const [qrGroups, setQrGroups] = useState<QrGroup[]>([]);
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState("");
  const [newPricingRules, setNewPricingRules] = useState<PricingRule[]>([
    { min_amount: 0, max_amount: null, charge: 0 }
  ]);
  const [newChargeType, setNewChargeType] = useState<'PER_ITEM' | 'FLAT_FEE'>('FLAT_FEE');
  const [editingGroup, setEditingGroup] = useState<QrGroup | null>(null);
  const { userData } = useAuthStore();

  useEffect(() => {
    if (userData?.id) {
      fetchQrGroups();
      fetchQrCodes();
    }
  }, [userData]);

  const fetchQrGroups = async () => {
    try {
      const query = `
        query GetQrGroups($partner_id: uuid!) {
          qr_groups(where: {partner_id: {_eq: $partner_id}}) {
            extra_charge
            id
            name
            charge_type
          }
        }
      `;
      const data = await fetchFromHasura(query, { partner_id: userData?.id });

      // Transform the data to handle both old numeric format and new JSON format
      const transformedGroups = data.qr_groups.map((group: HasuraQrGroup) => ({
        ...group,
        extra_charge: Array.isArray(group.extra_charge)
          ? group.extra_charge
          : typeof group.extra_charge === 'number'
            ? [{ min_amount: 0, max_amount: null, charge: group.extra_charge }]
            : typeof group.extra_charge === 'object' && group.extra_charge?.rules
              ? group.extra_charge.rules
              : [{ min_amount: 0, max_amount: null, charge: 0 }]
      }));

      setQrGroups(transformedGroups);
    } catch (error) {
      console.error("Error fetching QR groups:", error);
      toast.error("Failed to fetch QR groups");
    }
  };

  const fetchQrCodes = async () => {
    try {
      const query = `
        query GetQrCodes($partner_id: uuid!) {
          qr_codes(where: {partner_id: {_eq: $partner_id}}) {
            id
            table_number
            qr_group {
              name
              extra_charge
              id
              charge_type
            }
          }
        }
      `;
      const data = await fetchFromHasura(query, { partner_id: userData?.id });

      // Transform QR codes data as well
      const transformedQrCodes = data.qr_codes.map((qr: HasuraQrCode) => ({
        ...qr,
        qr_group: qr.qr_group ? {
          ...qr.qr_group,
          extra_charge: Array.isArray(qr.qr_group.extra_charge)
            ? qr.qr_group.extra_charge
            : typeof qr.qr_group.extra_charge === 'number'
              ? [{ min_amount: 0, max_amount: null, charge: qr.qr_group.extra_charge }]
              : typeof qr.qr_group.extra_charge === 'object' && qr.qr_group.extra_charge?.rules
                ? qr.qr_group.extra_charge.rules
                : [{ min_amount: 0, max_amount: null, charge: 0 }]
        } : null
      }));

      setQrCodes(transformedQrCodes);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching QR codes:", error);
      setLoading(false);
      toast.error("Failed to fetch QR codes");
    }
  };

  const countQrCodesInGroup = (groupId: string) => {
    return qrCodes.filter((qr) => qr.qr_group?.id === groupId).length;
  };

  const addNewPricingRule = () => {
    const lastRule = newPricingRules[newPricingRules.length - 1];
    const newMinAmount = lastRule.max_amount ? lastRule.max_amount + 1 : 1000;

    setNewPricingRules([
      ...newPricingRules,
      { min_amount: newMinAmount, max_amount: null, charge: 0 }
    ]);
  };

  const updatePricingRule = (index: number, field: keyof PricingRule, value: number | null) => {
    const updatedRules = [...newPricingRules];
    updatedRules[index] = { ...updatedRules[index], [field]: value };
    setNewPricingRules(updatedRules);
  };

  const removePricingRule = (index: number) => {
    if (newPricingRules.length > 1) {
      const updatedRules = newPricingRules.filter((_, i) => i !== index);
      setNewPricingRules(updatedRules);
    }
  };

  const addEditPricingRule = () => {
    if (!editingGroup) return;

    const lastRule = editingGroup.extra_charge[editingGroup.extra_charge.length - 1];
    const newMinAmount = lastRule.max_amount ? lastRule.max_amount + 1 : 1000;

    setEditingGroup({
      ...editingGroup,
      extra_charge: [
        ...editingGroup.extra_charge,
        { min_amount: newMinAmount, max_amount: null, charge: 0 }
      ]
    });
  };

  const updateEditPricingRule = (index: number, field: keyof PricingRule, value: number | null) => {
    if (!editingGroup) return;

    const updatedRules = [...editingGroup.extra_charge];
    updatedRules[index] = { ...updatedRules[index], [field]: value };
    setEditingGroup({ ...editingGroup, extra_charge: updatedRules });
  };

  const removeEditPricingRule = (index: number) => {
    if (!editingGroup || editingGroup.extra_charge.length <= 1) return;

    const updatedRules = editingGroup.extra_charge.filter((_, i) => i !== index);
    setEditingGroup({ ...editingGroup, extra_charge: updatedRules });
  };

  const formatPricingRulesDisplay = (rules: PricingRule[]) => {
    return rules.map((rule, index) => (
      <div key={index} className="text-sm">
        ${rule.min_amount}
        {rule.max_amount ? ` - $${rule.max_amount}` : '+'}: ${rule.charge}
      </div>
    ));
  };

  const handleAddGroup = async () => {
    try {
      if (!newGroupName.trim()) {
        toast.error("Group name cannot be empty");
        return;
      }

      // Validate pricing rules
      const sortedRules = [...newPricingRules].sort((a, b) => a.min_amount - b.min_amount);

      const mutation = `
        mutation AddQrGroup($name: String!, $extra_charge: jsonb!, $partner_id: uuid!, $charge_type: String!) {
          insert_qr_groups_one(object: {
            name: $name,
            extra_charge: $extra_charge,
            partner_id: $partner_id,
            charge_type: $charge_type
          }) {
            id
            name
            extra_charge
            charge_type
          }
        }
      `;

      await fetchFromHasura(mutation, {
        name: newGroupName,
        extra_charge: sortedRules,
        partner_id: userData?.id,
        charge_type: newChargeType
      });

      toast.success("QR group added successfully");

      fetchQrGroups();
      setNewGroupName("");
      setNewPricingRules([{ min_amount: 0, max_amount: null, charge: 0 }]);
      setNewChargeType('FLAT_FEE');
    } catch (error) {
      console.error("Error adding QR group:", error);
      toast.error("Failed to add QR group");
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;

    try {
      if (!editingGroup.name.trim()) {
        toast.error("Group name cannot be empty");
        return;
      }

      // Validate and sort pricing rules
      const sortedRules = [...editingGroup.extra_charge].sort((a, b) => a.min_amount - b.min_amount);

      const mutation = `
        mutation UpdateQrGroup($id: uuid!, $name: String!, $extra_charge: jsonb!, $charge_type: String!) {
          update_qr_groups_by_pk(
            pk_columns: {id: $id},
            _set: {
              name: $name,
              extra_charge: $extra_charge,
              charge_type: $charge_type
            }
          ) {
            id
            name
            extra_charge
            charge_type
          }
        }
      `;

      await fetchFromHasura(mutation, {
        id: editingGroup.id,
        name: editingGroup.name,
        extra_charge: sortedRules,
        charge_type: editingGroup.charge_type
      });

      toast.success("QR group updated successfully");

      fetchQrGroups();
      setEditingGroup(null);
    } catch (error) {
      console.error("Error updating QR group:", error);
      toast.error("Failed to update QR group");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      // First check if there are any QR codes assigned to this group
      const qrCodesInGroup = qrCodes.filter(
        (qr) => qr.qr_group?.id === groupId
      );
      if (qrCodesInGroup.length > 0) {
        toast.error(
          "Cannot delete group with assigned QR codes. Please unassign them first."
        );
        return;
      }

      const mutation = `
        mutation DeleteQrGroup($id: uuid!) {
          delete_qr_groups_by_pk(id: $id) {
            id
          }
        }
      `;

      await fetchFromHasura(mutation, { id: groupId });

      toast.success("QR group deleted successfully");

      fetchQrGroups();
    } catch (error) {
      console.error("Error deleting QR group:", error);
      toast.error("Failed to delete QR group");
    }
  };

  const handleUpdateQrCodeGroup = async (
    qrCodeId: string,
    newGroupId: string
  ) => {
    try {
      const mutation = `
        mutation UpdateQrCodeGroup($id: uuid!, $group_id: uuid) {
          update_qr_codes_by_pk(
            pk_columns: {id: $id},
            _set: {
              group_id: $group_id
            }
          ) {
            id
            qr_group {
              id
              name
              charge_type
            }
          }
        }
      `;

      await fetchFromHasura(mutation, {
        id: qrCodeId,
        group_id: newGroupId === "unassign" ? null : newGroupId,
      });

      // Optimistically update the UI
      setQrCodes((prevCodes) =>
        prevCodes.map((qr) =>
          qr.id === qrCodeId
            ? {
              ...qr,
              qr_group: newGroupId
                ? qrGroups.find((g) => g.id === newGroupId) || null
                : null,
            }
            : qr
        )
      );

      toast.success("QR code group updated successfully");
    } catch (error) {
      console.error("Error updating QR code group:", error);
      toast.error("Failed to update QR code group");
      // Revert the optimistic update if the mutation fails
      fetchQrCodes();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">Loading...</div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-[8%] space-y-8">
      <h1 className="text-2xl font-bold">QR Code Management</h1>

      {/* QR Groups Table */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">QR Groups</h2>
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Add New Group</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New QR Group</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 w-full md:w-1/2">
                      <Label htmlFor="groupName">
                        Group Name
                      </Label>
                      <Input
                        id="groupName"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 w-full md:w-1/2">
                      <Label htmlFor="chargeType">
                        Charge Type
                      </Label>
                      <Select
                        value={newChargeType}
                        onValueChange={(value: 'PER_ITEM' | 'FLAT_FEE') => setNewChargeType(value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select charge type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FLAT_FEE">Flat Fee</SelectItem>
                          <SelectItem value="PER_ITEM">Per Item</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Pricing Rules Section */}
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium">Pricing Rules</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addNewPricingRule}
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add Rule
                      </Button>
                    </div>

                    <div className="space-y-3 border rounded-lg p-4">
                      {newPricingRules.map((rule, index) => (
                        <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-end">
                          <div className="w-full sm:w-1/3">
                            <Label className="text-xs">Min Amount ($)</Label>
                            <Input
                              type="number"
                              value={rule.min_amount}
                              onChange={(e) => updatePricingRule(index, 'min_amount', parseInt(e.target.value) || 0)}
                              className="h-8 w-full"
                            />
                          </div>
                          <div className="w-full sm:w-1/3">
                            <Label className="text-xs">Max Amount ($)</Label>
                            <Input
                              type="number"
                              value={rule.max_amount || ''}
                              onChange={(e) => updatePricingRule(index, 'max_amount', e.target.value ? parseInt(e.target.value) : null)}
                              placeholder="No limit"
                              className="h-8 w-full"
                            />
                          </div>
                          <div className="w-full sm:w-1/3">
                            <Label className="text-xs">Extra Charge ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={rule.charge}
                              onChange={(e) => updatePricingRule(index, 'charge', parseFloat(e.target.value) || 0)}
                              className="h-8 w-full"
                            />
                          </div>
                          <div className="flex justify-end sm:justify-start mt-1">
                            {newPricingRules.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removePricingRule(index)}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddGroup}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Group Name</TableHead>
              <TableHead>Pricing Rules</TableHead>
              <TableHead>Charge Type</TableHead>
              <TableHead>No. of QR Codes</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {qrGroups.length > 0 ? (
              qrGroups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>{group.name}</TableCell>
                  <TableCell className="min-w-48">
                    <div className="space-y-1">
                      {formatPricingRulesDisplay(group.extra_charge)}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[32px] text-nowrap">
                    {group.charge_type === 'PER_ITEM' ? 'Per Item' : 'Flat Fee'}
                  </TableCell>
                  <TableCell className="w-[29px]">
                    {countQrCodesInGroup(group.id)}
                  </TableCell>
                  <TableCell className="space-x-2 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingGroup(group)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteGroup(group.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No QR groups found. Create your first group using the &quot;Add New Group&quot; button.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Group Dialog */}
      {editingGroup && (
        <Dialog open={true} onOpenChange={() => setEditingGroup(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit QR Group</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex items-center gap-4">
                  <Label htmlFor="editGroupName" className="text-right">
                    Group Name
                  </Label>
                  <Input
                    id="editGroupName"
                    value={editingGroup.name}
                    onChange={(e) =>
                      setEditingGroup({ ...editingGroup, name: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Label htmlFor="editChargeType" className="text-right">
                    Charge Type
                  </Label>
                  <Select
                    value={editingGroup.charge_type}
                    onValueChange={(value: 'PER_ITEM' | 'FLAT_FEE') =>
                      setEditingGroup({
                        ...editingGroup,
                        charge_type: value
                      })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select charge type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FLAT_FEE">Flat Fee</SelectItem>
                      <SelectItem value="PER_ITEM">Per Item</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Edit Pricing Rules Section */}
              <div className="col-span-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Pricing Rules</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEditPricingRule}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Rule
                  </Button>
                </div>

                <div className="space-y-3 border rounded-lg p-4">
                  {editingGroup.extra_charge.map((rule, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="col-span-3">
                        <Label className="text-xs">Min Amount ($)</Label>
                        <Input
                          type="number"
                          value={rule.min_amount}
                          onChange={(e) => updateEditPricingRule(index, 'min_amount', parseInt(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">Max Amount ($)</Label>
                        <Input
                          type="number"
                          value={rule.max_amount || ''}
                          onChange={(e) => updateEditPricingRule(index, 'max_amount', e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="No limit"
                          className="h-8"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">Extra Charge ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={rule.charge}
                          onChange={(e) => updateEditPricingRule(index, 'charge', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div className="col-span-3 flex justify-end">
                        {editingGroup.extra_charge.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeEditPricingRule(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleUpdateGroup}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* QR Codes Table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">QR Codes</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Table Number</TableHead>
              <TableHead>Group Name</TableHead>
              <TableHead>Pricing Rules</TableHead>
              <TableHead>Charge Type</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {qrCodes.length > 0 ? (
              qrCodes.map((qrCode) => (
                <TableRow key={qrCode.id}>
                  <TableCell>{qrCode.table_number}</TableCell>
                  <TableCell>
                    {qrCode.qr_group?.name || "No Group Assigned"}
                  </TableCell>
                  <TableCell className="min-w-48">
                    {qrCode.qr_group?.extra_charge ? (
                      <div className="space-y-1">
                        {formatPricingRulesDisplay(qrCode.qr_group.extra_charge)}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {qrCode.qr_group?.charge_type === 'PER_ITEM'
                      ? 'Per Item'
                      : qrCode.qr_group?.charge_type === 'FLAT_FEE'
                        ? 'Flat Fee'
                        : '-'}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={qrCode.qr_group?.id || ""}
                      onValueChange={(value) =>
                        handleUpdateQrCodeGroup(qrCode.id, value)
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassign">Unassign</SelectItem>
                        {qrGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name} ({group.charge_type === 'PER_ITEM' ? 'Per Item' : 'Flat Fee'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No QR codes found. QR codes will appear here once they&apos;re
                  created.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default QrManagementPage;