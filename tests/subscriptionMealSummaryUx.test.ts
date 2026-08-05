import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const experiencePath =
  "src/components/pages/subscriptions/SubscriptionTrackingExperienceV7.tsx";

test("quick view uses the simplified V7 experience", () => {
  const source = read(
    "src/components/pages/subscriptions/SubscriptionQuickViewDialog.tsx"
  );

  assert.match(source, /SubscriptionTrackingExperienceV7/);
  assert.doesNotMatch(source, /SubscriptionTrackingExperienceV6/);
});

test("the first view prioritizes total, received and customer remaining", () => {
  const source = read(experiencePath);

  const totalPosition = source.indexOf('label="إجمالي الوجبات"');
  const receivedPosition = source.indexOf('label="المستلم"');
  const remainingPosition = source.indexOf('label="المتبقي للعميل"');

  assert.ok(totalPosition >= 0, "total meals card is missing");
  assert.ok(receivedPosition > totalPosition, "received card must follow total");
  assert.ok(
    remainingPosition > receivedPosition,
    "customer remaining card must follow received"
  );

  const primaryGrid = source.slice(
    source.indexOf('<div className="grid gap-3 lg:grid-cols-3">'),
    source.indexOf("<Tabs value={tab}")
  );
  assert.equal(
    (primaryGrid.match(/<PrimaryMetric/g) || []).length,
    3,
    "the primary summary must contain exactly three cards"
  );
  assert.doesNotMatch(primaryGrid, /حسم أو مصادرة/);
});

test("customer remaining includes available and reserved meals", () => {
  const source = read(experiencePath);

  assert.match(source, /const remaining = available \+ reserved;/);
  assert.match(source, /متاح للاختيار/);
  assert.match(source, /محجوز لأيام قادمة/);
  assert.match(source, /كلا الرقمين ما زالا من حق العميل/);
});

test("manual deductions are included in received and remain auditable", () => {
  const source = read(experiencePath);

  assert.match(source, /const systemReceived = safeCount\(summary\?\.receivedMeals\);/);
  assert.match(
    source,
    /const received = Math\.min\(total, systemReceived \+ manualDeducted\);/
  );
  assert.match(source, /خصم يدوي محسوب كمستلم/);
  assert.match(source, /محسوب ضمن المستلم/);
  assert.match(source, /استلام مثبت/);
  assert.match(source, /خصم يدوي ضمن المستلم/);
  assert.doesNotMatch(source, /لا يُحسب استلامًا فعليًا/);
});

test("other deductions stay separate from the received total", () => {
  const source = read(experiencePath);

  assert.match(
    source,
    /const operationalDeducted = Math\.max\(0, consumed - systemReceived - manualDeducted\);/
  );
  assert.match(source, /const otherDeductions = operationalDeducted \+ forfeited;/);
  assert.match(source, /حسم أو مصادرة/);
  assert.match(source, /حسم تشغيلي/);
  assert.match(source, /مصادَر/);
});

test("navigation uses simple user-centered labels", () => {
  const source = read(experiencePath);

  assert.match(source, />\s*الملخص\s*</);
  assert.match(source, />\s*الأيام\s*</);
  assert.match(source, /تفاصيل الرصيد/);
  assert.match(source, /الحساب ببساطة/);
});
