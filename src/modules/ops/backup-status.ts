import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * État des sauvegardes automatiques (service « backup », production) : le
 * service écrit la date de la dernière réussite (et du dernier échec) dans
 * ./backups, monté en lecture seule dans l'application. Sans ce dossier
 * (ordinateur local), aucune sauvegarde automatique n'est configurée.
 */
export interface BackupStatus {
  configured: boolean;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  /** Aucune sauvegarde réussie depuis plus de 26 heures, ou échec plus récent. */
  needsAttention: boolean;
}

const STALE_AFTER_MS = 26 * 60 * 60 * 1000;

async function readDate(file: string): Promise<Date | null> {
  try {
    const value = new Date((await readFile(file, "utf8")).trim());
    return Number.isNaN(value.getTime()) ? null : value;
  } catch {
    return null;
  }
}

export async function getBackupStatus(now: Date = new Date()): Promise<BackupStatus> {
  const dir = process.env.BACKUP_STATUS_DIR ?? "/app/backup-status";
  const [lastSuccess, lastFailure] = await Promise.all([
    readDate(path.join(dir, "last-success.txt")),
    readDate(path.join(dir, "last-failure.txt")),
  ]);
  const configured = existsSync(dir);
  const stale = !lastSuccess || now.getTime() - lastSuccess.getTime() > STALE_AFTER_MS;
  const failedSince = lastFailure !== null && (!lastSuccess || lastFailure > lastSuccess);
  return { configured, lastSuccess, lastFailure, needsAttention: configured && (stale || failedSince) };
}
