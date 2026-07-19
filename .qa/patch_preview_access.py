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
    '''const FRONTEND_URL = process.env.FRONTEND_URL || "https://basic-dite-dashbourd.vercel.app";
const BACKEND_URL = process.env.BACKEND_URL || "https://basicdiet145.onrender.com";''',
    '''const FRONTEND_URL = process.env.FRONTEND_URL || "https://basic-dite-dashbourd.vercel.app";
const FRONTEND_ACCESS_URL = process.env.FRONTEND_ACCESS_URL || FRONTEND_URL;
const BACKEND_URL = process.env.BACKEND_URL || "https://basicdiet145.onrender.com";''',
)
replace_once(
    '''async function loginThroughUi(page) {
  await page.goto(FRONTEND_URL, { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(QA_EMAIL);''',
    '''async function loginThroughUi(page) {
  await page.goto(FRONTEND_ACCESS_URL, { waitUntil: "domcontentloaded" });
  await page.locator("#email").waitFor({ timeout: 45_000 });
  await page.locator("#email").fill(QA_EMAIL);''',
)
replace_once(
    '''  frontendUrl: FRONTEND_URL,
  backendUrl: BACKEND_URL,''',
    '''  frontendUrl: FRONTEND_URL,
  protectedPreviewAccessUsed: FRONTEND_ACCESS_URL !== FRONTEND_URL,
  backendUrl: BACKEND_URL,''',
)

path.write_text(content, encoding="utf-8")
