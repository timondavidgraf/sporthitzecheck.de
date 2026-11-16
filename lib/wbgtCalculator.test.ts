import { describe, expect, it } from "vitest";
import {
  buildCacheKey,
  calculateWBGTForecast,
  findExactHourIndex,
  getColorCode,
  globeDirectRadiation,
  SOLAR_REFERENCE_SIN,
  hasCompleteHours,
  MAX_DISPLAY_HOURS,
  NWB_CONST,
  NWB_DEPRESSION_COEF,
  NWB_SOLAR_COEF,
  NWB_WIND_COEF,
  sessionHourStamps,
  shiftStampByDays,
  summarizeSession,
  weatherRequestFor,
  WATERING_COOLING,
  WIND_10M_TO_2M,
  windAt2m,
  type ForecastRequest,
  type WeatherApiResponse,
} from "./wbgtCalculator";

/** 48 Stunden ab dem 12.08.2026, 00:00 – überall dasselbe Wetter, außer `patch`. */
function weather(
  patch: Partial<Record<keyof WeatherApiResponse["hourly"], (i: number) => number>> = {}
): WeatherApiResponse {
  const hours = 48;
  const time = Array.from({ length: hours }, (_, i) => {
    const day = 12 + Math.floor(i / 24);
    return `2026-08-${day}T${String(i % 24).padStart(2, "0")}:00`;
  });
  const series = (key: keyof WeatherApiResponse["hourly"], fallback: number) =>
    time.map((_, i) => patch[key]?.(i) ?? fallback);

  return {
    latitude: 48.5,
    longitude: 8.4,
    timezone: "Europe/Berlin",
    hourly: {
      time,
      temperature_2m: series("temperature_2m", 30),
      relative_humidity_2m: series("relative_humidity_2m", 40),
      wind_speed_10m: series("wind_speed_10m", 2),
      direct_radiation_instant: series("direct_radiation_instant", 700),
      diffuse_radiation_instant: series("diffuse_radiation_instant", 150),
    },
  };
}

const BASE: ForecastRequest = {
  sport: "football",
  surface: "grass",
  shadow: "none",
  watered: false,
  ageGroup: "adult",
  performanceLevel: "elite",
  intensity: "normal",
  sessionFromIndex: 14,
  sessionToIndex: 15,
};

describe("Physik", () => {
  it("rechnet Wind von 10 m auf 2 m nach FAO-56 um", () => {
    expect(WIND_10M_TO_2M).toBeCloseTo(0.748, 3);
    expect(windAt2m(4)).toBeCloseTo(2.99, 2);
    expect(windAt2m(-1)).toBe(0);
  });

  it("trifft den Referenzwert von Stull (2011): 20 °C, 50 % → Tw 13,7 °C", () => {
    const data = weather({ temperature_2m: () => 20, relative_humidity_2m: () => 50 });
    const [hour] = calculateWBGTForecast(data, { ...BASE, contextHours: 0 });
    expect(hour.breakdown.wetBulb).toBeCloseTo(13.7, 1);
  });

  it("nutzt die NWS-Regression für die natürliche Feuchtkugel", () => {
    const [hour] = calculateWBGTForecast(weather(), { ...BASE, contextHours: 0 });
    const b = hour.breakdown;
    const expected =
      b.wetBulb +
      NWB_SOLAR_COEF * b.globalUnshaded -
      NWB_WIND_COEF * b.wind2m +
      NWB_DEPRESSION_COEF * (b.temperature - b.wetBulb) +
      NWB_CONST;
    expect(b.naturalWetBulbUnshaded).toBeCloseTo(expected, 6);
    // 30 °C, 40 %, volle Sonne: plausibler Bereich für den WBGT
    expect(hour.wbgtValue).toBeGreaterThan(26.5);
    expect(hour.wbgtValue).toBeLessThan(28.5);
  });

  it("drückt die natürliche Feuchtkugel nie unter die psychrometrische", () => {
    const data = weather({
      wind_speed_10m: () => 20,
      direct_radiation_instant: () => 0,
      diffuse_radiation_instant: () => 0,
      relative_humidity_2m: () => 95,
    });
    const [hour] = calculateWBGTForecast(data, { ...BASE, contextHours: 0 });
    expect(hour.breakdown.naturalWetBulbUnshaded).toBeGreaterThanOrEqual(hour.breakdown.wetBulb);
  });

  it("senkt den WBGT durch Beschattung", () => {
    const sun = calculateWBGTForecast(weather(), { ...BASE, contextHours: 0 })[0];
    const shade = calculateWBGTForecast(weather(), { ...BASE, shadow: "full", contextHours: 0 })[0];
    expect(shade.wbgtValue).toBeLessThan(sun.wbgtValue);
  });

  it("lässt die Aufschlüsselung exakt aufgehen", () => {
    const hours = calculateWBGTForecast(weather(), {
      ...BASE,
      sport: "tennis",
      surface: "hardcourt",
      shadow: "partial",
      watered: true,
    });
    for (const h of hours) {
      const b = h.breakdown;
      const sum = b.baseWbgt + b.shadeRadiationAdjustment + b.effectiveSurfaceOffset + b.wateringOffset;
      expect(h.wbgtValue).toBeCloseTo(sum, 6);
    }
  });
});

