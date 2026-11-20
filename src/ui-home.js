(function (global) {
  'use strict';

  const ROR = (global.ROR = global.ROR || {});

  ROR.renderHomeScreen = function renderHomeScreen(container) {
    const { characters, customCharacters } = ROR.AppState;
    const history = ROR.loadSavedHistory();
    const tree = ROR.buildMediumTree(characters);
    const totalLicences = tree.reduce((sum, m) => sum + m.licences.length, 0);
    const customCount = (customCharacters || []).length;

    container.innerHTML = `
      <div class="screen screen-home">
        <div class="home-glow home-glow-1"></div>
        <div class="home-glow home-glow-2"></div>

        <header class="home-hero">
          <div class="hero-pill">JEU DE SOIRÉE • CLASSEMENT À L'AVEUGLE</div>
          <h1 class="hero-title">
            <span class="title-gradient">RANKING</span> OF RANKING
          </h1>
          <p class="hero-subtitle">
            Piochez des personnages légendaires à l'aveugle, placez-les dans votre top sans savoir qui arrive ensuite, et utilisez vos Jokers au bon moment.
          </p>
        </header>

        <section class="modes-section">
          <h2 class="section-heading">Choisissez votre mode de jeu</h2>
          <div class="modes-grid">
            <button type="button" class="mode-card mode-card-active" data-action="select-mode" data-mode="power">
              <div class="mode-card-top">
                <span class="mode-icon">⚡</span>
                <span class="mode-badge mode-badge-ready">Disponible</span>
              </div>
              <h3 class="mode-title">Puissance</h3>
              <p class="mode-desc">
                Classez les personnages du plus fort au plus faible selon leurs pouvoirs, leurs exploits et leur dangerosité.
              </p>
              <div class="mode-cta">
                <span>Configurer la partie</span>
                <span class="cta-arrow">→</span>
              </div>
            </button>

            <button type="button" class="mode-card mode-card-active mode-card-beauty" data-action="select-mode" data-mode="beauty">
              <div class="mode-card-top">
                <span class="mode-icon">✨</span>
                <span class="mode-badge mode-badge-ready">Disponible</span>
              </div>
              <h3 class="mode-title">Beauté &amp; Charisme</h3>
              <p class="mode-desc">
                Design, prestance et aura : cartes full-art verticales sans texte, qui mérite le trône de l'élégance ?
              </p>
              <div class="mode-cta">
                <span>Configurer la partie</span>
                <span class="cta-arrow">→</span>
              </div>
            </button>

            <button type="button" class="mode-card mode-card-active mode-card-smash" data-action="select-mode" data-mode="smash">
              <div class="mode-card-top">
                <span class="mode-icon">🔥</span>
                <span class="mode-badge mode-badge-ready">Disponible</span>
              </div>
              <h3 class="mode-title">Smash or Pass</h3>
              <p class="mode-desc">
                Mode soirée rapide : retournez la carte puis swipez à droite pour Smash, à gauche pour Pass, ou vers le haut pour Turbo Smash !
              </p>
              <div class="mode-cta">
                <span>Configurer la partie</span>
                <span class="cta-arrow">→</span>
              </div>
            </button>

            <div class="mode-card mode-card-locked" aria-disabled="true">
              <div class="mode-card-top">
                <span class="mode-icon">🧠</span>
                <span class="mode-badge mode-badge-soon">Bientôt</span>
              </div>
              <h3 class="mode-title">Autres Critères</h3>
              <p class="mode-desc">
                Intelligence, QI de combat, méchanceté ou thème libre entre amis.
              </p>
              <div class="mode-cta mode-cta-locked">Prochainement</div>
            </div>
          </div>
        </section>

        <footer class="home-footer-actions">
          <button type="button" class="btn btn-secondary" data-action="open-history">
            <span>🏆 Historique des classements</span>
            <span class="pill-count">${history.length}</span>
          </button>
          <button type="button" class="btn btn-ghost" data-action="open-database">
            <span>📚 Base de personnages</span>
            <span class="pill-count">${characters.length} persos • ${totalLicences} licences</span>
          </button>
          <button type="button" class="btn btn-secondary" data-action="open-generator">
            <span>✨ Générateur de personnages</span>
            <span class="pill-count">${customCount}</span>
          </button>
        </footer>
      </div>
    `;

    container.querySelectorAll('[data-action="select-mode"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ROR.AppState.mode = btn.getAttribute('data-mode') || 'power';
        ROR.navigateTo('setup');
      });
    });

    container.querySelector('[data-action="open-history"]')?.addEventListener('click', () => {
      ROR.openHistoryModal();
    });

    container.querySelector('[data-action="open-database"]')?.addEventListener('click', () => {
      ROR.openDatabaseModal();
    });

    container.querySelector('[data-action="open-generator"]')?.addEventListener('click', () => {
      ROR.navigateTo('generator');
    });
  };

  function renderSmashHistoryTiersHtml(tiers, esc) {
    const sections = [
      { key: 'turbo', label: '🚀 TURBO SMASH', cls: 'tier-row-turbo', list: tiers.turbo || [] },
      { key: 'smash', label: '🔥 SMASH', cls: 'tier-row-smash', list: tiers.smash || [] },
      { key: 'pass', label: '❄️ PASS', cls: 'tier-row-pass', list: tiers.pass || [] }
    ];
    return `
      <div class="smash-tierlist is-compact-tierlist">
        ${sections
          .map(
            (sec) => `
            <div class="tier-row ${sec.cls}">
              <div class="tier-label">
                <span class="tier-label-title">${sec.label}</span>
                <span class="tier-label-count">${sec.list.length}</span>
              </div>
              <div class="tier-items">
                ${
                  sec.list.length === 0
                    ? '<span class="tier-empty">Aucun personnage</span>'
                    : sec.list
                        .map(
                          (row) => `
                          <div class="mini-grid-card">
                            ${
                              row.image
                                ? `<img class="mini-thumb" src="${esc(row.image)}" alt="${esc(row.name)}" loading="lazy" data-fallback="${esc(ROR.getFallbackImage(row))}" data-licence="${esc(row.licence)}" onerror="window.ROR && window.ROR.onImgError(this)"/>`
                                : ''
                            }
                            <div class="mini-info">
                              <div class="mini-name">${ROR.renderCharNameHtml(row, { compact: true })}</div>
                              <div class="mini-licence">${esc(row.licence)}</div>
                            </div>
                          </div>
                        `
                        )
                        .join('')
                }
              </div>
            </div>
          `
          )
          .join('')}
      </div>
    `;
  }

  ROR.openHistoryModal = function openHistoryModal(selectedId = null) {
    const history = ROR.loadSavedHistory();
    const esc = ROR.escapeHtml;
    let activeEntry = selectedId ? history.find((h) => h.id === selectedId) : history[0] || null;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    function render() {
      const currentHistory = ROR.loadSavedHistory();
      if (activeEntry && !currentHistory.find((h) => h.id === activeEntry.id)) {
        activeEntry = currentHistory[0] || null;
      }

      overlay.innerHTML = `
        <div class="modal-panel modal-panel-wide">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">🏆 Historique des classements</h2>
              <p class="modal-subtitle">Parties sauvegardées localement sur cet appareil</p>
            </div>
            <button type="button" class="btn-icon-close" data-close>✕</button>
          </div>

          ${
            currentHistory.length === 0
              ? `<div class="empty-box">
                  <p>Aucun classement enregistré pour le moment.</p>
                  <p class="muted">Terminez une partie pour voir vos tops apparaître ici !</p>
                </div>`
              : `<div class="history-layout">
                  <div class="history-sidebar">
                    ${currentHistory
                      .map((entry) => {
                        const dateStr = new Date(entry.finishedAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        const isSelected = activeEntry && activeEntry.id === entry.id;
                        const modeMeta = ROR.getModeMeta(entry.mode || 'power');
                        const subSuffix =
                          (entry.mode === 'beauty' || entry.mode === 'smash') && entry.subMode === 'bg' ? ' (Mode BG)' : '';
                        let winnerLine = `🥇 ${esc(entry.ranking?.[0]?.name || '—')}`;
                        if (entry.mode === 'smash' && entry.tiers) {
                          const tCount = (entry.tiers.turbo || []).length;
                          const sCount = (entry.tiers.smash || []).length;
                          const pCount = (entry.tiers.pass || []).length;
                          winnerLine = `🚀 ${tCount} Turbo • 🔥 ${sCount} Smash • ❄️ ${pCount} Pass`;
                        }
                        return `
                          <button type="button" class="history-item ${isSelected ? 'is-selected' : ''}" data-history-id="${esc(entry.id)}">
                            <div class="history-item-top">
                              <span class="history-mode">${esc(modeMeta.tag + subSuffix)} • ${entry.targetCount} persos</span>
                              <span class="history-date">${esc(dateStr)}</span>
                            </div>
                            <div class="history-item-winner">${winnerLine}</div>
                          </button>
                        `;
                      })
                      .join('')}
                  </div>

                  <div class="history-detail">
                    ${
                      activeEntry
                        ? `
                          <div class="history-detail-bar">
                            <div class="history-meta-pills">
                              <span class="meta-pill">${activeEntry.targetCount} cartes</span>
                              ${
                                activeEntry.mode === 'smash'
                                  ? `<span class="meta-pill">🚀 ${activeEntry.turboUsed ?? activeEntry.swapsUsed}/${activeEntry.turboMax ?? activeEntry.maxSwaps} Turbo Smash</span>`
                                  : `
                                    <span class="meta-pill">${activeEntry.swapsUsed}/${activeEntry.maxSwaps} échanges</span>
                                    <span class="meta-pill">${activeEntry.burnedCount || 0} brûlées</span>
                                  `
                              }
                            </div>
                            <div class="history-detail-actions">
                              <button type="button" class="btn btn-sm btn-secondary" data-copy-history>📋 Copier</button>
                              <button type="button" class="btn btn-sm btn-danger" data-delete-history="${esc(activeEntry.id)}">🗑 Supprimer</button>
                            </div>
                          </div>
                          ${
                            activeEntry.mode === 'smash' && activeEntry.tiers
                              ? renderSmashHistoryTiersHtml(activeEntry.tiers, esc)
                              : `<div class="history-ranking-grid">
                                  ${activeEntry.ranking
                                    .map(
                                      (row) => `
                                      <div class="mini-grid-card ${row.rank <= 3 ? `rank-top-${row.rank}` : ''}">
                                        <span class="mini-rank">#${row.rank}</span>
                                        ${
                                          row.image
                                            ? `<img class="mini-thumb" src="${esc(row.image)}" alt="${esc(row.name)}" loading="lazy" data-fallback="${esc(ROR.getFallbackImage(row))}" data-licence="${esc(row.licence)}" onerror="window.ROR && window.ROR.onImgError(this)"/>`
                                            : ''
                                        }
                                        <div class="mini-info">
                                          <div class="mini-name">${ROR.renderCharNameHtml(row, { compact: true })}</div>
                                          <div class="mini-licence">${esc(row.licence)}</div>
                                        </div>
                                      </div>
                                    `
                                    )
                                    .join('')}
                                </div>`
                          }
                        `
                        : ''
                    }
                  </div>
                </div>`
          }
        </div>
      `;

      overlay.querySelector('[data-close]')?.addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });

      overlay.querySelectorAll('[data-history-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-history-id');
          activeEntry = currentHistory.find((h) => h.id === id) || null;
          render();
        });
      });

      overlay.querySelector('[data-delete-history]')?.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-delete-history');
        ROR.deleteHistoryEntry(id);
        activeEntry = null;
        render();
        if (ROR.AppState.screen === 'home') {
          ROR.renderCurrentScreen();
        }
      });

      overlay.querySelector('[data-copy-history]')?.addEventListener('click', async (e) => {
        if (!activeEntry) return;
        const modeLabel = ROR.getModeMeta(activeEntry.mode || 'power').label;
        const text =
          activeEntry.mode === 'smash' && activeEntry.tiers
            ? ROR.formatSmashTiersAsText(activeEntry.tiers, activeEntry.targetCount)
            : ROR.formatRankingAsText(activeEntry.ranking, modeLabel);
        try {
          await navigator.clipboard.writeText(text);
          e.currentTarget.textContent = '✓ Copié !';
          setTimeout(() => {
            if (e.currentTarget) e.currentTarget.textContent = '📋 Copier';
          }, 1500);
        } catch {
          // Ignore clipboard errors
        }
      });
    }

    render();
    document.body.appendChild(overlay);
  };

  ROR.openDatabaseModal = function openDatabaseModal() {
    const esc = ROR.escapeHtml;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    let searchTerm = '';
    let filterMedium = 'ALL';
    let filterLicence = 'ALL';
    let filterSpecial = 'ALL';

    function render() {
      const chars = ROR.AppState.characters;
      const mediums = Array.from(new Set(chars.map((c) => c.medium)));
      const availableLicences = Array.from(
        new Set(
          chars
            .filter((c) => filterMedium === 'ALL' || c.medium === filterMedium)
            .map((c) => c.licence)
        )
      ).sort((a, b) => a.localeCompare(b, 'fr'));

      if (filterLicence !== 'ALL' && !availableLicences.includes(filterLicence)) {
        filterLicence = 'ALL';
      }

      const q = searchTerm.trim().toLowerCase();
      const filtered = chars.filter((c) => {
        if (filterMedium !== 'ALL' && c.medium !== filterMedium) return false;
        if (filterLicence !== 'ALL' && c.licence !== filterLicence) return false;
        if (filterSpecial === 'OVERCHEATE' && !c.specialCategories?.overcheate) return false;
        if (filterSpecial === 'NORMAL' && c.specialCategories?.overcheate) return false;
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          (c.complement || '').toLowerCase().includes(q) ||
          c.licence.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
        );
      });

      overlay.innerHTML = `
        <div class="modal-panel modal-panel-wide">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">📚 Base de personnages (${filtered.length}${filtered.length !== chars.length ? ` / ${chars.length}` : ''})</h2>
              <p class="modal-subtitle">Chargée depuis <code>data/characters.json</code> — Cliquez sur un personnage pour voir sa carte</p>
            </div>
            <button type="button" class="btn-icon-close" data-close>✕</button>
          </div>

          <div class="db-toolbar">
            <input type="search" class="db-search" placeholder="Rechercher un personnage ou une licence..." value="${esc(searchTerm)}" />
            <select class="db-filter" data-filter-medium aria-label="Filtrer par médium">
              <option value="ALL">Tous les médiums</option>
              ${mediums.map((m) => `<option value="${esc(m)}" ${filterMedium === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}
            </select>
            <select class="db-filter" data-filter-licence aria-label="Filtrer par licence">
              <option value="ALL">Toutes les licences</option>
              ${availableLicences.map((l) => `<option value="${esc(l)}" ${filterLicence === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}
            </select>
            <select class="db-filter" data-filter-special aria-label="Filtrer par catégorie spéciale">
              <option value="ALL">Toutes catégories</option>
              <option value="NORMAL" ${filterSpecial === 'NORMAL' ? 'selected' : ''}>Classiques uniquement</option>
              <option value="OVERCHEATE" ${filterSpecial === 'OVERCHEATE' ? 'selected' : ''}>♾️ Overcheaté uniquement</option>
            </select>
            <label class="btn btn-sm btn-secondary db-upload-label">
              📂 Importer JSON / CSV
              <input type="file" accept=".json,.csv" hidden data-import-file />
            </label>
          </div>

          <div class="db-grid">
            ${filtered
              .slice(0, 500)
              .map(
                (c) => `
              <div
                role="button"
                tabindex="0"
                class="db-card db-card-clickable"
                data-db-inspect="${esc(c.id)}"
                title="Cliquer pour voir la carte de ${esc(c.name)}"
              >
                <img class="db-thumb" src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy" data-fallback="${esc(ROR.getFallbackImage(c))}" data-licence="${esc(c.licence)}" onerror="window.ROR && window.ROR.onImgError(this)"/>
                <div class="db-card-body">
                  <div class="db-card-head">
                    <strong>${ROR.renderCharNameHtml(c, { compact: true })} ${c.isCustom ? '<span class="custom-badge">Perso local</span>' : ''} ${ROR.renderSpecialBadgesHtml(c, 'power')}</strong>
                    <span class="gen-score-badges">
                      <span class="prio-badge" title="Indice de priorité">★ ${c.priority}</span>
                      <span class="beauty-badge" title="Indice beauté / BG">✨ ${c.beauty ?? 5}</span>
                    </span>
                  </div>
                  <div class="db-card-sub">${esc(c.medium)} • ${esc(c.licence)}${c.imageLandscape ? ' • <span class="landscape-badge" title="Image paysage dédiée disponible">🖼️ Paysage</span>' : ''}</div>
                  <div class="db-card-desc">${esc(c.description)}</div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
          ${filtered.length > 500 ? `<p class="muted" style="margin-top:10px;text-align:center;">Affichage limité aux 500 premiers résultats (${filtered.length} trouvés).</p>` : ''}
        </div>
      `;

      overlay.querySelector('[data-close]')?.addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });

      const searchInput = overlay.querySelector('.db-search');
      searchInput?.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        const pos = e.target.selectionStart;
        render();
        const nextInput = overlay.querySelector('.db-search');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(pos, pos);
        }
      });

      overlay.querySelector('[data-filter-medium]')?.addEventListener('change', (e) => {
        filterMedium = e.target.value;
        filterLicence = 'ALL';
        render();
      });

      overlay.querySelector('[data-filter-licence]')?.addEventListener('change', (e) => {
        filterLicence = e.target.value;
        render();
      });

      overlay.querySelector('[data-filter-special]')?.addEventListener('change', (e) => {
        filterSpecial = e.target.value;
        render();
      });

      const openDbCard = (cardEl) => {
        const id = cardEl.getAttribute('data-db-inspect');
        const found = ROR.AppState.characters.find((c) => c.id === id);
        if (found) {
          ROR.openCharacterInspectModal(found, {
            showModeToggle: true,
            showScores: true,
            showId: true,
            mode: 'power'
          });
        }
      };

      overlay.querySelectorAll('[data-db-inspect]').forEach((cardEl) => {
        cardEl.addEventListener('click', () => openDbCard(cardEl));
        cardEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDbCard(cardEl);
          }
        });
      });

      overlay.querySelector('[data-import-file]')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        let imported = [];
        try {
          if (file.name.toLowerCase().endsWith('.csv')) {
            imported = ROR.parseCharactersCsv(text);
          } else {
            const parsed = JSON.parse(text);
            imported = Array.isArray(parsed) ? ROR.normalizeCharacters(parsed) : [];
          }
          if (imported.length > 0) {
            ROR.AppState.baseCharacters = imported;
            ROR.refreshAllCharacters();
            ROR.AppState.setup.selectedLicences = new Set(ROR.AppState.characters.map((c) => c.licence));
            filterMedium = 'ALL';
            filterLicence = 'ALL';
            render();
            if (ROR.AppState.screen === 'home') {
              ROR.renderCurrentScreen();
            }
          } else {
            alert('Aucun personnage valide trouvé dans ce fichier.');
          }
        } catch (err) {
          alert('Impossible de lire le fichier : ' + err.message);
        }
      });
    }

    render();
    document.body.appendChild(overlay);
  };
})(window);
