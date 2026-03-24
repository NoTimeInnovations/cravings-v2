// GraphQL queries for WhatsApp message analytics

// Overall message counts by category with date filtering
export const getWhatsAppMessageStats = `
  query GetWhatsAppMessageStats($startDate: timestamptz!, $endDate: timestamptz!) {
    total: whatsapp_message_logs_aggregate(
      where: { created_at: { _gte: $startDate, _lte: $endDate } }
    ) {
      aggregate { count }
    }
    sent: whatsapp_message_logs_aggregate(
      where: { created_at: { _gte: $startDate, _lte: $endDate }, status: { _eq: "sent" } }
    ) {
      aggregate { count }
    }
    failed: whatsapp_message_logs_aggregate(
      where: { created_at: { _gte: $startDate, _lte: $endDate }, status: { _eq: "failed" } }
    ) {
      aggregate { count }
    }
    otp: whatsapp_message_logs_aggregate(
      where: { created_at: { _gte: $startDate, _lte: $endDate }, category: { _eq: "otp" } }
    ) {
      aggregate { count }
    }
    order_update: whatsapp_message_logs_aggregate(
      where: { created_at: { _gte: $startDate, _lte: $endDate }, category: { _eq: "order_update" } }
    ) {
      aggregate { count }
    }
  }
`;

// All-time total counts (no date filter)
export const getWhatsAppTotalCounts = `
  query GetWhatsAppTotalCounts {
    total: whatsapp_message_logs_aggregate {
      aggregate { count }
    }
    otp: whatsapp_message_logs_aggregate(where: { category: { _eq: "otp" } }) {
      aggregate { count }
    }
    order_update: whatsapp_message_logs_aggregate(where: { category: { _eq: "order_update" } }) {
      aggregate { count }
    }
  }
`;

// Daily message breakdown for charts
export const getWhatsAppDailyMessages = `
  query GetWhatsAppDailyMessages($startDate: timestamptz!, $endDate: timestamptz!) {
    whatsapp_message_logs(
      where: { created_at: { _gte: $startDate, _lte: $endDate } }
      order_by: { created_at: asc }
    ) {
      id
      category
      created_at
      status
    }
  }
`;

// Per-partner usage with pagination and search
export const getWhatsAppPartnerUsage = `
  query GetWhatsAppPartnerUsage($startDate: timestamptz!, $endDate: timestamptz!, $limit: Int = 10, $offset: Int = 0, $search: String = "%") {
    partners(
      where: {
        name: { _ilike: $search }
        whatsapp_message_logs: { created_at: { _gte: $startDate, _lte: $endDate } }
      }
      limit: $limit
      offset: $offset
      order_by: { whatsapp_message_logs_aggregate: { count: desc } }
    ) {
      id
      name
      store_name
      phone
      whatsapp_message_logs_aggregate(
        where: { created_at: { _gte: $startDate, _lte: $endDate } }
      ) {
        aggregate { count }
      }
    }
    partners_aggregate(
      where: {
        name: { _ilike: $search }
        whatsapp_message_logs: { created_at: { _gte: $startDate, _lte: $endDate } }
      }
    ) {
      aggregate { count }
    }
  }
`;

// Detailed breakdown for a single partner
export const getWhatsAppPartnerDetail = `
  query GetWhatsAppPartnerDetail($partnerId: uuid!, $startDate: timestamptz!, $endDate: timestamptz!) {
    order_update: whatsapp_message_logs_aggregate(
      where: { partner_id: { _eq: $partnerId }, category: { _eq: "order_update" }, created_at: { _gte: $startDate, _lte: $endDate } }
    ) {
      aggregate { count }
    }
    otp: whatsapp_message_logs_aggregate(
      where: { partner_id: { _eq: $partnerId }, category: { _eq: "otp" }, created_at: { _gte: $startDate, _lte: $endDate } }
    ) {
      aggregate { count }
    }
    total: whatsapp_message_logs_aggregate(
      where: { partner_id: { _eq: $partnerId }, created_at: { _gte: $startDate, _lte: $endDate } }
    ) {
      aggregate { count }
    }
    sent: whatsapp_message_logs_aggregate(
      where: { partner_id: { _eq: $partnerId }, status: { _eq: "sent" }, created_at: { _gte: $startDate, _lte: $endDate } }
    ) {
      aggregate { count }
    }
    failed: whatsapp_message_logs_aggregate(
      where: { partner_id: { _eq: $partnerId }, status: { _eq: "failed" }, created_at: { _gte: $startDate, _lte: $endDate } }
    ) {
      aggregate { count }
    }
    messages: whatsapp_message_logs(
      where: { partner_id: { _eq: $partnerId }, created_at: { _gte: $startDate, _lte: $endDate } }
      order_by: { created_at: desc }
      limit: 50
    ) {
      id
      phone
      template_name
      message_type
      category
      status
      created_at
    }
  }
`;

// Recent messages log
export const getWhatsAppRecentMessages = `
  query GetWhatsAppRecentMessages($limit: Int = 20, $offset: Int = 0, $category: String) {
    whatsapp_message_logs(
      where: { category: { _eq: $category } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      id
      phone
      template_name
      message_type
      category
      status
      meta_message_id
      created_at
      partner {
        name
        store_name
      }
    }
    whatsapp_message_logs_aggregate(
      where: { category: { _eq: $category } }
    ) {
      aggregate { count }
    }
  }
`;
