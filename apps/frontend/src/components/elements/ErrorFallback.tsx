import type { FallbackProps } from "react-error-boundary";
import { getErrorMessage } from "react-error-boundary";

export const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <section role="alert">
    <h2>表示できませんでした</h2>
    <p>{getErrorMessage(error) ?? "原因の分からない失敗が起きました"}</p>
    <button type="button" onClick={resetErrorBoundary}>
      再試行
    </button>
  </section>
);
