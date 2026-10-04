/** Who the local data belongs to (glossary: Guest, User). */
export type DataOwner = { kind: 'guest' } | { kind: 'user'; userId: string };
