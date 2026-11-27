export async function render(container, key) {
  const response = await fetch(new URL('./observacoes.json', import.meta.url));
  if (!response.ok) throw new Error('Não foi possível carregar os marcos do relato.');
  const dados = await response.json();
  const curva = await fetch(new URL('./curvas.csv', import.meta.url));
  if (!curva.ok) throw new Error('Não foi possível carregar as curvas digitalizadas.');
  const pontos = (await curva.text()).trim().split('\n').slice(1).map(line => line.split(','));
  container.innerHTML = `<section>
    <h2>Uma recuperação contada em marcos</h2>
    <p>Relato pessoal iniciado em maio de 2016 em Itacaré, na Bahia. A sequência acompanha as lembranças de uma pessoa. O espaçamento entre os marcos é ilustrativo.</p>
    <figure style="margin:1.25rem 0"><figcaption>Intensidade dos sintomas no desenho do autor</figcaption>
      <svg viewBox="0 0 1000 370" width="100%" role="img" aria-label="A intensidade tem um pico no início de maio e volta a oscilar em julho e agosto. O relato não informa uma escala numérica."></svg>
      <p><small>Altura relativa do traço desde 30 de abril até 22 de agosto de 2016. A imagem original não traz uma escala clínica. As cores e a sobreposição das fases seguem o desenho publicado.</small></p></figure>
    <p><small>Azul · aguda. Laranja · subaguda. Cinza · crônica (hipótese do autor).</small></p>
    <label>Mostrar fase <select><option>Todas</option></select></label>
    <ol style="list-style:none;padding:0;border-left:2px solid #779b93;margin:1.2rem 0 1.2rem .4rem"></ol>
    <p><a href="./curvas.csv" download>Curvas digitalizadas (CSV)</a> · <a href="./observacoes.json" download>Baixar os marcos (JSON)</a> · <a data-original>Relato original de 2016</a></p>
  </section>`;
  const select = container.querySelector('select');
  for (const fase of new Set(dados.events.map(evento => evento.phase))) {
    select.add(new Option(fase, fase));
  }
  select.add(new Option('Crônica (hipótese do gráfico)', 'Crônica'));
  const lista = container.querySelector('ol');
  const chart = container.querySelector('svg');
  const ns = 'http://www.w3.org/2000/svg';
  function desenhar() {
    chart.replaceChildren();
    const incluir = nome => select.value === 'Todas' || select.value === nome;
    function add(tag, atributos, label) {
      const element = document.createElementNS(ns, tag);
      for (const [k, v] of Object.entries(atributos)) element.setAttribute(k, v);
      if (label) element.textContent = label;
      chart.append(element);
    }
    for (const [x, data] of [[19, '30/abr'],[284, '31/mai'],[540, '30/jun'],[806, '31/jul'],[994, '22/ago']]) {
      add('line', {x1:x,x2:x,y1:12,y2:330,stroke:'#dce5e1'});
      add('text', {x,y:361,'text-anchor': x===19?'start':x===994?'end':'middle',fill:'currentColor','font-size':20}, data);
    }
    const curvas = [
      ['Crônica', 4, '#80878d', 7], ['Subaguda', 3, '#cc5a24', 3], ['Aguda', 2, '#3077aa', 3]
    ];
    for (const [nome, coluna, cor, largura] of curvas) {
      if (!incluir(nome)) continue;
      let segmentos = '', mover = true;
      for (const row of pontos) {
        if (!row[coluna]) { mover = true; continue; }
        const y = 10 + 320 * (Number(row[coluna]) - 120) / (556 - 120);
        segmentos += (mover ? 'M' : 'L') + row[1] + ' ' + y.toFixed(1) + ' ';
        mover = false;
      }
      add('path', {d:segmentos, fill:'none',stroke:cor,'stroke-width':largura,'stroke-linejoin':'round'});
    }
  }
  container.querySelector('[data-original]').href = dados.source;
  function atualizar() {
    chart.closest('figure').hidden = select.value === 'Em aberto';
    desenhar();
    lista.replaceChildren();
    if (select.value === 'Crônica') {
      const item = document.createElement('li');
      item.style.padding = '0 1rem';
      item.textContent = 'A curva cinza representa uma hipótese gráfica do autor. O texto deixa a data de transição em aberto.';
      lista.append(item);
    }
    for (const evento of dados.events.filter(x => select.value === 'Todas' || x.phase === select.value)) {
      const item = document.createElement('li');
      item.style.cssText = 'position:relative;padding:0 0 1.2rem 1.25rem';
      const marco = document.createElement('span');
      marco.setAttribute('aria-hidden', 'true');
      marco.style.cssText = 'position:absolute;left:-5px;top:.4rem;width:8px;height:8px;border-radius:100%;background:#146657';
      const momento = document.createElement('small');
      momento.textContent = evento.when + ' · ' + evento.phase;
      const titulo = document.createElement('h3');
      titulo.style.margin = '.25rem 0';
      titulo.textContent = evento.label;
      const detalhe = document.createElement('p');
      detalhe.style.margin = '0';
      detalhe.textContent = evento.detail;
      item.append(marco, momento, titulo, detalhe);
      lista.append(item);
    }
  }
  select.addEventListener('change', atualizar);
  atualizar();
}
