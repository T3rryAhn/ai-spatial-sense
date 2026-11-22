import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../embedding/index.html', import.meta.url), 'utf8');
const styleEnd = source.indexOf('</style>');
if (styleEnd < 0) throw new Error('슬라이드 원본의 </style> 경계를 찾지 못했습니다.');
// 브라우저가 첫 화면과 문서 전환을 그리기 전에 슬라이드 스타일을 읽도록 한다.
const split = styleEnd + '</style>'.length;
const html = `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="description" content="AI의 지능은 공간감각이다 — 인터랙티브 AI 기초 학습 자료">\n${source.slice(0, split)}</head>\n<body>\n${source.slice(split)}\n</body>\n</html>\n`;
const output = new URL('../public/ai/spatial-sense/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('index.html', output), html, 'utf8');

// 저장소 내 원본의 선언 블록만 평가합니다. 장면 동작 함수는 실행하지 않습니다.
const start = source.indexOf('const CH =');
const end = source.indexOf('\n];', source.indexOf('const BEATS =', start)) + 3;
if (start < 0 || end < start) throw new Error('장면 데이터 경계가 바뀌었습니다.');
const metadata = runInNewContext(source.slice(start, end) + `\nJSON.stringify({
  chapters: CH, parts: PARTS,
  scenes: BEATS.map((b, i) => ({ number: i + 1, ch: b.ch, title: b.head.replace(/\\*/g, '') }))
})`, { WORDS: [] }, { timeout: 1000 });
const generated = new URL('../src/generated/', import.meta.url);
await mkdir(generated, { recursive: true });
await writeFile(new URL('slides.json', generated), metadata + '\n', 'utf8');
console.log(`Prepared slides and ${JSON.parse(metadata).scenes.length} scene titles.`);
