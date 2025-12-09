Scan Usage and Limits Implementation
The goal is to track and restrict QR scans based on the partner's subscription plan.

User Review Required
IMPORTANT

Strict Limits: For international partners, if subscription_details.usage.scans_cycle >= plan.scan_limit, the QR scan page will block access.
Dual Update: Every scan will increment:
The no_of_scans on the specific qr_code record.
The scans_cycle inside the subscription_details JSONB on the partner record.
Proposed Changes
[MODIFY] 
AdminV2QrCodes.tsx
Fetch: Update query to include no_of_scans.
Columns: Add read-only "Scans" column.
[MODIFY] 
qrScan/[[...id]]/page.tsx
Limit Check Logic:
Extract subscription_details from fetched partner data.
Check if country != 'IN' (International).
Check if scans_cycle >= scan_limit.
If limit exceeded, render "Basic Plan Limit Reached" error screen.
Increment Logic:
Use INCREMENT_QR_CODE_SCAN_COUNT mutation for the QR code.
Use UPDATE_PARTNER mutation to update the subscription_details JSON.
Logic: new_usage = { ...old_usage, scans_cycle: old_usage.scans_cycle + 1 }.
Need to ensure we preserve other fields in subscription_details.
[MODIFY] 
AdminV2Dashboard.tsx
Display: 
SubscriptionStatus
 component is already integrated and shows the usage. No major changes needed unless specific placement is requested.
Verification Plan
Manual Verification
Dashboard: Note current "Total Scans" (e.g. 50).
QR View: Note specific QR scan count (e.g. 10).
Perform Scan: Open the QR link.
Verify:
Reload Dashboard: "Total Scans" should be 51.
Reload QR View: Specific QR scan count should be 11.
Limit Limit:
(Requires DB manipulation or mock): Set limit to 51.
Scan again. Should be blocked.