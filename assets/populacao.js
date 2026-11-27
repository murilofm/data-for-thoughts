const root = document.querySelector('[data-lab]');
const int = new Intl.NumberFormat('pt-BR');
const percent = new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 1, minimumFractionDigits: 1});
const signed = (n, fmt) => (n > 0 ? '+' : '') + fmt.format(n);
const source = new URL('../data/populacao/distritos.csv', import.meta.url);
const years = [1950,1960,1970,1980,1991,2000,2010,2022];
const NS = 'http://www.w3.org/2000/svg';
function svgNode(name, attrs, content) {
  const node = document.createElementNS(NS, name);
  for (const [key,value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (content !== undefined) node.textContent = content;
  return node;
}
function option(text, value) {
  return new Option(text, value ?? text);
}
function pointLabel(x,y,value,anchor='start') {
  return svgNode('text', {x,y,'text-anchor':anchor,fill:'#445b5d','font-size':13},value);
}
async function main() {
  const response = await fetch(source);
  if (!response.ok) throw new Error(response.status);
  const rows = (await response.text()).trim().split(/\r?\n/).slice(1).map(line => {
    const [region, sub, name, ...values] = line.split(',');
    return {name, region, sub, series:Object.fromEntries(years.map((y,i) => [y,Number(values[i])]))};
  });
  const byName = new Map(rows.map(r=>[r.name,r]));
  const start=root.querySelector('#start'), end=root.querySelector('#end'), metric=root.querySelector('#metric'), district=root.querySelector('#district');
  const rank=root.querySelector('#ranking-svg'), trend=root.querySelector('#trend-svg'), body=root.querySelector('tbody');
  start.replaceChildren(...years.slice(0,-1).map(y=>option(y))); start.value='2010';
  district.replaceChildren(...[...byName.keys()].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(x=>option(x)));
  district.value='Bela Vista';
  function endYears() {
    const prev = Number(end.value);
    end.replaceChildren(...years.filter(y=>y>Number(start.value)).map(y=>option(y)));
    end.value = String(prev > Number(start.value) ? prev : 2022);
  }
  function draw() {
    const begin = start.value, finish = end.value, relative = metric.value === 'percent';
    const value = r => relative ? 100*(r.series[finish]/r.series[begin]-1) : r.series[finish]-r.series[begin];
    const format = n => relative ? signed(n,percent)+'%' : signed(n,int);
    const sorted = [...rows].sort((a,b) => value(b)-value(a) || a.name.localeCompare(b.name,'pt-BR'));
    const low = Math.min(0,...sorted.map(value)), high = Math.max(0,...sorted.map(value));
    const top=24, bottom=205, left=19, right=571;
    const y = n => top+(high-n)/(high-low||1)*(bottom-top);
    rank.replaceChildren(svgNode('title',{},'Variação de população por distrito, da maior até a menor'));
    rank.append(svgNode('line',{x1:left,x2:right,y1:y(0),y2:y(0),stroke:'#668084','stroke-width':1}));
    const bars = [];
    sorted.forEach((r,i) => {
      const delta = value(r), x=left+i*(right-left)/sorted.length, width=(right-left)/sorted.length;
      const group=svgNode('g',{'aria-hidden':'true'});
      const bar=svgNode('rect',{x:x+.4,y:Math.min(y(0),y(delta)),width:width-.8,height:Math.max(1,Math.abs(y(delta)-y(0))),fill:delta>=0?'#1b5556':'#b84626'});
      const hit=svgNode('rect',{x,y:top,width,height:bottom-top,fill:'transparent'});
      group.append(bar,hit,svgNode('title',{},r.name+' · '+format(delta)));
      group.style.cursor='pointer';
      group.addEventListener('pointerenter',()=>{root.querySelector('#rank-readout').textContent=r.name+' · '+format(delta);});
      group.addEventListener('pointerleave',showSelected);
      group.addEventListener('click',()=>select(r.name));
      rank.append(group);bars.push(bar);
    });
    rank.append(pointLabel(left,14,format(high)),pointLabel(right,226,format(low),'end'));
    function showSelected() {
      const r=byName.get(district.value);
      root.querySelector('#rank-readout').textContent=r.name+' · '+format(value(r));
    }
    function select(name) {
      district.value=name;
      const r=byName.get(name);
      sorted.forEach((row,i)=>{bars[i].setAttribute('stroke',row===r?'#081b1c':'none');bars[i].setAttribute('stroke-width',2);});
      showSelected();
      root.querySelector('#chosen-name').textContent=r.name;
      root.querySelector('#chosen-delta').textContent=format(value(r))+(relative?'':' moradores');
      root.querySelector('#chosen-details').textContent=int.format(r.series[begin])+' em '+begin+' · '+int.format(r.series[finish])+' em '+finish+'.';
      root.querySelector('#trend-label').textContent='População de '+name+', 1950 a 2022';
      trend.replaceChildren(svgNode('title',{},'Número de moradores por censo em '+name));
      const max=Math.max(...Object.values(r.series));
      const scaleX=y=>16+(y-1950)/72*328, scaleY=n=>106-n/max*84;
      trend.append(svgNode('line',{x1:16,x2:344,y1:106,y2:106,stroke:'#95a7a2'}));
      const points=years.map(year=>[scaleX(year),scaleY(r.series[year])]);
      trend.append(svgNode('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#196365','stroke-width':2.6}));
      years.forEach((year,i)=>{const [cx,cy]=points[i];const mark=svgNode('circle',{cx,cy,r:3.5,fill:'#196365'});mark.append(svgNode('title',{},year+' · '+int.format(r.series[year])));trend.append(mark);});
      trend.append(pointLabel(16,126,'1950'),pointLabel(344,126,'2022','end'),pointLabel(16,13,'Pico: '+int.format(max)));
    }
    district.onchange=()=>select(district.value);
    select(district.value);
    body.replaceChildren();
    for(const r of sorted) {
      const tr=document.createElement('tr');
      const td=document.createElement('td'),button=document.createElement('button');
      button.type='button';button.textContent=r.name;button.addEventListener('click',()=>select(r.name));td.append(button);tr.append(td);
      for(const cell of [int.format(r.series[begin]),int.format(r.series[finish]),format(value(r))]) {
        const td=document.createElement('td');td.textContent=cell;tr.append(td);
      }
      body.append(tr);
    }
    root.querySelector('#head-start').textContent=begin;root.querySelector('#head-end').textContent=finish;
    const positive=sorted.filter(r=>r.series[finish]>r.series[begin]).length, negative=sorted.filter(r=>r.series[finish]<r.series[begin]).length;
    root.querySelector('#period-desc').textContent=begin+'–'+finish+' · '+positive+' distritos cresceram e '+negative+' perderam moradores.';
  }
  start.addEventListener('change',()=>{endYears();draw();});end.addEventListener('change',draw);metric.addEventListener('change',draw);
  endYears();draw();root.querySelector('.lab-controls').hidden=false;
}
main().catch(e=>{console.error(e);root.querySelector('#period-desc').textContent='O gráfico não carregou. O CSV com as 96 séries está disponível abaixo.';});
