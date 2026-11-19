const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const context = vm.createContext({});
for (const name of ["data.js", "shops.js", "schedule.js"]) {
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", name), "utf8"),
    context,
  );
}
const {
  buildDaySchedule,
  getTripPosition,
  koreaInstant,
  koreaDateTime,
  days,
  foods,
  checklist,
} = vm.runInContext(
  "({buildDaySchedule,getTripPosition,koreaInstant,koreaDateTime,days:TRIP_DAYS,foods:FOODS,checklist:ALL_CHECKLIST_ITEMS})",
  context,
);
const fullSchedule = (options = {}) =>
  days.flatMap((day) => buildDaySchedule(day.id, options));
const at = (date, time, options) =>
  getTripPosition(koreaInstant(date, time), fullSchedule(options));

test("before departure opens the current preparation stage", () => {
  const position = at("2026-11-13", "18:00");
  assert.equal(position.phase, "before");
  assert.equal(position.dayId, "before");
  assert.equal(position.current.id, "before-bookings");
  assert.equal(at("2026-11-17", "00:00").current.id, "before-entry");
  assert.equal(at("2026-11-19", "20:00").current.id, "before-packing");
});

test("Hangzhou airport times are converted once to Korea time", () => {
  const position = getTripPosition(
    Date.parse("2026-11-20T08:55:00Z"),
    fullSchedule(),
  );
  assert.equal(position.current.id, "arrival-normal-0");
  assert.equal(koreaDateTime(position.current.start).time, "17:55");
  assert.match(position.current.localHint, /16:55/);
  assert.equal(at("2026-11-20", "20:55").current.id, "arrival-normal-1");
});

test("late-night arrival remains on arrival itinerary after midnight", () => {
  assert.equal(at("2026-11-20", "23:45").dayId, "arrival");
  const afterMidnight = at("2026-11-21", "00:20");
  assert.equal(afterMidnight.dayId, "arrival");
  assert.equal(afterMidnight.current.id, "arrival-bedtime");
  assert.equal(at("2026-11-21", "01:00").dayId, "city");
});

test("exact interval boundary moves to the next event", () => {
  assert.equal(at("2026-11-22", "08:59").current.id, "east-depart");
  assert.equal(at("2026-11-22", "09:00").current.id, "east-normal-1");
});

test("a gap is shown as a gap, never as an ongoing visit", () => {
  const gap = at("2026-11-22", "15:05");
  assert.equal(gap.current, null);
  assert.equal(gap.next.id, "east-normal-5");
});

test("lunch and dinner carry food options at their actual planned times", () => {
  const lunch = at("2026-11-22", "12:15").current;
  assert.equal(lunch.id, "east-udo-lunch");
  assert.match(lunch.mealQuery, /우도/);
  const dinner = at("2026-11-22", "18:30").current;
  assert.equal(dinner.id, "east-pork-dinner");
  assert.ok(dinner.foodIds.includes("woojin"));
  assert.ok(dinner.foodIds.includes("hayeogum"));
});

test("rain schedule replaces outdoor activities and keeps meals", () => {
  const rain = at("2026-11-22", "12:15", { mode: "rain" });
  assert.equal(rain.current.id, "east-rain-lunch");
  assert.ok(rain.current.foodIds.includes("woojin"));
  assert.ok(
    !buildDaySchedule("east", { mode: "rain" }).some(
      (event) => event.placeId === "udo",
    ),
  );
});

test("city day starts late and follows the supplied city route", () => {
  assert.equal(at("2026-11-21", "08:00").current, null);
  assert.equal(at("2026-11-21", "10:15").current.id, "city-brunch");
  assert.equal(at("2026-11-21", "11:45").current.placeId, "museum");
  assert.equal(at("2026-11-21", "13:30").current.placeId, "dongmun");
  assert.ok(at("2026-11-21", "17:45").current.foodIds.includes("heukdonga"));
});

test("city weather choice changes only the afternoon destination", () => {
  assert.equal(at("2026-11-21", "15:30").current.placeId, "tapdong");
  assert.equal(
    at("2026-11-21", "15:30", { mode: "rain" }).current.placeId,
    "underground",
  );
  const normal = buildDaySchedule("city");
  const rain = buildDaySchedule("city", { mode: "rain" });
  assert.deepEqual(
    normal.filter((e) => e.id !== "city-afternoon-choice").map((e) => e.title),
    rain.filter((e) => e.id !== "city-afternoon-choice").map((e) => e.title),
  );
});

