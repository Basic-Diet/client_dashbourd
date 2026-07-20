import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://127.0.0.1:5173";
const BACKEND_URL = process.env.BACKEND_URL || "https://basicdiet145.onrender.com";
const QA_EMAIL = process.env.QA_EMAIL;
const QA_PASSWORD = process.env.QA_PASSWORD;
const ARTIFACT_DIR = path.resolve(".qa-option-artifacts");

if (!QA_EMAIL || !QA_PASSWORD) {
  throw new Error("QA_EMAIL and QA_PASSWORD are required");
}

await fs.mkdir(ARTIFACT_DIR, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  frontendUrl: FRONTEND_URL,
  backendUrl: BACKEND_URL,
  checks: [],
  apiResponses: [],
  consoleErrors: [],
  pageErrors: [],
  failedApiResponses: [],
  restore: null,
};

function check(name, details = {}) {
  report.checks.push({ name, ok: true, at: new Date().toISOString(), ...details });
  console.log(`✓ ${name}`);
}

function fail(name, error) {
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
    path.join(ARTIFACT_DIR, "option-family-qa-report.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );
}

async function apiRequest(token, method, endpoint, body) {
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
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
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { response, payload };
}

async function loginForApi() {
  const result = await apiRequest("", "POST", "/api/dashboard/auth/login", {
    email: QA_EMAIL,
    password: QA_PASSWORD,
  });
  if (!result.response.ok) {
    throw new Error(`API login failed with ${result.response.status}`);
  }
  const token = result.payload?.token || result.payload?.data?.token || "";
  if (!token) throw new Error("API login did not return a token");
  return token;
}

async function getEditableSections(token) {
  const result = await apiRequest(token, "GET", "/api/dashboard/meal-builder?lang=ar");
  if (!result.response.ok) {
    throw new Error(`Meal Builder state failed with ${result.response.status}`);
  }
  const sections =
    result.payload?.data?.draft?.sections ||
    result.payload?.data?.published?.sections ||
    [];
  if (!Array.isArray(sections)) throw new Error("Editable sections are missing");
  return sections;
}

function normalizedIds(values) {
  return [...new Set((values || []).map(String).filter(Boolean))].sort();
}

function sameIds(left, right) {
  return JSON.stringify(normalizedIds(left)) === JSON.stringify(normalizedIds(right));
}

function titleOf(section) {
  return (
    section?.titleOverride?.ar ||
    section?.titleOverride?.en ||
    section?.key ||
    "كارت خيارات"
  );
}

function findTargetSection(sections) {
  const candidates = sections.filter((section) => {
    const role = String(section?.optionRole || section?.metadata?.optionRole || "");
    const cardType = String(section?.cardType || section?.metadata?.cardType || "");
    return (
      section?.systemManaged !== true &&
      (cardType === "option_family" || section?.sectionType === "option_group") &&
      (role === "protein" || role === "carbs") &&
      String(section?.productContextId || "") &&
      String(section?.sourceGroupId || "") &&
      Array.isArray(section?.selectedOptionIds) &&
      section.selectedOptionIds.length >= 2
    );
  });
  return (
    candidates.find((section) => section.key === "chicken") ||
    candidates.find((section) => section.optionRole === "protein") ||
    candidates[0] ||
    null
  );
}

async function loginThroughUi(page) {
  await page.goto(FRONTEND_URL, { waitUntil: "domcontentloaded" });
  await page.locator("#email").waitFor({ timeout: 45_000 });
  await page.locator("#email").fill(QA_EMAIL);
  await page.locator("#password").fill(QA_PASSWORD);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await page.waitForFunction(() => document.cookie.includes("dashboardToken="), null, {
    timeout: 30_000,
  });
  check("Authenticated through the real Dashboard login UI");
}

function optionCard(page, title) {
  return page.locator("article").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });
}

const apiToken = await loginForApi();
const initialSections = await getEditableSections(apiToken);
const target = findTargetSection(initialSections);
if (!target) {
  throw new Error("No reversible option-family card with at least two options exists");
}

