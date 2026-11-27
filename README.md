# Data for thoughts

[Visite o blog](https://murilofm.github.io/data-for-thoughts/) · [Índice dos 26 subprojetos](projects/) · [Consulte o arquivo original](https://dataforthoughts.wordpress.com/)

Análises e visualizações de dados públicos de Murilo Moraes. O projeto reúne as publicações de 2012–2016 e novos estudos. Os dados, os métodos e as páginas são versionados juntos. Cada post tem uma pasta própria em `projects/` com sua documentação, dados disponíveis e código. O índice inclui as 25 publicações históricas e o novo estudo sobre a população de São Paulo.

## São Paulo, distrito por distrito

A [tabela municipal](https://drive.prefeitura.sp.gov.br/cidade/secretarias/upload/chamadas/314_01_censo_r5-sub-distr_pop-abs_1950-2022_final_1715805085.htm) contém oito censos, de 1950 a 2022. O arquivo [distritos.csv](projects/sao-paulo-distritos/distritos.csv) preserva as 96 linhas distritais. A diferença de população entre 2010 e 2022 soma 198.496 pessoas, com aumento em 50 distritos e queda em 46. O [extrator](projects/sao-paulo-distritos/atualizar.py) verifica a quantidade de distritos e a concordância com os totais da fonte.

## Desenvolvimento

A publicação usa HTML, CSS e módulos JavaScript estáticos. Para servir o projeto, execute `python3 -m http.server 8000` na raiz. O GitHub Pages publica a pasta raiz da branch `main`.
