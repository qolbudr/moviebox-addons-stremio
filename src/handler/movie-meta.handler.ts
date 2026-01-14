import { Args, MetaDetail, MetaPreview, MetaVideo } from "stremio-addon-sdk";
import { makeApiRequestWithCookies, processApiResponse } from "../utils/fetcher.utils";

export const movieMetaHandler = async (id: string, type: string): Promise<MetaDetail> => {
  try {
    const response = await makeApiRequestWithCookies(`https://h5-api.aoneroom.com/wefeed-h5-bff/web/subject/detail`, {
      method: 'GET',
      params: { subjectId: id }
    });

    const content = processApiResponse(response);

    const genre = content.subject.genre.split(',').map((g: any) => {
      return {
        name: g,
        url: `stremio:///discover/${encodeURIComponent('https://moviebox-omega-blush.vercel.app')}%2Fmanifest.json/${type}/featured-${type}?genre=${g}`,
        category: 'genre'
      }
    })

    const actor = content.stars.map((a: any) => {
      return {
        name: a.name,
        url: `stremio:///discover/${encodeURIComponent('https://moviebox-omega-blush.vercel.app')}%2Fmanifest.json/${type}/featured-${type}?search=${a.name}`,
        category: 'actor'
      }
    })

    let videos: MetaVideo[] = [];

    (content.resource.seasons ?? []).forEach((season: any) => {
      for (let epIndex = 1; epIndex <= season.maxEp; epIndex++) {
        const video: MetaVideo = {
          id: `${id}:${season.se}:${epIndex}`,
          released: `${content.subject.releaseDate}T05:00:00.000Z`,
          title: `S${season.se} - Episode ${epIndex}`,
          season: season.se,
          episode: epIndex,
          overview: `Watch ${content.subject.title} - S${season.se} Episode ${epIndex}`,
        };

        videos.push(video);
      }
    })

    const meta: MetaDetail = {
      id: content.subject.subjectId,
      type: type as 'movie' | 'series',
      name: content.subject.title,
      description: content.subject.description,
      background: content.subject.cover?.url || '',
      poster: content.subject.cover?.url || '',
      releaseInfo: content.subject.releaseDate.substring(0, 4),
      country: content.subject.countryName,
      language: content.subject.subtitles.replace(',', ', '),
      imdbRating: content.subject.imdbRatingValue,
      videos: videos,
      links: [
        ...genre,
        ...(actor.length > 10 ? actor.slice(0, 10) : actor)
      ]
    }
    return meta;
  } catch (error) {
    throw new Error('Failed to fetch movie meta');
  }
}