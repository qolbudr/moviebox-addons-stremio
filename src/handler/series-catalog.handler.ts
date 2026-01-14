import axios from "axios";
import { Args, MetaPreview } from "stremio-addon-sdk";
import { makeApiRequestWithCookies, processApiResponse } from "../utils/fetcher.utils";

export const seriesCatalogHandler = async (args: Args): Promise<MetaPreview[]> => {
  try {
    if (args.extra?.search) {
      const response = await makeApiRequestWithCookies('https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/search', {
        method: 'POST',
        data: {
          "keyword": args.extra.search,
          "page": args.extra?.skip ? Math.floor(args.extra.skip / 24) : 1,
          "perPage": 24,
          "subjectType": 2
        },
        headers: {
          'referer': 'https://moviebox.ph/'
        }
      })
      const result = processApiResponse(response);
      const metas: MetaPreview[] = result.items.map((series: any) => ({
        id: series.subjectId,
        type: 'series',
        name: series.title,
        poster: (series.cover?.url || '') + '?x-oss-process=image/resize%2Cw_250',
      }));

      return metas;
    }

    const response = await makeApiRequestWithCookies(
      'https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/filter',
      {
        method: 'POST',
        data: {
          "page": args.extra?.skip ? Math.floor(args.extra.skip / 24) : 1, "perPage": 24, "channelId": 2, "genre": args.extra?.genre || '', 'keyword': args.extra?.search || ''
        },
        headers: {
          'referer': 'https://moviebox.ph/'
        }
      }
    );
    const result = processApiResponse(response);
    const metas: MetaPreview[] = result.items.map((series: any) => ({
      id: series.subjectId,
      type: 'series',
      name: series.title,
      poster: (series.cover?.url || '') + '?x-oss-process=image/resize%2Cw_250',
    }));

    return metas;

  } catch (error) {
    return [];
  }
}