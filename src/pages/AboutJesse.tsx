import { useScrollReveal } from '@/hooks/useScrollReveal';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import welcomeImg from '@/assets/welcome.jpg';
import logo from '@/assets/logo/logo.png';

const tags = [
  { label: 'Ministry President', highlight: true },
  { label: 'Conference Convener', highlight: true },
  { label: 'OAP / Broadcaster' },
  { label: 'Spoken Word Artist' },
  { label: 'School of Ministry Graduate' },
  { label: 'C&S Church Member' },
  { label: 'Brand Designer' },
  { label: 'Writer' },
];

export default function AboutJessePage() {
  const ref = useScrollReveal();

  return (
    <>
      <Navbar />
      <div className="pt-[70px] min-h-screen bg-background" ref={ref}>
        {/* Hero Banner */}
        <div className="page-header">
          <div className="container">
            <div className="eyebrow reveal">Meet Our President</div>
            <h1 className="section-title reveal">
              A Voice. A <em>Vision.</em><br />A Commission.
            </h1>
          </div>
        </div>

        <div className="container py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-12 lg:gap-20 items-start">
            {/* Photo */}
            <div className="reveal lg:sticky lg:top-[90px]">
              <div className="aspect-[3/4] rounded-lg overflow-hidden bg-bg-subtle shadow-lg">
                <img
                  src={welcomeImg}
                  alt="Jesse Falodun — President of Cherubs Cove Ministry"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="mt-5 text-center">
                <h3 className="font-heading text-[22px] font-medium text-foreground">Jesse Falodun</h3>
                <p className="text-[10.5px] tracking-[2.5px] uppercase text-primary mt-1">
                  President, Cherubs Cove
                </p>
              </div>
              {/* Logo */}
              <div className="mt-6 flex justify-center">
                <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-card border border-border">
                  <img src={logo} alt="Cherubs Cove logo" className="h-8 w-8 rounded-full object-contain" />
                  <div>
                    <div className="font-display text-[11px] font-semibold tracking-[1.5px] uppercase text-foreground">Cherubs Cove</div>
                    <div className="text-[8px] tracking-[3px] uppercase text-gold">The Making Place</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div>
              <div className="space-y-5">
                <p className="body-text reveal">
                  Jesse Falodun was born and bred in Kano. He is a young man passionately given to God,
                  with a burning concern for raising high the banner of Christ in every sector of society. His
                  heart beats especially for raising burning youths for the Lord and for the propagation of the
                  Gospel of Christ, particularly within the Cherubim and Seraphim Church.
                </p>
                <p className="body-text reveal">
                  One of Jesse's topmost commissions is seeing the C&S Church perfectly modeled after our
                  Lord Jesus Christ and watching the Church rise to become the one rightly after the Father's
                  heart. Committed to learning the ways of the Lord, he graduated from the International
                  School of Ministry in 2021 and has continued in further pursuit of knowledge in God. He is
                  a dedicated, fervent member of Spirit Life Cherubim and Seraphim Church, Ibadan, Nigeria.
                </p>
                <p className="body-text reveal">
                  A graduate of Mass Communication from Kogi State University, Jesse is an On-Air
                  Personality (OAP) whose voice has graced several radio stations across Nigeria, including
                  Cool FM Kano, Radio Nigeria Kogi, Fusion FM and Premier FM in Ibadan. He is an anointed
                  Spoken Word Artist who believes deeply in the transforming power of words.
                </p>
                <p className="body-text reveal">
                  He strikes a unique balance across every dimension of life, engaging also in business as a
                  graphics designer and personal and business branding expert. In his leisure, he loves to
                  write, sing, and take long strolls and prayer walks. He is the convener of the International
                  Quivers Conference.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 mt-8 reveal">
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className={`px-3.5 py-1.5 rounded-full border text-[11px] font-bold tracking-[1.5px] uppercase transition-colors duration-200 ${
                      tag.highlight
                        ? 'bg-orange-soft border-primary/25 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/25 hover:text-primary'
                    }`}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-12 p-8 bg-card border border-border rounded-lg reveal card-lift">
                <h3 className="font-heading text-xl font-medium mb-2 text-foreground">Connect with Jesse</h3>
                <p className="body-text mb-6">Want to invite Jesse to speak at your event or learn more about Cherubs Cove Ministry?</p>
                <div className="flex gap-4 flex-wrap">
                  <a href="/connect" className="btn-solid-custom">Get in Touch</a>
                  <a href="/register" className="btn-outline-custom">Register for Events</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <ScrollToTop />
    </>
  );
}
