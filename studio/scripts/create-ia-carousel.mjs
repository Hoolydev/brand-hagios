import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const workspace = path.resolve(import.meta.dirname, "../..");
const outputDir = path.join(workspace, "Carrossel 1", "Hagios-IA-2026");
const heroPath = "/Users/holydev/.codex/generated_images/019f4e98-f1bd-70e3-be8c-8399341bd083/exec-1c740d1c-f5aa-4570-9f7f-71137096cfa9.png";
const hero = (await fs.readFile(heroPath)).toString("base64");

const width = 1080;
const height = 1350;
const colors = { ink: "#09090b", paper: "#f7f6f1", orange: "#ff4b21", orangeSoft: "#ff9f7b", blue: "#345eff", sand: "#dedbd1", gray: "#777772" };
const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function multiline(lines, x, y, size, fill, family = "Arial Black", leading = 0.9, anchor = "start") {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="900" letter-spacing="0" text-anchor="${anchor}">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : size * leading}">${esc(line)}</tspan>`).join("")}</text>`;
}

function body(lines, x, y, size, fill, leading = 1.28, widthHint = 0) {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="Arial" font-size="${size}" font-weight="700" letter-spacing="0">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : size * leading}">${esc(line)}</tspan>`).join("")}</text>${widthHint ? `<rect x="${x}" y="${y + 18}" width="${widthHint}" height="1" fill="${fill}" opacity=".25"/>` : ""}`;
}

function header(page, inverse = false) {
  const color = inverse ? colors.paper : colors.ink;
  return `<text x="56" y="58" fill="${color}" font-family="Arial" font-size="12" font-weight="700">HÁGIOS / INTELIGÊNCIA CRIATIVA</text><text x="1024" y="58" fill="${color}" font-family="Arial" font-size="12" font-weight="700" text-anchor="end">${String(page).padStart(2, "0")} / 07</text>`;
}

function pageFrame({ page, background, inverse = false, children }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${background}"/>${header(page, inverse)}${children}</svg>`;
}

function heroImage(x, y, w, h, opacity = 1) {
  return `<clipPath id="crop"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0"/></clipPath><g clip-path="url(#crop)" opacity="${opacity}"><image href="data:image/png;base64,${hero}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/></g>`;
}

