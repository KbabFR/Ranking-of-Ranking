#!/usr/bin/env node
/**
 * Script de maintenance des portraits et de synchronisation de la base de personnages.
 *
 * Fonctionnalités :
 * - Détecte les personnages sans image (vide, chemin local manquant ou URL cassée avec --check-urls)
 * - Recherche automatiquement un portrait officiel en ligne (AniList, Akabab SuperHero, PokeAPI,
 *   AmiiboAPI, Rick & Morty API, Harry Potter API, Fandom Wikis, Wikipedia)
 * - Génère automatiquement un portrait SVG de repli stylisé dans assets/portraits/<id>.svg
 * - Synchronise toujours data/characters.json -> data/characters.js (compatible file:// & GitHub Pages)
 *
 * Usage (Node 18+) :
 *   node scripts/sync_portraits.mjs                # Corrige les images manquantes + génère les SVG manquants + synchro .js
 *   node scripts/sync_portraits.mjs --check-urls   # Vérifie aussi les URL https:// existantes et répare celles qui échouent
 *   node scripts/sync_portraits.mjs --upgrade-svg  # Tente de remplacer les .svg par de vraies images https://
 *   node scripts/sync_portraits.mjs --sync-only    # Hors-ligne : génère les SVG manquants et resynchronise data/characters.js
 *   node scripts/sync_portraits.mjs --regen-svg    # Régénère tous les SVG de repli dans assets/portraits/
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const CHARS_JSON = path.join(ROOT, 'data', 'characters.json');
const CHARS_JS = path.join(ROOT, 'data', 'characters.js');
const PORTRAITS_DIR = path.join(ROOT, 'assets', 'portraits');

const args = new Set(process.argv.slice(2));
if (args.has('--help') || args.has('-h')) {
  console.log(`
Ranking of Ranking — Maintenance des images & synchronisation JSON/JS

Options :
  (aucune)       Détecte les persos sans image (ou fichier manquant), cherche en ligne,
                 crée les SVG de repli manquants et synchronise data/characters.js.
  --check-urls   Teste aussi chaque URL https:// existante et remplace celles en erreur.
  --upgrade-svg  Tente de remplacer les portraits .svg actuels par de vraies images en ligne.
  --sync-only    Mode hors-ligne : génère les SVG manquants et met à jour data/characters.js.
  --regen-svg    Régénère tous les SVG de repli dans assets/portraits/.
  --help, -h     Affiche cette aide.
`);
  process.exit(0);
}

const CHECK_URLS = args.has('--check-urls');
const UPGRADE_SVG = args.has('--upgrade-svg');
const SYNC_ONLY = args.has('--sync-only');
const REGEN_SVG = args.has('--regen-svg');

/* ==================== PALETTES & SVG GENERATOR ==================== */
const MEDIUM_PALETTES = {
  'Animé / Manga': ['#8b5cf6', '#22d3ee', '#130d26'],
  'Jeux Vidéo': ['#06b6d4', '#3b82f6', '#0a1628'],
  'Comics / Super-Héros': ['#ef4444', '#f59e0b', '#1c0b12'],
  'Films & Séries': ['#f59e0b', '#fb7185', '#1b1109']
};

