# Passo-a-Passo: Data Scraping – Aliceweb

[Abrir a publicação](https://murilofm.github.io/data-for-thoughts/projects/passo-a-passo-data-scraping-aliceweb/) · [Índice de subprojetos](../README.md)

O que era preciso fazer para extrair os dados brasileiros de comércio exterior e como consultar a série hoje.

**Edição publicada** · Tutorial e consulta reconstruídos

As seis observações visíveis no AliceWeb aparecem separadas da nova consulta da unidade aduaneira de Santos no Comex Stat.

## Fontes e arquivos

- [Post original, 29 jan 2014](https://dataforthoughts.wordpress.com/2014/01/29/passo-a-passo-data-scraping-aliceweb/)
- [Texto, figuras e links preservados](post.json)
- [Configuração editorial](project.json)
- [Página publicada](index.html)
- [aliceweb.csv](aliceweb.csv)
- [comex.py](comex.py)
- [media](media/)
- [view.js](view.js)

## Executar

Na raiz do repositório, execute `python3 -m http.server 8000` e abra `http://localhost:8000/projects/passo-a-passo-data-scraping-aliceweb/`. Para gerar as páginas depois de editar as fontes, execute `python3 tools/build.py`.
