import LoginForm from "@/components/auth/LoginForm";
import { Loader } from "@/components/global/loader";
import { RouteError } from "@/components/global/RouteError";
import { sessionQueryOptions } from "@/lib/authApi";
import { authMiddleware } from "@/lib/authMiddleware";
import type { AuthResponse } from "@/types/auth";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData(sessionQueryOptions);
    authMiddleware(data as AuthResponse, location.pathname);
  },
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
