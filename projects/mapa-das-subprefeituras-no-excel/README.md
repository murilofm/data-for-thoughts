# Mapa das subprefeituras no Excel

[Abrir a publicação](https://murilofm.github.io/data-for-thoughts/projects/mapa-das-subprefeituras-no-excel/) · [Índice de subprojetos](../README.md)

Da planilha ao mapa das subprefeituras de São Paulo.

**Edição publicada** · Mapa da planilha original reproduzido

A razão entre o valor geral de vendas e a área lançada em 2010 reproduz os 26 valores visíveis na figura publicada. Cinco subprefeituras não têm valor naquele ano. O explorador usa a divisão histórica em 31 subprefeituras e permite trocar o ano, a cor e os dados.

## Fontes e arquivos

- [Post original, 17 dez 2013](https://dataforthoughts.wordpress.com/2013/12/17/mapa-das-subprefeituras-no-excel/)
- [Texto, figuras e links preservados](post.json)
- [Configuração editorial](project.json)
- [Página publicada](index.html)
- [build.py](build.py)
- [lancamentos.json](lancamentos.json)
- [media](media/)
- [view.js](view.js)

## Executar

Na raiz do repositório, execute `python3 -m http.server 8000` e abra `http://localhost:8000/projects/mapa-das-subprefeituras-no-excel/`. Para gerar as páginas depois de editar as fontes, execute `python3 tools/build.py`.
