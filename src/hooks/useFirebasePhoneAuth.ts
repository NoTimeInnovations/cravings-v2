"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export type PhoneAuthStep = "phone" | "otp";

function getErrorMessage(code?: string): string {
  switch (code) {
    case "auth/invalid-phone-number":
      return "Invalid phone number. Please check and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/quota-exceeded":
      return "SMS quota exceeded. Please try again later.";
    case "auth/captcha-check-failed":
      return "Verification failed. Please try again.";
    case "auth/code-expired":
      return "OTP has expired. Please request a new one.";
    case "auth/invalid-verification-code":
      return "Invalid OTP. Please check and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function useFirebasePhoneAuth() {
  const [step, setStep] = useState<PhoneAuthStep>("phone");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  const sendOtp = useCallback(
    async (
      phoneNumber: string,
      recaptchaContainerId: string = "recaptcha-container"
    ) => {
      setError(null);
      setIsSending(true);
      try {
        // Clear old verifier
        if (recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        }
        // Replace the container element entirely to clear reCAPTCHA's internal state
        const oldContainer = document.getElementById(recaptchaContainerId);
        if (oldContainer) {
          const newContainer = document.createElement("div");
          newContainer.id = recaptchaContainerId;
          oldContainer.replaceWith(newContainer);
        }

        const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
          size: "invisible",
        });
        recaptchaVerifierRef.current = verifier;

        const result = await signInWithPhoneNumber(
          auth,
          phoneNumber,
          verifier
        );
        confirmationResultRef.current = result;
        setStep("otp");
      } catch (err: any) {
        console.error("Firebase Phone Auth Error:", {
          code: err?.code,
          message: err?.message,
          fullError: err,
        });
        const message = getErrorMessage(err?.code);
        setError(message);
        if (recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        }
        throw new Error(message);
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  const verifyOtp = useCallback(async (otp: string): Promise<boolean> => {
    if (!confirmationResultRef.current) {
      throw new Error("No OTP was sent");
    }
    setError(null);
    setIsVerifying(true);
    try {
      await confirmationResultRef.current.confirm(otp);
      return true;
    } catch (err: any) {
      const message = getErrorMessage(err?.code);
      setError(message);
      throw new Error(message);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const reset = useCallback(() => {
    setStep("phone");
    setError(null);
    setIsSending(false);
    setIsVerifying(false);
    confirmationResultRef.current = null;
    if (recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current.clear();
      recaptchaVerifierRef.current = null;
    }
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
