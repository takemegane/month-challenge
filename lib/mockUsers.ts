export type MockUser = { id: string; email: string; is_admin: boolean };

let cached: MockUser[] | null = null;

function randomUUID() {
  // not crypto-safe; fine for mock
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getMockUsers(currentId?: string): MockUser[] {
  if (cached) return cached;
  const meId = currentId || randomUUID();
  cached = [
    { id: meId, email: 'you@example.com', is_admin: true },
    { id: randomUUID(), email: 'member1@example.com', is_admin: false },
    { id: randomUUID(), email: 'member2@example.com', is_admin: false },
  ];
  return cached;
}

