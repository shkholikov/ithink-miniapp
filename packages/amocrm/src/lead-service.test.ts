import pino from "pino";
import type { AmoCrmClient } from "./client";
import { LeadIntakeError, createLeadService, type LeadRequest } from "./lead-service";
import type { LeadPipelineConfig } from "./types";

const pipeline: LeadPipelineConfig = {
	pipelineId: 6434662,
	statusId: 72345034,
	responsibleUserId: 3,
	product: { fieldId: 900, enums: { "crm-sales-automation": 901 } },
	channel: { fieldId: 910, enums: { site: 911, telegram_miniapp: 912 } },
	budget: { fieldId: 920, enums: { "1k_5k": 921 } },
	companySize: { fieldId: 930, enums: { "11_50": 932 } }
};

const request: LeadRequest = {
	service: "crm-sales-automation",
	name: "Ivan Petrov",
	phone: "+998 90 123 45 67",
	email: "ivan@example.com",
	description: "Need amoCRM integrated with our website",
	budget: "1k_5k",
	companySize: "11_50",
	locale: "ru",
	startParam: "ig_msp_oct",
	tgUserId: 123456,
	tgUsername: "ivanp",
	attribution: { utm_source: "ig", utm_campaign: "msp_oct" }
};

function fakeClient(overrides: Partial<AmoCrmClient> = {}): jest.Mocked<AmoCrmClient> {
	return {
		isStub: false,
		findContactByPhone: jest.fn(async () => null),
		findOpenLead: jest.fn(async () => null),
		createLeadComplex: jest.fn(async () => ({ leadId: 77, contactId: 5 })),
		addNote: jest.fn(async () => undefined),
		addTask: jest.fn(async () => undefined),
		...overrides
	} as jest.Mocked<AmoCrmClient>;
}

function setup(client: jest.Mocked<AmoCrmClient>, sendFallback = jest.fn(async (_text: string) => undefined)) {
	const logs: string[] = [];
	const logger = pino({ level: "info" }, { write: (line: string) => logs.push(line) });
	const service = createLeadService({
		client,
		pipeline,
		sendFallback,
		serviceLabel: () => "CRM и автоматизация продаж",
		logger,
		now: () => new Date("2026-10-05T05:00:00Z")
	});
	return { service, logs, sendFallback };
}

