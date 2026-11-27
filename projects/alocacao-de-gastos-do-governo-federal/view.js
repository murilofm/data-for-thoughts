import { el, pick, ranked, read, number, ref } from '../../data/infograficos/figura.js';

export async function render(container) {
  const source = new URL('./dados.json', import.meta.url);
  const d = await read(source);
  const categories = ['Despesas por função','Previdência por regime','Legislativo por casa','Transporte por modal','Receitas do quadro original'];
  const metric = pick('Painel', categories);
  const scale = pick('Unidade', ['R$ bilhões', '% da despesa total']);
  const display = el('div');
  display.setAttribute('aria-live', 'polite');
  container.append(el('h2', 'Para onde foram os gastos da União em 2011?'), metric.label, document.createTextNode(' '), scale.label, display);
  function draw() {
    const index = metric.select.selectedIndex;
    scale.label.hidden = index !== 0;
    const percent = index === 0 && scale.select.selectedIndex === 1;
    const rows = [d.functions,d.pensions,d.legislature,d.transport,d.receipts][index];
    const formatter = percent ? (v => number.format(v / d.total * 100) + '%') : (v => 'R$ ' + number.format(v) + ' bi');
    const note = [
      'A referência é a despesa total publicada de R$ 1,57 trilhão. Os valores são nominais e arredondados. Encargos incluem serviço da dívida, serviços financeiros e transferências.',
      'O gráfico de 2012 também registrou benefícios médios mensais de aproximadamente R$ 800 no regime privado e R$ 7 mil para servidores da União no regime público.',
      'A divisão pelo número de parlamentares apresentada no original foi de R$ 7,3 milhões por deputado e R$ 39,6 milhões por senador, ao ano. São valores do orçamento das casas legislativas.',
      'O infográfico detalha quatro modais dentro de R$ 11 bilhões na função transporte. As quatro barras cobrem parte dessa função.',
      'O primeiro valor representa a receita total realizada do governo federal. Os dois valores tributários reproduzem os rótulos e esferas do infográfico. Os três valores têm abrangências distintas.'
    ][index];
    display.replaceChildren(ranked(categories[index], rows, formatter, percent ? d.total : null), el('p', note));
  }
  metric.select.addEventListener('change', draw);
  scale.select.addEventListener('change', draw);
  draw();
  container.append(ref('Infográfico de 2012 e fontes', new URL(d.source, import.meta.url)), document.createTextNode(' · '), ref('Dados em JSON', source));
}
