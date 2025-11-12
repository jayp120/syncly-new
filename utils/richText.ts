const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'SPAN', 'DIV', 'H1', 'H2', 'H3', 'H4']);
const ALLOWED_STYLES = ['color', 'font-size', 'font-weight', 'text-decoration'];

const sanitizeStyle = (style?: string | null) => {
  if (!style) return '';
  return style
    .split(';')
    .map((rule) => rule.trim())
    .filter((rule) => {
      const [prop] = rule.split(':').map((part) => part.trim().toLowerCase());
      return prop && ALLOWED_STYLES.includes(prop);
    })
    .join('; ');
};

const sanitizeNode = (node: Node) => {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as HTMLElement;
    if (!ALLOWED_TAGS.has(element.tagName)) {
      const parent = element.parentNode;
      while (element.firstChild) {
        parent?.insertBefore(element.firstChild, element);
      }
      parent?.removeChild(element);
      return;
    }
    if (element.hasAttribute('style')) {
      const sanitized = sanitizeStyle(element.getAttribute('style'));
      if (sanitized) {
        element.setAttribute('style', sanitized);
      } else {
        element.removeAttribute('style');
      }
    }
    const allowedAttributes = ['style'];
    Array.from(element.attributes).forEach((attr) => {
      if (!allowedAttributes.includes(attr.name.toLowerCase())) {
        element.removeAttribute(attr.name);
      }
    });
  }
  Array.from(node.childNodes).forEach(sanitizeNode);
};

export const sanitizeRichText = (raw: string): string => {
  if (!raw) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return raw;
  }
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div data-rich-text-root>${raw}</div>`, 'text/html');
    const container = doc.querySelector('[data-rich-text-root]');
    if (!container) {
      return raw;
    }
    Array.from(container.childNodes).forEach(sanitizeNode);
    return container.innerHTML || '';
  } catch {
    return raw;
  }
};
