export function el(tag, text) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  return element;
}

export function pick(caption, choices, selected = 0) {
  const label = el('label', caption + ' ');
  const select = el('select');
  for (const [i, choice] of choices.entries()) {
    const option = el('option', choice);
    option.value = String(i);
    select.append(option);
  }
  select.selectedIndex = selected;
  label.append(select);
  return {label, select};
}

export function ranked(title, rows, format, ceiling = null) {
  const table = el('table');
  table.style.width = '100%';
  table.append(el('caption', title));
  const max = ceiling ?? Math.max(...rows.map(row => row[1]));
  const body = el('tbody');
  for (const [name, value] of rows) {
    const row = el('tr');
    const header = el('th', name);
    header.scope = 'row';
    header.style.cssText = 'text-align:left;width:52%;padding:.4em .3em;overflow-wrap:anywhere';
    const cell = el('td', format(value));
    const bar = el('span');
    bar.setAttribute('aria-hidden', 'true');
    bar.style.cssText = 'display:block;background:#167669;height:5px;border-radius:2px;width:' + Math.min(100, value/max*100) + '%';
    cell.append(bar);
    row.append(header, cell);
    body.append(row);
  }
  table.append(body);
  return table;
}

export async function read(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Os dados da figura estão indisponíveis.');
  return response.json();
}
export const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
export function ref(text, url) {
  const link = el('a', text);
  link.href = url;
  return link;
}
