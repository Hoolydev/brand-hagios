"use client";

import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpenText,
  Camera,
  Check,
  ChevronDown,
  Clock3,
  Compass,
  Database,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Layers3,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  Menu,
  MoreHorizontal,
  Palette,
  PencilLine,
  Plus,
  Radar,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  Sparkles,
  Target,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import { AccountControls } from "@/components/account-controls";
import { useEffect, useMemo, useState } from "react";

type Slide = {
  id: number | string;
  order?: number;
  role: string;
  title: string;
  note: string;
  body?: string | null;
  kind: "cover" | "dark" | "signal" | "paper" | "mint";
  imageUrl?: string | null;
  sourceId?: string | null;
  imageStrategy?: "generated" | "source" | "none";
  renderedImageUrl?: string | null;
};

type SavedProject = {
  id: string;
  title: string;
  slideCount: string;
  updated: string;
  interests: string[];
  status: "Rascunho" | "Pronto" | "Gerando" | "Falhou" | "Exemplo" | "Importado";
};

type SourceItem = {
  id?: string;
  domain: string;
  title: string;
  detail: string;
  score: string;
  color: string;
  url: string;
  imageUrl?: string | null;
  summary?: string | null;
};

type AgentRun = { id: string; agent: string; status: string; model?: string | null; error?: string | null; startedAt?: string | null; completedAt?: string | null };
type RuntimeStatus = { database: boolean; ai: boolean; provider: string | null; models: { text: string; image: string } | null; research: boolean; openai: boolean; session: boolean; authRequired: boolean; storage: boolean };






const steps = [
  { label: "Radar", icon: Radar },
  { label: "Tese", icon: Target },
  { label: "Roteiro", icon: BookOpenText },
  { label: "Arte", icon: Palette },
  { label: "Publicação", icon: Send },
];

