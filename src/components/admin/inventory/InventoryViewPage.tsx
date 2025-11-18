import React, { useEffect, useState } from "react";
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
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthCookie } from "@/app/auth/actions";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { useInventoryStore } from "@/store/inventoryStore";

const GetInventoryDataQuery = `
  query GetInventoryData($partnerId: uuid!) {
    purchase_transactions(
      where: { partner_id: { _eq: $partnerId } }
      order_by: { created_at: desc }
    ) {
      quantity
      unit_price
      created_at
      purchase_item {
        id
        name
      }
    }
  }
`;

const InsertUsageTransactionMutation = `
  mutation InsertUsageTransaction($transaction: purchase_transactions_insert_input!) {
    insert_purchase_transactions_one(object: $transaction) {
      item_id
    }
  }
`;

type AggregatedInventoryItem = {
  id: string;
  name: string;
  balanceQuantity: number;
  totalPurchasedQuantity: number;
  lastUpdatedAt: string;
  totalUsage: number;
  purchaseAmount: number;
  usageAmount: number;
  balanceAmount: number;
};

const InventoryViewPage = () => {
  const [view, setView] = useState<"list" | "track">("list");
  const [selectedItem, setSelectedItem] = useState<AggregatedInventoryItem | null>(null);
  const [inventory, setInventory] = useState<AggregatedInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setIsInventoryPage } = useInventoryStore();

  const getData = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await getAuthCookie();
      if (!user?.id) {
        setError("User not found.");
        setLoading(false);
        return;
      }

      const response = await fetchFromHasura(GetInventoryDataQuery, {
        partnerId: user.id,
      });

      if (response && response.purchase_transactions) {
        const aggregator: Record<string, Omit<AggregatedInventoryItem, 'balanceAmount'>> = {};
        response.purchase_transactions.forEach((transaction: any) => {
          const item = transaction.purchase_item;
          if (!item) return;

          if (!aggregator[item.id]) {
            aggregator[item.id] = {
              id: item.id,
              name: item.name,
              balanceQuantity: 0,
              totalPurchasedQuantity: 0,
              lastUpdatedAt: transaction.created_at,
              totalUsage: 0,
              purchaseAmount: 0,
              usageAmount: 0,
            };
          }

          aggregator[item.id].balanceQuantity += transaction.quantity;
          const transactionValue = transaction.quantity * transaction.unit_price;

          if (transaction.quantity > 0) {
            aggregator[item.id].totalPurchasedQuantity += transaction.quantity;
            aggregator[item.id].purchaseAmount += transactionValue;
          } else if (transaction.quantity < 0) {
            aggregator[item.id].totalUsage += Math.abs(transaction.quantity);
            aggregator[item.id].usageAmount += Math.abs(transactionValue);
          }
        });

        const aggregatedList = Object.values(aggregator).map(item => ({
            ...item,
            balanceAmount: item.purchaseAmount - item.usageAmount,
        })).sort((a, b) => a.name.localeCompare(b.name));

        setInventory(aggregatedList);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch inventory data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const handleTrackUsageClick = (item: AggregatedInventoryItem) => {
    setSelectedItem(item);
    setView("track");
  };

  const handleBackToList = () => {
    setSelectedItem(null);
    setView("list");
  };

  const handleUsageRecorded = () => {
    handleBackToList();
    getData();
  };

  if (view === "track" && selectedItem) {
    return (
      <TrackUsage
        item={selectedItem}
        onBack={handleBackToList}
        onSuccess={handleUsageRecorded}
      />
    );
  }

  return (
    <InventoryList
      inventory={inventory}
      loading={loading}
      error={error}
      onTrackUsage={handleTrackUsageClick}
      onBack={() => setIsInventoryPage(false)}
    />
  );
};

type InventoryListProps = {
  inventory: AggregatedInventoryItem[];
  loading: boolean;
  error: string | null;
  onTrackUsage: (item: AggregatedInventoryItem) => void;
  onBack: () => void;
};

