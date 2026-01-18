import { Component } from '../../../../core/index';
import { RouterOutlet } from '../../../../router/index';

@Component({
    selector: 'app-root',
    template: `
        <nav>
            <a href="/">Home</a> |
            <a href="/uppercase">UpperCase</a> |
            <a href="/lowercase">LowerCase</a> |
            <a href="/json">JSON</a> |
            <a href="/case">Case</a> |
            <a href="/date">Date</a> |
            <a href="/substr">Substr</a> |
            <a href="/chain">Chain</a>
        </nav>
        <router-outlet></router-outlet>
    `,
    imports: [RouterOutlet],
})
export class AppComponent {}
