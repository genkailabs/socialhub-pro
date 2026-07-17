const SAO_PAULO_OFFSET_HOURS = 3;

function validTimes(times) {
  return [...new Set((times || [])
    .map((time) => String(time).trim())
    .filter((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)))]
    .sort();
}

// Sao Paulo currently uses UTC-03:00 year-round. Keeping this rule explicit
// makes the saved preferred time match the agency's local calendar.
export function nextScheduledAt(preferredTimes, now = new Date()) {
  const times = validTimes(preferredTimes);
  const candidates = times.length ? times : ['09:00'];
  const localNow = new Date(now.getTime() - SAO_PAULO_OFFSET_HOURS * 60 * 60 * 1000);

  for (let offset = 0; offset < 2; offset++) {
    const day = new Date(Date.UTC(
      localNow.getUTCFullYear(),
      localNow.getUTCMonth(),
      localNow.getUTCDate() + offset
    ));

    for (const time of candidates) {
      const [hour, minute] = time.split(':').map(Number);
      const scheduled = new Date(Date.UTC(
        day.getUTCFullYear(),
        day.getUTCMonth(),
        day.getUTCDate(),
        hour + SAO_PAULO_OFFSET_HOURS,
        minute
      ));
      if (scheduled.getTime() > now.getTime()) return scheduled.toISOString();
    }
  }

  return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
}
