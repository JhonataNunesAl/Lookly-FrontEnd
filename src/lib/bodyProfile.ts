import api from './api';
import { BodyProfileResponse, BodyProfileUpdate } from '../types/api';

export async function fetchBodyProfile(): Promise<BodyProfileResponse> {
  const { data } = await api.get<BodyProfileResponse>('/body-profile/me');
  return data;
}

export async function updateBodyProfile(dados: BodyProfileUpdate): Promise<BodyProfileResponse> {
  const { data } = await api.put<BodyProfileResponse>('/body-profile/me', dados);
  return data;
}

export async function grantAiConsent(consentVersion: string): Promise<BodyProfileResponse> {
  const { data } = await api.post<BodyProfileResponse>('/body-profile/me/consent', {
    consent_version: consentVersion,
  });
  return data;
}

export async function revokeAiConsent(): Promise<BodyProfileResponse> {
  const { data } = await api.delete<BodyProfileResponse>('/body-profile/me/consent');
  return data;
}
