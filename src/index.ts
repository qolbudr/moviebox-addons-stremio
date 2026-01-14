
import { addonBuilder, getRouter, type Args, type ContentType } from 'stremio-addon-sdk';
import express from 'express';
import cors from 'cors';
import { getManifest } from './handler/manifest.handler';
import { movieCatalogHandler } from './handler/movie-catalog.handler';
import { movieMetaHandler } from './handler/movie-meta.handler';
import { movieStreamHandle } from './handler/movie-stream.handler';
import axios, { AxiosError } from 'axios';
import { movieCaptionHanlder } from './handler/movie-caption.handler';
import { seriesCatalogHandler } from './handler/series-catalog.handler';
import { seriesStreamHandle } from './handler/series-stream.handler';
import { seriesCaptionHandler } from './handler/series-caption.handler';

(async () => {
  const addon = express();
  const port = process.env.PORT ?? 1255;

  const manifest = await getManifest();
  const builder = new addonBuilder(manifest);

  builder.defineCatalogHandler(async (args: Args) => {
    if (args.type === 'movie') {
      const movies = await movieCatalogHandler(args);
      return { metas: movies };
    } else {
      const series = await seriesCatalogHandler(args);
      return { metas: series };
    }
  });

  builder.defineMetaHandler(async (args: { type: ContentType; id: string }) => ({
    meta: await movieMetaHandler(args.id, args.type),
  }))

  builder.defineStreamHandler(async (args: { type: ContentType; id: string }) => {
    if (args.type == 'movie') {
      const streams = await movieStreamHandle(args.id);
      return { streams };
    } else {
      const streams = await seriesStreamHandle(args.id);
      return { streams };
    }
  });

  builder.defineSubtitlesHandler(async (args: { type: ContentType; id: string }) => {
    if (args.type == 'movie') {
      const subtitles = await movieCaptionHanlder(args.id);
      return { subtitles };
    } else {
      const subtitles = await seriesCaptionHandler(args.id);
      return { subtitles };
    }
  });

  const requestLogger = function (req: express.Request, res: express.Response, next: express.NextFunction) {
    console.log('--- GOT REQUEST ---');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Time:', new Date().toISOString());
    console.log('-------------------');
    next();
  };

  addon.use(requestLogger);
  addon.use(express.static('public'));
  addon.use(cors());
  addon.use(getRouter(builder.getInterface()));

  addon.get('/api/stream', async (req, res) => {
    try {
      const streamUrl = req.query.url as string;

      if (!streamUrl || (!streamUrl.startsWith('https://bcdnxw.hakunaymatata.com/') && !streamUrl.startsWith('https://valiw.hakunaymatata.com/'))) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid stream URL'
        });
      }

      console.log(`Streaming video: ${streamUrl.substring(0, 100)}...`);
      const range = req.headers.range;
      let fileSize;
      let contentType = 'video/mp4';

      try {
        const headResponse = await axios({
          method: 'HEAD',
          url: streamUrl,
          headers: {
            'User-Agent': 'okhttp/4.12.0',
            'Referer': 'https://fmoviesunblocked.net/',
            'Origin': 'https://fmoviesunblocked.net'
          }
        });

        fileSize = parseInt(headResponse.headers['content-length']);
        contentType = headResponse.headers['content-type'] || contentType;
      } catch (headError) {
        console.log('HEAD request failed, will use GET with range to determine size');
        const testResponse = await axios({
          method: 'GET',
          url: streamUrl,
          responseType: 'stream',
          headers: {
            'User-Agent': 'okhttp/4.12.0',
            'Referer': 'https://fmoviesunblocked.net/',
            'Origin': 'https://fmoviesunblocked.net',
            'Range': 'bytes=0-0'
          }
        });

        testResponse.data.destroy();
        const contentRange = testResponse.headers['content-range'];
        if (contentRange) {
          const match = contentRange.match(/bytes \d+-\d+\/(\d+)/);
          if (match) {
            fileSize = parseInt(match[1]);
          }
        }

        contentType = testResponse.headers['content-type'] || contentType;
      }

      if (!fileSize || isNaN(fileSize)) {
        throw new Error('Could not determine file size');
      }

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        let start = parseInt(parts[0], 10);
        let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        if (isNaN(start) && !isNaN(end)) {
          start = fileSize - end;
          end = fileSize - 1;
        }

        // Validate range
        if (isNaN(start) || isNaN(end) || start < 0 || end >= fileSize || start > end) {
          return res.status(416).set({
            'Content-Range': `bytes */${fileSize}`
          }).json({
            status: 'error',
            message: 'Range not satisfiable'
          });
        }

        const chunkSize = (end - start) + 1;

        console.log(`Range request: bytes ${start}-${end}/${fileSize}`);
        const response = await axios({
          method: 'GET',
          url: streamUrl,
          responseType: 'stream',
          headers: {
            'User-Agent': 'okhttp/4.12.0',
            'Referer': 'https://fmoviesunblocked.net/',
            'Origin': 'https://fmoviesunblocked.net',
            'Range': `bytes=${start}-${end}`
          }
        });

        res.status(206);
        res.set({
          'Content-Type': contentType,
          'Content-Length': chunkSize,
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache'
        });
        response.data.pipe(res);

      } else {
        console.log(`Streaming full file: ${fileSize} bytes`);

        const response = await axios({
          method: 'GET',
          url: streamUrl,
          responseType: 'stream',
          headers: {
            'User-Agent': 'okhttp/4.12.0',
            'Referer': 'https://fmoviesunblocked.net/',
            'Origin': 'https://fmoviesunblocked.net'
          }
        });
        res.status(200);
        res.set({
          'Content-Type': contentType,
          'Content-Length': fileSize,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache'
        });

        response.data.pipe(res);
      }

    } catch (error) {
      console.error('Streaming proxy error:', (error as AxiosError).message);
      if (!res.headersSent) {
        res.status(500).json({
          status: 'error',
          message: 'Failed to stream video',
          error: (error as AxiosError).message
        });
      }
    }
  });

  addon.listen(port, function () {
    console.log(`http://127.0.0.1:${port}`);
  });
})();