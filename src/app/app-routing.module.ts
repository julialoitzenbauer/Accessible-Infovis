import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuestionAnswerComponent } from './questionAnswer/questionAnswer.component';
import { NavComponent } from './nav/nav.component';

export const routes: Routes = [
  { path: '', component: NavComponent },
  { path: 'frageAntwort', component: QuestionAnswerComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