const targetKey = String(target.key);
const targetTitle = titleOf(target);
const originalIds = normalizedIds(target.selectedOptionIds);
const optionRole = String(target.optionRole || target.metadata?.optionRole || "");
const productContextId = String(target.productContextId || "");
const sourceGroupId = String(target.sourceGroupId || "");
const familyKey = String(
  target.familyKey ||
    target.metadata?.familyKey ||
    target.metadata?.proteinFamilyKey ||
    target.source?.displayCategoryKey ||
    ""
);

report.target = {
  key: targetKey,
  title: targetTitle,
  optionRole,
  productContextId,
  sourceGroupId,
  familyKey: familyKey || null,
  originalOptionCount: originalIds.length,
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: "ar-EG",
  colorScheme: "light",
});
await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await context.newPage();

page.on("console", (message) => {
  if (message.type() === "error") report.consoleErrors.push(message.text());
});
page.on("pageerror", (error) => report.pageErrors.push(error.message));
page.on("response", (response) => {
  const url = response.url();
  if (response.status() >= 400 && url.includes("/api/dashboard/meal-builder")) {
    report.failedApiResponses.push({ status: response.status(), url });
  }
});

let testError = null;
let removedId = "";
try {
  await loginThroughUi(page);
  await page.goto(`${FRONTEND_URL}/menu?tab=meal-builder`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { name: "منشئ وجبات الاشتراك" }).waitFor({
    timeout: 45_000,
  });

  let card = optionCard(page, targetTitle);
  await card.waitFor({ timeout: 45_000 });
  await card.getByText(optionRole === "carbs" ? "كارب" : "بروتين", { exact: true }).waitFor();
  await card.getByText(/يُستخدم ضمن وجبة مركبة/).waitFor();
  check("Existing option-family card is rendered with clear user-facing labels", {
    targetKey,
    optionRole,
  });

  await card.getByRole("button", { name: "تعديل البيانات" }).click();
  const editDialog = page.getByRole("dialog").filter({
    has: page.getByRole("heading", { name: "تعديل كارت الوجبات" }),
  });
  await editDialog.waitFor();
  await editDialog.getByText(/نوع الكارت ثابت/).waitFor();
  if ((await editDialog.getByRole("radio").count()) !== 0) {
    throw new Error("Edit dialog unexpectedly allows option-family type conversion");
  }
  await editDialog.getByText("نوع الخيارات").waitFor();
  await page.keyboard.press("Escape");
  await editDialog.waitFor({ state: "detached" });
  check("Option-family edit form keeps card type read-only and exposes its context");

  card = optionCard(page, targetTitle);
  const pickerResponsePromise = page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === "GET" &&
        url.pathname.endsWith("/api/dashboard/meal-builder/pickers/options") &&
        url.searchParams.get("targetSectionKey") === targetKey
      );
    },
    { timeout: 45_000 }
  );
  await card.getByRole("button", { name: "إدارة العناصر" }).click();
  const pickerResponse = await pickerResponsePromise;
  const pickerUrl = new URL(pickerResponse.url());
  const pickerPayload = await pickerResponse.json().catch(() => null);
  report.apiResponses.push({
    operation: "option-picker",
    status: pickerResponse.status(),
    contractVersion: pickerPayload?.data?.contractVersion || null,
    candidateType: pickerPayload?.data?.candidateType || null,
    targetSectionKey: pickerUrl.searchParams.get("targetSectionKey"),
    productContextId: pickerUrl.searchParams.get("productContextId"),
    sourceGroupId: pickerUrl.searchParams.get("sourceGroupId"),
    optionRole: pickerUrl.searchParams.get("optionRole"),
    familyKey: pickerUrl.searchParams.get("familyKey"),
    candidateCount: Array.isArray(pickerPayload?.data?.candidates)
      ? pickerPayload.data.candidates.length
      : null,
  });
  if (!pickerResponse.ok()) {
    throw new Error(`Option picker failed with ${pickerResponse.status()}`);
  }
  if (
    pickerUrl.searchParams.get("productContextId") !== productContextId ||
    pickerUrl.searchParams.get("sourceGroupId") !== sourceGroupId ||
    pickerUrl.searchParams.get("optionRole") !== optionRole
  ) {
    throw new Error("Option picker request missed canonical Product + Group + Role context");
  }
  if (optionRole === "protein" && familyKey) {
    if (pickerUrl.searchParams.get("familyKey") !== familyKey) {
      throw new Error("Protein option picker missed the family key");
    }
  }

  const itemsDialog = page.getByRole("dialog").filter({
    has: page.getByRole("heading", { name: new RegExp("إدارة عناصر") }),
  });
  await itemsDialog.waitFor();
  const selectedButton = itemsDialog.locator('button[aria-pressed="true"]:not([disabled])').first();
  await selectedButton.waitFor({ timeout: 45_000 });
  const removedText = (await selectedButton.innerText()).trim();
  const selectedCandidates = pickerPayload?.data?.candidates || [];
  const removedCandidate = selectedCandidates.find((candidate) => {
    const id = String(candidate?.optionId || candidate?.id || candidate?._id || "");
    return candidate?.selected === true && originalIds.includes(id);
  });
  removedId = String(
    removedCandidate?.optionId || removedCandidate?.id || removedCandidate?._id || ""
  );
  if (!removedId) {
    throw new Error("Could not resolve the selected Option canonical ID");
  }
  await selectedButton.click();

  const reducedIds = originalIds.filter((id) => id !== removedId);
  const reduceResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      new URL(response.url()).pathname.endsWith(
        `/api/dashboard/meal-builder/sections/${encodeURIComponent(targetKey)}/items`
      ),
    { timeout: 45_000 }
  );
  await itemsDialog.getByRole("button", { name: "حفظ العناصر" }).click();
  const reduceResponse = await reduceResponsePromise;
  const reducePayload = await reduceResponse.json().catch(() => null);
  report.apiResponses.push({
    operation: "remove-option-via-put-items",
    status: reduceResponse.status(),
    contractVersion: reducePayload?.data?.contractVersion || null,
    action: reducePayload?.data?.action || null,
    removedOptionId: removedId,
  });
  if (!reduceResponse.ok()) {
    throw new Error(`Option removal failed with ${reduceResponse.status()}`);
  }
  await itemsDialog.waitFor({ state: "detached", timeout: 45_000 });

  const reducedSection = (await getEditableSections(apiToken)).find(
    (section) => String(section?.key) === targetKey
  );
  if (!reducedSection || !sameIds(reducedSection.selectedOptionIds, reducedIds)) {
    throw new Error("Backend state did not match the reduced option-family list");
  }
  check("Removed one linked Option through the UI and verified authoritative state", {
    removedOptionId: removedId,
    removedText,
  });

  card = optionCard(page, targetTitle);
  await card.getByRole("button", { name: "إدارة العناصر" }).click();
  const restoreDialog = page.getByRole("dialog").filter({
    has: page.getByRole("heading", { name: new RegExp("إدارة عناصر") }),
  });
  await restoreDialog.waitFor();
  const restoreButton = restoreDialog
    .locator('button[aria-pressed="false"]:not([disabled])')
    .filter({ hasText: removedText })
    .first();
  await restoreButton.waitFor({ timeout: 45_000 });
  await restoreButton.click();

  const restoreResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      new URL(response.url()).pathname.endsWith(
        `/api/dashboard/meal-builder/sections/${encodeURIComponent(targetKey)}/items`
      ),
    { timeout: 45_000 }
  );
  await restoreDialog.getByRole("button", { name: "حفظ العناصر" }).click();
  const restoreResponse = await restoreResponsePromise;
  const restorePayload = await restoreResponse.json().catch(() => null);
  report.apiResponses.push({
    operation: "restore-option-via-put-items",
    status: restoreResponse.status(),
    contractVersion: restorePayload?.data?.contractVersion || null,
    action: restorePayload?.data?.action || null,
    restoredOptionId: removedId,
  });
  if (!restoreResponse.ok()) {
    throw new Error(`Option restoration failed with ${restoreResponse.status()}`);
  }
  await restoreDialog.waitFor({ state: "detached", timeout: 45_000 });

  const restoredSection = (await getEditableSections(apiToken)).find(
    (section) => String(section?.key) === targetKey
  );
  if (!restoredSection || !sameIds(restoredSection.selectedOptionIds, originalIds)) {
    throw new Error("Original option-family list was not restored exactly");
  }
  report.restore = {
    ok: true,
    targetKey,
    restoredOptionId: removedId,
    originalOptionCount: originalIds.length,
  };
  check("Restored the exact original option-family list", report.restore);

  await page.getByRole("button", { name: "إضافة كارت" }).click();
  const createDialog = page.getByRole("dialog").filter({
    has: page.getByRole("heading", { name: "إضافة كارت جديد" }),
  });
  await createDialog.waitFor();
  await createDialog.getByRole("radio", { name: /خيارات وجبة مركبة/ }).click();
  await createDialog.getByText("نوع الخيارات").waitFor();
  await createDialog.getByText("المنتج الأساسي").waitFor();
  await createDialog.getByText("مجموعة الخيارات").waitFor();
  if (!(await createDialog.getByRole("button", { name: "إنشاء الكارت" }).isDisabled())) {
    throw new Error("Option-family create button must remain disabled before context and options");
  }
  if ((await createDialog.getByText(/^sandwich$/i).count()) > 0) {
    throw new Error("Deprecated sandwich selection appeared in the option-family form");
  }
  await page.keyboard.press("Escape");
  await createDialog.waitFor({ state: "detached" });
  check("Option-family create form is contextual, guarded, and exposes no legacy sandwich type");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${FRONTEND_URL}/menu?tab=meal-builder`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { name: "منشئ وجبات الاشتراك" }).waitFor({
    timeout: 45_000,
  });
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  if (overflow.scrollWidth > overflow.clientWidth + 2) {
    throw new Error(
      `Mobile option-family workspace overflow: ${overflow.scrollWidth} > ${overflow.clientWidth}`
    );
  }
  await optionCard(page, targetTitle).waitFor({ timeout: 45_000 });
  check("Option-family card remains usable on mobile without horizontal overflow", overflow);

  const blockingConsoleErrors = report.consoleErrors.filter(
    (message) => !message.includes("favicon")
  );
  if (blockingConsoleErrors.length) {
    throw new Error(`Browser console errors: ${blockingConsoleErrors.join(" | ")}`);
  }
  if (report.pageErrors.length) {
    throw new Error(`Page errors: ${report.pageErrors.join(" | ")}`);
  }
  if (report.failedApiResponses.length) {
    throw new Error(`Meal Builder API failures: ${JSON.stringify(report.failedApiResponses)}`);
  }
  check("No console, page, or Meal Builder API failures were observed");
} catch (error) {
  testError = error;
  fail("Reversible option-family browser journey", error);
  await page
    .screenshot({ path: path.join(ARTIFACT_DIR, "failure.png"), fullPage: true })
    .catch(() => {});
} finally {
  try {
    const sections = await getEditableSections(apiToken);
    const current = sections.find((section) => String(section?.key) === targetKey);
    if (current && !sameIds(current.selectedOptionIds, originalIds)) {
      const restore = await apiRequest(
        apiToken,
        "PUT",
        `/api/dashboard/meal-builder/sections/${encodeURIComponent(targetKey)}/items`,
        { optionIds: originalIds }
      );
      report.restore = {
        ok: restore.response.ok,
        via: "api-finally",
        status: restore.response.status,
        targetKey,
        originalOptionCount: originalIds.length,
      };
      if (!restore.response.ok) {
        testError ||= new Error(`Emergency Option restore failed with ${restore.response.status}`);
      }
    }
    const finalSections = await getEditableSections(apiToken);
    const finalSection = finalSections.find((section) => String(section?.key) === targetKey);
    if (!finalSection || !sameIds(finalSection.selectedOptionIds, originalIds)) {
      testError ||= new Error("Final Backend state does not match original option-family list");
    }
  } catch (restoreError) {
    report.restore = {
      ok: false,
      error: restoreError instanceof Error ? restoreError.message : String(restoreError),
    };
    testError ||= restoreError;
  }
  await context.tracing.stop({
    path: path.join(ARTIFACT_DIR, "option-family-trace.zip"),
  });
  await browser.close();
  await saveReport();
}

if (testError) throw testError;
console.log(`Option-family QA completed successfully for ${targetKey}`);
