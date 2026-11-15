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

            <div class="mode-card mode-card-locked" aria-disabled="true">
              <div class="mode-card-top">
                <span class="mode-icon">✨</span>
                <span class="mode-badge mode-badge-soon">Bientôt</span>
              </div>
              <h3 class="mode-title">Beauté &amp; Charisme</h3>
              <p class="mode-desc">
                Design, prestance et aura : qui mérite le trône de l'élégance ?
              </p>
              <div class="mode-cta mode-cta-locked">Prochainement</div>
            </div>

            <div class="mode-card mode-card-locked" aria-disabled="true">
              <div class="mode-card-top">
                <span class="mode-icon">🔥</span>
                <span class="mode-badge mode-badge-soon">Bientôt</span>
              </div>
              <h3 class="mode-title">Smash or Pass</h3>
              <p class="mode-desc">
                Mode soirée rapide en duo ou en groupe : on garde ou on brûle en direct !
              </p>
              <div class="mode-cta mode-cta-locked">Prochainement</div>
            </div>

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

    container.querySelector('[data-action="select-mode"]')?.addEventListener('click', () => {
      ROR.navigateTo('setup');
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
                        const top1 = entry.ranking[0]?.name || '—';
                        return `
                          <button type="button" class="history-item ${isSelected ? 'is-selected' : ''}" data-history-id="${esc(entry.id)}">
                            <div class="history-item-top">
                              <span class="history-mode">⚡ Puissance • ${entry.targetCount} persos</span>
                              <span class="history-date">${esc(dateStr)}</span>
                            </div>
                            <div class="history-item-winner">🥇 ${esc(top1)}</div>
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
                              <span class="meta-pill">${activeEntry.targetCount} classés</span>
                              <span class="meta-pill">${activeEntry.swapsUsed}/${activeEntry.maxSwaps} échanges</span>
                              <span class="meta-pill">${activeEntry.burnedCount || 0} brûlées</span>
                            </div>
                            <div class="history-detail-actions">
                              <button type="button" class="btn btn-sm btn-secondary" data-copy-history>📋 Copier</button>
                              <button type="button" class="btn btn-sm btn-danger" data-delete-history="${esc(activeEntry.id)}">🗑 Supprimer</button>
                            </div>
                          </div>
                          <div class="history-ranking-grid">
                            ${activeEntry.ranking
                              .map(
                                (row) => `
                                <div class="mini-grid-card ${row.rank <= 3 ? `rank-top-${row.rank}` : ''}">
                                  <span class="mini-rank">#${row.rank}</span>
                                  ${
                                    row.image
                                      ? `<img class="mini-thumb" src="${esc(row.image)}" alt="${esc(row.name)}" loading="lazy" onerror="this.style.display='none'"/>`
                                      : ''
                                  }
                                  <div class="mini-info">
                                    <div class="mini-name">${esc(row.name)}</div>
                                    <div class="mini-licence">${esc(row.licence)}</div>
                                  </div>
                                </div>
                              `
                              )
                              .join('')}
                          </div>
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
        const text = ROR.formatRankingAsText(activeEntry.ranking, 'Puissance');
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
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.licence.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
        );
      });

      overlay.innerHTML = `
        <div class="modal-panel modal-panel-wide">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">📚 Base de personnages (${filtered.length}${filtered.length !== chars.length ? ` / ${chars.length}` : ''})</h2>
              <p class="modal-subtitle">Chargée depuis <code>data/characters.json</code> — Vous pouvez aussi importer un fichier JSON ou CSV local</p>
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
            <label class="btn btn-sm btn-secondary db-upload-label">
              📂 Importer JSON / CSV
              <input type="file" accept=".json,.csv" hidden data-import-file />
            </label>
          </div>

          <div class="db-grid">
            ${filtered
              .slice(0, 120)
              .map(
                (c) => `
              <div class="db-card">
                <img class="db-thumb" src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy" onerror="this.style.display='none'"/>
                <div class="db-card-body">
                  <div class="db-card-head">
                    <strong>${esc(c.name)} ${c.isCustom ? '<span class="custom-badge">Perso local</span>' : ''}</strong>
                    <span class="prio-badge" title="Indice de priorité">★ ${c.priority}</span>
                  </div>
                  <div class="db-card-sub">${esc(c.medium)} • ${esc(c.licence)}</div>
                  <div class="db-card-desc">${esc(c.description)}</div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
          ${filtered.length > 120 ? `<p class="muted" style="margin-top:10px;text-align:center;">Affichage limité aux 120 premiers résultats (${filtered.length} trouvés).</p>` : ''}
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
