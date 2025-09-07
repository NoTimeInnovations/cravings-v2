export interface OrderStatusDetail {
  isCompleted: boolean;
  completedAt: string | null;
}

// Numeric keys for database storage
export type OrderStatusStorage = Record<number, OrderStatusDetail>;

// String keys for frontend display
export type OrderStatusDisplay = Record<string, OrderStatusDetail>;

export const StatusMapping = {
  "0": "accepted",
  "1": "dispatched",
  "2": "completed",
} as const;

export type OrderStatusHistoryTypes = 'accepted' | 'dispatched' | 'completed';

export const ReverseStatusMapping = {
  accepted: "0",
  dispatched: "1",
  completed: "2",
} as const;

export const defaultStatusHistory: OrderStatusStorage = {
  "0": { isCompleted: false, completedAt: null },
  "1": { isCompleted: false, completedAt: null },
  "2": { isCompleted: false, completedAt: null },
};

export function toStatusDisplayFormat(
  storageData: OrderStatusStorage
): OrderStatusDisplay {
  if (
    storageData === null ||
    storageData === undefined ||
    Object.keys(storageData).length === 0
  ) {
    return toStatusDisplayFormat(defaultStatusHistory);
  }

  return Object.fromEntries(
    Object.entries(storageData).map(([key, value]) => [
      StatusMapping[key as keyof typeof StatusMapping],
      value,
    ])
  );
}

export function toStatusStorageFormat(
  displayData: OrderStatusDisplay
): OrderStatusStorage {
  if (
    displayData === null ||
    displayData === undefined ||
    Object.keys(displayData).length === 0
  ) {
    return defaultStatusHistory;
  }

  return Object.fromEntries(
    Object.entries(displayData).map(([key, value]) => [
      ReverseStatusMapping[key as keyof typeof ReverseStatusMapping],
      value,
    ])
  );
}


export function setStatusHistory(
    currentStatusHistory: OrderStatusStorage,
    statusKey: number | keyof typeof ReverseStatusMapping,
    updates: Partial<OrderStatusDetail>
  ): OrderStatusStorage {


    // Handle empty/invalid input
    if (!currentStatusHistory || typeof currentStatusHistory !== 'object') {
      currentStatusHistory = { ...defaultStatusHistory };
    }
  
    // Convert string status names to numeric keys
    const numericKey = typeof statusKey === 'string' 
      ? ReverseStatusMapping[statusKey]
      : statusKey;
  
    // Validate the status key exists
    if (!(numericKey in StatusMapping)) {
      throw new Error(`Invalid status key: ${statusKey}`);
    }
  
    // Create a deep copy of the current status
    const updatedHistory = { ...currentStatusHistory };
    
    // Update the specific status
    updatedHistory[numericKey] = {
      ...(updatedHistory[numericKey] || { 
        isCompleted: false, 
        completedAt: null 
      }),
      ...updates
    };
  
    // Auto-set completedAt if status is being marked as completed
    if (updates.isCompleted === true && !updatedHistory[numericKey].completedAt) {
      updatedHistory[numericKey].completedAt = new Date().toISOString();
    }
  
    return updatedHistory;
  }