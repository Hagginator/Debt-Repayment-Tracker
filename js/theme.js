/* =========================================
   Debt Manager — theme.js
   Pick a background colour and the rest of
   the palette (surfaces, text, accent) is
   derived automatically to stay legible and
   cohesive against it.
========================================= */

const DEFAULT_BG_COLOUR = "#081512";

function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function rgbToHex(r, g, b) {
    return "#" + [r, g, b]
        .map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0"))
        .join("");
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            default: h = (r - g) / d + 4;
        }
        h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return { r: r * 255, g: g * 255, b: b * 255 };
}

function hslToHex(h, s, l) {
    const { r, g, b } = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
}

// Builds a full, coherent palette from a single background colour:
// elevated surfaces get progressively lighter than it, text/muted
// flip to near-white or near-black depending on whether the
// background reads as dark or light, and the accent either pushes
// the background's own hue to something vivid, or — if the
// background has barely any colour to begin with (grey/neutral) —
// falls back to a bright neutral instead, since there's no real hue
// to work with.
function derivePalette(bgHex) {

    const { r, g, b } = hexToRgb(bgHex);
    const hsl = rgbToHsl(r, g, b);

    // Leave room above/below the background for elevation steps and
    // for text to stay legible, even if someone picks near-pure
    // black or white.
    const bgL = Math.max(4, Math.min(94, hsl.l));
    const isDark = bgL < 50;
    const hasHue = hsl.s > 12;

    const bg = hslToHex(hsl.h, hsl.s, bgL);
    const bgDeep = hslToHex(hsl.h, hsl.s, Math.max(bgL - 5, 0));

    const surface = hslToHex(hsl.h, hsl.s, Math.min(bgL + 7, 96));
    const surfaceLight = hslToHex(hsl.h, hsl.s, Math.min(bgL + 13, 97));
    const surfaceHover = hslToHex(hsl.h, hsl.s, Math.min(bgL + 20, 98));

    const text = hslToHex(hsl.h, Math.min(hsl.s, 15), isDark ? 95 : 10);
    const muted = hslToHex(hsl.h, Math.min(hsl.s, 15), isDark ? 68 : 40);

    const accent = hasHue
        ? hslToHex(hsl.h, Math.max(hsl.s, 65), isDark ? 62 : 40)
        : hslToHex(hsl.h, 8, isDark ? 95 : 8);

    const primaryL = isDark ? Math.min(bgL + 14, 90) : Math.max(bgL - 14, 10);
    const primaryHoverL = isDark ? Math.min(bgL + 22, 92) : Math.max(bgL - 22, 6);
    const primary = hasHue
        ? hslToHex(hsl.h, Math.max(hsl.s * 0.8, 35), primaryL)
        : hslToHex(hsl.h, 6, primaryL);
    const primaryHover = hasHue
        ? hslToHex(hsl.h, Math.max(hsl.s * 0.8, 35), primaryHoverL)
        : hslToHex(hsl.h, 6, primaryHoverL);

    const textRgb = hexToRgb(text);
    const border = `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, .12)`;

    const accentRgbParts = hexToRgb(accent);
    const accentRgb = `${accentRgbParts.r},${accentRgbParts.g},${accentRgbParts.b}`;

    return { bg, bgDeep, surface, surfaceLight, surfaceHover, text, muted, accent, accentRgb, primary, primaryHover, border };
}

function applyThemeColor(bgHex) {

    if (!/^#[0-9A-Fa-f]{6}$/.test(bgHex)) return;

    const palette = derivePalette(bgHex);
    const root = document.documentElement;

    root.style.setProperty("--bg", palette.bg);
    root.style.setProperty("--bg-deep", palette.bgDeep);
    root.style.setProperty("--surface", palette.surface);
    root.style.setProperty("--surface-light", palette.surfaceLight);
    root.style.setProperty("--surface-hover", palette.surfaceHover);
    root.style.setProperty("--text", palette.text);
    root.style.setProperty("--muted", palette.muted);
    root.style.setProperty("--accent", palette.accent);
    root.style.setProperty("--accent-rgb", palette.accentRgb);
    root.style.setProperty("--primary", palette.primary);
    root.style.setProperty("--primary-hover", palette.primaryHover);
    root.style.setProperty("--border", palette.border);

    return bgHex;
}

function syncThemeInputs(hex) {
    const picker = document.getElementById("themeColorPicker");
    const text = document.getElementById("themeColorText");
    if (picker) picker.value = hex;
    if (text) text.value = hex.toUpperCase();
}

function handleThemeColorInput(hex) {
    const applied = applyThemeColor(hex);
    if (!applied) return;
    syncThemeInputs(applied);
    localStorage.setItem("themeBackground", applied);
}

function handleThemeHexInput(value) {
    const hex = value.startsWith("#") ? value : `#${value}`;
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return; // ignore incomplete typing
    handleThemeColorInput(hex);
}

function selectThemePreset(hex) {
    handleThemeColorInput(hex);
}

function resetTheme() {
    localStorage.removeItem("themeBackground");
    const root = document.documentElement;
    ["--bg", "--bg-deep", "--surface", "--surface-light", "--surface-hover",
     "--text", "--muted", "--accent", "--accent-rgb", "--primary", "--primary-hover", "--border"]
        .forEach(prop => root.style.removeProperty(prop));
    syncThemeInputs(DEFAULT_BG_COLOUR);
}

function loadTheme() {
    const saved = localStorage.getItem("themeBackground");
    const hex = saved || DEFAULT_BG_COLOUR;
    if (saved) applyThemeColor(saved);
    syncThemeInputs(hex);
}

// Applied as soon as this script runs (rather than waiting for
// window.onload) so a saved custom theme shows immediately instead
// of flashing the default one first.
loadTheme();
