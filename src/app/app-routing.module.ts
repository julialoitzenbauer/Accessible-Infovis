import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuestionAnswerComponent } from './questionAnswer/questionAnswer.component';
import { NavComponent } from './nav/nav.component';
import { FindErrorsComponent } from './findErrors/findErrors.component';

export const routes: Routes = [
  { path: '', component: NavComponent },
  { path: 'frageAntwort', component: QuestionAnswerComponent },
  { path: 'fehlerFinden', component: FindErrorsComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
