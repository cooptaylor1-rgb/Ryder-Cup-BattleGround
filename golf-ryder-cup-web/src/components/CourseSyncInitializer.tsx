'use client';

import { useEffect } from 'react';
import { initCourseSyncService } from '@/lib/services/courseLibrarySyncService';

/**
 * Initializes the course library sync service on app startup.
 * This component should be placed in the app layout.
 */
export function CourseSyncInitializer() {
    useEffect(() => {
        // Initialize the sync service (network listeners, pending queue processing)
        initCourseSyncService();
    }, []);

    // This component doesn't render anything
    return null;
}