const InventoryList = ({ inventory, loading, error, onTrackUsage, onBack }: InventoryListProps) => {
  const formatCurrency = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' });

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Inventory List</h1>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">Item Name</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                  <TableHead className="text-right">Usage Qty</TableHead>
                  <TableHead className="text-right">Balance Qty</TableHead>
                  <TableHead className="text-right">Purchase Amt</TableHead>
                  <TableHead className="text-right">Usage Amt</TableHead>
                  <TableHead className="text-right">Balance Amt</TableHead>
                  <TableHead className="text-right">Last Updated</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium capitalize">{item.name.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-right">{item.totalPurchasedQuantity.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right text-red-600">{item.totalUsage.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right text-blue-600">{item.balanceQuantity.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(item.purchaseAmount)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(item.usageAmount)}</TableCell>
                    <TableCell className="text-right text-blue-600">{formatCurrency(item.balanceAmount)}</TableCell>
                    <TableCell className="text-right">{formatDate(item.lastUpdatedAt)}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="secondary" size="sm" onClick={() => onTrackUsage(item)}>
                        Track Usage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
            {inventory.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-lg capitalize">{item.name.replace(/_/g, " ")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Balance Qty:</span><span className="font-semibold text-blue-600">{item.balanceQuantity.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span>Balance Amt:</span><span className="font-semibold text-blue-600">{formatCurrency(item.balanceAmount)}</span></div>
                  <hr className="my-1"/>
                  <div className="flex justify-between"><span>Total Qty:</span><span className="font-semibold">{item.totalPurchasedQuantity.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span>Usage Qty:</span><span className="font-semibold text-red-600">{item.totalUsage.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span>Purchase Amt:</span><span className="font-semibold text-green-600">{formatCurrency(item.purchaseAmount)}</span></div>
                  <div className="flex justify-between"><span>Usage Amt:</span><span className="font-semibold text-red-600">{formatCurrency(item.usageAmount)}</span></div>
                  <div className="flex justify-between pt-2 border-t mt-2"><span>Updated:</span><span className="font-semibold">{formatDate(item.lastUpdatedAt)}</span></div>
                </CardContent>
                <CardFooter>
                  <Button variant="secondary" className="w-full" onClick={() => onTrackUsage(item)}>
                    Track Usage
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

type TrackUsageProps = {
  item: AggregatedInventoryItem;
  onBack: () => void;
  onSuccess: () => void;
};

const TrackUsage = ({ item, onBack, onSuccess }: TrackUsageProps) => {
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numQuantity = parseFloat(quantity);

    if (!numQuantity || numQuantity <= 0) {
      setError("Please enter a valid positive quantity.");
      return;
    }
    if (numQuantity > item.balanceQuantity) {
      setError(`Usage cannot exceed available quantity (${item.balanceQuantity}).`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const user = await getAuthCookie();
      if (!user?.id) throw new Error("User not authenticated.");

      const averagePurchasePrice = item.totalPurchasedQuantity > 0 ? item.purchaseAmount / item.totalPurchasedQuantity : 0;

      const transaction = {
        item_id: item.id,
        partner_id: user.id,
        quantity: -numQuantity,
        unit_price: averagePurchasePrice,
        purchase_id: null,
        supplier_id: null,
      };

      await fetchFromHasura(InsertUsageTransactionMutation, { transaction });
      onSuccess();

    } catch (err) {
      console.error(err);
      setError("Failed to record usage. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Track Item Usage</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{item.name.replace(/_/g, " ")}</CardTitle>
          <CardDescription>
            Enter the quantity of this item that has been used or removed from inventory.
            <br />
            Current quantity available: <strong>{item.balanceQuantity.toLocaleString('en-IN')}</strong>
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity to Remove</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="e.g., 5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0.01"
                step="any"
                required
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Recording..." : "Record Usage"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div>
    <div className="hidden md:block space-y-2">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
    <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  </div>
);

export default InventoryViewPage;