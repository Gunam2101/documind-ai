import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ArrowLeft, MessageSquare, Plus, FileText, Trash2 } from 'lucide-react';
import { collectionApi } from '../services/collectionApi';
import { documentApi } from '../services/documentApi';
import { Collection, Document } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

export const CollectionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      const [coll, docsRes] = await Promise.all([
        collectionApi.get(id),
        documentApi.list()
      ]);
      setCollection(coll);
      setAllDocs(docsRes.documents);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAddDocument = async (docId: string) => {
    if (!id) return;
    await collectionApi.addDocument(id, docId);
    loadData();
  };

  const handleRemoveDocument = async (docId: string) => {
    if (!id) return;
    await collectionApi.removeDocument(id, docId);
    loadData();
  };

  if (!collection) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/collections')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{collection.name}</h1>
              <p className="text-xs text-gray-500">{collection.documents.length} documents in this collection</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => setIsAddModalOpen(true)} variant="outline" leftIcon={<Plus className="w-4 h-4" />}>
              Add Document
            </Button>
            <Button onClick={() => navigate(`/chat?collection=${collection.id}`)} leftIcon={<MessageSquare className="w-4 h-4" />}>
              Chat with Collection
            </Button>
          </div>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collection.documents.map((doc) => (
            <div key={doc.id} className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-800 space-y-3 relative group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 truncate">
                  <FileText className="w-5 h-5 text-rose-500 shrink-0" />
                  <span className="font-semibold text-sm truncate">{doc.original_filename}</span>
                </div>
                <button
                  onClick={() => handleRemoveDocument(doc.id)}
                  className="p-1 text-gray-400 hover:text-rose-600 rounded"
                  title="Remove from collection"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Document to Collection">
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {allDocs.map((doc) => {
            const isAlreadyAdded = collection.documents.some(d => d.id === doc.id);
            return (
              <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 text-xs">
                <span className="truncate font-medium">{doc.original_filename}</span>
                <button
                  disabled={isAlreadyAdded}
                  onClick={() => handleAddDocument(doc.id)}
                  className="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-lg font-semibold"
                >
                  {isAlreadyAdded ? 'Added' : 'Add'}
                </button>
              </div>
            );
          })}
        </div>
      </Modal>
    </DashboardLayout>
  );
};
