import { useEffect } from 'react';

// Set VITE_SITE_URL in your host (e.g. Vercel) to your production domain.
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://nexora.app').replace(/\/+$/, '');

interface PageMeta {
  title: string;
  description: string;
  path?: string;
  image?: string;
  schema?: object;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Lightweight per-route SEO: sets <title>, description, canonical,
 * Open Graph and Twitter tags, and an optional JSON-LD schema block.
 */
export function usePageMeta({ title, description, path = '/', image, schema }: PageMeta) {
  useEffect(() => {
    const url = `${SITE_URL}${path === '/' ? '/' : path}`;

    document.title = title;
    upsertMeta('name', 'description', description);

    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'Nexora');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:card', 'summary_large_image');

    if (image) {
      const absolute = /^https?:\/\//.test(image) ? image : `${SITE_URL}${image}`;
      upsertMeta('property', 'og:image', absolute);
      upsertMeta('name', 'twitter:image', absolute);
    }

    upsertLink('canonical', url);

    if (schema) {
      const id = 'page-schema';
      let script = document.getElementById(id) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = id;
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schema);
    }
  }, [title, description, path, image, schema]);
}

export const DEFAULT_OG_IMAGE = '/og-image.svg';