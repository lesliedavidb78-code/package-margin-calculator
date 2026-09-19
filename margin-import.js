/* 多页毛利表导入器：扫描所有工作表，优先识别可直接用于套餐核算的菜品、售价、总成本。 */
(() => {
  const clean = value => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
  const header = value => clean(value).replace(/\s+/g, '').replace(/[　_－—\-/\\()（）【】〔〕：:·,.，。]/g, '').toLowerCase();
  const isName = value => /(品名|菜品|菜名|产品|商品|名称|项目)/.test(value);
  const isPrice = value => /(门市价|售价|销售价|零售价|建议售价|价格|单价)/.test(value) && !/(成本|进价|净料)/.test(value);
  const costRank = value => {
    if (/(总成本|菜品成本|出品成本|每份成本|单份成本|成本价|标准成本)/.test(value)) return 3;
    if (/成本/.test(value) && !/(单品成本|原材料成本)/.test(value)) return 2;
    if (/(单品成本|原材料成本)/.test(value)) return 1;
    return 0;
  };
  const asNumber = value => {
    const result = Number(String(value ?? '').replace(/[￥¥,\s]/g, ''));
    return Number.isFinite(result) ? result : NaN;
  };
  const address = (row, column) => XLSX.utils.encode_cell({ r: row, c: column });

  // Excel 文件通常带有公式缓存值；若没有，覆盖成本卡中最常见的四则运算、引用及 SUM。
  function numberAt(workbook, sheetName, row, column, seen = new Set()) {
    const sheet = workbook.Sheets[sheetName];
    const cellAddress = address(row, column);
    const key = `${sheetName}!${cellAddress}`;
    if (!sheet || seen.has(key)) return NaN;
    seen.add(key);
    const cell = sheet[cellAddress];
    const direct = asNumber(cell?.v ?? cell?.w);
    if (Number.isFinite(direct)) return direct;
    let formula = String(cell?.f || '').replace(/^=/, '').trim();
    if (!formula) return NaN;
    const rangeValue = (targetSheet, start, end) => {
      const target = workbook.Sheets[targetSheet || sheetName];
      if (!target) return NaN;
      const startCell = XLSX.utils.decode_cell(start);
      const endCell = XLSX.utils.decode_cell(end || start);
      let sum = 0;
      for (let r = startCell.r; r <= endCell.r; r++) for (let c = startCell.c; c <= endCell.c; c++) {
        const n = numberAt(workbook, targetSheet || sheetName, r, c, new Set(seen));
        if (!Number.isFinite(n)) return NaN;
        sum += n;
      }
      return sum;
    };
    formula = formula.replace(/SUM\(\s*(?:'([^']+)'|([^!()]+))?!?\s*([A-Z]+\d+)(?::([A-Z]+\d+))?\s*\)/gi, (_, quoted, plain, start, end) => String(rangeValue(quoted || (plain ? plain.trim() : ''), start, end)));
    formula = formula.replace(/(?:'([^']+)'|([\u4e00-\u9fa5A-Za-z0-9_ ]+))!\$?([A-Z]+)\$?(\d+)/g, (_, quoted, plain, col, line) => String(numberAt(workbook, quoted || plain.trim(), Number(line) - 1, XLSX.utils.decode_col(col), new Set(seen))));
    formula = formula.replace(/\$?([A-Z]+)\$?(\d+)/g, (_, col, line) => String(numberAt(workbook, sheetName, Number(line) - 1, XLSX.utils.decode_col(col), new Set(seen))));
    if (!/^[\d+\-*/().\s]+$/.test(formula)) return NaN;
    try {
      const value = Function(`"use strict"; return (${formula})`)();
      return Number.isFinite(value) ? value : NaN;
    } catch (_) { return NaN; }
  }

  function detectTables(workbook, sheetName) {
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const maxRows = Math.min(range.e.r, 3000);
    const results = [];
    for (let row = range.s.r; row <= maxRows; row++) {
      const labels = [];
      for (let col = range.s.c; col <= range.e.c; col++) labels.push(header(sheet[address(row, col)]?.v));
      const nameColumn = labels.findIndex(isName);
      const priceColumn = labels.findIndex(isPrice);
      let costColumn = -1, rank = 0;
      labels.forEach((label, index) => { const candidate = costRank(label); if (candidate > rank) { rank = candidate; costColumn = index; } });
      if (nameColumn < 0 || priceColumn < 0 || costColumn < 0) continue;
      const rows = [];
      for (let dataRow = row + 1; dataRow <= maxRows; dataRow++) {
        const name = clean(sheet[address(dataRow, range.s.c + nameColumn)]?.v);
        const price = numberAt(workbook, sheetName, dataRow, range.s.c + priceColumn);
        const cost = numberAt(workbook, sheetName, dataRow, range.s.c + costColumn);
        if (name && Number.isFinite(price) && price > 0 && Number.isFinite(cost) && cost >= 0 && !/(合计|总计|毛利分析表|品名|菜品|名称)/.test(name)) rows.push({ name, price, cost });
      }
      if (rows.length) results.push({ sheetName, headerRow: row + 1, costRank: rank, rows });
    }
    return results;
  }

  function preferredTables(tables) {
    // 同一张表反复出现表头时会产生重叠结果；保留同页中成本语义最明确的一组。
    const bySheet = new Map();
    for (const table of tables) {
      const prior = bySheet.get(table.sheetName);
      if (!prior || table.costRank > prior.costRank || (table.costRank === prior.costRank && table.rows.length > prior.rows.length)) bySheet.set(table.sheetName, table);
    }
    return [...bySheet.values()];
  }

  // 甜品等成本卡常为“一品一小块”：品名在块首，成本和建议售价在块尾，并非标准三列表头。
  function detectCostCards(workbook, sheetName) {
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const maxRows = Math.min(range.e.r, 3000);
    const cards = [];
    for (let row = range.s.r; row <= maxRows; row++) for (let column = range.s.c; column < range.e.c; column++) {
      if (!/(建议售价|售价)/.test(header(sheet[address(row, column)]?.v))) continue;
      const price = numberAt(workbook, sheetName, row, column + 1);
      if (!Number.isFinite(price) || price <= 0) continue;
      let name = '';
      for (let scan = row; scan >= Math.max(range.s.r, row - 35); scan--) {
        const candidate = clean(sheet[address(scan, range.s.c)]?.v);
        if (candidate && !/(名称|品名|成本分析表|来货登记单)/.test(candidate)) { name = candidate; break; }
      }
      let cost = NaN;
      for (let scan = row - 1; scan >= Math.max(range.s.r, row - 8); scan--) for (let costColumn = range.s.c; costColumn < range.e.c; costColumn++) {
        if (/^成本$/.test(header(sheet[address(scan, costColumn)]?.v))) {
          const candidate = numberAt(workbook, sheetName, scan, costColumn + 1);
          if (Number.isFinite(candidate) && candidate >= 0) cost = candidate;
        }
      }
      if (name && Number.isFinite(cost)) cards.push({ name, price, cost });
    }
    return cards;
  }

  function collectMarginRows(workbook) {
    const tables = preferredTables(workbook.SheetNames.flatMap(sheetName => detectTables(workbook, sheetName)));
    const unique = new Map();
    for (const table of tables) for (const row of table.rows) {
      const key = productKey(row.name);
      if (!unique.has(key)) unique.set(key, row);
    }
    const cards = workbook.SheetNames.flatMap(sheetName => detectCostCards(workbook, sheetName));
    for (const row of cards) {
      const key = productKey(row.name);
      if (!unique.has(key)) unique.set(key, row);
    }
    return { rows: [...unique.values()], tables, cards };
  }

  window.importMarginFile = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      $('importStatus').textContent = `正在扫描 ${file.name} 的全部工作表…`;
      if (/\.csv$/i.test(file.name)) {
        const rows = (await file.text()).split(/\r?\n/).map(line => line.split(','));
        applyMarginRows(mapMarginRows(rows));
        return;
      }
      await loadXlsx();
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellFormula: true, cellNF: true, cellText: true });
      const result = collectMarginRows(workbook);
      if (!result.rows.length) throw new Error('没有找到可同时对应“品名、售价、成本”的数据页。请确认工作簿中保存了公式计算结果。');
      applyMarginRows(result.rows);
      const sources = result.tables.map(table => `${table.sheetName}（第 ${table.headerRow} 行表头，${table.rows.length} 条）`).join('、');
      const cardNote = result.cards.length ? `；另识别 ${result.cards.length} 个分段成本卡` : '';
      $('importStatus').innerHTML = `<b style="color:#047857">已扫描 ${workbook.SheetNames.length} 个工作表并合并导入 ${result.rows.length} 条菜品数据。</b><br><span style="color:#475569">来源：${sources || '分段成本卡'}${cardNote}。同名菜品按首次出现保留，锅底数据不会覆盖。</span>`;
    } catch (error) {
      $('importStatus').innerHTML = `<b style="color:#c91632">导入失败：</b>${String(error.message || error).replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]))}`;
    }
  };
})();
