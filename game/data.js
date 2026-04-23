// Static data and balance constants for Строительная Империя.

export const START_CASH = { easy: 5_000_000, normal: 3_000_000, hard: 1_500_000 };
export const START_REPUTATION = 40;
export const DAY_MS_AT_1X = 2000; // one game day = 2 real seconds at 1x

export const CITIES = [
  { id: 'msk', name: 'Москва',           marketSize: 1.00, wageMult: 1.30, competition: 1.00, branchCost: 1_200_000 },
  { id: 'spb', name: 'Санкт-Петербург',  marketSize: 0.80, wageMult: 1.15, competition: 0.90, branchCost:   900_000 },
  { id: 'ekb', name: 'Екатеринбург',     marketSize: 0.55, wageMult: 0.95, competition: 0.70, branchCost:   500_000 },
  { id: 'kzn', name: 'Казань',           marketSize: 0.50, wageMult: 0.90, competition: 0.65, branchCost:   450_000 },
  { id: 'nsk', name: 'Новосибирск',      marketSize: 0.55, wageMult: 0.95, competition: 0.70, branchCost:   500_000 },
];

export const MATERIALS = [
  { id: 'concrete',  name: 'Бетон',      unit: 'м³',  basePrice:   8_000, minMult: 0.6, maxMult: 2.2 },
  { id: 'steel',     name: 'Сталь',      unit: 'т',   basePrice:  85_000, minMult: 0.6, maxMult: 2.5 },
  { id: 'brick',     name: 'Кирпич',     unit: 'тыс', basePrice:  22_000, minMult: 0.7, maxMult: 1.8 },
  { id: 'glass',     name: 'Стекло',     unit: 'м²',  basePrice:   4_500, minMult: 0.7, maxMult: 1.8 },
  { id: 'wood',      name: 'Дерево',     unit: 'м³',  basePrice:  15_000, minMult: 0.6, maxMult: 2.0 },
  { id: 'insul',     name: 'Утеплитель', unit: 'м³',  basePrice:   6_000, minMult: 0.7, maxMult: 1.7 },
];

export const TENDER_TYPES = [
  { id: 'residential', name: 'Жильё',        scale: 1.0, qualityWeight: 1.0,
    mat: { concrete: 180, steel: 15, brick: 40, glass: 120, wood: 20, insul: 60 } },
  { id: 'commercial',  name: 'Коммерция',    scale: 1.8, qualityWeight: 1.2,
    mat: { concrete: 300, steel: 45, brick: 10, glass: 400, wood: 10, insul: 80 } },
  { id: 'infra',       name: 'Инфраструктура', scale: 2.5, qualityWeight: 0.8,
    mat: { concrete: 900, steel: 150, brick: 0, glass: 0, wood: 30, insul: 0 } },
  { id: 'industrial',  name: 'Промышленность', scale: 2.2, qualityWeight: 0.9,
    mat: { concrete: 500, steel: 100, brick: 0, glass: 60, wood: 10, insul: 40 } },
];

export const EMPLOYEE_ROLES = [
  { id: 'worker',    name: 'Рабочий',      baseWage:  3_500, powerMult: 1.0, category: 'field' },
  { id: 'operator',  name: 'Оператор',     baseWage:  5_500, powerMult: 1.4, category: 'field' },
  { id: 'engineer',  name: 'Инженер',      baseWage:  7_500, powerMult: 1.6, category: 'field' },
  { id: 'foreman',   name: 'Прораб',       baseWage:  9_000, powerMult: 1.8, category: 'field' },
  { id: 'sales',     name: 'Менеджер БД',  baseWage:  6_500, powerMult: 0.0, category: 'office' },
  { id: 'accountant',name: 'Бухгалтер',    baseWage:  5_500, powerMult: 0.0, category: 'office' },
];

export const EQUIPMENT_TYPES = [
  { id: 'excavator',  name: 'Экскаватор',      buyPrice: 4_500_000, rentPerDay:  12_000, maintPerDay: 1_200, powerRating: 4 },
  { id: 'crane',      name: 'Кран',            buyPrice: 8_000_000, rentPerDay:  22_000, maintPerDay: 2_000, powerRating: 6 },
  { id: 'bulldozer',  name: 'Бульдозер',       buyPrice: 3_500_000, rentPerDay:   9_000, maintPerDay: 1_000, powerRating: 3 },
  { id: 'truck',      name: 'Самосвал',        buyPrice: 2_200_000, rentPerDay:   6_000, maintPerDay:   700, powerRating: 2 },
  { id: 'mixer',      name: 'Бетономешалка',   buyPrice: 1_500_000, rentPerDay:   4_500, maintPerDay:   500, powerRating: 2 },
  { id: 'tower',      name: 'Башенный кран',   buyPrice:12_000_000, rentPerDay:  32_000, maintPerDay: 3_000, powerRating: 8 },
];

