import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  formatHalalaAsSar,
  getLocalizedLabel,
  getQuoteLineItemAmount,
  getQuotePricingTotalHalala,
  isTotalQuoteLineItem,
  isVatQuoteLineItem,
  resolveQuoteLineItems,
  resolveQuoteSections,
} from "@/utils/fetchSubscriptionCreation";
import type {
  DashboardQuoteLineItem,
  DashboardSelectionItem,
  DashboardSubscriptionQuoteResponse,
  DashboardSubscriptionSelectionPayload,
  SubscriptionCreationCustomerSummary,
} from "@/types/subscriptionCreationTypes";
import { AlertCircle, CheckCircle2, Loader2, ReceiptText } from "lucide-react";

type SubscriptionQuoteReviewProps = {
  quote: DashboardSubscriptionQuoteResponse;
  quotedSelection: DashboardSubscriptionSelectionPayload;
  stale: boolean;
  requoteRequired: boolean;
  quotePending: boolean;
  customerSummary: SubscriptionCreationCustomerSummary | null;
  cashConfirmed: boolean;
  createPending: boolean;
  createError: string | null;
  onCashConfirmedChange: (checked: boolean) => void;
  onCreate: () => void;
};

type ApiRecord = Record<string, unknown>;

const asRecord = (value: unknown): ApiRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as ApiRecord)
    : {};

const readString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : "";

const readDisplay = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  const record = asRecord(value);
  return (
    readString(record.label) ||
    readString(record.name) ||
    readString(record.title) ||
    readString(record.ar) ||
    readString(record.en)
  );
};

const lineAmount = (item: DashboardQuoteLineItem) =>
  getQuoteLineItemAmount(item);

const itemAmount = (item: DashboardSelectionItem) =>
  item.totalHalala ?? item.amountHalala ?? item.priceHalala;

function renderSelectionDetails(item: DashboardSelectionItem, currency: string) {
  const identity =
    getLocalizedLabel(item.name) ||
    readString(item.label) ||
    readString(item.premiumKey) ||
    readString(item.addonPlanId) ||
    readString(item.addonId) ||
    readString(item.key) ||
    readString(item.type) ||
    readString(item.kind) ||
    readDisplay(item.value) ||
    "تفاصيل";
  const selected = asRecord(item.selectedOptions);
  const details: string[] = [];

  if (selected.grams !== undefined) details.push(`${selected.grams} جرام`);
  if (selected.mealsPerDay !== undefined) details.push(`${selected.mealsPerDay} وجبة يومياً`);
  if (selected.daysCount !== undefined) details.push(`${selected.daysCount} يوم`);
  if (selected.startDate) details.push(String(selected.startDate));

  const qty = item.qty ?? item.quantity;
  if (qty !== undefined) details.push(`x${qty}`);
  if (item.quantityPerDay !== undefined) details.push(`${item.quantityPerDay} يومياً`);
  if (item.billingUnit) details.push(item.billingUnit);
  if (item.billingMode) details.push(item.billingMode);

  const unitLabel =
    readString(item.unitPriceLabel) ||
    readString(item.priceLabel) ||
    (item.unitExtraFeeHalala !== undefined
      ? formatHalalaAsSar(Number(item.unitExtraFeeHalala), currency)
      : item.unitPriceHalala !== undefined
        ? formatHalalaAsSar(Number(item.unitPriceHalala), currency)
        : item.unitPlanPriceHalala !== undefined
          ? formatHalalaAsSar(Number(item.unitPlanPriceHalala), currency)
          : "");
  const totalLabel =
    readString(item.totalLabel) ||
    (itemAmount(item) !== undefined
      ? formatHalalaAsSar(Number(itemAmount(item)), item.currency || currency)
      : "");

  return { identity, details, unitLabel, totalLabel };
}

