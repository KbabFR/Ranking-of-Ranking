(function (global) {
  'use strict';

  const ROR = (global.ROR = global.ROR || {});

  ROR.renderSetupScreen = function renderSetupScreen(container) {
    const esc = ROR.escapeHtml;
    const { setup, characters } = ROR.AppState;
    const tree = ROR.buildMediumTree(characters);

    const steps = ROR.CARD_COUNT_STEPS;
    let stepIndex = steps.indexOf(setup.targetCount);
    if (stepIndex === -1) {
      stepIndex = 3; // 20
      setup.targetCount = steps[stepIndex];
    }

    const availableChars = characters.filter((c) => setup.selectedLicences.has(c.licence));
    const availableCount = availableChars.length;
    const jokerCount = ROR.computeJokerTarget(setup.targetCount, availableCount);
    const idealJokerCount = Math.max(1, Math.round(setup.targetCount * 0.2));
    const canStart = availableCount >= setup.targetCount;

    container.innerHTML = `
      <div class="screen screen-setup">
        <header class="topbar">
          <button type="button" class="btn btn-ghost" data-action="back-home">← Accueil</button>
          <div class="topbar-center">
            <span class="mode-tag">⚡ Mode : Puissance</span>
            <h1 class="topbar-title">Paramètres de la partie</h1>
          </div>
          <div class="topbar-right"></div>
        </header>

        <div class="setup-grid">
          <section class="panel setup-rules-panel">
            <h2 class="panel-title">Règles du classement</h2>

            <div class="slider-block">
              <div class="slider-header">
                <label for="card-count-slider" class="slider-label">Nombre de personnages à classer</label>
                <span class="slider-value-badge" id="card-count-readout">${setup.targetCount}</span>
              </div>
              <input
                id="card-count-slider"
                type="range"
                min="0"
                max="${steps.length - 1}"
                step="1"
                value="${stepIndex}"
                class="range-input"
              />
              <div class="slider-ticks">
                ${steps
                  .map(
                    (val, idx) => `
                  <button
                    type="button"
                    class="tick-btn ${val === setup.targetCount ? 'is-active' : ''}"
                    data-step-index="${idx}"
                    title="${val} personnages"
                  >${val}</button>
                `
                  )
                  .join('')}
              </div>
              <p class="slider-hint">
                De 5 en 5 jusqu'à 50, puis par dizaines jusqu'à 100.
                <br/>
                Deck Joker (~20%) : <strong id="joker-preview">${jokerCount}</strong> carte${jokerCount > 1 ? 's' : ''} Joker
                ${jokerCount < idealJokerCount && canStart ? `<span class="warn-inline">(plafonné par les ${availableCount} persos sélectionnés)</span>` : ''}
              </p>
            </div>

            <div class="slider-block">
              <div class="slider-header">
                <label for="swap-count-slider" class="slider-label">Échanges autorisés en fin de partie</label>
                <span class="slider-value-badge slider-value-amber" id="swap-count-readout">${setup.maxSwaps}</span>
              </div>
              <input
                id="swap-count-slider"
                type="range"
                min="1"
                max="10"
                step="1"
                value="${setup.maxSwaps}"
                class="range-input range-amber"
              />
              <div class="slider-ticks slider-ticks-10">
                ${Array.from({ length: 10 }, (_, i) => i + 1)
                  .map(
                    (val) => `
                  <button
                    type="button"
                    class="tick-btn ${val === setup.maxSwaps ? 'is-active' : ''}"
                    data-swap-val="${val}"
                  >${val}</button>
                `
                  )
                  .join('')}
              </div>
              <p class="slider-hint">
                Une fois toutes les cases remplies, vous pourrez échanger jusqu'à <strong>${setup.maxSwaps}</strong> paires de cartes.
              </p>
            </div>

            <div class="summary-card ${canStart ? 'is-valid' : 'is-invalid'}">
              <div class="summary-row">
                <span>Personnages disponibles (licences cochées)</span>
                <strong id="available-count">${availableCount}</strong>
              </div>
              <div class="summary-row">
                <span>Cartes requises (Deck + Jokers)</span>
                <strong>${setup.targetCount} + ${jokerCount} = ${setup.targetCount + jokerCount}</strong>
              </div>
              ${
                !canStart
                  ? `<div class="summary-error">Sélectionnez plus de licences ou réduisez le nombre de personnages (manque ${setup.targetCount - availableCount} perso${setup.targetCount - availableCount > 1 ? 's' : ''}).</div>`
                  : `<div class="summary-ok">Les personnages les plus marquants (indice de priorité) seront sélectionnés en premier si le pool dépasse ${setup.targetCount + jokerCount}.</div>`
              }
            </div>

            <button
              type="button"
              class="btn btn-primary btn-launch"
              data-action="launch-game"
              ${canStart ? '' : 'disabled'}
            >
              🎴 Lancer la partie (${setup.targetCount} rangs)
            </button>
          </section>

          <section class="panel setup-licences-panel">
            <div class="panel-head-row">
              <div>
                <h2 class="panel-title">Médiums &amp; Licences</h2>
                <p class="panel-subtitle">Cochez les univers inclus dans le tirage</p>
              </div>
              <div class="licence-bulk-actions">
                <button type="button" class="btn btn-xs btn-secondary" data-action="select-all">Tout cocher</button>
                <button type="button" class="btn btn-xs btn-ghost" data-action="deselect-all">Tout décocher</button>
              </div>
            </div>

            <div class="medium-tree">
              ${tree
                .map((group) => {
                  const selectedInGroup = group.licences.filter((l) => setup.selectedLicences.has(l.name));
                  const allChecked = selectedInGroup.length === group.licences.length && group.licences.length > 0;
                  const someChecked = selectedInGroup.length > 0 && !allChecked;
                  const isCollapsed = setup.collapsedMediums.has(group.medium);
                  const selectedCharsInGroup = selectedInGroup.reduce((s, l) => s + l.count, 0);

                  return `
                    <div class="medium-group ${isCollapsed ? 'is-collapsed' : ''}" data-medium="${esc(group.medium)}">
                      <div class="medium-row">
                        <button type="button" class="collapse-btn" data-toggle-collapse="${esc(group.medium)}" aria-label="Déplier ou replier">
                          ${isCollapsed ? '▸' : '▾'}
                        </button>
                        <label class="checkbox-label medium-checkbox-label">
                          <input
                            type="checkbox"
                            class="medium-checkbox"
                            data-medium-check="${esc(group.medium)}"
                            ${allChecked ? 'checked' : ''}
                            data-indeterminate="${someChecked ? 'true' : 'false'}"
                          />
                          <span class="medium-name">${esc(group.medium)}</span>
                        </label>
                        <span class="group-count-badge">${selectedInGroup.length}/${group.licences.length} • ${selectedCharsInGroup} persos</span>
                      </div>

                      <div class="licence-list">
                        ${group.licences
                          .map((lic) => {
                            const checked = setup.selectedLicences.has(lic.name);
                            return `
                              <label class="licence-row ${checked ? 'is-checked' : ''}">
                                <input
                                  type="checkbox"
                                  class="licence-checkbox"
                                  data-licence-check="${esc(lic.name)}"
                                  ${checked ? 'checked' : ''}
                                />
                                <span class="licence-name">${esc(lic.name)}</span>
                                <span class="licence-count">${lic.count}</span>
                              </label>
                            `;
                          })
                          .join('')}
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </section>
        </div>
      </div>
    `;

    // Set DOM indeterminate state on medium checkboxes
    container.querySelectorAll('.medium-checkbox[data-indeterminate="true"]').forEach((cb) => {
      cb.indeterminate = true;
    });

    container.querySelector('[data-action="back-home"]')?.addEventListener('click', () => {
      ROR.navigateTo('home');
    });

    const cardSlider = container.querySelector('#card-count-slider');
    cardSlider?.addEventListener('input', (e) => {
      const idx = Number(e.target.value);
      setup.targetCount = steps[idx] ?? 20;
      ROR.renderSetupScreen(container);
    });

    container.querySelectorAll('[data-step-index]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-step-index'));
        setup.targetCount = steps[idx] ?? 20;
        ROR.renderSetupScreen(container);
      });
    });

    const swapSlider = container.querySelector('#swap-count-slider');
    swapSlider?.addEventListener('input', (e) => {
      setup.maxSwaps = Number(e.target.value);
      ROR.renderSetupScreen(container);
    });

    container.querySelectorAll('[data-swap-val]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setup.maxSwaps = Number(btn.getAttribute('data-swap-val'));
        ROR.renderSetupScreen(container);
      });
    });

    container.querySelector('[data-action="select-all"]')?.addEventListener('click', () => {
      setup.selectedLicences = new Set(characters.map((c) => c.licence));
      ROR.renderSetupScreen(container);
    });

    container.querySelector('[data-action="deselect-all"]')?.addEventListener('click', () => {
      setup.selectedLicences.clear();
      ROR.renderSetupScreen(container);
    });

    container.querySelectorAll('[data-toggle-collapse]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const med = btn.getAttribute('data-toggle-collapse');
        if (setup.collapsedMediums.has(med)) {
          setup.collapsedMediums.delete(med);
        } else {
          setup.collapsedMediums.add(med);
        }
        ROR.renderSetupScreen(container);
      });
    });

    container.querySelectorAll('[data-medium-check]').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        const med = e.target.getAttribute('data-medium-check');
        const group = tree.find((g) => g.medium === med);
        if (!group) return;
        if (e.target.checked) {
          group.licences.forEach((l) => setup.selectedLicences.add(l.name));
        } else {
          group.licences.forEach((l) => setup.selectedLicences.delete(l.name));
        }
        ROR.renderSetupScreen(container);
      });
    });

    container.querySelectorAll('[data-licence-check]').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        const lic = e.target.getAttribute('data-licence-check');
        if (e.target.checked) {
          setup.selectedLicences.add(lic);
        } else {
          setup.selectedLicences.delete(lic);
        }
        ROR.renderSetupScreen(container);
      });
    });

    container.querySelector('[data-action="launch-game"]')?.addEventListener('click', () => {
      if (!canStart) return;
      ROR.startNewGame();
    });
  };
})(window);
