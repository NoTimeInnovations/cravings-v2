import { getAuthCookie } from "@/app/auth/actions";
import { toast } from "sonner";

export function addAccount(user: any) {
  const newUser = {
    name: user?.name || "Guest",
    email: user?.email || "No email",
    store_name: user?.store_name || "No store name",
    role: user?.role || "guest",
    id: user?.id,
    password: user?.password || "123456",
  };

  // Get existing accounts (decrypt if they exist)
  let existingAccounts = [];
  const accounts = localStorage?.getItem("my_accounts");

  if (accounts) {
    existingAccounts = JSON.parse(accounts);
  }

  // Check if account already exists
  const isAccountExists = existingAccounts.some(
    (account: any) => account.email === newUser.email
  );

  if (isAccountExists) {
    return;
  }

  // Add new account and encrypt before storing
  existingAccounts.push(newUser);
  localStorage?.setItem("my_accounts", JSON.stringify(existingAccounts));
}

export async function getAllAccounts() {
  const existingAccounts = localStorage?.getItem("my_accounts");
  if (!existingAccounts) {
    return [];
  }
  let accounts = JSON.parse(existingAccounts);
  return accounts;
}

export async function getAccounts() {
  const currentUser = await getAuthCookie();
  const encryptedAccounts = localStorage?.getItem("my_accounts");

  if (!encryptedAccounts) {
    return [];
  }

  // Decrypt accounts
  let accounts = JSON.parse(encryptedAccounts);

  // Filter out the current user
  if (currentUser) {
    accounts = accounts.filter((account: any) => account.id !== currentUser.id);
  }

  return accounts;
}

export function removeAccount(id: string) {
  const encryptedAccounts = localStorage?.getItem("my_accounts");

  if (!encryptedAccounts) {
    toast.error("No accounts found");
    return;
  }

  // Decrypt, filter, and re-encrypt
  const existingAccounts = JSON.parse(encryptedAccounts);
  const updatedAccounts = existingAccounts.filter(
    (account: any) => account.id !== id
  );

  localStorage?.setItem("my_accounts", JSON.stringify(updatedAccounts));
  toast.success("Account removed successfully");
}
