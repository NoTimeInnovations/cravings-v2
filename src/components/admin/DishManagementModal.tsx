import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { useMenuStore } from "@/store/menuStore_hasura";
import {
  ChevronsUp,
  ChevronsDown,
  MoveVertical,
  X,
  Trash,
  Search,
  Trash2,
} from "lucide-react";
import { DialogClose } from "@radix-ui/react-dialog";
import { MenuItem } from "@/store/menuStore_hasura";
import { Switch } from "../ui/switch";

interface DishManagementModalProps {
  dishes: MenuItem[];
  categoryName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DishManagementModal({
  dishes: initialDishes,
  categoryName,
  open,
  onOpenChange,
}: DishManagementModalProps) {
  const [localDishes, setLocalDishes] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { updateItem, deleteItem } = useMenuStore();

  useEffect(() => {
    if (open) {
      setLocalDishes([...initialDishes]);
      setSearchTerm("");
    }
  }, [open, initialDishes]);

  const filteredDishes = localDishes.filter((dish) =>
    dish.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const moveToPosition = useCallback(
    (id: string, newIndex: number) => {
      const currentIndex = localDishes.findIndex((dish) => dish.id === id);
      if (
        currentIndex === -1 ||
        newIndex < 0 ||
        newIndex >= localDishes.length
      )
        return;

      const newDishes = [...localDishes];
      const [movedItem] = newDishes.splice(currentIndex, 1);
      newDishes.splice(newIndex, 0, movedItem);

      const updatedDishes = newDishes.map((dish, idx) => ({
        ...dish,
        priority: idx + 1,
      }));

      setLocalDishes(updatedDishes);
    },
    [localDishes]
  );

  const moveToTop = (id: string) => moveToPosition(id, 0);
  const moveToBottom = (id: string) =>
    moveToPosition(id, localDishes.length - 1);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    moveToPosition(result.draggableId, result.destination.index);
  };

  const handleSubmit = async () => {
    // setIsLoading(true);
    // try {
    //   for (const dish of localDishes) {
    //     if (dish.id) {
    //       await updateItem(dish.id, {
    //         priority: dish.priority,
    //       });
    //     }
    //   }
    //   setIsLoading(false);
    //   onOpenChange(false);
    //   toast.success("Dishes updated successfully");
    // } catch (err) {
    //   setIsLoading(false);
    //   toast.error("Error updating dishes");
    //   console.error("Error updating dishes:", err);
    // }
    console.log("submitting");
  };

  const handleDelete = async (dishId: string) => {
    try {
      await deleteItem(dishId);
      setLocalDishes(localDishes.filter((dish) => dish.id !== dishId));
      toast.success("Dish deleted successfully");
    } catch (err) {
      toast.error("Error deleting dish");
      console.error("Error deleting dish:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full lg:max-w-4xl h-full lg:h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-end">
            <DialogClose>X Close</DialogClose>
          </div>
          <DialogTitle>Manage Dishes - {categoryName}</DialogTitle>
          <DialogDescription>
            Reorder dishes by dragging or using the controls. Use action arrows to
            move dishes to top or bottom.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search dishes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1 h-7 w-7"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={() => setSearchTerm("")}>
              Clear
            </Button>
          </div>

          <div className="border rounded-lg overflow-y-scroll max-h-[400px] flex-1">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Table className="h-full">
                <TableHeader className="bg-gray-50 sticky top-0">
                  <TableRow>
                    <TableHead>Dish Name</TableHead>
                    <TableHead className="w-[100px] text-center">Price</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    <TableHead className="w-[100px] text-center">Popular</TableHead>
                    <TableHead className="w-[100px] text-center">Actions</TableHead>
                    <TableHead className="w-[40px]">Move</TableHead>
                    <TableHead className="w-[40px] text-center">Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <Droppable droppableId="dishes">
                  {(provided) => (
                    <TableBody
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="divide-y"
                    >
                      {filteredDishes.map((dish, index) => (
                        <Draggable
                          key={dish.id}
                          draggableId={dish.id || ""}
                          index={index}
                        >
                          {(provided) => (
                            <TableRow
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                            >
                              <TableCell>{dish.name}</TableCell>
                              <TableCell className="text-center">
                                ₹{dish.price}
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={dish.is_available}
                                  onCheckedChange={async () => {
                                    if (dish.id) {
                                      await updateItem(dish.id, {
                                        is_available: !dish.is_available,
                                      });
                                      setLocalDishes(
                                        localDishes.map((d) =>
                                          d.id === dish.id
                                            ? { ...d, is_available: !d.is_available }
                                            : d
                                        )
                                      );
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={dish.is_top}
                                  onCheckedChange={async () => {
                                    if (dish.id) {
                                      await updateItem(dish.id, {
                                        is_top: !dish.is_top,
                                      });
                                      setLocalDishes(
                                        localDishes.map((d) =>
                                          d.id === dish.id
                                            ? { ...d, is_top: !d.is_top }
                                            : d
                                        )
                                      );
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => moveToTop(dish.id || "")}
                                  >
                                    <ChevronsUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => moveToBottom(dish.id || "")}
                                  >
                                    <ChevronsDown className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell {...provided.dragHandleProps}>
                                <MoveVertical className="h-4 w-4 mx-auto" />
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(dish.id || "")}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </TableBody>
                  )}
                </Droppable>
              </Table>
            </DragDropContext>
          </div>
        </div>

        <DialogFooter className="flex justify-between mt-4">
          <Button
            variant="outline"
            onClick={() => {
              setLocalDishes([...initialDishes]);
              toast("Changes discarded");
            }}
          >
            Reset
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}