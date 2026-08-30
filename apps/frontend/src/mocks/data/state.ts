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

export const findUserByEmail = (email: string): MockUser | undefined =>
  state.users.find((u) => u.email === email.toLowerCase());

export const currentUser = (): MockUser | undefined =>
  state.users.find((u) => u.id === state.sessionUserId);
