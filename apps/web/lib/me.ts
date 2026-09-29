import 'server-only';
import { cache } from 'react';
import type { MeResponse } from '@tb/domain';
import { api } from './api';
import { accessToken } from './session';

/** Current user for this request (null when signed out or the token is invalid). */
export const getMe = cache(async (): Promise<MeResponse | null> => {
  if (!(await accessToken())) return null;
  try {
    return await api<MeResponse>('/me');
  } catch {
    return null;
  }
});
