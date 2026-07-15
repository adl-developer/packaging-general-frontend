import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalContactCard,
  LegalList,
  LegalSection,
  LegalShell,
  LegalText,
  LegalToc,
} from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms that govern your use of the Packaging General website, your account, and any quote, order, or purchase of our packaging products and services.",
  alternates: { canonical: "/terms" },
};

const TOC = [
  { id: "services", label: "Our services" },
  { id: "accounts", label: "Accounts" },
  { id: "orders", label: "Orders & contract" },
  { id: "pricing", label: "Pricing & taxes" },
  { id: "payment", label: "Payment" },
  { id: "custom", label: "Custom & branded orders" },
  { id: "delivery", label: "Delivery, risk & title" },
  { id: "returns", label: "Cancellations & returns" },
  { id: "use", label: "Your responsibilities" },
  { id: "ip", label: "Intellectual property" },
  { id: "warranty", label: "Warranties & disclaimers" },
  { id: "liability", label: "Limitation of liability" },
  { id: "indemnity", label: "Indemnity" },
  { id: "force", label: "Force majeure" },
  { id: "termination", label: "Suspension & termination" },
  { id: "law", label: "Governing law" },
];

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Terms & Conditions"
      updated="15 July 2026"
      lead={
        <>
          These Terms &amp; Conditions (&quot;Terms&quot;) govern your use of
          the Packaging General website, your account, and any quote, order, or
          purchase of our packaging products and services (together, the
          &quot;Services&quot;), operated by EON Investments &amp; Industries
          (&quot;Packaging General&quot;, &quot;we&quot;, &quot;us&quot;,
          &quot;our&quot;). By using the Services or placing an order, you
          agree to these Terms. If you do not agree, please do not use the
          Services.
        </>
      }
    >
      <LegalToc heading="Contents" items={TOC} />

      <LegalSection id="services" title="1. Our services">
        <LegalText>
          Packaging General supplies standardized and custom packaging —
          including boxes, bags, pouches, food packaging, and related products
          — together with optional branding and design, to businesses across
          Ghana and West Africa. Product images, descriptions, dimensions, and
          samples are provided to help you choose and are indicative; slight
          variations in colour, size, and finish can occur, particularly for
          printed and custom items.
        </LegalText>
      </LegalSection>

      <LegalSection id="accounts" title="2. Accounts">
        <LegalText>
          To use certain features you may need an account. You agree to provide
          accurate, current information and to keep your login details
          confidential. You are responsible for activity that happens under
          your account. Tell us promptly if you believe your account has been
          used without your authorisation. We may refuse, suspend, or close
          accounts at our discretion, including where information is inaccurate
          or the Services are misused.
        </LegalText>
      </LegalSection>

      <LegalSection id="orders" title="3. Orders and contract formation">
        <LegalText>
          A quote, product listing, or price is an invitation to order, not an
          offer. When you place an order you are making an offer to buy. A
          binding contract is formed only when we confirm acceptance of your
          order (for example, by an order confirmation) or, for custom work,
          when we confirm your approved specification and any required deposit.
          We may decline or cancel an order before that point — for example, if
          a product is unavailable, there is a pricing or description error,
          payment fails, or we suspect fraud or misuse — in which case we will
          refund any amount already paid for that order.
        </LegalText>
      </LegalSection>

      <LegalSection id="pricing" title="4. Pricing and taxes">
        <LegalText>
          Prices are shown in Ghana Cedis (GHS) unless stated otherwise and may
          change over time. Unless stated, prices exclude delivery, which is
          added at checkout or in your quote. You are responsible for any
          applicable taxes, levies, or duties. Where a price is obviously wrong
          (a manifest error), we are not obliged to supply at that price and
          will let you know before proceeding.
        </LegalText>
      </LegalSection>

      <LegalSection id="payment" title="5. Payment">
        <LegalText>
          Payment is made through our approved payment methods, which may
          include card and mobile-money payments handled by third-party
          processors. You authorise us (and our processors) to charge the
          amount due for your order. We may require full payment before an
          order is processed, or a deposit for custom and large orders with the
          balance due before dispatch. If a payment fails or is reversed, we
          may pause or cancel the affected order. Payment details are handled
          as described in our{" "}
          <Link href="/privacy" className="underline hover:text-rust">
            Privacy Policy
          </Link>
          .
        </LegalText>
      </LegalSection>

      <LegalSection id="custom" title="6. Custom and branded orders">
        <LegalText>
          For custom, printed, or branded packaging, you are responsible for
          reviewing and approving the specification and artwork (sizes,
          colours, text, and design) before production. Once you approve and
          production begins, custom orders generally cannot be changed,
          cancelled, or returned except where the goods are faulty or not as
          approved. You confirm that any logo, text, or artwork you supply is
          yours to use or properly licensed, and that it does not infringe
          anyone&apos;s rights or break the law. You agree to indemnify us
          against claims arising from artwork or instructions you provide.
        </LegalText>
      </LegalSection>

      <LegalSection id="delivery" title="7. Delivery, risk, and title">
        <LegalText>
          We deliver to the address you provide, within the areas we serve.
          Delivery times and lead times are estimates and may be affected by
          production, stock, and logistics. Please check your order on
          delivery; risk in the goods passes to you on delivery (or when they
          are made available for collection). Title to the goods passes to you
          once we have received payment in full. If delivery fails because of
          incorrect details or repeated unavailability, we may charge a
          reasonable re-delivery fee.
        </LegalText>
      </LegalSection>

      <LegalSection id="returns" title="8. Cancellations, returns, and refunds">
        <LegalText>
          For standard stock items, you may cancel or return an order in line
          with any returns window we communicate, provided the goods are unused
          and in their original condition; return delivery may be at your cost.
          Custom, printed, and perishable food-packaging items are made or
          supplied for you and are not returnable unless faulty. If your goods
          are faulty, damaged, or not as described, contact us promptly with
          details and photos and we will repair, replace, or refund as
          appropriate. Approved refunds are made to your original payment
          method.
        </LegalText>
      </LegalSection>

      <LegalSection id="use" title="9. Your responsibilities">
        <LegalText>You agree to use the Services lawfully and not to:</LegalText>
        <LegalList>
          <li>
            provide false, misleading, or fraudulent information or payment
            details;
          </li>
          <li>
            resell or misrepresent our products in a way that is unlawful or
            misleading;
          </li>
          <li>
            attempt to gain unauthorised access to the Services, other
            accounts, or our systems;
          </li>
          <li>
            disrupt, overload, or interfere with the Services or their
            security; or
          </li>
          <li>use the Services for any unlawful, harmful, or abusive purpose.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="ip" title="10. Intellectual property">
        <LegalText>
          The Packaging General name, logo, website, content, and designs are
          owned by or licensed to us and are protected by law. You may not
          copy, reproduce, or reuse them without our written permission. You
          keep ownership of artwork you supply, and grant us the licence needed
          to produce your order.
        </LegalText>
      </LegalSection>

      <LegalSection id="warranty" title="11. Warranties and disclaimers">
        <LegalText>
          We provide the Services with reasonable care and skill. Except as
          required by law, the website and its content are provided &quot;as
          is&quot; and &quot;as available&quot;, and we do not guarantee that
          they will be uninterrupted or error-free. Nothing in these Terms
          excludes rights or guarantees you have under applicable
          consumer-protection law that cannot lawfully be excluded.
        </LegalText>
      </LegalSection>

      <LegalSection id="liability" title="12. Limitation of liability">
        <LegalText>
          To the fullest extent permitted by law, our total liability for any
          order is limited to the amount you paid for that order, and we will
          not be liable for indirect, incidental, or consequential loss, or for
          loss of profit, revenue, data, or business. Nothing in these Terms
          limits liability that cannot be excluded by law, including for death
          or personal injury caused by negligence, or for fraud.
        </LegalText>
      </LegalSection>

      <LegalSection id="indemnity" title="13. Indemnity">
        <LegalText>
          You agree to indemnify and hold us harmless against claims, losses,
          and costs arising from your breach of these Terms, your misuse of the
          Services, or artwork, content, or instructions you provide to us.
        </LegalText>
      </LegalSection>

      <LegalSection id="force" title="14. Force majeure">
        <LegalText>
          We are not responsible for delays or failures caused by events beyond
          our reasonable control, including supply shortages, utility or
          logistics disruption, strikes, natural events, or government action.
          We will take reasonable steps to limit any impact and keep you
          informed.
        </LegalText>
      </LegalSection>

      <LegalSection id="termination" title="15. Suspension and termination">
        <LegalText>
          We may suspend or end your access to the Services, or cancel an
          order, if you breach these Terms, if we suspect fraud or misuse, or
          as needed to comply with the law. You may stop using the Services and
          close your account at any time; amounts due for orders already
          accepted remain payable.
        </LegalText>
      </LegalSection>

      <LegalSection id="law" title="16. Governing law and disputes">
        <LegalText>
          These Terms are governed by the laws of the Republic of Ghana, and
          any dispute is subject to the jurisdiction of the courts of Ghana. We
          would rather resolve any issue directly, so please contact us first
          and we will work in good faith to sort it out.
        </LegalText>
      </LegalSection>

      <LegalSection title="17. Changes to these Terms">
        <LegalText>
          We may update these Terms from time to time. The current version,
          with its &quot;last updated&quot; date, will always be posted on this
          page. Orders are governed by the Terms in force when the order is
          accepted; continuing to use the Services after a change means you
          accept the updated Terms.
        </LegalText>
      </LegalSection>

      <LegalContactCard intro="Questions about these Terms or an order? Reach us at:" />
    </LegalShell>
  );
}
