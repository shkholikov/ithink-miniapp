import { randomUUID } from 'node:crypto';
import pino from 'pino';
import type { Logger } from 'pino';
import type {
  AmoConfig,
  AmoEntityId,
  CreateContactInput,
  CreateLeadInput,
} from './types';

export interface AmoCrmClient {
  readonly isStub: boolean;
  createContact(input: CreateContactInput): Promise<AmoEntityId>;
  createLead(input: CreateLeadInput): Promise<AmoEntityId>;
}

interface ClientDeps {
  logger?: Logger;
}

export function createAmoCrmClient(config: AmoConfig, deps: ClientDeps = {}): AmoCrmClient {
  const logger = deps.logger ?? pino({ name: 'amocrm' });
  const live = Boolean(config.subdomain && config.accessToken && config.pipelineId);

  if (!live) {
    logger.warn('amoCRM client running in STUB mode — no live calls will be made');
    return createStubClient(logger);
  }

  // Real client will be wired in a follow-up once credentials are provided.
  // See packages/amocrm/src/types.ts for the AmoConfig shape and plan file.
  logger.warn('amoCRM live client not yet implemented — falling back to stub');
  return createStubClient(logger);
}

function createStubClient(logger: Logger): AmoCrmClient {
  return {
    isStub: true,
    async createContact(input) {
      const id = `stub-contact-${randomUUID()}`;
      logger.info({ event: 'stub.createContact', id, input }, 'stubbed amoCRM createContact');
      return { id };
    },
    async createLead(input) {
      const id = `stub-lead-${randomUUID()}`;
      logger.info({ event: 'stub.createLead', id, input }, 'stubbed amoCRM createLead');
      return { id };
    },
  };
}
