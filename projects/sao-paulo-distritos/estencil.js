import { sectorStencil } from '../banksy-sao-paulo-e-a-bela-vista/sector-stencil.js';

async function activate(figure) {
  const stencil = await sectorStencil();
  const slider = figure.querySelector('#density-cutoff');
  const value = figure.querySelector('#density-value');

  function draw() {
    const cutoff = slider.valueAsNumber;
    stencil.draw(cutoff);
    value.value = cutoff.toLocaleString('pt-BR') + ' hab./km²';
    slider.setAttribute('aria-valuetext', value.value);
  }

  draw();
  slider.addEventListener('input', draw);
  figure.querySelector('.stencil-stage').replaceChildren(stencil.canvas);
  const legend = figure.querySelector('#stencil-legend');
  const link = legend.querySelector('a');
  legend.replaceChildren('Em preto, setores com densidade igual ou superior ao limite. Setores sem dado ficam em branco. ', link, ' (2014).');
  figure.querySelector('.stencil-control').hidden = false;
}

activate(document.querySelector('.stencil')).catch(error => {
  // The printed 2014 figure and its source remain visible if enhancement fails.
  console.warn('Não foi possível carregar o estêncil interativo.', error);
});
