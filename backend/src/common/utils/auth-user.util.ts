import { RequestUser } from '../types/request-user.type';

export function getRequestUserId(user: RequestUser | undefined): number {
  return Number(user?.userId || user?.id || 0);
}
