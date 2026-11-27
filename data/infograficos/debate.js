const format = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
function node(tag, text) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  return el;
}

function selector(caption, options) {
  const label = node('label', caption + ' ');
  const select = node('select');
  for (const [value, name] of options) {
    const option = node('option', name);
    option.value = value;
    select.append(option);
  }
  label.append(select);
  return { label, select };
}

export async function showDebate(container, source) {
  const response = await fetch(source);
  if (!response.ok) throw new Error('Os dados do debate estão indisponíveis.');
  const data = await response.json();
  const heading = node('h2', 'Quais palavras aparecem nas falas de cada candidato?');
  const block = selector('Trecho', [['all', 'Debate inteiro'], ...data.blocks.map(b => [b.n, 'Bloco ' + b.n])]);
  const unit = selector('Mostrar', [['count', 'Número de menções'], ['rate', 'Menções por mil palavras']]);
  const panel = selector('Análise', [['selected','Palavras selecionadas'], ['pronouns','Eu e nós'], ['tone','Pares de palavras do tom'], ['verbs','Tempos verbais'], ['top','Vocabulário mais frequente']]);
  const controls = node('div');
  controls.append(panel.label, document.createTextNode(' '), block.label, document.createTextNode(' '), unit.label);
  const highlight = node('p', 'Na leitura editorial de 2012, os nomes destacados em cada discurso foram ' + data.fixation.Haddad + ' para Haddad e ' + data.fixation.Serra + ' para Serra.');
  const summary = node('p');
  summary.setAttribute('aria-live', 'polite');
  const table = node('table');
  table.style.width = '100%';
  const caption = node('caption', 'Vocabulário selecionado');
  const header = node('tr');
  for (const title of ['Palavra', 'Fernando Haddad', 'José Serra']) header.append(node('th', title));
  const head = node('thead');
  head.append(header);
  const body = node('tbody');
  table.append(caption, head, body);
  const detail = node('p');
  const methodology = node('p', data.method);
  const credit = node('a', 'Transcrição integral publicada pela Folha de S.Paulo');
  credit.href = data.transcript;
  const download = node('a', 'Baixar contagens (JSON)');
  download.href = source;
  download.download = 'debate-' + data.date + '.json';
  container.append(heading, controls, summary, detail, table, highlight, methodology, credit, document.createTextNode(' · '), download);

  function draw() {
    const mode = panel.select.value;
    const top = mode === 'top';
    block.label.hidden = top;
    const selected = data.blocks.filter(b => top || block.select.value === 'all' || b.n === Number(block.select.value));
    const metrics = {
      pronouns: [['Eu','singular'], ['Nós','plural']],
      tone: [['Grupo negativo','negativo'], ['Grupo positivo','positivo']],
      verbs: [['Passado','passado'], ['Presente','presente'], ['Futuro','futuro']]
    }[mode];
    const labels = top ? [...new Set([...data.top.Haddad,...data.top.Serra].map(pair => pair[0]))] : metrics ? metrics.map(m => m[0]) : data.terms;
    const descriptions = {
      selected:'A seleção permite comparar temas e nomes ao longo do debate.',
      pronouns:'Contagem dos pronomes explícitos “eu” e “nós”. O português também permite omitir o sujeito.',
      tone:'O infográfico reuniu “não/sim”, “nunca/sempre”, “nenhum/todo”, “nada/tudo”, “menos/mais” e “ainda/já”. A contagem inclui flexões de nenhum e todo. Esses pares são uma convenção do autor, e seu sentido depende do contexto.',
      verbs:'Contagem de formas selecionadas do indicativo dos verbos ser, ir, estar e fazer. O dicionário inclui as formas no JSON. A expressão “São Paulo” foi excluída da contagem de “são”. A classificação usa a forma da palavra e pode incluir usos ambíguos.',
      top:'Termos mais frequentes de cada candidato no debate inteiro, após remover palavras comuns. São Paulo conta como uma expressão. Uma célula sem valor indica que o termo ficou fora dos 12 primeiros daquele candidato.'
    };
    detail.textContent = descriptions[mode];
    caption.textContent = panel.select.selectedOptions[0].textContent;
    const columns = ['Haddad', 'Serra'].map(name => {
      const words = selected.reduce((sum, b) => sum + b[name].words, 0);
      const turns = selected.reduce((sum, b) => sum + b[name].turns, 0);
      const values = labels.map((term, i) => {
        const count = top ? data.top[name].find(pair => pair[0] === term)?.[1] : selected.reduce((sum, b) => sum + (metrics ? b[name].lexicon[metrics[i][1]] : b[name].terms[i]), 0);
        if (count === undefined) return null;
        return unit.select.value === 'rate' ? (words ? 1000 * count / words : 0) : count;
      });
      return { words, turns, values };
    });
    summary.textContent = columns.map((c, i) => (i ? 'Serra' : 'Haddad') + ' teve ' + c.turns + ' turnos de fala e ' + format.format(c.words) + ' palavras').join('. ') + '.';
    const ranked = labels.map((term, i) => ({ term, values: columns.map(c => c.values[i]) }));
    ranked.sort((a, b) => (b.values[0] + b.values[1]) - (a.values[0] + a.values[1]) || a.term.localeCompare(b.term, 'pt-BR'));
    const max = Math.max(1, ...ranked.flatMap(row => row.values));
    body.replaceChildren();
    for (const {term, values} of ranked) {
      const row = node('tr');
      const title = node('th', term);
      title.scope = 'row';
      title.style.textAlign = 'left';
      row.append(title);
      for (const value of values) {
        const cell = node('td', value === null ? '—' : format.format(value));
        const bar = node('span');
        bar.style.cssText = 'display:block;height:4px;background:#167669;border-radius:2px;width:' + (100 * value / max) + '%';
        cell.append(bar);
        row.append(cell);
      }
      body.append(row);
    }
  }
  panel.select.addEventListener('change', draw);
  block.select.addEventListener('change', draw);
  unit.select.addEventListener('change', draw);
  draw();
}
