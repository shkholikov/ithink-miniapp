import pino from "pino";
import { createAmoCrmClient } from "./client";
import { AmoApiError } from "./http";

const logger = pino({ level: "silent" });

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function setup(responses: Array<Response | Error>) {
	const calls: Array<{ url: string; init: RequestInit }> = [];
	const fetchMock = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
		calls.push({ url: String(url), init: init ?? {} });
		const next = responses.shift();
		if (!next) throw new Error("unexpected fetch");
		if (next instanceof Error) throw next;
		return next;
	});
	const sleeps: number[] = [];
	const client = createAmoCrmClient(
		{ subdomain: "ithink", accessToken: "token" },
		{
			logger,
			nodeEnv: "production",
			fetch: fetchMock as unknown as typeof fetch,
			sleep: async (ms) => {
				sleeps.push(ms);
			}
		}
	);
	return { client, calls, sleeps };
}

describe("createAmoCrmClient", () => {
	it("throws in production without a token", () => {
		expect(() => createAmoCrmClient({ subdomain: "ithink" }, { logger, nodeEnv: "production" })).toThrow(/required in production/);
	});

	it("returns a stub outside production without a token", () => {
		expect(createAmoCrmClient({}, { logger, nodeEnv: "development" }).isStub).toBe(true);
	});

	it("does not log submission data in stub mode", async () => {
		const lines: string[] = [];
		const capture = pino({ level: "info" }, { write: (line: string) => lines.push(line) });
		const stub = createAmoCrmClient({}, { logger: capture, nodeEnv: "development" });
		await stub.createLeadComplex({
			name: "Service — Ivan",
			pipelineId: 1,
			statusId: 2,
			customFields: [],
			contact: { name: "Ivan", customFields: [{ field_code: "PHONE", values: [{ value: "+998901234567" }] }] }
		});
		expect(lines.join("")).toContain("stub.createLead");
		expect(lines.join("")).not.toMatch(/Ivan|998901234567/);
	});
});

describe("live client", () => {
	it("sends the bearer token to the account subdomain", async () => {
		const { client, calls } = setup([new Response(null, { status: 204 })]);
		await client.findContactByPhone("998901234567");
		expect(calls[0]!.url).toBe("https://ithink.amocrm.ru/api/v4/contacts?query=998901234567");
		expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe("Bearer token");
	});

	it("finds a contact only when a PHONE value normalizes to the same number", async () => {
		const { client } = setup([
			json({
				_embedded: {
					contacts: [
						{ id: 1, custom_fields_values: [{ field_code: "PHONE", values: [{ value: "+998 90 123 45 670" }] }] },
						{ id: 2, custom_fields_values: [{ field_code: "PHONE", values: [{ value: "+998 (90) 123-45-67" }] }] }
					]
				}
			})
		]);
		await expect(client.findContactByPhone("998901234567")).resolves.toEqual({ id: 2 });
	});

	it("returns null when the contact search is empty", async () => {
		const { client } = setup([new Response(null, { status: 204 })]);
		await expect(client.findContactByPhone("998901234567")).resolves.toBeNull();
	});

	it("picks the most recently updated open lead in the pipeline", async () => {
		const { client, calls } = setup([
			json({ _embedded: { leads: [{ id: 10 }, { id: 11 }, { id: 12 }, { id: 13 }] } }),
			json({
				_embedded: {
					leads: [
						{ id: 10, pipeline_id: 6434662, status_id: 142, updated_at: 400 },
						{ id: 11, pipeline_id: 999, status_id: 1, updated_at: 300 },
						{ id: 12, pipeline_id: 6434662, status_id: 72345034, updated_at: 100 },
						{ id: 13, pipeline_id: 6434662, status_id: 72345035, updated_at: 200 }
					]
				}
			})
		]);
		await expect(client.findOpenLead(5, 6434662)).resolves.toEqual({ id: 13 });
		expect(calls[0]!.url).toContain("/api/v4/contacts/5?with=leads");
		expect(calls[1]!.url).toContain("filter[id][0]=10&filter[id][1]=11");
	});

	it("returns null when every lead is closed", async () => {
		const { client } = setup([
			json({ _embedded: { leads: [{ id: 10 }] } }),
			json({ _embedded: { leads: [{ id: 10, pipeline_id: 6434662, status_id: 143, updated_at: 1 }] } })
		]);
		await expect(client.findOpenLead(5, 6434662)).resolves.toBeNull();
	});

	it("embeds an existing contact by id in leads/complex", async () => {
		const { client, calls } = setup([json([{ id: 77, contact_id: 5 }])]);
		const result = await client.createLeadComplex({
			name: "CRM — Ivan",
			pipelineId: 6434662,
			statusId: 72345034,
			responsibleUserId: 3,
			customFields: [],
			contact: { id: 5 }
		});
		expect(result).toEqual({ leadId: 77, contactId: 5 });
		const body = JSON.parse(String(calls[0]!.init.body));
		expect(body[0]).toMatchObject({ pipeline_id: 6434662, status_id: 72345034, responsible_user_id: 3, _embedded: { contacts: [{ id: 5 }] } });
	});

	it("posts a common note and a contact task", async () => {
		const { client, calls } = setup([json({}), json({})]);
		await client.addNote(77, "hello");
		await client.addTask({ leadId: 77, responsibleUserId: 3, completeTill: new Date(1_700_000_000_000), text: "call" });
		expect(calls[0]!.url).toContain("/api/v4/leads/77/notes");
		expect(JSON.parse(String(calls[0]!.init.body))).toEqual([{ note_type: "common", params: { text: "hello" } }]);
		expect(JSON.parse(String(calls[1]!.init.body))).toEqual([
			{ entity_id: 77, entity_type: "leads", task_type_id: 1, text: "call", complete_till: 1_700_000_000, responsible_user_id: 3 }
		]);
	});

	it("retries 429 and 5xx with exponential backoff", async () => {
		const { client, calls, sleeps } = setup([new Response("", { status: 429 }), new Response("", { status: 502 }), json({})]);
		await client.addNote(1, "x");
		expect(calls).toHaveLength(3);
		expect(sleeps).toEqual([500, 1000]);
	});

	it("gives up after three attempts", async () => {
		const { client, calls } = setup([new Error("network"), new Response("", { status: 500 }), new Response("", { status: 503 })]);
		await expect(client.addNote(1, "x")).rejects.toBeInstanceOf(AmoApiError);
		expect(calls).toHaveLength(3);
	});

	it("does not retry other 4xx errors and keeps the phone out of the error", async () => {
		const { client, calls } = setup([new Response("", { status: 401 })]);
		const error = await client.findContactByPhone("998901234567").catch((e: unknown) => e);
		expect(error).toBeInstanceOf(AmoApiError);
		expect((error as Error).message).not.toContain("998901234567");
		expect(calls).toHaveLength(1);
	});

	it("throttles to 7 requests per second", async () => {
		let clock = 0;
		const sleeps: number[] = [];
		const client = createAmoCrmClient(
			{ subdomain: "ithink", accessToken: "token" },
			{
				logger,
				fetch: (async () => json({})) as unknown as typeof fetch,
				now: () => clock,
				sleep: async (ms) => {
					sleeps.push(ms);
					clock += ms;
				}
			}
		);
		for (let i = 0; i < 8; i++) await client.addNote(1, "x");
		expect(sleeps).toEqual([1000]);
	});
});
