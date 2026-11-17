import "server-only";
import { serverApi } from "./server-api";
export type ServiceStatus = { available: boolean; message: string };
export type SystemStatus = {
  backend: ServiceStatus;
  database: ServiceStatus;
  checkedAt: string;
};
export async function getSystemStatus(): Promise<SystemStatus> {
  return serverApi<SystemStatus>("/system/status");
}
