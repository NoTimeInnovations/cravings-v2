"use client";

import React, { useState } from "react";
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
import { Store, Mail, Lock, User, Send, Eye, Pencil, Plus, X, Loader2 } from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  createPpPartnerMutation,
  getPartnerByPpidOrEmailQuery,
} from "@/api/partners";
import { sendPetpoojaOnboardingEmailAction } from "@/app/actions/sendPetpoojaOnboardingEmail";

const DEFAULT_CC_EMAILS = [
  "malvi@petpooja.com",
  "jatan@petpooja.com",
  "rohan@petpooja.com",
  "siddharth.patel@petpooja.com",
];

const CreatePartnerPage = () => {
  // Form state
  const [name, setName] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Email customization state
  const [menuMapping, setMenuMapping] = useState("Online");
  const [senderName, setSenderName] = useState("Thrisha K");
  const [senderOrg, setSenderOrg] = useState("Notime Services (Cravings)");
  const [ccEmails, setCcEmails] = useState<string[]>(DEFAULT_CC_EMAILS);
  const [newCcEmail, setNewCcEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  const emailSubject = `New Restaurant Onboarding Of ${name || "[Restaurant Name]"} - Petpooja`;

  const validateInputs = () => {
    if (!name) {
      alert("Please enter a valid name.");
      return false;
    }
    if (!restaurantId) {
      alert("Please enter a valid Petpooja Restaurant ID.");
      return false;
    }
    if (!email) {
      alert("Please enter a valid email.");
      return false;
    }
    if (!password) {
      alert("Please enter a valid password.");
      return false;
    }
    return true;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setIsSubmitting(true);
    try {
      // 1. Check if this email/id already exists
      const { partners } = await fetchFromHasura(getPartnerByPpidOrEmailQuery, {
        email,
        petpooja_restaurant_id: restaurantId,
      });

      if (partners && partners?.length > 0) {
        setIsSubmitting(false);
        return alert(
          "A partner with this email or restaurant id already exists!"
        );
      }

      // 2. Create partner
      const { insert_partners_one } = await fetchFromHasura(
        createPpPartnerMutation,
        {
          name,
          email,
          petpooja_restaurant_id: restaurantId,
          password,
          subscription_details: {},
          theme: {
            colors: { text: "#000000", bg: "#ffffff", accent: "#E9701B" },
            menuStyle: "compact",
          },
        }
      );

      console.log("Created partner:", insert_partners_one);

      // 3. Send onboarding email
      if (sendEmail) {
        const emailResult = await sendPetpoojaOnboardingEmailAction({
          to: email,
          cc: ccEmails,
          subject: emailSubject,
          restaurantName: name,
          restaurantId,
          menuMapping,
          senderName,
          senderOrg,
        });

        if (emailResult.success) {
          alert("Petpooja partner created and onboarding email sent successfully!");
        } else {
          alert("Partner created but failed to send email. Please send manually.");
        }
      } else {
        alert("Petpooja partner created successfully!");
      }

      // Clear form
      setName("");
      setEmail("");
      setRestaurantId("");
      setPassword("");
    } catch (error) {
      console.error(error);
      alert("Failed to create petpooja partner!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = name || "[Restaurant Name]";
  const displayId = restaurantId || "[Restaurant ID]";

  return (
    <div className="min-h-screen bg-orange-50 p-4 pt-20 md:p-8 md:pt-24">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Create Partner Form */}
        <Card className="border-orange-100 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-orange-950">
              Create PP Partner
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
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

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-orange-900">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-orange-600" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-9 border-orange-200 focus-visible:ring-orange-600"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {/* Send Email Toggle */}
              <div className="flex items-center justify-between pt-2">
                <Label className="text-orange-900 flex items-center gap-2">
                  <Send className="h-4 w-4 text-orange-600" />
                  Auto-send onboarding email
                </Label>
                <button
                  type="button"
                  onClick={() => setSendEmail(!sendEmail)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    sendEmail ? "bg-orange-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      sendEmail ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold"
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                ) : sendEmail ? (
                  <><Send className="mr-2 h-4 w-4" /> Create Partner & Send Email</>
                ) : (
                  "Create Partner"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Right: Email Preview */}
        <Card className={`border-orange-100 shadow-lg ${!sendEmail ? "opacity-50 pointer-events-none" : ""}`}>
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
                  <Input
                    value={email || "(uses partner email)"}
                    disabled
                    className="bg-gray-50 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">CC (Petpooja Team)</Label>
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
                      placeholder="Add CC email"
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
                  <Label className="text-sm text-gray-600">Menu Mapping</Label>
                  <Input
                    value={menuMapping}
                    onChange={(e) => setMenuMapping(e.target.value)}
                    className="text-sm"
                  />
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
                    {email ? `${name} (${email})` : "(partner email)"}
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">CC:</span>{" "}
                    {ccEmails.join(", ")}
                  </div>
                </div>

                {/* Email Body */}
                <div className="p-4 bg-white">
                  <div className="bg-gray-50 px-3 py-2 rounded mb-3">
                    <p className="text-sm text-blue-700 font-medium">
                      {emailSubject}
                    </p>
                  </div>
                  <hr className="my-3" />
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

export default CreatePartnerPage;
