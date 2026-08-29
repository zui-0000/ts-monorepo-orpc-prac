import { QueryClient } from "@tanstack/react-query";

/**
 * 取得結果の保管庫。
 *
 * **provider とルータの両方が同じものを要る。** ルータの beforeLoad は React の
 * 外で動くため、provider から受け取れず直接参照する必要がある。
 */
export const queryClient = new QueryClient();
