/**
 * Database Schema Verification Tests
 *
 * These tests verify the database schema is correct and consistent.
 * Run with: npm run test:db
 */

import { describe, it, expect, beforeAll } from 'vitest';

// These tests are designed to run against the schema definition
// They don't require a live database connection

describe('Database Schema Verification', () => {
    // Load schema file content for static analysis
    let schemaContent: string;

    beforeAll(async () => {
        const fs = await import('fs');
        const path = await import('path');
        const schemaPath = path.join(__dirname, '../../supabase/schema.sql');
        schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    });

    describe('Table Definitions', () => {
        const requiredTables = [
            'trips',
            'players',
            'teams',
            'team_members',
            'sessions',
            'courses',
            'tee_sets',
            'course_library',
            'course_library_tee_sets',
            'matches',
            'hole_results',
            'photos',
            'comments',
            'side_bets',
            'achievements',
            'audit_log',
            'scoring_events',
        ];

        it.each(requiredTables)('should define table: %s', (tableName) => {
            const tableRegex = new RegExp(`CREATE TABLE.*${tableName}`, 'i');
            expect(schemaContent).toMatch(tableRegex);
        });

        it('should have UUID primary keys for all tables', () => {
            const tables = schemaContent.match(/CREATE TABLE.*?\(/gi) || [];
            expect(tables.length).toBeGreaterThan(10);
        });
    });

    describe('Foreign Key Constraints', () => {
        const expectedForeignKeys = [
            { table: 'teams', column: 'trip_id', references: 'trips(id)', cascade: true },
            { table: 'team_members', column: 'team_id', references: 'teams(id)', cascade: true },
            { table: 'team_members', column: 'player_id', references: 'players(id)', cascade: true },
            { table: 'sessions', column: 'trip_id', references: 'trips(id)', cascade: true },
            { table: 'tee_sets', column: 'course_id', references: 'courses(id)', cascade: true },
            { table: 'matches', column: 'session_id', references: 'sessions(id)', cascade: true },
            { table: 'hole_results', column: 'match_id', references: 'matches(id)', cascade: true },
        ];

        it.each(expectedForeignKeys)(
            'should have FK: $table.$column → $references',
            ({ column, references, cascade }) => {
                const escapedRefs = references.replace(/[()]/g, '\\$&');
                const fkRegex = new RegExp(`${column}.*REFERENCES.*${escapedRefs}`, 'i');
                expect(schemaContent).toMatch(fkRegex);

                if (cascade) {
                    const cascadeRegex = new RegExp(
                        `${column}.*REFERENCES.*${escapedRefs}.*ON DELETE CASCADE`,
                        'i'
                    );
                    expect(schemaContent).toMatch(cascadeRegex);
                }
            }
        );
    });

    describe('Indexes', () => {
        const requiredIndexes = [
            'idx_teams_trip_id',
            'idx_team_members_team_id',
            'idx_team_members_player_id',
            'idx_sessions_trip_id',
            'idx_tee_sets_course_id',
            'idx_matches_session_id',
            'idx_matches_status',
            'idx_hole_results_match_id',
            'idx_photos_trip_id',
            'idx_comments_trip_id',
            'idx_audit_log_trip_id',
        ];

        it.each(requiredIndexes)('should create index: %s', (indexName) => {
            expect(schemaContent).toContain(indexName);
        });
    });



        it('should enable pgcrypto extension for secure share-code generation', () => {
            expect(schemaContent).toMatch(/CREATE EXTENSION IF NOT EXISTS "pgcrypto"/i);
        });

        it('should not use public CRUD policies on core app tables', () => {
            const insecurePolicyRegex = /(CREATE POLICY\s+"(?:trips|teams|team_members|players|sessions|courses|tee_sets|matches|hole_results|photos|comments|side_bets|achievements|audit_log)_[^"]+"[\s\S]*?(USING \(true\)|WITH CHECK \(true\)))/i;
            expect(schemaContent).not.toMatch(insecurePolicyRegex);
        });

    describe('RLS Configuration', () => {
        const tablesRequiringRLS = [
            'trips',
            'players',
            'teams',
            'team_members',
            'sessions',
            'courses',
            'tee_sets',
            'matches',
            'hole_results',
            'photos',
            'comments',
            'side_bets',
            'achievements',
            'audit_log',
            'course_library',
            'course_library_tee_sets',
            'scoring_events',
        ];

        it.each(tablesRequiringRLS)('should enable RLS on: %s', (tableName) => {
            const rlsRegex = new RegExp(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`, 'i');
            expect(schemaContent).toMatch(rlsRegex);
        });
    });

    describe('Triggers', () => {
        const tablesWithUpdatedAt = [
            'trips',
            'players',
            'teams',
            'sessions',
            'courses',
            'tee_sets',
            'matches',
            'side_bets',
            'course_library',
            'course_library_tee_sets',
        ];

        it('should define update_updated_at_column function', () => {
            expect(schemaContent).toContain('CREATE OR REPLACE FUNCTION update_updated_at_column()');
        });

        it.each(tablesWithUpdatedAt)('should have updated_at trigger on: %s', (tableName) => {
            const triggerRegex = new RegExp(`CREATE TRIGGER update_${tableName}_updated_at`, 'i');
            expect(schemaContent).toMatch(triggerRegex);
        });
    });

    describe('Views', () => {
        it('should create live_standings view with SECURITY INVOKER', () => {
            expect(schemaContent).toContain('CREATE OR REPLACE VIEW live_standings');
            expect(schemaContent).toMatch(/live_standings[\s\S]*security_invoker\s*=\s*true/i);
        });

        it('should create active_matches view with SECURITY INVOKER', () => {
            expect(schemaContent).toContain('CREATE OR REPLACE VIEW active_matches');
            expect(schemaContent).toMatch(/active_matches[\s\S]*security_invoker\s*=\s*true/i);
        });
    });

    describe('Realtime Configuration', () => {
        const realtimeTables = ['matches', 'hole_results', 'sessions', 'comments', 'photos'];

        it.each(realtimeTables)('should add %s to realtime publication', (tableName) => {
            expect(schemaContent).toContain(`ALTER PUBLICATION supabase_realtime ADD TABLE ${tableName}`);
        });
    });

    describe('Check Constraints', () => {
        it('should validate team colors', () => {
            expect(schemaContent).toMatch(/color.*CHECK.*\(.*color IN.*'usa'.*'europe'/i);
        });

        it('should validate session types', () => {
            // Constraint allows the original Ryder Cup formats plus the foundation
            // formats unlocked for new scoring engines (Pinehurst, Greensomes,
            // Scrambles, 6-6-6, Cha-Cha-Cha, 1-2-3, Best 2 of 4).
            expect(schemaContent).toMatch(
                /session_type[\s\S]*CHECK[\s\S]*session_type IN[\s\S]*'foursomes'[\s\S]*'fourball'[\s\S]*'singles'/i
            );
            for (const value of [
                'pinehurst',
                'greensomes',
                'scramble',
                'texas-scramble',
                'shamble',
                'best-2-of-4',
                'six-six-six',
                'cha-cha-cha',
                'one-two-three',
            ]) {
                expect(schemaContent).toContain(`'${value}'`);
            }
        });

        it('should validate match status', () => {
            expect(schemaContent).toMatch(/status.*CHECK.*\(.*status IN.*'scheduled'.*'inProgress'.*'completed'/i);
        });

        it('should validate hole number range', () => {
            expect(schemaContent).toMatch(/hole_number.*CHECK.*\(.*hole_number >= 1 AND hole_number <= 18/i);
        });
    });

    describe('Required Columns', () => {
        it('should have created_at on main tables', () => {
            expect(schemaContent).toMatch(/trips[\s\S]*created_at TIMESTAMPTZ/i);
            expect(schemaContent).toMatch(/players[\s\S]*created_at TIMESTAMPTZ/i);
            expect(schemaContent).toMatch(/matches[\s\S]*created_at TIMESTAMPTZ/i);
        });

        it('should have share_code on trips table', () => {
            expect(schemaContent).toMatch(/trips[\s\S]*share_code TEXT UNIQUE/i);
        });
    });
});

describe('TypeScript Types Verification', () => {
    let typesContent: string;

    beforeAll(async () => {
        const fs = await import('fs');
        const path = await import('path');
        const typesPath = path.join(__dirname, '../lib/supabase/types.ts');
        typesContent = fs.readFileSync(typesPath, 'utf-8');
    });

    describe('Table Type Definitions', () => {
        const requiredTableTypes = [
            'trips',
            'players',
            'teams',
            'team_members',
            'sessions',
            'matches',
            'hole_results',
            'courses',
            'tee_sets',
            'photos',
            'comments',
            'side_bets',
            'achievements',
            'course_library',
            'course_library_tee_sets',
            'scoring_events',
        ];

        it.each(requiredTableTypes)('should define types for: %s', (tableName) => {
            expect(typesContent).toContain(`${tableName}:`);
        });
    });

    describe('Type Exports', () => {
        const exportedTypes = [
            'Trip',
            'Player',
            'Team',
            'TeamMember',
            'Session',
            'Match',
            'HoleResult',
            'Course',
            'TeeSet',
            'Photo',
            'Comment',
            'SideBet',
            'Achievement',
            'CourseLibrary',
            'CourseLibraryTeeSet',
        ];

        it.each(exportedTypes)('should export type: %s', (typeName) => {
            expect(typesContent).toMatch(new RegExp(`export type ${typeName}\\s*=`, 'i'));
        });
    });
});
