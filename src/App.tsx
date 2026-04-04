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
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about-jesse" element={<AboutJesse />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/downloads" element={<Resources />} />
          <Route path="/connect" element={<Connect />} />
          <Route path="/events-conferences" element={<EventsConferences />} />
          <Route path="/past-conferences" element={<PastConferences />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
