import { showDebate } from '../../data/infograficos/debate.js';

export function render(container) {
  return showDebate(container, new URL('./dados.json', import.meta.url));
}