const slides = [
  pageFrame({ page: 1, background: colors.ink, inverse: true, children: `
    <rect x="56" y="95" width="204" height="26" fill="${colors.orange}"/>
    <text x="67" y="114" fill="${colors.ink}" font-family="Arial" font-size="12" font-weight="900">FRONTEIRA / JUL 2026</text>
    ${multiline(["A NOVA GUERRA", "DE IA NÃO É", "POR CHAT."], 56, 295, 92, colors.paper, "Arial Black", .86)}
    ${multiline(["É POR EXECUÇÃO."], 56, 548, 92, colors.orange, "Arial Black", .86)}
    ${body(["GPT-5.6 e Claude Sonnet 5 chegam com a mesma", "ambição: transformar conversa em trabalho que anda."], 60, 730, 28, "#d4d4cf", 1.34)}
    <rect x="56" y="1030" width="968" height="1" fill="#3f3f44"/>
    <text x="56" y="1080" fill="#c8c8c3" font-family="Georgia" font-size="35">O modelo importa. O fluxo que ele sustenta, mais.</text>
    <text x="56" y="1255" fill="#85857e" font-family="Arial" font-size="13" font-weight="700">FONTES: OPENAI, “GPT-5.6” (09 JUL) / ANTHROPIC, “CLAUDE SONNET 5” (30 JUN)</text>` }),
  pageFrame({ page: 2, background: colors.paper, children: `
    ${multiline(["DOIS LANÇAMENTOS.", "UMA MUDANÇA", "DE PAPEL."], 56, 186, 70, colors.ink, "Arial Black", .87)}
    <rect x="56" y="445" width="462" height="244" fill="${colors.orange}"/>
    <rect x="562" y="445" width="462" height="244" fill="${colors.blue}"/>
    <text x="84" y="500" fill="${colors.ink}" font-family="Arial" font-size="13" font-weight="900">30 JUN 2026 / ANTHROPIC</text>
    ${multiline(["CLAUDE", "SONNET 5"], 84, 575, 48, colors.ink, "Arial Black", .88)}
    <text x="590" y="500" fill="white" font-family="Arial" font-size="13" font-weight="900">09 JUL 2026 / OPENAI</text>
    ${multiline(["GPT-5.6", "SOL / TERRA / LUNA"], 590, 575, 37, "white", "Arial Black", .94)}
    ${body(["Os dois anúncios tratam IA como sistema de trabalho:", "planejar, usar ferramentas, pesquisar, operar interfaces", "e manter tarefas longas em movimento."], 60, 830, 31, colors.ink, 1.32)}
    <rect x="56" y="1070" width="968" height="1" fill="#c7c5bd"/>
    <text x="56" y="1122" fill="${colors.orange}" font-family="Arial" font-size="18" font-weight="900">A comparação deixa de ser “quem responde melhor?”</text>
    <text x="56" y="1162" fill="${colors.ink}" font-family="Georgia" font-size="32">e vira “quem conduz melhor o trabalho até o fim?”</text>` }),
  pageFrame({ page: 3, background: colors.ink, inverse: true, children: `
    ${multiline(["A OPENAI", "APOSTOU EM", "UMA FAMÍLIA."], 56, 185, 76, colors.paper, "Arial Black", .86)}
    <rect x="56" y="458" width="968" height="1" fill="#3f3f44"/>
    <text x="56" y="520" fill="#a8a8a1" font-family="Arial" font-size="17" font-weight="900">GPT-5.6 / TRÊS CAMADAS DE ENTREGA</text>
    <text x="56" y="610" fill="${colors.orange}" font-family="Arial Black" font-size="66">SOL</text><text x="274" y="610" fill="#deded8" font-family="Georgia" font-size="34">capacidade máxima / tarefas difíceis</text>
    <text x="56" y="750" fill="${colors.paper}" font-family="Arial Black" font-size="66">TERRA</text><text x="344" y="750" fill="#deded8" font-family="Georgia" font-size="34">equilíbrio para trabalho cotidiano</text>
    <text x="56" y="890" fill="${colors.blue}" font-family="Arial Black" font-size="66">LUNA</text><text x="294" y="890" fill="#deded8" font-family="Georgia" font-size="34">velocidade e custo para escala</text>
    <rect x="56" y="1015" width="968" height="164" fill="#18181c"/>
    ${body(["Na API, a família combina tiers de custo com ferramentas e", "subagentes. A proposta é escolher esforço, não só “um modelo”."], 82, 1082, 25, colors.paper, 1.3)}
    <text x="56" y="1260" fill="#85857e" font-family="Arial" font-size="13" font-weight="700">FONTE: OPENAI / GPT-5.6, 09 JUL 2026</text>` }),
  pageFrame({ page: 4, background: colors.orange, children: `
    ${multiline(["A ANTHROPIC", "CORTOU CUSTO.", "NÃO AMBIÇÃO."], 56, 186, 74, colors.ink, "Arial Black", .86)}
    ${heroImage(56, 430, 968, 430)}
    <rect x="56" y="790" width="968" height="70" fill="${colors.paper}" opacity=".96"/>
    <text x="78" y="835" fill="${colors.ink}" font-family="Arial" font-size="18" font-weight="900">SONNET 5 / AGENTE DE TRABALHO EM ESCALA</text>
    ${body(["O novo Sonnet aproxima planejamento, navegador, terminal", "e uso de ferramentas de tarefas que antes pediam modelos", "maiores. O preço de lançamento: US$ 2 / US$ 10 por 1M tokens."], 60, 960, 30, colors.ink, 1.32)}
    <text x="56" y="1235" fill="${colors.ink}" font-family="Georgia" font-size="30">Mais autonomia só é vantagem quando o fluxo tem revisão.</text>
    <text x="56" y="1275" fill="#6a1d11" font-family="Arial" font-size="13" font-weight="900">FONTE: ANTHROPIC / CLAUDE SONNET 5, 30 JUN 2026</text>` }),
  pageFrame({ page: 5, background: colors.paper, children: `
    <rect x="0" y="95" width="1080" height="294" fill="${colors.ink}"/>
    ${multiline(["BENCHMARK NÃO", "É BRIEFING."], 56, 190, 83, colors.paper, "Arial Black", .85)}
    <text x="56" y="338" fill="${colors.orangeSoft}" font-family="Georgia" font-size="31">É só uma pista do que vale testar.</text>
    <line x1="540" y1="492" x2="540" y2="1010" stroke="#c5c3bb" stroke-width="1"/>
    <text x="56" y="540" fill="${colors.blue}" font-family="Arial" font-size="16" font-weight="900">OPENAI MIRA</text>
    ${multiline(["TIERS,", "FERRAMENTAS", "E COORDENAÇÃO."], 56, 605, 46, colors.ink, "Arial Black", .88)}
    ${body(["A empresa destaca", "subagentes e programação", "para orquestrar trabalho."], 56, 835, 24, colors.gray, 1.36)}
    <text x="590" y="540" fill="${colors.orange}" font-family="Arial" font-size="16" font-weight="900">ANTHROPIC MIRA</text>
    ${multiline(["ESFORÇO,", "CONTEXTO", "E AGÊNCIA."], 590, 605, 46, colors.ink, "Arial Black", .88)}
    ${body(["A empresa destaca", "controle de esforço,", "compaction e uso de tools."], 590, 835, 24, colors.gray, 1.36)}
    <rect x="56" y="1082" width="968" height="1" fill="#c7c5bd"/>
    ${body(["A métrica que interessa para conteúdo: menos retrabalho, fontes mais", "auditáveis e uma arte que não sacrifica a ideia para caber no template."], 56, 1140, 27, colors.ink, 1.3)}` }),
  pageFrame({ page: 6, background: colors.ink, inverse: true, children: `
    ${multiline(["PARA CRIAR", "CONTEÚDO,", "O MODELO É", "SÓ UMA PEÇA."], 56, 184, 73, colors.paper, "Arial Black", .84)}
    <line x1="82" y1="540" x2="998" y2="540" stroke="#4a4a4e" stroke-width="2"/>
    ${["SINAL", "PESQUISA", "TESE", "ROTEIRO", "ARTE", "FONTES"].map((label, index) => `<circle cx="${96 + index * 176}" cy="540" r="18" fill="${index === 2 ? colors.orange : colors.paper}"/><text x="${96 + index * 176}" y="590" fill="${index === 2 ? colors.orange : colors.paper}" font-family="Arial" font-size="15" font-weight="900" text-anchor="middle">${label}</text>`).join("")}
    ${heroImage(56, 710, 968, 352, .72)}
    <rect x="56" y="710" width="968" height="352" fill="#08080b" opacity=".28"/>
    <text x="84" y="970" fill="white" font-family="Georgia" font-size="42">Sem pesquisa, imagem vira decoração.</text>
    <text x="84" y="1015" fill="${colors.orangeSoft}" font-family="Georgia" font-size="42">Sem direção, IA vira repetição.</text>
    <text x="56" y="1242" fill="#85857e" font-family="Arial" font-size="13" font-weight="700">SEEDANCE, MODELOS CHINESES E GERADORES DE IMAGEM ELEVAM A MÍDIA — NÃO SUBSTITUEM A EDIÇÃO.</text>` }),
  pageFrame({ page: 7, background: colors.blue, children: `
    <text x="56" y="154" fill="#d8e0ff" font-family="Arial" font-size="15" font-weight="900">A DECISÃO PRÁTICA</text>
    ${multiline(["NÃO ESCOLHA", "O MODELO.", "ESCOLHA O", "SISTEMA."], 56, 250, 89, "white", "Arial Black", .83)}
    <rect x="56" y="670" width="968" height="1" fill="#aec0ff" opacity=".7"/>
    ${body(["Teste os dois em um briefing real. Meça tempo de pesquisa,", "qualidade das fontes, edição necessária e consistência visual.", "O melhor modelo é o que deixa sua equipe mais criteriosa."], 60, 748, 31, "white", 1.32)}
    <rect x="56" y="1040" width="968" height="144" fill="${colors.paper}"/>
    <text x="82" y="1102" fill="${colors.ink}" font-family="Arial" font-size="17" font-weight="900">HÁGIOS CULTURE ENGINE</text>
    <text x="82" y="1150" fill="${colors.orange}" font-family="Georgia" font-size="33">Pesquisa real. Tese própria. Arte que sustenta a ideia.</text>
    <text x="56" y="1260" fill="#d8e0ff" font-family="Arial" font-size="13" font-weight="700">FONTES ABERTAS: OPENAI.COM/INDEX/GPT-5-6 / ANTHROPIC.COM/NEWS/CLAUDE-SONNET-5</text>` }),
];

await fs.mkdir(outputDir, { recursive: true });
for (const [index, svg] of slides.entries()) {
  const filename = `${String(index + 1).padStart(2, "0")}-hagios-ia-2026.png`;
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(outputDir, filename));
}

await fs.writeFile(path.join(outputDir, "fontes.md"), `# Fontes do carrossel\n\n- OpenAI, [GPT-5.6: Frontier intelligence that scales with your ambition](https://openai.com/index/gpt-5-6/), 9 jul. 2026.\n- Anthropic, [Introducing Claude Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5), 30 jun. 2026.\n\nA comparação é editorial: usa informações e posicionamentos publicados pelas empresas e não reproduz alegações de benchmark como uma medida universal.\n`);

console.log(`Created ${slides.length} slides in ${outputDir}`);
