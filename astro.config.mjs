import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { categories } from './src/categories.mjs';

export default defineConfig({
  site: 'https://study.t3rryahn.duckdns.org',
  trailingSlash: 'always',
  integrations: [starlight({
    title: 'T3rry Study',
    defaultLocale: 'root',
    locales: { root: { label: '한국어', lang: 'ko' } },
    sidebar: [
      { label: '홈', link: '/' },
      ...categories.map(({ slug, label }) => ({ label, items: [
        ...(slug === 'ai' ? [{ label: '▶ AI 슬라이드 바로 시작', link: '/ai/spatial-sense/' }] : []),
        { autogenerate: { directory: slug } },
      ] })),
    ],
    components: { Head: './src/components/Head.astro' },
    customCss: ['./src/styles/custom.css'],
  })],
});
