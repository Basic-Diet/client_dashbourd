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
  mergeAcross?: number;
};

type ExcelRow = {
  cells: ExcelCell[];
  height?: number;
};

type WorksheetConfig = {
  name: string;
  rows: ExcelRow[];
  widths: number[];
  frozenRows?: number;
  frozenColumns?: number;
  autoFilter?: boolean;
};

const xmlEscape = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const stringCell = (
  value: unknown,
  style = "Text",
  mergeAcross = 0
): ExcelCell => ({
  value: String(value ?? ""),
  type: "String",
  style,
  mergeAcross,
});

const numberCell = (
  value: unknown,
  style = "Integer",
  mergeAcross = 0
): ExcelCell => {
  const parsed = Number(value);
  return {
    value: Number.isFinite(parsed) ? parsed : 0,
    type: "Number",
    style,
    mergeAcross,
  };
};

const moneyCell = (
  halala: unknown,
  style = "Money",
  mergeAcross = 0
): ExcelCell => {
  const parsed = Number(halala);
  return numberCell(Number.isFinite(parsed) ? parsed / 100 : 0, style, mergeAcross);
};

const row = (cells: ExcelCell[], height = 26): ExcelRow => ({ cells, height });

const alternatingStyle = (base: "Text" | "Center" | "Money" | "Integer", alternate: boolean) =>
  alternate ? `${base}Alt` : base;

const renderCell = (cell: ExcelCell) => {
  const mergeAcross =
    cell.mergeAcross && cell.mergeAcross > 0
      ? ` ss:MergeAcross="${cell.mergeAcross}"`
      : "";
  return `<Cell ss:StyleID="${xmlEscape(cell.style ?? "Text")}"${mergeAcross}><Data ss:Type="${cell.type ?? "String"}">${xmlEscape(cell.value)}</Data></Cell>`;
};

const renderRow = (excelRow: ExcelRow) =>
  `<Row ss:AutoFitHeight="0" ss:Height="${excelRow.height ?? 26}">${excelRow.cells
    .map(renderCell)
    .join("")}</Row>`;

