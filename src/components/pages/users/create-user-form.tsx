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
import { getAdminCustomerErrorMessage } from "@/utils/fetchUsersData";
import type { CredentialsDialogData } from "./temporary-credentials-dialog";
import { TemporaryCredentialsDialog } from "./temporary-credentials-dialog";

const malformedCreateCredentialsMessage =
  "تم إنشاء الحساب، ولكن تعذر عرض بيانات الدخول المؤقتة. تحقق من حالة المستخدم قبل محاولة إنشاء الحساب مرة أخرى.";

export function CreateUserForm() {
  const [credentials, setCredentials] = useState<CredentialsDialogData | null>(
    null
  );
  const [malformedSuccessOpen, setMalformedSuccessOpen] = useState(false);
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
  const protectedState =
    createCustomer.isPending || Boolean(credentials) || malformedSuccessOpen;

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
          ToastMessage(getAdminCustomerErrorMessage(error), "error");
        },
        onSettled: () => {
          requestInFlightRef.current = false;
        },
      }
    );
  }

  function handleGuardedSubmit(event: FormEvent<HTMLFormElement>) {
    if (requestInFlightRef.current || createCustomer.isPending) {
      event.preventDefault();
      return;
    }

    const submit = handleSubmit((data) => {
      if (requestInFlightRef.current) return;
      requestInFlightRef.current = true;
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
          <form onSubmit={handleGuardedSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="fullName">الاسم الكامل</FieldLabel>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="أدخل الاسم الكامل"
                  disabled={createCustomer.isPending}
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
                  inputMode="tel"
                  placeholder="+9665XXXXXXXX"
                  disabled={createCustomer.isPending}
                  {...register("phoneE164")}
                  aria-invalid={errors.phoneE164 ? "true" : "false"}
                  className="text-left"
                />
                {errors.phoneE164 ? (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.phoneE164.message}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    استخدم الصيغة الدولية مثل +9665XXXXXXXX.
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
                  disabled={createCustomer.isPending}
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
                  placeholder="Customer@12345"
                  disabled={createCustomer.isPending}
                  {...register("temporaryPassword")}
                  aria-invalid={errors.temporaryPassword ? "true" : "false"}
                  className="text-left"
                />
                {errors.temporaryPassword ? (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.temporaryPassword.message}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    اتركه فارغاً ليولّد الخادم كلمة مرور مؤقتة.
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
                      disabled={createCustomer.isPending}
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
                  disabled={createCustomer.isPending}
                  className="w-full"
                >
                  {createCustomer.isPending ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري إنشاء المستخدم...
                    </>
                  ) : (
                    "إنشاء المستخدم"
                  )}
                </Button>
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
