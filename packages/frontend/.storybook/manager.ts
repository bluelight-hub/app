import { addons } from '@storybook/manager-api';
import { themes } from '@storybook/theming';

addons.setConfig({
  theme: {
    ...themes.normal,
    brandTitle: 'BlueLight Hub Components',
    brandUrl: 'https://github.com/bluelight-hub/app',
  },
  sidebar: {
    showRoots: true,
  },
});