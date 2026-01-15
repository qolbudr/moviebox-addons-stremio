import axios from "axios";
import { Args, MetaPreview } from "stremio-addon-sdk";
import { makeApiRequestWithCookies, processApiResponse } from "../utils/fetcher.utils";
import NodeCache from "node-cache";

export const movieCatalogHandler = async (args: Args): Promise<MetaPreview[]> => {
  try {
    if (args.id === 'featured-movie') {
      if (args.extra?.search) {
        const response = await makeApiRequestWithCookies('https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/search', {
          method: 'POST',
          data: {
            "keyword": args.extra.search,
            "page": args.extra?.skip ? Math.floor(args.extra.skip / 24) : 1,
            "perPage": 24,
            "subjectType": 1,
          },
          headers: {
            'referer': 'https://moviebox.ph/'
          }
        })
        const result = processApiResponse(response);
        const metas: MetaPreview[] = result.items.map((movie: any) => ({
          id: movie.subjectId,
          type: 'movie',
          name: movie.title,
          poster: (movie.cover?.url || '') + '?x-oss-process=image/resize%2Cw_250',
        }));

        return metas;
      }

      const response = await makeApiRequestWithCookies(
        'https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/filter',
        {
          method: 'POST',
          data: {
            "page": args.extra?.skip ? Math.floor(args.extra.skip / 24) : 1, "perPage": 24, "channelId": 1, "genre": args.extra?.genre || '', 'keyword': args.extra?.search || '', "sort": "Hottest"
          },
          headers: {
            'referer': 'https://moviebox.ph/'
          }
        }
      );
      const result = processApiResponse(response);
      const metas: MetaPreview[] = result.items.map((movie: any) => ({
        id: movie.subjectId,
        type: 'movie',
        name: movie.title,
        poster: (movie.cover?.url || '') + '?x-oss-process=image/resize%2Cw_250',
      }));

      return metas;
    }

    const cache = new NodeCache({ stdTTL: 3600 });
    const cacheKey = `movieCatalog_${JSON.stringify(args)}`;

    const cachedCatalog = cache.get<MetaPreview[]>(cacheKey);
    if (cachedCatalog) return cachedCatalog;
    
    const res = await fetch('https://h5-api.aoneroom.com/wefeed-h5api-bff/tab-operating?tabId=ONEROOM_MOVIE&host=moviebox.ph');
    const sourceMovieCatalog = await res.json();
    const selectedCatalog = (sourceMovieCatalog.data.operatingList as any[]).find((item) => item.title.toLowerCase().replace(/ /g, '-') === args.id);
    const list = selectedCatalog.subjects || [];
    const metas: MetaPreview[] = list.map((movie: any) => ({
      id: movie.subjectId,
      type: 'movie',
      name: movie.title,
      poster: (movie.cover?.url || '') + '?x-oss-process=image/resize%2Cw_250',
    }));

    cache.set(cacheKey, metas);
    return metas;
  } catch (error) {
    return [];
  }
}