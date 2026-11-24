import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Envoi des e-mails du site (mot de passe oublié…).
 *
 * Deux pilotes, choisis par EMAIL_DRIVER (sinon : « smtp » si SMTP_HOST est
 * défini, « outbox » sinon) :
 * - smtp   : envoi réel via le serveur SMTP configuré (production) ;
 * - outbox : AUCUN envoi ; l'e-mail est rangé dans la boîte d'envoi de test,
 *            lisible par l'admin dans /admin/outbox et purgée après 24 h.
 *            Pour tester en local sans serveur d'e-mail.
 *
 * Les adresses et contenus ne sont jamais écrits dans les journaux.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export type EmailDriver = "smtp" | "outbox";

const OUTBOX_RETENTION_MS = 24 * 60 * 60 * 1000;

export function getEmailDriver(): EmailDriver {
  const configured = process.env.EMAIL_DRIVER;
  if (configured === "smtp" || configured === "outbox") return configured;
  return process.env.SMTP_HOST ? "smtp" : "outbox";
}

let transport: Transporter | null = null;

function getTransport(): Transporter {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // 465 = TLS direct ; 587 = STARTTLS (exigé).
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      requireTLS: port !== 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
  }
  return transport;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const driver = getEmailDriver();

  if (driver === "outbox") {
    if (process.env.NODE_ENV === "production") {
      // Signalé à chaque envoi : en ligne, configurez un serveur SMTP.
      logger.warn("email.outbox_mode", {
        hint: "Aucun serveur SMTP configuré : e-mail rangé dans /admin/outbox.",
      });
    }
    await prisma.outboxEmail.create({
      data: {
        recipient: message.to,
        subject: message.subject,
        body: message.text,
        purgeAt: new Date(Date.now() + OUTBOX_RETENTION_MS),
      },
    });
    return;
  }

  await getTransport().sendMail({
    from: process.env.SMTP_FROM ?? "VelvetGirl <no-reply@localhost>",
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
}
