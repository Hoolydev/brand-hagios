import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const studio = path.resolve(import.meta.dirname, "..");
const workspace = path.resolve(studio, "..");
const outputDir = path.join(workspace, "Carrossel 1", "Hagios-IA-2026-v3");
const publicDir = path.join(studio, "public", "carousels", "hagios-ia-2026-v3");

const [claude, openai, openaiSource, anthropicSource] = await Promise.all([
  fs.readFile(path.join(publicDir, "claude-mark.png")),
  fs.readFile(path.join(publicDir, "openai-mark.png")),
  fs.readFile(path.join(publicDir, "openai-source.png")),
  fs.readFile(path.join(publicDir, "anthropic-source.png")),
]);

const W = 1080;
const H = 1350;
const C = {
  ink: "#08090b",
  paper: "#f4f1ea",
  white: "#ffffff",
  claude: "#d97757",
  muted: "#73736e",
  line: "#cac5bc",
};
const enc = (buffer) => buffer.toString("base64");
const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const image = { claude: enc(claude), openai: enc(openai), openaiSource: enc(openaiSource), anthropicSource: enc(anthropicSource) };

function text(lines, x, y, size, fill, family = "Arial Black", leading = .9, anchor = "start") {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="900" letter-spacing="0" text-anchor="${anchor}">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : size * leading}">${esc(line)}</tspan>`).join("")}</text>`;
}

function copy(lines, x, y, size, fill, leading = 1.25) {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="Arial" font-size="${size}" font-weight="700">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : size * leading}">${esc(line)}</tspan>`).join("")}</text>`;
}

function imageBlock(data, id, x, y, width, height, mode = "slice", opacity = 1) {
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath><g clip-path="url(#${id})" opacity="${opacity}"><image href="data:image/png;base64,${data}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="${mode === "meet" ? "xMidYMid meet" : "xMidYMid slice"}"/></g>`;
}

function top(page, fill = C.ink) {
  return `<text x="54" y="52" fill="${fill}" font-family="Arial" font-size="12" font-weight="900">HÁGIOS / OBSERVATÓRIO DE IA</text><text x="1026" y="52" fill="${fill}" font-family="Arial" font-size="12" font-weight="900" text-anchor="end">${String(page).padStart(2, "0")} / 07</text>`;
}

function frame(page, background, content, headerFill = C.ink) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${background}"/>${top(page, headerFill)}${content}</svg>`;
}