function slugify(str) {
  return (
    String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'perso'
  );
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getInitials(name) {
  const clean = String(name || '?').replace(/\([^)]*\)/g, '').trim();
  const words = clean.split(/[\s'-]+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function generatePortraitSvg(ch) {
  const [c1, c2, dark] = MEDIUM_PALETTES[ch.medium] || ['#8b5cf6', '#22d3ee', '#0f172a'];
  const h = hashCode(ch.id || ch.name);
  const angle = h % 45;
  const initials = getInitials(ch.name);
  const licenceTag = String(ch.licence || 'PERSO').toUpperCase().slice(0, 28);
  const priority = Number.isFinite(Number(ch.priority)) ? Math.max(1, Math.min(10, Number(ch.priority))) : 5;

  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    const x2 = 160 + Math.cos(a) * 190;
    const y2 = 155 + Math.sin(a) * 190;
    const col = i % 2 === 0 ? c1 : c2;
    return `<line x1="160" y1="155" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${col}" stroke-width="1.2" opacity="0.14"/>`;
  }).join('');

  const dotCount = Math.min(5, Math.max(1, Math.round(priority / 2)));
  const startX = 160 - ((dotCount - 1) * 14) / 2;
  const dots = Array.from(
    { length: dotCount },
    (_, i) => `<circle cx="${(startX + i * 14).toFixed(1)}" cy="264" r="3.2" fill="${c2}" opacity="0.9"/>`
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.36"/>
      <stop offset="55%" stop-color="${dark}" stop-opacity="0.96"/>
      <stop offset="100%" stop-color="#05070e" stop-opacity="1"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${c2}" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="320" height="320" fill="url(#bgGrad)"/>
  <rect width="320" height="320" fill="url(#grid)"/>
  <g transform="rotate(${angle} 160 155)">${rays}</g>
  <circle cx="160" cy="155" r="95" fill="url(#glow)" opacity="0.35"/>
  <circle cx="160" cy="155" r="56" fill="none" stroke="${c2}" stroke-width="2.5" opacity="0.65"/>
  <circle cx="160" cy="155" r="46" fill="#090c16" fill-opacity="0.85" stroke="url(#badgeGrad)" stroke-width="3.5"/>
  <text x="160" y="170" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-weight="900" font-size="38" letter-spacing="1" fill="#ffffff">${escapeXml(initials)}</text>
  <rect x="24" y="18" width="272" height="26" rx="13" fill="#000000" fill-opacity="0.45" stroke="${c1}" stroke-opacity="0.5"/>
  <text x="160" y="35" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-weight="700" font-size="11" letter-spacing="1.4" fill="${c2}">${escapeXml(licenceTag)}</text>
  ${dots}
</svg>\n`;
}

/* ==================== IMAGE LOOKUP SOURCES ==================== */
const FANDOM_DOMAIN_HINTS = [
  [/dragon ball/i, 'dragonball.fandom.com'],
  [/naruto/i, 'naruto.fandom.com'],
  [/one piece/i, 'onepiece.fandom.com'],
  [/jujutsu/i, 'jujutsu-kaisen.fandom.com'],
  [/attack on titan|shingeki/i, 'attackontitan.fandom.com'],
  [/one punch/i, 'onepunchman.fandom.com'],
  [/hunter/i, 'hunterxhunter.fandom.com'],
  [/bleach/i, 'bleach.fandom.com'],
  [/demon slayer|kimetsu/i, 'kimetsu-no-yaiba.fandom.com'],
  [/hero academia/i, 'myheroacademia.fandom.com'],
  [/solo leveling/i, 'solo-leveling.fandom.com'],
  [/jojo/i, 'jojowiki.com'],
  [/star wars/i, 'starwars.fandom.com'],
  [/seigneur des anneaux|lord of the rings/i, 'lotr.fandom.com'],
  [/harry potter/i, 'harrypotter.fandom.com'],
  [/marvel/i, 'marvel.fandom.com'],
  [/dc/i, 'dc.fandom.com'],
  [/nintendo|zelda/i, 'zelda.fandom.com'],
  [/mario/i, 'mario.fandom.com'],
  [/sega|sonic/i, 'sonic.fandom.com']
];

const cache = {
  heroes: null,
  amiibos: null,
  hpChars: null
};

async function verifyImageUrl(url) {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://example.github.io/'
      }
    });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    return res.ok && ct.startsWith('image/');
  } catch {
    return false;
  }
}

function cleanQueryName(name) {
  return String(name || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function tryPokeApi(ch) {
  if (!/pok[eé]mon/i.test(`${ch.licence} ${ch.description}`)) return null;
  const slug = slugify(cleanQueryName(ch.name));
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const url = data?.sprites?.other?.['official-artwork']?.front_default;
    if (url && (await verifyImageUrl(url))) return { url, source: `pokeapi:${slug}` };
  } catch {
    // ignore
  }
  return null;
}

async function tryRickAndMortyApi(ch) {
  if (!/rick/i.test(`${ch.name} ${ch.licence}`)) return null;
  try {
    const q = cleanQueryName(ch.name);
    const res = await fetch(`https://rickandmortyapi.com/api/character/?name=${encodeURIComponent(q)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const url = data?.results?.[0]?.image;
    if (url && (await verifyImageUrl(url))) return { url, source: `rickandmorty:${data.results[0].name}` };
  } catch {
    // ignore
  }
  return null;
}

async function tryAkababSuperHero(ch) {
  if (!/comic|super|marvel|dc/i.test(`${ch.medium} ${ch.licence}`)) return null;
  try {
    if (!cache.heroes) {
      const res = await fetch('https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/all.json');
      cache.heroes = res.ok ? await res.json() : [];
    }
    const clean = cleanQueryName(ch.name).toLowerCase();
    const match =
      cache.heroes.find((h) => h.name.toLowerCase() === clean) ||
      cache.heroes.find((h) => (h.biography?.fullName || '').toLowerCase() === clean) ||
      cache.heroes.find((h) => clean.includes(h.name.toLowerCase()));
    const url = match?.images?.md || match?.images?.lg;
    if (url && (await verifyImageUrl(url))) return { url, source: `akabab:${match.name}` };
  } catch {
    // ignore
  }
  return null;
}

async function tryHarryPotterApi(ch) {
  if (!/harry potter/i.test(ch.licence)) return null;
  try {
    if (!cache.hpChars) {
      const res = await fetch('https://hp-api.onrender.com/api/characters');
      cache.hpChars = res.ok ? await res.json() : [];
    }
    const clean = cleanQueryName(ch.name).toLowerCase();
    const match = cache.hpChars.find((h) => h.name.toLowerCase().includes(clean) || clean.includes(h.name.toLowerCase()));
    if (match?.image && (await verifyImageUrl(match.image))) {
      return { url: match.image, source: `hp-api:${match.name}` };
    }
  } catch {
    // ignore
  }
  return null;
}

async function tryAmiiboApi(ch) {
  if (!/nintendo|sega|jeu/i.test(`${ch.medium} ${ch.licence}`)) return null;
  try {
    if (!cache.amiibos) {
      const res = await fetch('https://www.amiiboapi.com/api/amiibo/');
      const json = res.ok ? await res.json() : {};
      cache.amiibos = json.amiibo || [];
    }
    const clean = cleanQueryName(ch.name).toLowerCase();
    const match =
      cache.amiibos.find((a) => (a.character || '').toLowerCase() === clean && a.type === 'Figure') ||
      cache.amiibos.find((a) => (a.character || '').toLowerCase() === clean);
    if (match?.image && (await verifyImageUrl(match.image))) {
      return { url: match.image, source: `amiibo:${match.character}` };
    }
  } catch {
    // ignore
  }
  return null;
}

async function tryAniList(ch) {
  if (!/anim|manga|manhwa|shonen/i.test(`${ch.medium} ${ch.licence}`)) return null;
  const q = cleanQueryName(ch.name);
  const query = `query ($q: String) { Page(page: 1, perPage: 8) { characters(search: $q, sort: FAVOURITES_DESC) { id name { full } image { large } media(perPage: 5) { nodes { title { romaji english } } } } } }`;
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables: { q } })
    });
    if (!res.ok) return null;
    const json = await res.json();
    const cands = json?.data?.Page?.characters || [];
    const licWords = cleanQueryName(ch.licence).toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const preferred =
      cands.find((cand) => {
        const titles = (cand.media?.nodes || [])
          .flatMap((m) => [m.title?.romaji || '', m.title?.english || ''])
          .join(' ')
          .toLowerCase();
        return licWords.some((w) => titles.includes(w));
      }) || cands[0];

    const url = preferred?.image?.large;
    if (url && (await verifyImageUrl(url))) {
      return { url, source: `anilist:${preferred.name?.full}` };
    }
  } catch {
    // ignore
  }
  return null;
}

