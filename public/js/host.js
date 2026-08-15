// Host Controller Script
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get('room') || sessionStorage.getItem('jeopardy_room');

  if (!roomCode) {
    alert('No room code provided. Returning to lobby.');
    window.location.href = '/';
    return;
  }

  // DOM Elements - Header & Nav
  const roomBadge = document.getElementById('roomBadge');
  const btnCopyInvite = document.getElementById('btnCopyInvite');
  const linkTV = document.getElementById('linkTV');
  const hostBoard = document.getElementById('hostBoard');
  const playersList = document.getElementById('playersList');
  const playerCount = document.getElementById('playerCount');
  const btnToggleMusic = document.getElementById('btnToggleMusic');
  const btnTriggerGameOver = document.getElementById('btnTriggerGameOver');

  // Clue Control Panel Elements
  const hostClueControlPanel = document.getElementById('hostClueControlPanel');
  const activeClueCategory = document.getElementById('activeClueCategory');
  const activeClueValue = document.getElementById('activeClueValue');
  const activeClueText = document.getElementById('activeClueText');
  const activeClueAnswer = document.getElementById('activeClueAnswer');
  const answerText = document.getElementById('answerText');
  const btnUnlockBuzzers = document.getElementById('btnUnlockBuzzers');
  const btnInstantUnlock = document.getElementById('btnInstantUnlock');
  const btnResetBuzzers = document.getElementById('btnResetBuzzers');
  const btnCloseClue = document.getElementById('btnCloseClue');

  // Daily Double Elements
  const dailyDoubleForm = document.getElementById('dailyDoubleForm');
  const ddPlayerSelect = document.getElementById('ddPlayerSelect');
  const wagerInput = document.getElementById('wagerInput');
  const btnSetWager = document.getElementById('btnSetWager');

  // Buzz Winner Elements
  const buzzWinnerBox = document.getElementById('buzzWinnerBox');
  const buzzWinnerName = document.getElementById('buzzWinnerName');
  const btnMarkCorrect = document.getElementById('btnMarkCorrect');
  const btnMarkWrong = document.getElementById('btnMarkWrong');
  const clueValSpans = document.querySelectorAll('.clueValSpan');

  // Countdown & Winscreen Overlays
  const hostCountdownOverlay = document.getElementById('hostCountdownOverlay');
  const hostCountdownNum = document.getElementById('hostCountdownNum');

  const hostWinscreenModal = document.getElementById('hostWinscreenModal');
  const hostWinnerAvatar = document.getElementById('hostWinnerAvatar');
  const hostWinnerName = document.getElementById('hostWinnerName');
  const hostWinnerScore = document.getElementById('hostWinnerScore');
  const hostPodiumStandings = document.getElementById('hostPodiumStandings');
  const btnDismissWinscreen = document.getElementById('btnDismissWinscreen');
  const hostAnswerTimerBadge = document.getElementById('hostAnswerTimerBadge');

  // NEW GAME MODAL LOGIC
  const btnOpenNewGameModal = document.getElementById('btnOpenNewGameModal');
  const newGameModal = document.getElementById('newGameModal');
  const btnCloseNewGameModal = document.getElementById('btnCloseNewGameModal');
  const btnCancelNewGame = document.getElementById('btnCancelNewGame');
  const btnConfirmStartNewGame = document.getElementById('btnConfirmStartNewGame');
  const modalPackSelect = document.getElementById('modalPackSelect');
  const modalCustomPackFile = document.getElementById('modalCustomPackFile');
  const modalPackStatus = document.getElementById('modalPackStatus');
  const modalGameModeInput = document.getElementById('modalGameModeInput');
  const modalModeToggleGroup = document.getElementById('modalModeToggleGroup');
  const chkKeepPlayers = document.getElementById('chkKeepPlayers');

  const modalPackSelectRound2 = document.getElementById('modalPackSelectRound2');
  const modalRound2Group = document.getElementById('modalRound2Group');

  const modalPackPreviewTitle = document.getElementById('modalPackPreviewTitle');
  const modalPackPreviewBadge = document.getElementById('modalPackPreviewBadge');
  const modalPackPreviewList = document.getElementById('modalPackPreviewList');
  const btnModalPreviewTabRound1 = document.getElementById('btnModalPreviewTabRound1');
  const btnModalPreviewTabRound2 = document.getElementById('btnModalPreviewTabRound2');

  let modalPacksData = [];
  let modalActivePackR1 = null;
  let modalActivePackR2 = null;
  let modalActivePreviewTab = 'round1';

  // Modal preview tab handlers
  if (btnModalPreviewTabRound1) {
    btnModalPreviewTabRound1.onclick = () => {
      modalActivePreviewTab = 'round1';
      btnModalPreviewTabRound1.classList.add('active', 'btn-gold');
      if (btnModalPreviewTabRound2) btnModalPreviewTabRound2.classList.remove('active', 'btn-gold');
      renderModalActivePreview();
    };
  }

  if (btnModalPreviewTabRound2) {
    btnModalPreviewTabRound2.onclick = () => {
      modalActivePreviewTab = 'round2';
      btnModalPreviewTabRound2.classList.add('active', 'btn-gold');
      if (btnModalPreviewTabRound1) btnModalPreviewTabRound1.classList.remove('active', 'btn-gold');
      renderModalActivePreview();
    };
  }

  function getModalPackCategories(pack, roundKey) {
    if (!pack) return [];
    if (roundKey === 'round1' && pack.round1 && Array.isArray(pack.round1.categories)) {
      return pack.round1.categories;
    }
    if (roundKey === 'round2' && pack.round2 && Array.isArray(pack.round2.categories)) {
      return pack.round2.categories;
    }
    if (Array.isArray(pack.categories)) {
      return pack.categories;
    }
    return [];
  }

  function renderModalActivePreview() {
    const isR1 = modalActivePreviewTab === 'round1';
    const targetPack = isR1 ? modalActivePackR1 : modalActivePackR2;
    const tabLabel = isR1 ? 'Round 1 (Jeopardy!)' : 'Round 2 (Double Jeopardy!)';
    renderModalPackPreview(targetPack, tabLabel);
  }

  function renderModalPackPreview(pack, roundLabel = 'Round 1 (Jeopardy!)') {
    if (!modalPackPreviewList) return;
    const categories = getModalPackCategories(pack, modalActivePreviewTab);

    if (!categories || categories.length === 0) {
      if (modalPackPreviewTitle) modalPackPreviewTitle.innerText = `${roundLabel} Preview`;
      if (modalPackPreviewBadge) modalPackPreviewBadge.innerText = '0 Categories • 0 Clues';
      modalPackPreviewList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem;">No questions available for this round preview.</div>';
      return;
    }

    const titleText = (pack && pack.title) ? `${pack.title} (${roundLabel})` : `${roundLabel} Preview`;
    if (modalPackPreviewTitle) modalPackPreviewTitle.innerText = titleText;

    let totalClues = 0;
    categories.forEach(c => {
      if (c.clues) totalClues += c.clues.length;
    });

    if (modalPackPreviewBadge) modalPackPreviewBadge.innerText = `${categories.length} Categories • ${totalClues} Clues`;

    let html = '';
    categories.forEach((cat, cIdx) => {
      html += `
        <div class="preview-category-card">
          <div class="preview-category-name">${cIdx + 1}. ${escapeHtmlHost(cat.name)}</div>
      `;
      if (cat.clues && Array.isArray(cat.clues)) {
        cat.clues.forEach(clue => {
          html += `
            <div class="preview-clue-item">
              <span class="preview-clue-val">$${clue.value}</span>
              <span class="preview-clue-text">${escapeHtmlHost(clue.clue)}</span>
              <span class="preview-clue-ans">A: ${escapeHtmlHost(clue.answer)}</span>
            </div>
          `;
        });
      }
      html += `</div>`;
    });

    modalPackPreviewList.innerHTML = html;
  }

  function escapeHtmlHost(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  if (modalModeToggleGroup && modalGameModeInput) {
    const btns = modalModeToggleGroup.querySelectorAll('.mode-toggle-btn');
    btns.forEach(btn => {
      btn.onclick = () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-mode') || 'STANDARD';
        modalGameModeInput.value = mode;

        if (modalRound2Group) {
          modalRound2Group.style.display = mode === 'STANDARD' ? 'block' : 'none';
        }
        if (btnModalPreviewTabRound2) {
          btnModalPreviewTabRound2.style.display = mode === 'STANDARD' ? 'inline-block' : 'none';
        }
      };
    });
  }

  if (modalPackSelect) {
    modalPackSelect.onchange = () => {
      const selectedFn = modalPackSelect.value;
      const found = modalPacksData.find(p => p.filename === selectedFn);
      if (found && found.packData) {
        modalActivePackR1 = found.packData;
        renderModalActivePreview();
      }
    };
  }

  if (modalPackSelectRound2) {
    modalPackSelectRound2.onchange = () => {
      const selectedFn = modalPackSelectRound2.value;
      const found = modalPacksData.find(p => p.filename === selectedFn);
      if (found && found.packData) {
        modalActivePackR2 = found.packData;
        renderModalActivePreview();
      }
    };
  }

  function loadAvailablePacksIntoModal() {
    if (!modalPackSelect) return;
    fetch('/api/packs')
      .then(res => res.json())
      .then(data => {
        if (data && data.packs && data.packs.length > 0) {
          modalPacksData = data.packs;
          modalPackSelect.innerHTML = '';
          if (modalPackSelectRound2) modalPackSelectRound2.innerHTML = '';

          data.packs.forEach((pack, idx) => {
            const opt1 = document.createElement('option');
            opt1.value = pack.filename;
            opt1.innerText = pack.title;
            modalPackSelect.appendChild(opt1);

            if (modalPackSelectRound2) {
              const opt2 = document.createElement('option');
              opt2.value = pack.filename;
              opt2.innerText = pack.title;
              if (idx === Math.min(1, data.packs.length - 1)) opt2.selected = true;
              modalPackSelectRound2.appendChild(opt2);
            }
          });

          if (data.packs[0] && data.packs[0].packData) {
            modalActivePackR1 = data.packs[0].packData;
          }
          if (data.packs.length > 1 && data.packs[1].packData) {
            modalActivePackR2 = data.packs[1].packData;
          } else {
            modalActivePackR2 = modalActivePackR1;
          }
          renderModalActivePreview();
        }
      })
      .catch(err => console.error('Failed to load pack list:', err));
  }

  loadAvailablePacksIntoModal();

  const modalCustomPackFileRound2 = document.getElementById('modalCustomPackFileRound2');
  const modalPackStatusRound2 = document.getElementById('modalPackStatusRound2');
  let customModalUploadedPackR1 = null;
  let customModalUploadedPackR2 = null;

  if (btnOpenNewGameModal) {
    btnOpenNewGameModal.onclick = () => {
      customModalUploadedPackR1 = null;
      customModalUploadedPackR2 = null;
      if (modalPackStatus) modalPackStatus.style.display = 'none';
      if (modalPackStatusRound2) modalPackStatusRound2.style.display = 'none';
      renderModalActivePreview();
      if (newGameModal) newGameModal.classList.add('active');
    };
  }

  function closeNewGameModal() {
    if (newGameModal) newGameModal.classList.remove('active');
  }

  if (btnCloseNewGameModal) btnCloseNewGameModal.onclick = closeNewGameModal;
  if (btnCancelNewGame) btnCancelNewGame.onclick = closeNewGameModal;

  if (modalCustomPackFile) {
    modalCustomPackFile.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed && (parsed.categories || parsed.round1)) {
            customModalUploadedPackR1 = parsed;
            modalActivePackR1 = parsed;

            if (parsed.round2 && parsed.round2.categories) {
              customModalUploadedPackR2 = parsed;
              modalActivePackR2 = parsed;
              if (modalPackStatusRound2) {
                modalPackStatusRound2.style.display = 'block';
                modalPackStatusRound2.innerText = `Loaded R2 from file: "${parsed.round2.title || parsed.title || file.name}"`;
              }
            }

            if (modalPackStatus) {
              modalPackStatus.style.display = 'block';
              modalPackStatus.innerText = `Loaded R1: "${parsed.title || file.name}"`;
            }
            renderModalActivePreview();
          } else {
            alert('Invalid Jeopardy pack structure.');
          }
        } catch (err) {
          alert('Error reading JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
  }

  if (modalCustomPackFileRound2) {
    modalCustomPackFileRound2.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed && (parsed.categories || parsed.round2 || parsed.round1)) {
            customModalUploadedPackR2 = parsed;
            modalActivePackR2 = parsed;
            if (modalPackStatusRound2) {
              modalPackStatusRound2.style.display = 'block';
              modalPackStatusRound2.innerText = `Loaded R2: "${parsed.title || file.name}"`;
            }
            renderModalActivePreview();
          } else {
            alert('Invalid Jeopardy pack structure.');
          }
        } catch (err) {
          alert('Error reading JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
  }

  if (btnConfirmStartNewGame) {
    btnConfirmStartNewGame.onclick = () => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return alert('WebSocket not connected to server.');
      }

      const mode = modalGameModeInput ? modalGameModeInput.value : 'STANDARD';
      const keep = chkKeepPlayers ? chkKeepPlayers.checked : true;

      const payload = {
        type: 'CHANGE_GAME_PACK',
        gameMode: mode,
        keepPlayers: keep
      };

      if (customModalUploadedPackR1 || customModalUploadedPackR2) {
        payload.gamePackRound1 = customModalUploadedPackR1 || customModalUploadedPackR2;
        if (mode === 'STANDARD') {
          payload.gamePackRound2 = customModalUploadedPackR2 || customModalUploadedPackR1;
        }
      } else {
        payload.packFileNameRound1 = modalPackSelect ? modalPackSelect.value : null;
        if (mode === 'STANDARD') {
          payload.packFileNameRound2 = modalPackSelectRound2 ? modalPackSelectRound2.value : null;
        }
      }

      ws.send(JSON.stringify(payload));
      closeNewGameModal();
    };
  }

  roomBadge.innerText = `ROOM: ${roomCode}`;
  linkTV.href = `/board.html?room=${roomCode}`;

  const btnPublicTunnel = document.getElementById('btnPublicTunnel');
  let currentPublicUrl = null;

  // Check public tunnel status
  fetch('/api/tunnel')
    .then(res => res.json())
    .then(data => {
      if (data.publicUrl) {
        currentPublicUrl = data.publicUrl;
        if (btnPublicTunnel) {
          btnPublicTunnel.innerText = 'Internet Link Active';
          btnPublicTunnel.className = 'btn btn-success';
        }
      }
    }).catch(() => {});

  if (btnPublicTunnel) {
    btnPublicTunnel.onclick = async () => {
      if (currentPublicUrl) {
        const publicPlayerLink = `${currentPublicUrl}/player.html?room=${roomCode}`;
        navigator.clipboard.writeText(publicPlayerLink);
        alert(`Public Internet Invite Link copied to clipboard:\n${publicPlayerLink}`);
        return;
      }

      btnPublicTunnel.innerText = 'Opening Public Tunnel...';
      try {
        const res = await fetch('/api/tunnel/start');
        const json = await res.json();
        if (json.success && json.publicUrl) {
          currentPublicUrl = json.publicUrl;
          btnPublicTunnel.innerText = 'Internet Link Active';
          btnPublicTunnel.className = 'btn btn-success';
          const publicPlayerLink = `${currentPublicUrl}/player.html?room=${roomCode}`;
          navigator.clipboard.writeText(publicPlayerLink);
          alert(`Public Internet Tunnel active!\nInvite Link copied:\n${publicPlayerLink}`);
        } else {
          alert('Could not start public tunnel.');
          btnPublicTunnel.innerText = 'Enable Internet Access';
        }
      } catch (err) {
        alert('Tunnel error: ' + err.message);
        btnPublicTunnel.innerText = 'Enable Internet Access';
      }
    };
  }

  btnCopyInvite.onclick = () => {
    const inviteUrl = currentPublicUrl 
      ? `${currentPublicUrl}/player.html?room=${roomCode}`
      : `${window.location.origin}/player.html?room=${roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    alert(`Invite link copied to clipboard:\n${inviteUrl}`);
  };

  // Music toggle handler
  if (btnToggleMusic) {
    btnToggleMusic.onclick = () => {
      if (!window.soundFX) return;
      if (window.soundFX.isMusicPlaying) {
        window.soundFX.stopThinkMusic();
        btnToggleMusic.classList.remove('active');
        btnToggleMusic.innerText = 'Think Music';
      } else {
        window.soundFX.startThinkMusic();
        btnToggleMusic.classList.add('active');
        btnToggleMusic.innerText = 'Playing Music';
      }
    };
  }

  // State
  let gameState = null;
  let fullGamePack = null;
  let ws = null;
  let reconnectTimer = null;
  let reconnectAttempts = 0;
  let pingInterval = null;

  function initHostWebSocket() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (pingInterval) clearInterval(pingInterval);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try { ws.close(); } catch (e) {}
    }
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    const packStr = sessionStorage.getItem('jeopardy_pack');
    let loadedPack = null;
    if (packStr) {
      try { loadedPack = JSON.parse(packStr); } catch (e) {}
    }

    ws.onopen = () => {
      reconnectAttempts = 0;
      ws.send(JSON.stringify({
        type: 'CREATE_ROOM',
        roomCode: roomCode,
        gamePack: loadedPack
      }));

      pingInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          try { ws.send(JSON.stringify({ type: 'PING' })); } catch (e) {}
        }
      }, 10000);
    };

    ws.onclose = () => {
      if (pingInterval) clearInterval(pingInterval);
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000);
      reconnectTimer = setTimeout(initHostWebSocket, delay);
    };

    ws.onerror = () => {
      try { ws.close(); } catch (e) {}
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'ROOM_CREATED':
            gameState = msg.state;
            fullGamePack = msg.fullPack;
            renderHostBoard();
            renderPlayers();
            updateActiveClueUI();
            checkGameOverDisplay();
            break;

          case 'ROOM_STATE':
          case 'CLUE_CLOSED':
          case 'FINAL_JEOPARDY_STARTED':
          case 'WAGER_SET':
            gameState = msg.state;
            if (hostCountdownOverlay) hostCountdownOverlay.classList.remove('active');
            renderHostBoard();
            renderPlayers();
            updateActiveClueUI();
            renderHostFinalJeopardy(gameState);
            checkGameOverDisplay();
            break;

          case 'ROUND_TRANSITION':
            gameState = msg.state;
            if (hostCountdownOverlay) hostCountdownOverlay.classList.remove('active');
            renderHostBoard();
            renderPlayers();
            updateActiveClueUI();
            if (window.soundFX) window.soundFX.playWinnerFanfare();
            break;

          case 'CLUE_SELECTED':
            gameState = msg.state;
            renderPlayers();
            updateActiveClueUI();
            break;

          case 'HOST_CLUE_DETAILS':
            if (gameState && gameState.currentClue) {
              gameState.currentClue.answer = msg.clue.answer;
              answerText.innerText = msg.clue.answer;
            }
            break;

          case 'BUZZER_COUNTDOWN':
            if (hostCountdownOverlay && hostCountdownNum) {
              hostCountdownNum.innerText = msg.secondsLeft;
              hostCountdownOverlay.classList.add('active');
              if (window.soundFX) window.soundFX.playCountdownTick();
            }
            break;

          case 'BUZZERS_UNLOCKED':
            if (msg.state) gameState = msg.state;
            else if (gameState) gameState.buzzerState.state = 'UNLOCKED';
            if (hostCountdownOverlay) hostCountdownOverlay.classList.remove('active');
            if (window.soundFX) window.soundFX.playCountdownGo();
            btnUnlockBuzzers.disabled = true;
            btnUnlockBuzzers.innerText = 'BUZZERS ACTIVE';
            renderPlayers();
            break;

          case 'ANSWER_TIMER_TICK':
            if (hostAnswerTimerBadge) {
              hostAnswerTimerBadge.innerText = `${msg.secondsLeft}s`;
              hostAnswerTimerBadge.style.background = 'rgba(239, 68, 68, 0.2)';
            }
            if (window.soundFX && msg.secondsLeft <= 3) {
              window.soundFX.playCountdownTick();
            }
            break;

          case 'ANSWER_TIMER_EXPIRED':
            if (hostAnswerTimerBadge) {
              hostAnswerTimerBadge.innerText = '0s (TIME EXPIRED)';
              hostAnswerTimerBadge.style.background = 'var(--color-danger)';
            }
            if (window.soundFX) window.soundFX.playCountdownGo();
            if (msg.state) gameState = msg.state;
            buzzWinnerBox.style.display = 'block';
            if (msg.activePlayerName) {
              buzzWinnerName.innerText = `${msg.activePlayerName} - TIME EXPIRED! (Evaluate Answer)`;
            }
            break;

          case 'PLAYER_BUZZED':
            if (gameState) {
              gameState.buzzerState = msg.buzzerState;
            }
            if (window.soundFX) window.soundFX.playBuzzer();
            showBuzzWinner(msg.playerName, msg.latency, msg.compensated, msg.answerSecondsLeft);
            break;

          case 'ANSWER_EVALUATED':
            gameState = msg.state;
            renderHostBoard();
            if (msg.isCorrect) {
              if (window.soundFX) window.soundFX.playCorrect();
            } else {
              if (window.soundFX) window.soundFX.playWrong();
            }
            buzzWinnerBox.style.display = 'none';
            btnUnlockBuzzers.disabled = false;
            btnUnlockBuzzers.innerText = 'UNLOCK BUZZERS (3s)';
            renderPlayers();
            checkGameOverDisplay();
            break;

          case 'ANSWER_REVEALED':
            activeClueAnswer.style.display = 'block';
            answerText.innerText = msg.answer;
            break;

          case 'GAME_OVER':
            gameState = msg.state;
            showWinscreen(msg.rankings || (msg.state ? msg.state.rankings : []));
            break;
        }
      } catch (err) {
        console.error('WS Error:', err);
      }
    };
  }

  initHostWebSocket();

  const btnAdvanceRound = document.getElementById('btnAdvanceRound');
  if (btnAdvanceRound) {
    btnAdvanceRound.onclick = () => {
      if (confirm('Advance to the next round now?')) {
        ws.send(JSON.stringify({ type: 'ADVANCE_ROUND' }));
      }
    };
  }

  // Render Host Jeopardy Board Grid
  function renderHostBoard() {
    if (!gameState) return;

    const hostRoundBadge = document.getElementById('hostRoundBadge');
    const btnAdvance = document.getElementById('btnAdvanceRound');

    if (hostRoundBadge) {
      hostRoundBadge.innerText = gameState.roundTitle || 'Jeopardy! Round';
    }

    if (btnAdvance) {
      if (gameState.currentRound === 'JEOPARDY') {
        btnAdvance.style.display = 'inline-block';
        btnAdvance.innerText = 'Advance to Double Jeopardy →';
      } else if (gameState.currentRound === 'DOUBLE_JEOPARDY') {
        btnAdvance.style.display = 'inline-block';
        btnAdvance.innerText = 'Advance to Final Jeopardy →';
      } else {
        btnAdvance.style.display = 'none';
      }
    }

    hostBoard.innerHTML = '';
    const categories = gameState.categories || [];

    if (categories.length === 0) {
      hostBoard.innerHTML = '<div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--text-muted); font-weight: 700;">No board categories active in current round.</div>';
      return;
    }

    hostBoard.style.gridTemplateColumns = `repeat(${categories.length}, 1fr)`;

    categories.forEach((cat, catIdx) => {
      const col = document.createElement('div');
      col.className = 'board-column';

      const header = document.createElement('div');
      header.className = 'category-header';
      header.innerText = cat.name;
      col.appendChild(header);

      (cat.clues || []).forEach((clueObj, clueIdx) => {
        const card = document.createElement('div');
        card.className = 'clue-card';

        const key = `${catIdx}-${clueIdx}`;
        if (gameState.boardState && gameState.boardState[key]) {
          card.classList.add('revealed');
          card.innerText = '';
        } else {
          card.innerText = `$${clueObj.value}`;
          card.onclick = () => {
            ws.send(JSON.stringify({
              type: 'SELECT_CLUE',
              catIndex: catIdx,
              clueIndex: clueIdx
            }));
          };
        }
        col.appendChild(card);
      });

      hostBoard.appendChild(col);
    });
  }

  // Update Active Clue Controls & Daily Double UI
  function updateActiveClueUI() {
    if (!gameState || !gameState.currentClue) {
      hostClueControlPanel.style.display = 'none';
      buzzWinnerBox.style.display = 'none';
      return;
    }

    const c = gameState.currentClue;
    hostClueControlPanel.style.display = 'block';
    if (activeClueCategory) activeClueCategory.innerText = c.categoryName;
    if (activeClueValue) activeClueValue.innerText = `$${c.value}`;
    if (activeClueText) activeClueText.innerText = c.clue;
    if (activeClueAnswer) activeClueAnswer.style.display = 'block';
    if (c.answer && answerText) {
      answerText.innerText = c.answer;
    }

    const effectiveVal = c.wager || c.value;
    const clueValSpans = document.querySelectorAll('.clueValSpan');
    clueValSpans.forEach(s => s.innerText = `$${effectiveVal}`);

    if (c.dailyDouble) {
      if (!c.wagerSet) {
        dailyDoubleForm.style.display = 'block';
        buzzWinnerBox.style.display = 'none';
        btnUnlockBuzzers.style.display = 'none';
        if (btnInstantUnlock) btnInstantUnlock.style.display = 'none';
        updateDailyDoublePlayersDropdown(c.eligiblePlayerId);

        const maxW = c.maxWager || 1000;
        if (wagerInput) {
          wagerInput.placeholder = `Enter wager ($5 to $${maxW})`;
        }
        if (window.soundFX) window.soundFX.playDailyDouble();
      } else {
        dailyDoubleForm.style.display = 'none';
        btnUnlockBuzzers.style.display = 'none';
        if (btnInstantUnlock) btnInstantUnlock.style.display = 'none';

        // Automatically present evaluation box for Daily Double player
        buzzWinnerName.innerText = `${c.eligiblePlayerName || 'Contestant'} (Daily Double Wager: $${c.wager})`;
        buzzWinnerBox.style.display = 'block';
      }
    } else {
      dailyDoubleForm.style.display = 'none';
      btnUnlockBuzzers.style.display = 'inline-block';
      if (btnInstantUnlock) btnInstantUnlock.style.display = 'inline-block';
    }

    if (gameState.buzzerState && gameState.buzzerState.state === 'UNLOCKED') {
      btnUnlockBuzzers.disabled = true;
      btnUnlockBuzzers.innerText = 'BUZZERS ACTIVE';
    } else {
      btnUnlockBuzzers.disabled = false;
      btnUnlockBuzzers.innerText = 'UNLOCK BUZZERS (3s)';
    }
  }

  // Populate Daily Double player selector
  function updateDailyDoublePlayersDropdown(selectedId) {
    if (!gameState || !ddPlayerSelect) return;
    ddPlayerSelect.innerHTML = '';

    if (gameState.players.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.innerText = 'No players connected';
      ddPlayerSelect.appendChild(opt);
      return;
    }

    gameState.players.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      const isCtrl = p.id === gameState.controllingPlayerId ? ' (Board Control)' : '';
      opt.innerText = `${p.name} (Score: $${p.score})${isCtrl}`;
      if (selectedId ? (p.id === selectedId) : (p.id === gameState.controllingPlayerId)) {
        opt.selected = true;
      }
      ddPlayerSelect.appendChild(opt);
    });
  }

  if (ddPlayerSelect) {
    ddPlayerSelect.onchange = () => {
      const selectedId = ddPlayerSelect.value;
      if (selectedId && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'SET_DAILY_DOUBLE_PLAYER',
          playerId: selectedId
        }));
      }
    };
  }

  function showBuzzWinner(name, latency, compensated, secondsLeft) {
    const label = compensated ? `${latency}ms reaction` : `${latency}ms`;
    buzzWinnerName.innerText = `${name} Buzzed In! (${label})`;
    if (hostAnswerTimerBadge) {
      hostAnswerTimerBadge.innerText = `${secondsLeft || 7}s`;
    }
    buzzWinnerBox.style.display = 'block';
  }

  // Clue Buttons Listeners
  btnUnlockBuzzers.onclick = () => {
    ws.send(JSON.stringify({ type: 'START_BUZZER_COUNTDOWN', duration: 3 }));
  };

  if (btnInstantUnlock) {
    btnInstantUnlock.onclick = () => {
      ws.send(JSON.stringify({ type: 'UNLOCK_BUZZERS', instant: true }));
    };
  }

  btnResetBuzzers.onclick = () => {
    buzzWinnerBox.style.display = 'none';
    ws.send(JSON.stringify({ type: 'RESET_BUZZERS' }));
  };

  btnCloseClue.onclick = () => {
    ws.send(JSON.stringify({ type: 'CLOSE_CLUE' }));
  };

  btnSetWager.onclick = () => {
    const wagerVal = parseInt(wagerInput.value, 10);
    if (!wagerVal || wagerVal <= 0) return alert('Enter valid wager amount.');
    ws.send(JSON.stringify({ type: 'SET_WAGER', wager: wagerVal }));
  };

  btnMarkCorrect.onclick = () => {
    ws.send(JSON.stringify({ type: 'EVALUATE_ANSWER', isCorrect: true }));
  };

  btnMarkWrong.onclick = () => {
    ws.send(JSON.stringify({ type: 'EVALUATE_ANSWER', isCorrect: false }));
  };

  if (btnTriggerGameOver) {
    btnTriggerGameOver.onclick = () => {
      if (confirm('Display full celebratory Winner Screen now?')) {
        ws.send(JSON.stringify({ type: 'TRIGGER_GAME_OVER' }));
      }
    };
  }

  if (btnResetGame) {
    btnResetGame.onclick = () => {
      if (confirm('Reset game board and all player scores to $0 for a new game?')) {
        hostWinscreenModal.classList.remove('active');
        ws.send(JSON.stringify({ type: 'RESET_GAME' }));
      }
    };
  }

  if (btnDismissWinscreen) {
    btnDismissWinscreen.onclick = () => {
      hostWinscreenModal.classList.remove('active');
    };
  }

  function checkGameOverDisplay() {
    if (gameState && gameState.isGameOver) {
      showWinscreen(gameState.rankings);
    }
  }

  function showWinscreen(rankings) {
    if (!hostWinscreenModal) return;
    const sorted = rankings || (gameState ? [...gameState.players].sort((a, b) => b.score - a.score) : []);
    const winner = sorted.length > 0 ? sorted[0] : null;

    if (winner) {
      hostWinnerName.innerText = winner.name;
      hostWinnerScore.innerText = `$${winner.score}`;
      if (winner.avatar) {
        hostWinnerAvatar.style.backgroundImage = `url('${winner.avatar}')`;
        hostWinnerAvatar.innerText = '';
      } else {
        hostWinnerAvatar.style.backgroundImage = 'none';
        hostWinnerAvatar.style.background = winner.color || '#fbbf24';
        hostWinnerAvatar.innerText = winner.name.charAt(0).toUpperCase();
      }
    } else {
      hostWinnerName.innerText = 'No Contestants';
      hostWinnerScore.innerText = '$0';
    }

    if (hostPodiumStandings) {
      hostPodiumStandings.innerHTML = '';
      sorted.forEach((p, idx) => {
        const row = document.createElement('div');
        row.className = `podium-row rank-${idx + 1}`;
        const medal = idx === 0 ? '1st' : (idx === 1 ? '2nd' : (idx === 2 ? '3rd' : `#${idx + 1}`));
        row.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-weight: 900; font-size: 1.1rem; min-width: 55px; color: var(--jeopardy-gold);">${medal}</span>
            <span style="font-weight: 800; color: ${p.color || '#fff'}; font-size: 1.05rem;">${p.name}</span>
          </div>
          <span style="font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 1.2rem; color: ${p.score < 0 ? 'var(--color-danger)' : 'var(--jeopardy-gold)'};">$${p.score}</span>
        `;
        hostPodiumStandings.appendChild(row);
      });
    }

    hostWinscreenModal.classList.add('active');
    if (window.soundFX) window.soundFX.playWinnerFanfare();
  }

  // Keyboard Shortcuts Listener for Host
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (gameState && gameState.currentClue) {
        if (buzzWinnerBox.style.display !== 'none' || gameState.buzzerState.state === 'BUZZED') {
          btnResetBuzzers.click();
        } else if (!btnUnlockBuzzers.disabled) {
          if (e.shiftKey) {
            btnInstantUnlock.click();
          } else {
            btnUnlockBuzzers.click();
          }
        }
      }
    } else if (e.key === 'c' || e.key === 'C' || e.key === 'y' || e.key === 'Y') {
      if (buzzWinnerBox.style.display !== 'none') {
        e.preventDefault();
        btnMarkCorrect.click();
      }
    } else if (e.key === 'x' || e.key === 'X' || e.key === 'n' || e.key === 'N') {
      if (buzzWinnerBox.style.display !== 'none') {
        e.preventDefault();
        btnMarkWrong.click();
      }
    } else if (e.key === 'Escape') {
      if (gameState && gameState.currentClue) {
        e.preventDefault();
        btnCloseClue.click();
      }
    }
  });

  // Render Connected Players & Score Controls
  function renderPlayers() {
    if (!gameState) return;
    const players = gameState.players;
    playerCount.innerText = players.length;
    playersList.innerHTML = '';

    if (gameState.currentClue && gameState.currentClue.dailyDouble) {
      updateDailyDoublePlayersDropdown(gameState.currentClue.eligiblePlayerId);
    }

    const activeClueVal = (gameState.currentClue && (gameState.currentClue.wager || gameState.currentClue.value)) || 200;

    players.forEach(p => {
      const card = document.createElement('div');
      card.className = 'host-player-card';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '0.5rem';
      card.style.padding = '0.85rem';

      if (gameState.buzzerState && gameState.buzzerState.activePlayerId === p.id) {
        card.classList.add('active-buzzer');
      }

      const topRow = document.createElement('div');
      topRow.style.display = 'flex';
      topRow.style.alignItems = 'center';
      topRow.style.justifyContent = 'space-between';
      topRow.style.width = '100%';

      const leftInfo = document.createElement('div');
      leftInfo.style.display = 'flex';
      leftInfo.style.alignItems = 'center';
      leftInfo.style.gap = '0.65rem';

      const avatar = document.createElement('div');
      avatar.className = 'player-avatar';
      avatar.style.width = '36px';
      avatar.style.height = '36px';
      avatar.style.fontSize = '0.95rem';

      if (p.avatar) {
        avatar.style.backgroundImage = `url('${p.avatar}')`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
        avatar.innerText = '';
      } else {
        avatar.style.background = p.color || '#3b82f6';
        avatar.innerText = p.name.charAt(0).toUpperCase();
      }

      const details = document.createElement('div');
      const isControlling = gameState.controllingPlayerId ? (p.id === gameState.controllingPlayerId) : false;
      const controlTag = isControlling 
        ? `<span style="font-size: 0.7rem; font-weight: 800; background: var(--jeopardy-gold); color: #000000; padding: 0.15rem 0.45rem; border-radius: 4px; margin-left: 0.4rem; box-shadow: 0 0 8px rgba(251,191,36,0.5);" title="Currently has Board Control">CONTROL</span>`
        : `<button class="btn btn-secondary btn-set-control" data-player-id="${p.id}" style="font-size: 0.65rem; padding: 0.1rem 0.4rem; margin-left: 0.4rem; border-radius: 4px; cursor: pointer; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff;" title="Click to give board control to this player">Give Control</button>`;
      details.innerHTML = `
        <div style="font-weight: 800; font-size: 0.95rem; color: ${p.color || '#ffffff'}; line-height: 1.2; display: flex; align-items: center;">
          ${p.name} ${controlTag} ${p.connected ? '' : '<span style="color: var(--text-muted); font-weight:400; font-size: 0.75rem; margin-left:0.3rem;">(offline)</span>'}
        </div>
      `;

      // Attach click event for Give Control button
      const ctrlBtn = details.querySelector('.btn-set-control');
      if (ctrlBtn) {
        ctrlBtn.onclick = (e) => {
          e.stopPropagation();
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'SET_CONTROLLING_PLAYER', playerId: p.id }));
          }
        };
      }

      leftInfo.appendChild(avatar);
      leftInfo.appendChild(details);

      const scoreDisplay = document.createElement('div');
      scoreDisplay.style.fontFamily = "'Outfit', sans-serif";
      scoreDisplay.style.fontSize = '1.15rem';
      scoreDisplay.style.fontWeight = '800';
      scoreDisplay.style.color = p.score < 0 ? 'var(--color-danger)' : 'var(--jeopardy-gold)';
      scoreDisplay.innerText = `$${p.score}`;

      topRow.appendChild(leftInfo);
      topRow.appendChild(scoreDisplay);

      // Score quick adjustment controls
      const controls = document.createElement('div');
      controls.className = 'score-adjust-group';
      controls.style.display = 'flex';
      controls.style.gap = '0.4rem';
      controls.style.width = '100%';

      const btnPlus = document.createElement('button');
      btnPlus.className = 'btn btn-success score-adjust-btn';
      btnPlus.style.flex = '1';
      btnPlus.innerText = `+${activeClueVal}`;
      btnPlus.title = `Add $${activeClueVal}`;
      btnPlus.onclick = () => adjustScore(p.id, activeClueVal);

      const btnMinus = document.createElement('button');
      btnMinus.className = 'btn btn-danger score-adjust-btn';
      btnMinus.style.flex = '1';
      btnMinus.innerText = `-${activeClueVal}`;
      btnMinus.title = `Deduct $${activeClueVal}`;
      btnMinus.onclick = () => adjustScore(p.id, -activeClueVal);

      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn score-adjust-btn';
      btnEdit.innerText = 'Edit';
      btnEdit.title = 'Custom score adjustment';
      btnEdit.onclick = () => {
        const val = prompt(`Adjust score for ${p.name} (enter amount, e.g. 500 or -300):`, activeClueVal);
        if (val !== null) {
          const delta = parseInt(val, 10);
          if (!isNaN(delta) && delta !== 0) {
            adjustScore(p.id, delta);
          }
        }
      };

      const btnKick = document.createElement('button');
      btnKick.className = 'btn btn-danger score-adjust-btn';
      btnKick.innerText = '✕';
      btnKick.title = `Kick ${p.name} from room`;
      btnKick.onclick = () => {
        if (confirm(`Are you sure you want to kick ${p.name} from this room?`)) {
          ws.send(JSON.stringify({ type: 'KICK_PLAYER', playerId: p.id }));
        }
      };

      controls.appendChild(btnPlus);
      controls.appendChild(btnMinus);
      controls.appendChild(btnEdit);
      controls.appendChild(btnKick);

      card.appendChild(topRow);
      card.appendChild(controls);
      playersList.appendChild(card);
    });
  }

  function adjustScore(playerId, delta) {
    ws.send(JSON.stringify({ type: 'ADJUST_SCORE', playerId, delta }));
  }

  function renderHostFinalJeopardy(state) {
    const hostFJPanel = document.getElementById('hostFJPanel');
    if (!hostFJPanel || !state) return;

    if (!state.finalJeopardy) {
      hostFJPanel.style.display = 'none';
      return;
    }

    const fj = state.finalJeopardy;
    hostFJPanel.style.display = 'block';

    const hostFJCategory = document.getElementById('hostFJCategory');
    const hostFJClue = document.getElementById('hostFJClue');
    const hostFJAnswer = document.getElementById('hostFJAnswer');
    const hostFJStageBadge = document.getElementById('hostFJStageBadge');
    const hostFJPlayerList = document.getElementById('hostFJPlayerList');

    if (hostFJCategory) hostFJCategory.innerText = `CATEGORY: ${fj.category}`;
    if (hostFJClue) hostFJClue.innerText = `CLUE: ${fj.clue || '(Hidden until revealed)'}`;
    if (hostFJAnswer) hostFJAnswer.innerText = `ANSWER: ${fj.answer || ''}`;
    if (hostFJStageBadge) hostFJStageBadge.innerText = `STAGE: ${fj.state}`;

    if (!hostFJPlayerList) return;
    hostFJPlayerList.innerHTML = '';

    (state.players || []).forEach(p => {
      const wager = fj.wagers ? fj.wagers[p.id] : undefined;
      const resp = fj.responses ? fj.responses[p.id] : undefined;
      const evalData = fj.evaluated ? fj.evaluated[p.id] : undefined;

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.background = 'rgba(255, 255, 255, 0.05)';
      row.style.padding = '0.75rem 1rem';
      row.style.borderRadius = 'var(--radius-sm)';

      const nameCol = document.createElement('div');
      nameCol.innerHTML = `<strong style="color: ${p.color || '#fff'};">${p.name}</strong> <span style="color: var(--jeopardy-gold); margin-left: 0.5rem;">($${p.score})</span>`;

      const infoCol = document.createElement('div');
      infoCol.style.display = 'flex';
      infoCol.style.alignItems = 'center';
      infoCol.style.gap = '1rem';

      let statusHtml = `<span>Wager: <strong>${wager !== undefined ? '$' + wager : 'Pending...'}</strong></span>`;
      statusHtml += `<span style="margin-left: 0.5rem;">Response: <strong>${resp !== undefined ? '"' + resp + '"' : 'Pending...'}</strong></span>`;
      infoCol.innerHTML = statusHtml;

      const btnGroup = document.createElement('div');
      btnGroup.style.display = 'flex';
      btnGroup.style.gap = '0.4rem';

      if (evalData) {
        const badge = document.createElement('span');
        badge.className = evalData.isCorrect ? 'btn btn-success' : 'btn btn-danger';
        badge.style.padding = '0.3rem 0.6rem';
        badge.style.fontSize = '0.8rem';
        badge.innerText = evalData.isCorrect ? `Correct (+${evalData.wager})` : `Wrong (-${evalData.wager})`;
        btnGroup.appendChild(badge);
      } else {
        const btnWrong = document.createElement('button');
        btnWrong.className = 'btn btn-danger';
        btnWrong.style.fontSize = '0.8rem';
        btnWrong.style.padding = '0.3rem 0.65rem';
        btnWrong.innerText = 'Incorrect';
        btnWrong.onclick = () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'EVALUATE_FINAL_PLAYER', targetPlayerId: p.id, isCorrect: false }));
          }
        };

        const btnCorrect = document.createElement('button');
        btnCorrect.className = 'btn btn-success';
        btnCorrect.style.fontSize = '0.8rem';
        btnCorrect.style.padding = '0.3rem 0.65rem';
        btnCorrect.innerText = 'Correct';
        btnCorrect.onclick = () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'EVALUATE_FINAL_PLAYER', targetPlayerId: p.id, isCorrect: true }));
          }
        };

        btnGroup.appendChild(btnWrong);
        btnGroup.appendChild(btnCorrect);
      }

      row.appendChild(nameCol);
      row.appendChild(infoCol);
      row.appendChild(btnGroup);
      hostFJPlayerList.appendChild(row);
    });
  }

  const btnHostRevealFJClue = document.getElementById('btnHostRevealFJClue');
  if (btnHostRevealFJClue) {
    btnHostRevealFJClue.onclick = () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'REVEAL_FINAL_CLUE' }));
      }
    };
  }

  const btnHostFinishFJ = document.getElementById('btnHostFinishFJ');
  if (btnHostFinishFJ) {
    btnHostFinishFJ.onclick = () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'FINISH_FINAL_JEOPARDY' }));
      }
    };
  }
});
