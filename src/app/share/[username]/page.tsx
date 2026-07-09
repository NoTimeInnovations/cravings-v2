import { Metadata } from "next";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import ShareBranchClient, { type ShareOutlet } from "./ShareBranchClient";

// Default onboarding password used when partners/outlets are bulk-created.
const DEFAULT_PASSWORD = "123456";

export const dynamic = "force-dynamic";

// Fetch the brand parent (by username) + all active branches under it, incl. login email.
const shareBranchQuery = `
query ShareBranch($username: String!) {
  partners(where: {username: {_eq: $username}}, limit: 1) {
    id
    store_name
    username
    email
    branch {
      id
      name
      parent_partner_id
      outlets(
        where: {status: {_eq: "active"}, hide_from_outlets: {_eq: false}}
        order_by: {store_name: asc}
      ) {
        id
        store_name
        username
        email
        status
      }
    }
  }
}
`;

interface BranchData {
  brandName: string;
  outlets: ShareOutlet[];
}

async function getBranchData(username: string): Promise<BranchData | null> {
  try {
    const res = await fetchFromHasuraServer(shareBranchQuery, {
      username: username.toLowerCase(),
    });
    const parent = res?.partners?.[0];
    const branch = parent?.branch;
    if (!parent || !branch) return null;
    // Guard: only the brand parent lists its outlets here, not a child outlet.
    if (branch.parent_partner_id !== parent.id) return null;

    const outlets: ShareOutlet[] = (branch.outlets ?? [])
      .filter((o: any) => o?.email && o?.username)
      .map((o: any) => ({
        id: o.id,
        store_name: o.store_name,
        email: o.email,
        username: o.username,
        isParent: o.id === parent.id,
      }));

    return { brandName: branch.name || parent.store_name, outlets };
  } catch (error) {
    console.error("Error fetching share branch data:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const data = await getBranchData(username);
  const brand = data?.brandName || username;
  return {
    title: `${brand} — Partner Credentials`,
    // Sensitive internal page: never index or follow.
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function ShareBranchPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const data = await getBranchData(username);

  if (!data || data.outlets.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F6] px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-semibold text-[#1C1714]">
            No branches found
          </h1>
          <p className="mt-2 text-sm text-[#837A73]">
            We couldn&apos;t find a brand named{" "}
            <span className="font-mono text-[#A31621]">@{username}</span> with
            active branches. Check the username and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ShareBranchClient
      brandName={data.brandName}
      password={DEFAULT_PASSWORD}
      outlets={data.outlets}
    />
  );
}
