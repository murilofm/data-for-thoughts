import { el, pick, read, ref } from '../../data/infograficos/figura.js';

export async function render(container) {
  const source = new URL('./dados.json', import.meta.url);
  const d = await read(source);
  const season = pick('Temporada', ['Todas','2010','2011','2012 até 31 de outubro']);
  const sort = pick('Ordenar por', ['Ordem da publicação', ...d.metrics]);
  const scroller = el('div');
  scroller.tabIndex = 0;
  scroller.setAttribute('aria-label', 'Tabela de jogadores, com rolagem horizontal');
  scroller.style.overflowX = 'auto';
  const table = el('table');
  table.style.cssText = 'border-collapse:separate;border-spacing:3px;width:100%';
  const head = el('thead');
  const headers = el('tr');
  for (const metric of ['Jogador e clube', ...d.metrics]) headers.append(el('th', metric));
  head.append(headers);
  const body = el('tbody');
  table.append(head, body);
  scroller.append(table);
  container.append(el('h2', 'Como se comparam os artilheiros?'), season.label, document.createTextNode(' '), sort.label, el('p', d.method), scroller);
  function draw() {
    const year = season.select.selectedIndex ? 2009 + season.select.selectedIndex : null;
    const metric = sort.select.selectedIndex - 1;
    const rows = d.observations.filter(row => year === null || row.year === year);
    if (metric >= 0) rows.sort((a,b) => (b.levels[metric] ?? -1) - (a.levels[metric] ?? -1));
    body.replaceChildren();
    for (const entry of rows) {
      const row = el('tr');
      const title = el('th', entry.player + ' · ' + entry.club + ' (' + entry.year + ')');
      title.scope = 'row';
      title.style.cssText = 'text-align:left;min-width:11em';
      row.append(title);
      for (const level of entry.levels) {
        const cell = el('td', level ?? '—');
        cell.style.cssText = 'text-align:center;padding:.55em .35em;background:' + (level ? d.colors[level - 1] : '#eee') + ';color:' + (level >= 7 ? 'white' : '#181818');
        cell.title = level ? 'Intensidade ' + level + ' de 9' : 'Indisponível';
        row.append(cell);
      }
      body.append(row);
    }
  }
  season.select.addEventListener('change', draw);
  sort.select.addEventListener('change', draw);
  draw();
  container.append(el('p','Seleção publicada em 2012, com empates. O recorte de 2012 termina em 31 de outubro.'), ref('Mapa de calor original', new URL(d.source, import.meta.url)), document.createTextNode(' · '), ref('Dados em JSON', source));
}
