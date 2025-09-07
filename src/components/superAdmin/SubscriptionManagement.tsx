"use client";
import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format, addMonths, addYears, isAfter, parseISO } from "date-fns";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { revalidateTag } from "@/app/actions/revalidate";
import { usePartnerManagement } from "@/lib/subscriptionManagemenFunctions";
import { DateRangePicker } from "../ui/date-range-picker";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Types
export interface Partner {
  id: string;
  phone: string;
  status: "active" | "inactive";
  store_name: string;
}

export interface PartnerSubscription {
  id: string;
  partner_id: string;
  created_at: string;
  plan: "300" | "500";
  type: "monthly" | "yearly";
  expiry_date: string;
}

export interface PartnerPayment {
  id: string;
  partner_id: string;
  amount: number;
  date: string;
}

// Main component
const SubscriptionManagement = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const {
    partners,
    subscriptions,
    payments,
    repeatLastPlan,
    loading,
    error,
    currentView,
    selectedPartner,
    searchTerm,
    newSubscription,
    newPayment,
    includePayment,
    getLastSubscription,
    subscriptionPayment,
    hasMorePartners,
    hasMoreSubscriptions,
    hasMorePayments,
    setSearchTerm,
    setNewSubscription,
    setNewPayment,
    setIncludePayment,
    setSubscriptionPayment,
    fetchPartners,
    updatePartnerStatus,
    addSubscription,
    addPayment,
    updatePaymentDate,
    viewPayments,
    viewAllSubscriptions,
    showAddSubscriptionForm,
    backToList,
    showAddPaymentForm,
    formatDate,
    isActiveSubscription,
    getActiveSubscriptions,
    getNearestExpiryDate,
    getSortedPartners,
    nextPartners,
    prevPartners,
    nextPayments,
    prevPayments,
    nextSubscriptions,
    prevSubscriptions,
    paymentsOffset,
    subscriptionsOffset,
    partnersOffset,
    setCurrentView,
  } = usePartnerManagement();

  // Add Subscription Form Component
  if (currentView === "addSubscription" && selectedPartner) {
    const partner = partners.find((p) => p.id === selectedPartner);

    return (
      <div className="p-6">
        <Button onClick={backToList} variant="outline" className="mb-4">
          Back to Partners
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Add Subscription for {partner?.store_name}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}

            <div className="space-y-6">
              {/* Subscription Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="plan">Plan</Label>
                  <Select
                    value={newSubscription.plan}
                    onValueChange={(value: "300" | "500") =>
                      setNewSubscription({
                        ...newSubscription,
                        plan: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">300</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newSubscription.type}
                    onValueChange={(value: "monthly" | "yearly") =>
                      setNewSubscription({
                        ...newSubscription,
                        type: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Payment Option */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includePayment"
                    checked={includePayment}
                    onCheckedChange={(checked) =>
                      setIncludePayment(checked as boolean)
                    }
                  />
                  <Label htmlFor="includePayment">
                    Add payment with subscription
                  </Label>
                </div>

                {includePayment && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="paymentAmount">Payment Amount</Label>
                      <Input
                        id="paymentAmount"
                        type="number"
                        value={subscriptionPayment.amount}
                        onChange={(e) =>
                          setSubscriptionPayment({
                            ...subscriptionPayment,
                            amount: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Payment Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !paymentDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {paymentDate ? (
                              format(paymentDate, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={paymentDate}
                            onSelect={(selectedDate) => {
                              setPaymentDate(selectedDate);
                              if (selectedDate) {
                                setSubscriptionPayment({
                                  ...subscriptionPayment,
                                  date: selectedDate
                                    .toISOString()
                                    .split("T")[0],
                                });
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button onClick={addSubscription} disabled={loading}>
                  Add Subscription {includePayment ? "& Payment" : ""}
                </Button>
                <Button variant="outline" onClick={backToList}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // All Subscriptions View Component
  if (currentView === "allSubscriptions" && selectedPartner) {
    const partner = partners.find((p) => p.id === selectedPartner);
    const partnerSubscriptions = subscriptions[selectedPartner] || [];
    const currentOffset = subscriptionsOffset[selectedPartner] || 0;
    const hasMore = hasMoreSubscriptions[selectedPartner] || false;

    return (
      <div className="p-6">
        <Button onClick={backToList} variant="outline" className="mb-4">
          Back to Partners
        </Button>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>All Subscriptions for {partner?.store_name}</CardTitle>
              <Button onClick={() => showAddSubscriptionForm(selectedPartner)}>
                Add Subscription
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partnerSubscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>{subscription.plan}</TableCell>
                    <TableCell className="capitalize">
                      {subscription.type}
                    </TableCell>
                    <TableCell>{formatDate(subscription.created_at)}</TableCell>
                    <TableCell>
                      {formatDate(subscription.expiry_date)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          isActiveSubscription(subscription)
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {isActiveSubscription(subscription)
                          ? "Active"
                          : "Expired"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination for subscriptions */}
            <div className="flex justify-between items-center mt-4">
              <Button
                onClick={() => prevSubscriptions(selectedPartner)}
                disabled={currentOffset === 0 || loading}
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Showing {currentOffset + 1}-
                {currentOffset + partnerSubscriptions.length} subscriptions
              </span>
              <Button
                onClick={() => nextSubscriptions(selectedPartner)}
                disabled={!hasMore || loading}
                variant="outline"
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Add Payment Form Component
  if (currentView === "addPayment" && selectedPartner) {
    const partner = partners.find((p) => p.id === selectedPartner);

    return (
      <div className="p-6">
        <Button
          onClick={() => setCurrentView("payments")}
          variant="outline"
          className="mb-4"
        >
          Back to Payment History
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Add Payment for {partner?.store_name}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) =>
                    setNewPayment({
                      ...newPayment,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(selectedDate) => {
                        setDate(selectedDate);
                        if (selectedDate) {
                          setNewPayment({
                            ...newPayment,
                            date: selectedDate.toISOString().split("T")[0],
                          });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex space-x-2 mt-6">
              <Button onClick={addPayment} disabled={loading}>
                Add Payment
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentView("payments")}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment History Component
  if (currentView === "payments" && selectedPartner) {
    const partner = partners.find((p) => p.id === selectedPartner);
    const partnerPayments = payments[selectedPartner] || [];
    const currentOffset = paymentsOffset[selectedPartner] || 0;
    const hasMore = hasMorePayments[selectedPartner] || false;

    return (
      <div className="p-6">
        <Button onClick={backToList} variant="outline" className="mb-4">
          Back to Partners
        </Button>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Payments for {partner?.store_name}</CardTitle>
              <Button onClick={() => showAddPaymentForm()}>Add Payment</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partnerPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>₹{payment.amount}</TableCell>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination for payments */}
            <div className="flex justify-between items-center mt-4">
              <Button
                onClick={() => prevPayments(selectedPartner)}
                disabled={currentOffset === 0 || loading}
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Showing {currentOffset + 1}-
                {currentOffset + partnerPayments.length} payments
              </span>
              <Button
                onClick={() => nextPayments(selectedPartner)}
                disabled={!hasMore || loading}
                variant="outline"
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Partners List
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Partner Subscriptions</CardTitle>
            <Button
              onClick={() => fetchPartners(partnersOffset, true)}
              variant="outline"
            >
              Refresh
            </Button>
          </div>
          <div className="mt-4">
            <Input
              placeholder="Search partners by name or phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading && <p>Loading...</p>}
          {error && <p className="text-red-500">{error}</p>}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active Subscriptions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getSortedPartners().map((partner) => {
                const activeSubscriptions = getLastSubscription(partner.id);
                const nearestExpiry = getNearestExpiryDate(partner.id);

                return (
                  <TableRow key={partner.id}>
                    <TableCell>
                      <Link
                        className="underline text-orange-600"
                        href={`/hotels/${partner.store_name}/${partner.id}`}
                      >
                        {partner.store_name}
                      </Link>
                    </TableCell>
                    <TableCell>{partner.phone}</TableCell>
                    <TableCell>
                      <Select
                        value={partner.status}
                        onValueChange={(value: "active" | "inactive") =>
                          updatePartnerStatus(partner.id, value)
                        }
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {activeSubscriptions ? (
                          isActiveSubscription(activeSubscriptions) ? (
                            // Active subscription display
                            <div className="text-sm">
                              <span className="font-medium">
                                {activeSubscriptions.plan} plan
                              </span>{" "}
                              ({activeSubscriptions.type}) - Expires{" "}
                              {formatDate(activeSubscriptions.expiry_date)}
                              {activeSubscriptions.expiry_date ===
                                nearestExpiry && (
                                <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                                  Nearest
                                </span>
                              )}
                            </div>
                          ) : (
                            // Expired subscription display
                            <div className="text-sm">
                              <span className="font-medium line-through">
                                {activeSubscriptions.plan} plan
                              </span>{" "}
                              <span className="text-red-500">
                                ({activeSubscriptions.type}) - Expired on{" "}
                                {formatDate(activeSubscriptions.expiry_date)}
                              </span>
                              <span className="ml-2 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                                Expired
                              </span>
                            </div>
                          )
                        ) : (
                          <span className="text-gray-500">
                            No subscriptions
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewPayments(partner.id)}
                        >
                          View Payments
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewAllSubscriptions(partner.id)}
                        >
                          All Subscriptions
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => repeatLastPlan(partner.id, true)}
                        >
                          Repeat Last Plan
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination for partners */}
          <div className="flex justify-between items-center mt-4">
            <Button
              onClick={prevPartners}
              disabled={partnersOffset === 0 || loading}
              variant="outline"
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Showing {partnersOffset + 1}-{partnersOffset + partners.length}{" "}
              partners
            </span>
            <Button
              onClick={nextPartners}
              disabled={!hasMorePartners || loading}
              variant="outline"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionManagement;
