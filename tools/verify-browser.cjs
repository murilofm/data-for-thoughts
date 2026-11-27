// Browser checks for the static pages. Uses Playwright and the runner's Chrome.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:8175';
const dirs = fs.readdirSync('projects',{withFileTypes:true}).filter(d => d.isDirectory()).map(d => d.name);

async function run() {
  const browser = await chromium.launch({executablePath:process.env.CHROME_BIN || undefined,headless:true});
  const failures = [];
  try {
    for (const width of [400,1280]) {
      const page = await browser.newPage({viewport:{width,height:850},locale:'pt-BR'});
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      page.on('response', response => {
        if (response.url().startsWith(base) && response.status() >= 400)
          errors.push(response.status() + ' ' + response.url());
      });
      await page.goto(base);
      const search = page.getByRole('searchbox');
      await search.fill('energia');
      if ((await page.locator('#archive-status').textContent()) !== '1 publicação') throw Error('Busca no arquivo');
      for (const slug of dirs) {
        if (!fs.existsSync(path.join('projects',slug,'index.html'))) continue;
        try {
          await page.goto(base + '/projects/' + slug + '/');
          const figure = page.locator('[data-figure]');
          if (await figure.count()) {
            await page.waitForFunction(() => {
              const x=document.querySelector('[data-figure]');
              return x.dataset.state === 'ready' || x.dataset.state === 'error';
            },{},{timeout:30000});
            if (await figure.getAttribute('data-state') !== 'ready') throw Error('Falha ao carregar a figura');
            if ((await figure.innerText()).trim().length < 10) throw Error('Figura vazia');
            // Exercise visible native menus. Each project supplies its own data and labels.
            for(const select of (await figure.locator('select').all()).slice(0,2)) {
              if (!await select.isVisible() || await select.isDisabled()) continue;
              const choices = select.locator('option:not([disabled])');
              if (await choices.count()>1) await select.selectOption({index:1});
            }
          }
          if (slug==='sao-paulo-distritos') {
            const slider = page.getByRole('slider', {name:'Densidade mínima'});
            await slider.waitFor();
            const canvas = page.locator('#mapa-de-densidade canvas');
            const countInk = () => canvas.evaluate(el => {
              const {data} = el.getContext('2d').getImageData(0, 0, el.width, el.height);
              let total = 0;
              for (let i = 3; i < data.length; i += 4) if (data[i]) total++;
              return total;
            });
            await slider.press('Home');
            const full = await countInk();
            await slider.press('End');
            const dense = await countInk();
            if (!(full > dense && dense > 0)) throw Error('O controle não alterou o estêncil');
            await page.getByRole('combobox',{name:'Distrito',exact:true}).selectOption('Barra Funda');
            await page.getByRole('combobox',{name:'Medida',exact:true}).selectOption('percent');
            if ((await page.locator('#chosen-delta').innerText())!=='+132,5%') throw Error('Variação inesperada para Barra Funda');
            await page.locator('details summary').click();
            if (await page.locator('tbody tr').count()!==96) throw Error('Tabela incompleta');
          }
          const overflow = await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
          if (overflow) throw Error('Rolagem horizontal da página');
        } catch(e) { failures.push(width + ' px ' + slug + ': ' + e.message); }
        failures.push(...errors.splice(0).map(e=>width+' px '+slug+': '+e));
      }
      await page.close();
    }
  } finally { await browser.close(); }
  if (failures.length) throw Error(failures.join('\n'));
  console.log(dirs.length + ' páginas de subprojetos verificadas em dois tamanhos.');
}
run().catch(err=>{console.error(err);process.exitCode=1;});
