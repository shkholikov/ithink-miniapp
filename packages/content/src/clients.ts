export interface Client {
  id: string;
  name: string;
  logo?: string;
}

export const clients: readonly Client[] = [
  { id: 'aslzar', name: 'Aslzar' },
  { id: 'sample-client', name: 'Confidential' },
] as const;

export function getClientById(id: string): Client | undefined {
  return clients.find((c) => c.id === id);
}
