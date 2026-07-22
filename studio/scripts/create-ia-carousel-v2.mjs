import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const studio = path.resolve(import.meta.dirname, "..");
const workspace = path.resolve(studio, "..");
const outputDir = path.join(workspace, "Carrossel 1", "Hagios-IA-2026-v2");
const publicDir = path.join(studio, "public", "carousels", "hagios-ia-2026-v2");
const [hero, openai, anthropic] = await Promise.all([
  fs.readFile(path.join(studio, "public", "carousels", "hagios-ia-2026-v2-hero.png")),
  fs.readFile(path.join(studio, "public", "carousels", "hagios-ia-2026-v2-openai-source.png")),
  fs.readFile(path.join(studio, "public", "carousels", "hagios-ia-2026-v2-anthropic-source.png")),
]);

const W = 1080;
const H = 1350;
const C = { black: "#07090d", white: "#f7f7f2", orange: "#ff4b21", blue: "#1d75ff", ice: "#dbe7ff", line: "#a5abb5", gray: "#686b70" };
const enc = (buffer) => buffer.toString("base64");
const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const image = { hero: enc(hero), openai: enc(openai), anthropic: enc(anthropic) };

function text(lines, x, y, size, fill, family = "Arial Black", leading = .9, anchor = "start") {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="900" letter-spacing="0" text-anchor="${anchor}">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : size * leading}">${esc(line)}</tspan>`).join("")}</text>`;
}

function copy(lines, x, y, size, fill, leading = 1.25) {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="Arial" font-size="${size}" font-weight="700">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : size * leading}">${esc(line)}</tspan>`).join("")}</text>`;
}

function imageBlock(data, id, x, y, width, height, opacity = 1) {
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath><g clip-path="url(#${id})" opacity="${opacity}"><image href="data:image/png;base64,${data}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/></g>`;
}

function top(page, light = false) {
  const fill = light ? C.white : C.black;
  return `<text x="54" y="52" fill="${fill}" font-family="Arial" font-size="12" font-weight="900">HÁGIOS / OBSERVATÓRIO DE IA</text><text x="1026" y="52" fill="${fill}" font-family="Arial" font-size="12" font-weight="900" text-anchor="end">${String(page).padStart(2, "0")} / 07</text>`;
}

function frame(page, background, content, light = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${background}"/>${top(page, light)}${content}</svg>`;
}

