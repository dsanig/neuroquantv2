export type PollingScheduleConfig = {
  enabled: boolean;
  time: string;
  daysOfWeek: number[];
  timezone: string;
};

const DEFAULT_TIME = "06:00";
const DEFAULT_DAYS = [1, 2, 3, 4, 5];

function clampDay(day: number) {
  return Math.min(7, Math.max(1, day));
}

function uniqueSortedDays(days: number[]) {
  return Array.from(new Set(days.map(clampDay))).sort((a, b) => a - b);
}

function normalizeTime(input: string | undefined | null): string {
  if (!input) return DEFAULT_TIME;
  const match = input.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return DEFAULT_TIME;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return DEFAULT_TIME;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function timezoneOrUTC(value: unknown): string {
  return typeof value === "string" && value.trim() ? value : "UTC";
}

export function parsePollingSchedule(value: string | null | undefined): PollingScheduleConfig {
  const fallback: PollingScheduleConfig = {
    enabled: true,
    time: DEFAULT_TIME,
    daysOfWeek: [...DEFAULT_DAYS],
    timezone: "UTC",
  };

  if (!value || !value.trim()) return fallback;

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      return {
        enabled: typeof obj.enabled === "boolean" ? obj.enabled : true,
        time: normalizeTime(typeof obj.time === "string" ? obj.time : undefined),
        daysOfWeek: uniqueSortedDays(Array.isArray(obj.daysOfWeek) ? obj.daysOfWeek.filter((d): d is number => Number.isInteger(d)) : DEFAULT_DAYS),
        timezone: timezoneOrUTC(obj.timezone),
      };
    }
  } catch {
    // fallback to cron format support
  }

  const parts = value.trim().split(/\s+/);
  if (parts.length === 5) {
    const [minute, hour, , , dayOfWeek] = parts;
    const hourNum = Number(hour);
    const minuteNum = Number(minute);
    const cronDays = dayOfWeek === "*"
      ? [1, 2, 3, 4, 5, 6, 7]
      : dayOfWeek.split(",").map((d) => Number(d)).filter((d) => Number.isFinite(d)).map((d) => d === 0 ? 7 : d);

    return {
      enabled: true,
      time: normalizeTime(`${hourNum}:${String(minuteNum).padStart(2, "0")}`),
      daysOfWeek: uniqueSortedDays(cronDays.length ? cronDays : DEFAULT_DAYS),
      timezone: "UTC",
    };
  }

  return fallback;
}

export function serializePollingSchedule(config: PollingScheduleConfig): string {
  return JSON.stringify({
    enabled: config.enabled,
    time: normalizeTime(config.time),
    daysOfWeek: uniqueSortedDays(config.daysOfWeek),
    timezone: timezoneOrUTC(config.timezone),
  });
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function formatPollingSchedule(value: string | null | undefined): string {
  const schedule = parsePollingSchedule(value);
  if (!schedule.enabled) return "Disabled";

  const days = uniqueSortedDays(schedule.daysOfWeek);
  if (days.length === 7) return `Daily at ${schedule.time}`;

  const weekdays = [1, 2, 3, 4, 5];
  if (weekdays.every((day) => days.includes(day)) && days.length === 5) {
    return `Mon-Fri at ${schedule.time}`;
  }

  const label = days.map((d) => DAY_LABELS[d - 1]).join(", ");
  return `${label} at ${schedule.time}`;
}
