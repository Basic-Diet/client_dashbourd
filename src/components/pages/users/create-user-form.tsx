import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import { AlertTriangleIcon, Loader2 } from "lucide-react";

import { ToastMessage } from "@/components/global/ToastMessage";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import useCreateUserForm from "@/hooks/useCreateUserForm";
import { useCreateAdminCustomerMutation } from "@/hooks/useUsersQuery";
import type { CreateUserSchemaType } from "@/lib/validations/createUserSchema";
import { getCreateCustomerErrorMessage } from "@/utils/getCreateCustomerErrorMessage";
import { normalizeSaudiPhoneInput } from "@/utils/saudiPhoneInput";
import type { CredentialsDialogData } from "./temporary-credentials-dialog";
import { TemporaryCredentialsDialog } from "./temporary-credentials-dialog";

const malformedCreateCredentialsMessage =
  "تم إنشاء الحساب، ولكن تعذر عرض بيانات الدخول المؤقتة. تحقق من حالة المستخدم قبل محاولة إنشاء الحساب مرة أخرى.";

export function CreateUserForm() {
  const [credentials, setCredentials] = useState<CredentialsDialogData | null>(
    null
  );
  const [malformedSuccessOpen, setMalformedSuccessOpen] = useState(false);
  const [isSubmitLocked, setIsSubmitLocked] = useState(false);
  const allowNavigationRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useCreateUserForm();

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const createCustomer = useCreateAdminCustomerMutation();
  const resetCreateCustomerMutation = createCustomer.reset;
  const isActive = watch("isActive");
  const phoneValue = watch("phoneE164");
  const phoneRegistration = register("phoneE164");
  const isCreating = createCustomer.isPending || isSubmitLocked;
  const protectedState =
    isCreating || Boolean(credentials) || malformedSuccessOpen;

  useBlocker({
    disabled: !protectedState,
    enableBeforeUnload: false,
    shouldBlockFn: () => protectedState && !allowNavigationRef.current,
  });

  function closeCredentials() {
    allowNavigationRef.current = true;
    setCredentials(null);
    resetCreateCustomerMutation();
    queryClient.invalidateQueries({ queryKey: ["users"] });
    navigate({ to: "/users" });
  }

  function closeMalformedSuccess() {
    allowNavigationRef.current = true;
    setMalformedSuccessOpen(false);
    resetCreateCustomerMutation();
    queryClient.invalidateQueries({ queryKey: ["users"] });
    navigate({ to: "/users" });
  }

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!protectedState || allowNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [protectedState]);

  useEffect(() => {
    return () => {
      setCredentials(null);
      setMalformedSuccessOpen(false);
      requestInFlightRef.current = false;
      allowNavigationRef.current = false;
      resetCreateCustomerMutation();
    };
  }, [resetCreateCustomerMutation]);

  function submitCreate(data: CreateUserSchemaType) {
    createCustomer.mutate(
      {
        fullName: data.fullName.trim(),
        phone: data.phoneE164,
        email: data.email?.trim() || undefined,
        temporaryPassword: data.temporaryPassword?.trim() || undefined,
        isActive: data.isActive,
      },
      {
        onSuccess: (result) => {
          const temp = result.temporaryCredentials;
          const phoneE164 = result.user.phoneE164 || result.user.phone;
          if (!temp.temporaryPassword || !temp.expiresAt || !phoneE164) {
            resetCreateCustomerMutation();
            setMalformedSuccessOpen(true);
            return;
          }
          setCredentials({
            title: "تم إنشاء المستخدم",
            customerName: result.user.fullName,
            phoneE164,
            temporaryPassword: temp.temporaryPassword,
            expiresAt: temp.expiresAt,
            isActive: result.user.isActive,
          });
          resetCreateCustomerMutation();
        },
        onError: (error) => {
          ToastMessage(getCreateCustomerErrorMessage(error), "error");
        },
        onSettled: () => {
          requestInFlightRef.current = false;
          setIsSubmitLocked(false);
        },
      }
    );
  }

  function handleGuardedSubmit(event: FormEvent<HTMLFormElement>) {
    if (requestInFlightRef.current || isCreating) {
      event.preventDefault();
      return;
    }

    const submit = handleSubmit((data) => {
      if (requestInFlightRef.current) return;
      requestInFlightRef.current = true;
      setIsSubmitLocked(true);
      submitCreate(data);
    });
    void submit(event);
  }

  return (
    <div className="mx-auto w-full max-w-2xl" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>إضافة مستخدم جديد</CardTitle>
          <CardDescription>
            أدخل بيانات العميل. سيُنشئ الخادم كلمة مرور مؤقتة آمنة تظهر مرة
            واحدة بعد الحفظ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGuardedSubmit} aria-busy={isCreating}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="fullName">الاسم الكامل</FieldLabel>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="أدخل الاسم الكامل"
                  disabled={isCreating}
                  {...register("fullName")}
                  aria-invalid={errors.fullName ? "true" : "false"}
                />
                {errors.fullName ? (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.fullName.message}
                  </p>
                ) : null}
              </Field>

              <Field>
                <FieldLabel htmlFor="phoneE164">رقم الجوال</FieldLabel>
                <Input
                  id="phoneE164"
                  type="tel"
                  dir="ltr"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="+966566796659"
                  maxLength={13}
                  disabled={isCreating}
                  name={phoneRegistration.name}
                  ref={phoneRegistration.ref}
                  onBlur={phoneRegistration.onBlur}
                  value={phoneValue}
                  onFocus={(event) => {
                    const end = event.currentTarget.value.length;
                    event.currentTarget.setSelectionRange(end, end);
                  }}
                  onChange={(event) => {
                    setValue(
                      "phoneE164",
                      normalizeSaudiPhoneInput(event.target.value),
                      {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: Boolean(errors.phoneE164),
                      }
                    );
                  }}
                  aria-invalid={errors.phoneE164 ? "true" : "false"}
                  aria-describedby="phoneE164-help"
                  className="text-left font-mono"
                />
                {errors.phoneE164 ? (
                  <p className="mt-1 text-sm text-destructive" role="alert">
                    {errors.phoneE164.message}
                  </p>
                ) : (
                  <p
                    id="phoneE164-help"
                    className="mt-1 text-xs text-muted-foreground"
                  >
                    اكتب رقم الجوال كاملًا بهذا الشكل: +966566796659. رمز الدولة
                    +966 محفوظ تلقائيًا ولا يمكن حذفه.
                  </p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="email">البريد الإلكتروني (اختياري)</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  placeholder="user@example.com"
                  disabled={isCreating}
                  {...register("email")}
                  aria-invalid={errors.email ? "true" : "false"}
                  className="text-left"
                />
                {errors.email ? (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.email.message}
                  </p>
                ) : null}
              </Field>

              <Field>
                <FieldLabel htmlFor="temporaryPassword">
                  كلمة مرور مؤقتة (اختياري)
                </FieldLabel>
                <Input
                  id="temporaryPassword"
                  type="password"
                  dir="ltr"
                  placeholder="Customer12345"
                  disabled={isCreating}
                  {...register("temporaryPassword")}
                  aria-invalid={errors.temporaryPassword ? "true" : "false"}
                  aria-describedby="temporaryPassword-help"
                  className="text-left"
                />
                {errors.temporaryPassword ? (
                  <p className="mt-1 text-sm text-destructive" role="alert">
                    {errors.temporaryPassword.message}
                  </p>
                ) : (
                  <p
                    id="temporaryPassword-help"
                    className="mt-1 text-xs text-muted-foreground"
                  >
                    اتركها فارغة ليولّد الخادم كلمة مرور، أو استخدم حرفًا كبيرًا
                    وحرفًا صغيرًا ورقمًا على الأقل.
                  </p>
                )}
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="isActive">حالة الحساب</FieldLabel>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {isActive ? "نشط" : "غير نشط"}
                    </span>
                    <Switch
                      id="isActive"
                      checked={isActive}
                      disabled={isCreating}
                      onCheckedChange={(checked) =>
                        setValue("isActive", checked, { shouldDirty: true })
                      }
                    />
                  </div>
                </div>
              </Field>

              <Field>
                <Button
                  type="submit"
                  disabled={isCreating}
                  aria-disabled={isCreating}
                  className="w-full"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري إنشاء المستخدم...
                    </>
                  ) : (
                    "إنشاء المستخدم"
                  )}
                </Button>
                {isCreating ? (
                  <p
                    className="mt-2 text-center text-xs text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    يتم الآن التحقق من البيانات وإنشاء بيانات الدخول الآمنة. لا
                    تغلق الصفحة.
                  </p>
                ) : null}
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <TemporaryCredentialsDialog
        credentials={credentials}
        onClose={closeCredentials}
      />

      <Dialog open={malformedSuccessOpen}>
        <DialogContent
          dir="rtl"
          showCloseButton={false}
          className="max-w-md"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="size-5 text-amber-600" />
              تعذر عرض بيانات الدخول المؤقتة
            </DialogTitle>
            <DialogDescription>{malformedCreateCredentialsMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button type="button" onClick={closeMalformedSuccess}>
              تم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