const slides = [
  frame(1, C.paper, `${imageBlock(image.claude, "claude-cover", 48, 92, 390, 390, "meet")}<circle cx="850" cy="286" r="196" fill="${C.white}"/>${imageBlock(image.openai, "openai-cover", 670, 106, 360, 360, "meet")}<path d="M485 124 V470" stroke="${C.claude}" stroke-width="8"/><text x="540" y="190" fill="${C.claude}" font-family="Arial" font-size="16" font-weight="900">DOIS SISTEMAS</text>${text(["GPT-5.6", "× CLAUDE SONNET 5"], 54, 610, 82, C.ink, "Arial Black", .88)}${text(["O MODELO SAIU", "DA JANELA DE CHAT."], 54, 800, 70, C.claude, "Arial Black", .88)}<rect x="54" y="900" width="456" height="250" fill="${C.white}"/>${imageBlock(image.openaiSource, "cover-openai-source", 55, 901, 454, 248)}<rect x="566" y="900" width="460" height="250" fill="${C.white}"/>${imageBlock(image.anthropicSource, "cover-anthropic-source", 567, 901, 458, 248)}<text x="54" y="1200" fill="${C.ink}" font-family="Arial" font-size="14" font-weight="900">OPENAI.COM / ANTHROPIC.COM · RECORTES OFICIAIS</text><text x="1026" y="1200" fill="${C.muted}" font-family="Arial" font-size="14" font-weight="900" text-anchor="end">CAPA: DOIS PRODUTOS, UM NOVO FLUXO</text>`),
  frame(2, C.white, `${imageBlock(image.openai, "openai-mark-slide", 54, 92, 150, 150, "meet")}<text x="242" y="138" fill="${C.ink}" font-family="Arial" font-size="16" font-weight="900">OPENAI / GPT-5.6</text>${text(["UMA FAMÍLIA,", "NÃO UM BOTÃO."], 242, 212, 66, C.ink, "Arial Black", .9)}<rect x="54" y="390" width="972" height="450" fill="${C.paper}"/>${imageBlock(image.openaiSource, "openai-full", 55, 391, 970, 448)}<rect x="54" y="880" width="972" height="2" fill="${C.ink}"/><g><rect x="54" y="926" width="286" height="126" fill="${C.ink}"/><text x="80" y="974" fill="${C.white}" font-family="Arial" font-size="14" font-weight="900">SOL</text>${text(["MAIS", "ESFORÇO"], 80, 1014, 34, C.white, "Arial Black", .88)}/><rect x="368" y="926" width="286" height="126" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/><text x="394" y="974" fill="${C.ink}" font-family="Arial" font-size="14" font-weight="900">TERRA</text>${text(["MAIS", "EQUILÍBRIO"], 394, 1014, 31, C.ink, "Arial Black", .88)}/><rect x="682" y="926" width="344" height="126" fill="${C.claude}"/><text x="708" y="974" fill="${C.ink}" font-family="Arial" font-size="14" font-weight="900">LUNA</text>${text(["MAIS", "AUTONOMIA"], 708, 1014, 31, C.ink, "Arial Black", .88)}/></g><text x="54" y="1138" fill="${C.muted}" font-family="Arial" font-size="13" font-weight="900">RECORTE DA PÁGINA OFICIAL OPENAI · GPT-5.6 · 09 JUL 2026</text>${copy(["O produto não é só um modelo.", "É uma família de decisões dentro do fluxo."], 54, 1200, 28, C.ink, 1.25)}`),
  frame(3, C.claude, `<circle cx="134" cy="170" r="88" fill="${C.white}"/>${imageBlock(image.claude, "claude-mark-slide", 54, 90, 160, 160, "meet")}<text x="246" y="138" fill="${C.ink}" font-family="Arial" font-size="16" font-weight="900">ANTHROPIC / CLAUDE SONNET 5</text>${text(["O AGENTE", "ENTROU NO TIME."], 246, 212, 66, C.ink, "Arial Black", .9)}<rect x="54" y="390" width="972" height="450" fill="${C.white}"/>${imageBlock(image.anthropicSource, "anthropic-full", 55, 391, 970, 448)}<g><rect x="54" y="880" width="290" height="68" fill="${C.ink}"/><text x="78" y="922" fill="${C.white}" font-family="Arial" font-size="22" font-weight="900">BROWSER</text><rect x="380" y="880" width="290" height="68" fill="${C.ink}"/><text x="404" y="922" fill="${C.white}" font-family="Arial" font-size="22" font-weight="900">TERMINAL</text><rect x="706" y="880" width="320" height="68" fill="${C.ink}"/><text x="730" y="922" fill="${C.white}" font-family="Arial" font-size="22" font-weight="900">CHECKPOINTS</text></g>${text(["NÃO É SÓ ESCREVER", "A PRÓXIMA FRASE."], 54, 1048, 52, C.ink, "Arial Black", .88)}<text x="54" y="1210" fill="#6d2d1f" font-family="Arial" font-size="13" font-weight="900">RECORTE DA PÁGINA OFICIAL ANTHROPIC · CLAUDE SONNET 5 · 30 JUN 2026</text>`),
  frame(4, C.ink, `${text(["O LOGO EXPLICA", "O PRODUTO."], 54, 172, 74, C.white, "Arial Black", .88)}<rect x="54" y="330" width="458" height="550" fill="${C.white}"/><rect x="568" y="330" width="458" height="550" fill="${C.claude}"/><circle cx="797" cy="489" r="122" fill="${C.white}"/>${imageBlock(image.openai, "openai-compare", 166, 372, 234, 234, "meet")}<text x="82" y="690" fill="${C.ink}" font-family="Arial" font-size="16" font-weight="900">OPENAI / GPT-5.6</text>${imageBlock(image.openaiSource, "openai-compare-source", 82, 735, 402, 116)}${imageBlock(image.claude, "claude-compare", 680, 372, 234, 234, "meet")}<text x="596" y="690" fill="${C.ink}" font-family="Arial" font-size="16" font-weight="900">ANTHROPIC / CLAUDE SONNET 5</text>${imageBlock(image.anthropicSource, "anthropic-compare-source", 596, 735, 402, 116)}<line x1="512" y1="605" x2="568" y2="605" stroke="${C.claude}" stroke-width="5"/><text x="540" y="580" fill="${C.white}" font-family="Arial" font-size="18" font-weight="900" text-anchor="middle">×</text>${text(["GPT", "COORDENA"], 54, 1010, 60, C.white, "Arial Black", .9)}${text(["CLAUDE", "EXECUTA"], 568, 1010, 60, C.claude, "Arial Black", .9)}<text x="54" y="1190" fill="#9b9fa5" font-family="Arial" font-size="15" font-weight="900">LEITURA EDITORIAL HÁGIOS · COMPONENTES VISUAIS ATRIBUÍDOS</text>`),
  frame(5, C.paper, `${text(["A INTERFACE", "TAMBÉM É ARGUMENTO."], 54, 174, 68, C.ink, "Arial Black", .88)}<rect x="54" y="330" width="972" height="420" fill="${C.white}" stroke="${C.ink}" stroke-width="2"/>${imageBlock(image.openaiSource, "openai-ui", 72, 348, 454, 382)}${imageBlock(image.anthropicSource, "anthropic-ui", 554, 348, 454, 382)}<rect x="72" y="774" width="454" height="72" fill="${C.ink}"/><text x="96" y="818" fill="${C.white}" font-family="Arial" font-size="21" font-weight="900">GPT-5.6 / FAMÍLIA</text><rect x="554" y="774" width="454" height="72" fill="${C.claude}"/><text x="578" y="818" fill="${C.ink}" font-family="Arial" font-size="21" font-weight="900">CLAUDE / AGENTE</text><path d="M294 940 V1090" stroke="${C.ink}" stroke-width="6"/><path d="M786 940 V1090" stroke="${C.claude}" stroke-width="6"/><text x="294" y="926" fill="${C.ink}" font-family="Arial" font-size="15" font-weight="900" text-anchor="middle">O QUE O PRODUTO PROMETE</text><text x="786" y="926" fill="${C.ink}" font-family="Arial" font-size="15" font-weight="900" text-anchor="middle">O QUE A IMAGEM PROVA</text>${copy(["Uma arte sobre IA não precisa ilustrar inteligência.", "Precisa mostrar o sistema que está sendo discutido."], 54, 1168, 31, C.ink, 1.25)}<text x="54" y="1270" fill="${C.muted}" font-family="Arial" font-size="13" font-weight="900">FONTE VISUAL: PÁGINAS OFICIAIS OPENAI E ANTHROPIC</text>`),
  frame(6, C.white, `${text(["O CONTEÚDO", "NASCE QUANDO", "O MODELO ATRAVESSA", "A EVIDÊNCIA."], 54, 168, 61, C.ink, "Arial Black", .86)}<rect x="54" y="470" width="972" height="2" fill="${C.ink}"/><g><circle cx="126" cy="620" r="56" fill="${C.ink}"/>${imageBlock(image.openai, "openai-flow", 86, 580, 80, 80, "meet")}<text x="126" y="730" fill="${C.ink}" font-family="Arial" font-size="16" font-weight="900" text-anchor="middle">MODELO</text><line x1="182" y1="620" x2="310" y2="620" stroke="${C.claude}" stroke-width="5"/><circle cx="366" cy="620" r="48" fill="${C.claude}"/><text x="366" y="628" fill="${C.ink}" font-family="Arial" font-size="18" font-weight="900" text-anchor="middle">02</text><text x="366" y="730" fill="${C.ink}" font-family="Arial" font-size="16" font-weight="900" text-anchor="middle">PESQUISA</text><line x1="414" y1="620" x2="542" y2="620" stroke="${C.ink}" stroke-width="5"/><circle cx="598" cy="620" r="48" fill="${C.paper}" stroke="${C.ink}" stroke-width="3"/><text x="598" y="628" fill="${C.ink}" font-family="Arial" font-size="18" font-weight="900" text-anchor="middle">03</text><text x="598" y="730" fill="${C.ink}" font-family="Arial" font-size="16" font-weight="900" text-anchor="middle">PROVA</text><line x1="646" y1="620" x2="774" y2="620" stroke="${C.ink}" stroke-width="5"/><circle cx="830" cy="620" r="56" fill="${C.claude}"/>${imageBlock(image.claude, "claude-flow", 790, 580, 80, 80, "meet")}<text x="830" y="730" fill="${C.ink}" font-family="Arial" font-size="16" font-weight="900" text-anchor="middle">ARTE</text></g>${copy(["A marca aparece no componente.", "A tese aparece na escolha do recorte.", "A autoria aparece na montagem."], 54, 900, 33, C.ink, 1.25)}<rect x="54" y="1114" width="972" height="92" fill="${C.claude}"/>${text(["PESQUISA REAL → COMPONENTE REAL → PONTO DE VISTA"], 82, 1172, 34, C.ink, "Arial Black", .9)}<text x="54" y="1270" fill="${C.muted}" font-family="Arial" font-size="13" font-weight="900">HÁGIOS / MÉTODO PARA CARROSSEIS DE IA</text>`),
  frame(7, C.ink, `${imageBlock(image.claude, "claude-final", 72, 96, 250, 250, "meet")}<text x="358" y="222" fill="${C.claude}" font-family="Arial" font-size="23" font-weight="900">×</text><circle cx="814" cy="220" r="142" fill="${C.white}"/>${imageBlock(image.openai, "openai-final", 674, 80, 280, 280, "meet")}<line x1="54" y1="430" x2="1026" y2="430" stroke="#55585e" stroke-width="2"/>${text(["NÃO É CLAUDE", "OU GPT."], 54, 570, 92, C.white, "Arial Black", .86)}${text(["É TER", "ALGO A PROVAR."], 54, 850, 92, C.claude, "Arial Black", .86)}<copy /><text x="54" y="1128" fill="${C.white}" font-family="Georgia" font-size="36">A imagem não enfeita a tese.</text><text x="54" y="1190" fill="${C.white}" font-family="Georgia" font-size="36">Ela é parte da prova.</text><text x="54" y="1280" fill="#9b9fa5" font-family="Arial" font-size="13" font-weight="900">OPENAI.COM/INDEX/GPT-5-6 · ANTHROPIC.COM/NEWS/CLAUDE-SONNET-5</text>`, C.white),
];

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(publicDir, { recursive: true });
for (const [index, svg] of slides.entries()) {
  const name = `${String(index + 1).padStart(2, "0")}-hagios-ia-2026-v3.png`;
  const output = path.join(outputDir, name);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(output);
  await fs.copyFile(output, path.join(publicDir, name));
}

const sources = `# Fontes e atribuições\n\n- [GPT-5.6: Frontier intelligence that scales with your ambition](https://openai.com/index/gpt-5-6/) — OpenAI, 9 jul. 2026.\n- [Introducing Claude Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5) — Anthropic, 30 jun. 2026.\n\n## Componentes reutilizáveis\n\n- claude-mark.png — símbolo enviado para esta direção visual.\n- openai-mark.png — símbolo enviado para esta direção visual.\n- openai-source.png — recorte de página oficial OpenAI.\n- anthropic-source.png — recorte de página oficial Anthropic.\n\nOs logos e recortes aparecem como identificação visual e evidência editorial, com atribuição às páginas oficiais.\n`;
await fs.writeFile(path.join(outputDir, "fontes.md"), sources);
await fs.writeFile(path.join(publicDir, "fontes.md"), sources);
console.log(`Created ${slides.length} visual slides in ${outputDir}`);
