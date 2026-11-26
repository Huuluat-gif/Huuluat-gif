import { json, route } from '@/lib/api';
import { CURATED_ARTICLES } from '@/lib/curated-articles';

function plain(value: unknown) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export const GET = route(async () => {
  let wpPosts: Array<Record<string, unknown>> = [];
  try {
    const response = await fetch(
      'https://public-api.wordpress.com/wp/v2/sites/245923143/posts?per_page=12&_fields=id,link,date,title,excerpt',
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) }
    );
    if (response.ok) {
      const posts = (await response.json()) as Array<{
        id: number;
        link: string;
        date: string;
        title: { rendered: string };
        excerpt: { rendered: string };
      }>;
      wpPosts = posts.map(p => ({
        id: `wp-${p.id}`,
        url: p.link,
        category: 'Góc đọc',
        author: 'Lowf Editorial',
        readMinutes: 4,
        title: plain(p.title.rendered),
        excerpt: plain(p.excerpt.rendered).slice(0, 500),
        date: p.date,
      }));
    }
  } catch {
    /* Fall back cleanly to built-in curated editorial articles */
  }

  return json({
    posts: [...CURATED_ARTICLES, ...wpPosts],
    available: true,
    site: 'https://www.lowflibray.com',
  });
});
