"use strict";
// Shop descriptions and photo associations come from the user's shopping screenshot.
const SHOP_GROUPS = [
  {
    id: "old-town",
    title: "老济州 · 东门市场与七星街一带",
    route:
      "11/23 13:30—15:00 的逛街备选。先选 1—2 家，按地图确认步行距离；不是每家都紧挨着。",
  },
  {
    id: "new-jeju",
    title: "新济州 · 保健路与住处附近",
    route:
      "11/23 15:30—17:30 回新济州后逛，衣服、杂货和小伴手礼按兴趣选，17:30 收尾。",
  },
  {
    id: "aewol",
    title: "涯月 · 西线顺路看",
    route:
      "11/22 汉潭散步时，或已决定回涯月喝咖啡时，最多加 1 家。先看位置和营业，不影响挟才与日落。",
  },
  {
    id: "east-coast",
    title: "咸德 / 月汀里 · 东线替代参考",
    route:
      "只在放弃牛岛、改走东部海岸慢游时考虑。按城山—牛岛—涉地三站出行，就不再绕去。",
  },
];
const SHOPS = [
  {
    id: "islander",
    name: "The Islander",
    group: "old-town",
    kind: "文创 · 伴手礼",
    description:
      "截图推荐的原创设计杂货店：文具、香水、护手霜与伴手礼，适合慢慢挑一两样济州小物。",
    note: "截图提到二楼绿植角落与彩色香水包装；具体商品与楼层开放以门店为准。",
    query: "더 아일랜더 제주",
    photos: ["islander"],
  },
  {
    id: "mood",
    name: "Mood.jeju",
    group: "old-town",
    kind: "贝壳器皿 · 香类 · 配饰",
    description:
      "截图中的二楼小店，重点看贝壳小件、器皿、香类和配饰。入口较小，先确认招牌再上楼。",
    note: "截图地址线索：제주시 남성로 89 2층。截图称部分小物百元人民币以内，仅作选品参考，实际看韩元标价。",
    query: "무드 제주 남성로 89",
    photos: ["mood"],
  },
  {
    id: "classic",
    name: "CLASSIC MOONGUSA",
    group: "old-town",
    kind: "复古文具",
    description: "钢笔、皮质笔记本与复古风文具，适合喜欢手写和纸品的人。",
    note: "截图称在 The Islander 附近，可先一起查地图，确认后再决定是否连逛。",
    query: "클래식문구사 제주",
    photos: [],
  },
  {
    id: "slomo",
    name: "slo-mo",
    group: "old-town",
    kind: "盘子 · 杯子 · 生活杂货",
    description:
      "以盘子、杯子和柔和配色的生活器皿为主。看好尺寸和重量，易碎品请店员包牢。",
    note: "截图位置线索为东门市场斜对角二楼；按店名核对当前入口与营业。",
    query: "슬로모 제주 소품샵",
    photos: ["slomo"],
  },
  {
    id: "ddepartment",
    name: "D&Department",
    group: "old-town",
    kind: "设计选物 · 概念店",
    description:
      "截图里的空间型选物店，可看日常用品与设计小物。预算较高时再买，也适合纯逛。",
    note: "截图提到花店、Aesop 相连的空间；不预设当天店铺组合，确认位置后单独决定是否绕去。",
    query: "디앤디파트먼트 제주",
    photos: [],
  },
  {
    id: "mandarin",
    name: "Mandarin Island",
    group: "old-town",
    kind: "济州香氛 · 伴手礼",
    description:
      "截图推荐济州主题香水，提到“橘雨”与小样套装。可先试香，等味道稳定后再决定。",
    note: "截图中的退税后人民币价格并非当前报价；以当天韩元标价、退税条件为准，液体注意行李规则。",
    query: "만다린아일랜드 제주",
    photos: [],
  },
  {
    id: "vintage",
    name: "七星街古着店",
    group: "old-town",
    kind: "古着 · 服饰",
    description:
      "以七星街、Olive Young 附近为搜索起点，按喜欢的风格串两家就好。截图可见 Everybody Vintage 招牌。",
    note: "安排在下午，不把截图中的“11 点开门”当统一营业时间。购物前看好尺码、成色与退换说明。",
    query: "제주 칠성로 빈티지 에브리바디빈티지",
    photos: ["vintage-1", "vintage-2", "vintage-3"],
  },
  {
    id: "triple",
    name: "Triple Store / Prepare",
    group: "new-jeju",
    kind: "服装 · 品牌选物",
    description:
      "截图推荐的两家品牌选物店，可看 aae、Carhartt 等风格的服装与配饰。按实际库存挑，不为了限定款专程多跑。",
    note: "截图称两家邻近；先在地图分别搜索店名，再决定步行串店。",
    query: "제주 트리플스토어 프리페어",
    photos: ["triple-1", "triple-2", "triple-3"],
  },
  {
    id: "planer",
    name: "Pláner House",
    group: "new-jeju",
    kind: "生活器皿 · 韩国小物",
    description:
      "截图中的木梁杂货空间，可挑韩国制作的小物、器皿与精致伴手礼。先看标价，再比尺寸和实用程度。",
    note: "店名按截图保留；用 Planer House / 플래너하우스 搜索并核对门面，避免同名店。",
    query: "제주 플래너하우스 소품샵",
    photos: ["planer"],
  },
  {
    id: "sumtarr",
    name: "Sumtarr",
    group: "new-jeju",
    kind: "水果蛋挞 · 小伴手礼",
    description:
      "截图推荐水果蛋挞，也提到发圈和小伴手礼。作为逛街中途的小休息，不额外加一顿正餐。",
    note: "截图写 11:30 开门，尚未核实；放在下午更从容，实际营业和售完情况看当天。",
    query: "제주 숨타르 에그타르트",
    photos: [],
  },
  {
    id: "barnnet",
    name: "The Barnnet",
    group: "aewol",
    kind: "服饰 · 济州限定选物",
    description:
      "截图中的海边木屋风格店，可看服饰与济州主题选物，喜欢门面也可顺路拍照。",
    note: "截图称店员可用中文沟通，仅作体验参考；先核对分店与位置，最多停留 20—30 分钟。",
    query: "더바넷 제주 애월",
    photos: ["barnnet"],
  },
  {
    id: "verish",
    name: "VERISH",
    group: "aewol",
    kind: "服装 · 日常款",
    description:
      "截图推荐有楼梯装饰的店面与日常服饰，感兴趣再逛，不作为西线必到点。",
    note: "区域归属按截图整理；请先核对济州具体分店地址与商品品类，再决定是否顺路。",
    query: "베리시 제주 매장",
    photos: [],
  },
  {
    id: "studio943",
    name: "943 Studio",
    group: "east-coast",
    kind: "摄影 · 文创选物",
    description: "截图中的巷子小店与文创杂货，适合喜欢摄影、独立小物的人。",
    note: "截图位置线索为咸德附近；店名较通用，搜索时加“제주 함덕”并比对门面。",
    query: "943 스튜디오 제주 함덕",
    photos: ["studio943-1", "studio943-2", "studio943-3"],
  },
  {
    id: "dalmun",
    name: "달문굿",
    group: "east-coast",
    kind: "明信片 · 饰品 · 小器物",
    description:
      "截图放在月汀里海滩后方的小杂货店，可看明信片、饰品和小器物，适合海边慢游时顺路。",
    note: "韩文店名按截图整理，尚未核实精确地址；地图无匹配时跳过，不为找店消耗行程。",
    query: "달문굿 제주 월정리 소품샵",
    photos: [],
  },
];
