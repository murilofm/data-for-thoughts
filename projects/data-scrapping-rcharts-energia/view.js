const number = new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 2});
const definitions = {
  reservoir: { title:'Volume útil dos reservatórios (%)', max:100, columns:[['level','Volume útil','#145c70'], ['mean','Média do período','#af6028']] },
  generation: { title:'Geração diária (média de 2013 = 100)', max:180, columns:[['GWh_term','Térmica','#a24836'], ['GWh_hidro','Hidráulica','#267493']] }
};
const ns = 'http://www.w3.org/2000/svg';
function svgNode(tag, attrs, label) {
  const n = document.createElementNS(ns, tag);
  Object.entries(attrs).forEach(([k,v]) => n.setAttribute(k, v));
  if (label !== undefined) n.textContent = label;
  return n;
}
function displayDate(date) {return date.split('-').reverse().join('/');}
export async function render(container) {
  const src = new URL('energia.csv', import.meta.url);
  const response = await fetch(src);
  if (!response.ok) throw new Error('Não foi possível abrir a série do ONS.');
  const rows = (await response.text()).trim().split(/\r?\n/).slice(1).map(line => {
    const [date,...v] = line.split(',');
    const [level,mean,GWh_term,GWh_hidro] = v.map(x => x === '' ? null : Number(x));
    return {date,time:Date.parse(date), level,mean,GWh_term,GWh_hidro};
  });
  container.innerHTML = `<section><h2>Os reservatórios e a virada das térmicas</h2>
    <p>O volume útil fechou a série em 44,09% no dia 6 de março de 2014. A referência exibida no gráfico original era 69,58%. Compare o nível dos reservatórios com a evolução da geração térmica e hidráulica no período.</p>
    <label>Medida <select name="medida"><option value="reservoir">Volume útil</option><option value="generation">Geração térmica e hidráulica</option></select></label>
    <label>Período <select name="ano"><option value="">Todo o período</option></select></label>
    <div class="grafico" style="margin-top:1rem"></div>
    <label>Consultar dia da série <input name="dia" type="range" min="0" step="1" style="width:min(100%,28rem)"></label>
    <p class="leitura" aria-live="polite"></p>
    <p>Em dias sem registro, a linha fica interrompida. A geração é um índice com média de 2013 igual a 100 para cada fonte. Cada unidade representa 1% dessa média.</p>
    <p><a class="download" download>Baixar os 1.861 registros (CSV)</a> · <a class="script">Extrair a série em Python</a> · <a href="https://drive.google.com/file/d/0B1nuI_FiZnnlVldzZDBTcDFzZFE/view?resourcekey=0-z1NcGgklegZhpgoIV20KtQ">Arquivo rCharts de 2014</a></p></section>`;
  container.querySelector('.download').href = src;
  container.querySelector('.script').href = new URL('extrair.py', import.meta.url);
  const metric = container.querySelector('[name=medida]'), year = container.querySelector('[name=ano]'), slider = container.querySelector('[name=dia]');
  for (const y of new Set(rows.map(r=>r.date.slice(0,4)))) year.add(new Option(y,y));
  let shown, chart, scaleX, cursor, config;
  function read(i) {
    i = Math.max(0,Math.min(shown.length-1,i));
    const r = shown[i]; slider.value = i;
    cursor.setAttribute('x1',scaleX(r.time)); cursor.setAttribute('x2',scaleX(r.time));
    const parts = config.columns.map(([key,label]) => label + ' ' + (r[key] === null ? 'sem registro' : number.format(r[key]) + (metric.value === 'reservoir' ? '%' : '')));
    container.querySelector('.leitura').textContent = displayDate(r.date) + ' · ' + parts.join(' · ');
    slider.setAttribute('aria-valuetext',displayDate(r.date));
  }
  function draw() {
    shown = rows.filter(r=>r.date.startsWith(year.value));
    config = definitions[metric.value];
    const start=shown[0].time, end=shown.at(-1).time, left=41, right=734, top=35, bottom=210;
    scaleX = time=>left+(right-left)*(time-start)/(end-start);
    const max = Math.max(config.max, ...shown.flatMap(r => config.columns.map(([k])=>r[k] ?? 0)));
    const scaleY = value=>bottom-(bottom-top)*value/max;
    chart = svgNode('svg',{viewBox:'0 0 760 252',style:'width:100%;height:auto;display:block',role:'img','aria-label':config.title});
    chart.append(svgNode('title',{},config.title));
    chart.append(svgNode('text',{x:left,y:18,'font-size':15,fill:'currentColor'},config.title));
    for (let i=0;i<=4;i++){
      const v=max*i/4,y=scaleY(v);
      chart.append(svgNode('line',{x1:left,x2:right,y1:y,y2:y,stroke:'#d6dddf'}));
      chart.append(svgNode('text',{x:left-6,y:y+4,'text-anchor':'end','font-size':12,fill:'currentColor'},number.format(v)));
    }
    for (const [k,label,color] of config.columns) {
      let path='',last=NaN;
      for(const r of shown){if(r[k]===null){last=NaN;continue;}
        const move=(r.time-last!==86400000); path += (move?'M':'L')+scaleX(r.time).toFixed(2)+' '+scaleY(r[k]).toFixed(2)+' '; last=r.time;
      }
      const line=svgNode('path',{d:path,fill:'none',stroke:color,'stroke-width':1.7});
      line.append(svgNode('title',{},label)); chart.append(line);
    }
    [shown[0],shown.at(-1)].forEach((r,i)=>chart.append(svgNode('text',{x:scaleX(r.time),y:232,'text-anchor':i?'end':'start','font-size':13,fill:'currentColor'},displayDate(r.date))));
    cursor=svgNode('line',{y1:top,y2:bottom,stroke:'#555','stroke-dasharray':'4 3'});chart.append(cursor);
    chart.addEventListener('pointerdown',e=>{
      const rect=chart.getBoundingClientRect(), t=start+(((e.clientX-rect.left)/rect.width*760-left)/(right-left))*(end-start);
      let closest=0; for(let i=1;i<shown.length;i++) if(Math.abs(shown[i].time-t)<Math.abs(shown[closest].time-t))closest=i;
      read(closest);
    });
    const legend=document.createElement('p');
    for (const [,label,color] of config.columns){const item=document.createElement('span');item.style.cssText='display:inline-block;margin-right:1.2em;border-bottom:3px solid '+color;item.textContent=label;legend.append(item);}
    container.querySelector('.grafico').replaceChildren(legend,chart);
    slider.max=shown.length-1;read(shown.length-1);
  }
  metric.addEventListener('change',draw);year.addEventListener('change',draw);slider.addEventListener('input',()=>read(Number(slider.value)));draw();
}
