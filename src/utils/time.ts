import { SnapInterval } from '../types';
import { TIME_PRECISION } from '../constants';

/**
 * Round a time value to the given precision.
 */
export function roundTime(time: number, precision: number = TIME_PRECISION): number {
  return Math.round(time / precision) * precision;
}

/**
 * Snap a time value to the nearest snap interval.
 */
export function snapTime(time: number, snapInterval: SnapInterval): number {
  if (snapInterval === null) return roundTime(time);
  return Math.round(time / snapInterval) * snapInterval;
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Format seconds to display string.
 * If < 60s: "12.5s"
 * If >= 60s: "1:30.5"
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    const rounded = roundTime(seconds);
    return Number.isInteger(rounded) ? `${rounded}s` : `${rounded.toFixed(1)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = roundTime(seconds % 60);
  if (Number.isInteger(secs)) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
}

/**
 * Get appropriate grid intervals based on zoom level.
 * Returns [minor, major] intervals in seconds.
 */
export function getGridIntervals(zoom: number): [number, number] {
  // zoom = pixels per second
  // We want minor ticks about every 30-80px
  const targetMinorPx = 50;
  const idealInterval = targetMinorPx / zoom;

  const intervals = [0.1, 0.5, 1, 2, 5, 10, 15, 30, 60];
  let minor = intervals[0];
  for (const iv of intervals) {
    if (iv >= idealInterval) {
      minor = iv;
      break;
    }
    minor = iv;
  }

  // Major is typically 5x or 10x minor
  let major: number;
  if (minor <= 0.1) major = 1;
  else if (minor <= 0.5) major = 5;
  else if (minor <= 1) major = 5;
  else if (minor <= 2) major = 10;
  else if (minor <= 5) major = 30;
  else if (minor <= 10) major = 60;
  else if (minor <= 15) major = 60;
  else if (minor <= 30) major = 120;
  else major = 300;

  return [minor, major];
}
