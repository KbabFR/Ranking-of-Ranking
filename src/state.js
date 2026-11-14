(function (global) {
  'use strict';

  const ROR = (global.ROR = global.ROR || {});

  ROR.CARD_COUNT_STEPS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100];
  ROR.STORAGE_KEY = 'ranking_of_ranking_history_v1';

  ROR.AppState = {
    screen: 'home', // 'home' | 'setup' | 'game'
    mode: 'power',
    characters: [],

    setup: {
      targetCount: 20,
      maxSwaps: 3,
      selectedLicences: new Set(),
      collapsedMediums: new Set()
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

  ROR.normalizeCharacters = function normalizeCharacters(rawList) {
    return rawList
      .filter((ch) => ch && ch.name && ch.licence && ch.medium)
      .map((ch, idx) => ({
        id: ch.id || `char-${idx}-${String(ch.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: String(ch.name).trim(),
        medium: String(ch.medium).trim(),
        licence: String(ch.licence).trim(),
        description: String(ch.description || '').trim(),
        image: String(ch.image || '').trim(),
        abilities: Array.isArray(ch.abilities) ? ch.abilities.map((a) => String(a).trim()).filter(Boolean) : [],
        priority: Number.isFinite(Number(ch.priority)) ? Number(ch.priority) : 5
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
  ROR.selectCharactersForGame = function selectCharactersForGame(characters, selectedLicences, targetCount) {
    const pool = characters.filter((ch) => selectedLicences.has(ch.licence));
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

  ROR.createGameState = function createGameState({ mode, targetCount, maxSwaps, selectedLicences, characters }) {
    const { mainDeck, jokerDeck } = ROR.selectCharactersForGame(characters, selectedLicences, targetCount);

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
      lines.push(`${prefix} - ${ch ? `${ch.name} (${ch.licence})` : 'Vide'}`);
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
    const iMedium = idxOf(['medium', 'médium']);
    const iLicence = idxOf(['licence', 'license']);
    const iDesc = idxOf(['description', 'desc']);
    const iImg = idxOf(['image', 'img']);
    const iAbil = idxOf(['abilities', 'capacites', 'capacités', 'points_forts']);
    const iPrio = idxOf(['priority', 'priorite', 'priorité']);

    const list = [];
    for (let r = 1; r < lines.length; r++) {
      const row = splitCsvLine(lines[r]);
      const name = row[iName] || '';
      if (!name) continue;
      const abilitiesRaw = iAbil >= 0 ? row[iAbil] || '' : '';
      list.push({
        name,
        medium: (iMedium >= 0 ? row[iMedium] : '') || 'Divers',
        licence: (iLicence >= 0 ? row[iLicence] : '') || 'Personnalisé',
        description: iDesc >= 0 ? row[iDesc] || '' : '',
        image: iImg >= 0 ? row[iImg] || '' : '',
        abilities: abilitiesRaw.split(/[|;]/).map((s) => s.trim()).filter(Boolean),
        priority: iPrio >= 0 ? Number(row[iPrio]) || 5 : 5
      });
    }
    return ROR.normalizeCharacters(list);
  };
})(window);
