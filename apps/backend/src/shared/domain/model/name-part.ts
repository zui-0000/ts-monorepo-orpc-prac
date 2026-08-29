import * as v from "valibot";

/**
 * 氏名の一部の書式 (姓・名などの構成要素 / 未 brand・共有ドメイン)。
 *
 * 各コンテキストの値オブジェクトは、これに固有の brand を重ねて定義する:
 *   export const FamilyNameSchema = v.pipe(NamePartSchema, v.brand("User.FamilyName"));
 *
 * brand の接頭辞をコンテキスト名にする理由は `uuid.ts` にまとめてある。
 *
 * `PersonName` と呼ばないのは、それだとフルネームに読めるため。実際に入るのは
 * 姓か名という**一部**である。
 *
 * value-objects/ に入れないのは、このリポジトリで値オブジェクトの目印が brand
 * (名目的型付け) であり、これはそれを持たないから。**brand を重ねて初めて
 * 値オブジェクトになる素材**で、`Uuid` と同じ扱いになる。
 */
export const NamePartSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(50),
);

export type NamePart = v.InferOutput<typeof NamePartSchema>;
