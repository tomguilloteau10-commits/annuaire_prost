import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { getBackupStatus } from "@/modules/ops/backup-status";

describe("état des sauvegardes affiché dans l'admin", () => {
  let dir = "";
  const now = new Date("2026-11-24T12:00:00Z");
  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), "backup-status-"));
    process.env.BACKUP_STATUS_DIR = dir;
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
    delete process.env.BACKUP_STATUS_DIR;
  });

  it("rien à signaler sans sauvegardes configurées (ordinateur local)", async () => {
    process.env.BACKUP_STATUS_DIR = path.join(dir, "absent");
    expect(await getBackupStatus(now)).toMatchObject({ configured: false, needsAttention: false });
    process.env.BACKUP_STATUS_DIR = dir;
  });

  it("alerte tant qu'aucune sauvegarde n'a réussi", async () => {
    expect(await getBackupStatus(now)).toMatchObject({
      configured: true,
      needsAttention: true,
      lastSuccess: null,
    });
  });

  it("tout va bien avec une sauvegarde de moins de 26 heures", async () => {
    writeFileSync(path.join(dir, "last-success.txt"), "2026-11-24T03:30:05+01:00\n");
    const status = await getBackupStatus(now);
    expect(status.needsAttention).toBe(false);
    expect(status.lastSuccess?.toISOString()).toBe("2026-11-24T02:30:05.000Z");
  });

  it("alerte si la dernière réussite date de plus de 26 heures", async () => {
    expect((await getBackupStatus(new Date("2026-11-25T08:00:00Z"))).needsAttention).toBe(true);
  });

  it("alerte si un échec est plus récent que la dernière réussite", async () => {
    writeFileSync(path.join(dir, "last-failure.txt"), "2026-11-24T10:00:00+01:00\n");
    expect((await getBackupStatus(now)).needsAttention).toBe(true);
  });
});
