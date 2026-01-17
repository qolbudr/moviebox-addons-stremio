import { Stream } from "stremio-addon-sdk";
import { makeApiRequestWithCookies, processApiResponse } from "../utils/fetcher.utils";

export const seriesStreamHandle = async (id: string) => {
  try {
    let element = id.split(':');
    let movieId = element[0];
    let season = parseInt(element[1]);
    let episode = parseInt(element[2]);
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

    let streams = [];

    content.processedSources.forEach((source: any) => {
      streams.push({
        title: `${source.quality} - ${movieInfo?.subject?.title || 'N/A'}`,
        url: source.directUrl,
        name: `MovieBox`,
        behaviorHints: {
          notWebReady: true,
          proxyHeaders: {
            request: {
              "Referer": "https://fmoviesunblocked.net/",
              "Origin": "https://fmoviesunblocked.net",
              "User-Agent": "okhttp/4.12.0"
            }
          }
        }
      });
    })

    return streams;
  } catch (error) {
    throw new Error('Failed to fetch movie stream');
  }
}