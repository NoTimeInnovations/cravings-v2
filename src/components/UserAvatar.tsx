import { getAccounts, removeAccount } from "@/lib/addAccount";
import { Partner, useAuthStore, User } from "@/store/authStore";
import { UserCircle, LogOut, Plus, Settings, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useRef } from "react";
import { toast } from "sonner";

const UserAvatar = ({ userData }: { userData: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const {
    userData: user,
    signInCaptainWithEmail,
    signInSuperAdminWithEmail,
    signInWithPhone,
    signInPartnerWithEmail,
  } = useAuthStore();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const toggleDialog = () => setIsOpen(!isOpen);
  const [accounts, setAccounts] = useState<any[]>([]);
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);

  const otherAccounts = async () => {
    const storedAccounts = await getAccounts();
    setAccounts(storedAccounts);
  };

  useEffect(() => {
    if (user) {
      otherAccounts();

      const dp = "Guest";

      switch (userData?.role) {
        case "partner":
          setDisplayName((user as Partner)?.store_name || dp);
          break;
        case "superadmin":
          setDisplayName("Super Admin");
          break;
        case "captain":
          setDisplayName("Captain");
          break;
        case "user":
          setDisplayName((user as User)?.phone || dp);
          break;
        default:
          setDisplayName(dp);
          break;
      }
    }
  }, [user, userData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSwitchAccount = async (account: any) => {
    setIsOpen(false);
    setIsSwitching(true);

    try {
      switch (account.role) {
        case "partner":
          await signInPartnerWithEmail(account.email, account.password);
          break;
        case "superadmin":
          await signInSuperAdminWithEmail(account.email, account.password);
          break;
        case "captain":
          await signInCaptainWithEmail(account.email, account.password);
          break;
        case "user":
          await signInWithPhone(account.password);
          break;
        default:
          toast.error("Unknown account role: " + account.role);
          console.error("Unknown account role:", account.role);
          break;
      }

      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1000);

      setTimeout(() => {
        setIsSwitching(false);
      }, 2000); // Simulate a delay for switching accounts

    } catch (error) {
      console.error("Failed to switch account:", error);
      setIsSwitching(false);
    }
  };

  const handleRemoveAccount = async (accountId: string, e: React.MouseEvent) => {
    setIsOpen(false);
    e.stopPropagation();
    await removeAccount(accountId);
    otherAccounts();
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDialog}
        className="flex text-sm items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <UserCircle className="h-6 w-6" />
      </button>

      {isOpen && (
        <div 
          ref={dialogRef}
          className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
        >
          {/* Profile Section */}
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            {userData?.role !== "user" && (
              <p className="text-xs text-gray-500 truncate">
                {user?.email || "No email"}
              </p>
            )}
          </div>

          {/* Account Management */}
          <div className="py-1">
            <Link
              href={"/profile"}
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <UserCircle className="h-4 w-4 mr-2" />
              Profile
            </Link>
          </div>

          {/* Other Accounts */}
          {accounts.length > 0 && (
            <div className="py-1 border-t border-gray-100">
              <p className="px-4 py-2 text-xs text-gray-500">Other accounts</p>
              {accounts.length > 0 ? (
                accounts.map((account) => (
                  <div
                    key={account.id}
                    onClick={() => handleSwitchAccount(account)}
                    className="flex cursor-pointer select-none w-full items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <div className="flex items-center">
                      <UserCircle className="h-4 w-4 mr-2" />
                      {account.name || "Guest"}
                    </div>
                    <button
                      onClick={(e) => handleRemoveAccount(account.id, e)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="px-4 py-2 text-sm text-gray-500">
                  No accounts found
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="py-1 border-t border-gray-100">
            <Link
              href={"/login"}
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add account
            </Link>
          </div>
        </div>
      )}

      {/* Full-screen loading overlay */}
      {isSwitching && (
        <div className="fixed inset-0 bg-orange-50  z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-orange-600">Switching account...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAvatar;