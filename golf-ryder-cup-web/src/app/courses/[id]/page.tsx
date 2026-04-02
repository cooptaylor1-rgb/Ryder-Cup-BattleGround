'use client';

import { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Flag,
  MapPin,
  Trash2,
  Plus,
  Save,
  FileText,
  Camera,
  Sparkles,
} from 'lucide-react';
import { db } from '@/lib/db';
import { deleteCourseProfile, updateCourseProfile, addTeeSetProfile } from '@/lib/services/courseLibraryService';
import { useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { HoleDataEditor, createDefaultHoles, ScorecardUpload, type HoleData, type ScorecardData, type TeeSetData } from '@/components/course';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import type { TeeSetProfile } from '@/lib/types/courseProfile';

/**
 * COURSE DETAIL PAGE
 *
 * View and edit an existing course profile from the library.
 */

const TEE_COLORS = [
  { name: 'Black', color: '#1a1a1a' },
  { name: 'Blue', color: '#2563eb' },
  { name: 'White', color: '#f1f5f9' },
  { name: 'Gold', color: '#ca8a04' },
  { name: 'Red', color: '#dc2626' },
  { name: 'Green', color: '#16a34a' },
  { name: 'Silver', color: '#9e9e9e' },
  { name: 'Orange', color: '#ea580c' },
  { name: 'Tangerine', color: '#ff9966' },
  { name: 'Maroon', color: '#800000' },
  { name: 'Purple', color: '#7b2d8b' },
  { name: 'Teal', color: '#008080' },
];

interface TeeSetInput {
  id: string;
  name: string;
  color: string;
  rating: string;
  slope: string;
  par: string;
  totalYardage: string;
  holes: HoleData[];
  isExisting?: boolean;
}

function teeSetProfileToInput(tee: TeeSetProfile): TeeSetInput {
  return {
    id: tee.id,
    name: tee.name,
    color: tee.color || '#2563eb',
    rating: tee.rating ? String(tee.rating) : '',
    slope: tee.slope ? String(tee.slope) : '',
    par: tee.par ? String(tee.par) : '72',
    totalYardage: tee.totalYardage ? String(tee.totalYardage) : '',
    holes: (tee.holePars || []).map((par, i) => ({
      par,
      handicap: tee.holeHandicaps?.[i] ?? (i + 1),
      yardage: null,
    })),
    isExisting: true,
  };
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));

  const course = useLiveQuery(
    () => db.courseProfiles.get(courseId),
    [courseId]
  );

  const existingTeeSets = useLiveQuery(
    () => db.teeSetProfiles.where('courseProfileId').equals(courseId).toArray(),
    [courseId]
  );

  const [courseName, setCourseName] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [teeSets, setTeeSets] = useState<TeeSetInput[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScorecardUpload, setShowScorecardUpload] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Use local state if edited, otherwise fall back to DB values
  const displayName = courseName ?? course?.name ?? '';
  const displayLocation = location ?? course?.location ?? '';
  const displayNotes = notes ?? course?.notes ?? '';
  const displayTeeSets = teeSets ?? (existingTeeSets ?? []).map(teeSetProfileToInput);

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
    setTeeSets((prev: TeeSetInput[] | null) => [...(prev ?? displayTeeSets), newTeeSet]);
  }, [displayTeeSets]);

  const handleRemoveTeeSet = useCallback((id: string) => {
    setTeeSets((prev: TeeSetInput[] | null) => (prev ?? displayTeeSets).filter((ts: TeeSetInput) => ts.id !== id));
  }, [displayTeeSets]);

  const handleUpdateTeeSet = useCallback((id: string, field: keyof TeeSetInput, value: string | HoleData[]) => {
    setTeeSets((prev: TeeSetInput[] | null) => (prev ?? displayTeeSets).map((ts: TeeSetInput) =>
      ts.id === id ? { ...ts, [field]: value } : ts
    ));
  }, [displayTeeSets]);

  const handleUpdateHoles = useCallback((teeSetId: string, holes: HoleData[]) => {
    setTeeSets((prev: TeeSetInput[] | null) => (prev ?? displayTeeSets).map((ts: TeeSetInput) => {
      if (ts.id !== teeSetId) return ts;
      const totalPar = holes.reduce((sum: number, h: HoleData) => sum + h.par, 0);
      const totalYardage = holes.reduce((sum: number, h: HoleData) => sum + (h.yardage || 0), 0);
      return {
        ...ts,
        holes,
        par: String(totalPar),
        totalYardage: totalYardage > 0 ? String(totalYardage) : ts.totalYardage,
      };
    }));
  }, [displayTeeSets]);

  const handleScorecardData = useCallback((data: ScorecardData) => {
    if (data.courseName && !displayName) {
      setCourseName(data.courseName);
    }

    const baseHoles = data.holes;

    if (data.teeSets && data.teeSets.length > 0) {
      const newTeeSets: TeeSetInput[] = data.teeSets.map((tee: TeeSetData) => {
        const holes: HoleData[] = baseHoles.map((hole, index) => ({
          par: hole.par,
          handicap: hole.handicap,
          yardage: tee.yardages[index] ?? null,
        }));

        const totalPar = holes.reduce((sum, h) => sum + h.par, 0);
        const totalYardage = tee.yardages.reduce((sum: number, y) => sum + (y || 0), 0);

        const teeName = (tee.name || '').toLowerCase();
        const colorHex = TEE_COLORS.find(c =>
          teeName === c.name.toLowerCase() ||
          teeName.includes(c.name.toLowerCase()) ||
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

      setTeeSets((prev: TeeSetInput[] | null) => [...(prev ?? displayTeeSets), ...newTeeSets]);
      showToast('success', `Imported ${newTeeSets.length} tee set${newTeeSets.length > 1 ? 's' : ''} from scorecard!`);
    } else {
      const totalPar = baseHoles.reduce((sum: number, h: HoleData) => sum + h.par, 0);
      const totalYardage = baseHoles.reduce((sum: number, h: HoleData) => sum + (h.yardage || 0), 0);

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

      setTeeSets((prev: TeeSetInput[] | null) => [...(prev ?? displayTeeSets), newTeeSet]);
      showToast('success', 'Scorecard data imported!');
    }

    setShowScorecardUpload(false);
  }, [displayName, displayTeeSets, showToast]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      showToast('error', 'Please enter a course name');
      return;
    }

    setIsSubmitting(true);

    try {
      const teeSetData = displayTeeSets
        .filter((ts: TeeSetInput) => ts.name.trim())
        .map((ts: TeeSetInput) => ({
          name: ts.name,
          color: ts.color,
          rating: parseFloat(ts.rating) || 72.0,
          slope: parseInt(ts.slope) || 113,
          par: parseInt(ts.par) || 72,
          holePars: ts.holes.map((h: HoleData) => h.par),
          holeHandicaps: ts.holes.map((h: HoleData) => h.handicap),
          yardages: ts.holes.map((h: HoleData) => h.yardage).filter((y): y is number => y !== null),
          totalYardage: parseInt(ts.totalYardage) || undefined,
        }));

      await updateCourseProfile(courseId, {
        name: displayName.trim(),
        location: displayLocation.trim() || undefined,
      });

      // Replace tee sets: delete existing and add new ones
      await db.teeSetProfiles.where('courseProfileId').equals(courseId).delete();
      for (const tee of teeSetData) {
        await addTeeSetProfile(courseId, tee);
      }

      showToast('success', 'Course updated');
      router.push('/courses');
    } catch {
      showToast('error', 'Failed to update course');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCourseProfile(courseId);
      showToast('success', 'Course deleted');
      router.push('/courses');
    } catch {
      showToast('error', 'Could not delete course');
    }
  };

  if (course === undefined || existingTeeSets === undefined) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Course Details"
          subtitle="Loading..."
          icon={<Flag size={16} className="text-[var(--color-accent)]" />}
          onBack={() => router.push('/courses')}
        />
      </div>
    );
  }

  if (course === null) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Course Not Found"
          subtitle="This course may have been deleted"
          icon={<Flag size={16} className="text-[var(--color-accent)]" />}
          onBack={() => router.push('/courses')}
        />
        <main className="container-editorial py-12 text-center">
          <p className="text-[var(--ink-secondary)]">Course not found.</p>
          <Button variant="primary" onClick={() => router.push('/courses')} className="mt-4">
            Back to Library
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      {showScorecardUpload && (
        <ScorecardUpload
          onDataExtracted={handleScorecardData}
          onClose={() => setShowScorecardUpload(false)}
        />
      )}

      <PageHeader
        title={displayName || 'Course Details'}
        subtitle="Edit course profile"
        icon={<Flag size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.push('/courses')}
        rightSlot={
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="btn-premium"
          >
            <Save size={16} />
            Save
          </button>
        }
      />

      <main className="container-editorial">
        {/* Scan Scorecard CTA */}
        <section className="section">
          <button
            onClick={() => setShowScorecardUpload(true)}
            className="w-full p-4 rounded-xl border-2 border-dashed border-[var(--masters)] bg-[linear-gradient(135deg,var(--masters-soft)_0%,transparent_100%)] transition-all press-scale"
          >
            <div className="flex items-center justify-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--masters)]">
                <Camera size={24} className="text-[var(--color-accent)]" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="type-title-sm">Scan Scorecard</span>
                  <Sparkles size={14} className="text-[var(--masters)]" />
                </div>
                <p className="type-caption text-[var(--ink-secondary)]">
                  Upload a photo or PDF to auto-fill hole data
                </p>
              </div>
            </div>
          </button>
        </section>

        <div className="my-4 flex items-center gap-4">
          <hr className="flex-1 border-t border-[var(--rule)]" />
          <span className="type-micro text-[var(--ink-muted)]">COURSE DETAILS</span>
          <hr className="flex-1 border-t border-[var(--rule)]" />
        </div>

        {/* Course Details */}
        <section className="section">
          <div className="space-y-4">
            <div>
              <label className="type-meta mb-[var(--space-2)] block">
                <Flag size={14} className="mr-[6px] inline-block align-middle" />
                Course Name *
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setCourseName(e.target.value)}
                className="input"
                placeholder="e.g., Augusta National"
              />
            </div>

            <div>
              <label className="type-meta mb-[var(--space-2)] block">
                <MapPin size={14} className="mr-[6px] inline-block align-middle" />
                Location
              </label>
              <input
                type="text"
                value={displayLocation}
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
                value={displayNotes}
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
            <Button
              variant="secondary"
              onClick={handleAddTeeSet}
              leftIcon={<Plus size={16} />}
              style={{ padding: 'var(--space-2) var(--space-3)' }}
            >
              Add Tee
            </Button>
          </div>

          {displayTeeSets.length === 0 ? (
            <div className="card text-center" style={{ padding: 'var(--space-6)' }}>
              <p className="type-caption" style={{ marginBottom: 'var(--space-3)' }}>
                No tee sets added yet. Scan a scorecard above or add tee sets manually.
              </p>
              <Button variant="primary" onClick={handleAddTeeSet}>
                Add First Tee Set
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {displayTeeSets.map((teeSet) => (
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

                  <HoleDataEditor
                    holes={teeSet.holes}
                    onChange={(holes) => handleUpdateHoles(teeSet.id, holes)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Delete Course */}
        <section className="section">
          <hr className="divider" />
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full p-4 rounded-xl text-center text-[var(--error)] hover:bg-[color:var(--error)]/10 transition-colors"
            >
              <Trash2 size={16} className="inline mr-2" />
              Delete Course
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-[color:var(--error)]/5 border border-[color:var(--error)]/20">
              <p className="text-center text-sm text-[var(--ink-secondary)] mb-3">
                Are you sure you want to delete this course?
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" fullWidth onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-[var(--error)] text-[var(--canvas)] rounded-lg hover:bg-[color:var(--error)]/90"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
