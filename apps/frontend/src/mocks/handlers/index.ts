import { authHandlers } from "./auth/handler";
import { userHandlers } from "./user/handler";

export const handlers = [...authHandlers, ...userHandlers];
