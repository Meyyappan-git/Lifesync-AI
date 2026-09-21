import { validateSameOriginRedirect } from "@/lib/api/client";
import { registerSchema, passwordPolicy } from "@/lib/validation/auth";

describe("Frontend Auth Validation Tests", () => {
  test("validateSameOriginRedirect accepts safe relative paths", () => {
    expect(validateSameOriginRedirect("/dashboard")).toBe("/dashboard");
    expect(validateSameOriginRedirect("/settings/security")).toBe("/settings/security");
    expect(validateSameOriginRedirect("/dashboard/document/123")).toBe("/dashboard/document/123");
  });

  test("validateSameOriginRedirect rejects external URLs and open redirects", () => {
    expect(validateSameOriginRedirect("https://evil.com")).toBe("/dashboard");
    expect(validateSameOriginRedirect("//evil.com")).toBe("/dashboard");
    expect(validateSameOriginRedirect("/\\evil.com")).toBe("/dashboard");
    expect(validateSameOriginRedirect("http://attacker.com")).toBe("/dashboard");
    expect(validateSameOriginRedirect(null)).toBe("/dashboard");
  });

  test("Password policy enforces min 10 chars, letter, number, and no email username", () => {
    const valid = passwordPolicy.safeParse("SecurePass123!");
    expect(valid.success).toBe(true);

    const tooShort = passwordPolicy.safeParse("Pass1!");
    expect(tooShort.success).toBe(false);

    const noNumber = passwordPolicy.safeParse("SecurePassword!");
    expect(noNumber.success).toBe(false);

    const regWithEmailInPwd = registerSchema.safeParse({
      full_name: "John Doe",
      email: "johndoe@example.com",
      password: "johndoe123456",
      confirm_password: "johndoe123456",
    });
    expect(regWithEmailInPwd.success).toBe(false);
  });
});
