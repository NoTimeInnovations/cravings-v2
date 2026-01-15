"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import OtpLogin from "./OtpLogin";

interface OtpLoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: (phoneNumber: string) => Promise<void>;
}

export default function OtpLoginModal({
    isOpen,
    onClose,
    onLoginSuccess,
}: OtpLoginModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl font-bold">Verify to Continue</DialogTitle>
                    <DialogDescription className="text-center text-gray-500">
                        We will send an OTP to your WhatsApp number.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <OtpLogin
                        onLoginSuccess={async (phone) => {
                            await onLoginSuccess(phone);
                            onClose();
                        }}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
