import * as dotenvx from '@dotenvx/dotenvx';
import { defineConfig } from 'prisma/config';

dotenvx.config();

export default defineConfig({
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
});
