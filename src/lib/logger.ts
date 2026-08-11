// Logger applicatif avec redaction obligatoire des champs sensibles
// (ENGINEERING_RULES.md §5). C'est la contrepartie *runtime* de la règle de
// lint eslint-rules/no-sensitive-log-fields.js : celle-ci attrape les logs
// directs à la revue de code, celui-ci protège les cas où une valeur
// sensible arrive par une variable dont le nom ne le laisse pas deviner.

const SENSITIVE_KEY_PATTERN =
  /^(phone|phoneNumber|email|address|street|dateOfBirth|birthDate|dob|documentNumber|documentImage|idDocumentImage|selfieImage|biometricData|password|passwordHash|token|tokenHash|twoFactorSecret)$/i;

const REDACTED = "[redacted]";

function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen));
  }

  const output: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      output[key] = REDACTED;
    } else {
      output[key] = redact(val, seen);
    }
  }
  return output;
}

type LogFields = Record<string, unknown> | undefined;

function emit(level: "info" | "warn" | "error" | "debug", message: string, fields?: LogFields) {
  const safeFields = fields ? redact(fields) : undefined;
  // eslint-disable-next-line no-console -- seul point autorisé à écrire sur console.*
  console[level](JSON.stringify({ level, message, ...( safeFields ? { fields: safeFields } : {} ), timestamp: new Date().toISOString() }));
}

export const logger = {
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields),
  debug: (message: string, fields?: LogFields) => emit("debug", message, fields),
};
