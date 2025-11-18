import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PartnerPurchase, useInventoryStore } from "@/store/inventoryStore";
import { Badge } from "@/components/ui/badge"; // Assuming you have a Badge component

interface PurchaseListProps {
  purchases: PartnerPurchase[];
}

// Mobile Card View Component
const PurchaseCard = ({ purchase }: { purchase: PartnerPurchase }) => (
  <Card className="shadow-sm">
    <CardHeader>
      <CardTitle className="text-lg capitalize">{purchase.supplier.name.replace(/_/g, " ")}</CardTitle>
      <p className="text-sm text-muted-foreground">
        {new Date(purchase.purchase_date).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
    </CardHeader>
    <CardContent className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">Total Amount</span>
        <span className="font-bold text-lg">
          {new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
          }).format(purchase.total_price)}
        </span>
      </div>
      {/* <div className="flex justify-between items-center">
        <span className="text-muted-foreground">Status</span> */}
        {/* This is a placeholder, you'd get status from your data */}
        {/* <Badge variant="secondary">Received</Badge>
      </div> */}
      <p className="text-xs text-muted-foreground pt-2">ID: {purchase.id}</p>
    </CardContent>
    <CardFooter>
      <Button
        onClick={() => useInventoryStore.getState().selectPurchase(purchase)}
        variant="outline"
        className="w-full text-orange-600 border-orange-600 hover:bg-orange-600 hover:text-white"
      >
        View Details
      </Button>
    </CardFooter>
  </Card>
);

export const PurchaseList = ({ purchases }: PurchaseListProps) => {
  const { selectPurchase } = useInventoryStore();

  if (purchases.length === 0) {
    return null;
  }

  return (
    <>
      {/* Mobile View: Renders a list of cards */}
      <div className="md:hidden space-y-4">
        {purchases.map((purchase) => (
          <PurchaseCard key={purchase.id} purchase={purchase} />
        ))}
      </div>

      {/* Desktop View: Renders a table */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Purchase ID</TableHead>
              <TableHead>Purchase Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Total Price</TableHead>
              <TableHead className="w-[150px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.map((purchase) => (
              <TableRow key={purchase.id}>
                <TableCell className="font-mono text-sm">
                  {purchase.id.substring(0, 8)}...
                </TableCell>
                <TableCell>
                  {new Date(purchase.purchase_date).toLocaleDateString("en-IN")}
                </TableCell>
                <TableCell className="capitalize">{purchase.supplier.name.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-right font-medium">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                  }).format(purchase.total_price)}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectPurchase(purchase)}
                    className="text-orange-600 border-orange-600 hover:bg-orange-600 hover:text-white"
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};
