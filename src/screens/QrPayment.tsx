"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { FileClock, UtensilsCrossed } from "lucide-react";
import { useAuthStore, User } from "@/store/authStore";
// import PartnerLoginModal from "@/components/PartnerLoginModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  GET_HOTEL_DETAILS,
  FOLLOW_PARTNER,
  GET_USER_VISITS,
  CREATE_PAYMENT,
  GET_UPI_DETAILS,
  IS_FOLLOWING,
} from "@/api/payments";

interface HotelDetails {
  hotelId: string;
  hotelName: string;
  hotelArea: string;
}

interface UPIApp {
  name: string;
  icon: string;
  getUrl: (params: {
    upiId: string;
    merchantName: string;
    amount: number;
    transactionId: string;
  }) => string;
}

const upiApps: UPIApp[] = [
  {
    name: "Google Pay",
    icon: "/google-pay.png",
    getUrl: ({ upiId, merchantName, amount, transactionId }) =>
      `gpay://upi/pay?pa=${upiId}&pn=${encodeURIComponent(
        merchantName
      )}&tr=${transactionId}&tn=Payment%20to%20${encodeURIComponent(
        merchantName
      )}&am=${amount}&cu=INR`,
  },
  {
    name: "PhonePe",
    icon: "/phonepay-icon.jpg",
    getUrl: ({ upiId, merchantName, amount, transactionId }) =>
      `phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(
        merchantName
      )}&tr=${transactionId}&tn=Payment%20to%20${encodeURIComponent(
        merchantName
      )}&am=${amount}&cu=INR`,
  },
  {
    name: "Paytm",
    icon: "/paytm-icon.jpg",
    getUrl: ({ upiId, merchantName, amount, transactionId }) =>
      `paytmmp://pay?pa=${upiId}&pn=${encodeURIComponent(
        merchantName
      )}&tr=${transactionId}&tn=Payment%20to%20${encodeURIComponent(
        merchantName
      )}&am=${amount}&cu=INR`,
  },
];

