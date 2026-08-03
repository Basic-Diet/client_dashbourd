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
  const receivedPosition = source.indexOf('label="استلم فعليًا"');
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
  assert.doesNotMatch(primaryGrid, /تم الخصم يدويًا/);
  assert.doesNotMatch(primaryGrid, /حسم أو مصادرة/);
});

test("customer remaining includes available and reserved meals", () => {
  const source = read(experiencePath);

  assert.match(source, /const remaining = available \+ reserved;/);
  assert.match(source, /متاح للاختيار/);
  assert.match(source, /محجوز لأيام قادمة/);
  assert.match(source, /كلا الرقمين ما زالا من حق العميل/);
});

test("administrative deductions are secondary and never called receipt", () => {
  const source = read(experiencePath);

  assert.match(source, /ما الذي خرج من الرصيد؟/);
  assert.match(source, /خصم يدوي/);
  assert.match(source, /حسم أو مصادرة/);
  assert.match(source, /لا يُحسب استلامًا فعليًا/);
  assert.match(source, /عرض المعلومات الإدارية والتفسير الفني/);
});

test("navigation uses simple user-centered labels", () => {
  const source = read(experiencePath);

  assert.match(source, />\s*الملخص\s*</);
  assert.match(source, />\s*الأيام\s*</);
  assert.match(source, /تفاصيل الرصيد/);
  assert.match(source, /الحساب ببساطة/);
});
