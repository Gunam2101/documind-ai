import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { FolderKanban, Plus, FileText, Trash2, ArrowRight } from 'lucide-react';
import { collectionApi } from '../services/collectionApi';
import { documentApi } from '../services/documentApi';
import { Collection, Document } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

export const CollectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [colls, docsRes] = await Promise.all([
        collectionApi.list(),
        documentApi.list()
      ]);
      setCollections(colls);
      setAllDocs(docsRes.documents);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await collectionApi.create({
        name: name.trim(),
        description: description.trim(),
        document_ids: selectedDocIds
      });
      setIsModalOpen(false);
      setName('');
      setDescription('');
      setSelectedDocIds([]);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this collection?')) {
      await collectionApi.delete(id);
      loadData();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">Collections</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Organize your documents into collections to chat with specific groups of PDFs.
            </p>
          </div>

          <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            New Collection
          </Button>
        </div>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((coll) => (
            <div
              key={coll.id}
              onClick={() => navigate(`/collections/${coll.id}`)}
              className="bg-white dark:bg-dark-surface border border-gray-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-brand-400 cursor-pointer transition-all flex flex-col justify-between space-y-4 group relative"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <button
                    onClick={(e) => handleDelete(coll.id, e)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 transition-colors">
                  {coll.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {coll.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400">
                <span>{coll.documents.length} documents</span>
                <span className="text-brand-600 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}

          {/* "+ Create Collection" Card matching screenshot */}
          <div
            onClick={() => setIsModalOpen(true)}
            className="border-2 border-dashed border-gray-300 dark:border-gray-800 hover:border-brand-500 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-brand-600 min-h-[180px]"
          >
            <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <span className="font-bold text-sm text-gray-900 dark:text-gray-100">Create Collection</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Collection">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Collection Name"
            placeholder="e.g. Research Papers"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              placeholder="Brief description of this collection..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-dark-surface border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
            Create Collection
          </Button>
        </form>
      </Modal>
    </DashboardLayout>
  );
};
