import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Register from "./pages/Register.tsx";
import AboutJesse from "./pages/AboutJesse.tsx";
import Resources from "./pages/Resources.tsx";
import Connect from "./pages/Connect.tsx";
import EventsConferences from "./pages/EventsConferences.tsx";
import PastConferences from "./pages/PastConferences.tsx";
import GalleryDetail from "./pages/GalleryDetail.tsx";
import Admin from "./pages/Admin.tsx";
import NotFound from "./pages/NotFound.tsx";
import { supabaseConfigError } from "@/lib/supabaseClient";

const queryClient = new QueryClient();

const App = () => {
  if (supabaseConfigError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
        <div className="max-w-2xl rounded-3xl border border-red-500/70 bg-slate-900/95 p-10 shadow-2xl shadow-red-950/20">
          <h1 className="text-3xl font-semibold text-red-300">Configuration required</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Your deployed app is missing required Supabase environment variables.
            This prevents the frontend from initializing the Supabase client.
          </p>
          <pre className="mt-6 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-sm text-red-100">
            {supabaseConfigError}
          </pre>
          <p className="mt-4 text-sm text-slate-400">
            Add <code className="rounded bg-slate-800 px-1 py-0.5">VITE_SUPABASE_URL</code> and <code className="rounded bg-slate-800 px-1 py-0.5">VITE_SUPABASE_ANON_KEY</code> to your build environment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/register/:eventId?" element={<Register />} />
            <Route path="/about-jesse" element={<AboutJesse />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/downloads" element={<Resources />} />
            <Route path="/connect" element={<Connect />} />
            <Route path="/events-conferences" element={<EventsConferences />} />
            <Route path="/past-conferences" element={<PastConferences />} />
            <Route path="/past-conferences/:galleryId" element={<GalleryDetail />} />
            <Route path="/admin" element={<Admin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