async function tryFandomSearch(ch) {
  const hint = FANDOM_DOMAIN_HINTS.find(([re]) => re.test(`${ch.licence} ${ch.medium}`));
  if (!hint) return null;
  const domain = hint[1];
  const q = cleanQueryName(ch.name);
  try {
    const searchUrl = `https://${domain}/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=3&format=json`;
    const sRes = await fetch(searchUrl, { headers: { 'User-Agent': 'RankingOfRanking/1.0' } });
    if (!sRes.ok) return null;
    const sJson = await sRes.json();
    const hits = sJson?.query?.search || [];
    for (const hit of hits) {
      const imgUrl = `https://${domain}/api.php?action=query&titles=${encodeURIComponent(hit.title)}&prop=pageimages&pithumbsize=500&redirects=1&format=json`;
      const pRes = await fetch(imgUrl, { headers: { 'User-Agent': 'RankingOfRanking/1.0' } });
      if (!pRes.ok) continue;
      const pJson = await pRes.json();
      const first = Object.values(pJson?.query?.pages || {})[0];
      const url = first?.thumbnail?.source;
      if (url && (await verifyImageUrl(url))) {
        return { url, source: `fandom:${domain}/${hit.title}` };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function tryWikipediaSearch(ch) {
  const q = cleanQueryName(ch.name);
  for (const lang of ['en', 'fr']) {
    try {
      const sUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=3&format=json`;
      const sRes = await fetch(sUrl, { headers: { 'User-Agent': 'RankingOfRanking/1.0' } });
      if (!sRes.ok) continue;
      const sJson = await sRes.json();
      const firstTitle = sJson?.query?.search?.[0]?.title;
      if (!firstTitle) continue;

      const sumUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstTitle.replace(/ /g, '_'))}`;
      const r = await fetch(sumUrl, { headers: { 'User-Agent': 'RankingOfRanking/1.0' } });
      if (!r.ok) continue;
      const data = await r.json();
      const url = data?.thumbnail?.source || data?.originalimage?.source;
      if (url && !/logo|icon|symbol/i.test(url) && (await verifyImageUrl(url))) {
        return { url, source: `wiki-${lang}:${firstTitle}` };
      }
    } catch {
      // ignore
    }
  }
  return null;
}

async function resolveRemotePortrait(ch) {
  const lookups = [
    tryPokeApi,
    tryRickAndMortyApi,
    tryAkababSuperHero,
    tryHarryPotterApi,
    tryAniList,
    tryFandomSearch,
    tryAmiiboApi,
    tryWikipediaSearch
  ];
  for (const fn of lookups) {
    const found = await fn(ch);
    if (found) return found;
  }
  return null;
}

/* ==================== MAIN PIPELINE ==================== */
async function main() {
  if (!fs.existsSync(CHARS_JSON)) {
    console.error(`Fichier introuvable : ${CHARS_JSON}`);
    process.exit(1);
  }
  fs.mkdirSync(PORTRAITS_DIR, { recursive: true });

  const raw = JSON.parse(fs.readFileSync(CHARS_JSON, 'utf8'));
  if (!Array.isArray(raw)) {
    console.error('data/characters.json doit contenir un tableau JSON.');
    process.exit(1);
  }

  let svgCreated = 0;
  let fixedCount = 0;
  let checkedUrls = 0;
  let brokenUrls = 0;

  // Step 1: Ensure every character has a valid ID & local SVG fallback in assets/portraits/<id>.svg
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (!ch.id) {
      ch.id = slugify(ch.name) || `char-${i + 1}`;
    }
    const svgRel = `assets/portraits/${ch.id}.svg`;
    const svgAbs = path.join(ROOT, svgRel);
    if (REGEN_SVG || !fs.existsSync(svgAbs)) {
      fs.writeFileSync(svgAbs, generatePortraitSvg(ch), 'utf8');
      svgCreated++;
    }
  }

  // Step 2: Detect missing / broken character images and repair them
  for (const ch of raw) {
    const img = String(ch.image || '').trim();
    const isRemote = /^https?:\/\//i.test(img);
    const isData = img.startsWith('data:');
    const isLocalSvg = !isRemote && !isData && img.toLowerCase().endsWith('.svg');

    let needsFix = false;
    let reason = '';

    if (!img) {
      needsFix = true;
      reason = 'image vide';
    } else if (!isRemote && !isData) {
      const localAbs = path.join(ROOT, img);
      if (!fs.existsSync(localAbs)) {
        needsFix = true;
        reason = `fichier local manquant (${img})`;
      } else if (UPGRADE_SVG && isLocalSvg) {
        needsFix = true;
        reason = 'mise à niveau SVG -> image en ligne';
      }
    } else if (isRemote && CHECK_URLS && !SYNC_ONLY) {
      checkedUrls++;
      const ok = await verifyImageUrl(img);
      if (!ok) {
        needsFix = true;
        brokenUrls++;
        reason = 'URL distante inaccessible';
      }
    }

    if (!needsFix) continue;

    if (!SYNC_ONLY) {
      console.log(`🔍 ${ch.name} (${ch.id}) — ${reason} -> recherche d'image...`);
      const found = await resolveRemotePortrait(ch);
      if (found) {
        ch.image = found.url;
        fixedCount++;
        console.log(`  ✓ Trouvé via ${found.source} : ${found.url}`);
        continue;
      }
    }

    const fallbackRel = `assets/portraits/${ch.id}.svg`;
    if (ch.image !== fallbackRel) {
      ch.image = fallbackRel;
      fixedCount++;
      console.log(`  ↪ Repli SVG assigné : ${fallbackRel}`);
    }
  }

  // Step 3: Write formatted JSON and synchronize data/characters.js
  fs.writeFileSync(CHARS_JSON, JSON.stringify(raw, null, 2) + '\n', 'utf8');
  fs.writeFileSync(
    CHARS_JS,
    `// Auto-generated from data/characters.json — do not edit manually.\nwindow.CHARACTERS_DB = ${JSON.stringify(raw, null, 2)};\n`,
    'utf8'
  );

  console.log('');
  console.log(`✅ Terminé (${raw.length} personnages traités)`);
  console.log(`   • SVG générés / mis à jour : ${svgCreated}`);
  if (CHECK_URLS && !SYNC_ONLY) {
    console.log(`   • URLs vérifiées : ${checkedUrls} (cassées détectées : ${brokenUrls})`);
  }
  console.log(`   • Images corrigées : ${fixedCount}`);
  console.log(`   • Synchronisé : data/characters.json -> data/characters.js`);
}

main().catch((err) => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
