/**
 * Web Speech API Type Declarations
 *
 * These types support the Web Speech API used in VoiceScoring and QuickPhotoCapture components.
 * The Speech Recognition API is not available on all browsers.
 */

interface SpeechRecognitionResultItem {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionResultItem;
    [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
    onsoundstart: (() => void) | null;
    onsoundend: (() => void) | null;
    onaudiostart: (() => void) | null;
    onaudioend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

interface SpeechRecognitionConstructor {
    new(): SpeechRecognition;
}

declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    }

    /**
     * iOS Safari Navigator Extensions
     * The `standalone` property indicates if the app is running as an installed PWA
     */
    interface Navigator {
        /** iOS Safari: true if app is running in standalone mode (added to home screen) */
        standalone?: boolean;
    }
}

export { };
