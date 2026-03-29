import { createFileRoute } from "@tanstack/react-router";
import { usersQueryOptions } from "@/hooks/useUsersQuery";
import { Loader } from "@/components/global/loader";
import { useSuspenseQuery } from "@tanstack/react-query";
import { UsersTable } from "@/components/pages/users/users-table";

export const Route = createFileRoute("/_protected/users/")({
  component: RouteComponent,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(usersQueryOptions(1, 10)),
  pendingComponent: () => (
    <Loader variant="full-screen" label="جاري تحميل المستخدمين..." />
  ),
});

function RouteComponent() {
  useSuspenseQuery(usersQueryOptions(1, 10));

  return (
    <>
      <div className="flex flex-col gap-4 p-4 lg:p-6" dir="rtl">
        <h1 className="text-2xl font-bold tracking-tight">إدارة المستخدمين</h1>
        <p className="text-muted-foreground">
          عرض وإدارة مستخدمي التطبيق واشتراكاتهم.
        </p>
      </div>
      <UsersTable />
    </>
  );
}
