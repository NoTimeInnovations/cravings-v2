"use client";

import React, { useState, useEffect } from "react";
import { CommonOffer, KERALA_DISTRICTS } from "./OfferUploadSuperAdmin";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  deleteCommonOffer,
  updateCommonOffer,
  searchCommonOffers,
  getAllCommonOffersAllFields,
} from "@/api/common_offers";
import { sendCommonOfferWhatsAppMsg } from "@/app/actions/sendWhatsappMsgs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pencil,
  Trash2,
  Send,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner";
import { formatDate } from "@/lib/formatDate";
import convertLocToCoord from "@/app/actions/convertLocToCoord";
import { revalidateTag } from "@/app/actions/revalidate";
import { deleteFileFromS3 } from "@/app/actions/aws-s3";

const ExploreOfferManage = () => {
  const [offers, setOffers] = useState<CommonOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CommonOffer>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    limit: 10,
    offset: 0,
  });

  useEffect(() => {
    if (searchTerm) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      loadOffers();
    }
  }, [pagination, searchTerm]);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const { limit, offset } = pagination;
      const data = await fetchFromHasura(getAllCommonOffersAllFields, {
        limit,
        offset,
      });
      setOffers(data.common_offers);
      toast.success("Offers loaded successfully");
    } catch (error) {
      toast.error("Failed to load offers");
      console.error("Error loading offers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadOffers();
      return;
    }

    setLoading(true);
    try {
      const { limit, offset } = pagination;
      const data = await fetchFromHasura(searchCommonOffers, {
        searchTerm: `%${searchTerm}%`,
        limit,
        offset,
      });
      setOffers(data.common_offers);
    } catch (error) {
      toast.error("Failed to search offers");
      console.error("Error searching offers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { delete_common_offers_by_pk } = await fetchFromHasura(
        deleteCommonOffer,
        { id }
      );

      const { image_url, image_urls } = delete_common_offers_by_pk;

      if (image_urls.length > 0) {
        const deleteImages = Promise.all(
          image_urls.map((url: string) => {
            return deleteFileFromS3(url);
          })
        ).then(() => {
          console.log("All images deleted from S3");
        });
        await deleteImages;
      } else {
        await deleteFileFromS3(image_url);
      }

      setOffers(offers.filter((offer) => offer.id !== id));
      toast.success("Offer deleted successfully");
      revalidateTag("all-common-offers");
      revalidateTag(id);
    } catch (error) {
      toast.error("Failed to delete offer");
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleEdit = (offer: CommonOffer) => {
    setEditingId(offer.id);
    setEditForm({
      partner_name: offer.partner_name,
      item_name: offer.item_name,
      price: offer.price,
      location: offer.location,
      description: offer.description,
      insta_link: offer.insta_link,
      likes: offer.likes,
      district: offer.district.toLowerCase(),
      image_url: offer.image_url,
      coordinates: offer.coordinates,
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;

    toast.loading("Updating offer....", {
      id: editingId,
    });

    const updatedFrom = editForm;

    if (updatedFrom.coordinates?.type === "Need to update") {
      const { location } = updatedFrom;
      const coordinates = await convertLocToCoord(location as string);

      updatedFrom.coordinates = coordinates;
    }

    try {
      const updates = await fetchFromHasura(updateCommonOffer, {
        id: editingId,
        object: updatedFrom,
      });

      setOffers(
        offers.map((offer) =>
          offer.id === editingId
            ? { ...updates.update_common_offers_by_pk }
            : offer
        )
      );
      setEditingId(null);
      toast.dismiss(editingId);
      toast.success("Offer updated successfully");
      revalidateTag("all-common-offers");
      revalidateTag(editingId);
    } catch (error) {
      toast.dismiss(editingId);
      toast.error("Failed to update offer");
      console.error("Error updating offer:", error);
    }
  };

  const handleResend = async (offer: CommonOffer) => {
    try {
      await sendCommonOfferWhatsAppMsg(offer.id);
      toast.success("Offer resent successfully");
    } catch (error) {
      toast.error("Failed to resend offer");
      console.error("Error resending offer:", error);
    }
  };

  const handleInputChange = async (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "location") {
      setEditForm((prev) => ({
        ...prev,
        location: value,
        coordinates: {
          type: "Need to update",
          coordinates: [0, 0],
        },
      }));
    } else {
      setEditForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleDistrictChange = (value: string) => {
    setEditForm((prev) => ({
      ...prev,
      district: value,
    }));
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-4">
        <div className="relative w-full ">
          <Search className="absolute  left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search offers..."
            className="pl-10 w-full bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading offers...</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table className="bg-white">
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Likes</TableHead>
                <TableHead>Instagram</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer, index) => (
                <TableRow key={offer.id}>
                  {editingId === offer.id ? (
                    <>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          name="partner_name"
                          value={editForm.partner_name || ""}
                          onChange={handleInputChange}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          name="item_name"
                          value={editForm.item_name || ""}
                          onChange={handleInputChange}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          name="price"
                          value={editForm.price || ""}
                          onChange={handleInputChange}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          name="location"
                          value={editForm.location || ""}
                          onChange={handleInputChange}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={editForm.district || ""}
                          onValueChange={handleDistrictChange}
                        >
                          <SelectTrigger className="w-[180px] capitalize">
                            <SelectValue placeholder="Select district" />
                          </SelectTrigger>
                          <SelectContent>
                            {KERALA_DISTRICTS.map((district) => (
                              <SelectItem
                                className="capitalize"
                                key={district}
                                value={district.toLowerCase()}
                              >
                                {district.toLowerCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          name="likes"
                          value={editForm.likes || ""}
                          onChange={handleInputChange}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          name="insta_link"
                          value={editForm.insta_link || ""}
                          onChange={handleInputChange}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(offer.created_at || "").toLocaleDateString()}
                      </TableCell>
                      <TableCell className="flex justify-end space-x-2">
                        <Button
                          onClick={handleUpdate}
                          size="sm"
                          variant="outline"
                        >
                          Save
                        </Button>
                        <Button
                          onClick={() => setEditingId(null)}
                          size="sm"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{offer.partner_name}</TableCell>
                      <TableCell>{offer.item_name}</TableCell>
                      <TableCell>{offer.price}</TableCell>
                      <TableCell>
                        {offer.location ? (
                          <a
                            href={offer.location}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="capitalize">
                        {offer.district}
                      </TableCell>
                      <TableCell>{offer.likes}</TableCell>
                      <TableCell>
                        {offer.insta_link ? (
                          <a
                            href={offer.insta_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {offer.created_at ? formatDate(offer.created_at) : "-"}
                      </TableCell>
                      <TableCell className="flex justify-end space-x-2">
                        <Button
                          onClick={() => handleEdit(offer)}
                          size="sm"
                          variant="outline"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            setOfferToDelete(offer.id);
                            setDeleteDialogOpen(true);
                          }}
                          size="sm"
                          variant="destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleResend(offer)}
                          size="sm"
                          variant="secondary"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-end space-x-2 p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  offset: Math.max(0, prev.offset - prev.limit),
                }))
              }
              disabled={pagination.offset === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  offset: prev.offset + prev.limit,
                }))
              }
              disabled={offers.length < pagination.limit}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              offer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => offerToDelete && handleDelete(offerToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExploreOfferManage;
