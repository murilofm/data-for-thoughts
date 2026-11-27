import { gerarChegadas, simular } from './modelo.mjs';

const ns = 'http://www.w3.org/2000/svg';
const fmt = new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 1});
function linha(svg, pontos, cor, tracejada) {
  const linha = document.createElementNS(ns, 'polyline');
  linha.setAttribute('points', pontos);
  linha.setAttribute('fill', 'none');
  linha.setAttribute('stroke', cor);
  linha.setAttribute('stroke-width', '2.5');
  if (tracejada) linha.setAttribute('stroke-dasharray', '5 4');
  svg.append(linha);
}

export async function render(container, key) {
  container.innerHTML = `<section>
    <h2>Quanto tempo se gasta procurando vaga?</h2>
    <p>Compare uma rua com 12 vagas a uma rua redesenhada. Ao retirar vagas, quantos motoristas precisariam mudar o plano da viagem para reduzir a circulação à procura de estacionamento?</p>
    <label>Vagas depois da mudança <input data-vagas type="range" min="0" max="24" value="6"> <output data-q></output></label>
    <br><label>Motoristas que evitam a busca depois da mudança <input data-desvio type="range" min="0" max="100" step="5" value="50"> <output data-p></output></label>
    <p data-resultado aria-live="polite"></p>
    <figure style="margin:1rem 0">
      <figcaption>Carros à procura de vaga, minuto a minuto</figcaption>
      <svg data-grafico viewBox="0 0 560 150" width="100%" style="max-width:780px;display:block;background:#f3f6f5" role="img" aria-label="Evolução do número de carros à procura de vaga. Totais na tabela abaixo."></svg>
      <small data-escala></small>
    </figure>
    <table><caption>Resultado para as mesmas chegadas</caption><thead><tr><th scope="col">Medida</th><th scope="col">Antes</th><th scope="col">Depois</th></tr></thead><tbody data-tabela></tbody></table>
    <details><summary>Como o modelo funciona</summary><p>Reconstrução do mecanismo descrito em 2014. Cada execução usa as mesmas chegadas e durações. Durante 180 minutos podem chegar até dois carros por minuto, com probabilidades independentes de 85% e 45%. A permanência varia de 6 a 20 minutos. Usamos a semente 2014. Esses valores são hipóteses da reconstrução.</p>
    <p>Antes da mudança, todos procuram vaga na rua. Depois, a fração escolhida vai direto a uma alternativa. Os demais procuram por até 10 minutos. Quem já espera tem prioridade. A simulação continua após a última chegada até a fila acabar. Um carro à procura por um minuto soma um carro-minuto.</p>
    <p>O resultado mede somente a circulação de procura. A capacidade viária, as viagens de bicicleta, a disponibilidade de garagens e o congestionamento geral ficariam a cargo de um modelo de transporte.</p>
    <p>O estudo citado no blog encontrou médias de 3,5 a 14 minutos de procura em diferentes centros urbanos. As medições variam conforme o local e o período. <a href="./estudos.csv" download>Baixar as 16 observações da tabela 1 (CSV)</a>. <a href="https://doi.org/10.1016/j.tranpol.2006.05.005">Donald Shoup, Cruising for parking (2006)</a></p>
    <p><a href="https://dataforthoughts.wordpress.com/2014/10/20/vagas-de-rua-e-ciclovias-sp-netlogo/">Ler o artigo original</a></p></details>
    </section>`;
  const el = s => container.querySelector('[data-' + s + ']');
  const chegadas = gerarChegadas();
  const antes = simular(chegadas, 12, 0);
  function atualizar() {
    const vagas = Number(el('vagas').value);
    const percentual = Number(el('desvio').value);
    const depois = simular(chegadas, vagas, percentual / 100);
    el('q').textContent = vagas;
    el('p').textContent = percentual + '%';
    const delta = depois.carrosMinuto - antes.carrosMinuto;
    el('resultado').textContent = delta ? 'Com ' + chegadas.length + ' chegadas, o novo cenário gera ' + fmt.format(Math.abs(delta)) + ' carros-minuto a ' + (delta > 0 ? 'mais.' : 'menos.') : 'O tempo total de procura é igual nos dois cenários.';
    const svg = el('grafico');
    svg.replaceChildren();
    const maxX = Math.max(antes.procurando.length, depois.procurando.length) - 1;
    const maxY = Math.max(...antes.procurando, ...depois.procurando, 1);
    const pontos = valores => valores.map((n, i) => (5 + 550*i/maxX).toFixed(2) + ',' + (145 - 140*n/maxY).toFixed(2)).join(' ');
    linha(svg, pontos(antes.procurando), '#58636b', true);
    linha(svg, pontos(depois.procurando), '#00695b', false);
    el('escala').textContent = 'Tempo de 0 a ' + maxX + ' minutos. Escala vertical de 0 a ' + maxY + ' carros. Linha tracejada: antes. Linha contínua: depois.';
    const medidas = [['Tempo de procura (carros-minuto)', 'carrosMinuto'], ['Estacionaram na rua', 'estacionados'], ['Evitaram a busca', 'redirecionados'], ['Esgotaram o tempo de busca', 'desistencias']];
    const tabela = el('tabela');
    tabela.replaceChildren();
    for (const [nome, chave] of medidas) {
      const row = tabela.insertRow();
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = nome;
      row.append(th);
      row.insertCell().textContent = fmt.format(antes[chave]);
      row.insertCell().textContent = fmt.format(depois[chave]);
    }
  }
  el('vagas').addEventListener('input', atualizar);
  el('desvio').addEventListener('input', atualizar);
  atualizar();
}
