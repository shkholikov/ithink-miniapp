// Asia/Tashkent is UTC+5 with no DST, so a fixed offset is exact.
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 18;
const QUICK_RESPONSE_MS = 15 * 60 * 1000;

const isWeekday = (day: number) => day >= 1 && day <= 5;

// 15 minutes from now during working hours (Mon-Fri 09:00-18:00 Tashkent),
// otherwise 09:15 on the next working day.
export function taskDueAt(now: Date): Date {
	const local = new Date(now.getTime() + TASHKENT_OFFSET_MS);
	const hour = local.getUTCHours();

	if (isWeekday(local.getUTCDay()) && hour >= WORK_START_HOUR && hour < WORK_END_HOUR) {
		return new Date(now.getTime() + QUICK_RESPONSE_MS);
	}

	const due = new Date(local);
	due.setUTCHours(WORK_START_HOUR, 15, 0, 0);
	if (hour >= WORK_START_HOUR || !isWeekday(due.getUTCDay())) {
		do {
			due.setUTCDate(due.getUTCDate() + 1);
		} while (!isWeekday(due.getUTCDay()));
	}
	return new Date(due.getTime() - TASHKENT_OFFSET_MS);
}
