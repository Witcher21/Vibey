import * as ddg from 'duck-duck-scrape';

const BRAVE_SEARCH_URL = 'https://search.brave.com/search?q=';

/**
 * Primary: DuckDuckGo scrape
 * Fallback: A direct text result from AI context instead of failing
 */
export async function searchWeb(query, maxResults = 5) {
  // Try DuckDuckGo first
  try {
    const results = await ddg.search(query, {
      safeSearch: ddg.SafeSearchType.MODERATE,
    });

    if (results?.results?.length) {
      return results.results.slice(0, maxResults).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.description || r.title,
      }));
    }
  } catch (err) {
    console.warn('[WebSearch] DDG failed:', err.message);
  }

  // Fallback: try DuckDuckGo instant answers API
  try {
    const encodedQuery = encodeURIComponent(query);
    const resp = await fetch(
      `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_redirect=1&no_html=1`,
    );
    if (resp.ok) {
      const data = await resp.json();
      const results = [];

      if (data.AbstractText) {
        results.push({
          title: data.Heading || query,
          url: data.AbstractURL || '',
          snippet: data.AbstractText,
        });
      }

      if (data.RelatedTopics?.length) {
        for (const topic of data.RelatedTopics.slice(0, maxResults - results.length)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 60),
              url: topic.FirstURL,
              snippet: topic.Text,
            });
          }
        }
      }

      if (results.length > 0) {
        return results;
      }
    }
  } catch (err) {
    console.warn('[WebSearch] DDG instant API failed:', err.message);
  }

  // Last fallback - return useful context so LLM can still answer
  return [
    {
      title: 'Web search unavailable',
      url: '',
      snippet:
        `The live web search is temporarily unavailable. ` +
        `Please answer "${query}" from your training knowledge and note that you cannot verify the latest real-time info.`,
    },
  ];
}
