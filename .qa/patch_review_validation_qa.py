from pathlib import Path

path = Path(".qa/meal-builder-authenticated-qa.mjs")
content = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str) -> None:
    global content
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"expected one match, found {count}: {old[:140]!r}")
    content = content.replace(old, new, 1)


replace_once(
    '''      report.cleanup.push({ key, status: response.status, payload });
      if (response.ok) console.log(`Cleanup removed ${key}`);''',
    '''      report.cleanup.push({
        key,
        status: response.status,
        ok: response.ok,
        contractVersion: payload?.data?.contractVersion || null,
        action: payload?.data?.action || null,
        errorCode: payload?.error?.code || null,
      });
      if (response.ok) console.log(`Cleanup removed ${key}`);''',
)

replace_once(
    '''  await page.getByRole("button", { name: "مراجعة ونشر" }).click();
  const validationOrPublish = page.locator('[role="dialog"]').filter({
    hasText: /نتيجة مراجعة|نشر تغييرات منشئ الوجبات/,
  });
  await validationOrPublish.first().waitFor({ timeout: 45_000 });
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "02-validation-result.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  check("Backend validation was triggered from the review flow");''',
    '''  const validateResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname.endsWith(
        "/api/dashboard/meal-builder/validate"
      ),
    { timeout: 45_000 }
  );
  await page.getByRole("button", { name: "مراجعة ونشر" }).click();
  const validateResponse = await validateResponsePromise;
  const validatePayload = await validateResponse.json().catch(() => null);
  const validated = validatePayload?.data || {};
  const validationSummary = {
    operation: "validate",
    status: validateResponse.status(),
    ready: validated.ready === true,
    errorCount: Array.isArray(validated.errors) ? validated.errors.length : null,
    warningCount: Array.isArray(validated.warnings)
      ? validated.warnings.length
      : null,
    responseHasChecks: Array.isArray(validated.checks),
    errorCode: validatePayload?.error?.code || null,
  };
  report.apiResponses.push(validationSummary);
  if (!validateResponse.ok()) {
    throw new Error(
      `Backend validation failed with ${validateResponse.status()}`
    );
  }

  const readyToPublish =
    validated.ready === true &&
    Array.isArray(validated.errors) &&
    validated.errors.length === 0;
  const validationOrPublish = page
    .locator('[role="dialog"], [role="alertdialog"]')
    .filter({
      hasText: /نتيجة مراجعة الـBackend|نشر تغييرات منشئ الوجبات/,
    });
  await validationOrPublish.first().waitFor({ timeout: 45_000 });
  if (readyToPublish) {
    await page
      .getByRole("alertdialog")
      .getByRole("heading", { name: "نشر تغييرات منشئ الوجبات؟" })
      .waitFor();
  } else {
    await page
      .getByRole("dialog")
      .getByRole("heading", { name: "نتيجة مراجعة الـBackend" })
      .waitFor();
  }
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "02-validation-result.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await validationOrPublish.first().waitFor({ state: "detached" });
  check("Backend validation was triggered and surfaced clearly without publishing", {
    ready: validationSummary.ready,
    errorCount: validationSummary.errorCount,
    warningCount: validationSummary.warningCount,
  });''',
)

path.write_text(content, encoding="utf-8")
