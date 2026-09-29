const command = process.argv[2] ?? 'validate';
const modules = {
  generate: './generate-placeholders.mjs',
  validate: './validate.mjs',
  pack: './pack.mjs',
  preview: './preview.mjs',
};
if (!modules[command]) {
  console.error(`Lệnh không hợp lệ: ${command}. Dùng generate, validate, pack hoặc preview.`);
  process.exit(2);
}
await import(modules[command]);
