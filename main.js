(() => {
  "use strict";

  const SAVE_KEY = "island_dev_game_save";
  const SAVE_VERSION = 2;
  const PLAYER_RADIUS = 24;
  const DEPOSIT_INTERVAL = 0.16;

  const RESOURCE_TYPES = ["wood", "stone", "food", "fiber", "ore"];
  const COST_TYPES = ["money", ...RESOURCE_TYPES];
  const RESOURCE_INFO = {
    money: { label: "コイン", color: "#ffd84d" },
    wood: { label: "木材", value: 10, color: "#c77a32", cap: 15 },
    stone: { label: "石材", value: 15, color: "#d9ded7", cap: 15 },
    food: { label: "食料", value: 8, color: "#f06757", cap: 15 },
    fiber: { label: "繊維", value: 12, color: "#91dc50", cap: 15 },
    ore: { label: "鉱石", value: 35, color: "#68c9f5", cap: 8 }
  };

  const GATHER_SECONDS = {
    wood: 1.45,
    stone: 1.75,
    food: 1.15,
    fiber: 1.12,
    ore: 2.2
  };

  const RESPAWN_MS = {
    wood: 15000,
    stone: 18500,
    food: 12500,
    fiber: 11500,
    ore: 24000
  };

  const ASSET_SOURCES = {
    islandBg: "assets/island-bg.png",
    treeAlive: "assets/tree-alive.png",
    treeStump: "assets/tree-stump.png",
    player: "assets/player.png",
    sellStation: "assets/sell-station.png",
    workerHut: "assets/worker-hut.png",
    rock1: "assets/rock-1.png",
    rock2: "assets/rock-2.png",
    woodStorage: "assets/building-wood-storage.png",
    stoneYard: "assets/building-stone-yard.png",
    mine: "assets/building-mine.png",
    farm: "assets/building-farm.png",
    house: "assets/building-house.png",
    nodeStone: "assets/node-stone.png",
    nodeOre: "assets/node-ore.png",
    nodeFiber: "assets/node-fiber.png",
    nodeFood: "assets/node-food.png"
  };

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const els = {
    money: document.getElementById("moneyValue"),
    wood: document.getElementById("woodValue"),
    woodCapacity: document.getElementById("woodCapacity"),
    stone: document.getElementById("stoneValue"),
    stoneCapacity: document.getElementById("stoneCapacity"),
    food: document.getElementById("foodValue"),
    foodCapacity: document.getElementById("foodCapacity"),
    fiber: document.getElementById("fiberValue"),
    fiberCapacity: document.getElementById("fiberCapacity"),
    ore: document.getElementById("oreValue"),
    oreCapacity: document.getElementById("oreCapacity"),
    residents: document.getElementById("residentValue"),
    rows: {
      money: document.getElementById("moneyRow"),
      wood: document.getElementById("woodRow"),
      stone: document.getElementById("stoneRow"),
      food: document.getElementById("foodRow"),
      fiber: document.getElementById("fiberRow"),
      ore: document.getElementById("oreRow")
    },
    missionTitle: document.getElementById("missionTitle"),
    missionStatus: document.getElementById("missionStatus"),
    missionReward: document.getElementById("missionReward"),
    missionProgress: document.getElementById("missionProgress"),
    constructionPanel: document.getElementById("constructionPanel"),
    constructionTitle: document.getElementById("constructionTitle"),
    constructionMaterials: document.getElementById("constructionMaterials"),
    constructionProgress: document.getElementById("constructionProgress"),
    constructionHint: document.getElementById("constructionHint"),
    toastLayer: document.getElementById("toastLayer"),
    celebrationBanner: document.getElementById("celebrationBanner"),
    sellHint: document.getElementById("sellHint"),
    joystick: document.getElementById("joystick"),
    joystickKnob: document.getElementById("joystickKnob"),
    sellButton: document.getElementById("sellButton"),
    buildButton: document.getElementById("buildButton"),
    resetButton: document.getElementById("resetButton"),
    buildMenu: document.getElementById("buildMenu"),
    closeBuildButton: document.getElementById("closeBuildButton"),
    buildList: document.getElementById("buildList"),
    endingPanel: document.getElementById("endingPanel"),
    endingCloseButton: document.getElementById("endingCloseButton")
  };

  const world = {
    width: 1600,
    height: 2200,
    cx: 800,
    cy: 1085,
    sandRx: 690,
    sandRy: 950
  };

  const AREA_DEFS = {
    start: {
      id: "start",
      label: "はじまりの浜辺"
    },
    stoneCoast: {
      id: "stoneCoast",
      label: "石の海岸",
      hint: "橋を完成させると解放",
      x: 0,
      y: 780,
      width: 520,
      height: 720,
      labelX: 330,
      labelY: 1080
    },
    greenField: {
      id: "greenField",
      label: "緑の草原",
      hint: "草原への道を完成させると解放",
      x: 1080,
      y: 780,
      width: 520,
      height: 720,
      labelX: 1270,
      labelY: 1080
    },
    mineHill: {
      id: "mineHill",
      label: "鉱山エリア",
      hint: "山道を完成させると解放",
      x: 0,
      y: 0,
      width: 1600,
      height: 780,
      labelX: 800,
      labelY: 520
    },
    harbor: {
      id: "harbor",
      label: "港エリア",
      hint: "港を完成させると解放",
      x: 0,
      y: 1500,
      width: 1600,
      height: 700,
      labelX: 800,
      labelY: 1800
    }
  };

  const sellStation = { x: 900, y: 1325, radius: 145 };

  const buildingPlacements = {
    woodStorage: { x: 670, y: 1280, width: 178, asset: "woodStorage" },
    stoneYard: { x: 345, y: 1180, width: 178, asset: "stoneYard" },
    farm: { x: 1260, y: 960, width: 210, asset: "farm" },
    house: { x: 1210, y: 1240, width: 166, asset: "house" },
    workerHut: { x: 1230, y: 1430, width: 164, asset: "workerHut" },
    mine: { x: 850, y: 545, width: 196, asset: "mine" }
  };

  const SITE_DEFS = [
    {
      id: "woodStorage",
      name: "木材倉庫",
      description: "木材をたくさん運べるようになります",
      x: 670,
      y: 1280,
      asset: "woodStorage",
      buildingId: "woodStorage",
      requirements: { wood: 12, money: 100 }
    },
    {
      id: "bridgeStone",
      name: "石の海岸への橋",
      description: "石の海岸と石材を解放します",
      x: 535,
      y: 1110,
      kind: "bridgeLeft",
      unlockArea: "stoneCoast",
      requiresSites: ["woodStorage"],
      requirements: { wood: 22, money: 150 }
    },
    {
      id: "stoneYard",
      name: "石材置き場",
      description: "石材の所持上限が増えます",
      x: 345,
      y: 1180,
      asset: "stoneYard",
      buildingId: "stoneYard",
      area: "stoneCoast",
      requiresSites: ["bridgeStone"],
      requirements: { wood: 15, stone: 10, money: 200 }
    },
    {
      id: "bridgeGreen",
      name: "緑の草原への道",
      description: "食料と繊維がある草原を解放します",
      x: 1065,
      y: 1090,
      kind: "bridgeRight",
      unlockArea: "greenField",
      requiresSites: ["stoneYard"],
      requirements: { wood: 25, stone: 15, money: 250 }
    },
    {
      id: "farm",
      name: "畑",
      description: "食料と繊維の所持上限が増えます",
      x: 1260,
      y: 960,
      asset: "farm",
      buildingId: "farm",
      area: "greenField",
      requiresSites: ["bridgeGreen"],
      requirements: { wood: 15, stone: 6, fiber: 8, money: 180 }
    },
    {
      id: "house",
      name: "住宅",
      description: "住民が島を歩き始めます",
      x: 1210,
      y: 1240,
      asset: "house",
      buildingId: "house",
      area: "greenField",
      requiresSites: ["farm"],
      requirements: { wood: 20, stone: 12, food: 10, money: 300 }
    },
    {
      id: "workerHut",
      name: "作業員小屋",
      description: "作業員を雇えるようになります",
      x: 1230,
      y: 1430,
      asset: "workerHut",
      buildingId: "workerHut",
      area: "greenField",
      requiresSites: ["house"],
      requirements: { wood: 30, stone: 18, food: 15, fiber: 15, money: 500 }
    },
    {
      id: "mountainPass",
      name: "鉱山への山道",
      description: "鉱山エリアへの道を開きます",
      x: 820,
      y: 790,
      kind: "mountainPass",
      unlockArea: "mineHill",
      requiresSites: ["workerHut"],
      requirements: { wood: 35, stone: 25, money: 600 }
    },
    {
      id: "mine",
      name: "採掘所",
      description: "鉱石を採取できるようになります",
      x: 850,
      y: 545,
      asset: "mine",
      buildingId: "mine",
      area: "mineHill",
      requiresSites: ["mountainPass"],
      requirements: { wood: 25, stone: 20, fiber: 10, money: 500 }
    },
    {
      id: "harbor",
      name: "港",
      description: "新しい島へ向かうための大きな港です",
      x: 800,
      y: 1490,
      kind: "harbor",
      unlockArea: "harbor",
      requiresSites: ["mine"],
      requirements: { wood: 80, stone: 50, ore: 20, money: 2000 }
    }
  ];

  const QUESTS = [
    { id: "collect_wood_5", label: "木を5個集めよう", type: "collect", resource: "wood", target: 5, reward: 50 },
    { id: "sell_wood_10", label: "木材を10個売却しよう", type: "sell", resource: "wood", target: 10, reward: 100 },
    { id: "build_wood_storage", label: "木材倉庫を完成させよう", type: "site", siteId: "woodStorage", target: 1, reward: 100 },
    { id: "unlock_stone_coast", label: "石の海岸への橋を完成させよう", type: "site", siteId: "bridgeStone", target: 1, reward: 150 },
    { id: "collect_stone_5", label: "石材を5個集めよう", type: "collect", resource: "stone", target: 5, reward: 100 },
    { id: "build_stone_yard", label: "石材置き場を完成させよう", type: "site", siteId: "stoneYard", target: 1, reward: 200 },
    { id: "unlock_green_field", label: "緑の草原を解放しよう", type: "site", siteId: "bridgeGreen", target: 1, reward: 200 },
    { id: "collect_food_5", label: "食料を5個集めよう", type: "collect", resource: "food", target: 5, reward: 100 },
    { id: "build_farm", label: "畑を完成させよう", type: "site", siteId: "farm", target: 1, reward: 200 },
    { id: "build_house", label: "住宅を完成させよう", type: "site", siteId: "house", target: 1, reward: 250 },
    { id: "build_worker_hut", label: "作業員小屋を完成させよう", type: "site", siteId: "workerHut", target: 1, reward: 300 },
    { id: "hire_worker", label: "作業員を1人雇おう", type: "hire", target: 1, reward: 300 },
    { id: "unlock_mine_hill", label: "鉱山エリアを解放しよう", type: "site", siteId: "mountainPass", target: 1, reward: 350 },
    { id: "build_mine", label: "採掘所を完成させよう", type: "site", siteId: "mine", target: 1, reward: 400 },
    { id: "collect_ore_10", label: "鉱石を10個集めよう", type: "collect", resource: "ore", target: 10, reward: 500 },
    { id: "build_harbor", label: "港を完成させよう", type: "site", siteId: "harbor", target: 1, reward: 1000 },
    { id: "v2_complete", label: "島開拓 v2 完了！", type: "finish", target: 1, reward: 0 }
  ];

  const treeLayout = [
    { id: "tree_01", x: 650, y: 900, size: 1.03 },
    { id: "tree_02", x: 805, y: 905, size: 1.12 },
    { id: "tree_03", x: 970, y: 980, size: 0.98 },
    { id: "tree_04", x: 610, y: 1100, size: 0.96 },
    { id: "tree_05", x: 760, y: 1190, size: 1.08 },
    { id: "tree_06", x: 965, y: 1160, size: 1.02 },
    { id: "tree_07", x: 620, y: 1410, size: 0.92 },
    { id: "tree_08", x: 1010, y: 1410, size: 0.88 },
    { id: "tree_09", x: 310, y: 900, size: 1.02 },
    { id: "tree_10", x: 390, y: 1320, size: 0.92 },
    { id: "tree_11", x: 1170, y: 850, size: 0.94 },
    { id: "tree_12", x: 1370, y: 1110, size: 1.02 },
    { id: "tree_13", x: 1320, y: 1370, size: 0.9 },
    { id: "tree_14", x: 580, y: 560, size: 1.08 },
    { id: "tree_15", x: 1040, y: 500, size: 1.0 },
    { id: "tree_16", x: 720, y: 340, size: 0.94 },
    { id: "tree_17", x: 520, y: 1710, size: 0.92 },
    { id: "tree_18", x: 1060, y: 1740, size: 0.96 },
    { id: "tree_19", x: 700, y: 1960, size: 0.9 },
    { id: "tree_20", x: 1180, y: 1930, size: 0.88 }
  ];

  const nodeLayouts = {
    stone: [
      { id: "stone_01", x: 310, y: 870, size: 0.8 },
      { id: "stone_02", x: 430, y: 1010, size: 0.72 },
      { id: "stone_03", x: 280, y: 1150, size: 0.76 },
      { id: "stone_04", x: 430, y: 1280, size: 0.68 },
      { id: "stone_05", x: 285, y: 1410, size: 0.72 },
      { id: "stone_06", x: 470, y: 1450, size: 0.66 }
    ],
    food: [
      { id: "food_01", x: 1170, y: 860, size: 0.68 },
      { id: "food_02", x: 1370, y: 920, size: 0.72 },
      { id: "food_03", x: 1150, y: 1080, size: 0.64 },
      { id: "food_04", x: 1390, y: 1190, size: 0.7 },
      { id: "food_05", x: 1150, y: 1380, size: 0.64 },
      { id: "food_06", x: 1380, y: 1430, size: 0.68 }
    ],
    fiber: [
      { id: "fiber_01", x: 1280, y: 830, size: 0.62 },
      { id: "fiber_02", x: 1130, y: 960, size: 0.58 },
      { id: "fiber_03", x: 1400, y: 1040, size: 0.62 },
      { id: "fiber_04", x: 1180, y: 1190, size: 0.6 },
      { id: "fiber_05", x: 1380, y: 1320, size: 0.58 },
      { id: "fiber_06", x: 1110, y: 1460, size: 0.58 }
    ],
    ore: [
      { id: "ore_01", x: 560, y: 420, size: 0.78 },
      { id: "ore_02", x: 760, y: 560, size: 0.82 },
      { id: "ore_03", x: 980, y: 390, size: 0.72 },
      { id: "ore_04", x: 1130, y: 620, size: 0.68 },
      { id: "ore_05", x: 410, y: 650, size: 0.7 },
      { id: "ore_06", x: 1240, y: 520, size: 0.66 }
    ]
  };

  const decorativeRocks = [
    { x: 880, y: 820, asset: "rock1", width: 76 },
    { x: 460, y: 950, asset: "rock2", width: 70 },
    { x: 1120, y: 1040, asset: "rock1", width: 72 },
    { x: 690, y: 660, asset: "rock2", width: 68 },
    { x: 970, y: 1650, asset: "rock1", width: 74 }
  ];

  const keys = new Set();
  const joystick = { active: false, pointerId: null, centerX: 0, centerY: 0, x: 0, y: 0, radius: 44 };
  const camera = { x: 0, y: 0, scale: 1, shakeX: 0, shakeY: 0 };
  const screen = { w: 1, h: 1, dpr: 1 };
  const assets = {};
  const popups = [];
  const particles = [];
  const flyingItems = [];
  const sitePops = new Map();

  let state = migrateSave(loadSave());
  let assetsReady = false;
  let lastFrame = performance.now();
  let lastAutoSave = performance.now();
  let saveQueued = false;
  let nearSell = false;
  let activeSiteId = null;
  let depositCooldown = 0;
  let lastFullToastAt = 0;
  let animationClock = 0;
  let movementFacing = { x: 0, y: 1 };
  let screenShake = 0;
  let questLockUntil = 0;
  let celebrationTimer = 0;
  let manualGuideSite = null;
  let manualGuideUntil = 0;
  let moneyTween = null;
  let displayedMoney = state.resources.money;

  applyBuildingEffects();
  refreshRespawns();
  ensureNpcs();
  repairQuestState();
  resizeCanvas();
  updateHud();
  bindEvents();
  drawLoading();
  loadAssets()
    .then(() => {
      assetsReady = true;
      requestAnimationFrame(loop);
    })
    .catch((error) => {
      console.error("Asset load failed", error);
      showToast("画像の読み込みに失敗しました");
      assetsReady = true;
      requestAnimationFrame(loop);
    });

  function createDefaultSave() {
    return {
      version: SAVE_VERSION,
      resources: { money: 300, wood: 0, stone: 0, food: 0, fiber: 0, ore: 0 },
      stats: {
        totalWoodSold: 0,
        totalResourcesGathered: 0,
        totalResourcesSold: 0,
        gatheredByResource: zeroResourceMap(),
        soldByResource: zeroResourceMap()
      },
      player: {
        x: 800,
        y: 1100,
        bagCapacity: RESOURCE_INFO.wood.cap,
        chopSpeedMultiplier: 1,
        resourceCaps: defaultResourceCaps()
      },
      buildings: {
        warehouseLevel: 0,
        axeLevel: 0,
        workerHut: false,
        placed: {
          woodStorage: false,
          stoneYard: false,
          farm: false,
          house: false,
          workerHut: false,
          mine: false
        }
      },
      workers: { hired: 0, woodProgress: 0 },
      mission: createLegacyMission("sell_wood_10"),
      areas: {
        start: true,
        stoneCoast: false,
        greenField: false,
        mineHill: false,
        harbor: false
      },
      constructionSites: createDefaultConstructionSites(),
      quest: {
        id: QUESTS[0].id,
        progress: 0,
        completedIds: [],
        v2Complete: false
      },
      npcs: { workers: [], residents: [] },
      world: {
        trees: treeLayout.map(createGatherable),
        nodes: createDefaultNodes()
      }
    };
  }

  function zeroResourceMap() {
    return RESOURCE_TYPES.reduce((map, type) => {
      map[type] = 0;
      return map;
    }, {});
  }

  function defaultResourceCaps() {
    return RESOURCE_TYPES.reduce((caps, type) => {
      caps[type] = RESOURCE_INFO[type].cap;
      return caps;
    }, {});
  }

  function createDefaultNodes() {
    return RESOURCE_TYPES.filter((type) => type !== "wood").reduce((nodes, type) => {
      nodes[type] = nodeLayouts[type].map(createGatherable);
      return nodes;
    }, {});
  }

  function createGatherable(layout) {
    return { ...layout, state: "alive", progress: 0, chopProgress: 0, respawnAt: 0 };
  }

  function createDefaultConstructionSites() {
    return SITE_DEFS.reduce((sites, def) => {
      sites[def.id] = {
        id: def.id,
        completed: false,
        deposited: COST_TYPES.reduce((values, type) => {
          if (def.requirements[type]) values[type] = 0;
          return values;
        }, {})
      };
      return sites;
    }, {});
  }

  function createLegacyMission(id) {
    const target = id === "sell_wood_30" ? 30 : 10;
    return { id, target, progress: 0, completed: false };
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("Save load failed", error);
      return null;
    }
  }

  function migrateSave(save) {
    const defaults = createDefaultSave();
    if (!save || typeof save !== "object") return defaults;

    const input = cloneJson(save);
    const originalVersion = Math.max(0, Number(input.version) || 0);
    const merged = deepMerge(defaults, input);

    merged.version = SAVE_VERSION;
    merged.resources = normalizeResources(merged.resources);
    merged.stats = normalizeStats(merged.stats, merged.resources);
    merged.player = normalizePlayer(merged.player, defaults.player);
    merged.buildings = normalizeBuildings(merged.buildings);
    merged.workers = normalizeWorkers(merged.workers);
    merged.world = normalizeWorld(merged.world);
    merged.mission = normalizeLegacyMission(merged.mission);
    merged.areas = normalizeAreas(merged.areas);
    merged.constructionSites = normalizeConstructionSites(merged.constructionSites);
    merged.npcs = normalizeNpcs(merged.npcs);

    if (originalVersion < 2) migrateVersionOne(merged, input);
    syncSitesAndBuildings(merged);
    enforceAreaChain(merged.areas);
    unlockPlayerArea(merged);
    merged.quest = normalizeQuest(merged.quest, merged, originalVersion);
    return merged;
  }

  function normalizeResources(resources) {
    const result = { money: Math.max(0, Number(resources && resources.money) || 0) };
    for (const type of RESOURCE_TYPES) result[type] = Math.max(0, Number(resources && resources[type]) || 0);
    return result;
  }

  function normalizeStats(stats, resources) {
    const result = {
      totalWoodSold: Math.max(0, Number(stats && stats.totalWoodSold) || 0),
      totalResourcesGathered: Math.max(0, Number(stats && stats.totalResourcesGathered) || 0),
      totalResourcesSold: Math.max(0, Number(stats && stats.totalResourcesSold) || 0),
      gatheredByResource: zeroResourceMap(),
      soldByResource: zeroResourceMap()
    };
    for (const type of RESOURCE_TYPES) {
      result.gatheredByResource[type] = Math.max(0, Number(stats && stats.gatheredByResource && stats.gatheredByResource[type]) || 0);
      result.soldByResource[type] = Math.max(0, Number(stats && stats.soldByResource && stats.soldByResource[type]) || 0);
    }
    result.soldByResource.wood = Math.max(result.soldByResource.wood, result.totalWoodSold);
    result.gatheredByResource.wood = Math.max(result.gatheredByResource.wood, resources.wood + result.totalWoodSold);
    return result;
  }

  function normalizePlayer(player, defaults) {
    const result = deepMerge(defaults, player || {});
    result.x = Number.isFinite(Number(result.x)) ? Number(result.x) : defaults.x;
    result.y = Number.isFinite(Number(result.y)) ? Number(result.y) : defaults.y;
    result.chopSpeedMultiplier = clamp(Number(result.chopSpeedMultiplier) || 1, 1, 3);
    result.resourceCaps = normalizeCaps(result.resourceCaps);
    result.bagCapacity = Math.max(RESOURCE_INFO.wood.cap, Number(result.bagCapacity) || RESOURCE_INFO.wood.cap);
    if (!insideIsland(result.x, result.y, PLAYER_RADIUS)) {
      result.x = defaults.x;
      result.y = defaults.y;
    }
    return result;
  }

  function normalizeCaps(caps) {
    const result = defaultResourceCaps();
    for (const type of RESOURCE_TYPES) {
      result[type] = Math.max(RESOURCE_INFO[type].cap, Number(caps && caps[type]) || RESOURCE_INFO[type].cap);
    }
    return result;
  }

  function normalizeBuildings(buildings) {
    const defaults = createDefaultSave().buildings;
    const result = deepMerge(defaults, buildings || {});
    result.warehouseLevel = clampInt(result.warehouseLevel, 0, 2);
    result.axeLevel = clampInt(result.axeLevel, 0, 2);
    for (const id of Object.keys(defaults.placed)) result.placed[id] = Boolean(result.placed[id]);
    result.workerHut = Boolean(result.workerHut || result.placed.workerHut);
    if (Number(result.warehouseLevel) > 0) result.placed.woodStorage = true;
    return result;
  }

  function normalizeWorkers(workers) {
    return {
      hired: clampInt(workers && workers.hired, 0, 1),
      woodProgress: Math.max(0, Number(workers && workers.woodProgress) || 0)
    };
  }

  function normalizeWorld(worldState) {
    const result = { trees: [], nodes: {} };
    result.trees = normalizeGatherableList(worldState && worldState.trees, treeLayout);
    for (const type of RESOURCE_TYPES.filter((item) => item !== "wood")) {
      result.nodes[type] = normalizeGatherableList(worldState && worldState.nodes && worldState.nodes[type], nodeLayouts[type]);
    }
    return result;
  }

  function normalizeGatherableList(savedItems, layoutItems) {
    const byId = new Map();
    if (Array.isArray(savedItems)) {
      for (const item of savedItems) if (item && item.id) byId.set(item.id, item);
    }
    return layoutItems.map((layout) => {
      const saved = byId.get(layout.id) || {};
      const depleted = saved.state === "stump" || saved.state === "depleted";
      return {
        ...layout,
        state: depleted ? (layout.id.startsWith("tree_") ? "stump" : "depleted") : "alive",
        progress: clamp(Number(saved.progress ?? saved.chopProgress) || 0, 0, 1),
        chopProgress: clamp(Number(saved.chopProgress ?? saved.progress) || 0, 0, 1),
        respawnAt: Math.max(0, Number(saved.respawnAt) || 0)
      };
    });
  }

  function normalizeLegacyMission(mission) {
    if (!mission || typeof mission !== "object") return createLegacyMission("sell_wood_10");
    const id = mission.id === "sell_wood_30" ? "sell_wood_30" : "sell_wood_10";
    const result = createLegacyMission(id);
    result.progress = clampInt(mission.progress, 0, result.target);
    result.completed = Boolean(mission.completed) && result.progress >= result.target;
    return result;
  }

  function normalizeAreas(areas) {
    return {
      start: true,
      stoneCoast: Boolean(areas && areas.stoneCoast),
      greenField: Boolean(areas && areas.greenField),
      mineHill: Boolean(areas && areas.mineHill),
      harbor: Boolean(areas && areas.harbor)
    };
  }

  function normalizeConstructionSites(sites) {
    const defaults = createDefaultConstructionSites();
    for (const def of SITE_DEFS) {
      const incoming = sites && sites[def.id];
      if (!incoming || typeof incoming !== "object") continue;
      defaults[def.id].completed = Boolean(incoming.completed);
      for (const type of Object.keys(def.requirements)) {
        defaults[def.id].deposited[type] = clamp(Number(incoming.deposited && incoming.deposited[type]) || 0, 0, def.requirements[type]);
      }
    }
    return defaults;
  }

  function normalizeNpcs(npcs) {
    const result = { workers: [], residents: [] };
    if (Array.isArray(npcs && npcs.workers)) {
      result.workers = npcs.workers.slice(0, 1).map((npc, index) => normalizeNpc(npc, `worker_${index + 1}`, "worker"));
    }
    if (Array.isArray(npcs && npcs.residents)) {
      result.residents = npcs.residents.slice(0, 2).map((npc, index) => normalizeNpc(npc, `resident_${index + 1}`, "resident"));
    }
    return result;
  }

  function normalizeNpc(npc, fallbackId, role) {
    return {
      id: String((npc && npc.id) || fallbackId),
      role,
      x: Number(npc && npc.x) || (role === "worker" ? 1230 : 1210),
      y: Number(npc && npc.y) || (role === "worker" ? 1430 : 1240),
      mode: String((npc && npc.mode) || "idle"),
      targetId: npc && npc.targetId ? String(npc.targetId) : null,
      targetX: Number(npc && npc.targetX) || 0,
      targetY: Number(npc && npc.targetY) || 0,
      progress: clamp(Number(npc && npc.progress) || 0, 0, 1),
      carrying: Boolean(npc && npc.carrying),
      wait: Math.max(0, Number(npc && npc.wait) || 0)
    };
  }

  function migrateVersionOne(result, input) {
    const placed = result.buildings.placed;
    if (input.buildings && input.buildings.workerHut) placed.workerHut = true;
    if (Number(input.buildings && input.buildings.warehouseLevel) > 0) placed.woodStorage = true;

    if (placed.stoneYard || placed.farm || placed.house || placed.workerHut || placed.mine || result.resources.stone > 0) {
      result.areas.stoneCoast = true;
    }
    if (placed.farm || placed.house || placed.workerHut || placed.mine || result.resources.food > 0 || result.resources.fiber > 0) {
      result.areas.greenField = true;
    }
    if (placed.mine || result.resources.ore > 0) result.areas.mineHill = true;

    result.stats.gatheredByResource.stone = Math.max(result.stats.gatheredByResource.stone, result.resources.stone);
    result.stats.gatheredByResource.food = Math.max(result.stats.gatheredByResource.food, result.resources.food);
    result.stats.gatheredByResource.fiber = Math.max(result.stats.gatheredByResource.fiber, result.resources.fiber);
    result.stats.gatheredByResource.ore = Math.max(result.stats.gatheredByResource.ore, result.resources.ore);
  }

  function syncSitesAndBuildings(saveState) {
    for (const def of SITE_DEFS) {
      const site = saveState.constructionSites[def.id];
      const built = def.buildingId && saveState.buildings.placed[def.buildingId];
      const areaUnlocked = def.unlockArea && saveState.areas[def.unlockArea];
      if (built || areaUnlocked || site.completed) completeSiteData(saveState, def.id);
      if (site.completed && def.buildingId) saveState.buildings.placed[def.buildingId] = true;
      if (site.completed && def.unlockArea) saveState.areas[def.unlockArea] = true;
    }
    saveState.buildings.workerHut = Boolean(saveState.buildings.placed.workerHut);
  }

  function completeSiteData(saveState, siteId) {
    const def = getSiteDef(siteId);
    const site = saveState.constructionSites[siteId];
    if (!def || !site) return;
    site.completed = true;
    for (const [type, required] of Object.entries(def.requirements)) site.deposited[type] = required;
  }

  function enforceAreaChain(areas) {
    if (areas.harbor) {
      areas.mineHill = true;
      areas.greenField = true;
      areas.stoneCoast = true;
    }
    if (areas.mineHill) {
      areas.greenField = true;
      areas.stoneCoast = true;
    }
    if (areas.greenField) areas.stoneCoast = true;
    areas.start = true;
  }

  function unlockPlayerArea(saveState) {
    const areaId = areaIdAtPoint(saveState.player.x, saveState.player.y);
    if (areaId && areaId !== "start") saveState.areas[areaId] = true;
    enforceAreaChain(saveState.areas);
  }

  function normalizeQuest(quest, saveState, originalVersion) {
    const validIds = new Set(QUESTS.map((item) => item.id));
    const completedIds = Array.isArray(quest && quest.completedIds)
      ? [...new Set(quest.completedIds.filter((id) => validIds.has(id)))]
      : [];
    const result = {
      id: validIds.has(quest && quest.id) ? quest.id : QUESTS[0].id,
      progress: Math.max(0, Number(quest && quest.progress) || 0),
      completedIds,
      v2Complete: Boolean(quest && quest.v2Complete)
    };
    if (originalVersion < 2 || !quest || !validIds.has(quest.id)) return deriveQuestFromState(saveState);
    return result;
  }

  function deriveQuestFromState(saveState) {
    const completedIds = [];
    let currentId = QUESTS[0].id;
    for (const quest of QUESTS) {
      if (quest.id === "v2_complete") {
        currentId = quest.id;
        break;
      }
      if (questConditionMet(quest, saveState)) {
        completedIds.push(quest.id);
        continue;
      }
      currentId = quest.id;
      break;
    }
    const harborDone = Boolean(saveState.constructionSites.harbor.completed);
    return { id: currentId, progress: 0, completedIds, v2Complete: harborDone && currentId === "v2_complete" };
  }

  function cloneJson(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return {};
    }
  }

  function deepMerge(base, incoming) {
    if (Array.isArray(base)) return Array.isArray(incoming) ? incoming : base;
    if (!base || typeof base !== "object") return incoming === undefined ? base : incoming;
    const result = { ...base };
    if (!incoming || typeof incoming !== "object") return result;
    for (const key of Object.keys(incoming)) result[key] = deepMerge(base[key], incoming[key]);
    return result;
  }

  function bindEvents() {
    window.addEventListener("resize", resizeCanvas);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", resizeCanvas);

    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
        event.preventDefault();
        keys.add(key);
      }
    });
    window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));

    document.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
    document.addEventListener("gesturestart", (event) => event.preventDefault());
    document.addEventListener("contextmenu", (event) => event.preventDefault());

    els.joystick.addEventListener("pointerdown", startJoystick);
    window.addEventListener("pointermove", moveJoystick);
    window.addEventListener("pointerup", endJoystick);
    window.addEventListener("pointercancel", endJoystick);

    els.sellButton.addEventListener("click", sellResources);
    els.buildButton.addEventListener("click", openBuildMenu);
    els.closeBuildButton.addEventListener("click", closeBuildMenu);
    els.resetButton.addEventListener("click", resetGame);
    els.endingCloseButton.addEventListener("click", () => els.endingPanel.classList.add("is-hidden"));

    els.buildMenu.addEventListener("click", (event) => {
      if (event.target === els.buildMenu) closeBuildMenu();
    });
    els.buildList.addEventListener("click", (event) => {
      const guideButton = event.target.closest("[data-guide-site]");
      if (guideButton) {
        guideToSite(guideButton.dataset.guideSite);
        return;
      }
      const hireButton = event.target.closest("[data-hire-worker]");
      if (hireButton) hireWorker();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveNow();
    });
    window.addEventListener("beforeunload", saveNow);
  }

  function loadAssets() {
    return Promise.all(Object.entries(ASSET_SOURCES).map(([key, src]) => (
      loadImage(src).then((image) => {
        assets[key] = image;
      })
    )));
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load ${src}`));
      image.src = src;
    });
  }

  function queueSave() {
    saveQueued = true;
  }

  function saveNow() {
    try {
      state.version = SAVE_VERSION;
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      saveQueued = false;
      lastAutoSave = performance.now();
    } catch (error) {
      console.warn("Save failed", error);
      showToast("セーブできませんでした");
    }
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    screen.w = Math.max(1, Math.floor(window.innerWidth));
    screen.h = Math.max(1, Math.floor(window.innerHeight));
    screen.dpr = dpr;
    canvas.width = Math.floor(screen.w * dpr);
    canvas.height = Math.floor(screen.h * dpr);
    canvas.style.width = `${screen.w}px`;
    canvas.style.height = `${screen.h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    updateCamera();
    if (!assetsReady) drawLoading();
  }

  function loop(now) {
    const dt = Math.min(0.035, (now - lastFrame) / 1000 || 0);
    lastFrame = now;
    animationClock += dt;
    update(dt, now);
    draw();
    requestAnimationFrame(loop);
  }

  function update(dt, now) {
    updateMovement(dt);
    updateRespawns();
    updateGathering(dt, now);
    updateConstruction(dt);
    updateWorkerNpcs(dt);
    updateResidentNpcs(dt);
    updateSellProximity();
    updateQuest(now);
    updateEffects(dt);
    updateMoneyTween(dt);
    updateCamera();

    if (saveQueued && now - lastAutoSave > 650) saveNow();
    if (!saveQueued && now - lastAutoSave > 5000) saveNow();
  }

  function updateMovement(dt) {
    const input = getInputVector();
    const magnitude = Math.hypot(input.x, input.y);
    if (magnitude <= 0.02) return;

    const nx = input.x / magnitude;
    const ny = input.y / magnitude;
    movementFacing = { x: nx, y: ny };
    const speed = 238;
    const nextX = state.player.x + nx * speed * dt;
    const nextY = state.player.y + ny * speed * dt;

    if (canPlayerMoveTo(nextX, nextY)) {
      state.player.x = nextX;
      state.player.y = nextY;
      queueSave();
      return;
    }
    if (canPlayerMoveTo(nextX, state.player.y)) {
      state.player.x = nextX;
      queueSave();
    }
    if (canPlayerMoveTo(state.player.x, nextY)) {
      state.player.y = nextY;
      queueSave();
    }
  }

  function getInputVector() {
    let x = joystick.x;
    let y = joystick.y;
    if (keys.has("arrowleft") || keys.has("a")) x -= 1;
    if (keys.has("arrowright") || keys.has("d")) x += 1;
    if (keys.has("arrowup") || keys.has("w")) y -= 1;
    if (keys.has("arrowdown") || keys.has("s")) y += 1;
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  function startJoystick(event) {
    event.preventDefault();
    const rect = els.joystick.getBoundingClientRect();
    joystick.active = true;
    joystick.pointerId = event.pointerId;
    joystick.centerX = rect.left + rect.width / 2;
    joystick.centerY = rect.top + rect.height / 2;
    joystick.radius = rect.width * 0.36;
    els.joystick.setPointerCapture(event.pointerId);
    moveJoystick(event);
  }

  function moveJoystick(event) {
    if (!joystick.active || event.pointerId !== joystick.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - joystick.centerX;
    const dy = event.clientY - joystick.centerY;
    const distance = Math.hypot(dx, dy);
    const scale = distance > joystick.radius ? joystick.radius / distance : 1;
    const knobX = dx * scale;
    const knobY = dy * scale;
    joystick.x = knobX / joystick.radius;
    joystick.y = knobY / joystick.radius;
    els.joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
  }

  function endJoystick(event) {
    if (!joystick.active || event.pointerId !== joystick.pointerId) return;
    joystick.active = false;
    joystick.pointerId = null;
    joystick.x = 0;
    joystick.y = 0;
    els.joystickKnob.style.transform = "translate(-50%, -50%)";
  }

  function canPlayerMoveTo(x, y) {
    return insideIsland(x, y, PLAYER_RADIUS) && isPointUnlocked(x, y);
  }

  function areaIdAtPoint(x, y) {
    if (y < 780) return "mineHill";
    if (y > 1500) return "harbor";
    if (x < 520) return "stoneCoast";
    if (x > 1080) return "greenField";
    return "start";
  }

  function isPointUnlocked(x, y) {
    const areaId = areaIdAtPoint(x, y);
    return areaId === "start" || Boolean(state.areas[areaId]);
  }

  function isResourceUnlocked(type) {
    if (type === "wood") return true;
    if (type === "stone") return state.areas.stoneCoast;
    if (type === "food" || type === "fiber") return state.areas.greenField;
    if (type === "ore") return state.areas.mineHill && isBuilt("mine");
    return false;
  }

  function updateRespawns() {
    const now = Date.now();
    let changed = false;
    for (const tree of state.world.trees) {
      if (tree.state === "stump" && tree.respawnAt && now >= tree.respawnAt) {
        tree.state = "alive";
        tree.progress = 0;
        tree.chopProgress = 0;
        tree.respawnAt = 0;
        if (isPointUnlocked(tree.x, tree.y)) spawnPopup("再生", tree.x, tree.y - 76, "#eaffb5", 0.72);
        changed = true;
      }
    }
    forEachNode((node) => {
      if (node.state === "depleted" && node.respawnAt && now >= node.respawnAt) {
        node.state = "alive";
        node.progress = 0;
        node.chopProgress = 0;
        node.respawnAt = 0;
        changed = true;
      }
    });
    if (changed) queueSave();
  }

  function refreshRespawns() {
    const now = Date.now();
    for (const tree of state.world.trees) {
      if (tree.state === "stump" && tree.respawnAt && now >= tree.respawnAt) {
        tree.state = "alive";
        tree.progress = 0;
        tree.chopProgress = 0;
        tree.respawnAt = 0;
      }
    }
    forEachNode((node) => {
      if (node.state === "depleted" && node.respawnAt && now >= node.respawnAt) {
        node.state = "alive";
        node.progress = 0;
        node.chopProgress = 0;
        node.respawnAt = 0;
      }
    });
  }

  function updateGathering(dt, now) {
    const target = getNearestGatherTarget(state.player.x, state.player.y);
    decayInactiveProgress(target, dt);
    if (!target) return;

    const type = target.resource;
    if (isResourceFull(type)) {
      if (now - lastFullToastAt > 1300) {
        showToast("バッグ満タン！");
        spawnPopup(`${RESOURCE_INFO[type].label} 満タン`, state.player.x, state.player.y - 58, "#fff2a4", 0.72);
        lastFullToastAt = now;
      }
      return;
    }

    const speed = type === "wood" ? state.player.chopSpeedMultiplier : 1;
    target.item.progress += (dt * speed) / GATHER_SECONDS[type];
    target.item.chopProgress = target.item.progress;
    if (target.item.progress >= 1) harvestTarget(target);
  }

  function getNearestGatherTarget(x, y) {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const tree of state.world.trees) {
      if (tree.state !== "alive" || !isPointUnlocked(tree.x, tree.y)) continue;
      const distance = Math.hypot(tree.x - x, tree.y - y);
      const range = 82 + tree.size * 12;
      if (distance < range && distance < nearestDistance) {
        nearest = { kind: "tree", resource: "wood", item: tree, x: tree.x, y: tree.y };
        nearestDistance = distance;
      }
    }
    for (const type of RESOURCE_TYPES.filter((item) => item !== "wood")) {
      if (!isResourceUnlocked(type)) continue;
      for (const node of state.world.nodes[type]) {
        if (node.state !== "alive" || !isPointUnlocked(node.x, node.y)) continue;
        const distance = Math.hypot(node.x - x, node.y - y);
        const range = 70 + node.size * 18;
        if (distance < range && distance < nearestDistance) {
          nearest = { kind: "node", resource: type, item: node, x: node.x, y: node.y };
          nearestDistance = distance;
        }
      }
    }
    return nearest;
  }

  function decayInactiveProgress(activeTarget, dt) {
    for (const tree of state.world.trees) {
      if ((!activeTarget || activeTarget.item !== tree) && tree.state === "alive" && tree.progress > 0) {
        tree.progress = Math.max(0, tree.progress - dt * 0.28);
        tree.chopProgress = tree.progress;
      }
    }
    forEachNode((node) => {
      if ((!activeTarget || activeTarget.item !== node) && node.state === "alive" && node.progress > 0) {
        node.progress = Math.max(0, node.progress - dt * 0.28);
        node.chopProgress = node.progress;
      }
    });
  }

  function harvestTarget(target) {
    const type = target.resource;
    const item = target.item;
    state.resources[type] += 1;
    state.stats.totalResourcesGathered += 1;
    state.stats.gatheredByResource[type] += 1;
    depleteGatherable(item, type);
    spawnPopup("+1", target.x, target.y - 82, RESOURCE_INFO[type].color, 1);
    spawnResourceBits(target.x, target.y - 25, type);
    flashRow(els.rows[type]);
    pulseHaptic(12);
    updateHud();
    queueSave();
  }

  function depleteGatherable(item, type) {
    item.state = type === "wood" ? "stump" : "depleted";
    item.progress = 0;
    item.chopProgress = 0;
    item.respawnAt = Date.now() + RESPAWN_MS[type];
  }

  function updateConstruction(dt) {
    const nearby = getNearbyConstructionSite();
    const nextId = nearby ? nearby.id : null;
    if (nextId !== activeSiteId) {
      activeSiteId = nextId;
      depositCooldown = 0.08;
      updateConstructionPanel();
    }
    if (!nearby) return;

    updateConstructionPanel();
    const site = state.constructionSites[nearby.id];
    if (site.completed || !isSiteAvailable(nearby)) return;

    depositCooldown -= dt;
    if (depositCooldown > 0) return;
    const type = findDepositableType(nearby, site);
    if (!type) {
      els.constructionHint.textContent = "足りない素材を集めよう";
      depositCooldown = 0.35;
      return;
    }

    const remaining = nearby.requirements[type] - site.deposited[type];
    const step = type === "money" ? 25 : 1;
    const amount = Math.min(step, remaining, state.resources[type]);
    if (amount <= 0) return;

    state.resources[type] -= amount;
    site.deposited[type] += amount;
    spawnDepositItem(type, state.player.x, state.player.y - 30, nearby.x, nearby.y - 20);
    spawnPopup(`+${amount}`, nearby.x, nearby.y - 82, RESOURCE_INFO[type].color, 0.72);
    pulseConstructionPanel();
    flashRow(els.rows[type]);
    pulseHaptic(8);
    depositCooldown = DEPOSIT_INTERVAL;
    updateHud();
    updateConstructionPanel();
    queueSave();

    if (isConstructionComplete(nearby, site)) completeConstruction(nearby.id);
  }

  function getNearbyConstructionSite() {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const def of SITE_DEFS) {
      if (!isSiteVisible(def)) continue;
      const distance = Math.hypot(state.player.x - def.x, state.player.y - def.y);
      const range = def.kind === "harbor" ? 150 : 118;
      if (distance <= range && distance < nearestDistance) {
        nearest = def;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  function isSiteVisible(def) {
    if (def.area && !state.areas[def.area]) return false;
    if (!def.requiresSites || def.requiresSites.length === 0) return true;
    return def.requiresSites.every((id) => state.constructionSites[id] && state.constructionSites[id].completed);
  }

  function isSiteAvailable(def) {
    if (!isSiteVisible(def)) return false;
    if (def.area && !state.areas[def.area]) return false;
    return !def.requiresSites || def.requiresSites.every((id) => state.constructionSites[id].completed);
  }

  function findDepositableType(def, site) {
    for (const type of [...RESOURCE_TYPES, "money"]) {
      const required = def.requirements[type] || 0;
      const deposited = site.deposited[type] || 0;
      if (deposited < required && state.resources[type] > 0) return type;
    }
    return null;
  }

  function isConstructionComplete(def, site) {
    return Object.entries(def.requirements).every(([type, required]) => (site.deposited[type] || 0) >= required);
  }

  function completeConstruction(siteId) {
    const def = getSiteDef(siteId);
    const site = state.constructionSites[siteId];
    if (!def || !site || site.completed) return;

    completeSiteData(state, siteId);
    if (def.buildingId) state.buildings.placed[def.buildingId] = true;
    if (def.unlockArea) state.areas[def.unlockArea] = true;
    if (def.buildingId === "workerHut") state.buildings.workerHut = true;
    enforceAreaChain(state.areas);
    applyBuildingEffects();
    ensureNpcs();

    sitePops.set(siteId, 0);
    spawnCompletionBurst(def.x, def.y - 35);
    triggerScreenShake(0.55);
    showCelebration(def.unlockArea ? "新エリア解放！" : "建築完了！");
    showToast(`${def.name}が完成しました`);
    pulseHaptic([20, 35, 24]);
    updateHud();
    updateConstructionPanel();
    updateBuildMenu();
    queueSave();
  }

  function updateConstructionPanel() {
    if (!activeSiteId) {
      els.constructionPanel.classList.add("is-hidden");
      return;
    }
    const def = getSiteDef(activeSiteId);
    const site = state.constructionSites[activeSiteId];
    if (!def || !site) return;

    els.constructionPanel.classList.remove("is-hidden");
    els.constructionTitle.textContent = def.name;
    els.constructionMaterials.innerHTML = Object.entries(def.requirements).map(([type, required]) => {
      const amount = Math.floor(site.deposited[type] || 0);
      const done = amount >= required;
      return `<span class="material-chip ${done ? "is-done" : ""}">${RESOURCE_INFO[type].label} ${formatNumber(amount)}/${formatNumber(required)}</span>`;
    }).join("");
    els.constructionProgress.style.width = `${Math.round(getSiteProgress(def.id) * 100)}%`;
    if (site.completed) {
      els.constructionHint.textContent = "完成済み";
    } else if (!isSiteAvailable(def)) {
      els.constructionHint.textContent = "前の開拓を完了しよう";
    } else if (findDepositableType(def, site)) {
      els.constructionHint.textContent = "自動投入中";
    } else {
      els.constructionHint.textContent = "必要な素材を持ってこよう";
    }
  }

  function pulseConstructionPanel() {
    els.constructionPanel.classList.remove("is-depositing");
    void els.constructionPanel.offsetWidth;
    els.constructionPanel.classList.add("is-depositing");
  }

  function getSiteProgress(siteId) {
    const def = getSiteDef(siteId);
    const site = state.constructionSites[siteId];
    if (!def || !site) return 0;
    let deposited = 0;
    let required = 0;
    for (const [type, amount] of Object.entries(def.requirements)) {
      deposited += Math.min(amount, site.deposited[type] || 0);
      required += amount;
    }
    return required > 0 ? clamp(deposited / required, 0, 1) : 0;
  }

  function updateSellProximity() {
    const distance = Math.hypot(state.player.x - sellStation.x, state.player.y - sellStation.y);
    const active = distance <= sellStation.radius;
    if (active === nearSell) return;
    nearSell = active;
    els.sellButton.classList.toggle("is-hidden", !active);
    els.sellHint.classList.toggle("is-hidden", !active);
  }

  function sellResources() {
    if (!nearSell) {
      showToast("売却所に近づいてください");
      return;
    }
    let gain = 0;
    let soldCount = 0;
    const sold = zeroResourceMap();
    for (const type of RESOURCE_TYPES) {
      const amount = state.resources[type];
      sold[type] = amount;
      gain += amount * RESOURCE_INFO[type].value;
      soldCount += amount;
    }
    if (soldCount <= 0) {
      showToast("売れる素材がありません");
      return;
    }

    const beforeMoney = state.resources.money;
    for (const type of RESOURCE_TYPES) {
      state.resources[type] = 0;
      state.stats.soldByResource[type] += sold[type];
    }
    state.resources.money += gain;
    state.stats.totalResourcesSold += soldCount;
    state.stats.totalWoodSold += sold.wood;
    state.mission.progress = Math.min(state.mission.target, state.mission.progress + sold.wood);
    if (state.mission.progress >= state.mission.target) state.mission.completed = true;

    animateMoney(beforeMoney, state.resources.money);
    spawnPopup(`+${formatNumber(gain)}コイン`, sellStation.x, sellStation.y - 110, "#ffe45e", 1.08);
    spawnCoinBurst(sellStation.x, sellStation.y - 42);
    flashRow(els.rows.money);
    triggerScreenShake(0.22);
    pulseHaptic([18, 26, 18]);
    updateHud();
    queueSave();
  }

  function updateQuest(now) {
    const quest = getCurrentQuest();
    if (!quest) return;
    state.quest.progress = getQuestProgress(quest, state);
    updateQuestHud(quest);
    if (now < questLockUntil || state.quest.completedIds.includes(quest.id)) return;
    if (!questConditionMet(quest, state)) return;
    completeQuest(quest, now);
  }

  function completeQuest(quest, now) {
    state.quest.completedIds.push(quest.id);
    if (quest.reward > 0) {
      const beforeMoney = state.resources.money;
      state.resources.money += quest.reward;
      animateMoney(beforeMoney, state.resources.money);
    }
    showCelebration(quest.id === "v2_complete" ? "島開拓 v2 完了！" : `クエスト達成！ +${quest.reward}コイン`);
    spawnCompletionBurst(state.player.x, state.player.y - 40);
    triggerScreenShake(0.36);
    pulseHaptic([18, 30, 18]);

    const index = QUESTS.findIndex((item) => item.id === quest.id);
    const next = QUESTS[index + 1];
    if (next) {
      state.quest.id = next.id;
      state.quest.progress = getQuestProgress(next, state);
    } else {
      state.quest.v2Complete = true;
      els.endingPanel.classList.remove("is-hidden");
    }
    if (quest.id === "v2_complete") {
      state.quest.v2Complete = true;
      els.endingPanel.classList.remove("is-hidden");
    }
    questLockUntil = now + 900;
    updateHud();
    updateBuildMenu();
    queueSave();
  }

  function questConditionMet(quest, saveState) {
    return getQuestProgress(quest, saveState) >= quest.target;
  }

  function getQuestProgress(quest, saveState) {
    if (quest.type === "collect") return Math.min(quest.target, saveState.stats.gatheredByResource[quest.resource] || 0);
    if (quest.type === "sell") return Math.min(quest.target, saveState.stats.soldByResource[quest.resource] || 0);
    if (quest.type === "site") return saveState.constructionSites[quest.siteId] && saveState.constructionSites[quest.siteId].completed ? 1 : 0;
    if (quest.type === "hire") return Math.min(quest.target, saveState.workers.hired || 0);
    if (quest.type === "finish") return saveState.constructionSites.harbor.completed ? 1 : 0;
    return 0;
  }

  function getCurrentQuest() {
    return QUESTS.find((quest) => quest.id === state.quest.id) || QUESTS[0];
  }

  function repairQuestState() {
    const validIds = new Set(QUESTS.map((quest) => quest.id));
    state.quest.completedIds = [...new Set(state.quest.completedIds.filter((id) => validIds.has(id)))];
    let index = QUESTS.findIndex((quest) => quest.id === state.quest.id);
    if (index < 0) index = 0;
    while (index < QUESTS.length - 1 && state.quest.completedIds.includes(QUESTS[index].id)) index += 1;
    state.quest.id = QUESTS[index].id;
    state.quest.progress = getQuestProgress(QUESTS[index], state);
  }

  function updateQuestHud(quest = getCurrentQuest()) {
    const progress = getQuestProgress(quest, state);
    els.missionTitle.textContent = quest.label;
    els.missionStatus.textContent = `${formatNumber(progress)}/${formatNumber(quest.target)}`;
    els.missionReward.textContent = quest.reward > 0 ? `報酬 ${formatNumber(quest.reward)}` : "最終目標";
    els.missionProgress.style.width = `${clamp((progress / quest.target) * 100, 0, 100)}%`;
  }

  function showCelebration(message) {
    window.clearTimeout(celebrationTimer);
    els.celebrationBanner.textContent = message;
    els.celebrationBanner.classList.remove("is-hidden");
    void els.celebrationBanner.offsetWidth;
    celebrationTimer = window.setTimeout(() => els.celebrationBanner.classList.add("is-hidden"), 1550);
  }

  function openBuildMenu() {
    updateBuildMenu();
    els.buildMenu.classList.remove("is-hidden");
  }

  function closeBuildMenu() {
    els.buildMenu.classList.add("is-hidden");
  }

  function guideToSite(siteId) {
    const def = getSiteDef(siteId);
    if (!def || !isSiteVisible(def)) return;
    manualGuideSite = siteId;
    manualGuideUntil = performance.now() + 9000;
    closeBuildMenu();
    showToast(`${def.name}の場所を表示します`);
  }

  function hireWorker() {
    const cost = { food: 25, money: 600 };
    if (!isBuilt("workerHut") || !isBuilt("house")) {
      showToast("住宅と作業員小屋が必要です");
      return;
    }
    if (state.workers.hired >= 1) {
      showToast("作業員は雇用済みです");
      return;
    }
    const missing = getMissingCost(cost);
    if (missing) {
      showToast(`${RESOURCE_INFO[missing].label}が足りません`);
      return;
    }
    payCost(cost);
    state.workers.hired = 1;
    state.workers.woodProgress = 0;
    ensureNpcs();
    showCelebration("作業員が仲間になった！");
    spawnCompletionBurst(buildingPlacements.workerHut.x, buildingPlacements.workerHut.y - 40);
    pulseHaptic([18, 28, 18]);
    updateHud();
    updateBuildMenu();
    queueSave();
  }

  function getMissingCost(cost) {
    for (const type of COST_TYPES) if (cost[type] && state.resources[type] < cost[type]) return type;
    return "";
  }

  function payCost(cost) {
    for (const type of COST_TYPES) {
      if (!cost[type]) continue;
      state.resources[type] -= cost[type];
      flashRow(els.rows[type]);
    }
  }

  function resetGame() {
    if (!window.confirm("セーブデータをリセットして、v2を最初から始めますか？")) return;
    localStorage.removeItem(SAVE_KEY);
    state = createDefaultSave();
    activeSiteId = null;
    displayedMoney = state.resources.money;
    moneyTween = null;
    applyBuildingEffects();
    ensureNpcs();
    closeBuildMenu();
    els.endingPanel.classList.add("is-hidden");
    updateHud();
    updateConstructionPanel();
    showToast("最初からスタートしました");
    queueSave();
  }

  function updateHud() {
    applyBuildingEffects();
    if (!moneyTween) displayedMoney = state.resources.money;
    els.money.textContent = formatNumber(displayedMoney);
    for (const type of RESOURCE_TYPES) {
      els[type].textContent = formatNumber(state.resources[type]);
      els[`${type}Capacity`].textContent = formatNumber(state.player.resourceCaps[type]);
      els.rows[type].classList.toggle("is-locked", !isResourceRevealed(type));
    }
    els.residents.textContent = `${getResidentCount()}/${getResidentMax()}`;
    updateQuestHud();
  }

  function isResourceRevealed(type) {
    return isResourceUnlocked(type) || state.resources[type] > 0;
  }

  function updateBuildMenu() {
    if (!els.buildList) return;
    const current = getCurrentQuest();
    const siteCards = SITE_DEFS.map((def) => renderSiteCard(def, current)).join("");
    els.buildList.innerHTML = siteCards + renderWorkerCard(current);
  }

  function renderSiteCard(def, currentQuest) {
    const site = state.constructionSites[def.id];
    const visible = isSiteVisible(def);
    const completed = site.completed;
    const current = currentQuest && currentQuest.siteId === def.id;
    const progress = Math.round(getSiteProgress(def.id) * 100);
    const status = completed ? "完成済み" : (visible ? `進捗 ${progress}%` : "未解放");
    const buttonLabel = completed ? "完成済み" : (visible ? "場所" : "未解放");
    return `
      <article class="upgrade-row ${current ? "is-current" : ""}">
        ${renderSiteArt(def)}
        <div class="upgrade-copy">
          <h2>${def.name}</h2>
          <p>${def.description}</p>
          <div class="cost-line">${renderSiteRequirements(def, site)}</div>
          <span class="build-note">${status}</span>
        </div>
        <button class="buy-button ${completed || !visible ? "is-disabled" : ""}" type="button" data-guide-site="${def.id}" ${completed || !visible ? "disabled" : ""}>${buttonLabel}</button>
      </article>
    `;
  }

  function renderSiteArt(def) {
    if (def.asset) return `<img class="build-card-art" src="${ASSET_SOURCES[def.asset]}" alt="">`;
    const symbol = def.kind === "harbor" ? "港" : (def.kind === "mountainPass" ? "道" : "橋");
    return `<div class="site-art-symbol" aria-hidden="true">${symbol}</div>`;
  }

  function renderSiteRequirements(def, site) {
    return Object.entries(def.requirements).map(([type, required]) => {
      const amount = Math.floor(site.deposited[type] || 0);
      return `<span class="cost-chip">${RESOURCE_INFO[type].label} ${formatNumber(amount)}/${formatNumber(required)}</span>`;
    }).join("");
  }

  function renderWorkerCard(currentQuest) {
    const cost = { food: 25, money: 600 };
    const hired = state.workers.hired >= 1;
    const available = isBuilt("workerHut") && isBuilt("house");
    const current = currentQuest && currentQuest.id === "hire_worker";
    return `
      <article class="upgrade-row ${current ? "is-current" : ""}">
        <img class="build-card-art" src="${ASSET_SOURCES.player}" alt="">
        <div class="upgrade-copy">
          <h2>作業員を雇う</h2>
          <p>木へ歩き、伐採して小屋まで運びます</p>
          <div class="cost-line">
            <span class="cost-chip">食料 25</span>
            <span class="cost-chip">コイン 600</span>
          </div>
          <span class="build-note">${hired ? "雇用済み" : (available ? "雇用可能" : "住宅と作業員小屋が必要")}</span>
        </div>
        <button class="buy-button is-hire ${hired || !available ? "is-disabled" : ""}" type="button" data-hire-worker ${hired || !available ? "disabled" : ""}>${hired ? "雇用済み" : "雇用"}</button>
      </article>
    `;
  }

  function applyBuildingEffects() {
    const caps = defaultResourceCaps();
    if (isBuilt("woodStorage")) caps.wood = 45;
    if (isBuilt("stoneYard")) caps.stone = 40;
    if (isBuilt("farm")) {
      caps.food = 35;
      caps.fiber = 30;
    }
    if (isBuilt("mine")) caps.ore = 20;
    state.player.resourceCaps = caps;
    state.player.bagCapacity = caps.wood;
    state.player.chopSpeedMultiplier = 1 + Math.min(2, Number(state.buildings.axeLevel) || 0) * 0.5;
  }

  function isBuilt(id) {
    return Boolean(state.buildings && state.buildings.placed && state.buildings.placed[id]);
  }

  function isResourceFull(type) {
    return state.resources[type] >= state.player.resourceCaps[type];
  }

  function getResidentCount() {
    return state.npcs.residents.length + state.workers.hired;
  }

  function getResidentMax() {
    return isBuilt("house") ? 3 : 2;
  }

  function getSiteDef(siteId) {
    return SITE_DEFS.find((def) => def.id === siteId);
  }

  function ensureNpcs() {
    if (state.workers.hired > 0 && isBuilt("workerHut")) {
      if (state.npcs.workers.length === 0) {
        state.npcs.workers.push({
          id: "worker_1",
          role: "worker",
          x: buildingPlacements.workerHut.x,
          y: buildingPlacements.workerHut.y + 25,
          mode: "idle",
          targetId: null,
          targetX: 0,
          targetY: 0,
          progress: 0,
          carrying: false,
          wait: 0
        });
      }
    } else {
      state.npcs.workers = [];
    }

    const desiredResidents = isBuilt("house") ? 2 : 0;
    while (state.npcs.residents.length < desiredResidents) {
      const index = state.npcs.residents.length;
      state.npcs.residents.push({
        id: `resident_${index + 1}`,
        role: "resident",
        x: buildingPlacements.house.x + (index === 0 ? -26 : 28),
        y: buildingPlacements.house.y + 32,
        mode: "idle",
        targetId: null,
        targetX: 0,
        targetY: 0,
        progress: 0,
        carrying: false,
        wait: 0.8 + index * 0.7
      });
    }
    if (state.npcs.residents.length > desiredResidents) state.npcs.residents.length = desiredResidents;
  }

  function updateWorkerNpcs(dt) {
    if (state.workers.hired <= 0 || !isBuilt("workerHut")) return;
    ensureNpcs();
    const worker = state.npcs.workers[0];
    if (!worker) return;

    if (worker.mode === "idle") {
      worker.wait = Math.max(0, worker.wait - dt);
      if (worker.wait <= 0) assignWorkerTree(worker);
      return;
    }

    if (worker.mode === "toTree") {
      const tree = findTreeById(worker.targetId);
      if (!tree || tree.state !== "alive" || !isPointUnlocked(tree.x, tree.y)) {
        worker.mode = "idle";
        worker.targetId = null;
        worker.wait = 0.3;
        return;
      }
      if (moveNpcToward(worker, tree.x, tree.y + 24, 92, dt)) {
        worker.mode = "chopping";
        worker.progress = 0;
      }
      return;
    }

    if (worker.mode === "chopping") {
      const tree = findTreeById(worker.targetId);
      if (!tree || tree.state !== "alive") {
        worker.mode = "idle";
        worker.targetId = null;
        worker.progress = 0;
        return;
      }
      worker.progress += dt / 2.05;
      if (worker.progress >= 1) {
        depleteGatherable(tree, "wood");
        worker.progress = 0;
        worker.carrying = true;
        worker.mode = "toHome";
        spawnResourceBits(tree.x, tree.y - 20, "wood");
        spawnPopup("作業員が伐採", tree.x, tree.y - 82, "#eaffb5", 0.65);
        queueSave();
      }
      return;
    }

    if (worker.mode === "toHome") {
      const home = buildingPlacements.workerHut;
      if (moveNpcToward(worker, home.x, home.y + 34, 100, dt)) deliverWorkerWood(worker);
      return;
    }

    if (worker.mode === "waitingHome") {
      if (!isResourceFull("wood")) deliverWorkerWood(worker);
    }
  }

  function assignWorkerTree(worker) {
    const candidates = state.world.trees
      .filter((tree) => tree.state === "alive" && isPointUnlocked(tree.x, tree.y))
      .sort((a, b) => Math.hypot(a.x - worker.x, a.y - worker.y) - Math.hypot(b.x - worker.x, b.y - worker.y));
    const tree = candidates[0];
    if (!tree) {
      worker.wait = 1.2;
      return;
    }
    worker.targetId = tree.id;
    worker.mode = "toTree";
  }

  function deliverWorkerWood(worker) {
    if (isResourceFull("wood")) {
      worker.mode = "waitingHome";
      return;
    }
    state.resources.wood += 1;
    state.stats.totalResourcesGathered += 1;
    state.stats.gatheredByResource.wood += 1;
    worker.carrying = false;
    worker.targetId = null;
    worker.mode = "idle";
    worker.wait = 0.8;
    spawnPopup("作業員 +1", worker.x, worker.y - 58, "#eaffb5", 0.78);
    flashRow(els.rows.wood);
    updateHud();
    queueSave();
  }

  function updateResidentNpcs(dt) {
    if (!isBuilt("house")) return;
    ensureNpcs();
    for (const resident of state.npcs.residents) {
      if (resident.mode === "waiting" || resident.mode === "idle") {
        resident.wait = Math.max(0, resident.wait - dt);
        if (resident.wait <= 0) chooseResidentTarget(resident);
        continue;
      }
      if (resident.mode === "walking") {
        if (moveNpcToward(resident, resident.targetX, resident.targetY, 54, dt)) {
          resident.mode = "waiting";
          resident.wait = 1.4 + seededRandom(resident.x + resident.y) * 2.2;
        }
      }
    }
  }

  function chooseResidentTarget(resident) {
    const waypoints = [
      { x: buildingPlacements.house.x - 40, y: buildingPlacements.house.y + 45 },
      { x: buildingPlacements.farm.x - 45, y: buildingPlacements.farm.y + 55 },
      { x: sellStation.x - 80, y: sellStation.y + 40 },
      { x: 1000, y: 1210 },
      { x: 1120, y: 1380 }
    ].filter((point) => isPointUnlocked(point.x, point.y));
    if (waypoints.length === 0) return;
    const seed = Math.floor(animationClock * 3 + resident.id.length * 11 + resident.x);
    const target = waypoints[Math.floor(seededRandom(seed) * waypoints.length)];
    resident.targetX = target.x + (seededRandom(seed + 3) - 0.5) * 50;
    resident.targetY = target.y + (seededRandom(seed + 7) - 0.5) * 40;
    resident.mode = "walking";
  }

  function moveNpcToward(npc, targetX, targetY, speed, dt) {
    const dx = targetX - npc.x;
    const dy = targetY - npc.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= Math.max(3, speed * dt)) {
      npc.x = targetX;
      npc.y = targetY;
      return true;
    }
    npc.x += (dx / distance) * speed * dt;
    npc.y += (dy / distance) * speed * dt;
    return false;
  }

  function findTreeById(id) {
    return state.world.trees.find((tree) => tree.id === id);
  }

  function draw() {
    if (!assetsReady) {
      drawLoading();
      return;
    }
    ctx.clearRect(0, 0, screen.w, screen.h);
    drawSea();
    drawIsland();
    drawLockedAreas();
    drawWorldObjects();
    drawEffects();
    drawQuestGuide();
  }

  function drawLoading() {
    ctx.clearRect(0, 0, screen.w, screen.h);
    const gradient = ctx.createLinearGradient(0, 0, screen.w, screen.h);
    gradient.addColorStop(0, "#20c4e5");
    gradient.addColorStop(1, "#078ac5");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, screen.w, screen.h);
    ctx.fillStyle = "rgba(255, 249, 218, 0.96)";
    ctx.strokeStyle = "rgba(95, 71, 31, 0.25)";
    ctx.lineWidth = 3;
    roundRect(screen.w / 2 - 94, screen.h / 2 - 26, 188, 52, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#4b351c";
    ctx.font = "900 17px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("島を準備中", screen.w / 2, screen.h / 2);
  }

  function drawSea() {
    ctx.fillStyle = "#18b8e3";
    ctx.fillRect(0, 0, screen.w, screen.h);
  }

  function drawIsland() {
    ctx.save();
    translateCamera();
    drawImageCover(assets.islandBg, 0, 0, world.width, world.height);
    ctx.restore();
  }

  function drawLockedAreas() {
    ctx.save();
    translateCamera();
    ctx.beginPath();
    ctx.ellipse(world.cx, world.cy, world.sandRx, world.sandRy, 0, 0, Math.PI * 2);
    ctx.clip();

    for (const areaId of ["stoneCoast", "greenField", "mineHill", "harbor"]) {
      if (state.areas[areaId]) continue;
      const area = AREA_DEFS[areaId];
      ctx.fillStyle = "rgba(64, 104, 107, 0.48)";
      ctx.fillRect(area.x, area.y, area.width, area.height);
      drawAreaClouds(area);
      drawAreaLockLabel(area);
    }
    ctx.restore();
  }

  function drawAreaClouds(area) {
    ctx.save();
    ctx.fillStyle = "rgba(239, 251, 244, 0.42)";
    const columns = Math.max(3, Math.ceil(area.width / 180));
    const rows = Math.max(2, Math.ceil(area.height / 175));
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        const seed = (area.x + area.y) * 0.01 + row * 17 + col * 31;
        const x = area.x + (col + 0.5) * (area.width / columns) + (seededRandom(seed) - 0.5) * 70;
        const y = area.y + (row + 0.5) * (area.height / rows) + (seededRandom(seed + 2) - 0.5) * 55;
        const radius = 42 + seededRandom(seed + 5) * 30;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.arc(x + radius * 0.65, y + 6, radius * 0.72, 0, Math.PI * 2);
        ctx.arc(x - radius * 0.55, y + 10, radius * 0.62, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawAreaLockLabel(area) {
    ctx.save();
    ctx.translate(area.labelX, area.labelY);
    ctx.fillStyle = "rgba(39, 60, 55, 0.72)";
    roundRect(-128, -43, 256, 86, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.62)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 22px sans-serif";
    ctx.fillText("未開拓エリア", 0, -13);
    ctx.font = "800 14px sans-serif";
    ctx.fillStyle = "#e8ffdc";
    ctx.fillText(area.hint, 0, 17);
    ctx.restore();
  }

  function drawWorldObjects() {
    const drawables = [];
    for (const rock of decorativeRocks) {
      if (isPointUnlocked(rock.x, rock.y)) drawables.push({ y: rock.y + 20, type: "rock", item: rock });
    }
    for (const tree of state.world.trees) {
      if (isPointUnlocked(tree.x, tree.y)) drawables.push({ y: tree.y + 70 * tree.size, type: "tree", item: tree });
    }
    for (const type of RESOURCE_TYPES.filter((item) => item !== "wood")) {
      if (!isResourceUnlocked(type)) continue;
      for (const node of state.world.nodes[type]) {
        if (node.state === "alive" && isPointUnlocked(node.x, node.y)) {
          drawables.push({ y: node.y + 38 * node.size, type: "node", resource: type, item: node });
        }
      }
    }
    for (const def of SITE_DEFS) {
      if (isSiteVisible(def)) drawables.push({ y: def.y + 58, type: "site", item: def });
    }
    for (const npc of state.npcs.residents) drawables.push({ y: npc.y + 38, type: "resident", item: npc });
    for (const npc of state.npcs.workers) drawables.push({ y: npc.y + 40, type: "worker", item: npc });
    drawables.push({ y: sellStation.y + 30, type: "station", item: sellStation });
    drawables.push({ y: state.player.y + 60, type: "player", item: state.player });
    drawables.sort((a, b) => a.y - b.y);

    ctx.save();
    translateCamera();
    drawQuestWorldMarker();
    drawSellRange();
    for (const drawable of drawables) {
      if (drawable.type === "rock") drawDecorativeRock(drawable.item);
      if (drawable.type === "tree") drawTree(drawable.item);
      if (drawable.type === "node") drawNode(drawable.resource, drawable.item);
      if (drawable.type === "site") drawConstructionSite(drawable.item);
      if (drawable.type === "station") drawSellStation(drawable.item);
      if (drawable.type === "resident") drawNpc(drawable.item, "resident");
      if (drawable.type === "worker") drawNpc(drawable.item, "worker");
      if (drawable.type === "player") drawPlayer(drawable.item);
    }
    ctx.restore();
  }

  function drawDecorativeRock(rock) {
    drawSpriteFoot(assets[rock.asset], rock.x, rock.y + 25, rock.width, { shadowAlpha: 0.14 });
  }

  function drawTree(tree) {
    if (tree.state === "stump") {
      drawSpriteFoot(assets.treeStump, tree.x, tree.y + 25 * tree.size, 88 * tree.size);
      return;
    }
    drawSpriteFoot(assets.treeAlive, tree.x, tree.y + 69 * tree.size, 126 * tree.size);
    if (tree.progress > 0.01) drawGauge(tree.x, tree.y - 108 * tree.size, tree.progress, "#54bf4d");
  }

  function drawNode(type, node) {
    const assetKey = { stone: "nodeStone", food: "nodeFood", fiber: "nodeFiber", ore: "nodeOre" }[type];
    const width = { stone: 86, food: 84, fiber: 82, ore: 92 }[type] * node.size;
    drawSpriteFoot(assets[assetKey], node.x, node.y + 40 * node.size, width);
    if (node.progress > 0.01) drawGauge(node.x, node.y - 68 * node.size, node.progress, "#54bf4d");
  }

  function drawConstructionSite(def) {
    const site = state.constructionSites[def.id];
    if (site.completed) {
      drawCompletedSite(def);
      return;
    }

    drawSitePad(def);
    if (def.asset) {
      const placement = buildingPlacements[def.buildingId];
      drawSpriteFoot(assets[def.asset], def.x, def.y + 78, placement ? placement.width : 170, {
        alpha: 0.34,
        shadowAlpha: 0.08
      });
    } else {
      drawInfrastructure(def, false);
    }

    const progress = getSiteProgress(def.id);
    drawGauge(def.x, def.y - 82, progress, "#ffb63e", 116);
    ctx.save();
    ctx.translate(def.x, def.y - 111);
    ctx.fillStyle = "rgba(74, 47, 18, 0.82)";
    roundRect(-70, -17, 140, 34, 7);
    ctx.fill();
    ctx.fillStyle = "#fff5c8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 16px sans-serif";
    ctx.fillText(def.name, 0, 0);
    ctx.restore();
  }

  function drawSitePad(def) {
    const pulse = 1 + Math.sin(animationClock * 4 + def.x * 0.01) * 0.04;
    ctx.save();
    ctx.translate(def.x, def.y + 25);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "rgba(255, 235, 139, 0.42)";
    ctx.strokeStyle = "rgba(255, 248, 204, 0.92)";
    ctx.lineWidth = 5;
    ctx.setLineDash([13, 11]);
    ctx.beginPath();
    ctx.ellipse(0, 0, def.kind === "harbor" ? 125 : 95, def.kind === "harbor" ? 68 : 56, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawCompletedSite(def) {
    const popAge = sitePops.get(def.id);
    const popScale = popAge === undefined ? 1 : constructionPopScale(popAge);
    ctx.save();
    ctx.translate(def.x, def.y);
    ctx.scale(popScale, popScale);
    ctx.translate(-def.x, -def.y);
    if (def.asset) {
      const placement = buildingPlacements[def.buildingId];
      drawSpriteFoot(assets[def.asset], def.x, def.y + 82, placement ? placement.width : 170, { shadowAlpha: 0.18, shadowScale: 1.15 });
    } else {
      drawInfrastructure(def, true);
    }
    ctx.restore();
  }

  function drawInfrastructure(def, completed) {
    if (def.kind === "bridgeLeft" || def.kind === "bridgeRight") {
      drawBridge(def, completed);
      return;
    }
    if (def.kind === "mountainPass") {
      drawMountainPass(def, completed);
      return;
    }
    if (def.kind === "harbor") drawHarbor(def, completed);
  }

  function drawBridge(def, completed) {
    ctx.save();
    ctx.translate(def.x, def.y + 18);
    ctx.globalAlpha = completed ? 1 : 0.38;
    ctx.rotate(def.kind === "bridgeLeft" ? -0.05 : 0.05);
    ctx.fillStyle = "#7a4b24";
    roundRect(-102, -34, 204, 68, 8);
    ctx.fill();
    for (let x = -92; x <= 78; x += 28) {
      ctx.fillStyle = x % 56 === 0 ? "#d59243" : "#c47b35";
      roundRect(x, -29, 24, 58, 4);
      ctx.fill();
      ctx.strokeStyle = "rgba(93, 50, 20, 0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMountainPass(def, completed) {
    ctx.save();
    ctx.translate(def.x, def.y + 12);
    ctx.globalAlpha = completed ? 1 : 0.36;
    ctx.strokeStyle = completed ? "#e8c16e" : "#f1e3b3";
    ctx.lineWidth = 58;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 72);
    ctx.quadraticCurveTo(-35, 10, 10, -74);
    ctx.stroke();
    ctx.strokeStyle = "rgba(130, 84, 35, 0.42)";
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 10]);
    ctx.stroke();
    ctx.restore();
  }

  function drawHarbor(def, completed) {
    ctx.save();
    ctx.translate(def.x, def.y + 28);
    ctx.globalAlpha = completed ? 1 : 0.36;
    ctx.fillStyle = "#78461f";
    roundRect(-110, -32, 220, 64, 6);
    ctx.fill();
    for (let x = -102; x < 100; x += 26) {
      ctx.fillStyle = x % 52 === 0 ? "#d48a3e" : "#bc6f2e";
      roundRect(x, -27, 22, 54, 3);
      ctx.fill();
    }
    ctx.fillStyle = "#8c5427";
    ctx.fillRect(-88, 28, 16, 120);
    ctx.fillRect(72, 28, 16, 120);
    ctx.fillStyle = "#c47a34";
    ctx.fillRect(-72, 38, 144, 46);
    ctx.fillStyle = "#fff3c2";
    ctx.font = "900 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("港", 0, 69);
    ctx.restore();
  }

  function drawSellStation(station) {
    drawSpriteFoot(assets.sellStation, station.x, station.y + 96, 224);
    ctx.save();
    ctx.translate(station.x, station.y);
    ctx.fillStyle = "#fff5ca";
    ctx.strokeStyle = "rgba(75, 40, 15, 0.42)";
    ctx.lineWidth = 5;
    ctx.font = "900 22px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText("売却所", 0, -51);
    ctx.fillText("売却所", 0, -51);
    ctx.restore();
  }

  function drawSellRange() {
    if (!nearSell) return;
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.setLineDash([12, 13]);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#fff9d5";
    ctx.beginPath();
    ctx.arc(sellStation.x, sellStation.y, sellStation.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawNpc(npc, role) {
    const moving = npc.mode === "walking" || npc.mode === "toTree" || npc.mode === "toHome";
    const bob = moving ? Math.sin(animationClock * 11 + npc.x * 0.02) * 1.6 : 0;
    ctx.save();
    ctx.translate(npc.x, npc.y + bob);
    ctx.filter = role === "worker" ? "hue-rotate(62deg) saturate(1.15)" : "hue-rotate(-28deg) saturate(0.9)";
    drawSpriteFoot(assets.player, 0, 43, role === "worker" ? 60 : 54, { shadowAlpha: 0.16 });
    ctx.filter = "none";
    if (role === "worker" && npc.carrying) drawCarriedWood(-22, 3, 0.72);
    if (role === "worker" && npc.mode === "chopping") drawGauge(0, -66, npc.progress, "#59c455", 54);
    ctx.restore();
  }

  function drawPlayer(player) {
    const moving = Math.hypot(getInputVector().x, getInputVector().y) > 0.03;
    const bob = Math.sin(animationClock * 12) * (moving ? 2 : 0);
    ctx.save();
    ctx.translate(player.x, player.y + bob);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.setLineDash([26, 12]);
    ctx.beginPath();
    ctx.arc(0, 30, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    drawSpriteFoot(assets.player, 0, 52, 76);
    if (RESOURCE_TYPES.some((type) => state.resources[type] > 0)) drawCarriedWood(-27, 10, 0.9);
    ctx.restore();
  }

  function drawCarriedWood(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(-0.45);
    ctx.fillStyle = "#ad6b25";
    ctx.strokeStyle = "#6d3e18";
    ctx.lineWidth = 3;
    roundRect(-10, -12, 20, 25, 7);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawGauge(x, y, progress, color, width = 62) {
    ctx.save();
    ctx.translate(x, y);
    const height = 17;
    ctx.fillStyle = "rgba(43, 30, 15, 0.28)";
    roundRect(-width / 2, -height / 2, width, height, 8);
    ctx.fill();
    ctx.fillStyle = "#fff8cf";
    roundRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 6);
    ctx.fill();
    ctx.fillStyle = color;
    roundRect(-width / 2 + 5, -height / 2 + 5, (width - 10) * clamp(progress, 0, 1), height - 10, 5);
    ctx.fill();
    ctx.restore();
  }

  function drawQuestWorldMarker() {
    const target = getGuideTarget();
    if (!target) return;
    const pulse = 1 + Math.sin(animationClock * 5) * 0.12;
    ctx.save();
    ctx.translate(target.x, target.y);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = "rgba(255, 246, 115, 0.92)";
    ctx.lineWidth = 7;
    ctx.setLineDash([13, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, 72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawQuestGuide() {
    const target = getGuideTarget();
    if (!target) return;
    const point = worldToScreen(target.x, target.y);
    const marginX = 62;
    const topMargin = 128;
    const bottomMargin = 148;
    const visible = point.x >= marginX && point.x <= screen.w - marginX && point.y >= topMargin && point.y <= screen.h - bottomMargin;
    if (visible) {
      ctx.save();
      ctx.translate(point.x, point.y - 76 * camera.scale);
      ctx.fillStyle = "#fff37a";
      ctx.strokeStyle = "rgba(88, 56, 15, 0.48)";
      ctx.lineWidth = 5;
      ctx.font = "900 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText("ここ！", 0, 0);
      ctx.fillText("ここ！", 0, 0);
      ctx.restore();
      return;
    }

    const centerX = screen.w / 2;
    const centerY = screen.h / 2;
    const angle = Math.atan2(point.y - centerY, point.x - centerX);
    const arrowX = clamp(point.x, marginX, screen.w - marginX);
    const arrowY = clamp(point.y, topMargin, screen.h - bottomMargin);
    ctx.save();
    ctx.translate(arrowX, arrowY);
    ctx.fillStyle = "rgba(255, 244, 105, 0.96)";
    ctx.strokeStyle = "rgba(88, 56, 15, 0.42)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(angle);
    ctx.fillStyle = "#6b4a1b";
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-7, -10);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-7, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function getGuideTarget() {
    if (manualGuideSite && performance.now() < manualGuideUntil) {
      const def = getSiteDef(manualGuideSite);
      if (def) return { x: def.x, y: def.y };
    } else {
      manualGuideSite = null;
    }

    const quest = getCurrentQuest();
    if (!quest) return null;
    if (quest.type === "site") {
      const def = getSiteDef(quest.siteId);
      return def ? { x: def.x, y: def.y } : null;
    }
    if (quest.type === "sell") return { x: sellStation.x, y: sellStation.y };
    if (quest.type === "hire") return { x: buildingPlacements.workerHut.x, y: buildingPlacements.workerHut.y };
    if (quest.type === "finish") return { x: 800, y: 1600 };
    if (quest.type === "collect") return getResourceGuideTarget(quest.resource);
    return null;
  }

  function getResourceGuideTarget(type) {
    let items;
    if (type === "wood") items = state.world.trees.filter((tree) => tree.state === "alive" && isPointUnlocked(tree.x, tree.y));
    else items = (state.world.nodes[type] || []).filter((node) => node.state === "alive" && isPointUnlocked(node.x, node.y));
    items.sort((a, b) => Math.hypot(a.x - state.player.x, a.y - state.player.y) - Math.hypot(b.x - state.player.x, b.y - state.player.y));
    if (items[0]) return { x: items[0].x, y: items[0].y };
    const fallback = {
      wood: { x: 760, y: 1100 },
      stone: { x: 360, y: 1120 },
      food: { x: 1260, y: 1100 },
      fiber: { x: 1260, y: 1100 },
      ore: { x: 820, y: 520 }
    };
    return fallback[type];
  }

  function drawEffects() {
    ctx.save();
    translateCamera();
    for (const particle of particles) {
      ctx.save();
      ctx.globalAlpha = clamp(particle.life, 0, 1);
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.spin);
      ctx.fillStyle = particle.color;
      if (particle.kind === "coin") {
        ctx.beginPath();
        ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ad7715";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (particle.kind === "star") {
        drawStar(0, 0, particle.size, particle.size * 0.45, 5);
        ctx.fill();
      } else {
        roundRect(-particle.size, -particle.size * 0.45, particle.size * 2, particle.size * 0.9, 4);
        ctx.fill();
      }
      ctx.restore();
    }

    for (const item of flyingItems) {
      const t = easeOutCubic(clamp(item.age / item.duration, 0, 1));
      const x = lerp(item.startX, item.endX, t);
      const y = lerp(item.startY, item.endY, t) - Math.sin(t * Math.PI) * 72;
      ctx.save();
      ctx.globalAlpha = clamp(1 - Math.max(0, t - 0.82) / 0.18, 0, 1);
      ctx.translate(x, y);
      ctx.fillStyle = RESOURCE_INFO[item.type].color;
      ctx.strokeStyle = "rgba(79, 49, 17, 0.45)";
      ctx.lineWidth = 3;
      if (item.type === "money") {
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.rotate(t * 5);
        roundRect(-10, -7, 20, 14, 4);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const popup of popups) {
      ctx.save();
      ctx.globalAlpha = clamp(popup.life, 0, 1);
      ctx.fillStyle = popup.color;
      ctx.strokeStyle = "rgba(70, 47, 18, 0.4)";
      ctx.lineWidth = 5;
      ctx.font = `900 ${Math.round(27 * popup.scale)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText(popup.text, popup.x, popup.y);
      ctx.fillText(popup.text, popup.x, popup.y);
      ctx.restore();
    }
    ctx.restore();
  }

  function updateEffects(dt) {
    for (let index = popups.length - 1; index >= 0; index -= 1) {
      const popup = popups[index];
      popup.age += dt;
      popup.y -= dt * 45;
      popup.life = 1 - popup.age / popup.duration;
      if (popup.life <= 0) popups.splice(index, 1);
    }
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.age += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 92 * dt;
      particle.spin += particle.spinSpeed * dt;
      particle.life = 1 - particle.age / particle.duration;
      if (particle.life <= 0) particles.splice(index, 1);
    }
    for (let index = flyingItems.length - 1; index >= 0; index -= 1) {
      flyingItems[index].age += dt;
      if (flyingItems[index].age >= flyingItems[index].duration) flyingItems.splice(index, 1);
    }
    for (const [siteId, age] of sitePops) {
      const nextAge = age + dt;
      if (nextAge > 0.8) sitePops.delete(siteId);
      else sitePops.set(siteId, nextAge);
    }

    if (screenShake > 0) {
      screenShake = Math.max(0, screenShake - dt);
      const strength = Math.min(1, screenShake / 0.5) * 8;
      camera.shakeX = (seededRandom(animationClock * 97) - 0.5) * strength * 2;
      camera.shakeY = (seededRandom(animationClock * 131) - 0.5) * strength * 2;
    } else {
      camera.shakeX = 0;
      camera.shakeY = 0;
    }
  }

  function spawnPopup(text, x, y, color, scale) {
    popups.push({ text, x, y, color, scale, age: 0, duration: 0.95, life: 1 });
  }

  function spawnResourceBits(x, y, type) {
    for (let index = 0; index < 8; index += 1) {
      const angle = -Math.PI / 2 + (index - 3.5) * 0.35;
      const speed = 75 + seededRandom(index + Date.now() % 1000) * 50;
      particles.push({
        kind: type,
        color: RESOURCE_INFO[type].color,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + (index % 3),
        spin: index * 0.8,
        spinSpeed: 3 - index * 0.25,
        age: 0,
        duration: 0.75,
        life: 1
      });
    }
  }

  function spawnCoinBurst(x, y) {
    for (let index = 0; index < 15; index += 1) {
      const angle = Math.PI * 2 * (index / 15);
      const speed = 90 + seededRandom(index + Date.now() % 800) * 72;
      particles.push({
        kind: "coin",
        color: "#ffd744",
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 35,
        size: 6 + (index % 4) * 0.8,
        spin: 0,
        spinSpeed: 5,
        age: 0,
        duration: 0.92,
        life: 1
      });
    }
  }

  function spawnCompletionBurst(x, y) {
    for (let index = 0; index < 24; index += 1) {
      const angle = Math.PI * 2 * (index / 24);
      const speed = 90 + seededRandom(index + x * 0.01) * 105;
      particles.push({
        kind: index % 3 === 0 ? "coin" : "star",
        color: index % 2 === 0 ? "#ffe262" : "#ffffff",
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 55,
        size: 6 + (index % 4),
        spin: index * 0.4,
        spinSpeed: index % 2 === 0 ? 5 : -4,
        age: 0,
        duration: 1.05,
        life: 1
      });
    }
  }

  function spawnDepositItem(type, startX, startY, endX, endY) {
    flyingItems.push({ type, startX, startY, endX, endY, age: 0, duration: type === "money" ? 0.28 : 0.36 });
  }

  function triggerScreenShake(duration) {
    screenShake = Math.max(screenShake, duration);
  }

  function constructionPopScale(age) {
    if (age < 0.24) return lerp(0.55, 1.16, easeOutBack(age / 0.24));
    return lerp(1.16, 1, clamp((age - 0.24) / 0.38, 0, 1));
  }

  function animateMoney(from, to) {
    displayedMoney = from;
    moneyTween = { from, to, age: 0, duration: 0.55 };
  }

  function updateMoneyTween(dt) {
    if (!moneyTween) return;
    moneyTween.age += dt;
    const t = easeOutCubic(clamp(moneyTween.age / moneyTween.duration, 0, 1));
    displayedMoney = Math.round(lerp(moneyTween.from, moneyTween.to, t));
    els.money.textContent = formatNumber(displayedMoney);
    if (t >= 1) {
      displayedMoney = moneyTween.to;
      moneyTween = null;
    }
  }

  function flashRow(row) {
    if (!row) return;
    row.classList.remove("is-flashing");
    void row.offsetWidth;
    row.classList.add("is-flashing");
    window.setTimeout(() => row.classList.remove("is-flashing"), 180);
  }

  function showToast(message) {
    const node = document.createElement("div");
    node.className = "toast";
    node.textContent = message;
    els.toastLayer.appendChild(node);
    window.setTimeout(() => node.remove(), 1850);
  }

  function pulseHaptic(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  function updateCamera() {
    camera.scale = getViewScale();
    const viewWidth = screen.w / camera.scale;
    const viewHeight = screen.h / camera.scale;
    camera.x = state.player.x - viewWidth * 0.5;
    camera.y = state.player.y - viewHeight * 0.54;
    camera.x = clampCameraAxis(camera.x, 0, world.width - viewWidth);
    camera.y = clampCameraAxis(camera.y, 0, world.height - viewHeight);
  }

  function worldToScreen(x, y) {
    return {
      x: (x - camera.x) * camera.scale + camera.shakeX,
      y: (y - camera.y) * camera.scale + camera.shakeY
    };
  }

  function translateCamera() {
    ctx.scale(camera.scale, camera.scale);
    ctx.translate(-camera.x + camera.shakeX / camera.scale, -camera.y + camera.shakeY / camera.scale);
  }

  function drawSpriteFoot(image, x, footY, width, options = {}) {
    if (!image) return;
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    if (!imageWidth || !imageHeight) return;
    const height = width * (imageHeight / imageWidth);
    const drawX = x - width / 2;
    const drawY = footY - height;
    const shadowScale = options.shadowScale || 1;

    ctx.save();
    ctx.globalAlpha = options.shadowAlpha === undefined ? 0.2 : options.shadowAlpha;
    ctx.fillStyle = "#214516";
    ctx.beginPath();
    ctx.ellipse(x + width * 0.05, footY - height * 0.08, width * 0.32 * shadowScale, width * 0.11 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = options.alpha === undefined ? 1 : options.alpha;
    ctx.drawImage(image, drawX, drawY, width, height);
    ctx.restore();
  }

  function drawImageCover(image, x, y, width, height) {
    if (!image) return;
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    if (!imageWidth || !imageHeight) return;
    const scale = Math.max(width / imageWidth, height / imageHeight);
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const sourceX = (imageWidth - sourceWidth) / 2;
    const sourceY = (imageHeight - sourceHeight) / 2;
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  }

  function drawStar(x, y, outerRadius, innerRadius, points) {
    ctx.beginPath();
    for (let index = 0; index < points * 2; index += 1) {
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + (Math.PI * index) / points;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function forEachNode(callback) {
    if (!state || !state.world || !state.world.nodes) return;
    for (const type of RESOURCE_TYPES.filter((item) => item !== "wood")) {
      for (const node of state.world.nodes[type] || []) callback(node, type);
    }
  }

  function insideIsland(x, y, margin) {
    const dx = x - world.cx;
    const dy = y - world.cy;
    const angle = Math.atan2(dy / world.sandRy, dx / world.sandRx);
    const radius = Math.hypot(dx / (world.sandRx - margin), dy / (world.sandRy - margin));
    return radius <= islandWobble(angle);
  }

  function islandWobble(angle) {
    return 1
      + Math.sin(angle * 3.1 + 0.45) * 0.055
      + Math.sin(angle * 5.7 - 1.8) * 0.036
      + Math.cos(angle * 8.4 + 0.2) * 0.018;
  }

  function getViewScale() {
    if (screen.w > screen.h) return clamp(screen.h / 1500, 0.5, 0.68);
    return clamp(Math.min(screen.w / 650, screen.h / 1250), 0.58, 0.84);
  }

  function clampCameraAxis(value, min, max) {
    if (min > max) return (min + max) / 2;
    return clamp(value, min, max);
  }

  function seededRandom(seed) {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function roundRect(x, y, width, height, radius) {
    const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function lerp(from, to, amount) {
    return from + (to - from) * amount;
  }

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
  }

  function easeOutBack(value) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clampInt(value, min, max) {
    return Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
  }

  function formatNumber(value) {
    return Math.floor(Number(value) || 0).toLocaleString("ja-JP");
  }
})();