describe("createLead", () => {
	it("creates a lead with fields, a new contact, a note and a task", async () => {
		const client = fakeClient();
		const { service } = setup(client);

		await expect(service.createLead(request, "telegram_miniapp")).resolves.toEqual({ leadId: 77, outcome: "created" });

		expect(client.findContactByPhone).toHaveBeenCalledWith("998901234567");
		const input = client.createLeadComplex.mock.calls[0]![0];
		expect(input).toMatchObject({ name: "CRM и автоматизация продаж — Ivan Petrov", pipelineId: 6434662, statusId: 72345034, responsibleUserId: 3 });
		expect(input.customFields).toEqual(
			expect.arrayContaining([
				{ field_id: 900, values: [{ enum_id: 901 }] },
				{ field_id: 910, values: [{ enum_id: 912 }] },
				{ field_id: 920, values: [{ enum_id: 921 }] },
				{ field_id: 930, values: [{ enum_id: 932 }] },
				{ field_id: 1457167, values: [{ value: "123456" }] },
				{ field_id: 293381, values: [{ value: "ig" }] },
				{ field_id: 293379, values: [{ value: "msp_oct" }] }
			])
		);
		expect(input.contact).toEqual({
			name: "Ivan Petrov",
			responsibleUserId: 3,
			customFields: [
				{ field_code: "PHONE", values: [{ value: "+998901234567", enum_code: "WORK" }] },
				{ field_code: "EMAIL", values: [{ value: "ivan@example.com", enum_code: "WORK" }] },
				{ field_id: 1462571, values: [{ value: "ivanp" }] }
			]
		});

		const note = client.addNote.mock.calls[0]![1];
		expect(note).toContain(request.description);
		expect(note).toContain("start_param: ig_msp_oct");
		expect(note).toContain("Язык: ru");
		expect(note).toContain("Размер компании: 11–50 сотрудников");
		expect(client.addTask).toHaveBeenCalledWith(
			expect.objectContaining({ leadId: 77, responsibleUserId: 3, completeTill: new Date("2026-10-05T05:15:00Z") })
		);
	});

	it("leaves the comment out of the note when there is none", async () => {
		const client = fakeClient();
		const { service } = setup(client);
		await service.createLead({ ...request, description: undefined }, "site");
		const note = client.addNote.mock.calls[0]![1];
		expect(note).not.toContain("Комментарий");
		expect(note).toContain("Услуга: CRM и автоматизация продаж");
	});

	it("dedupes foreign E.164 numbers on the full digits", async () => {
		const client = fakeClient();
		const { service } = setup(client);
		await service.createLead({ ...request, phone: "+7 701 234 56 78" }, "site");
		expect(client.findContactByPhone).toHaveBeenCalledWith("77012345678");
	});

	it("skips enum fields whose ids are not configured yet", async () => {
		const client = fakeClient();
		const { service } = setup(client);
		await service.createLead({ ...request, service: "it-infrastructure", budget: undefined }, "site");
		const ids = client.createLeadComplex.mock.calls[0]![0].customFields.map((f) => f.field_id);
		expect(ids).not.toContain(900);
		expect(ids).not.toContain(920);
		expect(ids).toContain(910);
	});

	it("reuses an existing contact", async () => {
		const client = fakeClient({ findContactByPhone: jest.fn(async () => ({ id: 5 })) });
		const { service } = setup(client);
		await service.createLead(request, "site");
		expect(client.createLeadComplex.mock.calls[0]![0].contact).toEqual({ id: 5 });
	});

	it("appends a note and task to an open lead instead of creating one", async () => {
		const client = fakeClient({
			findContactByPhone: jest.fn(async () => ({ id: 5 })),
			findOpenLead: jest.fn(async () => ({ id: 40 }))
		});
		const { service } = setup(client);

		await expect(service.createLead(request, "site")).resolves.toEqual({ leadId: 40, outcome: "appended" });
		expect(client.findOpenLead).toHaveBeenCalledWith(5, 6434662);
		expect(client.createLeadComplex).not.toHaveBeenCalled();
		expect(client.addNote.mock.calls[0]![1]).toMatch(/^Повторная заявка/);
		expect(client.addTask).toHaveBeenCalledWith(expect.objectContaining({ leadId: 40 }));
	});

	it("falls back to Telegram when amoCRM fails and still succeeds", async () => {
		const client = fakeClient({ findContactByPhone: jest.fn(async () => Promise.reject(new Error("401"))) });
		const { service, sendFallback } = setup(client);

		await expect(service.createLead(request, "site")).resolves.toEqual({ leadId: null, outcome: "fallback" });
		const text = sendFallback.mock.calls[0]![0];
		expect(text).toContain("Ivan Petrov");
		expect(text).toContain("+998 90 123 45 67");
		expect(text).toContain(request.description);
	});

	it("throws when amoCRM and the fallback both fail", async () => {
		const client = fakeClient({ createLeadComplex: jest.fn(async () => Promise.reject(new Error("down"))) });
		const { service } = setup(
			client,
			jest.fn(async (_text: string) => {
				throw new Error("telegram down");
			})
		);
		await expect(service.createLead(request, "site")).rejects.toBeInstanceOf(LeadIntakeError);
	});

	it("keeps the created lead when the follow-up fails and reports it to the chat", async () => {
		const client = fakeClient({ addNote: jest.fn(async () => Promise.reject(new Error("down"))) });
		const { service, sendFallback } = setup(client);
		await expect(service.createLead(request, "site")).resolves.toEqual({ leadId: 77, outcome: "created" });
		expect(sendFallback.mock.calls[0]![0]).toContain("Сделка #77");
	});

	it("never logs personal data", async () => {
		for (const client of [fakeClient(), fakeClient({ findContactByPhone: jest.fn(async () => Promise.reject(new Error("x"))) })]) {
			const { service, logs } = setup(client);
			await service.createLead(request, "telegram_miniapp");
			const output = logs.join("");
			expect(output).toContain('"service":"crm-sales-automation"');
			expect(output).toContain('"channel":"telegram_miniapp"');
			for (const pii of ["Ivan", "998901234567", "90 123 45 67", "ivan@example.com", "amoCRM integrated", "ivanp"]) {
				expect(output).not.toContain(pii);
			}
		}
	});
});
