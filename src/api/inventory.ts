export const GetPaginatedPurchasesQuery = `
query GetPaginatedPurchases($partnerId: uuid!, $limit: Int!, $offset: Int!) {
  purchases(
    where: { partner_id: { _eq: $partnerId } },
    order_by: { purchase_date: desc },
    limit: $limit,
    offset: $offset
  ) {
    id
    created_at
    purchase_date
    total_price
    supplier {
      address
      id
      name
      phone
    }
    purchase_transactions {
      id
      unit_price
      quantity
      purchase_item {
        id
        name
      }
    }
  }
  purchases_aggregate {
    aggregate {
      count
    }
  }
}
`;

export const GetMonthlyTotalQuery = `
query GetMonthlyTotal($partnerId: uuid!, $startDate: timestamptz!, $endDate: timestamptz!) {
  purchases_aggregate(
    where: {
      partner_id: { _eq: $partnerId },
      purchase_date: { _gte: $startDate, _lte: $endDate }
    }
  ) {
    aggregate {
      sum {
        total_price
      }
    }
  }
}
`;

export const UpsertSupplierQuery = `
mutation UpsertSupplier($id: uuid!, $name: String!, $phone: String, $address: String, $partner_id: uuid!) {
  insert_suppliers_one(
    object: { 
      id: $id, 
      name: $name, 
      phone: $phone, 
      address: $address, 
      partner_id: $partner_id 
    },
    on_conflict: {
      constraint: suppliers_pkey,
      update_columns: [name, phone, address]
    }
  ) {
    id
    name
    phone
    address
  }
}`;


export const createNewPurchaseItemQuery = `
mutation CreateNewPurchaseItem($items: [purchase_items_insert_input!]!) {
  insert_purchase_items(
    objects: $items,
    on_conflict: {
      constraint: purchase_items_partner_id_name_key, 
      update_columns: [name] 
    }
  ) {
    returning {
      id
      name
    }
  }
}
`;

export const createNewPurchaseTransactionQuery = `
mutation CreateNewPurchaseTransaction($transactions: [purchase_transactions_insert_input!]!) {
  insert_purchase_transactions(objects: $transactions) {
    returning {
      id
      purchase_id
      item_id
      quantity
      unit_price
    }
  }
}
`;

export const createNewPurchaseQuery = `
mutation CreateNewPurchase($id: uuid!, $partner_id: uuid!, $supplier_id: uuid!, $total_price: numeric!, $purchase_date: timestamptz!) {
  insert_purchases(objects: { id: $id, partner_id: $partner_id, supplier_id: $supplier_id, total_price: $total_price, purchase_date: $purchase_date}) {
    returning {
      id
      created_at
      purchase_date
      total_price
      supplier {
        address
        id
        name
        phone
      }
      purchase_transactions {
        id
        unit_price
        quantity
        purchase_item {
          id
          name
        }
      }
    }
  }
}
`;


export const CreateFullPurchaseMutation = `
mutation CreateFullPurchase(
  $purchase_id: uuid!,
  $partner_id: uuid!,
  $purchase_date: timestamptz!,
  $supplier_id: uuid!,
  $total_price: numeric!,
  $transactions: [purchase_transactions_insert_input!]!
) {
  insert_purchases_one(
    object: {
      id: $purchase_id,
      partner_id: $partner_id,
      purchase_date: $purchase_date,
      supplier_id: $supplier_id,
      total_price: $total_price,
      purchase_transactions: {
        data: $transactions,
        
        # This part is crucial for creating NEW items on the fly
        on_conflict: {
          constraint: purchase_transactions_pkey,
          update_columns: [quantity, unit_price]
        }
      }
    }
  ) {
    id
    purchase_date
    total_price
  }
}
`;


export const DeletePurchaseMutation = `
  mutation DeletePurchase($id: uuid!) {
    delete_purchases_by_pk(id: $id) {
      id
    }
  }
`;

export const UpdatePurchaseMutation = `
  mutation UpdatePurchase($id: uuid!, $purchase_date: timestamptz!, $supplier_id: uuid!, $total_price: numeric!) {
    update_purchases_by_pk(pk_columns: {id: $id}, _set: {purchase_date: $purchase_date, supplier_id: $supplier_id, total_price: $total_price}) {
      id
    }
  }
`;

export const DeleteTransactionsByPurchaseIdMutation = `
  mutation DeleteTransactionsByPurchaseId($purchaseId: uuid!) {
    delete_purchase_transactions(where: {purchase_id: {_eq: $purchaseId}}) {
      affected_rows
    }
  }
`;