import LoginForm from "@/components/auth/LoginForm";
import { RouteError } from "@/components/global/RouteError";
import { sessionQueryOptions } from "@/lib/authApi";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData(sessionQueryOptions);

    if (data?.user) {
      throw redirect({ to: "/dashboard" });
    }
  },
  errorComponent: RouteError,
});

function RouteComponent() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <LoginForm />
    </div>
  );
}
