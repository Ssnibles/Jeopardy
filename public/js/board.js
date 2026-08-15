// TV Board Display Logic
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = (urlParams.get('room') || sessionStorage.getItem('jeopardy_room') || '').toUpperCase();

  if (!roomCode) {
    alert('No room code specified for TV display.');
    window.location.href = '/';
    return;
  }

  const roomBadge = document.getElementById('roomBadge');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const btnExitTV = document.getElementById('btnExitTV');
  const tvBoard = document.getElementById('tvBoard');
  const tvScoreboard = document.getElementById('tvScoreboard');

  if (btnFullscreen) {
    btnFullscreen.onclick = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.log('Fullscreen error:', err);
        });
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    };
  }

  if (btnExitTV) {
    btnExitTV.onclick = () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    };
  }

  const tvClueModal = document.getElementById('tvClueModal');
  const tvCategoryTitle = document.getElementById('tvCategoryTitle');
  const tvClueValue = document.getElementById('tvClueValue');
  const tvClueText = document.getElementById('tvClueText');
  const tvClueImage = document.getElementById('tvClueImage');
  const tvAnswerBox = document.getElementById('tvAnswerBox');
  const tvAnswerText = document.getElementById('tvAnswerText');
  const tvBuzzAlert = document.getElementById('tvBuzzAlert');
  const tvBuzzPlayerName = document.getElementById('tvBuzzPlayerName');
  const tvDailyDoubleBanner = document.getElementById('tvDailyDoubleBanner');
  const tvDailyDoublePlayer = document.getElementById('tvDailyDoublePlayer');
  const tunnelBadge = document.getElementById('tunnelBadge');
  const tunnelUrlText = document.getElementById('tunnelUrlText');

  // Overlays
  const tvCountdownOverlay = document.getElementById('tvCountdownOverlay');
  const tvCountdownNum = document.getElementById('tvCountdownNum');
  const tvWinscreenModal = document.getElementById('tvWinscreenModal');
  const tvWinnerAvatar = document.getElementById('tvWinnerAvatar');
  const tvWinnerName = document.getElementById('tvWinnerName');
  const tvWinnerScore = document.getElementById('tvWinnerScore');
  const tvPodiumStandings = document.getElementById('tvPodiumStandings');

  roomBadge.innerText = `ROOM: ${roomCode}`;

  let gameState = null;
  let ws = null;
  let currentTunnelUrl = null;

  function updateTunnelDisplay() {
    if (!tunnelBadge || !tunnelUrlText) return;
    const publicUrl = (gameState && gameState.publicUrl) !== undefined 
      ? gameState.publicUrl 
      : currentTunnelUrl;
    
    if (publicUrl) {
      currentTunnelUrl = publicUrl;
      tunnelUrlText.innerText = publicUrl;
      tunnelBadge.style.display = 'inline-flex';
    } else {
      tunnelBadge.style.display = 'none';
    }
  }

  // Initial check for active public tunnel
  fetch('/api/tunnel')
    .then(res => res.json())
    .then(data => {
      if (data.publicUrl) {
        currentTunnelUrl = data.publicUrl;
        updateTunnelDisplay();
      }
    })
    .catch(() => {});

  if (tunnelBadge) {
    tunnelBadge.onclick = () => {
      const publicUrl = (gameState && gameState.publicUrl) || currentTunnelUrl;
      if (publicUrl) {
        const playerUrl = `${publicUrl}/player.html?room=${roomCode}`;
        navigator.clipboard.writeText(playerUrl);
        alert(`Public Tunnel Player URL copied to clipboard:\n${playerUrl}`);
      }
    };
  }

  let reconnectTimer = null;
  let reconnectAttempts = 0;
  let pingInterval = null;

  function initBoardWebSocket() {
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

    ws.onopen = () => {
      reconnectAttempts = 0;
      ws.send(JSON.stringify({
        type: 'JOIN_BOARD',
        roomCode
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
      reconnectTimer = setTimeout(initBoardWebSocket, delay);
    };

    ws.onerror = () => {
      try { ws.close(); } catch (e) {}
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'BOARD_JOINED':
          case 'ROOM_STATE':
            gameState = msg.state;
            renderBoard();
            renderScoreboard();
            updateClueModal();
            updateTunnelDisplay();
            checkGameOverState();
            break;

          case 'CLUE_SELECTED':
            gameState = msg.state;
            if (tvBuzzAlert) tvBuzzAlert.style.display = 'none';
            if (tvAnswerBox) tvAnswerBox.style.display = 'none';
            if (tvAnswerText) tvAnswerText.innerText = '';
            renderBoard();
            updateClueModal();
            updateTunnelDisplay();
            break;

          case 'CLUE_CLOSED':
            gameState = msg.state;
            renderBoard();
            tvClueModal.classList.remove('active');
            tvBuzzAlert.style.display = 'none';
            if (tvCountdownOverlay) tvCountdownOverlay.classList.remove('active');
            updateTunnelDisplay();
            checkGameOverState();
            break;

          case 'BUZZER_COUNTDOWN':
            if (tvCountdownOverlay && tvCountdownNum) {
              tvCountdownNum.innerText = msg.secondsLeft;
              tvCountdownOverlay.classList.add('active');
              if (window.soundFX) window.soundFX.playCountdownTick();
            }
            break;

          case 'BUZZERS_UNLOCKED':
            if (gameState) {
              if (!gameState.buzzerState) gameState.buzzerState = {};
              gameState.buzzerState.state = 'UNLOCKED';
            }
            if (tvCountdownOverlay) tvCountdownOverlay.classList.remove('active');
            if (window.soundFX) window.soundFX.playCountdownGo();
            tvBuzzAlert.style.display = 'none';
            updateClueModal();
            break;

          case 'PLAYER_BUZZED':
            if (window.soundFX) window.soundFX.playBuzzer();
            const labelMs = msg.latency ? ` (⚡ ${msg.latency}ms)` : '';
            if (tvBuzzAlert) {
              tvBuzzAlert.style.background = 'var(--jeopardy-gold)';
              tvBuzzAlert.style.color = '#000000';
              tvBuzzAlert.innerHTML = `<span id="tvBuzzPlayerName">${msg.playerName}${labelMs}</span> BUZZED IN!`;
              tvBuzzAlert.style.display = 'inline-block';
            }
            renderScoreboard();
            break;

          case 'ANSWER_EVALUATED':
            gameState = msg.state;
            renderScoreboard();
            updateTunnelDisplay();
            const cName = msg.playerName || 'Contestant';
            const changeAmt = Math.abs(msg.scoreChange || 0);
            if (tvBuzzAlert) {
              tvBuzzAlert.style.display = 'inline-block';
              if (msg.isCorrect) {
                tvBuzzAlert.style.background = 'var(--color-success)';
                tvBuzzAlert.style.color = '#ffffff';
                tvBuzzAlert.innerText = `CORRECT! ${cName} (+$${changeAmt})`;
                if (window.soundFX) window.soundFX.playCorrect();
              } else {
                tvBuzzAlert.style.background = 'var(--color-danger)';
                tvBuzzAlert.style.color = '#ffffff';
                tvBuzzAlert.innerText = `INCORRECT! ${cName} (-$${changeAmt})`;
                if (window.soundFX) window.soundFX.playWrong();
              }
            }
            const revealedAnswer = msg.answer || (gameState.currentClue && gameState.currentClue.answer);
            if (revealedAnswer) {
              tvAnswerBox.style.display = 'block';
              tvAnswerText.innerText = revealedAnswer;
            }
            updateClueModal();
            checkGameOverState();
            break;

          case 'ANSWER_REVEALED':
            tvAnswerBox.style.display = 'block';
            tvAnswerText.innerText = msg.answer;
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

  initBoardWebSocket();

  function renderBoard() {
    if (!gameState || !gameState.categories) return;

    tvBoard.innerHTML = '';
    gameState.categories.forEach((cat, catIdx) => {
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
        if (gameState.boardState && gameState.boardState[key]) {
          card.classList.add('revealed');
        } else {
          card.innerText = `$${clueObj.value}`;
        }
        col.appendChild(card);
      });

      tvBoard.appendChild(col);
    });
  }

  function updateClueModal() {
    if (!gameState || !gameState.currentClue) {
      tvClueModal.classList.remove('active');
      tvBuzzAlert.style.display = 'none';
      if (tvDailyDoubleBanner) tvDailyDoubleBanner.style.display = 'none';
      return;
    }

    const clue = gameState.currentClue;
    tvCategoryTitle.innerText = clue.categoryName;
    tvClueValue.innerText = `$${clue.value}`;

    if (clue.dailyDouble) {
      if (tvDailyDoubleBanner) {
        tvDailyDoubleBanner.style.display = 'block';
        if (tvDailyDoublePlayer) {
          tvDailyDoublePlayer.innerText = clue.eligiblePlayerName 
            ? `Reserved for Contestant: ${clue.eligiblePlayerName}`
            : 'Contestant Daily Double';
        }
      }
      if (window.soundFX && !clue.wagerSet) window.soundFX.playDailyDouble();
    } else {
      if (tvDailyDoubleBanner) tvDailyDoubleBanner.style.display = 'none';
    }

    const isUnlocked = gameState.buzzerState && 
      (gameState.buzzerState.state === 'UNLOCKED' || 
       gameState.buzzerState.state === 'BUZZED' || 
       gameState.buzzerState.state === 'WINNER' || 
       gameState.buzzerState.state === 'LOCKED_OUT');

    if (isUnlocked) {
      tvClueText.innerText = clue.clue;
      tvClueText.style.display = 'block';

      if (tvClueImage) {
        tvClueImage.onerror = () => {
          tvClueImage.style.display = 'none';
          tvClueImage.removeAttribute('src');
          tvClueImage.alt = '';
        };
      }

      if (clue.image && typeof clue.image === 'string' && clue.image.trim() !== '' && clue.image !== 'null' && clue.image !== 'undefined') {
        tvClueImage.src = clue.image;
        tvClueImage.style.display = 'block';
      } else {
        tvClueImage.style.display = 'none';
        tvClueImage.removeAttribute('src');
        tvClueImage.alt = '';
      }
    } else {
      tvClueText.style.display = 'none';
      tvClueText.innerText = '';
      tvClueImage.style.display = 'none';
      tvClueImage.removeAttribute('src');
      tvClueImage.alt = '';
    }

    if (clue.answerRevealed) {
      tvAnswerBox.style.display = 'block';
      if (clue.answer) tvAnswerText.innerText = clue.answer;
    } else {
      tvAnswerBox.style.display = 'none';
      tvAnswerText.innerText = '';
    }

    tvClueModal.classList.add('active');
  }

  function checkGameOverState() {
    if (gameState && gameState.isGameOver) {
      showWinscreen(gameState.rankings);
    } else if (tvWinscreenModal) {
      tvWinscreenModal.classList.remove('active');
    }
  }

  function showWinscreen(rankings) {
    if (!tvWinscreenModal) return;
    const sorted = rankings || (gameState ? gameState.players.sort((a, b) => b.score - a.score) : []);
    const winner = sorted.length > 0 ? sorted[0] : null;

    if (winner) {
      tvWinnerName.innerText = winner.name;
      tvWinnerScore.innerText = `$${winner.score}`;
      if (winner.avatar) {
        tvWinnerAvatar.style.backgroundImage = `url('${winner.avatar}')`;
        tvWinnerAvatar.innerText = '';
      } else {
        tvWinnerAvatar.style.backgroundImage = 'none';
        tvWinnerAvatar.style.background = winner.color || '#fbbf24';
        tvWinnerAvatar.innerText = winner.name.charAt(0).toUpperCase();
      }
    }

    if (tvPodiumStandings) {
      tvPodiumStandings.innerHTML = '';
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
        tvPodiumStandings.appendChild(row);
      });
    }

    tvWinscreenModal.classList.add('active');
    if (window.soundFX) window.soundFX.playWinnerFanfare();
  }

  function renderScoreboard() {
    if (!gameState || !gameState.players) return;
    tvScoreboard.innerHTML = '';

    gameState.players.forEach(p => {
      const card = document.createElement('div');
      card.className = 'player-card';

      if (gameState.buzzerState && gameState.buzzerState.activePlayerId === p.id) {
        card.classList.add('active-buzzer');
      }

      const avatar = document.createElement('div');
      avatar.className = 'player-avatar';
      if (p.avatar) {
        avatar.style.backgroundImage = `url('${p.avatar}')`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
        avatar.innerText = '';
      } else {
        avatar.style.background = p.color;
        avatar.innerText = p.name.charAt(0).toUpperCase();
      }

      const name = document.createElement('div');
      name.className = 'player-name';
      name.style.color = p.color || '#ffffff';
      name.innerText = p.name;

      const score = document.createElement('div');
      score.className = 'player-score';
      score.innerText = `$${p.score}`;
      if (p.score < 0) score.style.color = 'var(--color-danger)';

      card.appendChild(avatar);
      card.appendChild(name);
      card.appendChild(score);

      tvScoreboard.appendChild(card);
    });
  }
});
