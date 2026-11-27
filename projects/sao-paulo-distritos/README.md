# Onde São Paulo cresceu?

[Explorar o estudo](https://murilofm.github.io/data-for-thoughts/projects/sao-paulo-distritos/) · [Arquivo do blog](../../README.md)

Entre 2010 e 2022 a capital ganhou 198.496 moradores. A contagem caiu em 46 dos 96 distritos. O explorador compara oito censos, de 1950 a 2022, em habitantes ou variação percentual. A tabela de dados permite conferir os valores de cada distrito.

## Reproduzir

Na raiz do repositório, execute `python3 -m http.server 8000` e abra <http://localhost:8000/projects/sao-paulo-distritos/>.

- [distritos.csv](distritos.csv) contém as 96 linhas e oito observações por distrito.
- [atualizar.py](atualizar.py) extrai a [tabela da Prefeitura de São Paulo](https://drive.prefeitura.sp.gov.br/cidade/secretarias/upload/chamadas/314_01_censo_r5-sub-distr_pop-abs_1950-2022_final_1715805085.htm) e verifica os totais municipais de 2010 e 2022. Execute `python3 atualizar.py` para atualizar o CSV.
- [populacao.js](populacao.js) calcula as variações e desenha os gráficos. [lab.html](lab.html) contém o texto e os controles do estudo.

A série de 1950 a 1980 depende de retroestimativas para recompor os distritos. A publicação da Prefeitura usa agregados preliminares para 2022.
