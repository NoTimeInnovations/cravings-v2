import { getRedirectResult as firebaseGetRedirectResult } from "firebase/auth";
import { auth } from "@/lib/firebase";

export async function getRedirectResult() {
  return firebaseGetRedirectResult(auth);
} 