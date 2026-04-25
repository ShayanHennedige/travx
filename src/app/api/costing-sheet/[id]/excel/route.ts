import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import ExcelJS from "exceljs";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();

    try {
        // Fetch costing sheet
        const { data: costingSheet, error } = await supabase
            .from("tour_costing_sheets")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !costingSheet) {
            return NextResponse.json(
                { error: "Costing sheet not found" },
                { status: 404 }
            );
        }

        const {
            agent_name,
            arrival_date,
            no_of_pax,
            hotel_type,
            meal_plan,
            quote_date,
            accommodation_data = [],
            transport_data = [],
            extras_data = [],
            meal_extras = { ex_lunch: 0, ex_dinner: 0, ex_breakfast: 0 },
            exchange_rate = 270,
            total_lkr = 0,
            total_usd = 0,
            per_person_usd = 0,
        } = costingSheet;

        const paxCount = Number(no_of_pax) || 1;
        const usdRate = Number(exchange_rate) || 1;

        const sumFormula = (col: string, start: number, end: number) => {
            if (end < start) return "0";
            return `SUM(${col}${start}:${col}${end})`;
        };

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Costing Sheet");

        // Define colors
        const colors = {
            headerGreen: "FF4ADE80",
            separatorGreen: "FF86EFAC",
            totalPink: "FFFBCFE8",
            salePriceGreen: "FFBBF7D0",
            salePriceYellow: "FFFFFF00",
            white: "FFFFFFFF",
            border: "FFD1D5DB"
        };

        // Set column widths
        worksheet.columns = [
            { width: 12 }, // A (Day)
            { width: 15 }, // B (Location)
            { width: 25 }, // C (Hotel)
            { width: 8 },  // D (Basis)
            { width: 10 }, // E (SGL)
            { width: 10 }, // F (DBL)
            { width: 10 }, // G (Tri)
            { width: 3 },  // H (Separator)
            { width: 20 }, // I (Transport Des.)
            { width: 10 }, // J (Millage)
            { width: 10 }, // K (Rate)
            { width: 12 }, // L (Total)
            { width: 3 },  // M (Separator)
            { width: 20 }, // N (Extras Des.)
            { width: 10 }, // O (Count)
            { width: 12 }, // P (US$)
        ];

        // Main Header
        worksheet.mergeCells("A1:P1");
        const mainHeader = worksheet.getCell("A1");
        mainHeader.value = "Costing Sheet";
        mainHeader.font = { bold: true, size: 14, color: { argb: colors.white } };
        mainHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.headerGreen } };
        mainHeader.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(1).height = 30;

        // Metadata Labels and Values
        const applyMetaStyle = (cell: ExcelJS.Cell, isLabel = false) => {
            cell.font = { bold: isLabel, size: 9 };
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
            };
        };

        // Metadata Alignment rows 3-5
        // Accommodation Meta
        worksheet.getCell("A3").value = "Name of Agent";
        worksheet.getCell("B3").value = agent_name || "TravX";
        worksheet.getCell("A4").value = "Arrival Date";
        worksheet.getCell("B4").value = arrival_date || "";
        worksheet.getCell("A5").value = "No. of Pax";
        worksheet.getCell("B5").value = no_of_pax || 2;
        ["A3", "A4", "A5"].forEach(c => applyMetaStyle(worksheet.getCell(c), true));
        ["B3", "B4", "B5"].forEach(c => applyMetaStyle(worksheet.getCell(c)));
        worksheet.mergeCells("B3:C3");
        worksheet.mergeCells("B4:C4");
        worksheet.mergeCells("B5:C5");

        // Transport Meta
        worksheet.getCell("I3").value = "Hotel Type";
        worksheet.getCell("J3").value = hotel_type || "4*/5*";
        worksheet.getCell("I4").value = "Meal Plan";
        worksheet.getCell("J4").value = meal_plan || "BB";
        worksheet.getCell("I5").value = "Date of quote";
        worksheet.getCell("J5").value = quote_date ? new Date(quote_date).toLocaleDateString("en-GB") : "16/01/2024";
        ["I3", "I4", "I5"].forEach(c => applyMetaStyle(worksheet.getCell(c), true));
        ["J3", "J4", "J5"].forEach(c => applyMetaStyle(worksheet.getCell(c)));
        worksheet.mergeCells("J3:L3");
        worksheet.mergeCells("J4:L4");
        worksheet.mergeCells("J5:L5");

        // Extras Meta
        worksheet.getCell("N3").value = "USD @";
        worksheet.getCell("O3").value = exchange_rate;
        worksheet.getCell("N4").value = "Name";
        worksheet.getCell("O4").value = "DH";
        ["N3", "N4"].forEach(c => applyMetaStyle(worksheet.getCell(c), true));
        ["O3", "O4"].forEach(c => applyMetaStyle(worksheet.getCell(c)));
        worksheet.mergeCells("O3:P3");
        worksheet.mergeCells("O4:P4");

        // Section Headers
        const applySectionHeader = (range: string, title: string) => {
            worksheet.mergeCells(range);
            const cell = worksheet.getCell(range.split(":")[0]);
            cell.value = title;
            cell.font = { bold: true, size: 10, color: { argb: colors.white } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.headerGreen } };
            cell.alignment = { horizontal: "center" };
            cell.border = { left: { style: "thin" }, right: { style: "thin" }, top: { style: "thin" }, bottom: { style: "thin" } };
        };

        applySectionHeader("A7:G7", "Accommodation");
        applySectionHeader("I7:L7", "Transport");
        applySectionHeader("N7:P7", "Extras");

        // Vertical Separators
        const applySeparator = (col: string, endRow: number) => {
            for (let i = 2; i <= endRow; i++) {
                const cell = worksheet.getCell(`${col}${i}`);
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.separatorGreen } };
                cell.border = { left: { style: "thin" }, right: { style: "thin" } };
            }
        };

        // Table Headers
        const headerStyle = {
            font: { bold: true, size: 9 },
            alignment: { horizontal: "center" as const },
            border: {
                top: { style: "thin" as const },
                left: { style: "thin" as const },
                bottom: { style: "thin" as const },
                right: { style: "thin" as const }
            }
        };

        const renderTableHeaders = (row: number, cols: string[], headers: string[]) => {
            headers.forEach((h, i) => {
                const cell = worksheet.getCell(`${cols[i]}${row}`);
                cell.value = h;
                Object.assign(cell, headerStyle);
            });
        };

        renderTableHeaders(8, ["A", "B", "C", "D", "E", "F", "G"], ["Day", "Location", "Hotel", "Basis", "SGL", "DBL", "Tri"]);
        renderTableHeaders(8, ["I", "J", "K", "L"], ["Des.", "Millage", "Rate", "Total"]);
        renderTableHeaders(8, ["N", "O", "P"], ["P/P Extras", "Count", "US$"]);

        // Data Rendering
        const dataStyle = {
            font: { size: 9 },
            border: {
                top: { style: "thin" as const },
                left: { style: "thin" as const },
                bottom: { style: "thin" as const },
                right: { style: "thin" as const }
            }
        };

        // 1. Accommodation Data
        let accomRow = 9;
        let accomTotals = { sgl: 0, dbl: 0, tri: 0 };
        (accommodation_data || []).forEach((row: any) => {
            worksheet.getCell(`A${accomRow}`).value = row.day;
            worksheet.getCell(`B${accomRow}`).value = row.location;
            worksheet.getCell(`C${accomRow}`).value = row.hotel;
            worksheet.getCell(`D${accomRow}`).value = row.basis;
            worksheet.getCell(`E${accomRow}`).value = row.sgl || "";
            worksheet.getCell(`F${accomRow}`).value = row.dbl || "";
            worksheet.getCell(`G${accomRow}`).value = row.tri || "";
            ["A", "B", "C", "D", "E", "F", "G"].forEach(c => Object.assign(worksheet.getCell(`${c}${accomRow}`), dataStyle));
            accomTotals.sgl += (row.sgl || 0);
            accomTotals.dbl += (row.dbl || 0);
            accomTotals.tri += (row.tri || 0);
            accomRow++;
        });
        const accomDataStartRow = 9;
        const accomDataEndRow = accomRow - 1;

        // 2. Transport Data
        let transRow = 9;
        let transTotalLKR = 0;
        (transport_data || []).forEach((row: any) => {
            worksheet.getCell(`I${transRow}`).value = row.description;
            worksheet.getCell(`J${transRow}`).value = row.mileage;
            worksheet.getCell(`K${transRow}`).value = row.rate;
            const lineTotal = Number(row.total) || (Number(row.mileage) || 0) * (Number(row.rate) || 0);
            worksheet.getCell(`L${transRow}`).value = {
                formula: `J${transRow}*K${transRow}`,
                result: lineTotal,
            };
            ["I", "J", "K", "L"].forEach(c => Object.assign(worksheet.getCell(`${c}${transRow}`), dataStyle));
            transTotalLKR += lineTotal;
            transRow++;
        });
        const transDataStartRow = 9;
        const transDataEndRow = transRow - 1;
        const transTotalRow = transRow;
        // Transport Total Row
        worksheet.getCell(`I${transTotalRow}`).value = "Total";
        worksheet.getCell(`L${transTotalRow}`).value = {
            formula: sumFormula("L", transDataStartRow, transDataEndRow),
            result: transTotalLKR,
        };
        ["I", "J", "K", "L"].forEach(c => Object.assign(worksheet.getCell(`${c}${transTotalRow}`), dataStyle));
        worksheet.getCell(`I${transTotalRow}`).font = { bold: true, size: 9 };
        worksheet.getCell(`L${transTotalRow}`).font = { bold: true, size: 9 };
        transRow++;

        // 3. Extras Data
        let extrasRow = 9;
        let extrasTotalUSD = 0;
        (extras_data || []).forEach((row: any) => {
            worksheet.getCell(`N${extrasRow}`).value = row.name;
            worksheet.getCell(`O${extrasRow}`).value = row.count || "";
            worksheet.getCell(`P${extrasRow}`).value = (row.count || 0) * (row.unit_price || 0) || 0;
            ["N", "O", "P"].forEach(c => Object.assign(worksheet.getCell(`${c}${extrasRow}`), dataStyle));
            extrasTotalUSD += (row.count || 0) * (row.unit_price || 0);
            extrasRow++;
        });
        const extrasDataStartRow = 9;
        const extrasDataEndRow = extrasRow - 1;

        // Placeholder for missing extras rows to maintain structure
        while (extrasRow < 15) {
            ["N", "O", "P"].forEach(c => Object.assign(worksheet.getCell(`${c}${extrasRow}`), dataStyle));
            extrasRow++;
        }

        // Meal Extras in Extras Column
        const mealRowStart = extrasRow + 5;
        let mRow = mealRowStart;
        const meals = [
            { label: "EX. Lunch", val: meal_extras?.ex_lunch },
            { label: "EX. Dinner", val: meal_extras?.ex_dinner },
            { label: "EX. Breakfast", val: meal_extras?.ex_breakfast }
        ];
        meals.forEach(m => {
            worksheet.getCell(`N${mRow}`).value = m.label;
            worksheet.getCell(`P${mRow}`).value = m.val || 0;
            worksheet.getCell(`N${mRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.headerGreen } };
            worksheet.getCell(`P${mRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.separatorGreen } };
            ["N", "O", "P"].forEach(c => Object.assign(worksheet.getCell(`${c}${mRow}`), dataStyle));
            mRow++;
        });
        const mealTotalUSD = (meal_extras?.ex_lunch || 0) + (meal_extras?.ex_dinner || 0) + (meal_extras?.ex_breakfast || 0);
        const mealExtrasStartRow = mealRowStart;
        const mealExtrasEndRow = mRow - 1;
        const mealLkrTotalRow = mRow;
        worksheet.getCell(`N${mealLkrTotalRow}`).value = "LKR Total";
        worksheet.getCell(`P${mealLkrTotalRow}`).value = {
            formula: `SUM(P${mealExtrasStartRow}:P${mealExtrasEndRow})*$O$3`,
            result: mealTotalUSD * usdRate,
        };
        Object.assign(worksheet.getCell(`N${mRow}`), dataStyle);
        Object.assign(worksheet.getCell(`P${mRow}`), dataStyle);
        mRow++;
        const mealUsdTotalRow = mRow;
        worksheet.getCell(`N${mealUsdTotalRow}`).value = "P/P USD";
        worksheet.getCell(`O${mealUsdTotalRow}`).value = "Total";
        worksheet.getCell(`P${mealUsdTotalRow}`).value = {
            formula: `SUM(P${mealExtrasStartRow}:P${mealExtrasEndRow})`,
            result: mealTotalUSD,
        };
        worksheet.getCell(`P${mealUsdTotalRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.headerGreen } };
        ["N", "O", "P"].forEach(c => Object.assign(worksheet.getCell(`${c}${mealUsdTotalRow}`), dataStyle));

        // Transport Summary in Middle Column (Whole Numbers)
        const transSummaryRow = transRow + 1;
        const ppTransLKR = Math.round(transTotalLKR / paxCount);
        worksheet.getCell(`I${transSummaryRow}`).value = "P/P LKR";
        worksheet.getCell(`J${transSummaryRow}`).value = "Total";
        worksheet.getCell(`L${transSummaryRow}`).value = {
            formula: `ROUND(L${transTotalRow}/$B$5,0)`,
            result: ppTransLKR,
        };
        worksheet.getCell(`L${transSummaryRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.headerGreen } };
        ["I", "J", "L"].forEach(c => Object.assign(worksheet.getCell(`${c}${transSummaryRow}`), dataStyle));
        worksheet.getCell(`I${transSummaryRow}`).font = { bold: true, size: 9, color: { argb: "FFEF4444" } }; // Red text

        const transUsdRow = transSummaryRow + 2;
        worksheet.getCell(`I${transUsdRow}`).value = "P/P USD";
        worksheet.getCell(`J${transUsdRow}`).value = "Total";
        worksheet.getCell(`L${transUsdRow}`).value = {
            formula: `ROUND(L${transTotalRow}/$O$3,0)`,
            result: Math.round(transTotalLKR / usdRate),
        };
        worksheet.getCell(`I${transUsdRow}`).font = { bold: true, size: 9, color: { argb: "FFEF4444" } };
        ["I", "J", "L"].forEach(c => Object.assign(worksheet.getCell(`${c}${transUsdRow}`), dataStyle));

        const ppTransUSD = Math.round((transTotalLKR / usdRate) / paxCount);
        const ppUsdRow = transUsdRow + 1;
        worksheet.getCell(`J${ppUsdRow}`).value = "PP";
        worksheet.getCell(`L${ppUsdRow}`).value = {
            formula: `ROUND(L${transUsdRow}/$B$5,0)`,
            result: ppTransUSD,
        };
        ["J", "L"].forEach(c => Object.assign(worksheet.getCell(`${c}${ppUsdRow}`), dataStyle));

        // Group Total Summary (Consolidated Single Column)
        const summaryStartRow = Math.max(accomRow, 25);
        const groupTotalAccom = Math.round(accomTotals.sgl + accomTotals.dbl + accomTotals.tri);

        // Single column value applicator (merging E, F, G context for labels)
        const consolidatedRow = (label: string, val: any, r: number, fontColor?: string, bgColor?: string) => {
            worksheet.getCell(`C${r}`).value = label;
            // Merge E, F, G for a single-column total look or pick F
            const targetCell = worksheet.getCell(`F${r}`);
            targetCell.value = val;

            ["C", "E", "F", "G"].forEach(c => {
                const cell = worksheet.getCell(`${c}${r}`);
                Object.assign(cell, dataStyle);
                if (bgColor) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
                if (fontColor) cell.font = { ...cell.font, color: { argb: fontColor } };
                if (["E", "F", "G"].includes(c)) cell.alignment = { horizontal: "right" };
            });
            // Clear E and G to focus on F as the total
            worksheet.getCell(`E${r}`).value = "";
            worksheet.getCell(`G${r}`).value = "";
        };

        // Header Pink Row - Consolidated Accomadation
        worksheet.getCell(`F${summaryStartRow}`).value = {
            formula: `ROUND(${sumFormula("E", accomDataStartRow, accomDataEndRow)}+${sumFormula("F", accomDataStartRow, accomDataEndRow)}+${sumFormula("G", accomDataStartRow, accomDataEndRow)},0)`,
            result: groupTotalAccom,
        };
        ["E", "F", "G"].forEach(c => {
            const cell = worksheet.getCell(`${c}${summaryStartRow}`);
            Object.assign(cell, dataStyle);
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.totalPink } };
            cell.alignment = { horizontal: "right" };
        });

        let sRow = summaryStartRow + 1;
        const totalAccommodationRow = sRow;
        const totalTransportUSD = Math.round(transTotalLKR / usdRate);
        const totalExtrasUSD = Math.round(extrasTotalUSD + mealTotalUSD);

        consolidatedRow("Total Accomadation", { formula: `F${summaryStartRow}`, result: groupTotalAccom }, sRow);
        sRow++;
        const totalTransportRow = sRow;
        consolidatedRow("Total Transport", { formula: `ROUND(L${transUsdRow},0)`, result: totalTransportUSD }, sRow);
        sRow++;
        const totalExtrasRow = sRow;
        consolidatedRow(
            "Total Extras",
            {
                formula: `ROUND(${sumFormula("P", extrasDataStartRow, extrasDataEndRow)}+P${mealUsdTotalRow},0)`,
                result: totalExtrasUSD,
            },
            sRow
        );
        sRow++;
        const otherRow = sRow;
        consolidatedRow("Other", 0, sRow);
        sRow++;

        const profitPct = Number(costingSheet.profit_percentage ?? 15);
        const groupSubtotal = groupTotalAccom + totalTransportUSD + totalExtrasUSD;
        const groupProfit = Math.round(groupSubtotal * (profitPct / 100));
        const profitRow = sRow;
        consolidatedRow(
            `${profitPct}% For Total`,
            {
                formula: `ROUND((F${totalAccommodationRow}+F${totalTransportRow}+F${totalExtrasRow}+F${otherRow})*${profitPct}%,0)`,
                result: groupProfit,
            },
            sRow
        );
        sRow++;

        const groupTotalCost = groupSubtotal + groupProfit;
        const totalCostRow = sRow;
        consolidatedRow(
            "Total Cost",
            {
                formula: `F${totalAccommodationRow}+F${totalTransportRow}+F${totalExtrasRow}+F${otherRow}+F${profitRow}`,
                result: groupTotalCost,
            },
            sRow,
            undefined,
            colors.headerGreen
        );
        sRow++;

        // Final Per-Person price for the group
        const groupPPValue = Math.round(groupTotalCost / paxCount);

        worksheet.getCell(`A${sRow}`).value = "P/P Value";
        worksheet.getCell(`A${sRow}`).font = { bold: true, size: 9, color: { argb: "FFEF4444" } };
        worksheet.getCell(`B${sRow}`).value = "Sale price";
        applyMetaStyle(worksheet.getCell(`A${sRow}`), true);
        applyMetaStyle(worksheet.getCell(`B${sRow}`), true);
        consolidatedRow(
            "",
            {
                formula: `ROUND(F${totalCostRow}/$B$5,0)`,
                result: groupPPValue,
            },
            sRow,
            undefined,
            colors.salePriceYellow
        );

        // Final Vertical Separators application based on last row
        const finalLastRow = Math.max(sRow, mRow, transUsdRow);
        applySeparator("H", finalLastRow);
        applySeparator("M", finalLastRow);

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Return Excel file
        return new Response(buffer as any, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="CostingSheet-${agent_name || "TravX"}.xlsx"`,
            },
        });
    } catch (err) {
        console.error("Error generating Excel:", err);
        return NextResponse.json(
            { error: "Failed to generate Excel" },
            { status: 500 }
        );
    }
}
