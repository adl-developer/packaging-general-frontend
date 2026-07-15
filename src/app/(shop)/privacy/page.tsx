import type { Metadata } from "next";
import {
  LegalContactCard,
  LegalList,
  LegalSection,
  LegalShell,
  LegalSubheading,
  LegalText,
  LegalToc,
} from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Packaging General collects, uses, shares, and protects your personal information when you use our website and services.",
  alternates: { canonical: "/privacy" },
};

const TOC = [
  { id: "collect", label: "Information we collect" },
  { id: "use", label: "How we use it" },
  { id: "payments", label: "Payments" },
  { id: "cookies", label: "Cookies & analytics" },
  { id: "share", label: "How we share it" },
  { id: "transfers", label: "International transfers" },
  { id: "retention", label: "How long we keep it" },
  { id: "security", label: "How we protect it" },
  { id: "rights", label: "Your rights" },
  { id: "marketing", label: "Marketing choices" },
  { id: "children", label: "Children" },
  { id: "changes", label: "Changes" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalShell
      eyebrow="Privacy"
      title="Privacy Policy"
      updated="15 July 2026"
      lead={
        <>
          This Privacy Policy explains how Packaging General (operated by EON
          Investments &amp; Industries, &quot;we&quot;, &quot;us&quot;,
          &quot;our&quot;) collects, uses, shares, and protects your personal
          information when you visit our website, create an account, place an
          order, or otherwise use our packaging products and services
          (together, the &quot;Services&quot;). We are the data controller for
          the personal information described here.
        </>
      }
    >
      <LegalToc heading="On this page" items={TOC} />

      <LegalSection id="collect" title="1. Information we collect">
        <LegalSubheading>Information you give us</LegalSubheading>
        <LegalList>
          <li>
            <strong>Account details</strong> — your name, business name, email,
            phone/WhatsApp number, and password when you register or sign in.
          </li>
          <li>
            <strong>Order and enquiry details</strong> — the packaging
            products, quantities, sizes, colours, branding/artwork, timelines,
            and any notes you submit when you request a quote or place an
            order.
          </li>
          <li>
            <strong>Delivery information</strong> — delivery address, recipient
            name and contact number, and any delivery instructions.
          </li>
          <li>
            <strong>Payment information</strong> — payment is processed by our
            third-party payment providers. We receive confirmation of payment
            and limited details (such as the payment method type and a
            transaction reference); we do not store your full card or
            mobile-money credentials.
          </li>
          <li>
            <strong>Communications</strong> — messages you send us by email,
            WhatsApp, phone, or web form, and our correspondence with you
            (including support and feedback).
          </li>
        </LegalList>
        <LegalSubheading>Information we collect automatically</LegalSubheading>
        <LegalList>
          <li>
            <strong>Device and usage data</strong> — IP address, browser and
            device type, pages viewed, and how you interact with the site,
            collected through cookies and similar technologies and our server
            logs.
          </li>
          <li>
            <strong>Transaction history</strong> — a record of your orders,
            quotes, and account activity.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="use" title="2. How we use your information">
        <LegalText>We use your information to:</LegalText>
        <LegalList>
          <li>create and manage your account and authenticate you;</li>
          <li>
            prepare quotes, process and fulfil your orders, and arrange
            production and delivery;
          </li>
          <li>take payment and manage refunds, invoices, and receipts;</li>
          <li>provide customer support and respond to your enquiries;</li>
          <li>
            send you service messages about your orders (for example, order
            confirmations, delivery updates, and password resets) by email,
            SMS, or WhatsApp;
          </li>
          <li>
            understand demand and improve our products, pricing, and website;
          </li>
          <li>
            send marketing about our products where you have agreed to receive
            it;
          </li>
          <li>keep our Services secure and prevent fraud and abuse; and</li>
          <li>comply with our legal and tax obligations.</li>
        </LegalList>
        <LegalText>
          We rely on your consent, the performance of our contract with you,
          our legitimate business interests, and our legal obligations as the
          lawful bases for using your information under the Data Protection
          Act, 2012 (Act 843) of Ghana.
        </LegalText>
      </LegalSection>

      <LegalSection id="payments" title="3. Payments">
        <LegalText>
          Payments are handled by third-party payment processors (for example,
          providers supporting card and mobile-money payments). When you pay,
          your payment details are provided directly to the processor under
          their own terms and privacy policy. We do not receive or store your
          full card number, PIN, or mobile-money credentials. We keep records
          of your transactions for order, accounting, and tax purposes.
        </LegalText>
      </LegalSection>

      <LegalSection id="cookies" title="4. Cookies and analytics">
        <LegalText>
          We use cookies and similar technologies to keep you signed in,
          remember your preferences, keep the site secure, and understand how
          the site is used so we can improve it. You can control cookies
          through your browser settings; blocking some cookies may affect how
          parts of the site work. We do not use your information for
          third-party advertising.
        </LegalText>
      </LegalSection>

      <LegalSection id="share" title="5. How we share your information">
        <LegalText>
          We do not sell your personal information. We share it only as needed
          to run our Services, with:
        </LegalText>
        <LegalList>
          <li>
            <strong>Payment processors</strong> — to take payment and confirm
            transactions;
          </li>
          <li>
            <strong>Delivery and logistics partners</strong> — to fulfil and
            deliver your orders;
          </li>
          <li>
            <strong>Production and supply partners</strong> — where an order
            (for example, custom or branded packaging) is produced with a
            partner;
          </li>
          <li>
            <strong>Technology providers</strong> — hosting, database, email,
            and SMS/messaging providers that operate our platform;
          </li>
          <li>
            <strong>Professional advisers</strong> — such as accountants and
            lawyers, where reasonably necessary; and
          </li>
          <li>
            <strong>Authorities</strong> — where we are required to by law, or
            to protect our rights, users, or others.
          </li>
        </LegalList>
        <LegalText>
          These parties may only use your information to provide their services
          to us, and are required to keep it secure.
        </LegalText>
      </LegalSection>

      <LegalSection id="transfers" title="6. International transfers">
        <LegalText>
          Some of our technology providers store and process data on servers
          located outside Ghana. Where your information is transferred abroad,
          we take reasonable steps to ensure it remains protected in line with
          this policy and applicable data-protection law.
        </LegalText>
      </LegalSection>

      <LegalSection id="retention" title="7. How long we keep it">
        <LegalText>
          We keep your information for as long as your account is active and as
          long as we need it to provide the Services, and thereafter as
          required to meet our legal, accounting, and tax obligations or to
          resolve disputes. When we no longer need it, we securely delete or
          anonymise it. You can ask us to delete your account and details at
          any time (see Your rights).
        </LegalText>
      </LegalSection>

      <LegalSection id="security" title="8. How we protect it">
        <LegalText>
          We use appropriate technical and organisational measures to protect
          your information, including encrypted connections (HTTPS), hashed
          passwords, access controls limiting who on our team can see your
          data, and session protections. No system is completely secure, but we
          work to keep your information safe and to respond promptly to any
          incident.
        </LegalText>
      </LegalSection>

      <LegalSection id="rights" title="9. Your rights">
        <LegalText>Subject to applicable law, you have the right to:</LegalText>
        <LegalList>
          <li>access the personal information we hold about you;</li>
          <li>ask us to correct information that is inaccurate or incomplete;</li>
          <li>ask us to delete your information or close your account;</li>
          <li>object to or restrict certain uses of your information;</li>
          <li>
            withdraw consent where we rely on it (this does not affect earlier
            processing); and
          </li>
          <li>
            ask for a copy of information you provided to us in a portable
            format.
          </li>
        </LegalList>
        <LegalText>
          To exercise any of these rights, contact us using the details below.
          You also have the right to lodge a complaint with the Data Protection
          Commission of Ghana.
        </LegalText>
      </LegalSection>

      <LegalSection id="marketing" title="10. Marketing choices">
        <LegalText>
          If you have opted in to marketing, you can opt out at any time by
          using the unsubscribe link in our emails, replying STOP to a
          marketing SMS, or contacting us. We will still send you essential
          service messages about your account and orders.
        </LegalText>
      </LegalSection>

      <LegalSection id="children" title="11. Children">
        <LegalText>
          Our Services are intended for businesses and adults. We do not
          knowingly collect personal information from children. If you believe
          a child has provided us information, contact us and we will delete
          it.
        </LegalText>
      </LegalSection>

      <LegalSection id="changes" title="12. Changes to this policy">
        <LegalText>
          We may update this policy from time to time. The current version,
          with its &quot;last updated&quot; date, will always be posted on this
          page. If we make a significant change, we will take reasonable steps
          to let you know.
        </LegalText>
      </LegalSection>

      <LegalContactCard intro="To exercise your rights or ask about this policy, reach us at:" />
    </LegalShell>
  );
}
