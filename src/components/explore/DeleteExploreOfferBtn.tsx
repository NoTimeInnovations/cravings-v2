"use client";

import { deleteCommonOffer } from "@/api/common_offers";
import { deleteFileFromS3 } from "@/app/actions/aws-s3";
import { revalidateTag } from "@/app/actions/revalidate";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";

const DeleteExploreOfferBtn = ({
  id,
  image_url,
}: {
  id: string;
  image_url: string;
}) => {
  const router = useRouter();

  const handleDelete = async () => {
    try {
      toast.loading("Deleting the offer...");

      await deleteFileFromS3(image_url);

      await fetchFromHasura(deleteCommonOffer, {
        id: id,
      });

      toast.dismiss();
      toast.success("Offer deleted successfully!");
      revalidateTag("all-common-offers");
      revalidateTag(id);
      router.push("/explore");
    } catch (error) {
      toast.dismiss();
      toast.error("Error deleting the offer. Please try again.");
      console.error("Error deleting the offer:", error);
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="flex items-end gap-2 text-red-500 text-sm"
    >
      {" "}
      <Trash size={20} /> Delete
    </button>
  );
};

export default DeleteExploreOfferBtn;
