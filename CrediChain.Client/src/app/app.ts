import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from "@shared/header/header";
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('CrediChain.Client');

  
}
