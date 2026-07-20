import { chromium } from "playwright";
import fs from "node:fs/promises";

const FRONTEND = process.env.FRONTEND_URL || "http://127.0.0.1:5173";
const BACKEND = process.env.BACKEND_URL || "https://basicdiet145.onrender.com";
const EMAIL = process.env.QA_EMAIL;
const PASSWORD = process.env.QA_PASSWORD;
if (!EMAIL || !PASSWORD) throw new Error("QA credentials are required");

await fs.mkdir(".qa-artifacts", { recursive: true });
const runId = Date.now();
const key = `qa_authoritative_${runId}`;
const title = `اختبار مجموعات ${runId}`;
const report = {
  runId,
  checks: [],
  api: [],
  consoleErrors: [],
  pageErrors: [],
  failedResponses: [],
  publishRequests: 0,
  cleanup: null,
};
const ok = (name, extra = {}) => {
  report.checks.push({ name, ok: true, ...extra });
  console.log(`✓ ${name}`);
};
const idOf = (item) => String(item?.optionId || item?.id || item?._id || "");
const nameOf = (item) => String(item?.name?.ar || item?.label || item?.name?.en || item?.key || idOf(item));

async function request(token, method, endpoint, body) {
  const response = await fetch(`${BACKEND}${endpoint}`, {
    method,
    headers: {
      Accept: "application/json",
      "Accept-Language": "ar",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
}

async function loginApi() {
  const { response, payload } = await request("", "POST", "/api/dashboard/auth/login", {
    email: EMAIL,
    password: PASSWORD,
  });
  const token = payload?.token || payload?.data?.token;
  if (!response.ok || !token) throw new Error(`API login failed: ${response.status}`);
  return token;
}

async function sections(token) {
  const { response, payload } = await request(token, "GET", "/api/dashboard/meal-builder?lang=ar");
  if (!response.ok) throw new Error(`Builder state failed: ${response.status}`);
  return payload?.data?.draft?.sections || [];
}

async function picker(token, group, familyKey, targetSectionKey) {
  const params = new URLSearchParams({
    productContextId: String(group.productContextId),
    sourceGroupId: String(group.sourceGroupId),
    optionRole: String(group.optionRole),
    includeUnavailable: "true",
    unassignedOnly: "true",
    page: "1",
    limit: "1000",
    lang: "ar",
  });
  if (familyKey) params.set("familyKey", familyKey);
  if (targetSectionKey) params.set("targetSectionKey", targetSectionKey);
  const { response, payload } = await request(
    token,
    "GET",
    `/api/dashboard/meal-builder/pickers/options?${params}`
  );
  if (!response.ok || payload?.data?.contractVersion !== "dashboard_meal_builder_picker.v2") {
    throw new Error(`Option picker contract failed: ${response.status}`);
  }
  return payload.data;
}

async function target(token) {
  const { response, payload } = await request(
    token,
    "GET",
    "/api/dashboard/meal-builder/catalog?lang=ar"
  );
  const catalog = payload?.data;
  const groups = catalog?.builderGroups || catalog?.authoring?.builderGroups;
  if (
    !response.ok ||
    catalog?.authoringContractVersion !== "dashboard_meal_builder_authoring.v1" ||
    catalog?.authoring?.complete !== true ||
    !Array.isArray(groups)
  ) throw new Error("Authoritative authoring catalog is invalid");

  for (const group of groups) {
    if (group?.eligible !== true || !["protein", "carbs"].includes(group.optionRole)) continue;
    const families = group.optionRole === "protein" && group.families?.length ? group.families : [""];
    for (const family of families) {
      const data = await picker(token, group, family || undefined);
      const choices = (data.candidates || []).filter(
        (item) => idOf(item) && item.assignable === true && item.isPremium !== true
      );
      if (choices.length >= 2) return { catalog, group, family: family || "", choices };
    }
  }
  throw new Error("No eligible builderGroup with two assignable Options");
}

function card(page) {
  return page.locator("article").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}
function dialog(page, heading) {
  return page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: heading, exact: true }) });
}
async function choose(container, text) {
  const button = container.getByRole("button").filter({ hasText: text }).first();
  await button.waitFor({ timeout: 45000 });
  if (await button.isDisabled()) throw new Error(`Candidate disabled: ${text}`);
  await button.click();
}
async function chooseGroup(container, group) {
  const button = container
    .getByRole("button")
    .filter({ hasText: nameOf(group.product) })
    .filter({ hasText: nameOf(group.group) })
    .first();
  await button.waitFor({ timeout: 45000 });
  if (await button.isDisabled()) throw new Error("Eligible builderGroup is disabled");
  await button.click();
}
async function chooseFamily(page, container, family) {
  if (!family) return;
  await container.getByRole("combobox", { name: "عائلة البروتين" }).click();
  const options = page.getByRole("option");
  for (let i = 0; i < await options.count(); i += 1) {
    const option = options.nth(i);
    if ((await option.textContent())?.toLowerCase().includes(family.toLowerCase())) {
      await option.click();
      return;
    }
  }
  throw new Error(`Family not rendered: ${family}`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "ar-EG" });