export default function Home() {
  const [workspaceView, setWorkspaceView] = useState<"home" | "editor">("home");
  const [selectedSlide, setSelectedSlide] = useState(0);
  const [activeStage, setActiveStage] = useState(3);
  const [inspector, setInspector] = useState<"fontes" | "marca" | "agentes">("fontes");
  const [slideCount, setSlideCount] = useState("7");
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState("Biblioteca conectada ao PostgreSQL");
  const [brandName, setBrandName] = useState("HÁGIOS");
  const [instagram, setInstagram] = useState("@hagios.ai");
  const [brandAudience, setBrandAudience] = useState("");
  const [brandPositioning, setBrandPositioning] = useState("");
  const [voiceTags, setVoiceTags] = useState<string[]>([]);
  const [voiceInput, setVoiceInput] = useState("");
  const [brandPalette, setBrandPalette] = useState<string[]>(["#F4F1EA", "#0E0E0F", "#D97757", "#F2B711"]);
  const [ctaKeyword, setCtaKeyword] = useState("IA");
  const [ctaDelivery, setCtaDelivery] = useState("");
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [brandPersisted, setBrandPersisted] = useState(false);
  const [tone, setTone] = useState(74);
  const [showBrief, setShowBrief] = useState(false);
  const [briefStep, setBriefStep] = useState(1);
  const [showLibrary, setShowLibrary] = useState(false);
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [projectTitle, setProjectTitle] = useState("Nenhum projeto aberto");
  const [currentCarouselId, setCurrentCarouselId] = useState<string | null>(null);
  const [projectThesis, setProjectThesis] = useState("");
  const [projectSlides, setProjectSlides] = useState<Slide[]>([]);
  const [projectSources, setProjectSources] = useState<SourceItem[]>([]);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSlideEditor, setShowSlideEditor] = useState(false);
  const [slideInstruction, setSlideInstruction] = useState("");
  const [sourceQuery, setSourceQuery] = useState("");
  const [sourceUrlsInput, setSourceUrlsInput] = useState("");
  const [isEditingSlide, setIsEditingSlide] = useState(false);
  const filteredSources = useMemo(() => {
    const q = sourceQuery.trim().toLowerCase();
    if (!q) return projectSources;
    return projectSources.filter((item) => `${item.title} ${item.domain} ${item.summary ?? ""}`.toLowerCase().includes(q));
  }, [projectSources, sourceQuery]);
  const visibleSlides = useMemo(() => projectSlides.slice(0, Number(slideCount)), [projectSlides, slideCount]);
  const slide = visibleSlides[selectedSlide] ?? visibleSlides[0];

  const progress = useMemo(() => `${Math.round(((activeStage + 1) / steps.length) * 100)}%`, [activeStage]);

  useEffect(() => {
    const loadStatus = (attempt = 0) => {
      void fetch("/api/system/status")
        .then((response) => response.json())
        .then((status: RuntimeStatus) => setRuntimeStatus(status))
        .catch(() => { if (attempt < 4) setTimeout(() => loadStatus(attempt + 1), 1500); });
    };
    loadStatus();
    void loadLibrary();
    void loadBrandProfile();
  }, []);

  type BrandProfile = {
    name: string; instagram: string; audience: string; positioning: string;
    voice: string[]; palette: string[]; ctaKeyword: string; ctaDelivery: string; persisted: boolean;
  };

  function applyBrandProfile(profile: BrandProfile) {
    setBrandName(profile.name);
    setInstagram(profile.instagram);
    setBrandAudience(profile.audience);
    setBrandPositioning(profile.positioning);
    setVoiceTags(profile.voice);
    if (profile.palette?.length) setBrandPalette(profile.palette);
    setCtaKeyword(profile.ctaKeyword);
    setCtaDelivery(profile.ctaDelivery);
    setBrandPersisted(profile.persisted);
  }

  async function loadBrandProfile() {
    const response = await fetch("/api/brand-profile");
    if (!response.ok) return;
    applyBrandProfile(await response.json() as BrandProfile);
  }

  async function saveBrandProfile() {
    setIsSavingBrand(true);
    setApiError(null);
    try {
      const response = await fetch("/api/brand-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: brandName, instagram, audience: brandAudience, positioning: brandPositioning,
          voice: voiceTags, palette: brandPalette, ctaKeyword, ctaDelivery,
        }),
      });
      if (!response.ok) {
        setApiError(await readError(response));
        return;
      }
      applyBrandProfile(await response.json() as BrandProfile);
      setNotice("Marca salva no PostgreSQL · aplicada aos próximos carrosséis");
    } finally {
      setIsSavingBrand(false);
    }
  }

  /** Uma URL por linha; aceita colar bloco de texto com links. */
  function parsedSourceUrls() {
    return sourceUrlsInput.split(/[\s,]+/).map((v) => v.trim()).filter((v) => /^https?:\/\//i.test(v));
  }

  /** A manchete marca o destaque entre **asteriscos**; aqui ele vira cor. */
  function renderHeadline(title: string) {
    return title.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) =>
      part.startsWith("**") && part.endsWith("**")
        ? <em key={index} className="hl">{part.slice(2, -2)}</em>
        : <span key={index}>{part}</span>);
  }

  /** Volta para a lista de projetos de qualquer lugar do app. */
  function goHome() {
    setWorkspaceView("home");
    setShowLibrary(false);
    setShowBrief(false);
    setShowSlideEditor(false);
    setApiError(null);
    void loadLibrary();
  }

  function addVoiceTag() {
    const value = voiceInput.trim();
    if (!value || voiceTags.includes(value)) return;
    setVoiceTags((current) => [...current, value]);
    setVoiceInput("");
  }

  /** Códigos crus da API viram frase legível; o resto cai no texto do servidor. */
  const ERROR_TEXT: Record<string, string> = {
    NOT_FOUND: "Este projeto não existe mais. A lista foi atualizada.",
    UNAUTHORIZED: "Faça login para continuar.",
    DATABASE_NOT_CONFIGURED: "Banco de dados não conectado.",
    AI_NOT_CONFIGURED: "Configure FAL_KEY ou OPENAI_API_KEY para gerar.",
    RESEARCH_NOT_CONFIGURED: "O dossiê precisa de busca real na web, que hoje só a OPENAI_API_KEY oferece.",
    OPENAI_NOT_CONFIGURED: "Configure a OPENAI_API_KEY para gerar.",
    NAME_REQUIRED: "O nome da marca é obrigatório.",
    SOURCES_REQUIRED: "Cole ao menos 2 links de matérias no briefing — o dossiê é montado a partir deles.",
  };

  async function readError(response: Response) {
    const payload = await response.json().catch(() => ({})) as { message?: string; error?: string };
    const code = payload.error ?? "";
    return ERROR_TEXT[code] ?? payload.message ?? code ?? `Erro ${response.status}`;
  }

  function mapStatus(value: string): SavedProject["status"] {
    if (value === "ready") return "Pronto";
    if (value === "generating") return "Gerando";
    if (value === "failed") return "Falhou";
    return "Rascunho";
  }

  async function loadLibrary() {
    const response = await fetch("/api/carousels");
    if (!response.ok) {
      setSavedProjects([]);
      return;
    }
    const payload = await response.json() as { items: Array<{ id: string; title: string; slideCount: number; updatedAt: string; interests: string[]; status: string }> };
    setSavedProjects(payload.items.map((item) => ({ id: item.id, title: item.title, slideCount: String(item.slideCount), updated: new Date(item.updatedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }), interests: item.interests, status: mapStatus(item.status) })));
  }

  async function createProject() {
    const cleanTopic = topic.trim() || "Novo radar cultural";
    const response = await fetch("/api/carousels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: cleanTopic,
        topic: cleanTopic,
        audience,
        interests,
        slideCount: Number(slideCount),
        brandSnapshot: { name: brandName, instagram, tone },
      }),
    });
    if (!response.ok) throw new Error(await readError(response));
    const created = await response.json() as { id: string; title: string };
    setCurrentCarouselId(created.id);
    setProjectTitle(created.title);
    await loadLibrary();
    return created.id;
  }

  function addInterest(value = interestInput) {
    const clean = value.trim();
    if (clean && !interests.includes(clean)) setInterests((current) => [...current, clean]);
    setInterestInput("");
  }

  async function startBrief() {
    setApiError(null);
    try {
      await createProject();
      setSelectedSlide(0);
      setActiveStage(0);
      setShowBrief(false);
      setWorkspaceView("editor");
      setNotice("Briefing salvo no PostgreSQL · pronto para pesquisar");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Não foi possível criar o projeto");
    }
  }

  function openNewBrief() {
    setCurrentCarouselId(null);
    setProjectSlides([]);
    setProjectSources([]);
    setAgentRuns([]);
    setApiError(null);
    setProjectTitle("Nenhum projeto aberto");
    setTopic("");
    setAudience("");
    setInterests([]);
    setBriefStep(1);
    setShowBrief(false);
    setWorkspaceView("home");
  }

  async function saveProject() {
    setApiError(null);
    try {
      const id = currentCarouselId ?? await createProject();
      const response = await fetch(`/api/carousels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: projectTitle, topic, audience, interests, slideCount: Number(slideCount), brandSnapshot: { name: brandName, instagram, tone } }),
      });
      if (!response.ok) throw new Error(await readError(response));
      await loadLibrary();
      setNotice("Carrossel salvo no PostgreSQL");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Falha ao salvar");
      setNotice("Salvamento bloqueado · verifique a configuração");
    }
  }

  async function openSavedProject(project: SavedProject) {
    const response = await fetch(`/api/carousels/${project.id}`);
    if (!response.ok) {
      setApiError(await readError(response));
      // projeto sumiu do banco (apagado em outra aba/sessão): tira o card fantasma
      if (response.status === 404) await loadLibrary();
      return;
    }
    const item = await response.json() as { id: string; title: string; topic: string; audience: string; interests: string[]; slideCount: number; thesis?: string | null; slides: Array<Slide & { order: number; body?: string | null }>; sources: Array<{ id: string; publisher?: string | null; title: string; summary?: string | null; relevanceScore?: number | null; url: string; imageUrl?: string | null }>; agentRuns: AgentRun[] };
    setCurrentCarouselId(item.id);
    setProjectThesis(item.thesis ?? "");
    setProjectTitle(item.title);
    setTopic(item.topic);
    setAudience(item.audience);
    setSlideCount(String(item.slideCount));
    setInterests(item.interests);
    // Artes finais vivem em /carousels/. Elas já contêm toda a tipografia, então
    // entram como renderedImageUrl — o artboard não deve recompor texto por cima.
    if (item.slides.length) setProjectSlides(item.slides.map((entry) => {
      const isFinalArt = typeof entry.imageUrl === "string" && entry.imageUrl.startsWith("/carousels/");
      return {
        ...entry,
        id: entry.id,
        note: entry.body ?? entry.role,
        imageUrl: isFinalArt ? null : entry.imageUrl,
        renderedImageUrl: isFinalArt ? entry.imageUrl : entry.renderedImageUrl ?? null,
      };
    }));
    setProjectSources(item.sources.map((source, index) => ({ id: source.id, domain: source.publisher ?? new URL(source.url).hostname, title: source.title, detail: "fonte real rastreada", score: String(Math.round(source.relevanceScore ?? 0)), color: ["#deff3f", "#ff5b35", "#77d9ff"][index % 3], url: source.url, imageUrl: source.imageUrl, summary: source.summary })));
    setAgentRuns(item.agentRuns);
    setSelectedSlide(0);
    setShowLibrary(false);
    setWorkspaceView("editor");
    setNotice(`Projeto aberto do PostgreSQL · ${item.slideCount} telas`);
  }

  async function removeSavedProject(id: string) {
    const response = await fetch(`/api/carousels/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setApiError(await readError(response));
      return;
    }
    await loadLibrary();
  }

  function changeSlideCount(value: string) {
    setSlideCount(value);
    setSelectedSlide((current) => Math.min(current, Number(value) - 1));
  }

  async function runGeneration() {
    setIsGenerating(true);
    setApiError(null);
    setInspector("agentes");
    setNotice("Pesquisa real iniciada · Research → Brand → Storytelling → Copy → Imagem");
    try {
      const id = currentCarouselId ?? await createProject();
      const response = await fetch(`/api/carousels/${id}/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceUrls: parsedSourceUrls() }) });
      if (!response.ok) throw new Error(await readError(response));
      await openSavedProject({ id, title: projectTitle, slideCount, updated: "agora", interests, status: "Pronto" });
      setIsGenerating(false);
      setActiveStage(3);
      setNotice("Carrossel criado e salvo · fontes e imagens vinculadas");
      await loadLibrary();
    } catch (error) {
      setIsGenerating(false);
      setApiError(error instanceof Error ? error.message : "Falha na geração");
      setNotice("Geração interrompida · nenhuma saída fictícia foi criada");
    }
  }

  async function editSelectedSlide() {
    if (!slide || !slideInstruction.trim()) return;
    if (!currentCarouselId) {
      setShowSlideEditor(false);
      setNotice("Edição assistida disponível depois que este projeto for salvo");
      return;
    }
    setIsEditingSlide(true);
    setApiError(null);
    try {
      const response = await fetch(`/api/carousels/${currentCarouselId}/slides/${slide.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: slideInstruction.trim() }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const payload = await response.json() as { slide: Slide };
      setProjectSlides((current) => current.map((item) => item.id === payload.slide.id ? { ...item, ...payload.slide, note: payload.slide.body ?? payload.slide.role } : item));
      setShowSlideEditor(false);
      setSlideInstruction("");
      setNotice(`Card ${selectedSlide + 1} atualizado pelo assistente · restante preservado`);
      await loadLibrary();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Falha ao editar o card");
    } finally {
      setIsEditingSlide(false);
    }
  }

  function exportProject() {
    const payload = {
      brand: { name: brandName, instagram, tone },
      brief: topic,
      audience,
      interests,
      slides: visibleSlides,
      sources: projectSources,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "hagios-carrossel-beauty-lab.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Pacote editorial exportado");
  }

  return (
    <main className="app-shell">
      <aside className="icon-rail" aria-label="Navegação principal">
        <button className="brand-mark" aria-label="Voltar para os projetos" title="Voltar para os projetos" onClick={goHome}>
          <img src="/brand/hagios-wordmark-gold.png" alt="HÁGIOS" />
        </button>
        <nav>
          <button className={`rail-button ${workspaceView === "home" ? "active" : ""}`} aria-label="Projetos" title="Projetos" onClick={goHome}><LayoutDashboard size={19} /></button>
          <button className="rail-button" aria-label="Radar cultural" title="Radar cultural · novo briefing" onClick={() => { goHome(); openNewBrief(); }}><Radar size={19} /></button>
          <button className="rail-button" aria-label="Biblioteca" title="Biblioteca" onClick={() => { setShowLibrary(true); void loadLibrary(); }}><Layers3 size={19} /></button>
          <button className="rail-button" aria-label="Brand kit" title="Brand kit" onClick={() => setInspector("marca")}><Palette size={19} /></button>
        </nav>
        <div className="rail-bottom">
          <button className="rail-button" aria-label="Configurações" title="Configurações · Brand kit" onClick={() => { if (workspaceView === "editor") setInspector("marca"); else setNotice("Abra um projeto para configurar a marca no Brand kit."); }}><Settings2 size={19} /></button>
          <div className="avatar">HJ</div>
        </div>
      </aside>

      <section className={`workspace ${workspaceView === "home" ? "home-view" : ""}`}>
        <header className="topbar">
          <div className="topbar-title">
            <button className="mobile-menu" aria-label="Abrir menu"><Menu size={20} /></button>
            <div>
              <p>HAGIOS / CULTURE ENGINE</p>
              <h1>Estúdio editorial</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <AccountControls />
            {runtimeStatus && <span className={`runtime-pill ${runtimeStatus.database && runtimeStatus.ai ? "online" : "offline"}`}>{runtimeStatus.database && runtimeStatus.ai ? `Conectado · ${runtimeStatus.provider}` : "Configuração pendente"}</span>}
            {workspaceView === "editor" && <button className="new-button" onClick={openNewBrief}><Plus size={16} /> Novo carrossel</button>}
            <button className="save-button" onClick={() => void saveProject()}><Save size={15} /> Salvar</button>
            <button className="secondary-button" onClick={exportProject}><Download size={16} /> Exportar</button>
            <button className="primary-button" onClick={() => void runGeneration()} disabled={isGenerating || !runtimeStatus?.database || !runtimeStatus?.ai || (!runtimeStatus?.research && parsedSourceUrls().length < 2)} title={!runtimeStatus?.database ? "Conecte o PostgreSQL" : !runtimeStatus?.ai ? "Configure FAL_KEY" : (!runtimeStatus?.research && parsedSourceUrls().length < 2) ? "Cole ao menos 2 links de matérias no briefing" : "Gerar carrossel"}>
              {isGenerating ? <LoaderCircle className="spin" size={17} /> : <WandSparkles size={17} />}
              {isGenerating ? "Orquestrando" : "Gerar carrossel"}
            </button>
          </div>
        </header>

        {workspaceView === "editor" && <>
        <section className="project-strip">
          <div className="project-heading">
            <span className="status-dot" />
            <div>
              <p>EM PRODUÇÃO</p>
              <h2>{projectTitle}</h2>
            </div>
          </div>
          <div className="project-settings">
            <label>
              SLIDES
              <select value={slideCount} onChange={(event) => changeSlideCount(event.target.value)}>
                <option>5</option><option>7</option><option>8</option><option>10</option>
              </select>
            </label>
            <span className="format-chip"><Camera size={14} /> 4:5 · 1080×1350</span>
            <button className="icon-button" aria-label="Mais opções" title="Mais opções"><MoreHorizontal size={18} /></button>
          </div>
        </section>

        <nav className="pipeline" aria-label="Etapas editoriais">
          <div className="pipeline-line"><span style={{ width: progress }} /></div>
          {steps.map((item, index) => {
            const StepIcon = item.icon;
            const done = index < activeStage;
            return (
              <button
                key={item.label}
                className={`pipeline-step ${index === activeStage ? "active" : ""} ${done ? "done" : ""}`}
                onClick={() => setActiveStage(index)}
              >
                <span>{done ? <Check size={14} /> : <StepIcon size={15} />}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="notice-bar">
          <span><b>PASSO {activeStage + 1} DE 5</b><BadgeCheck size={15} /> {notice}</span>
          <button onClick={goHome}>voltar aos projetos <ArrowRight size={13} /></button>
        </div>

        <section className="studio-grid">
          <aside className="slides-panel">
            <div className="panel-title">
              <div><p>ROTEIRO</p><strong>{slideCount} telas</strong></div>
              <button className="icon-button small" aria-label="Adicionar slide" title="Adicionar slide"><Plus size={15} /></button>
            </div>
            <div className="slide-list">
              {visibleSlides.map((item, index) => (
                <button
                  key={item.id}
                  className={`slide-row ${selectedSlide === index ? "selected" : ""}`}
                  onClick={() => setSelectedSlide(index)}
                >
                  <span className={`slide-thumb ${item.kind}`}>
                    {item.renderedImageUrl ? <img src={item.renderedImageUrl} alt="" /> : item.kind === "cover" && <img src="/editorial-lab.png" alt="" />}
                    <b>{item.order ?? index + 1}</b>
                  </span>
                  <span className="slide-copy"><small>{item.role}</small><strong>{item.note}</strong></span>
                  <MoreHorizontal size={15} />
                </button>
              ))}
            </div>
            <div className="squad-stack">
              <p>ORQUESTRAÇÃO</p>
              <span><b>BR</b> Brand Squad <Check size={13} /></span>
              <span><b>ST</b> Storytelling <Check size={13} /></span>
              <span><b>CP</b> Copy Squad <Check size={13} /></span>
            </div>
          </aside>

          <section className="canvas-stage" aria-label="Editor do carrossel">
            <div className="canvas-toolbar">
              <div>
                <button className="tool-button active"><ImageIcon size={15} /> Composição</button>
                <button className="tool-button"><FileText size={15} /> Copy</button>
                <button className="tool-button" onClick={() => { setSlideInstruction(""); setShowSlideEditor(true); }}><PencilLine size={15} /> Editar card</button>
              </div>
              <div>
                <button className="icon-button small" aria-label="Voltar" title="Voltar" onClick={() => setSelectedSlide((current) => Math.max(0, current - 1))} disabled={selectedSlide === 0}><ArrowLeft size={15} /></button>
                <span>{selectedSlide + 1} / {slideCount}</span>
                <button className="icon-button small" aria-label="Avançar" title="Avançar" onClick={() => setSelectedSlide((current) => Math.min(visibleSlides.length - 1, current + 1))} disabled={selectedSlide === visibleSlides.length - 1}><ArrowRight size={15} /></button>
                <button className="zoom-button">72% <ChevronDown size={13} /></button>
              </div>
            </div>

            <div className="canvas-wrap">
              {!slide ? (
                <div className="canvas-empty">
                  <Layers3 size={30} />
                  <strong>Nenhuma tela ainda</strong>
                  <span>{!runtimeStatus?.ai ? "Configure a FAL_KEY para os agentes gerarem o roteiro." : parsedSourceUrls().length >= 2 || runtimeStatus?.research ? "Tudo pronto: clique em Gerar carrossel." : "Cole os links das matérias no painel Fontes, à direita, e clique em Gerar carrossel."}</span>
                </div>
              ) : (
              <article className={`artboard ${slide.kind} ${slide.renderedImageUrl ? "rendered-artboard" : ""}`}>
                {slide.renderedImageUrl ? <img className="art-rendered" src={slide.renderedImageUrl} alt={`Slide ${selectedSlide + 1} do carrossel importado`} /> : <>
                  {(slide.imageUrl || slide.kind === "cover") && <img className="art-photo" src={slide.imageUrl || "/editorial-lab.png"} alt={slide.imageStrategy === "source" ? "Imagem editorial da fonte vinculada" : "Imagem editorial do carrossel"} />}
                  <div className="art-overlay" />
                  <header className="art-meta">
                    <span>{brandName || "HAGIOS"}</span>
                    <span>MOVIMENTO HÁGIOS</span>
                  </header>
                  <div className="art-content">
                    <p>{slide.role} / {String(slide.order ?? selectedSlide + 1).padStart(2, "0")}</p>
                    <h3>{renderHeadline(slide.title)}</h3>
                    {slide.body && <p className="art-body">{slide.body}</p>}
                    
                  </div>
                  <footer className="art-footer">
                    <span>{instagram || "@hagios.ai"}</span>
                    <span>DESLIZE <ArrowRight size={14} /></span>
                  </footer>
                </>}
              </article>
              )}
              {slide && (
              <div className="canvas-caption">
                <span><Sparkles size={14} /> {slide.renderedImageUrl ? "Arte final importada do projeto" : slide.imageStrategy === "source" ? "Imagem real da matéria · com atribuição" : "Imagem original gerada por GPT"}</span>
                <button><RefreshCw size={13} /> criar variação</button>
              </div>
              )}
            </div>
          </section>

          <aside className="inspector-panel">
            <div className="inspector-tabs">
              <button className={inspector === "fontes" ? "active" : ""} onClick={() => setInspector("fontes")}>Fontes</button>
              <button className={inspector === "marca" ? "active" : ""} onClick={() => setInspector("marca")}>Brand kit</button>
              <button className={inspector === "agentes" ? "active" : ""} onClick={() => setInspector("agentes")}>Agentes</button>
            </div>

            {inspector === "fontes" ? (
              <div className="inspector-content">
                <div className="inspector-heading">
                  <div><p>RADAR CULTURAL</p><h3>Provas usadas</h3></div>
                  <span className="source-count">{filteredSources.length}</span>
                </div>
                <div className="search-field"><Search size={15} /><input aria-label="Buscar fontes" placeholder="Buscar no dossiê" value={sourceQuery} onChange={(event) => setSourceQuery(event.target.value)} /></div>
                <div className="source-list">
                  {filteredSources.length === 0 && <p className="sources-empty">{sourceQuery ? `Nenhuma fonte para "${sourceQuery}".` : "Nenhuma fonte ainda — cole os links abaixo."}</p>}
                  {filteredSources.map((source) => (
                    <article className="source-item" key={source.title}>
                      {source.imageUrl && <img className="source-image" src={source.imageUrl} alt="" />}
                      <div className="source-top"><span style={{ background: source.color }}>{source.domain}</span><b>{source.score}</b></div>
                      <h4>{source.title}</h4>
                      <p>{source.detail}</p>
                      <div className="source-actions"><span><Check size={12} /> URL validada</span><a href={source.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${source.domain}`} title="Abrir matéria original"><ExternalLink size={13} /></a></div>
                    </article>
                  ))}
                </div>
                <div className="source-input-block">
                  <label><Link2 size={14} /> Matérias de referência</label>
                  <textarea value={sourceUrlsInput} onChange={(event) => setSourceUrlsInput(event.target.value)} rows={4} placeholder={"Cole um link por linha:\nhttps://exame.com/...\nhttps://newsroom.tiktok.com/..."} />
                  <span>{parsedSourceUrls().length >= 2
                    ? `${parsedSourceUrls().length} links prontos — clique em Gerar carrossel.`
                    : `Cole ao menos 2 links (${parsedSourceUrls().length}/2). O servidor baixa cada página e extrai título, publisher e imagem.`}</span>
                </div>
                <div className="thesis-box">
                  <p>TESE EDITORIAL</p>
                  <strong>{projectThesis || "Nenhuma tese definida ainda."}</strong>
                  <span>ABT · tensão cultural · nível de consciência: problema</span>
                </div>
              </div>
            ) : inspector === "marca" ? (
              <div className="inspector-content brand-form">
                <div className="inspector-heading"><div><p>IDENTIDADE</p><h3>DNA da marca</h3></div><Palette size={18} /></div>
                <p className="agent-explainer">{brandPersisted ? "Perfil salvo no PostgreSQL. Aplica-se a todo carrossel novo deste workspace." : "Ainda não salvo — os valores abaixo são o padrão do sistema."}</p>
                <label>Nome<input value={brandName} onChange={(event) => setBrandName(event.target.value)} placeholder="Nome da marca" /></label>
                <label>Instagram<input value={instagram} onChange={(event) => setInstagram(event.target.value)} placeholder="@perfil" /></label>
                <label>Público<input value={brandAudience} onChange={(event) => setBrandAudience(event.target.value)} placeholder="Ex.: empreendedores e times de marca" /></label>
                <label>Posicionamento<input value={brandPositioning} onChange={(event) => setBrandPositioning(event.target.value)} placeholder="O que a marca defende" /></label>
                <div className="upload-zone"><Upload size={18} /><strong>Logo e manual de marca</strong><span>PNG, SVG ou PDF</span><input type="file" aria-label="Enviar logo ou manual de marca" /></div>
                <div className="palette-row">{brandPalette.map((colour, index) => <span key={`${colour}-${index}`} style={{ background: colour }} title={colour} />)}<button aria-label="Adicionar cor" onClick={() => setBrandPalette((current) => [...current, "#CCCCCC"])}><Plus size={14} /></button></div>
                <label className="range-label"><span><b>Editorial</b><b>Promocional</b></span><input type="range" min="0" max="100" value={tone} onChange={(event) => setTone(Number(event.target.value))} /></label>
                <div className="voice-tags">{voiceTags.map((tag) => <span key={tag} onClick={() => setVoiceTags((current) => current.filter((item) => item !== tag))} title="Remover">{tag}</span>)}<button aria-label="Adicionar tom de voz" onClick={addVoiceTag}><Plus size={12} /></button></div>
                <label>Tom de voz<input value={voiceInput} onChange={(event) => setVoiceInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addVoiceTag(); } }} placeholder="incisiva, cultural, sem jargão..." /></label>
                <div className="inspector-heading"><div><p>CARD FINAL</p><h3>Chamada fixa</h3></div></div>
                <label>Palavra do comentário<input value={ctaKeyword} onChange={(event) => setCtaKeyword(event.target.value)} placeholder="Ex.: IA" /></label>
                <label>O que a pessoa recebe<input value={ctaDelivery} onChange={(event) => setCtaDelivery(event.target.value)} placeholder="e eu te mando..." /></label>
                <button className="save-brand" onClick={() => void saveBrandProfile()} disabled={isSavingBrand || !runtimeStatus?.database} title={!runtimeStatus?.database ? "Conecte DATABASE_URL para salvar" : "Salvar marca"}>
                  {isSavingBrand ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} {isSavingBrand ? "Salvando" : "Salvar marca"}
                </button>
              </div>
            ) : (
              <div className="inspector-content agent-panel">
                <div className="inspector-heading"><div><p>ORQUESTRAÇÃO</p><h3>Execuções reais</h3></div><span className="source-count">{agentRuns.length}</span></div>
                <p className="agent-explainer">Cada etapa registra modelo, estado e resultado no PostgreSQL. Falhas interrompem o fluxo; nada é preenchido com conteúdo fictício.</p>
                <div className="agent-run-list">
                  {agentRuns.length === 0 && <div className="agent-empty"><Radar size={18} /><strong>Nenhuma execução ainda</strong><span>Crie o projeto e clique em Gerar carrossel.</span></div>}
                  {agentRuns.map((run) => (
                    <article className="agent-run" key={run.id}>
                      <span className={`run-state ${run.status}`}>{run.status === "completed" ? <Check size={12} /> : run.status === "running" ? <LoaderCircle className="spin" size={12} /> : <X size={12} />}</span>
                      <div><strong>{run.agent}</strong><small>{run.model || "modelo não iniciado"}</small>{run.error && <em>{run.error}</em>}</div>
                    </article>
                  ))}
                </div>
                <div className="agent-order"><span>1 Research</span><span>2 Brand + Storytelling</span><span>3 Copy</span><span>4 Imagens</span></div>
              </div>
            )}
          </aside>
        </section>
        </>}

        {workspaceView === "home" && (
          <section className="workspace-home" aria-label="Início do estúdio">
            <div className="home-composer">
              <div className="home-kicker"><span>01</span><p>COMECE POR UMA PERGUNTA</p></div>
              <h2>Qual conversa sua marca precisa liderar agora?</h2>
              <p className="home-lead">Defina um território. O Hagios transforma isso em pesquisa, roteiro, fontes e direção de arte rastreáveis.</p>
              <div className="home-guide" aria-label="Fluxo de criação">
                {steps.map((item, index) => { const StepIcon = item.icon; return <div className={index === 0 ? "active" : ""} key={item.label}><span><StepIcon size={15} /></span><small>{String(index + 1).padStart(2, "0")}</small><b>{item.label}</b></div>; })}
              </div>
              <label className="home-field home-topic">Pergunta editorial<textarea value={topic} onChange={(event) => setTopic(event.target.value)} rows={3} placeholder="Ex.: O que muda quando a IA deixa de ser ferramenta e vira infraestrutura criativa?" /></label>
              <div className="home-form-grid">
                <label className="home-field">Para quem<input value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="Ex.: fundadores e times de marca" /></label>
                <fieldset className="home-slides"><legend>Telas</legend><div>{["5", "7", "8", "10"].map((count) => <button type="button" className={slideCount === count ? "active" : ""} key={count} onClick={() => changeSlideCount(count)}>{count}</button>)}</div></fieldset>
              </div>
              <div className="home-interests">
                <p>INTERESSES CONECTADOS</p>
                <div className="interest-tags">{interests.map((interest) => <button type="button" key={interest} onClick={() => setInterests((current) => current.filter((item) => item !== interest))}>{interest}<X size={12} /></button>)}</div>
                <div className="interest-entry"><input value={interestInput} onChange={(event) => setInterestInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addInterest(); } }} placeholder="Adicionar interesse: tecnologia, luxo, comportamento..." /><button type="button" onClick={() => addInterest()} aria-label="Adicionar interesse"><Plus size={16} /></button></div>
                <div className="suggested-interests"><span>Sugestões</span>{["Tecnologia", "Comportamento", "Design", "Cultura"].map((item) => <button type="button" key={item} onClick={() => addInterest(item)}>+ {item}</button>)}</div>
              </div>
              <div className="home-field home-sources">
                <p>MATÉRIAS DE REFERÊNCIA {!runtimeStatus?.research && <em>· obrigatório</em>}</p>
                <textarea value={sourceUrlsInput} onChange={(event) => setSourceUrlsInput(event.target.value)} rows={4} placeholder={"Cole os links das matérias, um por linha:\nhttps://exame.com/...\nhttps://newsroom.tiktok.com/..."} />
                <span className="brand-hint">{parsedSourceUrls().length > 0 ? `${parsedSourceUrls().length} link(s) — o servidor vai baixar cada página e extrair título, publisher e imagem.` : "O dossiê é montado a partir das páginas que você indicar — o servidor baixa cada uma. Nenhuma fonte é inventada."}</span>
              </div>
              <div className="home-field home-signature">
                <p>QUEM ASSINA</p>
                <div className="brief-brand-grid">
                  <label className="field-label">Marca<input value={brandName} onChange={(event) => setBrandName(event.target.value)} placeholder="Nome da marca" /></label>
                  <label className="field-label">Instagram<input value={instagram} onChange={(event) => setInstagram(event.target.value)} placeholder="@perfil" /></label>
                  <label className="field-label">Palavra do comentário<input value={ctaKeyword} onChange={(event) => setCtaKeyword(event.target.value)} placeholder="Ex.: IA" /></label>
                </div>
                <span className="brand-hint">{brandPersisted ? "Carregado do Brand kit deste workspace." : "Ainda não salvo — abra o Brand kit para gravar no banco."}</span>
              </div>
              {apiError && <div className="api-error home-error"><X size={15} /><span>{apiError}</span></div>}
              <button className="home-create" onClick={() => void startBrief()} disabled={!topic.trim() || !audience.trim() || !brandName.trim() || !runtimeStatus?.database}><WandSparkles size={17} /> Criar projeto e abrir roteiro <ArrowRight size={16} /></button>
              <div className="home-status"><span>{runtimeStatus?.database ? <Check size={13} /> : <X size={13} />} PostgreSQL {runtimeStatus?.database ? "conectado" : "pendente"}</span><span>{runtimeStatus?.ai ? <Check size={13} /> : <X size={13} />} IA {runtimeStatus?.ai ? `via ${runtimeStatus.provider}` : "não configurada"}</span><span>{parsedSourceUrls().length >= 2 ? <Check size={13} /> : <X size={13} />} Matérias {parsedSourceUrls().length}/2</span></div>
            </div>
            <aside className="home-library">
              <div className="home-library-header"><div><p>BIBLIOTECA</p><h3>Projetos recentes</h3></div><span>{savedProjects.length}</span></div>
              {savedProjects.length === 0 ? <div className="home-library-empty"><Database size={26} /><strong>Nenhum projeto salvo ainda.</strong><span>Seu primeiro briefing aparece aqui depois de ser criado.</span></div> : <div className="home-project-list">{savedProjects.map((project) => <button className="home-project" key={project.id} onClick={() => void openSavedProject(project)}><span className={project.status === "Pronto" ? "ready" : project.status === "Exemplo" ? "example" : project.status === "Importado" ? "imported" : "draft"}>{project.status}</span><strong>{project.title}</strong><small>{project.slideCount} telas · {project.updated}</small><ArrowRight size={16} /></button>)}</div>}
            </aside>
          </section>
        )}
      </section>

      {showBrief && (
        <div className="flow-overlay" role="dialog" aria-modal="true" aria-labelledby="brief-title">
          <section className="brief-dialog">
            <header className="brief-header">
              <div>
                <p>NOVO CARROSSEL</p>
                <h2 id="brief-title">Comece pelo território, não pelo template.</h2>
              </div>
              <button className="icon-button" aria-label="Fechar briefing" onClick={() => setShowBrief(false)}><X size={17} /></button>
            </header>

            <div className="brief-progress" aria-label={`Etapa ${briefStep} de 3`}>
              {["Interesses", "Direção", "Revisão"].map((label, index) => (
                <div className={briefStep >= index + 1 ? "active" : ""} key={label}>
                  <span>{briefStep > index + 1 ? <Check size={13} /> : index + 1}</span>
                  <b>{label}</b>
                </div>
              ))}
            </div>
            {apiError && <div className="api-error"><X size={15} /><span>{apiError}</span></div>}

            <div className="brief-body">
              {briefStep === 1 && (
                <div className="brief-step">
                  <div className="step-intro"><Compass size={21} /><div><p>PASSO 1</p><h3>O que vale investigar agora?</h3><span>Defina um assunto e conecte os interesses que o radar deve cruzar.</span></div></div>
                  <label className="field-label">Assunto ou pergunta editorial<textarea value={topic} onChange={(event) => setTopic(event.target.value)} rows={3} placeholder="Ex.: Por que restaurantes estão parecendo clubes?" /></label>
                  <div className="interest-section">
                    <p>INTERESSES CONECTADOS</p>
                    <div className="interest-tags">
                      {interests.map((interest) => <button key={interest} onClick={() => setInterests((current) => current.filter((item) => item !== interest))}>{interest}<X size={12} /></button>)}
                    </div>
                    <div className="interest-entry"><input value={interestInput} onChange={(event) => setInterestInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addInterest(); } }} placeholder="Adicionar: comportamento, luxo, IA..." /><button onClick={() => addInterest()} aria-label="Adicionar interesse"><Plus size={16} /></button></div>
                    <div className="suggested-interests"><span>Sugestões</span>{["Tecnologia", "Varejo", "Comportamento", "Design"].map((item) => <button key={item} onClick={() => addInterest(item)}>+ {item}</button>)}</div>
                  </div>
                </div>
              )}

              {briefStep === 2 && (
                <div className="brief-step">
                  <div className="step-intro"><Target size={21} /><div><p>PASSO 2</p><h3>Para quem e com qual profundidade?</h3><span>Isso calibra o nível de consciência, a linguagem e o número de argumentos.</span></div></div>
                  <label className="field-label">Público principal<input value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="Ex.: fundadores de marcas premium" /></label>
                  <fieldset className="choice-field"><legend>Quantidade de telas</legend><div>{["5", "7", "8", "10"].map((count) => <button className={slideCount === count ? "active" : ""} key={count} onClick={() => changeSlideCount(count)}>{count}</button>)}</div></fieldset>
                  <fieldset className="source-choice"><legend>Como o radar deve pesquisar?</legend><button className="active"><Radar size={17} /><span><b>Pesquisa aberta</b><small>Busca tendências, matérias e dados atuais</small></span><Check size={15} /></button><button><Link2 size={17} /><span><b>Partir das minhas fontes</b><small>Você adiciona URLs e referências depois</small></span></button></fieldset>
                </div>
              )}

              {briefStep === 3 && (
                <div className="brief-step review-step">
                  <div className="step-intro"><WandSparkles size={21} /><div><p>PASSO 3</p><h3>Quem assina esta publicação?</h3><span>A marca abaixo entra no cabeçalho, no rodapé e no card final de todas as telas.</span></div></div>
                  <div className="brief-brand-grid">
                    <label className="field-label">Marca<input value={brandName} onChange={(event) => setBrandName(event.target.value)} placeholder="Nome da marca" /></label>
                    <label className="field-label">Instagram<input value={instagram} onChange={(event) => setInstagram(event.target.value)} placeholder="@perfil" /></label>
                    <label className="field-label">Palavra do comentário<input value={ctaKeyword} onChange={(event) => setCtaKeyword(event.target.value)} placeholder="Ex.: IA" /></label>
                  </div>
                  <dl className="brief-summary">
                    <div><dt>Assunto</dt><dd>{topic || "Novo radar cultural"}</dd></div>
                    <div><dt>Interesses</dt><dd>{interests.join(" · ") || "Nenhum interesse conectado"}</dd></div>
                    <div><dt>Público</dt><dd>{audience}</dd></div>
                    <div><dt>Assina como</dt><dd>{brandName} · {instagram}</dd></div>
                    <div><dt>Entrega</dt><dd>{slideCount} telas + card final · 4:5 · fontes rastreáveis</dd></div>
                  </dl>
                  <div className="squad-route"><span><b>BR</b> posicionamento</span><ArrowRight size={14} /><span><b>ST</b> narrativa</span><ArrowRight size={14} /><span><b>CP</b> copy</span></div>
                  <div className="connection-checks">
                    <span className={runtimeStatus?.database ? "ready" : "missing"}>{runtimeStatus?.database ? <Check size={13} /> : <X size={13} />} PostgreSQL</span>
                    <span className={runtimeStatus?.ai ? "ready" : "missing"}>{runtimeStatus?.ai ? <Check size={13} /> : <X size={13} />} IA {runtimeStatus?.provider ?? ""}</span>
                    <span className={parsedSourceUrls().length >= 2 ? "ready" : "missing"}>{parsedSourceUrls().length >= 2 ? <Check size={13} /> : <X size={13} />} Matérias</span>
                    <span className={runtimeStatus?.session ? "ready" : "missing"}>{runtimeStatus?.session ? <Check size={13} /> : <X size={13} />} Sessão</span>
                    <span className={runtimeStatus?.storage ? "ready" : "missing"}>{runtimeStatus?.storage ? <Check size={13} /> : <X size={13} />} Storage</span>
                  </div>
                </div>
              )}
            </div>

            <footer className="brief-footer">
              <button className="text-button" onClick={() => briefStep === 1 ? setShowBrief(false) : setBriefStep((current) => current - 1)}>{briefStep === 1 ? "Explorar exemplo" : "Voltar"}</button>
              {briefStep < 3 ? <button className="primary-button" onClick={() => setBriefStep((current) => current + 1)}>Continuar <ArrowRight size={15} /></button> : <button className="primary-button" onClick={() => void startBrief()} disabled={!runtimeStatus?.database}><Save size={16} /> Criar projeto</button>}
            </footer>
          </section>
        </div>
      )}

      {showSlideEditor && slide && (
        <div className="flow-overlay" role="dialog" aria-modal="true" aria-labelledby="slide-editor-title">
          <section className="slide-editor-dialog">
            <header className="brief-header">
              <div><p>EDIÇÃO LOCAL</p><h2 id="slide-editor-title">Corrigir apenas a tela {selectedSlide + 1}</h2></div>
              <button className="icon-button" aria-label="Fechar edição" onClick={() => setShowSlideEditor(false)}><X size={17} /></button>
            </header>
            <div className="slide-editor-body">
              <div className="slide-editor-current"><span>{slide.role}</span><strong>{slide.title}</strong><small>{slide.body || slide.note}</small></div>
              <label className="field-label">O que o assistente deve corrigir?<textarea value={slideInstruction} onChange={(event) => setSlideInstruction(event.target.value)} rows={5} placeholder="Ex.: troque o título por uma frase mais incisiva, preserve o dado e não altere a imagem ou a fonte." /></label>
              {!currentCarouselId && <p className="editor-warning">Este projeto é uma referência visual. Salve um projeto gerado para aplicar a edição no PostgreSQL.</p>}
              {apiError && <div className="api-error"><X size={15} /><span>{apiError}</span></div>}
            </div>
            <footer className="brief-footer"><button className="text-button" onClick={() => setShowSlideEditor(false)}>Cancelar</button><button className="primary-button" onClick={() => void editSelectedSlide()} disabled={!slideInstruction.trim() || isEditingSlide || !currentCarouselId}>{isEditingSlide ? <LoaderCircle className="spin" size={16} /> : <PencilLine size={16} />} {isEditingSlide ? "Editando" : "Aplicar só nesta tela"}</button></footer>
          </section>
        </div>
      )}

      {showLibrary && (
        <div className="drawer-overlay" role="dialog" aria-modal="true" aria-labelledby="library-title">
          <aside className="library-drawer">
            <header><div><p>BIBLIOTECA</p><h2 id="library-title">Carrosséis salvos</h2></div><button className="icon-button" aria-label="Fechar biblioteca" onClick={() => setShowLibrary(false)}><X size={17} /></button></header>
            <button className="library-new" onClick={() => { setShowLibrary(false); openNewBrief(); }}><Plus size={16} /> Criar novo carrossel</button>
            <div className="library-list">
              {savedProjects.length === 0 && <div className="library-empty"><Database size={20} /><strong>Nenhum projeto persistido</strong><span>{runtimeStatus?.database ? "Crie seu primeiro briefing para começar." : "Conecte DATABASE_URL para ativar a biblioteca."}</span></div>}
              {savedProjects.map((project) => (
                <article className="library-item" key={project.id}>
                  <div className="library-item-top"><span className={project.status === "Pronto" ? "ready" : project.status === "Exemplo" ? "example" : project.status === "Importado" ? "imported" : "draft"}>{project.status}</span>{project.status !== "Exemplo" && project.status !== "Importado" && <button aria-label={`Remover ${project.title}`} onClick={() => void removeSavedProject(project.id)}><X size={14} /></button>}</div>
                  <h3>{project.title}</h3>
                  <div className="library-tags">{project.interests.slice(0, 3).map((item) => <span key={item}>{item}</span>)}</div>
                  <footer><span><Archive size={13} /> {project.slideCount} telas</span><span><Clock3 size={13} /> {project.updated}</span><button onClick={() => void openSavedProject(project)}>Abrir <ArrowRight size={13} /></button></footer>
                </article>
              ))}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