const QrPayment = () => {
  const [billAmount, setBillAmount] = useState<string>("");
  const [hotelDetails, setHotelDetails] = useState<HotelDetails>();
  const params = useParams();
  const ids = params.id as string[];
  const id = ids[0];
  const { userData, signInWithPhone } = useAuthStore();
  const [isSignedIn, setIsSignedIn] = useState<boolean>(true);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRecentVisit, setIsRecentVisit] = useState<boolean>(false);
  const [discount, setDiscount] = useState<number>(0);
  const [isPaymentSuccess, setIsPaymentSuccess] = useState<boolean>(false);
  const [showUpiErrorDialog, setShowUpiErrorDialog] = useState(false);
  const [showHotelPage, setShowHotelPage] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isBillAmountSubmitted, setIsBillAmountSubmitted] = useState(false);
  const router = useRouter();

  const getHotelDetails = async () => {
    try {
      if (id) {
        const response = await fetchFromHasura(GET_HOTEL_DETAILS, {
          qrCodeId: id,
        });

        if (response.qr_codes && response.qr_codes.length > 0) {
          const qrData = response.qr_codes[0];
          setHotelDetails({
            hotelId: qrData.partner_id,
            hotelName: qrData.partner.store_name,
            hotelArea: qrData.partner.district,
          });
        } else {
          throw new Error("QR code not found");
        }
      } else {
        throw new Error("ID is null");
      }
    } catch (error) {
      toast.error("Upi payment not available");
      console.error(error);
    }
  };

  const calculateDiscount = (visits: any[]) => {
    if (visits.length === 0) return 0;

    const lastVisit = visits[0];
    const now = new Date();
    const lastVisitDate = new Date(lastVisit.createdAt);
    const diffTime = Math.abs(now.getTime() - lastVisitDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Simple discount logic - 10% discount if last visit was more than 7 days ago
    if (diffDays > 7) {
      return 10;
    }

    return 0;
  };

  const handleSubmit = async (
    e?: React.FormEvent<HTMLFormElement>,
    user?: User | null
  ) => {
    e?.preventDefault();

    const u = user || userData;

    if (!u) {
      setIsSignedIn(false);
      return;
    }

    if (u.role !== "user") {
      toast.error("You are not allowed to use this feature");
      return;
    }

    setIsLoading(true);
    try {
      const { followers } = await fetchFromHasura(IS_FOLLOWING, {
        userId: u.id,
        partnerId: hotelDetails?.hotelId,
      });

      // Follow the partner

      // if (!followers || followers.length === 0) {
      //   await fetchFromHasura(FOLLOW_PARTNER, {
      //     userId: u.id,
      //     partnerId: hotelDetails?.hotelId,
      //     phone: u.role === "user" ? u.phone : "",
      //   });
      // } else {
      //   console.log("Already following");
      // }

      // Calculate discount
      const calculatedDiscount = 0;
      const amount = billAmount.replace("₹", "");

      // Create payment record
      await fetchFromHasura(CREATE_PAYMENT, {
        partnerId: hotelDetails?.hotelId,
        amount: Number(amount),
        userId: u.id,
        discount: calculatedDiscount,
      });

      setDiscount(calculatedDiscount);
      setIsBillAmountSubmitted(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length !== 10) {
      return;
    }
    try {
      setIsLoading(true);
      const user = await signInWithPhone(phoneNumber, hotelDetails?.hotelId);
      setIsSignedIn(true);
      setIsLoading(false);
      await handleSubmit(undefined, user);
    } catch (error) {
      console.error(error);
      toast.error(error as string);
      setIsLoading(false);
    }
  };

  const handlePayNow = async () => {
    try {
      setIsLoading(true);

      // Get UPI details
      const upiResponse = await fetchFromHasura(GET_UPI_DETAILS, {
        partnerId: hotelDetails?.hotelId,
      });

      if (upiResponse.partners && upiResponse.partners.length > 0) {
        const isIphone = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIphone) {
          setShowPaymentModal(true);
          return;
        } else {
          const upiData = upiResponse.partners[0];
          const upiId = upiData.upi_id;
          const finalAmount =
            Number(billAmount.replace("₹", "")) -
            (Number(billAmount.replace("₹", "")) * discount) / 100;
            window.location.href = `upi://pay?pa=${upiId}&am=${finalAmount}`;
        }
        setIsPaymentSuccess(true);
      } else {
        setShowUpiErrorDialog(true);
        setShowHotelPage(true);
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUPIPayment = async (app: UPIApp) => {
    setShowPaymentModal(false);

    await fetchFromHasura(GET_UPI_DETAILS, {
      partnerId: hotelDetails?.hotelId,
    })
      .then((upiResponse) => {
        if (upiResponse.partners && upiResponse.partners.length > 0) {
          const upiData = upiResponse.partners[0];
          const upiId = upiData.upi_id;
          const finalAmount =
            Number(billAmount.replace("₹", "")) -
            (Number(billAmount.replace("₹", "")) * discount) / 100;

          const paymentUrl = app.getUrl({
            upiId,
            merchantName: hotelDetails?.hotelName || "",
            amount: finalAmount,
            transactionId: Date.now().toString(),
          });

          window.location.href = paymentUrl;
        }
      })
      .catch((error) => {
        console.error("Error fetching UPI details:", error);
        toast.error("Error fetching UPI details");
      });
  };

  useEffect(() => {
    // Check if user is already logged in
    if (userData) {
      setIsSignedIn(true);
    }
    getHotelDetails();
  }, [userData]);

  return (
    <main className="px-[7.5%] pt-[12%] pb-[20%] bg-orange-600 h-[100dvh] flex flex-col overflow-hidden">
      <div className="flex justify-between items-start">
        {/* cravings title  */}
        <div className="flex flex-col gap-2 flex-1">
          {/* logo  */}
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-10 h-10 text-white" />
            <h1 className="text-white text-xl font-bold">Cravings</h1>
          </div>

          {/* short descritpion  */}
          <div className="text-white/80 font-medium text-[12px] mt-2">
            <p>Get discounts and offers in your favorite restaurants</p>
          </div>
        </div>

        {/* discount history button  */}
        {/* <Link
          href={
            hotelDetails
              ? `${window.location.origin}/hotels/${hotelDetails?.hotelId}?qid=${id}`
              : ""
          }
          className={`${
            hotelDetails?.hotelId
              ? "cursor-pointer"
              : "w-36 h-8 animate-pulse cursor-default"
          } bg-white text-black px-4 py-2 rounded-full disabled:opacity-50 flex items-center gap-2`}
        >
          {hotelDetails?.hotelId ? (
            <>
              <FileClock className="w-4 h-4" />
              <p className="text-black font-medium text-[12px]">
                Discount History
              </p>
            </>
          ) : null}
        </Link> */}
      </div>

      {/* main section  */}
      <section className={`flex flex-col flex-1 justify-end`}>
        {isSignedIn ? (
          <>
            {isBillAmountSubmitted || isRecentVisit ? (
              <div className="flex flex-col flex-1 justify-between items-center">
                <div></div>
                <div className="flex flex-col gap-2">
                  <h1 className="text-white text-8xl font-bold text-center">
                    ₹
                    {Number(billAmount.replace("₹", "")) -
                      Number(billAmount.replace("₹", "")) * (discount / 100)}
                  </h1>
                  {discount > 0 ? (
                    <h1 className="text-white/70 font-medium text-center">
                      Yay! You got a {discount}% discount
                    </h1>
                  ) : (
                    <h1 className="text-white/70 font-medium text-center">
                      Better luck next time with more discounts!
                    </h1>
                  )}
                </div>

                <div className="flex flex-col gap-2 w-full">
                  <button
                    disabled={isLoading}
                    onClick={
                      isPaymentSuccess
                        ? () => {
                            router.push(
                              `${window.location.origin}/hotels/${hotelDetails?.hotelId}`
                            );
                          }
                        : handlePayNow
                    }
                    className="bg-white text-black px-4 w-full py-2 rounded-md disabled:opacity-50 flex-1"
                  >
                    {isPaymentSuccess
                      ? "Go To Hotel Page"
                      : isLoading
                      ? "Processing..."
                      : "Pay Now"}
                  </button>

                  {showHotelPage && (
                    <button
                      onClick={() => {
                        router.push(
                          `${window.location.origin}/hotels/${hotelDetails?.hotelId}`
                        );
                      }}
                      className="bg-white text-black px-4 w-full py-2 rounded-md"
                    >
                      Go To Hotel Page
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-2 mt-5 flex-1 justify-between"
                >
                  <div />

                  <input
                    disabled={!hotelDetails}
                    id="billAmount"
                    name="billAmount"
                    value={billAmount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      if (value === "") {
                        setBillAmount("");
                      } else {
                        const formattedValue = `₹${value}`;
                        setBillAmount(formattedValue);
                      }
                    }}
                    type="text"
                    placeholder="₹0"
                    className="w-full p-2 rounded-md text-center text-6xl font-bold bg-transparent text-white placeholder:text-white/70 focus:outline-none "
                  />

                  <div className="w-full flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <Link
                        href={
                          hotelDetails
                            ? `${window.location.origin}/hotels/${hotelDetails?.hotelId}`
                            : ""
                        }
                        className={`text-black bg-white rounded-full px-3 py-2 text-[12px] capitalize flex items-center gap-1 font-medium ${
                          hotelDetails
                            ? "w-fit cursor-pointer select-none"
                            : "h-8 w-[40%] animate-pulse cursor-default"
                        }`}
                      >
                        {hotelDetails ? (
                          <>
                            <UtensilsCrossed className="w-4 h-4" />
                            View Menu
                          </>
                        ) : null}
                      </Link>
                      <h1 className="text-white text-4xl font-bold capitalize">
                        {hotelDetails?.hotelName ? (
                          <>{hotelDetails?.hotelName}</>
                        ) : (
                          <div className="bg-white w-[80%] h-8 rounded-full animate-pulse" />
                        )}
                      </h1>
                      <div className="text-white/80 text-sm capitalize">
                        {hotelDetails?.hotelArea ? (
                          <>{hotelDetails?.hotelArea}</>
                        ) : (
                          <div className="bg-white/50 w-[30%] h-5 rounded-full animate-pulse" />
                        )}
                      </div>
                    </div>
                    <button
                      disabled={!hotelDetails || !billAmount || isLoading}
                      type="submit"
                      className="bg-white text-black px-4 py-2 rounded-md disabled:opacity-50"
                    >
                      {isLoading ? "Discounting..." : "Get Discount"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </>
        ) : (
          <>
            {/* Headings  */}
            <div className="flex flex-col gap-1">
              <h1 className="text-white text-4xl font-bold">
                New To Cravings?
              </h1>
              <div className="text-white/80 text-sm">
                Sign in to get discounts and offers
              </div>
            </div>

            {/* bill input  */}
            <form onSubmit={handleSignIn} className="flex flex-col gap-2 mt-5">
              <input
                id="phoneNumber"
                name="phoneNumber"
                value={phoneNumber}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^0-9]/g, "");
                  // Limit to 10 digits
                  if (value.length > 10) {
                    value = value.slice(0, 10);
                  }
                  setPhoneNumber(value);
                }}
                type="text"
                placeholder="Enter phone number"
                className="w-full p-2 rounded-md bg-white/10 text-white placeholder:text-white/70 focus:outline-none focus:border-white border-2 border-transparent"
                maxLength={10}
                minLength={10}
              />
              <button
                disabled={
                  !phoneNumber || phoneNumber.length !== 10 || isLoading
                }
                type="submit"
                className="bg-white text-black px-4 py-2 rounded-md disabled:opacity-50"
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </form>
          </>
        )}
      </section>

      {/* <PartnerLoginModal /> */}

      <Dialog open={showUpiErrorDialog} onOpenChange={setShowUpiErrorDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>UPI Payment Unavailable</DialogTitle>
            <DialogDescription>
              UPI payment option is not available right now. Please use cash or
              card instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowUpiErrorDialog(false)}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              Okay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
            <DialogDescription>
              Select your preferred UPI payment app
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {upiApps.map((app) => (
              <Button
                key={app.name}
                onClick={() => handleUPIPayment(app)}
                className="w-full bg-white hover:bg-gray-100 text-black border flex items-center justify-center gap-2"
              >
                <img src={app.icon} alt={app.name} className="w-6 h-6" />
                Pay with {app.name}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowPaymentModal(false)}
              variant="outline"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default QrPayment;
