import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const sourceRoots = ['src/app', 'src/components', 'src/lib'];
const codeExtensions = new Set(['.ts', '.tsx']);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'generated' || entry.name === '__snapshots__') continue;
    const pathname = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(pathname));
    else files.push(pathname);
  }
  return files;
}

function relativePath(pathname) {
  return relative(root, pathname).split(sep).join('/');
}

function routeFromPage(file) {
  const routePath = relative(root, file)
    .replace(/^src\/app/, '')
    .replace(/\/page\.tsx$/, '')
    .split('/')
    .filter((part) => part && !/^\(.+\)$/.test(part))
    .join('/');
  return routePath ? `/${routePath}` : '/';
}

function count(source, expression) {
  return [...source.matchAll(expression)].length;
}

function extractLabels(source, expression) {
  return [...source.matchAll(expression)]
    .map((match) => match[1]?.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 40);
}

const appFiles = await walk(join(root, 'src/app'));
const routes = [];
const apiRoutes = [];

for (const file of appFiles.filter((entry) => /\.(ts|tsx)$/.test(entry))) {
  const path = relativePath(file);
  if (path.endsWith('/page.tsx') || path === 'src/app/page.tsx') {
    routes.push({
      route: routeFromPage(file),
      file: path,
      dynamic: path.includes('['),
      hasLoadingState: appFiles.some((candidate) => candidate === join(file, '..', 'loading.tsx')),
      hasErrorState: appFiles.some((candidate) => candidate === join(file, '..', 'error.tsx')),
      verification: 'Automated route smoke required; manual role and populated-state verification required.',
    });
  }
  if (path.endsWith('/route.ts')) {
    const source = await readFile(file, 'utf8');
    apiRoutes.push({
      route: path.replace(/^src\/app/, '').replace(/\/route\.ts$/, '') || '/',
      file: path,
      methods: [...source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)/g)].map((match) => match[1]),
    });
  }
}

const interactions = [];
for (const sourceRoot of sourceRoots) {
  const files = await walk(join(root, sourceRoot));
  for (const file of files) {
    if (!codeExtensions.has(file.slice(file.lastIndexOf('.')))) continue;
    const source = await readFile(file, 'utf8');
    const metrics = {
      forms: count(source, /<form\b/g),
      buttons: count(source, /<button\b/g),
      links: count(source, /<Link\b|<a\b/g),
      selects: count(source, /<select\b/g),
      inputs: count(source, /<input\b/g),
      textareas: count(source, /<textarea\b/g),
      drawers: count(source, /<ActionDrawer\b/g),
      dialogs: count(source, /\b(Dialog|Popover|Tooltip)\b/g),
      tables: count(source, /<table\b|<DataTable\b/g),
      fileInputs: count(source, /type=["']file["']/g),
    };
    if (Object.values(metrics).some(Boolean)) {
      interactions.push({
        file: relativePath(file),
        ...metrics,
        visibleButtonLabels: extractLabels(source, /<button[^>]*>([^<{][\s\S]*?)<\/button>/g),
        testRequirement: 'Exercise valid, invalid, repeated, keyboard, loading, failure, and permission states where applicable.',
      });
    }
  }
}

const actionFiles = (await walk(join(root, 'src/app/actions'))).filter((file) => file.endsWith('.ts'));
const serverActions = [];
for (const file of actionFiles) {
  const source = await readFile(file, 'utf8');
  const exports = [...source.matchAll(/export async function ([A-Za-z0-9_]+)/g)].map((match) => match[1]);
  serverActions.push({ file: relativePath(file), exports });
}

const schema = await readFile(join(root, 'prisma/schema.prisma'), 'utf8');
const prismaModels = [...schema.matchAll(/^model\s+(\w+)\s+\{/gm)].map((match) => match[1]);
const prismaEnums = [...schema.matchAll(/^enum\s+(\w+)\s+\{/gm)].map((match) => match[1]);

routes.sort((a, b) => a.route.localeCompare(b.route));
apiRoutes.sort((a, b) => a.route.localeCompare(b.route));
interactions.sort((a, b) => a.file.localeCompare(b.file));

const inventory = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  coverageRule: 'Every listed route and interaction requires automated coverage or documented manual evidence before launch sign-off.',
  routes,
  apiRoutes,
  serverActions,
  prisma: { models: prismaModels, enums: prismaEnums },
  interactions,
  environmentVariableNames: [...(await readFile(join(root, '.env.example'), 'utf8').catch(() => ''))
    .matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map((match) => match[1]),
};

await mkdir(join(root, 'tests/release'), { recursive: true });
await mkdir(join(root, 'docs'), { recursive: true });
await writeFile(join(root, 'tests/release/application-inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);

const routeRows = routes.map((entry) => `| \`${entry.route}\` | \`${entry.file}\` | ${entry.dynamic ? 'Yes' : 'No'} | ${entry.hasLoadingState ? 'Yes' : 'No'} | ${entry.hasErrorState ? 'Yes' : 'No'} |`).join('\n');
const apiRows = apiRoutes.map((entry) => `| \`${entry.route}\` | ${entry.methods.join(', ') || 'None'} | \`${entry.file}\` |`).join('\n');
const actionRows = serverActions.map((entry) => `| \`${entry.file}\` | ${entry.exports.map((name) => `\`${name}\``).join(', ')} |`).join('\n');
const interactionRows = interactions.map((entry) => `| \`${entry.file}\` | ${entry.forms} | ${entry.buttons} | ${entry.links} | ${entry.selects} | ${entry.inputs} | ${entry.drawers} | ${entry.tables} |`).join('\n');

const report = `# Release Test Inventory\n\nGenerated by \`npm run audit:routes\` on ${inventory.generatedAt}. The machine-readable source of truth is [application-inventory.json](../tests/release/application-inventory.json).\n\n## Coverage Rule\n\nEvery route and interaction below must be covered by an automated test or documented manual evidence before launch sign-off. This inventory identifies the surface; it does not claim that the interaction has passed.\n\n## Application Routes\n\n| Route | Source | Dynamic | Loading state | Error state |\n| --- | --- | --- | --- | --- |\n${routeRows}\n\n## API Routes\n\n| Route | Methods | Source |\n| --- | --- | --- |\n${apiRows}\n\n## Server Actions\n\n| Source | Exported actions |\n| --- | --- |\n${actionRows}\n\n## Database Surface\n\nPrisma models (${prismaModels.length}): ${prismaModels.map((name) => `\`${name}\``).join(', ')}.\n\nPrisma enums (${prismaEnums.length}): ${prismaEnums.map((name) => `\`${name}\``).join(', ')}.\n\n## Interaction Inventory\n\nCounts are static discovery aids. Forms, buttons, drawers, and tables require behavior-focused tests rather than mere count assertions.\n\n| Source | Forms | Buttons | Links | Selects | Inputs | Drawers | Tables |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${interactionRows}\n\n## Environment Inputs\n\n${inventory.environmentVariableNames.map((name) => `- \`${name}\``).join('\n') || '- No .env.example file found.'}\n`;

await writeFile(join(root, 'docs/RELEASE_TEST_INVENTORY.md'), report);
console.log(`Generated inventory: ${routes.length} pages, ${apiRoutes.length} API routes, ${serverActions.length} action modules, ${interactions.length} interactive source files.`);
