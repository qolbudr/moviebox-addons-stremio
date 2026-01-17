
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
  
  addon.listen(port, function () {
    console.log(`http://127.0.0.1:${port}`);
  });
})();