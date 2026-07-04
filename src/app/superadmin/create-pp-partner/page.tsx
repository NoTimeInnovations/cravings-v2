"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Store,
  Mail,
  Lock,
  User,
  Send,
  Eye,
  Pencil,
  Plus,
  X,
  Loader2,
  Search,
  MapPin,
  Users,
  Sparkles,
  Check,
  Copy,
  ExternalLink,
} from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  searchPartnersForAdminQuery,
  updatePartner,
} from "@/api/partners";
import { placesAutocomplete, type PlacePrediction } from "@/app/actions/placesAutocomplete";
import { quickSignupFromGoogle } from "@/app/actions/quickSignupFromGoogle";
import { createPetpoojaPartnerNoWebsite } from "@/app/actions/createPetpoojaPartnerNoWebsite";
import { sendPetpoojaOnboardingEmailAction } from "@/app/actions/sendPetpoojaOnboardingEmail";

const DEFAULT_TO_EMAILS = [
  "akshay.acharya@petpooja.com",
];

const DEFAULT_CC_EMAILS = [
  "harsh.rathod@petpooja.com",
  "yashpal.parmar@petpooja.com",
];

const LOGIN_URL = "https://menuthere.com/login";
const SITE_BASE = "https://menuthere.com";

interface AdminPartner {
  id: string;
  name: string | null;
  store_name: string | null;
  email: string | null;
  username: string | null;
  petpooja_restaurant_id: string | null;
}

interface SelectedPlace {
  placeId: string;
  name: string;
  address: string;
}

interface CreatedInfo {
  username: string;
  email: string;
  password: string;
  menuLink: string;
}

