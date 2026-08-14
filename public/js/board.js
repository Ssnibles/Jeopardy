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

  roomBadge.innerText = `ROOM: ${roomCode}`;

  let gameState = null;
  let ws = null;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'JOIN_BOARD',
      roomCode
    }));
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
          break;

        case 'CLUE_SELECTED':
          gameState = msg.state;
          renderBoard();
          updateClueModal();
          break;

        case 'CLUE_CLOSED':
          gameState = msg.state;
          renderBoard();
          tvClueModal.classList.remove('active');
          tvBuzzAlert.style.display = 'none';
          break;

        case 'PLAYER_BUZZED':
          if (window.soundFX) window.soundFX.playBuzzer();
          tvBuzzPlayerName.innerText = msg.playerName;
          tvBuzzAlert.style.display = 'inline-block';
          renderScoreboard();
          break;

        case 'ANSWER_EVALUATED':
          gameState = msg.state;
          tvBuzzAlert.style.display = 'none';
          renderScoreboard();
          if (msg.isCorrect) {
            if (window.soundFX) window.soundFX.playCorrect();
          } else {
            if (window.soundFX) window.soundFX.playWrong();
          }
          break;

        case 'ANSWER_REVEALED':
          tvAnswerBox.style.display = 'block';
          tvAnswerText.innerText = msg.answer;
          break;

        case 'BUZZERS_UNLOCKED':
          tvBuzzAlert.style.display = 'none';
          break;
      }
    } catch (err) {
      console.error('WS Error:', err);
    }
  };

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

  const tvDailyDoubleBanner = document.getElementById('tvDailyDoubleBanner');

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
    tvClueText.innerText = clue.clue;

    if (clue.dailyDouble) {
      if (tvDailyDoubleBanner) tvDailyDoubleBanner.style.display = 'block';
      if (window.soundFX && !clue.wagerSet) window.soundFX.playDailyDouble();
    } else {
      if (tvDailyDoubleBanner) tvDailyDoubleBanner.style.display = 'none';
    }

    if (clue.image) {
      tvClueImage.src = clue.image;
      tvClueImage.style.display = 'block';
    } else {
      tvClueImage.style.display = 'none';
      tvClueImage.src = '';
    }

    if (clue.answerRevealed) {
      tvAnswerBox.style.display = 'block';
    } else {
      tvAnswerBox.style.display = 'none';
    }

    tvClueModal.classList.add('active');
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
