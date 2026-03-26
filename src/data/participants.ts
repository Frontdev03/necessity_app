/**
 * Mock event participants – list of participants registered per event
 */

export type EventParticipant = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  village?: string;
  /** Optional profile image URI; when missing, show first letter of name */
  imageUri?: string;
};

/** Participants by event id (current event participants) */
export const MOCK_EVENT_PARTICIPANTS: Record<string, EventParticipant[]> = {
  '1': [
    { id: 'p1-1', fullName: 'Amritpal Singh', phone: '9876543210', email: 'amritpal@example.com', village: 'Patiala' },
    { id: 'p1-2', fullName: 'Gurpreet Kaur', phone: '9876543211', email: 'gurpreet@example.com', village: 'Nabha' },
    { id: 'p1-3', fullName: 'Rajesh Kumar', phone: '9876543212', email: 'rajesh@example.com', village: 'Patiala' },
    { id: 'p1-4', fullName: 'Manpreet Kaur', phone: '9876543213', email: 'manpreet@example.com', village: 'Samana' },
    { id: 'p1-5', fullName: 'Harjinder Singh', phone: '9876543214', email: 'harjinder@example.com', village: 'Patiala' },
  ],
  '2': [
    { id: 'p2-1', fullName: 'Balwinder Kaur', phone: '9876543220', email: 'balwinder@example.com', village: 'Nabha' },
    { id: 'p2-2', fullName: 'Jasbir Singh', phone: '9876543221', email: 'jasbir@example.com', village: 'Nabha' },
  ],
  '3': [
    { id: 'p3-1', fullName: 'Sukhwinder Kaur', phone: '9876543230', email: 'sukhwinder@example.com', village: 'Samana' },
    { id: 'p3-2', fullName: 'Kuldeep Singh', phone: '9876543231', email: 'kuldeep@example.com', village: 'Patiala' },
  ],
  '4': [],
};

export function getParticipantsForEvent(eventId: string): EventParticipant[] {
  return MOCK_EVENT_PARTICIPANTS[eventId] ?? [];
}

/** Find a participant by full name across all events (for history record enrichment) */
export function getParticipantByName(fullName: string): EventParticipant | undefined {
  const normalized = fullName.trim().toLowerCase();
  for (const list of Object.values(MOCK_EVENT_PARTICIPANTS)) {
    const found = list.find((p) => p.fullName.trim().toLowerCase() === normalized);
    if (found) return found;
  }
  return undefined;
}
