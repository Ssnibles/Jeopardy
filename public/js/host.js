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
  const btnResetGame = document.getElementById('btnResetGame');

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
        btnToggleMusic.innerText = '🎵 Think Music';
      } else {
        window.soundFX.startThinkMusic();
        btnToggleMusic.classList.add('active');
        btnToggleMusic.innerText = '🔊 Playing Music';
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
            gameState = msg.state;
            if (hostCountdownOverlay) hostCountdownOverlay.classList.remove('active');
            renderHostBoard();
            renderPlayers();
            updateActiveClueUI();
            checkGameOverDisplay();
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

          case 'PLAYER_BUZZED':
            if (gameState) {
              gameState.buzzerState = msg.buzzerState;
            }
            if (window.soundFX) window.soundFX.playBuzzer();
            showBuzzWinner(msg.playerName, msg.latency, msg.compensated);
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

  // Render Host Jeopardy Board Grid
  function renderHostBoard() {
    if (!gameState || !fullGamePack) return;

    hostBoard.innerHTML = '';
    const categories = fullGamePack.categories;

    categories.forEach((cat, catIdx) => {
      const col = document.createElement('div');
      col.className = 'board-column';

      const header = document.createElement('div');
      header.className = 'category-header';
      header.innerText = cat.name;
      col.appendChild(header);

      cat.clues.forEach((clueObj, clueIdx) => {
        const card = document.createElement('div');
        card.className = 'clue-card';

        const key = `${catIdx}-${clueIdx}`;
        if (gameState.boardState[key]) {
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

    if (c.dailyDouble && !c.wagerSet) {
      dailyDoubleForm.style.display = 'block';
      updateDailyDoublePlayersDropdown(c.eligiblePlayerId);
      if (window.soundFX) window.soundFX.playDailyDouble();
    } else {
      dailyDoubleForm.style.display = 'none';
    }

    if (gameState.buzzerState.state === 'UNLOCKED') {
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
      opt.innerText = `${p.name} (Score: $${p.score})`;
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

  function showBuzzWinner(name, latency, compensated) {
    const label = compensated ? `⚡ ${latency}ms reaction` : `${latency}ms`;
    buzzWinnerName.innerText = `${name} Buzzed In! (${label})`;
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
    const sorted = rankings || (gameState ? gameState.players.sort((a, b) => b.score - a.score) : []);
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
        const medal = idx === 0 ? '🥇 1st' : (idx === 1 ? '🥈 2nd' : (idx === 2 ? '🥉 3rd' : `#${idx + 1}`));
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
      details.innerHTML = `
        <div style="font-weight: 800; font-size: 0.95rem; color: ${p.color || '#ffffff'}; line-height: 1.2;">
          ${p.name} ${p.connected ? '' : '<span style="color: var(--text-muted); font-weight:400; font-size: 0.75rem;">(offline)</span>'}
        </div>
      `;

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
});