const slides = [
  frame(1, C.black, `${imageBlock(image.hero, "hero", 0, 0, W, H)}<rect width="${W}" height="${H}" fill="#000" opacity=".24"/><rect x="44" y="760" width="992" height="500" fill="#07090d" opacity=".83"/><rect x="54" y="802" width="160" height="27" fill="${C.orange}"/><text x="66" y="821" fill="${C.black}" font-family="Arial" font-size="12" font-weight="900">NOVA FRONTEIRA</text>${text(["A GUERRA DE IA", "NÃO É POR CHAT."], 54, 904, 78, C.white, "Arial Black", .88)}${text(["É POR EXECUÇÃO."], 54, 1100, 78, C.orange, "Arial Black", .88)}<text x="54" y="1232" fill="#d2d6dc" font-family="Arial" font-size="13" font-weight="900">GPT-5.6 · CLAUDE SONNET 5 · O MODELO VIROU INFRAESTRUTURA</text>` , true),
  frame(2, C.white, `${text(["GPT-5.6", "A FAMÍLIA", "VIROU PRODUTO."], 54, 164, 62, C.black, "Arial Black", .86)}<rect x="54" y="370" width="972" height="496" fill="#111"/>${imageBlock(image.openai, "openai", 55, 371, 970, 494)}<rect x="54" y="892" width="972" height="122" fill="${C.blue}"/><text x="80" y="938" fill="white" font-family="Arial" font-size="14" font-weight="900">SOL / TERRA / LUNA</text>${copy(["Uma família com diferentes níveis de esforço, custo e", "coordenação de ferramentas. A interface deixou de ser só chat."], 80, 973, 24, "white", 1.3)}<text x="54" y="1110" fill="${C.gray}" font-family="Arial" font-size="13" font-weight="900">RECORTE DA PÁGINA OFICIAL OPENAI · GPT-5.6 · 09 JUL 2026</text><rect x="54" y="1150" width="210" height="48" fill="${C.black}"/><text x="70" y="1180" fill="white" font-family="Arial" font-size="16" font-weight="900">SOL</text><text x="286" y="1180" fill="${C.black}" font-family="Arial" font-size="16" font-weight="900">MAIS ESFORÇO</text><text x="616" y="1180" fill="${C.black}" font-family="Arial" font-size="16" font-weight="900">MAIS AUTONOMIA</text>`, false),
  frame(3, C.orange, `${text(["CLAUDE SONNET 5", "O AGENTE ENTROU", "NO TIME."], 54, 180, 64, C.black, "Arial Black", .86)}<rect x="54" y="470" width="972" height="456" fill="${C.white}"/>${imageBlock(image.anthropic, "anthropic", 55, 471, 970, 454)}<rect x="54" y="958" width="972" height="1" fill="#8a2615"/><text x="54" y="1018" fill="${C.black}" font-family="Arial" font-size="15" font-weight="900">NAVEGADOR</text><text x="282" y="1018" fill="${C.black}" font-family="Arial" font-size="15" font-weight="900">TERMINAL</text><text x="490" y="1018" fill="${C.black}" font-family="Arial" font-size="15" font-weight="900">PLANOS</text><text x="718" y="1018" fill="${C.black}" font-family="Arial" font-size="15" font-weight="900">CHECKPOINTS</text>${copy(["A promessa não é responder mais bonito.", "É terminar tarefas que antes paravam no meio."], 54, 1090, 30, C.black, 1.25)}<text x="54" y="1260" fill="#762416" font-family="Arial" font-size="13" font-weight="900">RECORTE DA PÁGINA OFICIAL ANTHROPIC · CLAUDE SONNET 5 · 30 JUN 2026</text>`, false),
  frame(4, C.black, `${text(["DOIS MODELOS", "ENTRANDO PELO MESMO", "LUGAR: O FLUXO."], 54, 176, 65, C.white, "Arial Black", .86)}<rect x="54" y="430" width="458" height="330" fill="${C.white}"/>${imageBlock(image.openai, "openai-small", 55, 431, 456, 328)}<rect x="568" y="430" width="458" height="330" fill="${C.white}"/>${imageBlock(image.anthropic, "anthropic-small", 569, 431, 456, 328)}<rect x="54" y="795" width="458" height="72" fill="${C.blue}"/><text x="78" y="840" fill="white" font-family="Arial" font-size="24" font-weight="900">GPT / COORDENA</text><rect x="568" y="795" width="458" height="72" fill="${C.orange}"/><text x="592" y="840" fill="${C.black}" font-family="Arial" font-size="24" font-weight="900">CLAUDE / EXECUTA</text>${copy(["A diferença não está no logo.", "Está em como cada sistema atravessa", "a pesquisa até a entrega."], 54, 962, 31, C.white, 1.25)}<text x="54" y="1224" fill="#9fa4aa" font-family="Arial" font-size="13" font-weight="900">COMPONENTES VISUAIS CAPTURADOS NAS PÁGINAS OFICIAIS · ATRIBUIÇÃO NO DOSSIÊ</text>` , true),
  frame(5, C.white, `${text(["O QUE MUDOU", "NÃO FOI O CHAT."], 54, 180, 72, C.black, "Arial Black", .88)}<rect x="54" y="360" width="972" height="12" fill="${C.black}"/><g><rect x="54" y="410" width="290" height="290" fill="${C.black}"/><text x="82" y="470" fill="${C.orange}" font-family="Arial" font-size="16" font-weight="900">ANTES</text>${text(["PERGUNTA", "RESPOSTA"], 82, 550, 46, C.white, "Arial Black", .9)}<text x="82" y="660" fill="#aeb2b8" font-family="Arial" font-size="16" font-weight="900">uma janela</text></g><path d="M390 554 H500" stroke="${C.orange}" stroke-width="7"/><path d="M500 554 l-26 -18 v36 z" fill="${C.orange}"/><g><rect x="568" y="410" width="458" height="290" fill="${C.blue}"/><text x="598" y="470" fill="white" font-family="Arial" font-size="16" font-weight="900">AGORA</text>${text(["PLANEJA", "USA TOOLS", "ENTREGA"], 598, 540, 44, "white", "Arial Black", .9)}<rect x="598" y="646" width="250" height="30" fill="#9ec0ff"/><rect x="864" y="646" width="122" height="30" fill="white"/></g>${copy(["O modelo entrou no fluxo de trabalho:", "navega, consulta, compara, produz e revisa."], 54, 836, 33, C.black, 1.25)}<text x="54" y="1168" fill="${C.gray}" font-family="Georgia" font-size="34">A conversa é só a porta de entrada.</text><text x="54" y="1258" fill="${C.gray}" font-family="Arial" font-size="13" font-weight="900">LEITURA EDITORIAL HÁGIOS · A PARTIR DOS LANÇAMENTOS OFICIAIS</text>`, false),
  frame(6, C.black, `${text(["PARA CONTEÚDO,", "O MODELO É SÓ", "UMA PEÇA."], 54, 176, 70, C.white, "Arial Black", .86)}<rect x="54" y="470" width="972" height="1" fill="#494e57"/><g><circle cx="120" cy="620" r="38" fill="${C.orange}"/><text x="120" y="628" fill="${C.black}" font-family="Arial" font-size="18" font-weight="900" text-anchor="middle">01</text><text x="120" y="700" fill="white" font-family="Arial" font-size="18" font-weight="900" text-anchor="middle">BRIEF</text><line x1="160" y1="620" x2="288" y2="620" stroke="#858b93" stroke-width="2"/><circle cx="330" cy="620" r="38" fill="${C.blue}"/><text x="330" y="628" fill="white" font-family="Arial" font-size="18" font-weight="900" text-anchor="middle">02</text><text x="330" y="700" fill="white" font-family="Arial" font-size="18" font-weight="900" text-anchor="middle">BUSCA</text><line x1="370" y1="620" x2="498" y2="620" stroke="#858b93" stroke-width="2"/><circle cx="540" cy="620" r="38" fill="${C.white}"/><text x="540" y="628" fill="${C.black}" font-family="Arial" font-size="18" font-weight="900" text-anchor="middle">03</text><text x="540" y="700" fill="white" font-family="Arial" font-size="18" font-weight="900" text-anchor="middle">PROVA</text><line x1="580" y1="620" x2="708" y2="620" stroke="#858b93" stroke-width="2"/><circle cx="750" cy="620" r="38" fill="${C.orange}"/><text x="750" y="628" fill="${C.black}" font-family="Arial" font-size="18" font-weight="900" text-anchor="middle">04</text><text x="750" y="700" fill="white" font-family="Arial" font-size="18" font-weight="900" text-anchor="middle">ARTE</text><line x1="790" y1="620" x2="918" y2="620" stroke="#858b93" stroke-width="2"/><circle cx="960" cy="620" r="38" fill="${C.blue}"/><text x="960" y="628" fill="white" font-family="Arial" font-size="18" font-weight="900" text-anchor="middle">05</text><text x="960" y="700" fill="white" font-family="Arial" font-size="18" font-weight="900" text-anchor="middle">REVISÃO</text></g>${copy(["A diferença entre gerar e publicar é a cadeia de evidências", "que você consegue manter viva depois do prompt."], 54, 850, 31, C.white, 1.25)}<text x="54" y="1110" fill="${C.orange}" font-family="Georgia" font-size="38">Pesquisa real. Imagem real. Ponto de vista próprio.</text><text x="54" y="1260" fill="#9fa4aa" font-family="Arial" font-size="13" font-weight="900">HÁGIOS CULTURE ENGINE / FLUXO EDITORIAL</text>`, true),
  frame(7, C.black, `${imageBlock(image.hero, "hero-end", 0, 0, W, H)}<rect width="${W}" height="${H}" fill="#000" opacity=".38"/><rect x="42" y="820" width="996" height="430" fill="#07090d" opacity=".88"/><text x="54" y="880" fill="${C.orange}" font-family="Arial" font-size="15" font-weight="900">A DECISÃO NÃO É CLAUDE OU GPT.</text>${text(["É SE SUA", "MARCA TEM", "ALGO A PROVAR."], 54, 980, 82, C.white, "Arial Black", .84)}<text x="54" y="1230" fill="#d2d6dc" font-family="Arial" font-size="15" font-weight="900">SALVE PARA A PRÓXIMA PAUTA DE CONTEÚDO.</text><text x="54" y="1294" fill="#d2d6dc" font-family="Arial" font-size="13" font-weight="900">FONTES: OPENAI.COM/INDEX/GPT-5-6 · ANTHROPIC.COM/NEWS/CLAUDE-SONNET-5</text>`, true),
];

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(publicDir, { recursive: true });
for (const [index, svg] of slides.entries()) {
  const name = `${String(index + 1).padStart(2, "0")}-hagios-ia-2026-v2.png`;
  const output = path.join(outputDir, name);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(output);
  await fs.copyFile(output, path.join(publicDir, name));
}

const sources = `# Fontes e atribuições\n\n- [GPT-5.6: Frontier intelligence that scales with your ambition](https://openai.com/index/gpt-5-6/) — OpenAI, 9 jul. 2026.\n- [Introducing Claude Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5) — Anthropic, 30 jun. 2026.\n\nAs capturas de tela usadas como componentes visuais foram feitas nas páginas oficiais das empresas e aparecem apenas como evidência editorial atribuída. A fotografia de capa e encerramento foi gerada para este carrossel.\n`;
await fs.writeFile(path.join(outputDir, "fontes.md"), sources);
await fs.writeFile(path.join(publicDir, "fontes.md"), sources);
console.log(`Created ${slides.length} visual slides in ${outputDir}`);
