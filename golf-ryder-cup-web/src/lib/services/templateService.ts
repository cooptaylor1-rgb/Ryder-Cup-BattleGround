/**
 * Template Service
 *
 * Manages trip templates: fetching built-in and custom templates,
 * saving new templates, deleting custom templates, and applying
 * a template to pre-fill trip configuration.
 *
 * Custom templates are persisted in the Dexie tripTemplates table.
 * Built-in templates are merged in at read time from builtinTemplates.ts.
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import type { TripTemplate, TemplateConfig } from '@/lib/types/templates';
import { BUILTIN_TEMPLATES, getBuiltinTemplate } from '@/lib/data/builtinTemplates';

/**
 * Get all templates (built-in + custom saved in DB).
 * Built-in templates are listed first, then custom sorted by most recently updated.
 */
export async function getTemplates(): Promise<TripTemplate[]> {
  const customTemplates = await db.tripTemplates
    .where('isBuiltin')
    .equals(0)
    .reverse()
    .sortBy('updatedAt');

  return [...BUILTIN_TEMPLATES, ...customTemplates];
}

/**
 * Get a single template by ID.
 * Checks built-in templates first, then the DB.
 */
export async function getTemplate(id: string): Promise<TripTemplate | undefined> {
  // Check built-in templates first
  const builtin = getBuiltinTemplate(id);
  if (builtin) return builtin;

  // Check custom templates in DB
  return db.tripTemplates.get(id);
}

/**
 * Save a trip configuration as a new custom template.
 * Returns the newly created template.
 */
export async function saveAsTemplate(
  name: string,
  description: string,
  config: TemplateConfig
): Promise<TripTemplate> {
  const now = new Date().toISOString();

  const template: TripTemplate = {
    id: uuidv4(),
    name,
    description,
    isBuiltin: false,
    config,
    useCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.tripTemplates.add(template);
  return template;
}

/**
 * Delete a custom template.
 * Built-in templates cannot be deleted.
 * Returns true if the template was deleted, false if not found or built-in.
 */
export async function deleteTemplate(id: string): Promise<boolean> {
  // Prevent deletion of built-in templates
  const builtin = getBuiltinTemplate(id);
  if (builtin) {
    return false;
  }

  const existing = await db.tripTemplates.get(id);
  if (!existing) {
    return false;
  }

  await db.tripTemplates.delete(id);
  return true;
}

/**
 * Apply a template: returns the TemplateConfig for the given template ID.
 * Also increments the template's useCount.
 */
export async function applyTemplate(templateId: string): Promise<TemplateConfig> {
  // Check built-in templates first
  const builtin = getBuiltinTemplate(templateId);
  if (builtin) {
    // Built-in templates are read-only; we don't persist useCount for them
    return { ...builtin.config };
  }

  // Check custom templates
  const custom = await db.tripTemplates.get(templateId);
  if (!custom) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // Increment use count
  await db.tripTemplates.update(templateId, {
    useCount: (custom.useCount || 0) + 1,
    updatedAt: new Date().toISOString(),
  });

  return { ...custom.config };
}
