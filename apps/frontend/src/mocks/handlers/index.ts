import { authHandlers } from "./auth-handlers";
import { userHandlers } from "./user-handlers";

export const handlers = [...authHandlers, ...userHandlers];
