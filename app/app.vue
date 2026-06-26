<template>
  <div class="app">
    <NuxtPage />
  </div>
</template>

<style>
:root {
  --bg: #f6f7f9;
  --surface: #ffffff;
  --text: #1c2530;
  --muted: #74808c;
  --border: #e3e7ec;
  --chip: #eef1f5;
  --accent: #2f6df0;
  --ok: #1aa667;
}
* { box-sizing: border-box; }
html, body, #__nuxt { margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}
.app { max-width: 1320px; margin: 0 auto; padding: 24px 20px 64px; }
input:focus, select:focus { outline: 2px solid color-mix(in srgb, var(--accent) 40%, transparent); outline-offset: 1px; }
</style>
