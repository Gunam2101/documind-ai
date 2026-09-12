import React from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { HelpCircle, FileText, Search, MessageSquare, ShieldCheck, Mail } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const HelpPage: React.FC = () => {
  const faqs = [
    {
      q: 'How does DocuMind AI process my PDF documents?',
      a: 'When you upload a PDF, DocuMind AI extracts page text, splits it into semantic chunks, converts text into vector embeddings, and indexes them in FAISS for fast similarity retrieval.'
    },
    {
      q: 'Does DocuMind AI hallucinate information?',
      a: 'No. The AI system prompt is strictly grounded to answer using only your uploaded document context. If an answer is not present, it clearly states: "I couldn\'t find this information in your documents."'
    },
    {
      q: 'Are my uploaded documents safe and private?',
      a: 'Yes. All documents, text chunks, and vector indices are isolated to your account ID with database-level ownership checks.'
    },
    {
      q: 'What file formats are supported?',
      a: 'DocuMind AI currently supports PDF documents up to 25MB in size.'
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto shadow-sm">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">Help & Support</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Learn how to use DocuMind AI and find answers to common questions.
          </p>
        </div>

        {/* FAQs */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-gray-200/80 dark:border-gray-800 space-y-2 shadow-xs">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{faq.q}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Support Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-center space-y-4 shadow-xl">
          <Mail className="w-8 h-8 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Need additional assistance?</h3>
            <p className="text-xs text-brand-100 max-w-sm mx-auto">Our support team is always ready to help you with any questions or issues.</p>
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={() => alert("Contact support at support@documind.ai")}
            className="text-brand-700 bg-white hover:bg-gray-100"
          >
            Contact Support
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};
