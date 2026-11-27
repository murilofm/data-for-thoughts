const chart = document.querySelector('#od-chart');
const svg = chart.querySelector('svg');
const select = chart.querySelector('select');
const fmt = new Intl.NumberFormat('pt-BR');
async function rows(url) {
  const response = await fetch(url);
  if (!response.ok) throw Error(url);
  return (await response.text()).trim().split(/\r?\n/).slice(1).map(line => line.split(','));
}
function mark(tag, attrs, label = '') {
  const el = document.createElementNS(svg.namespaceURI, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  el.textContent = label;
  svg.append(el);
  return el;
}
async function render() {
  const [pop, trips] = await Promise.all([rows('./distritos.csv'), rows('./mobilidade.csv')]);
  const census = new Map(pop.map(row => [row[2], row.slice(-2).map(Number)]));
  const x = pct => 50 + (pct + 35) * 2.9;
  const y = pct => 180 - pct * 1.8;
  const dots = new Map();
  for (const tick of [-25, 0, 25, 50, 75, 100, 125]) {
    mark('line', {x1:x(tick), x2:x(tick), y1:32, y2:280, stroke:tick ? '#d9dfda' : '#657773'});
    mark('text', {x:x(tick), y:299, 'text-anchor':'middle'}, tick + '%');
  }
  for (const tick of [-50,-25,0,25,50,75]) {
    mark('line', {x1:47,x2:550,y1:y(tick),y2:y(tick),stroke:tick ? '#d9dfda' : '#657773'});
    mark('text', {x:43,y:y(tick)+5,'text-anchor':'end'},tick+'%');
  }
  mark('text',{x:48,y:18},'Viagens ao volante · 2017–2023');
  mark('text',{x:550,y:325,'text-anchor':'end'},'Moradores · 2010–2022');
  function choose(name) {
    for (const {dot} of dots.values()) dot.removeAttribute('stroke');
    const {dot, description} = dots.get(name);
    dot.setAttribute('stroke','#152f32');
    dot.setAttribute('stroke-width','3');
    svg.append(dot);
    select.value = name;
    chart.querySelector('figcaption').textContent = description;
  }
  for (const [name, first, last] of trips.sort((a,b)=>a[0].localeCompare(b[0],'pt-BR'))) {
    const [before, after] = census.get(name);
    const dot = mark('circle',{cx:x(100*(after/before-1)),cy:y(100*(last/first-1)),r:5,fill:after<before && +last>+first ? '#bb4924' : '#76938d'});
    const description = name + ' · Moradores: ' + fmt.format(before) + ' → ' + fmt.format(after) + '. Viagens ao volante: ' + fmt.format(first) + ' → ' + fmt.format(last) + '.';
    dots.set(name,{dot,description});
    select.add(new Option(name,name));
    dot.addEventListener('click',()=>choose(name));
    const title = document.createElementNS(svg.namespaceURI,'title');
    title.textContent = description;
    dot.append(title);
  }
  select.addEventListener('change',()=>choose(select.value));
  choose('Bela Vista');
  chart.hidden = false;
}
render().catch(console.error);

