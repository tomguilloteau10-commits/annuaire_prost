"use strict";

// Règle de lint qui matérialise ENGINEERING_RULES.md §5 : téléphone, email,
// adresse exacte et date de naissance ne doivent jamais transiter dans un
// appel de log (console.* ou notre logger applicatif), que ce soit comme
// clé littérale d'un objet ou comme accès de propriété passé en argument.
//
// Elle ne remplace pas le logger avec redaction (src/lib/logger.ts), elle
// attrape les usages qui le contournent (console.log direct, template
// literal contenant field.phone, etc.) au moment de la revue de code / CI.

const SENSITIVE_KEY_PATTERN =
  /^(phone|phoneNumber|email|address|street|dateOfBirth|birthDate|dob|documentNumber|documentImage|idDocumentImage|selfieImage|biometricData|ip)$/i;

const LOGGING_CALLEES = new Set([
  "log",
  "info",
  "warn",
  "error",
  "debug",
  "trace",
]);

function isLoggingCall(node) {
  const callee = node.callee;
  if (callee.type !== "MemberExpression") return false;
  const objectName =
    callee.object.type === "Identifier" ? callee.object.name : null;
  const propertyName =
    callee.property.type === "Identifier" ? callee.property.name : null;
  if (!propertyName || !LOGGING_CALLEES.has(propertyName)) return false;
  return objectName === "console" || objectName === "logger";
}

function checkObjectExpression(node, context) {
  for (const prop of node.properties) {
    if (prop.type !== "Property") continue;
    const keyName =
      prop.key.type === "Identifier"
        ? prop.key.name
        : prop.key.type === "Literal"
          ? String(prop.key.value)
          : null;
    if (keyName && SENSITIVE_KEY_PATTERN.test(keyName)) {
      context.report({
        node: prop,
        messageId: "sensitiveField",
        data: { field: keyName },
      });
    }
  }
}

function checkMemberExpressionArg(node, context) {
  if (
    node.property.type === "Identifier" &&
    SENSITIVE_KEY_PATTERN.test(node.property.name)
  ) {
    context.report({
      node,
      messageId: "sensitiveField",
      data: { field: node.property.name },
    });
  }
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Interdit de logger des champs sensibles (téléphone, email, adresse, date de naissance, documents).",
    },
    schema: [],
    messages: {
      sensitiveField:
        "Champ potentiellement sensible '{{field}}' détecté dans un appel de log — voir ENGINEERING_RULES.md §5. Utilisez le logger avec redaction (src/lib/logger.ts) ou retirez ce champ.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isLoggingCall(node)) return;
        for (const arg of node.arguments) {
          if (arg.type === "ObjectExpression") {
            checkObjectExpression(arg, context);
          }
          if (arg.type === "MemberExpression") {
            checkMemberExpressionArg(arg, context);
          }
        }
      },
    };
  },
};
