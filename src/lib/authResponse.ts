import type { AuthResponse, User } from "@/types/auth";

type AuthResponsePayload = Partial<AuthResponse> & {
  data?: {
    token?: string;
    expiresIn?: number | null;
    user?: User | null;
  };
};

export function normalizeAuthResponse(
  payload: AuthResponsePayload
): AuthResponse {
  return {
    status: Boolean(payload.status),
    token: payload.token ?? payload.data?.token ?? "",
    expiresIn: payload.expiresIn ?? payload.data?.expiresIn ?? null,
    user: payload.data?.user ?? payload.user ?? null,
  };
}
