import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const FRONTEND_URL = process.env.FRONTEND_URL || "https://basic-dite-dashbourd.vercel.app";
const BACKEND_URL = process.env.BACKEND_URL || "https://basicdiet145.onrender.com";
const QA_EMAIL = process.env.QA_EMAIL;
const QA_PASSWORD = process.env.QA_PASSWORD;
const ARTIFACT_DIR = path.resolve(".qa-artifacts");

if (!QA_EMAIL || !QA_PASSWORD) {
  throw new Error("QA_EMAIL and QA_PASSWORD are required");
}

await fs.mkdir(ARTIFACT_DIR, { recursive: true });

const runId = `qa_${Date.now()}`;
const originalKey = `${runId}_direct`;
const renamedKey = `${runId}_direct_updated`;
const originalTitle = `اختبار واجهة ${runId}`;
const updatedTitle = `اختبار واجهة محدث ${runId}`;

const report = {
  runId,
  frontendUrl: FRONTEND_URL,
  backendUrl: BACKEND_URL,
  startedAt: new Date().toISOString(),
  checks: [],
  consoleErrors: [],
  pageErrors: [],
  failedApiResponses: [],
  apiResponses: [],
  cleanup: [],
};

function check(name, details = {}) {
  report.checks.push({ name, ok: true, at: new Date().toISOString(), ...details });
  console.log(`✓ ${name}`);
}

function failed(name, error) {
  report.checks.push({
    name,
    ok: false,
    at: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
  });
}

