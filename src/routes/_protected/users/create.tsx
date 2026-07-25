import { createFileRoute, Link } from "@tanstack/react-router";

import { CreateUserForm } from "@/components/pages/users/create-user-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { canCreateAppCustomer } from "@/lib/rolePermissions";

export const Route = createFileRoute("/_protected/users/create")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useAuth();
  const canCreate = canCreateAppCustomer(user?.role);

  if (!canCreate) {
    return (
      <div className="flex flex-col gap-4 p-4 lg:p-6" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>ليس لديك صلاحية لتنفيذ هذا الإجراء</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/users">العودة إلى المستخدمين</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6" dir="rtl">
      <h1 className="text-2xl font-bold tracking-tight">إضافة مستخدم جديد</h1>
      <p className="text-muted-foreground">
        أضف عميلاً جديداً إلى التطبيق واحصل على كلمة مرور مؤقتة من الخادم.
      </p>
      <div className="mt-4">
        <CreateUserForm />
      </div>
    </div>
  );
}
