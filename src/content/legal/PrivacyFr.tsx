import { Fill, List, P, Section, Strong, Table } from "@/components/legal/LegalParts";

/**
 * Politique de confidentialité (nLPD) — version française (fait foi).
 * Les durées reprennent celles appliquées par le site (table
 * DataRetentionPolicy, src/modules/retention) : à tenir à jour ensemble.
 */
export function PrivacyFr() {
  return (
    <>
      <Section title="1. Qui est responsable de vos données">
        <P>
          Le responsable du traitement est <Fill field="name" label="nom ou raison sociale" />,{" "}
          <Fill field="address" label="adresse postale" />. Pour toute question sur vos données ou pour exercer vos
          droits : <Fill field="email" label="adresse e-mail de contact" />.
        </P>
        <P>
          Nous appliquons la loi fédérale sur la protection des données (nLPD). Nos principes : ne collecter que le
          strict nécessaire, ne jamais vendre vos données, aucune publicité et aucun outil de mesure
          d&apos;audience ou de suivi.
        </P>
      </Section>

      <Section title="2. Si vous consultez le site">
        <List>
          <li>
            <Strong>Cookies strictement nécessaires uniquement</Strong> : confirmation de votre majorité (
            <code>vg_adult</code>, 90 jours), langue choisie (<code>NEXT_LOCALE</code>), sécurité des formulaires (
            <code>aprost_csrf</code>, jusqu&apos;à la fermeture du navigateur). Aucun cookie publicitaire ni de
            mesure d&apos;audience.
          </li>
          <li>
            <Strong>Affichage d&apos;un contact</Strong> : pour limiter les abus, nous enregistrons une empreinte
            irréversible de votre adresse IP (jamais l&apos;adresse elle-même), supprimée après 30 jours.
          </li>
          <li>
            <Strong>Signalement d&apos;une annonce</Strong> : nous enregistrons le motif et le texte que vous
            choisissez d&apos;écrire. Aucune identité n&apos;est demandée.
          </li>
          <li>
            <Strong>Journaux techniques</Strong> : l&apos;hébergeur enregistre les requêtes reçues (adresse IP,
            date, page demandée) pour la sécurité du site, conservées{" "}
            <Fill field="serverLogRetention" label="durée de conservation des journaux" />.
          </li>
          <li>
            <Strong>Carte</Strong> : le fond de carte est chargé depuis le service OpenFreeMap
            (tiles.openfreemap.org) ; votre navigateur s&apos;y connecte et ce service reçoit donc votre adresse
            IP.
          </li>
        </List>
      </Section>

      <Section title="3. Si vous publiez une annonce">
        <List>
          <li>
            <Strong>Compte</Strong> : adresse e-mail, mot de passe (enregistré uniquement sous forme chiffrée
            irréversible), dates de connexion, cookie de connexion (<code>aprost_session</code>, 30 jours).
          </li>
          <li>
            <Strong>Annonce</Strong> (publique une fois validée) : pseudonyme, âge, ville (jamais l&apos;adresse
            exacte), catégorie, langues, caractéristiques et prestations que vous choisissez d&apos;indiquer,
            tarifs, disponibilités et photos. Les informations cachées des photos (position GPS, appareil, date)
            sont supprimées dès l&apos;envoi.
          </li>
          <li>
            <Strong>Coordonnées</Strong> (téléphone, e-mail, WhatsApp, Instagram) : affichées seulement quand un
            visiteur clique sur « Afficher le contact », jamais présentes dans le code de la page.
          </li>
          <li>
            <Strong>Vérification de l&apos;âge</Strong> : pièce d&apos;identité (et permis de travail le cas
            échéant), chiffrée, consultable uniquement par l&apos;administration du site et supprimée dès la
            décision, au plus tard après 30 jours. Seul le résultat est conservé : majeure oui/non, type de
            document, pays émetteur et date.
          </li>
          <li>
            <Strong>Attestations</Strong> faites à l&apos;inscription (majorité, libre volonté, autorisation de
            travailler, annonce cantonale) et leur date.
          </li>
          <li>
            <Strong>Abonnement</Strong> : statut et dates d&apos;échéance. Aucun montant ni donnée bancaire
            n&apos;est enregistré.
          </li>
        </List>
        <P>
          <Strong>Données sensibles.</Strong> Votre présence sur l&apos;annuaire peut révéler des informations sur
          votre vie sexuelle, que la loi considère comme des données sensibles. Nous ne les traitons qu&apos;avec
          votre consentement exprès, donné lors de l&apos;inscription, et uniquement pour publier et gérer votre
          annonce. Vous pouvez retirer ce consentement à tout moment en supprimant votre compte depuis votre
          tableau de bord : votre annonce disparaît immédiatement et vos données sont effacées.
        </P>
      </Section>

      <Section title="4. À quoi servent vos données">
        <List>
          <li>publier les annonces et permettre aux visiteurs de contacter les annonceuses ;</li>
          <li>vérifier la majorité des annonceuses et relire les annonces avant publication ;</li>
          <li>traiter les signalements ;</li>
          <li>gérer l&apos;abonnement des annonceuses ;</li>
          <li>protéger le site contre les abus (inscriptions en masse, aspiration des contacts, attaques).</li>
        </List>
      </Section>

      <Section title="5. Qui y a accès">
        <P>
          Vos données ne sont ni vendues, ni louées, ni partagées à des fins publicitaires. Y ont accès :
          l&apos;administration du site, notre hébergeur (<Fill field="host" label="nom et pays de l'hébergeur" />)
          qui stocke les données pour notre compte, notre service d&apos;envoi d&apos;e-mails (
          <Fill field="emailProvider" label="nom et pays du service d'e-mail" />) pour les seuls e-mails
          nécessaires (lien « mot de passe oublié »), et les autorités lorsque la loi nous y oblige.
        </P>
        <P>
          Si des données devaient être hébergées hors de Suisse, ce serait uniquement dans un pays offrant un
          niveau de protection reconnu comme adéquat par le Conseil fédéral, ou avec les garanties prévues par la
          loi.
        </P>
      </Section>

      <Section title="6. Combien de temps nous les gardons">
        <Table
          head={["Donnée", "Durée de conservation"]}
          rows={[
            ["Pièce d'identité, permis de travail", "Supprimés à la décision, au plus tard après 30 jours"],
            ["Résultat de la vérification de l'âge", "2 ans (preuve du contrôle effectué)"],
            ["Photo refusée en modération", "30 jours"],
            ["Empreinte d'IP liée à l'affichage d'un contact", "30 jours"],
            ["Empreinte d'IP liée à une connexion ou à l'attestation", "90 jours"],
            ["Session de connexion", "30 jours (12 heures pour l'administration)"],
            ["Lien « mot de passe oublié »", "1 heure, supprimé après usage"],
            ["Compte, annonce et attestations", "Jusqu'à la suppression du compte"],
          ]}
        />
      </Section>

      <Section title="7. Comment nous les protégeons">
        <P>
          Connexion chiffrée (HTTPS), pièces d&apos;identité chiffrées, mots de passe jamais enregistrés en clair,
          adresses IP jamais enregistrées en clair, accès à l&apos;administration réservé et décisions
          journalisées, suppression automatique des données arrivées en fin de durée de conservation.
        </P>
      </Section>

      <Section title="8. Vos droits">
        <P>
          Vous pouvez à tout moment demander à consulter vos données, les faire corriger ou supprimer, en recevoir
          une copie dans un format courant, vous opposer à un traitement ou retirer votre consentement, en écrivant
          à <Fill field="email" label="adresse e-mail de contact" />. Les annonceuses peuvent aussi corriger leur
          annonce et supprimer leur compte elles-mêmes depuis leur tableau de bord. Nous répondons dans un délai de
          30 jours. Vous pouvez aussi vous adresser au Préposé fédéral à la protection des données et à la
          transparence (PFPDT, www.edoeb.admin.ch).
        </P>
      </Section>

      <Section title="9. Modifications">
        <P>
          Nous adaptons cette politique quand le site évolue. La date de la version en vigueur figure en haut de
          cette page.
        </P>
      </Section>
    </>
  );
}
