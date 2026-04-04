import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import WelcomeSection from '@/components/WelcomeSection';
import InfoStrip from '@/components/InfoStrip';
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
      <EventsPreview />
      <Footer />
      <ScrollToTop />
    </>
  );
};

export default Index;
