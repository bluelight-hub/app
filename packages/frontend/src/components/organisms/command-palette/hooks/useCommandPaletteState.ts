import { useReducer, useCallback, useEffect } from 'react';
import type { CommandPaletteState, CommandPaletteAction, NavigationCommand } from '../types';

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
      const targetIndex = action.payload;
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

export function useCommandPaletteState({ open }: UseCommandPaletteStateProps) {
  const [state, dispatch] = useReducer(commandPaletteReducer, initialState);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      dispatch({ type: 'RESET' });
    }
  }, [open]);

  const setSearch = useCallback((search: string) => {
    dispatch({ type: 'SET_SEARCH', payload: search });
  }, []);

  const selectCommand = useCallback((command: NavigationCommand) => {
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
    state,
    actions: {
      setSearch,
      selectCommand,
      goBack,
      navigateTo,
    },
  };
}
