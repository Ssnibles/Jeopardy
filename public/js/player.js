// Player Buzzer Logic with Contestant Creator Modal & Custom Avatar Support
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  let roomCode = (urlParams.get('room') || sessionStorage.getItem('jeopardy_room') || localStorage.getItem('jeopardy_room') || '').toUpperCase();
  let playerName = urlParams.get('name') || sessionStorage.getItem('jeopardy_name') || localStorage.getItem('jeopardy_name') || '';
  let playerColor = urlParams.get('color') || sessionStorage.getItem('jeopardy_color') || localStorage.getItem('jeopardy_color') || '#3b82f6';
  let playerAvatarUrl = urlParams.get('avatar') || sessionStorage.getItem('jeopardy_avatar') || localStorage.getItem('jeopardy_avatar') || '';

  // Purge legacy oversized Base64 strings from storage
  if (playerAvatarUrl.startsWith('data:image/') && playerAvatarUrl.length > 10000) {
    playerAvatarUrl = '';
    localStorage.removeItem('jeopardy_avatar');
    sessionStorage.removeItem('jeopardy_avatar');
  }

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

  // DOM Elements - Overlays & Modals
  const playerCountdownOverlay = document.getElementById('playerCountdownOverlay');
  const playerCountdownNum = document.getElementById('playerCountdownNum');
  const playerWinscreenModal = document.getElementById('playerWinscreenModal');
  const playerWinnerAvatar = document.getElementById('playerWinnerAvatar');
  const playerWinnerName = document.getElementById('playerWinnerName');
  const playerWinnerScore = document.getElementById('playerWinnerScore');
  const playerPodiumStandings = document.getElementById('playerPodiumStandings');

  let playerId = sessionStorage.getItem('jeopardy_playerId') || localStorage.getItem('jeopardy_playerId') || null;
  let ws = null;
  let buzzerState = 'LOCKED';
  let currentClueObj = null;
  let selectedAvatarFile = null;

  let reconnectTimer = null;
  let reconnectAttempts = 0;
  let pingInterval = null;
  let wsId = 0;

  // Initialise Setup Form Inputs
  setupRoomCode.value = roomCode;
  setupName.value = playerName;
  setupColor.value = playerColor;
  updateAvatarPreview();

  if (!playerName) {
    playerJoinModal.style.display = 'flex';
  } else {
    playerJoinModal.style.display = 'none';
    initWebSocket();
  }

  if (btnPlayerProfile) {
    btnPlayerProfile.onclick = () => {
      setupRoomCode.value = roomCode;
      setupName.value = playerName;
      setupColor.value = playerColor;
      updateAvatarPreview();
      updateSetupButtonColor(playerColor || setupColor.value || '#3b82f6');
      if (btnSubmitSetup) btnSubmitSetup.innerText = 'Save Profile Updates';
      playerJoinModal.style.display = 'flex';
    };
  }

  const btnUploadSetupAvatar = document.getElementById('btnUploadSetupAvatar');
  const setupColorSwatches = document.getElementById('setupColorSwatches');

  function updateSetupButtonColor(color) {
    if (!btnSubmitSetup) return;
    btnSubmitSetup.style.backgroundColor = color;
    btnSubmitSetup.style.borderColor = color;
  }

  if (btnUploadSetupAvatar && setupAvatarFile) {
    btnUploadSetupAvatar.onclick = () => setupAvatarFile.click();
  }

  if (setupColorSwatches && setupColor) {
    const dots = setupColorSwatches.querySelectorAll('.color-dot');
    dots.forEach(dot => {
      const c = dot.getAttribute('data-color');
      if (c) dot.style.backgroundColor = c;
      dot.onclick = () => {
        dots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        const c = dot.getAttribute('data-color');
        setupColor.value = c;
        updateSetupButtonColor(c);
        if (!selectedAvatarFile && !playerAvatarUrl) {
          avatarPreviewBubble.style.background = c;
        }
      };
    });

    setupColor.oninput = () => {
      dots.forEach(d => d.classList.remove('active'));
      const c = setupColor.value;
      updateSetupButtonColor(c);
      if (!selectedAvatarFile && !playerAvatarUrl) {
        avatarPreviewBubble.style.background = c;
      }
    };

    // Initial sync
    updateSetupButtonColor(setupColor.value || '#3b82f6');
  }

  if (setupName) {
    setupName.oninput = () => {
      if (!selectedAvatarFile && !playerAvatarUrl) {
        avatarPreviewBubble.innerText = (setupName.value.trim() || 'P').charAt(0).toUpperCase();
      }
    };
  }

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
    const c = setupColor.value || playerColor || '#3b82f6';
    updateSetupButtonColor(c);
    if (playerAvatarUrl) {
      avatarPreviewBubble.style.backgroundImage = `url('${playerAvatarUrl}')`;
      avatarPreviewBubble.style.backgroundSize = 'cover';
      avatarPreviewBubble.style.backgroundPosition = 'center';
      avatarPreviewBubble.innerText = '';
    } else {
      avatarPreviewBubble.style.backgroundImage = 'none';
      avatarPreviewBubble.style.background = c;
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
      btnSubmitSetup.innerText = 'Join Contestant Screen';
      return;
    }

    function compressAvatarImage(file) {
      return new Promise((resolve) => {
        if (!file || !file.type.startsWith('image/')) return resolve(file);

        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_DIM = 150;
            let width = img.width;
            let height = img.height;
            const minDim = Math.min(width, height);
            const sx = (width - minDim) / 2;
            const sy = (height - minDim) / 2;

            canvas.width = MAX_DIM;
            canvas.height = MAX_DIM;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, MAX_DIM, MAX_DIM);

            canvas.toBlob((blob) => {
              if (blob) {
                const compressedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            }, 'image/jpeg', 0.8);
          };
          img.onerror = () => resolve(file);
          img.src = e.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
      });
    }

    if (selectedAvatarFile) {
      try {
        const compressedFile = await compressAvatarImage(selectedAvatarFile);
        const formData = new FormData();
        formData.append('image', compressedFile);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const json = await res.json();
        if (json.success) {
          playerAvatarUrl = json.url;
        }
      } catch (err) {
        console.error('Avatar upload failed:', err);
      }
    }

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
    btnSubmitSetup.innerText = 'Join Contestant Screen';

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'JOIN_ROOM',
        roomCode,
        playerId: playerId || sessionStorage.getItem('jeopardy_playerId') || localStorage.getItem('jeopardy_playerId') || '',
        name: playerName,
        color: playerColor,
        avatar: playerAvatarUrl
      }));
    } else {
      initWebSocket();
    }
  };

  // Initialise WebSocket Connection with Auto-Reconnect
  function initWebSocket() {
    renderHeaderProfile();
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (pingInterval) clearInterval(pingInterval);

    roomCode = (roomCode || sessionStorage.getItem('jeopardy_room') || localStorage.getItem('jeopardy_room') || '').toUpperCase();
    playerName = playerName || sessionStorage.getItem('jeopardy_name') || localStorage.getItem('jeopardy_name') || '';
    playerColor = playerColor || sessionStorage.getItem('jeopardy_color') || localStorage.getItem('jeopardy_color') || '#3b82f6';
    playerAvatarUrl = playerAvatarUrl || sessionStorage.getItem('jeopardy_avatar') || localStorage.getItem('jeopardy_avatar') || '';
    playerId = playerId || sessionStorage.getItem('jeopardy_playerId') || localStorage.getItem('jeopardy_playerId') || '';

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        try { ws.close(); } catch (e) {}
      }
    }

    wsId++;
    const thisWsId = wsId;
    const thisSocket = new WebSocket(`${protocol}//${window.location.host}`);
    ws = thisSocket;

    thisSocket.onopen = () => {
      if (ws !== thisSocket) {
        thisSocket.close();
        return;
      }
      reconnectAttempts = 0;

      const joinPayload = {
        type: 'JOIN_ROOM',
        roomCode,
        playerId: playerId || sessionStorage.getItem('jeopardy_playerId') || localStorage.getItem('jeopardy_playerId') || '',
        name: playerName,
        color: playerColor,
        avatar: playerAvatarUrl
      };
      thisSocket.send(JSON.stringify(joinPayload));

      pingInterval = setInterval(() => {
        if (thisSocket.readyState === WebSocket.OPEN) {
          try { thisSocket.send(JSON.stringify({ type: 'PING' })); } catch (e) {}
        }
      }, 10000);
    };

    thisSocket.onclose = (event) => {
      if (pingInterval) clearInterval(pingInterval);
      if (ws === thisSocket) {
        scheduleReconnect();
      }
    };

    thisSocket.onerror = (err) => {
      console.warn(`[WS#${thisWsId}] WebSocket error:`, err);
    };

    thisSocket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'PLAYER_JOIN_SUCCESS':
            playerId = msg.playerId;
            sessionStorage.setItem('jeopardy_playerId', msg.playerId);
            localStorage.setItem('jeopardy_playerId', msg.playerId);
            updatePlayerState(msg.state);
            setTimeout(() => {
              if (thisSocket.readyState === WebSocket.OPEN) {
                try { thisSocket.send(JSON.stringify({ type: 'REQUEST_STATE' })); } catch (e) {}
              }
            }, 1000);
            break;

          case 'CLUE_SELECTED':
            if (msg.clientTime) {
              measuredPing = Math.max(10, Date.now() - msg.clientTime);
            }
            currentRevealedAnswer = '';
            if (playerClueAnswerBox) hideElement(playerClueAnswerBox);
            break;

          case 'CLUE_CLOSED':
            if (msg.clientTime) {
              measuredPing = Math.max(10, Date.now() - msg.clientTime);
            }
            if (msg.answer) {
              currentRevealedAnswer = msg.answer;
              if (playerClueAnswerText) playerClueAnswerText.innerText = currentRevealedAnswer;
              if (playerClueAnswerBox) showElement(playerClueAnswerBox, 'block');
              if (playerClueBox) showElement(playerClueBox, 'block');
            }
            break;

          case 'WAGER_SET':
            if (playerCountdownOverlay) playerCountdownOverlay.classList.remove('active');
            updatePlayerState(msg.state);
            break;

          case 'ROUND_TRANSITION':
            if (playerCountdownOverlay) playerCountdownOverlay.classList.remove('active');
            updatePlayerState(msg.state);
            if (window.soundFX) window.soundFX.playWinnerFanfare();
            break;

          case 'EARLY_BUZZ_PENALTY':
            buzzerStatus.innerText = msg.message || 'Early Buzz! 250ms penalty applied when buzzers unlock.';
            buzzerStatus.style.color = 'var(--color-danger)';
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            break;

          case 'BUZZER_COUNTDOWN':
            if (currentClueObj && currentClueObj.lockedOutPlayerIds && currentClueObj.lockedOutPlayerIds.includes(playerId)) {
              setBuzzerLockedOut('You answered incorrectly on this clue.');
              break;
            }
            if (playerCountdownOverlay && playerCountdownNum) {
              playerCountdownNum.innerText = msg.secondsLeft;
              playerCountdownOverlay.classList.add('active');
              if (window.soundFX) window.soundFX.playCountdownTick();
            }
            break;

          case 'BUZZERS_UNLOCKED':
            if (playerCountdownOverlay) playerCountdownOverlay.classList.remove('active');
            if (msg.state) updatePlayerState(msg.state);
            if (currentClueObj && currentClueObj.lockedOutPlayerIds && currentClueObj.lockedOutPlayerIds.includes(playerId)) {
              setBuzzerLockedOut('You answered incorrectly on this clue.');
            } else {
              if (window.soundFX) window.soundFX.playCountdownGo();
              setBuzzerUnlocked();
            }
            break;

          case 'ANSWER_TIMER_TICK':
            if (currentClueObj && currentClueObj.lockedOutPlayerIds && currentClueObj.lockedOutPlayerIds.includes(playerId)) {
              setBuzzerLockedOut('You answered incorrectly on this clue.');
              break;
            }
            if (msg.activePlayerId === playerId) {
              setBuzzerWinner(0, msg.secondsLeft);
              if (window.soundFX && msg.secondsLeft <= 3) {
                window.soundFX.playCountdownTick();
              }
            } else {
              setBuzzerLockedOut(`${msg.activePlayerName} is answering... (${msg.secondsLeft}s left)`);
            }
            break;

          case 'ANSWER_TIMER_EXPIRED':
            if (playerCountdownOverlay) playerCountdownOverlay.classList.remove('active');
            if (msg.activePlayerId === playerId) {
              buzzerStatus.innerText = 'TIME EXPIRED! Host evaluating answer...';
              buzzerStatus.style.color = 'var(--color-danger)';
            } else {
              setBuzzerLockedOut(`${msg.activePlayerName || 'Contestant'} - TIME EXPIRED! Host evaluating...`);
            }
            break;

          case 'PLAYER_BUZZED':
            if (currentClueObj && currentClueObj.lockedOutPlayerIds && currentClueObj.lockedOutPlayerIds.includes(playerId)) {
              setBuzzerLockedOut('You answered incorrectly on this clue.');
              break;
            }
            if (msg.playerId === playerId) {
              setBuzzerWinner(msg.latency, msg.answerSecondsLeft || 7);
            } else {
              setBuzzerLockedOut(`${msg.playerName} buzzed first! (${msg.answerSecondsLeft || 7}s)`);
            }
            break;

          case 'BUZZER_REJECTED':
            setBuzzerLockedOut(msg.message || 'Buzz rejected');
            break;

          case 'ANSWER_EVALUATED':
            if (playerCountdownOverlay) playerCountdownOverlay.classList.remove('active');
            updatePlayerState(msg.state);
            const ansRev = msg.answer || (msg.state && msg.state.currentClue && msg.state.currentClue.answer);
            if (ansRev) {
              currentRevealedAnswer = ansRev;
              if (playerClueAnswerText) playerClueAnswerText.innerText = currentRevealedAnswer;
              if (playerClueAnswerBox) showElement(playerClueAnswerBox, 'block');
              if (playerClueBox) showElement(playerClueBox, 'block');
            }
            if (msg.playerId === playerId) {
              if (msg.isCorrect) {
                buzzerStatus.innerText = `CORRECT! +$${msg.scoreChange}`;
                buzzerStatus.style.color = 'var(--color-success)';
                if (window.soundFX) window.soundFX.playCorrect();
              } else {
                setBuzzerLockedOut(`INCORRECT! -$${Math.abs(msg.scoreChange)} (Locked out)`);
                buzzerStatus.style.color = 'var(--color-danger)';
                if (window.soundFX) window.soundFX.playWrong();
              }
            }
            break;

          case 'GAME_OVER':
            updatePlayerState(msg.state);
            showWinscreen(msg.rankings || (msg.state ? msg.state.rankings : []));
            break;

          case 'ERROR':
            alert(msg.message);
            playerJoinModal.style.display = 'flex';
            break;
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };
  }

  function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000);
    buzzerStatus.innerText = `Connection lost. Reconnecting...`;
    buzzerStatus.style.color = 'var(--color-danger)';
    reconnectTimer = setTimeout(() => {
      initWebSocket();
    }, delay);
  }

  function showElement(el, displayStyle = 'block') {
    if (!el) return;
    el.classList.remove('display-none');
    el.style.display = displayStyle;
  }

  function hideElement(el) {
    if (!el) return;
    el.classList.add('display-none');
    el.style.display = 'none';
  }

  function updatePlayerState(state) {
    if (!state) return;

    if (state.isGameOver) {
      showWinscreen(state.rankings);
    } else if (playerWinscreenModal) {
      playerWinscreenModal.classList.remove('active');
    }

    const me = state.players.find(p => p.id === playerId || (p.name && playerName && p.name.toLowerCase() === playerName.toLowerCase()));
    if (me) {
      playerId = me.id;
      playerScoreHeader.innerText = `$${me.score}`;
      if (me.score < 0) {
        playerScoreHeader.style.color = 'var(--color-danger)';
      } else {
        playerScoreHeader.style.color = 'var(--jeopardy-gold)';
      }
    }

    renderPlayerBoard(state);
    renderScoreboard(state);

    const playerFJCard = document.getElementById('playerFJCard');
    const playerFJCategory = document.getElementById('playerFJCategory');
    const playerFJWagerPanel = document.getElementById('playerFJWagerPanel');
    const playerFJResponsePanel = document.getElementById('playerFJResponsePanel');
    const playerFJMaxWagerHint = document.getElementById('playerFJMaxWagerHint');
    const playerFJClueText = document.getElementById('playerFJClueText');
    const playerFJStatus = document.getElementById('playerFJStatus');
    const buzzerContainer = document.querySelector('.buzzer-container');
    const playerBoardContainer = document.getElementById('playerBoardContainer');

    if (state.finalJeopardy && state.finalJeopardy.state !== 'FINISHED') {
      const fj = state.finalJeopardy;
      const me = state.players.find(p => p.id === playerId);
      const isDisqualified = me ? (me.isDisqualified || (state.disqualifiedPlayerIds || []).includes(me.id)) : false;
      const myScore = me ? me.score : 0;
      const myWager = fj.wagers ? fj.wagers[playerId] : undefined;
      const myResponse = fj.responses ? fj.responses[playerId] : undefined;

      if (playerFJCard) playerFJCard.style.display = 'block';
      if (playerFJCategory) playerFJCategory.innerText = `CATEGORY: ${fj.category}`;

      if (buzzerContainer) buzzerContainer.style.display = 'none';
      if (playerBoardContainer) playerBoardContainer.style.display = 'none';

      if (isDisqualified) {
        if (playerFJWagerPanel) playerFJWagerPanel.style.display = 'none';
        if (playerFJResponsePanel) playerFJResponsePanel.style.display = 'none';
        if (playerFJStatus) {
          playerFJStatus.style.display = 'block';
          playerFJStatus.innerText = 'DISQUALIFIED: Score is $0 or less. You cannot participate in Final Jeopardy.';
          playerFJStatus.style.color = 'var(--color-danger)';
        }
        setBuzzerLockedOut('DISQUALIFIED FROM FINAL JEOPARDY');
        return;
      }

      if (fj.state === 'WAGER') {
        if (myWager !== undefined) {
          if (playerFJWagerPanel) playerFJWagerPanel.style.display = 'none';
          if (playerFJResponsePanel) playerFJResponsePanel.style.display = 'none';
          if (playerFJStatus) {
            playerFJStatus.style.display = 'block';
            playerFJStatus.innerText = `✓ Step 1 Complete: Secret Wager Locked In ($${myWager}). Waiting for Host to reveal clue...`;
            playerFJStatus.style.color = 'var(--jeopardy-gold)';
          }
        } else {
          if (playerFJWagerPanel) playerFJWagerPanel.style.display = 'block';
          if (playerFJResponsePanel) playerFJResponsePanel.style.display = 'none';
          if (playerFJMaxWagerHint) playerFJMaxWagerHint.innerText = `Step 1 of 3: Enter your secret wager ($0 to $${Math.max(0, myScore)}):`;
          if (playerFJStatus) playerFJStatus.style.display = 'none';
        }
        setBuzzerLocked('STEP 1: SECRET WAGER PHASE');
      } else if (fj.state === 'CLUE') {
        if (playerFJWagerPanel) playerFJWagerPanel.style.display = 'none';
        if (playerFJClueText) playerFJClueText.innerText = fj.clue || 'Final Jeopardy Clue';

        if (myResponse !== undefined) {
          if (playerFJResponsePanel) playerFJResponsePanel.style.display = 'none';
          if (playerFJStatus) {
            playerFJStatus.style.display = 'block';
            playerFJStatus.innerText = `✓ Step 2 Complete: Answer Submitted ("${myResponse}"). Waiting for Host evaluation...`;
            playerFJStatus.style.color = 'var(--jeopardy-gold)';
          }
        } else {
          if (playerFJResponsePanel) playerFJResponsePanel.style.display = 'block';
          if (playerFJStatus) playerFJStatus.style.display = 'none';
        }
        setBuzzerLocked('STEP 2: WRITE YOUR ANSWER');
      } else if (fj.state === 'EVALUATION') {
        if (playerFJWagerPanel) playerFJWagerPanel.style.display = 'none';
        if (playerFJResponsePanel) playerFJResponsePanel.style.display = 'none';
        if (playerFJClueText) playerFJClueText.innerText = fj.clue || 'Final Jeopardy Clue';

        if (playerFJStatus) {
          playerFJStatus.style.display = 'block';
          playerFJStatus.innerText = `Step 3: Host is evaluating contestant answers live on the TV screen!`;
          playerFJStatus.style.color = '#60a5fa';
        }
        setBuzzerLocked('STEP 3: HOST ANSWER EVALUATION');
      }
      return;
    } else {
      if (playerFJCard) hideElement(playerFJCard);
      if (buzzerContainer) showElement(buzzerContainer, 'flex');
      if (playerBoardContainer) showElement(playerBoardContainer, 'block');
    }

    if (state.currentClue) {
      currentClueObj = state.currentClue;
      const bState = state.buzzerState ? state.buzzerState.state : 'LOCKED';
      const playerDDWagerBox = document.getElementById('playerDDWagerBox');
      const playerDDMaxWagerHint = document.getElementById('playerDDMaxWagerHint');

      // Exclusive Daily Double Check!
      if (state.currentClue.dailyDouble) {
        const isEligible = playerId === state.currentClue.eligiblePlayerId;

        if (isEligible) {
          if (!state.currentClue.wagerSet) {
            if (playerDDWagerBox) showElement(playerDDWagerBox, 'block');
            if (playerDDMaxWagerHint) {
              const maxW = state.currentClue.maxWager || 1000;
              playerDDMaxWagerHint.innerText = `Enter your wager ($5 to $${maxW}):`;
            }
            hideElement(playerClueBox);
            setBuzzerLocked('YOU GOT THE DAILY DOUBLE! Enter your wager.');
          } else {
            if (playerDDWagerBox) hideElement(playerDDWagerBox);
            showClueDetails(state.currentClue);
            setBuzzerLocked(`DAILY DOUBLE WAGER: $${state.currentClue.wager} - Answer out loud to Host!`);
          }
        } else {
          if (playerDDWagerBox) hideElement(playerDDWagerBox);
          if (!state.currentClue.wagerSet) {
            hideElement(playerClueBox);
            setBuzzerLockedOut(`Daily Double reserved for ${state.currentClue.eligiblePlayerName || 'selected player'} (Wager in progress...)`);
          } else {
            showClueDetails(state.currentClue);
            setBuzzerLockedOut(`Daily Double for ${state.currentClue.eligiblePlayerName || 'selected player'} ($${state.currentClue.wager})`);
          }
        }
        return;
      }

      if (playerDDWagerBox) hideElement(playerDDWagerBox);

      // Check if player is locked out on this clue
      if (state.currentClue.lockedOutPlayerIds && state.currentClue.lockedOutPlayerIds.includes(playerId)) {
        showClueDetails(state.currentClue);
        setBuzzerLockedOut('You answered incorrectly on this clue.');
        return;
      }

      if (bState === 'UNLOCKED') {
        setBuzzerUnlocked();
      } else if (bState === 'BUZZED' || bState === 'WINNER') {
        const activeId = state.buzzerState ? state.buzzerState.activePlayerId : null;
        if (activeId === playerId) {
          setBuzzerWinner(state.buzzerState ? (state.buzzerState.latency || 0) : 0);
        } else {
          const activePlayer = state.players.find(p => p.id === activeId);
          const activeName = activePlayer ? activePlayer.name : 'Another player';
          setBuzzerLockedOut(`${activeName} buzzed first!`);
        }
      } else {
        setBuzzerLocked('Wait for Host to unlock buzzers...');
      }
    } else {
      const playerDDWagerBox = document.getElementById('playerDDWagerBox');
      if (playerDDWagerBox) hideElement(playerDDWagerBox);
      currentClueObj = null;
      hideElement(playerClueBox);

      if (state.controllingPlayerId === playerId) {
        setBuzzerLocked('YOU HAVE BOARD CONTROL! Tell Host your clue choice.');
        buzzerStatus.style.color = 'var(--jeopardy-gold)';
      } else {
        const ctrlPlayer = state.players ? state.players.find(p => p.id === state.controllingPlayerId) : null;
        const ctrlName = ctrlPlayer ? ctrlPlayer.name : 'Contestant';
        setBuzzerLocked(`Board Control: ${ctrlName} (Waiting for Host to pick clue...)`);
      }
    }
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

      const isCtrl = state.controllingPlayerId ? (p.id === state.controllingPlayerId) : false;
      const ctrlBadge = isCtrl ? `<span class="control-badge" title="Board Control">CONTROL</span>` : '';

      const info = document.createElement('div');
      info.className = 'flex-row align-center gap-xs';
      info.innerHTML = `
        <span class="font-bold-800" style="color: ${p.color || '#ffffff'};">${p.name}${ctrlBadge}</span>
        <span class="font-bold-900" style="color: ${p.score < 0 ? 'var(--color-danger)' : 'var(--jeopardy-gold)'};">$${p.score}</span>
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
        const isCurrent = state.currentClue && state.currentClue.catIndex === catIdx && state.currentClue.clueIndex === clueIdx;

        if (isRevealed) {
          card.classList.add('revealed');
          card.innerText = '';
        } else if (isCurrent) {
          card.classList.add('active-selected');
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
    showElement(playerClueBox, 'block');
    playerClueCategory.innerText = clue.categoryName;
    playerClueValue.innerText = clue.dailyDouble ? `DAILY DOUBLE ($${clue.wager || clue.value})` : `$${clue.value}`;

    playerClueText.innerText = clue.clue || '';
    showElement(playerClueText, 'block');
    playerClueText.style.fontStyle = 'normal';
    playerClueText.style.color = '#fff';

    const playerClueAnswerBox = document.getElementById('playerClueAnswerBox');
    const playerClueAnswerText = document.getElementById('playerClueAnswerText');
    const ansToShow = clue.answer || currentRevealedAnswer;
    if (ansToShow && playerClueAnswerBox && playerClueAnswerText) {
      playerClueAnswerText.innerText = ansToShow;
      showElement(playerClueAnswerBox, 'block');
    } else if (playerClueAnswerBox) {
      hideElement(playerClueAnswerBox);
    }

    if (playerClueImage) {
      playerClueImage.onerror = () => {
        hideElement(playerClueImage);
        playerClueImage.removeAttribute('src');
        playerClueImage.alt = '';
      };

      if (clue.image && typeof clue.image === 'string' && clue.image.trim() !== '' && clue.image !== 'null' && clue.image !== 'undefined') {
        playerClueImage.src = clue.image;
        showElement(playerClueImage, 'inline-block');
      } else {
        hideElement(playerClueImage);
        playerClueImage.removeAttribute('src');
        playerClueImage.alt = '';
      }
    }
  }

  function showWinscreen(rankings) {
    if (!playerWinscreenModal) return;
    const sorted = rankings || [];
    const winner = sorted.length > 0 ? sorted[0] : null;

    if (winner) {
      playerWinnerName.innerText = winner.name;
      playerWinnerScore.innerText = `$${winner.score}`;
      if (winner.avatar) {
        playerWinnerAvatar.style.backgroundImage = `url('${winner.avatar}')`;
        playerWinnerAvatar.innerText = '';
      } else {
        playerWinnerAvatar.style.backgroundImage = 'none';
        playerWinnerAvatar.style.background = winner.color || '#fbbf24';
        playerWinnerAvatar.innerText = winner.name.charAt(0).toUpperCase();
      }
    }

    if (playerPodiumStandings) {
      playerPodiumStandings.innerHTML = '';
      sorted.forEach((p, idx) => {
        const row = document.createElement('div');
        row.className = `podium-row rank-${idx + 1}`;
        const medal = idx === 0 ? '1st' : (idx === 1 ? '2nd' : (idx === 2 ? '3rd' : `#${idx + 1}`));
        row.innerHTML = `
          <div class="podium-standing-item w-full">
            <div class="flex-row align-center gap-md">
              <span class="rank-badge rank-badge-${idx + 1}">${medal}</span>
              <span class="podium-standing-name" style="color: ${p.color || '#fff'};">${p.name}</span>
            </div>
            <span class="podium-standing-score" style="color: ${p.score < 0 ? 'var(--color-danger)' : 'var(--jeopardy-gold)'};">$${p.score}</span>
          </div>
        `;
        playerPodiumStandings.appendChild(row);
      });
    }

    playerWinscreenModal.classList.add('active');
    if (window.soundFX) window.soundFX.playWinnerFanfare();
  }

  let unlockedLocalTimestamp = 0;

  // BUZZER BUTTON STATES
  function setBuzzerUnlocked() {
    // Re-check lockout on current clue
    if (currentClueObj && currentClueObj.lockedOutPlayerIds && currentClueObj.lockedOutPlayerIds.includes(playerId)) {
      if (playerCountdownOverlay) playerCountdownOverlay.classList.remove('active');
      setBuzzerLockedOut('You answered incorrectly on this clue.');
      return;
    }

    // Re-check Daily Double lock before unlocking button
    if (currentClueObj && currentClueObj.dailyDouble && currentClueObj.eligiblePlayerId && currentClueObj.eligiblePlayerId !== playerId) {
      setBuzzerLockedOut(`Daily Double locked for ${currentClueObj.eligiblePlayerName || 'selected player'}`);
      return;
    }

    unlockedLocalTimestamp = performance.now();
    buzzerState = 'UNLOCKED';
    btnBuzzer.disabled = false;
    btnBuzzer.className = 'buzzer-btn unlocked';
    btnBuzzer.innerText = 'BUZZ!';
    buzzerStatus.innerText = 'BUZZERS ACTIVE! PRESS NOW!';
    buzzerStatus.style.color = 'var(--color-success)';

    if (currentClueObj) {
      showClueDetails(currentClueObj);
    }
  }

  function setBuzzerWinner(latency, answerSecondsLeft) {
    if (playerCountdownOverlay) playerCountdownOverlay.classList.remove('active');
    buzzerState = 'WINNER';
    btnBuzzer.disabled = true;
    btnBuzzer.className = 'buzzer-btn buzzed-winner';
    btnBuzzer.innerText = 'BUZZED!';
    const sec = answerSecondsLeft !== undefined ? answerSecondsLeft : 7;
    const latLabel = latency > 0 ? ` (${latency}ms)` : '';
    buzzerStatus.innerText = `YOU BUZZED FIRST! Answer now (${sec}s left)${latLabel}`;
    buzzerStatus.style.color = 'var(--jeopardy-gold)';
  }

  function setBuzzerLockedOut(reason) {
    if (playerCountdownOverlay) playerCountdownOverlay.classList.remove('active');
    buzzerState = 'LOCKED_OUT';
    btnBuzzer.disabled = true;
    btnBuzzer.className = 'buzzer-btn';
    btnBuzzer.innerText = 'LOCKED';
    buzzerStatus.innerText = reason || 'Locked out';
    buzzerStatus.style.color = 'var(--text-muted)';
  }

  function setBuzzerLocked(statusText) {
    buzzerState = 'LOCKED';
    btnBuzzer.disabled = false;
    btnBuzzer.className = 'buzzer-btn';
    btnBuzzer.innerText = 'WAIT';
    buzzerStatus.innerText = statusText || 'Waiting...';
    buzzerStatus.style.color = 'var(--text-muted)';
    if (currentClueObj) {
      showClueDetails(currentClueObj);
    }
  }

  // Keyboard Shortcut Listener for Buzzing
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    if (playerJoinModal && playerJoinModal.style.display === 'flex') return;

    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      handleBuzzerPress();
    }
  });

  let lastBuzzTime = 0;

  // Press Buzzer Action
  function handleBuzzerPress() {
    const now = Date.now();
    if (now - lastBuzzTime < 250) return;
    lastBuzzTime = now;

    if (buzzerState === 'WINNER' || buzzerState === 'LOCKED_OUT' || buzzerState === 'BUZZED') {
      return;
    }

    if (currentClueObj && currentClueObj.lockedOutPlayerIds && currentClueObj.lockedOutPlayerIds.includes(playerId)) {
      setBuzzerLockedOut('You answered incorrectly on this clue.');
      return;
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      initWebSocket();
      return;
    }

    const pressTimestamp = performance.now();
    const reactionTimeMs = unlockedLocalTimestamp > 0 
      ? Math.max(50, Math.round(pressTimestamp - unlockedLocalTimestamp)) 
      : 150;

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    if (window.soundFX && buzzerState === 'UNLOCKED') {
      window.soundFX.playBuzzer();
    }

    try {
      ws.send(JSON.stringify({
        type: 'PRESS_BUZZER',
        reactionTimeMs: reactionTimeMs,
        ping: measuredPing
      }));

      if (buzzerState === 'UNLOCKED') {
        buzzerState = 'BUZZED';
        btnBuzzer.disabled = true;
        btnBuzzer.className = 'buzzer-btn';
        btnBuzzer.innerText = 'BUZZED!';
        buzzerStatus.innerText = 'BUZZ TRANSMITTED! Processing...';
        buzzerStatus.style.color = 'var(--jeopardy-gold)';
      }
    } catch (err) {
      console.error('Error sending buzz:', err);
      initWebSocket();
    }
  }

  btnBuzzer.onclick = handleBuzzerPress;
  if (playerCountdownOverlay) {
    playerCountdownOverlay.onclick = handleBuzzerPress;
  }

  // Daily Double Wager Event Listeners for Player Screen
  const playerWagerInput = document.getElementById('playerWagerInput');
  const btnPlayerSubmitWager = document.getElementById('btnPlayerSubmitWager');
  const btnTrueDD = document.getElementById('btnTrueDD');

  if (btnPlayerSubmitWager) {
    btnPlayerSubmitWager.onclick = () => {
      const val = parseInt(playerWagerInput ? playerWagerInput.value : 0, 10);
      if (isNaN(val) || val <= 0) {
        alert('Please enter a valid wager amount ($5 minimum).');
        return;
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'SET_WAGER', wager: val }));
      }
    };
  }

  if (btnTrueDD) {
    btnTrueDD.onclick = () => {
      const maxW = (currentClueObj && currentClueObj.maxWager) || 1000;
      if (playerWagerInput) playerWagerInput.value = maxW;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'SET_WAGER', wager: maxW }));
      }
    };
  }

  const quickBtns = document.querySelectorAll('.dd-quick-btn[data-wager]');
  quickBtns.forEach(btn => {
    btn.onclick = () => {
      const val = parseInt(btn.getAttribute('data-wager'), 10);
      if (playerWagerInput) playerWagerInput.value = val;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'SET_WAGER', wager: val }));
      }
    };
  });

  // Final Jeopardy Event Listeners for Player
  const btnPlayerSubmitFJWager = document.getElementById('btnPlayerSubmitFJWager');
  const playerFJWagerInput = document.getElementById('playerFJWagerInput');

  if (btnPlayerSubmitFJWager) {
    btnPlayerSubmitFJWager.onclick = () => {
      const val = parseInt(playerFJWagerInput ? playerFJWagerInput.value : 0, 10);
      if (isNaN(val) || val < 0) {
        alert('Please enter a valid non-negative wager.');
        return;
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'SUBMIT_FINAL_WAGER', wager: val }));
      }
    };
  }

  const btnPlayerSubmitFJResponse = document.getElementById('btnPlayerSubmitFJResponse');
  const playerFJResponseInput = document.getElementById('playerFJResponseInput');

  if (btnPlayerSubmitFJResponse) {
    btnPlayerSubmitFJResponse.onclick = () => {
      const resp = playerFJResponseInput ? playerFJResponseInput.value.trim() : '';
      if (!resp) {
        alert('Please type your response before submitting.');
        return;
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'SUBMIT_FINAL_RESPONSE', response: resp }));
      }
    };
  }

  // Background Ping measurement loop for accurate network latency compensation
  setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'PING', clientTime: Date.now() }));
    }
  }, 4000);
});
