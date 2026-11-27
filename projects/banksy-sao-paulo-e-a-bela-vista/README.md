# Banksy, São Paulo e a Bela Vista

[Abrir a publicação](https://murilofm.github.io/data-for-thoughts/projects/banksy-sao-paulo-e-a-bela-vista/) · [Índice de subprojetos](../README.md)

Como muda o desenho de São Paulo quando só aparecem as áreas acima de uma densidade mínima?

**Edição publicada** · Mapa por setor censitário reconstruído

O mapa reconstrói o filtro de densidade nos setores censitários de 2010. Há densidade disponível para 18.363 setores. Os 590 sem valor ficam em branco. O recorte por distrito permite comparar 2010 e 2022.

## Fontes e arquivos

- [Post original, 19 nov 2014](https://dataforthoughts.wordpress.com/2014/11/19/banksy-sao-paulo-e-a-bela-vista/)
- [Texto, figuras e links preservados](post.json)
- [Configuração editorial](project.json)
- [Página publicada](index.html)
- [build-distritos.py](build-distritos.py)
- [build-setores.py](build-setores.py)
- [distritos-densidade.json](distritos-densidade.json)
- [media](media/)
- [setores-2010.json](setores-2010.json)
- [setores-2010.png](setores-2010.png)
- [view.js](view.js)

## Executar

Na raiz do repositório, execute `python3 -m http.server 8000` e abra `http://localhost:8000/projects/banksy-sao-paulo-e-a-bela-vista/`. Para gerar as páginas depois de editar as fontes, execute `python3 tools/build.py`.
