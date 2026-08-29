import { Link } from "@tanstack/react-router";
import type { FC } from "react";

export const NotFoundPage: FC = () => (
  <p>
    ページが見つかりません。<Link to="/">トップへ</Link>
  </p>
);