const renderWorksheet = ({
  name,
  rows,
  widths,
  frozenRows = 1,
  frozenColumns = 0,
  autoFilter = false,
}: WorksheetConfig) => {
  const columns = widths
    .map((width) => `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`)
    .join("");
  const freezeRows =
    frozenRows > 0
      ? `<SplitHorizontal>${frozenRows}</SplitHorizontal><TopRowBottomPane>${frozenRows}</TopRowBottomPane>`
      : "";
  const freezeColumns =
    frozenColumns > 0
      ? `<SplitVertical>${frozenColumns}</SplitVertical><LeftColumnRightPane>${frozenColumns}</LeftColumnRightPane>`
      : "";
  const autoFilterXml =
    autoFilter && rows.length > 1
      ? `<AutoFilter x:Range="R1C1:R${rows.length}C${widths.length}" xmlns="urn:schemas-microsoft-com:office:excel"/>`
      : "";

  return `
    <Worksheet ss:Name="${xmlEscape(name.slice(0, 31))}">
      <Table>${columns}${rows.map(renderRow).join("")}</Table>
      ${autoFilterXml}
      <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
        <DisplayRightToLeft/>
        <DoNotDisplayGridlines/>
        ${
          frozenRows > 0 || frozenColumns > 0
            ? `<FreezePanes/><FrozenNoSplit/>${freezeRows}${freezeColumns}<ActivePane>0</ActivePane>`
            : ""
        }
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

const summaryValueRow = (
  values: Array<{ value: unknown; kind: "money" | "integer" }>
): ExcelRow =>
  row(
    values.map(({ value, kind }) =>
      kind === "money"
        ? moneyCell(value, "SummaryMoney", 1)
        : numberCell(value, "SummaryNumber", 1)
    ),
    42
  );

const buildSummaryRows = (report: SubscriptionPaymentReportData): ExcelRow[] => {
  const summary = extendedSummary(report);
  const reportMeta = `الفترة: ${periodLabel(report)}  |  إنشاء التقرير: ${textOrDash(
    report.generatedAtLabelAr,
    report.generatedAt
  )}`;

  return [
    row([stringCell(report.titleAr || "تقرير تحصيل الاشتراكات", "Title", 7)], 52),
    row([stringCell(reportMeta, "Subtitle", 7)], 32),
    row([stringCell("", "Spacer", 7)], 10),
    row(
      [
        stringCell("إجمالي التحصيل", "KpiLabel", 1),
        stringCell("المرتجعات", "KpiLabel", 1),
        stringCell("صافي الحركة", "KpiLabel", 1),
        stringCell("عدد العملاء", "KpiLabel", 1),
      ],
      28
    ),
    summaryValueRow([
      { value: summary.grossCollectionHalala ?? summary.totalHalala, kind: "money" },
      { value: summary.refundsHalala, kind: "money" },
      { value: summary.netCollectionHalala, kind: "money" },
      { value: summary.uniqueCustomersCount, kind: "integer" },
    ]),
    row([stringCell("", "Spacer", 7)], 10),
    row(
      [
        stringCell("التحصيل النقدي", "KpiLabelLight", 1),
        stringCell("تحصيل البطاقات", "KpiLabelLight", 1),
        stringCell("منها عبر ميسر", "KpiLabelLight", 1),
        stringCell("حركات تحتاج مراجعة", "KpiLabelLight", 1),
      ],
      28
    ),
    summaryValueRow([
      { value: summary.cashTotalHalala, kind: "money" },
      {
        value: summary.cardTotalHalala ?? summary.visaTotalHalala,
        kind: "money",
      },
      { value: summary.moyasarTotalHalala, kind: "money" },
      { value: summary.reviewItemsCount, kind: "integer" },
    ]),
    row([stringCell("", "Spacer", 7)], 10),
    row([stringCell("تفاصيل التسوية والضريبة", "SectionTitle", 7)], 30),
    row(
      [
        stringCell("الصافي قبل الضريبة", "DetailLabel", 2),
        moneyCell(summary.netBeforeVatHalala, "DetailMoney", 4),
      ],
      28
    ),
    row(
      [
        stringCell("صافي الضريبة", "DetailLabel", 2),
        moneyCell(summary.netVatHalala, "DetailMoney", 4),
      ],
      28
    ),
    row(
      [
        stringCell("مبالغ غير مصنفة", "DetailLabel", 2),
        moneyCell(summary.unknownTotalHalala, "DetailMoney", 4),
      ],
      28
    ),
    row(
      [
        stringCell("حالة التسوية", "DetailLabel", 2),
        stringCell(
          textOrDash(report.reconciliation?.statusLabelAr, report.reconciliation?.status),
          report.reconciliation?.status === "balanced" ? "Success" : "Warning",
          4
        ),
      ],
      28
    ),
    row(
      [
        stringCell("فرق التسوية", "DetailLabel", 2),
        moneyCell(report.reconciliation?.differenceHalala, "DetailMoney", 4),
      ],
      28
    ),
    row(
      [
        stringCell("ملاحظة", "DetailLabel", 2),
        stringCell(report.reconciliation?.noteAr || "-", "DetailText", 4),
      ],
      44
    ),
  ];
};

const compactHeaders = [
  "تاريخ العمل",
  "مرجع الدفعة",
  "اسم العميل",
  "رقم الهاتف",
  "الخطة",
  "طريقة الدفع",
  "المصدر",
  "مزود الدفع",
  "الإجمالي",
  "الضريبة",
  "صافي الحركة",
  "التنفيذ",
  "الحالة",
  "مراجعة",
] as const;

const shortPaymentReference = (item: SubscriptionPaymentReportItem) => {
  const reference = textOrDash(item.paymentReference, item.paymentId);
  return reference.length <= 18 ? reference : `…${reference.slice(-15)}`;
};

const buildCompactPaymentRows = (
  items: SubscriptionPaymentReportItem[]
): ExcelRow[] => [
  row(compactHeaders.map((header) => stringCell(header, "Header")), 38),
  ...items.map((item, index) => {
    const alternate = index % 2 === 1;
    const textStyle = alternatingStyle("Text", alternate);
    const centerStyle = alternatingStyle("Center", alternate);
    const moneyStyle = alternatingStyle("Money", alternate);
    const reviewStyle = item.needsReview ? "Warning" : centerStyle;
    return row(
      [
        stringCell(textOrDash(item.businessDateLabelAr, item.businessDate), textStyle),
        stringCell(shortPaymentReference(item), centerStyle),
        stringCell(textOrDash(item.customerName), textStyle),
        stringCell(`‎${textOrDash(item.customerPhone)}`, centerStyle),
        stringCell(textOrDash(item.planNameAr), textStyle),
        stringCell(paymentMethodLabel(item.paymentMethod, item.paymentMethodLabelAr), textStyle),
        stringCell(sourceChannelLabel(item.sourceChannel, item.sourceChannelLabelAr), centerStyle),
        stringCell(
          paymentProviderLabel(
            item.paymentProvider ?? item.provider,
            item.paymentProviderLabelAr ?? item.providerLabelAr
          ),
          textStyle
        ),
        moneyCell(item.amountHalala, moneyStyle),
        moneyCell(item.vatHalala, moneyStyle),
        moneyCell(item.netMovementHalala, moneyStyle),
        stringCell(
          fulfillmentMethodLabel(item.fulfillmentMethod, item.fulfillmentMethodLabelAr),
          textStyle
        ),
        stringCell(textOrDash(item.statusLabelAr, item.status), centerStyle),
        stringCell(formatBooleanAr(item.needsReview), reviewStyle),
      ],
      30
    );
  }),
];

const technicalHeaders = [
  "مرجع الدفعة الكامل",
  "رقم الاشتراك",
  "نوع الحركة",
  "نوع الدفعة",
  "الإجمالي",
  "الصافي قبل الضريبة",
  "الضريبة",
  "صافي الحركة",
  "تاريخ الدفع",
  "تاريخ الاسترداد",
  "رقم ميسر/المزود",
  "رقم المرتجع",
  "حالة الاشتراك",
  "محتسب في الإجماليات",
  "أسباب المراجعة",
] as const;

const buildTechnicalPaymentRows = (
  items: SubscriptionPaymentReportItem[]
): ExcelRow[] => [
  row(technicalHeaders.map((header) => stringCell(header, "Header")), 38),
  ...items.map((item, index) => {
    const alternate = index % 2 === 1;
    const textStyle = alternatingStyle("Text", alternate);
    const centerStyle = alternatingStyle("Center", alternate);
    const moneyStyle = alternatingStyle("Money", alternate);
    const reviewReasons = item.reviewReasonsAr?.join("، ") ?? "";
    return row(
      [
        stringCell(textOrDash(item.paymentReference, item.paymentId), textStyle),
        stringCell(textOrDash(item.subscriptionId), textStyle),
        stringCell(textOrDash(item.movementTypeLabelAr, item.movementType), centerStyle),
        stringCell(textOrDash(item.paymentTypeLabelAr, item.paymentType), textStyle),
        moneyCell(item.amountHalala, moneyStyle),
        moneyCell(item.netBeforeVatHalala, moneyStyle),
        moneyCell(item.vatHalala, moneyStyle),
        moneyCell(item.netMovementHalala, moneyStyle),
        stringCell(textOrDash(item.paidAtLabelAr, item.paidAt), textStyle),
        stringCell(textOrDash(item.refundedAtLabelAr, item.refundedAt), textStyle),
        stringCell(textOrDash(item.providerPaymentId, item.providerInvoiceId), textStyle),
        stringCell(textOrDash(item.providerRefundId, item.refundId), textStyle),
        stringCell(
          textOrDash(item.subscriptionStatusLabelAr, item.subscriptionStatus),
          centerStyle
        ),
        stringCell(formatBooleanAr(item.countedInTotals), centerStyle),
        stringCell(reviewReasons || "-", item.needsReview ? "Warning" : textStyle),
      ],
      reviewReasons.length > 45 ? 46 : 30
    );
  }),
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
  rows: SubscriptionPaymentBucket[] | null | undefined,
  startIndex: number
): ExcelRow[] => {
  if (!rows?.length) return [];
  return rows.map((bucket, index) => {
    const alternate = (startIndex + index) % 2 === 1;
    return row(
      [
        stringCell(title, alternatingStyle("Text", alternate)),
        stringCell(
          textOrDash(bucket.labelAr, bucketKey(bucket)),
          alternatingStyle("Text", alternate)
        ),
        numberCell(bucket.count, alternatingStyle("Integer", alternate)),
        numberCell(
          bucket.customersCount ?? bucket.uniqueCustomersCount,
          alternatingStyle("Integer", alternate)
        ),
        moneyCell(bucket.totalHalala, alternatingStyle("Money", alternate)),
      ],
      28
    );
  });
};

const buildClassificationRows = (report: SubscriptionPaymentReportData): ExcelRow[] => {
  const sections = [
    ["طريقة الدفع", report.byPaymentMethod],
    ["قناة المصدر", report.bySourceChannel],
    ["مزود الدفع", report.byPaymentProvider],
    ["طريقة التنفيذ", report.byFulfillmentMethod],
    ["حالة الاشتراك", report.bySubscriptionStatus],
    ["نوع الدفعة", report.byPaymentType],
  ] as const;

  const output: ExcelRow[] = [
    row(
      ["المحور", "التصنيف", "العمليات", "العملاء", "الإجمالي (ر.س)"].map((header) =>
        stringCell(header, "Header")
      ),
      36
    ),
  ];
  let rowIndex = 0;
  for (const [title, buckets] of sections) {
    const rows = bucketRows(title, buckets, rowIndex);
    output.push(...rows);
    rowIndex += rows.length;
  }
  return output;
};

const buildWarningsRows = (report: SubscriptionPaymentReportData): ExcelRow[] => {
  const header = row(
    ["الكود", "التحذير", "الخطورة"].map((value) => stringCell(value, "Header")),
    36
  );
  if (!report.warnings?.length) {
    return [
      header,
      row(
        [
          stringCell("-", "Success"),
          stringCell("لا توجد تحذيرات من الخادم.", "Success"),
          stringCell("طبيعي", "Success"),
        ],
        36
      ),
    ];
  }
  return [
    header,
    ...report.warnings.map((warning) =>
      row(
        [
          stringCell(warning.code || "-", "Warning"),
          stringCell(textOrDash(warning.messageAr, warning.message), "Warning"),
          stringCell(warning.severity || "warning", "Warning"),
        ],
        46
      )
    ),
  ];
};

const buildDailyRows = (report: SubscriptionPaymentReportData): ExcelRow[] => {
  if (report.reportType !== "monthly") return [];
  return [
    row(
      [
        "اليوم",
        "العمليات",
        "إجمالي التحصيل (ر.س)",
        "المرتجعات (ر.س)",
        "الصافي (ر.س)",
        "نقدي (ر.س)",
        "بطاقات (ر.س)",
      ].map((header) => stringCell(header, "Header")),
      38
    ),
    ...(report.dailyBreakdown ?? []).map((daily, index) => {
      const alternate = index % 2 === 1;
      return row(
        [
          stringCell(
            textOrDash(daily.businessDateLabelAr, daily.businessDate),
            alternatingStyle("Text", alternate)
          ),
          numberCell(
            daily.paymentsCount ?? daily.totalPaymentsCount,
            alternatingStyle("Integer", alternate)
          ),
          moneyCell(
            daily.grossCollectionHalala ?? daily.totalHalala,
            alternatingStyle("Money", alternate)
          ),
          moneyCell(daily.refundsHalala, alternatingStyle("Money", alternate)),
          moneyCell(daily.netCollectionHalala, alternatingStyle("Money", alternate)),
          moneyCell(daily.cashTotalHalala, alternatingStyle("Money", alternate)),
          moneyCell(daily.visaTotalHalala, alternatingStyle("Money", alternate)),
        ],
        28
      );
    }),
  ];
};

export const buildSubscriptionPaymentsExcel = (
  report: SubscriptionPaymentReportData,
  visibleItems: SubscriptionPaymentReportItem[] = report.items ?? []
) => {
  const worksheets: WorksheetConfig[] = [
    {
      name: "الملخص",
      rows: buildSummaryRows(report),
      widths: [92, 92, 92, 92, 92, 92, 92, 92],
      frozenRows: 2,
    },
    {
      name: "المدفوعات",
      rows: buildCompactPaymentRows(visibleItems),
      widths: [120, 105, 125, 100, 170, 120, 95, 135, 85, 80, 85, 110, 85, 85],
      frozenRows: 1,
      frozenColumns: 4,
      autoFilter: true,
    },
    {
      name: "تفاصيل الدفع",
      rows: buildTechnicalPaymentRows(visibleItems),
      widths: [145, 170, 95, 115, 85, 100, 80, 95, 145, 145, 165, 135, 105, 100, 260],
      frozenRows: 1,
      frozenColumns: 2,
      autoFilter: true,
    },
    {
      name: "التصنيفات",
      rows: buildClassificationRows(report),
      widths: [125, 190, 85, 85, 115],
      frozenRows: 1,
      autoFilter: true,
    },
    {
      name: "التحذيرات",
      rows: buildWarningsRows(report),
      widths: [145, 420, 110],
      frozenRows: 1,
    },
  ];

  if (report.reportType === "monthly" && (report.dailyBreakdown ?? []).length > 0) {
    worksheets.push({
      name: "الحركة اليومية",
      rows: buildDailyRows(report),
      widths: [170, 85, 125, 115, 115, 100, 110],
      frozenRows: 1,
      autoFilter: true,
    });
  }

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
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Size="10"/></Style>
  <Style ss:ID="Spacer"><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Title"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Size="17" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#17365D" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Subtitle"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#17365D"/><Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/></Style>
  <Style ss:ID="KpiLabel"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#2F75B5" ss:Pattern="Solid"/></Style>
  <Style ss:ID="KpiLabelLight"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#17365D"/><Interior ss:Color="#EEF5FB" ss:Pattern="Solid"/></Style>
  <Style ss:ID="SummaryMoney"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="15" ss:Bold="1" ss:Color="#17365D"/><NumberFormat ss:Format="#,##0.00 &quot;ر.س&quot;"/></Style>
  <Style ss:ID="SummaryNumber"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="15" ss:Bold="1" ss:Color="#17365D"/><NumberFormat ss:Format="0"/></Style>
  <Style ss:ID="SectionTitle"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#17365D" ss:Pattern="Solid"/></Style>
  <Style ss:ID="DetailLabel"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Bold="1" ss:Color="#17365D"/><Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/></Style>
  <Style ss:ID="DetailText"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Color="#1F2937"/></Style>
  <Style ss:ID="DetailMoney"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Color="#1F2937"/><NumberFormat ss:Format="#,##0.00 &quot;ر.س&quot;"/></Style>
  <Style ss:ID="Header"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#17365D" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#8EA9C1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#8EA9C1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#8EA9C1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#8EA9C1"/></Borders></Style>
  <Style ss:ID="Text"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/></Borders></Style>
  <Style ss:ID="TextAlt"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/><Interior ss:Color="#EEF5FB" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/></Borders></Style>
  <Style ss:ID="Center"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/></Borders></Style>
  <Style ss:ID="CenterAlt"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/><Interior ss:Color="#EEF5FB" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/></Borders></Style>
  <Style ss:ID="Money"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><NumberFormat ss:Format="#,##0.00 &quot;ر.س&quot;"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/></Borders></Style>
  <Style ss:ID="MoneyAlt"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Interior ss:Color="#EEF5FB" ss:Pattern="Solid"/><NumberFormat ss:Format="#,##0.00 &quot;ر.س&quot;"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/></Borders></Style>
  <Style ss:ID="Integer"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><NumberFormat ss:Format="0"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/></Borders></Style>
  <Style ss:ID="IntegerAlt"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Interior ss:Color="#EEF5FB" ss:Pattern="Solid"/><NumberFormat ss:Format="0"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/></Borders></Style>
  <Style ss:ID="Warning"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Color="#9C0006" ss:Bold="1"/><Interior ss:Color="#FFC7CE" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F4B084"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F4B084"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F4B084"/></Borders></Style>
  <Style ss:ID="Success"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1" ss:ReadingOrder="RightToLeft"/><Font ss:FontName="Arial" ss:Color="#375623" ss:Bold="1"/><Interior ss:Color="#E2F0D9" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A9D18E"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A9D18E"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A9D18E"/></Borders></Style>
 </Styles>
 ${worksheets.map(renderWorksheet).join("")}
</Workbook>`;
};

export const subscriptionPaymentsExcelFileName = (
  report: SubscriptionPaymentReportData
) => {
  const period = report.reportType === "monthly" ? report.businessMonth : report.businessDate;
  return `تقرير-تحصيل-الاشتراكات-${period || "الحالي"}.xls`;
};

export const downloadExcelFile = (contents: string, fileName: string) => {
  const blob = new Blob(["﻿", contents], {
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

// Compatibility aliases for existing callers.
export const buildSubscriptionPaymentsCsv = buildSubscriptionPaymentsExcel;
export const subscriptionPaymentsCsvFileName = subscriptionPaymentsExcelFileName;
export const downloadTextFile = downloadExcelFile;
