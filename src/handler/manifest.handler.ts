import { Manifest } from "stremio-addon-sdk";
import { getMovieCatalog } from "../data/movie.catalog";
import { genres } from "../data/genre";

export const getManifest = async (): Promise<Manifest> => {
  const movieCatalog = await getMovieCatalog();
  return {
    id: 'io.github.qolbudr.moviebox',
    version: '1.0.0',
    name: 'MovieBox Addons',
    catalogs: [
      {
        type: 'movie',
        id: 'featured-movie',
        name: 'Featured',
        extra: [{ name: 'genre', options: genres }, {name: 'search'}, { name: 'skip' }],
      },
      {
        type: 'series',
        id: 'featured-series',
        name: 'Featured',
        extra: [{ name: 'genre', options: genres }, {name: 'search'}, { name: 'skip' }],
      },
      ...movieCatalog,
    ],
    resources: ['catalog', 'stream', 'meta', 'subtitles'],
    types: ['movie', 'series'],
    description: 'MovieBox Addons for Stremio',
    logo: 'https://h5-static.aoneroom.com/ssrStatic/mbOfficial/public/_nuxt/web-logo.apJjVir2.svg',
    background: 'https://raw.githubusercontent.com/qolbudr/pstream-addon/main/assets/background.png',
  }

}