import pino from "pino";
import type { Logger } from "pino";
import { createAmoHttp, type HttpDeps } from "./http";
import { normalizePhone } from "./phone";
import type { AmoClientConfig, CreateLeadComplexInput, CreatedLead, CreateTaskInput, CustomFieldValue } from "./types";

const CLOSED_STATUS_IDS = new Set([142, 143]);
const TASK_TYPE_CONTACT = 1;

export interface AmoCrmClient {
	readonly isStub: boolean;
	findContactByPhone(phone: string): Promise<{ id: number } | null>;
	findOpenLead(contactId: number, pipelineId: number): Promise<{ id: number } | null>;
	createLeadComplex(input: CreateLeadComplexInput): Promise<CreatedLead>;
	addNote(leadId: number, text: string): Promise<void>;
	addTask(input: CreateTaskInput): Promise<void>;
}

interface ClientDeps extends HttpDeps {
	logger?: Logger;
	nodeEnv?: string;
}

export function createAmoCrmClient(config: AmoClientConfig, deps: ClientDeps = {}): AmoCrmClient {
	const logger = deps.logger ?? pino({ name: "amocrm" });
	const nodeEnv = deps.nodeEnv ?? process.env.NODE_ENV;

	if (!config.subdomain || !config.accessToken) {
		if (nodeEnv === "production") {
			throw new Error("AMOCRM_SUBDOMAIN and AMOCRM_ACCESS_TOKEN are required in production");
		}
		logger.warn("amoCRM client running in STUB mode, no live calls will be made");
		return createStubClient(logger);
	}

	return createLiveClient(config.subdomain, config.accessToken, deps);
}

interface ContactsResponse {
	_embedded?: {
		contacts?: Array<{ id: number; custom_fields_values?: CustomFieldValue[] | null }>;
	};
}

interface ContactWithLeadsResponse {
	_embedded?: { leads?: Array<{ id: number }> };
}

interface LeadsResponse {
	_embedded?: {
		leads?: Array<{ id: number; pipeline_id: number; status_id: number; updated_at: number }>;
	};
}

type ComplexResponse = Array<{ id: number; contact_id: number }>;

function createLiveClient(subdomain: string, accessToken: string, deps: HttpDeps): AmoCrmClient {
	const http = createAmoHttp(subdomain, accessToken, deps);

	return {
		isStub: false,

		async findContactByPhone(phone) {
			const res = await http.request<ContactsResponse>("GET", `/api/v4/contacts?query=${encodeURIComponent(phone)}`);
			const match = res?._embedded?.contacts?.find((contact) =>
				contact.custom_fields_values?.some(
					(field) => field.field_code === "PHONE" && field.values.some((v) => normalizePhone(String(v.value ?? "")) === phone)
				)
			);
			return match ? { id: match.id } : null;
		},

		async findOpenLead(contactId, pipelineId) {
			const contact = await http.request<ContactWithLeadsResponse>("GET", `/api/v4/contacts/${contactId}?with=leads`);
			const ids = contact?._embedded?.leads?.map((lead) => lead.id) ?? [];
			if (!ids.length) return null;

			const filter = ids.map((id, i) => `filter[id][${i}]=${id}`).join("&");
			const res = await http.request<LeadsResponse>("GET", `/api/v4/leads?${filter}&limit=250`);
			const open = (res?._embedded?.leads ?? [])
				.filter((lead) => lead.pipeline_id === pipelineId && !CLOSED_STATUS_IDS.has(lead.status_id))
				.sort((a, b) => b.updated_at - a.updated_at)[0];
			return open ? { id: open.id } : null;
		},

		async createLeadComplex(input) {
			const contact =
				"id" in input.contact
					? { id: input.contact.id }
					: {
							name: input.contact.name,
							responsible_user_id: input.contact.responsibleUserId,
							custom_fields_values: input.contact.customFields
						};

			const res = await http.request<ComplexResponse>("POST", "/api/v4/leads/complex", [
				{
					name: input.name,
					pipeline_id: input.pipelineId,
					status_id: input.statusId,
					responsible_user_id: input.responsibleUserId,
					custom_fields_values: input.customFields.length ? input.customFields : undefined,
					_embedded: { contacts: [contact] }
				}
			]);
			const created = res?.[0];
			if (!created) throw new Error("amoCRM leads/complex returned no lead");
			return { leadId: created.id, contactId: created.contact_id };
		},

		async addNote(leadId, text) {
			await http.request("POST", `/api/v4/leads/${leadId}/notes`, [{ note_type: "common", params: { text } }]);
		},

		async addTask(input) {
			await http.request("POST", "/api/v4/tasks", [
				{
					entity_id: input.leadId,
					entity_type: "leads",
					task_type_id: TASK_TYPE_CONTACT,
					text: input.text,
					complete_till: Math.floor(input.completeTill.getTime() / 1000),
					responsible_user_id: input.responsibleUserId
				}
			]);
		}
	};
}

function createStubClient(logger: Logger): AmoCrmClient {
	let nextId = 1;
	return {
		isStub: true,
		async findContactByPhone() {
			return null;
		},
		async findOpenLead() {
			return null;
		},
		async createLeadComplex() {
			const leadId = nextId++;
			logger.info({ event: "stub.createLead", leadId }, "stubbed amoCRM createLeadComplex");
			return { leadId, contactId: nextId++ };
		},
		async addNote(leadId) {
			logger.info({ event: "stub.addNote", leadId }, "stubbed amoCRM addNote");
		},
		async addTask(input) {
			logger.info({ event: "stub.addTask", leadId: input.leadId }, "stubbed amoCRM addTask");
		}
	};
}
