// Custom Question Creator Logic
document.addEventListener('DOMContentLoaded', () => {

  // Default Starter Trivia Pack Template with Round 1 and Round 2
  const SAMPLE_STARTER_PACK = {
    title: 'Custom Trivia Showdown',
    author: 'Quiz Master',
    round1: {
      title: 'Jeopardy! Round',
      categories: [
        {
          name: 'Science & Tech',
          clues: [
            { value: 200, clue: 'This programming language named after a coffee bean was developed at Sun Microsystems.', answer: 'Java', image: '', dailyDouble: false },
            { value: 400, clue: 'What is the chemical symbol for Gold on the periodic table?', answer: 'Au', image: '', dailyDouble: false },
            { value: 600, clue: 'This tech giant introduced the revolutionary iPhone in 2007.', answer: 'Apple', image: '', dailyDouble: false },
            { value: 800, clue: 'Which space telescope launched in 2021 as Hubble\'s successor?', answer: 'James Webb Space Telescope', image: '', dailyDouble: true },
            { value: 1000, clue: 'What physical constant approximately equal to 3x10^8 m/s is denoted by c?', answer: 'Speed of light', image: '', dailyDouble: false }
          ]
        },
        {
          name: 'World History',
          clues: [
            { value: 200, clue: 'Which ancient civilization built the Great Pyramids at Giza along the Nile?', answer: 'Ancient Egypt', image: '', dailyDouble: false },
            { value: 400, clue: 'Who was the Macedonian king who created a vast empire by age 30?', answer: 'Alexander the Great', image: '', dailyDouble: false },
            { value: 600, clue: 'What Roman general was assassinated on the Ides of March in 44 BC?', answer: 'Julius Caesar', image: '', dailyDouble: false },
            { value: 800, clue: 'In what 1815 battle was Napoleon Bonaparte finally defeated?', answer: 'Battle of Waterloo', image: '', dailyDouble: false },
            { value: 1000, clue: 'Which empire ruled from Constantinople after Western Rome fell?', answer: 'Byzantine Empire', image: '', dailyDouble: false }
          ]
        },
        {
          name: 'Pop Culture',
          clues: [
            { value: 200, clue: 'In the MCU, what is the name of Thor\'s home realm?', answer: 'Asgard', image: '', dailyDouble: false },
            { value: 400, clue: 'Which movie won Best Picture in 2020, becoming the first non-English film to win?', answer: 'Parasite', image: '', dailyDouble: false },
            { value: 600, clue: 'What colour pill does Neo take in The Matrix to learn the truth?', answer: 'Red Pill', image: '', dailyDouble: false },
            { value: 800, clue: 'Who directed Interstellar, Inception, and Oppenheimer?', answer: 'Christopher Nolan', image: '', dailyDouble: false },
            { value: 1000, clue: 'What pop superstar earned the title King of Pop with Thriller?', answer: 'Michael Jackson', image: '', dailyDouble: false }
          ]
        },
        {
          name: 'Geography',
          clues: [
            { value: 200, clue: 'What is the capital city of Japan?', answer: 'Tokyo', image: '', dailyDouble: false },
            { value: 400, clue: 'Which iron landmark built in 1889 dominates the skyline of Paris?', answer: 'Eiffel Tower', image: '', dailyDouble: false },
            { value: 600, clue: 'What is the longest river in South America by water volume?', answer: 'Amazon River', image: '', dailyDouble: false },
            { value: 800, clue: 'What mountain range contains Mount Everest?', answer: 'Himalayas', image: '', dailyDouble: false },
            { value: 1000, clue: 'What is the capital city of Australia?', answer: 'Canberra', image: '', dailyDouble: false }
          ]
        },
        {
          name: 'Gaming',
          clues: [
            { value: 200, clue: 'What blue-overalled plumber is Nintendo\'s flagship mascot?', answer: 'Mario', image: '', dailyDouble: false },
            { value: 400, clue: 'What sandbox game created by Notch became the best-selling game of all time?', answer: 'Minecraft', image: '', dailyDouble: false },
            { value: 600, clue: 'In The Legend of Zelda, what is the name of the main hero in green?', answer: 'Link', image: '', dailyDouble: false },
            { value: 800, clue: 'What fighting game franchise introduced Ryu and the Hadoken?', answer: 'Street Fighter', image: '', dailyDouble: true },
            { value: 1000, clue: 'What year was the original Sony PlayStation released in Japan?', answer: '1994', image: '', dailyDouble: false }
          ]
        }
      ]
    },
    round2: {
      title: 'Double Jeopardy! Round',
      categories: [
        {
          name: 'Advanced Science',
          clues: [
            { value: 400, clue: 'What subatomic particle with a negative charge orbits the atomic nucleus?', answer: 'Electron', image: '', dailyDouble: false },
            { value: 800, clue: 'Which organelle is often referred to as the powerhouse of the eukaryotic cell?', answer: 'Mitochondria', image: '', dailyDouble: true },
            { value: 1200, clue: 'What law of thermodynamics states that entropy of an isolated system always increases over time?', answer: 'Second Law of Thermodynamics', image: '', dailyDouble: false },
            { value: 1600, clue: 'What element is named after the physicist who developed relativity?', answer: 'Einsteinium', image: '', dailyDouble: false },
            { value: 2000, clue: 'What quantum phenomenon describes two particles remaining inextricably linked regardless of distance?', answer: 'Quantum Entanglement', image: '', dailyDouble: false }
          ]
        },
        {
          name: 'Global History',
          clues: [
            { value: 400, clue: 'Which French military commander declared himself Emperor of the French in 1804?', answer: 'Napoleon Bonaparte', image: '', dailyDouble: false },
            { value: 800, clue: 'In what year did the Berlin Wall fall?', answer: '1989', image: '', dailyDouble: false },
            { value: 1200, clue: 'Which ancient Mesopotamian ruler created one of the earliest written legal codes?', answer: 'Hammurabi', image: '', dailyDouble: false },
            { value: 1600, clue: 'What treaty signed in 1919 officially ended World War I?', answer: 'Treaty of Versailles', image: '', dailyDouble: true },
            { value: 2000, clue: 'Which West African empire was ruled by Mansa Musa?', answer: 'Mali Empire', image: '', dailyDouble: false }
          ]
        },
        {
          name: 'Literature & Myths',
          clues: [
            { value: 400, clue: 'Who wrote the classic play Romeo and Juliet?', answer: 'William Shakespeare', image: '', dailyDouble: false },
            { value: 800, clue: 'In Greek mythology, who was the god of the sea wielding a trident?', answer: 'Poseidon', image: '', dailyDouble: false },
            { value: 1200, clue: 'What 1851 novel by Herman Melville begins with Call me Ishmael?', answer: 'Moby-Dick', image: '', dailyDouble: false },
            { value: 1600, clue: 'What dystopian novel by George Orwell introduced Big Brother?', answer: '1984', image: '', dailyDouble: false },
            { value: 2000, clue: 'Which epic Sanskrit poem details the struggle between the Kauravas and Pandavas?', answer: 'Mahabharata', image: '', dailyDouble: false }
          ]
        },
        {
          name: 'World Capitals',
          clues: [
            { value: 400, clue: 'What is the capital city of Canada?', answer: 'Ottawa', image: '', dailyDouble: false },
            { value: 800, clue: 'What high-altitude South American capital sits over 3,600 metres above sea level?', answer: 'La Paz / Sucre', image: '', dailyDouble: false },
            { value: 1200, clue: 'What capital city of Iceland is the northernmost capital of a sovereign nation?', answer: 'Reykjavik', image: '', dailyDouble: false },
            { value: 1600, clue: 'What is the capital city of Kenya?', answer: 'Nairobi', image: '', dailyDouble: false },
            { value: 2000, clue: 'What capital city on the Danube River was formed by combining two historic towns in 1873?', answer: 'Budapest', image: '', dailyDouble: false }
          ]
        },
        {
          name: 'Music & Arts',
          clues: [
            { value: 400, clue: 'Which German composer wrote the 9th Symphony after becoming deaf?', answer: 'Ludwig van Beethoven', image: '', dailyDouble: false },
            { value: 800, clue: 'Which Dutch post-impressionist painter created The Starry Night?', answer: 'Vincent van Gogh', image: '', dailyDouble: false },
            { value: 1200, clue: 'What famous opera by Georges Bizet features the Habanera aria?', answer: 'Carmen', image: '', dailyDouble: false },
            { value: 1600, clue: 'Which Spanish artist co-founded the Cubist movement alongside Georges Braque?', answer: 'Pablo Picasso', image: '', dailyDouble: false },
            { value: 2000, clue: 'What Italian Renaissance polymath painted The Last Supper and Mona Lisa?', answer: 'Leonardo da Vinci', image: '', dailyDouble: false }
          ]
        }
      ]
    },
    finalJeopardy: {
      category: 'World History & Explorers',
      clue: 'This Portuguese explorer was the first European to reach India by sea, opening the Cape Route in 1498.',
      answer: 'Vasco da Gama'
    }
  };

  let pack = JSON.parse(JSON.stringify(SAMPLE_STARTER_PACK));
  let activeRound = 'round1'; // 'round1' | 'round2' | 'final'
  let activeCatIndex = null;
  let activeClueIndex = null;
  let currentImageUrl = '';

  function ensurePackStructure(p) {
    if (!p) return JSON.parse(JSON.stringify(SAMPLE_STARTER_PACK));
    if (!p.round1 && p.round) {
      p.round1 = p.round;
    }
    if (!p.round1) {
      p.round1 = {
        title: 'Jeopardy! Round',
        categories: p.categories ? JSON.parse(JSON.stringify(p.categories)) : JSON.parse(JSON.stringify(SAMPLE_STARTER_PACK.round1.categories))
      };
    }
    if (!p.round2) {
      p.round2 = {
        title: 'Double Jeopardy! Round',
        categories: JSON.parse(JSON.stringify(SAMPLE_STARTER_PACK.round2.categories))
      };
    }
    if (!p.finalJeopardy) {
      p.finalJeopardy = {
        category: 'World History & Explorers',
        clue: 'This Portuguese explorer was the first European to reach India by sea, opening the Cape Route in 1498.',
        answer: 'Vasco da Gama'
      };
    }
    p.categories = p.round1.categories; // Maintain backwards compatibility for legacy endpoints
    return p;
  }

  pack = ensurePackStructure(pack);

  // Elements
  const grid = document.getElementById('creatorCategoriesGrid');
  const creatorFinalArea = document.getElementById('creatorFinalArea');
  const fjCategory = document.getElementById('fjCategory');
  const fjClue = document.getElementById('fjClue');
  const fjAnswer = document.getElementById('fjAnswer');
  const currentRoundBadge = document.getElementById('currentRoundBadge');

  const tabRound1 = document.getElementById('tabRound1');
  const tabRound2 = document.getElementById('tabRound2');
  const tabFinal = document.getElementById('tabFinal');

  const packTitle = document.getElementById('packTitle');
  const packAuthor = document.getElementById('packAuthor');
  const btnExport = document.getElementById('btnExport');
  const importFile = document.getElementById('importFile');
  const btnAddCategory = document.getElementById('btnAddCategory');
  const btnResetPack = document.getElementById('btnResetPack');
  const btnPrefillSample = document.getElementById('btnPrefillSample');
  const btnLaunchRoom = document.getElementById('btnLaunchRoom');

  // Health Stats Bar elements
  const packProgressPercent = document.getElementById('packProgressPercent');
  const packHealthBarFill = document.getElementById('packHealthBarFill');
  const badgeFilledClues = document.getElementById('badgeFilledClues');
  const badgeDailyDoubles = document.getElementById('badgeDailyDoubles');
  const badgeImages = document.getElementById('badgeImages');

  // Modal elements
  const modal = document.getElementById('clueEditorModal');
  const clueForm = document.getElementById('clueForm');
  const clueText = document.getElementById('clueText');
  const clueAnswer = document.getElementById('clueAnswer');
  const clueValue = document.getElementById('clueValue');
  const clueDailyDouble = document.getElementById('clueDailyDouble');
  const lblDailyDouble = document.getElementById('lblDailyDouble');
  const btnSourceUpload = document.getElementById('btnSourceUpload');
  const btnSourceUrl = document.getElementById('btnSourceUrl');
  const uploadInputGroup = document.getElementById('uploadInputGroup');
  const urlInputGroup = document.getElementById('urlInputGroup');
  const imageFileInput = document.getElementById('imageFileInput');
  const imageUrlInput = document.getElementById('imageUrlInput');
  const uploadStatus = document.getElementById('uploadStatus');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreview = document.getElementById('imagePreview');
  const btnRemoveImage = document.getElementById('btnRemoveImage');
  const previewTvClueText = document.getElementById('previewTvClueText');
  const previewTvAnswerText = document.getElementById('previewTvAnswerText');

  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const btnSaveClue = document.getElementById('btnSaveClue');
  const btnPrevClue = document.getElementById('btnPrevClue');
  const btnNextClue = document.getElementById('btnNextClue');

  // Tab Handlers
  if (tabRound1 && tabRound2 && tabFinal) {
    tabRound1.onclick = () => switchRoundTab('round1');
    tabRound2.onclick = () => switchRoundTab('round2');
    tabFinal.onclick = () => switchRoundTab('final');
  }

  function switchRoundTab(roundName) {
    activeRound = roundName;
    tabRound1.classList.toggle('btn-gold', roundName === 'round1');
    tabRound1.classList.toggle('active', roundName === 'round1');
    tabRound2.classList.toggle('btn-gold', roundName === 'round2');
    tabRound2.classList.toggle('active', roundName === 'round2');
    tabFinal.classList.toggle('btn-gold', roundName === 'final');
    tabFinal.classList.toggle('active', roundName === 'final');

    if (roundName === 'round1') {
      if (typeof currentRoundBadge !== 'undefined' && currentRoundBadge) currentRoundBadge.innerText = 'Editing: Round 1 (Jeopardy!)';
      grid.classList.remove('display-none');
      grid.style.display = 'flex';
      creatorFinalArea.classList.add('display-none');
      creatorFinalArea.style.display = 'none';
      if (btnAddCategory) btnAddCategory.style.display = 'inline-block';
      renderGrid();
    } else if (roundName === 'round2') {
      if (typeof currentRoundBadge !== 'undefined' && currentRoundBadge) currentRoundBadge.innerText = 'Editing: Round 2 (Double Jeopardy!)';
      grid.classList.remove('display-none');
      grid.style.display = 'flex';
      creatorFinalArea.classList.add('display-none');
      creatorFinalArea.style.display = 'none';
      if (btnAddCategory) btnAddCategory.style.display = 'inline-block';
      renderGrid();
    } else {
      if (typeof currentRoundBadge !== 'undefined' && currentRoundBadge) currentRoundBadge.innerText = 'Editing: Final Jeopardy!';
      grid.classList.add('display-none');
      grid.style.display = 'none';
      creatorFinalArea.classList.remove('display-none');
      creatorFinalArea.style.display = 'block';
      if (btnAddCategory) btnAddCategory.style.display = 'none';
      renderFinalEditor();
    }
  }

  const previewFjCategory = document.getElementById('previewFjCategory');
  const previewFjClueText = document.getElementById('previewFjClueText');
  const previewFjAnswerText = document.getElementById('previewFjAnswerText');
  const fjTileStatusBadge = document.getElementById('fjTileStatusBadge');

  function renderFinalEditor() {
    if (!pack || !pack.finalJeopardy) return;
    fjCategory.value = pack.finalJeopardy.category || '';
    fjClue.value = pack.finalJeopardy.clue || '';
    fjAnswer.value = pack.finalJeopardy.answer || '';
    updateFinalPreview();
  }

  function updateFinalPreview() {
    if (!pack || !pack.finalJeopardy) return;
    const cat = pack.finalJeopardy.category || '';
    const clue = pack.finalJeopardy.clue || '';
    const ans = pack.finalJeopardy.answer || '';

    if (previewFjCategory) previewFjCategory.innerText = `CATEGORY: ${cat ? cat.toUpperCase() : '(UNSET)'}`;
    if (previewFjClueText) previewFjClueText.innerText = clue || '(Final Jeopardy clue text will appear here...)';
    if (previewFjAnswerText) previewFjAnswerText.innerText = ans ? `A: ${ans}` : 'A: (Expected answer will appear here...)';

    const isComplete = cat && clue && ans;
    if (fjTileStatusBadge) {
      fjTileStatusBadge.className = `creator-status-pill ${isComplete ? 'filled' : 'empty'}`;
      fjTileStatusBadge.innerText = isComplete ? '✓ Tile Ready' : 'Incomplete';
    }
  }

  if (fjCategory) {
    fjCategory.oninput = () => {
      if (!pack.finalJeopardy) pack.finalJeopardy = {};
      pack.finalJeopardy.category = fjCategory.value.trim();
      updateFinalPreview();
      persistPack();
    };
  }
  if (fjClue) {
    fjClue.oninput = () => {
      if (!pack.finalJeopardy) pack.finalJeopardy = {};
      pack.finalJeopardy.clue = fjClue.value.trim();
      updateFinalPreview();
      persistPack();
    };
  }
  if (fjAnswer) {
    fjAnswer.oninput = () => {
      if (!pack.finalJeopardy) pack.finalJeopardy = {};
      pack.finalJeopardy.answer = fjAnswer.value.trim();
      updateFinalPreview();
      persistPack();
    };
  }

  // Metadata Input Listeners
  if (packTitle) {
    packTitle.oninput = () => {
      pack.title = packTitle.value.trim() || 'My Custom Jeopardy Pack';
      persistPack();
    };
  }
  if (packAuthor) {
    packAuthor.oninput = () => {
      pack.author = packAuthor.value.trim() || 'Quiz Master';
      persistPack();
    };
  }

  function persistPack() {
    try {
      pack.categories = pack.round1 ? pack.round1.categories : [];
      sessionStorage.setItem('jeopardy_pack', JSON.stringify(pack));
    } catch (e) {
      console.warn('Could not save pack state to sessionStorage:', e.message);
    }
    updatePackHealthStats();
  }

  // Update Pack Health & Completion Bar
  function updatePackHealthStats() {
    let totalClues = 0;
    let filledClues = 0;
    let dailyDoubles = 0;
    let imagesCount = 0;

    const countRound = (rObj) => {
      if (rObj && rObj.categories && Array.isArray(rObj.categories)) {
        rObj.categories.forEach(cat => {
          if (cat.clues && Array.isArray(cat.clues)) {
            cat.clues.forEach(clue => {
              totalClues++;
              if (clue.clue || clue.image) filledClues++;
              if (clue.dailyDouble) dailyDoubles++;
              if (clue.image) imagesCount++;
            });
          }
        });
      }
    };

    countRound(pack.round1);
    countRound(pack.round2);

    const pct = totalClues > 0 ? Math.round((filledClues / totalClues) * 100) : 0;
    if (packProgressPercent) packProgressPercent.innerText = `${pct}% Completed`;
    if (packHealthBarFill) packHealthBarFill.style.width = `${pct}%`;
    if (badgeFilledClues) badgeFilledClues.innerText = `${filledClues} / ${totalClues} Clues Filled`;
    if (badgeDailyDoubles) badgeDailyDoubles.innerText = `${dailyDoubles} Daily Doubles`;
    if (badgeImages) badgeImages.innerText = `${imagesCount} Images Attached`;
  }

  function createEmptyCategory(name, isRound2 = false) {
    const values = isRound2 ? [400, 800, 1200, 1600, 2000] : [200, 400, 600, 800, 1000];
    return {
      name: name,
      clues: values.map(v => ({
        value: v,
        clue: '',
        answer: '',
        image: '',
        dailyDouble: false
      }))
    };
  }

  function initDefaultEmptyPack() {
    pack = JSON.parse(JSON.stringify(SAMPLE_STARTER_PACK));
    pack.round1.categories = [
      createEmptyCategory('Category 1', false),
      createEmptyCategory('Category 2', false),
      createEmptyCategory('Category 3', false),
      createEmptyCategory('Category 4', false),
      createEmptyCategory('Category 5', false)
    ];
    pack.round2.categories = [
      createEmptyCategory('Category 1', true),
      createEmptyCategory('Category 2', true),
      createEmptyCategory('Category 3', true),
      createEmptyCategory('Category 4', true),
      createEmptyCategory('Category 5', true)
    ];
    persistPack();
    switchRoundTab(activeRound);
  }

  // Render Category Board Grid UI for Active Round
  function renderGrid() {
    grid.innerHTML = '';
    const currentRoundObj = activeRound === 'round2' ? pack.round2 : pack.round1;
    if (!currentRoundObj || !currentRoundObj.categories) return;

    currentRoundObj.categories.forEach((cat, catIdx) => {
      const col = document.createElement('div');
      col.className = 'board-column';

      const headerDiv = document.createElement('div');
      headerDiv.className = 'category-header';
      headerDiv.style.flexDirection = 'column';
      headerDiv.style.gap = '0.4rem';

      const catInput = document.createElement('input');
      catInput.type = 'text';
      catInput.value = cat.name;
      catInput.className = 'category-header-input form-control';
      catInput.placeholder = `Category ${catIdx + 1}`;
      catInput.oninput = (e) => {
        cat.name = e.target.value;
        persistPack();
      };
      headerDiv.appendChild(catInput);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'category-header-actions';

      const leftBtn = document.createElement('button');
      leftBtn.className = 'cat-action-btn';
      leftBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
      leftBtn.title = 'Move Category Left';
      leftBtn.disabled = catIdx === 0;
      leftBtn.onclick = () => moveCategory(catIdx, -1);

      const rightBtn = document.createElement('button');
      rightBtn.className = 'cat-action-btn';
      rightBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
      rightBtn.title = 'Move Category Right';
      rightBtn.disabled = catIdx === currentRoundObj.categories.length - 1;
      rightBtn.onclick = () => moveCategory(catIdx, 1);

      const delBtn = document.createElement('button');
      delBtn.className = 'cat-action-btn danger';
      delBtn.innerText = 'Delete';
      delBtn.disabled = currentRoundObj.categories.length <= 1;
      delBtn.onclick = () => {
        if (confirm(`Delete category "${cat.name}"?`)) {
          currentRoundObj.categories.splice(catIdx, 1);
          persistPack();
          renderGrid();
        }
      };

      actionsDiv.appendChild(leftBtn);
      actionsDiv.appendChild(delBtn);
      actionsDiv.appendChild(rightBtn);
      headerDiv.appendChild(actionsDiv);

      col.appendChild(headerDiv);

      cat.clues.forEach((clueObj, clueIdx) => {
        const card = document.createElement('div');
        card.className = clueObj.dailyDouble ? 'creator-clue-card is-daily-double' : 'creator-clue-card';

        if (clueObj.dailyDouble) {
          const ddBadge = document.createElement('span');
          ddBadge.className = 'daily-double-card-badge';
          ddBadge.innerText = 'DAILY DOUBLE';
          card.appendChild(ddBadge);
        }

        const valSpan = document.createElement('span');
        valSpan.style.fontWeight = '800';
        valSpan.style.fontSize = '1.15rem';
        valSpan.style.color = clueObj.dailyDouble ? '#ffe600' : 'var(--jeopardy-gold)';
        valSpan.innerText = `$${clueObj.value}`;
        card.appendChild(valSpan);

        const statusSpan = document.createElement('span');
        const isFilled = clueObj.clue || clueObj.image;
        statusSpan.className = `creator-status-pill ${isFilled ? 'filled' : 'empty'}`;

        const icons = [];
        if (clueObj.clue) icons.push('Text');
        if (clueObj.image) icons.push('Img');

        statusSpan.innerText = icons.length ? icons.join(' • ') : '+ Edit Clue';
        card.appendChild(statusSpan);

        card.onclick = () => openClueEditor(catIdx, clueIdx);
        col.appendChild(card);
      });

      grid.appendChild(col);
    });

    updatePackHealthStats();
  }

  function moveCategory(index, direction) {
    const currentRoundObj = activeRound === 'round2' ? pack.round2 : pack.round1;
    if (!currentRoundObj || !currentRoundObj.categories) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentRoundObj.categories.length) return;
    const temp = currentRoundObj.categories[index];
    currentRoundObj.categories[index] = currentRoundObj.categories[targetIndex];
    currentRoundObj.categories[targetIndex] = temp;
    persistPack();
    renderGrid();
  }

  function setImgSourceMode(mode) {
    if (mode === 'url') {
      if (btnSourceUrl) btnSourceUrl.classList.add('active');
      if (btnSourceUpload) btnSourceUpload.classList.remove('active');
      uploadInputGroup.style.display = 'none';
      urlInputGroup.style.display = 'block';
    } else {
      if (btnSourceUpload) btnSourceUpload.classList.add('active');
      if (btnSourceUrl) btnSourceUrl.classList.remove('active');
      uploadInputGroup.style.display = 'block';
      urlInputGroup.style.display = 'none';
    }
  }

  if (btnSourceUpload) btnSourceUpload.onclick = () => setImgSourceMode('upload');
  if (btnSourceUrl) btnSourceUrl.onclick = () => setImgSourceMode('url');

  if (clueDailyDouble && lblDailyDouble) {
    clueDailyDouble.onchange = () => {
      lblDailyDouble.classList.toggle('active', clueDailyDouble.checked);
    };
  }

  document.querySelectorAll('.preset-val-btn').forEach(btn => {
    btn.onclick = () => {
      clueValue.value = btn.getAttribute('data-val');
      updateLiveTvPreview();
    };
  });

  function updateLiveTvPreview() {
    if (previewTvClueText) {
      previewTvClueText.innerText = clueText.value.trim() || '(Clue question text will appear here...)';
    }
    if (previewTvAnswerText) {
      previewTvAnswerText.innerText = clueAnswer.value.trim() ? `A: ${clueAnswer.value.trim()}` : 'A: (Correct answer will appear here...)';
    }
  }

  clueText.oninput = updateLiveTvPreview;
  clueAnswer.oninput = updateLiveTvPreview;

  function openClueEditor(catIdx, clueIdx) {
    activeCatIndex = catIdx;
    activeClueIndex = clueIdx;
    const currentRoundObj = activeRound === 'round2' ? pack.round2 : pack.round1;
    const clueObj = currentRoundObj.categories[catIdx].clues[clueIdx];

    document.getElementById('modalTitle').innerText = `Edit ${currentRoundObj.categories[catIdx].name || 'Category'} - $${clueObj.value}`;
    clueText.value = clueObj.clue || '';
    clueAnswer.value = clueObj.answer || '';
    clueValue.value = clueObj.value;
    clueDailyDouble.checked = !!clueObj.dailyDouble;
    const presetValues = activeRound === 'round2' ? [400, 800, 1200, 1600, 2000] : [200, 400, 600, 800, 1000];
    const presetBtns = document.querySelectorAll('.preset-val-btn');
    presetBtns.forEach((btn, idx) => {
      if (presetValues[idx] !== undefined) {
        btn.setAttribute('data-val', presetValues[idx]);
        btn.innerText = `$${presetValues[idx]}`;
      }
    });

    currentImageUrl = clueObj.image || '';
    uploadStatus.innerText = '';
    imageFileInput.value = '';

    if (currentImageUrl && (currentImageUrl.startsWith('http://') || currentImageUrl.startsWith('https://'))) {
      setImgSourceMode('url');
      imageUrlInput.value = currentImageUrl;
    } else {
      setImgSourceMode('upload');
      imageUrlInput.value = '';
    }

    updateImagePreview();
    updateLiveTvPreview();
    modal.classList.add('active');
  }

  function closeModal() {
    modal.classList.remove('active');
    activeCatIndex = null;
    activeClueIndex = null;
    uploadStatus.innerText = '';
    imageFileInput.value = '';
    imageUrlInput.value = '';
  }

  const creatorImageDropzone = document.getElementById('creatorImageDropzone');

  if (creatorImageDropzone && imageFileInput) {
    creatorImageDropzone.onclick = () => imageFileInput.click();

    creatorImageDropzone.ondragover = (e) => {
      e.preventDefault();
      creatorImageDropzone.style.borderColor = 'var(--jeopardy-gold)';
    };

    creatorImageDropzone.ondragleave = () => {
      creatorImageDropzone.style.borderColor = 'var(--border-medium)';
    };

    creatorImageDropzone.ondrop = (e) => {
      e.preventDefault();
      creatorImageDropzone.style.borderColor = 'var(--border-medium)';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        imageFileInput.files = e.dataTransfer.files;
        imageFileInput.dispatchEvent(new Event('change'));
      }
    };
  }

  function processImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 800;
          let width = img.width;
          let height = img.height;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          resolve(compressedDataUrl);
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  async function uploadAndProcessImage(file) {
    if (!file) return;
    if (uploadStatus) uploadStatus.innerText = 'Processing image...';
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.url) {
          currentImageUrl = data.url;
          if (uploadStatus) uploadStatus.innerText = '✓ Image uploaded!';
          updateImagePreview();
          return;
        }
      }

      const dataUrl = await processImageFile(file);
      currentImageUrl = dataUrl;
      if (uploadStatus) uploadStatus.innerText = '✓ Image attached!';
      updateImagePreview();
    } catch (err) {
      console.warn('Server upload error, falling back to compressed local data URL:', err);
      try {
        const dataUrl = await processImageFile(file);
        currentImageUrl = dataUrl;
        if (uploadStatus) uploadStatus.innerText = '✓ Image attached!';
        updateImagePreview();
      } catch (e) {
        if (uploadStatus) uploadStatus.innerText = 'Load error: ' + e.message;
      }
    }
  }

  imageFileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await uploadAndProcessImage(file);
    }
  };

  imageUrlInput.oninput = (e) => {
    currentImageUrl = e.target.value.trim();
    updateImagePreview();
  };

  function updateImagePreview() {
    if (currentImageUrl) {
      imagePreview.src = currentImageUrl;
      imagePreviewContainer.style.display = 'block';
    } else {
      imagePreviewContainer.style.display = 'none';
      imagePreview.src = '';
    }
  }

  btnRemoveImage.onclick = () => {
    currentImageUrl = '';
    updateImagePreview();
    imageFileInput.value = '';
    imageUrlInput.value = '';
  };

  clueForm.onsubmit = async (e) => {
    e.preventDefault();
    if (activeCatIndex === null || activeClueIndex === null) return;

    if (btnSaveClue) {
      btnSaveClue.disabled = true;
      btnSaveClue.innerText = 'Saving...';
    }

    try {
      const isUrlMode = btnSourceUrl && btnSourceUrl.classList.contains('active');
      if (isUrlMode && imageUrlInput.value.trim()) {
        currentImageUrl = imageUrlInput.value.trim();
      } else if (!isUrlMode && imageFileInput.files && imageFileInput.files[0] && (!currentImageUrl || currentImageUrl.startsWith('data:'))) {
        await uploadAndProcessImage(imageFileInput.files[0]);
      }

      const currentRoundObj = activeRound === 'round2' ? pack.round2 : pack.round1;
      const targetClue = currentRoundObj.categories[activeCatIndex].clues[activeClueIndex];
      targetClue.clue = clueText.value.trim();
      targetClue.answer = clueAnswer.value.trim();
      targetClue.value = parseInt(clueValue.value, 10) || 200;
      targetClue.dailyDouble = clueDailyDouble.checked;
      targetClue.image = currentImageUrl;

      persistPack();
      renderGrid();
      closeModal();
    } catch (err) {
      console.error('Error saving clue:', err);
    } finally {
      if (btnSaveClue) {
        btnSaveClue.disabled = false;
        btnSaveClue.innerText = 'Save Clue (Ctrl+Enter)';
      }
    }
  };

  function saveCurrentClueDraft() {
    if (activeCatIndex === null || activeClueIndex === null) return;
    const currentRoundObj = activeRound === 'round2' ? pack.round2 : pack.round1;
    const targetClue = currentRoundObj.categories[activeCatIndex].clues[activeClueIndex];
    targetClue.clue = clueText.value.trim();
    targetClue.answer = clueAnswer.value.trim();
    targetClue.value = parseInt(clueValue.value, 10) || 200;
    targetClue.dailyDouble = clueDailyDouble.checked;
    targetClue.image = currentImageUrl;
    persistPack();
  }

  document.addEventListener('keydown', (e) => {
    if (modal.classList.contains('active')) {
      if (e.key === 'Escape') {
        closeModal();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        clueForm.dispatchEvent(new Event('submit'));
      }
    }
  });

  if (btnPrevClue) {
    btnPrevClue.onclick = () => {
      if (activeCatIndex === null || activeClueIndex === null) return;
      saveCurrentClueDraft();
      const currentRoundObj = activeRound === 'round2' ? pack.round2 : pack.round1;
      let nextClueIdx = activeClueIndex - 1;
      let nextCatIdx = activeCatIndex;
      if (nextClueIdx < 0) {
        nextCatIdx = activeCatIndex - 1;
        if (nextCatIdx < 0) nextCatIdx = currentRoundObj.categories.length - 1;
        nextClueIdx = currentRoundObj.categories[nextCatIdx].clues.length - 1;
      }
      openClueEditor(nextCatIdx, nextClueIdx);
    };
  }

  if (btnNextClue) {
    btnNextClue.onclick = () => {
      if (activeCatIndex === null || activeClueIndex === null) return;
      saveCurrentClueDraft();
      const currentRoundObj = activeRound === 'round2' ? pack.round2 : pack.round1;
      let nextClueIdx = activeClueIndex + 1;
      let nextCatIdx = activeCatIndex;
      if (nextCatIdx < currentRoundObj.categories.length && nextClueIdx >= currentRoundObj.categories[nextCatIdx].clues.length) {
        nextClueIdx = 0;
        nextCatIdx = (activeCatIndex + 1) % currentRoundObj.categories.length;
      }
      openClueEditor(nextCatIdx, nextClueIdx);
    };
  }

  btnCloseModal.onclick = closeModal;
  btnCancelModal.onclick = closeModal;

  btnAddCategory.onclick = () => {
    const currentRoundObj = activeRound === 'round2' ? pack.round2 : pack.round1;
    if (currentRoundObj.categories.length >= 6) {
      return alert('Maximum 6 categories per game board.');
    }
    currentRoundObj.categories.push(createEmptyCategory(`Category ${currentRoundObj.categories.length + 1}`, activeRound === 'round2'));
    persistPack();
    renderGrid();
  };

  if (btnPrefillSample) {
    btnPrefillSample.onclick = () => {
      if (confirm('Load starter sample pack template into editor? Current edits will be overwritten.')) {
        pack = JSON.parse(JSON.stringify(SAMPLE_STARTER_PACK));
        if (packTitle) packTitle.value = pack.title;
        if (packAuthor) packAuthor.value = pack.author;
        persistPack();
        switchRoundTab(activeRound);
      }
    };
  }

  btnResetPack.onclick = () => {
    if (confirm('Are you sure you want to reset all categories and clues?')) {
      initDefaultEmptyPack();
    }
  };

  if (btnLaunchRoom) {
    btnLaunchRoom.onclick = () => {
      pack.title = (packTitle ? packTitle.value.trim() : '') || 'My Custom Jeopardy Pack';
      pack.author = (packAuthor ? packAuthor.value.trim() : '') || 'Quiz Master';
      persistPack();

      btnLaunchRoom.disabled = true;
      btnLaunchRoom.innerText = 'Launching...';

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}`);

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'CREATE_ROOM',
          gamePack: pack
        }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'ROOM_CREATED') {
          sessionStorage.setItem('jeopardy_role', 'HOST');
          sessionStorage.setItem('jeopardy_room', msg.roomCode);
          sessionStorage.setItem('jeopardy_pack', JSON.stringify(pack));
          window.location.href = `/host.html?room=${msg.roomCode}`;
        }
      };

      ws.onerror = () => {
        btnLaunchRoom.disabled = false;
        btnLaunchRoom.innerText = 'Launch Room';
        alert('Failed to launch room via WebSocket connection.');
      };
    };
  }

  btnExport.onclick = () => {
    pack.title = (packTitle ? packTitle.value.trim() : '') || 'My Custom Jeopardy Pack';
    pack.author = (packAuthor ? packAuthor.value.trim() : '') || 'Quiz Master';
    persistPack();

    const exportPackObj = {
      title: pack.title,
      author: pack.author,
      categories: pack.round1 ? pack.round1.categories : (pack.categories || []),
      finalJeopardy: pack.finalJeopardy
    };

    const jsonStr = JSON.stringify(exportPackObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${pack.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_pack.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  function importPackData(imported) {
    if (!imported) return;

    const targetRound = (activeRound === 'round2') ? 'round2' : 'round1';

    // Check if the JSON is a full dual-round pack (has explicit round1 AND round2)
    if (imported.round1 && imported.round2) {
      pack.round1 = JSON.parse(JSON.stringify(imported.round1));
      pack.round2 = JSON.parse(JSON.stringify(imported.round2));
    } else {
      // Single-round pack or flat categories array
      const importedCats = imported.categories || 
                           (imported.round1 ? imported.round1.categories : 
                           (imported.round2 ? imported.round2.categories : 
                           (imported.round ? imported.round.categories : null)));

      if (importedCats && Array.isArray(importedCats)) {
        const clonedCats = JSON.parse(JSON.stringify(importedCats));
        
        // Scale clue values according to target round ($200-$1000 for Round 1, $400-$2000 for Round 2)
        const isR2 = (targetRound === 'round2');
        clonedCats.forEach(cat => {
          if (cat.clues && Array.isArray(cat.clues)) {
            cat.clues.forEach((c, idx) => {
              if (!c.value || c.value <= 0) {
                c.value = (idx + 1) * (isR2 ? 400 : 200);
              }
            });
          }
        });

        pack[targetRound] = {
          title: imported.title || (isR2 ? 'Double Jeopardy! Round' : 'Jeopardy! Round'),
          categories: clonedCats
        };
      }
    }

    // Import Final Jeopardy if specified in imported JSON
    if (imported.finalJeopardy && (imported.finalJeopardy.clue || imported.finalJeopardy.category)) {
      pack.finalJeopardy = JSON.parse(JSON.stringify(imported.finalJeopardy));
    }

    if (imported.title) pack.title = imported.title;
    if (imported.author) pack.author = imported.author;

    // Ensure all rounds and required fields exist
    pack = ensurePackStructure(pack);

    if (packTitle) packTitle.value = pack.title || '';
    if (packAuthor) packAuthor.value = pack.author || '';
    persistPack();
    switchRoundTab(activeRound);
  }

  importFile.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported) {
          importPackData(imported);
          const roundText = (activeRound === 'round2') ? 'Round 2 (Double Jeopardy!)' : 'Round 1 (Jeopardy!)';
          alert(`Jeopardy Pack imported into ${roundText} successfully!`);
        } else {
          alert('Invalid Jeopardy Pack JSON structure.');
        }
      } catch (err) {
        alert('Failed to parse JSON file: ' + err.message);
      }
      importFile.value = '';
    };
    reader.readAsText(file);
  };

  const storedPack = sessionStorage.getItem('jeopardy_pack');
  if (storedPack) {
    try {
      const parsed = JSON.parse(storedPack);
      if (parsed) {
        pack = ensurePackStructure(parsed);
        if (packTitle) packTitle.value = pack.title || 'Custom Trivia Showdown';
        if (packAuthor) packAuthor.value = pack.author || 'Quiz Master';
        switchRoundTab('round1');
      } else {
        switchRoundTab('round1');
      }
    } catch(e) { switchRoundTab('round1'); }
  } else {
    switchRoundTab('round1');
  }
});
