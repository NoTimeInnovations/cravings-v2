import { fetchFromHasura } from "@/lib/hasuraClient";
import { GET_QR_CODES_WITH_GROUPS_BY_PARTNER } from "@/api/qrcodes";
import { QrGroup } from "@/app/admin/qr-management/page";

export const getQrGroupForTable = async (
  partnerId: string,
  tableNumber: number
): Promise<QrGroup | null> => {
  try {
    const qrCodesResponse = await fetchFromHasura(GET_QR_CODES_WITH_GROUPS_BY_PARTNER, {
      partner_id: partnerId,
    });
    
    if (qrCodesResponse?.qr_codes) {
      // Find QR code with the specified table_number
      const qrCode = qrCodesResponse.qr_codes.find(
        (qr: any) => qr.table_number === tableNumber && qr.qr_group
      );
      
      if (qrCode?.qr_group) {
        // Transform the extra_charge to handle both old numeric format and new JSON format
        const extraCharge = qrCode.qr_group.extra_charge;
        const transformedExtraCharge = Array.isArray(extraCharge)
          ? extraCharge
          : typeof extraCharge === 'number'
            ? [{ min_amount: 0, max_amount: null, charge: extraCharge }]
            : typeof extraCharge === 'object' && extraCharge?.rules
              ? extraCharge.rules
              : [{ min_amount: 0, max_amount: null, charge: 0 }];
        
        return {
          id: qrCode.qr_group.id,
          name: qrCode.qr_group.name,
          extra_charge: transformedExtraCharge,
          charge_type: qrCode.qr_group.charge_type || 'FLAT_FEE',
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching QR group for table:", error);
    return null;
  }
}; 