test("return-flight completion uses Hangzhou local arrival offset", () => {
  assert.equal(at("2026-11-24", "09:44").current.id, "return-normal-3");
  const complete = at("2026-11-24", "09:45");
  assert.equal(complete.phase, "after");
  assert.equal(complete.current, null);
});

test("custom appointments join the selected date and get their own focus window", () => {
  const customEvents = [
    {
      id: "appointment-1",
      date: "2026-11-22",
      time: "12:45",
      title: "预订取餐",
      description: "带订单",
    },
  ];
  const position = at("2026-11-22", "12:50", { customEvents });
  assert.equal(position.dayId, "east");
  assert.equal(position.current.customId, "appointment-1");
  assert.equal(position.current.end - position.current.start, 30 * 60000);
  assert.equal(
    at("2026-11-22", "13:15", { customEvents }).current.id,
    "east-udo-dessert",
  );
});

test("a custom arrangement after landing can extend the last day", () => {
  const customEvents = [
    {
      id: "pickup",
      date: "2026-11-24",
      time: "10:00",
      title: "杭州接机",
      description: "",
    },
  ];
  const position = at("2026-11-24", "10:10", { customEvents });
  assert.equal(position.phase, "during");
  assert.equal(position.current.customId, "pickup");
});

test("every checklist item is assigned and all food references resolve", () => {
  const events = [...fullSchedule(), ...fullSchedule({ mode: "rain" })];
  const checkIds = new Set(events.flatMap((event) => [...event.checkIds]));
  for (const [id] of checklist)
    assert.ok(checkIds.has(id), `Unassigned checklist item: ${id}`);
  const foodIds = new Set(foods.map((food) => food.id));
  for (const event of events)
    for (const id of event.foodIds)
      assert.ok(foodIds.has(id), `Unknown food: ${id}`);
});

test("regular day schedules are ordered, have durations and never overlap", () => {
  for (const day of days)
    for (const mode of ["normal", "rain"]) {
      const events = buildDaySchedule(day.id, { mode });
      const ids = new Set();
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        assert.ok(
          Number.isFinite(event.start) && event.end > event.start,
          event.id,
        );
        assert.ok(!ids.has(event.id), `Duplicate event: ${event.id}`);
        ids.add(event.id);
        if (i)
          assert.ok(
            events[i - 1].end <= event.start,
            `Overlap: ${events[i - 1].id} / ${event.id}`,
          );
      }
    }
});

test("trip dates are city Saturday, east Sunday and west Monday", () => {
  const tripDays = days.filter((day) =>
    ["city", "east", "west"].includes(day.id),
  );
  assert.deepEqual(
    Array.from(tripDays, (day) => `${day.isoDate}:${day.id}:${day.weekday}`),
    ["2026-11-21:city:周六", "2026-11-22:east:周日", "2026-11-23:west:周一"],
  );
  assert.ok(!days.some((day) => day.id === "autumn"));
});

test("Sunday east-line meals never send travelers to closed Ollae Guksu", () => {
  for (const mode of ["normal", "rain"])
    for (const event of buildDaySchedule("east", { mode }))
      assert.ok(!event.foodIds.includes("noodles"), event.id);
});

test("last evening keeps packing and early transfer checks in every weather plan", () => {
  for (const mode of ["normal", "rain"]) {
    const evening = at("2026-11-23", "20:00", { mode }).current;
    assert.equal(evening.dayId, "west");
    assert.ok(evening.checkIds.includes("departure"));
    assert.ok(evening.checkIds.includes("checkout"));
    assert.equal(koreaDateTime(evening.end).time, "20:30");
  }
});

test("all scheduled locations, alternatives and shopping references resolve", () => {
  const { places, shops } = vm.runInContext(
    "({places:PLACES,shops:SHOPS})",
    context,
  );
  for (const mode of ["normal", "rain"])
    for (const event of fullSchedule({ mode })) {
      if (event.placeId) assert.ok(places[event.placeId], event.id);
      if (event.alternativePlaceId)
        assert.ok(places[event.alternativePlaceId], event.id);
      for (const id of event.shopIds)
        assert.ok(
          shops.some((shop) => shop.id === id),
          id,
        );
    }
});
