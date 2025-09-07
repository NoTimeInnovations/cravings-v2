"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore, Partner } from "@/store/authStore";
import { getFeatures } from "@/lib/getFeatures";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { createCaptainMutation, getCaptainsQuery, deleteCaptainMutation } from "@/api/captains";

interface Captain {
  id: string;
  email: string;
  name: string;
  partner_id: string;
  role: string;
}

export default function CaptainManagementPage() {
  const router = useRouter();
  const { userData } = useAuthStore();
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [captainName, setCaptainName] = useState("");
  const [captainEmail, setCaptainEmail] = useState("");
  const [captainPassword, setCaptainPassword] = useState("");
  const [isCreatingCaptain, setIsCreatingCaptain] = useState(false);
  const [captainError, setCaptainError] = useState<string | null>(null);
  const [isDeletingCaptain, setIsDeletingCaptain] = useState<string | null>(null);
  const [showCaptainForm, setShowCaptainForm] = useState(false);
  const [features, setFeatures] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/captainlogin` : '/captainlogin';

  useEffect(() => {
    if (userData && userData.role === "partner") {
      setFeatures(getFeatures((userData as Partner).feature_flags || ""));
    }
  }, [userData]);

  useEffect(() => {
    if (userData && features?.captainordering?.enabled) {
      fetchCaptains();
    }
  }, [userData, features?.captainordering?.enabled]);

  const fetchCaptains = async () => {
    if (!userData) return;
    try {
      const result = await fetchFromHasura(getCaptainsQuery, {
        partner_id: userData.id,
      }) as { captain: Captain[] };
      setCaptains(result.captain || []);
    } catch (error) {
      console.error("Error fetching captains:", error);
      toast.error("Failed to fetch captain accounts");
    }
  };

  const handleCreateCaptain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    setIsCreatingCaptain(true);
    setCaptainError(null);
    try {
      if (!captainName || !captainEmail || !captainPassword) {
        throw new Error("Please fill in all fields");
      }
      if (captainPassword.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(captainEmail)) {
        throw new Error("Please enter a valid email address");
      }
      // Check if email already exists
      const checkEmail = await fetchFromHasura(`
        query CheckCaptainEmail($email: String!) {
          captain(where: {email: {_eq: $email}}) { id email }
        }
      `, { email: captainEmail });
      if (checkEmail?.captain?.length > 0) {
        throw new Error("This email is already registered. Please use a different email address.");
      }
      // Check if name already exists
      const checkName = await fetchFromHasura(`
        query CheckCaptainName($name: String!) {
          captain(where: {name: {_eq: $name}}) { id name }
        }
      `, { name: captainName });
      if (checkName?.captain?.length > 0) {
        throw new Error("This name is already taken. Please use a different name.");
      }
      const result = await fetchFromHasura(createCaptainMutation, {
        name: captainName,
        email: captainEmail,
        password: captainPassword,
        partner_id: userData.id,
        role: "captain",
      });
      if (!result?.insert_captain_one) {
        throw new Error("Failed to create captain account");
      }
      toast.success("Captain account created successfully!");
      setCaptainName("");
      setCaptainEmail("");
      setCaptainPassword("");
      setShowCaptainForm(false);
      fetchCaptains();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create captain account";
      setCaptainError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsCreatingCaptain(false);
    }
  };

  const handleDeleteCaptain = async (id: string) => {
    setIsDeletingCaptain(id);
    try {
      // Remove captain reference from orders
      const updateOrdersMutation = `
        mutation UpdateOrdersWithCaptain($captain_id: uuid!) {
          update_orders(
            where: { captain_id: { _eq: $captain_id } }
            _set: { captain_id: null, orderedby: null }
          ) { affected_rows }
        }
      `;
      await fetchFromHasura(updateOrdersMutation, { captain_id: id });
      await fetchFromHasura(deleteCaptainMutation, { id });
      await fetchCaptains();
      toast.success("Captain deleted successfully");
    } catch (error) {
      toast.error("Failed to delete captain");
    } finally {
      setIsDeletingCaptain(null);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(loginUrl);
      setCopied(true);
      toast.success("Login URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy URL");
    }
  };

  if (!userData || !features?.captainordering?.enabled) {
    return (
      <div className="p-8 text-center text-gray-500">Captain ordering is not enabled or you do not have access.</div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-orange-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold">Captain Management</h1>
        </div>

        {/* Captain Login Link */}
        <Card>
          <CardHeader>
            <CardTitle>Captain Login</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <p className="text-sm text-gray-600">
                Share this login link with your captains to access their accounts.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={loginUrl}
                  readOnly
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  {copied ? (
                    <div className="h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(loginUrl, '_blank')}
                  className="shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Captain Form - Always visible at the top */}
        <Card>
          <CardHeader>
            <CardTitle>Create Captain Account</CardTitle>
          </CardHeader>
          <CardContent>
            {showCaptainForm ? (
              <form onSubmit={handleCreateCaptain} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="captainName" className="text-sm font-medium">Name</label>
                    <Input 
                      id="captainName" 
                      type="text" 
                      placeholder="Enter captain name" 
                      value={captainName} 
                      onChange={e => setCaptainName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="captainEmail" className="text-sm font-medium">Email</label>
                    <Input 
                      id="captainEmail" 
                      type="email" 
                      placeholder="Enter captain email" 
                      value={captainEmail} 
                      onChange={e => setCaptainEmail(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="captainPassword" className="text-sm font-medium">Password</label>
                    <Input 
                      id="captainPassword" 
                      type="password" 
                      placeholder="Enter captain password" 
                      value={captainPassword} 
                      onChange={e => setCaptainPassword(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
                {captainError && <p className="text-sm text-red-500">{captainError}</p>}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCaptainForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreatingCaptain} className="bg-orange-600 hover:bg-orange-700 text-white">
                    {isCreatingCaptain ? "Creating..." : "Create Account"}
                  </Button>
                </div>
              </form>
            ) : (
              <Button 
                onClick={() => setShowCaptainForm(true)} 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Captain Account
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Captains Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Captain Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {captains.length === 0 ? (
                <div className="col-span-full text-center text-gray-500 py-8">
                  No captains found.
                </div>
              ) : (
                captains.map((captain) => (
                  <div 
                    key={captain.id} 
                    className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-lg">{captain.name || "Unnamed Captain"}</h3>
                        <p className="text-sm text-gray-500 mt-1">{captain.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCaptain(captain.id)}
                        disabled={isDeletingCaptain === captain.id}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                      >
                        {isDeletingCaptain === captain.id ? (
                          <div className="animate-spin h-3 w-3 border-2 border-red-500 border-t-transparent rounded-full" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 