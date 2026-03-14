import LoginForm from "@/components/auth/LoginForm";
import { Loader } from "@/components/global/loader";
import { RouteError } from "@/components/global/RouteError";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
  // beforeLoad: async ({ context }) => {
  //   const data = await context.queryClient.ensureQueryData(sessionQueryOptions);

  //   if (data?.user) {
  //     throw redirect({ to: "/dashboard" });
  //   }
  // },
  errorComponent: RouteError,
  pendingComponent: Loader,
});

function RouteComponent() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <LoginForm />
    </div>
  );
}
