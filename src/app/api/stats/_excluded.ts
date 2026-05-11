// Test / demo partner IDs that should never appear in public analytics.
// Resolved by username / phone on 2026-05-11. Names in comments for reference only.
export const EXCLUDED_PARTNER_IDS: string[] = [
  "20f7e974-f19e-4c11-b6b7-4385f61f27bf", // le_grand_cafe ("Paragon")
  "cc101d1f-eb37-42e1-9c6a-5384a3def37f", // oreodemo
  "a93d75c4-2505-4f54-9196-b7c39ea0edf2", // HILLTOWN
  "373a15f9-9c58-4e34-ae07-b272e578928f", // Al Raidhan test store
  // All partners registered with phone 6282826684 (test / dev accounts).
  "f77e9e78-0dc1-4369-ae05-d116bb70fcc9", // TestPartner2
  "19fa3b04-c5b7-4894-8c1c-6296637cd37d", // TestPartner3
  "566c0ed8-0c8e-4bba-991f-7db8c6f7cf71", // TestPartner4
  "71ce273e-7bf1-4407-aacd-35b39af4707f", // TestPartner5
  "f8a3f776-4246-41d6-8f61-409ec37dd7b3", // TestPartner8
  "2ebaa5a9-ed6f-471e-93cb-522f913084d8", // testing1234
  "851a50cc-fc39-455f-9fae-8117eb812f7b", // TestPartner10
  "47b5d0f2-38c7-483f-9386-3e7f4f679049", // TestPartner11
  "b03774ac-ba91-4b65-862e-b7ef804f8a42", // TestPartner101
  "8891bcd6-43c9-421b-92f5-4ae51e36fd38", // TestPartner60
  "9ae56bd7-2e9d-48ad-9535-f8710d6d7e92", // TestingOnboarding
  "366a6d52-4896-437f-ba70-abdfbcf4d176", // Testing
  "f3b0ad86-6c55-465b-aad6-3015f8d353c7", // myTestHotel
  "d7a0b33e-046e-47de-bff2-ca8114a3f618", // My test
  "e616956b-0627-4fae-a4ae-cf75adeb8e0d", // Abhin KS
  "d1bd3bba-1d7e-4f54-b6c9-b18c5df12dfc", // Abhin KS
  "162fd64b-85e0-49c3-ba43-cd7fd7119bcc", // abhinks34343
  "82e86f58-189f-44bf-9227-f843d6c470de", // Abhin KS
  "e8f79489-ef3c-4378-9ad3-916b46ad5224", // Abhin KS test
  "df12a38b-a287-4707-93b5-cadb197120a4", // Abhin KS
  "dffa7ec2-c0ad-491d-b33b-31927a7674d5", // Abhin KS
  "94c1212b-f295-414b-a0e4-a5b3526cf902", // test
  "c9c1069b-fb12-49ed-973b-9b61597f54b8", // abhin_ks
  "53a60ba9-eb19-4c7e-b660-84c6cf1c6c2e", // capes_master_chef2323
  "76c8b398-2499-48a3-8fc6-06cc9a1551b7", // sdfa
  "3393ee62-7d6c-44ea-8f3f-7ccb90a47a17", // abhin_ks232
  "74f45104-cadc-4af1-960e-d18d52146ba2", // donut_cafe23
  "0d5f2c84-d9f8-4991-a099-4242aed6c0ec", // abhin_ks556
  "d85e0723-1a87-4da6-ba9e-1a55f548eaad", // testfreeplan
];

// Customer/user IDs whose orders should never count in public analytics.
// Resolved by phone (6282826684) on 2026-05-11.
export const EXCLUDED_USER_IDS: string[] = [
  "6717a3fe-a323-4c74-86b1-3ee2c5fa224b", // User62828 (phone 6282826684a)
  "79e59a68-3ed1-45b3-a447-df9fc1b56e14", // User+9162 (phone +916282826684)
];
