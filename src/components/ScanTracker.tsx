"use client";

import { useEffect } from "react";
import { trackQrScanAction } from "@/app/auth/actions";

export const ScanTracker = ({ qrId, hotelId }: { qrId: string; hotelId: string }) => {
    useEffect(() => {
        trackQrScanAction(qrId, hotelId);
    }, [qrId, hotelId]);

    return null;
};