export const RESEARCH = [
  { id: 'prefab',    name: 'Префаб-конструкции',    cost: 1_200_000, days: 30, prereq: [],          effect: { speedBonus: 0.10 }, desc: '+10% к скорости всех проектов.' },
  { id: 'bim',       name: 'BIM-моделирование',     cost: 2_000_000, days: 45, prereq: ['prefab'],  effect: { speedBonus: 0.10, qualityBonus: 0.10 }, desc: '+10% к скорости и качеству.' },
  { id: 'safety1',   name: 'Охрана труда I',        cost:   800_000, days: 20, prereq: [],          effect: { moraleBonus: 5 }, desc: '+5 к морали всех сотрудников.' },
  { id: 'safety2',   name: 'Охрана труда II',       cost: 1_800_000, days: 40, prereq: ['safety1'], effect: { moraleBonus: 10, maintDiscount: 0.10 }, desc: 'Ещё +5 к морали, −10% обслуживание техники.' },
  { id: 'green',     name: 'Зелёное строительство', cost: 1_500_000, days: 35, prereq: [],          effect: { repBonusMult: 1.25 }, desc: '+25% к росту репутации от проектов.' },
  { id: 'lean',      name: 'Бережливое производство', cost: 1_000_000, days: 28, prereq: [],        effect: { matDiscount: 0.10 }, desc: '−10% к расходу материалов.' },
  { id: 'auto',      name: 'Автоматизация',         cost: 2_400_000, days: 50, prereq: ['lean'],    effect: { speedBonus: 0.08, matDiscount: 0.05 }, desc: '+8% к скорости, −5% к материалам.' },
  { id: 'negotiate', name: 'Навыки переговоров',    cost:   900_000, days: 25, prereq: [],          effect: { bidEdge: 0.04 }, desc: '+4% к эффективности вашей ставки на тендерах.' },
  { id: 'logistics', name: 'Логистика',             cost: 1_200_000, days: 30, prereq: [],          effect: { warehouseBonus: 2000 }, desc: '+2000 единиц к вместимости склада.' },
  { id: 'tech',      name: 'Крупные формы',         cost: 3_000_000, days: 60, prereq: ['bim', 'auto'], effect: { bigContracts: true, speedBonus: 0.10 }, desc: 'Открывает крупные контракты и +10% скорости.' },
];

