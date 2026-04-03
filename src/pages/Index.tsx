import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import WelcomeSection from '@/components/WelcomeSection';
import InfoStrip from '@/components/InfoStrip';
import ConferenceSection from '@/components/ConferenceSection';
import AboutSection from '@/components/AboutSection';
import ResourcesSection from '@/components/ResourcesSection';
import EventsSection from '@/components/EventsSection';
import ConnectSection from '@/components/ConnectSection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <>
      <Navbar />
      <HeroSection />
      <WelcomeSection />
      <InfoStrip />
      <ConferenceSection />
      <AboutSection />
      <ResourcesSection />
      <EventsSection />
      <ConnectSection />
      <Footer />
    </>
  );
};

export default Index;
