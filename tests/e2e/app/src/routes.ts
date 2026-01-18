import { Routes } from '../../../../router/index';
import { HomeComponent } from './pages/home.component';
import { UpperCaseTestComponent } from './pages/uppercase-test.component';
import { LowerCaseTestComponent } from './pages/lowercase-test.component';
import { JsonTestComponent } from './pages/json-test.component';
import { CaseTestComponent } from './pages/case-test.component';
import { DateTestComponent } from './pages/date-test.component';
import { SubstrTestComponent } from './pages/substr-test.component';
import { ChainTestComponent } from './pages/chain-test.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'uppercase', component: UpperCaseTestComponent },
    { path: 'lowercase', component: LowerCaseTestComponent },
    { path: 'json', component: JsonTestComponent },
    { path: 'case', component: CaseTestComponent },
    { path: 'date', component: DateTestComponent },
    { path: 'substr', component: SubstrTestComponent },
    { path: 'chain', component: ChainTestComponent },
];
