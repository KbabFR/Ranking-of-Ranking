(function (global) {
  'use strict';

  const ROR = (global.ROR = global.ROR || {});

  const CUSTOM_OPTION = '__CUSTOM__';

  const DEFAULT_DRAFT = () => ({
    id: null,
    name: '',
    complement: '',
    medium: 'Animé / Manga',
    licence: '',
    mediumCustomMode: false,
    licenceCustomMode: false,
    description: '',
    image: '',
    abilities: ['', '', ''],
    priority: 8,
    specialCategories: {
      overcheate: false
    }
  });

  let draft = DEFAULT_DRAFT();
  let listSearch = '';

  function compressImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Lecture du fichier image impossible.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Format image non reconnu.'));
        img.onload = () => {
          const maxDim = 420;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          let dataUrl = canvas.toDataURL('image/webp', 0.84);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.84);
          }
          resolve(dataUrl);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function renderPreviewCard(container) {
    const previewHost = container.querySelector('#gen-live-preview');
    if (!previewHost) return;
    const esc = ROR.escapeHtml;
    const name = draft.name.trim() || 'Nom du personnage';
    const complement = (draft.complement || '').trim();
    const medium = draft.medium.trim() || 'Médium';
    const licence = draft.licence.trim() || 'Licence';
    const desc = draft.description.trim() || 'Description du personnage...';
    const abilities = draft.abilities.map((a) => a.trim()).filter(Boolean);
    const imgSrc = draft.image.trim() || ROR.generateInlinePortraitSvg(name, licence);
    const previewChar = {
      name,
      complement,
      specialCategories: draft.specialCategories || {}
    };

    previewHost.innerHTML = `
      <div class="gen-preview-card">
        <div class="char-card-header">
          <span class="char-medium-pill">${esc(medium)}</span>
          <span class="char-licence-pill">${esc(licence)}</span>
          ${ROR.renderSpecialBadgesHtml(previewChar, 'power')}
          <span class="prio-badge" style="margin-left:auto;">★ ${draft.priority}</span>
        </div>
        <div class="char-artwork-box">
          <img class="char-artwork-img" src="${esc(imgSrc)}" alt="${esc(name)}" data-licence="${esc(licence)}" onerror="window.ROR && window.ROR.onImgError(this)"/>
        </div>
        <div class="char-card-body">
          <h3 class="char-name">${ROR.renderCharNameHtml(previewChar)}</h3>
          <p class="char-desc">${esc(desc)}</p>
          <div class="char-abilities-block">
            <div class="abilities-title">Points forts &amp; Capacités</div>
            <ul class="abilities-list">
              ${
                abilities.length > 0
                  ? abilities.map((ab) => `<li>${esc(ab)}</li>`).join('')
                  : '<li class="muted">Ajoutez au moins une capacité...</li>'
              }
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  function triggerZipExport() {
    const customList = ROR.AppState.customCharacters || [];
    if (customList.length === 0) return;

    const bytes = ROR.buildCustomCharactersZipBytes(customList);
    const blob = new Blob([bytes], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `personnages-locaux-${dateStamp}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  ROR.renderGeneratorScreen = function renderGeneratorScreen(container) {
    const esc = ROR.escapeHtml;
    const allChars = ROR.AppState.characters || [];
    const customChars = ROR.AppState.customCharacters || [];

    const existingMediums = Array.from(new Set(allChars.map((c) => c.medium))).sort((a, b) => a.localeCompare(b, 'fr'));
    if (!draft.mediumCustomMode && !draft.medium && existingMediums.length > 0) {
      draft.medium = existingMediums[0];
    }
    const isMediumCustom = draft.mediumCustomMode || (Boolean(draft.medium) && !existingMediums.includes(draft.medium));
    draft.mediumCustomMode = isMediumCustom;

    const existingLicencesAll = Array.from(new Set(allChars.map((c) => c.licence))).sort((a, b) => a.localeCompare(b, 'fr'));
    const licencesForMedium = isMediumCustom
      ? existingLicencesAll
      : Array.from(new Set(allChars.filter((c) => c.medium === draft.medium).map((c) => c.licence))).sort((a, b) =>
          a.localeCompare(b, 'fr')
        );
    const availableLicences = licencesForMedium.length > 0 ? licencesForMedium : existingLicencesAll;
    const isLicenceCustom =
      draft.licenceCustomMode || (Boolean(draft.licence) && !availableLicences.includes(draft.licence));
    draft.licenceCustomMode = isLicenceCustom;

    const q = listSearch.trim().toLowerCase();
    const filteredCustom = customChars.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.licence.toLowerCase().includes(q) ||
        c.medium.toLowerCase().includes(q)
      );
    });

    const isEditing = Boolean(draft.id);

    container.innerHTML = `
      <div class="screen screen-generator">
        <header class="topbar">
          <button type="button" class="btn btn-ghost" data-action="back-home">← Accueil</button>
          <div class="topbar-center">
            <span class="mode-tag">✨ Création locale • Jouable immédiatement</span>
            <h1 class="topbar-title">Générateur de personnages</h1>
          </div>
          <div class="topbar-right">
            <button type="button" class="btn btn-sm btn-primary" data-action="export-zip" ${customChars.length === 0 ? 'disabled' : ''}>
              📦 Exporter (.zip)
            </button>
          </div>
        </header>

        <div class="generator-grid">
          <!-- LEFT: FORM + LIVE PREVIEW -->
          <section class="panel gen-form-panel">
            <div class="panel-head-row">
              <div>
                <h2 class="panel-title">${isEditing ? '✏️ Modifier le personnage' : '➕ Nouveau personnage'}</h2>
                <p class="panel-subtitle">Stocké localement dans votre navigateur et ajouté à vos parties</p>
              </div>
              ${
                isEditing
                  ? `<button type="button" class="btn btn-xs btn-ghost" data-action="reset-draft">Nouveau</button>`
                  : ''
              }
            </div>

            <form id="gen-form" class="gen-form">
              <div class="gen-row-2">
                <label class="field-group">
                  <span class="field-label">Nom du personnage *</span>
                  <input type="text" class="field-input" id="gen-name" required placeholder="Ex: Anakin Skywalker" value="${esc(draft.name)}" />
                </label>

                <label class="field-group">
                  <span class="field-label">Complément (optionnel)</span>
                  <input type="text" class="field-input" id="gen-complement" placeholder="Ex: Avant Dark Vador, Avec Gantelet..." value="${esc(draft.complement || '')}" />
                </label>
              </div>

              <div class="gen-row-2">
                <div class="field-group">
                  <label class="field-label" for="gen-medium-select">Médium *</label>
                  <select class="field-input" id="gen-medium-select" ${isMediumCustom ? '' : 'required'}>
                    ${existingMediums
                      .map(
                        (m) =>
                          `<option value="${esc(m)}" ${!isMediumCustom && draft.medium === m ? 'selected' : ''}>${esc(m)}</option>`
                      )
                      .join('')}
                    <option value="${CUSTOM_OPTION}" ${isMediumCustom ? 'selected' : ''}>➕ Personnalisé (saisir à la main)</option>
                  </select>
                  ${
                    isMediumCustom
                      ? `<input type="text" class="field-input" id="gen-medium-custom" required placeholder="Saisir le médium (ex: Webtoon, Roman...)" value="${esc(draft.medium)}" />`
                      : ''
                  }
                </div>

                <div class="field-group">
                  <label class="field-label" for="gen-licence-select">Licence *</label>
                  <select class="field-input" id="gen-licence-select" ${isLicenceCustom ? '' : 'required'}>
                    <option value="" disabled ${!isLicenceCustom && !draft.licence ? 'selected' : ''}>-- Choisir une licence --</option>
                    ${availableLicences
                      .map(
                        (l) =>
                          `<option value="${esc(l)}" ${!isLicenceCustom && draft.licence === l ? 'selected' : ''}>${esc(l)}</option>`
                      )
                      .join('')}
                    <option value="${CUSTOM_OPTION}" ${isLicenceCustom ? 'selected' : ''}>➕ Personnalisé (saisir à la main)</option>
                  </select>
                  ${
                    isLicenceCustom
                      ? `<input type="text" class="field-input" id="gen-licence-custom" required placeholder="Saisir la licence (ex: Solo Leveling...)" value="${esc(draft.licence)}" />`
                      : ''
                  }
                </div>
              </div>

              <div class="field-group">
                <span class="field-label">Image du personnage (URL ou fichier local)</span>
                <div class="gen-image-controls">
                  <input
                    type="text"
                    class="field-input"
                    id="gen-image-url"
                    placeholder="https://... (ou importez un fichier à droite)"
                    value="${draft.image.startsWith('data:') ? '' : esc(draft.image)}"
                  />
                  <label class="btn btn-sm btn-secondary gen-upload-btn">
                    🖼️ Importer image
                    <input type="file" accept="image/*" hidden id="gen-image-file" />
                  </label>
                  <button type="button" class="btn btn-sm btn-ghost" id="gen-clear-image" title="Revenir à l'image auto">✕</button>
                </div>
                ${
                  draft.image.startsWith('data:image/webp') || draft.image.startsWith('data:image/jpeg') || draft.image.startsWith('data:image/png')
                    ? `<span class="field-help ok-inline">✓ Image locale chargée et compressée (incluse dans l'export .zip).</span>`
                    : `<span class="field-help">Laissez vide pour générer un blason automatique.</span>`
                }
              </div>

              <label class="field-group">
                <span class="field-label">Description</span>
                <textarea class="field-input field-textarea" id="gen-desc" rows="2" placeholder="Courte description marquante du personnage...">${esc(draft.description)}</textarea>
              </label>

              <div class="gen-row-2">
                <label class="field-group">
                  <span class="field-label">Indice de priorité : <strong id="gen-prio-val">${draft.priority}</strong>/10</span>
                  <input type="range" id="gen-priority" min="1" max="10" step="1" value="${draft.priority}" class="range-input" />
                  <span class="field-help">10 = personnage incontournable, pris en priorité lors des tirages limités.</span>
                </label>

                <div class="field-group">
                  <span class="field-label">Catégories spéciales (Mode Puissance)</span>
                  <div class="gen-special-list">
                    ${ROR.SPECIAL_CATEGORIES.map((cat) => {
                      const checked = Boolean(draft.specialCategories?.[cat.id]);
                      return `
                        <label class="gen-special-option ${checked ? 'is-checked' : ''}">
                          <input type="checkbox" class="gen-special-checkbox" data-gen-special="${esc(cat.id)}" ${checked ? 'checked' : ''} />
                          <div>
                            <div class="gen-special-title">${esc(cat.emoji)} ${esc(cat.label)}</div>
                            <div class="field-help">${esc(cat.description)}</div>
                          </div>
                        </label>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>

              <div class="field-group">
                <div class="field-head-inline">
                  <span class="field-label">Points forts &amp; Capacités</span>
                  <button type="button" class="btn btn-xs btn-secondary" id="gen-add-ability">＋ Ajouter</button>
                </div>
                <div class="abilities-inputs" id="gen-abilities-list">
                  ${draft.abilities
                    .map(
                      (ab, idx) => `
                    <div class="ability-input-row">
                      <input type="text" class="field-input gen-ability-input" data-ability-idx="${idx}" placeholder="Capacité ${idx + 1}..." value="${esc(ab)}" />
                      <button type="button" class="btn btn-xs btn-ghost" data-remove-ability="${idx}" title="Supprimer">✕</button>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>

              <div class="gen-form-actions">
                <button type="submit" class="btn btn-primary" style="flex:1;">
                  ${isEditing ? '✓ Mettre à jour le personnage' : '💾 Enregistrer le personnage'}
                </button>
                <button type="button" class="btn btn-ghost" data-action="reset-draft">Réinitialiser</button>
              </div>
            </form>

            <div class="gen-preview-section">
              <div class="abilities-title" style="margin-bottom:8px;">Aperçu de la carte en jeu</div>
              <div id="gen-live-preview"></div>
            </div>
          </section>

          <!-- RIGHT: SAVED LOCAL CHARACTERS LIST + ZIP EXPORT -->
          <section class="panel gen-list-panel">
            <div class="panel-head-row">
              <div>
                <h2 class="panel-title">Mes personnages locaux (${customChars.length})</h2>
                <p class="panel-subtitle">Disponibles automatiquement dans vos parties et exportables</p>
              </div>
              <div class="licence-bulk-actions">
                <label class="btn btn-xs btn-secondary gen-upload-btn" title="Importer un fichier characters.json local">
                  📥 Importer JSON
                  <input type="file" accept=".json" hidden id="gen-import-json" />
                </label>
                <button type="button" class="btn btn-xs btn-primary" data-action="export-zip" ${customChars.length === 0 ? 'disabled' : ''}>
                  📦 Export .zip
                </button>
              </div>
            </div>

            <div class="gen-search-row">
              <input type="search" class="db-search" id="gen-list-search" placeholder="Filtrer mes créations..." value="${esc(listSearch)}" />
            </div>

            <div class="gen-custom-list">
              ${
                filteredCustom.length === 0
                  ? `<div class="empty-box">
                      <p>${customChars.length === 0 ? 'Aucun personnage créé localement pour le moment.' : 'Aucun résultat pour cette recherche.'}</p>
                      <p class="muted">Créez vos propres persos à gauche : ils rejoindront aussitôt la base jouable et pourront être exportés en .zip !</p>
                    </div>`
                  : filteredCustom
                      .map((ch) => {
                        const isActiveEdit = draft.id === ch.id;
                        return `
                          <div class="gen-char-item ${isActiveEdit ? 'is-editing' : ''}">
                            <img class="gen-char-thumb" src="${esc(ch.image || ROR.generateInlinePortraitSvg(ch.name, ch.licence))}" alt="${esc(ch.name)}" data-fallback="${esc(ROR.getFallbackImage(ch))}" data-licence="${esc(ch.licence)}" onerror="window.ROR && window.ROR.onImgError(this)"/>
                            <div class="gen-char-info">
                              <div class="gen-char-top">
                                <strong>${ROR.renderCharNameHtml(ch, { compact: true })} ${ROR.renderSpecialBadgesHtml(ch, 'power')}</strong>
                                <span class="prio-badge">★ ${ch.priority}</span>
                              </div>
                              <div class="db-card-sub">${esc(ch.medium)} • ${esc(ch.licence)}</div>
                              <div class="gen-char-desc">${esc(ch.description || 'Aucune description')}</div>
                              ${
                                ch.abilities.length > 0
                                  ? `<div class="gen-char-abilities">${ch.abilities.map((a) => `<span class="mini-ab-chip">${esc(a)}</span>`).join('')}</div>`
                                  : ''
                              }
                            </div>
                            <div class="gen-char-actions">
                              <button type="button" class="btn btn-xs btn-secondary" data-edit-char="${esc(ch.id)}" title="Modifier">✏️</button>
                              <button type="button" class="btn btn-xs btn-ghost" data-dup-char="${esc(ch.id)}" title="Dupliquer">📋</button>
                              <button type="button" class="btn btn-xs btn-danger" data-del-char="${esc(ch.id)}" title="Supprimer">🗑️</button>
                            </div>
                          </div>
                        `;
                      })
                      .join('')
              }
            </div>
          </section>
        </div>
      </div>
    `;

    renderPreviewCard(container);

    // Navigation & export buttons
    container.querySelector('[data-action="back-home"]')?.addEventListener('click', () => {
      ROR.navigateTo('home');
    });

    container.querySelectorAll('[data-action="export-zip"]').forEach((btn) => {
      btn.addEventListener('click', triggerZipExport);
    });

    container.querySelectorAll('[data-action="reset-draft"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        draft = DEFAULT_DRAFT();
        ROR.renderGeneratorScreen(container);
      });
    });

    // Live input listeners (update draft & preview without losing focus)
    container.querySelector('#gen-name')?.addEventListener('input', (e) => {
      draft.name = e.target.value;
      renderPreviewCard(container);
    });

    container.querySelector('#gen-complement')?.addEventListener('input', (e) => {
      draft.complement = e.target.value;
      renderPreviewCard(container);
    });

    container.querySelectorAll('.gen-special-checkbox').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        const catId = e.target.getAttribute('data-gen-special');
        draft.specialCategories = { ...(draft.specialCategories || {}), [catId]: e.target.checked };
        e.target.closest('.gen-special-option')?.classList.toggle('is-checked', e.target.checked);
        renderPreviewCard(container);
      });
    });

    container.querySelector('#gen-medium-select')?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === CUSTOM_OPTION) {
        draft.mediumCustomMode = true;
        if (existingMediums.includes(draft.medium)) {
          draft.medium = '';
        }
        ROR.renderGeneratorScreen(container);
        container.querySelector('#gen-medium-custom')?.focus();
        return;
      }
      draft.mediumCustomMode = false;
      draft.medium = val;
      if (!draft.licenceCustomMode) {
        const nextLicences = allChars.filter((c) => c.medium === val).map((c) => c.licence);
        if (!nextLicences.includes(draft.licence)) {
          draft.licence = '';
        }
      }
      ROR.renderGeneratorScreen(container);
    });

    container.querySelector('#gen-medium-custom')?.addEventListener('input', (e) => {
      draft.medium = e.target.value;
      renderPreviewCard(container);
    });

    container.querySelector('#gen-licence-select')?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === CUSTOM_OPTION) {
        draft.licenceCustomMode = true;
        if (availableLicences.includes(draft.licence)) {
          draft.licence = '';
        }
        ROR.renderGeneratorScreen(container);
        container.querySelector('#gen-licence-custom')?.focus();
        return;
      }
      draft.licenceCustomMode = false;
      draft.licence = val;
      if (draft.licenceCustomMode === false && container.querySelector('#gen-licence-custom')) {
        ROR.renderGeneratorScreen(container);
      } else {
        renderPreviewCard(container);
      }
    });

    container.querySelector('#gen-licence-custom')?.addEventListener('input', (e) => {
      draft.licence = e.target.value;
      renderPreviewCard(container);
    });
    container.querySelector('#gen-desc')?.addEventListener('input', (e) => {
      draft.description = e.target.value;
      renderPreviewCard(container);
    });
    container.querySelector('#gen-priority')?.addEventListener('input', (e) => {
      draft.priority = Number(e.target.value) || 5;
      const valEl = container.querySelector('#gen-prio-val');
      if (valEl) valEl.textContent = String(draft.priority);
      renderPreviewCard(container);
    });
    container.querySelector('#gen-image-url')?.addEventListener('input', (e) => {
      draft.image = e.target.value.trim();
      renderPreviewCard(container);
    });

    container.querySelector('#gen-image-file')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        draft.image = await compressImageFile(file);
        ROR.renderGeneratorScreen(container);
      } catch (err) {
        global.alert(err.message || 'Erreur lors du chargement de l’image.');
      }
    });

    container.querySelector('#gen-clear-image')?.addEventListener('click', () => {
      draft.image = '';
      ROR.renderGeneratorScreen(container);
    });

    container.querySelector('#gen-add-ability')?.addEventListener('click', () => {
      draft.abilities.push('');
      ROR.renderGeneratorScreen(container);
    });

    container.querySelectorAll('.gen-ability-input').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const idx = Number(e.target.getAttribute('data-ability-idx'));
        draft.abilities[idx] = e.target.value;
        renderPreviewCard(container);
      });
    });

    container.querySelectorAll('[data-remove-ability]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-remove-ability'));
        draft.abilities.splice(idx, 1);
        if (draft.abilities.length === 0) draft.abilities.push('');
        ROR.renderGeneratorScreen(container);
      });
    });

    // Save / Update character
    container.querySelector('#gen-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!draft.name.trim() || !draft.medium.trim() || !draft.licence.trim()) {
        global.alert('Veuillez renseigner le nom, le médium et la licence.');
        return;
      }
      try {
        ROR.upsertCustomCharacter({
          id: draft.id,
          name: draft.name,
          complement: draft.complement,
          medium: draft.medium,
          licence: draft.licence,
          description: draft.description,
          image: draft.image,
          abilities: draft.abilities.map((a) => a.trim()).filter(Boolean),
          priority: draft.priority,
          specialCategories: draft.specialCategories
        });
        draft = DEFAULT_DRAFT();
        ROR.renderGeneratorScreen(container);
      } catch (err) {
        global.alert(err.message || 'Impossible de sauvegarder le personnage.');
      }
    });

    // Right panel: search, import JSON, edit, duplicate, delete
    const searchEl = container.querySelector('#gen-list-search');
    searchEl?.addEventListener('input', (e) => {
      listSearch = e.target.value;
      const pos = e.target.selectionStart;
      ROR.renderGeneratorScreen(container);
      const next = container.querySelector('#gen-list-search');
      if (next) {
        next.focus();
        next.setSelectionRange(pos, pos);
      }
    });

    container.querySelector('#gen-import-json')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        if (!Array.isArray(parsed)) throw new Error('Le fichier JSON doit contenir une liste.');
        let count = 0;
        for (const item of parsed) {
          if (item && item.name && item.medium && item.licence) {
            ROR.upsertCustomCharacter({ ...item, id: null });
            count++;
          }
        }
        if (count === 0) throw new Error('Aucun personnage valide trouvé.');
        ROR.renderGeneratorScreen(container);
      } catch (err) {
        global.alert('Erreur import JSON : ' + err.message);
      }
    });

    container.querySelectorAll('[data-edit-char]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-char');
        const found = customChars.find((c) => c.id === id);
        if (!found) return;
        draft = {
          id: found.id,
          name: found.name,
          complement: found.complement || '',
          medium: found.medium,
          licence: found.licence,
          mediumCustomMode: !existingMediums.includes(found.medium),
          licenceCustomMode: false,
          description: found.description,
          image: found.image,
          abilities: found.abilities.length > 0 ? [...found.abilities] : [''],
          priority: found.priority,
          specialCategories: { ...(found.specialCategories || {}) }
        };
        ROR.renderGeneratorScreen(container);
      });
    });

    container.querySelectorAll('[data-dup-char]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-dup-char');
        const found = customChars.find((c) => c.id === id);
        if (!found) return;
        draft = {
          id: null,
          name: `${found.name} (copie)`,
          complement: found.complement || '',
          medium: found.medium,
          licence: found.licence,
          mediumCustomMode: !existingMediums.includes(found.medium),
          licenceCustomMode: false,
          description: found.description,
          image: found.image,
          abilities: found.abilities.length > 0 ? [...found.abilities] : [''],
          priority: found.priority,
          specialCategories: { ...(found.specialCategories || {}) }
        };
        ROR.renderGeneratorScreen(container);
      });
    });

    container.querySelectorAll('[data-del-char]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-del-char');
        const found = customChars.find((c) => c.id === id);
        if (!found) return;
        if (!global.confirm(`Supprimer "${found.name}" de vos personnages locaux ?`)) return;
        ROR.deleteCustomCharacter(id);
        if (draft.id === id) draft = DEFAULT_DRAFT();
        ROR.renderGeneratorScreen(container);
      });
    });
  };
})(window);
