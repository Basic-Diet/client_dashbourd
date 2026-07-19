const BACKEND_URL = process.env.BACKEND_URL || "https://basicdiet145.onrender.com";
const QA_EMAIL = process.env.QA_EMAIL;
const QA_PASSWORD = process.env.QA_PASSWORD;
const CLEANUP_KEYS = String(process.env.CLEANUP_KEYS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!QA_EMAIL || !QA_PASSWORD) {
  throw new Error("QA_EMAIL and QA_PASSWORD are required");
}

async function request(method, endpoint, { token, body } = {}) {
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
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { response, payload };
}

const login = await request("POST", "/api/dashboard/auth/login", {
  body: { email: QA_EMAIL, password: QA_PASSWORD },
});
if (!login.response.ok) {
  throw new Error(`API login failed: ${login.response.status} ${JSON.stringify(login.payload)}`);
}
const token = login.payload?.token || login.payload?.data?.token;
if (!token) throw new Error("API login response did not include a dashboard token");
console.log(JSON.stringify({
  loginStatus: login.response.status,
  tokenPresent: true,
  userRole: login.payload?.user?.role || login.payload?.data?.user?.role || null,
}));

const before = await request("GET", "/api/dashboard/meal-builder?lang=ar", { token });
if (!before.response.ok) {
  throw new Error(`Meal Builder state failed: ${before.response.status} ${JSON.stringify(before.payload)}`);
}
const beforeText = JSON.stringify(before.payload);
console.log(JSON.stringify({
  stateStatus: before.response.status,
  stateContractVersion: before.payload?.data?.contractVersion || null,
  cleanupKeysFoundBefore: CLEANUP_KEYS.filter((key) => beforeText.includes(key)),
}));

for (const key of CLEANUP_KEYS) {
  if (!beforeText.includes(key)) {
    console.log(JSON.stringify({ cleanupKey: key, action: "not-present" }));
    continue;
  }
  const deletion = await request(
    "DELETE",
    `/api/dashboard/meal-builder/sections/${encodeURIComponent(key)}`,
    { token }
  );
  console.log(JSON.stringify({
    cleanupKey: key,
    status: deletion.response.status,
    ok: deletion.response.ok,
    contractVersion: deletion.payload?.data?.contractVersion || null,
    action: deletion.payload?.data?.action || null,
    errorCode: deletion.payload?.error?.code || null,
  }));
  if (!deletion.response.ok) {
    throw new Error(`Cleanup failed for ${key}: ${deletion.response.status}`);
  }
}

const after = await request("GET", "/api/dashboard/meal-builder?lang=ar", { token });
if (!after.response.ok) throw new Error(`Post-cleanup state failed: ${after.response.status}`);
const afterText = JSON.stringify(after.payload);
const remaining = CLEANUP_KEYS.filter((key) => afterText.includes(key));
console.log(JSON.stringify({ cleanupRemaining: remaining }));
if (remaining.length) {
  throw new Error(`QA cleanup keys still present: ${remaining.join(", ")}`);
}
