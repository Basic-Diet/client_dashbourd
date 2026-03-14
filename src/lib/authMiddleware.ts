import { redirect } from "@tanstack/react-router";
import type { AuthResponse } from "@/types/auth";

export const authMiddleware = (
  session: AuthResponse | null | undefined
) => {
  console.log(session);

  if (!session || !session.user) {
    throw redirect({
      to: "/",
    });
  }
};
