import { browser } from '$app/environment';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
	if (!audioContext) {
		audioContext = new AudioContext();
	}
	return audioContext;
}

/** Initialize audio context on first user gesture (required for iOS) */
export function initAudio(): void {
	if (!browser) return;
	try {
		getAudioContext();
	} catch {
		// Will be initialized on next call
	}
}

/** Vibrate on Android, audio ping on iOS */
export function notifyNewQuestion(): void {
	if (!browser) return;

	// Try vibration first (Android)
	if (navigator.vibrate) {
		navigator.vibrate([100, 50, 100]);
		return;
	}

	// Fallback: short beep
	playBeep(880, 0.15);
}

/** Short feedback vibration/sound for correct answer */
export function notifyCorrect(): void {
	if (!browser) return;
	if (navigator.vibrate) {
		navigator.vibrate(200);
		return;
	}
	playBeep(1047, 0.1);
	setTimeout(() => playBeep(1319, 0.15), 120);
}

/** Short feedback for wrong answer */
export function notifyWrong(): void {
	if (!browser) return;
	if (navigator.vibrate) {
		navigator.vibrate([100, 30, 100]);
		return;
	}
	playBeep(220, 0.2);
}

function playBeep(frequency: number, duration: number): void {
	try {
		const ctx = getAudioContext();
		if (ctx.state === 'suspended') ctx.resume();

		const oscillator = ctx.createOscillator();
		const gain = ctx.createGain();

		oscillator.connect(gain);
		gain.connect(ctx.destination);

		oscillator.frequency.value = frequency;
		oscillator.type = 'sine';
		gain.gain.value = 0.15;

		// Fade out to avoid click
		gain.gain.setValueAtTime(0.15, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

		oscillator.start(ctx.currentTime);
		oscillator.stop(ctx.currentTime + duration);
	} catch {
		// Audio not available
	}
}
