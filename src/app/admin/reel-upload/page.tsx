"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Send,
  Instagram,
  Eye,
  Heart,
  ExternalLink,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { getAuthCookie } from "@/app/auth/actions";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { CommonOffer } from "@/components/superAdmin/OfferUploadSuperAdmin";
import { deleteCommonOffer } from "@/api/common_offers";
import { deleteFileFromS3 } from "@/app/actions/aws-s3";
import { revalidateTag } from "@/app/actions/revalidate";

const GetReelsQuery = `
  query GetReels($partnerId: uuid!) {
    common_offers(where: { partner_id: { _eq: $partnerId } }, order_by: { created_at: desc }) {
      id
      item_name
      view_count
      no_of_likes
      insta_link
      image_url
    }
  }
`;

const PENDING_REELS_KEY = "pendingReels";
const MAX_REELS_LIMIT = 5; // Maximum number of reels a user can upload

const Page = () => {
  const [reelUrl, setReelUrl] = useState("");
  interface Reel {
    id: string;
    item_name: string;
    view_count: string | number;
    likes: string | number;
    insta_link: string;
    image_url: string;
    status: "pending" | "processing" | "completed" | "failed";
  }

  const [reels, setReels] = useState<Reel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadReels = async () => {
      setIsLoading(true);
      try {
        const partner = await getAuthCookie();

        if (!partner?.id) {
          throw new Error("User not authenticated.");
        }

        const response = await fetchFromHasura(GetReelsQuery, {
          partnerId: partner.id,
        });

        const fetchedReels = response.common_offers.map(
          (offer: CommonOffer) => ({
            id: offer.id,
            item_name: offer.item_name,
            view_count: offer.view_count ?? "0",
            likes: offer.no_of_likes ?? "0",
            insta_link: offer.insta_link,
            image_url:
              offer.image_url ||
              `https://picsum.photos/100/100?random=${offer.id}`,
            status: "completed",
          })
        );

        const pendingReelsRaw = localStorage.getItem(PENDING_REELS_KEY);
        const pendingReels = pendingReelsRaw ? JSON.parse(pendingReelsRaw) : [];

        const fetchedReelIds = new Set(
          fetchedReels.map((r: CommonOffer) => r.insta_link)
        );
        const uniquePendingReels = pendingReels.filter(
          (r: CommonOffer) => !fetchedReelIds.has(r.insta_link)
        );

        setReels([...uniquePendingReels, ...fetchedReels]);

        localStorage.setItem(
          PENDING_REELS_KEY,
          JSON.stringify(uniquePendingReels)
        );
      } catch (error) {
        console.error("Failed to load reels:", error);
        toast.error("Could not load your reels. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadReels();

    const intervalId = setInterval(loadReels, 80000);
    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, []);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
      case "processing":
        return {
          icon: Clock,
          text: "Processing",
          className: "bg-blue-100 text-blue-800 border-blue-300",
        };
      case "completed":
        return {
          icon: CheckCircle,
          text: "Completed",
          className: "bg-green-100 text-green-800 border-green-300",
        };
      case "failed":
        return {
          icon: XCircle,
          text: "Failed",
          className: "bg-red-100 text-red-800 border-red-300",
        };
      default:
        return {
          icon: AlertCircle,
          text: "Unknown",
          className: "bg-gray-100 text-gray-800 border-gray-300",
        };
    }
  };

  function isInstagramReelUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (!host.includes("instagram.com")) return false;
    return /\/reel\/|\/p\//.test(u.pathname);
  } catch (e) {
    return false;
  }
}

  const checkDuplicateUrl = (url: string) => {
    const normalizedUrl = url.trim().toLowerCase();
    return reels.some(
      (reel) => reel.insta_link.toLowerCase() === normalizedUrl
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Check if the user has reached the maximum reel limit
    if (reels.length >= MAX_REELS_LIMIT) {
      toast.error(
        `You have reached the maximum upload limit of ${MAX_REELS_LIMIT} reels.`
      );
      return;
    }

    const trimmedUrl = reelUrl.trim();
    if (!trimmedUrl || !isInstagramReelUrl(trimmedUrl)) {
      toast.error("Please enter a valid Instagram reel URL");
      return;
    }

    if (checkDuplicateUrl(trimmedUrl)) {
      toast.error(
        "This reel URL has already been uploaded or is currently processing"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const partner = await getAuthCookie();
      const partnerId = partner?.id;

      const newReel: Reel = {
        id: `local-${Date.now()}`,
        image_url: "/image_placeholder.png",
        item_name: "Processing new reel...",
        view_count: "_",
        likes: "_",
        insta_link: trimmedUrl,
        status: "processing" as const,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/reel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: trimmedUrl,
            partner_id: partnerId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to submit reel to the server.");
      }

      setReels((prev) => [newReel, ...prev]);

      const pendingReelsRaw = localStorage.getItem(PENDING_REELS_KEY);
      const pendingReels = pendingReelsRaw ? JSON.parse(pendingReelsRaw) : [];
      localStorage.setItem(
        PENDING_REELS_KEY,
        JSON.stringify([newReel, ...pendingReels])
      );

      toast.success("Reel submitted and is now processing!");
      setReelUrl("");
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("There was an error submitting your reel.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (reelId: string) => {
    const deletingReel = reels.find((reel) => reel.id === reelId);

    setReels((prev) => prev.filter((reel) => reel.id !== reelId));

    try {
      const { delete_common_offers_by_pk } = await fetchFromHasura(
        deleteCommonOffer,
        { id: reelId }
      );

      const { image_url, image_urls } = delete_common_offers_by_pk;

      if (image_urls && image_urls.length > 0) {
        await Promise.all(
          image_urls.map((url: string) => deleteFileFromS3(url))
        );
      } else if (image_url) {
        await deleteFileFromS3(image_url);
      }

      toast.success("Reel deleted successfully");
      revalidateTag("all-common-offers");
      revalidateTag(reelId);
    } catch (error) {
      console.error("Error deleting reel:", error);
      toast.error("There was an error deleting the reel.");
      setReels((prev) => (deletingReel ? [...prev, deletingReel] : prev));
    }
  };

  const ReelCard = ({ reel, index }: { reel: Reel; index: number }) => {
    const statusConfig = getStatusConfig(reel.status);
    const StatusIcon = statusConfig.icon;

    return (
      <Card className="border border-gray-200 hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <img
                src={reel.image_url}
                alt={reel.item_name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border-2 border-orange-200 shadow-sm"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <Badge
                  variant="outline"
                  className="bg-orange-100 text-orange-800 border-orange-300 text-xs"
                >
                  #{index + 1}
                </Badge>
                <Badge
                  variant="outline"
                  className={`${statusConfig.className} text-xs`}
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.text}
                </Badge>
              </div>
              <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base line-clamp-2">
                {reel.item_name}
              </h3>
              <div className="flex items-center gap-4 mb-3 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Eye className="h-4 w-4" />
                  <span>{reel.view_count}</span>
                </div>
                <div className="flex items-center gap-1 text-red-500">
                  <Heart className="h-4 w-4 fill-current" />
                  <span>{reel.likes}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => window.open(`/explore/${reel.id}`)}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white text-xs sm:text-sm"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
                  onClick={() => handleDelete(reel.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const isAtMaxLimit = reels.length >= MAX_REELS_LIMIT;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Submission Form */}
        <Card className="border-2 border-orange-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Send className="h-5 w-5" />
              Submit New Reel
            </CardTitle>
            <CardDescription className="text-orange-100 text-sm sm:text-base">
              Paste your Instagram reel URL below
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="reelUrl"
                    className="text-sm font-medium text-gray-700"
                  >
                    Instagram Reel URL
                  </label>
                  <p className="text-sm text-gray-500">
                    {reels.length} / {MAX_REELS_LIMIT}
                  </p>
                </div>
                <Input
                  id="reelUrl"
                  type="url"
                  placeholder={
                    isAtMaxLimit
                      ? "Maximum limit reached"
                      : "https://www.instagram.com/reel/..."
                  }
                  value={reelUrl}
                  onChange={(e) => setReelUrl(e.target.value)}
                  className="border-orange-200 focus:border-orange-600 focus:ring-orange-600 disabled:cursor-not-allowed disabled:bg-gray-100"
                  disabled={isSubmitting || isAtMaxLimit}
                />
              </div>
              {isAtMaxLimit && (
                <p className="text-sm text-center text-red-600">
                  You have reached the upload limit. Delete an existing reel to add a new one.
                </p>
              )}
              <Button
                type="submit"
                disabled={isSubmitting || isAtMaxLimit}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {isSubmitting
                  ? "Submitting..."
                  : isAtMaxLimit
                  ? "Limit Reached"
                  : "Submit Reel"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Uploaded Reels Section */}
        <Card className="border-2 border-orange-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-t-lg">
            <CardTitle className="text-lg sm:text-xl">Uploaded Reels</CardTitle>
            <CardDescription className="text-orange-100 text-sm sm:text-base">
              Manage your submitted Instagram reels
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-orange-50 border-b border-orange-200">
                      <th className="px-4 py-3 text-center font-semibold text-orange-800 w-16">
                        No.
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-orange-800 w-20">
                        Image
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-orange-800">
                        Name
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-orange-800">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-orange-800">
                        Views
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-orange-800">
                        Likes
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-orange-800">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="text-center p-8">
                          <div className="flex justify-center items-center gap-2 text-gray-500">
                            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                            <span className="font-medium">
                              Loading Reels...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : reels.length > 0 ? (
                      reels.map((reel, index) => {
                        const statusConfig = getStatusConfig(reel.status);
                        const StatusIcon = statusConfig.icon;

                        return (
                          <tr
                            key={reel.id}
                            className="hover:bg-orange-50 transition-colors duration-150 border-b border-gray-100"
                          >
                            <td className="px-4 py-4 text-center">
                              <Badge
                                variant="outline"
                                className="bg-orange-100 text-orange-800 border-orange-300"
                              >
                                {index + 1}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <img
                                src={reel.image_url}
                                alt={reel.item_name}
                                className="w-12 h-12 rounded-lg object-cover mx-auto border-2 border-orange-200 shadow-sm"
                              />
                            </td>
                            <td className="px-4 py-4 font-medium text-gray-900">
                              {reel.item_name}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <Badge
                                variant="outline"
                                className={statusConfig.className}
                              >
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig.text}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className="flex items-center justify-center gap-1 text-gray-600">
                                <Eye className="h-4 w-4" />
                                <span className="font-medium">
                                  {reel.view_count}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className="flex items-center justify-center gap-1 text-red-500">
                                <Heart className="h-4 w-4 fill-current" />
                                <span className="font-medium">
                                  {reel.likes}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white"
                                  onClick={() =>
                                    window.open(reel.insta_link, "_blank")
                                  }
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
                                  onClick={() => handleDelete(reel.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-4">
                          <div className="text-center py-8">
                            <Instagram className="h-16 w-16 text-orange-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">
                              No reels uploaded yet
                            </h3>
                            <p className="text-gray-500">
                              Submit your first Instagram reel using the form
                              above
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden">
              {isLoading ? (
                <div className="text-center p-8">
                  <div className="flex justify-center items-center gap-2 text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                    <span className="font-medium">Loading Reels...</span>
                  </div>
                </div>
              ) : reels.length > 0 ? (
                <div className="p-4 space-y-4">
                  {reels.map((reel, index) => (
                    <ReelCard key={reel.id} reel={reel} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 px-4">
                  <Instagram className="h-12 w-12 sm:h-16 sm:w-16 text-orange-400 mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">
                    No reels uploaded yet
                  </h3>
                  <p className="text-sm sm:text-base text-gray-500">
                    Submit your first Instagram reel using the form above
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Page;