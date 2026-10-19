import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidGmail,
  isValidPin,
  getRankByRP,
  calculateRPDelta,
  calculateCoinReward,
  getLapCoinMultiplier,
  isNightMapTheme,
  spinGachaPool,
  rollRaceItem,
  balanceTeamsByRP,
  formatLeaderboardClipboard,
  applyCarRescue,
  calculateCarClass,
  RENAME_COST_COINS,
  NITRO_MIN_ACTIVATE_PCT,
} from './rules.ts';
import {
  ALL_PARTS,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_LOADOUT,
  GACHA_PITY_THRESHOLD,
  MAPS,
  STARTER_OWNED_PARTS,
} from './constants.ts';
import {
  extractGameKeysFromKeyDown,
  extractGameKeysFromKeyUp,
} from './keyboard.ts';
import type { RacerState } from './types.ts';

test('Gmail and 4-digit PIN validation works accurately', () => {
  assert.equal(isValidGmail('hocsinh12a@gmail.com'), true);
  assert.equal(isValidGmail('  Minh.Anh99@gmail.com '), true);
  assert.equal(isValidGmail('teacher@yahoo.com'), false);
  assert.equal(isValidGmail('@gmail.com'), false);

  assert.equal(isValidPin('1234'), true);
  assert.equal(isValidPin('0088'), true);
  assert.equal(isValidPin('123'), false);
  assert.equal(isValidPin('12a4'), false);
});

test('7 Liên Quân Rank tiers map properly from RP', () => {
  assert.equal(getRankByRP(0).name, 'Đồng');
  assert.equal(getRankByRP(49).name, 'Đồng');
  assert.equal(getRankByRP(50).name, 'Bạc');
  assert.equal(getRankByRP(120).name, 'Vàng');
  assert.equal(getRankByRP(220).name, 'Bạch Kim');
  assert.equal(getRankByRP(350).name, 'Kim Cương');
  assert.equal(getRankByRP(500).name, 'Tinh Anh');
  assert.equal(getRankByRP(700).name, 'Cao Thủ / Thách Đấu TripleD');
  assert.equal(getRankByRP(1250).glow, true);
});

test('RP delta calculation only awards RP in official Teacher Tournament (teacher_cup) and returns 0 for practice_ai / friends_pvp', () => {
  assert.equal(calculateRPDelta(1, 20, 100, 'teacher_cup'), 30);
  assert.equal(calculateRPDelta(2, 20, 100, 'teacher_cup'), 20);
  assert.equal(calculateRPDelta(3, 20, 100, 'teacher_cup'), 20);
  assert.equal(calculateRPDelta(7, 20, 100, 'teacher_cup'), 10);
  assert.equal(calculateRPDelta(12, 30, 100, 'teacher_cup'), 5); // Upper half (>10)
  assert.equal(calculateRPDelta(18, 20, 150, 'teacher_cup'), -5); // Lower half in Gold rank
  assert.equal(calculateRPDelta(18, 20, 30, 'teacher_cup'), 0); // Lower half in Bronze rank (no penalty)

  // Non-tournament modes must NOT affect Ranked RP
  assert.equal(calculateRPDelta(1, 20, 100, 'practice_ai'), 0);
  assert.equal(calculateRPDelta(1, 20, 100, 'friends_pvp'), 0);
  assert.equal(calculateRPDelta(18, 20, 300, 'practice_ai'), 0);
});

test('Coin rewards match placement tiers and team win bonus', () => {
  assert.equal(calculateCoinReward(1, false), 30);
  assert.equal(calculateCoinReward(2, false), 25);
  assert.equal(calculateCoinReward(3, false), 20);
  assert.equal(calculateCoinReward(5, false), 15);
  assert.equal(calculateCoinReward(8, false), 10);
  assert.equal(calculateCoinReward(15, false), 5);
  // With +15 Xu team victory bonus
  assert.equal(calculateCoinReward(1, true), 45);
  assert.equal(calculateCoinReward(12, true), 20);
});

test('Gacha Knock-out Pool never returns duplicate owned items and enforces 20-pull Pity', () => {
  assert.equal(GACHA_PITY_THRESHOLD, 20);
  const owned = [...STARTER_OWNED_PARTS];
  let pity = 0;

  // Spin 19 times forcing low roll (0.1 -> D/C bucket)
  for (let i = 0; i < GACHA_PITY_THRESHOLD - 1; i++) {
    const res = spinGachaPool(owned, pity, () => 0.1);
    assert.ok(res.item, 'Should always return an unowned item');
    assert.equal(owned.includes(res.item!.id), false, 'Must not duplicate owned item');
    owned.push(res.item!.id);
    pity = res.newPity;
  }

  assert.equal(pity, 19, 'After 19 non-mythic pulls, pity should be 19');

  // 20th pull must trigger pity and guarantee SS or SSS
  const twentieth = spinGachaPool(owned, pity, () => 0.1);
  assert.equal(twentieth.isPityTriggered, true);
  assert.ok(twentieth.item);
  assert.ok(
    twentieth.item!.tier === 'SS' || twentieth.item!.tier === 'SSS',
    `20th pull must be SS or SSS but got ${twentieth.item!.tier}`
  );
  assert.equal(twentieth.newPity, 0, 'Pity resets to 0 after hitting SS/SSS');
});

