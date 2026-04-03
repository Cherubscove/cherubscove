import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import WelcomeSection from '@/components/WelcomeSection';
import InfoStrip from '@/components/InfoStrip';
import ConferenceSection from '@/components/ConferenceSection';
import EventsPreview from '@/components/EventsPreview';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';

const Index = () => {
  return (
    <>
      <Navbar />
      <HeroSection />
      <WelcomeSection />
      <InfoStrip />
      <ConferenceSection />
      <EventsPreview />
      <Footer />
      <ScrollToTop />
    </>
  );
};

export default Index;
