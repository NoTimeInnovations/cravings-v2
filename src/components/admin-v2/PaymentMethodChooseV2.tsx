import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Banknote, Smartphone, CreditCard } from "lucide-react";

interface PaymentMethodChooseV2Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (method: string) => void;
}

// Shown in a row: Cash, UPI, Card. No default — a method must be explicitly
// chosen, and the order is only completed once one is picked (see callers).
const METHODS = [
    { value: "cash", label: "Cash", Icon: Banknote },
    { value: "upi", label: "UPI", Icon: Smartphone },
    { value: "card", label: "Card", Icon: CreditCard },
];

export function PaymentMethodChooseV2({ isOpen, onClose, onConfirm }: PaymentMethodChooseV2Props) {
    const [method, setMethod] = React.useState<string | null>(null);

    // Reset the selection each time the dialog opens so a prior choice never leaks.
    React.useEffect(() => {
        if (isOpen) setMethod(null);
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Choose Payment Method</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-3 py-4">
                    {METHODS.map(({ value, label, Icon }) => {
                        const selected = method === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setMethod(value)}
                                aria-pressed={selected}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors",
                                    selected
                                        ? "border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-500/40 dark:bg-orange-950/30"
                                        : "border-input hover:bg-accent hover:text-accent-foreground",
                                )}
                            >
                                <Icon className="h-6 w-6" />
                                {label}
                            </button>
                        );
                    })}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => method && onConfirm(method)} disabled={!method}>
                        Continue
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
