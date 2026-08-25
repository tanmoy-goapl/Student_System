'use client';

import { useState } from 'react';
import { X, Loader2, Plus, Check, Search } from 'lucide-react';

interface AddGeneralTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PREDEFINED_CATEGORIES = [
  {
    name: 'Computer Science',
    topics: [
      'Frontend Development',
      'Backend Development',
      'Full-Stack Development',
      'Data Science',
      'Databases',
      'Computer Networks',
      'Operating Systems',
      'Machine Learning',
    ],
  },
  {
    name: 'Mathematics',
    topics: [
      'Calculus',
      'Algebra',
      'Probability',
      'Statistics',
      'Trigonometry',
      'Linear Algebra',
    ],
  },
  {
    name: 'Physics',
    topics: [
      'Mechanics',
      'Thermodynamics',
      'Electromagnetism',
      'Wave Optics',
      'Ray Optics',
    ],
  },
  {
    name: 'Chemistry',
    topics: [
      'Organic Chemistry',
      'Inorganic Chemistry',
      'Physical Chemistry',
      'Biochemistry',
    ],
  },
  {
    name: 'General Knowledge',
    topics: [
      'World History',
      'Geography',
      'General Science',
      'Current Affairs',
    ],
  },
];

export default function AddGeneralTopicModal({
  isOpen,
  onClose,
  onSuccess,
}: AddGeneralTopicModalProps) {
  const [selectedTopics, setSelectedTopics] = useState<Array<{ name: string; category: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Topic Form
  const [customTopicName, setCustomTopicName] = useState('');
  const [customCategory, setCustomCategory] = useState('General Topics');
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleTopic = (topic: string, category: string) => {
    const isSelected = selectedTopics.some((t) => t.name === topic);
    if (isSelected) {
      setSelectedTopics(selectedTopics.filter((t) => t.name !== topic));
    } else {
      setSelectedTopics([...selectedTopics, { name: topic, category }]);
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopicName.trim()) return;

    const categoryName =
      customCategory === 'Other'
        ? customSubjectInput.trim() || 'General Topics'
        : customCategory;

    // Check if already in selected
    const exists = selectedTopics.some(
      (t) => t.name.toLowerCase() === customTopicName.trim().toLowerCase()
    );

    if (!exists) {
      setSelectedTopics([
        ...selectedTopics,
        { name: customTopicName.trim(), category: categoryName },
      ]);
    }

    setCustomTopicName('');
    setIsAddingCustom(false);
  };

  const handleSubmit = async () => {
    if (selectedTopics.length === 0) {
      setError('Please select or create at least one topic.');
      return;
    }

    setLoading(true);
    setError(null);

    const userId = localStorage.getItem('user_id');
    if (!userId) {
      setError('Authentication required. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      // Send API requests sequentially or via Promise.all
      await Promise.all(
        selectedTopics.map((topic) =>
          fetch('/api/practice/custom-topics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              student_id: parseInt(userId, 10),
              topic_name: topic.name,
              subject_name: topic.category,
            }),
          }).then((res) => {
            if (!res.ok) throw new Error('Failed to add topic: ' + topic.name);
            return res.json();
          })
        )
      );

      setSelectedTopics([]);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while adding topics.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#0B0F1C] p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Add Practice Topics
          </h2>
          <p className="text-xs text-white/45 mt-1">
            Choose from subjects below or type a custom topic to generate custom AI quizzes.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Search & Custom form toggle */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search general topics..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#5B5FFF]/50 transition"
            />
          </div>
          <button
            onClick={() => setIsAddingCustom(!isAddingCustom)}
            className="flex items-center gap-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs px-4 py-2 rounded-xl transition"
          >
            <Plus className="h-3 w-3" /> Custom
          </button>
        </div>

        {/* Custom Topic Form (conditional) */}
        {isAddingCustom && (
          <form
            onSubmit={handleAddCustom}
            className="bg-white/[0.02] border border-white/5 rounded-xl p-4 mb-4 space-y-3"
          >
            <h3 className="text-xs font-semibold text-white">Add Custom Topic</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-white/40 font-medium tracking-wider uppercase">Topic Name</label>
                <input
                  type="text"
                  required
                  value={customTopicName}
                  onChange={(e) => setCustomTopicName(e.target.value)}
                  placeholder="e.g. Artifician Intelligence"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#5B5FFF]/50 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-white/40 font-medium tracking-wider uppercase">Subject Category</label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full bg-[#0B0F1C] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#5B5FFF]/50 transition"
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="General Knowledge">General Knowledge</option>
                  <option value="Other">Other (Create Subject)</option>
                </select>
              </div>
            </div>

            {customCategory === 'Other' && (
              <div className="space-y-1">
                <label className="text-[10px] text-white/40 font-medium tracking-wider uppercase">New Subject Name</label>
                <input
                  type="text"
                  required
                  value={customSubjectInput}
                  onChange={(e) => setCustomSubjectInput(e.target.value)}
                  placeholder="e.g. Biology, Economics"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#5B5FFF]/50 transition"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingCustom(false)}
                className="text-white/60 hover:text-white text-xs px-3 py-1 hover:bg-white/5 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#5B5FFF] hover:bg-[#4c4fdb] text-white font-semibold text-xs px-4 py-1 rounded-lg shadow-lg shadow-indigo-500/20 transition"
              >
                Create Topic
              </button>
            </div>
          </form>
        )}

        {/* Scrollable list of predefined categories */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 purple-scrollbar mb-4">
          {PREDEFINED_CATEGORIES.map((cat) => {
            // Filter topics by search query
            const filteredTopics = cat.topics.filter((topic) =>
              topic.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (filteredTopics.length === 0) return null;

            return (
              <div key={cat.name} className="space-y-2">
                <h4 className="text-[10px] uppercase tracking-wider text-white/35 font-semibold">
                  {cat.name}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {filteredTopics.map((topic) => {
                    const isSelected = selectedTopics.some((t) => t.name === topic);
                    return (
                      <button
                        key={topic}
                        onClick={() => toggleTopic(topic, cat.name)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all duration-200 ${
                          isSelected
                            ? 'bg-[#5B5FFF]/10 border-[#5B5FFF]/40 text-[#8F93FF]'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/15 text-white/70 hover:text-white'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-[#8F93FF]" />}
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Summary and Action */}
        <div className="border-t border-white/10 pt-4 flex items-center justify-between">
          <div className="text-xs text-white/50">
            Selected: <span className="text-white font-medium">{selectedTopics.length} topics</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-white/10 hover:bg-white/5 text-white text-xs font-semibold rounded-xl transition disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || selectedTopics.length === 0}
              className="flex items-center gap-1.5 bg-[#5B5FFF] hover:bg-[#4c4fdb] text-white text-xs font-semibold px-5 py-2 rounded-xl shadow-lg shadow-indigo-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {loading ? 'Adding...' : 'Add to Practice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
