import { el, pick, ranked, read, number, ref } from '../../data/infograficos/figura.js';

export async function render(container) {
  const source = new URL('./dados.json', import.meta.url);
  const d = await read(source);
  const section = pick('Indicador', ['Vítimas por grupo','Período e dia da semana','Frota e deslocamento no infográfico']);
  const year = pick('Ano', d.victims.years.map(String), 2);
  const period = pick('Período', ['Dia e noite','Dia','Noite']);
  const result = el('div');
  result.setAttribute('aria-live', 'polite');
  container.append(el('h2','O trânsito no município de São Paulo'), section.label, document.createTextNode(' '), year.label, period.label, result);
  function draw() {
    const index = section.select.selectedIndex;
    year.label.hidden = index !== 0;
    period.label.hidden = index !== 1;
    result.replaceChildren();
    if (index === 0) {
      const y = year.select.selectedIndex;
      const values = d.victims.values[y];
      const rows = d.victims.categories.map((category, i) => [category, values[i]]).sort((a,b) => b[1] - a[1]);
      result.append(ranked('Vítimas fatais por grupo, ' + d.victims.years[y], rows, v => number.format(v)), el('p', 'Total de ' + number.format(d.victims.totals[y]) + ' pessoas mortas. ' + d.victims.notes), ref('Relatório da Prefeitura com dados da CET', d.victims.source));
    } else if (index === 1) {
      const p = period.select.selectedIndex;
      const rows = d.week.days.map((day, i) => [day, p === 0 ? d.week.day[i] + d.week.night[i] : p === 1 ? d.week.day[i] : d.week.night[i]]);
      result.append(ranked('Registros por dia da semana, 2011', rows, v => number.format(v)), el('p', d.week.note));
    } else {
      const table = el('table');
      table.append(el('caption', 'Dados citados na publicação de novembro de 2012'));
      for (const [label,value,unit] of d.context) {
        const row = el('tr');
        const title = el('th', label);
        title.scope = 'row';
        title.style.textAlign = 'left';
        row.append(title, el('td', number.format(value) + ' ' + unit));
        table.append(row);
      }
      result.append(table, el('p','Os indicadores desta tabela reproduzem o recorte histórico publicado pelo blog.'));
    }
  }
  for (const control of [section,year,period]) control.select.addEventListener('change', draw);
  draw();
  container.append(el('p'), ref('Infográfico de 2012 e fontes', new URL(d.source, import.meta.url)), document.createTextNode(' · '), ref('Dados em JSON', source));
}
