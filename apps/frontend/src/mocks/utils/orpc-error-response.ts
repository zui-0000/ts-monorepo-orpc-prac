import { HttpResponse } from "msw";

/** 契約が定めるエラー。`data` を持つものもあるが、ここでは使わない。 */
interface ContractError {
  readonly status: number;
  readonly message: string;
}

/**
 * oRPC の封筒で失敗を返す (設計関連/ADR-01)。
 *
 * ```json
 * { "defined": true, "code": "FORBIDDEN_ERROR", "status": 403, "message": "..." }
 * ```
 *
 * **`status` と `message` は契約の定義から引く。** モックへ書き写すと実物とずれる
 * (実際に UNAUTHORIZED の文言がずれていた)。`data` を持つのは追加情報があるものだけ。
 */
export const orpcErrorResponse = (
  code: string,
  error: ContractError,
  data?: unknown,
) =>
  HttpResponse.json(
    {
      defined: true,
      code,
      status: error.status,
      message: error.message,
      ...(data === undefined ? {} : { data }),
    },
    { status: error.status },
  );
