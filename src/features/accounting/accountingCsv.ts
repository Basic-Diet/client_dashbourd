import type {
  SubscriptionPaymentBucket,
  SubscriptionPaymentReportData,
  SubscriptionPaymentReportItem,
} from "@/features/accounting/accountingTypes";
import {
  formatBooleanAr,
  fulfillmentMethodLabel,
  paymentMethodLabel,
  paymentProviderLabel,
  sourceChannelLabel,
  textOrDash,
} from "@/features/accounting/accountingFormatters";

type ExcelCell = {
  value: string | number;
  type?: "String" | "Number";
  style?: string;
};

type ExcelRow = ExcelCell[];

const xmlEscape = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const stringCell = (value: unknown, style = "Text"): ExcelCell => ({
  value: value ?? "",
  type: "String",
  style,
});

const numberCell = (value: unknown, style = "Number"): ExcelCell => {
  const parsed = Number(value);
  return {
    value: Number.isFinite(parsed) ? parsed : 0,
    type: "Number",
    style,
  };
};

const moneyCell = (halala: unknown): ExcelCell => {
  const parsed = Number(halala);
  return numberCell(Number.isFinite(parsed) ? parsed / 100 : 0, "Money");
};

const renderCell = (cell: ExcelCell) =>
  `<Cell ss:StyleID="${xmlEscape(cell.style ?? "Text")}"><Data ss:Type="${cell.type ?? "String"}">${xmlEscape(cell.value)}</Data></Cell>`;

const renderRow = (row: ExcelRow) => `<Row>${row.map(renderCell).join("")}</Row>`;

const renderWorksheet = (
  name: string,
  rows: ExcelRow[],
  widths: number[] = []
) => {
  const columns = widths
    .map((width) => `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`)
    .join("");
  return `
    <Worksheet ss:Name="${xmlEscape(name.slice(0, 31))}">
      <Table>${columns}${rows.map(renderRow).join("")}</Table>
      <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
        <DisplayRightToLeft/>
        <FreezePanes/>
        <FrozenNoSplit/>
        <SplitHorizontal>1</SplitHorizontal>
        <TopRowBottomPane>1</TopRowBottomPane>
        <ProtectObjects>False</ProtectObjects>
        <ProtectScenarios>False</ProtectScenarios>
      </WorksheetOptions>
    </Worksheet>`;
};

const periodLabel = (report: SubscriptionPaymentReportData) =>
  report.reportType === "monthly"
    ? textOrDash(report.businessMonthLabelAr, report.businessMonth)
    : textOrDash(report.businessDateLabelAr, report.businessDate);

const extendedSummary = (report: SubscriptionPaymentReportData) =>
  (report.summary ?? {}) as NonNullable<SubscriptionPaymentReportData["summary"]> & {
    moyasarCount?: number | null;
    moyasarTotalHalala?: number | null;
    cardCount?: number | null;
    cardTotalHalala?: number | null;
    reviewItemsCount?: number | null;
  };

const buildSummaryRows = (report: SubscriptionPaymentReportData): ExcelRow[] => {
  const summary = extendedSummary(report);
  return [
    [stringCell(report.titleAr || "تقرير تحصيل الاشتراكات", "Title"), stringCell("", "Title")],
    [stringCell("الفترة", "Label"), stringCell(periodLabel(report), "Value")],
    [stringCell("وقت إنشاء التقرير", "Label"), stringCell(textOrDash(report.generatedAtLabelAr, report.generatedAt), "Value")],
    [stringCell("العملة", "Label"), stringCell(report.currency || "SAR", "Value")],
    [stringCell("إجمالي تحصيل الاشتراكات", "Label"), moneyCell(summary.grossCollectionHalala ?? summary.totalHalala)],
    [stringCell("المرتجعات", "Label"), moneyCell(summary.refundsHalala)],
    [stringCell("صافي الحركة", "Label"), moneyCell(summary.netCollectionHalala)],
    [stringCell("الصافي قبل الضريبة", "Label"), moneyCell(summary.netBeforeVatHalala)],
    [stringCell("صافي الضريبة", "Label"), moneyCell(summary.netVatHalala)],
    [stringCell("التحصيل النقدي", "Label"), moneyCell(summary.cashTotalHalala)],
    [stringCell("تحصيل البطاقات (يشمل ميسر)", "Label"), moneyCell(summary.cardTotalHalala ?? summary.visaTotalHalala)],
    [stringCell("منها عبر ميسر — ضمن البطاقات", "Label"), moneyCell(summary.moyasarTotalHalala)],
    [stringCell("مبالغ غير مصنفة", "Label"), moneyCell(summary.unknownTotalHalala)],
    [stringCell("عدد عمليات الدفع", "Label"), numberCell(summary.totalPaymentsCount, "Integer")],
    [stringCell("عدد العملاء", "Label"), numberCell(summary.uniqueCustomersCount, "Integer")],
    [stringCell("حركات تحتاج مراجعة", "Label"), numberCell(summary.reviewItemsCount, "Integer")],
    [stringCell("حالة التسوية", "Label"), stringCell(textOrDash(report.reconciliation?.statusLabelAr, report.reconciliation?.status), "Value")],
    [stringCell("فرق التسوية", "Label"), moneyCell(report.reconciliation?.differenceHalala)],
    [stringCell("ملاحظة", "Label"), stringCell(report.reconciliation?.noteAr || "-", "Value")],
  ];
};

