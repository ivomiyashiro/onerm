import { catalog } from '@/presentation/strings/catalog';

/**
 * RF-CAT-02 AC5: the video the team chose or, without one, a YouTube search for the exercise. The
 * seed and the server only accept https; checking it again here keeps any other scheme from
 * reaching `Linking.openURL`.
 */
export function videoUrl(exerciseName: string, curated: string | null): string {
  if (curated?.startsWith('https://')) return curated;
  const query = encodeURIComponent(catalog.detail.videoSearch(exerciseName));
  return `https://www.youtube.com/results?search_query=${query}`;
}
