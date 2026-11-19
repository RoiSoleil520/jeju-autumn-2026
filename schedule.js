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
        title: "确认订单与接送",
        category: "行前准备",
        description:
          "核对 3 人护照、机票和住宿，确认深夜入住、清晨退房、东线用车及机场接送。",
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
        title: "申报入境 · 核对电话卡",
        category: "行前准备",
        description:
          "按适用要求完成官方入境申报（抵达前 3 天开放）。核对电话卡有效期与激活方式，离线保存订单和地图。",
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
        title: "装好行李",
        category: "打包",
        description:
          "装好衣物、洗漱用品、电话卡和 3 个赠送插头，确认明日去机场的交通。",
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
      title: "睡饱再出门",
      description: "昨晚到得晚，让妈妈睡饱。饿了先垫一点，约 10:00 吃早午餐。",
      category: "出门准备",
      carry: DAY_CARRY.city,
      checkIds: ["weather", "money"],
    }),
    add("brunch", "10:00", "11:00", {
      title: "猪肉汤面当早午餐",
      description:
        "Ollae 每人一碗热汤面。周六 08:20—15:00；候位超过 20 分钟就换附近汤饭。",
      category: "早午餐",
      foodIds: ["noodles", "woojin"],
    }),
    add("to-museum", "11:00", "11:30", {
      title: "打车去博物馆",
      description: "打车去博物馆，预留约 30 分钟，含叫车和上下车。实际看路况。",
      category: "交通",
      placeId: "museum",
    }),
    add("museum", "11:30", "13:00", {
      title: "国立济州博物馆",
      description:
        "看济州历史与石文化，逛 1—1.5 小时。09:00—18:00，常设展免费；周一闭馆。累了可跳过。",
      category: "室内",
      placeId: "museum",
    }),
    add("to-market", "13:00", "13:20", {
      title: "打车去东门市场",
      description: "打车去东门市场，预留约 20 分钟。到得晚就少逛一会儿。",
      category: "交通",
      placeId: "dongmun",
    }),
    add("market", "13:20", "15:00", {
      title: "东门市场逛吃",
      description:
        "小吃三人分着尝，海鲜先问总价；柑橘就地吃，巧克力可作伴手礼。市场不全遮雨、未必有座位，累了进咖啡馆。",
      category: "逛吃",
      placeId: "dongmun",
      foodIds: ["juice"],
      shopIds: ["islander", "classic", "slomo", "vintage"],
    }),
    add("afternoon-choice", "15:00", "16:30", {
      title: isRain ? "中央地下商街" : "塔洞看海 / 地下商街",
      description: isRain
        ? "取消海边，去东门市场附近的中央地下商街。雨大或累了，就找咖啡馆坐下。"
        : "风小去塔洞看海、喝咖啡；下雨改中央地下商街。两处选一处，累了就坐下休息。",
      category: "天气二选一",
      placeId: isRain ? "underground" : "tapdong",
      alternativePlaceId: isRain ? null : "underground",
    }),
    add("back-to-yeondong", "16:30", "17:30", {
      title: "回住处附近休息",
      description: "打车回莲洞 / 老衡洞，提前到就休息，不加景点。",
      category: "交通与休息",
      placeId: "stay",
    }),
    add("dinner", "17:30", "19:00", {
      title: "黑猪肉 / 热汤晚餐",
      description:
        "黑豚家、Hayeogum 二选一；想清淡就吃脊骨汤。先确认克重和总价，候位久就换店。",
      category: "晚餐",
      placeId: "stay",
      foodIds: ["heukdonga", "hayeogum", "gamjatang"],
    }),
    add("optional-nearby-shops", "19:00", "19:30", {
      title: "保健路短逛 · 可跳过",
      description: "还有体力就顺路逛 1 家。没开门或累了，直接回民宿。",
      category: "可选购物",
      placeId: "nuwemaru",
      shopIds: ["triple", "planer", "sumtarr"],
    }),
    add("prepare-east", "19:30", "20:00", {
      title: "准备明日东线",
      description:
        "确认明日约 07:30 集合点、船况和停航退改。买好早餐，3 人护照原件放随身包，充电早睡。",
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
        title: "出发前再查行李",
        description:
          "洗漱后收好牙刷牙膏、梳子、拖鞋和浴巾。再查 3 张电话卡、3 个转换插头。",
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
          "航班无餐食，安检后就近吃，按登机牌时间候机。落地太晚不再专程找宵夜。",
        category: "晚餐",
      }),
      add("boarding", "19:30", "20:55", {
        title: "候机与登机",
        description:
          "核对登机口，护照、手机放随身包。此处 20:55 对应杭州 19:55。",
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
          title: "入住后洗漱休息",
          description:
            "洗漱、充电后休息。明天市区慢游，约 10:00 吃早午餐；22 日才是东线早集合。",
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
          "按确认的上车点集合，车程估约 80—100 分钟。堵车就减少停留，留足返船时间。",
        category: "交通",
        placeId: "peak",
      }),
      base(1, "09:00", "10:30"),
      base(2, "10:30", "11:20", {
        carry: ["3 人护照原件", "先确认离岛码头与回程班次"],
      }),
      base(3, "11:20", "12:00", {
        title: "牛岛看海",
        description:
          "西滨白沙、下古水洞选一处，坐岛上观光巴士配步行。大风不骑车，不赶环岛。",
      }),
      add("udo-lunch", "12:00", "13:00", {
        title: "牛岛热午餐",
        description:
          "就近吃海鲜面或鲍鱼粥，先看价格。不排长队，14:00 开始回码头。",
        category: "午餐",
        placeId: "udo",
        mealQuery: "우도 해물라면 전복죽",
      }),
      add("udo-dessert", "13:00", "14:00", {
        title: "花生甜品 · 可跳过",
        description:
          "顺路去 Blanc Rocher 分一份花生甜品；排队就跳过，14:00 回码头。",
        category: "咖啡甜品",
        placeId: "udo",
        foodIds: ["blanc"],
      }),
      base(4, "14:00", "15:00"),
      base(5, "15:20", "16:20"),
      base(6, "16:20", "18:10", {
        title: "回新济州",
        description:
          "车程估约 80—110 分钟，回市区再吃晚餐。堵车可能晚于 18:10 抵达。",
        category: "交通",
        placeId: "stay",
      }),
      add("pork-dinner", "18:15", "19:30", {
        title: "回城晚餐",
        description: "热汤、猪蹄、小章鱼或烤肉选一家；候位超过 30 分钟就换店。",
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
          "查西线天气与回城用车，先收衣物和伴手礼。买早餐、充电，确认送机车。",
        category: "明日准备",
        checkIds: ["weather", "money", "power", "departure"],
      }),
    ];
  if (dayId === "west")
    return [
      add("pre-pack", "07:45", "08:15", {
        title: "预收行李 · 确认车辆",
        description:
          "先装不再用的衣物和伴手礼，留出洗漱包。确认今晚回城车、24 日 05:15 送机车。",
        category: "返程准备",
        carry: DAY_CARRY.return,
      }),
      add("breakfast", "08:15", "08:50", {
        title: "早餐与出门准备",
        description:
          "便利店饭团、三明治配热饮。查天气和回程车，不排热门早餐长队。",
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
        title: "选一家海景咖啡馆",
        description:
          "Team Blow 在涯月，休止符在挟才；留挟才可省折返。SLOWBOAT 在下贵，需另算车程。只选一家。",
      }),
      base(6, "16:15", "17:35", {
        foodIds: ["teamblow", "comma", "slowboat"],
        foodNote:
          "三家只选一家。选择挟才或下贵的店时，相应调整上一段移动；先确认营业与座位，不保证晚霞。",
      }),
      add("return-to-city", "17:35", "19:00", {
        title: "乘车回新济州",
        description:
          "约 17:35 出发，预留到 19:00 回城。提前约车；晚到就简化晚餐，保留 19:40—20:30 打包。",
        category: "返程交通",
        placeId: "stay",
      }),
      base(7, "19:00", "19:40", {
        foodIds: ["baro", "woojin", "bhc"],
        description: "就近吃热汤、猪蹄或炸鸡。排队就外带，19:40 开始打包。",
      }),
      add("next-day", "19:40", "20:30", {
        title: "打包 · 早睡",
        description:
          "20:30 前收好行李、买早餐，确认退房和司机。护照、手机、钱包随身，设两组 04:45 闹钟。",
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
