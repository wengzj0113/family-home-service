import { ApiResponse } from '../types/api-response.type';

export function ok<T>(data: T, message = 'ok'): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
  };
}