describe("Bewässerung", () => {
  it("wirkt nur in der ersten Stunde der Einheit", () => {
    const hours = calculateWBGTForecast(weather(), { ...BASE, watered: true });
    const cooled = hours.filter((h) => h.breakdown.wateringOffset !== 0);
    expect(cooled).toHaveLength(1);
    expect(cooled[0].timestamp).toBe("2026-08-12T14:00");
    expect(cooled[0].breakdown.wateringOffset).toBe(-WATERING_COOLING);
  });

  it("entfällt nachts und bei schwüler Luft", () => {
    const night = weather({ direct_radiation_instant: () => 0, diffuse_radiation_instant: () => 0 });
    const humid = weather({ relative_humidity_2m: () => 80 });
    for (const data of [night, humid]) {
      const hours = calculateWBGTForecast(data, { ...BASE, watered: true });
      expect(hours.every((h) => h.breakdown.wateringOffset === 0)).toBe(true);
    }
  });

  it("gilt nicht für Joggen und Radsport", () => {
    const hours = calculateWBGTForecast(weather(), {
      ...BASE,
      sport: "jogging",
      surface: "asphalt",
      watered: true,
    });
    expect(hours.every((h) => h.breakdown.wateringOffset === 0)).toBe(true);
  });
});

describe("Zeitraum", () => {
  it("zählt die Endstunde nicht mit, wenn die Einheit zur vollen Stunde endet", () => {
    expect(sessionHourStamps("2026-08-12T15:00", "2026-08-12T17:00")).toEqual({
      from: "2026-08-12T15:00",
      to: "2026-08-12T16:00",
    });
    expect(sessionHourStamps("2026-08-12T15:30", "2026-08-12T17:15")).toEqual({
      from: "2026-08-12T15:00",
      to: "2026-08-12T17:00",
    });
  });

  it("findet nur exakte Stunden – keine Nachbarstunde als Ersatz", () => {
    const data = weather();
    expect(findExactHourIndex(data, "2026-08-12T14:30")).toBe(14);
    expect(findExactHourIndex(data, "2026-08-09T14:00")).toBe(-1);
    expect(findExactHourIndex(data, "2026-08-20T14:00")).toBe(-1);
  });

  it("verschiebt Stempel über Monatsgrenzen", () => {
    expect(shiftStampByDays("2026-08-31T18:30", 1)).toBe("2026-09-01T18:30");
    expect(shiftStampByDays("2026-03-01T09:00", -1)).toBe("2026-02-28T09:00");
  });

  it("zeigt Kontextstunden, kürzt aber nie die Einheit selbst", () => {
    const hours = calculateWBGTForecast(weather(), {
      ...BASE,
      sessionFromIndex: 10,
      sessionToIndex: 17,
    });
    expect(hours.length).toBeLessThanOrEqual(MAX_DISPLAY_HOURS);
    expect(hours.filter((h) => h.inSession)).toHaveLength(8);
    expect(hours[0].timestamp).toBe("2026-08-12T05:00");
  });

  it("liefert für Tage außerhalb der Daten keinen Vergleichswert", () => {
    const params = { ...BASE, startTime: "2026-08-14T14:00", endTime: "2026-08-14T16:00" };
    expect(summarizeSession(weather(), params)).toBeNull();
  });
});

