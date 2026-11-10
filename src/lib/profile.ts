import api from './api';
import { ProfileResponse, ProfileUpdate } from '../types/api';

/** Meu perfil (nome, foto, papel). */
export async function fetchMyProfile(): Promise<ProfileResponse> {
  const { data } = await api.get<ProfileResponse>('/profiles/me');
  return data;
}

/** Atualiza só os campos enviados (ex.: `{ avatar_url }` depois de subir a foto). */
export async function updateMyProfile(dados: ProfileUpdate): Promise<ProfileResponse> {
  const { data } = await api.put<ProfileResponse>('/profiles/me', dados);
  return data;
}

/** Exclui a conta e os dados (e a loja, se houver) — irreversível. O servidor exige a
 *  palavra de confirmação; 409 quando há pedidos registrados. */
export async function excluirMinhaConta(): Promise<void> {
  await api.delete('/profiles/me', { data: { confirmacao: 'EXCLUIR' } });
}
