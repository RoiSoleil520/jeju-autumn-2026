"use strict";
// Every instant uses an explicit UTC offset. Flight labels retain the source city's local time.
const PREPARATION_DAY = {
  id: "before",
  date: "行前",
  isoDate: "2026-11-13",
  weekday: "11/13—19",
  label: "准备",
  title: "出发前，把小事准备好。",
  subtitle: "预订与证件 → 入境申报 → 收货和打包",
  badge: "3 张电话卡已购买",
  summary:
    "按时间完成准备事项。清单与各时间段内的勾选共用同一份本机记录，买好不等于已装包。",
  transport:
    "先落实 20 日深夜接机和 24 日 05:15 送机，再确认 22 日东线的一日游或包车。",
  warning:
    "3 张电话卡会赠送 3 个转换插头，收到后核对并装包。所有准备和新增安排仅保存在当前浏览器。",
};
const TRIP_DAYS = [
  PREPARATION_DAY,
  ...DAYS.map((day) => ({
    ...day,
    isoDate: `2026-${day.date.replace(".", "-")}`,
  })),
];
const PACKING_IDS = [
  "coat",
  "shoes",
  "power",
  "basics",
  "toothbrush",
  "slippers",
  "comb",
  "tissues",
  "adapter",
  "towel",
  "trash-bags",
];
const ALL_CHECKLIST_ITEMS = CHECKLIST.flatMap((group) => group.items);
const DAY_CARRY = {
  before: ["护照与机票订单", "3 张电话卡及 3 个赠送转换插头", "洗漱与生活用品"],
  arrival: [
    "护照原件、往返机票、韩文住宿地址",
    "电话卡、手机、充电线与充电宝",
    "外套与洗漱包",
  ],
  east: [
    "3 人护照原件（坐船要用）",
    "防风外套、围巾、稳固帽子",
    "充电宝、水、纸巾、小垃圾袋",
  ],
  west: [
    "交通卡、少量韩元与银行卡",
    "防风外套、防滑鞋",
    "充电宝、水、纸巾、小垃圾袋",
  ],
  city: [
    "防风外套、便于穿脱的内层",
    "手机、交通卡、少量现金",
    "充电宝、水、纸巾、小垃圾袋",
  ],
  return: [
    "3 人护照、手机、钱包、机票",
    "随身充电宝与托运行李",
    "房东退房说明和司机联系方式",
  ],
};
function koreaInstant(date, time) {
  return Date.parse(`${date}T${time}:00+09:00`);
}
function koreaDateTime(instant) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const get = (type) => parts.find((part) => part.type === type).value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}
function makeScheduledEvent(dayId, id, start, end, info = {}) {
  return {
    id: `${dayId}-${id}`,
    dayId,
    start,
    end,
    title: "",
    description: "",
    category: "安排",
    placeId: null,
    foodIds: [],
    shopIds: [],
    checkIds: [],
    carry: [],
    ...info,
  };
}
function tripEvent(
  dayId,
  index,
  startTime,
  endTime,
  extra = {},
  mode = "normal",
) {
  const day = TRIP_DAYS.find((item) => item.id === dayId);
  const base = (mode === "rain" ? day.rain.events : day.events)[index];
  const [label, title, description, placeId, category] = base;
  const start = koreaInstant(day.isoDate, startTime);
  let end = koreaInstant(day.isoDate, endTime);
  if (end <= start) end += 86400000;
  return makeScheduledEvent(dayId, `${mode}-${index}`, start, end, {
    title,
    description,
    placeId,
    category,
    ...extra,
  });
}
function extraEvent(dayId, id, startTime, endTime, info) {
  const date = TRIP_DAYS.find((day) => day.id === dayId).isoDate;
  return makeScheduledEvent(
    dayId,
    id,
    koreaInstant(date, startTime),
    koreaInstant(date, endTime),
    info,
  );
}
function prepareEvents() {
  return [
    makeScheduledEvent(
      "before",
      "bookings",
      koreaInstant("2026-11-13", "00:00"),
      koreaInstant("2026-11-17", "00:00"),
      {
        label: "11/13—16",
        title: "先落实证件、住宿与接送",
        category: "行前准备",
        description:
          "核对 3 人护照和机票，联系房东拿到深夜入住与清晨退房说明，落实东线出行及两次机场接送。",
        checkIds: ["passport", "stay", "tour", "car", "baggage"],
      },
    ),
    makeScheduledEvent(
      "before",
      "entry",
      koreaInstant("2026-11-17", "00:00"),
      koreaInstant("2026-11-19", "20:00"),
      {
        label: "11/17—19",
        title: "入境申报、电话卡与天气复核",
        category: "行前准备",
        description:
          "在这个准备阶段内完成即可，无需凌晨操作。进入抵达前 3 天的官方申报窗口后按适用要求填写。3 张电话卡已买，核对收货、有效期和激活方式，并保存地图与订单。",
        checkIds: ["entry", "documents", "data", "money", "weather"],
      },
    ),
    makeScheduledEvent(
      "before",
      "packing",
      koreaInstant("2026-11-19", "20:00"),
      koreaInstant("2026-11-20", "00:00"),
      {
        label: "11/19 20:00 起",
        title: "出发前夜：把行李真正装好",
        category: "打包",
        description:
          "衣物、洗漱与生活用品一次装包。电话卡赠送的 3 个转换插头也放进行李；确认明日到机场的交通。",
        checkIds: PACKING_IDS,
      },
    ),
  ];
}
function cityEvents(isRain = false) {
  const add = (id, start, end, info) =>
    extraEvent("city", id, start, end, info);
  return [
    add("slow-start", "09:30", "10:00", {
      title: "睡饱再出门，不赶早集合",
      description:
        "昨晚较晚入住，让妈妈多休息。先喝水、洗漱，饿了可在住处简单垫一点，约 10:00 再吃早午餐。",
      category: "出门准备",
      carry: DAY_CARRY.city,
      checkIds: ["weather", "money"],
    }),
    add("brunch", "10:00", "11:00", {
      title: "猪肉汤面当早午餐",
      description:
        "Ollae Guksu（올래국수）每人一碗热汤面。今天周六，官方列 08:20—15:00；如果候位超过约 20 分钟，就改住处附近汤饭，别为一家店站太久。",
      category: "早午餐",
      foodIds: ["noodles", "woojin"],
    }),
    add("to-museum", "11:00", "11:30", {
      title: "分段打车去国立济州博物馆",
      description:
        "预留约 30 分钟给叫车、上下车和交通，以实际住处门牌与路况为准；这是交通缓冲，不是承诺车程。",
      category: "交通",
      placeId: "museum",
    }),
    add("museum", "11:30", "13:00", {
      title: "国立济州博物馆，慢慢看 1—1.5 小时",
      description:
        "看看济州历史、石文化和当地生活。馆方列 09:00—18:00、周一闭馆，常设展免费，收费特别展另计。今天周六；妈妈累了或不感兴趣就跳过，改附近坐坐。",
      category: "室内",
      placeId: "museum",
    }),
    add("to-market", "13:00", "13:20", {
      title: "打车去东门传统市场",
      description:
        "预留约 20 分钟衔接，用地图确认上下车入口；到得晚就缩短逛市场的时间，不追赶时间表。",
      category: "交通",
      placeId: "dongmun",
    }),
    add("market", "13:20", "15:00", {
      title: "东门市场：小吃、柑橘与伴手礼",
      description:
        "三人买几样分着尝，不必刚吃完面又吃撑。柑橘在当地少量吃，包装好的柑橘巧克力可选伴手礼；海鲜和熟食先确认总价。市场并非全程密闭，小吃不一定有座位，妈妈累了就进咖啡馆。小店挑 1 家顺路看即可。",
      category: "逛吃",
      placeId: "dongmun",
      foodIds: ["juice"],
      shopIds: ["islander", "classic", "slomo", "vintage"],
    }),
    add("afternoon-choice", "15:00", "16:30", {
      title: isRain
        ? "下雨或想购物：中央地下商街"
        : "风小再看海；下雨就选地下商街",
      description: isRain
        ? "取消塔洞海边。中央地下商街在东门市场、中央路一带，按地图走短距离，逛衣服和小店；店铺各自营业。雨大或妈妈累了，就找有座位的咖啡馆，不再串街找店。"
        : "二选一：雨小、风不大时去塔洞广场看看海、喝咖啡，走累就回室内；下雨或更想购物，就改中央地下商街。不要两处都赶，也不用再绕去其他远处小店。",
      category: "天气二选一",
      placeId: isRain ? "underground" : "tapdong",
      alternativePlaceId: isRain ? null : "underground",
    }),
    add("back-to-yeondong", "16:30", "17:30", {
      title: "回莲洞 / 老衡洞，留一点休息缓冲",
      description:
        "从老济州分段打车回住处附近，路况与候车按当天为准。提前到就先休息，不额外加景点。",
      category: "交通与休息",
      placeId: "stay",
    }),
    add("dinner", "17:30", "19:00", {
      title: "住处附近晚餐：黑猪肉或热汤",
      description:
        "黑豚家济州本店是新截图的候选，Hayeogum 可替换；想清淡就吃脊骨汤。三人先少量点，确认克重和总价，候位久就换店，不要求每天都吃烤肉。",
      category: "晚餐",
      placeId: "stay",
      foodIds: ["heukdonga", "hayeogum", "gamjatang"],
    }),
    add("optional-nearby-shops", "19:00", "19:30", {
      title: "有体力再逛保健路；累了直接回民宿",
      description:
        "这是可取消的短逛，不是必做。新济州小店按营业与位置挑 1 家，未开门就跳过；不再折返老济州。",
      category: "可选购物",
      placeId: "nuwemaru",
      shopIds: ["triple", "planer", "sumtarr"],
    }),
    add("prepare-east", "19:30", "20:00", {
      title: "确认明日东线：集合、船况、护照",
      description:
        "22 日约 07:30 集合，今晚核对实际接车点、渡轮与退改安排。买好便利店早餐，3 人护照原件、防风外套、充电宝放随身包，手机充电后早点睡。",
      category: "明日准备",
      checkIds: ["tour", "weather", "power"],
      carry: DAY_CARRY.east,
    }),
  ];
}

