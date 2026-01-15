import OpenSubtitles from 'opensubtitles.com';

interface OpenSubtitleResult {
  link: string;
  title: string;
}

const OS = new OpenSubtitles({
  apikey: 'q5wkIyv0w84zhqv7mdPS48gviPjXaesv',
  useragent: 'strmaddon v1.0.0'
});

export async function getSubtitleUrl(imdbid: string, lang: string, season?: number, episode?: number): Promise<OpenSubtitleResult[]> {
  try {
    const user = await OS.login({username: 'qolbudr', password: 'dzikru1234'});

    const response = await OS.subtitles({
      imdb_id: imdbid.replace(/^tt/, ''),
      languages: lang,
      season_number: season,
      episode_number: episode
    });

    let result: OpenSubtitleResult[] = [];

    if (response.data.length > 0) {
      for (const subtitle of response.data) {
        const fileId = subtitle.attributes.files[0].file_id;
        console.log(fileId);
        const download = await OS.download({ file_id: fileId });
        if (download && download.link) {
          result.push({
            link: download.link,
            title: subtitle.attributes.release
          });
        }
      }
    }

    return result;
  } catch (e) {
    console.error('OpenSubtitles.com error', e);
    return [];
  }
}

export { OS };