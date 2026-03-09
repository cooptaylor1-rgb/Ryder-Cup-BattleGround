import { getJSON, safeLocalStorage } from './safeStorage';

const STORAGE_KEY = 'golf-trip-share-codes';

type TripShareCodeMap = Record<string, string>;

function normalizeShareCode(shareCode: string): string {
    return shareCode.trim().toUpperCase();
}

function readShareCodes(): TripShareCodeMap {
    return getJSON<TripShareCodeMap>(STORAGE_KEY, {});
}

function writeShareCodes(codes: TripShareCodeMap): void {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

export function getStoredTripShareCode(tripId: string): string | null {
    if (!tripId) {
        return null;
    }

    const stored = readShareCodes()[tripId];
    return stored ? normalizeShareCode(stored) : null;
}

export function storeTripShareCode(tripId: string, shareCode: string): void {
    if (!tripId || !shareCode.trim()) {
        return;
    }

    const codes = readShareCodes();
    codes[tripId] = normalizeShareCode(shareCode);
    writeShareCodes(codes);
}

export function clearStoredTripShareCode(tripId: string): void {
    if (!tripId) {
        return;
    }

    const codes = readShareCodes();
    if (!(tripId in codes)) {
        return;
    }

    delete codes[tripId];
    writeShareCodes(codes);
}
