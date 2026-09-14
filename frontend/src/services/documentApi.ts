import { api } from './api';
import { Document } from '../types';
import { DEMO_DOCUMENTS } from './demoData';

let demoDocumentsStore = [...DEMO_DOCUMENTS];

function isDemoMode(): boolean {
  return localStorage.getItem('documind_demo_mode') === 'true';
}

function createSamplePdfBlob(): Blob {
  const pdfHeader = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kinds [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length 120 >> stream
BT
/F1 18 Tf
50 720 Td
(DocuMind AI - Demo Mode Sample Document) Tj
0 -36 Td
/F1 12 Tf
(This is a sample document for testing in Demo Mode.) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000244 00000 n
0000000313 00000 n
trailer << /Size 6 /Root 1 0 R >>
startxref
485
%%EOF`;
  return new Blob([pdfHeader], { type: 'application/pdf' });
}

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
    if (isDemoMode()) {
      if (onProgress) {
        onProgress(50);
        setTimeout(() => onProgress(100), 200);
      }
      const newDoc: Document = {
        id: `demo-doc-${Date.now()}`,
        user_id: 'demo-user-001',
        filename: file.name,
        original_filename: `${file.name} (Demo Upload)`,
        file_size: file.size,
        page_count: 15,
        status: 'READY',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      demoDocumentsStore.unshift(newDoc);
      return newDoc;
    }

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
    if (isDemoMode()) {
      let docs = [...demoDocumentsStore];
      if (search) {
        docs = docs.filter(d => d.original_filename.toLowerCase().includes(search.toLowerCase()));
      }
      return { documents: docs, total: docs.length };
    }

    const res = await api.get('/documents', {
      params: { search }
    });
    return res.data;
  },

  get: async (id: string): Promise<Document> => {
    if (isDemoMode()) {
      const doc = demoDocumentsStore.find(d => d.id === id) || demoDocumentsStore[0];
      return doc;
    }

    const res = await api.get(`/documents/${id}`);
    return res.data;
  },

  viewPdf: async (id: string): Promise<void> => {
    if (isDemoMode()) {
      const blob = createSamplePdfBlob();
      const blobUrl = URL.createObjectURL(blob);
      const newTab = window.open(blobUrl, '_blank');
      if (!newTab) {
        throw new Error('Pop-up window blocked. Please allow pop-ups to view PDF.');
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return;
    }

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
    if (isDemoMode()) {
      const blob = createSamplePdfBlob();
      const blobUrl = URL.createObjectURL(blob);
      const doc = demoDocumentsStore.find(d => d.id === id);
      const downloadFilename = doc?.filename || fallbackFilename || 'demo_document.pdf';

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return;
    }

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
    if (isDemoMode()) {
      const blob = createSamplePdfBlob();
      return URL.createObjectURL(blob);
    }

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
    if (isDemoMode()) {
      const doc = demoDocumentsStore.find(d => d.id === id);
      if (doc) {
        doc.original_filename = filename;
      }
      return doc || demoDocumentsStore[0];
    }

    const res = await api.patch(`/documents/${id}`, { filename });
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    if (isDemoMode()) {
      demoDocumentsStore = demoDocumentsStore.filter(d => d.id !== id);
      return;
    }

    await api.delete(`/documents/${id}`);
  },

  retry: async (id: string): Promise<Document> => {
    if (isDemoMode()) {
      const doc = demoDocumentsStore.find(d => d.id === id);
      if (doc) doc.status = 'READY';
      return doc || demoDocumentsStore[0];
    }

    const res = await api.post(`/documents/${id}/retry`);
    return res.data;
  }
};
