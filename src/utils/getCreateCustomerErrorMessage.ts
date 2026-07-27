import { parseApiError } from "@/lib/apiErrors";

const WEAK_PASSWORD_MESSAGE =
  "كلمة المرور المؤقتة ضعيفة: يجب أن تحتوي على حرف إنجليزي كبير وحرف إنجليزي صغير ورقم.";

export function getCreateCustomerErrorMessage(error: unknown) {
  const parsed = parseApiError(error);
  const code = parsed.code?.toUpperCase();
  const message = parsed.message.trim();
  const upperMessage = message.toUpperCase();

  if (code === "WEAK_PASSWORD" || upperMessage.includes("WEAK_PASSWORD")) {
    return WEAK_PASSWORD_MESSAGE;
  }

  if (parsed.status === 409 || code === "CONFLICT") {
    return "يوجد مستخدم مسجل بنفس رقم الجوال أو البريد الإلكتروني";
  }

  if (
    code === "INVALID_PHONE" ||
    upperMessage.includes("INVALID_PHONE") ||
    upperMessage.includes("PHONEE164")
  ) {
    return "رقم الجوال غير صحيح";
  }

  if (parsed.status === 403 || code === "FORBIDDEN" || code === "UNAUTHORIZED") {
    return "ليس لديك صلاحية لتنفيذ هذا الإجراء";
  }

  if (parsed.status === 404 || code === "NOT_FOUND") {
    return "المستخدم غير موجود";
  }

  // Preserve a clear Backend validation message instead of replacing it with
  // a generic frontend sentence. This keeps future Backend validation rules
  // understandable without requiring another frontend release.
  if (
    message &&
    message !== "Unexpected error" &&
    (parsed.status === 400 || parsed.status === 422 || code)
  ) {
    return message;
  }

  if (parsed.status && parsed.status >= 500) {
    return "تعذر إنشاء المستخدم حاليًا بسبب مشكلة في الخادم. حاول مرة أخرى.";
  }

  return "تعذر إنشاء المستخدم. تحقق من الاتصال وحاول مرة أخرى.";
}
