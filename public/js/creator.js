// Custom Question Creator Logic
document.addEventListener('DOMContentLoaded', () => {

  // Default Starter Trivia Pack Template
  const SAMPLE_STARTER_PACK = {
    title: 'Custom Trivia Showdown',
    author: 'Quiz Master',
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
          { value: 600, clue: 'What color pill does Neo take in The Matrix to learn the truth?', answer: 'Red Pill', image: '', dailyDouble: false },
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
  };

  let pack = JSON.parse(JSON.stringify(SAMPLE_STARTER_PACK));
  let activeCatIndex = null;
  let activeClueIndex = null;
  let currentImageUrl = '';

  // Elements
  const grid = document.getElementById('creatorCategoriesGrid');
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

  // Metadata Input Listeners
  packTitle.oninput = () => {
    pack.title = packTitle.value.trim() || 'My Custom Jeopardy Pack';
    persistPack();
  };
  packAuthor.oninput = () => {
    pack.author = packAuthor.value.trim() || 'Quiz Master';
    persistPack();
  };

  function persistPack() {
    sessionStorage.setItem('jeopardy_pack', JSON.stringify(pack));
    updatePackHealthStats();
  }

  // Update Pack Health & Completion Bar
  function updatePackHealthStats() {
    let totalClues = 0;
    let filledClues = 0;
    let dailyDoubles = 0;
    let imagesCount = 0;

    if (pack && pack.categories && Array.isArray(pack.categories)) {
      pack.categories.forEach(cat => {
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

    const pct = totalClues > 0 ? Math.round((filledClues / totalClues) * 100) : 0;
    if (packProgressPercent) packProgressPercent.innerText = `${pct}% Completed`;
    if (packHealthBarFill) packHealthBarFill.style.width = `${pct}%`;
    if (badgeFilledClues) badgeFilledClues.innerText = `${filledClues} / ${totalClues} Clues Filled`;
    if (badgeDailyDoubles) badgeDailyDoubles.innerText = `${dailyDoubles} Daily Doubles`;
    if (badgeImages) badgeImages.innerText = `${imagesCount} Images Attached`;
  }

  function createEmptyCategory(name) {
    const values = [200, 400, 600, 800, 1000];
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
    pack.categories = [
      createEmptyCategory('Category 1'),
      createEmptyCategory('Category 2'),
      createEmptyCategory('Category 3'),
      createEmptyCategory('Category 4'),
      createEmptyCategory('Category 5')
    ];
    persistPack();
    renderGrid();
  }

  // Render Category Board Grid UI
  function renderGrid() {
    grid.innerHTML = '';

    pack.categories.forEach((cat, catIdx) => {
      const col = document.createElement('div');
      col.className = 'board-column';

      // Category Header Box & Action Controls
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

      // Category Actions: Move Left, Move Right, Delete
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
      rightBtn.disabled = catIdx === pack.categories.length - 1;
      rightBtn.onclick = () => moveCategory(catIdx, 1);

      const delBtn = document.createElement('button');
      delBtn.className = 'cat-action-btn danger';
      delBtn.innerText = 'Delete';
      delBtn.disabled = pack.categories.length <= 1;
      delBtn.onclick = () => {
        if (confirm(`Delete category "${cat.name}"?`)) {
          pack.categories.splice(catIdx, 1);
          persistPack();
          renderGrid();
        }
      };

      actionsDiv.appendChild(leftBtn);
      actionsDiv.appendChild(delBtn);
      actionsDiv.appendChild(rightBtn);
      headerDiv.appendChild(actionsDiv);

      col.appendChild(headerDiv);

      // Render Clue Cards
      cat.clues.forEach((clueObj, clueIdx) => {
        const card = document.createElement('div');
        card.className = 'creator-clue-card';

        const valSpan = document.createElement('span');
        valSpan.style.fontWeight = '800';
        valSpan.style.fontSize = '1.15rem';
        valSpan.style.color = 'var(--jeopardy-gold)';
        valSpan.innerText = `$${clueObj.value}`;
        card.appendChild(valSpan);

        const statusSpan = document.createElement('span');
        const isFilled = clueObj.clue || clueObj.image;
        statusSpan.className = `creator-status-pill ${isFilled ? 'filled' : 'empty'}`;

        const icons = [];
        if (clueObj.clue) icons.push('Text');
        if (clueObj.image) icons.push('Img');
        if (clueObj.dailyDouble) icons.push('DD');

        statusSpan.innerText = icons.length ? icons.join(' • ') : '+ Edit Clue';
        card.appendChild(statusSpan);

        card.onclick = () => openClueEditor(catIdx, clueIdx);
        col.appendChild(card);
      });

      grid.appendChild(col);
    });

    updatePackHealthStats();
  }

  // Move Category Position
  function moveCategory(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= pack.categories.length) return;
    const temp = pack.categories[index];
    pack.categories[index] = pack.categories[targetIndex];
    pack.categories[targetIndex] = temp;
    persistPack();
    renderGrid();
  }

  // Image Source Mode Toggle
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

  // Update Live TV Preview Box inside Modal
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

  // Open Clue Editor Modal
  function openClueEditor(catIdx, clueIdx) {
    activeCatIndex = catIdx;
    activeClueIndex = clueIdx;
    const clueObj = pack.categories[catIdx].clues[clueIdx];

    document.getElementById('modalTitle').innerText = `Edit ${pack.categories[catIdx].name || 'Category'} - $${clueObj.value}`;
    clueText.value = clueObj.clue || '';
    clueAnswer.value = clueObj.answer || '';
    clueValue.value = clueObj.value;
    clueDailyDouble.checked = !!clueObj.dailyDouble;
    if (lblDailyDouble) lblDailyDouble.classList.toggle('active', clueDailyDouble.checked);

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

  // Image Processing in Memory (Base64)
  function processImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 1200;
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
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            const compressedDataUrl = canvas.toDataURL(mimeType, 0.85);
            resolve(compressedDataUrl);
          } else {
            resolve(e.target.result);
          }
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  imageFileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    uploadStatus.innerText = 'Processing image...';
    try {
      const dataUrl = await processImageFile(file);
      currentImageUrl = dataUrl;
      uploadStatus.innerText = 'Image attached!';
      updateImagePreview();
    } catch (err) {
      uploadStatus.innerText = 'Load error: ' + err.message;
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

  // Save Clue Handler
  clueForm.onsubmit = async (e) => {
    e.preventDefault();
    if (activeCatIndex === null || activeClueIndex === null) return;

    if (btnSaveClue) {
      btnSaveClue.disabled = true;
      btnSaveClue.innerText = 'Saving...';
    }

    const isUrlMode = btnSourceUrl && btnSourceUrl.classList.contains('active');
    if (isUrlMode && imageUrlInput.value.trim()) {
      currentImageUrl = imageUrlInput.value.trim();
    } else if (!isUrlMode && imageFileInput.files[0] && !currentImageUrl) {
      try {
        currentImageUrl = await processImageFile(imageFileInput.files[0]);
      } catch (err) {
        console.error('Image load error:', err);
      }
    }

    const targetClue = pack.categories[activeCatIndex].clues[activeClueIndex];
    targetClue.clue = clueText.value.trim();
    targetClue.answer = clueAnswer.value.trim();
    targetClue.value = parseInt(clueValue.value, 10) || 200;
    targetClue.dailyDouble = clueDailyDouble.checked;
    targetClue.image = currentImageUrl;

    persistPack();
    renderGrid();
    closeModal();

    if (btnSaveClue) {
      btnSaveClue.disabled = false;
      btnSaveClue.innerText = 'Save Clue (Ctrl+Enter)';
    }
  };

  function saveCurrentClueDraft() {
    if (activeCatIndex === null || activeClueIndex === null) return;
    const targetClue = pack.categories[activeCatIndex].clues[activeClueIndex];
    targetClue.clue = clueText.value.trim();
    targetClue.answer = clueAnswer.value.trim();
    targetClue.value = parseInt(clueValue.value, 10) || 200;
    targetClue.dailyDouble = clueDailyDouble.checked;
    targetClue.image = currentImageUrl;
    persistPack();
  }

  // Keyboard Shortcuts (Ctrl+Enter save, Esc cancel)
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
      let nextClueIdx = activeClueIndex - 1;
      let nextCatIdx = activeCatIndex;
      if (nextClueIdx < 0) {
        nextCatIdx = activeCatIndex - 1;
        if (nextCatIdx < 0) nextCatIdx = pack.categories.length - 1;
        nextClueIdx = pack.categories[nextCatIdx].clues.length - 1;
      }
      openClueEditor(nextCatIdx, nextClueIdx);
    };
  }

  if (btnNextClue) {
    btnNextClue.onclick = () => {
      if (activeCatIndex === null || activeClueIndex === null) return;
      saveCurrentClueDraft();
      let nextClueIdx = activeClueIndex + 1;
      let nextCatIdx = activeCatIndex;
      if (nextCatIdx < pack.categories.length && nextClueIdx >= pack.categories[nextCatIdx].clues.length) {
        nextClueIdx = 0;
        nextCatIdx = (activeCatIndex + 1) % pack.categories.length;
      }
      openClueEditor(nextCatIdx, nextClueIdx);
    };
  }

  btnCloseModal.onclick = closeModal;
  btnCancelModal.onclick = closeModal;

  // Add Category
  btnAddCategory.onclick = () => {
    if (pack.categories.length >= 6) {
      return alert('Maximum 6 categories per game board.');
    }
    pack.categories.push(createEmptyCategory(`Category ${pack.categories.length + 1}`));
    persistPack();
    renderGrid();
  };

  // Pre-Fill Starter Sample Pack Template
  if (btnPrefillSample) {
    btnPrefillSample.onclick = () => {
      if (confirm('Load starter sample pack template into editor? Current edits will be overwritten.')) {
        pack = JSON.parse(JSON.stringify(SAMPLE_STARTER_PACK));
        packTitle.value = pack.title;
        packAuthor.value = pack.author;
        persistPack();
        renderGrid();
      }
    };
  }

  // Reset Board to Empty
  btnResetPack.onclick = () => {
    if (confirm('Are you sure you want to reset all categories and clues?')) {
      initDefaultEmptyPack();
    }
  };

  // Launch Game Room Directly from Creator
  if (btnLaunchRoom) {
    btnLaunchRoom.onclick = () => {
      pack.title = packTitle.value.trim() || 'My Custom Jeopardy Pack';
      pack.author = packAuthor.value.trim() || 'Quiz Master';
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

  // Export JSON Pack
  btnExport.onclick = () => {
    pack.title = packTitle.value.trim() || 'My Custom Jeopardy Pack';
    pack.author = packAuthor.value.trim() || 'Quiz Master';
    persistPack();

    const jsonStr = JSON.stringify(pack, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${pack.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_pack.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON Pack
  importFile.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported && imported.categories && Array.isArray(imported.categories)) {
          pack = imported;
          packTitle.value = pack.title || 'Imported Pack';
          packAuthor.value = pack.author || 'Unknown';
          persistPack();
          renderGrid();
          alert('Jeopardy Pack imported successfully!');
        } else {
          alert('Invalid Jeopardy Pack JSON structure.');
        }
      } catch (err) {
        alert('Failed to parse JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Initialize Pack from Session Storage or Starter Template
  const storedPack = sessionStorage.getItem('jeopardy_pack');
  if (storedPack) {
    try {
      const parsed = JSON.parse(storedPack);
      if (parsed && parsed.categories && Array.isArray(parsed.categories)) {
        pack = parsed;
        packTitle.value = pack.title || 'Custom Trivia Showdown';
        packAuthor.value = pack.author || 'Quiz Master';
        renderGrid();
      } else {
        renderGrid();
      }
    } catch(e) { renderGrid(); }
  } else {
    renderGrid();
  }
});
