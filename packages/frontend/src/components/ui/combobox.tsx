import { Combobox, Portal } from '@chakra-ui/react';
import { forwardRef } from 'react';

export interface ComboboxContentProps extends Combobox.ContentProps {
  portalled?: boolean;
  portalRef?: React.RefObject<HTMLElement>;
}

export const ComboboxContent = forwardRef<HTMLDivElement, ComboboxContentProps>(function ComboboxContent(props, ref) {
  const { portalled = true, portalRef, ...rest } = props;

  return (
    <Portal disabled={!portalled} container={portalRef}>
      <Combobox.Positioner>
        <Combobox.Content ref={ref} {...rest} />
      </Combobox.Positioner>
    </Portal>
  );
});

export const ComboboxRoot = Combobox.Root;
export const ComboboxLabel = Combobox.Label;
export const ComboboxControl = Combobox.Control;
export const ComboboxInput = Combobox.Input;
export const ComboboxTrigger = Combobox.Trigger;
export const ComboboxClearTrigger = Combobox.ClearTrigger;
export const ComboboxIndicatorGroup = Combobox.IndicatorGroup;
export const ComboboxItem = Combobox.Item;
export const ComboboxItemText = Combobox.ItemText;
export const ComboboxItemIndicator = Combobox.ItemIndicator;
export const ComboboxItemGroup = Combobox.ItemGroup;
export const ComboboxItemGroupLabel = Combobox.ItemGroupLabel;
export const ComboboxList = Combobox.List;
export const ComboboxEmpty = Combobox.Empty;
