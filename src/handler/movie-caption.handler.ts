import { Stream, Subtitle } from "stremio-addon-sdk";
import { makeApiRequestWithCookies, processApiResponse } from "../utils/fetcher.utils";
import NodeCache from "node-cache";
import nameToImdb from "name-to-imdb";
import { getSubtitleUrl } from "../utils/opensubtitle.utils";

export const movieCaptionHanlder = async (id: string) => {
  try {
    const cache = new NodeCache({ stdTTL: 3600 });
    const cacheKey = `movieCaptions_${id}`;

    const cachedCaptions = cache.get<Subtitle[]>(cacheKey);
    if (cachedCaptions) return cachedCaptions;
    
    console.log(`Fetching movie stream for ID: ${id}`);
    const infoResponse = await makeApiRequestWithCookies(`https://h5-api.aoneroom.com/wefeed-h5-bff/web/subject/detail`, {
      method: 'GET',
      params: { subjectId: id }
    });

    const movieInfo = processApiResponse(infoResponse);
    const detailPath = movieInfo?.subject?.detailPath;

    if (!detailPath) {
      throw new Error('Could not get movie detail path for referer header');
    }

    // Create the proper referer header - try fmovies domain based on user's working link
    const refererUrl = `https://fmoviesunblocked.net/spa/videoPlayPage/movies/${detailPath}?id=${id}&type=/movie/detail`;
    console.log(`Using referer: ${refererUrl}`);

    // Also try the sources endpoint with fmovies domain
    console.log('Trying fmovies domain for sources...');

    const params = {
      subjectId: id,
      se: 0,
      ep: 0
    };

    // Try the original endpoint with region bypass headers
    const response = await makeApiRequestWithCookies(`https://h5.aoneroom.com/wefeed-h5-bff/web/subject/download`, {
      method: 'GET',
      params,
      headers: {
        'Referer': refererUrl,
        'Origin': 'https://fmoviesunblocked.net',
        // Add region bypass headers
        'X-Forwarded-For': '1.1.1.1',
        'CF-Connecting-IP': '1.1.1.1',
        'X-Real-IP': '1.1.1.1'
      }
    });

    const content = processApiResponse(response);

    // Process the sources to extract direct download links with proxy URLs and stream URLs
    if (content && content.downloads) {
      // Extract title information
      const title = movieInfo?.subject?.title || 'video';
      const isEpisode = false;

      const sources = content.downloads.map((file: { url: string; resolution: any; id: any; size: any; }) => {
        const downloadParams = new URLSearchParams({
          url: file.url,
          title: title,
          quality: file.resolution || 'Unknown'
        });

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
        lang: (source.lan || 'Unknown').replace('in_id', 'id'),
        url: source.url,
      });
    })

    var result = await nameToImdb({ name: movieInfo.subject.title, year: movieInfo.subject.releaseDate.substring(0, 4) });
    const subtitle = await getSubtitleUrl(result.res, 'id');

    subtitle.forEach((sub) => {
      subtitles.push({
        id: sub.title,
        lang: 'id',
        url: sub.link,
      });
    });

    cache.set(cacheKey, subtitles);
    return subtitles;
  } catch (error) {
    throw new Error('Failed to fetch movie stream');
  }
}