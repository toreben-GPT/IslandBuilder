(() => {
  "use strict";

  const SAVE_KEY = "island_dev_game_save";
  const SAVE_VERSION = 1;
  const PLAYER_RADIUS = 24;
  const WORKER_WOOD_INTERVAL = 7.5;

  const RESOURCE_TYPES = ["wood", "stone", "ore", "fiber", "food"];
  const RESOURCE_INFO = {
    wood: { label: "木材", value: 10, color: "#ffffff", cap: 20, row: "woodRow" },
    stone: { label: "石材", value: 15, color: "#f3f6ff", cap: 15, row: "stoneRow" },
    ore: { label: "鉱石", value: 35, color: "#aee9ff", cap: 8, row: "oreRow" },
    fiber: { label: "繊維", value: 12, color: "#ddff9a", cap: 15, row: "fiberRow" },
    food: { label: "食料", value: 8, color: "#ffd2ca", cap: 15, row: "foodRow" }
  };

  const GATHER_SECONDS = {
    wood: 1.55,
    stone: 1.8,
    ore: 2.35,
    fiber: 1.2,
    food: 1.25
  };

  const RESPAWN_MS = {
    wood: 16000,
    stone: 19000,
    ore: 26000,
    fiber: 12000,
    food: 14000
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
    ore: document.getElementById("oreValue"),
    oreCapacity: document.getElementById("oreCapacity"),
    fiber: document.getElementById("fiberValue"),
    fiberCapacity: document.getElementById("fiberCapacity"),
    food: document.getElementById("foodValue"),
    foodCapacity: document.getElementById("foodCapacity"),
    residents: document.getElementById("residentValue"),
    rows: {
      money: document.getElementById("moneyRow"),
      wood: document.getElementById("woodRow"),
      stone: document.getElementById("stoneRow"),
      ore: document.getElementById("oreRow"),
      fiber: document.getElementById("fiberRow"),
      food: document.getElementById("foodRow")
    },
    missionTitle: document.getElementById("missionTitle"),
    missionStatus: document.getElementById("missionStatus"),
    missionProgress: document.getElementById("missionProgress"),
    toastLayer: document.getElementById("toastLayer"),
    sellHint: document.getElementById("sellHint"),
    joystick: document.getElementById("joystick"),
    joystickKnob: document.getElementById("joystickKnob"),
    sellButton: document.getElementById("sellButton"),
    buildButton: document.getElementById("buildButton"),
    resetButton: document.getElementById("resetButton"),
    buildMenu: document.getElementById("buildMenu"),
    closeBuildButton: document.getElementById("closeBuildButton"),
    buildList: document.getElementById("buildList")
  };

  const assets = {};
  let assetsReady = false;

  const world = {
    width: 1600,
    height: 2200,
    cx: 800,
    cy: 1085,
    sandRx: 690,
    sandRy: 950
  };

  const sellStation = { x: 1110, y: 1425, radius: 150 };

  const buildingPlacements = {
    woodStorage: { x: 600, y: 1470, width: 176, asset: "woodStorage" },
    stoneYard: { x: 470, y: 1075, width: 170, asset: "stoneYard" },
    mine: { x: 1190, y: 760, width: 190, asset: "mine" },
    farm: { x: 1080, y: 1745, width: 205, asset: "farm" },
    house: { x: 770, y: 1640, width: 160, asset: "house" },
    workerHut: { x: 505, y: 1730, width: 160, asset: "workerHut" }
  };

  const BUILDINGS = [
    {
      id: "woodStorage",
      name: "木材倉庫",
      description: "木材の所持上限が増えます",
      effect: "木材上限 20 → 45",
      cost: { wood: 15, stone: 5, money: 150 },
      asset: "woodStorage"
    },
    {
      id: "stoneYard",
      name: "石材置き場",
      description: "石材の所持上限が増えます",
      effect: "石材上限 15 → 40",
      cost: { wood: 12, stone: 12, money: 200 },
      asset: "stoneYard"
    },
    {
      id: "farm",
      name: "畑",
      description: "食料と繊維を多く持てるようになります",
      effect: "食料上限 15 → 35 / 繊維上限 15 → 30",
      cost: { wood: 15, stone: 5, fiber: 8 },
      asset: "farm"
    },
    {
      id: "house",
      name: "住宅",
      description: "住民上限が増えます",
      effect: "住民上限 2 → 3",
      cost: { wood: 20, stone: 12, food: 10, money: 400 },
      asset: "house"
    },
    {
      id: "mine",
      name: "採掘所",
      description: "鉱石岩が使えるようになります",
      effect: "鉱石を採取可能 / 鉱石上限 8 → 20",
      cost: { wood: 25, stone: 20, fiber: 10, money: 500 },
      prereq: ["stoneYard"],
      asset: "mine"
    },
    {
      id: "workerHut",
      name: "作業員小屋",
      description: "作業員を雇う準備ができます",
      effect: "作業員雇用を解放",
      cost: { wood: 35, stone: 20, fiber: 20, food: 20, money: 700 },
      prereq: ["farm", "house"],
      asset: "workerHut"
    },
    {
      id: "hireWorker",
      name: "作業員を雇う",
      description: "木材をゆっくり自動回収します",
      effect: "自動木材 +1 / 約8秒",
      cost: { food: 25, money: 600 },
      prereq: ["workerHut", "house"],
      asset: "player",
      kind: "worker"
    }
  ];

  const treeLayout = [
    { id: "tree_01", x: 410, y: 470, size: 1.05 },
    { id: "tree_02", x: 650, y: 410, size: 1.15 },
    { id: "tree_03", x: 900, y: 450, size: 1.03 },
    { id: "tree_04", x: 1140, y: 560, size: 0.95 },
    { id: "tree_05", x: 360, y: 780, size: 1.12 },
    { id: "tree_06", x: 650, y: 760, size: 0.95 },
    { id: "tree_07", x: 920, y: 815, size: 1.05 },
    { id: "tree_08", x: 1230, y: 960, size: 0.92 },
    { id: "tree_09", x: 370, y: 1190, size: 0.98 },
    { id: "tree_10", x: 690, y: 1220, size: 0.9 },
    { id: "tree_11", x: 965, y: 1165, size: 1.03 },
    { id: "tree_12", x: 1280, y: 1290, size: 0.88 },
    { id: "tree_13", x: 355, y: 1525, size: 0.86 },
    { id: "tree_14", x: 650, y: 1840, size: 0.88 },
    { id: "tree_15", x: 960, y: 1970, size: 0.92 },
    { id: "tree_16", x: 1220, y: 1850, size: 0.88 }
  ];

  const nodeLayouts = {
    stone: [
      { id: "stone_01", x: 470, y: 660, size: 0.82 },
      { id: "stone_02", x: 1120, y: 1010, size: 0.78 },
      { id: "stone_03", x: 380, y: 1380, size: 0.7 },
      { id: "stone_04", x: 960, y: 1490, size: 0.76 },
      { id: "stone_05", x: 1230, y: 1585, size: 0.7 },
      { id: "stone_06", x: 780, y: 640, size: 0.68 }
    ],
    ore: [
      { id: "ore_01", x: 1225, y: 690, size: 0.86 },
      { id: "ore_02", x: 1320, y: 850, size: 0.72 },
      { id: "ore_03", x: 1070, y: 700, size: 0.66 },
      { id: "ore_04", x: 1185, y: 1115, size: 0.7 }
    ],
    fiber: [
      { id: "fiber_01", x: 320, y: 560, size: 0.62 },
      { id: "fiber_02", x: 505, y: 920, size: 0.6 },
      { id: "fiber_03", x: 720, y: 1400, size: 0.62 },
      { id: "fiber_04", x: 1010, y: 1810, size: 0.66 },
      { id: "fiber_05", x: 1260, y: 1160, size: 0.58 },
      { id: "fiber_06", x: 540, y: 1885, size: 0.58 }
    ],
    food: [
      { id: "food_01", x: 520, y: 590, size: 0.72 },
      { id: "food_02", x: 1045, y: 600, size: 0.68 },
      { id: "food_03", x: 320, y: 1015, size: 0.68 },
      { id: "food_04", x: 1220, y: 1360, size: 0.7 },
      { id: "food_05", x: 835, y: 1765, size: 0.65 },
      { id: "food_06", x: 515, y: 1590, size: 0.62 }
    ]
  };

  const keys = new Set();
  const joystick = {
    active: false,
    pointerId: null,
    centerX: 0,
    centerY: 0,
    x: 0,
    y: 0,
    radius: 44
  };

  const camera = { x: 0, y: 0, scale: 1 };
  const screen = { w: 1, h: 1, dpr: 1 };
  const popups = [];
  const particles = [];

  let state = migrateSave(loadSave());
  let lastFrame = performance.now();
  let saveQueued = false;
  let lastAutoSave = performance.now();
  let nearSell = false;
  let missionTimer = 0;
  let lastFullToastAt = 0;
  let animationClock = 0;
  let movementFacing = { x: 0, y: 1 };

  applyUpgradeEffects();
  refreshRespawns();
  resumeCompletedMissionIfNeeded();
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
      resources: {
        money: 1000,
        wood: 0,
        stone: 0,
        ore: 0,
        fiber: 0,
        food: 0
      },
      stats: {
        totalWoodSold: 0,
        totalResourcesGathered: 0,
        totalResourcesSold: 0
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
          mine: false,
          farm: false,
          house: false,
          workerHut: false
        }
      },
      workers: {
        hired: 0,
        woodProgress: 0
      },
      mission: createMission("sell_wood_10"),
      world: {
        trees: treeLayout.map(createGatherable),
        nodes: createDefaultNodes()
      }
    };
  }

  function defaultResourceCaps() {
    return RESOURCE_TYPES.reduce((caps, type) => {
      caps[type] = RESOURCE_INFO[type].cap;
      return caps;
    }, {});
  }

  function createDefaultNodes() {
    const nodes = {};
    for (const type of ["stone", "ore", "fiber", "food"]) {
      nodes[type] = nodeLayouts[type].map(createGatherable);
    }
    return nodes;
  }

  function createGatherable(layout) {
    return {
      ...layout,
      state: "alive",
      progress: 0,
      chopProgress: 0,
      respawnAt: 0
    };
  }

  function createMission(id) {
    const templates = {
      sell_wood_10: {
        id: "sell_wood_10",
        label: "木を10個売却する",
        target: 10,
        reward: 100,
        nextId: "sell_wood_30"
      },
      sell_wood_30: {
        id: "sell_wood_30",
        label: "木を30個売却する",
        target: 30,
        reward: 300,
        nextId: null
      }
    };
    const template = templates[id] || templates.sell_wood_10;
    return {
      id: template.id,
      label: template.label,
      target: template.target,
      progress: 0,
      completed: false,
      reward: template.reward,
      nextId: template.nextId
    };
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
    if (!save || typeof save !== "object") {
      return defaults;
    }

    const input = structuredCloneSafe(save);
    if (typeof input.version !== "number") {
      input.version = 0;
    }
    if (input.version < 1) {
      input.version = 1;
    }

    const merged = deepMerge(defaults, input);
    merged.version = SAVE_VERSION;
    merged.resources = normalizeResources(merged.resources);
    merged.stats.totalWoodSold = Math.max(0, Number(merged.stats.totalWoodSold) || 0);
    merged.stats.totalResourcesGathered = Math.max(0, Number(merged.stats.totalResourcesGathered) || 0);
    merged.stats.totalResourcesSold = Math.max(0, Number(merged.stats.totalResourcesSold) || 0);
    merged.buildings = normalizeBuildings(merged.buildings);
    merged.workers = normalizeWorkers(merged.workers);
    merged.player.x = Number.isFinite(merged.player.x) ? merged.player.x : defaults.player.x;
    merged.player.y = Number.isFinite(merged.player.y) ? merged.player.y : defaults.player.y;
    if (!insideIsland(merged.player.x, merged.player.y, PLAYER_RADIUS)) {
      merged.player.x = defaults.player.x;
      merged.player.y = defaults.player.y;
    }
    merged.player.resourceCaps = normalizeCaps(merged.player.resourceCaps);
    merged.world.trees = normalizeGatherableList(merged.world.trees, treeLayout);
    merged.world.nodes = normalizeWorldNodes(merged.world.nodes);
    merged.mission = normalizeMission(merged.mission);

    if (input.buildings && input.buildings.workerHut) {
      merged.buildings.placed.workerHut = true;
      merged.buildings.workerHut = true;
    }
    if (Number(input.buildings && input.buildings.warehouseLevel) > 0) {
      merged.buildings.placed.woodStorage = true;
    }

    return merged;
  }

  function normalizeResources(resources) {
    const normalized = { money: Math.max(0, Number(resources.money) || 0) };
    for (const type of RESOURCE_TYPES) {
      normalized[type] = Math.max(0, Number(resources[type]) || 0);
    }
    return normalized;
  }

  function normalizeCaps(caps) {
    const normalized = defaultResourceCaps();
    if (caps && typeof caps === "object") {
      for (const type of RESOURCE_TYPES) {
        normalized[type] = Math.max(RESOURCE_INFO[type].cap, Number(caps[type]) || RESOURCE_INFO[type].cap);
      }
    }
    return normalized;
  }

  function normalizeBuildings(buildings) {
    const defaults = createDefaultSave().buildings;
    const normalized = deepMerge(defaults, buildings || {});
    normalized.warehouseLevel = clampInt(normalized.warehouseLevel, 0, 2);
    normalized.axeLevel = clampInt(normalized.axeLevel, 0, 2);
    normalized.workerHut = Boolean(normalized.workerHut || normalized.placed.workerHut);
    for (const id of Object.keys(defaults.placed)) {
      normalized.placed[id] = Boolean(normalized.placed[id]);
    }
    return normalized;
  }

  function normalizeWorkers(workers) {
    return {
      hired: clampInt(workers && workers.hired, 0, 1),
      woodProgress: Math.max(0, Number(workers && workers.woodProgress) || 0)
    };
  }

  function normalizeGatherableList(savedItems, layoutItems) {
    const byId = new Map();
    if (Array.isArray(savedItems)) {
      for (const item of savedItems) {
        if (item && item.id) {
          byId.set(item.id, item);
        }
      }
    }
    return layoutItems.map((layout) => {
      const saved = byId.get(layout.id) || {};
      const depleted = saved.state === "stump" || saved.state === "depleted";
      return {
        ...layout,
        state: depleted ? (layout.id.startsWith("tree_") ? "stump" : "depleted") : "alive",
        progress: Math.max(0, Math.min(1, Number(saved.progress ?? saved.chopProgress) || 0)),
        chopProgress: Math.max(0, Math.min(1, Number(saved.chopProgress ?? saved.progress) || 0)),
        respawnAt: Math.max(0, Number(saved.respawnAt) || 0)
      };
    });
  }

  function normalizeWorldNodes(savedNodes) {
    const nodes = {};
    for (const type of ["stone", "ore", "fiber", "food"]) {
      nodes[type] = normalizeGatherableList(savedNodes && savedNodes[type], nodeLayouts[type]);
    }
    return nodes;
  }

  function normalizeMission(mission) {
    if (!mission || typeof mission !== "object") {
      return createMission("sell_wood_10");
    }
    const template = createMission(mission.id);
    return {
      ...template,
      progress: Math.max(0, Math.min(template.target, Number(mission.progress) || 0)),
      completed: Boolean(mission.completed) && Number(mission.progress) >= template.target
    };
  }

  function structuredCloneSafe(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return {};
    }
  }

  function deepMerge(base, incoming) {
    if (Array.isArray(base)) {
      return Array.isArray(incoming) ? incoming : base;
    }
    if (!base || typeof base !== "object") {
      return incoming === undefined ? base : incoming;
    }
    const result = { ...base };
    if (!incoming || typeof incoming !== "object") {
      return result;
    }
    for (const key of Object.keys(incoming)) {
      result[key] = deepMerge(base[key], incoming[key]);
    }
    return result;
  }

  function bindEvents() {
    window.addEventListener("resize", resizeCanvas);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", resizeCanvas);
    }

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
    els.buildMenu.addEventListener("click", (event) => {
      if (event.target === els.buildMenu) {
        closeBuildMenu();
      }
    });
    els.buildList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-build-id]");
      if (button) {
        buyBuildItem(button.dataset.buildId);
      }
    });
    els.resetButton.addEventListener("click", resetGame);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        saveNow();
      }
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
    if (!assetsReady) {
      drawLoading();
    }
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
    updateWorkers(dt);
    updateSellProximity();
    updateEffects(dt);
    updateCamera();

    if (saveQueued && now - lastAutoSave > 650) {
      saveNow();
    }
    if (!saveQueued && now - lastAutoSave > 5000) {
      saveNow();
    }
  }

  function updateMovement(dt) {
    const input = getInputVector();
    const magnitude = Math.hypot(input.x, input.y);
    if (magnitude <= 0.02) {
      return;
    }

    const nx = input.x / magnitude;
    const ny = input.y / magnitude;
    movementFacing = { x: nx, y: ny };
    const speed = 235;
    const nextX = state.player.x + nx * speed * dt;
    const nextY = state.player.y + ny * speed * dt;

    if (insideIsland(nextX, nextY, PLAYER_RADIUS)) {
      state.player.x = nextX;
      state.player.y = nextY;
      queueSave();
      return;
    }
    if (insideIsland(nextX, state.player.y, PLAYER_RADIUS)) {
      state.player.x = nextX;
      queueSave();
    }
    if (insideIsland(state.player.x, nextY, PLAYER_RADIUS)) {
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
    if (!joystick.active || event.pointerId !== joystick.pointerId) {
      return;
    }
    event.preventDefault();
    const dx = event.clientX - joystick.centerX;
    const dy = event.clientY - joystick.centerY;
    const dist = Math.hypot(dx, dy);
    const limit = joystick.radius;
    const scale = dist > limit ? limit / dist : 1;
    const knobX = dx * scale;
    const knobY = dy * scale;
    joystick.x = knobX / limit;
    joystick.y = knobY / limit;
    els.joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
  }

  function endJoystick(event) {
    if (!joystick.active || event.pointerId !== joystick.pointerId) {
      return;
    }
    joystick.active = false;
    joystick.pointerId = null;
    joystick.x = 0;
    joystick.y = 0;
    els.joystickKnob.style.transform = "translate(-50%, -50%)";
  }

  function updateCamera() {
    camera.scale = getViewScale();
    const viewW = screen.w / camera.scale;
    const viewH = screen.h / camera.scale;
    camera.x = state.player.x - viewW * 0.5;
    camera.y = state.player.y - viewH * 0.54;
    camera.x = clampCameraAxis(camera.x, 0, world.width - viewW);
    camera.y = clampCameraAxis(camera.y, 0, world.height - viewH);
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
        spawnPopup("再生", tree.x, tree.y - 78, "#e9ffb7", 0.75);
        changed = true;
      }
    }
    forEachNode((node) => {
      if (node.state === "depleted" && node.respawnAt && now >= node.respawnAt) {
        node.state = "alive";
        node.progress = 0;
        node.respawnAt = 0;
        changed = true;
      }
    });
    if (changed) {
      queueSave();
    }
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
        node.respawnAt = 0;
      }
    });
  }

  function updateGathering(dt, now) {
    const target = getNearestGatherTarget();
    decayInactiveProgress(target, dt);
    if (!target) {
      return;
    }
    const type = target.resource;
    if (isResourceFull(type)) {
      if (now - lastFullToastAt > 1300) {
        showToast(`${RESOURCE_INFO[type].label}がいっぱい！`);
        spawnPopup("満タン", state.player.x, state.player.y - 55, "#fff4a8", 0.7);
        lastFullToastAt = now;
      }
      return;
    }

    const speed = type === "wood" ? state.player.chopSpeedMultiplier : 1;
    target.item.progress += (dt * speed) / GATHER_SECONDS[type];
    target.item.chopProgress = target.item.progress;
    if (target.item.progress >= 1) {
      harvestTarget(target);
    }
  }

  function decayInactiveProgress(activeTarget, dt) {
    for (const tree of state.world.trees) {
      if ((!activeTarget || activeTarget.item !== tree) && tree.state === "alive" && tree.progress > 0) {
        tree.progress = Math.max(0, tree.progress - dt * 0.25);
        tree.chopProgress = tree.progress;
      }
    }
    forEachNode((node) => {
      if ((!activeTarget || activeTarget.item !== node) && node.state === "alive" && node.progress > 0) {
        node.progress = Math.max(0, node.progress - dt * 0.25);
      }
    });
  }

  function getNearestGatherTarget() {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const tree of state.world.trees) {
      if (tree.state !== "alive") continue;
      const distance = Math.hypot(tree.x - state.player.x, tree.y - state.player.y);
      const range = 84 + tree.size * 12;
      if (distance < range && distance < nearestDistance) {
        nearest = { kind: "tree", resource: "wood", item: tree, x: tree.x, y: tree.y };
        nearestDistance = distance;
      }
    }
    for (const type of ["stone", "ore", "fiber", "food"]) {
      if (!isResourceUnlocked(type)) continue;
      for (const node of state.world.nodes[type]) {
        if (node.state !== "alive") continue;
        const distance = Math.hypot(node.x - state.player.x, node.y - state.player.y);
        const range = 72 + node.size * 18;
        if (distance < range && distance < nearestDistance) {
          nearest = { kind: "node", resource: type, item: node, x: node.x, y: node.y };
          nearestDistance = distance;
        }
      }
    }
    return nearest;
  }

  function harvestTarget(target) {
    const type = target.resource;
    const item = target.item;
    state.resources[type] += 1;
    state.stats.totalResourcesGathered += 1;
    if (type === "wood") {
      item.state = "stump";
    } else {
      item.state = "depleted";
    }
    item.progress = 0;
    item.chopProgress = 0;
    item.respawnAt = Date.now() + RESPAWN_MS[type];

    spawnPopup("+1", target.x, target.y - 84, RESOURCE_INFO[type].color, 1);
    spawnResourceBits(target.x, target.y - 26, type);
    flashRow(els.rows[type]);
    pulseHaptic(12);
    updateHud();
    queueSave();
  }

  function updateWorkers(dt) {
    if (state.workers.hired <= 0 || !isBuilt("workerHut")) {
      return;
    }
    state.workers.woodProgress += dt;
    if (state.workers.woodProgress < WORKER_WOOD_INTERVAL) {
      return;
    }
    state.workers.woodProgress = 0;
    if (isResourceFull("wood")) {
      return;
    }
    state.resources.wood += 1;
    spawnPopup("作業員 +1", buildingPlacements.workerHut.x, buildingPlacements.workerHut.y - 80, "#e9ffb7", 0.8);
    flashRow(els.rows.wood);
    updateHud();
    queueSave();
  }

  function updateSellProximity() {
    const distance = Math.hypot(state.player.x - sellStation.x, state.player.y - sellStation.y);
    const active = distance <= sellStation.radius;
    if (active === nearSell) {
      return;
    }
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
    const woodSold = state.resources.wood;
    for (const type of RESOURCE_TYPES) {
      const amount = state.resources[type];
      gain += amount * RESOURCE_INFO[type].value;
      soldCount += amount;
      state.resources[type] = 0;
    }
    if (soldCount <= 0) {
      showToast("売れる素材がありません");
      return;
    }
    state.resources.money += gain;
    state.stats.totalResourcesSold += soldCount;
    state.stats.totalWoodSold += woodSold;
    spawnPopup(`+${formatNumber(gain)}コイン`, sellStation.x, sellStation.y - 105, "#ffe66d", 1.05);
    spawnCoinBurst(sellStation.x, sellStation.y - 40);
    flashRow(els.rows.money);
    processMissionSale(woodSold);
    pulseHaptic([20, 35, 20]);
    updateHud();
    queueSave();
  }

  function processMissionSale(amount) {
    const mission = state.mission;
    if (!mission || mission.completed || amount <= 0) {
      return;
    }
    mission.progress = Math.min(mission.target, mission.progress + amount);
    if (mission.progress >= mission.target) {
      mission.completed = true;
      const reward = mission.reward || 100;
      state.resources.money += reward;
      showToast(`ミッション達成！ +${formatNumber(reward)}コイン`);
      spawnPopup("ミッション達成！", state.player.x, state.player.y - 95, "#fff4a8", 1.05);
      window.clearTimeout(missionTimer);
      missionTimer = window.setTimeout(() => {
        if (mission.nextId) {
          state.mission = createMission(mission.nextId);
          showToast("新しいミッション！");
          updateHud();
          queueSave();
        }
      }, 1400);
    }
  }

  function openBuildMenu() {
    updateBuildMenu();
    els.buildMenu.classList.remove("is-hidden");
  }

  function closeBuildMenu() {
    els.buildMenu.classList.add("is-hidden");
  }

  function buyBuildItem(id) {
    const def = BUILDINGS.find((item) => item.id === id);
    if (!def) return;
    if (def.kind === "worker") {
      hireWorker(def);
      return;
    }
    if (isBuilt(id)) {
      showToast("建築済みです");
      return;
    }
    const prereqMessage = getPrereqMessage(def);
    if (prereqMessage) {
      showToast(prereqMessage);
      return;
    }
    const missing = getMissingCost(def.cost);
    if (missing) {
      showToast(`${missing}が足りません`);
      return;
    }
    payCost(def.cost);
    state.buildings.placed[id] = true;
    if (id === "workerHut") {
      state.buildings.workerHut = true;
    }
    applyUpgradeEffects();
    const placement = buildingPlacements[id];
    if (placement) {
      spawnPopup("建築完了！", placement.x, placement.y - 95, "#fff4a8", 1);
    }
    if (id === "mine") {
      showToast("鉱石が採れるようになりました");
    } else {
      showToast(`${def.name}を建てました`);
    }
    updateHud();
    updateBuildMenu();
    queueSave();
  }

  function hireWorker(def) {
    if (state.workers.hired >= 1) {
      showToast("作業員は雇用済みです");
      return;
    }
    const prereqMessage = getPrereqMessage(def);
    if (prereqMessage) {
      showToast(prereqMessage);
      return;
    }
    if (getResidentCount() >= getResidentMax()) {
      showToast("住民上限に達しています");
      return;
    }
    const missing = getMissingCost(def.cost);
    if (missing) {
      showToast(`${missing}が足りません`);
      return;
    }
    payCost(def.cost);
    state.workers.hired = 1;
    state.workers.woodProgress = 0;
    showToast("作業員を雇いました");
    spawnPopup("自動作業開始！", buildingPlacements.workerHut.x, buildingPlacements.workerHut.y - 95, "#e9ffb7", 0.95);
    updateHud();
    updateBuildMenu();
    queueSave();
  }

  function payCost(cost) {
    if (cost.money) {
      state.resources.money -= cost.money;
      flashRow(els.rows.money);
    }
    for (const type of RESOURCE_TYPES) {
      if (cost[type]) {
        state.resources[type] -= cost[type];
        flashRow(els.rows[type]);
      }
    }
  }

  function getMissingCost(cost) {
    if (cost.money && state.resources.money < cost.money) return "コイン";
    for (const type of RESOURCE_TYPES) {
      if (cost[type] && state.resources[type] < cost[type]) {
        return RESOURCE_INFO[type].label;
      }
    }
    return "";
  }

  function getPrereqMessage(def) {
    if (!def.prereq) return "";
    const missing = def.prereq.find((id) => !isBuilt(id));
    if (!missing) return "";
    const missingDef = BUILDINGS.find((item) => item.id === missing);
    return `${missingDef ? missingDef.name : "必要建物"}が必要です`;
  }

  function resetGame() {
    const ok = window.confirm("セーブデータをリセットしますか？");
    if (!ok) {
      return;
    }
    window.clearTimeout(missionTimer);
    localStorage.removeItem(SAVE_KEY);
    state = createDefaultSave();
    applyUpgradeEffects();
    closeBuildMenu();
    updateHud();
    showToast("リセットしました");
    queueSave();
  }

  function updateHud() {
    applyUpgradeEffects();
    els.money.textContent = formatNumber(state.resources.money);
    for (const type of RESOURCE_TYPES) {
      els[type].textContent = formatNumber(state.resources[type]);
      els[`${type}Capacity`].textContent = formatNumber(state.player.resourceCaps[type]);
    }
    els.residents.textContent = `${getResidentCount()}/${getResidentMax()}`;

    const mission = state.mission;
    els.missionTitle.textContent = mission.completed ? "ミッション達成！" : mission.label;
    els.missionStatus.textContent = `${Math.min(mission.progress, mission.target)}/${mission.target}`;
    const pct = mission.target > 0 ? (mission.progress / mission.target) * 100 : 0;
    els.missionProgress.style.width = `${clamp(pct, 0, 100)}%`;
  }

  function updateBuildMenu() {
    els.buildList.innerHTML = BUILDINGS.map(renderBuildCard).join("");
  }

  function renderBuildCard(def) {
    const built = def.kind === "worker" ? state.workers.hired >= 1 : isBuilt(def.id);
    const prereq = getPrereqMessage(def);
    const missing = getMissingCost(def.cost);
    const warn = !built && (prereq || missing);
    const label = built ? (def.kind === "worker" ? "雇用済み" : "建築済み") : (def.kind === "worker" ? "雇用" : "建築");
    const note = built ? def.effect : (prereq || (missing ? `${missing}が足りません` : def.effect));
    const assetPath = ASSET_SOURCES[def.asset] || ASSET_SOURCES.workerHut;
    return `
      <article class="upgrade-row">
        <img class="build-card-art" src="${assetPath}" alt="">
        <div class="upgrade-copy">
          <h2>${def.name}</h2>
          <p>${def.description}</p>
          <strong>${def.effect}</strong>
          <div class="cost-line">${renderCost(def.cost)}</div>
          <span class="build-note">${note}</span>
        </div>
        <button class="buy-button ${warn ? "is-warn" : ""} ${built ? "is-disabled" : ""}" data-build-id="${def.id}" type="button" ${built ? "disabled" : ""}>${label}</button>
      </article>
    `;
  }

  function renderCost(cost) {
    const parts = [];
    if (cost.money) parts.push(`<span class="cost-chip">コイン ${formatNumber(cost.money)}</span>`);
    for (const type of RESOURCE_TYPES) {
      if (cost[type]) {
        parts.push(`<span class="cost-chip">${RESOURCE_INFO[type].label} ${formatNumber(cost[type])}</span>`);
      }
    }
    return parts.join("");
  }

  function applyUpgradeEffects() {
    const caps = defaultResourceCaps();
    if (isBuilt("woodStorage")) caps.wood = 45;
    if (isBuilt("stoneYard")) caps.stone = 40;
    if (isBuilt("mine")) caps.ore = 20;
    if (isBuilt("farm")) {
      caps.fiber = 30;
      caps.food = 35;
    }
    state.player.resourceCaps = caps;
    state.player.bagCapacity = caps.wood;
    state.player.chopSpeedMultiplier = 1 + Math.min(2, Number(state.buildings.axeLevel) || 0) * 0.5;
    for (const type of RESOURCE_TYPES) {
      state.resources[type] = Math.min(state.resources[type], caps[type]);
    }
  }

  function isBuilt(id) {
    return Boolean(state.buildings && state.buildings.placed && state.buildings.placed[id]);
  }

  function isResourceUnlocked(type) {
    return type !== "ore" || isBuilt("mine");
  }

  function isResourceFull(type) {
    return state.resources[type] >= state.player.resourceCaps[type];
  }

  function getResidentCount() {
    return state.workers.hired;
  }

  function getResidentMax() {
    return isBuilt("house") ? 3 : 2;
  }

  function resumeCompletedMissionIfNeeded() {
    if (state.mission && state.mission.completed && state.mission.nextId) {
      state.mission = createMission(state.mission.nextId);
      queueSave();
    }
  }

  function draw() {
    if (!assetsReady) {
      drawLoading();
      return;
    }
    ctx.clearRect(0, 0, screen.w, screen.h);
    drawSea();
    drawIsland();
    drawWorldObjects();
    drawEffects();
  }

  function drawLoading() {
    ctx.clearRect(0, 0, screen.w, screen.h);
    const gradient = ctx.createLinearGradient(0, 0, screen.w, screen.h);
    gradient.addColorStop(0, "#14b8df");
    gradient.addColorStop(1, "#0787c8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, screen.w, screen.h);
    ctx.fillStyle = "rgba(255, 248, 217, 0.95)";
    ctx.strokeStyle = "rgba(95, 71, 31, 0.25)";
    ctx.lineWidth = 3;
    roundRect(screen.w / 2 - 88, screen.h / 2 - 24, 176, 48, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#4b351c";
    ctx.font = "900 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("読み込み中", screen.w / 2, screen.h / 2);
  }

  function drawSea() {
    ctx.fillStyle = "#12b8df";
    ctx.fillRect(0, 0, screen.w, screen.h);
  }

  function drawIsland() {
    ctx.save();
    translateCamera();
    drawImageCover(assets.islandBg, 0, 0, world.width, world.height);
    ctx.restore();
  }

  function drawWorldObjects() {
    const drawables = [];
    for (const tree of state.world.trees) {
      drawables.push({ y: tree.y + 70 * tree.size, type: "tree", item: tree });
    }
    for (const type of ["stone", "ore", "fiber", "food"]) {
      if (!isResourceUnlocked(type)) continue;
      for (const node of state.world.nodes[type]) {
        if (node.state === "alive") {
          drawables.push({ y: node.y + 40 * node.size, type: "node", resource: type, item: node });
        }
      }
    }
    for (const def of BUILDINGS) {
      if (def.kind || !isBuilt(def.id)) continue;
      const placement = buildingPlacements[def.id];
      if (placement) {
        drawables.push({ y: placement.y + 45, type: "building", item: def });
      }
    }
    drawables.push({ y: sellStation.y + 16, type: "station", item: sellStation });
    drawables.push({ y: state.player.y + 60, type: "player", item: state.player });

    drawables.sort((a, b) => a.y - b.y);
    ctx.save();
    translateCamera();
    drawSellRange();
    for (const drawable of drawables) {
      if (drawable.type === "tree") drawTree(drawable.item);
      if (drawable.type === "node") drawNode(drawable.resource, drawable.item);
      if (drawable.type === "building") drawBuilding(drawable.item);
      if (drawable.type === "station") drawSellStation(drawable.item);
      if (drawable.type === "player") drawPlayer(drawable.item);
    }
    ctx.restore();
  }

  function drawTree(tree) {
    if (tree.state === "stump") {
      drawSpriteFoot(assets.treeStump, tree.x, tree.y + 26 * tree.size, 92 * tree.size);
      return;
    }
    drawSpriteFoot(assets.treeAlive, tree.x, tree.y + 70 * tree.size, 128 * tree.size);
    if (tree.progress > 0.01) {
      drawGauge(tree.x, tree.y - 111 * tree.size, tree.progress);
    }
  }

  function drawNode(type, node) {
    const assetKey = {
      stone: "nodeStone",
      ore: "nodeOre",
      fiber: "nodeFiber",
      food: "nodeFood"
    }[type];
    const width = {
      stone: 86,
      ore: 92,
      fiber: 82,
      food: 84
    }[type] * node.size;
    drawSpriteFoot(assets[assetKey], node.x, node.y + 42 * node.size, width);
    if (node.progress > 0.01) {
      drawGauge(node.x, node.y - 70 * node.size, node.progress);
    }
  }

  function drawBuilding(def) {
    const placement = buildingPlacements[def.id];
    drawSpriteFoot(assets[placement.asset], placement.x, placement.y + 82, placement.width, {
      shadowAlpha: 0.18,
      shadowScale: 1.2
    });
  }

  function drawSellStation(station) {
    drawSpriteFoot(assets.sellStation, station.x, station.y + 96, 230);
    ctx.save();
    ctx.translate(station.x, station.y);
    ctx.fillStyle = "#fff5ca";
    ctx.font = "900 24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(75, 40, 15, 0.42)";
    ctx.lineWidth = 5;
    ctx.strokeText("売却所", 0, -51);
    ctx.fillText("売却所", 0, -51);
    ctx.restore();
  }

  function drawSellRange() {
    if (!nearSell) {
      return;
    }
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

  function drawPlayer(player) {
    const moving = Math.hypot(getInputVector().x, getInputVector().y) > 0.03;
    const bob = Math.sin(animationClock * 12) * (moving ? 2 : 0);
    ctx.save();
    ctx.translate(player.x, player.y + bob);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.setLineDash([28, 12]);
    ctx.beginPath();
    ctx.arc(0, 30, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    drawSpriteFoot(assets.player, 0, 52, 76);
    if (state.resources.wood > 0) {
      ctx.save();
      ctx.translate(-27, 11);
      ctx.rotate(-0.45);
      ctx.fillStyle = "#ad6b25";
      roundRect(-10, -12, 20, 25, 8);
      ctx.fill();
      ctx.strokeStyle = "#6d3e18";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawGauge(x, y, progress) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(43, 30, 15, 0.28)";
    roundRect(-31, -9, 62, 18, 9);
    ctx.fill();
    ctx.fillStyle = "#fff8cf";
    roundRect(-28, -6, 56, 12, 7);
    ctx.fill();
    ctx.fillStyle = "#54bf4d";
    roundRect(-26, -4, 52 * clamp(progress, 0, 1), 8, 6);
    ctx.fill();
    ctx.restore();
  }

  function drawEffects() {
    ctx.save();
    translateCamera();
    for (const particle of particles) {
      ctx.save();
      ctx.globalAlpha = particle.life;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.spin);
      ctx.fillStyle = particle.color;
      if (particle.kind === "coin") {
        ctx.beginPath();
        ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#b78218";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        roundRect(-particle.size, -particle.size * 0.45, particle.size * 2, particle.size * 0.9, 4);
        ctx.fill();
      }
      ctx.restore();
    }

    for (const popup of popups) {
      ctx.save();
      ctx.globalAlpha = popup.life;
      ctx.fillStyle = popup.color;
      ctx.strokeStyle = "rgba(70, 47, 18, 0.38)";
      ctx.lineWidth = 5;
      ctx.font = `900 ${Math.round(28 * popup.scale)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText(popup.text, popup.x, popup.y);
      ctx.fillText(popup.text, popup.x, popup.y);
      ctx.restore();
    }
    ctx.restore();
  }

  function updateEffects(dt) {
    for (let i = popups.length - 1; i >= 0; i -= 1) {
      const popup = popups[i];
      popup.age += dt;
      popup.y -= dt * 46;
      popup.life = 1 - popup.age / popup.duration;
      if (popup.life <= 0) {
        popups.splice(i, 1);
      }
    }
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.age += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 90 * dt;
      particle.spin += particle.spinSpeed * dt;
      particle.life = 1 - particle.age / particle.duration;
      if (particle.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function spawnPopup(text, x, y, color, scale) {
    popups.push({ text, x, y, color, scale, age: 0, duration: 0.95, life: 1 });
  }

  function spawnResourceBits(x, y, type) {
    const colors = {
      wood: "#b76d25",
      stone: "#c8cec6",
      ore: "#6cc9ff",
      fiber: "#8bd747",
      food: "#ef5c50"
    };
    for (let i = 0; i < 8; i += 1) {
      const angle = -Math.PI / 2 + (i - 3.5) * 0.35;
      const speed = 75 + seededRandom(i + Date.now() % 1000) * 50;
      particles.push({
        kind: type,
        color: colors[type],
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + (i % 3),
        spin: i * 0.8,
        spinSpeed: 3 - i * 0.25,
        age: 0,
        duration: 0.75,
        life: 1
      });
    }
  }

  function spawnCoinBurst(x, y) {
    for (let i = 0; i < 14; i += 1) {
      const angle = Math.PI * 2 * (i / 14);
      const speed = 90 + seededRandom(i + Date.now() % 800) * 70;
      particles.push({
        kind: "coin",
        color: "#ffd744",
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        size: 6 + (i % 4) * 0.8,
        spin: 0,
        spinSpeed: 5,
        age: 0,
        duration: 0.9,
        life: 1
      });
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
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  function forEachNode(callback) {
    if (!state || !state.world || !state.world.nodes) return;
    for (const type of ["stone", "ore", "fiber", "food"]) {
      for (const node of state.world.nodes[type] || []) {
        callback(node, type);
      }
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

  function translateCamera() {
    ctx.scale(camera.scale, camera.scale);
    ctx.translate(-camera.x, -camera.y);
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
    ctx.globalAlpha = options.shadowAlpha || 0.2;
    ctx.fillStyle = "#214516";
    ctx.beginPath();
    ctx.ellipse(x + width * 0.05, footY - height * 0.08, width * 0.32 * shadowScale, width * 0.11 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(image, drawX, drawY, width, height);
  }

  function drawImageCover(image, x, y, width, height) {
    if (!image) return;
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    if (!imageWidth || !imageHeight) return;
    const scale = Math.max(width / imageWidth, height / imageHeight);
    const sw = width / scale;
    const sh = height / scale;
    const sx = (imageWidth - sw) / 2;
    const sy = (imageHeight - sh) / 2;
    ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  }

  function getViewScale() {
    if (screen.w > screen.h) {
      return clamp(screen.h / 1500, 0.5, 0.68);
    }
    return clamp(Math.min(screen.w / 650, screen.h / 1250), 0.58, 0.84);
  }

  function clampCameraAxis(value, min, max) {
    if (min > max) {
      return (min + max) / 2;
    }
    return clamp(value, min, max);
  }

  function seededRandom(seed) {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function roundRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
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

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clampInt(value, min, max) {
    return Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
  }

  function formatNumber(value) {
    return Math.floor(value).toLocaleString("ja-JP");
  }
})();
