import { FilmData } from "../../../public/js/film/FilmData.js";

const route = [
  [47.95, 11.43],
  [47.96, 11.44],
  [47.99, 11.46],
];
const profile = [1900, 1950, 2100, 2198, 2150];

/** Input of the film scenes for a small made-up year. */
export function filmFixture(overrides = {}) {
  const config = {
    map: { centerLat: 48.16, centerLng: 11.59 },
    intro: { kicker: "My year", lines: ["Running Munich", "Hiking the Alps"], seconds: 3.5 },
    finale: { title: "DONE!" },
    film: {
      timeZone: "Europe/Berlin",
      citySeconds: 10,
      sceneSeconds: 4.5,
      holdSeconds: 1,
      series: { label: "Hikes with the Kraxe", caption: "Kid on the back" },
      places: [
        { name: "Tegernsee", lat: 47.71, lng: 11.76 },
        { name: "Anhalter Hütte", lat: 47.31, lng: 10.6 },
        { name: "Thuringia", lat: 51.16, lng: 11.29, highlight: true },
      ],
      placesHeadline: "2 countries,",
      coldest: { name: "Ski day", date: "DEC 30", temperatureC: -14 },
      hottest: { name: "Summer run", date: "MAY 02", temperatureC: 27 },
      texts: {},
      titles: { city: "Running the city", days: "Active days", kudos: "👍", finale: "The End" },
      titleSeconds: 1.2,
      photos: {},
    },
  };
  const stats = {
    year: 2025,
    daysInYear: 365,
    hotspot: { lat: 48.1626, lng: 11.5934, count: 129, of: 135 },
    startHours: [0, 0, 0, 0, 0, 1, 2, 4, 65, 20, 27, 15, 5, 6, 6, 4, 2, 4, 0, 2, 7, 1, 0, 0],
    fastest: { name: "Jahresziel mit PR erreicht", date: "2025-11-04T07:28:25.000Z", km: 10, seconds: 2561, gain: 17 },
    longest: { name: "Urlaub heute 😉", date: "2025-07-11T07:11:39.000Z", km: 33, seconds: 10302, gain: 145, route },
    activeDays: [1, 3, 4, 5, 300, 301, 302, 303],
    streak: { days: 4, firstDay: 300 },
    kudos: 708,
    monthsKm: [132, 135, 99, 172, 87, 154, 190, 117, 209, 168, 104, 118],
    totalKm: 1684.9,
    sports: [
      { name: "Running", km: 1561 },
      { name: "Hiking", km: 123.9 },
      { name: "Cycling", km: 33.4 },
    ],
    highest: { name: "zur Anhalter Hütte & Murmeltiere", meters: 2198, profile },
    hilliest: {
      name: "Wallberg und Setzberg",
      date: "2025-09-29T07:25:58.000Z",
      km: 14.4,
      seconds: 7535,
      gain: 1172,
      profile,
      route,
    },
    elevation: { total: 17903, months: [408, 945, 358, 1765, 1436, 1279, 1830, 4705, 1824, 899, 696, 1759] },
    series: [
      { number: "57", date: "2025-04-20T08:57:56.000Z", km: 3.9, gain: 338, highlight: false },
      { number: "12", date: "2025-05-18T07:49:46.000Z", km: 9.8, gain: 621, highlight: true },
      { number: "62", date: "2025-07-25T08:00:00.000Z", km: 7.5, gain: 481, highlight: false },
    ],
    lastRun: {
      name: "Kronplatz Runde, letzter Lauf 2025",
      date: "2025-12-31T09:35:41.000Z",
      km: 10.4,
      seconds: 6121,
      gain: 907,
      kmBefore: 1674.5,
    },
    ...overrides,
  };
  const activities = [
    {
      distance: 10000,
      coordinates: [
        [48.16, 11.59],
        [48.17, 11.6],
      ],
    },
    {
      distance: 12000,
      coordinates: [
        [48.15, 11.58],
        [48.16, 11.59],
      ],
    },
  ];
  // a flat stand-in for the city map: 1 degree = 1000 px around the center
  const cityPoint = ([lat, lng]) => ({ x: 180 + (lng - 11.59) * 1000, y: 320 - (lat - 48.16) * 1000 });
  return new FilmData({ config, stats, activities, cityPoint });
}
