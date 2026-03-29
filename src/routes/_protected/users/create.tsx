import { createFileRoute } from "@tanstack/react-router";
import { CreateUserForm } from "@/components/pages/users/create-user-form";

export const Route = createFileRoute("/_protected/users/create")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6" dir="rtl">
      <h1 className="text-2xl font-bold tracking-tight">إنشاء مستخدم جديد</h1>
      <p className="text-muted-foreground">
        أضف مستخدم جديد إلى التطبيق عبر تعبئة النموذج التالي.
      </p>
      <div className="mt-4">
        <CreateUserForm />
      </div>
    </div>
  );
}
