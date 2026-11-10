import { SvelteURL } from "svelte/reactivity";

interface Navigation {
  href: string;
  replaceState: boolean;
  keepFocus: boolean;
  noScroll: boolean;
}

class FakePage {
  url = $state(new SvelteURL("https://example.test/"));
}

export const page = new FakePage();

export const navigations: Navigation[] = [];

let latestNavigation = 0;

export const goto = async (
  href: string,
  options: { replaceState?: boolean; keepFocus?: boolean; noScroll?: boolean } = {},
): Promise<void> => {
  const token = ++latestNavigation;
  navigations.push({
    href,
    replaceState: options.replaceState ?? false,
    keepFocus: options.keepFocus ?? false,
    noScroll: options.noScroll ?? false,
  });
  await Promise.resolve();
  if (token === latestNavigation) page.url = new SvelteURL(href);
};

export const visit = (href: string): void => {
  page.url = new SvelteURL(href, "https://example.test");
};

export const resetKit = (href: string): void => {
  visit(href);
  navigations.length = 0;
};
