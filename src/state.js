(function (global) {
  'use strict';

  const ROR = (global.ROR = global.ROR || {});

  ROR.CARD_COUNT_STEPS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100];
  ROR.STORAGE_KEY = 'ranking_of_ranking_history_v1';
  ROR.CUSTOM_CHARS_KEY = 'ranking_of_ranking_custom_chars_v1';

  ROR.SPECIAL_CATEGORIES = [
    {
      id: 'overcheate',
      mode: 'power',
      label: 'Overcheaté',
      emoji: '♾️',
      description:
        'Puissance absolue, méta-narrative, volontairement sans plafond ou impossible à argumenter en 1v1 inter-univers (ex : Saitama).',
      defaultEnabled: false
    }
  ];

  ROR.AppState = {
    screen: 'home', // 'home' | 'setup' | 'game' | 'generator'
    mode: 'power',
    baseCharacters: [],
    customCharacters: [],
    characters: [],

    setup: {
      targetCount: 20,
      maxSwaps: 3,
      selectedLicences: new Set(),
      collapsedMediums: new Set(),
      enabledSpecialCategories: new Set(),
      collapsedSpecialCategories: new Set(['overcheate'])
    },

    game: null
  };

  ROR.escapeHtml = function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  ROR.shuffleArray = function shuffleArray(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  ROR.normalizeSpecialCategories = function normalizeSpecialCategories(ch) {
    const raw = (ch && typeof ch.specialCategories === 'object' && ch.specialCategories) || {};
    const out = {};
    for (const cat of ROR.SPECIAL_CATEGORIES) {
      out[cat.id] = Boolean(raw[cat.id] ?? ch?.[cat.id]);
    }
    return out;
  };

  ROR.getSpecialCategoriesForMode = function getSpecialCategoriesForMode(mode = ROR.AppState.mode || 'power') {
    return ROR.SPECIAL_CATEGORIES.filter((cat) => cat.mode === mode);
  };

  ROR.isCharacterEnabledBySpecialCategories = function isCharacterEnabledBySpecialCategories(
    char,
    mode = 'power',
    enabledSpecialCategories = ROR.AppState.setup?.enabledSpecialCategories
  ) {
    if (!char) return false;
    const enabledSet =
      enabledSpecialCategories && typeof enabledSpecialCategories.has === 'function'
        ? enabledSpecialCategories
        : new Set();
    const cats = char.specialCategories || {};
    for (const cat of ROR.getSpecialCategoriesForMode(mode)) {
      if (cats[cat.id] && !enabledSet.has(cat.id)) {
        return false;
      }
    }
    return true;
  };

  ROR.getEligibleCharacters = function getEligibleCharacters(
    characters,
    selectedLicences,
    enabledSpecialCategories = ROR.AppState.setup?.enabledSpecialCategories,
    mode = ROR.AppState.mode || 'power'
  ) {
    return (characters || []).filter(
      (ch) => selectedLicences.has(ch.licence) && ROR.isCharacterEnabledBySpecialCategories(ch, mode, enabledSpecialCategories)
    );
  };

  ROR.renderCharNameHtml = function renderCharNameHtml(char, { compact = false } = {}) {
    if (!char) return '';
    const esc = ROR.escapeHtml;
    const comp = String(char.complement || '').trim();
    if (!comp) return esc(char.name);
    return `${esc(char.name)} <span class="char-complement${compact ? ' is-compact' : ''}">${esc(comp)}</span>`;
  };

  ROR.renderSpecialBadgesHtml = function renderSpecialBadgesHtml(char, mode = ROR.AppState.mode || 'power') {
    if (!char || !char.specialCategories) return '';
    const esc = ROR.escapeHtml;
    return ROR.getSpecialCategoriesForMode(mode)
      .filter((cat) => char.specialCategories[cat.id])
      .map(
        (cat) =>
          `<span class="char-special-pill" title="${esc(cat.description)}">${esc(cat.emoji)} ${esc(cat.label)}</span>`
      )
      .join('');
  };

  ROR.normalizeCharacters = function normalizeCharacters(rawList, { isCustom = false } = {}) {
    return rawList
      .filter((ch) => ch && ch.name && ch.licence && ch.medium)
      .map((ch, idx) => ({
        id: ch.id || `char-${idx}-${String(ch.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: String(ch.name).trim(),
        complement: String(ch.complement || '').trim(),
        medium: String(ch.medium).trim(),
        licence: String(ch.licence).trim(),
        description: String(ch.description || '').trim(),
        image: String(ch.image || '').trim(),
        abilities: Array.isArray(ch.abilities) ? ch.abilities.map((a) => String(a).trim()).filter(Boolean) : [],
        priority: Number.isFinite(Number(ch.priority)) ? Math.max(1, Math.min(10, Number(ch.priority))) : 5,
        specialCategories: ROR.normalizeSpecialCategories(ch),
        isCustom: Boolean(ch.isCustom || isCustom),
        createdAt: ch.createdAt || null
      }));
  };

  ROR.loadCharacterDatabase = async function loadCharacterDatabase() {
    if (global.location.protocol === 'http:' || global.location.protocol === 'https:') {
      try {
        const res = await fetch('data/characters.json', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            return ROR.normalizeCharacters(data);
          }
        }
      } catch {
        // Fallback to window.CHARACTERS_DB
      }
    }
    if (Array.isArray(global.CHARACTERS_DB)) {
      return ROR.normalizeCharacters(global.CHARACTERS_DB);
    }
    return [];
  };

  ROR.buildMediumTree = function buildMediumTree(characters) {
    const mediumMap = new Map();
    for (const ch of characters) {
      if (!mediumMap.has(ch.medium)) {
        mediumMap.set(ch.medium, new Map());
      }
      const licMap = mediumMap.get(ch.medium);
      if (!licMap.has(ch.licence)) {
        licMap.set(ch.licence, []);
      }
      licMap.get(ch.licence).push(ch);
    }

    const tree = [];
    for (const [medium, licMap] of mediumMap.entries()) {
      const licences = [];
      let totalCount = 0;
      for (const [licence, chars] of licMap.entries()) {
        licences.push({ name: licence, count: chars.length, characters: chars });
        totalCount += chars.length;
      }
      licences.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      tree.push({ medium, totalCount, licences });
    }
    return tree;
  };

  ROR.computeJokerTarget = function computeJokerTarget(targetCount, availableCount) {
    const idealJokers = Math.max(1, Math.round(targetCount * 0.2));
    if (availableCount <= targetCount) return 0;
    return Math.min(idealJokers, availableCount - targetCount);
  };

  /**
   * Selects N + J characters from selected licences, balanced across licences
   * and prioritizing highest priority scores inside each licence.
   */
  ROR.selectCharactersForGame = function selectCharactersForGame(
    characters,
    selectedLicences,
    targetCount,
    enabledSpecialCategories = ROR.AppState.setup?.enabledSpecialCategories,
    mode = ROR.AppState.mode || 'power'
  ) {
    const pool = ROR.getEligibleCharacters(characters, selectedLicences, enabledSpecialCategories, mode);
    if (pool.length < targetCount) {
      throw new Error(`Pas assez de personnages (${pool.length}/${targetCount}).`);
    }

    const jokerCount = ROR.computeJokerTarget(targetCount, pool.length);
    const totalNeeded = targetCount + jokerCount;

    const buckets = new Map();
    for (const ch of pool) {
      if (!buckets.has(ch.licence)) buckets.set(ch.licence, []);
      buckets.get(ch.licence).push(ch);
    }

    const queues = [];
    for (const [licence, chars] of buckets.entries()) {
      const shuffled = ROR.shuffleArray(chars);
      shuffled.sort((a, b) => b.priority - a.priority);
      queues.push({ licence, items: shuffled, index: 0 });
    }

    const orderedQueues = ROR.shuffleArray(queues);
    const picked = [];

    while (picked.length < totalNeeded) {
      let addedInPass = false;
      for (const q of orderedQueues) {
        if (picked.length >= totalNeeded) break;
        if (q.index < q.items.length) {
          picked.push(q.items[q.index]);
          q.index += 1;
          addedInPass = true;
        }
      }
      if (!addedInPass) break;
    }

    const finalShuffled = ROR.shuffleArray(picked);
    return {
      mainDeck: finalShuffled.slice(0, targetCount),
      jokerDeck: finalShuffled.slice(targetCount, targetCount + jokerCount)
    };
  };

  ROR.createGameState = function createGameState({
    mode,
    targetCount,
    maxSwaps,
    selectedLicences,
    enabledSpecialCategories = new Set(),
    characters
  }) {
    const { mainDeck, jokerDeck } = ROR.selectCharactersForGame(
      characters,
      selectedLicences,
      targetCount,
      enabledSpecialCategories,
      mode
    );

    return {
      id: `game-${Date.now()}`,
      mode,
      targetCount,
      maxSwaps,
      swapsRemaining: maxSwaps,
      swapsUsed: 0,
      licencesUsed: Array.from(selectedLicences),
      mainDeck,
      jokerDeck,
      burnedCards: [],
      slots: Array(targetCount).fill(null),
      activeCard: null,
      activeCardSource: null,
      isFlipped: false,
      isBurning: false,
      overviewOpen: false,
      phase: 'playing', // 'playing' | 'postgame_swap' | 'finished'
      selectedSwapIndex: null,
      savedToHistory: false,
      createdAt: new Date().toISOString()
    };
  };

  ROR.loadSavedHistory = function loadSavedHistory() {
    try {
      const raw = global.localStorage.getItem(ROR.STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  ROR.saveGameToHistory = function saveGameToHistory(game) {
    if (!game || game.savedToHistory) return ROR.loadSavedHistory();
    const history = ROR.loadSavedHistory();
    const entry = {
      id: game.id,
      mode: game.mode,
      targetCount: game.targetCount,
      swapsUsed: game.swapsUsed,
      maxSwaps: game.maxSwaps,
      burnedCount: game.burnedCards.length,
      licencesCount: game.licencesUsed.length,
      finishedAt: new Date().toISOString(),
      ranking: game.slots.map((ch, idx) => ({
        rank: idx + 1,
        id: ch?.id || '',
        name: ch?.name || 'Vide',
        complement: ch?.complement || '',
        licence: ch?.licence || '',
        medium: ch?.medium || '',
        image: ch?.image || ''
      }))
    };

    const next = [entry, ...history].slice(0, 30);
    try {
      global.localStorage.setItem(ROR.STORAGE_KEY, JSON.stringify(next));
      game.savedToHistory = true;
    } catch {
      // Ignore storage quota errors
    }
    return next;
  };

  ROR.deleteHistoryEntry = function deleteHistoryEntry(id) {
    const history = ROR.loadSavedHistory().filter((item) => item.id !== id);
    try {
      global.localStorage.setItem(ROR.STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Ignore
    }
    return history;
  };

  ROR.formatRankingAsText = function formatRankingAsText(slots, modeLabel = 'Puissance') {
    const lines = [`Ranking of Ranking — Mode ${modeLabel} (${slots.length} persos)`, ''];
    slots.forEach((ch, idx) => {
      const prefix = `#${idx + 1}`;
      if (!ch) {
        lines.push(`${prefix} - Vide`);
        return;
      }
      const label = ch.complement ? `${ch.name} (${ch.complement})` : ch.name;
      lines.push(`${prefix} - ${label} (${ch.licence})`);
    });
    return lines.join('\n');
  };

  /**
   * Parses CSV text (columns: name,medium,licence,description,image,abilities,priority)
   * where abilities are separated by ';' or '|'.
   */
  ROR.parseCharactersCsv = function parseCharactersCsv(csvText) {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];
    const sep = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
    const splitCsvLine = (line) => {
      const cells = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === sep && !inQuotes) {
          cells.push(cur.trim());
          cur = '';
        } else {
          cur += ch;
        }
      }
      cells.push(cur.trim());
      return cells;
    };

    const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
    const idxOf = (names) => headers.findIndex((h) => names.includes(h));
    const iName = idxOf(['name', 'nom']);
    const iComp = idxOf(['complement', 'complément', 'variant', 'variante']);
    const iMedium = idxOf(['medium', 'médium']);
    const iLicence = idxOf(['licence', 'license']);
    const iDesc = idxOf(['description', 'desc']);
    const iImg = idxOf(['image', 'img']);
    const iAbil = idxOf(['abilities', 'capacites', 'capacités', 'points_forts']);
    const iPrio = idxOf(['priority', 'priorite', 'priorité']);
    const iOver = idxOf(['overcheate', 'overcheated', 'overcheaté']);

    const parseBoolCell = (val) => /^(1|true|oui|yes|x)$/i.test(String(val || '').trim());

    const list = [];
    for (let r = 1; r < lines.length; r++) {
      const row = splitCsvLine(lines[r]);
      const name = row[iName] || '';
      if (!name) continue;
      const abilitiesRaw = iAbil >= 0 ? row[iAbil] || '' : '';
      list.push({
        name,
        complement: iComp >= 0 ? row[iComp] || '' : '',
        medium: (iMedium >= 0 ? row[iMedium] : '') || 'Divers',
        licence: (iLicence >= 0 ? row[iLicence] : '') || 'Personnalisé',
        description: iDesc >= 0 ? row[iDesc] || '' : '',
        image: iImg >= 0 ? row[iImg] || '' : '',
        abilities: abilitiesRaw.split(/[|;]/).map((s) => s.trim()).filter(Boolean),
        priority: iPrio >= 0 ? Number(row[iPrio]) || 5 : 5,
        specialCategories: {
          overcheate: iOver >= 0 ? parseBoolCell(row[iOver]) : false
        }
      });
    }
    return ROR.normalizeCharacters(list);
  };

  /* ==================== CUSTOM CHARACTERS (LOCAL GENERATOR) ==================== */
  ROR.slugify = function slugify(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'perso';
  };

  ROR.generateInlinePortraitSvg = function generateInlinePortraitSvg(name, licence) {
    const clean = String(name || '?').replace(/\([^)]*\)/g, '').trim();
    const words = clean.split(/[\s'-]+/).filter(Boolean);
    const initials = words.length <= 1 ? (words[0] || '?').slice(0, 2).toUpperCase() : (words[0][0] + words[words.length - 1][0]).toUpperCase();
    const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
      <defs>
        <radialGradient id="g" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.45"/>
          <stop offset="65%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#050814"/>
        </radialGradient>
      </defs>
      <rect width="320" height="320" fill="url(#g)"/>
      <circle cx="160" cy="155" r="56" fill="#090d1b" stroke="#22d3ee" stroke-width="3.5"/>
      <text x="160" y="170" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="38" fill="#ffffff">${esc(initials)}</text>
      <rect x="24" y="18" width="272" height="26" rx="13" fill="#000" fill-opacity="0.5" stroke="#8b5cf6" stroke-opacity="0.6"/>
      <text x="160" y="35" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="11" fill="#67e8f9">${esc(String(licence || 'PERSO').toUpperCase().slice(0, 28))}</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  ROR.getFallbackImage = function getFallbackImage(ch) {
    if (!ch) return '';
    if (!ch.isCustom && ch.id && !String(ch.id).startsWith('custom-')) {
      return `assets/portraits/${ch.id}.svg`;
    }
    return ROR.generateInlinePortraitSvg(ch.name, ch.licence);
  };

  ROR.onImgError = function onImgError(imgEl) {
    if (!imgEl) return;
    const step = imgEl.dataset.fbStep || '0';
    if (step === '0') {
      imgEl.dataset.fbStep = '1';
      const fallback = imgEl.dataset.fallback;
      if (fallback && imgEl.getAttribute('src') !== fallback) {
        imgEl.src = fallback;
        return;
      }
    }
    if (step === '1' || step === '0') {
      imgEl.dataset.fbStep = '2';
      const inline = ROR.generateInlinePortraitSvg(imgEl.alt || 'Perso', imgEl.dataset.licence || '');
      if (imgEl.getAttribute('src') !== inline) {
        imgEl.src = inline;
        return;
      }
    }
    imgEl.onerror = null;
  };

  ROR.loadCustomCharacters = function loadCustomCharacters() {
    try {
      const raw = global.localStorage.getItem(ROR.CUSTOM_CHARS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? ROR.normalizeCharacters(parsed, { isCustom: true }) : [];
    } catch {
      return [];
    }
  };

  ROR.saveCustomCharacters = function saveCustomCharacters(list) {
    const clean = ROR.normalizeCharacters(list, { isCustom: true });
    ROR.AppState.customCharacters = clean;
    try {
      global.localStorage.setItem(ROR.CUSTOM_CHARS_KEY, JSON.stringify(clean));
    } catch (err) {
      throw new Error("Stockage local plein : essayez une image plus légère ou une URL externe.");
    }
    ROR.refreshAllCharacters();
    return clean;
  };

  ROR.refreshAllCharacters = function refreshAllCharacters(autoSelectLicences = []) {
    const base = ROR.AppState.baseCharacters || [];
    const custom = ROR.AppState.customCharacters || [];
    ROR.AppState.characters = [...base, ...custom];
    for (const lic of autoSelectLicences) {
      if (lic) ROR.AppState.setup.selectedLicences.add(lic);
    }
  };

  ROR.upsertCustomCharacter = function upsertCustomCharacter(input) {
    const list = [...(ROR.AppState.customCharacters || [])];
    const existingIdx = input.id ? list.findIndex((c) => c.id === input.id) : -1;
    const baseSlug = ROR.slugify(input.name);

    let id = input.id;
    if (!id) {
      id = `custom-${baseSlug}-${Date.now().toString(36).slice(-4)}`;
    }

    const image = (input.image || '').trim() || ROR.generateInlinePortraitSvg(input.name, input.licence);

    const record = ROR.normalizeCharacters(
      [
        {
          id,
          name: input.name,
          complement: input.complement || '',
          medium: input.medium,
          licence: input.licence,
          description: input.description,
          image,
          abilities: input.abilities,
          priority: input.priority,
          specialCategories: input.specialCategories || {},
          isCustom: true,
          createdAt: existingIdx >= 0 ? list[existingIdx].createdAt || new Date().toISOString() : new Date().toISOString()
        }
      ],
      { isCustom: true }
    )[0];

    if (existingIdx >= 0) {
      list[existingIdx] = record;
    } else {
      list.unshift(record);
    }

    ROR.saveCustomCharacters(list);
    ROR.AppState.setup.selectedLicences.add(record.licence);
    return record;
  };

  ROR.deleteCustomCharacter = function deleteCustomCharacter(id) {
    const next = (ROR.AppState.customCharacters || []).filter((c) => c.id !== id);
    return ROR.saveCustomCharacters(next);
  };

  function decodeDataUrl(dataUrl) {
    const match = /^data:([^;,]+)(;base64)?,(.*)$/i.exec(dataUrl || '');
    if (!match) return null;
    const mime = match[1].toLowerCase();
    const isBase64 = Boolean(match[2]);
    const payload = match[3];
    let ext = 'png';
    if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
    else if (mime.includes('svg')) ext = 'svg';
    else if (mime.includes('gif')) ext = 'gif';

    let bytes;
    if (isBase64) {
      const bin = global.atob(payload);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
      bytes = new TextEncoder().encode(decodeURIComponent(payload));
    }
    return { mime, ext, bytes };
  }

  /**
   * Builds a ZIP archive containing characters.json + extracted portrait files
   * ready to drop into data/characters.json and assets/portraits/.
   */
  ROR.buildCustomCharactersZipBytes = function buildCustomCharactersZipBytes(customList) {
    const files = [];
    const exportedChars = [];
    let imageFileCount = 0;

    for (const ch of customList) {
      let imageField = ch.image || '';
      if (imageField.startsWith('data:')) {
        const decoded = decodeDataUrl(imageField);
        if (decoded) {
          const filename = `${ROR.slugify(ch.id || ch.name)}.${decoded.ext}`;
          files.push({
            name: `portraits/${filename}`,
            data: decoded.bytes
          });
          imageField = `assets/portraits/${filename}`;
          imageFileCount += 1;
        }
      }

      const exportedObj = {
        id: ch.id,
        name: ch.name
      };
      if (ch.complement) exportedObj.complement = ch.complement;
      exportedObj.medium = ch.medium;
      exportedObj.licence = ch.licence;
      exportedObj.description = ch.description;
      exportedObj.image = imageField;
      exportedObj.abilities = ch.abilities;
      exportedObj.priority = ch.priority;
      if (ch.specialCategories && Object.values(ch.specialCategories).some(Boolean)) {
        exportedObj.specialCategories = Object.fromEntries(
          Object.entries(ch.specialCategories).filter(([, enabled]) => Boolean(enabled))
        );
      }
      exportedChars.push(exportedObj);
    }

    files.unshift({
      name: 'characters.json',
      data: JSON.stringify(exportedChars, null, 2)
    });

    const readme = [
      'Ranking of Ranking — Export de personnages personnalises',
      `Date : ${new Date().toLocaleString('fr-FR')}`,
      `Personnages inclus : ${exportedChars.length}`,
      `Fichiers portraits inclus : ${imageFileCount}`,
      '',
      'Pour les integrer au projet principal :',
      '1. Copiez les fichiers du dossier portraits/ dans assets/portraits/',
      '2. Ajoutez les objets de characters.json dans data/characters.json (puis mettez a jour data/characters.js).'
    ].join('\r\n');

    files.push({
      name: 'README.txt',
      data: readme
    });

    return ROR.createZipBytes(files);
  };
})(window);
