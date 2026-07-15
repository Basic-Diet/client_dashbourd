import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { parseApiError } from "@/lib/apiErrors";
import type { PremiumUpgradeConfigDto } from "@/types/premiumUpgradeTypes";
import { usePremiumUpgradeDetailQuery } from "@/hooks/usePremiumUpgradesQuery";
import {
  formatPremiumSar,
  premiumDetailHealthCode,
  premiumDetailHealthStatus,
  premiumDetailStatus,
  premiumDetailUpgradeDeltaHalala,
  premiumDetailUpgradeDeltaSar,
  premiumHealthLabel,
  premiumIssueMessage,
  premiumKindLabel,
  premiumRowKey,
  premiumRowKind,
  premiumRowName,
  premiumStatusLabel,
} from "@/utils/fetchPremiumUpgrades";

export function PremiumUpgradeDetailDrawer({
  row,
  onClose,
}: {
  row: PremiumUpgradeConfigDto | null;
  onClose: () => void;
}) {
  const detailQuery = usePremiumUpgradeDetailQuery(row?.id ?? null);
  const detail = detailQuery.data?.data && row
    ? { ...row, ...detailQuery.data.data }
    : row;

  return (
    <Drawer
      open={Boolean(row)}
      onOpenChange={(next) => !next && onClose()}
      direction="right"
    >
      <DrawerContent className="w-[min(92vw,44rem)] sm:max-w-none" dir="rtl">
        <DrawerHeader className="border-b text-right">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DrawerTitle>
                {detail ? premiumRowName(detail) : "تفاصيل الترقية"}
              </DrawerTitle>
              <DrawerDescription>
                {detail ? premiumRowKey(detail) : "جاري تحميل التفاصيل..."}
              </DrawerDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="إغلاق التفاصيل"
              title="إغلاق التفاصيل"
            >
              <X className="size-4" />
            </Button>
          </div>
        </DrawerHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {detailQuery.isLoading ? (
            <DetailSkeleton />
          ) : detailQuery.isError ? (
            <DetailError error={detailQuery.error} onRetry={() => detailQuery.refetch()} />
          ) : detail ? (
            <DetailContent compactRow={row} detail={detail} />
          ) : (
            <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
              لا توجد بيانات لهذا السجل.
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function DetailContent({
  compactRow,
  detail,
}: {
  compactRow: PremiumUpgradeConfigDto | null;
  detail: PremiumUpgradeConfigDto;
}) {
  const source = asRecord(detail.source);
  const pricing = asRecord(detail.pricing);
  const display = asRecord(detail.display);
  const behavior = asRecord(detail.behavior);
  const compatibility = asRecord(detail.compatibility);
  const healthStatus = premiumDetailHealthStatus(detail);
  const healthCode = premiumDetailHealthCode(detail);

  return (
    <>
      <DetailSection title="المصدر">
        <DetailItem label="الاسم" value={premiumRowName(detail)} />
        <DetailItem label="المفتاح" value={readString(source.key) || premiumRowKey(detail)} />
        <DetailItem label="النوع" value={premiumKindLabel(readString(source.type) === "menu_product" ? "product" : premiumRowKind(detail))} />
        <DetailItem label="معرف المصدر" value={readString(source.id) || detail.sourceId || "-"} />
        <DetailItem label="معرف المنتج" value={readString(source.productId) || "-"} />
        <DetailItem label="معرف المجموعة" value={readString(source.groupId) || "-"} />
        <DetailItem label="مفتاح المجموعة" value={readString(source.groupKey) || "-"} />
      </DetailSection>

      <DetailSection title="التسعير">
        <DetailItem label="فرق سعر الترقية" value={formatPremiumSar(premiumDetailUpgradeDeltaSar(detail))} />
        <DetailItem label="العملة" value={readString(pricing.currency) || detail.currency || "SAR"} />
        <DetailItem
          label="القيمة بالهللة"
          value={premiumDetailUpgradeDeltaHalala(detail)}
        />
      </DetailSection>

      <DetailSection title="العرض والحالة">
        <DetailItem label="الحالة" value={premiumStatusLabel(premiumDetailStatus(compactRow, detail))} />
        <DetailItem label="نشط" value={yesNo(display.enabled ?? detail.isEnabled)} />
        <DetailItem label="ظاهر للعميل" value={yesNo(display.visible ?? detail.isVisible)} />
        <DetailItem label="الترتيب" value={readNumber(display.sortOrder) ?? detail.sortOrder ?? 0} />
      </DetailSection>

      <DetailSection title="سلوك الترقية">
        <DetailItem label="تستهلك وجبة من الاشتراك" value={yesNo(behavior.consumesMealSlot ?? behavior.consumesExistingMealSlot)} />
      </DetailSection>

      <DetailSection title="صحة الربط">
        <DetailItem label="الصحة" value={premiumHealthLabel(healthStatus)} />
        <DetailItem label="التحذير" value={healthStatus === "broken" ? premiumIssueMessage(healthCode) : "-"} />
        <DetailItem label="رسالة الربط" value={readString(asRecord(detail.health).message) || "-"} />
      </DetailSection>

      <DetailSection title="التوافق">
        <DetailItem label="مفاتيح متوافقة" value={formatList(compatibility.compatibilityKeys)} />
        <DetailItem label="إعادة الربط متاحة" value={yesNo(detail.repair?.canRelink)} />
      </DetailSection>

      <DetailSection title="معلومات النسخة">
        <DetailItem label="رقم النسخة" value={detail.revision ?? "-"} />
      </DetailSection>

      <details className="rounded-lg border">
        <summary className="cursor-pointer bg-muted/20 px-3 py-2 text-sm font-semibold">
          تفاصيل تقنية
        </summary>
        <div className="grid gap-3 p-3 text-sm sm:grid-cols-2">
          <DetailItem label="id" value={detail.id} />
          <DetailItem label="revision" value={detail.revision ?? "-"} />
          <DetailItem label="health.code" value={healthCode || "-"} />
          <DetailItem label="source.id" value={readString(source.id) || detail.sourceId || "-"} />
          <DetailItem label="source.productId" value={readString(source.productId) || "-"} />
          <DetailItem label="source.groupId" value={readString(source.groupId) || "-"} />
        </div>
      </details>
    </>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border">
      <div className="border-b bg-muted/20 px-3 py-2 text-sm font-semibold">
        {title}
      </div>
      <div className="grid gap-3 p-3 text-sm sm:grid-cols-2">{children}</div>
    </section>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{formatValue(value)}</p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-lg border p-3">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="h-10 rounded bg-muted/60" />
            <div className="h-10 rounded bg-muted/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const parsed = parseApiError(error);
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p className="font-medium">{parsed.message}</p>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
        إعادة المحاولة
      </Button>
    </div>
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function yesNo(value: unknown) {
  if (value === undefined || value === null) return "-";
  return value ? "نعم" : "لا";
}

function formatValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return yesNo(value);
  return String(value);
}

function formatList(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return "-";
  return value.map((item) => String(item)).join("، ");
}
