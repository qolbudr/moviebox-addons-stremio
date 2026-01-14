import { ManifestCatalog } from "stremio-addon-sdk";

export const getMovieCatalog = async (): Promise<ManifestCatalog[]> => {
  const res = await fetch('https://h5-api.aoneroom.com/wefeed-h5api-bff/tab-operating?tabId=ONEROOM_MOVIE&host=moviebox.ph');
  const sourceMovieCatalog = await res.json();

  const filteredMovieCatalog = sourceMovieCatalog.data.operatingList.filter(
    (op: { type: string }) => op.type === 'SUBJECTS_MOVIE'
  );

  const metas = filteredMovieCatalog.map((op: any): ManifestCatalog => ({
    id: op.title.toLowerCase().replace(/ /g, '-'),
    name: op.title,
    type: 'movie',
  }));

  return metas;
};