test('Gacha Knock-out Pool can exhaust all items cleanly', () => {
  const allIds = ALL_PARTS.map((p) => p.id);
  const res = spinGachaPool(allIds, 5);
  assert.equal(res.item, null);
});

test('Item rubber-banding boosts Nitro and Rocket rate for bottom half', () => {
  // Roll = 0.60: in upper half (1st of 10), 0.60 is 'banana'; in bottom half (8th of 10), 0.60 is 'rocket'
  assert.equal(rollRaceItem(1, 10, () => 0.60), 'banana');
  assert.equal(rollRaceItem(8, 10, () => 0.60), 'rocket');
});

test('Team auto-balance distributes RP evenly via snake draft', () => {
  const players = [
    { id: '1', rp: 800 },
    { id: '2', rp: 600 },
    { id: '3', rp: 400 },
    { id: '4', rp: 200 },
  ];
  const balanced = balanceTeamsByRP(players, 2);
  const team1RP = balanced
    .filter((p) => p.teamId === 1)
    .reduce((sum, p) => sum + p.rp, 0);
  const team2RP = balanced
    .filter((p) => p.teamId === 2)
    .reduce((sum, p) => sum + p.rp, 0);
  // Snake draft: Team 1 gets 800 + 200 = 1000; Team 2 gets 600 + 400 = 1000
  assert.equal(team1RP, 1000);
  assert.equal(team2RP, 1000);
});

test('Car rescue resets position to checkpoint and grants 1.5s invulnerability', () => {
  const dummyRacer: RacerState = {
    id: 'p1',
    username: 'Test',
    isBot: false,
    loadout: DEFAULT_LOADOUT,
    rp: 100,
    x: 9999,
    y: 9999,
    vx: 50,
    vy: 50,
    angle: 0,
    speed: 100,
    angularVelocity: 1,
    drifting: false,
    lap: 1,
    currentCheckpoint: 2,
    waypointIndex: 4,
    totalProgress: 4,
    finished: false,
    finishTimeMs: 0,
    placement: 1,
    heldItem: null,
    nitroCharge: 100,
    isBoostingNitro: false,
    nitroTimer: 0,
    spinTimer: 1.0,
    mudTimer: 0,
    stunTimer: 1.0,
    invulnerableTimer: 0,
    rocketStartTimer: 0,
    stuckTimer: 4.2,
    wrongWay: true,
  };
  const rescued = applyCarRescue(dummyRacer, MAPS[0]);
  assert.equal(rescued.invulnerableTimer, 1.5);
  assert.equal(rescued.stuckTimer, 0);
  assert.equal(rescued.spinTimer, 0);
  assert.equal(rescued.stunTimer, 0);
  assert.equal(rescued.wrongWay, false);
});

test('Clipboard leaderboard formatting produces compact Hạng - Tên - Xu lines', () => {
  const text = formatLeaderboardClipboard([
    { placement: 1, username: 'Hoàng Nam', coinsEarned: 30 },
    { placement: 2, username: 'Khánh Linh', coinsEarned: 25 },
  ]);
  assert.ok(text.includes('Hạng 1 - Hoàng Nam - +30 Xu'));
  assert.ok(text.includes('Hạng 2 - Khánh Linh - +25 Xu'));
});

test('Teacher default password is set to max123123de2', () => {
  assert.equal(DEFAULT_ADMIN_PASSWORD, 'max123123de2');
});

test('Unikey / Vietnamese IME Telex & VNI keyboard mapper normalizes composed characters accurately', () => {
  // Telex: W -> 'ư', A+W -> 'ă', A+S -> 'á', D+D -> 'đ', A+R -> 'ả'
  assert.deepEqual(extractGameKeysFromKeyDown({ code: '', key: 'ư' }), ['KeyW']);
  assert.deepEqual(extractGameKeysFromKeyDown({ code: 'Unidentified', key: 'ă' }), [
    'KeyA',
    'KeyW',
  ]);
  assert.deepEqual(extractGameKeysFromKeyDown({ code: '', key: 'á' }), [
    'KeyA',
    'KeyS',
  ]);
  assert.deepEqual(extractGameKeysFromKeyDown({ code: '', key: 'đ' }), ['KeyD']);
  assert.deepEqual(extractGameKeysFromKeyDown({ code: '', key: 'ả' }), [
    'KeyA',
    'KeyR',
  ]);
  assert.deepEqual(extractGameKeysFromKeyDown({ code: '', key: 'Shift' }), [
    'ShiftLeft',
  ]);

  // Synthetic Unikey VK_PACKET keyup (empty code + composed char) should NOT release physical keys prematurely
  assert.deepEqual(extractGameKeysFromKeyUp({ code: '', key: 'ư' }), []);
  // Physical keyup with code releases properly
  assert.deepEqual(extractGameKeysFromKeyUp({ code: 'KeyW', key: 'w' }), ['KeyW']);
});

