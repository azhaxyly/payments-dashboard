export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  future: { compatibilityVersion: 4 },
  devtools: { enabled: true },
  nitro: {
    externals: { inline: [] },
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    aiModel: process.env.AI_MODEL || 'claude-opus-4-8',
    now: process.env.NOW || '2026-08-09',
    attentionDays: process.env.ATTENTION_DAYS || '21',
  },
})