describe("Ampel", () => {
  it("verschiebt die Fußball-Schwellen um Alter, Leistung und Intensität", () => {
    // FIFA Rot > 32,0; U16 −1, Breitensport −2, Wettkampf −1,5 → Rot > 27,5
    expect(getColorCode(27.5, "football", "youth", "intense", "recreational")).toBe("orange");
    expect(getColorCode(27.6, "football", "youth", "intense", "recreational")).toBe("red");
    expect(getColorCode(32.0, "football", "adult", "normal", "elite")).toBe("orange");
    expect(getColorCode(32.1, "football", "adult", "normal", "elite")).toBe("red");
  });

  it("zieht bei ACSM-Sportarten nur für 65+ ab, nicht für Jugend oder Leistung", () => {
    // ACSM Rot > 27,8; 65+ −1 → Rot > 26,8
    expect(getColorCode(26.8, "jogging", "senior", "normal", "recreational")).toBe("orange");
    expect(getColorCode(26.9, "jogging", "senior", "normal", "recreational")).toBe("red");
    expect(getColorCode(27.8, "jogging", "youth", "normal", "recreational")).toBe("orange");
    expect(getColorCode(27.8, "jogging", "adult", "normal", "elite")).toBe("orange");
  });
});

describe("Rückblick", () => {
  const now = new Date(2026, 10, 16, 15, 0); // 16.11.2026, 15:00 Ortszeit

  it("fragt für vergangene Tage das Archiv mit einem Tag Rand ab", () => {
    expect(weatherRequestFor("2025-07-02T18:00", now)).toEqual({
      kind: "review",
      startDate: "2025-07-01",
      endDate: "2025-07-03",
    });
  });

  it("legt das Archiv-Fenster korrekt über Monats- und Jahresgrenzen", () => {
    expect(weatherRequestFor("2025-01-01T10:00", now)).toEqual({
      kind: "review",
      startDate: "2024-12-31",
      endDate: "2025-01-02",
    });
  });

  it("nutzt gestern schon das Archiv, heute und morgen die Vorhersage", () => {
    expect(weatherRequestFor("2026-11-15T18:00", now).kind).toBe("review");
    // Auch wenn die Uhrzeit heute schon vorbei ist: Vorhersage-API mit past_days
    expect(weatherRequestFor("2026-11-16T08:00", now).kind).toBe("forecast");
    expect(weatherRequestFor("2026-11-17T18:00", now).kind).toBe("forecast");
    expect(weatherRequestFor(undefined, now).kind).toBe("forecast");
  });

  it("trennt Vorhersage und Rückblick im Cache", () => {
    const forecast = buildCacheKey(48, 7.85, { kind: "forecast", forecastDays: 2 });
    const review = buildCacheKey(48, 7.85, {
      kind: "review",
      startDate: "2025-07-01",
      endDate: "2025-07-03",
    });
    const otherDay = buildCacheKey(48, 7.85, {
      kind: "review",
      startDate: "2025-07-02",
      endDate: "2025-07-04",
    });
    expect(new Set([forecast, review, otherDay]).size).toBe(3);
  });

  it("erkennt Lücken im Archiv und liefert dann keinen Tageswert", () => {
    const data = weather();
    expect(hasCompleteHours(data, 14, 15)).toBe(true);
    expect(hasCompleteHours(data, -1, 15)).toBe(false);

    (data.hourly.relative_humidity_2m as (number | null)[])[15] = null;
    expect(hasCompleteHours(data, 14, 15)).toBe(false);
    expect(hasCompleteHours(data, 13, 14)).toBe(true);

    const { surface, shadow, watered, ageGroup, performanceLevel, sport, intensity } = BASE;
    expect(
      summarizeSession(data, {
        surface,
        shadow,
        watered,
        ageGroup,
        performanceLevel,
        sport,
        intensity,
        startTime: "2026-08-12T14:00",
        endTime: "2026-08-12T16:00",
      })
    ).toBeNull();
  });
});