const CreatePartnerPage = () => {
  // Mode: attach a Petpooja id to an existing partner, or create a brand new
  // customer (website + menu) the same way the "/" → /signup-from-google flow does.
  const [isExisting, setIsExisting] = useState(false);

  // Shared form state
  const [name, setName] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Existing-partner search
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerResults, setPartnerResults] = useState<AdminPartner[]>([]);
  const [partnerSearching, setPartnerSearching] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<AdminPartner | null>(null);
  const partnerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const partnerReqRef = useRef(0);

  // New-customer Google Places search
  const [placeSearch, setPlaceSearch] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const placeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placeReqRef = useRef(0);
  // One Places session per search → select → create, shared with the server-side
  // Place Details fetch so the keystroke autocomplete bills as a single session.
  const sessionTokenRef = useRef<string>("");
  const ensureSessionToken = () => {
    if (!sessionTokenRef.current) sessionTokenRef.current = crypto.randomUUID();
    return sessionTokenRef.current;
  };

  // Email customization state
  const [menuMapping, setMenuMapping] = useState("Online");
  const [senderName, setSenderName] = useState("Thrisha K");
  const [senderOrg, setSenderOrg] = useState("Notime Services (Cravings)");
  const [toEmails, setToEmails] = useState<string[]>(DEFAULT_TO_EMAILS);
  const [newToEmail, setNewToEmail] = useState("");
  const [ccEmails, setCcEmails] = useState<string[]>(DEFAULT_CC_EMAILS);
  const [newCcEmail, setNewCcEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [enableBackwardTax, setEnableBackwardTax] = useState(true);
  const [onlySendEmail, setOnlySendEmail] = useState(false);

  // Post-creation shareable details for a brand new customer.
  const [createdInfo, setCreatedInfo] = useState<CreatedInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const emailSubject = `New Restaurant Onboarding Of ${name || "[Restaurant Name]"} - Petpooja`;

  /* ----------------------------- searches ----------------------------- */

  // Debounced existing-partner search (min 3 chars, 500ms) — drops out-of-order
  // responses so the latest query wins.
  useEffect(() => {
    if (isExisting === false || selectedPartner) {
      setPartnerResults([]);
      return;
    }
    if (partnerDebounceRef.current) clearTimeout(partnerDebounceRef.current);
    const q = partnerSearch.trim();
    if (q.length < 3) {
      setPartnerResults([]);
      setPartnerSearching(false);
      return;
    }
    setPartnerSearching(true);
    partnerDebounceRef.current = setTimeout(async () => {
      const myReq = ++partnerReqRef.current;
      try {
        const { partners } = await fetchFromHasura(searchPartnersForAdminQuery, {
          query: `%${q}%`,
        });
        if (myReq === partnerReqRef.current) {
          setPartnerResults((partners as AdminPartner[]) || []);
        }
      } catch {
        if (myReq === partnerReqRef.current) setPartnerResults([]);
      } finally {
        if (myReq === partnerReqRef.current) setPartnerSearching(false);
      }
    }, 500);
    return () => {
      if (partnerDebounceRef.current) clearTimeout(partnerDebounceRef.current);
    };
  }, [partnerSearch, isExisting, selectedPartner]);

  // Debounced Google Places autocomplete (min 3 chars, 500ms) — same billing
  // session pattern as the homepage Hero.
  useEffect(() => {
    if (isExisting || selectedPlace) {
      setPredictions([]);
      return;
    }
    if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);
    const q = placeSearch.trim();
    if (q.length < 3) {
      setPredictions([]);
      return;
    }
    placeDebounceRef.current = setTimeout(async () => {
      const myReq = ++placeReqRef.current;
      const results = await placesAutocomplete(q, ensureSessionToken());
      if (myReq === placeReqRef.current) setPredictions(results);
    }, 500);
    return () => {
      if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);
    };
  }, [placeSearch, isExisting, selectedPlace]);

  const handlePickPartner = (p: AdminPartner) => {
    setSelectedPartner(p);
    setName(p.store_name || p.name || "");
    setEmail(p.email || "");
    setRestaurantId(p.petpooja_restaurant_id || "");
    setPartnerResults([]);
    setPartnerSearch(p.store_name || p.name || "");
  };

  const clearSelectedPartner = () => {
    setSelectedPartner(null);
    setPartnerSearch("");
    setName("");
    setEmail("");
    setRestaurantId("");
  };

  const handlePickPlace = (p: PlacePrediction) => {
    const placeName = p.structured_formatting?.main_text || p.description;
    setSelectedPlace({
      placeId: p.place_id,
      name: placeName,
      address: p.structured_formatting?.secondary_text || "",
    });
    setName(placeName);
    setPlaceSearch(placeName);
    setPredictions([]);
  };

  const clearSelectedPlace = () => {
    setSelectedPlace(null);
    setPlaceSearch("");
    setName("");
  };

  const switchMode = (existing: boolean) => {
    setIsExisting(existing);
    setCreatedInfo(null);
    setSelectedPartner(null);
    setSelectedPlace(null);
    setPartnerSearch("");
    setPlaceSearch("");
    setPartnerResults([]);
    setPredictions([]);
    setName("");
    setEmail("");
    setRestaurantId("");
    setPassword("");
  };

  /* --------------------------- email helpers --------------------------- */

  const addToEmail = () => {
    const trimmed = newToEmail.trim();
    if (trimmed && !toEmails.includes(trimmed)) {
      setToEmails([...toEmails, trimmed]);
      setNewToEmail("");
    }
  };

  const removeToEmail = (emailToRemove: string) => {
    setToEmails(toEmails.filter((e) => e !== emailToRemove));
  };

  const addCcEmail = () => {
    const trimmed = newCcEmail.trim();
    if (trimmed && !ccEmails.includes(trimmed)) {
      setCcEmails([...ccEmails, trimmed]);
      setNewCcEmail("");
    }
  };

  const removeCcEmail = (emailToRemove: string) => {
    setCcEmails(ccEmails.filter((e) => e !== emailToRemove));
  };

  const sendOnboardingEmail = () =>
    sendPetpoojaOnboardingEmailAction({
      to: [email, ...toEmails].filter(Boolean).join(", "),
      cc: ccEmails.filter(Boolean).join(", ") || undefined,
      subject: emailSubject,
      restaurantName: name,
      restaurantId,
      menuMapping,
      senderName,
      senderOrg,
      enableBackwardTax,
    });

  /* ------------------------------ submit ------------------------------ */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatedInfo(null);

    // --- Email-only: skip any creation/update, just notify the Petpooja team.
    if (onlySendEmail) {
      if (!name) return alert("Please enter a valid name.");
      if (!restaurantId) return alert("Please enter a valid Petpooja Restaurant ID.");
      if (!email) return alert("Please enter a valid email.");
      setIsSubmitting(true);
      try {
        const res = await sendOnboardingEmail();
        alert(res.success ? "Onboarding email sent successfully!" : "Failed to send email. Please try again.");
      } catch (err) {
        console.error(err);
        alert("Failed to send email.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // --- Existing partner: store the Petpooja id (and any name edit) on them.
    if (isExisting) {
      if (!selectedPartner) return alert("Please search and select an existing partner.");
      if (!restaurantId) return alert("Please enter a valid Petpooja Restaurant ID.");
      setIsSubmitting(true);
      try {
        await updatePartner(selectedPartner.id, {
          petpooja_restaurant_id: restaurantId,
          ...(name && name !== (selectedPartner.store_name || selectedPartner.name)
            ? { name }
            : {}),
        });
        if (sendEmail) {
          const res = await sendOnboardingEmail();
          alert(
            res.success
              ? "Petpooja ID saved to the partner and onboarding email sent!"
              : "Petpooja ID saved, but the email failed. Please send it manually.",
          );
        } else {
          alert("Petpooja ID saved to the partner!");
        }
        clearSelectedPartner();
      } catch (err) {
        console.error(err);
        alert("Failed to update the partner. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // --- New customer. The Google place is OPTIONAL: pick one to build the full
    // website, or leave it blank to just create the partner (no website) + email.
    if (!email) return alert("Please enter a valid email.");
    if (!restaurantId) return alert("Please enter a valid Petpooja Restaurant ID.");
    if (!selectedPlace && !name.trim())
      return alert("Search & pick a place, or enter the restaurant name.");

    setIsSubmitting(true);
    try {
      const finalPassword = password && password.length >= 6 ? password : "123456";

      // 1. Notify the Petpooja team first, with the full integration details —
      // same email that's always gone out for a PP onboarding.
      if (sendEmail) {
        try {
          await sendOnboardingEmail();
        } catch (err) {
          console.error("onboarding email failed", err);
        }
      }

      // 2. Create the partner. With a place → full Google website; without →
      // a partner with no website (storefront menu still works).
      let username: string;
      if (selectedPlace) {
        const result = await quickSignupFromGoogle({
          placeId: selectedPlace.placeId,
          sessionToken: ensureSessionToken(),
          email,
          password: finalPassword,
          skipAuthCookie: true,
        });
        if (restaurantId) {
          try {
            await updatePartner(result.partnerId, { petpooja_restaurant_id: restaurantId });
          } catch (err) {
            console.error("Failed to set petpooja id on new partner", err);
          }
        }
        username = result.username;
      } else {
        const result = await createPetpoojaPartnerNoWebsite({
          name: name.trim(),
          email,
          password: finalPassword,
          restaurantId,
        });
        username = result.username;
      }

      setCreatedInfo({
        username,
        email,
        password: finalPassword,
        menuLink: `${SITE_BASE}/${username}`,
      });
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to create the partner.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareMessage = createdInfo
    ? `Your Menuthere site is ready! 🎉

🔗 Menu link: ${createdInfo.menuLink}
📧 Email: ${createdInfo.email}
🔑 Password: ${createdInfo.password}
👉 Login here: ${LOGIN_URL}`
    : "";

  const copyShareMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Could not copy. Please select and copy manually.");
    }
  };

  const displayName = name || "[Restaurant Name]";
  const displayId = restaurantId || "[Restaurant ID]";

  const submitLabel = onlySendEmail
    ? "Send Email Only"
    : isExisting
      ? sendEmail
        ? "Save Petpooja ID & Send Email"
        : "Save Petpooja ID"
      : "Create Website";

  return (
    <div className="min-h-screen bg-orange-50 p-4 pt-20 md:p-8 md:pt-24">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Create / Attach Partner Form */}
        <Card className="border-orange-100 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-orange-950">
              Create PP Partner
            </CardTitle>
          </CardHeader>

          {createdInfo ? (
            /* Success: shareable customer message */
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-orange-950">
                  Website created!
                </h3>
                <p className="text-sm text-gray-500">
                  Send these details to the customer.
                </p>
              </div>

              <div className="rounded-lg border border-orange-200 bg-white divide-y divide-orange-100">
                <DetailRow label="Menu link" value={createdInfo.menuLink} href={createdInfo.menuLink} />
                <DetailRow label="Email" value={createdInfo.email} />
                <DetailRow label="Password" value={createdInfo.password} />
                <DetailRow label="Login link" value={LOGIN_URL} href={LOGIN_URL} />
              </div>

              <div className="space-y-2">
                <Label className="text-orange-900 text-sm">Message to send</Label>
                <textarea
                  readOnly
                  value={shareMessage}
                  rows={6}
                  className="w-full rounded-md border border-orange-200 bg-orange-50/50 p-3 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
                <Button
                  type="button"
                  onClick={copyShareMessage}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {copied ? (
                    <><Check className="mr-2 h-4 w-4" /> Copied!</>
                  ) : (
                    <><Copy className="mr-2 h-4 w-4" /> Copy message</>
                  )}
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => switchMode(false)}
                className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
              >
                Create another
              </Button>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {/* Existing partner toggle */}
                <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-white px-3 py-2.5">
                  <Label className="text-orange-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange-600" />
                    Already an existing partner?
                  </Label>
                  <button
                    type="button"
                    onClick={() => switchMode(!isExisting)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isExisting ? "bg-orange-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isExisting ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {isExisting ? (
                  /* Existing-partner searchable dropdown */
                  <div className="space-y-2">
                    <Label className="text-orange-900">Search partner</Label>
                    {selectedPartner ? (
                      <div className="flex items-center gap-2 rounded-md border border-orange-200 bg-white px-3 py-2">
                        <Users className="h-4 w-4 text-orange-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-orange-950 truncate">
                            {selectedPartner.store_name || selectedPartner.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {selectedPartner.email}
                            {selectedPartner.username ? ` · @${selectedPartner.username}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={clearSelectedPartner}
                          className="text-gray-400 hover:text-red-600 shrink-0"
                          aria-label="Clear"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-orange-600 z-10" />
                        {partnerSearching && (
                          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-orange-400 animate-spin z-10" />
                        )}
                        <Input
                          placeholder="Search by name, store, email…"
                          className="pl-9 border-orange-200 focus-visible:ring-orange-600"
                          value={partnerSearch}
                          onChange={(e) => setPartnerSearch(e.target.value)}
                        />
                        {partnerResults.length > 0 && (
                          <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-md border border-orange-200 bg-white shadow-lg">
                            {partnerResults.map((p) => (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  onClick={() => handlePickPartner(p)}
                                  className="w-full flex flex-col items-start px-3 py-2 text-left hover:bg-orange-50"
                                >
                                  <span className="text-sm font-medium text-orange-950">
                                    {p.store_name || p.name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {p.email}
                                    {p.petpooja_restaurant_id ? ` · PP: ${p.petpooja_restaurant_id}` : ""}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        {partnerSearch.trim().length >= 3 &&
                          !partnerSearching &&
                          partnerResults.length === 0 && (
                            <p className="mt-1 text-xs text-gray-400">No partners found.</p>
                          )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* New-customer Google Places search (optional) */
                  <div className="space-y-2">
                    <Label className="text-orange-900">Search the place (Google) — optional</Label>
                    {selectedPlace ? (
                      <div className="flex items-center gap-2 rounded-md border border-orange-200 bg-white px-3 py-2">
                        <MapPin className="h-4 w-4 text-orange-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-orange-950 truncate">
                            {selectedPlace.name}
                          </p>
                          {selectedPlace.address && (
                            <p className="text-xs text-gray-500 truncate">
                              {selectedPlace.address}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={clearSelectedPlace}
                          className="text-gray-400 hover:text-red-600 shrink-0"
                          aria-label="Clear"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-orange-600 z-10" />
                        <Input
                          placeholder="Search restaurant on Google…"
                          className="pl-9 border-orange-200 focus-visible:ring-orange-600"
                          value={placeSearch}
                          onChange={(e) => setPlaceSearch(e.target.value)}
                        />
                        {predictions.length > 0 && (
                          <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-md border border-orange-200 bg-white shadow-lg">
                            {predictions.map((p) => (
                              <li key={p.place_id}>
                                <button
                                  type="button"
                                  onClick={() => handlePickPlace(p)}
                                  className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-orange-50"
                                >
                                  <MapPin className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                                  <div className="min-w-0">
                                    <span className="block text-sm font-medium text-orange-950 truncate">
                                      {p.structured_formatting?.main_text || p.description}
                                    </span>
                                    {p.structured_formatting?.secondary_text && (
                                      <span className="block text-xs text-gray-500 truncate">
                                        {p.structured_formatting.secondary_text}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      Optional — leave blank to create the partner without a website. The storefront menu still works.
                    </p>
                  </div>
                )}

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-orange-900">Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-orange-600" />
                    <Input
                      id="name"
                      placeholder="Enter Name"
                      className="pl-9 border-orange-200 focus-visible:ring-orange-600"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Restaurant ID */}
                <div className="space-y-2">
                  <Label htmlFor="restaurantId" className="text-orange-900">
                    Petpooja Restaurant ID
                  </Label>
                  <div className="relative">
                    <Store className="absolute left-3 top-2.5 h-4 w-4 text-orange-600" />
                    <Input
                      id="restaurantId"
                      placeholder="Enter ID"
                      className="pl-9 border-orange-200 focus-visible:ring-orange-600"
                      value={restaurantId}
                      onChange={(e) => setRestaurantId(e.target.value)}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-orange-900">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-orange-600" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-9 border-orange-200 focus-visible:ring-orange-600"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password — only when creating a new customer website */}
                {!isExisting && !onlySendEmail && (
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-orange-900">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-orange-600" />
                      <Input
                        id="password"
                        type="text"
                        placeholder="Defaults to 123456"
                        className="pl-9 border-orange-200 focus-visible:ring-orange-600"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Send Email Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <Label className="text-orange-900 flex items-center gap-2">
                    <Send className="h-4 w-4 text-orange-600" />
                    Auto-send onboarding email
                  </Label>
                  <button
                    type="button"
                    disabled={onlySendEmail}
                    onClick={() => setSendEmail(!sendEmail)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      sendEmail || onlySendEmail ? "bg-orange-600" : "bg-gray-300"
                    } ${onlySendEmail ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        sendEmail || onlySendEmail ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Only Send Email Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <Label className="text-orange-900 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-orange-600" />
                    Only send email (skip creation)
                  </Label>
                  <button
                    type="button"
                    onClick={() => setOnlySendEmail(!onlySendEmail)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      onlySendEmail ? "bg-orange-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        onlySendEmail ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Backward Tax Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <Label className="text-orange-900 flex items-center gap-2">
                    Mention backward tax in email
                  </Label>
                  <button
                    type="button"
                    onClick={() => setEnableBackwardTax(!enableBackwardTax)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enableBackwardTax ? "bg-orange-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enableBackwardTax ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Menu Mapping Online/Offline Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <Label className="text-orange-900 flex items-center gap-2">
                    Menu Mapping
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${menuMapping === "Offline" ? "text-orange-900" : "text-gray-400"}`}>
                      Offline
                    </span>
                    <button
                      type="button"
                      onClick={() => setMenuMapping(menuMapping === "Online" ? "Offline" : "Online")}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        menuMapping === "Online" ? "bg-orange-600" : "bg-gray-400"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          menuMapping === "Online" ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span className={`text-sm font-medium ${menuMapping === "Online" ? "text-orange-900" : "text-gray-400"}`}>
                      Online
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                >
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {onlySendEmail ? "Sending..." : isExisting ? "Saving..." : "Creating..."}</>
                  ) : (
                    <>
                      {onlySendEmail ? (
                        <Send className="mr-2 h-4 w-4" />
                      ) : isExisting ? (
                        <Store className="mr-2 h-4 w-4" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      {submitLabel}
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>

        {/* Right: Email Preview */}
        <Card className={`border-orange-100 shadow-lg ${!sendEmail && !onlySendEmail ? "opacity-50 pointer-events-none" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg font-bold text-orange-950 flex items-center gap-2">
              <Mail className="h-5 w-5" /> Email Preview
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              {isEditing ? (
                <><Eye className="mr-1 h-3.5 w-3.5" /> Preview</>
              ) : (
                <><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</>
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              /* Edit Mode */
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Subject</Label>
                  <Input
                    value={emailSubject}
                    disabled
                    className="bg-gray-50 text-sm"
                  />
                  <p className="text-xs text-gray-400">Auto-generated from restaurant name</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">To</Label>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs">
                      {email || "(partner email)"}
                    </span>
                    {toEmails.map((toEmail) => (
                      <span
                        key={toEmail}
                        className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-md text-xs"
                      >
                        {toEmail}
                        <button type="button" onClick={() => removeToEmail(toEmail)}>
                          <X className="h-3 w-3 hover:text-red-600" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Add To email"
                      value={newToEmail}
                      onChange={(e) => setNewToEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addToEmail(); } }}
                      className="text-sm"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addToEmail}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Cc</Label>
                  <div className="flex flex-wrap gap-2">
                    {ccEmails.map((ccEmail) => (
                      <span
                        key={ccEmail}
                        className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-md text-xs"
                      >
                        {ccEmail}
                        <button type="button" onClick={() => removeCcEmail(ccEmail)}>
                          <X className="h-3 w-3 hover:text-red-600" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Add Cc email"
                      value={newCcEmail}
                      onChange={(e) => setNewCcEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCcEmail(); } }}
                      className="text-sm"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addCcEmail}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Sender Name</Label>
                  <Input
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Sender Organization</Label>
                  <Input
                    value={senderOrg}
                    onChange={(e) => setSenderOrg(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            ) : (
              /* Preview Mode */
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Email Header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 space-y-1">
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Subject:</span>{" "}
                    <span className="text-blue-700">{emailSubject}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">To:</span>{" "}
                    {[email ? `${name} (${email})` : "(partner email)", ...toEmails].join(", ")}
                  </div>
                  {ccEmails.length > 0 && (
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Cc:</span>{" "}
                      {ccEmails.join(", ")}
                    </div>
                  )}
                </div>

                {/* Email Body */}
                <div className="p-4 bg-white">
                  <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                    <p>Dear Petpooja Team,</p>
                    <p>
                      We would like to initiate the integration process for{" "}
                      <strong>{displayName}</strong> (Restaurant ID:{" "}
                      <strong>{displayId}</strong>) with our platform,{" "}
                      <strong>Cravings.</strong>
                    </p>
                    <p>
                      <strong>Merchant Approval:</strong> [{displayName} Owner],
                      could you please reply to this email thread with your
                      formal approval for this integration? This is required by
                      the Petpooja team to proceed with the configuration.
                    </p>
                    <p className="font-semibold">Integration Details:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>
                        <strong>Platform Name:</strong> Cravings
                      </li>
                      <li>
                        <strong>Restaurant ID:</strong> {displayId}
                      </li>
                      <li>
                        <strong>Menu Mapping:</strong> Please use the{" "}
                        <strong>[{menuMapping}]</strong> menu version for the
                        Cravings configuration.
                      </li>
                      {enableBackwardTax && (
                        <li>
                          Also <strong>enable backward tax</strong> for this partner.
                        </li>
                      )}
                    </ul>
                    <p>
                      Petpooja Team, once we have the merchant&apos;s
                      confirmation, please provide the necessary mapping codes
                      so we can proceed with the technical setup.
                    </p>
                    <p>
                      Please let us know if any further information is required.
                    </p>
                    <p>Best regards,</p>
                    <p>
                      <span className="underline">{senderName}</span>
                      <br />
                      {senderOrg}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function DetailRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="text-xs font-medium text-gray-500 shrink-0">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-orange-700 hover:underline truncate flex items-center gap-1"
        >
          <span className="truncate">{value}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      ) : (
        <span className="text-sm text-orange-950 font-medium truncate">{value}</span>
      )}
    </div>
  );
}

export default CreatePartnerPage;
