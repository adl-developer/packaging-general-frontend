import { Hero } from "@/components/home/hero";
import { ProductCategories } from "@/components/home/product-categories";
import { WhyUs } from "@/components/home/why-us";
import { HowItWorks } from "@/components/home/how-it-works";
import { CtaSection } from "@/components/home/cta-section";
import { Certifications } from "@/components/home/certifications";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://packaginggeneral.com";

// Organization + WebSite structured data for richer search results.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Packaging General",
      url: siteUrl,
      logo: `${siteUrl}/logo.png`,
      description:
        "West Africa's digital-first packaging platform for SMEs and growing brands.",
      areaServed: "West Africa",
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Packaging General",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <ProductCategories />
      <WhyUs />
      <HowItWorks />
      <CtaSection />
      <Certifications />
    </>
  );
}
