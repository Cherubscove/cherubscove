import { useEffect, useRef } from 'react';

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    // Observe element and all children with .reveal class
    const observeAll = () => {
      const revealEls = el.querySelectorAll('.reveal');
      revealEls.forEach((child) => {
        if (!child.classList.contains('visible')) {
          observer.observe(child);
        }
      });
      if (el.classList.contains('reveal') && !el.classList.contains('visible')) {
        observer.observe(el);
      }
    };

    observeAll();

    // Watch for new .reveal elements added dynamically (e.g. after async data load)
    const mutationObserver = new MutationObserver(() => {
      observeAll();
    });
    mutationObserver.observe(el, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return ref;
}
