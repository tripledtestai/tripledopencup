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
  calculateTuningSummary,
  calculateTuningPhysics,
  generateBotTuningLoadout,
  isSynapseGateClosed,
  computeMinimapTransform,
  computeRacerTrackProgress,
  isPointOnTrack,
  updateRacerCheckpointState,
  normalizeTuningPresets,
  RENAME_COST_COINS,
  NITRO_MIN_ACTIVATE_PCT,
} from './rules.ts';
import {
  ALL_PARTS,
  ALL_TUNING_PARTS,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_LOADOUT,
  DEFAULT_TUNING_LOADOUT,
  EMPTY_TUNING_PRESETS,
  GACHA_PITY_THRESHOLD,
  INITIAL_GIFTCODES,
  MAPS,
  PHYSICS_STAT_DESCRIPTIONS,
  STARTER_OWNED_PARTS,
  SUGGESTED_PLAYSTYLE_PRESETS,
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
  assert.equal(getRankByRP(700).name, 'Thách Đấu');
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

test('Gacha Pool allows duplicate pulls, refunds coin price on duplicates, and enforces 20-pull Pity', () => {
  assert.equal(GACHA_PITY_THRESHOLD, 20);
  const owned = [...STARTER_OWNED_PARTS];
  let pity = 0;

  // Spin 19 times forcing low roll (0.1 -> D/C bucket)
  for (let i = 0; i < GACHA_PITY_THRESHOLD - 1; i++) {
    const res = spinGachaPool(owned, pity, () => 0.1);
    assert.ok(res.item, 'Should always return an item');
    if (owned.includes(res.item!.id)) {
      assert.equal(res.isDuplicate, true);
      assert.ok(res.refundCoins > 0, 'Duplicate must refund coin value');
    } else {
      assert.equal(res.isDuplicate, false);
      assert.equal(res.refundCoins, 0);
      owned.push(res.item!.id);
    }
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

test('Gacha Pool compensates 100% coin price when rolling an already owned item', () => {
  const allIds = ALL_PARTS.map((p) => p.id);
  const res = spinGachaPool(allIds, 5, () => 0.5);
  assert.ok(res.item);
  assert.equal(res.isDuplicate, true);
  assert.ok(res.refundCoins > 0);
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
  assert.deepEqual(extractGameKeysFromKeyDown({ code: '', key: 'ă' }), [
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

test('TripleD Elderwood Gacha set and free Tier A student skin via code TripleD are configured properly', () => {
  const tripledElderwoodIds = [
    'chassis_tripled',
    'paint_tripled',
    'decal_tripled',
    'wheels_tripled',
    'spoiler_tripled',
    'underglow_tripled',
    'trail_tripled',
  ];
  for (const id of tripledElderwoodIds) {
    const part = ALL_PARTS.find((p) => p.id === id);
    assert.ok(part, `Expected TripleD Elderwood part ${id} to exist`);
    assert.equal(part.gachaOnly, true);
    assert.ok(part.tier === 'SSS' || part.tier === 'SS');
  }

  const tripledStudentIds = [
    'chassis_tripled_a',
    'paint_tripled_a',
    'decal_tripled_a',
    'wheels_tripled_a',
    'spoiler_tripled_a',
    'underglow_tripled_a',
    'trail_tripled_a',
  ];
  for (const id of tripledStudentIds) {
    const part = ALL_PARTS.find((p) => p.id === id);
    assert.ok(part, `Expected Tier A TripleD student part ${id} to exist`);
    assert.equal(part.tier, 'A');
  }

  const tripledCode = INITIAL_GIFTCODES.find((c) => c.code === 'TRIPLED');
  assert.ok(tripledCode, 'Expected giftcode TRIPLED to exist in INITIAL_GIFTCODES');
  assert.deepEqual(tripledCode.rewardParts, tripledStudentIds);
});

test('36 Performance Tuning parts (4 groups x 9 items from D to S) and 25 CP budget rules', () => {
  assert.equal(ALL_TUNING_PARTS.length, 36);
  for (const slot of ['engine', 'tires', 'body', 'nitro'] as const) {
    const slotParts = ALL_TUNING_PARTS.filter((p) => p.slot === slot);
    assert.equal(slotParts.length, 9, `Expected 9 tuning parts in slot ${slot}`);
  }

  // Starter D-tier loadout uses 8 CP (2 + 2 + 2 + 2) and is valid
  const defaultSummary = calculateTuningSummary(DEFAULT_TUNING_LOADOUT);
  assert.equal(defaultSummary.totalCP, 8);
  assert.equal(defaultSummary.isValid, true);
  assert.equal(defaultSummary.totalTopSpeed, 2); // +1 engine + 1 body
  assert.equal(defaultSummary.totalAccel, 1);
  assert.equal(defaultSummary.totalHandling, 2);
  assert.equal(defaultSummary.totalNitro, 2);
  assert.equal(defaultSummary.totalWeight, 2);

  // Exact 25 CP combo (9 CP S-tier Engine + 7 CP A-tier F1 Tires + 7 CP A-tier Carbon Body + 2 CP D-tier Nitro = 25 CP)
  const valid25Summary = calculateTuningSummary({
    engine: 'eng_s_v12_nuclear', // 9 CP
    tires: 'tire_a_f1',          // 7 CP (grassPenalty)
    body: 'body_a_carbon',       // 7 CP
    nitro: 'nitro_d_mini',       // 2 CP
  });
  assert.equal(valid25Summary.totalCP, 25);
  assert.equal(valid25Summary.isValid, true);
  assert.ok(valid25Summary.passives.includes('grassPenalty'));

  // Over-budget 36 CP combo (four 9 CP S-tier parts) must be flagged invalid
  const overBudgetSummary = calculateTuningSummary({
    engine: 'eng_s_v12_nuclear',
    tires: 'tire_s_maglev',
    body: 'body_s_titan',
    nitro: 'nitro_s_atp',
  });
  assert.equal(overBudgetSummary.totalCP, 36);
  assert.equal(overBudgetSummary.isValid, false);

  // Bot tuning loadouts must always respect <= 25 CP
  for (let seed = 0; seed < 20; seed++) {
    const botLoadout = generateBotTuningLoadout(seed);
    const botSummary = calculateTuningSummary(botLoadout);
    assert.ok(
      botSummary.totalCP <= 25 && botSummary.isValid,
      `Bot seed ${seed} exceeded 25 CP (${botSummary.totalCP})`
    );
  }
});

test('60 FPS Performance Tuning physics formulas match rebalanced specification accurately', () => {
  // Loadout: V12 Nuclear Engine (9 CP) + F1 Slick Tires (7 CP) + Raw Iron Frame (2 CP) + Mini Air Tank (2 CP) = 20 CP
  const loadout = {
    engine: 'eng_s_v12_nuclear', // Speed +14, Accel +6, Handling -8, Weight +5
    tires: 'tire_a_f1',          // Handling +10, Speed +3, Accel -3, Weight -3, grassPenalty
    body: 'body_d_iron',         // Weight +2, Speed +1
    nitro: 'nitro_d_mini',       // Nitro +2
  };
  // Totals: TopSpeed = 18, Accel = 3, Handling = 2, Nitro = 2, Weight = 4
  const phys = calculateTuningPhysics(loadout, 360, 460, 3.0, 2.0);
  assert.equal(phys.summary.totalCP, 20);
  assert.equal(phys.summary.isValid, true);

  // maxSpeed = 360 * (1 + 18 * 0.01) = 360 * 1.18 = 424.8
  assert.ok(Math.abs(phys.maxSpeed - 424.8) < 1e-6);

  // accel = 460 * (1 + 3 * 0.035) * clamp(1 - 4 * 0.004, 0.85, 1.15) = 460 * 1.105 * 0.984 = 500.1672
  assert.ok(Math.abs(phys.accel - 460 * 1.105 * 0.984) < 1e-6);

  // lateralGrip = clamp(0.70 + 2 * 0.015, 0.60, 0.99) = 0.73
  assert.ok(Math.abs(phys.lateralGrip - 0.73) < 1e-6);

  // turnSpeed = 3.0 * (1 + 2 * 0.035) = 3.0 * 1.07 = 3.21
  assert.ok(Math.abs(phys.turnSpeed - 3.21) < 1e-6);

  // corneringRetention = clamp(0.968 + 2 * 0.004, 0.935, 1.0) = 0.976
  assert.ok(Math.abs(phys.corneringRetention - 0.976) < 1e-6);

  // High handling (>= 8) grants zero cornering drag (corneringRetention === 1.0)
  const cornerKingLoadout = {
    engine: 'eng_d_piston',
    tires: 'tire_s_maglev', // Handling +15
    body: 'body_d_iron',
    nitro: 'nitro_d_mini',
  };
  const cornerKingPhys = calculateTuningPhysics(cornerKingLoadout, 360, 460, 3.0, 2.0);
  assert.equal(cornerKingPhys.corneringRetention, 1.0);
  assert.equal(cornerKingPhys.apexExitBoostBonus, 1.12);

  // Bulldozer Weight (>= 6) activates isBulldozerWeight
  const tankLoadout = {
    engine: 'eng_d_piston',
    tires: 'tire_d_hard',
    body: 'body_s_titan', // Weight +16
    nitro: 'nitro_d_mini',
  };
  const tankPhys = calculateTuningPhysics(tankLoadout, 360, 460, 3.0, 2.0);
  assert.equal(tankPhys.isBulldozerWeight, true);

  // Verify atpCore grants +20% nitroDuration and does not apply to giftBoxNitroDuration
  const atpLoadout = {
    engine: 'eng_d_piston', // 2 CP
    tires: 'tire_d_hard',   // 2 CP
    body: 'body_d_iron',    // 2 CP
    nitro: 'nitro_s_atp',   // 9 CP (Nitro +12, atpCore)
  };
  const atpPhys = calculateTuningPhysics(atpLoadout, 360, 460, 3.0, 2.0);
  assert.equal(atpPhys.summary.totalCP, 15);
  assert.ok(atpPhys.passives.includes('atpCore'));
  // giftBoxNitroDuration = 2.0 * (1 + 12 * 0.035) = 2.84 (no atpCore bonus)
  assert.ok(Math.abs(atpPhys.giftBoxNitroDuration - 2.84) < 1e-6);
  // nitroDuration = 2.84 * 1.2 = 3.408 (+20% bonus)
  assert.ok(Math.abs(atpPhys.nitroDuration - 3.408) < 1e-6);

  // Verify overdriveCore grants +20% speed multiplier during Nitro Boost
  const overdriveLoadout = {
    engine: 'eng_d_piston',
    tires: 'tire_d_hard',
    body: 'body_d_iron',
    nitro: 'nitro_s_overdrive',
  };
  const overdrivePhys = calculateTuningPhysics(overdriveLoadout, 360, 460, 3.0, 2.0);
  assert.ok(overdrivePhys.passives.includes('overdriveCore'));
  assert.equal(overdrivePhys.nitroBoostSpeedMultiplier, 1.2);
});

test('15 Maps (Map 1 -> Map 15), Dynamic Map Hazards, Tactical Hint Hiding, and Minimap Auto-Scaling work accurately', () => {
  assert.equal(MAPS.length, 15);

  // Verify Map names contain no tactical stat hint tags like "[Ưu thế:"
  for (let i = 0; i < MAPS.length; i++) {
    const m = MAPS[i];
    assert.ok(
      m.name.startsWith(`Map ${i + 1} –`),
      `Expected Map ${i + 1} name prefix, got ${m.name}`
    );
    assert.ok(
      !m.name.includes('Ưu thế'),
      `Map name must not reveal tactical stat hints: ${m.name}`
    );
    assert.equal(m.checkpointIndices.length, 10);
  }

  // Map 6: Neural Synapse Maze
  const map6 = MAPS[5];
  assert.equal(map6.id, 'map_synapse');
  assert.equal(map6.bgColor, '#120B29');
  assert.equal(map6.roadBorderColor, '#00F5D4');
  assert.ok(map6.synapseGates && map6.synapseGates.length >= 4);
  assert.ok(map6.bottleneckSegments && map6.bottleneckSegments.length >= 3);

  // Synapse Gate 5s cycle: 0..3s Open (false), 3..5s Closed (true)
  assert.equal(isSynapseGateClosed(0.0, 0), false);
  assert.equal(isSynapseGateClosed(2.9, 0), false);
  assert.equal(isSynapseGateClosed(3.1, 0), true);
  assert.equal(isSynapseGateClosed(4.9, 0), true);
  assert.equal(isSynapseGateClosed(5.1, 0), false);

  // Map 7: Gastric Acid Pit
  const map7 = MAPS[6];
  assert.equal(map7.id, 'map_gastric');
  assert.equal(map7.roadBorderColor, '#84CC16');
  assert.ok(map7.acidZones && map7.acidZones.length >= 4);
  assert.ok(map7.crosswindZones && map7.crosswindZones.length >= 3);

  // Map 8: Chloroplast Solar Circuit
  const map8 = MAPS[7];
  assert.equal(map8.id, 'map_chloroplast');
  assert.equal(map8.bgColor, '#064E3B');
  assert.equal(map8.jumpPads?.length, 2);
  assert.ok(map8.solarZones && map8.solarZones.length >= 4);

  // Map 9: AROUND THE BIO-WORLD (3x Marathon with 4 consecutive Biomes)
  const map9 = MAPS[8];
  assert.equal(map9.id, 'map_bioworld');
  assert.equal(map9.waypoints.length, 40);
  assert.equal(map9.biomeSegments?.length, 4);

  // Map 10: Airport Drag & Blitz Strip (2x road width, chicanes & jump pads)
  const map10 = MAPS[9];
  assert.equal(map10.id, 'map_airport');
  assert.equal(map10.roadWidth, 440);
  assert.ok(map10.tireBarriers.length >= 8);
  assert.equal(map10.jumpPads?.length, 2);

    // Verify Minimap auto-scaling fits all waypoints of Map 9 and Map 10 inside a 200x150 minimap canvas
  for (const m of [map9, map10]) {
    const tf = computeMinimapTransform(m, 200, 150, 14);
    assert.ok(tf.scale > 0 && tf.scale < 0.04);
    for (const wp of m.waypoints) {
      const screenX = 100 + (wp.x - tf.centerX) * tf.scale;
      const screenY = 75 + (wp.y - tf.centerY) * tf.scale;
      assert.ok(
        screenX >= 0 && screenX <= 200 && screenY >= 0 && screenY <= 150,
        `Waypoint (${wp.x}, ${wp.y}) of ${m.id} overflowed minimap: (${screenX}, ${screenY})`
      );
    }
  }
});

test('2-Level Overpass and Down-Ramp transitions return to elevation 0 (Tầng 1) immediately after descending on Maps 11..14', () => {
  for (const mapId of ['map_polypeptide', 'map_ribosome', 'map_cochlea', 'map_macrophage']) {
    const map = MAPS.find((m) => m.id === mapId);
    assert.ok(map, `Expected map ${mapId} to exist`);
    const pts = map.waypoints;

    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const elevA = a.elevation ?? 0;
      const elevB = b.elevation ?? 0;

      // Test every Down-Ramp (1 -> 0): once past t = 0.20, car with preferredElevation=1 MUST transition to elevation 0!
      if (elevA === 1 && elevB === 0) {
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        for (const t of [0.25, 0.5, 0.75, 0.95]) {
          const px = a.x + (b.x - a.x) * t;
          const py = a.y + (b.y - a.y) * t;
          const check = isPointOnTrack({ x: px, y: py }, map, 1, angle);
          assert.equal(
            check.elevation,
            0,
            `Expected elevation 0 on down-ramp seg ${i} (t=${t}) of ${mapId}, got ${check.elevation}`
          );
        }
      }

      // Test every Ground segment (0 -> 0) immediately following a Down-Ramp:
      // Even if a car enters the ground segment still carrying preferredElevation=1, it MUST switch to elevation 0!
      const prev = pts[(i - 1 + pts.length) % pts.length];
      if ((prev.elevation ?? 0) === 1 && elevA === 0 && elevB === 0) {
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        for (const t of [0.1, 0.35, 0.7]) {
          const px = a.x + (b.x - a.x) * t;
          const py = a.y + (b.y - a.y) * t;
          const check = isPointOnTrack({ x: px, y: py }, map, 1, angle);
          assert.equal(
            check.elevation,
            0,
            `Expected elevation 0 on ground seg ${i} (t=${t}) after down-ramp of ${mapId}, got ${check.elevation}`
          );
          assert.equal(check.onRoad, true);
        }
      }
    }
  }
});

test('Multiplayer computedStats syncs full physics bonuses & passives without leaking part names/IDs', () => {
  const secretLoadout = {
    engine: 'eng_s_v12_nuclear', // 9 CP
    tires: 'tire_a_f1',          // 7 CP
    body: 'body_a_carbon',       // 7 CP
    nitro: 'nitro_d_mini',       // 2 CP
  };
  const directPhys = calculateTuningPhysics(secretLoadout);
  const netStats = directPhys.computedStats;

  // Verify no part IDs are leaked in netStats JSON
  const serialized = JSON.stringify(netStats);
  assert.ok(!serialized.includes('eng_s_v12_nuclear'));
  assert.ok(!serialized.includes('tire_a_f1'));
  assert.ok(!serialized.includes('body_a_carbon'));
  assert.ok(!serialized.includes('nitro_d_mini'));

  // Recomputing physics from netStats produces identical physics values
  const remotePhys = calculateTuningPhysics(netStats);
  assert.equal(remotePhys.maxSpeed, directPhys.maxSpeed);
  assert.equal(remotePhys.accel, directPhys.accel);
  assert.equal(remotePhys.turnSpeed, directPhys.turnSpeed);
  assert.equal(remotePhys.driftGrip, directPhys.driftGrip);
  assert.equal(remotePhys.nitroDuration, directPhys.nitroDuration);
  assert.equal(remotePhys.weight, directPhys.weight);
  assert.deepEqual(remotePhys.passives, directPhys.passives);
});

test('Elevation isolation: off-road on Level 0 never jumps onto Level 1 bridge, and [R] rescue preserves elevation', () => {
  for (let mapIdx = 0; mapIdx < MAPS.length; mapIdx++) {
    const map = MAPS[mapIdx];
    const pts = map.waypoints;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a.elevation ?? 0) === 1 && (b.elevation ?? 0) === 1) {
        const midX = (a.x + b.x) * 0.5;
        const midY = (a.y + b.y) * 0.5;

        // 1. A car at elevation 0 driving right underneath or alongside a 1->1 bridge span must NEVER jump to elevation 1
        const checkUnder = isPointOnTrack({ x: midX, y: midY }, map, 0);
        assert.equal(
          checkUnder.elevation,
          0,
          `Map ${mapIdx + 1} (${map.name}) seg ${i}: car on elevation 0 must not jump to elevation 1 at bridge midpoint`
        );

        // 2. Pressing [R] (applyCarRescue) while at elevation 0 right under a bridge must rescue to elevation 0
        const dummyRacer0: any = {
          id: 'p1',
          x: midX + 35,
          y: midY - 35,
          vx: 0,
          vy: 0,
          angle: 0,
          speed: 0,
          elevation: 0,
          currentCheckpoint: 0,
        };
        const rescued0 = applyCarRescue(dummyRacer0, map);
        assert.equal(
          rescued0.elevation,
          0,
          `Map ${mapIdx + 1} (${map.name}): [R] rescue from elevation 0 must stay on elevation 0`
        );

        // 3. Pressing [R] while at elevation 1 on the bridge must stay on elevation 1
        const dummyRacer1: any = {
          ...dummyRacer0,
          elevation: 1,
        };
        const rescued1 = applyCarRescue(dummyRacer1, map);
        assert.equal(
          rescued1.elevation,
          1,
          `Map ${mapIdx + 1} (${map.name}): [R] rescue from elevation 1 on bridge must stay on elevation 1`
        );
      }
    }
  }
});

test('Up-Ramp (0 -> 1) promotes car to elevation 1 early (t >= 0.2) so car never disappears under bridge deck', () => {
  for (let mapIdx = 0; mapIdx < MAPS.length; mapIdx++) {
    const map = MAPS[mapIdx];
    const pts = map.waypoints;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a.elevation ?? 0) === 0 && (b.elevation ?? 0) === 1) {
        let currentElev: 0 | 1 = 0;
        for (const t of [0.22, 0.4, 0.6, 0.8, 0.95]) {
          const px = a.x + (b.x - a.x) * t;
          const py = a.y + (b.y - a.y) * t;
          const res = isPointOnTrack({ x: px, y: py }, map, currentElev);
          currentElev = res.elevation;
          assert.equal(
            currentElev,
            1,
            `Map ${mapIdx + 1} (${map.name}) up-ramp seg ${i} at t=${t}: expected elevation 1 so car renders above bridge deck, got ${currentElev}`
          );
          assert.equal(res.onRoad, true);
        }
      }
    }
  }
});

test('Back-row start collision + [R] rescue + crossing start line never counts as Lap 2, and full sequential checkpoints are required', () => {
  for (let mapIdx = 0; mapIdx < MAPS.length; mapIdx++) {
    const map = MAPS[mapIdx];
    const p0 = map.waypoints[0];
    const p1 = map.waypoints[1];
    const startAngle = Math.atan2(p1.y - p0.y, p1.x - p0.x);

    // Spawn racer in Row 3 behind start line (backDist = 189px), simulate collision knockback + [R] press
    const racer: RacerState = {
      id: 'back_row_player',
      username: 'BackRow',
      isBot: false,
      loadout: DEFAULT_LOADOUT,
      rp: 100,
      x: p0.x - Math.cos(startAngle) * 189 + 45,
      y: p0.y - Math.sin(startAngle) * 189 - 45,
      vx: 0,
      vy: 0,
      angle: startAngle,
      speed: 0,
      angularVelocity: 0,
      drifting: false,
      lap: 1,
      currentCheckpoint: 0,
      visitedCheckpointsMask: 1,
      waypointIndex: 1,
      totalProgress: 0,
      finished: false,
      finishTimeMs: 0,
      placement: 8,
      heldItem: null,
      nitroCharge: 100,
      isBoostingNitro: false,
      nitroTimer: 0,
      spinTimer: 0,
      mudTimer: 0,
      stunTimer: 0,
      invulnerableTimer: 0,
      rocketStartTimer: 0,
      stuckTimer: 0,
      wrongWay: false,
      elevation: p0.elevation ?? 0,
    };

    // 1. Press [R] while behind the start line
    const rescued = applyCarRescue(racer, map);
    Object.assign(racer, rescued);
    assert.equal(
      racer.currentCheckpoint,
      0,
      `Map ${mapIdx + 1} (${map.name}): [R] behind start line must keep currentCheckpoint = 0`
    );
    assert.equal(racer.lap, 1);

    // 2. Drive across the start line (waypoints[0]) -> must still be on Lap 1!
    racer.x = p0.x + Math.cos(startAngle) * 15;
    racer.y = p0.y + Math.sin(startAngle) * 15;
    const stepAtStart = updateRacerCheckpointState(racer, map);
    assert.equal(
      stepAtStart.lapCompleted,
      false,
      `Map ${mapIdx + 1} (${map.name}): crossing start line after [R] must NOT complete a lap`
    );
    assert.equal(racer.lap, 1);

    // 3. Even if a racer somehow jumps to the last checkpoint without visiting intermediate checkpoints, lap must NOT count
    racer.currentCheckpoint = map.checkpointIndices.length - 1;
    racer.visitedCheckpointsMask = 1 | (1 << (map.checkpointIndices.length - 1)); // Missing intermediate checkpoints 1..8
    racer.x = p0.x + Math.cos(startAngle) * 10;
    racer.y = p0.y + Math.sin(startAngle) * 10;
    const cheatedStep = updateRacerCheckpointState(racer, map);
    assert.equal(
      cheatedStep.lapCompleted,
      false,
      `Map ${mapIdx + 1} (${map.name}): crossing finish line without visiting all checkpoints must NOT count lap`
    );
    assert.equal(racer.lap, 1);

    // 4. Driving sequentially through all checkpoints 0 -> 1 -> ... -> M-1 -> Finish Line counts Lap 2
    racer.currentCheckpoint = 0;
    racer.visitedCheckpointsMask = 1;
    for (let c = 1; c < map.checkpointIndices.length; c++) {
      const cpWp = map.waypoints[map.checkpointIndices[c]];
      racer.x = cpWp.x;
      racer.y = cpWp.y;
      racer.elevation = cpWp.elevation ?? 0;
      updateRacerCheckpointState(racer, map);
      const expectedCp = map.isPointToPoint && c === map.checkpointIndices.length - 1 ? 0 : c;
      assert.equal(
        racer.currentCheckpoint,
        expectedCp,
        `Map ${mapIdx + 1} (${map.name}): expected sequential checkpoint ${expectedCp}`
      );
    }
    if (!map.isPointToPoint) {
      racer.x = p0.x + Math.cos(startAngle) * 10;
      racer.y = p0.y + Math.sin(startAngle) * 10;
      racer.elevation = p0.elevation ?? 0;
      const finishStep = updateRacerCheckpointState(racer, map);
      assert.equal(
        finishStep.lapCompleted,
        true,
        `Map ${mapIdx + 1} (${map.name}): completing all checkpoints in order and crossing finish line must count Lap 2`
      );
      assert.equal(racer.lap, 2);
    } else {
      assert.equal(racer.lap, 2);
    }
  }
});

test('Road-spline leaderboard progress ranks starting grid rows and multi-segment checkpoints strictly along the track', () => {
  for (let mapIdx = 0; mapIdx < MAPS.length; mapIdx++) {
    const map = MAPS[mapIdx];
    const p0 = map.waypoints[0];
    const p1 = map.waypoints[1];
    const startAngle = Math.atan2(p1.y - p0.y, p1.x - p0.x);

    // 1. Starting grid ordering: Row 0 (-45px) > Row 1 (-93px) > Row 2 (-141px) > Row 3 (-189px)
    //    and a car +30px past start line > Row 0 (-45px)
    const progPastStart = computeRacerTrackProgress(
      {
        x: p0.x + Math.cos(startAngle) * 30,
        y: p0.y + Math.sin(startAngle) * 30,
        lap: 1,
        currentCheckpoint: 0,
        elevation: p0.elevation ?? 0,
      },
      map
    ).totalProgress;
    const progRow0 = computeRacerTrackProgress(
      {
        x: p0.x - Math.cos(startAngle) * 45,
        y: p0.y - Math.sin(startAngle) * 45,
        lap: 1,
        currentCheckpoint: 0,
        elevation: p0.elevation ?? 0,
      },
      map
    ).totalProgress;
    const progRow2 = computeRacerTrackProgress(
      {
        x: p0.x - Math.cos(startAngle) * 141,
        y: p0.y - Math.sin(startAngle) * 141,
        lap: 1,
        currentCheckpoint: 0,
        elevation: p0.elevation ?? 0,
      },
      map
    ).totalProgress;

    assert.ok(
      progPastStart > progRow0 && progRow0 > progRow2,
      `Map ${mapIdx + 1} (${map.name}): expected progPastStart (${progPastStart}) > progRow0 (${progRow0}) > progRow2 (${progRow2})`
    );

    // 2. Within the same checkpoint (e.g. cp = 1), a car on segment (segStart + 1) at t = 0.15
    //    must ALWAYS rank ahead of a car on segment (segStart) at t = 0.85
    const segStart = map.checkpointIndices[1];
    const segNext = map.checkpointIndices[2];
    if (segNext - segStart >= 2) {
      const a0 = map.waypoints[segStart];
      const b0 = map.waypoints[segStart + 1];
      const a1 = map.waypoints[segStart + 1];
      const b1 = map.waypoints[segStart + 2];

      const carBehindOnSeg0 = computeRacerTrackProgress(
        {
          x: a0.x + (b0.x - a0.x) * 0.85,
          y: a0.y + (b0.y - a0.y) * 0.85,
          lap: 1,
          currentCheckpoint: 1,
          elevation: a0.elevation ?? 0,
        },
        map
      ).totalProgress;

      const carAheadOnSeg1 = computeRacerTrackProgress(
        {
          x: a1.x + (b1.x - a1.x) * 0.15,
          y: a1.y + (b1.y - a1.y) * 0.15,
          lap: 1,
          currentCheckpoint: 1,
          elevation: a1.elevation ?? 0,
        },
        map
      ).totalProgress;

      assert.ok(
        carAheadOnSeg1 > carBehindOnSeg0,
        `Map ${mapIdx + 1} (${map.name}): car on seg ${segStart + 1} (t=0.15, prog=${carAheadOnSeg1}) must rank ahead of car on seg ${segStart} (t=0.85, prog=${carBehindOnSeg0})`
      );
    }
  }
});

test('User tuning presets enforce 2 saveable slots, suggested playstyle presets stay within 25 CP, and all 5 physics stats provide impact descriptions', () => {
  assert.equal(EMPTY_TUNING_PRESETS.length, 2);
  const normalizedEmpty = normalizeTuningPresets(undefined);
  assert.equal(normalizedEmpty.length, 2);
  assert.deepEqual(normalizedEmpty, [null, null]);

  // Verify suggested playstyle presets
  assert.ok(
    SUGGESTED_PLAYSTYLE_PRESETS.length >= 4,
    'Should provide multiple pre-configured playstyle presets'
  );
  const validPartIds = new Set(ALL_TUNING_PARTS.map((p) => p.id));
  for (const preset of SUGGESTED_PLAYSTYLE_PRESETS) {
    assert.ok(preset.id && preset.name && preset.styleTag && preset.description);
    for (const partId of Object.values(preset.loadout)) {
      assert.ok(
        validPartIds.has(partId),
        `Suggested preset ${preset.id} references unknown part ${partId}`
      );
    }
    const summary = calculateTuningSummary(preset.loadout);
    assert.ok(
      summary.isValidCP && summary.totalCP <= 25,
      `Suggested preset ${preset.name} must not exceed 25 CP (got ${summary.totalCP} CP)`
    );
  }

  // Verify all 5 physics stats have ! info descriptions
  const statKeys = ['topSpeed', 'accel', 'handling', 'nitro', 'weight'] as const;
  for (const key of statKeys) {
    const info = PHYSICS_STAT_DESCRIPTIONS[key];
    assert.ok(info, `Missing physics stat description for ${key}`);
    assert.ok(info.title.length > 0);
    assert.ok(info.impact.length > 10);
    assert.ok(info.tip.length > 5);
  }
});




