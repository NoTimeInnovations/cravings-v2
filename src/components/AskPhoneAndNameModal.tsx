import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface AskPhoneAndNameModalProps {
  updateUserData: (
    uid: string,
    data: { fullName: string; phone: string }
  ) => void;
  user: { uid: string } | null;
  setShowModal: (show: boolean) => void;
  showModal: boolean;
  initialFullName: string;
  onSubmit?: (phone: string, fullName: string) => void;
}

const AskPhoneAndNameModal: React.FC<AskPhoneAndNameModalProps> = ({
  updateUserData,
  user,
  setShowModal,
  showModal,
  initialFullName,
  onSubmit
}) => {
  const [formData, setFormData] = useState({ 
    fullname: initialFullName, 
    phone: "" 
  });

  const handleFormSubmit = () => {
    const phoneRegex = /^\d{10}$/;
    if (formData.fullname && phoneRegex.test(formData.phone)) {
      if (onSubmit) {
        onSubmit(formData.phone, formData.fullname);
      } else if (user) {
        try {
          updateUserData(user.uid, {
            fullName: formData.fullname,
            phone: formData.phone,
          });
          setShowModal(false);
        } catch (error) {
          console.error(error);
        }
      }
    } else {
      alert("Please enter a valid 10-digit phone number.");
    }
  };

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-orange-600">
            Complete Your Profile
          </DialogTitle>
          <DialogDescription>
            Please verify your name and provide your phone number to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Full Name"
            value={formData.fullname}
            className="focus-visible:ring-orange-600"
            onChange={(e) =>
              setFormData({ ...formData, fullname: e.target.value })
            }
          />
          <Input
            placeholder="Phone Number"
            value={formData.phone}
            className="focus-visible:ring-orange-600"
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
          />
        </div>
        <DialogFooter>
          <Button
            className="bg-orange-600 hover:bg-orange-500"
            onClick={handleFormSubmit}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AskPhoneAndNameModal;
