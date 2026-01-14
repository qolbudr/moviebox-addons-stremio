import axios from 'axios';

async function fetchTmdbId(imdbId: string) {
  try {
    const response = await axios.get(`https://api.themoviedb.org/3/find/${imdbId}?external_source=imdb_id`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3M2EyNzkwNWM1Y2IzNjE1NDUyOWNhN2EyODEyMzc0NCIsIm5iZiI6MS43MjM1ODA5NTAwMDg5OTk4ZSs5LCJzdWIiOiI2NmJiYzIxNjI2NmJhZmVmMTQ4YzVkYzkiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.y7N6qt4Lja5M6wnFkqqo44mzEMJ60Pzvm0z_TfA1vxk'
        }
      }
    );
    return response.data;
  } catch (e) {
    console.log(`Error fetching metadata: ${e}`)
    return null
  }
}

async function fetchOmdbDetails(imdbId: string) {
  try {
    const response = await axios.get(`https://www.omdbapi.com/?i=${imdbId}&apikey=b1e4f11`);
    if (response.data.Response === 'False') {
      throw new Error(response.data || 'Failed to fetch data from OMDB API');
    }
    return response.data;
  } catch (e) {
    console.log(`Error fetching metadata: ${e}`)
    return null
  }
}

export default { fetchTmdbId, fetchOmdbDetails };