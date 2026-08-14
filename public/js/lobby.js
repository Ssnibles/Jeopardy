// Lobby Script with Full Contestant Customization & Avatar Upload Support
document.addEventListener('DOMContentLoaded', () => {
  const radioDefaultPack = document.getElementById('radioDefaultPack');
  const radioCustomPack = document.getElementById('radioCustomPack');
  const customPackFileGroup = document.getElementById('customPackFileGroup');
  const customPackFile = document.getElementById('customPackFile');
  const customPackStatus = document.getElementById('customPackStatus');
  const btnCreateRoom = document.getElementById('btnCreateRoom');

  const joinRoomForm = document.getElementById('joinRoomForm');
  const joinCode = document.getElementById('joinCode');
  const joinName = document.getElementById('joinName');
  const joinColor = document.getElementById('joinColor');
  const joinAvatarPreview = document.getElementById('joinAvatarPreview');
  const joinAvatarFile = document.getElementById('joinAvatarFile');
  const btnSubmitJoin = document.getElementById('btnSubmitJoin');

  const tvRoomCode = document.getElementById('tvRoomCode');
  const btnConnectTV = document.getElementById('btnConnectTV');

  let customLoadedPack = null;
  let selectedAvatarFile = null;

  // Restore saved contestant profile and room info from localStorage/sessionStorage
  const savedName = localStorage.getItem('jeopardy_name') || sessionStorage.getItem('jeopardy_name');
  const savedColor = localStorage.getItem('jeopardy_color') || sessionStorage.getItem('jeopardy_color');
  let savedAvatar = localStorage.getItem('jeopardy_avatar') || sessionStorage.getItem('jeopardy_avatar');
  if (savedAvatar && savedAvatar.startsWith('data:image/') && savedAvatar.length > 10000) {
    savedAvatar = null;
    localStorage.removeItem('jeopardy_avatar');
    sessionStorage.removeItem('jeopardy_avatar');
  }
  const savedRoom = localStorage.getItem('jeopardy_room') || sessionStorage.getItem('jeopardy_room');

  if (joinName && savedName) {
    joinName.value = savedName;
  }
  if (joinColor && savedColor) {
    joinColor.value = savedColor;
    if (joinAvatarPreview && !savedAvatar) {
      joinAvatarPreview.style.background = savedColor;
    }
  }
  if (joinAvatarPreview && savedName && !savedAvatar) {
    joinAvatarPreview.innerText = savedName.charAt(0).toUpperCase();
  }
  if (joinAvatarPreview && savedAvatar) {
    joinAvatarPreview.style.backgroundImage = `url('${savedAvatar}')`;
    joinAvatarPreview.style.backgroundSize = 'cover';
    joinAvatarPreview.style.backgroundPosition = 'center';
    joinAvatarPreview.innerText = '';
  }
  if (tvRoomCode && savedRoom) {
    tvRoomCode.value = savedRoom;
  }

  const cardDefaultPack = document.getElementById('cardDefaultPack');
  const cardCustomPack = document.getElementById('cardCustomPack');
  const packDropzone = document.getElementById('packDropzone');

  // Toggle pack selection card state
  if (cardDefaultPack && cardCustomPack) {
    cardDefaultPack.onclick = () => {
      cardDefaultPack.classList.add('active');
      cardCustomPack.classList.remove('active');
      radioDefaultPack.checked = true;
      customPackFileGroup.style.display = 'none';
    };

    cardCustomPack.onclick = () => {
      cardCustomPack.classList.add('active');
      cardDefaultPack.classList.remove('active');
      radioCustomPack.checked = true;
      customPackFileGroup.style.display = 'block';
    };
  }

  // Dropzone click & drag drop support
  if (packDropzone && customPackFile) {
    packDropzone.onclick = () => customPackFile.click();

    packDropzone.ondragover = (e) => {
      e.preventDefault();
      packDropzone.style.borderColor = 'var(--jeopardy-gold)';
    };

    packDropzone.ondragleave = () => {
      packDropzone.style.borderColor = 'var(--border-medium)';
    };

    packDropzone.ondrop = (e) => {
      e.preventDefault();
      packDropzone.style.borderColor = 'var(--border-medium)';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        customPackFile.files = e.dataTransfer.files;
        customPackFile.dispatchEvent(new Event('change'));
      }
    };
  }

  const btnUploadJoinAvatar = document.getElementById('btnUploadJoinAvatar');
  const joinColorSwatches = document.getElementById('joinColorSwatches');

  // Trigger file upload when clicking avatar bubble
  if (btnUploadJoinAvatar && joinAvatarFile) {
    btnUploadJoinAvatar.onclick = () => joinAvatarFile.click();
  }

  // Color Swatch Selection
  if (joinColorSwatches && joinColor) {
    const dots = joinColorSwatches.querySelectorAll('.color-dot');
    dots.forEach(dot => {
      dot.onclick = () => {
        dots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        const c = dot.getAttribute('data-color');
        joinColor.value = c;
        if (!selectedAvatarFile) {
          joinAvatarPreview.style.background = c;
        }
      };
    });

    joinColor.oninput = () => {
      dots.forEach(d => d.classList.remove('active'));
      if (!selectedAvatarFile) {
        joinAvatarPreview.style.background = joinColor.value;
      }
    };
  }

  if (joinName && joinAvatarPreview) {
    joinName.oninput = () => {
      if (!selectedAvatarFile) {
        joinAvatarPreview.innerText = (joinName.value.trim() || '?').charAt(0).toUpperCase();
      }
    };
  }

  // Live avatar file selection preview
  if (joinAvatarFile) {
    joinAvatarFile.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        selectedAvatarFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
          joinAvatarPreview.style.backgroundImage = `url('${event.target.result}')`;
          joinAvatarPreview.style.backgroundSize = 'cover';
          joinAvatarPreview.style.backgroundPosition = 'center';
          joinAvatarPreview.innerText = '';
        };
        reader.readAsDataURL(file);
      }
    };
  }

  // Custom pack file reader
  if (customPackFile) {
    customPackFile.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed && parsed.categories && Array.isArray(parsed.categories)) {
            customLoadedPack = parsed;
            customPackStatus.innerText = `Pack Loaded: "${parsed.title || 'Custom Pack'}" (${parsed.categories.length} categories)`;
          } else {
            customPackStatus.innerText = 'Invalid Jeopardy pack format.';
          }
        } catch (err) {
          customPackStatus.innerText = 'Error reading JSON: ' + err.message;
        }
      };
      reader.readAsText(file);
    };
  }

  // Create Room Action
  if (btnCreateRoom) {
    btnCreateRoom.onclick = async () => {
      let packToUse = null;

      if (radioCustomPack && radioCustomPack.checked) {
        if (!customLoadedPack) {
          return alert('Please select a valid custom Jeopardy pack JSON file first.');
        }
        packToUse = customLoadedPack;
      } else {
        // Fetch default pack
        try {
          const res = await fetch('/api/default-game');
          packToUse = await res.json();
        } catch (err) {
          return alert('Failed to load default game pack from server.');
        }
      }

      // Connect WebSocket temporarily to request room creation
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}`);

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'CREATE_ROOM',
          gamePack: packToUse
        }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'ROOM_CREATED') {
          // Save room session info to sessionStorage
          sessionStorage.setItem('jeopardy_role', 'HOST');
          sessionStorage.setItem('jeopardy_room', msg.roomCode);
          sessionStorage.setItem('jeopardy_pack', JSON.stringify(packToUse));
          window.location.href = `/host.html?room=${msg.roomCode}`;
        }
      };

      ws.onerror = (err) => {
        alert('WebSocket connection error. Make sure server is running.');
      };
    };
  }

  // Join Room Action with Avatar Upload
  if (joinRoomForm) {
    joinRoomForm.onsubmit = async (e) => {
      e.preventDefault();
      const code = joinCode.value.trim().toUpperCase();
      const name = joinName.value.trim();
      const color = joinColor.value;
      let avatarUrl = '';

      if (!code || code.length !== 4) {
        return alert('Please enter a valid 4-letter room code.');
      }

      btnSubmitJoin.disabled = true;
      btnSubmitJoin.innerText = 'Connecting...';

      // Helper: Compress and downscale avatar image to 150x150 JPEG (~10KB) in-memory before network upload
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

      // Upload custom avatar if selected (downscaled to 150x150 ~10KB)
      if (selectedAvatarFile) {
        try {
          const compressedFile = await compressAvatarImage(selectedAvatarFile);
          const formData = new FormData();
          formData.append('image', compressedFile);
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          const json = await res.json();
          if (json.success) {
            avatarUrl = json.url;
          }
        } catch (err) {
          console.error('Avatar upload failed:', err);
        }
      }

      localStorage.setItem('jeopardy_role', 'PLAYER');
      localStorage.setItem('jeopardy_room', code);
      localStorage.setItem('jeopardy_name', name);
      localStorage.setItem('jeopardy_color', color);
      if (avatarUrl) localStorage.setItem('jeopardy_avatar', avatarUrl);

      sessionStorage.setItem('jeopardy_role', 'PLAYER');
      sessionStorage.setItem('jeopardy_room', code);
      sessionStorage.setItem('jeopardy_name', name);
      sessionStorage.setItem('jeopardy_color', color);
      if (avatarUrl) sessionStorage.setItem('jeopardy_avatar', avatarUrl);

      let targetUrl = `/player.html?room=${code}&name=${encodeURIComponent(name)}&color=${encodeURIComponent(color)}`;
      window.location.href = targetUrl;
    };
  }

  // TV View Action
  if (btnConnectTV) {
    btnConnectTV.onclick = () => {
      const code = tvRoomCode.value.trim().toUpperCase();
      if (!code || code.length !== 4) {
        return alert('Please enter a valid 4-letter room code.');
      }
      window.location.href = `/board.html?room=${code}`;
    };
  }
});
