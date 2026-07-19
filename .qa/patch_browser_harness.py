from pathlib import Path

path = Path(".qa/meal-builder-authenticated-qa.mjs")
content = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str) -> None:
    global content
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"expected one match, found {count}: {old[:120]!r}")
    content = content.replace(old, new, 1)


replace_once(
    '''  failedApiResponses: [],
  cleanup: [],''',
    '''  failedApiResponses: [],
  apiResponses: [],
  cleanup: [],''',
)
replace_once(
    '''async function cleanupByApi(token) {''',
    '''async function loginForApiCleanup() {
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

async function cleanupByApi(token) {''',
)
replace_once(
    '''  await createButton.click();

  await page.getByRole("heading", { name: originalTitle, exact: true }).waitFor({
    timeout: 45_000,
  });''',
    '''  const createResponsePromise = page.waitForResponse(
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
  });''',
)
replace_once(
    '''  if (!token) token = await getDashboardToken(context).catch(() => "");
  if (token) await cleanupByApi(token);''',
    '''  const cleanupToken = await loginForApiCleanup().catch((error) => {
    report.cleanup.push({
      operation: "login",
      error: error instanceof Error ? error.message : String(error),
    });
    return "";
  });
  if (cleanupToken) await cleanupByApi(cleanupToken);''',
)

path.write_text(content, encoding="utf-8")
