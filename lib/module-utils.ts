export const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ");

export const withRootPath = (html: string) =>
  html.replace(
    /(src|href)="(?!\/|https?:|#|data:|mailto:|tel:)([^"]+)"/g,
    (_match, attribute: string, path: string) => `${attribute}="/${path}"`,
  );

export const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const cleanTitle = (title: string) =>
  title.replace(/^[0-9۰-۹]+[.)]\s*/, "");

export interface Heading {
  id: string;
  text: string;
}

export const extractHeadings = (html: string): Heading[] => {
  const matches = [...String(html).matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)];
  return matches
    .map((match, index) => ({
      id: `section-${index + 1}`,
      text: stripHtml(match[1]).replace(/\s+/g, " ").trim(),
    }))
    .filter((heading) => heading.text);
};

export const highlightHtml = (html: string, query: string) => {
  if (!query) return html;
  const pattern = new RegExp(`(${escapeRegExp(query)})`, "gi");
  return html
    .split(/(<[^>]*>)/)
    .map((part) =>
      part.startsWith("<")
        ? part
        : part.replace(pattern, '<mark class="search-highlight">$1</mark>'),
    )
    .join("");
};
