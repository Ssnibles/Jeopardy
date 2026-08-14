// Custom Question Creator Logic
document.addEventListener('DOMContentLoaded', () => {
  let pack = {
    title: 'My Custom Jeopardy Pack',
    author: 'Quiz Master',
    categories: []
  };

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
  const btnLaunchRoom = document.getElementById('btnLaunchRoom');

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
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const btnSaveClue = document.getElementById('btnSaveClue');
  const btnPrevClue = document.getElementById('btnPrevClue');
  const btnNextClue = document.getElementById('btnNextClue');

  // Title / Author Listeners
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
  }

  // Initialize with default categories if empty
  function initDefaultPack() {
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

  // Render Grid UI
  function renderGrid() {
    grid.innerHTML = '';

    pack.categories.forEach((cat, catIdx) => {
      const col = document.createElement('div');
      col.className = 'board-column';

      // Category Header Input
      const headerDiv = document.createElement('div');
      headerDiv.className = 'category-header';
      headerDiv.style.flexDirection = 'column';
      headerDiv.style.gap = '0.5rem';

      const catInput = document.createElement('input');
      catInput.type = 'text';
      catInput.value = cat.name;
      catInput.className = 'category-header-input form-control';
      catInput.oninput = (e) => {
        cat.name = e.target.value;
        persistPack();
      };

      headerDiv.appendChild(catInput);

      if (pack.categories.length > 1) {
        const btnDeleteCat = document.createElement('button');
        btnDeleteCat.className = 'btn btn-danger';
        btnDeleteCat.style.padding = '0.2rem 0.5rem';
        btnDeleteCat.style.fontSize = '0.75rem';
        btnDeleteCat.innerText = 'Delete';
        btnDeleteCat.onclick = () => {
          pack.categories.splice(catIdx, 1);
          persistPack();
          renderGrid();
        };
        headerDiv.appendChild(btnDeleteCat);
      }

      col.appendChild(headerDiv);

      // Clue cards
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

        statusSpan.innerText = icons.length ? icons.join(' • ') : '+ Add Clue';
        card.appendChild(statusSpan);

        card.onclick = () => openClueEditor(catIdx, clueIdx);
        col.appendChild(card);
      });

      grid.appendChild(col);
    });
  }

  // Open Clue Editor Modal
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
    };
  });

  // Open Clue Editor Modal
  function openClueEditor(catIdx, clueIdx) {
    activeCatIndex = catIdx;
    activeClueIndex = clueIdx;
    const clueObj = pack.categories[catIdx].clues[clueIdx];

    document.getElementById('modalTitle').innerText = `Edit ${pack.categories[catIdx].name} - $${clueObj.value}`;
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

  // Helper: Process and compress image file in-memory using Canvas and Base64 Data URL
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

  // Image Upload File Handler (RAM / Base64)
  imageFileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    uploadStatus.innerText = 'Processing image in memory...';
    try {
      const dataUrl = await processImageFile(file);
      currentImageUrl = dataUrl;
      uploadStatus.innerText = 'Image loaded into RAM!';
      updateImagePreview();
    } catch (err) {
      uploadStatus.innerText = 'Load error: ' + err.message;
    }
  };

  // External URL input change & live input
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

  // Save Clue Form Listener
  clueForm.onsubmit = async (e) => {
    e.preventDefault();
    if (activeCatIndex === null || activeClueIndex === null) return;

    if (btnSaveClue) {
      btnSaveClue.disabled = true;
      btnSaveClue.innerText = 'Saving...';
    }

    // Resolve Image Source
    const isUrlMode = btnSourceUrl && btnSourceUrl.classList.contains('active');
    if (isUrlMode && imageUrlInput.value.trim()) {
      currentImageUrl = imageUrlInput.value.trim();
    } else if (!isUrlMode && imageFileInput.files[0] && !currentImageUrl) {
      try {
        uploadStatus.innerText = 'Loading image into memory...';
        currentImageUrl = await processImageFile(imageFileInput.files[0]);
      } catch (err) {
        console.error('Image RAM load error:', err);
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
      btnSaveClue.innerText = 'Save Clue';
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

  // Reset Board
  btnResetPack.onclick = () => {
    if (confirm('Are you sure you want to reset the current pack?')) {
      initDefaultPack();
    }
  };

  // Launch Game Room Directly
  if (btnLaunchRoom) {
    btnLaunchRoom.onclick = () => {
      pack.title = packTitle.value.trim() || 'My Custom Jeopardy Pack';
      pack.author = packAuthor.value.trim() || 'Quiz Master';
      persistPack();

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
          alert('Game Pack imported successfully!');
        } else {
          alert('Invalid Jeopardy Pack JSON structure.');
        }
      } catch (err) {
        alert('Failed to parse JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Check if session pack exists or load default starter pack
  const storedPack = sessionStorage.getItem('jeopardy_pack');
  if (storedPack) {
    try {
      const parsed = JSON.parse(storedPack);
      if (parsed && parsed.categories && Array.isArray(parsed.categories)) {
        pack = parsed;
        packTitle.value = pack.title || 'My Custom Jeopardy Pack';
        packAuthor.value = pack.author || 'Quiz Master';
        renderGrid();
      } else {
        fetchDefaultPack();
      }
    } catch(e) { fetchDefaultPack(); }
  } else {
    fetchDefaultPack();
  }

  function fetchDefaultPack() {
    fetch('/api/default-game')
      .then(res => res.json())
      .then(defaultData => {
        if (defaultData && defaultData.categories) {
          pack = defaultData;
          packTitle.value = pack.title || 'Ultimate Trivia Showdown';
          packAuthor.value = pack.author || 'Jeopardy Host';
          persistPack();
          renderGrid();
        } else {
          initDefaultPack();
        }
      })
      .catch(() => initDefaultPack());
  }
});
