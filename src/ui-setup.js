(function (global) {
  'use strict';

  const ROR = (global.ROR = global.ROR || {});

  function updateSetupStateUI(container, tree) {
    const { setup, characters, mode } = ROR.AppState;
    const steps = ROR.CARD_COUNT_STEPS;
    const stepIndex = Math.max(0, steps.indexOf(setup.targetCount));
    const specialCats = ROR.getSpecialCategoriesForMode(mode);

    const eligibleChars = ROR.getEligibleCharacters(characters, setup.selectedLicences, setup.enabledSpecialCategories, mode);
    const availableCount = eligibleChars.length;
    const isSmash = mode === 'smash';
    const jokerCount = ROR.computeJokerTarget(setup.targetCount, availableCount, mode);
    const idealJokerCount = Math.max(1, Math.round(setup.targetCount * 0.2));
    const canStart = availableCount >= setup.targetCount;

    // Update sliders & readouts without replacing DOM
    const cardSlider = container.querySelector('#card-count-slider');
    if (cardSlider && Number(cardSlider.value) !== stepIndex) {
      cardSlider.value = String(stepIndex);
    }
    const cardReadout = container.querySelector('#card-count-readout');
    if (cardReadout) cardReadout.textContent = String(setup.targetCount);

    container.querySelectorAll('[data-step-index]').forEach((btn) => {
      const idx = Number(btn.getAttribute('data-step-index'));
      btn.classList.toggle('is-active', idx === stepIndex);
    });

    const jokerHint = container.querySelector('#joker-hint');
    if (jokerHint) {
      if (isSmash) {
        jokerHint.innerHTML = `
          De 5 en 5 jusqu'à 50, puis par dizaines jusqu'à 100.
          <br/>
          Deck central (Portrait) : <strong>${setup.targetCount}</strong> cartes à retourner et swiper.
        `;
      } else {
        const capNotice =
          jokerCount < idealJokerCount && canStart
            ? ` <span class="warn-inline">(plafonné par les ${availableCount} persos sélectionnés)</span>`
            : '';
        jokerHint.innerHTML = `
          De 5 en 5 jusqu'à 50, puis par dizaines jusqu'à 100.
          <br/>
          Deck Joker (~20%) : <strong id="joker-preview">${jokerCount}</strong> carte${jokerCount > 1 ? 's' : ''} Joker${capNotice}
        `;
      }
    }

    const swapSlider = container.querySelector('#swap-count-slider');
    if (swapSlider && Number(swapSlider.value) !== setup.maxSwaps) {
      swapSlider.value = String(setup.maxSwaps);
    }
    const swapReadout = container.querySelector('#swap-count-readout');
    if (swapReadout) swapReadout.textContent = String(setup.maxSwaps);

    container.querySelectorAll('[data-swap-val]').forEach((btn) => {
      const val = Number(btn.getAttribute('data-swap-val'));
      btn.classList.toggle('is-active', val === setup.maxSwaps);
    });

    const swapHint = container.querySelector('#swap-hint');
    if (swapHint) {
      if (isSmash) {
        swapHint.innerHTML = `Durant la partie, vous pourrez glisser jusqu'à <strong>${setup.maxSwaps}</strong> carte${setup.maxSwaps > 1 ? 's' : ''} vers le haut en <strong>🚀 Turbo Smash</strong>.`;
      } else {
        swapHint.innerHTML = `Une fois toutes les cases remplies, vous pourrez échanger jusqu'à <strong>${setup.maxSwaps}</strong> paire${setup.maxSwaps > 1 ? 's' : ''} de cartes.`;
      }
    }

    // Update summary & launch button
    const summaryCard = container.querySelector('#summary-card');
    if (summaryCard) {
      summaryCard.classList.toggle('is-valid', canStart);
      summaryCard.classList.toggle('is-invalid', !canStart);
    }
    const availEl = container.querySelector('#available-count');
    if (availEl) availEl.textContent = String(availableCount);
    const reqEl = container.querySelector('#required-count');
    if (reqEl) {
      reqEl.textContent = isSmash
        ? `${setup.targetCount}`
        : `${setup.targetCount} + ${jokerCount} = ${setup.targetCount + jokerCount}`;
    }

    const activeSubMode = ROR.getActiveSubMode(mode, setup);
    if (mode === 'smash') {
      if (activeSubMode === 'personne_ne_juge') {
        setup.enabledSpecialCategories.add('personneNeJuge');
      } else {
        setup.enabledSpecialCategories.delete('personneNeJuge');
      }
    }

    container.querySelectorAll('[data-submode-radio]').forEach((radio) => {
      const val = radio.getAttribute('data-submode-radio');
      const checked = val === activeSubMode;
      radio.checked = checked;
      radio.closest('.submode-option')?.classList.toggle('is-checked', checked);
    });

    const summaryMsg = container.querySelector('#summary-message');
    if (summaryMsg) {
      if (!canStart) {
        summaryMsg.className = 'summary-error';
        const diff = setup.targetCount - availableCount;
        summaryMsg.textContent = `Sélectionnez plus de licences ou réduisez le nombre de personnages (manque ${diff} perso${diff > 1 ? 's' : ''}).`;
      } else if (mode === 'smash' && activeSubMode === 'personne_ne_juge') {
        summaryMsg.className = 'summary-ok';
        summaryMsg.textContent = `🫣 Mode Personne ne juge actif : seuls les personnages immondes, grotesques, boss monstrueux ou créatures improbables (${availableCount} éligibles) seront sélectionnés !`;
      } else if ((mode === 'beauty' || mode === 'smash') && activeSubMode === 'bg') {
        summaryMsg.className = 'summary-ok';
        summaryMsg.textContent = `Mode BG actif : les personnages avec le plus fort indice beauté (attrait & charisme) seront retenus en premier si le pool dépasse ${setup.targetCount + jokerCount}.`;
      } else {
        summaryMsg.className = 'summary-ok';
        summaryMsg.textContent = `Les personnages les plus marquants (indice de priorité) seront sélectionnés en premier si le pool dépasse ${setup.targetCount + jokerCount}.`;
      }
    }

    const launchBtn = container.querySelector('[data-action="launch-game"]');
    if (launchBtn) {
      launchBtn.disabled = !canStart;
      launchBtn.textContent = isSmash
        ? `🔥 Lancer la partie (${setup.targetCount} cartes)`
        : `🎴 Lancer la partie (${setup.targetCount} rangs)`;
    }

    // Update Medium & Licence checkboxes + counts in place
    const escAttr = (s) => (global.CSS && typeof global.CSS.escape === 'function' ? global.CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'));
    for (const group of tree) {
      const groupEl = container.querySelector(`.medium-group[data-medium="${escAttr(group.medium)}"]`);
      if (!groupEl) continue;

      const selectedInGroup = group.licences.filter((l) => setup.selectedLicences.has(l.name));
      const allChecked = selectedInGroup.length === group.licences.length && group.licences.length > 0;
      const someChecked = selectedInGroup.length > 0 && !allChecked;

      const countActiveInLic = (licObj) =>
        licObj.characters.filter((c) => ROR.isCharacterEnabledBySpecialCategories(c, mode, setup.enabledSpecialCategories)).length;

      const selectedCharsInGroup = selectedInGroup.reduce((s, l) => s + countActiveInLic(l), 0);

      const medCb = groupEl.querySelector('.medium-checkbox');
      if (medCb) {
        medCb.checked = allChecked;
        medCb.indeterminate = someChecked;
      }

      const badge = groupEl.querySelector('.group-count-badge');
      if (badge) {
        badge.textContent = `${selectedInGroup.length}/${group.licences.length} • ${selectedCharsInGroup} persos`;
      }

      const isCollapsed = setup.collapsedMediums.has(group.medium);
      groupEl.classList.toggle('is-collapsed', isCollapsed);
      const collapseBtn = groupEl.querySelector('.collapse-btn');
      if (collapseBtn) collapseBtn.textContent = isCollapsed ? '▸' : '▾';

      groupEl.querySelectorAll('.licence-checkbox').forEach((cb) => {
        const lic = cb.getAttribute('data-licence-check');
        const checked = setup.selectedLicences.has(lic);
        cb.checked = checked;
        const row = cb.closest('.licence-row');
        row?.classList.toggle('is-checked', checked);
        const licObj = group.licences.find((l) => l.name === lic);
        const countEl = row?.querySelector('.licence-count');
        if (licObj && countEl) {
          countEl.textContent = String(countActiveInLic(licObj));
        }
      });
    }

    // Update Special Categories UI in place
    for (const cat of specialCats) {
      const catEl = container.querySelector(`.special-cat-group[data-special-group="${escAttr(cat.id)}"]`);
      if (!catEl) continue;

      const catEnabled = setup.enabledSpecialCategories.has(cat.id);
      const isCollapsed = setup.collapsedSpecialCategories.has(cat.id);
      const charsInCat = characters.filter((c) => c.specialCategories?.[cat.id]);
      const activeLicCount = charsInCat.filter((c) => setup.selectedLicences.has(c.licence)).length;

      catEl.classList.toggle('is-enabled', catEnabled);
      catEl.classList.toggle('is-collapsed', isCollapsed);

      const cb = catEl.querySelector('.special-cat-checkbox');
      if (cb) cb.checked = catEnabled;

      const collapseBtn = catEl.querySelector('.collapse-btn');
      if (collapseBtn) collapseBtn.textContent = isCollapsed ? '▸' : '▾';

      const badge = catEl.querySelector('.special-cat-badge');
      const isOnlyMode = cat.filterType === 'only_when_enabled';
      if (badge) {
        if (isOnlyMode) {
          badge.textContent = catEnabled
            ? `Activée • ${activeLicCount}/${charsInCat.length} sélectionnés uniquement`
            : `Optionnelle • ${charsInCat.length} persos disponibles`;
        } else {
          badge.textContent = catEnabled
            ? `Activée • ${activeLicCount}/${charsInCat.length} inclus`
            : `Désactivée • ${charsInCat.length} exclus`;
        }
      }

      catEl.querySelectorAll('.special-char-row').forEach((row) => {
        const lic = row.getAttribute('data-special-licence');
        const licOn = setup.selectedLicences.has(lic);
        row.classList.toggle('is-cat-off', !catEnabled);
        row.classList.toggle('is-licence-off', catEnabled && !licOn);
        row.classList.toggle('is-active-in-pool', catEnabled && licOn);
        const statusEl = row.querySelector('.special-char-status');
        if (statusEl) {
          if (isOnlyMode) {
            statusEl.textContent = !catEnabled ? 'Mode standard' : licOn ? 'Retenu' : 'Licence décochée';
          } else {
            statusEl.textContent = !catEnabled ? 'Exclu' : licOn ? 'Inclus' : 'Licence décochée';
          }
        }
      });
    }
  }

  ROR.renderSetupScreen = function renderSetupScreen(container) {
    const esc = ROR.escapeHtml;
    const { setup, characters, mode } = ROR.AppState;
    const tree = ROR.buildMediumTree(characters);
    const specialCats = ROR.getSpecialCategoriesForMode(mode);

    const steps = ROR.CARD_COUNT_STEPS;
    const modeMeta = ROR.getModeMeta(mode);
    let stepIndex = steps.indexOf(setup.targetCount);
    if (stepIndex === -1) {
      stepIndex = 3; // 20
      setup.targetCount = steps[stepIndex];
    }

    container.innerHTML = `
      <div class="screen screen-setup">
        <header class="topbar">
          <button type="button" class="btn btn-ghost" data-action="back-home">← Accueil</button>
          <div class="topbar-center">
            <span class="mode-tag">${esc(modeMeta.setupTag)}</span>
            <h1 class="topbar-title">Paramètres de la partie</h1>
          </div>
          <div class="topbar-right"></div>
        </header>

        <div class="setup-grid">
          <section class="panel setup-rules-panel">
            <h2 class="panel-title">${mode === 'smash' ? 'Règles de la partie' : 'Règles du classement'}</h2>

            <div class="slider-block">
              <div class="slider-header">
                <label for="card-count-slider" class="slider-label">${mode === 'smash' ? 'Nombre de personnages à jouer' : 'Nombre de personnages à classer'}</label>
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
              <p class="slider-hint" id="joker-hint"></p>
            </div>

            <div class="slider-block">
              <div class="slider-header">
                <label for="swap-count-slider" class="slider-label">${mode === 'smash' ? '🚀 Nombre de Turbo Smash disponibles' : 'Échanges autorisés en fin de partie'}</label>
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
              <p class="slider-hint" id="swap-hint"></p>
            </div>

            ${
              Array.isArray(modeMeta.subModes) && modeMeta.subModes.length > 0
                ? (() => {
                    const activeSubMode = ROR.getActiveSubMode(mode, setup);
                    return `
                      <div class="submode-block">
                        <div class="slider-label">Sous-mode (${esc(modeMeta.label)})</div>
                        <div class="submode-radio-group" role="radiogroup" aria-label="Sous-mode ${esc(modeMeta.label)}">
                          ${modeMeta.subModes
                            .map((sub) => {
                              const checked = sub.id === activeSubMode;
                              return `
                                <label class="submode-option ${checked ? 'is-checked' : ''}">
                                  <input
                                    type="radio"
                                    name="setup-submode"
                                    value="${esc(sub.id)}"
                                    data-submode-radio="${esc(sub.id)}"
                                    ${checked ? 'checked' : ''}
                                  />
                                  <div class="submode-option-body">
                                    <div class="submode-option-title">${esc(sub.label)}</div>
                                    <div class="submode-option-desc">${esc(sub.description)}</div>
                                  </div>
                                </label>
                              `;
                            })
                            .join('')}
                        </div>
                      </div>
                    `;
                  })()
                : ''
            }

            <div class="summary-card" id="summary-card">
              <div class="summary-row">
                <span>Personnages disponibles (licences cochées)</span>
                <strong id="available-count">0</strong>
              </div>
              <div class="summary-row">
                <span>${mode === 'smash' ? 'Cartes requises (Deck)' : 'Cartes requises (Deck + Jokers)'}</span>
                <strong id="required-count">0</strong>
              </div>
              <div id="summary-message"></div>
            </div>

            <button type="button" class="btn btn-primary btn-launch" data-action="launch-game">
              🎴 Lancer la partie
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

            ${
              specialCats.length > 0
                ? `<div class="special-categories-block">
              ${specialCats
                .map((cat) => {
                  const charsInCat = characters.filter((c) => c.specialCategories?.[cat.id]);
                  const isCollapsed = setup.collapsedSpecialCategories.has(cat.id);
                  const catEnabled = setup.enabledSpecialCategories.has(cat.id);
                  return `
                    <div class="special-cat-group ${isCollapsed ? 'is-collapsed' : ''} ${catEnabled ? 'is-enabled' : ''}" data-special-group="${esc(cat.id)}">
                      <div class="special-cat-header">
                        <button type="button" class="collapse-btn" data-toggle-special="${esc(cat.id)}" aria-label="Déplier ou replier ${esc(cat.label)}">
                          ${isCollapsed ? '▸' : '▾'}
                        </button>
                        <label class="checkbox-label special-cat-checkbox-label">
                          <input
                            type="checkbox"
                            class="special-cat-checkbox"
                            data-special-check="${esc(cat.id)}"
                            ${catEnabled ? 'checked' : ''}
                          />
                          <span class="medium-name">${esc(cat.emoji)} ${esc(cat.label)}</span>
                        </label>
                        <span class="special-cat-badge"></span>
                      </div>
                      <p class="special-cat-desc">${esc(cat.description)}</p>
                      <div class="special-cat-list">
                        ${
                          charsInCat.length === 0
                            ? '<p class="muted" style="margin:4px 0;font-size:0.8rem;">Aucun personnage dans cette catégorie.</p>'
                            : charsInCat
                                .map(
                                  (ch) => `
                                  <div class="special-char-row" data-special-licence="${esc(ch.licence)}">
                                    <img class="mini-thumb" src="${esc(ch.image)}" alt="${esc(ch.name)}" loading="lazy" data-fallback="${esc(ROR.getFallbackImage(ch))}" data-licence="${esc(ch.licence)}" onerror="window.ROR && window.ROR.onImgError(this)"/>
                                    <div class="special-char-info">
                                      <div class="special-char-name">${ROR.renderCharNameHtml(ch, { compact: true })}</div>
                                      <div class="special-char-sub">${esc(ch.medium)} • ${esc(ch.licence)}</div>
                                    </div>
                                    <span class="special-char-status"></span>
                                  </div>
                                `
                                )
                                .join('')
                        }
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>`
                : ''
            }

            <div class="medium-tree">
              ${tree
                .map((group) => {
                  const isCollapsed = setup.collapsedMediums.has(group.medium);
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
                          />
                          <span class="medium-name">${esc(group.medium)}</span>
                        </label>
                        <span class="group-count-badge"></span>
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

    updateSetupStateUI(container, tree);

    container.querySelector('[data-action="back-home"]')?.addEventListener('click', () => {
      ROR.navigateTo('home');
    });

    const cardSlider = container.querySelector('#card-count-slider');
    cardSlider?.addEventListener('input', (e) => {
      const idx = Number(e.target.value);
      setup.targetCount = steps[idx] ?? 20;
      updateSetupStateUI(container, tree);
    });

    container.querySelectorAll('[data-step-index]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-step-index'));
        setup.targetCount = steps[idx] ?? 20;
        updateSetupStateUI(container, tree);
      });
    });

    const swapSlider = container.querySelector('#swap-count-slider');
    swapSlider?.addEventListener('input', (e) => {
      setup.maxSwaps = Number(e.target.value);
      updateSetupStateUI(container, tree);
    });

    container.querySelectorAll('[data-swap-val]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setup.maxSwaps = Number(btn.getAttribute('data-swap-val'));
        updateSetupStateUI(container, tree);
      });
    });

    container.querySelectorAll('[data-submode-radio]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          setup.subMode = e.target.value;
          if (mode === 'smash') {
            if (setup.subMode === 'personne_ne_juge') {
              setup.enabledSpecialCategories.add('personneNeJuge');
            } else {
              setup.enabledSpecialCategories.delete('personneNeJuge');
            }
          }
          updateSetupStateUI(container, tree);
        }
      });
    });

    container.querySelector('[data-action="select-all"]')?.addEventListener('click', () => {
      setup.selectedLicences = new Set(characters.map((c) => c.licence));
      updateSetupStateUI(container, tree);
    });

    container.querySelector('[data-action="deselect-all"]')?.addEventListener('click', () => {
      setup.selectedLicences.clear();
      updateSetupStateUI(container, tree);
    });

    container.querySelectorAll('[data-toggle-collapse]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const med = btn.getAttribute('data-toggle-collapse');
        if (setup.collapsedMediums.has(med)) {
          setup.collapsedMediums.delete(med);
        } else {
          setup.collapsedMediums.add(med);
        }
        updateSetupStateUI(container, tree);
      });
    });

    container.querySelectorAll('[data-toggle-special]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const catId = btn.getAttribute('data-toggle-special');
        if (setup.collapsedSpecialCategories.has(catId)) {
          setup.collapsedSpecialCategories.delete(catId);
        } else {
          setup.collapsedSpecialCategories.add(catId);
        }
        updateSetupStateUI(container, tree);
      });
    });

    container.querySelectorAll('[data-special-check]').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        const catId = e.target.getAttribute('data-special-check');
        if (e.target.checked) {
          setup.enabledSpecialCategories.add(catId);
          if (catId === 'personneNeJuge' && mode === 'smash') {
            setup.subMode = 'personne_ne_juge';
          }
        } else {
          setup.enabledSpecialCategories.delete(catId);
          if (catId === 'personneNeJuge' && mode === 'smash' && setup.subMode === 'personne_ne_juge') {
            setup.subMode = 'default';
          }
        }
        updateSetupStateUI(container, tree);
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
        updateSetupStateUI(container, tree);
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
        updateSetupStateUI(container, tree);
      });
    });

    container.querySelector('[data-action="launch-game"]')?.addEventListener('click', () => {
      const availableCount = ROR.getEligibleCharacters(
        characters,
        setup.selectedLicences,
        setup.enabledSpecialCategories,
        ROR.AppState.mode
      ).length;
      if (availableCount < setup.targetCount) return;
      ROR.startNewGame();
    });
  };
})(window);
