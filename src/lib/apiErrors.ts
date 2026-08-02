type ApiErrorData = {
  ok?: unknown;
  message?: unknown;
  messageAr?: unknown;
  code?: unknown;
  success?: unknown;
  status?: unknown;
  expectedField?: unknown;
  error?:
    | string
    | {
        message?: unknown;
        messageAr?: unknown;
        messageKey?: unknown;
        code?: unknown;
        details?: unknown;
      };
};

type ApiErrorLike = {
  response?: {
    status?: number;
    data?: ApiErrorData;
  };
  message?: unknown;
  code?: unknown;
  status?: unknown;
};

const isApiErrorLike = (error: unknown): error is ApiErrorLike =>
  typeof error === "object" && error !== null;

export interface ParsedApiError {
  status?: number;
  message: string;
  code?: string;
  details?: unknown;
  expectedField?: string;
}

const ERROR_CODE_MESSAGES_AR: Record<string, string> = {
  BALANCE_INTEGRITY_ERROR:
    "رصيد الاشتراك غير متوازن، وتم إيقاف الخصم لحماية بيانات العميل حتى تتم مراجعة السجل.",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const readDetailsMessage = (details: unknown): string | undefined => {
  if (typeof details === "string" && details.trim()) return details.trim();
  if (!isRecord(details)) return undefined;

  return (
    readString(details.messageAr) ??
    readString(details.message) ??
    readString(details.error) ??
    readString(details.reason)
  );
};

export function parseApiError(error: unknown): ParsedApiError {
  const apiError = isApiErrorLike(error) ? error : {};
  const responseStatus = apiError.response?.status;
  const data: ApiErrorData = apiError.response?.data ?? {
    message: apiError.message,
    code: apiError.code,
    status: apiError.status,
  };
  const errorNode =
    data?.error && typeof data.error !== "string" ? data.error : undefined;
  const errorCode =
    readString(errorNode?.code) ??
    readString(data?.code) ??
    readString(apiError.code);
  const details = errorNode?.details;
  const expectedField = readString(data?.expectedField);
  const codeMessage = errorCode ? ERROR_CODE_MESSAGES_AR[errorCode] : undefined;

  const message =
    readString(data?.messageAr) ??
    codeMessage ??
    readString(data?.message) ??
    (typeof data?.error === "string" ? data.error : undefined) ??
    readString(errorNode?.messageAr) ??
    readString(errorNode?.message) ??
    readString(errorNode?.messageKey) ??
    readDetailsMessage(details) ??
    (expectedField ? `Expected field: ${expectedField}` : undefined) ??
    errorCode ??
    readString(apiError.message) ??
    "Unexpected error";

  return {
    status: responseStatus,
    message,
    code: errorCode,
    details,
    expectedField,
  };
}

export function getApiErrorMessage(error: unknown): string {
  return parseApiError(error).message;
}
