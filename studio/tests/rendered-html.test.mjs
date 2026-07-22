import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("uses PostgreSQL persistence instead of browser-only storage", async () => {
  const [schema, studio] = await Promise.all([
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("components/studio-client.tsx", root), "utf8"),
  ]);
  assert.match(schema, /pgTable\("carousels"/);
  assert.match(schema, /pgTable\("slides"/);
  assert.match(schema, /pgTable\("sources"/);
  assert.match(schema, /pgTable\("agent_runs"/);
  assert.doesNotMatch(studio, /localStorage/);
  assert.match(studio, /\/api\/carousels/);
  assert.match(studio, /demoProject/);
  assert.match(studio, /hagios-ia-2026-v3/);
  assert.match(studio, /Fluxo de criação/);
});

test("runs the traceable editorial pipeline", async () => {
  const [pipeline, generator] = await Promise.all([
    readFile(new URL("lib/agents/pipeline.ts", root), "utf8"),
    readFile(new URL("app/api/carousels/[id]/generate/route.ts", root), "utf8"),
  ]);
  assert.match(pipeline, /type: "web_search"/);
  assert.match(pipeline, /runBrandAgent/);
  assert.match(pipeline, /runStoryAgent/);
  assert.match(pipeline, /runCopyAgent/);
  assert.match(pipeline, /gpt-image-2/);
  assert.match(pipeline, /readSourceMetadata/);
  assert.match(pipeline, /runSlideEditor/);
  assert.match(generator, /Promise\.all\(\[/);
  assert.match(generator, /storageProvider: "external"/);
});

test("exposes Clerk authentication and real source links", async () => {
  const [proxy, layout, currentUser, controls, signIn, signUp, studio, slideEditor] = await Promise.all([
    readFile(new URL("proxy.ts", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("lib/current-user.ts", root), "utf8"),
    readFile(new URL("components/clerk-controls.tsx", root), "utf8"),
    readFile(new URL("app/sign-in/[[...sign-in]]/page.tsx", root), "utf8"),
    readFile(new URL("app/sign-up/[[...sign-up]]/page.tsx", root), "utf8"),
    readFile(new URL("components/studio-client.tsx", root), "utf8"),
    readFile(new URL("app/api/carousels/[id]/slides/[slideId]/route.ts", root), "utf8"),
  ]);
  assert.match(proxy, /clerkMiddleware/);
  assert.match(proxy, /\/__clerk\/:path\*/);
  assert.match(layout, /ClerkProvider/);
  assert.match(currentUser, /currentUser/);
  assert.match(controls, /SignInButton/);
  assert.match(controls, /SignUpButton/);
  assert.match(controls, /UserButton/);
  assert.match(signIn, /<SignIn/);
  assert.match(signUp, /<SignUp/);
  assert.match(studio, /target="_blank"/);
  assert.match(studio, /Imagem real da matéria/);
  assert.match(studio, /Editar card/);
  assert.match(studio, /Aplicar só nesta tela/);
  assert.match(slideEditor, /runSlideEditor/);
});
