import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SaveIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { parseApiError } from "@/lib/apiErrors";
import { getRoleLabel } from "@/lib/roleLabels";

export const Route = createFileRoute("/_protected/profile/")({
  component: ProfilePage,
});

function getPasswordErrorMessage(error: unknown) {
  const parsed = parseApiError(error);
  if (parsed.code === "CURRENT_PASSWORD_INVALID" || parsed.status === 401) {
    return "كلمة المرور الحالية غير صحيحة.";
  }
  if (parsed.code === "PASSWORD_UNCHANGED") {
    return "كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية.";
  }
  if (parsed.code === "WEAK_PASSWORD") {
    return "كلمة المرور الجديدة يجب أن تكون 12 حرفًا على الأقل وتحتوي على حرف كبير وحرف صغير ورقم ورمز.";
  }
  return parsed.message || "تعذر تحديث كلمة المرور";
}

function ProfilePage() {
  const { user, changePassword, isChangingPassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit =
    currentPassword.length > 0 && newPassword.length >= 12 && passwordsMatch;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!passwordsMatch) {
      toast.error("تأكيد كلمة المرور غير مطابق.");
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(getPasswordErrorMessage(error));
    }
  };

  return (
    <div className="space-y-4 px-4 text-right lg:px-6" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">الملف الشخصي</h1>
          <p className="text-sm text-muted-foreground">
            بيانات حساب لوحة التحكم الحالي وإعدادات كلمة المرور.
          </p>
        </div>
        <UserIcon className="size-6 text-muted-foreground" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>الحساب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Detail label="البريد الإلكتروني" value={user?.email} />
            <Detail label="الدور" value={translateRole(user?.role)} />
            <Detail label="نشط" value={user?.isActive ? "نعم" : "لا"} />
            <Detail label="آخر تسجيل دخول" value={formatDate(user?.lastLoginAt)} />
            <Detail label="تاريخ الإنشاء" value={formatDate(user?.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>تغيير كلمة المرور</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">كلمة المرور الحالية</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  12 حرفًا على الأقل، وتتضمن حرفًا كبيرًا وحرفًا صغيرًا ورقمًا ورمزًا.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">تأكيد كلمة المرور الجديدة</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  aria-invalid={
                    confirmPassword.length > 0 && !passwordsMatch
                      ? "true"
                      : "false"
                  }
                />
                {confirmPassword.length > 0 && !passwordsMatch ? (
                  <p className="text-xs text-destructive">
                    تأكيد كلمة المرور غير مطابق.
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                disabled={isChangingPassword || !canSubmit}
              >
                <SaveIcon className="size-4" />
                {isChangingPassword
                  ? "جاري تحديث كلمة المرور..."
                  : "تحديث كلمة المرور"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-left font-medium">{String(value ?? "-")}</span>
    </div>
  );
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("ar-EG");
}

function translateRole(value: unknown) {
  const role = String(value ?? "");
  return getRoleLabel(role) || role;
}