test('Gacha Banners (PROJECT, Pool Party, T1) prioritize rate-up skin parts on 20-pull pity', () => {
  const t1RateUp = [
    'chassis_t1',
    'trail_t1',
    'paint_t1',
    'wheels_t1',
    'spoiler_t1',
    'underglow_t1',
    'decal_t1',
  ];
  const res = spinGachaPool(
    [...STARTER_OWNED_PARTS],
    GACHA_PITY_THRESHOLD - 1,
    () => 0.1,
    t1RateUp
  );
  assert.equal(res.isPityTriggered, true);
  assert.ok(res.item && t1RateUp.includes(res.item.id));
});

test('Car Class is calculated as the average of all 7 equipped parts and constants match requirements', () => {
  assert.equal(RENAME_COST_COINS, 50);
  assert.equal(NITRO_MIN_ACTIVATE_PCT, 20);

  // Starter loadout (all 7 parts are D -> score 1 each -> average 1.0 -> Class D)
  const starterClass = calculateCarClass(DEFAULT_LOADOUT);
  assert.equal(starterClass.tier, 'D');
  assert.equal(starterClass.averageScore, 1);

  // Full T1 / Mythic loadout -> average 6.71 -> rounds to 7 -> Class SSS
  const t1Class = calculateCarClass({
    chassis: 'chassis_t1',
    paint: 'paint_t1',
    decal: 'decal_t1',
    wheels: 'wheels_t1',
    spoiler: 'spoiler_t1',
    underglow: 'underglow_t1',
    trail: 'trail_t1',
  });
  assert.equal(t1Class.tier, 'SSS');
  assert.ok(t1Class.averageScore > 6.5);

  // Mixed loadout: 4 SSS parts (4 * 7 = 28) + 3 Starter D parts (3 * 1 = 3) -> 31/7 = 4.43 -> Class A
  const mixedClass = calculateCarClass({
    ...DEFAULT_LOADOUT,
    chassis: 'chassis_t1',
    paint: 'paint_t1',
    spoiler: 'spoiler_t1',
    trail: 'trail_t1',
  });
  assert.equal(mixedClass.tier, 'A');
});

test('Headlights only turn on at night and coin rewards scale with difficulty and laps', () => {
  // Daytime themes -> false
  assert.equal(isNightMapTheme('city'), false);
  assert.equal(isNightMapTheme('swamp'), false);
  // Night / Dark themes -> true
  assert.equal(isNightMapTheme('dna'), true);
  assert.equal(isNightMapTheme('cryo'), true);
  assert.equal(isNightMapTheme('aorta'), true);
  assert.equal(isNightMapTheme('night'), true);

  // Coin scaling by difficulty (3 laps = 1.0x lap multiplier)
  const easyCoins = calculateCoinReward(1, false, 'practice_ai', undefined, 'easy', 3);
  const medCoins = calculateCoinReward(1, false, 'practice_ai', undefined, 'medium', 3);
  const hardCoins = calculateCoinReward(1, false, 'practice_ai', undefined, 'hard', 3);
  const nightmareCoins = calculateCoinReward(1, false, 'practice_ai', undefined, 'nightmare', 3);
  assert.ok(easyCoins < medCoins);
  assert.ok(medCoins < hardCoins);
  assert.ok(hardCoins < nightmareCoins);

  // Coin scaling by laps
  assert.equal(getLapCoinMultiplier(3), 1.0);
  const lap1Coins = calculateCoinReward(1, false, 'practice_ai', undefined, 'medium', 1);
  const lap5Coins = calculateCoinReward(1, false, 'practice_ai', undefined, 'medium', 5);
  const lap10Coins = calculateCoinReward(1, false, 'practice_ai', undefined, 'medium', 10);
  assert.ok(lap1Coins < medCoins);
  assert.ok(medCoins < lap5Coins);
  assert.ok(lap5Coins < lap10Coins);
});

test('All 7 car customization slots include rich skins across tiers D, C, B, and A', () => {
  const slots = [
    'chassis',
    'paint',
    'decal',
    'wheels',
    'spoiler',
    'underglow',
    'trail',
  ] as const;
  for (const slot of slots) {
    const slotParts = ALL_PARTS.filter((p) => p.slot === slot);
    for (const tier of ['D', 'C', 'B', 'A'] as const) {
      assert.ok(
        slotParts.some((p) => p.tier === tier),
        `Expected slot ${slot} to have at least one ${tier}-tier skin/part`
      );
    }
    assert.ok(
      slotParts.filter((p) => ['D', 'C', 'B', 'A'].includes(p.tier)).length >= 7,
      `Expected slot ${slot} to have at least 7 D-to-A tier parts`
    );
  }
});




