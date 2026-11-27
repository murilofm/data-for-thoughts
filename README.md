# Data for thoughts

[Visite o blog](https://murilofm.github.io/data-for-thoughts/) · [Índice dos 26 subprojetos](projects/) · [Consulte o arquivo original](https://dataforthoughts.wordpress.com/)

Análises e visualizações de dados públicos de Murilo Moraes. O projeto reúne as publicações de 2012–2016 e novos estudos. Os dados, os métodos e as páginas são versionados juntos. Cada post tem uma pasta própria em `projects/` com sua documentação, dados disponíveis e código. O índice inclui as 25 publicações históricas e o novo estudo sobre a população de São Paulo.

## Explore o arquivo

- [Reservatórios e energia](projects/data-scrapping-rcharts-energia/) traz o CSV recuperado do gráfico de 2014 e o código para extraí-lo. O gráfico preserva as lacunas da série.
- [Aeroportos, partidas e retornos](projects/aeroportos-partidas-e-retornos/) permite consultar boletins históricos da Infraero por aeroporto e horário.
- [Mapa das subprefeituras no Excel](projects/mapa-das-subprefeituras-no-excel/) reproduz o mapa da planilha e aceita os dados que você colar.
- [Vagas de rua e ciclovias](projects/vagas-de-rua-e-ciclovias-sp-netlogo/) apresenta uma implementação nova das regras descritas no post. A documentação de cada subprojeto distingue os dados recuperados, as leituras de figuras e as escolhas da reconstrução.

## São Paulo, distrito por distrito

A [tabela municipal](https://drive.prefeitura.sp.gov.br/cidade/secretarias/upload/chamadas/314_01_censo_r5-sub-distr_pop-abs_1950-2022_final_1715805085.htm) contém oito censos, de 1950 a 2022. O arquivo [distritos.csv](projects/sao-paulo-distritos/distritos.csv) preserva as 96 linhas distritais. A diferença de população entre 2010 e 2022 soma 198.496 pessoas, com aumento em 50 distritos e queda em 46. O [extrator](projects/sao-paulo-distritos/atualizar.py) verifica a quantidade de distritos e a concordância com os totais da fonte.

## Desenvolvimento

Na raiz do repositório, execute os comandos abaixo e abra <http://localhost:8000/>. O gerador usa a biblioteca padrão do Python. O GitHub Actions verifica as páginas e os visualizadores em telas de celular e desktop. O GitHub Pages publica a raiz de `main`.

```sh
python3 tools/build.py
python3 tools/verify.py
python3 -m http.server 8000
```

Para publicar um novo estudo, use uma pasta em `projects/` com seus dados, código, README e um `project.json` com o campo `kind` igual a `study`. O [estudo dos distritos](projects/sao-paulo-distritos/project.json) mostra como declarar título, data, tema, resumo, corpo da página e módulo de visualização. O gerador acrescenta o estudo ao [índice](projects/).
