import { Stream, Subtitle } from "stremio-addon-sdk";
import { makeApiRequestWithCookies, processApiResponse } from "../utils/fetcher.utils";
import NodeCache from "node-cache";
import nameToImdb from "name-to-imdb";

export const seriesCaptionHandler = async (id: string) => {
  try {
    let element = id.split(':');
    let movieId = element[0];
    let season = parseInt(element[1]);
    let episode = parseInt(element[2]);

    const cache = new NodeCache({ stdTTL: 3600 });
    const cacheKey = `movieCaptions_${id}`;

    const cachedCaptions = cache.get<Subtitle[]>(cacheKey);
    if (cachedCaptions) return cachedCaptions;


    console.log(`Getting sources for movieId: ${movieId}`);
    const infoResponse = await makeApiRequestWithCookies(`https://h5-api.aoneroom.com/wefeed-h5-bff/web/subject/detail`, {
      method: 'GET',
      params: { subjectId: movieId }
    });

    const movieInfo = processApiResponse(infoResponse);
    const detailPath = movieInfo?.subject?.detailPath;

    if (!detailPath) {
      throw new Error('Could not get movie detail path for referer header');
    }

    // Create the proper referer header - try fmovies domain based on user's working link
    const refererUrl = `https://fmoviesunblocked.net/spa/videoPlayPage/movies/${detailPath}?id=${movieId}&type=/movie/detail`;
    console.log(`Using referer: ${refererUrl}`);

    // Also try the sources endpoint with fmovies domain
    console.log('Trying fmovies domain for sources...');

    const params = {
      subjectId: movieId,
      se: season,
      ep: episode
    };

    const response = await makeApiRequestWithCookies(`https://h5.aoneroom.com/wefeed-h5-bff/web/subject/download`, {
      method: 'GET',
      params,
      headers: {
        'Referer': refererUrl,
        'Origin': 'https://fmoviesunblocked.net',
        'X-Forwarded-For': '1.1.1.1',
        'CF-Connecting-IP': '1.1.1.1',
        'X-Real-IP': '1.1.1.1'
      }
    });

    const content = processApiResponse(response);
    if (content && content.downloads) {
      const title = movieInfo?.subject?.title || 'video';
      const isEpisode = season > 0 && episode > 0;

      const sources = content.downloads.map((file: { url: string; resolution: any; id: any; size: any; }) => {
        const downloadParams = new URLSearchParams({
          url: file.url,
          title: title,
          quality: file.resolution || 'Unknown'
        });

        if (isEpisode) {
          downloadParams.append('season', `${season}`);
          downloadParams.append('episode', `${episode}`);
        }

        return {
          id: file.id,
          quality: file.resolution || 'Unknown',
          directUrl: file.url,
          size: file.size,
          format: 'mp4'
        };
      });

      content.processedSources = sources;
    }

    let subtitles: Subtitle[] = [];

    content.captions.forEach((source: any) => {
      subtitles.push({
        id: source.id,
        lang: (source.lan || 'Unknown').replace('in_id', 'ind'),
        url: source.url,
      });
    })

    var result = await nameToImdb({ name: movieInfo.subject.title, year: movieInfo.subject.releaseDate.substring(0, 4) });
    const subtitle = await fetch(`https://opensubtitles-v3.strem.io/subtitles/series/${result.res}:${season}:${episode}.json`);
    const subtitleData = await subtitle.json();

    subtitleData.subtitles.forEach((sub: any) => {
      subtitles.push({
        id: sub.id,
        lang: sub.lang,
        url: sub.url,
      });
    })

    cache.set(cacheKey, subtitles);
    return subtitles;
  } catch (error) {
    throw new Error('Failed to fetch movie stream');
  }
}