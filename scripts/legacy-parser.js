const fs = require('node:fs');
const sql = fs.readFileSync(require('node:path').join(__dirname, '..', 'Lampiran', 'mahr5644_mahabbah.sql'), 'utf8');
function rows(table) {
  const result = [];
  const pattern = new RegExp('INSERT INTO `' + table + '` \\(([^)]+)\\) VALUES\\s*', 'g');
  for (const match of sql.matchAll(pattern)) {
    const columns = [...match[1].matchAll(/`([^`]+)`/g)].map(m => m[1]);
    let i = match.index + match[0].length;
    while (sql[i] !== ';' && i < sql.length) {
      if (sql[i] !== '(') { i++; continue; }
      i++; const values = [];
      while (i < sql.length) {
        while (/\s/.test(sql[i])) i++;
        let value = '';
        if (sql[i] === "'") {
          i++;
          while (i < sql.length) {
            if (sql[i] === '\\') { i++; const c = sql[i++]; value += ({ n: '\n', r: '\r', t: '\t', '0': '' })[c] ?? c; }
            else if (sql[i] === "'") { i++; if (sql[i] === "'") { value += "'"; i++; } else break; }
            else value += sql[i++];
          }
        } else { while (i < sql.length && ![',', ')'].includes(sql[i])) value += sql[i++]; value = value.trim() === 'NULL' ? '' : value.trim(); }
        values.push(value);
        while (/\s/.test(sql[i])) i++;
        if (sql[i++] === ')') break;
      }
      result.push(Object.fromEntries(columns.map((key, n) => [key, values[n]])));
    }
  }
  return result;
}
module.exports = { rows: table => {
  if (!['packages', 'teams', 'testimonials', 'posts'].includes(table)) throw new Error('Only public content tables are allowed.');
  return rows(table);
} };
