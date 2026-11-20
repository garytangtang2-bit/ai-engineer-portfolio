import {readFile, writeFile} from 'node:fs/promises';

// Pages serves static files. Inline the first page's CSS to avoid a blocking network round trip.
const root = new URL('../', import.meta.url);
const css = await readFile(new URL('styles.css', root), 'utf8');
const index = new URL('index.html', root);
const html = await readFile(index, 'utf8');
const styleTag = /<style id="site-styles">[\s\S]*?<\/style>/;
if (!styleTag.test(html)) throw new Error('Missing site-styles element in index.html');
const output = html.replace(styleTag, () => '<style id="site-styles">\n' + css.trim() + '\n</style>');
if (output !== html) await writeFile(index, output, 'utf8');
