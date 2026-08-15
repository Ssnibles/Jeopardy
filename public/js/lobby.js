// Lobby Script with 5 Premade Question Packs, Full Question Preview, and Instant Custom File Loader
document.addEventListener('DOMContentLoaded', () => {

  // 5 Complete Pre-Made Jeopardy Packs
  const PREMADE_PACKS = [
    {
      title: "Ultimate Trivia Showdown",
      author: "Jeopardy Arena",
      categories: [
        {
          name: "Science & Tech",
          clues: [
            { value: 200, clue: "This programming language named after a coffee bean was developed by James Gosling at Sun Microsystems.", answer: "Java", dailyDouble: false },
            { value: 400, clue: "What is the chemical symbol for Gold on the periodic table?", answer: "Au", dailyDouble: false },
            { value: 600, clue: "This company introduced the iPhone in 2007, revolutionising smartphones.", answer: "Apple", dailyDouble: false },
            { value: 800, clue: "Which space telescope launched in December 2021 as the successor to Hubble?", answer: "James Webb Space Telescope", dailyDouble: true },
            { value: 1000, clue: "In physics, what constant approximately equal to 3 x 10^8 m/s is denoted by 'c'?", answer: "Speed of light", dailyDouble: false }
          ]
        },
        {
          name: "World Landmarks",
          clues: [
            { value: 200, clue: "Located in Paris, France, this iron lattice tower was constructed for the 1889 World's Fair.", answer: "Eiffel Tower", dailyDouble: false },
            { value: 400, clue: "This ancient amphitheatre in Rome held gladiatorial contests and public spectacles.", answer: "The Colosseum", dailyDouble: false },
            { value: 600, clue: "This white marble mausoleum on the Yamuna River in Agra was built by Shah Jahan.", answer: "Taj Mahal", dailyDouble: false },
            { value: 800, clue: "This ancient Incan citadel located in the Andes mountains of Peru was built around 1450.", answer: "Machu Picchu", dailyDouble: false },
            { value: 1000, clue: "This modernist building with shell-like sails opened in 1973 in Sydney, Australia.", answer: "Sydney Opera House", dailyDouble: false }
          ]
        },
        {
          name: "Pop Culture & Movies",
          clues: [
            { value: 200, clue: "In the Marvel Cinematic Universe, what is the name of Thor's home realm?", answer: "Asgard", dailyDouble: false },
            { value: 400, clue: "Which movie won Best Picture in 2020, becoming the first non-English film to win?", answer: "Parasite", dailyDouble: false },
            { value: 600, clue: "What colour pill does Neo take in The Matrix to discover the truth?", answer: "Red Pill", dailyDouble: false },
            { value: 800, clue: "Who directed the sci-fi epics Interstellar, Inception, and Oppenheimer?", answer: "Christopher Nolan", dailyDouble: false },
            { value: 1000, clue: "What is the name of the fictional kingdom where Disney's 'Frozen' is set?", answer: "Arendelle", dailyDouble: false }
          ]
        },
        {
          name: "Gaming Classics",
          clues: [
            { value: 200, clue: "This plumber in blue overalls and a red cap is Nintendo's flagship mascot.", answer: "Mario", dailyDouble: false },
            { value: 400, clue: "What block-building sandbox game created by Markus 'Notch' Persson became the best-seller ever?", answer: "Minecraft", dailyDouble: false },
            { value: 600, clue: "In 'The Legend of Zelda', what is the name of the tunic-wearing heroic protagonist?", answer: "Link", dailyDouble: false },
            { value: 800, clue: "What fictional video game island is the primary setting of Fortnite Battle Royale?", answer: "The Island", dailyDouble: false },
            { value: 1000, clue: "What year was the original Sony PlayStation console released in Japan?", answer: "1994", dailyDouble: false }
          ]
        },
        {
          name: "Food & Culinary",
          clues: [
            { value: 200, clue: "What primary ingredient is used to make guacamole?", answer: "Avocado", dailyDouble: false },
            { value: 400, clue: "What Italian dish consists of layers of flat pasta alternated with sauce, cheese, and meats?", answer: "Lasagne", dailyDouble: false },
            { value: 600, clue: "What type of tea is flavoured with oil of bergamot orange?", answer: "Earl Grey", dailyDouble: false },
            { value: 800, clue: "From which country does the traditional fermented cabbage dish Kimchi originate?", answer: "South Korea", dailyDouble: false },
            { value: 1000, clue: "What is the main distilled spirit used in a classic Mojito cocktail?", answer: "White Rum", dailyDouble: false }
          ]
        }
      ]
    },
    {
      title: "Pop Culture & Cinema",
      author: "Cinema Buffs",
      categories: [
        {
          name: "Hollywood Hits",
          clues: [
            { value: 200, clue: "Which 1997 James Cameron epic starred Leonardo DiCaprio and Kate Winslet?", answer: "Titanic", dailyDouble: false },
            { value: 400, clue: "What fictional box of chocolates quote was made famous by Tom Hanks in 1994?", answer: "Forrest Gump", dailyDouble: false },
            { value: 600, clue: "What high-octane franchise features Dom Toretto and his emphasis on 'family'?", answer: "Fast & Furious", dailyDouble: false },
            { value: 800, clue: "Which Pixar film features a robot left on Earth to clean up garbage?", answer: "WALL-E", dailyDouble: false },
            { value: 1000, clue: "What 1994 Quentin Tarantino film interweaves stories of Los Angeles mobsters?", answer: "Pulp Fiction", dailyDouble: false }
          ]
        },
        {
          name: "TV Series Hits",
          clues: [
            { value: 200, clue: "Which HBO fantasy series was based on George R.R. Martin's books?", answer: "Game of Thrones", dailyDouble: false },
            { value: 400, clue: "In 'Breaking Bad', what alias does chemistry teacher Walter White adopt?", answer: "Heisenberg", dailyDouble: false },
            { value: 600, clue: "What 90s sitcom revolved around Jerry, George, Elaine, and Kramer?", answer: "Seinfeld", dailyDouble: false },
            { value: 800, clue: "Which Netflix series takes place in the fictional town of Hawkins, Indiana?", answer: "Stranger Things", dailyDouble: true },
            { value: 1000, clue: "What is the name of Dunder Mifflin's paper company branch in 'The Office'?", answer: "Scranton Branch", dailyDouble: false }
          ]
        },
        {
          name: "Music Legends",
          clues: [
            { value: 200, clue: "Which pop icon earned the title 'King of Pop' with hits like Thriller and Billie Jean?", answer: "Michael Jackson", dailyDouble: false },
            { value: 400, clue: "What iconic British rock group hailed from Liverpool with members John, Paul, George, and Ringo?", answer: "The Beatles", dailyDouble: false },
            { value: 600, clue: "Which pop star released the groundbreaking album 'Renaissance' and 'Break My Soul'?", answer: "Beyoncé", dailyDouble: false },
            { value: 800, clue: "What Swedish pop supergroup won Eurovision in 1974 with 'Waterloo'?", answer: "ABBA", dailyDouble: false },
            { value: 1000, clue: "Who sang lead vocals for Queen and performed famously at Live Aid in 1985?", answer: "Freddie Mercury", dailyDouble: false }
          ]
        },
        {
          name: "Superheroes",
          clues: [
            { value: 200, clue: "What alter ego does billionaire Bruce Wayne use to fight crime in Gotham City?", answer: "Batman", dailyDouble: false },
            { value: 400, clue: "Which superhero was bitten by a radioactive spider in Queens, NY?", answer: "Spider-Man", dailyDouble: false },
            { value: 600, clue: "What metal alloy coats Wolverine's skeleton and claws?", answer: "Adamantium", dailyDouble: false },
            { value: 800, clue: "What is the real name of Wonder Woman in DC Comics?", answer: "Diana Prince", dailyDouble: false },
            { value: 1000, clue: "Which cosmic villain snapped his fingers in Avengers: Infinity War?", answer: "Thanos", dailyDouble: false }
          ]
        },
        {
          name: "Sci-Fi Worlds",
          clues: [
            { value: 200, clue: "What weapon wielded by Jedi and Sith in Star Wars leaves glowing plasma blades?", answer: "Lightsaber", dailyDouble: false },
            { value: 400, clue: "What is the primary starship commanded by Captain James T. Kirk in Star Trek?", answer: "USS Enterprise", dailyDouble: false },
            { value: 600, clue: "In 'Dune', what rare desert mineral spice enables space travel and prescience?", answer: "Melange (Spice)", dailyDouble: false },
            { value: 800, clue: "What cyborg assassin played by Arnold Schwarzenegger promised 'I'll be back'?", answer: "The Terminator (T-800)", dailyDouble: false },
            { value: 1000, clue: "What planet is the original home of Superman in DC lore?", answer: "Krypton", dailyDouble: false }
          ]
        }
      ]
    },
    {
      title: "Science, Tech & Cosmos",
      author: "Geek Quizmaster",
      categories: [
        {
          name: "Computer Science",
          clues: [
            { value: 200, clue: "What fundamental binary digits make up all machine code storage?", answer: "0 and 1 (Bits)", dailyDouble: false },
            { value: 400, clue: "What popular open-source version control system was created by Linus Torvalds?", answer: "Git", dailyDouble: false },
            { value: 600, clue: "What does HTML stand for in web markup development?", answer: "HyperText Markup Language", dailyDouble: false },
            { value: 800, clue: "Which search algorithm uses a divide-and-conquer strategy on sorted arrays in O(log n) time?", answer: "Binary Search", dailyDouble: false },
            { value: 1000, clue: "What pioneer credited as the first computer programmer wrote algorithms for the Analytical Engine?", answer: "Ada Lovelace", dailyDouble: false }
          ]
        },
        {
          name: "Space Exploration",
          clues: [
            { value: 200, clue: "What is the largest planet in our Solar System by mass and volume?", answer: "Jupiter", dailyDouble: false },
            { value: 400, clue: "In 1969, who became the first human to step foot on the Moon during Apollo 11?", answer: "Neil Armstrong", dailyDouble: false },
            { value: 600, clue: "What reddish planet is nicknamed the 'Red Planet' due to iron oxide on its surface?", answer: "Mars", dailyDouble: false },
            { value: 800, clue: "What theoretical boundary around a black hole prevents anything, even light, from escaping?", answer: "Event Horizon", dailyDouble: true },
            { value: 1000, clue: "Which moon of Saturn is known for methane lakes and a thick nitrogen atmosphere?", answer: "Titan", dailyDouble: false }
          ]
        },
        {
          name: "Periodic Table",
          clues: [
            { value: 200, clue: "What lightweight gas with atomic number 1 is the most abundant element in the universe?", answer: "Hydrogen", dailyDouble: false },
            { value: 400, clue: "What metal liquid at room temperature has the chemical symbol Hg?", answer: "Mercury", dailyDouble: false },
            { value: 600, clue: "What essential element for human respiration makes up about 21% of Earth's atmosphere?", answer: "Oxygen", dailyDouble: false },
            { value: 800, clue: "What element with atomic number 6 forms the structural backbone of organic chemistry?", answer: "Carbon", dailyDouble: false },
            { value: 1000, clue: "What noble gas with atomic number 10 produces a bright reddish-orange glow in discharge signs?", answer: "Neon", dailyDouble: false }
          ]
        },
        {
          name: "Biology & Nature",
          clues: [
            { value: 200, clue: "What molecule known as the 'building block of life' carries genetic instructions?", answer: "DNA", dailyDouble: false },
            { value: 400, clue: "What organelle in plant cells carries out photosynthesis to turn sunlight into sugar?", answer: "Chloroplast", dailyDouble: false },
            { value: 600, clue: "What is the largest mammal currently alive on Earth?", answer: "Blue Whale", dailyDouble: false },
            { value: 800, clue: "What process do bacteria use to replicate by splitting into two identical daughter cells?", answer: "Binary Fission", dailyDouble: false },
            { value: 1000, clue: "What power organelle is famously referred to as the powerhouse of the cell?", answer: "Mitochondria", dailyDouble: false }
          ]
        },
        {
          name: "Famous Inventions",
          clues: [
            { value: 200, clue: "Who is credited with inventing the practical incandescent light bulb and phonograph?", answer: "Thomas Edison", dailyDouble: false },
            { value: 400, clue: "Which brothers made the first controlled sustained powered airplane flight at Kitty Hawk in 1903?", answer: "Wright Brothers", dailyDouble: false },
            { value: 600, clue: "Who discovered penicillin in 1928, ushering in the era of antibiotics?", answer: "Alexander Fleming", dailyDouble: false },
            { value: 800, clue: "Who invented the movable-type printing press in Europe around 1440?", answer: "Johannes Gutenberg", dailyDouble: false },
            { value: 1000, clue: "Which AC power pioneer devised the induction motor and Tesla coil?", answer: "Nikola Tesla", dailyDouble: false }
          ]
        }
      ]
    },
    {
      title: "World History & Geography",
      author: "Global Explorer",
      categories: [
        {
          name: "Ancient Empires",
          clues: [
            { value: 200, clue: "Which ancient civilization built the Great Pyramids at Giza along the Nile?", answer: "Ancient Egypt", dailyDouble: false },
            { value: 400, clue: "Who was the Macedonian king who created one of history's largest empires by age 30?", answer: "Alexander the Great", dailyDouble: false },
            { value: 600, clue: "What Roman general was assassinated on the Ides of March in 44 BC?", answer: "Julius Caesar", dailyDouble: false },
            { value: 800, clue: "What ancient Greek city-state was known for its fierce military culture and Phalanx formation?", answer: "Sparta", dailyDouble: false },
            { value: 1000, clue: "Which Empire ruled from Constantinople (now Istanbul) after the fall of Western Rome?", answer: "Byzantine Empire", dailyDouble: false }
          ]
        },
        {
          name: "Capital Cities",
          clues: [
            { value: 200, clue: "What is the capital city of Japan, famed for Shibuya Crossing?", answer: "Tokyo", dailyDouble: false },
            { value: 400, clue: "What is the capital city of Canada?", answer: "Ottawa", dailyDouble: false },
            { value: 600, clue: "What high-altitude capital city of Australia was purpose-built between Sydney and Melbourne?", answer: "Canberra", dailyDouble: false },
            { value: 800, clue: "What is the capital city of Brazil, famous for its airplane-shaped urban design?", answer: "Brasília", dailyDouble: false },
            { value: 1000, clue: "What European capital is split by the Danube River, merging Buda and Pest?", answer: "Budapest", dailyDouble: false }
          ]
        },
        {
          name: "World Wonders",
          clues: [
            { value: 200, clue: "What massive fortification stretching thousands of miles across northern China protected against invasions?", answer: "Great Wall of China", dailyDouble: false },
            { value: 400, clue: "In which South American country will you find the high-altitude Lake Titicaca?", answer: "Peru / Bolivia", dailyDouble: false },
            { value: 600, clue: "What giant sandstone monolith in Australia's Northern Territory is also known as Ayers Rock?", answer: "Uluru", dailyDouble: false },
            { value: 800, clue: "What African river is traditionally considered the longest river in the world?", answer: "The Nile", dailyDouble: true },
            { value: 1000, clue: "What mountain range contains Mount Everest, the world's highest peak?", answer: "Himalayas", dailyDouble: false }
          ]
        },
        {
          name: "Historic Battles",
          clues: [
            { value: 200, clue: "In what 1815 battle was Napoleon Bonaparte finally defeated by allied forces?", answer: "Battle of Waterloo", dailyDouble: false },
            { value: 400, clue: "Which 1066 battle resulted in William the Conqueror taking the English throne?", answer: "Battle of Hastings", dailyDouble: false },
            { value: 600, clue: "What major WWII naval battle in June 1942 turned the tide of the Pacific Theatre?", answer: "Battle of Midway", dailyDouble: false },
            { value: 800, clue: "What American Civil War battle in Pennsylvania in 1863 was the deadliest of the war?", answer: "Battle of Gettysburg", dailyDouble: false },
            { value: 1000, clue: "Which siege in WWII lasted nearly 900 days in a Soviet city now named St. Petersburg?", answer: "Siege of Leningrad", dailyDouble: false }
          ]
        },
        {
          name: "Explorers",
          clues: [
            { value: 200, clue: "Which Italian navigator sailed across the Atlantic in 1492 under the Spanish flag?", answer: "Christopher Columbus", dailyDouble: false },
            { value: 400, clue: "Which Portuguese explorer led the first expedition to circumnavigate the globe?", answer: "Ferdinand Magellan", dailyDouble: false },
            { value: 600, clue: "What Venetian merchant traveled the Silk Road to China and served Kublai Khan?", answer: "Marco Polo", dailyDouble: false },
            { value: 800, clue: "Who was the Norwegian explorer who led the first team to reach the South Pole in 1911?", answer: "Roald Amundsen", dailyDouble: false },
            { value: 1000, clue: "Which English explorer navigated the Pacific Ocean, charting New Zealand and Hawaii?", answer: "Captain James Cook", dailyDouble: false }
          ]
        }
      ]
    },
    {
      title: "Video Games & Anime",
      author: "Otaku Gamer",
      categories: [
        {
          name: "Retro Arcade",
          clues: [
            { value: 200, clue: "What yellow circle eats dots and avoids ghosts Blinky, Pinky, Inky, and Clyde?", answer: "Pac-Man", dailyDouble: false },
            { value: 400, clue: "In Space Invaders, what direction do the enemy alien rows shift as they descend?", answer: "Side to side (Horizontal)", dailyDouble: false },
            { value: 600, clue: "What fighting game introduced Ryu, Ken, Chun-Li, and the Hadoken in 1987/1991?", answer: "Street Fighter", dailyDouble: false },
            { value: 800, clue: "What Nintendo arcade game featured Jumpman trying to save Pauline from a giant ape?", answer: "Donkey Kong", dailyDouble: false },
            { value: 1000, clue: "What puzzle game created by Alexey Pajitnov involves fitting falling tetrominoes together?", answer: "Tetris", dailyDouble: false }
          ]
        },
        {
          name: "RPG Worlds",
          clues: [
            { value: 200, clue: "In Final Fantasy VII, what main protagonist wields the iconic Buster Sword?", answer: "Cloud Strife", dailyDouble: false },
            { value: 400, clue: "What open-world RPG by Bethesda features the Dragonborn fighting Alduin in Skyrim?", answer: "The Elder Scrolls V: Skyrim", dailyDouble: false },
            { value: 600, clue: "What FromSoftware game set in the Lands Between won Game of the Year in 2022?", answer: "Elden Ring", dailyDouble: false },
            { value: 800, clue: "In Geralt's world in The Witcher, what monster hunting guild does he belong to?", answer: "School of the Wolf", dailyDouble: true },
            { value: 1000, clue: "What classic Chrono Trigger RPG featured time travel between prehistoric, medieval, and futuristic eras?", answer: "Chrono Trigger", dailyDouble: false }
          ]
        },
        {
          name: "Anime Heroes",
          clues: [
            { value: 200, clue: "Which Saiyan warrior searches for the Dragon Balls and loves eating massive meals?", answer: "Goku", dailyDouble: false },
            { value: 400, clue: "In Naruto, what is the title given to the strongest ninja and leader of Konohagakure?", answer: "Hokage", dailyDouble: false },
            { value: 600, clue: "What pirate captain wears a straw hat and aims to find the One Piece treasure?", answer: "Monkey D. Luffy", dailyDouble: false },
            { value: 800, clue: "Who is the protagonist of Attack on Titan who vows to eradicate all Titans?", answer: "Eren Yeager", dailyDouble: false },
            { value: 1000, clue: "Which alchemy prodigy is known as the Fullmetal Alchemist alongside his brother Alphonse?", answer: "Edward Elric", dailyDouble: false }
          ]
        },
        {
          name: "Boss Battles",
          clues: [
            { value: 200, clue: "What spike-shelled Koopa King repeatedly kidnaps Princess Peach in Super Mario?", answer: "Bowser", dailyDouble: false },
            { value: 400, clue: "Which main antagonist in The Legend of Zelda seeks the Triforce of Power?", answer: "Ganondorf (Ganon)", dailyDouble: false },
            { value: 600, clue: "What egg-shaped mad scientist builds robot badniks in the Sonic the Hedgehog series?", answer: "Dr. Robotnik (Eggman)", dailyDouble: false },
            { value: 800, clue: "In Portal 1 & 2, what AI passive-aggressively tests Chell with portal puzzles?", answer: "GLaDOS", dailyDouble: false },
            { value: 1000, clue: "What one-winged angel with long silver hair is the primary villain of Final Fantasy VII?", answer: "Sephiroth", dailyDouble: false }
          ]
        },
        {
          name: "Console History",
          clues: [
            { value: 200, clue: "Which 1985 8-bit home console resurrected the North American video game market?", answer: "NES (Nintendo Entertainment System)", dailyDouble: false },
            { value: 400, clue: "What 16-bit console competed against the SNES with the slogan 'Genesis does what Nintendon't'?", answer: "Sega Genesis (Mega Drive)", dailyDouble: false },
            { value: 600, clue: "What is the best-selling home video game console of all time, releasing in 2000?", answer: "PlayStation 2 (PS2)", dailyDouble: false },
            { value: 800, clue: "What handheld Nintendo console featured two screens, the bottom one being a touchscreen?", answer: "Nintendo DS", dailyDouble: false },
            { value: 1000, clue: "What 1998 Sega console featured an integrated modem and VMU memory cards before Sega left hardware?", answer: "Sega Dreamcast", dailyDouble: false }
          ]
        }
      ]
    }
  ];

  // DOM Elements
  const btnMethodPremade = document.getElementById('btnMethodPremade');
  const btnMethodCustom = document.getElementById('btnMethodCustom');
  const premadePackSection = document.getElementById('premadePackSection');
  const premadePackSelect = document.getElementById('premadePackSelect');
  const customPackFile = document.getElementById('customPackFile');
  const customPackStatus = document.getElementById('customPackStatus');
  const packPreviewTitle = document.getElementById('packPreviewTitle');
  const packPreviewBadge = document.getElementById('packPreviewBadge');
  const packPreviewList = document.getElementById('packPreviewList');
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

  let activePack = PREMADE_PACKS[0];
  let isCustomActive = false;
  let customLoadedPack = null;
  let selectedAvatarFile = null;

  // Restore saved contestant profile and room info
  const savedName = localStorage.getItem('jeopardy_name') || sessionStorage.getItem('jeopardy_name');
  const savedColor = localStorage.getItem('jeopardy_color') || sessionStorage.getItem('jeopardy_color');
  let savedAvatar = localStorage.getItem('jeopardy_avatar') || sessionStorage.getItem('jeopardy_avatar');
  if (savedAvatar && savedAvatar.startsWith('data:image/') && savedAvatar.length > 10000) {
    savedAvatar = null;
    localStorage.removeItem('jeopardy_avatar');
    sessionStorage.removeItem('jeopardy_avatar');
  }
  const savedRoom = localStorage.getItem('jeopardy_room') || sessionStorage.getItem('jeopardy_room');

  if (joinName && savedName) joinName.value = savedName;
  if (joinColor && savedColor) {
    joinColor.value = savedColor;
    if (joinAvatarPreview && !savedAvatar) joinAvatarPreview.style.background = savedColor;
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
  if (tvRoomCode && savedRoom) tvRoomCode.value = savedRoom;

  // Render question/category preview list for the active pack
  function renderPackPreview(pack) {
    if (!pack || !pack.categories || !Array.isArray(pack.categories)) {
      packPreviewList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem;">No questions available in this pack.</div>';
      return;
    }

    packPreviewTitle.innerText = pack.title || 'Trivia Pack Preview';
    
    let totalClues = 0;
    pack.categories.forEach(c => {
      if (c.clues) totalClues += c.clues.length;
    });

    packPreviewBadge.innerText = `${pack.categories.length} Categories • ${totalClues} Clues`;

    let html = '';
    pack.categories.forEach((cat, cIdx) => {
      html += `
        <div class="preview-category-card">
          <div class="preview-category-name">${cIdx + 1}. ${escapeHtml(cat.name)}</div>
      `;
      if (cat.clues && Array.isArray(cat.clues)) {
        cat.clues.forEach(clue => {
          html += `
            <div class="preview-clue-item">
              <span class="preview-clue-val">$${clue.value}</span>
              <span class="preview-clue-text">${escapeHtml(clue.clue)}</span>
              <span class="preview-clue-ans">A: ${escapeHtml(clue.answer)}</span>
            </div>
          `;
        });
      }
      html += `</div>`;
    });

    packPreviewList.innerHTML = html;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial render of default premade pack preview
  renderPackPreview(activePack);

  // Premade pack dropdown switch
  if (premadePackSelect) {
    premadePackSelect.onchange = (e) => {
      const idx = parseInt(e.target.value, 10);
      if (PREMADE_PACKS[idx]) {
        isCustomActive = false;
        activePack = PREMADE_PACKS[idx];
        btnMethodPremade.classList.add('active');
        btnMethodCustom.classList.remove('active');
        customPackStatus.style.display = 'none';
        renderPackPreview(activePack);
      }
    };
  }

  // Method Button Click Handlers
  if (btnMethodPremade) {
    btnMethodPremade.onclick = () => {
      isCustomActive = false;
      btnMethodPremade.classList.add('active');
      btnMethodCustom.classList.remove('active');
      premadePackSection.style.display = 'flex';
      customPackStatus.style.display = 'none';
      const idx = parseInt(premadePackSelect.value, 10) || 0;
      activePack = PREMADE_PACKS[idx] || PREMADE_PACKS[0];
      renderPackPreview(activePack);
    };
  }

  // Custom pack button (dashed outline style): INSTANTLY OPENS FILE PICKER WINDOW
  if (btnMethodCustom && customPackFile) {
    btnMethodCustom.onclick = () => {
      isCustomActive = true;
      btnMethodCustom.classList.add('active');
      btnMethodPremade.classList.remove('active');
      premadePackSection.style.display = 'none';
      
      // Instantly open OS file browser window
      customPackFile.click();
    };
  }

  // Custom pack JSON file reader
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
            activePack = parsed;
            isCustomActive = true;

            customPackStatus.style.display = 'block';
            customPackStatus.innerText = `Loaded Custom Pack: "${parsed.title || 'Custom Pack'}" (${parsed.categories.length} categories)`;
            renderPackPreview(parsed);
          } else {
            customPackStatus.style.display = 'block';
            customPackStatus.innerText = 'Invalid Jeopardy pack format. Missing "categories" array.';
          }
        } catch (err) {
          customPackStatus.style.display = 'block';
          customPackStatus.innerText = 'Error reading JSON file: ' + err.message;
        }
      };
      reader.readAsText(file);
    };
  }

  // Player Profile Customisation Logic
  const btnUploadJoinAvatar = document.getElementById('btnUploadJoinAvatar');
  const joinColorSwatches = document.getElementById('joinColorSwatches');

  function updateJoinButtonColor(color) {
    if (!btnSubmitJoin) return;
    btnSubmitJoin.style.backgroundColor = color;
    btnSubmitJoin.style.borderColor = color;
  }

  if (btnUploadJoinAvatar && joinAvatarFile) {
    btnUploadJoinAvatar.onclick = () => joinAvatarFile.click();
  }

  if (joinColorSwatches && joinColor) {
    const dots = joinColorSwatches.querySelectorAll('.color-dot');
    dots.forEach(dot => {
      dot.onclick = () => {
        dots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        const c = dot.getAttribute('data-color');
        joinColor.value = c;
        updateJoinButtonColor(c);
        if (!selectedAvatarFile) {
          joinAvatarPreview.style.background = c;
        }
      };
    });

    joinColor.oninput = () => {
      dots.forEach(d => d.classList.remove('active'));
      const c = joinColor.value;
      updateJoinButtonColor(c);
      if (!selectedAvatarFile) {
        joinAvatarPreview.style.background = c;
      }
    };

    // Initial sync
    updateJoinButtonColor(joinColor.value || '#3b82f6');
  }

  if (joinName && joinAvatarPreview) {
    joinName.oninput = () => {
      if (!selectedAvatarFile) {
        joinAvatarPreview.innerText = (joinName.value.trim() || '?').charAt(0).toUpperCase();
      }
    };
  }

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

  // Launch Game Room Action
  if (btnCreateRoom) {
    btnCreateRoom.onclick = async () => {
      if (isCustomActive && !customLoadedPack) {
        return alert('Please select a valid custom Jeopardy pack .json file.');
      }

      const packToUse = activePack || PREMADE_PACKS[0];

      btnCreateRoom.disabled = true;
      btnCreateRoom.innerText = 'Creating Room...';

      // Connect WebSocket to request room creation
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}`);

      ws.onopen = () => {
        const gameModeSelect = document.getElementById('gameModeSelect');
        const gameMode = gameModeSelect ? gameModeSelect.value : 'STANDARD';
        ws.send(JSON.stringify({
          type: 'CREATE_ROOM',
          gamePack: packToUse,
          gameMode: gameMode
        }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'ROOM_CREATED') {
          sessionStorage.setItem('jeopardy_role', 'HOST');
          sessionStorage.setItem('jeopardy_room', msg.roomCode);
          sessionStorage.setItem('jeopardy_pack', JSON.stringify(packToUse));
          window.location.href = `/host.html?room=${msg.roomCode}`;
        }
      };

      ws.onerror = (err) => {
        btnCreateRoom.disabled = false;
        btnCreateRoom.innerText = 'Launch Game Room';
        alert('WebSocket connection error. Make sure server is running.');
      };
    };
  }

  // Join Room Action
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

      window.location.href = `/player.html?room=${code}&name=${encodeURIComponent(name)}&color=${encodeURIComponent(color)}`;
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
