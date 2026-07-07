import { Banknote, Heart, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useSiteSettings, getSetting } from '@/hooks/useSiteSettings';
import SEO, { breadcrumbJsonLd } from '@/components/SEO';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copied!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy. Please select and copy manually.');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export default function SupportPage() {
  const ref = useScrollReveal();
  const s = useSiteSettings();

  const bankDetails = {
    bank: 'Ecobank',
    accountName: 'Cherubs Cove',
    accountNumber: '0250139663',
  };

  const handleCopyAll = async () => {
    const text = `Bank: ${bankDetails.bank}\nAccount Name: ${bankDetails.accountName}\nAccount Number: ${bankDetails.accountNumber}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('All bank details copied!');
    } catch {
      toast.error('Failed to copy.');
    }
  };

  return (
    <>
      <SEO
        title={getSetting(s, 'seo_support_title', 'Support Our Ministry — Cherubs Cove')}
        description={getSetting(s, 'seo_support_description', 'Partner with Cherubs Cove Ministry through your financial support. Your generous giving helps us continue raising burning youths for the Lord.')}
        image={getSetting(s, 'seo_support_image', '')}
      />
      <Navbar />
      <ScrollToTop />

      <main ref={ref} className="min-h-screen pt-[70px]">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="relative py-20 md:py-32 px-6 overflow-hidden">
          <div
            className="absolute inset-0 z-0"
            style={{
              background:
                'linear-gradient(135deg, rgba(8,5,2,0.95) 0%, rgba(26,16,8,0.9) 50%, rgba(8,5,2,0.95) 100%)',
            }}
          />
          <div className="relative z-[1] max-w-[700px] mx-auto text-center">
            <div className="inline-flex items-center gap-2.5 text-[10px] font-bold tracking-[5px] uppercase text-primary mb-5">
              <span className="w-[18px] h-px bg-primary inline-block" />
              Support Our Ministry
              <span className="w-[18px] h-px bg-primary inline-block" />
            </div>
            <h1 className="font-heading text-[clamp(40px,6vw,72px)] font-normal leading-[1.05] mb-5 text-white">
              Partner with <em className="text-primary italic">Us</em>
            </h1>
            <p className="font-heading text-[clamp(15px,1.8vw,19px)] italic leading-relaxed text-white/60 max-w-[560px] mx-auto">
              Your faithful giving enables us to continue raising burning youths for the Lord,
              organize life-transforming conferences, and reach nations with the Gospel.
            </p>
          </div>
        </section>

        {/* ── Bank Details ──────────────────────────────────────────── */}
        <section className="pb-24 px-6 -mt-10 relative z-[2]">
          <div className="max-w-[520px] mx-auto">
            <div className="rounded-2xl border border-[#2A2520] bg-[#1A1814] overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-5 border-b border-[#2A2520]">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Banknote size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Bank Transfer</h2>
                  <p className="text-xs text-[#6B5E50]">Make a direct transfer to the account below</p>
                </div>
              </div>

              {/* Details */}
              <div className="p-6 space-y-5">
                {/* Bank Name */}
                <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-[#0F0D0A] border border-[#2A2520]">
                  <div>
                    <p className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6B5E50] mb-0.5">Bank</p>
                    <p className="text-sm font-medium text-white">{bankDetails.bank}</p>
                  </div>
                  <CopyButton text={bankDetails.bank} label="Bank name" />
                </div>

                {/* Account Name */}
                <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-[#0F0D0A] border border-[#2A2520]">
                  <div>
                    <p className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6B5E50] mb-0.5">Account Name</p>
                    <p className="text-sm font-medium text-white">{bankDetails.accountName}</p>
                  </div>
                  <CopyButton text={bankDetails.accountName} label="Account name" />
                </div>

                {/* Account Number */}
                <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-[#0F0D0A] border border-[#2A2520]">
                  <div>
                    <p className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6B5E50] mb-0.5">Account Number</p>
                    <p className="text-lg font-semibold text-primary tracking-wider font-mono">
                      {bankDetails.accountNumber}
                    </p>
                  </div>
                  <CopyButton text={bankDetails.accountNumber} label="Account number" />
                </div>

                {/* Copy All Button */}
                <button
                  onClick={handleCopyAll}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg border-2 border-primary/30 bg-primary/5 px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
                >
                  <Copy size={16} />
                  Copy All Bank Details
                </button>
              </div>
            </div>

            {/* ── Thank You Note ────────────────────────────────────── */}
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 text-[#B5A898]">
                <Heart size={14} className="text-primary" />
                <span className="text-xs">
                  Thank you for your generous support. God bless you!
                </span>
                <Heart size={14} className="text-primary" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <script type="application/ld+json">
        {JSON.stringify(
          breadcrumbJsonLd([
            { name: 'Home', url: 'https://cherubscove.net/' },
            { name: 'Support Our Ministry', url: 'https://cherubscove.net/support' },
          ])
        )}
      </script>
    </>
  );
}
