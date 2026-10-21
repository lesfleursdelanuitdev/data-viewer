import { defineConfig } from '@playwright/test';
import { e2eConfig } from '../../playwright.base.ts';

export default defineConfig(e2eConfig(4187, 'npm run build'));
