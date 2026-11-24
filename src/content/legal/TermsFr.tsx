import { Link } from "@/i18n/navigation";
import { Fill, List, P, Section, Strong } from "@/components/legal/LegalParts";

const linkClass = "text-accent underline-offset-4 hover:underline";

/** Conditions générales d'utilisation — version française (fait foi). */
export function TermsFr() {
  return (
    <>
      <Section title="1. Objet du service">
        <P>
          VelvetGirl est un annuaire en ligne qui permet à des personnes majeures exerçant de manière indépendante
          de publier une annonce présentant leurs services pour adultes, et aux visiteurs de consulter ces
          annonces. Le site est exploité par <Fill field="name" label="nom ou raison sociale de l'exploitant·e" />{" "}
          (ci-après « VelvetGirl », « nous »).
        </P>
        <P>
          VelvetGirl est un <Strong>éditeur d&apos;annonces</Strong>, pas une agence. Nous n&apos;organisons aucune
          rencontre, ne fixons ni prix, ni horaires, ni lieux, ne choisissons pas les clients, n&apos;intervenons
          pas dans la relation entre une annonceuse et ses clients et ne percevons{" "}
          <Strong>aucune commission</Strong>. Aucun paiement de prestation ne transite par le site.
        </P>
      </Section>

      <Section title="2. Accès réservé aux adultes">
        <P>
          Le site est strictement réservé aux personnes âgées de <Strong>18 ans révolus</Strong>. En y entrant,
          vous confirmez avoir 18 ans ou plus. Vous êtes responsable de vérifier que la consultation de ce type de
          contenu est autorisée là où vous vous trouvez.
        </P>
      </Section>

      <Section title="3. Règles pour les visiteurs">
        <P>La consultation est gratuite et ne nécessite pas de compte. Il est interdit :</P>
        <List>
          <li>d&apos;aspirer ou de copier le contenu du site de manière automatisée ;</li>
          <li>
            d&apos;utiliser les coordonnées d&apos;une annonceuse à une autre fin que la prise de contact pour ses
            services, de la harceler ou de diffuser ses informations ou ses photos ailleurs ;
          </li>
          <li>d&apos;envoyer des signalements abusifs ou mensongers ;</li>
          <li>de perturber le fonctionnement du site ou de contourner ses protections.</li>
        </List>
      </Section>

      <Section title="4. Conditions pour publier une annonce">
        <P>Pour publier une annonce, vous devez :</P>
        <List>
          <li>avoir 18 ans révolus ;</li>
          <li>
            exercer librement, de votre propre volonté, sans aucune contrainte ni intermédiaire qui vous exploite ;
          </li>
          <li>être autorisée à exercer une activité lucrative en Suisse ;</li>
          <li>
            vous annoncer auprès des autorités de votre canton lorsque la réglementation cantonale l&apos;exige ;
          </li>
          <li>publier uniquement des informations exactes et des photos qui vous représentent.</li>
        </List>
        <P>
          Votre majorité est vérifiée <Strong>manuellement</Strong> à partir d&apos;une pièce d&apos;identité. Ce
          document est chiffré, consultable uniquement par l&apos;administration du site et supprimé dès la
          décision (au plus tard après 30 jours). Aucune annonce n&apos;est publiée avant que la vérification de
          l&apos;âge et la relecture de l&apos;annonce et des photos aient été faites par une personne.
        </P>
      </Section>

      <Section title="5. Contenus interdits">
        <P>Sont notamment interdits, et entraînent le refus ou la suppression immédiate de l&apos;annonce :</P>
        <List>
          <li>tout contenu impliquant ou évoquant une personne mineure ;</li>
          <li>tout indice de contrainte, d&apos;exploitation ou de traite d&apos;êtres humains ;</li>
          <li>les photos d&apos;une autre personne, ou d&apos;un tiers sans son accord ;</li>
          <li>l&apos;offre de prestations illégales ;</li>
          <li>les contenus haineux, discriminatoires ou trompeurs ;</li>
          <li>
            la publication de l&apos;adresse exacte d&apos;un domicile ou de données d&apos;une autre personne.
          </li>
        </List>
        <P>
          En cas de soupçon portant sur une personne mineure, de contrainte ou de traite d&apos;êtres humains, nous
          pouvons transmettre les informations nécessaires aux autorités compétentes.
        </P>
      </Section>

      <Section title="6. Modération et signalements">
        <P>
          Chaque annonce, photo et modification importante est relue par une personne avant publication. Nous
          pouvons refuser, masquer ou retirer une annonce qui ne respecte pas ces conditions ; le motif est indiqué
          à l&apos;annonceuse. Tout visiteur peut signaler une annonce depuis sa page. Chaque signalement est
          examiné par une personne : aucune décision n&apos;est prise automatiquement.
        </P>
      </Section>

      <Section title="7. Abonnement des annonceuses">
        <P>
          Après la création de l&apos;annonce, les <Strong>30 premiers jours sont gratuits</Strong>. Pour rester
          visible ensuite, l&apos;annonceuse règle un abonnement de{" "}
          <Fill field="subscriptionPrice" label="prix de l'abonnement" /> pour 30 jours. Le règlement se fait{" "}
          <Strong>en dehors du site</Strong> (facture, TWINT ou virement) : le site n&apos;encaisse aucun paiement
          et ne conserve aucune donnée bancaire. L&apos;abonnement n&apos;est jamais renouvelé ni prélevé
          automatiquement.
        </P>
        <P>
          Sans règlement dans les 7 jours suivant l&apos;échéance, l&apos;annonce est masquée (elle n&apos;est pas
          supprimée) et redevient visible dès le paiement enregistré. L&apos;annonceuse peut arrêter à tout moment
          en ne renouvelant pas son abonnement. L&apos;abonnement achète uniquement de la visibilité : il ne
          remplace jamais la vérification de l&apos;âge ni la modération.
        </P>
      </Section>

      <Section title="8. Responsabilité">
        <P>
          Chaque annonceuse est seule responsable du contenu de son annonce et de son activité. VelvetGirl
          n&apos;est pas partie aux échanges entre annonceuses et visiteurs et ne garantit ni les prestations, ni
          leur qualité. Nous faisons notre possible pour que le site soit disponible et sûr, sans pouvoir le
          garantir en permanence. Notre responsabilité est limitée dans la mesure permise par la loi ; elle
          n&apos;est pas exclue en cas de faute intentionnelle ou de négligence grave.
        </P>
      </Section>

      <Section title="9. Données personnelles">
        <P>
          Le traitement de vos données est décrit dans la{" "}
          <Link href="/legal/privacy" className={linkClass}>
            politique de confidentialité
          </Link>
          .
        </P>
      </Section>

      <Section title="10. Suppression du compte">
        <P>
          Une annonceuse peut demander à tout moment la suppression de son compte et de son annonce en écrivant à{" "}
          <Fill field="email" label="adresse e-mail de contact" />. L&apos;annonce est retirée du site sans délai
          et les données sont supprimées, sous réserve des durées de conservation indiquées dans la politique de
          confidentialité.
        </P>
      </Section>

      <Section title="11. Modification des conditions">
        <P>
          Nous pouvons adapter ces conditions. La date de la version en vigueur figure en haut de cette page. En
          cas de changement important, les annonceuses en sont informées et peuvent mettre fin à leur abonnement.
        </P>
      </Section>

      <Section title="12. Droit applicable et for">
        <P>
          Ces conditions sont soumises au droit suisse. Le for est à <Fill field="court" label="ville du for" />,
          sous réserve des fors impératifs prévus par la loi.
        </P>
      </Section>
    </>
  );
}
