// Player Buzzer Logic with Contestant Creator Modal & Custom Avatar Support
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  let roomCode = (urlParams.get('room') || sessionStorage.getItem('jeopardy_room') || localStorage.getItem('jeopardy_room') || '').toUpperCase();
  let playerName = urlParams.get('name') || sessionStorage.getItem('jeopardy_name') || localStorage.getItem('jeopardy_name') || '';
  let playerColor = urlParams.get('color') || sessionStorage.getItem('jeopardy_color') || localStorage.getItem('jeopardy_color') || '#3b82f6';
  let playerAvatarUrl = urlParams.get('avatar') || sessionStorage.getItem('jeopardy_avatar') || localStorage.getItem('jeopardy_avatar') || '';

  // DOM Elements - Header & Main
  const roomBadge = document.getElementById('roomBadge');
  const playerAvatar = document.getElementById('playerAvatar');
  const playerNameHeader = document.getElementById('playerNameHeader');
  const playerScoreHeader = document.getElementById('playerScoreHeader');
  const btnBuzzer = document.getElementById('btnBuzzer');
  const buzzerStatus = document.getElementById('buzzerStatus');
  const btnPlayerProfile = document.getElementById('btnPlayerProfile');

  const playerClueBox = document.getElementById('playerClueBox');
  const playerClueCategory = document.getElementById('playerClueCategory');
  const playerClueValue = document.getElementById('playerClueValue');
  const playerClueText = document.getElementById('playerClueText');
  const playerClueImage = document.getElementById('playerClueImage');

  // DOM Elements - Setup Modal
  const playerJoinModal = document.getElementById('playerJoinModal');
  const playerSetupForm = document.getElementById('playerSetupForm');
  const setupRoomCode = document.getElementById('setupRoomCode');
  const setupName = document.getElementById('setupName');
  const setupColor = document.getElementById('setupColor');
  const avatarPreviewBubble = document.getElementById('avatarPreviewBubble');
  const setupAvatarFile = document.getElementById('setupAvatarFile');
  const btnSubmitSetup = document.getElementById('btnSubmitSetup');

  let playerId = null;
  let ws = null;
  let buzzerState = 'LOCKED';
  let currentClueObj = null;
  let selectedAvatarFile = null;

  // Initialize Setup Form Inputs
  setupRoomCode.value = roomCode;
  setupName.value = playerName;
  setupColor.value = playerColor;
  updateAvatarPreview();

  // If missing name, force modal open
  if (!playerName) {
    playerJoinModal.style.display = 'flex';
  } else {
    playerJoinModal.style.display = 'none';
    initWebSocket();
  }

  // Click Top-Left Player Profile to edit profile
  if (btnPlayerProfile) {
    btnPlayerProfile.onclick = () => {
      setupRoomCode.value = roomCode;
      setupName.value = playerName;
      setupColor.value = playerColor;
      updateAvatarPreview();
      playerJoinModal.style.display = 'flex';
    };
  }

  const btnUploadSetupAvatar = document.getElementById('btnUploadSetupAvatar');
  const setupColorSwatches = document.getElementById('setupColorSwatches');

  // Trigger file upload when clicking avatar bubble
  if (btnUploadSetupAvatar && setupAvatarFile) {
    btnUploadSetupAvatar.onclick = () => setupAvatarFile.click();
  }

  // Color Swatch Selection
  if (setupColorSwatches && setupColor) {
    const dots = setupColorSwatches.querySelectorAll('.color-dot');
    dots.forEach(dot => {
      dot.onclick = () => {
        dots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        const c = dot.getAttribute('data-color');
        setupColor.value = c;
        if (!selectedAvatarFile && !playerAvatarUrl) {
          avatarPreviewBubble.style.background = c;
        }
      };
    });

    setupColor.oninput = () => {
      dots.forEach(d => d.classList.remove('active'));
      if (!selectedAvatarFile && !playerAvatarUrl) {
        avatarPreviewBubble.style.background = setupColor.value;
      }
    };
  }

  if (setupName) {
    setupName.oninput = () => {
      if (!selectedAvatarFile && !playerAvatarUrl) {
        avatarPreviewBubble.innerText = (setupName.value.trim() || 'P').charAt(0).toUpperCase();
      }
    };
  }

  // Avatar file input change preview
  setupAvatarFile.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      selectedAvatarFile = file;
      const reader = new FileReader();
      reader.onload = (event) => {
        avatarPreviewBubble.style.backgroundImage = `url('${event.target.result}')`;
        avatarPreviewBubble.style.backgroundSize = 'cover';
        avatarPreviewBubble.style.backgroundPosition = 'center';
        avatarPreviewBubble.innerText = '';
      };
      reader.readAsDataURL(file);
    }
  };

  function updateAvatarPreview() {
    if (playerAvatarUrl) {
      avatarPreviewBubble.style.backgroundImage = `url('${playerAvatarUrl}')`;
      avatarPreviewBubble.style.backgroundSize = 'cover';
      avatarPreviewBubble.style.backgroundPosition = 'center';
      avatarPreviewBubble.innerText = '';
    } else {
      avatarPreviewBubble.style.backgroundImage = 'none';
      avatarPreviewBubble.style.background = setupColor.value;
      avatarPreviewBubble.innerText = (setupName.value || 'P').charAt(0).toUpperCase();
    }
  }

  function renderHeaderProfile() {
    roomBadge.innerText = `ROOM: ${roomCode || '----'}`;
    playerNameHeader.innerText = playerName || 'Player';
    playerNameHeader.style.color = playerColor || '#ffffff';
    
    if (playerAvatarUrl) {
      playerAvatar.style.backgroundImage = `url('${playerAvatarUrl}')`;
      playerAvatar.style.backgroundSize = 'cover';
      playerAvatar.style.backgroundPosition = 'center';
      playerAvatar.innerText = '';
    } else {
      playerAvatar.style.backgroundImage = 'none';
      playerAvatar.style.background = playerColor || '#3b82f6';
      playerAvatar.innerText = (playerName || 'P').charAt(0).toUpperCase();
    }
  }

  // Setup Form Submit
  playerSetupForm.onsubmit = async (e) => {
    e.preventDefault();
    btnSubmitSetup.disabled = true;
    btnSubmitSetup.innerText = 'Connecting...';

    roomCode = setupRoomCode.value.trim().toUpperCase();
    playerName = setupName.value.trim();
    playerColor = setupColor.value;

    if (!roomCode || roomCode.length !== 4) {
      alert('Please enter a valid 4-letter room code.');
      btnSubmitSetup.disabled = false;
      btnSubmitSetup.innerText = '🚀 Join Contestant Screen';
      return;
    }

    // Upload custom avatar if file selected
    if (selectedAvatarFile) {
      try {
        const formData = new FormData();
        formData.append('image', selectedAvatarFile);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const json = await res.json();
        if (json.success) {
          playerAvatarUrl = json.url;
        }
      } catch (err) {
        console.error('Avatar upload failed:', err);
      }
    }

    // Save to Local & Session Storage
    localStorage.setItem('jeopardy_room', roomCode);
    localStorage.setItem('jeopardy_name', playerName);
    localStorage.setItem('jeopardy_color', playerColor);
    if (playerAvatarUrl) localStorage.setItem('jeopardy_avatar', playerAvatarUrl);

    sessionStorage.setItem('jeopardy_room', roomCode);
    sessionStorage.setItem('jeopardy_name', playerName);
    sessionStorage.setItem('jeopardy_color', playerColor);
    if (playerAvatarUrl) sessionStorage.setItem('jeopardy_avatar', playerAvatarUrl);

    renderHeaderProfile();
    playerJoinModal.style.display = 'none';
    btnSubmitSetup.disabled = false;
    btnSubmitSetup.innerText = '🚀 Join Contestant Screen';

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'JOIN_ROOM',
        roomCode,
        name: playerName,
        color: playerColor,
        avatar: playerAvatarUrl
      }));
    } else {
      initWebSocket();
    }
  };

  // Initialize WebSocket Connection
  function initWebSocket() {
    renderHeaderProfile();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (ws) ws.close();
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'JOIN_ROOM',
        roomCode,
        name: playerName,
        color: playerColor,
        avatar: playerAvatarUrl
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'PLAYER_JOIN_SUCCESS':
            playerId = msg.playerId;
            updatePlayerState(msg.state);
            break;

          case 'ROOM_STATE':
          case 'CLUE_CLOSED':
            updatePlayerState(msg.state);
            if (msg.type === 'CLUE_CLOSED') {
              playerClueBox.style.display = 'none';
              setBuzzerLocked('Waiting for Host to pick next clue...');
            }
            break;

          case 'CLUE_SELECTED':
            updatePlayerState(msg.state);
            showClueDetails(msg.clueObj);
            setBuzzerLocked('Wait for Host to unlock buzzers...');
            break;

          case 'BUZZERS_UNLOCKED':
            setBuzzerUnlocked();
            break;

          case 'PLAYER_BUZZED':
            if (msg.playerId === playerId) {
              setBuzzerWinner(msg.latency);
            } else {
              setBuzzerLockedOut(`${msg.playerName} buzzed first!`);
            }
            break;

          case 'ANSWER_EVALUATED':
            updatePlayerState(msg.state);
            if (msg.playerId === playerId) {
              if (msg.isCorrect) {
                buzzerStatus.innerText = `🎉 CORRECT! +$${msg.scoreChange}`;
                buzzerStatus.style.color = 'var(--color-success)';
                if (window.soundFX) window.soundFX.playCorrect();
              } else {
                buzzerStatus.innerText = `❌ INCORRECT! -$${Math.abs(msg.scoreChange)}`;
                buzzerStatus.style.color = 'var(--color-danger)';
                if (window.soundFX) window.soundFX.playWrong();
              }
            }
            break;

          case 'ERROR':
            alert(msg.message);
            playerJoinModal.style.display = 'flex';
            break;
        }
      } catch (err) {
        console.error('WS Error:', err);
      }
    };
  }

  function updatePlayerState(state) {
    if (!state) return;
    const me = state.players.find(p => p.id === playerId || p.name.toLowerCase() === playerName.toLowerCase());
    if (me) {
      playerScoreHeader.innerText = `$${me.score}`;
      if (me.score < 0) {
        playerScoreHeader.style.color = 'var(--color-danger)';
      } else {
        playerScoreHeader.style.color = 'var(--jeopardy-gold)';
      }
    }

    if (state.buzzerState) {
      buzzerState = state.buzzerState.state;
    }

    if (state.currentClue) {
      showClueDetails(state.currentClue);
    }

    renderPlayerBoard(state);
    renderScoreboard(state);
  }

  function renderScoreboard(state) {
    const container = document.getElementById('playerScoreboard');
    if (!container || !state || !state.players) return;

    container.innerHTML = '';
    state.players.forEach(p => {
      const card = document.createElement('div');
      card.className = 'player-card';
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.gap = '0.45rem';
      card.style.padding = '0.3rem 0.65rem';
      card.style.fontSize = '0.8rem';
      card.style.whiteSpace = 'nowrap';
      card.style.flexShrink = '0';

      if (state.buzzerState && state.buzzerState.activePlayerId === p.id) {
        card.classList.add('active-buzzer');
      }

      const avatar = document.createElement('div');
      avatar.className = 'player-avatar';
      avatar.style.width = '24px';
      avatar.style.height = '24px';
      avatar.style.fontSize = '0.75rem';

      if (p.avatar) {
        avatar.style.backgroundImage = `url('${p.avatar}')`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
        avatar.innerText = '';
      } else {
        avatar.style.background = p.color || '#3b82f6';
        avatar.innerText = p.name.charAt(0).toUpperCase();
      }

      const info = document.createElement('div');
      info.style.display = 'flex';
      info.style.alignItems = 'center';
      info.style.gap = '0.35rem';
      info.innerHTML = `
        <span style="font-weight: 800; color: ${p.color || '#ffffff'};">${p.name}</span>
        <span style="font-weight: 900; color: ${p.score < 0 ? 'var(--color-danger)' : 'var(--jeopardy-gold)'};">$${p.score}</span>
      `;

      card.appendChild(avatar);
      card.appendChild(info);
      container.appendChild(card);
    });
  }

  function renderPlayerBoard(state) {
    if (!state) return;
    const categories = state.categories || (state.gamePack && state.gamePack.categories);
    const playerBoardGrid = document.getElementById('playerBoardGrid');
    const playerBoardContainer = document.getElementById('playerBoardContainer');

    if (!categories || categories.length === 0 || !playerBoardGrid || !playerBoardContainer) return;

    playerBoardContainer.style.display = 'block';
    playerBoardGrid.innerHTML = '';
    playerBoardGrid.style.gridTemplateColumns = `repeat(${categories.length}, 1fr)`;

    categories.forEach((cat, catIdx) => {
      const col = document.createElement('div');
      col.className = 'board-column';

      const header = document.createElement('div');
      header.className = 'category-header';
      header.innerText = cat.name;
      col.appendChild(header);

      cat.clues.forEach((clue, clueIdx) => {
        const card = document.createElement('div');
        card.className = 'clue-card';
        card.style.cursor = 'default';

        const key = `${catIdx}-${clueIdx}`;
        const isRevealed = state.boardState && state.boardState[key];
        const isCurrent = state.currentClue && state.currentClue.categoryIndex === catIdx && state.currentClue.clueIndex === clueIdx;

        if (isRevealed) {
          card.classList.add('revealed');
          card.innerText = '';
        } else if (isCurrent) {
          card.style.borderColor = 'var(--jeopardy-gold)';
          card.style.boxShadow = '0 0 12px rgba(251, 191, 36, 0.4)';
          card.innerText = `$${clue.value}`;
        } else {
          card.innerText = `$${clue.value}`;
        }

        col.appendChild(card);
      });

      playerBoardGrid.appendChild(col);
    });
  }

  function showClueDetails(clue) {
    if (!clue) return;
    currentClueObj = clue;
    playerClueBox.style.display = 'block';
    playerClueCategory.innerText = clue.categoryName;
    playerClueValue.innerText = `$${clue.value}`;

    // Only reveal question text and image once buzzers are unlocked!
    if (buzzerState === 'UNLOCKED' || buzzerState === 'BUZZED' || buzzerState === 'WINNER' || buzzerState === 'LOCKED_OUT') {
      playerClueText.innerText = clue.clue;
      playerClueText.style.fontStyle = 'normal';
      playerClueText.style.color = '#fff';

      if (clue.image) {
        playerClueImage.src = clue.image;
        playerClueImage.style.display = 'inline-block';
      } else {
        playerClueImage.style.display = 'none';
        playerClueImage.src = '';
      }
    } else {
      playerClueText.innerText = '🔒 Question locked until Host unlocks buzzers...';
      playerClueText.style.fontStyle = 'italic';
      playerClueText.style.color = 'var(--text-muted)';
      playerClueImage.style.display = 'none';
    }
  }

  // BUZZER BUTTON STATES
  function setBuzzerUnlocked() {
    buzzerState = 'UNLOCKED';
    btnBuzzer.disabled = false;
    btnBuzzer.className = 'buzzer-btn unlocked';
    btnBuzzer.innerText = 'BUZZ!';
    buzzerStatus.innerText = '⚡ BUZZERS ACTIVE! PRESS NOW!';
    buzzerStatus.style.color = 'var(--color-success)';

    if (currentClueObj) {
      showClueDetails(currentClueObj);
    }

    if (window.soundFX) window.soundFX.init();
  }

  function setBuzzerWinner(latency) {
    buzzerState = 'WINNER';
    btnBuzzer.disabled = true;
    btnBuzzer.className = 'buzzer-btn buzzed-winner';
    btnBuzzer.innerText = 'BUZZED!';
    buzzerStatus.innerText = `⭐ YOU BUZZED FIRST! (+${latency}ms)`;
    buzzerStatus.style.color = 'var(--jeopardy-gold)';
  }

  function setBuzzerLockedOut(reason) {
    buzzerState = 'LOCKED_OUT';
    btnBuzzer.disabled = true;
    btnBuzzer.className = 'buzzer-btn';
    btnBuzzer.innerText = 'LOCKED';
    buzzerStatus.innerText = reason || 'Locked out';
    buzzerStatus.style.color = 'var(--text-muted)';
  }

  function setBuzzerLocked(statusText) {
    buzzerState = 'LOCKED';
    btnBuzzer.disabled = true;
    btnBuzzer.className = 'buzzer-btn';
    btnBuzzer.innerText = 'WAIT';
    buzzerStatus.innerText = statusText || 'Waiting...';
    buzzerStatus.style.color = 'var(--text-muted)';
  }

  // Keyboard Shortcut Listener for Buzzing (Space or Enter)
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    if (playerJoinModal && playerJoinModal.style.display === 'flex') return;

    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (buzzerState === 'UNLOCKED' && !btnBuzzer.disabled) {
        btnBuzzer.click();
      }
    }
  });

  // Press Buzzer Action
  btnBuzzer.onclick = () => {
    if (buzzerState !== 'UNLOCKED') return;

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    if (window.soundFX) {
      window.soundFX.playBuzzer();
    }

    ws.send(JSON.stringify({ type: 'PRESS_BUZZER' }));
  };
});
