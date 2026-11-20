(function (global) {
  'use strict';

  const ROR = (global.ROR = global.ROR || {});

  let activeSmashKeyHandler = null;

  function clearSmashKeyHandler() {
    if (activeSmashKeyHandler) {
      global.removeEventListener('keydown', activeSmashKeyHandler);
      activeSmashKeyHandler = null;
    }
  }

  ROR.renderGameScreen = function renderGameScreen(container) {
    clearSmashKeyHandler();
    const game = ROR.AppState.game;
    if (!game) {
      ROR.navigateTo('home');
      return;
    }

    if (game.mode === 'smash') {
      renderSmashGameScreen(container, game);
      return;
    }

    const esc = ROR.escapeHtml;
    const modeMeta = ROR.getModeMeta(game.mode);
    const subModeLabel = game.mode === 'beauty' && game.subMode === 'bg' ? ' • Mode BG' : '';
    const placedCount = game.slots.filter(Boolean).length;
    const progressPct = Math.round((placedCount / game.targetCount) * 100);

    const canDrawMain = game.phase === 'playing' && game.activeCard === null && game.mainDeck.length > 0 && !game.isBurning;
    const canDrawJoker = game.phase === 'playing' && game.activeCard !== null && game.jokerDeck.length > 0 && !game.isBurning;
    const canPlace = game.phase === 'playing' && game.activeCard !== null && game.isFlipped && !game.isBurning;

    // Preserve scroll positions across re-renders
    const prevList = container.querySelector('.ranking-list');
    const prevScrollTop = prevList ? prevList.scrollTop : 0;
    const prevOverview = container.querySelector('.overview-overlay');
    const prevOverviewScroll = prevOverview ? prevOverview.scrollTop : 0;

    container.innerHTML = `
      <div class="screen screen-game ${modeMeta.fullArt ? 'is-fullart-mode' : ''}">
        <header class="topbar game-topbar">
          <div class="topbar-left">
            <button type="button" class="btn btn-sm btn-ghost" data-action="quit-game">✕ Quitter</button>
            <span class="mode-tag">${esc(modeMeta.tag + subModeLabel)}</span>
          </div>

          <div class="game-progress-wrap">
            <div class="progress-text">
              <span>Progression</span>
              <strong>${placedCount} / ${game.targetCount}</strong>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPct}%"></div>
            </div>
          </div>

          <div class="topbar-right">
            <button type="button" class="btn btn-sm btn-secondary" data-action="open-overview">
              ⊞ Grille d'ensemble
            </button>
          </div>
        </header>

        <main class="game-arena">
          <!-- LEFT: DECKS -->
          <aside class="decks-panel">
            <div class="deck-group">
              <div class="deck-label-row">
                <span class="deck-title">Deck Principal</span>
                <span class="deck-counter">${game.mainDeck.length}</span>
              </div>
              <button
                type="button"
                class="deck-pile deck-main ${canDrawMain ? 'is-clickable' : 'is-disabled'}"
                data-action="draw-main"
                ${canDrawMain ? '' : 'disabled'}
              >
                <div class="deck-stack-layer layer-2"></div>
                <div class="deck-stack-layer layer-1"></div>
                <div class="deck-top-card">
                  <div class="card-back-ornament">${esc(modeMeta.icon)}</div>
                  <div class="deck-card-title">PIOCHER</div>
                  <div class="deck-card-sub">${game.mainDeck.length} carte${game.mainDeck.length > 1 ? 's' : ''}</div>
                </div>
              </button>
              <div class="deck-status-hint">
                ${
                  game.mainDeck.length === 0
                    ? 'Deck vide'
                    : canDrawMain
                      ? 'Cliquez pour piocher'
                      : 'Placez la carte au centre'
                }
              </div>
            </div>

            <div class="deck-group">
              <div class="deck-label-row">
                <span class="deck-title deck-title-joker">Deck Joker</span>
                <span class="deck-counter deck-counter-joker">${game.jokerDeck.length}</span>
              </div>
              <button
                type="button"
                class="deck-pile deck-joker ${canDrawJoker ? 'is-clickable' : 'is-disabled'}"
                data-action="draw-joker"
                ${canDrawJoker ? '' : 'disabled'}
              >
                <div class="deck-stack-layer layer-2"></div>
                <div class="deck-stack-layer layer-1"></div>
                <div class="deck-top-card deck-top-joker">
                  <div class="card-back-ornament">🃏</div>
                  <div class="deck-card-title">JOKER</div>
                  <div class="deck-card-sub">${game.jokerDeck.length} restant${game.jokerDeck.length > 1 ? 's' : ''}</div>
                </div>
              </button>
              <div class="deck-status-hint">
                ${
                  game.jokerDeck.length === 0
                    ? 'Aucun Joker restant'
                    : canDrawJoker
                      ? 'Brûle la carte &amp; pioche un Joker'
                      : 'Disponible si une carte est au centre'
                }
              </div>
            </div>

            <button type="button" class="burned-pill" data-action="view-burned" ${game.burnedCards.length === 0 ? 'disabled' : ''}>
              🔥 Cartes brûlées : <strong>${game.burnedCards.length}</strong>
            </button>
          </aside>

          <!-- CENTER: ACTIVE CARD STAGE -->
          <section class="center-stage">
            ${
              game.activeCard === null
                ? `
                  <div class="center-empty-slot ${canDrawMain ? 'is-ready' : ''}" data-action="empty-draw-hint">
                    <div class="empty-slot-icon">🎴</div>
                    <h3>Zone de tirage</h3>
                    <p>${
                      game.phase === 'playing'
                        ? 'Cliquez sur le <strong>Deck Principal</strong> à gauche pour tirer le prochain personnage.'
                        : 'Partie terminée !'
                    }</p>
                  </div>
                `
                : renderActiveFlipCard(game.activeCard, game.activeCardSource, game.isFlipped, game.isBurning, game.mode)
            }
          </section>

          <!-- RIGHT: VERTICAL RANKING LIST -->
          <aside class="ranking-panel">
            <div class="ranking-panel-head">
              <h2>Classement</h2>
              <span class="ranking-hint-pill ${canPlace ? 'is-active' : ''}">
                ${canPlace ? 'Choisissez une place libre' : `${placedCount}/${game.targetCount} placés`}
              </span>
            </div>

            <div class="ranking-list">
              ${game.slots
                .map((slotChar, idx) => {
                  const rank = idx + 1;
                  const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';

                  if (!slotChar) {
                    return `
                      <button
                        type="button"
                        class="rank-slot rank-slot-empty ${canPlace ? 'is-placeable' : ''}"
                        data-place-index="${idx}"
                        ${canPlace ? '' : 'disabled'}
                      >
                        <span class="rank-num ${rankClass}">#${rank}</span>
                        <span class="rank-empty-label">${canPlace ? '＋ Placer ici' : 'Place libre'}</span>
                      </button>
                    `;
                  }

                  return `
                    <button
                      type="button"
                      class="rank-slot rank-slot-filled"
                      data-inspect-index="${idx}"
                      title="Cliquer pour voir la fiche de ${esc(slotChar.name)}"
                    >
                      <span class="rank-num ${rankClass}">#${rank}</span>
                      <img class="rank-thumb" src="${esc(slotChar.image)}" alt="${esc(slotChar.name)}" data-fallback="${esc(ROR.getFallbackImage(slotChar))}" data-licence="${esc(slotChar.licence)}" onerror="window.ROR && window.ROR.onImgError(this)"/>
                      <div class="rank-char-info">
                        <div class="rank-char-name">${ROR.renderCharNameHtml(slotChar, { compact: true })}</div>
                        <div class="rank-char-licence">${esc(slotChar.licence)}</div>
                      </div>
                      <span class="rank-lock-icon">🔒</span>
                    </button>
                  `;
                })
                .join('')}
            </div>
          </aside>
        </main>
      </div>

      ${game.overviewOpen ? renderOverviewOverlay(game) : ''}
    `;

    const newList = container.querySelector('.ranking-list');
    if (newList && prevScrollTop > 0) {
      newList.scrollTop = prevScrollTop;
    }
    const newOverview = container.querySelector('.overview-overlay');
    if (newOverview && prevOverviewScroll > 0) {
      newOverview.scrollTop = prevOverviewScroll;
    }

    bindGameEvents(container, game);
  };

  function renderActiveFlipCard(char, source, isFlipped, isBurning, mode = 'power') {
    const esc = ROR.escapeHtml;
    const isJoker = source === 'joker';
    const modeMeta = ROR.getModeMeta(mode);

    return `
      <div class="center-card-wrapper ${isBurning ? 'is-burning' : ''}">
        <div class="center-action-banner ${isFlipped ? 'is-revealed' : ''}">
          ${
            !isFlipped
              ? isJoker
                ? '🃏 Carte Joker piochée — Cliquez sur la carte pour la révéler !'
                : '🎴 Carte piochée — Cliquez sur la carte pour la retourner !'
              : '✅ Choisissez une place libre dans la liste à droite (ou utilisez un Joker à gauche)'
          }
        </div>

        <div
          class="flip-card ${isFlipped ? 'is-flipped' : ''} ${isJoker ? 'is-joker-card' : ''} ${modeMeta.fullArt ? 'is-fullart-card' : ''}"
          data-action="flip-center-card"
          role="button"
          tabindex="0"
          aria-label="${isFlipped ? esc(char.name) : 'Retourner la carte'}"
        >
          <div class="flip-card-inner">
            <!-- BACK FACE (FACE CACHÉE) -->
            <div class="flip-card-face flip-card-back ${isJoker ? 'back-joker' : 'back-standard'}">
              <div class="card-back-frame">
                <div class="card-back-corner tl">✦</div>
                <div class="card-back-corner tr">✦</div>
                <div class="card-back-corner bl">✦</div>
                <div class="card-back-corner br">✦</div>
                <div class="card-back-emblem">${isJoker ? '🃏' : esc(modeMeta.icon)}</div>
                <div class="card-back-title">${isJoker ? 'CARTE JOKER' : 'MYSTÈRE'}</div>
                <div class="card-back-cta">Cliquez pour révéler</div>
              </div>
            </div>

            <!-- FRONT FACE (FACE VISIBLE) -->
            <div class="flip-card-face flip-card-front ${modeMeta.fullArt ? 'is-fullart-front' : ''}">
              ${ROR.renderCharacterCardFrontHtml(char, { mode, isJoker })}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderOverviewOverlay(game) {
    const esc = ROR.escapeHtml;
    const modeMeta = ROR.getModeMeta(game.mode);
    const isSwapPhase = game.phase === 'postgame_swap';
    const isFinished = game.phase === 'finished';
    const isMidgame = game.phase === 'playing';
    const canPlaceFromOverview = isMidgame && game.activeCard !== null && game.isFlipped;

    let statusBanner = '';
    if (isMidgame) {
      statusBanner = `
        <div class="overview-banner overview-banner-playing">
          <div>
            <h2>⊞ Grille d'ensemble</h2>
            <p class="muted">
              ${
                canPlaceFromOverview
                  ? `Carte en main : <strong>${esc(game.activeCard.name)}</strong> — Vous pouvez cliquer sur une case vide pour la placer ou retourner au jeu.`
                  : 'Aperçu complet de votre classement en cours (la partie reste en pause sans rien perdre).'
              }
            </p>
          </div>
          <button type="button" class="btn btn-primary" data-action="close-overview">← Retour à la partie</button>
        </div>
      `;
    } else if (isSwapPhase) {
      const selChar = game.selectedSwapIndex !== null ? game.slots[game.selectedSwapIndex] : null;
      statusBanner = `
        <div class="overview-banner overview-banner-swap">
          <div>
            <div class="banner-kicker">CLASSEMENT COMPLET !</div>
            <h2>Phase d'échanges finaux</h2>
            <p class="muted">
              ${
                selChar
                  ? `Carte sélectionnée : <strong>#${game.selectedSwapIndex + 1} ${esc(selChar.name)}</strong> — Cliquez sur une autre carte pour échanger leurs places (ou re-cliquez pour annuler).`
                  : 'Cliquez sur deux personnages pour échanger leurs positions dans le classement.'
              }
            </p>
          </div>
          <div class="swap-controls">
            <div class="swaps-remaining-pill">
              Échanges restants : <strong>${game.swapsRemaining} / ${game.maxSwaps}</strong>
            </div>
            <button type="button" class="btn btn-primary" data-action="finish-swaps">
              ✓ Valider le classement final
            </button>
          </div>
        </div>
      `;
    } else if (isFinished) {
      statusBanner = `
        <div class="overview-banner overview-banner-finished">
          <div>
            <div class="banner-kicker banner-kicker-gold">🏆 CLASSEMENT FINAL ENREGISTRÉ</div>
            <h2>Top ${game.targetCount} — Mode ${esc(modeMeta.label)}</h2>
            <p class="muted">
              Sauvegardé automatiquement en local (${game.swapsUsed} échange${game.swapsUsed > 1 ? 's' : ''} utilisé${game.swapsUsed > 1 ? 's' : ''}, ${game.burnedCards.length} carte${game.burnedCards.length > 1 ? 's' : ''} brûlée${game.burnedCards.length > 1 ? 's' : ''}).
            </p>
          </div>
          <div class="finished-actions">
            <button type="button" class="btn btn-secondary" data-action="copy-final">📋 Copier le top</button>
            <button type="button" class="btn btn-secondary" data-action="replay-same">🔄 Rejouer</button>
            <button type="button" class="btn btn-primary" data-action="return-home-final">🏠 Retour à l'accueil</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="overview-overlay">
        <div class="overview-container">
          ${statusBanner}

          <div class="overview-grid ${modeMeta.fullArt ? 'is-fullart-grid' : ''}">
            ${game.slots
              .map((ch, idx) => {
                const rank = idx + 1;
                const rankClass = rank <= 3 ? `rank-top-${rank}` : '';
                const isSelected = isSwapPhase && game.selectedSwapIndex === idx;

                if (!ch) {
                  return `
                    <button
                      type="button"
                      class="overview-card overview-card-empty ${canPlaceFromOverview ? 'is-placeable' : ''}"
                      data-overview-empty="${idx}"
                      ${canPlaceFromOverview ? '' : 'disabled'}
                    >
                      <span class="ov-rank">#${rank}</span>
                      <span class="ov-empty-text">${canPlaceFromOverview ? '＋ Placer ici' : 'Place libre'}</span>
                    </button>
                  `;
                }

                const ovImg = ROR.getCharacterImage(ch, modeMeta.fullArt ? 'portrait' : 'landscape');

                return `
                  <div
                    role="button"
                    tabindex="0"
                    class="overview-card overview-card-filled ${rankClass} ${isSwapPhase ? 'is-swappable' : ''} ${isSelected ? 'is-swap-selected' : ''}"
                    data-overview-filled="${idx}"
                  >
                    <div class="ov-top">
                      <span class="ov-rank ${rank <= 3 ? `ov-rank-${rank}` : ''}">#${rank}</span>
                      <span class="ov-licence">${esc(ch.licence)}</span>
                    </div>
                    <div class="ov-img-wrap">
                      <img src="${esc(ovImg)}" alt="${esc(ch.name)}" loading="lazy" data-fallback="${esc(ROR.getFallbackImage(ch))}" data-licence="${esc(ch.licence)}" onerror="window.ROR && window.ROR.onImgError(this)"/>
                      <button
                        type="button"
                        class="ov-inspect-btn"
                        data-overview-inspect="${idx}"
                        title="Voir les détails de ${esc(ch.name)}"
                        aria-label="Voir les détails de ${esc(ch.name)}"
                      >👁</button>
                    </div>
                    <div class="ov-name">${ROR.renderCharNameHtml(ch, { compact: true })}</div>
                    ${isSelected ? '<span class="ov-selected-tag">Sélectionné</span>' : ''}
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  function bindGameEvents(container, game) {
    container.querySelector('[data-action="quit-game"]')?.addEventListener('click', () => {
      if (game.phase === 'playing') {
        const ok = global.confirm('Quitter la partie en cours ? Votre progression actuelle sera perdue.');
        if (!ok) return;
      }
      ROR.AppState.game = null;
      ROR.navigateTo('home');
    });

    container.querySelector('[data-action="open-overview"]')?.addEventListener('click', () => {
      game.overviewOpen = true;
      ROR.renderGameScreen(container);
    });

    container.querySelector('[data-action="close-overview"]')?.addEventListener('click', () => {
      game.overviewOpen = false;
      ROR.renderGameScreen(container);
    });

    // Draw from Main Deck
    container.querySelector('[data-action="draw-main"]')?.addEventListener('click', () => {
      if (game.phase !== 'playing' || game.activeCard !== null || game.mainDeck.length === 0 || game.isBurning) return;
      game.activeCard = game.mainDeck.pop();
      game.activeCardSource = 'main';
      game.isFlipped = false;
      ROR.renderGameScreen(container);
    });

    // Flip Center Card (animated smoothly without breaking CSS 3D transition)
    const flipEl = container.querySelector('[data-action="flip-center-card"]');
    const handleFlip = () => {
      if (!game.activeCard || game.isFlipped || game.isBurning) return;
      game.isFlipped = true;
      flipEl.classList.add('is-flipped');

      const banner = container.querySelector('.center-action-banner');
      if (banner) {
        banner.classList.add('is-revealed');
        banner.textContent = '✅ Choisissez une place libre dans la liste à droite (ou utilisez un Joker à gauche)';
      }

      // Enable empty slots smoothly without replacing the flipping card element
      const hintPill = container.querySelector('.ranking-hint-pill');
      if (hintPill) {
        hintPill.classList.add('is-active');
        hintPill.textContent = 'Choisissez une place libre';
      }
      container.querySelectorAll('.rank-slot-empty').forEach((btn) => {
        btn.disabled = false;
        btn.classList.add('is-placeable');
        const lbl = btn.querySelector('.rank-empty-label');
        if (lbl) lbl.textContent = '＋ Placer ici';
      });
    };

    flipEl?.addEventListener('click', handleFlip);
    flipEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleFlip();
      }
    });

    // Burn current center card & draw Joker card
    container.querySelector('[data-action="draw-joker"]')?.addEventListener('click', () => {
      if (game.phase !== 'playing' || game.activeCard === null || game.jokerDeck.length === 0 || game.isBurning) return;
      game.isBurning = true;

      const wrapper = container.querySelector('.center-card-wrapper');
      if (wrapper) {
        wrapper.classList.add('is-burning');
      }
      // Disable decks visually during burn
      container.querySelectorAll('.deck-pile').forEach((d) => {
        d.disabled = true;
        d.classList.remove('is-clickable');
      });

      setTimeout(() => {
        game.burnedCards.push(game.activeCard);
        game.activeCard = game.jokerDeck.pop();
        game.activeCardSource = 'joker';
        game.isFlipped = false;
        game.isBurning = false;
        ROR.renderGameScreen(container);
      }, 340);
    });

    // Place flipped card in an empty ranking slot
    const placeIntoSlot = (idx) => {
      if (game.phase !== 'playing' || !game.activeCard || !game.isFlipped || game.slots[idx] !== null) return;
      game.slots[idx] = game.activeCard;
      game.activeCard = null;
      game.activeCardSource = null;
      game.isFlipped = false;

      // Check if all slots are now filled
      const allFilled = game.slots.every((s) => s !== null);
      if (allFilled) {
        if (game.swapsRemaining > 0) {
          game.phase = 'postgame_swap';
        } else {
          game.phase = 'finished';
          ROR.saveGameToHistory(game);
        }
        game.overviewOpen = true;
      }

      ROR.renderGameScreen(container);
    };

    container.querySelectorAll('[data-place-index]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-place-index'));
        placeIntoSlot(idx);
      });
    });

    container.querySelectorAll('[data-overview-empty]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-overview-empty'));
        placeIntoSlot(idx);
      });
    });

    // Inspect filled slot in right panel
    container.querySelectorAll('[data-inspect-index]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-inspect-index'));
        const ch = game.slots[idx];
        if (ch) ROR.openCharacterInspectModal(ch, idx + 1);
      });
    });

    // View burned cards
    container.querySelector('[data-action="view-burned"]')?.addEventListener('click', () => {
      if (game.burnedCards.length === 0) return;
      ROR.openBurnedModal(game.burnedCards);
    });

    // Inspect button on overview cards (opens details without selecting for swap)
    container.querySelectorAll('[data-overview-inspect]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-overview-inspect'));
        const ch = game.slots[idx];
        if (ch) ROR.openCharacterInspectModal(ch, idx + 1);
      });
    });

    // Overview filled cards: swap during postgame_swap, or inspect otherwise
    const handleOverviewCardActivate = (cardEl) => {
      const idx = Number(cardEl.getAttribute('data-overview-filled'));
      if (game.phase === 'postgame_swap') {
        if (game.selectedSwapIndex === null) {
          game.selectedSwapIndex = idx;
        } else if (game.selectedSwapIndex === idx) {
          game.selectedSwapIndex = null;
        } else {
          const a = game.selectedSwapIndex;
          const b = idx;
          const temp = game.slots[a];
          game.slots[a] = game.slots[b];
          game.slots[b] = temp;
          game.selectedSwapIndex = null;
          game.swapsRemaining -= 1;
          game.swapsUsed += 1;

          if (game.swapsRemaining <= 0) {
            game.phase = 'finished';
            ROR.saveGameToHistory(game);
          }
        }
        ROR.renderGameScreen(container);
      } else {
        const ch = game.slots[idx];
        if (ch) ROR.openCharacterInspectModal(ch, idx + 1);
      }
    };

    container.querySelectorAll('[data-overview-filled]').forEach((cardEl) => {
      cardEl.addEventListener('click', () => handleOverviewCardActivate(cardEl));
      cardEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOverviewCardActivate(cardEl);
        }
      });
    });

    // Finish swaps early -> lock, save to localStorage, keep overview grid visible & show Return to Home
    container.querySelector('[data-action="finish-swaps"]')?.addEventListener('click', () => {
      if (game.phase !== 'postgame_swap') return;
      game.selectedSwapIndex = null;
      game.phase = 'finished';
      ROR.saveGameToHistory(game);
      ROR.renderGameScreen(container);
    });

    container.querySelector('[data-action="copy-final"]')?.addEventListener('click', async (e) => {
      const modeLabel = ROR.getModeMeta(game.mode).label;
      const text = ROR.formatRankingAsText(game.slots, modeLabel);
      try {
        await navigator.clipboard.writeText(text);
        e.currentTarget.textContent = '✓ Copié !';
        setTimeout(() => {
          if (e.currentTarget) e.currentTarget.textContent = '📋 Copier le top';
        }, 1600);
      } catch {
        // Ignore
      }
    });

    container.querySelector('[data-action="replay-same"]')?.addEventListener('click', () => {
      ROR.startNewGame();
    });

    container.querySelector('[data-action="return-home-final"]')?.addEventListener('click', () => {
      ROR.AppState.game = null;
      ROR.navigateTo('home');
    });
  }

  ROR.openCharacterInspectModal = function openCharacterInspectModal(
    char,
    rankOrOptions,
    modeArg = ROR.AppState.game?.mode || ROR.AppState.mode || 'power'
  ) {
    const esc = ROR.escapeHtml;
    const opts =
      rankOrOptions && typeof rankOrOptions === 'object'
        ? rankOrOptions
        : { rank: rankOrOptions, mode: modeArg };
    const rank = opts.rank ?? null;
    let currentMode = opts.mode || modeArg || 'power';
    const showModeToggle = Boolean(opts.showModeToggle);
    const showScores = Boolean(opts.showScores);
    const showId = Boolean(opts.showId);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    function renderInspect() {
      const modeMeta = ROR.getModeMeta(currentMode);
      overlay.innerHTML = `
        <div class="modal-panel modal-panel-sm">
          <div class="modal-header">
            <div class="inspect-header-meta">
              ${
                rank !== null
                  ? `<span class="mode-tag">Rang #${rank}</span>`
                  : `<span class="mode-tag">Fiche carte</span>`
              }
              ${showId && char.id ? `<code class="inspect-id-pill" title="Identifiant pour assets/portraits/<id>">${esc(char.id)}</code>` : ''}
              ${
                showScores
                  ? `<span class="gen-score-badges">
                      <span class="prio-badge" title="Indice de priorité">★ ${char.priority}</span>
                      <span class="beauty-badge" title="Indice beauté / BG">✨ ${char.beauty ?? 5}</span>
                    </span>`
                  : ''
              }
            </div>
            <button type="button" class="btn-icon-close" data-close>✕</button>
          </div>
          ${
            showModeToggle
              ? `<div class="gen-preview-tabs inspect-mode-tabs">
                  <button type="button" class="btn btn-xs btn-ghost gen-preview-tab ${currentMode === 'power' ? 'is-active' : ''}" data-inspect-mode="power">
                    ⚡ Puissance (Paysage)
                  </button>
                  <button type="button" class="btn btn-xs btn-ghost gen-preview-tab ${currentMode === 'beauty' ? 'is-active' : ''}" data-inspect-mode="beauty">
                    ✨ Beauté (Full-Art Vertical)
                  </button>
                </div>`
              : ''
          }
          <div class="inspect-card ${modeMeta.fullArt ? 'is-fullart-inspect' : ''}">
            ${ROR.renderCharacterCardFrontHtml(char, { mode: currentMode })}
          </div>
        </div>
      `;

      overlay.querySelector('[data-close]')?.addEventListener('click', () => overlay.remove());
      overlay.querySelectorAll('[data-inspect-mode]').forEach((btn) => {
        btn.addEventListener('click', () => {
          currentMode = btn.getAttribute('data-inspect-mode') || 'power';
          renderInspect();
        });
      });
    }

    renderInspect();
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  };

  ROR.openBurnedModal = function openBurnedModal(burnedCards) {
    const esc = ROR.escapeHtml;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-panel modal-panel-sm">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">🔥 Cartes brûlées (${burnedCards.length})</h2>
            <p class="modal-subtitle">Sacrifiées via le Deck Joker</p>
          </div>
          <button type="button" class="btn-icon-close" data-close>✕</button>
        </div>
        <div class="burned-list">
          ${burnedCards
            .map(
              (c) => `
            <div class="burned-item">
              <img class="mini-thumb" src="${esc(c.image)}" alt="${esc(c.name)}" data-fallback="${esc(ROR.getFallbackImage(c))}" data-licence="${esc(c.licence)}" onerror="window.ROR && window.ROR.onImgError(this)"/>
              <div>
                <strong>${esc(c.name)}</strong>
                <div class="muted">${esc(c.licence)}</div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
    overlay.querySelector('[data-close]')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  };

  /* ==================== SMASH OR PASS MODE ==================== */

  function renderSmashGameScreen(container, game) {
    const esc = ROR.escapeHtml;
    const modeMeta = ROR.getModeMeta(game.mode);
    const subModeLabel = game.subMode === 'bg' ? ' • Mode BG' : '';

    const turboList = game.tiers?.turbo || [];
    const smashList = game.tiers?.smash || [];
    const passList = game.tiers?.pass || [];
    const swipedCount = turboList.length + smashList.length + passList.length;
    const progressPct = Math.round((swipedCount / game.targetCount) * 100);
    const remainingInDeck = game.mainDeck.length + (game.activeCard ? 1 : 0);

    const prevOverview = container.querySelector('.overview-overlay');
    const prevOverviewScroll = prevOverview ? prevOverview.scrollTop : 0;

    container.innerHTML = `
      <div class="screen screen-game is-fullart-mode is-smash-mode">
        <header class="topbar game-topbar">
          <div class="topbar-left">
            <button type="button" class="btn btn-sm btn-ghost" data-action="quit-game">✕ Quitter</button>
            <span class="mode-tag mode-tag-smash">${esc(modeMeta.tag + subModeLabel)}</span>
          </div>

          <div class="game-progress-wrap">
            <div class="progress-text">
              <span>Progression</span>
              <strong>${swipedCount} / ${game.targetCount}</strong>
            </div>
            <div class="progress-bar">
              <div class="progress-fill progress-fill-smash" style="width: ${progressPct}%"></div>
            </div>
          </div>

          <div class="topbar-right">
            <button type="button" class="btn btn-sm btn-secondary" data-action="open-overview">
              ⊞ Tierlist (${swipedCount})
            </button>
          </div>
        </header>

        <main class="smash-arena">
          <!-- TOP COUNTERS & DIRECTION REMINDERS -->
          <div class="smash-hud-bar">
            <div class="smash-hud-pill smash-hud-pass" data-smash-pill="pass">
              <span class="smash-hud-arrow">⬅️</span>
              <span class="smash-hud-icon">❄️</span>
              <div class="smash-hud-info">
                <span class="smash-hud-label">PASS</span>
                <strong class="smash-hud-count">${passList.length}</strong>
              </div>
            </div>

            <div class="smash-hud-pill smash-hud-turbo ${game.turboRemaining <= 0 ? 'is-depleted' : ''}" data-smash-pill="turbo">
              <span class="smash-hud-arrow">⬆️</span>
              <span class="smash-hud-icon">🚀</span>
              <div class="smash-hud-info">
                <span class="smash-hud-label">TURBO SMASH</span>
                <strong class="smash-hud-count">${game.turboRemaining} / ${game.turboMax} restant${game.turboRemaining > 1 ? 's' : ''}</strong>
              </div>
            </div>

            <div class="smash-hud-pill smash-hud-smash" data-smash-pill="smash">
              <div class="smash-hud-info is-right">
                <span class="smash-hud-label">SMASH</span>
                <strong class="smash-hud-count">${smashList.length}</strong>
              </div>
              <span class="smash-hud-icon">🔥</span>
              <span class="smash-hud-arrow">➡️</span>
            </div>
          </div>

          <!-- CENTER: LARGE PORTRAIT DECK & SWIPEABLE CARD -->
          <section class="smash-stage">
            <div class="center-action-banner smash-action-banner ${game.isFlipped ? 'is-revealed' : ''}" id="smash-banner">
              ${
                !game.activeCard
                  ? '🎉 Toutes les cartes ont été jouées !'
                  : !game.isFlipped
                    ? `🎴 Deck central (${remainingInDeck} restante${remainingInDeck > 1 ? 's' : ''}) — Cliquez sur la carte pour la retourner !`
                    : '👆 Glissez la carte : ⬅️ Pass • ➡️ Smash • ⬆️ Turbo Smash'
              }
            </div>

            ${
              !game.activeCard
                ? `
                  <div class="center-empty-slot">
                    <div class="empty-slot-icon">🏆</div>
                    <h3>Deck terminé !</h3>
                    <p>Découvrez votre Tierlist finale Smash or Pass.</p>
                    <button type="button" class="btn btn-primary" data-action="open-overview">Voir la Tierlist finale</button>
                  </div>
                `
                : renderSmashCenterDeckCard(game)
            }

            ${
              game.activeCard
                ? `
                  <div class="smash-controls-row ${game.isFlipped ? 'is-ready' : 'is-locked'}" id="smash-controls">
                    <button
                      type="button"
                      class="btn smash-action-btn btn-smash-pass"
                      data-smash-choice="pass"
                      ${game.isFlipped ? '' : 'disabled'}
                      title="Glisser à gauche ou Flèche Gauche"
                    >
                      <span>⬅️ ❄️ Pass</span>
                    </button>

                    <button
                      type="button"
                      class="btn smash-action-btn btn-smash-turbo ${game.turboRemaining <= 0 ? 'is-empty' : ''}"
                      data-smash-choice="turbo"
                      ${game.isFlipped && game.turboRemaining > 0 ? '' : 'disabled'}
                      title="${game.turboRemaining > 0 ? 'Glisser vers le haut ou Flèche Haut' : 'Plus de Turbo Smash disponible'}"
                    >
                      <span>⬆️ 🚀 Turbo (${game.turboRemaining})</span>
                    </button>

                    <button
                      type="button"
                      class="btn smash-action-btn btn-smash-yes"
                      data-smash-choice="smash"
                      ${game.isFlipped ? '' : 'disabled'}
                      title="Glisser à droite ou Flèche Droite"
                    >
                      <span>🔥 Smash ➡️</span>
                    </button>

                    <button
                      type="button"
                      class="btn btn-sm btn-ghost smash-inspect-btn"
                      data-action="inspect-active-smash"
                      ${game.isFlipped ? '' : 'disabled'}
                      title="Voir les détails du personnage"
                    >
                      👁 Fiche
                    </button>
                  </div>
                `
                : ''
            }
          </section>
        </main>
      </div>

      ${game.overviewOpen ? renderSmashOverviewOverlay(game) : ''}
    `;

    const newOverview = container.querySelector('.overview-overlay');
    if (newOverview && prevOverviewScroll > 0) {
      newOverview.scrollTop = prevOverviewScroll;
    }

    bindSmashGameEvents(container, game);
  }

  function renderSmashCenterDeckCard(game) {
    const esc = ROR.escapeHtml;
    const char = game.activeCard;
    const isFlipped = game.isFlipped;
    const deckBehind = game.mainDeck.length;

    return `
      <div class="smash-deck-stack">
        ${deckBehind >= 3 ? '<div class="smash-stack-card stack-depth-3" aria-hidden="true"></div>' : ''}
        ${deckBehind >= 2 ? '<div class="smash-stack-card stack-depth-2" aria-hidden="true"></div>' : ''}
        ${deckBehind >= 1 ? '<div class="smash-stack-card stack-depth-1" aria-hidden="true"></div>' : ''}

        <div class="smash-swipe-wrapper" id="smash-swipe-wrapper">
          <div
            class="flip-card is-fullart-card smash-flip-card ${isFlipped ? 'is-flipped is-swipeable' : ''}"
            id="smash-flip-card"
            data-action="flip-smash-card"
            role="button"
            tabindex="0"
            aria-label="${isFlipped ? esc(char.name) : 'Retourner la carte'}"
          >
            <div class="flip-card-inner">
              <!-- BACK FACE (DECK CENTRAL FACE CACHÉE) -->
              <div class="flip-card-face flip-card-back back-smash">
                <div class="card-back-frame">
                  <div class="card-back-corner tl">🔥</div>
                  <div class="card-back-corner tr">🔥</div>
                  <div class="card-back-corner bl">🔥</div>
                  <div class="card-back-corner br">🔥</div>
                  <div class="card-back-emblem">🔥</div>
                  <div class="card-back-title">SMASH OR PASS</div>
                  <div class="smash-deck-count-pill">
                    Carte ${game.targetCount - game.mainDeck.length} sur ${game.targetCount}
                  </div>
                  <div class="card-back-cta">Cliquez pour retourner</div>
                </div>
              </div>

              <!-- FRONT FACE (PORTRAIT FULL-ART + SWIPE STAMPS) -->
              <div class="flip-card-face flip-card-front is-fullart-front">
                ${ROR.renderCharacterCardFrontHtml(char, { mode: 'smash', isJoker: false })}

                <!-- DYNAMIC SWIPE OVERLAY STAMPS -->
                <div class="swipe-stamp swipe-stamp-smash" id="stamp-smash" aria-hidden="true">
                  🔥 SMASH
                </div>
                <div class="swipe-stamp swipe-stamp-pass" id="stamp-pass" aria-hidden="true">
                  ❄️ PASS
                </div>
                <div class="swipe-stamp swipe-stamp-turbo" id="stamp-turbo" aria-hidden="true">
                  ${game.turboRemaining > 0 ? '🚀 TURBO SMASH' : '🚫 PLUS DE TURBO'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderSmashOverviewOverlay(game) {
    const esc = ROR.escapeHtml;
    const isFinished = game.phase === 'finished';
    const turboList = game.tiers?.turbo || [];
    const smashList = game.tiers?.smash || [];
    const passList = game.tiers?.pass || [];
    const swipedCount = turboList.length + smashList.length + passList.length;

    const statusBanner = isFinished
      ? `
        <div class="overview-banner overview-banner-finished overview-banner-smash">
          <div>
            <div class="banner-kicker banner-kicker-gold">🏆 TIERLIST FINALE ENREGISTRÉE</div>
            <h2>🔥 Smash or Pass — ${game.targetCount} personnages</h2>
            <p class="muted">
              🚀 <strong>${turboList.length}</strong> Turbo Smash (${game.turboUsed}/${game.turboMax} utilisés) •
              🔥 <strong>${smashList.length}</strong> Smash •
              ❄️ <strong>${passList.length}</strong> Pass
            </p>
          </div>
          <div class="finished-actions">
            <button type="button" class="btn btn-secondary" data-action="copy-final">📋 Copier la tierlist</button>
            <button type="button" class="btn btn-secondary" data-action="replay-same">🔄 Rejouer</button>
            <button type="button" class="btn btn-primary" data-action="return-home-final">🏠 Retour à l'accueil</button>
          </div>
        </div>
      `
      : `
        <div class="overview-banner overview-banner-playing">
          <div>
            <h2>⊞ Tierlist Smash or Pass en cours (${swipedCount} / ${game.targetCount})</h2>
            <p class="muted">
              Aperçu en direct de vos choix — 🚀 ${game.turboRemaining}/${game.turboMax} Turbo Smash restant${game.turboRemaining > 1 ? 's' : ''}.
            </p>
          </div>
          <button type="button" class="btn btn-primary" data-action="close-overview">← Retour à la partie</button>
        </div>
      `;

    const sections = [
      {
        key: 'turbo',
        title: '🚀 TURBO SMASH',
        subtitle: 'Coups de cœur absolus',
        cls: 'tier-row-turbo',
        items: turboList
      },
      {
        key: 'smash',
        title: '🔥 SMASH',
        subtitle: 'Validés à droite',
        cls: 'tier-row-smash',
        items: smashList
      },
      {
        key: 'pass',
        title: '❄️ PASS',
        subtitle: 'Écartés à gauche',
        cls: 'tier-row-pass',
        items: passList
      }
    ];

    return `
      <div class="overview-overlay">
        <div class="overview-container">
          ${statusBanner}

          <div class="smash-tierlist">
            ${sections
              .map(
                (sec) => `
                  <div class="tier-row ${sec.cls}">
                    <div class="tier-label">
                      <span class="tier-label-title">${sec.title}</span>
                      <span class="tier-label-sub">${sec.subtitle}</span>
                      <span class="tier-label-count">${sec.items.length} perso${sec.items.length > 1 ? 's' : ''}</span>
                    </div>
                    <div class="tier-items">
                      ${
                        sec.items.length === 0
                          ? `<div class="tier-empty">Aucun personnage dans cette catégorie</div>`
                          : sec.items
                              .map((ch) => {
                                const ovImg = ROR.getCharacterImage(ch, 'portrait');
                                return `
                                  <div
                                    role="button"
                                    tabindex="0"
                                    class="overview-card overview-card-filled is-tier-card"
                                    data-smash-inspect-id="${esc(ch.id)}"
                                    title="Cliquer pour voir ${esc(ch.name)}"
                                  >
                                    <div class="ov-top">
                                      <span class="ov-licence">${esc(ch.licence)}</span>
                                    </div>
                                    <div class="ov-img-wrap">
                                      <img src="${esc(ovImg)}" alt="${esc(ch.name)}" loading="lazy" data-fallback="${esc(ROR.getFallbackImage(ch))}" data-licence="${esc(ch.licence)}" onerror="window.ROR && window.ROR.onImgError(this)"/>
                                      <button
                                        type="button"
                                        class="ov-inspect-btn"
                                        data-smash-inspect-id="${esc(ch.id)}"
                                        title="Voir la carte de ${esc(ch.name)}"
                                        aria-label="Voir la carte de ${esc(ch.name)}"
                                      >👁</button>
                                    </div>
                                    <div class="ov-name">${ROR.renderCharNameHtml(ch, { compact: true })}</div>
                                  </div>
                                `;
                              })
                              .join('')
                      }
                    </div>
                  </div>
                `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  function bindSmashGameEvents(container, game) {
    container.querySelector('[data-action="quit-game"]')?.addEventListener('click', () => {
      if (game.phase === 'playing') {
        const ok = global.confirm('Quitter la partie en cours ? Votre progression actuelle sera perdue.');
        if (!ok) return;
      }
      clearSmashKeyHandler();
      ROR.AppState.game = null;
      ROR.navigateTo('home');
    });

    container.querySelectorAll('[data-action="open-overview"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        game.overviewOpen = true;
        ROR.renderGameScreen(container);
      });
    });

    container.querySelector('[data-action="close-overview"]')?.addEventListener('click', () => {
      game.overviewOpen = false;
      ROR.renderGameScreen(container);
    });

    container.querySelector('[data-action="inspect-active-smash"]')?.addEventListener('click', () => {
      if (game.activeCard && game.isFlipped) {
        ROR.openCharacterInspectModal(game.activeCard, {
          showModeToggle: true,
          mode: 'beauty'
        });
      }
    });

    container.querySelectorAll('[data-smash-inspect-id]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.getAttribute('data-smash-inspect-id');
        const allPlaced = [
          ...(game.tiers?.turbo || []),
          ...(game.tiers?.smash || []),
          ...(game.tiers?.pass || [])
        ];
        const found = allPlaced.find((c) => c.id === id);
        if (found) {
          ROR.openCharacterInspectModal(found, {
            showModeToggle: true,
            mode: 'beauty'
          });
        }
      });
    });

    container.querySelector('[data-action="copy-final"]')?.addEventListener('click', async (e) => {
      const text = ROR.formatSmashTiersAsText(game.tiers, game.targetCount);
      try {
        await navigator.clipboard.writeText(text);
        e.currentTarget.textContent = '✓ Copié !';
        setTimeout(() => {
          if (e.currentTarget) e.currentTarget.textContent = '📋 Copier la tierlist';
        }, 1600);
      } catch {
        // Ignore
      }
    });

    container.querySelector('[data-action="replay-same"]')?.addEventListener('click', () => {
      clearSmashKeyHandler();
      ROR.startNewGame();
    });

    container.querySelector('[data-action="return-home-final"]')?.addEventListener('click', () => {
      clearSmashKeyHandler();
      ROR.AppState.game = null;
      ROR.navigateTo('home');
    });

    const flipCardEl = container.querySelector('#smash-flip-card');
    const swipeWrapperEl = container.querySelector('#smash-swipe-wrapper');
    const stampSmash = container.querySelector('#stamp-smash');
    const stampPass = container.querySelector('#stamp-pass');
    const stampTurbo = container.querySelector('#stamp-turbo');

    const pillPass = container.querySelector('[data-smash-pill="pass"]');
    const pillSmash = container.querySelector('[data-smash-pill="smash"]');
    const pillTurbo = container.querySelector('[data-smash-pill="turbo"]');

    let isAnimatingOut = false;

    const unlockAfterFlipInPlace = () => {
      if (!game.activeCard || game.isFlipped) return;
      game.isFlipped = true;
      flipCardEl?.classList.add('is-flipped', 'is-swipeable');

      const banner = container.querySelector('#smash-banner');
      if (banner) {
        banner.classList.add('is-revealed');
        banner.textContent = '👆 Glissez la carte : ⬅️ Pass • ➡️ Smash • ⬆️ Turbo Smash';
      }

      const controls = container.querySelector('#smash-controls');
      if (controls) {
        controls.classList.remove('is-locked');
        controls.classList.add('is-ready');
      }

      container.querySelectorAll('[data-smash-choice]').forEach((btn) => {
        const choice = btn.getAttribute('data-smash-choice');
        if (choice === 'turbo' && game.turboRemaining <= 0) {
          btn.disabled = true;
        } else {
          btn.disabled = false;
        }
      });

      const inspectBtn = container.querySelector('[data-action="inspect-active-smash"]');
      if (inspectBtn) inspectBtn.disabled = false;
    };

    const flashDepletedTurbo = () => {
      if (pillTurbo) {
        pillTurbo.classList.remove('is-shake');
        void pillTurbo.offsetWidth;
        pillTurbo.classList.add('is-shake');
      }
    };

    const commitSmashChoice = (choice) => {
      if (isAnimatingOut || game.phase !== 'playing' || !game.activeCard || !game.isFlipped) return;
      if (choice === 'turbo' && game.turboRemaining <= 0) {
        flashDepletedTurbo();
        return;
      }

      isAnimatingOut = true;

      if (stampSmash) stampSmash.style.opacity = choice === 'smash' ? '1' : '0';
      if (stampPass) stampPass.style.opacity = choice === 'pass' ? '1' : '0';
      if (stampTurbo) stampTurbo.style.opacity = choice === 'turbo' ? '1' : '0';

      if (swipeWrapperEl) {
        swipeWrapperEl.classList.remove('is-dragging');
        swipeWrapperEl.style.transition = 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease';
        if (choice === 'smash') {
          swipeWrapperEl.style.transform = 'translate3d(460px, 20px, 0) rotate(22deg)';
        } else if (choice === 'pass') {
          swipeWrapperEl.style.transform = 'translate3d(-460px, 20px, 0) rotate(-22deg)';
        } else if (choice === 'turbo') {
          swipeWrapperEl.style.transform = 'translate3d(0px, -440px, 0) scale(1.06)';
        }
        swipeWrapperEl.style.opacity = '0';
      }

      setTimeout(() => {
        const current = game.activeCard;
        if (choice === 'turbo') {
          game.tiers.turbo.push(current);
          game.turboRemaining = Math.max(0, game.turboRemaining - 1);
          game.turboUsed = (game.turboUsed || 0) + 1;
        } else if (choice === 'smash') {
          game.tiers.smash.push(current);
        } else {
          game.tiers.pass.push(current);
        }

        if (game.mainDeck.length > 0) {
          game.activeCard = game.mainDeck.pop();
          game.activeCardSource = 'main';
          game.isFlipped = false;
        } else {
          game.activeCard = null;
          game.activeCardSource = null;
          game.isFlipped = false;
          game.phase = 'finished';
          game.overviewOpen = true;
          ROR.saveGameToHistory(game);
        }

        isAnimatingOut = false;
        ROR.renderGameScreen(container);
      }, 250);
    };

    // Quick action buttons below card
    container.querySelectorAll('[data-smash-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const choice = btn.getAttribute('data-smash-choice');
        commitSmashChoice(choice);
      });
    });

    // Pointer drag / swipe handling on the central card
    if (swipeWrapperEl && flipCardEl) {
      let dragging = false;
      let pointerId = null;
      let startX = 0;
      let startY = 0;
      let currentDx = 0;
      let currentDy = 0;
      let movedEnoughForDrag = false;

      const SWIPE_THRESHOLD = 90;

      const detectDominantIntent = (dx, dy) => {
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (dy < -40 && absY > absX * 0.85) {
          return { dir: 'turbo', ratio: Math.min(1, absY / SWIPE_THRESHOLD) };
        }
        if (dx > 30 && absX >= absY * 0.7) {
          return { dir: 'smash', ratio: Math.min(1, absX / SWIPE_THRESHOLD) };
        }
        if (dx < -30 && absX >= absY * 0.7) {
          return { dir: 'pass', ratio: Math.min(1, absX / SWIPE_THRESHOLD) };
        }
        return { dir: null, ratio: 0 };
      };

      const updateVisualFeedback = (dx, dy) => {
        const { dir, ratio } = detectDominantIntent(dx, dy);
        if (stampSmash) stampSmash.style.opacity = dir === 'smash' ? String(ratio) : '0';
        if (stampPass) stampPass.style.opacity = dir === 'pass' ? String(ratio) : '0';
        if (stampTurbo) stampTurbo.style.opacity = dir === 'turbo' ? String(ratio) : '0';

        pillSmash?.classList.toggle('is-active-target', dir === 'smash' && ratio > 0.35);
        pillPass?.classList.toggle('is-active-target', dir === 'pass' && ratio > 0.35);
        pillTurbo?.classList.toggle('is-active-target', dir === 'turbo' && ratio > 0.35);
      };

      const resetPositionSmoothly = () => {
        swipeWrapperEl.classList.remove('is-dragging');
        swipeWrapperEl.style.transition = 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)';
        swipeWrapperEl.style.transform = 'translate3d(0px, 0px, 0px) rotate(0deg)';
        updateVisualFeedback(0, 0);
      };

      swipeWrapperEl.addEventListener('pointerdown', (e) => {
        if (isAnimatingOut || e.button !== undefined && e.button !== 0) return;
        if (!game.isFlipped) return; // Waiting for click to flip first
        dragging = true;
        pointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        currentDx = 0;
        currentDy = 0;
        movedEnoughForDrag = false;

        swipeWrapperEl.classList.add('is-dragging');
        swipeWrapperEl.style.transition = 'none';
        try {
          swipeWrapperEl.setPointerCapture(pointerId);
        } catch {
          // Ignore
        }
      });

      swipeWrapperEl.addEventListener('pointermove', (e) => {
        if (!dragging || e.pointerId !== pointerId) return;
        currentDx = e.clientX - startX;
        currentDy = e.clientY - startY;
        if (Math.hypot(currentDx, currentDy) > 6) {
          movedEnoughForDrag = true;
        }
        const rot = (currentDx * 0.055).toFixed(2);
        swipeWrapperEl.style.transform = `translate3d(${currentDx.toFixed(1)}px, ${currentDy.toFixed(1)}px, 0) rotate(${rot}deg)`;
        updateVisualFeedback(currentDx, currentDy);
      });

      const handlePointerEnd = (e) => {
        if (!dragging || e.pointerId !== pointerId) return;
        dragging = false;
        try {
          swipeWrapperEl.releasePointerCapture(pointerId);
        } catch {
          // Ignore
        }
        pointerId = null;

        const absX = Math.abs(currentDx);
        const absY = Math.abs(currentDy);

        // Upward swipe -> Turbo Smash
        if (currentDy < -SWIPE_THRESHOLD && absY > absX * 0.85) {
          if (game.turboRemaining > 0) {
            commitSmashChoice('turbo');
            return;
          } else {
            flashDepletedTurbo();
            resetPositionSmoothly();
            return;
          }
        }

        // Right swipe -> Smash
        if (currentDx > SWIPE_THRESHOLD && absX >= absY * 0.7) {
          commitSmashChoice('smash');
          return;
        }

        // Left swipe -> Pass
        if (currentDx < -SWIPE_THRESHOLD && absX >= absY * 0.7) {
          commitSmashChoice('pass');
          return;
        }

        resetPositionSmoothly();
      };

      swipeWrapperEl.addEventListener('pointerup', handlePointerEnd);
      swipeWrapperEl.addEventListener('pointercancel', handlePointerEnd);

      // Click to flip when face down
      flipCardEl.addEventListener('click', () => {
        if (isAnimatingOut || movedEnoughForDrag) return;
        if (!game.isFlipped) {
          unlockAfterFlipInPlace();
        }
      });
    }

    // Keyboard shortcuts: Space/Enter to flip, ArrowLeft=Pass, ArrowRight=Smash, ArrowUp=Turbo Smash
    activeSmashKeyHandler = (e) => {
      if (ROR.AppState.screen !== 'game' || game.mode !== 'smash' || game.overviewOpen || isAnimatingOut) return;
      if (document.querySelector('.modal-overlay')) return;

      if (!game.isFlipped) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          unlockAfterFlipInPlace();
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        commitSmashChoice('smash');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        commitSmashChoice('pass');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        commitSmashChoice('turbo');
      }
    };
    global.addEventListener('keydown', activeSmashKeyHandler);
  }
})(window);
