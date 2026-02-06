'use client';

import { useState, useCallback } from 'react';
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
  Camera,
  Sparkles,
} from 'lucide-react';
import { createCourseProfile } from '@/lib/services/courseLibraryService';
import { useUIStore } from '@/lib/stores';
import { HoleDataEditor, createDefaultHoles, ScorecardUpload, type HoleData, type ScorecardData, type TeeSetData } from '@/components/course';
import { BottomNav } from '@/components/layout';

/**
 * NEW COURSE PAGE
 *
 * Create a new course profile for the course library.
 * Features:
 * - Manual entry of course details and tee sets
 * - Hole-by-hole data entry (par, handicap, yardage)
 * - Scorecard photo/PDF upload with AI OCR extraction
 */

interface TeeSetInput {
  id: string;
  name: string;
  color: string;
  rating: string;
  slope: string;
  par: string;
  totalYardage: string;
  holes: HoleData[];
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
  const [showScorecardUpload, setShowScorecardUpload] = useState(false);

  const handleAddTeeSet = useCallback(() => {
    const newTeeSet: TeeSetInput = {
      id: crypto.randomUUID(),
      name: '',
      color: '#2563eb',
      rating: '',
      slope: '',
      par: '72',
      totalYardage: '',
      holes: createDefaultHoles(),
    };
    setTeeSets(prev => [...prev, newTeeSet]);
  }, []);

  const handleRemoveTeeSet = useCallback((id: string) => {
    setTeeSets(prev => prev.filter(ts => ts.id !== id));
  }, []);

  const handleUpdateTeeSet = useCallback((id: string, field: keyof TeeSetInput, value: string | HoleData[]) => {
    setTeeSets(prev => prev.map(ts =>
      ts.id === id ? { ...ts, [field]: value } : ts
    ));
  }, []);

  const handleUpdateHoles = useCallback((teeSetId: string, holes: HoleData[]) => {
    setTeeSets(prev => prev.map(ts => {
      if (ts.id !== teeSetId) return ts;
      // Update total par based on hole data
      const totalPar = holes.reduce((sum, h) => sum + h.par, 0);
      const totalYardage = holes.reduce((sum, h) => sum + (h.yardage || 0), 0);
      return {
        ...ts,
        holes,
        par: String(totalPar),
        totalYardage: totalYardage > 0 ? String(totalYardage) : ts.totalYardage,
      };
    }));
  }, []);

  const handleScorecardData = useCallback((data: ScorecardData) => {
    // Update course name if provided and empty
    if (data.courseName && !courseName) {
      setCourseName(data.courseName);
    }

    // Get par/handicap info from the base holes array
    const baseHoles = data.holes;

    // If teeSets array is provided, create a tee set for each one
    if (data.teeSets && data.teeSets.length > 0) {
      const newTeeSets: TeeSetInput[] = data.teeSets.map((tee: TeeSetData) => {
        // Merge the yardages from the tee set with par/handicap from base holes
        const holes: HoleData[] = baseHoles.map((hole, index) => ({
          par: hole.par,
          handicap: hole.handicap,
          yardage: tee.yardages[index] ?? null,
        }));

        const totalPar = holes.reduce((sum, h) => sum + h.par, 0);
        const totalYardage = tee.yardages.reduce((sum: number, y) => sum + (y || 0), 0);

        // Map tee color name to hex color
        const colorHex = TEE_COLORS.find(c =>
          c.name.toLowerCase() === (tee.name || '').toLowerCase() ||
          c.name.toLowerCase() === (tee.color || '').toLowerCase()
        )?.color || tee.color || '#2563eb';

        return {
          id: crypto.randomUUID(),
          name: tee.name || 'Unknown Tees',
          color: colorHex,
          rating: tee.rating ? String(tee.rating) : '',
          slope: tee.slope ? String(tee.slope) : '',
          par: String(totalPar),
          totalYardage: totalYardage > 0 ? String(totalYardage) : '',
          holes,
        };
      });

      setTeeSets(prev => [...prev, ...newTeeSets]);
      showToast('success', `Imported ${newTeeSets.length} tee set${newTeeSets.length > 1 ? 's' : ''} from scorecard!`);
    } else {
      // Legacy single tee set handling (backward compatibility)
      const totalPar = baseHoles.reduce((sum, h) => sum + h.par, 0);
      const totalYardage = baseHoles.reduce((sum, h) => sum + (h.yardage || 0), 0);

      const newTeeSet: TeeSetInput = {
        id: crypto.randomUUID(),
        name: data.teeName || 'Scanned Tees',
        color: '#2563eb',
        rating: data.rating ? String(data.rating) : '',
        slope: data.slope ? String(data.slope) : '',
        par: String(totalPar),
        totalYardage: totalYardage > 0 ? String(totalYardage) : '',
        holes: baseHoles,
      };

      setTeeSets(prev => [...prev, newTeeSet]);
      showToast('success', 'Scorecard data imported!');
    }

    setShowScorecardUpload(false);
  }, [courseName, showToast]);

  const handleSubmit = async () => {
    if (!courseName.trim()) {
      showToast('error', 'Please enter a course name');
      return;
    }

    setIsSubmitting(true);

    try {
      const teeSetData = teeSets
        .filter(ts => ts.name.trim())
        .map(ts => ({
          name: ts.name,
          color: ts.color,
          rating: parseFloat(ts.rating) || 72.0,
          slope: parseInt(ts.slope) || 113,
          par: parseInt(ts.par) || 72,
          holePars: ts.holes.map(h => h.par),
          holeHandicaps: ts.holes.map(h => h.handicap),
          yardages: ts.holes.map(h => h.yardage).filter((y): y is number => y !== null),
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
      {/* Scorecard Upload Modal */}
      {showScorecardUpload && (
        <ScorecardUpload
          onDataExtracted={handleScorecardData}
          onClose={() => setShowScorecardUpload(false)}
        />
      )}

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
        {/* Scan Scorecard CTA */}
        <section className="section">
          <button
            onClick={() => setShowScorecardUpload(true)}
            className="w-full p-4 rounded-xl border-2 border-dashed transition-all press-scale"
            style={{
              borderColor: 'var(--masters)',
              background: 'linear-gradient(135deg, var(--masters-soft) 0%, transparent 100%)',
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <div
                className="flex items-center justify-center"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--masters)',
                }}
              >
                <Camera size={24} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="type-title-sm">Scan Scorecard</span>
                  <Sparkles size={14} style={{ color: 'var(--masters)' }} />
                </div>
                <p className="type-caption" style={{ color: 'var(--ink-secondary)' }}>
                  Upload a photo or PDF to auto-fill hole data
                </p>
              </div>
            </div>
          </button>
        </section>

        <div className="flex items-center gap-4 my-4">
          <hr className="flex-1 border-t" style={{ borderColor: 'var(--rule)' }} />
          <span className="type-micro" style={{ color: 'var(--ink-muted)' }}>OR ENTER MANUALLY</span>
          <hr className="flex-1 border-t" style={{ borderColor: 'var(--rule)' }} />
        </div>

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
                No tee sets added yet. Scan a scorecard above or add tee sets manually.
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
                        readOnly
                        style={{ background: 'var(--surface-elevated)', cursor: 'default' }}
                        title="Calculated from hole data"
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

                  {/* Hole Data Editor */}
                  <HoleDataEditor
                    holes={teeSet.holes}
                    onChange={(holes) => handleUpdateHoles(teeSet.id, holes)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
