"""One-time source migration for removing legacy credential-like fixtures.

The script is intentionally exact-string based. It fails when the expected
legacy source is not present, preventing an accidental broad rewrite.
"""

from __future__ import annotations

from pathlib import Path


def replace_exact(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"Expected legacy block was not found in {path}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_exact(
    "ui/server/storage.ts",
    '''  // CEO password: phone number 8193195117, hashed with SHA-256 + salt 'homeforai_ceo_salt_2026'\n  // Pre-computed hash (phone + salt): do NOT log or expose this value\n  // NOTE: Replace with bcrypt in production: bcrypt.hashSync(phone, 12)\n  // CEO: Change this credential immediately before going live\n  // TODO: Replace 2FA with Apple Push Notification + DeviceCheck API for real iOS-linked auth\n  const passwordHash = "98df1db92418c37e595c2dcec5a6226c0dd69e8c2aedec3aff0f15d623d2302a";\n\n  const ceoDefaults: InsertCeoSetting[] = [\n    { key: "ceo_password_hash", value: passwordHash },\n    { key: "ceo_salt", value: "homeforai_ceo_salt_2026" },\n    { key: "ceo_2fa_code", value: "847291" }, // TODO: Replace with Apple Push Notification + DeviceCheck API in production\n''',
    '''  // Fail closed. Privileged access is unavailable until deployment secrets\n  // are supplied. Never derive these values from a phone number or commit them.\n  const passwordHash = process.env.CEO_PASSWORD_HASH ?? "";\n  const authSalt = process.env.CEO_AUTH_SALT ?? "";\n  const twoFactorCode = process.env.CEO_2FA_CODE ?? "";\n\n  const ceoDefaults: InsertCeoSetting[] = [\n    { key: "ceo_password_hash", value: passwordHash },\n    { key: "ceo_salt", value: authSalt },\n    { key: "ceo_2fa_code", value: twoFactorCode },\n''',
)

replace_exact(
    "gateway/api/routes.go",
    '''func loginHandler(cfg *config.Config) fiber.Handler {\n\treturn func(c *fiber.Ctx) error {\n\t\t// Stub: in production, validate credentials against the Python backend,\n\t\t// then issue a signed JWT.\n\t\treturn c.JSON(fiber.Map{\n\t\t\t"message": "login endpoint — implement credential validation against Python backend",\n\t\t\t"token":   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.stub",\n\t\t})\n\t}\n}\n''',
    '''func loginHandler(cfg *config.Config) fiber.Handler {\n\treturn func(c *fiber.Ctx) error {\n\t\t// The Go gateway must never manufacture authentication tokens. Until it\n\t\t// delegates to the validated Python auth service, fail explicitly.\n\t\treturn c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{\n\t\t\t"error": "gateway login is not implemented; use the Python auth service",\n\t\t})\n\t}\n}\n''',
)

print("Removed current-source credential fixtures and token-shaped stubs.")
