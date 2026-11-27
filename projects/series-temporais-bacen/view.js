// Reconstrução do exemplo getValor(4380, 18/06/2011).
export async function render(container) {
  container.innerHTML = `<section><h2>Quanto valia o PIB mensal em junho de 2011?</h2>
    <p>No exemplo publicado em dezembro de 2013, o Banco Central retornava <strong>R$ 358.007,80 milhões</strong> para junho de 2011. A estimativa do PIB mensal pode mudar quando o Banco Central incorpora revisões.</p>
    <form><label>Código da série SGS <input name="serie" type="number" min="1" step="1" value="4380" required></label>
    <label>Mês da consulta <input type="month" name="mes" value="2011-06" required></label>
    <button type="submit">Consultar o Banco Central</button></form>
    <p role="status"></p><div class="resultado"></div>
    <p><a class="download" download>Baixar o valor publicado em 2013 (CSV)</a> · <a class="api">Abrir consulta no SGS</a></p>
    <details><summary>Reproduzir no Excel</summary><p>Em Dados, escolha Obter Dados, Da Web. Cole o endereço da consulta em CSV e importe as colunas de data e valor com a localidade Português (Brasil). Atualize a consulta para obter a edição mais recente da série.</p><a class="excel">Abrir o CSV do Banco Central</a></details>
  </section>`;
  const form = container.querySelector('form');
  const status = container.querySelector('[role="status"]');
  const output = container.querySelector('.resultado');
  container.querySelector('.download').href = new URL('observacao.csv', import.meta.url);
  let request;
  function makeUrl() {
    if (!form.checkValidity()) return;
    const series = form.elements.serie.value;
    const [year, month] = form.elements.mes.value.split('-');
    if (!/^\d+$/.test(series) || !/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) return;
    const last = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
    const url = new URL('https://api.bcb.gov.br/dados/serie/bcdata.sgs.' + series + '/dados');
    url.search = new URLSearchParams({ formato: 'json', dataInicial: '01/' + month + '/' + year, dataFinal: last + '/' + month + '/' + year });
    return url;
  }
  function updateLinks() {
    const url = makeUrl();
    const api = container.querySelector('.api'), excel = container.querySelector('.excel');
    if (!url) {api.removeAttribute('href'); excel.removeAttribute('href'); return;}
    api.href = url.href;
    url.searchParams.set('formato', 'csv');
    excel.href = url.href;
  }
  updateLinks();
  form.addEventListener('input', () => { request?.abort(); request = undefined; status.textContent = ''; output.replaceChildren(); updateLinks(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const url = makeUrl();
    if (!url) return;
    request?.abort();
    const active = new AbortController();
    request = active;
    const timer = setTimeout(() => active.abort(), 15000);
    status.textContent = 'Consultando o SGS…';
    output.replaceChildren();
    try {
      const response = await fetch(url, {signal: active.signal});
      if (!response.ok) throw Error('HTTP ' + response.status);
      const rows = await response.json();
      if (!Array.isArray(rows) || !rows.every(r => typeof r.data === 'string' && Number.isFinite(Number(r.valor)))) throw Error('Resposta inesperada');
      if (request !== active) return;
      status.textContent = rows.length ? 'Edição atual do SGS. Observações retornadas: ' + rows.length + '.' : 'Nenhuma observação nesse mês para a série solicitada.';
      if (!rows.length) return;
      const table = document.createElement('table');
      const head = table.createTHead().insertRow();
      for (const title of ['Data', form.elements.serie.value === '4380' ? 'PIB mensal (R$ milhões correntes)' : 'Valor na unidade da série']) {
        const th = document.createElement('th'); th.scope = 'col'; th.textContent = title; head.append(th);
      }
      const body = table.createTBody();
      for (const row of rows) {
        const tr = body.insertRow(); tr.insertCell().textContent = row.data;
        tr.insertCell().textContent = Number(row.valor).toLocaleString('pt-BR',{maximumFractionDigits:10});
      }
      output.append(table);
    } catch {
      if (request === active) status.textContent = 'O serviço não respondeu a esta consulta. Você pode abrir o endereço do SGS diretamente ou baixar o exemplo histórico.';
    } finally { clearTimeout(timer); }
  });
}
