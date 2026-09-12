import { api } from './api';
import { Document } from '../types';

async function parseBlobErrorMessage(err: any): Promise<string> {
  if (err.response && err.response.data instanceof Blob) {
    try {
      const text = await err.response.data.text();
      const json = JSON.parse(text);
      if (json.detail) return json.detail;
    } catch (_) {}
  }
  if (err.response?.data?.detail) return err.response.data.detail;
  if (err.response?.status === 404) return 'Document file is missing from server storage.';
  if (err.response?.status === 403) return 'You do not have permission to access this document.';
  return err.message || 'An error occurred while accessing the document PDF.';
}

export const documentApi = {
  upload: async (file: File, onProgress?: (percent: number) => void): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return res.data;
  },

  list: async (search?: string): Promise<{ documents: Document[]; total: number }> => {
    const res = await api.get('/documents', {
      params: { search }
    });
    return res.data;
  },

  get: async (id: string): Promise<Document> => {
    const res = await api.get(`/documents/${id}`);
    return res.data;
  },

  viewPdf: async (id: string): Promise<void> => {
    try {
      const response = await api.get(`/documents/${id}/view`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const newTab = window.open(blobUrl, '_blank');
      if (!newTab) {
        throw new Error('Pop-up window blocked. Please allow pop-ups to view PDF.');
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err: any) {
      const msg = await parseBlobErrorMessage(err);
      throw new Error(msg);
    }
  },

  downloadPdf: async (id: string, fallbackFilename?: string): Promise<void> => {
    try {
      const response = await api.get(`/documents/${id}/download`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      let downloadFilename = fallbackFilename || 'document.pdf';
      const disposition = response.headers['content-disposition'];
      if (disposition) {
        const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          downloadFilename = filenameMatch[1];
        }
      }

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err: any) {
      const msg = await parseBlobErrorMessage(err);
      throw new Error(msg);
    }
  },

  getPdfBlobUrl: async (id: string): Promise<string> => {
    try {
      const response = await api.get(`/documents/${id}/view`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    } catch (err: any) {
      const msg = await parseBlobErrorMessage(err);
      throw new Error(msg);
    }
  },

  update: async (id: string, filename: string): Promise<Document> => {
    const res = await api.patch(`/documents/${id}`, { filename });
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },

  retry: async (id: string): Promise<Document> => {
    const res = await api.post(`/documents/${id}/retry`);
    return res.data;
  }
};
