const PNG_CDN_BASE = "https://unpkg.com/@lobehub/icons-static-png@latest";
const ICON_SIZE = 22;

export const GROK_ICON =
    `<picture>` +
    `<source media="(prefers-color-scheme: dark)" srcset="${PNG_CDN_BASE}/dark/grok.png">` +
    `<img src="${PNG_CDN_BASE}/light/grok.png" width="${ICON_SIZE}" height="${ICON_SIZE}" align="top" alt="Grok">` +
    `</picture>`;
