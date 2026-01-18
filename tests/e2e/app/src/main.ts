import { bootstrapApplication } from '../../../../platform-browser/browser';
import { ApplicationConfig } from '../../../../core/index';
import { provideRouter } from '../../../../router/index';
import { AppComponent } from './app.component';
import { routes } from './routes';

const appConfig: ApplicationConfig = {
    providers: [provideRouter(routes)],
};

bootstrapApplication(AppComponent, appConfig);