await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await context.newPage();
page.on("console", (message) => message.type() === "error" && report.consoleErrors.push(message.text()));
page.on("pageerror", (error) => report.pageErrors.push(error.message));
page.on("request", (req) => {
  if (req.method() === "POST" && new URL(req.url()).pathname.endsWith("/meal-builder/publish")) report.publishRequests++;
});
page.on("response", (res) => {
  if (new URL(res.url()).pathname.includes("/api/dashboard/meal-builder") && res.status() >= 400) {
    report.failedResponses.push({ method: res.request().method(), status: res.status(), url: res.url() });
  }
});

let token = "";
let failure = null;
try {
  token = await loginApi();
  const selected = await target(token);
  const [first, second] = selected.choices;
  ok("Loaded complete authoritative builderGroups catalog", {
    groupId: selected.group.id,
    productContextId: selected.group.productContextId,
    sourceGroupId: selected.group.sourceGroupId,
    optionRole: selected.group.optionRole,
    family: selected.family || null,
  });

  await page.goto(FRONTEND, { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await page.waitForFunction(() => document.cookie.includes("dashboardToken="), null, { timeout: 30000 });
  await page.goto(`${FRONTEND}/menu?tab=meal-builder`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "منشئ وجبات الاشتراك" }).waitFor({ timeout: 45000 });
  ok("Authenticated through the real Dashboard UI");

  await page.getByRole("button", { name: "إضافة كارت" }).click();
  let create = dialog(page, "إضافة كارت جديد");
  await create.getByRole("button", { name: /خيارات وجبة مركبة/ }).click();
  await chooseGroup(create, selected.group);
  await chooseFamily(page, create, selected.family);
  await choose(create, nameOf(first));
  await create.getByPlaceholder("مثال: وجبات جاهزة").fill(title);
  await create.getByPlaceholder("Example: Ready Meals").fill(`Authoritative ${runId}`);
  await create.getByPlaceholder("ready_meals").fill(key);

  const createResponse = page.waitForResponse(
    (res) => res.request().method() === "POST" && new URL(res.url()).pathname.endsWith("/meal-builder/sections"),
    { timeout: 45000 }
  );
  await create.getByRole("button", { name: "إنشاء الكارت" }).click();
  const created = await createResponse;
  const createdBody = await created.json().catch(() => null);
  report.api.push({ operation: "create", status: created.status(), contract: createdBody?.data?.contractVersion });
  if (!created.ok()) throw new Error(`Create failed: ${created.status()}`);
  await page.getByRole("heading", { name: title, exact: true }).waitFor({ timeout: 45000 });

  let stored = (await sections(token)).find((item) => item.key === key);
  if (
    !stored ||
    String(stored.productContextId) !== String(selected.group.productContextId) ||
    String(stored.sourceGroupId) !== String(selected.group.sourceGroupId) ||
    stored.selectionType !== "standard_meal" ||
    !stored.selectedOptionIds?.includes(idOf(first))
  ) throw new Error("Stored option card does not match authoritative group payload");
  ok("Created option_family from Product + Group + nested Option");

  await card(page).getByRole("button", { name: "إدارة العناصر" }).click();
  let items = page.getByRole("dialog").filter({ hasText: /إدارة عناصر/ });
  await choose(items, nameOf(second));
  const addResponse = page.waitForResponse(
    (res) => res.request().method() === "POST" && new URL(res.url()).pathname.endsWith(`/sections/${encodeURIComponent(key)}/options`),
    { timeout: 45000 }
  );
  await items.getByRole("button", { name: "حفظ العناصر" }).click();
  const added = await addResponse;
  if (!added.ok()) throw new Error(`Incremental add failed: ${added.status()}`);
  stored = (await sections(token)).find((item) => item.key === key);
  if (!stored?.selectedOptionIds?.includes(idOf(second))) throw new Error("Added Option missing from draft");
  ok("Incremental POST /options works and draft is Backend-authoritative");

  await card(page).getByRole("button", { name: "إدارة العناصر" }).click();
  items = page.getByRole("dialog").filter({ hasText: /إدارة عناصر/ });
  await choose(items, nameOf(second));
  const removeResponse = page.waitForResponse(
    (res) => res.request().method() === "DELETE" && new URL(res.url()).pathname.endsWith(`/sections/${encodeURIComponent(key)}/options/${encodeURIComponent(idOf(second))}`),
    { timeout: 45000 }
  );
  await items.getByRole("button", { name: "حفظ العناصر" }).click();
  const removed = await removeResponse;
  if (!removed.ok()) throw new Error(`Incremental remove failed: ${removed.status()}`);
  stored = (await sections(token)).find((item) => item.key === key);
  if (stored?.selectedOptionIds?.includes(idOf(second))) throw new Error("Removed Option still in draft");
  ok("Incremental DELETE /options/:optionId works");

  await page.getByRole("button", { name: "إضافة كارت" }).click();
  const duplicate = dialog(page, "إضافة كارت جديد");
  await duplicate.getByRole("button", { name: /خيارات وجبة مركبة/ }).click();
  await chooseGroup(duplicate, selected.group);
  await chooseFamily(page, duplicate, selected.family);
  const alreadyUsed = duplicate.getByRole("button").filter({ hasText: nameOf(first) }).first();
  await alreadyUsed.waitFor({ timeout: 45000 });
  if (!(await alreadyUsed.isDisabled())) throw new Error("Assigned Option remained selectable in another card");
  await page.keyboard.press("Escape");
  ok("Cross-card uniqueness is reflected by the explicit picker");

  const validationResponse = page.waitForResponse(
    (res) => res.request().method() === "POST" && new URL(res.url()).pathname.endsWith("/meal-builder/validate"),
    { timeout: 45000 }
  );
  await page.getByRole("button", { name: "مراجعة ونشر" }).click();
  const validation = await validationResponse;
  if (!validation.ok()) throw new Error(`Validation failed: ${validation.status()}`);
  await page.locator('[role="dialog"], [role="alertdialog"]').filter({
    hasText: /نتيجة مراجعة الـBackend|نشر تغييرات منشئ الوجبات/,
  }).first().waitFor({ timeout: 45000 });
  await page.keyboard.press("Escape");
  if (report.publishRequests) throw new Error("Publish endpoint was unexpectedly called");
  ok("Validation is Backend-authoritative and Publish was not executed");

  await card(page).getByRole("button", { name: "حذف الكارت" }).click();
  const confirm = page.getByRole("alertdialog").filter({ hasText: title });
  const deleteResponse = page.waitForResponse(
    (res) => res.request().method() === "DELETE" && new URL(res.url()).pathname.endsWith(`/meal-builder/sections/${encodeURIComponent(key)}`),
    { timeout: 45000 }
  );
  await confirm.getByRole("button", { name: "حذف الكارت" }).click();
  const deleted = await deleteResponse;
  if (!deleted.ok()) throw new Error(`Delete failed: ${deleted.status()}`);
  if ((await sections(token)).some((item) => item.key === key)) throw new Error("Deleted card remained in draft");
  const released = (await picker(token, selected.group, selected.family || undefined)).candidates.find(
    (item) => idOf(item) === idOf(first)
  );
  if (!released || released.assignable !== true) throw new Error("Deleted card did not release its Option");
  ok("Delete releases Options back to the picker");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${FRONTEND}/menu?tab=meal-builder`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "منشئ وجبات الاشتراك" }).waitFor({ timeout: 45000 });
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  if (width.scroll > width.client + 2) throw new Error(`Mobile overflow: ${width.scroll} > ${width.client}`);
  ok("Mobile workspace has no horizontal overflow", width);

  const consoleErrors = report.consoleErrors.filter((message) => !message.includes("favicon"));
  if (consoleErrors.length || report.pageErrors.length || report.failedResponses.length) {
    throw new Error(`Runtime errors: ${JSON.stringify({ consoleErrors, pageErrors: report.pageErrors, failedResponses: report.failedResponses })}`);
  }
  ok("No console, page, or unexpected Meal Builder API errors");
} catch (error) {
  failure = error;
  report.checks.push({ name: "Authoritative live journey", ok: false, error: error instanceof Error ? error.message : String(error) });
  await page.screenshot({ path: ".qa-artifacts/failure.png", fullPage: true }).catch(() => {});
} finally {
  if (!token) token = await loginApi().catch(() => "");
  if (token) {
    const current = await sections(token).catch(() => []);
    if (current.some((item) => item.key === key)) {
      const cleanup = await request(token, "DELETE", `/api/dashboard/meal-builder/sections/${encodeURIComponent(key)}`);
      report.cleanup = { status: cleanup.response.status, ok: cleanup.response.ok };
    } else report.cleanup = { status: "not-present", ok: true };
  }
  await context.tracing.stop({ path: ".qa-artifacts/trace.zip" });
  await browser.close();
  await fs.writeFile(".qa-artifacts/report.json", JSON.stringify(report, null, 2));
}
if (failure) throw failure;