const detailsHeaders = [
  "نوع الحركة",
  "مرجع الدفعة",
  "رقم الاشتراك",
  "اسم العميل",
  "رقم الهاتف",
  "اسم الخطة",
  "نوع الدفعة",
  "طريقة الدفع",
  "قناة المصدر",
  "مزود الدفع",
  "الحالة",
  "الإجمالي (ر.س)",
  "الصافي قبل الضريبة (ر.س)",
  "الضريبة (ر.س)",
  "صافي الحركة (ر.س)",
  "طريقة التنفيذ",
  "حالة الاشتراك",
  "تاريخ العمل",
  "تاريخ الدفع",
  "تاريخ الاسترداد",
  "رقم ميسر/المزود",
  "رقم المرتجع",
  "محتسب في الإجماليات",
  "تحتاج مراجعة",
  "أسباب المراجعة",
] as const;

const itemToExcelRow = (item: SubscriptionPaymentReportItem): ExcelRow => [
  stringCell(textOrDash(item.movementTypeLabelAr, item.movementType, "تحصيل")),
  stringCell(textOrDash(item.paymentReference, item.paymentId)),
  stringCell(textOrDash(item.subscriptionId)),
  stringCell(textOrDash(item.customerName)),
  stringCell(textOrDash(item.customerPhone)),
  stringCell(textOrDash(item.planNameAr)),
  stringCell(textOrDash(item.paymentTypeLabelAr, item.paymentType)),
  stringCell(paymentMethodLabel(item.paymentMethod, item.paymentMethodLabelAr)),
  stringCell(sourceChannelLabel(item.sourceChannel, item.sourceChannelLabelAr)),
  stringCell(paymentProviderLabel(item.paymentProvider ?? item.provider, item.paymentProviderLabelAr ?? item.providerLabelAr)),
  stringCell(textOrDash(item.statusLabelAr, item.status)),
  moneyCell(item.amountHalala),
  moneyCell(item.netBeforeVatHalala),
  moneyCell(item.vatHalala),
  moneyCell(item.netMovementHalala),
  stringCell(fulfillmentMethodLabel(item.fulfillmentMethod, item.fulfillmentMethodLabelAr)),
  stringCell(textOrDash(item.subscriptionStatusLabelAr, item.subscriptionStatus)),
  stringCell(textOrDash(item.businessDateLabelAr, item.businessDate)),
  stringCell(textOrDash(item.paidAtLabelAr, item.paidAt)),
  stringCell(textOrDash(item.refundedAtLabelAr, item.refundedAt)),
  stringCell(textOrDash(item.providerPaymentId, item.providerInvoiceId)),
  stringCell(textOrDash(item.providerRefundId, item.refundId)),
  stringCell(formatBooleanAr(item.countedInTotals)),
  stringCell(formatBooleanAr(item.needsReview), item.needsReview ? "Warning" : "Text"),
  stringCell(item.reviewReasonsAr?.join("، ") ?? ""),
];

const bucketKey = (bucket: SubscriptionPaymentBucket) => {
  const record = bucket as SubscriptionPaymentBucket & Record<string, unknown>;
  return textOrDash(
    bucket.key,
    record.method,
    record.sourceChannel,
    record.paymentProvider,
    record.fulfillmentMethod,
    record.subscriptionStatus,
    record.paymentType
  );
};

const bucketRows = (
  title: string,
  rows: SubscriptionPaymentBucket[] | null | undefined
): ExcelRow[] => {
  if (!rows?.length) return [];
  return [
    [stringCell(title, "Section"), stringCell("التصنيف", "Header"), stringCell("العمليات", "Header"), stringCell("العملاء", "Header"), stringCell("الإجمالي (ر.س)", "Header")],
    ...rows.map((bucket) => [
      stringCell(title),
      stringCell(textOrDash(bucket.labelAr, bucketKey(bucket))),
      numberCell(bucket.count, "Integer"),
      numberCell(bucket.customersCount ?? bucket.uniqueCustomersCount, "Integer"),
      moneyCell(bucket.totalHalala),
    ]),
  ];
};

const buildClassificationRows = (report: SubscriptionPaymentReportData): ExcelRow[] => [
  [stringCell("المحور", "Header"), stringCell("التصنيف", "Header"), stringCell("العمليات", "Header"), stringCell("العملاء", "Header"), stringCell("الإجمالي (ر.س)", "Header")],
  ...bucketRows("طريقة الدفع", report.byPaymentMethod).slice(1),
  ...bucketRows("قناة المصدر", report.bySourceChannel).slice(1),
  ...bucketRows("مزود الدفع", report.byPaymentProvider).slice(1),
  ...bucketRows("طريقة التنفيذ", report.byFulfillmentMethod).slice(1),
  ...bucketRows("حالة الاشتراك", report.bySubscriptionStatus).slice(1),
  ...bucketRows("نوع الدفعة", report.byPaymentType).slice(1),
];

