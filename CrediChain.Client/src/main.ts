import { Buffer } from 'buffer';

(window as any).global = window;
(window as any).Buffer = (window as any).Buffer || Buffer;


import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
