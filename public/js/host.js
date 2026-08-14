// Host Controller Script
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get('room') || sessionStorage.getItem('jeopardy_room');

  if (!roomCode) {
    alert('No room code provided. Returning to lobby.');
    window.location.href = '/';
    return;
  }

  // DOM Elements
  const roomBadge = document.getElementById('roomBadge');
  const btnCopyInvite = document.getElementById('btnCopyInvite');
  const linkTV = document.getElementById('linkTV');
  const hostBoard = document.getElementById('hostBoard');
  const playersList = document.getElementById('playersList');
  const playerCount = document.getElementById('playerCount');

  // Clue control elements
  const hostClueControlPanel = document.getElementById('hostClueControlPanel');
  const activeClueCategory = document.getElementById('activeClueCategory');
  const activeClueValue = document.getElementById('activeClueValue');
  const activeClueText = document.getElementById('activeClueText');
  const activeClueAnswer = document.getElementById('activeClueAnswer');
  const answerText = document.getElementById('answerText');
  const btnUnlockBuzzers = document.getElementById('btnUnlockBuzzers');
  const btnResetBuzzers = document.getElementById('btnResetBuzzers');
  const btnCloseClue = document.getElementById('btnCloseClue');

  const dailyDoubleForm = document.getElementById('dailyDoubleForm');
  const wagerInput = document.getElementById('wagerInput');
  const btnSetWager = document.getElementById('btnSetWager');

  const buzzWinnerBox = document.getElementById('buzzWinnerBox');
  const buzzWinnerName = document.getElementById('buzzWinnerName');
  const btnMarkCorrect = document.getElementById('btnMarkCorrect');
  const btnMarkWrong = document.getElementById('btnMarkWrong');
  const clueValSpans = document.querySelectorAll('.clueValSpan');

  roomBadge.innerText = `ROOM: ${roomCode}`;
  linkTV.href = `/board.html?room=${roomCode}`;

  const btnPublicTunnel = document.getElementById('btnPublicTunnel');
  let currentPublicUrl = null;

  // Check if public tunnel is already active
  fetch('/api/tunnel')
    .then(res => res.json())
    .then(data => {
      if (data.publicUrl) {
        currentPublicUrl = data.publicUrl;
        if (btnPublicTunnel) {
          btnPublicTunnel.innerText = '🌐 Internet Link Active';
          btnPublicTunnel.className = 'btn btn-success';
        }
      }
    }).catch(() => {});

  if (btnPublicTunnel) {
    btnPublicTunnel.onclick = async () => {
      if (currentPublicUrl) {
        const publicPlayerLink = `${currentPublicUrl}/player.html?room=${roomCode}`;
        navigator.clipboard.writeText(publicPlayerLink);
        alert(`🌐 Public Internet Invite Link copied to clipboard:\n${publicPlayerLink}\n\nShare this link with players anywhere outside your network!`);
        return;
      }

      btnPublicTunnel.innerText = '⏳ Opening Public Tunnel...';
      try {
        const res = await fetch('/api/tunnel/start');
        const json = await res.json();
        if (json.success && json.publicUrl) {
          currentPublicUrl = json.publicUrl;
          btnPublicTunnel.innerText = '🌐 Internet Link Active';
          btnPublicTunnel.className = 'btn btn-success';
          const publicPlayerLink = `${currentPublicUrl}/player.html?room=${roomCode}`;
          navigator.clipboard.writeText(publicPlayerLink);
          alert(`🎉 Public Internet Tunnel active!\n\nInvite Link copied to clipboard:\n${publicPlayerLink}\n\nPlayers anywhere in the world can now join!`);
        } else {
          alert('Could not start public tunnel.');
          btnPublicTunnel.innerText = '🌐 Enable Internet Access';
        }
      } catch (err) {
        alert('Tunnel error: ' + err.message);
        btnPublicTunnel.innerText = '🌐 Enable Internet Access';
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

  // State
  let gameState = null;
  let fullGamePack = null;
  let ws = null;

  // Initialize WebSocket
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);

  const packStr = sessionStorage.getItem('jeopardy_pack');
  let loadedPack = null;
  if (packStr) {
    try { loadedPack = JSON.parse(packStr); } catch (e) {}
  }

  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'CREATE_ROOM',
      roomCode: roomCode,
      gamePack: loadedPack
    }));
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
          break;

        case 'ROOM_STATE':
        case 'CLUE_CLOSED':
          gameState = msg.state;
          renderHostBoard();
          renderPlayers();
          updateActiveClueUI();
          break;

        case 'CLUE_SELECTED':
          gameState = msg.state;
          updateActiveClueUI();
          break;

        case 'HOST_CLUE_DETAILS':
          if (gameState && gameState.currentClue) {
            gameState.currentClue.answer = msg.clue.answer;
            answerText.innerText = msg.clue.answer;
          }
          break;

        case 'BUZZERS_UNLOCKED':
          if (gameState) gameState.buzzerState.state = 'UNLOCKED';
          btnUnlockBuzzers.disabled = true;
          btnUnlockBuzzers.innerText = '⚡ BUZZERS ACTIVE';
          break;

        case 'PLAYER_BUZZED':
          if (gameState) {
            gameState.buzzerState = msg.buzzerState;
          }
          if (window.soundFX) window.soundFX.playBuzzer();
          showBuzzWinner(msg.playerName, msg.latency);
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
          btnUnlockBuzzers.innerText = '⚡ UNLOCK BUZZERS';
          renderPlayers();
          break;

        case 'ANSWER_REVEALED':
          activeClueAnswer.style.display = 'block';
          answerText.innerText = msg.answer;
          break;
      }
    } catch (err) {
      console.error('WS Error:', err);
    }
  };

  // Render Host Jeopardy Board
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
          card.innerText = '✓';
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

  // Update Active Clue UI
  function updateActiveClueUI() {
    if (!gameState || !gameState.currentClue) {
      hostClueControlPanel.style.display = 'none';
      buzzWinnerBox.style.display = 'none';
      return;
    }

    const c = gameState.currentClue;
    hostClueControlPanel.style.display = 'block';
    activeCategoryText.innerText = c.categoryName;
    activeClueValue.innerText = `$${c.value}`;
    activeClueText.innerText = c.clue;
    activeClueAnswer.style.display = 'block';
    if (c.answer) {
      answerText.innerText = c.answer;
    }

    clueValSpans.forEach(s => s.innerText = `$${c.value}`);

    if (c.dailyDouble && !c.wagerSet) {
      dailyDoubleForm.style.display = 'block';
      if (window.soundFX) window.soundFX.playDailyDouble();
    } else {
      dailyDoubleForm.style.display = 'none';
    }

    if (gameState.buzzerState.state === 'UNLOCKED') {
      btnUnlockBuzzers.disabled = true;
      btnUnlockBuzzers.innerText = '⚡ BUZZERS ACTIVE';
    } else {
      btnUnlockBuzzers.disabled = false;
      btnUnlockBuzzers.innerText = '⚡ UNLOCK BUZZERS';
    }
  }

  const activeCategoryText = document.getElementById('activeClueCategory');

  function showBuzzWinner(name, latency) {
    buzzWinnerName.innerText = `🔔 ${name} Buzzed In! (${latency}ms)`;
    buzzWinnerBox.style.display = 'block';
  }

  // Clue Buttons Listeners
  btnUnlockBuzzers.onclick = () => {
    ws.send(JSON.stringify({ type: 'UNLOCK_BUZZERS' }));
  };

  btnResetBuzzers.onclick = () => {
    buzzWinnerBox.style.display = 'none';
    ws.send(JSON.stringify({ type: 'RESET_BUZZERS' }));
  };

  btnCloseClue.onclick = () => {
    ws.send(JSON.stringify({ type: 'CLOSE_CLUE' }));
  };

  btnSetWager.onclick = () => {
    const wagerVal = parseInt(wagerInput.value, 10);
    if (!wagerVal || wagerVal <= 0) return alert('Enter valid wager.');
    ws.send(JSON.stringify({ type: 'SET_WAGER', wager: wagerVal }));
  };

  btnMarkCorrect.onclick = () => {
    ws.send(JSON.stringify({ type: 'EVALUATE_ANSWER', isCorrect: true }));
  };

  btnMarkWrong.onclick = () => {
    ws.send(JSON.stringify({ type: 'EVALUATE_ANSWER', isCorrect: false }));
  };

  // Render Connected Players & Score controls
  function renderPlayers() {
    if (!gameState) return;
    const players = gameState.players;
    playerCount.innerText = players.length;
    playersList.innerHTML = '';

    players.forEach(p => {
      const card = document.createElement('div');
      card.className = 'host-player-card';

      if (gameState.buzzerState && gameState.buzzerState.activePlayerId === p.id) {
        card.classList.add('active-buzzer');
      }

      const left = document.createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.gap = '0.65rem';

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
        avatar.style.background = p.color;
        avatar.innerText = p.name.charAt(0).toUpperCase();
      }

      const details = document.createElement('div');
      details.innerHTML = `
        <div style="font-weight: 700; font-size: 0.9rem; color: #fff;">${p.name} ${p.connected ? '' : '<span style="color: var(--text-muted); font-weight:400; font-size: 0.75rem;">(offline)</span>'}</div>
        <div style="font-size: 0.85rem; font-weight: 800; color: ${p.score < 0 ? 'var(--color-danger)' : 'var(--jeopardy-gold)'};">$${p.score}</div>
      `;

      left.appendChild(avatar);
      left.appendChild(details);

      // Score quick adjustment controls (+200, -200)
      const controls = document.createElement('div');
      controls.className = 'score-adjust-group';

      const btnPlus = document.createElement('button');
      btnPlus.className = 'btn btn-success score-adjust-btn';
      btnPlus.innerText = '+200';
      btnPlus.onclick = () => adjustScore(p.id, 200);

      const btnMinus = document.createElement('button');
      btnMinus.className = 'btn btn-danger score-adjust-btn';
      btnMinus.innerText = '-200';
      btnMinus.onclick = () => adjustScore(p.id, -200);

      controls.appendChild(btnPlus);
      controls.appendChild(btnMinus);

      card.appendChild(left);
      card.appendChild(controls);
      playersList.appendChild(card);
    });
  }

  function adjustScore(playerId, delta) {
    ws.send(JSON.stringify({ type: 'ADJUST_SCORE', playerId, delta }));
  }
});
