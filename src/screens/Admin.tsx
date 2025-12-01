"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MenuTab } from "@/components/admin/MenuTab";
import { OffersTab } from "@/components/admin/OffersTab";
import { Partner } from "@/store/authStore";
import { useEffect, useState } from "react";
import { Notification } from "@/app/actions/notification";

export default function Admin({ userData }: { userData: Partner }) {

  const [activeTab, setActiveTab] = useState("menu");

  // Main dashboard for active partners
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-orange-50 to-orange-100 pb-20">
      <div className="max-w-7xl mx-auto p-8">
        {activeTab === "menu" && (
        <h1 className="text-2xl font-bold text-gray-900 capitalize mb-8">
          {(userData as Partner)?.store_name} Admin Dashboard
        </h1>
)}
        <Tabs defaultValue="menu" className="w-full" onValueChange={(value) => setActiveTab(value)}>
          <TabsList className="grid w-full grid-flow-col auto-cols-fr mb-8">
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="offers">Offers</TabsTrigger>
          </TabsList>
          <TabsContent value="menu">
            <MenuTab />
          </TabsContent>
          <TabsContent value="offers">
            <OffersTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
