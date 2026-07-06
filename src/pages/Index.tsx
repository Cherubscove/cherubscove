import { useSiteSettings, getSetting } from '@/hooks/useSiteSettings';
import SEO, { orgJsonLd, websiteJsonLd } from '@/components/SEO';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import WelcomeSection from '@/components/WelcomeSection';
import InfoStrip from '@/components/InfoStrip';
import EventsPreview from '@/components/EventsPreview';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';

const Index = () => {
  const s = useSiteSettings();
  return (
    <>
      <SEO
        title={getSetting(s, 'seo_home_title', 'Cherubs Cove Ministry — The Making Place')}
        description={getSetting(s, 'seo_home_description', 'An interdenominational ministry raising burning youths for the Lord. Home of the International Quivers Conference.')}
        image={getSetting(s, 'seo_home_image', '') || undefined}
        path="/"
        jsonLd={[orgJsonLd(s), websiteJsonLd()]}
      />
      <Navbar />
      <HeroSection />
      <WelcomeSection />
      <InfoStrip />
      <EventsPreview />
      <Footer />
      <ScrollToTop />
    </>
  );
};

export default Index;
