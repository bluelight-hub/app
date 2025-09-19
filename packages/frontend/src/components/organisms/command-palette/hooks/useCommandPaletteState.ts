import { useCallback, useEffect, useReducer, useState } from 'react';
import { debounce } from '@tanstack/pacer';
import type { CommandPaletteAction, CommandPaletteState, NavigationCommand } from '../types';

const initialState: CommandPaletteState = {
  search: '',
  selectedIndex: 0,
  selectedCommand: null,
  commandStack: [],
};

function commandPaletteReducer(state: CommandPaletteState, action: CommandPaletteAction): CommandPaletteState {
  switch (action.type) {
    case 'SET_SEARCH':
      return { ...state, search: action.payload, selectedIndex: 0 };
    case 'SET_SELECTED_INDEX':
      return { ...state, selectedIndex: action.payload };
    case 'SELECT_COMMAND':
      return { ...state, selectedCommand: action.payload };
    case 'PUSH_COMMAND':
      return {
        ...state,
        commandStack: [...state.commandStack, action.payload],
        selectedCommand: action.payload,
        search: '',
      };
    case 'POP_COMMAND': {
      const newStack = [...state.commandStack];
      newStack.pop();
      return {
        ...state,
        commandStack: newStack,
        selectedCommand: newStack[newStack.length - 1] || null,
        search: '',
      };
    }
    case 'NAVIGATE_TO': {
      const targetIndex = Math.min(Math.max(action.payload, 0), state.commandStack.length - 1);
      const newStack = state.commandStack.slice(0, targetIndex + 1);
      return {
        ...state,
        commandStack: newStack,
        selectedCommand: newStack[newStack.length - 1] || null,
        search: '',
      };
    }
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface UseCommandPaletteStateProps {
  open: boolean;
}

/**
 * State-Management-Hook für die Command Palette.
 *
 * Verwaltet den Zustand der Command Palette, einschließlich Suche,
 * Navigation und Command-Stack mit debounced search Unterstützung.
 *
 * @param props - Die Hook-Parameter
 * @param props.open - Ob die Command Palette geöffnet ist
 * @returns State-Objekt und Aktionen zur State-Manipulation
 *
 * @example
 * ```tsx
 * const { state, actions } = useCommandPaletteState({ open: true });
 * // state.immediateSearch für Input-Anzeige
 * // state.search für gefilterte Ergebnisse (debounced)
 * ```
 */
export function useCommandPaletteState({ open }: UseCommandPaletteStateProps) {
  const [state, dispatch] = useReducer(commandPaletteReducer, initialState);
  const [immediateSearch, setImmediateSearch] = useState('');

  // Create debounced search update
  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      dispatch({ type: 'SET_SEARCH', payload: value });
    }, 200), // 200ms debounce delay for search
    [],
  );

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      dispatch({ type: 'RESET' });
      setImmediateSearch('');
    }
  }, [open]);

  const setSearch = useCallback(
    (search: string) => {
      setImmediateSearch(search);
      debouncedSetSearch(search);
    },
    [debouncedSetSearch],
  );

  const selectCommand = useCallback((command: NavigationCommand | null) => {
    if (!command) {
      dispatch({ type: 'SELECT_COMMAND', payload: null });
      return;
    }
    if (command.subCommands && command.subCommands.length > 0) {
      dispatch({ type: 'PUSH_COMMAND', payload: command });
    } else {
      dispatch({ type: 'SELECT_COMMAND', payload: command });
    }
  }, []);

  const goBack = useCallback(() => {
    dispatch({ type: 'POP_COMMAND' });
  }, []);

  const navigateTo = useCallback((index: number) => {
    dispatch({ type: 'NAVIGATE_TO', payload: index });
  }, []);

  return {
    state: {
      ...state,
      immediateSearch, // Use immediate search for input display
    },
    actions: {
      setSearch,
      selectCommand,
      goBack,
      navigateTo,
    },
  };
}
