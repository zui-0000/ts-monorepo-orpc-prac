import { uuidv7 } from "uuidv7";

/**
 * 認証基盤が持つ利用者。**backend の `auth.t_user` にあたる** (設計関連/ADR-09)。
 *
 * 氏名などのプロフィールはここに置かない。あちらは `user/data.ts` が持つ。
 */
export interface AuthUser {
  readonly id: string;
  name: string;
  email: string;
  password: string;
  emailVerified: boolean;
}

interface AuthState {
  users: AuthUser[];
  sessionUserId: string | null;
  /** 検証トークン → 利用者 ID。backend は `auth.t_verification` で持つ。 */
  verifications: Record<string, string>;
}

const STORAGE_KEY = "orpc-prac.mock.auth";

const load = (): AuthState => {
  const empty: AuthState = {
    users: [],
    sessionUserId: null,
    verifications: {},
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthState) : empty;
  } catch {
    return empty;
  }
};

/** 再読み込みで消えないよう localStorage に置く。 */
export const authState = load();

export const persistAuth = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));
};

export const nextId = () => uuidv7();

export const findByEmail = (email: string): AuthUser | undefined =>
  authState.users.find((u) => u.email === email.toLowerCase());

export const findById = (id: string): AuthUser | undefined =>
  authState.users.find((u) => u.id === id);

/** サインイン中の利用者。未サインインなら `undefined`。 */
export const currentUser = (): AuthUser | undefined =>
  authState.users.find((u) => u.id === authState.sessionUserId);