describe("Tiefe Sonne", () => {
  const SIN_60 = Math.sin(Math.PI / 3);

  it("lässt die Kugel bei 60° Sonnenhöhe unverändert", () => {
    // Bei 60° gilt Gdir = DNI × sin 60° – alt und neu müssen übereinstimmen
    expect(globeDirectRadiation(700, 700 / SIN_60)).toBeCloseTo(700, 6);
    expect(SOLAR_REFERENCE_SIN).toBeCloseTo(SIN_60, 10);
  });

  it("rechnet ohne DNI wie bisher mit der waagerechten Direktstrahlung", () => {
    expect(globeDirectRadiation(300, null)).toBe(300);
    expect(globeDirectRadiation(300, undefined)).toBe(300);
    expect(globeDirectRadiation(300, 0)).toBe(300);
    expect(globeDirectRadiation(-5, null)).toBe(0);
  });

  it("hebt den WBGT bei tiefer Sonne an, nicht bei hoher", () => {
    // 25° Sonnenhöhe: DNI 500 W/m² ergibt nur rund 211 W/m² auf der Waagerechten
    const lowSun = { direct: 211, dni: 500 };
    const without = weather({ direct_radiation_instant: () => lowSun.direct });
    const withDni = weather({ direct_radiation_instant: () => lowSun.direct });
    withDni.hourly.direct_normal_irradiance_instant = withDni.hourly.time.map(() => lowSun.dni);

    const before = calculateWBGTForecast(without, BASE)[0];
    const after = calculateWBGTForecast(withDni, BASE)[0];
    expect(after.wbgtValue).toBeGreaterThan(before.wbgtValue);
    expect(after.breakdown.globeDirect).toBeCloseTo(500 * SIN_60, 6);
    // Die natürliche Feuchtkugel bleibt bei der Globalstrahlung
    expect(after.breakdown.naturalWetBulbUnshaded).toBe(before.breakdown.naturalWetBulbUnshaded);

    const highSun = weather();
    highSun.hourly.direct_normal_irradiance_instant = highSun.hourly.time.map(() => 700 / SIN_60);
    expect(calculateWBGTForecast(highSun, BASE)[0].wbgtValue).toBe(
      calculateWBGTForecast(weather(), BASE)[0].wbgtValue
    );
  });

  it("beschattet auch den DNI-Anteil", () => {
    const data = weather();
    data.hourly.direct_normal_irradiance_instant = data.hourly.time.map(() => 800);
    const full = calculateWBGTForecast(data, { ...BASE, shadow: "full" })[0];
    expect(full.breakdown.solarShaded).toBeCloseTo(0.4 * 150 * 0.25, 6);
  });

  it("reicht den UV-Index durch und übersteht Lücken", () => {
    const data = weather();
    data.hourly.uv_index = data.hourly.time.map((_, i) => (i === 14 ? 6.4 : null));
    const hours = calculateWBGTForecast(data, { ...BASE, contextHours: 0 });
    expect(hours.map((h) => h.uvIndex)).toEqual([6.4, null]);
    expect(calculateWBGTForecast(weather(), BASE)[0].uvIndex).toBeNull();
  });
});
