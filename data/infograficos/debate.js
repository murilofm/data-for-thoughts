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
  const controls = node('div');
  controls.append(block.label, document.createTextNode(' '), unit.label);
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
  const methodology = node('p', data.method);
  const credit = node('a', 'Transcrição integral publicada pela Folha de S.Paulo');
  credit.href = data.transcript;
  const download = node('a', 'Baixar contagens (JSON)');
  download.href = source;
  download.download = 'debate-' + data.date + '.json';
  container.append(heading, controls, summary, table, methodology, credit, document.createTextNode(' · '), download);

  function draw() {
    const selected = data.blocks.filter(b => block.select.value === 'all' || b.n === Number(block.select.value));
    const columns = ['Haddad', 'Serra'].map(name => {
      const words = selected.reduce((sum, b) => sum + b[name].words, 0);
      const turns = selected.reduce((sum, b) => sum + b[name].turns, 0);
      const values = data.terms.map((_, i) => {
        const count = selected.reduce((sum, b) => sum + b[name].terms[i], 0);
        return unit.select.value === 'rate' ? (words ? 1000 * count / words : 0) : count;
      });
      return { words, turns, values };
    });
    summary.textContent = columns.map((c, i) => (i ? 'Serra' : 'Haddad') + ' teve ' + c.turns + ' turnos de fala e ' + format.format(c.words) + ' palavras').join('. ') + '.';
    const ranked = data.terms.map((term, i) => ({ term, values: columns.map(c => c.values[i]) }));
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
        const cell = node('td', format.format(value));
        const bar = node('span');
        bar.style.cssText = 'display:block;height:4px;background:#167669;border-radius:2px;width:' + (100 * value / max) + '%';
        cell.append(bar);
        row.append(cell);
      }
      body.append(row);
    }
  }
  block.select.addEventListener('change', draw);
  unit.select.addEventListener('change', draw);
  draw();
}
