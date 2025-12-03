import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface PaymentMethodChooseV2Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (method: string) => void;
}

export function PaymentMethodChooseV2({ isOpen, onClose, onConfirm }: PaymentMethodChooseV2Props) {
    const [method, setMethod] = React.useState<string>("cash");

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Choose Payment Method</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <RadioGroup defaultValue="cash" value={method} onValueChange={setMethod}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="cash" id="cash" />
                            <Label htmlFor="cash">Cash</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="card" id="card" />
                            <Label htmlFor="card">Card</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="upi" id="upi" />
                            <Label htmlFor="upi">UPI</Label>
                        </div>
                    </RadioGroup>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onConfirm(method)}>Continue</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
