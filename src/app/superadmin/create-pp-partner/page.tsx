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
import { Store, Mail, Lock, User } from "lucide-react"; // Added User icon
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  createPpPartnerMutation,
  getPartnerByPpidOrEmailQuery,
} from "@/api/partners";

const CreatePartnerPage = () => {
  const [name, setName] = useState(""); // Added name state
  const [restaurantId, setRestaurantId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Run validation. If it returns false, stop execution.
      if (!validateInputs()) return;

      // 2. Check if this email/id already exists
      const { partners } = await fetchFromHasura(getPartnerByPpidOrEmailQuery, {
        email,
        petpooja_restaurant_id: restaurantId,
      });

      if (partners && partners?.length > 0) {
        return alert(
          "A partner with this email or restaurant id already exists!"
        );
      }

      // 3. Create partner
      const { insert_partners_one } = await fetchFromHasura(
        createPpPartnerMutation,
        {
          name,
          email,
          petpooja_restaurant_id: restaurantId,
          password,
          subscription_details: {},
          theme: { "colors": { "text": "#000000", "bg": "#ffffff", "accent": "#E9701B" }, "menuStyle": "compact" }
        }
      );

      console.log("Created partner : ", insert_partners_one);

      alert("Petpooja partner created successfully !");

      // Optional: Clear form
      setName("");
      setEmail("");
      setRestaurantId("");
      setPassword("");

    } catch (error) {
      console.error(error);
      alert("Failed to create petpooja partner!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 p-4">
      <Card className="w-full max-w-md border-orange-100 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-orange-950">
            Create PP Partner
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">

            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-orange-900">
                Name
              </Label>
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

            {/* Restaurant ID Input */}
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

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-orange-900">
                Email
              </Label>
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

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-orange-900">
                Password
              </Label>
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
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold"
            >
              Create Partner
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CreatePartnerPage;