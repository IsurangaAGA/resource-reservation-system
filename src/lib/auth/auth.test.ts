import { describe, expect, it } from "vitest";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "./password";
import { safeNextPath } from "./redirect";

describe("password hashing", () => {
  it("verifies the right password and rejects the wrong one", async () => {
    const hash = await hashPassword("Correct-horse-1");
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(await verifyPassword("Correct-horse-1", hash)).toBe(true);
    expect(await verifyPassword("correct-horse-1", hash)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same-password-1")).not.toBe(await hashPassword("same-password-1"));
  });

  it("treats malformed hashes as a failed check", async () => {
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
  });

  it("dummy verification always fails", async () => {
    expect(await verifyAgainstDummy("dummy-password-for-timing")).toBe(false);
  });
});

describe("safeNextPath (open-redirect protection)", () => {
  it.each([
    ["/reservations?scope=past", "/reservations?scope=past"],
    ["/resources/abc", "/resources/abc"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
    ["/login", "/"],
    ["", "/"],
    [undefined, "/"],
  ])("%s → %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
