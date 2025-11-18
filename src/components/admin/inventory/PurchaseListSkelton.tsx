import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

// Skeleton for the mobile card view
const SkeletonCard = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-3/5" />
      <Skeleton className="h-4 w-2/5" />
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-5 w-[80px]" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-4 w-[80px]" />
        <Skeleton className="h-6 w-[100px]" />
      </div>
    </CardContent>
    <CardFooter>
      <Skeleton className="h-10 w-full" />
    </CardFooter>
  </Card>
);

export const PurchaseListSkeleton = () => {
  const skeletonItems = Array.from({ length: 5 });

  return (
    <>
      {/* Mobile Skeleton */}
      <div className="md:hidden space-y-4">
        {skeletonItems.map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>

      {/* Desktop Skeleton */}
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
            {skeletonItems.map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-8 w-24 mx-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};