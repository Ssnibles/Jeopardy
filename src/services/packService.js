const fs = require('fs');
const path = require('path');
const { ROOT_DIR, PACKS_DIR, DEFAULT_GAME_PATH } = require('../config');

class PackService {
  listAvailablePacks() {
    const packs = [];
    const dirsToScan = [
      { dir: ROOT_DIR, rel: '' },
      { dir: PACKS_DIR, rel: 'packs/' }
    ];

    dirsToScan.forEach(({ dir, rel }) => {
      if (!fs.existsSync(dir)) return;
      try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          if (file.endsWith('.json') && file !== 'package.json' && file !== 'package-lock.json') {
            try {
              const content = fs.readFileSync(path.join(dir, file), 'utf8');
              const json = JSON.parse(content);
              if (json.categories || json.round1 || json.title) {
                const packPath = rel ? `${rel}${file}` : file;
                packs.push({
                  filename: packPath,
                  title: json.title || file.replace('.json', ''),
                  packData: json
                });
              }
            } catch (e) {}
          }
        });
      } catch (e) {}
    });

    return packs;
  }

  loadPackFile(packFileName) {
    if (!packFileName) return null;
    try {
      const safeName = path.normalize(packFileName).replace(/^(\.\.[\/\\])+/, '');
      const fullPath = path.join(ROOT_DIR, safeName);
      if (fs.existsSync(fullPath)) {
        return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      }
    } catch (e) {
      console.error(`Failed to load pack file ${packFileName}:`, e);
    }
    return null;
  }

  loadDefaultPack() {
    if (fs.existsSync(DEFAULT_GAME_PATH)) {
      try {
        return JSON.parse(fs.readFileSync(DEFAULT_GAME_PATH, 'utf8'));
      } catch (e) {}
    }
    return null;
  }

  buildDualRoundPack(pack1, pack2) {
    if (!pack1 && !pack2) return null;
    if (pack1 && !pack2) return pack1;
    if (!pack1 && pack2) return pack2;

    const r1Cats = pack1.categories || (pack1.round1 ? pack1.round1.categories : []);
    const r2CatsRaw = pack2.categories || (pack2.round2 ? pack2.round2.categories : (pack2.round1 ? pack2.round1.categories : []));

    const r2Cats = r2CatsRaw.map(cat => ({
      name: cat.name,
      clues: (cat.clues || []).map((c, i) => ({
        ...c,
        value: (i + 1) * 400
      }))
    }));

    const hasFJ2 = pack2.finalJeopardy && (pack2.finalJeopardy.clue || pack2.finalJeopardy.category);
    const hasFJ1 = pack1.finalJeopardy && (pack1.finalJeopardy.clue || pack1.finalJeopardy.category);
    const fj = hasFJ2 ? pack2.finalJeopardy : (hasFJ1 ? pack1.finalJeopardy : (pack2.finalJeopardy || pack1.finalJeopardy || null));

    return {
      title: `${pack1.title || 'Round 1'} / ${pack2.title || 'Round 2'}`,
      round1: {
        title: pack1.round1 ? (pack1.round1.title || 'Jeopardy! Round') : 'Jeopardy! Round',
        categories: r1Cats
      },
      round2: {
        title: pack2.round2 ? (pack2.round2.title || 'Double Jeopardy! Round') : 'Double Jeopardy! Round',
        categories: r2Cats
      },
      finalJeopardy: fj
    };
  }

  resolvePack(pack1, pack2, gameMode = 'STANDARD') {
    let finalPack = null;
    if (pack1 && pack2 && gameMode === 'STANDARD') {
      finalPack = this.buildDualRoundPack(pack1, pack2);
    } else {
      finalPack = pack1 || pack2;
    }
    if (!finalPack) {
      finalPack = this.loadDefaultPack();
    }
    return finalPack;
  }

  getActiveCategories(gamePack, currentRound = 'JEOPARDY') {
    if (!gamePack) return [];
    const pack = gamePack.gamePack || gamePack;

    const r1 = (Array.isArray(pack.categories) && pack.categories.length > 0)
      ? pack.categories
      : (pack.round1 && Array.isArray(pack.round1.categories) ? pack.round1.categories : (pack.round && Array.isArray(pack.round.categories) ? pack.round.categories : []));

    const r2 = (pack.round2 && Array.isArray(pack.round2.categories) && pack.round2.categories.length > 0)
      ? pack.round2.categories
      : null;

    if (currentRound === 'DOUBLE_JEOPARDY') {
      if (r2) return r2;
      return r1.map((cat) => ({
        name: cat.name,
        clues: (cat.clues || []).map((c, i) => ({
          ...c,
          value: (i + 1) * 400
        }))
      }));
    }

    return r1;
  }
}

module.exports = new PackService();