const buildWarningsRows = (report: SubscriptionPaymentReportData): ExcelRow[] => [
  [stringCell("الكود", "Header"), stringCell("التحذير", "Header"), stringCell("الخطورة", "Header")],
  ...(report.warnings?.length
    ? report.warnings.map((warning) => [
        stringCell(warning.code || "-"),
        stringCell(textOrDash(warning.messageAr, warning.message), "Warning"),
        stringCell(warning.severity || "warning", "Warning"),
      ])
    : [[stringCell("-"), stringCell("لا توجد تحذيرات من الخادم."), stringCell("normal")]]),
];

const buildDailyRows = (report: SubscriptionPaymentReportData): ExcelRow[] => {
  if (report.reportType !== "monthly") return [];
  return [
    [stringCell("اليوم", "Header"), stringCell("العمليات", "Header"), stringCell("إجمالي التحصيل (ر.س)", "Header"), stringCell("المرتجعات (ر.س)", "Header"), stringCell("الصافي (ر.س)", "Header"), stringCell("نقدي (ر.س)", "Header"), stringCell("بطاقات (ر.س)", "Header")],
    ...(report.dailyBreakdown ?? []).map((row) => [
      stringCell(textOrDash(row.businessDateLabelAr, row.businessDate)),
      numberCell(row.paymentsCount ?? row.totalPaymentsCount, "Integer"),
      moneyCell(row.grossCollectionHalala ?? row.totalHalala),
      moneyCell(row.refundsHalala),
      moneyCell(row.netCollectionHalala),
      moneyCell(row.cashTotalHalala),
      moneyCell(row.visaTotalHalala),
    ]),
  ];
};

export const buildSubscriptionPaymentsExcel = (
  report: SubscriptionPaymentReportData,
  visibleItems: SubscriptionPaymentReportItem[] = report.items ?? []
) => {
  const worksheets = [
    renderWorksheet("الملخص", buildSummaryRows(report), [190, 300]),
    renderWorksheet(
      "المدفوعات",
      [detailsHeaders.map((header) => stringCell(header, "Header")), ...visibleItems.map(itemToExcelRow)],
      [110, 115, 145, 130, 105, 130, 110, 110, 100, 120, 100, 90, 105, 90, 100, 115, 100, 120, 145, 145, 150, 130, 100, 100, 280]
    ),
    renderWorksheet("التصنيفات", buildClassificationRows(report), [130, 190, 80, 80, 110]),
    renderWorksheet("التحذيرات", buildWarningsRows(report), [140, 450, 100]),
    ...(report.reportType === "monthly"
      ? [renderWorksheet("الحركة اليومية", buildDailyRows(report), [160, 80, 120, 110, 110, 100, 110])]
      : []),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Basic Diet</Author>
  <Title>${xmlEscape(report.titleAr || "تقرير تحصيل الاشتراكات")}</Title>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
  <WindowHeight>12000</WindowHeight>
  <WindowWidth>22000</WindowWidth>
  <ProtectStructure>False</ProtectStructure>
  <ProtectWindows>False</ProtectWindows>
 </ExcelWorkbook>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Size="11"/></Style>
  <Style ss:ID="Text"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/></Borders></Style>
  <Style ss:ID="Title"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Size="16" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#17365D" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Header"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#2F75B5" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1F4E78"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/></Borders></Style>
  <Style ss:ID="Section"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Bold="1" ss:Color="#17365D"/><Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Label"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Bold="1"/><Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Value"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/></Borders></Style>
  <Style ss:ID="Money"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><NumberFormat ss:Format="#,##0.00 &quot;ر.س&quot;"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/></Borders></Style>
  <Style ss:ID="Number"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><NumberFormat ss:Format="0.00"/></Style>
  <Style ss:ID="Integer"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><NumberFormat ss:Format="0"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/></Borders></Style>
  <Style ss:ID="Warning"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Color="#9C0006"/><Interior ss:Color="#FFC7CE" ss:Pattern="Solid"/></Style>
 </Styles>
 ${worksheets.join("")}
</Workbook>`;
};

export const subscriptionPaymentsExcelFileName = (
  report: SubscriptionPaymentReportData
) => {
  const period = report.reportType === "monthly" ? report.businessMonth : report.businessDate;
  return `تقرير-تحصيل-الاشتراكات-${period || "الحالي"}.xls`;
};

export const downloadExcelFile = (contents: string, fileName: string) => {
  const blob = new Blob(["\ufeff", contents], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

// Compatibility aliases for any existing callers while the UI moves to Excel wording.
export const buildSubscriptionPaymentsCsv = buildSubscriptionPaymentsExcel;
export const subscriptionPaymentsCsvFileName = subscriptionPaymentsExcelFileName;
export const downloadTextFile = downloadExcelFile;