export function SubscriptionQuoteReview({
  quote,
  quotedSelection,
  stale,
  requoteRequired,
  quotePending,
  customerSummary,
  cashConfirmed,
  createPending,
  createError,
  onCashConfirmedChange,
  onCreate,
}: SubscriptionQuoteReviewProps) {
  const total = getQuotePricingTotalHalala(quote);
  const currency =
    quote.data.pricing?.currency || quote.data.currency || quote.data.subscriptionPrice?.currency || "SAR";
  const sections = resolveQuoteSections(quote);
  const lineItems = resolveQuoteLineItems(quote);
  const ordinaryLineItems = lineItems.filter(
    (item) => !isVatQuoteLineItem(item) && !isTotalQuoteLineItem(item)
  );
  const vatLineItem = lineItems.find(isVatQuoteLineItem);
  const totalLineItem = lineItems.find(isTotalQuoteLineItem);
  const vatAmount =
    vatLineItem ? lineAmount(vatLineItem) : quote.data.pricing?.vatHalala;
  const plan = asRecord(quote.data.plan);
  const planName = readDisplay(plan.name) || readDisplay(quote.data.plan) || quotedSelection.planId;
  const customerLabel = customerSummary?.name || quotedSelection.userId;
  const createBlocked = stale || requoteRequired || quotePending;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ReceiptText className="size-5" />
          مراجعة السعر والدفع النقدي
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <SummaryItem
            label="العميل"
            value={customerLabel}
            hint={
              customerSummary?.phone
                ? customerSummary.phone
                : customerSummary?.name
                  ? quotedSelection.userId
                  : undefined
            }
          />
          <SummaryItem label="الباقة" value={planName} />
          <SummaryItem label="الجرامات" value={`${quotedSelection.grams}`} />
          <SummaryItem label="عدد الوجبات يومياً" value={`${quotedSelection.mealsPerDay}`} />
          <SummaryItem label="تاريخ البداية" value={quotedSelection.startDate} />
          <SummaryItem
            label="طريقة الاستلام"
            value={
              quotedSelection.delivery.type === "pickup"
                ? "استلام من الفرع"
                : "توصيل"
            }
          />
        </div>

        {sections.length ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {sections.map((section, index) => (
              <div key={`${section.key || section.code || index}`} className="rounded-lg border bg-card p-3">
                <p className="text-sm font-semibold">
                  {section.title || section.label || section.key || "تفاصيل الاختيار"}
                </p>
                <div className="mt-2 space-y-2">
                  {(section.items || []).length ? (
                    section.items?.map((item, itemIndex) => {
                      const rendered = renderSelectionDetails(item, currency);
                      return (
                        <div key={itemIndex} className="text-xs text-muted-foreground">
                          <div className="flex justify-between gap-3">
                            <span>{rendered.identity}</span>
                            <span>{rendered.details.join(" · ")}</span>
                          </div>
                          {rendered.unitLabel ? (
                            <div className="mt-1 text-left text-muted-foreground">
                              {rendered.unitLabel}
                            </div>
                          ) : null}
                          {rendered.totalLabel ? (
                            <div className="mt-1 text-left font-medium text-foreground">
                              {rendered.totalLabel}
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground">لا توجد عناصر</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">تفاصيل السعر من الخادم</p>
          <div className="space-y-2">
            {ordinaryLineItems.map((item, index) => (
              <div key={`${item.key || item.code || index}`} className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{item.label || item.key || "بند"}</span>
                <span className="font-medium">
                  {lineAmount(item) !== undefined
                    ? formatHalalaAsSar(Number(lineAmount(item)), item.currency || currency)
                    : ""}
                </span>
              </div>
            ))}
            {vatAmount !== undefined ? (
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">
                  {vatLineItem?.label ||
                    `ضريبة القيمة المضافة${
                      quote.data.pricing?.vatPercentage !== undefined
                        ? ` (${quote.data.pricing.vatPercentage}%)`
                        : ""
                    }`}
                </span>
                <span className="font-medium">
                  {formatHalalaAsSar(Number(vatAmount), vatLineItem?.currency || currency)}
                </span>
              </div>
            ) : null}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between gap-4 text-lg font-bold">
                <span>الإجمالي النهائي</span>
                <span>
                  {total.ok
                    ? formatHalalaAsSar(total.totalHalala, totalLineItem?.currency || currency)
                    : "غير صالح"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {!total.ok ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{total.message}</AlertDescription>
          </Alert>
        ) : null}

        {stale ? (
          <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-800">
            <AlertCircle className="size-4" />
            <AlertDescription>
              تم تعديل بيانات الاشتراك. راجع السعر مرة أخرى.
            </AlertDescription>
          </Alert>
        ) : null}

        {requoteRequired ? (
          <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-800">
            <AlertCircle className="size-4" />
            <AlertDescription>
              تغير إجمالي السعر في الخادم. راجع السعر مرة أخرى قبل إنشاء الاشتراك.
            </AlertDescription>
          </Alert>
        ) : null}

        {createError ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{createError}</AlertDescription>
          </Alert>
        ) : null}

        <label className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm">
          <Checkbox
            checked={cashConfirmed}
            disabled={createBlocked || createPending || !total.ok}
            onCheckedChange={(checked) => {
              if (!createBlocked) onCashConfirmedChange(checked === true);
            }}
          />
          <span>أؤكد أنه تم استلام المبلغ النقدي كاملاً</span>
        </label>

        <Button
          type="button"
          className="w-full gap-2 md:w-auto"
          disabled={!cashConfirmed || createBlocked || createPending || !total.ok}
          onClick={onCreate}
        >
          {createPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              جاري إنشاء الاشتراك...
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              تأكيد الدفع وإنشاء الاشتراك
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function SummaryItem({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
      {hint ? (
        <p className="mt-1 break-words text-xs text-muted-foreground" dir="ltr">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
