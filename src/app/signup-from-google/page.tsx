import SignupFromGoogleClient from "./SignupFromGoogleClient";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    placeId?: string;
    name?: string;
    google_error?: string;
    google_email?: string;
    from_google?: string;
  }>;
}) {
  const params = await searchParams;
  return (
    <SignupFromGoogleClient
      placeId={params.placeId || ""}
      placeName={params.name || ""}
      googleError={params.google_error}
      googleEmail={params.google_email}
      fromGoogle={params.from_google === "1"}
    />
  );
}
