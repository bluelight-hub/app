import { describe, it, expect } from 'vitest';
import { getModuleColorClass } from '../utils';
import type { ModuleColor } from '../types';

describe('getModuleColorClass', () => {
  it('should return correct icon color class', () => {
    expect(getModuleColorClass('blue', 'icon')).toContain('text-blue-600');
    expect(getModuleColorClass('purple', 'icon')).toContain('text-purple-600');
    expect(getModuleColorClass('green', 'icon')).toContain('text-green-600');
    expect(getModuleColorClass('orange', 'icon')).toContain('text-orange-600');
    expect(getModuleColorClass('red', 'icon')).toContain('text-red-600');
    expect(getModuleColorClass('emerald', 'icon')).toContain('text-emerald-600');
    expect(getModuleColorClass('cyan', 'icon')).toContain('text-cyan-600');
    expect(getModuleColorClass('violet', 'icon')).toContain('text-violet-600');
    expect(getModuleColorClass('primary', 'icon')).toContain('text-blue-600');
    expect(getModuleColorClass('secondary', 'icon')).toContain('text-gray-600');
  });

  it('should return correct background color class', () => {
    expect(getModuleColorClass('blue', 'bg')).toContain('bg-blue-50');
    expect(getModuleColorClass('purple', 'bg')).toContain('bg-purple-50');
    expect(getModuleColorClass('green', 'bg')).toContain('bg-green-50');
    expect(getModuleColorClass('orange', 'bg')).toContain('bg-orange-50');
    expect(getModuleColorClass('red', 'bg')).toContain('bg-red-50');
    expect(getModuleColorClass('emerald', 'bg')).toContain('bg-emerald-50');
    expect(getModuleColorClass('cyan', 'bg')).toContain('bg-cyan-50');
    expect(getModuleColorClass('violet', 'bg')).toContain('bg-violet-50');
    expect(getModuleColorClass('primary', 'bg')).toContain('bg-blue-50');
    expect(getModuleColorClass('secondary', 'bg')).toContain('bg-gray-50');
  });

  it('should return correct border color class', () => {
    expect(getModuleColorClass('blue', 'border')).toContain('border-blue-200');
    expect(getModuleColorClass('purple', 'border')).toContain('border-purple-200');
    expect(getModuleColorClass('green', 'border')).toContain('border-green-200');
    expect(getModuleColorClass('orange', 'border')).toContain('border-orange-200');
    expect(getModuleColorClass('red', 'border')).toContain('border-red-200');
    expect(getModuleColorClass('emerald', 'border')).toContain('border-emerald-200');
    expect(getModuleColorClass('cyan', 'border')).toContain('border-cyan-200');
    expect(getModuleColorClass('violet', 'border')).toContain('border-violet-200');
    expect(getModuleColorClass('primary', 'border')).toContain('border-blue-200');
    expect(getModuleColorClass('secondary', 'border')).toContain('border-gray-200');
  });

  it('should default to icon variant when no variant specified', () => {
    expect(getModuleColorClass('blue')).toContain('text-blue-600');
  });

  it('should handle invalid color gracefully', () => {
    const invalidColor = 'invalid' as ModuleColor;
    expect(getModuleColorClass(invalidColor, 'icon')).toContain('text-blue-600'); // Falls back to blue
  });

  it('should include dark mode classes', () => {
    expect(getModuleColorClass('blue', 'icon')).toContain('dark:text-blue-400');
    expect(getModuleColorClass('blue', 'bg')).toContain('dark:bg-blue-900/20');
    expect(getModuleColorClass('blue', 'border')).toContain('dark:border-blue-800');
  });
});
