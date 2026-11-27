# Acidentes nas rodovias federais

[Abrir a publicação](https://murilofm.github.io/data-for-thoughts/projects/acidentes-nas-rodovias-federais/) · [Índice de subprojetos](../README.md)

Um mapa procura as concentrações de acidentes em rodovias federais em 2012.

**Edição publicada** · Dados do mapa original recuperados

A camada recuperada reúne os trechos acima de 14 acidentes por quilômetro. A figura histórica abaixo também mostra o mapa geral.

## Fontes e arquivos

- [Post original, 8 jan 2014](https://dataforthoughts.wordpress.com/2014/01/08/acidentes-nas-rodovias-federais/)
- [Texto, figuras e links preservados](post.json)
- [Configuração editorial](project.json)
- [Página publicada](index.html)
- [build.py](build.py)
- [estados.json](estados.json)
- [media](media/)
- [trechos-2012.json](trechos-2012.json)
- [view.js](view.js)

## Executar

Na raiz do repositório, execute `python3 -m http.server 8000` e abra `http://localhost:8000/projects/acidentes-nas-rodovias-federais/`. Para gerar as páginas depois de editar as fontes, execute `python3 tools/build.py`.
