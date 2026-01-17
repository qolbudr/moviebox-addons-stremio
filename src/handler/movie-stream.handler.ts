import { Stream } from "stremio-addon-sdk";
import { makeApiRequestWithCookies, processApiResponse } from "../utils/fetcher.utils";

export const movieStreamHandle = async (id: string) => {
  try {
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