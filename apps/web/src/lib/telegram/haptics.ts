import { getWebApp } from './sdk';

export function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  getWebApp()?.HapticFeedback.impactOccurred(style);
}

export function hapticSuccess(): void {
  getWebApp()?.HapticFeedback.notificationOccurred('success');
}

export function hapticError(): void {
  getWebApp()?.HapticFeedback.notificationOccurred('error');
}

export function hapticSelection(): void {
  getWebApp()?.HapticFeedback.selectionChanged();
}
