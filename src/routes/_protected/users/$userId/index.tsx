import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  CalendarIcon,
  KeyRoundIcon,
  MailIcon,
  PhoneIcon,
  PlusCircleIcon,
  ShieldCheckIcon,
  UserIcon,
} from "lucide-react";

import { Loader } from "@/components/global/loader";
import { ResetPasswordDialog } from "@/components/pages/users/reset-password-dialog";
import {
  CustomerAuthStateBadge,
} from "@/components/pages/users/user-auth-state";
import {
  formatCustomerDateTime,
  formatExpiry,
  getCustomerAccountStatusLabel,
  getTemporaryPasswordReasonLabel,
} from "@/components/pages/users/user-auth-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { userDetailsQueryOptions } from "@/hooks/useUsersQuery";
import { canManageCustomerLifecycle } from "@/lib/customerLifecyclePermissions";

export const Route = createFileRoute("/_protected/users/$userId/")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(userDetailsQueryOptions(params.userId));
  },
  pendingComponent: Loader,
  component: UserDetailsPage,
});

function UserDetailsPage() {
  const { userId } = Route.useParams();

  return <UserDetailsPageContent userId={userId} />;
}

export function UserDetailsPageContent({ userId }: { userId: string }) {
  const { data: response } = useSuspenseQuery(userDetailsQueryOptions(userId));
  const { user: sessionUser } = useAuth();
  const [resetOpen, setResetOpen] = useState(false);
  const user = response.data;
  const canManageLifecycle = canManageCustomerLifecycle(sessionUser?.role);
  const canResetPassword =
    canManageLifecycle && user.isActive && user.canResetPassword !== false;

  return (
    <div className="flex-1 space-y-6 px-4 pt-4 lg:px-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="shrink-0 rounded-full"
          >
            <Link to="/users">
              <ArrowRightIcon className="size-5" />
            </Link>
          </Button>
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {user.fullName || "—"}
              </h1>
              <Badge variant={user.isActive ? "default" : "secondary"}>
                {user.isActive ? "نشط" : "غير نشط"}
              </Badge>
              <CustomerAuthStateBadge user={user} />
            </div>
            <p className="text-sm text-muted-foreground">
              تفاصيل المستخدم والاشتراكات وحالة تسجيل الدخول.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canResetPassword ? (
            <Button type="button" variant="outline" onClick={() => setResetOpen(true)}>
              <KeyRoundIcon data-icon="inline-start" />
              إعادة تعيين كلمة المرور
            </Button>
          ) : null}
          {canManageLifecycle ? (
            <Button asChild>
              <Link to="/users/$userId/create-subscription" params={{ userId }}>
                <PlusCircleIcon className="ml-1 size-4" />
                إنشاء اشتراك
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="size-4" />
              المعلومات الشخصية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="الاسم" value={user.fullName || "—"} />
            <DetailRow
              label="الجوال"
              value={user.phoneE164 || user.phone || "—"}
              ltr
              icon={<PhoneIcon className="size-4 text-muted-foreground" />}
            />
            <DetailRow
              label="البريد"
              value={user.email || "غير متوفر"}
              ltr={Boolean(user.email)}
              icon={<MailIcon className="size-4 text-muted-foreground" />}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheckIcon className="size-4" />
              حالة الحساب والدخول
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow
              label="حالة التفعيل"
              value={user.isActive ? "نشط" : "غير نشط"}
            />
            <DetailRow
              label="حالة الحساب"
              value={getCustomerAccountStatusLabel(user.accountStatus)}
            />
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">حالة الدخول</span>
              <CustomerAuthStateBadge user={user} />
            </div>
            <DetailRow
              label="سبب كلمة المرور المؤقتة"
              value={getTemporaryPasswordReasonLabel(user.temporaryPasswordReason)}
            />
            <DetailRow
              label="وقت الإصدار"
              value={formatCustomerDateTime(user.temporaryPasswordIssuedAt)}
            />
            <DetailRow
              label="وقت الانتهاء"
              value={formatExpiry(user.temporaryPasswordExpiresAt)}
            />
            <DetailRow
              label="آخر إعادة تعيين"
              value={formatCustomerDateTime(user.lastAdminPasswordResetAt)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarIcon className="size-4" />
              الاشتراكات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow
              label="إجمالي الاشتراكات"
              value={String(user.subscriptionsCount)}
            />
            <DetailRow
              label="الاشتراكات النشطة"
              value={String(user.activeSubscriptionsCount)}
            />
            <DetailRow
              label="تاريخ الإنشاء"
              value={formatCustomerDateTime(user.createdAt)}
            />
          </CardContent>
        </Card>
      </div>

      <ResetPasswordDialog
        user={user}
        open={resetOpen}
        onOpenChange={setResetOpen}
      />
    </div>
  );
}

function DetailRow({
  label,
  value,
  ltr = false,
  icon,
}: {
  label: string;
  value: string;
  ltr?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span dir={ltr ? "ltr" : "rtl"} className="text-end font-medium">
        {value}
      </span>
    </div>
  );
}
