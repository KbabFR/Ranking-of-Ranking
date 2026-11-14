(function (global) {
  'use strict';

  const ROR = (global.ROR = global.ROR || {});

  ROR.renderGameScreen = function renderGameScreen(container) {
    const game = ROR.AppState.game;
    if (!game) {
      ROR.navigateTo('home');
      return;
    }

    const esc = ROR.escapeHtml;
    const placedCount = game.slots.filter(Boolean).length;
    const progressPct = Math.round((placedCount / game.targetCount) * 100);

    const canDrawMain = game.phase === 'playing' && game.activeCard === null && game.mainDeck.length > 0 && !game.isBurning;
    const canDrawJoker = game.phase === 'playing' && game.activeCard !== null && game.jokerDeck.length > 0 && !game.isBurning;
    const canPlace = game.phase === 'playing' && game.activeCard !== null && game.isFlipped && !game.isBurning;

    // Preserve scroll position of the ranking list across re-renders
    const prevList = container.querySelector('.ranking-list');
    const prevScrollTop = prevList ? prevList.scrollTop : 0;

    container.innerHTML = `
      <div class="screen screen-game">
        <header class="topbar game-topbar">
          <div class="topbar-left">
            <button type="button" class="btn btn-sm btn-ghost" data-action="quit-game">✕ Quitter</button>
            <span class="mode-tag">⚡ Puissance</span>
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
                  <div class="card-back-ornament">⚡</div>
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
                : renderActiveFlipCard(game.activeCard, game.activeCardSource, game.isFlipped, game.isBurning)
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
                      <img class="rank-thumb" src="${esc(slotChar.image)}" alt="${esc(slotChar.name)}" onerror="this.style.display='none'"/>
                      <div class="rank-char-info">
                        <div class="rank-char-name">${esc(slotChar.name)}</div>
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

    bindGameEvents(container, game);
  };

  function renderActiveFlipCard(char, source, isFlipped, isBurning) {
    const esc = ROR.escapeHtml;
    const isJoker = source === 'joker';

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
          class="flip-card ${isFlipped ? 'is-flipped' : ''} ${isJoker ? 'is-joker-card' : ''}"
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
                <div class="card-back-emblem">${isJoker ? '🃏' : '⚡'}</div>
                <div class="card-back-title">${isJoker ? 'CARTE JOKER' : 'MYSTÈRE'}</div>
                <div class="card-back-cta">Cliquez pour révéler</div>
              </div>
            </div>

            <!-- FRONT FACE (FACE VISIBLE) -->
            <div class="flip-card-face flip-card-front">
              <div class="char-card-header">
                <span class="char-medium-pill">${esc(char.medium)}</span>
                <span class="char-licence-pill">${esc(char.licence)}</span>
                ${isJoker ? '<span class="char-joker-pill">🃏 JOKER</span>' : ''}
              </div>

              <div class="char-artwork-box">
                <img
                  class="char-artwork-img"
                  src="${esc(char.image)}"
                  alt="${esc(char.name)}"
                  onerror="this.style.opacity='0.2'"
                />
              </div>

              <div class="char-card-body">
                <h2 class="char-name">${esc(char.name)}</h2>
                <p class="char-desc">${esc(char.description)}</p>

                <div class="char-abilities-block">
                  <div class="abilities-title">Points forts &amp; Capacités</div>
                  <ul class="abilities-list">
                    ${char.abilities.map((ab) => `<li>${esc(ab)}</li>`).join('')}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderOverviewOverlay(game) {
    const esc = ROR.escapeHtml;
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
            <h2>Top ${game.targetCount} — Mode Puissance</h2>
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

          <div class="overview-grid">
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

                return `
                  <button
                    type="button"
                    class="overview-card overview-card-filled ${rankClass} ${isSwapPhase ? 'is-swappable' : ''} ${isSelected ? 'is-swap-selected' : ''}"
                    data-overview-filled="${idx}"
                  >
                    <div class="ov-top">
                      <span class="ov-rank ${rank <= 3 ? `ov-rank-${rank}` : ''}">#${rank}</span>
                      <span class="ov-licence">${esc(ch.licence)}</span>
                    </div>
                    <div class="ov-img-wrap">
                      <img src="${esc(ch.image)}" alt="${esc(ch.name)}" loading="lazy" onerror="this.style.display='none'"/>
                    </div>
                    <div class="ov-name">${esc(ch.name)}</div>
                    ${isSelected ? '<span class="ov-selected-tag">Sélectionné</span>' : ''}
                  </button>
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

    // Overview filled cards: swap during postgame_swap, or inspect otherwise
    container.querySelectorAll('[data-overview-filled]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-overview-filled'));
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
      const text = ROR.formatRankingAsText(game.slots, 'Puissance');
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

  ROR.openCharacterInspectModal = function openCharacterInspectModal(char, rank) {
    const esc = ROR.escapeHtml;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-panel modal-panel-sm">
        <div class="modal-header">
          <div>
            <span class="mode-tag">Rang #${rank}</span>
          </div>
          <button type="button" class="btn-icon-close" data-close>✕</button>
        </div>
        <div class="inspect-card">
          <div class="char-card-header">
            <span class="char-medium-pill">${esc(char.medium)}</span>
            <span class="char-licence-pill">${esc(char.licence)}</span>
          </div>
          <div class="char-artwork-box">
            <img class="char-artwork-img" src="${esc(char.image)}" alt="${esc(char.name)}" onerror="this.style.opacity='0.2'"/>
          </div>
          <h2 class="char-name">${esc(char.name)}</h2>
          <p class="char-desc">${esc(char.description)}</p>
          <div class="char-abilities-block">
            <div class="abilities-title">Points forts &amp; Capacités</div>
            <ul class="abilities-list">
              ${char.abilities.map((ab) => `<li>${esc(ab)}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;
    overlay.querySelector('[data-close]')?.addEventListener('click', () => overlay.remove());
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
              <img class="mini-thumb" src="${esc(c.image)}" alt="${esc(c.name)}" onerror="this.style.display='none'"/>
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
})(window);
