"use client";

import { useState, useCallback } from "react";
import {
  sendWhatsAppOtp,
  verifyWhatsAppOtp,
} from "@/app/actions/sendWhatsAppOtp";

export type PhoneAuthStep = "phone" | "otp";

export function useWhatsAppOtp() {
  const [step, setStep] = useState<PhoneAuthStep>("phone");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>("");

  const sendOtp = useCallback(async (phone: string) => {
    setError(null);
    setIsSending(true);
    try {
      setPhoneNumber(phone);
      const result = await sendWhatsAppOtp(phone);
      if (!result.success) {
        const message = result.error || "Failed to send OTP";
        setError(message);
        throw new Error(message);
      }
      setStep("otp");
    } catch (err: any) {
      const message = err?.message || "Something went wrong. Please try again.";
      if (!error) setError(message);
      throw err;
    } finally {
      setIsSending(false);
    }
  }, []);

  const verifyOtp = useCallback(
    async (otp: string): Promise<boolean> => {
      if (!phoneNumber) {
        throw new Error("No OTP was sent");
      }
      setError(null);
      setIsVerifying(true);
      try {
        const result = await verifyWhatsAppOtp(phoneNumber, otp);
        if (!result.success) {
          const message = result.error || "Verification failed";
          setError(message);
          throw new Error(message);
        }
        return true;
      } catch (err: any) {
        const message =
          err?.message || "Something went wrong. Please try again.";
        if (!error) setError(message);
        throw err;
      } finally {
        setIsVerifying(false);
      }
    },
    [phoneNumber]
  );

  const reset = useCallback(() => {
    setStep("phone");
    setError(null);
    setIsSending(false);
    setIsVerifying(false);
    setPhoneNumber("");
  }, []);

  return {
    step,
    isSending,
    isVerifying,
    error,
    sendOtp,
    verifyOtp,
    reset,
  };
}
