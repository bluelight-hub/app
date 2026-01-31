import { render, screen, fireEvent, createEvent } from '@testing-library/react';
import { PasswordInput } from '../password-input.molecule';
import { describe, it, expect } from 'vitest';

describe('PasswordInput Molecule', () => {
  it('renders correctly', () => {
    render(<PasswordInput placeholder="Enter password" />);
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
  });

  it('shows caps lock warning when caps lock is active', () => {
    render(<PasswordInput placeholder="Enter password" />);

    const input = screen.getByPlaceholderText('Enter password');

    // Create event and mock getModifierState
    const event = createEvent.keyDown(input, { key: 'A', code: 'KeyA' });
    Object.defineProperty(event, 'getModifierState', {
      value: (key: string) => key === 'CapsLock',
    });

    fireEvent(input, event);

    expect(screen.getByTitle('Feststelltaste ist aktiviert')).toBeInTheDocument();
  });

  it('hides caps lock warning when caps lock is inactive', () => {
    render(<PasswordInput placeholder="Enter password" />);

    const input = screen.getByPlaceholderText('Enter password');

    // Activate Caps Lock
    const downEvent = createEvent.keyDown(input, { key: 'A', code: 'KeyA' });
    Object.defineProperty(downEvent, 'getModifierState', {
      value: (key: string) => key === 'CapsLock',
    });
    fireEvent(input, downEvent);

    expect(screen.getByTitle('Feststelltaste ist aktiviert')).toBeInTheDocument();

    // Deactivate Caps Lock (key up)
    const upEvent = createEvent.keyUp(input, { key: 'A', code: 'KeyA' });
    Object.defineProperty(upEvent, 'getModifierState', {
      value: (_key: string) => false,
    });
    fireEvent(input, upEvent);

    expect(screen.queryByTitle('Feststelltaste ist aktiviert')).not.toBeInTheDocument();
  });
});
