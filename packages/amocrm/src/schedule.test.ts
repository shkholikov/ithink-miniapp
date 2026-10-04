import { normalizePhone } from "./phone";
import { taskDueAt } from "./schedule";

// Tashkent is UTC+5: 09:00 local = 04:00 UTC, 18:00 local = 13:00 UTC.
const utc = (iso: string) => new Date(`${iso}Z`);

describe("taskDueAt", () => {
	it("is 15 minutes out during working hours", () => {
		expect(taskDueAt(utc("2026-10-05T05:00:00"))).toEqual(utc("2026-10-05T05:15:00"));
	});

	it("is 09:15 the same day before work starts", () => {
		expect(taskDueAt(utc("2026-10-05T02:00:00"))).toEqual(utc("2026-10-05T04:15:00"));
	});

	it("is 09:15 the next day after work ends", () => {
		expect(taskDueAt(utc("2026-10-05T13:00:00"))).toEqual(utc("2026-10-06T04:15:00"));
	});

	it("skips the weekend after Friday evening", () => {
		expect(taskDueAt(utc("2026-10-09T14:00:00"))).toEqual(utc("2026-10-12T04:15:00"));
	});

	it("moves Sunday daytime to Monday 09:15", () => {
		expect(taskDueAt(utc("2026-10-04T06:00:00"))).toEqual(utc("2026-10-05T04:15:00"));
	});

	it("uses Tashkent's date near UTC midnight", () => {
		// Friday 21:30 UTC is Saturday 02:30 in Tashkent.
		expect(taskDueAt(utc("2026-10-09T21:30:00"))).toEqual(utc("2026-10-12T04:15:00"));
	});
});

describe("normalizePhone", () => {
	it.each([
		["+998 (90) 123-45-67", "998901234567"],
		["90 123 45 67", "998901234567"],
		["998901234567", "998901234567"],
		["+7 912 345 67 89", "79123456789"]
	])("%s -> %s", (input, expected) => {
		expect(normalizePhone(input)).toBe(expected);
	});
});
