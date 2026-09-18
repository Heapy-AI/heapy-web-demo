import { createCheckupUploadForm, uploadContentHeaders } from './checkupUpload';
import { apiClient } from '../../shared/api/client';
import {
  CheckupFile,
  ConfirmCheckup,
  HealthConnection,
  OcrJob,
  SamsungPermission,
  CheckupDetail,
  CheckupRecord,
  ConfirmedCheckup,
} from './types';

export const dataConnectionApi = {
  async getCheckup(recordId: string, signal: AbortSignal) {
    return (
      await apiClient.get<CheckupDetail>(
        `/api/checkups/${encodeURIComponent(recordId)}`,
        { signal },
      )
    ).data;
  },
  async getCheckups(signal: AbortSignal) {
    return (
      await apiClient.get<CheckupRecord[]>('/api/checkups', {
        signal,
        params: { limit: 100 },
      })
    ).data;
  },
  async getConnections() {
    return (await apiClient.get<HealthConnection[]>('/api/health-connections'))
      .data;
  },
  async connectSamsung(payload: SamsungPermission, key: string) {
    return (
      await apiClient.post<HealthConnection>(
        '/api/health-connections/samsung',
        payload,
        { headers: { 'Idempotency-Key': key }, timeout: 45000 },
      )
    ).data;
  },
  async uploadCheckup(file: CheckupFile, key: string, signal: AbortSignal) {
    const body = createCheckupUploadForm(file);
    return (
      await apiClient.post<OcrJob>('/api/checkups/ocr-jobs', body, {
        headers: {
          'Idempotency-Key': key,
          ...uploadContentHeaders(),
        },
        timeout: 60000,
        signal,
      })
    ).data;
  },
  async getJob(jobId: string, signal: AbortSignal) {
    return (
      await apiClient.get<OcrJob>(
        `/api/checkups/ocr-jobs/${encodeURIComponent(jobId)}`,
        { signal, timeout: 25000 },
      )
    ).data;
  },
  async cancelJob(jobId: string) {
    await apiClient.delete(
      '/api/checkups/ocr-jobs/' + encodeURIComponent(jobId),
    );
  },
  async confirm(jobId: string, payload: ConfirmCheckup, key: string) {
    return (
      await apiClient.post<ConfirmedCheckup>(
        `/api/checkups/ocr-jobs/${encodeURIComponent(jobId)}/confirm`,
        payload,
        { headers: { 'Idempotency-Key': key }, timeout: 45000 },
      )
    ).data;
  },
};
