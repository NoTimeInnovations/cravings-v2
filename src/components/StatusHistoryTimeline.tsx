import {
  OrderStatusStorage,
  toStatusDisplayFormat,
  OrderStatusHistoryTypes,
  ReverseStatusMapping,
} from "@/lib/statusHistory";
import React from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FaMotorcycle } from "react-icons/fa";

const statusConfig = {
  accepted: {
    title: "Accepted",
    icon: <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 " />,
    color: "bg-green-500",
    description: "Order confirmed",
  },
  dispatched: {
    title: "Dispatched",
    icon: <FaMotorcycle className="h-4 w-4 sm:h-5 sm:w-5 " />,
    color: "bg-blue-500",
    description: "On the way",
  },
  completed: {
    title: "Completed",
    icon: <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 " />,
    color: "bg-purple-500",
    description: "Order received",
  },
} satisfies Record<
  OrderStatusHistoryTypes,
  {
    title: string;
    icon: React.ReactNode;
    color: string;
    description: string;
  }
>;

const StatusHistoryTimeline = ({
  status_history,
}: {
  status_history: OrderStatusStorage;
}) => {
  const statusHistory = toStatusDisplayFormat(status_history || {});

  // Convert to array and sort by status sequence
  const statusEntries = Object.entries(statusHistory)
    .map(([status, details]) => ({
      status: status as OrderStatusHistoryTypes,
      ...details,
      ...statusConfig[status as OrderStatusHistoryTypes],
    }))
    .sort(
      (a, b) =>
        Number(ReverseStatusMapping[a.status]) -
        Number(ReverseStatusMapping[b.status])
    );

  // Find the current active status (last completed)
  const activeIndex = statusEntries.reduce((acc, entry, index) => {
    return entry.isCompleted ? index : acc;
  }, -1);

  return (
    <div className="w-full sm:px-4 py-6">
      <div className="relative">
        {/* Horizontal line */}
        <div
          className="absolute top-8 left-0 right-0 h-0.5 bg-gray-200"
          aria-hidden="true"
        />

        <ol className="flex justify-between">
          {statusEntries.map((entry, index) => {
            const isCompleted = entry.isCompleted;
            const isActive = index <= activeIndex;
            const isFirst = index === 0;
            const isLast = index === statusEntries.length - 1;

            return (
              <li
                key={entry.status}
                className={cn(
                  "relative flex flex-col items-center",
                  isFirst ? "ml-0" : "-ml-2",
                  isLast ? "mr-0" : "-mr-2"
                )}
                style={{ flex: 1 }}
              >
                {/* Status indicator */}
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-4 z-10 mb-2",
                    isActive
                      ? `${entry.color} border-white text-white`
                      : "bg-gray-100 border-gray-200 text-gray-400"
                  )}
                >
                  {React.cloneElement(entry.icon, {
                    className: "h-4 w-4",
                  })}
                </div>

                {/* Status text */}
                <div className="text-center max-w-[100px]">
                  <h4
                    className={cn(
                      "text-sm font-medium mb-1",
                      isActive ? "text-gray-900" : "text-gray-500"
                    )}
                  >
                    {entry.title}
                  </h4>
                  {isCompleted && entry.completedAt && (
                    <>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.completedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.completedAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export default StatusHistoryTimeline;
