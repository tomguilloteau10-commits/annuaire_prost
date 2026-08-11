import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/logger";

// ENGINEERING_RULES.md §5 : téléphone, email, adresse et autres champs
// sensibles n'apparaissent jamais dans les logs — même imbriqués, même si
// l'appelant les passe par erreur.

describe("invariant: le logger applicatif masque toujours les champs sensibles", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("masque phone/email/password/token, y compris imbriqués", () => {
    // Volontaire sur tout ce bloc : ce test prouve que logger.* masque bien
    // ces champs, il doit donc les passer explicitement.
    /* eslint-disable local-rules/no-sensitive-log-fields */
    logger.info("test.invariant", {
      phone: "+41 79 111 11 11",
      nested: {
        email: "sensitive@example.test",
        passwordHash: "should-never-appear",
        deeper: { token: "opaque-secret-token" },
      },
      safeField: "ceci peut rester",
    });
    /* eslint-enable local-rules/no-sensitive-log-fields */

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const output = infoSpy.mock.calls[0]?.[0] as string;

    expect(output).not.toContain("+41 79 111 11 11");
    expect(output).not.toContain("sensitive@example.test");
    expect(output).not.toContain("should-never-appear");
    expect(output).not.toContain("opaque-secret-token");
    expect(output).toContain("ceci peut rester");
    expect(output).toContain("[redacted]");
  });

  it("masque les champs sensibles à l'intérieur d'un tableau", () => {
    logger.warn("test.invariant.array", {
      items: [{ email: "a@example.test" }, { email: "b@example.test" }],
    });

    const output = warnSpy.mock.calls[0]?.[0] as string;
    expect(output).not.toContain("a@example.test");
    expect(output).not.toContain("b@example.test");
  });
});
