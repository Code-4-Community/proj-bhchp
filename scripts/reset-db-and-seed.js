const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const dataSourcePath = path.join(
  repoRoot,
  'apps',
  'backend',
  'src',
  'data-source.ts',
);

function enforceMigrationLines() {
  const jsLine = "migrations: ['apps/backend/src/migrations/*.js'],";
  const tsLine = "migrations: ['apps/backend/src/migrations/*.ts'],";

  const original = fs.readFileSync(dataSourcePath, 'utf8');

  const withJsCommented = original.replace(
    /^\s*\/\/\s*migrations:\s*\['apps\/backend\/src\/migrations\/\*\.js'\],.*$/m,
    `  // ${jsLine} // use this line before pushing to github so that it works on the deployment server`,
  ).replace(
    /^\s*migrations:\s*\['apps\/backend\/src\/migrations\/\*\.js'\],.*$/m,
    `  // ${jsLine} // use this line before pushing to github so that it works on the deployment server`,
  );

  const withTsUncommented = withJsCommented.replace(
    /^\s*\/\/\s*migrations:\s*\['apps\/backend\/src\/migrations\/\*\.ts'\],.*$/m,
    `  ${tsLine} // use this line when running migrations locally`,
  );

  if (!withTsUncommented.includes(tsLine)) {
    throw new Error(
      'Could not enforce TypeScript migration line in apps/backend/src/data-source.ts',
    );
  }

  fs.writeFileSync(dataSourcePath, withTsUncommented, 'utf8');
  console.log('Updated data-source migration lines for local migration runs.');
}

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
}

function main() {
  enforceMigrationLines();

  run('yarn typeorm schema:drop -d apps/backend/src/data-source.ts');
  run('yarn migration:run');
  run('yarn seed');

  console.log('\nDatabase reset, migrations, and seed completed.');
}

main();
