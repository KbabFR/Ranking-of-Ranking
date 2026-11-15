(function (global) {
  'use strict';

  const ROR = (global.ROR = global.ROR || {});

  ROR.navigateTo = function navigateTo(screen) {
    ROR.AppState.screen = screen;
    ROR.renderCurrentScreen();
    global.scrollTo({ top: 0, behavior: 'instant' });
  };

  ROR.startNewGame = function startNewGame() {
    const { mode, setup, characters } = ROR.AppState;
    try {
      ROR.AppState.game = ROR.createGameState({
        mode,
        targetCount: setup.targetCount,
        maxSwaps: setup.maxSwaps,
        selectedLicences: setup.selectedLicences,
        characters
      });
      ROR.navigateTo('game');
    } catch (err) {
      global.alert(err.message || 'Impossible de démarrer la partie.');
    }
  };

  ROR.renderCurrentScreen = function renderCurrentScreen() {
    const app = document.getElementById('app');
    if (!app) return;
    const { screen } = ROR.AppState;
    if (screen === 'setup') {
      ROR.renderSetupScreen(app);
    } else if (screen === 'game') {
      ROR.renderGameScreen(app);
    } else if (screen === 'generator') {
      ROR.renderGeneratorScreen(app);
    } else {
      ROR.renderHomeScreen(app);
    }
  };

  async function init() {
    const baseCharacters = await ROR.loadCharacterDatabase();
    const customCharacters = ROR.loadCustomCharacters();
    ROR.AppState.baseCharacters = baseCharacters;
    ROR.AppState.customCharacters = customCharacters;
    ROR.refreshAllCharacters();
    ROR.AppState.setup.selectedLicences = new Set(ROR.AppState.characters.map((c) => c.licence));
    ROR.renderCurrentScreen();
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
