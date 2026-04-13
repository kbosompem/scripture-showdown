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

/** Strong double-buzz for new question */
export function notifyNewQuestion(): void {
	if (!browser) return;
	if (navigator.vibrate) {
		navigator.vibrate([200, 80, 200]);
		return;
	}
	playBeep(880, 0.15);
	setTimeout(() => playBeep(880, 0.15), 250);
}

/** Strong sustained buzz for correct answer */
export function notifyCorrect(): void {
	if (!browser) return;
	if (navigator.vibrate) {
		navigator.vibrate([100, 50, 100, 50, 300]);
		return;
	}
	playBeep(1047, 0.1);
	setTimeout(() => playBeep(1319, 0.15), 120);
	setTimeout(() => playBeep(1568, 0.2), 260);
}

/** Triple short buzzes for wrong answer */
export function notifyWrong(): void {
	if (!browser) return;
	if (navigator.vibrate) {
		navigator.vibrate([150, 50, 150, 50, 150]);
		return;
	}
	playBeep(220, 0.25);
}

/** Countdown tick — short pulse each second */
export function notifyCountdown(): void {
	if (!browser) return;
	if (navigator.vibrate) {
		navigator.vibrate(80);
		return;
	}
	playBeep(660, 0.08);
}

/** Timer running low (last 5 seconds) — urgent double pulse */
export function notifyTimerLow(): void {
	if (!browser) return;
	if (navigator.vibrate) {
		navigator.vibrate([120, 60, 120]);
		return;
	}
	playBeep(1000, 0.1);
	setTimeout(() => playBeep(1000, 0.1), 180);
}

/** Game over / final results */
export function notifyGameOver(): void {
	if (!browser) return;
	if (navigator.vibrate) {
		navigator.vibrate([200, 100, 200, 100, 400]);
		return;
	}
	playBeep(523, 0.15);
	setTimeout(() => playBeep(659, 0.15), 300);
	setTimeout(() => playBeep(784, 0.25), 600);
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
		gain.gain.value = 0.2;

		// Fade out to avoid click
		gain.gain.setValueAtTime(0.2, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

		oscillator.start(ctx.currentTime);
		oscillator.stop(ctx.currentTime + duration);
	} catch {
		// Audio not available
	}
}
