type Supplier = {
  id: string;
  partner_id: string;
  name: string;
  address?: string;
  phone?: string;
  created_at: string;

  // not table types 
  isNew?: boolean; 
};

type Purchase = {
  id: string;
  supplier_id: string;
  partner_id: string;
  total_price: number;
  purchase_date: string;
  created_at: string;
};

type PurchaseItem = {
  id: string;
  name: string;
  created_at: string;
  partner_id: string;
};

type PurchaseTransaction = {
  id: string;
  purchase_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
  item_id: string;
  partner_id: string;
  supplier_id: string;
};
