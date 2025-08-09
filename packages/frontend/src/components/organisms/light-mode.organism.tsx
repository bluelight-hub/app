import * as React from 'react';
import { Span } from '@chakra-ui/react';
import type { SpanProps } from '@chakra-ui/react';

export const LightMode = React.forwardRef<HTMLSpanElement, SpanProps>(function LightMode(props, ref) {
  return <Span color="fg" display="contents" className="chakra-theme light" colorPalette="gray" colorScheme="light" ref={ref} {...props} />;
});
