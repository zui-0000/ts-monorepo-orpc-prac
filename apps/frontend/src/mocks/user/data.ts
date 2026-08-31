import type { UpdateUserProfileRequest } from "@orpc-prac/contract";

/**
 * ドメインが持つプロフィール。**backend の `t_user_profile` にあたる**
 * (設計関連/ADR-09)。利用者 1 人につき 0..1 件で、未入力なら行そのものが無い。
 */
type ProfileTable = Record<string, UpdateUserProfileRequest>;

const STORAGE_KEY = "orpc-prac.mock.user";

const load = (): ProfileTable => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProfileTable) : {};
  } catch {
    return {};
  }
};

const profiles = load();

const persist = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
};

/** 未入力なら `null`。「行が無い」を表す (契約の GetUserResponse と同じ)。 */
export const findProfile = (userId: string): UpdateUserProfileRequest | null =>
  profiles[userId] ?? null;

/** 全置換。PUT の意味に合わせる。 */
export const saveProfile = (
  userId: string,
  profile: UpdateUserProfileRequest,
) => {
  profiles[userId] = profile;
  persist();
};
