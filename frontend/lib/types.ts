export type User = {
  id: string;
  username: string;
  email: string | null;
  display_name: string;
  is_active: boolean;
  roles: string[];
  permissions: string[];
  created_at: string;
  updated_at: string;
};
export type Role = {
  id: string;
  code: string;
  description: string;
  permissions: string[];
};
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};
export type AuditEvent = {
  id: string;
  actor_id: string | null;
  actor_username: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  occurred_at: string;
  details: Record<string, unknown>;
};