export const EVENTS = [
  {
    id: 'mat_shortage',
    title: 'Дефицит материалов',
    desc: 'На рынке наблюдается дефицит стали и бетона. Цены выросли.',
    weight: 1.0,
    apply: (state) => {
      state.materials.currentPrice.steel *= 1.4;
      state.materials.currentPrice.concrete *= 1.3;
    },
    choices: [
      { label: 'Переждать', effect: () => {} },
      { label: 'Срочно закупить (−1 млн ₽, +500 стали/+500 бетона)',
        effect: (state) => {
          if (state.finance.cash >= 1_000_000) {
            state.finance.cash -= 1_000_000;
            state.materials.inventory.steel += 500;
            state.materials.inventory.concrete += 500;
          }
        }
      },
    ],
  },
  {
    id: 'strike',
    title: 'Забастовка',
    desc: 'Рабочие требуют повышения зарплаты.',
    weight: 0.8,
    apply: () => {},
    choices: [
      { label: 'Отказать (−15 морали всем)',
        effect: (state) => { for (const e of state.employees) e.morale = Math.max(0, e.morale - 15); } },
      { label: 'Повысить зарплаты на 10% (стоит дороже)',
        effect: (state) => { for (const e of state.employees) { e.salary = Math.round(e.salary * 1.1); e.morale = Math.min(100, e.morale + 10); } } },
    ],
  },
  {
    id: 'weather',
    title: 'Плохая погода',
    desc: 'Шторм мешает работам на площадках.',
    weight: 1.0,
    apply: (state) => { state.flags.weatherDelayDays = 3; },
    choices: [
      { label: 'Принять задержку', effect: () => {} },
      { label: 'Ночные смены (−500 тыс ₽, ускорить в 2 раза)',
        effect: (state) => {
          if (state.finance.cash >= 500_000) {
            state.finance.cash -= 500_000;
            state.flags.weatherDelayDays = 1;
            state.flags.nightShiftBoost = 3;
          }
        }
      },
    ],
  },
  {
    id: 'big_opp',
    title: 'Крупный заказчик',
    desc: 'Выходит на рынок крупный инвестор. В ближайшее время появятся премиальные тендеры.',
    weight: 0.7,
    apply: (state) => { state.flags.premiumTendersDays = 10; },
    choices: [
      { label: 'Отлично!', effect: () => {} },
    ],
  },
  {
    id: 'inspection',
    title: 'Проверка Ростехнадзора',
    desc: 'К вам пришла внеплановая проверка.',
    weight: 0.7,
    apply: () => {},
    choices: [
      { label: 'Сотрудничать (−300 тыс ₽ штрафа)',
        effect: (state) => { state.finance.cash -= 300_000; } },
      { label: 'Устранить замечания (−700 тыс ₽, +3 репутации)',
        effect: (state) => {
          if (state.finance.cash >= 700_000) {
            state.finance.cash -= 700_000;
            state.reputation.global = Math.min(100, state.reputation.global + 3);
          }
        }
      },
    ],
  },
  {
    id: 'pr',
    title: 'Возможность PR-кампании',
    desc: 'Рекламное агентство предлагает кампанию.',
    weight: 0.8,
    apply: () => {},
    choices: [
      { label: 'Отказаться', effect: () => {} },
      { label: 'Заказать (−800 тыс ₽, +5 репутации во всех городах)',
        effect: (state) => {
          if (state.finance.cash >= 800_000) {
            state.finance.cash -= 800_000;
            state.reputation.global = Math.min(100, state.reputation.global + 5);
            for (const c of Object.keys(state.reputation.byCity)) {
              state.reputation.byCity[c] = Math.min(100, state.reputation.byCity[c] + 5);
            }
          }
        }
      },
    ],
  },
  {
    id: 'equip_break',
    title: 'Поломка техники',
    desc: 'Одна из ваших машин сломалась.',
    weight: 0.9,
    apply: (state) => {
      if (state.fleet.length === 0) return;
      const idx = Math.floor(Math.random() * state.fleet.length);
      state.fleet[idx].condition = Math.max(0, state.fleet[idx].condition - 40);
    },
    choices: [
      { label: 'Принять', effect: () => {} },
    ],
  },
  {
    id: 'talent',
    title: 'Талантливый инженер',
    desc: 'На рынке появился талантливый инженер.',
    weight: 0.8,
    apply: (state) => { state.flags.talentInMarketDays = 7; },
    choices: [
      { label: 'Смотреть резюме', effect: () => {} },
    ],
  },
];

export const AI_FIRMS = [
  { id: 'ai1', name: 'СтройГрупп',     aggressiveness: 0.55, reputation: 55 },
  { id: 'ai2', name: 'МегаСтрой',      aggressiveness: 0.65, reputation: 60 },
  { id: 'ai3', name: 'ГлавБуд',        aggressiveness: 0.45, reputation: 65 },
];

export const FIRST_NAMES = ['Алексей','Иван','Дмитрий','Сергей','Андрей','Пётр','Николай','Михаил','Владимир','Артём','Олег','Юрий','Елена','Ольга','Мария','Анна','Светлана','Татьяна','Наталья','Екатерина'];
export const LAST_NAMES  = ['Иванов','Петров','Сидоров','Смирнов','Кузнецов','Попов','Соколов','Лебедев','Козлов','Новиков','Морозов','Волков','Орлов','Семёнов','Павлов','Фёдоров','Михайлов','Беляев','Тарасов','Белов'];

export const WAREHOUSE_BASE_CAP = 5000;
export const WAREHOUSE_UPGRADE_COST = 1_500_000;
export const WAREHOUSE_UPGRADE_CAP = 3000;

export const LOAN_RATE = 0.18; // annual
export const CREDIT_LINE = 2_000_000; // emergency negative cash tolerance before game over

export const VICTORY_EQUITY = 500_000_000; // 500 млн ₽ chistyj kapital для победы
