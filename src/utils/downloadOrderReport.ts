import * as XLSX from "xlsx-js-style";
import { format, startOfDay, endOfDay, startOfMonth } from "date-fns";
import { Partner } from "@/store/authStore";

interface ReportData {
    orders_aggregate?: {
        aggregate: {
            sum: { total_price: number };
            count: number;
        };
    };
    delivery_orders?: {
        aggregate: { count: number };
    };
    cash_orders?: {
        aggregate: { count: number; sum: { total_price: number } };
    };
    upi_orders?: {
        aggregate: { count: number; sum: { total_price: number } };
    };
    card_orders?: {
        aggregate: { count: number; sum: { total_price: number } };
    };
    null_payment_orders?: {
        aggregate: { count: number; sum: { total_price: number } };
    };
}

interface TopItem {
    name: string;
    category: string;
    quantity: number;
    revenue: number;
}

export const downloadOrderReport = async (
    reportData: ReportData,
    topItemsData: TopItem[],
    activeTab: "today" | "month" | "custom",
    dateRange: { startDate: Date; endDate: Date },
    userData: Partner | null,
    allOrders: any[] = []
) => {
    if (!reportData) return;

    const currencySymbol = userData?.currency || "₹";
    const currencyFormat = `${currencySymbol}#,##0.00`;

    const thinBorder = {
        top: { style: "thin", color: { rgb: "FFD3D3D3" } },
        bottom: { style: "thin", color: { rgb: "FFD3D3D3" } },
        left: { style: "thin", color: { rgb: "FFD3D3D3" } },
        right: { style: "thin", color: { rgb: "FFD3D3D3" } },
    };

    const titleStyle = {
        font: { bold: true, sz: 18, color: { rgb: "FF4F81BD" } },
        alignment: { horizontal: "left", vertical: "center" },
    };
    const sectionHeaderStyle = {
        font: { bold: true, sz: 14 },
        fill: { fgColor: { rgb: "FFF2F2F2" } },
    };
    const tableHeaderStyle = {
        font: { bold: true, color: { rgb: "FFFFFFFF" } },
        fill: { fgColor: { rgb: "FF4F81BD" } },
        border: thinBorder,
        alignment: { horizontal: "center", vertical: "center" },
    };
    const tableCellStyle = { border: thinBorder };
    const summaryKeyStyle = { font: { bold: true } };

    const createCell = (value: any, style: any, type = "s", z?: string) => {
        const isNullOrUndefined = value === null || value === undefined;
        const cell: any = {
            v: isNullOrUndefined ? "N/A" : value,
            s: style,
            t: isNullOrUndefined ? "s" : type,
        };
        if (z && !isNullOrUndefined) {
            cell.z = z;
        }
        return cell;
    };

    const ws_data = [
        [createCell("Order Analytics Report", titleStyle)],
        [],
        [createCell("Summary", sectionHeaderStyle)],
        [
            createCell("Report Period", { ...summaryKeyStyle, ...tableCellStyle }),
            createCell(
                `${format(
                    activeTab === "today"
                        ? startOfDay(new Date())
                        : activeTab === "month"
                            ? startOfMonth(new Date())
                            : dateRange.startDate,
                    "MMM dd, yyyy"
                )} - ${format(
                    activeTab === "today" ? endOfDay(new Date()) : dateRange.endDate,
                    "MMM dd, yyyy"
                )}`,
                tableCellStyle
            ),
        ],
        [
            createCell("Total Earnings", { ...summaryKeyStyle, ...tableCellStyle }),
            createCell(
                reportData.orders_aggregate?.aggregate?.sum?.total_price,
                tableCellStyle,
                "n",
                currencyFormat
            ),
        ],
        [
            createCell("Orders Completed", {
                ...summaryKeyStyle,
                ...tableCellStyle,
            }),
            createCell(
                reportData.orders_aggregate?.aggregate?.count,
                tableCellStyle,
                "n"
            ),
        ],
        [
            createCell("Deliveries", { ...summaryKeyStyle, ...tableCellStyle }),
            createCell(
                reportData.delivery_orders?.aggregate?.count,
                tableCellStyle,
                "n"
            ),
        ],
        [
            createCell("Average Order Value", {
                ...summaryKeyStyle,
                ...tableCellStyle,
            }),
            createCell(
                reportData.orders_aggregate?.aggregate?.count
                    ? reportData.orders_aggregate.aggregate.sum.total_price /
                    reportData.orders_aggregate.aggregate.count
                    : 0,
                tableCellStyle,
                "n",
                currencyFormat
            ),
        ],
        [],
        [createCell("Payment Method Breakdown", sectionHeaderStyle)],
        [
            createCell("Cash Orders", { ...summaryKeyStyle, ...tableCellStyle }),
            createCell(
                reportData?.cash_orders?.aggregate?.count || 0,
                tableCellStyle,
                "n"
            ),
            createCell(
                reportData?.cash_orders?.aggregate?.sum?.total_price || 0,
                tableCellStyle,
                "n",
                currencyFormat
            ),
        ],
        [
            createCell("UPI Orders", { ...summaryKeyStyle, ...tableCellStyle }),
            createCell(
                reportData?.upi_orders?.aggregate?.count || 0,
                tableCellStyle,
                "n"
            ),
            createCell(
                reportData?.upi_orders?.aggregate?.sum?.total_price || 0,
                tableCellStyle,
                "n",
                currencyFormat
            ),
        ],
        [
            createCell("Card Orders", { ...summaryKeyStyle, ...tableCellStyle }),
            createCell(
                reportData?.card_orders?.aggregate?.count || 0,
                tableCellStyle,
                "n"
            ),
            createCell(
                reportData?.card_orders?.aggregate?.sum?.total_price || 0,
                tableCellStyle,
                "n",
                currencyFormat
            ),
        ],
        [
            createCell("Not Selected Orders", { ...summaryKeyStyle, ...tableCellStyle }),
            createCell(
                reportData?.null_payment_orders?.aggregate?.count || 0,
                tableCellStyle,
                "n"
            ),
            createCell(
                reportData?.null_payment_orders?.aggregate?.sum?.total_price || 0,
                tableCellStyle,
                "n",
                currencyFormat
            ),
        ],
        [],
        [createCell("Top Selling Items", sectionHeaderStyle)],
        [
            createCell("Item Name", tableHeaderStyle),
            createCell("Category", tableHeaderStyle),
            createCell("Quantity Sold", tableHeaderStyle),
        ],
        ...topItemsData.map((item: any) => [
            createCell(item.name, tableCellStyle),
            createCell(item.category, tableCellStyle),
            createCell(item.quantity, tableCellStyle),
        ]),
        [],
        [createCell("All Orders", sectionHeaderStyle)],
        [
            createCell("Order ID", tableHeaderStyle),
            createCell("Order Display ID", tableHeaderStyle),
            createCell("Created At", tableHeaderStyle),
            createCell("Order Type", tableHeaderStyle),
            createCell("Table/Address", tableHeaderStyle),
            createCell("Items", tableHeaderStyle),
            createCell("Extra Charges", tableHeaderStyle),
            createCell("Payment Method", tableHeaderStyle),
            createCell("Status", tableHeaderStyle),
            createCell("Total Price", tableHeaderStyle)
        ],
        ...allOrders.map((order: any) => {
            const displayId = `${order.display_id} - ${format(
                new Date(order.created_at),
                "MMM dd"
            )}`;
            const createdAt = format(
                new Date(order.created_at),
                "MMM dd, yyyy hh:mm a"
            );
            const items = order.order_items
                .map(
                    (item: any) =>
                        `${item.quantity} x ${item.menu.name} (${currencySymbol}${item.menu.price})`
                )
                .join(", ");

            const extraCharges = order.extra_charges
                ? order.extra_charges
                    .map(
                        (charge: any) =>
                            `${charge.name}: ${currencySymbol}${charge.amount}`
                    )
                    .join(", ")
                : "N/A";

            return [
                createCell(order.id.slice(0, 8), tableCellStyle),
                createCell(displayId, tableCellStyle),
                createCell(createdAt, tableCellStyle),
                createCell(order.type, tableCellStyle),
                createCell(
                    order.table_name ||
                    order.table_number ||
                    order.delivery_address ||
                    "N/A",
                    tableCellStyle
                ),
                createCell(items, tableCellStyle),
                createCell(extraCharges, tableCellStyle),
                createCell(order.payment_method || "N/A", tableCellStyle),
                createCell(order.status, tableCellStyle),
                createCell(order.total_price, tableCellStyle, "n", currencyFormat),
            ];
        }),
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    ws["!merges"] = [
        XLSX.utils.decode_range("A1:D1"),
        XLSX.utils.decode_range(`A3:D3`),
        XLSX.utils.decode_range(`A10:D10`),
        XLSX.utils.decode_range(`A15:D15`),
        XLSX.utils.decode_range(`A${16 + topItemsData.length + 2}:J${16 + topItemsData.length + 2}`),
    ];

    ws["!cols"] = [
        { wch: 30 }, // Label
        { wch: 20 }, // Value 1
        { wch: 20 }, // Value 2
        { wch: 15 }, // Order Type
        { wch: 25 }, // Table/Address
        { wch: 40 }, // Items
        { wch: 20 }, // Extra Charges
        { wch: 15 }, // Payment Method
        { wch: 15 }, // Status
        { wch: 15 }, // Total Price
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Order Report");
    XLSX.writeFile(
        wb,
        `Order_Report_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`
    );
};
