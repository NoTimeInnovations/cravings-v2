import { useState, useEffect, useCallback } from "react";
import { format, isAfter, addMonths, addYears } from "date-fns";
import { fetchFromHasura } from "./hasuraClient";
import { revalidateTag } from "@/app/actions/revalidate";

interface Partner {
  id: string;
  phone: string;
  status: string;
  store_name: string;
}

interface PartnerSubscription {
  id: string;
  partner_id: string;
  plan: string;
  type: "monthly" | "yearly";
  created_at: string;
  expiry_date: string;
}

interface PartnerPayment {
  id: string;
  partner_id: string;
  amount: number;
  date: string;
}

type ViewType =
  | "list"
  | "payments"
  | "addPayment"
  | "addSubscription"
  | "allSubscriptions";

const LIMIT = 50;

export const usePartnerManagement = () => {
  // State declarations
  const [partners, setPartners] = useState<Partner[]>([]);
  const [subscriptions, setSubscriptions] = useState<
    Record<string, PartnerSubscription[]>
  >({});
  const [payments, setPayments] = useState<Record<string, PartnerPayment[]>>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>("list");
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    console.log("Current view changed:", currentView);
  }, [currentView]);

  // Pagination states
  const [partnersOffset, setPartnersOffset] = useState(0);
  const [subscriptionsOffset, setSubscriptionsOffset] = useState<
    Record<string, number>
  >({});
  const [paymentsOffset, setPaymentsOffset] = useState<Record<string, number>>(
    {}
  );
  const [hasMorePartners, setHasMorePartners] = useState(true);
  const [hasMoreSubscriptions, setHasMoreSubscriptions] = useState<
    Record<string, boolean>
  >({});
  const [hasMorePayments, setHasMorePayments] = useState<
    Record<string, boolean>
  >({});

  // Form states
  const [newSubscription, setNewSubscription] = useState<
    Omit<PartnerSubscription, "id" | "expiry_date" | "created_at">
  >({
    partner_id: "",
    plan: "300",
    type: "monthly",
  });
  const [newPayment, setNewPayment] = useState<Omit<PartnerPayment, "id">>({
    partner_id: "",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
  });
  const [includePayment, setIncludePayment] = useState(false);
  const [subscriptionPayment, setSubscriptionPayment] = useState({
    amount: 0,
    date: new Date().toISOString().split("T")[0],
  });

  // Fetch partners data with pagination and search
  const fetchPartners = useCallback(
    async (offset = 0, reset = true) => {
      setLoading(true);
      setError(null);
      try {
        const query = searchTerm
          ? `
          query Partners($limit: Int!, $offset: Int!, $search: String!) {
            partners(
              limit: $limit, 
              offset: $offset,
              where: {_or: [
                {store_name: {_ilike: $search}},
                {phone: {_ilike: $search}}
              ]}
            ) {
              id
              phone
              status
              store_name
            }
          }
        `
          : `
          query Partners($limit: Int!, $offset: Int!) {
            partners(limit: $limit, offset: $offset ,order_by: {partner_subscriptions_aggregate: {max: {expiry_date: desc_nulls_last}}}) {
              id
              phone
              status
              store_name
            }
          }
        `;

        const variables = searchTerm
          ? { limit: LIMIT, offset, search: `%${searchTerm}%` }
          : { limit: LIMIT, offset };

        const data = await fetchFromHasura(query, variables);

        if (reset) {
          setPartners(data.partners);
          setPartnersOffset(offset);
        } else {
          setPartners((prev) => [...prev, ...data.partners]);
        }

        setHasMorePartners(data.partners.length === LIMIT);

        // Fetch subscriptions for all partners
        if (data.partners.length > 0) {
          const partnerIds = data.partners.map((p: Partner) => p.id);
          await fetchAllSubscriptions(partnerIds);
        }
      } catch (err) {
        setError("Failed to fetch partners");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [searchTerm]
  );

  // Fetch subscriptions for multiple partners
  const fetchAllSubscriptions = useCallback(async (partnerIds: string[]) => {
    try {
      const data = await fetchFromHasura(
        `
        query AllPartnerSubscriptions($partnerIds: [uuid!]!, $limit: Int!) {
          partner_subscriptions(
            where: {partner_id: {_in: $partnerIds}}, 
            limit: $limit,
            order_by: {created_at: desc}
          ) {
            expiry_date
            id
            created_at
            plan
            type
            partner_id
          }
        }
      `,
        { partnerIds, limit: LIMIT }
      );

      // Group subscriptions by partner_id
      const subscriptionsByPartner = data.partner_subscriptions.reduce(
        (
          acc: Record<string, PartnerSubscription[]>,
          sub: PartnerSubscription
        ) => {
          if (!acc[sub.partner_id]) {
            acc[sub.partner_id] = [];
          }
          acc[sub.partner_id].push(sub);
          return acc;
        },
        {}
      );

      setSubscriptions((prev) => ({
        ...prev,
        ...subscriptionsByPartner,
      }));
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
    }
  }, []);

  // Fetch subscriptions for a partner with pagination
  const fetchSubscriptions = useCallback(
    async (partnerId: string, offset = 0, reset = true) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchFromHasura(
          `
        query PartnerSubscriptions($partnerId: uuid!, $limit: Int!, $offset: Int!) {
          partner_subscriptions(
            where: {partner_id: {_eq: $partnerId}}, 
            limit: $limit, 
            offset: $offset,
            order_by: {created_at: desc}
          ) {
            expiry_date
            id
            created_at
            plan
            type
            partner_id
          }
        }
      `,
          { partnerId, limit: LIMIT, offset }
        );

        if (reset) {
          setSubscriptions((prev) => ({
            ...prev,
            [partnerId]: data.partner_subscriptions,
          }));
          setSubscriptionsOffset((prev) => ({ ...prev, [partnerId]: offset }));
        } else {
          setSubscriptions((prev) => ({
            ...prev,
            [partnerId]: [
              ...(prev[partnerId] || []),
              ...data.partner_subscriptions,
            ],
          }));
        }

        setHasMoreSubscriptions((prev) => ({
          ...prev,
          [partnerId]: data.partner_subscriptions.length === LIMIT,
        }));
      } catch (err) {
        setError("Failed to fetch subscriptions");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch payments for a partner with pagination
  const fetchPayments = useCallback(
    async (partnerId: string, offset = 0, reset = true) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchFromHasura(
          `
        query PartnerPayments($partnerId: uuid!, $limit: Int!, $offset: Int!) {
          partner_payments(
            where: {partner_id: {_eq: $partnerId}}, 
            limit: $limit, 
            offset: $offset,
            order_by: {date: desc}
          ) {
            amount
            date
            id
            partner_id
          }
        }
      `,
          { partnerId, limit: LIMIT, offset }
        );

        if (reset) {
          setPayments((prev) => ({
            ...prev,
            [partnerId]: data.partner_payments,
          }));
          setPaymentsOffset((prev) => ({ ...prev, [partnerId]: offset }));
        } else {
          setPayments((prev) => ({
            ...prev,
            [partnerId]: [...(prev[partnerId] || []), ...data.partner_payments],
          }));
        }

        setHasMorePayments((prev) => ({
          ...prev,
          [partnerId]: data.partner_payments.length === LIMIT,
        }));
      } catch (err) {
        setError("Failed to fetch payments");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Update partner status
  const updatePartnerStatus = useCallback(
    async (partnerId: string, newStatus: "active" | "inactive") => {
      setLoading(true);
      setError(null);
      try {
        await fetchFromHasura(
          `
        mutation UpdatePartnerStatus($partnerId: uuid!, $status: String!) {
          update_partners_by_pk(
            pk_columns: {id: $partnerId},
            _set: {status: $status}
          ) {
            id
            status
          }
        }
      `,
          {
            partnerId,
            status: newStatus,
          }
        );

        // Update local state
        setPartners((prev) =>
          prev.map((partner) =>
            partner.id === partnerId
              ? { ...partner, status: newStatus }
              : partner
          )
        );
        revalidateTag(partnerId);
      } catch (err) {
        setError("Failed to update partner status");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Add new subscription with optional payment
  const addSubscription = useCallback(async () => {
    if (!newSubscription.partner_id) return;

    setLoading(true);
    setError(null);
    try {
      const joinedAt = new Date().toISOString();
      let expiryDate;

      if (newSubscription.type === "monthly") {
        expiryDate = addMonths(
          new Date(subscriptionPayment.date),
          1
        ).toISOString();
      } else {
        expiryDate = addYears(
          new Date(subscriptionPayment.date),
          1
        ).toISOString();
      }

      // Add subscription
      const subscriptionData = await fetchFromHasura(
        `
        mutation AddSubscription($object: partner_subscriptions_insert_input!) {
          insert_partner_subscriptions_one(object: $object) {
            id
            expiry_date
            created_at
            plan
            type
            partner_id
          }
        }
      `,
        {
          object: {
            ...newSubscription,
            created_at: joinedAt,
            expiry_date: expiryDate,
          },
        }
      );

      // Add payment if included
      if (includePayment && subscriptionPayment.amount > 0) {
        await fetchFromHasura(
          `
          mutation AddPayment($object: partner_payments_insert_input!) {
            insert_partner_payments_one(object: $object) {
              id
              amount
              date
              partner_id
            }
          }
        `,
          {
            object: {
              partner_id: newSubscription.partner_id,
              amount: subscriptionPayment.amount,
              date: subscriptionPayment.date,
            },
          }
        );

        // Update payments state
        setPayments((prev) => ({
          ...prev,
          [newSubscription.partner_id]: [
            {
              id: Date.now().toString(), // Temporary ID
              partner_id: newSubscription.partner_id,
              amount: subscriptionPayment.amount,
              date: subscriptionPayment.date,
            },
            ...(prev[newSubscription.partner_id] || []),
          ],
        }));
      }

      // Update subscriptions state
      setSubscriptions((prev) => ({
        ...prev,
        [newSubscription.partner_id]: [
          subscriptionData.insert_partner_subscriptions_one,
          ...(prev[newSubscription.partner_id] || []),
        ],
      }));

      // Reset form and go back to list
      setCurrentView("list");
      setNewSubscription({
        partner_id: "",
        plan: "300",
        type: "monthly",
      });
      setIncludePayment(false);
      setSubscriptionPayment({
        amount: 0,
        date: new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      setError("Failed to add subscription");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [newSubscription, includePayment, subscriptionPayment]);

  // Add new payment
  const addPayment = useCallback(async () => {
    if (!newPayment.partner_id) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchFromHasura(
        `
        mutation AddPayment($object: partner_payments_insert_input!) {
          insert_partner_payments_one(object: $object) {
            id
            amount
            date
            partner_id
          }
        }
      `,
        {
          object: newPayment,
        }
      );

      setPayments((prev) => ({
        ...prev,
        [newPayment.partner_id]: [
          data.insert_partner_payments_one,
          ...(prev[newPayment.partner_id] || []),
        ],
      }));

      setNewPayment({
        partner_id: newPayment.partner_id,
        amount: 0,
        date: new Date().toISOString().split("T")[0],
      });

      setCurrentView("payments");
      fetchPartners(partnersOffset, true);
    } catch (err) {
      setError("Failed to add payment");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [newPayment]);

  // Update payment date
  const updatePaymentDate = useCallback(
    async (paymentId: string, newDate: string) => {
      if (!selectedPartner) return;

      setLoading(true);
      setError(null);
      try {
        await fetchFromHasura(
          `
        mutation UpdatePaymentDate($paymentId: uuid!, $newDate: date!) {
          update_partner_payments_by_pk(
            pk_columns: {id: $paymentId},
            _set: {date: $newDate}
          ) {
            id
            date
          }
        }
      `,
          {
            paymentId,
            newDate,
          }
        );

        // Update local state
        setPayments((prev) => {
          const updatedPayments = (prev[selectedPartner] || []).map((payment) =>
            payment.id === paymentId ? { ...payment, date: newDate } : payment
          );
          return {
            ...prev,
            [selectedPartner]: updatedPayments,
          };
        });
      } catch (err) {
        setError("Failed to update payment date");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [selectedPartner]
  );

  // View payment history for a partner
  const viewPayments = (partnerId: string) => {
    setSelectedPartner(partnerId);
    fetchPayments(partnerId, 0, true);
    setCurrentView("payments");
  };

  // View all subscriptions for a partner
  const viewAllSubscriptions = useCallback(
    (partnerId: string) => {
      setSelectedPartner(partnerId);
      if (!subscriptions[partnerId]) {
        fetchSubscriptions(partnerId, 0, true);
      }
      setCurrentView("allSubscriptions");
    },
    [fetchSubscriptions, subscriptions]
  );

  // Show add subscription form
  const showAddSubscriptionForm = useCallback((partnerId: string) => {
    setSelectedPartner(partnerId);
    setNewSubscription({
      partner_id: partnerId,
      plan: "300",
      type: "monthly",
    });
    setCurrentView("addSubscription");
  }, []);

  // Go back to partner list
  const backToList = useCallback(() => {
    setCurrentView("list");
    setSelectedPartner(null);
  }, []);

  // Show add payment form
  const showAddPaymentForm = useCallback(() => {
    if (selectedPartner) {
      setNewPayment({
        partner_id: selectedPartner,
        amount: 0,
        date: new Date().toISOString().split("T")[0],
      });
      setCurrentView("addPayment");
    }
  }, [selectedPartner]);

  // Format date for display
  const formatDate = useCallback((dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy");
  }, []);

  // Check if subscription is active
  const isActiveSubscription = useCallback(
    (subscription: PartnerSubscription) => {
      return isAfter(new Date(subscription.expiry_date), new Date());
    },
    []
  );

  // Get active subscriptions for a partner
  const getActiveSubscriptions = useCallback(
    (partnerId: string) => {
      const partnerSubscriptions = subscriptions[partnerId] || [];
      return partnerSubscriptions.filter(isActiveSubscription);
    },
    [subscriptions, isActiveSubscription]
  );

  const getLastSubscription = useCallback(
    (partnerId: string) => {
      const partnerSubscriptions = subscriptions[partnerId] || [];

      if (partnerSubscriptions.length === 0) return null;

      // Sort by expiry_date (descending) to get the most recent expiry
      return [...partnerSubscriptions].sort(
        (a, b) =>
          new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime()
      )[0];
    },
    [subscriptions]
  );

  // Get nearest expiry date for a partner
  const getNearestExpiryDate = useCallback(
    (partnerId: string) => {
      const activeSubs = getActiveSubscriptions(partnerId);
      if (activeSubs.length === 0) return null;

      const sorted = [...activeSubs].sort(
        (a, b) =>
          new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
      );
      return sorted[0].expiry_date;
    },
    [getActiveSubscriptions]
  );

  // Sort partners by nearest expiry date
  const getSortedPartners = useCallback(() => {
    return [...partners].sort((a, b) => {
      const aExpiry = getLastSubscription(a.id);
      const bExpiry = getLastSubscription(b.id);
      const now = new Date().getTime();
      
      const aIsExpired = aExpiry && new Date(aExpiry.expiry_date).getTime() < now;
      const bIsExpired = bExpiry && new Date(bExpiry.expiry_date).getTime() < now;
      
      // Sort expired first
      if (aIsExpired && !bIsExpired) return -1;
      if (!aIsExpired && bIsExpired) return 1;
      
      // Then sort by status (inactive before active)
      if (a.status !== b.status) {
        return a.status === 'inactive' ? -1 : 1;
      }

      // Finally sort by expiry date
      if (!aExpiry && !bExpiry) return 0;
      if (!aExpiry) return 1;
      if (!bExpiry) return -1;

      return (
        new Date(aExpiry.expiry_date).getTime() -
        new Date(bExpiry.expiry_date).getTime()
      );
    });
  }, [partners, getLastSubscription]);

  const repeatLastPlan = useCallback(
    async (partnerId: string, includePayment: boolean = false) => {
      setLoading(true);
      setError(null);

      try {
        // Get the last subscription for the partner
        const lastSubscription = getLastSubscription(partnerId);

        if (!lastSubscription) {
          setError("No previous subscription found");
          return;
        }

        const joinedAt = new Date().toISOString();
        let expiryDate;

        // Calculate new expiry date based on subscription type
        if (lastSubscription.type === "monthly") {
          expiryDate = addMonths(new Date(), 1).toISOString();
        } else {
          expiryDate = addYears(new Date(), 1).toISOString();
        }

        // Add the new subscription
        const subscriptionData = await fetchFromHasura(
          `
        mutation AddSubscription($object: partner_subscriptions_insert_input!) {
          insert_partner_subscriptions_one(object: $object) {
            id
            expiry_date
            created_at
            plan
            type
            partner_id
          }
        }
      `,
          {
            object: {
              partner_id: partnerId,
              plan: lastSubscription.plan,
              type: lastSubscription.type,
              created_at: joinedAt,
              expiry_date: expiryDate,
            },
          }
        );

        // Add payment if included
        if (includePayment) {
          const paymentAmount = parseInt(lastSubscription.plan);
          await fetchFromHasura(
            `
          mutation AddPayment($object: partner_payments_insert_input!) {
            insert_partner_payments_one(object: $object) {
              id
              amount
              date
              partner_id
            }
          }
        `,
            {
              object: {
                partner_id: partnerId,
                amount: paymentAmount,
                date: new Date().toISOString().split("T")[0],
              },
            }
          );

          // Update payments state
          setPayments((prev) => ({
            ...prev,
            [partnerId]: [
              {
                id: Date.now().toString(), // Temporary ID
                partner_id: partnerId,
                amount: paymentAmount,
                date: new Date().toISOString().split("T")[0],
              },
              ...(prev[partnerId] || []),
            ],
          }));
        }

        // Update subscriptions state
        setSubscriptions((prev) => ({
          ...prev,
          [partnerId]: [
            subscriptionData.insert_partner_subscriptions_one,
            ...(prev[partnerId] || []),
          ],
        }));

        return subscriptionData.insert_partner_subscriptions_one;
      } catch (err) {
        setError("Failed to repeat last plan");
        console.error(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getLastSubscription]
  );

  // Pagination handlers
  const nextPartners = useCallback(() => {
    const newOffset = partnersOffset + LIMIT;
    fetchPartners(newOffset, true);
  }, [partnersOffset, fetchPartners]);

  const prevPartners = useCallback(() => {
    const newOffset = Math.max(0, partnersOffset - LIMIT);
    fetchPartners(newOffset, true);
  }, [partnersOffset, fetchPartners]);

  const nextPayments = useCallback(
    (partnerId: string) => {
      const currentOffset = paymentsOffset[partnerId] || 0;
      const newOffset = currentOffset + LIMIT;
      fetchPayments(partnerId, newOffset, true);
    },
    [paymentsOffset, fetchPayments]
  );

  const prevPayments = useCallback(
    (partnerId: string) => {
      const currentOffset = paymentsOffset[partnerId] || 0;
      const newOffset = Math.max(0, currentOffset - LIMIT);
      fetchPayments(partnerId, newOffset, true);
    },
    [paymentsOffset, fetchPayments]
  );

  const nextSubscriptions = useCallback(
    (partnerId: string) => {
      const currentOffset = subscriptionsOffset[partnerId] || 0;
      const newOffset = currentOffset + LIMIT;
      fetchSubscriptions(partnerId, newOffset, true);
    },
    [subscriptionsOffset, fetchSubscriptions]
  );

  const prevSubscriptions = useCallback(
    (partnerId: string) => {
      const currentOffset = subscriptionsOffset[partnerId] || 0;
      const newOffset = Math.max(0, currentOffset - LIMIT);
      fetchSubscriptions(partnerId, newOffset, true);
    },
    [subscriptionsOffset, fetchSubscriptions]
  );

  // Load all data on component mount and when search term changes
  useEffect(() => {
    fetchPartners(0, true);
  }, [searchTerm, fetchPartners]);

  return {
    // State
    partners,
    subscriptions,
    payments,
    loading,
    error,
    currentView,
    selectedPartner,
    searchTerm,
    newSubscription,
    newPayment,
    includePayment,
    subscriptionPayment,
    hasMorePartners,
    hasMoreSubscriptions,
    hasMorePayments,
    paymentsOffset,
    subscriptionsOffset,
    partnersOffset,

    // Setters
    setSearchTerm,
    setNewSubscription,
    setNewPayment,
    setIncludePayment,
    setSubscriptionPayment,
    setCurrentView,

    // Functions
    fetchPartners,
    repeatLastPlan,
    fetchSubscriptions,
    fetchPayments,
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
    getLastSubscription,
    getNearestExpiryDate,
    getSortedPartners,
    nextPartners,
    prevPartners,
    nextPayments,
    prevPayments,
    nextSubscriptions,
    prevSubscriptions,
  };
};
