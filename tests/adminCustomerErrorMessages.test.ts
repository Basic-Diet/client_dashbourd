import { describe, expect, it } from "vitest";

import createUserSchema from "../src/lib/validations/createUserSchema";
import { getCreateCustomerErrorMessage } from "../src/utils/getCreateCustomerErrorMessage";

describe("admin customer create feedback", () => {
  it("explains the Backend WEAK_PASSWORD response", () => {
    expect(
      getCreateCustomerErrorMessage({
        response: {
          status: 400,
          data: {
            ok: false,
            error: {
              code: "WEAK_PASSWORD",
              message:
                "Temporary password must include uppercase, lowercase, and a digit",
            },
          },
        },
      })
    ).toBe(
      "كلمة المرور المؤقتة ضعيفة: يجب أن تحتوي على حرف إنجليزي كبير وحرف إنجليزي صغير ورقم."
    );
  });

  it("preserves a clear Backend validation message when there is no dedicated mapping", () => {
    expect(
      getCreateCustomerErrorMessage({
        response: {
          status: 422,
          data: {
            error: {
              code: "CUSTOM_RULE",
              message: "The selected customer state is not allowed",
            },
          },
        },
      })
    ).toBe("The selected customer state is not allowed");
  });

  it("rejects the reported weak password before making a request", () => {
    const result = createUserSchema.safeParse({
      fullName: "Mohamed Mahmoud",
      phoneE164: "511111122",
      email: "test@gmail.com",
      temporaryPassword: "test12345",
      isActive: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.temporaryPassword?.[0]).toContain(
        "حرف إنجليزي كبير"
      );
    }
  });

  it("accepts a strong temporary password and normalizes the Saudi phone", () => {
    const result = createUserSchema.safeParse({
      fullName: "Mohamed Mahmoud",
      phoneE164: "511111122",
      email: "test@gmail.com",
      temporaryPassword: "Test12345",
      isActive: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phoneE164).toBe("+966511111122");
    }
  });
});