function normalEvents(dayId) {
  if (dayId === "before") return prepareEvents();
  const add = (id, start, end, info) => extraEvent(dayId, id, start, end, info);
  const base = (index, start, end, info) =>
    tripEvent(dayId, index, start, end, info);
  if (dayId === "arrival")
    return [
      add("final-pack", "09:00", "10:00", {
        title: "出发当天，再查一次行李",
        description:
          "洗漱后把牙刷牙膏、梳子、拖鞋、浴巾或洗脸巾放回洗漱包。确认 3 张电话卡和 3 个转换插头已装包。",
        category: "准备",
        checkIds: ["documents", "data", ...PACKING_IDS],
        carry: DAY_CARRY.arrival,
      }),
      base(0, "17:55", "18:45", {
        localHint: "杭州当地 16:55；此处已换算为济州时间",
        checkIds: ["passport", "baggage", "documents"],
      }),
      add("airport-dinner", "18:45", "19:30", {
        title: "在杭州机场吃晚餐",
        description:
          "这班机截图显示无餐食，安检后按登机牌时间就近吃。下面的济州餐厅不适用于杭州机场，今晚不为落地宵夜延后休息。",
        category: "晚餐",
      }),
      add("boarding", "19:30", "20:55", {
        title: "安检后候机，按登机牌登机",
        description:
          "核对登机口和航班动态，护照与手机放随身包。20:55 是济州时间，对应杭州 19:55。",
        category: "机场",
        carry: ["护照、手机、登机牌", "充电宝按航司要求随身携带"],
      }),
      base(1, "20:55", "22:30", {
        localHint: "杭州 19:55 起飞 → 济州 22:30 抵达",
      }),
      base(2, "22:30", "23:30", {
        carry: ["韩文住宿地址、房东电话", "接机司机联系方式"],
      }),
      base(3, "23:30", "00:10", {
        foodIds: ["gamjatang", "bhc"],
        foodNote:
          "仅在已确认营业、仍接单且确实饿时选；便利店也可以。先完成入住，今晚不保证店铺可用。",
      }),
      makeScheduledEvent(
        "arrival",
        "bedtime",
        koreaInstant("2026-11-21", "00:10"),
        koreaInstant("2026-11-21", "00:40"),
        {
          title: "入住、充电后休息，明天市区晚起",
          description:
            "洗漱、给手机充电后休息。明天 21 日先市区慢游，约 10:00 再吃早午餐，不设置东线 07:30 集合闹钟；22 日东线事项在明晚确认。",
          category: "休息",
          checkIds: ["weather"],
          carry: ["牙刷牙膏、拖鞋、浴巾或洗脸巾", "转换插头和充电线"],
        },
      ),
    ];
  if (dayId === "city") return cityEvents();
  if (dayId === "east")
    return [
      base(0, "07:00", "07:25", {
        title: "简单早餐，查好出门包",
        foodIds: ["storecoffee"],
        carry: DAY_CARRY.east,
        checkIds: ["tour", "weather"],
      }),
      add("depart", "07:30", "09:00", {
        title: "集合，乘车去城山",
        description:
          "按服务方确认的上车点集合。新济州至城山按约 80—100 分钟规划，临时堵车就减少后续停留，不压缩回船余量。",
        category: "交通",
        placeId: "peak",
      }),
      base(1, "09:00", "10:30"),
      base(2, "10:30", "11:20", {
        carry: ["3 人护照原件", "先确认离岛码头与回程班次"],
      }),
      base(3, "11:20", "12:00", {
        title: "牛岛先看一处海滩",
        description:
          "西滨白沙或下古水洞选一处，使用岛上观光巴士配步行。大风就取消骑行，不追求环岛。",
      }),
      add("udo-lunch", "12:00", "13:00", {
        title: "牛岛午餐：就近吃一份热食",
        description:
          "选海鲜面、鲍鱼粥等热餐，先看标价和上菜时间。不为餐厅长队影响 14:00 回码头。",
        category: "午餐",
        placeId: "udo",
        mealQuery: "우도 해물라면 전복죽",
      }),
      add("udo-dessert", "13:00", "14:00", {
        title: "海滩稍坐，花生甜品少量尝鲜",
        description:
          "在下古水洞附近时可选 Blanc Rocher，三人分一份就好；排队长或交通衔接不顺就跳过。14:00 开始返码头。",
        category: "咖啡甜品",
        placeId: "udo",
        foodIds: ["blanc"],
      }),
      base(4, "14:00", "15:00"),
      base(5, "15:20", "16:20"),
      base(6, "16:20", "18:10", {
        title: "回新济州",
        description:
          "车程按 80—110 分钟留余量。回到市区后再吃晚餐，遇堵车不保证 18:10 准时到达。",
        category: "交通",
        placeId: "stay",
      }),
      add("pork-dinner", "18:15", "19:30", {
        title: "东线回城晚餐，热汤或烤肉选一家",
        description:
          "21 日若已吃烤肉，今天可换热汤、猪蹄或辣炒小章鱼；仍想吃烤肉也只选一家。候位超过 30 分钟就换店，下面可查看地图。",
        category: "晚餐",
        foodIds: [
          "woojin",
          "octopus",
          "baro",
          "hayeogum",
          "sukseongdo",
          "dotdam",
          "donsadon",
        ],
      }),
      add("next-day", "20:30", "21:00", {
        title: "回住处，准备明日西线",
        description:
          "查明日西线天气和回城用车，预收返程衣物、纪念品与行李。买好早餐、给设备充电；明天看完日落回城后只留最后打包，别到最后一晚才找送机车。",
        category: "明日准备",
        checkIds: ["weather", "money", "power", "departure"],
      }),
    ];
  if (dayId === "west")
    return [
      add("pre-pack", "07:45", "08:15", {
        title: "出门前预收行李，确认回城与送机",
        description:
          "今天是最后一个游玩日。把不再用的衣物、伴手礼先装箱；留出今晚与明早的洗漱用品，确认 24 日 05:15 接车和今晚海边回城车辆。",
        category: "返程准备",
        carry: DAY_CARRY.return,
      }),
      add("breakfast", "08:15", "08:50", {
        title: "早餐与西线出门准备",
        description:
          "今天周一，仍以便利店饭团、三明治和热饮作为灵活早餐。先查天气与西线回程车辆；不在最后一天为热门早餐排长队。",
        category: "早餐",
        foodIds: ["storecoffee"],
        carry: DAY_CARRY.west,
        checkIds: ["weather", "money"],
      }),
      base(0, "09:00", "10:15"),
      base(1, "10:15", "11:30", {
        shopIds: ["barnnet", "verish"],
      }),
      base(2, "11:30", "12:30", { foodIds: ["fish"] }),
      base(3, "12:30", "13:20"),
      base(4, "13:20", "14:45"),
      base(5, "14:45", "16:00", {
        title: "确定咖啡落脚点，再决定是否折返",
        description:
          "Team Blow 在涯月；休止符在挟才。留在挟才就省掉返回涯月的车程；SLOWBOAT 在下贵一带，需要另算交通，不为打卡多跑一家。",
      }),
      base(6, "16:15", "17:35", {
        foodIds: ["teamblow", "comma", "slowboat"],
        foodNote:
          "三家只选一家。选择挟才或下贵的店时，相应调整上一段移动；先确认营业与座位，不保证晚霞。",
      }),
      add("return-to-city", "17:35", "19:00", {
        title: "结束海边活动，预约车辆回新济州",
        description:
          "约 17:35 启程，给候车与回城留到 19:00 的规划余量。涯月与挟才的返程距离不同，以实际路况为准；优先提前约车。迟到就简化晚餐，不压缩 19:40—20:30 打包。",
        category: "返程交通",
        placeId: "stay",
      }),
      base(7, "19:00", "19:40", {
        foodIds: ["baro", "woojin", "bhc"],
        description:
          "回新济州就近吃热汤、猪蹄或炸鸡，先少量点。排队长就改外带或便利店；19:40 开始最后打包，不为餐厅延长行程。",
      }),
      add("next-day", "19:40", "20:30", {
        title: "打包早睡，确认明早 05:15 接车",
        description:
          "买好明早早餐，检查司机、入口、行李件数和退房步骤。护照、手机、钱包放随身包，设置两组 04:45 闹钟，20:30 前完成行李收尾。",
        category: "返程准备",
        checkIds: ["departure", "checkout"],
        carry: DAY_CARRY.return,
      }),
    ];

  return [
    base(0, "04:45", "05:15", {
      checkIds: ["departure", "checkout"],
      carry: DAY_CARRY.return,
    }),
    base(1, "05:15", "05:40"),
    base(2, "05:40", "07:50"),
    base(3, "07:50", "09:45", {
      localHint: "济州 07:50 起飞 → 杭州当地 08:45 抵达；相当于济州时间 09:45",
    }),
  ];
}
function rainEvents(dayId) {
  if (dayId === "city") return cityEvents(true);
  const base = (index, start, end, extra) =>
    tripEvent(dayId, index, start, end, extra, "rain");
  const add = (id, start, end, info) =>
    extraEvent(dayId, `rain-${id}`, start, end, info);
  if (dayId === "east")
    return [
      add("breakfast", "08:00", "09:00", {
        title: "先吃早餐，再核对停航与开放信息",
        description:
          "今天不冒险乘船。早餐就近解决，再按港口和景区信息决定是否出门；大风雨时留市区。",
        category: "早餐",
        foodIds: ["storecoffee"],
        carry: DAY_CARRY.east,
        checkIds: ["weather", "tour"],
      }),
      base(0, "09:00", "09:30"),
      base(1, "10:00", "12:00"),
      add("lunch", "12:00", "13:00", {
        title: "市区吃一顿热午餐",
        description:
          "今天周日，Ollae Guksu 休息；选宇进醒酒汤或附近脊骨汤，少排队、就近吃。",
        category: "午餐",
        foodIds: ["woojin", "gamjatang"],
      }),
      base(2, "13:30", "17:30"),
      add("dinner", "18:00", "19:00", {
        title: "住处附近晚餐",
        description: "按风雨与营业情况选择，不再跨岛找餐厅。",
        category: "晚餐",
        foodIds: ["hayeogum", "baro", "bhc"],
      }),
    ];
  if (dayId === "west")
    return [
      add("breakfast", "08:30", "09:00", {
        title: "热早餐，检查天气与往返车",
        description:
          "今天周一国立济州博物馆闭馆。确认 ARTE 开放、道路与返程用车；恶劣天气就留新济州，不另加远处景点。",
        category: "早餐",
        foodIds: ["storecoffee"],
        checkIds: ["weather"],
        carry: DAY_CARRY.west,
      }),
      base(0, "09:30", "10:30"),
      base(1, "10:30", "12:30"),
      add("lunch", "12:30", "13:30", {
        title: "午餐吃热食",
        description:
          "如果已经到涯月内陆，在返程方向就近吃海鲜面或鲍鱼粥；不为网红店绕路。",
        category: "午餐",
        foodIds: ["fish"],
      }),
      base(2, "14:00", "17:00"),
      add("dinner", "18:00", "19:00", {
        title: "回新济州晚餐",
        description: "热汤、猪蹄或炸鸡选一种，早回住处。",
        category: "晚餐",
        foodIds: ["woojin", "baro", "bhc"],
      }),
      add("pack", "19:40", "20:30", {
        title: "最后打包，确认 05:15 接车",
        description:
          "晚餐后不再出门。核对护照、行李、退房与司机，设置两组 04:45 闹钟，20:30 前收尾。",
        category: "返程准备",
        checkIds: ["departure", "checkout"],
        carry: DAY_CARRY.return,
      }),
    ];
  return normalEvents(dayId);
}
function buildDaySchedule(dayId, { mode = "normal", customEvents = [] } = {}) {
  const events =
    mode === "rain" && ["city", "east", "west"].includes(dayId)
      ? rainEvents(dayId)
      : normalEvents(dayId);
  for (const item of customEvents) {
    const itemDay =
      item.date < "2026-11-20"
        ? "before"
        : TRIP_DAYS.find((day) => day.isoDate === item.date)?.id;
    if (itemDay !== dayId) continue;
    const start = koreaInstant(item.date, item.time);
    if (!Number.isFinite(start)) continue;
    events.push(
      makeScheduledEvent(
        dayId,
        `custom-${item.id}`,
        start,
        start + 30 * 60000,
        {
          title: item.title,
          description: item.description,
          category: "自定安排",
          customId: item.id,
        },
      ),
    );
  }
  return events.sort((a, b) => a.start - b.start);
}
function getTripPosition(instant, events) {
  const ordered = [...events].sort((a, b) => a.start - b.start);
  const current =
    ordered
      .filter((event) => event.start <= instant && instant < event.end)
      .at(-1) || null;
  const next = ordered.find((event) => event.start > instant) || null;
  const firstTrip = koreaInstant("2026-11-20", "00:00");
  const tripEnd = Math.max(
    koreaInstant("2026-11-24", "09:45"),
    ...ordered.filter((event) => event.customId).map((event) => event.end),
  );
  const date = koreaDateTime(instant).date;
  const phase =
    instant < firstTrip ? "before" : instant >= tripEnd ? "after" : "during";
  const dayId =
    current?.dayId ||
    (phase === "before"
      ? "before"
      : TRIP_DAYS.find((day) => day.isoDate === date)?.id) ||
    "return";
  return {
    phase,
    dayId,
    current: phase === "after" ? null : current,
    next: phase === "after" ? null : next,
  };
}
