export const fmt = (value, digits = 0) => Number(value).toLocaleString('pt-BR', {maximumFractionDigits:digits});
export async function dataset(url) {
  const result = await fetch(url);
  if (!result.ok) throw new Error('Dados indisponíveis (' + result.status + ')');
  return result.json();
}
export function item(parent, tag, text) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  parent.append(el);
  return el;
}
export function field(parent, label, values, selected) {
  const caption = item(parent, 'label', label + ' ');
  const select = item(caption, 'select');
  for (const [key, value] of values) {
    const option = item(select, 'option', value);
    option.value = key; option.selected = String(key) === String(selected);
  }
  return select;
}
export function svgNode(parent, tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  parent.append(el);
  return el;
}
export function map(parent,label,viewBox='10 5 445 680') {
  const svg = svgNode(parent,'svg',{viewBox,role:'img','aria-label':label});
  svg.style.cssText='width:100%;height:auto;max-height:540px;display:block;background:#f2f4f2;border-radius:.35rem;margin:.75rem 0';
  return svg;
}
export function source(parent,label,url) {
  const link = item(parent,'a',label);
  link.href=url;
  return link;
}
export function controls(parent) {
  const row = item(parent,'div');
  row.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:.75rem 1.5rem;margin:.75rem 0';
  return row;
}
export function readout(parent) {
  const result = item(parent,'p');
  result.setAttribute('role','status');
  return result;
}
export function rankedTable(parent, columns) {
  const wrap = item(parent,'details');
  item(wrap,'summary','Consultar tabela completa');
  const table=item(wrap,'table');
  table.style.cssText='width:100%;border-collapse:collapse;margin:1rem 0;text-align:left';
  const heading=item(item(table,'thead'),'tr');
  for (const col of columns) item(heading,'th',col);
  const tbody=item(table,'tbody');
  return records => {
    tbody.replaceChildren();
    for (const row of records) {
      const tr=item(tbody,'tr');
      for (const value of row) item(tr,'td',value);
    }
  };
}
