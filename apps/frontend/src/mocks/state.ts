import type { UpdateUserProfileRequest } from "@orpc-prac/contract";

export interface MockUser {
  readonly id: string;
  name: string;
  email: string;
  password: string;
  emailVerified: boolean;
  profile: UpdateUserProfileRequest | null;
}

interface MockState {
  users: MockUser[];
  sessionUserId: string | null;
  /** 検証トークン → 利用者 ID。backend は DB の verification 表で持つ。 */
  verifications: Record<string, string>;
}

const STORAGE_KEY = "orpc-prac.mock";

const emptyState = (): MockState => ({
  users: [],
  sessionUserId: null,
  verifications: {},
});

/** 再読み込みでモックの状態が消えないよう localStorage に置く。 */
const load = (): MockState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MockState) : emptyState();
  } catch {
    return emptyState();
  }
};

export const state = load();

export const persist = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

/**
 * UUID v7 を組み立てる。
 *
 * 契約の `UuidSchema` が版を見ているため `crypto.randomUUID()` (v4) は通らない。
 * 先頭 48 ビットが時刻、版が 7、variant が 8〜b (RFC 9562)。
 */
export const uuidV7 = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const now = Date.now();

  for (let i = 0; i < 6; i += 1) {
    bytes[i] = Math.floor(now / 256 ** (5 - i)) & 0xff;
  }
  bytes[6] = 0x70 | (bytes[6]! & 0x0f);
  bytes[8] = 0x80 | (bytes[8]! & 0x3f);

  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
};

export const findUserByEmail = (email: string): MockUser | undefined =>
  state.users.find((u) => u.email === email.toLowerCase());

export const currentUser = (): MockUser | undefined =>
  state.users.find((u) => u.id === state.sessionUserId);
