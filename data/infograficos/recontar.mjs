import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const words = text => text.normalize('NFC').toLocaleLowerCase('pt-BR').match(/\p{L}+/gu) ?? [];
export const sets = {
  singular: ['eu'],
  plural: ['nós'],
  negativo: ['não','nunca','nenhum','nenhuma','nenhuns','nenhumas','nada','menos','ainda'],
  positivo: ['sim','sempre','todo','toda','todos','todas','tudo','mais','já'],
  passado: ['fui','foi','fomos','foram','era','éramos','eram','estive','esteve','estivemos','estiveram','estava','estávamos','estavam','fiz','fez','fizemos','fizeram','fazia','fazíamos','faziam','ia','íamos','iam','fora','fizera','estivera'],
  presente: ['sou','é','somos','são','vou','vai','vamos','vão','estou','está','estamos','estão','faço','faz','fazemos','fazem'],
  futuro: ['serei','será','seremos','serão','irei','irá','iremos','irão','estarei','estará','estaremos','estarão','farei','fará','faremos','farão']
};
const stop = new Set(words('a à às agora aí ainda ao aos aquela aquelas aquele aqueles aquilo aqui as assim até bem cada cá com como coisa coisas da das de daí daquela daquele dar das das deu deve dia dias disse diz dizer do dos dois durante e é ela elas ele eles em então entre era essa essas esse esses está estamos estão estar estava estavam este estes eu fazer faz fez fica foi fomos foram gente há hoje isso já lá lhe mais mas me mesmo meu meus minha minhas muito muitos muitas na nada nas nesta neste nem nessa nesse no nos nós nosso nossa nossos nossas num numa nunca o os ou outro outros outra outras para pela pelas pelo pelos pode podem pois por porque pra primeiro primeira qual quaisquer quando quanto que quem quer quero questão se seja sem sempre sendo ser será seria seu seus sua suas sim só sob sobre sou são também tanto tem temos tendo ter teve toda todas todo todos tudo um uma umas uns vai vamos vão vem ver vez vezes vinha você vocês vos vou não paulo'));
const candidates = ['Haddad','Serra'];
const numberWords = ['PRIMEIRO','SEGUNDO','TERCEIRO','QUARTO','QUINTO'];
function bucket() { return {turns:0,words:0,counts:new Map(),city:0}; }

/** Analyze a plain-text copy of the cited article, retaining speaker labels and paragraph breaks. */
export function analyze(text, meta) {
  const blocks = [];
  let speaker = null;
  for (let line of text.split(/\r?\n/u)) {
    line = line.trim();
    if (!line) continue;
    if (/^Fale com a Redação\b/iu.test(line)) break;
    const block = numberWords.indexOf(line.replace(/ BLOCO$/u, ''));
    if (block !== -1 && line.endsWith(' BLOCO')) {
      if (block !== blocks.length) throw Error('Ordem dos blocos inesperada.');
      blocks.push({n:block + 1,Haddad:bucket(),Serra:bucket()});
      speaker = null;
      continue;
    }
    if (!blocks.length) continue;
    if (/^(?:\*?(?:Mediador )?Carlos Nascimento:|(?:Primeira|Segunda|Terceira|Quarta) pergunta$|Considerações finais$|Pergunta baseada em)/iu.test(line)) { speaker = null; continue; }
    const label = line.match(/^(?:(?:Fernando |José )?(Haddad|Serra))(?::|(?: pergunta a (?:Haddad|Serra)| responde|,? na (?:réplica|tréplica)):)\*?\s*/iu);
    if (label) {
      speaker = candidates.find(name => name.toLowerCase() === label[1].toLowerCase());
      blocks.at(-1)[speaker].turns++;
      line = line.slice(label[0].length);
    }
    if (!speaker) continue;
    const cell = blocks.at(-1)[speaker];
    cell.city += (line.match(/\bSão Paulo\b/giu) ?? []).length;
    for (const word of words(line)) {
      cell.words++;
      cell.counts.set(word, (cell.counts.get(word) ?? 0) + 1);
    }
  }
  if (blocks.length !== (meta.organizer === 'Band' ? 5 : 3)) throw Error('Número inesperado de blocos na transcrição.');
  const totals = candidates.map(() => new Map());
  for (const block of blocks) {
    for (const [i,name] of candidates.entries()) {
      const cell = block[name];
      cell.terms = meta.terms.map(t => cell.counts.get(t.toLocaleLowerCase('pt-BR')) ?? 0);
      cell.lexicon = Object.fromEntries(Object.entries(sets).map(([k,terms]) => [k, terms.reduce((sum,w) => sum + (cell.counts.get(w) ?? 0), 0)]));
      cell.lexicon.presente -= cell.city;
      if (cell.city) totals[i].set('São Paulo', (totals[i].get('São Paulo') ?? 0) + cell.city);
      delete cell.city;
      for (const [term,count] of cell.counts) {
        if (term.length < 3 || stop.has(term)) continue;
        totals[i].set(term, (totals[i].get(term) ?? 0) + count);
      }
      delete cell.counts;
    }
  }
  const top = Object.fromEntries(candidates.map((name,i) => [name,[...totals[i]].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0],'pt-BR')).slice(0,12)]));
  return {...meta, blocks, dictionaries:sets, top};
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const [article, dataset] = process.argv.slice(2);
  if (!article || !dataset) throw Error('Uso: node data/infograficos/recontar.mjs transcricao.txt projects/<slug>/dados.json');
  const previous = JSON.parse(readFileSync(dataset,'utf8'));
  const rebuilt = analyze(readFileSync(article,'utf8'), previous);
  writeFileSync(dataset, JSON.stringify(rebuilt,null,2) + '\n');
}
