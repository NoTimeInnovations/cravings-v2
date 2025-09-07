"use client";
import { OctagonAlert, User } from "lucide-react";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { sendReelReportWhatsAppMsg } from "@/app/actions/sendWhatsappMsgs";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { useParams } from "next/navigation";

const ReportReelModal = ({ className }: { className?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { userData } = useAuthStore();
  const params = useParams();

  const predefinedReasons = [
    "Offer has expired",
    "Offer not available",
    "Fake or misleading offer",
    "Hotel/service no longer available",
    "Incorrect pricing information",
    "Other issues",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    toast.loading("Submitting your report...");
    try {
      const sendedBy =
        userData && userData.role == "user" ? userData.phone : "Anonymous";
      const offerId = (params.id as string) || "Unknown";
      const reason = reportReason + "-" + additionalDetails;

      await sendReelReportWhatsAppMsg(offerId, sendedBy, reason);

      setIsOpen(false);
      // Reset form
      setReportReason("");
      setAdditionalDetails("");
      toast.dismiss();
      toast.success("Report submitted successfully!");
    } catch (error) {
      toast.dismiss();
      toast.error("Error submitting report. Please try again.");
      console.error("Error submitting report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 cursor-pointer text-red-500 ${className}`}
        >
          <OctagonAlert size={20} />
          <span>Report</span>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] w-[90%] rounded-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Report this offer</DialogTitle>
            <DialogDescription>
              Let us know what's wrong with this offer. Your feedback helps us
              improve our service.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <RadioGroup
              value={reportReason}
              onValueChange={setReportReason}
              className="grid gap-4"
            >
              {predefinedReasons.map((reason) => (
                <div key={reason} className="flex items-center space-x-2">
                  <RadioGroupItem
                    className="data-[state=checked]:bg-orange-500 data-[state=checked]:text-white border-orange-500"
                    value={reason}
                    id={reason}
                  />
                  <Label htmlFor={reason}>{reason}</Label>
                </div>
              ))}
            </RadioGroup>

            <div className="grid gap-2">
              <Label htmlFor="details">Additional details (optional)</Label>
              <Textarea
                id="details"
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                placeholder="Please provide more information about the issue..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="grid gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-orange-600"
              type="submit"
              disabled={!reportReason || isLoading}
            >
              {isLoading ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportReelModal;
