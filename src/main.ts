import './styles/index.css';
import { TimelineApp } from './app';

document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.querySelector<HTMLDivElement>('#app');
  if (appContainer) {
    new TimelineApp(appContainer);
  }
});
