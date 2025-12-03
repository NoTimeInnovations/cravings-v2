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
    userData: Partner | null
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
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    ws["!merges"] = [
        XLSX.utils.decode_range("A1:D1"),
        XLSX.utils.decode_range(`A3:D3`),
        XLSX.utils.decode_range(`A10:D10`),
        XLSX.utils.decode_range(`A15:D15`),
    ];

    ws["!cols"] = [
        { wch: 30 }, // Label
        { wch: 15 }, // Value 1
        { wch: 15 }, // Value 2
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Order Report");
    XLSX.writeFile(
        wb,
        `Order_Report_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`
    );
};
