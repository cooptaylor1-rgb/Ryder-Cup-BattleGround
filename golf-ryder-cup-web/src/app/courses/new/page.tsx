'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Save,
  Plus,
  Trash2,
  Flag,
  MapPin,
  FileText,
} from 'lucide-react';
import { createCourseProfile } from '@/lib/services/courseLibraryService';
import { useUIStore } from '@/lib/stores';

/**
 * NEW COURSE PAGE
 *
 * Create a new course profile for the course library.
 * Allows manual entry of course details and tee sets.
 */

interface TeeSetInput {
  id: string;
  name: string;
  color: string;
  rating: string;
  slope: string;
  par: string;
  totalYardage: string;
}

const TEE_COLORS = [
  { name: 'Black', color: '#1a1a1a' },
  { name: 'Blue', color: '#2563eb' },
  { name: 'White', color: '#f1f5f9' },
  { name: 'Gold', color: '#ca8a04' },
  { name: 'Red', color: '#dc2626' },
  { name: 'Green', color: '#16a34a' },
];

export default function NewCoursePage() {
  const router = useRouter();
  const { showToast } = useUIStore();

  const [courseName, setCourseName] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [teeSets, setTeeSets] = useState<TeeSetInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTeeSet = () => {
    const newTeeSet: TeeSetInput = {
      id: crypto.randomUUID(),
      name: '',
      color: '#2563eb',
      rating: '',
      slope: '',
      par: '72',
      totalYardage: '',
    };
    setTeeSets([...teeSets, newTeeSet]);
  };

  const handleRemoveTeeSet = (id: string) => {
    setTeeSets(teeSets.filter(ts => ts.id !== id));
  };

  const handleUpdateTeeSet = (id: string, field: keyof TeeSetInput, value: string) => {
    setTeeSets(teeSets.map(ts =>
      ts.id === id ? { ...ts, [field]: value } : ts
    ));
  };

  const handleSubmit = async () => {
    if (!courseName.trim()) {
      showToast('error', 'Please enter a course name');
      return;
    }

    setIsSubmitting(true);

    try {
      // Default 18-hole par array (assumes par 72 course)
      const defaultHolePars = [4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5];
      // Default handicap ranks 1-18
      const defaultHoleHandicaps = [1, 3, 17, 5, 7, 9, 15, 11, 13, 2, 4, 18, 6, 8, 10, 16, 12, 14];

      const teeSetData = teeSets
        .filter(ts => ts.name.trim())
        .map(ts => ({
          name: ts.name,
          color: ts.color,
          rating: parseFloat(ts.rating) || 72.0,
          slope: parseInt(ts.slope) || 113,
          par: parseInt(ts.par) || 72,
          holePars: defaultHolePars,
          holeHandicaps: defaultHoleHandicaps,
          totalYardage: parseInt(ts.totalYardage) || undefined,
        }));

      await createCourseProfile(
        {
          name: courseName.trim(),
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        teeSetData
      );

      showToast('success', 'Course added to library');
      router.push('/courses');
    } catch {
      showToast('error', 'Failed to create course');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain" style={{ background: 'var(--canvas)' }}>
      {/* Premium Header */}
      <header className="header-premium">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/courses"
              className="p-2 -ml-2 press-scale"
              style={{ color: 'var(--ink-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <ChevronLeft size={22} strokeWidth={1.75} />
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-glow-green)',
                }}
              >
                <Flag size={16} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <span className="type-overline" style={{ letterSpacing: '0.1em' }}>Add Course</span>
                <p className="type-caption truncate" style={{ marginTop: '2px' }}>
                  Enter course details
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-premium"
            style={{ padding: 'var(--space-2) var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <Save size={16} />
            Save
          </button>
        </div>
      </header>

      <main className="container-editorial">
        {/* Course Details */}
        <section className="section">
          <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>Course Details</h2>

          <div className="space-y-4">
            <div>
              <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                <Flag size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Course Name *
              </label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="input"
                placeholder="e.g., Augusta National"
              />
            </div>

            <div>
              <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                <MapPin size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input"
                placeholder="e.g., Augusta, GA"
              />
            </div>

            <div>
              <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                <FileText size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
                rows={3}
                placeholder="Any additional notes about the course..."
              />
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* Tee Sets */}
        <section className="section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <h2 className="type-overline">Tee Sets</h2>
            <button
              onClick={handleAddTeeSet}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)' }}
            >
              <Plus size={16} />
              Add Tee
            </button>
          </div>

          {teeSets.length === 0 ? (
            <div className="card text-center" style={{ padding: 'var(--space-6)' }}>
              <p className="type-caption" style={{ marginBottom: 'var(--space-3)' }}>
                No tee sets added yet. Add tee sets to include rating and slope information.
              </p>
              <button onClick={handleAddTeeSet} className="btn btn-primary">
                Add First Tee Set
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {teeSets.map((teeSet) => (
                <div key={teeSet.id} className="card" style={{ padding: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: teeSet.color,
                          border: teeSet.color === '#f1f5f9' ? '1px solid var(--rule)' : 'none',
                        }}
                      />
                      <span className="type-title-sm">{teeSet.name || 'New Tee Set'}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveTeeSet(teeSet.id)}
                      className="p-2 press-scale"
                      style={{ color: 'var(--error)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 'var(--space-3)' }}>
                    <div>
                      <label className="type-micro" style={{ display: 'block', marginBottom: '4px' }}>Name</label>
                      <input
                        type="text"
                        value={teeSet.name}
                        onChange={(e) => handleUpdateTeeSet(teeSet.id, 'name', e.target.value)}
                        className="input"
                        placeholder="e.g., Blue"
                      />
                    </div>
                    <div>
                      <label className="type-micro" style={{ display: 'block', marginBottom: '4px' }}>Color</label>
                      <select
                        value={teeSet.color}
                        onChange={(e) => handleUpdateTeeSet(teeSet.id, 'color', e.target.value)}
                        className="input"
                      >
                        {TEE_COLORS.map(c => (
                          <option key={c.color} value={c.color}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="type-micro" style={{ display: 'block', marginBottom: '4px' }}>Rating</label>
                      <input
                        type="number"
                        step="0.1"
                        value={teeSet.rating}
                        onChange={(e) => handleUpdateTeeSet(teeSet.id, 'rating', e.target.value)}
                        className="input"
                        placeholder="72.0"
                      />
                    </div>
                    <div>
                      <label className="type-micro" style={{ display: 'block', marginBottom: '4px' }}>Slope</label>
                      <input
                        type="number"
                        value={teeSet.slope}
                        onChange={(e) => handleUpdateTeeSet(teeSet.id, 'slope', e.target.value)}
                        className="input"
                        placeholder="113"
                      />
                    </div>
                    <div>
                      <label className="type-micro" style={{ display: 'block', marginBottom: '4px' }}>Par</label>
                      <input
                        type="number"
                        value={teeSet.par}
                        onChange={(e) => handleUpdateTeeSet(teeSet.id, 'par', e.target.value)}
                        className="input"
                        placeholder="72"
                      />
                    </div>
                    <div>
                      <label className="type-micro" style={{ display: 'block', marginBottom: '4px' }}>Yards</label>
                      <input
                        type="number"
                        value={teeSet.totalYardage}
                        onChange={(e) => handleUpdateTeeSet(teeSet.id, 'totalYardage', e.target.value)}
                        className="input"
                        placeholder="6500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
