import { videoUrl } from '@/presentation/features/exercises/video-url';

describe('videoUrl (RF-CAT-02 AC5)', () => {
  it('opens the curated video', () => {
    expect(videoUrl('Prensa de piernas', 'https://youtu.be/abc')).toBe('https://youtu.be/abc');
  });

  it('without one, or with one that is not https, searches YouTube for the exercise', () => {
    const search =
      'https://www.youtube.com/results?search_query=Prensa%20de%20piernas%20t%C3%A9cnica';
    expect(videoUrl('Prensa de piernas', null)).toBe(search);
    expect(videoUrl('Prensa de piernas', 'javascript:alert(1)')).toBe(search);
  });
});
