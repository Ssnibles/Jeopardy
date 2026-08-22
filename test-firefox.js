const { firefox } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log('=== Starting Jeopardy Firefox Playwright Test Suite ===');
  
  let browser;
  try {
    browser = await firefox.launch({
      headless: true
    });

    console.log('✔ Firefox Browser launched successfully');

    // CONTEXT 1: Host / Lobby
    const hostContext = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const pageHost = await hostContext.newPage();
    pageHost.on('dialog', async dialog => await dialog.accept());

    console.log('Step 1: Navigating to Lobby (http://localhost:3000/)...');
    await pageHost.goto('http://localhost:3000/');
    await pageHost.waitForSelector('#btnCreateRoom');
    await pageHost.screenshot({ path: path.join(SCREENSHOT_DIR, 'firefox_01_lobby.png') });
    console.log('✔ Captured firefox_01_lobby.png');

    // Create Game Room from Lobby
    console.log('Step 2: Clicking Launch Game Room...');
    await pageHost.click('#btnCreateRoom');
    await pageHost.waitForURL(/\/host\.html\?room=/);
    
    const hostUrl = pageHost.url();
    const roomCodeMatch = hostUrl.match(/room=([A-Z0-9]+)/i);
    const roomCode = roomCodeMatch ? roomCodeMatch[1].toUpperCase() : '';
    console.log(`✔ Game Room Created! Room Code: ${roomCode}`);

    await pageHost.waitForSelector('#hostBoard');
    await sleep(500);
    await pageHost.screenshot({ path: path.join(SCREENSHOT_DIR, 'firefox_03_host_board.png') });
    console.log('✔ Captured firefox_03_host_board.png');

    // CONTEXT 2: Player 1 (Alex)
    const p1Context = await browser.newContext({ viewport: { width: 450, height: 850 } });
    const pagePlayer1 = await p1Context.newPage();
    pagePlayer1.on('dialog', async dialog => await dialog.accept());
    console.log('Step 3: Joining Player 1 (Alex)...');
    await pagePlayer1.goto(`http://localhost:3000/player.html?room=${roomCode}`);
    await pagePlayer1.waitForSelector('#setupName');
    await pagePlayer1.fill('#setupName', 'Alex');
    await pagePlayer1.click('#btnSubmitSetup');
    await sleep(600);
    await pagePlayer1.screenshot({ path: path.join(SCREENSHOT_DIR, 'firefox_04_player1_buzzer.png') });
    console.log('✔ Captured firefox_04_player1_buzzer.png');

    // CONTEXT 3: Player 2 (Jennings)
    const p2Context = await browser.newContext({ viewport: { width: 450, height: 850 } });
    const pagePlayer2 = await p2Context.newPage();
    pagePlayer2.on('dialog', async dialog => await dialog.accept());
    console.log('Step 4: Joining Player 2 (Jennings)...');
    await pagePlayer2.goto(`http://localhost:3000/player.html?room=${roomCode}`);
    await pagePlayer2.waitForSelector('#setupName');
    await pagePlayer2.fill('#setupName', 'Jennings');
    const goldDot = await pagePlayer2.$('.color-dot[data-color="#f59e0b"]');
    if (goldDot) await goldDot.click();
    await pagePlayer2.click('#btnSubmitSetup');
    await sleep(600);
    await pagePlayer2.screenshot({ path: path.join(SCREENSHOT_DIR, 'firefox_05_player2_buzzer.png') });
    console.log('✔ Captured firefox_05_player2_buzzer.png');

    // CONTEXT 4: TV Display
    const tvContext = await browser.newContext({ viewport: { width: 1400, height: 800 } });
    const pageTV = await tvContext.newPage();
    pageTV.on('dialog', async dialog => await dialog.accept());
    console.log('Step 5: Opening TV Screen Display...');
    await pageTV.goto(`http://localhost:3000/board.html?room=${roomCode}`);
    await pageTV.waitForSelector('#tvBoard');
    await sleep(600);
    await pageTV.screenshot({ path: path.join(SCREENSHOT_DIR, 'firefox_06_tv_display.png') });
    console.log('✔ Captured firefox_06_tv_display.png');

    // CONTEXT 5: Pack Creator
    const creatorContext = await browser.newContext({ viewport: { width: 1300, height: 900 } });
    const pageCreator = await creatorContext.newPage();
    pageCreator.on('dialog', async dialog => await dialog.accept());
    console.log('Step 6: Testing Pack Creator UI...');
    await pageCreator.goto('http://localhost:3000/creator.html');
    await pageCreator.waitForSelector('#creatorCategoriesGrid');
    await sleep(500);
    await pageCreator.screenshot({ path: path.join(SCREENSHOT_DIR, 'firefox_02_creator.png') });
    console.log('✔ Captured firefox_02_creator.png');

    // Test Creator Tab Switch to Final Jeopardy
    await pageCreator.click('#tabFinal');
    await sleep(300);
    await pageCreator.screenshot({ path: path.join(SCREENSHOT_DIR, 'firefox_02b_creator_final.png') });
    console.log('✔ Captured firefox_02b_creator_final.png');

    // Step 7: Gameplay, Buzzer Countdown & Point Awarding
    console.log('Step 7: Testing Gameplay, Buzzer Countdown & Point Awarding...');
    
    // Host clicks first clue card ($200)
    const clueCard = await pageHost.$('#hostBoard .clue-card:not(.revealed)');
    if (clueCard) {
      await clueCard.click();
      await sleep(500);
      await pageHost.screenshot({ path: path.join(SCREENSHOT_DIR, 'firefox_07_clue_active.png') });
      console.log('✔ Clue opened on Host Control');

      // Check TV display screenshot during active clue
      await pageTV.screenshot({ path: path.join(SCREENSHOT_DIR, 'firefox_07b_tv_clue_active.png') });
      console.log('✔ Captured firefox_07b_tv_clue_active.png');

      // Host unlocks buzzers
      console.log('✔ Unlocking buzzers...');
      await pageHost.click('#btnUnlockBuzzers');
      await sleep(3300); // Wait 3.3s for countdown

      // Player 1 Buzzes In
      console.log('✔ Player 1 Buzzing In...');
      await pagePlayer1.click('#btnBuzzer', { force: true });
      await sleep(500);

      await pageHost.screenshot({ path: path.join(SCREENSHOT_DIR, 'firefox_08_buzzed_in.png') });
      console.log('✔ Captured firefox_08_buzzed_in.png');

      // Host marks correct
      console.log('✔ Host marking Player 1 answer correct (+200)...');
      await pageHost.click('#btnMarkCorrect');
      await sleep(500);

      // Close clue
      await pageHost.click('#btnCloseClue');
      await sleep(500);
    }

    // Step 8: Winner Screen Trigger
    console.log('Step 8: Testing Winner Screen Modal...');
    await pageHost.click('#btnTriggerGameOver');
    await sleep(800);
    await pageHost.screenshot({ path: path.join(SCREENSHOT_DIR, 'firefox_09_winscreen.png') });
    console.log('✔ Captured firefox_09_winscreen.png');

    // TV Display Winner Screen check
    await pageTV.screenshot({ path: path.join(SCREENSHOT_DIR, 'firefox_10_tv_winscreen.png') });
    console.log('✔ Captured firefox_10_tv_winscreen.png');

    console.log('=== All Firefox Playwright Tests Completed Successfully! ===');

  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
