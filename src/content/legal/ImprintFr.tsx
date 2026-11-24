import { Link } from "@/i18n/navigation";
import { Fill, P, Section, Strong } from "@/components/legal/LegalParts";

const linkClass = "text-accent underline-offset-4 hover:underline";

/** Mentions légales — version française (fait foi). */
export function ImprintFr() {
  return (
    <>
      <Section title="Exploitant du site">
        <P>
          <Fill field="name" label="nom ou raison sociale" />
          <br />
          <Fill field="address" label="adresse postale" />
          <br />
          E-mail : <Fill field="email" label="adresse e-mail de contact" />
          <br />
          Numéro IDE : <Fill field="uid" label="numéro IDE, ou mention « non inscrit au registre du commerce »" />
          <br />
          Responsable du contenu : <Fill field="responsible" label="nom de la personne responsable" />
        </P>
      </Section>

      <Section title="Hébergement">
        <P>
          <Fill field="host" label="nom, ville et pays de l'hébergeur" />
        </P>
      </Section>

      <Section title="Nature du service">
        <P>
          VelvetGirl est un annuaire d&apos;annonces publiées par des personnes majeures exerçant de manière
          indépendante. Le site n&apos;est <Strong>pas une agence</Strong> : il n&apos;organise aucune rencontre,
          ne perçoit aucune commission et n&apos;encaisse aucun paiement de prestation. Les conditions complètes
          figurent dans les{" "}
          <Link href="/legal/terms" className={linkClass}>
            conditions d&apos;utilisation
          </Link>
          .
        </P>
      </Section>

      <Section title="Contenu des annonces">
        <P>
          Les annonces sont rédigées par les annonceuses, sous leur propre responsabilité, puis relues avant
          publication. Pour signaler un contenu, utilisez le lien « Signaler » présent sur chaque annonce, ou
          écrivez à <Fill field="email" label="adresse e-mail de contact" />.
        </P>
      </Section>

      <Section title="Propriété intellectuelle">
        <P>
          Les photos et textes des annonces appartiennent à leurs autrices. Toute reproduction, en particulier des
          photos, est interdite sans leur accord.
        </P>
      </Section>

      <Section title="Données personnelles">
        <P>
          Voir la{" "}
          <Link href="/legal/privacy" className={linkClass}>
            politique de confidentialité
          </Link>
          .
        </P>
      </Section>
    </>
  );
}
