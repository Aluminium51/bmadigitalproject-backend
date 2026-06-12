export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  SECRETARY: 'secretary',
  ANALYTIC: 'analytic',
  USER: 'user',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];