async function saveReport() {
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(
    path.join(ARTIFACT_DIR, "meal-builder-qa-report.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );
}

async function loginThroughUi(page) {
  await page.goto(FRONTEND_URL, { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(QA_EMAIL);
  await page.locator("#password").fill(QA_PASSWORD);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await page.waitForFunction(() => document.cookie.includes("dashboardToken="), null, {
    timeout: 30_000,
  });
  check("Authenticated through the real Dashboard login UI");
}

async function getDashboardToken(context) {
  const cookies = await context.cookies();
  return cookies.find((cookie) => cookie.name === "dashboardToken")?.value || "";
}

async function apiRequest(token, method, endpoint, body) {
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method,
    headers: {
      Accept: "application/json",
      "Accept-Language": "ar",
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { response, payload };
}

async function loginForApiCleanup() {
  const { response, payload } = await apiRequest(
    "",
    "POST",
    "/api/dashboard/auth/login",
    { email: QA_EMAIL, password: QA_PASSWORD }
  );
  if (!response.ok) {
    throw new Error(`Cleanup login failed with ${response.status}`);
  }
  const cleanupToken = payload?.token || payload?.data?.token || "";
  if (!cleanupToken) throw new Error("Cleanup login did not return a token");
  return cleanupToken;
}

async function cleanupByApi(token) {
  for (const key of [renamedKey, originalKey]) {
    try {
      const { response, payload } = await apiRequest(
        token,
        "DELETE",
        `/api/dashboard/meal-builder/sections/${encodeURIComponent(key)}`
      );
      report.cleanup.push({ key, status: response.status, payload });
      if (response.ok) console.log(`Cleanup removed ${key}`);
    } catch (error) {
      report.cleanup.push({ key, error: error instanceof Error ? error.message : String(error) });
    }
  }
}

function dynamicCard(page, title) {
  return page.locator("article").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  if (dimensions.scrollWidth > dimensions.clientWidth + 2) {
    throw new Error(
      `${label} horizontal overflow: ${dimensions.scrollWidth} > ${dimensions.clientWidth}`
    );
  }
  check(`${label} has no horizontal overflow`, dimensions);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: "ar-EG",
  colorScheme: "light",
});
await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await context.newPage();

page.on("console", (message) => {
  if (message.type() === "error") {
    report.consoleErrors.push(message.text());
  }
});
page.on("pageerror", (error) => report.pageErrors.push(error.message));
page.on("response", (response) => {
  const url = response.url();
  if (
    response.status() >= 400 &&
    (url.includes("/api/dashboard/meal-builder") || url.includes("/api/dashboard/auth"))
  ) {
    report.failedApiResponses.push({ status: response.status(), url });
  }
});

let token = "";
let testError = null;
try {
  await loginThroughUi(page);
  token = await getDashboardToken(context);
  if (!token) throw new Error("Dashboard token cookie was not created after login");

  await page.goto(`${FRONTEND_URL}/menu?tab=meal-builder`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { name: "منشئ وجبات الاشتراك" }).waitFor({
    timeout: 45_000,
  });
  check("Meal Builder route loaded after authentication");

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "01-desktop-initial.png"),
    fullPage: true,
  });
  await assertNoHorizontalOverflow(page, "Desktop workspace");

  const premiumCard = page.locator("article").filter({
    has: page.getByRole("heading", { name: "الوجبات المميزة", exact: true }),
  });
  await premiumCard.getByText("يُدار من النظام", { exact: true }).waitFor();
  if ((await premiumCard.getByRole("button").count()) !== 0) {
    throw new Error("Premium card unexpectedly exposes action buttons");
  }
  check("Premium card is visible first and read-only");

  await page.getByRole("button", { name: "إضافة كارت" }).click();
  const createDialog = page.getByRole("dialog").filter({
    has: page.getByRole("heading", { name: "إضافة كارت جديد" }),
  });
  await createDialog.waitFor();
  const createButton = createDialog.getByRole("button", { name: "إنشاء الكارت" });
  if (!(await createButton.isDisabled())) {
    throw new Error("Create button must be disabled before required fields are complete");
  }
  check("Create form blocks incomplete submission");

  await createDialog.getByPlaceholder("مثال: وجبات جاهزة").fill(originalTitle);
  await createDialog.getByPlaceholder("Example: Ready Meals").fill(`UI QA ${runId}`);
  await createDialog.getByPlaceholder("ready_meals").fill(originalKey);

  const productPicker = createDialog.locator("section").filter({
    hasText: "المنتجات داخل الكارت",
  });
  const firstSelectableProduct = productPicker
    .locator('button[aria-pressed="false"]:not([disabled])')
    .first();
  await firstSelectableProduct.waitFor({ timeout: 45_000 });
  const selectedProductText = (await firstSelectableProduct.innerText()).trim();
  await firstSelectableProduct.click();
  await createButton.waitFor({ state: "visible" });
  if (await createButton.isDisabled()) {
    throw new Error("Create button stayed disabled after completing all required fields");
  }
  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname.endsWith(
        "/api/dashboard/meal-builder/sections"
      ),
    { timeout: 45_000 }
  );
  await createButton.click();
  const createResponse = await createResponsePromise;
  const createPayload = await createResponse.json().catch(() => null);
  report.apiResponses.push({
    operation: "create",
    status: createResponse.status(),
    contractVersion: createPayload?.data?.contractVersion || null,
    action: createPayload?.data?.action || null,
    responseHasDraft: Boolean(createPayload?.data?.draft),
    responseHasValidation: Boolean(createPayload?.data?.validation),
    errorCode: createPayload?.error?.code || null,
  });

  await page.getByRole("heading", { name: originalTitle, exact: true }).waitFor({
    timeout: 45_000,
  });
  let card = dynamicCard(page, originalTitle);
  await card.getByText("full_meal_product", { exact: true }).waitFor();
  check("Created and read a direct-product card through the UI", {
    key: originalKey,
    selectedProductText,
  });

  await card.getByRole("button", { name: "تعديل البيانات" }).click();
  const editDialog = page.getByRole("dialog").filter({
    has: page.getByRole("heading", { name: "تعديل كارت الوجبات" }),
  });
  await editDialog.waitFor();
  await editDialog.getByPlaceholder("مثال: وجبات جاهزة").fill(updatedTitle);
  await editDialog.getByPlaceholder("Example: Ready Meals").fill(`UI QA Updated ${runId}`);
  await editDialog.getByPlaceholder("ready_meals").fill(renamedKey);
  await editDialog.getByRole("button", { name: "حفظ التعديلات" }).click();

  await page.getByRole("heading", { name: updatedTitle, exact: true }).waitFor({
    timeout: 45_000,
  });
  card = dynamicCard(page, updatedTitle);
  await card.getByText("full_meal_product", { exact: true }).waitFor();
  check("Updated card title and key through the UI", { renamedKey });

  await card.getByRole("button", { name: "إدارة العناصر" }).click();
  const itemsDialog = page.getByRole("dialog").filter({
    has: page.getByRole("heading", { name: new RegExp("إدارة عناصر") }),
  });
  await itemsDialog.waitFor();
  const unselectedProduct = itemsDialog
    .locator('button[aria-pressed="false"]:not([disabled])')
    .first();
  await unselectedProduct.waitFor({ timeout: 45_000 });
  const addedProductText = (await unselectedProduct.innerText()).trim();
  await unselectedProduct.click();
  const saveItemsButton = itemsDialog.getByRole("button", { name: "حفظ العناصر" });
  if (await saveItemsButton.isDisabled()) {
    throw new Error("Save items button stayed disabled after changing the selection");
  }
  await saveItemsButton.click();
  await itemsDialog.waitFor({ state: "detached", timeout: 45_000 });
  check("Replaced the card product list through the batch-items UI", {
    addedProductText,
  });

  card = dynamicCard(page, updatedTitle);
  await card.getByRole("button", { name: "إخفاء" }).click();
  await card.getByText("مخفي", { exact: true }).waitFor({ timeout: 45_000 });
  check("Hid the card through the contextual visibility action");

  card = dynamicCard(page, updatedTitle);
  await card.getByRole("button", { name: "إظهار" }).click();
  await card.getByText("ظاهر", { exact: true }).waitFor({ timeout: 45_000 });
  check("Restored card visibility through the contextual action");

  const workspaceSearch = page.getByPlaceholder("ابحث باسم الكارت أو المفتاح...");
  await workspaceSearch.fill(updatedTitle);
  await page.getByRole("heading", { name: updatedTitle, exact: true }).waitFor();
  if (await page.getByText("لا توجد كروت مطابقة للبحث.").isVisible().catch(() => false)) {
    throw new Error("Search failed to find the newly updated card");
  }
  await workspaceSearch.clear();
  check("Workspace search finds the updated card");

  await page.getByRole("button", { name: "المنشور" }).click();
  const publishedDialog = page.getByRole("dialog").filter({ hasText: "النسخة المنشورة" });
  await publishedDialog.waitFor();
  await page.keyboard.press("Escape");
  await publishedDialog.waitFor({ state: "detached" });
  check("Published configuration preview opens without mutating the draft");

  await page.getByRole("button", { name: "مراجعة ونشر" }).click();
  const validationOrPublish = page.locator('[role="dialog"]').filter({
    hasText: /نتيجة مراجعة|نشر تغييرات منشئ الوجبات/,
  });
  await validationOrPublish.first().waitFor({ timeout: 45_000 });
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "02-validation-result.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  check("Backend validation was triggered from the review flow");

  card = dynamicCard(page, updatedTitle);
  await card.getByRole("button", { name: "حذف الكارت" }).click();
  const deleteDialog = page.getByRole("alertdialog").filter({
    hasText: updatedTitle,
  });
  await deleteDialog.waitFor();
  await deleteDialog.getByRole("button", { name: "حذف الكارت" }).click();
  await page.getByRole("heading", { name: updatedTitle, exact: true }).waitFor({
    state: "detached",
    timeout: 45_000,
  });
  check("Deleted the QA card through the UI");

  const stateResult = await apiRequest(
    token,
    "GET",
    "/api/dashboard/meal-builder?lang=ar"
  );
  if (!stateResult.response.ok) {
    throw new Error(`State verification failed with ${stateResult.response.status}`);
  }
  const stateText = JSON.stringify(stateResult.payload);
  if (stateText.includes(originalKey) || stateText.includes(renamedKey)) {
    throw new Error("Deleted QA card is still present in authoritative Backend state");
  }
  check("Authoritative Backend state confirms QA card cleanup");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${FRONTEND_URL}/menu?tab=meal-builder`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { name: "منشئ وجبات الاشتراك" }).waitFor({
    timeout: 45_000,
  });
  await assertNoHorizontalOverflow(page, "Mobile workspace");
  await page.getByRole("button", { name: "إضافة كارت" }).waitFor();
  await page.getByRole("button", { name: "مراجعة ونشر" }).waitFor();
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "03-mobile-workspace.png"),
    fullPage: true,
  });
  check("Mobile workspace renders primary actions and cards correctly");

  const blockingConsoleErrors = report.consoleErrors.filter(
    (message) => !message.includes("favicon")
  );
  if (blockingConsoleErrors.length) {
    throw new Error(`Browser console errors detected: ${blockingConsoleErrors.join(" | ")}`);
  }
  if (report.pageErrors.length) {
    throw new Error(`Page errors detected: ${report.pageErrors.join(" | ")}`);
  }
  const unexpectedApiFailures = report.failedApiResponses.filter(
    ({ status, url }) => !(status === 401 && url.includes("/api/dashboard/auth/me"))
  );
  if (unexpectedApiFailures.length) {
    throw new Error(`Unexpected API failures detected: ${JSON.stringify(unexpectedApiFailures)}`);
  }
  check("No blocking browser console, page, or Meal Builder API errors were observed");
} catch (error) {
  testError = error;
  failed("Authenticated Meal Builder CRUD browser journey", error);
  await page
    .screenshot({
      path: path.join(ARTIFACT_DIR, "failure.png"),
      fullPage: true,
    })
    .catch(() => {});
} finally {
  const cleanupToken = await loginForApiCleanup().catch((error) => {
    report.cleanup.push({
      operation: "login",
      error: error instanceof Error ? error.message : String(error),
    });
    return "";
  });
  if (cleanupToken) await cleanupByApi(cleanupToken);
  await context.tracing.stop({
    path: path.join(ARTIFACT_DIR, "meal-builder-trace.zip"),
  });
  await browser.close();
  await saveReport();
}

if (testError) throw testError;
console.log(`Authenticated Meal Builder QA completed successfully: ${runId}`);
