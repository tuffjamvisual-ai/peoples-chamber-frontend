'use client';
// Sorting for /councils/hmos (ENTRY 362): each table's column headings become buttons; a press sorts that table's rows by
// the column (largest first, then smallest first), using each cell's data-v. Without JavaScript the tables stay in name
// order, as the server wrote them; nothing else changes. aria-sort says which column a table is sorted by.
import { useEffect } from 'react';

export default function SortTables({ selector }: { selector: string }) {
  useEffect(() => {
    const tables = [...document.querySelectorAll<HTMLTableElement>(selector)];
    const off: (() => void)[] = [];
    for (const table of tables) {
      const heads = [...table.querySelectorAll<HTMLTableCellElement>('thead th[data-sort]')];
      heads.forEach((th, col) => {
        const label = th.textContent ?? '';
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.className = 'hmo-sort';
        th.textContent = '';
        th.appendChild(button);
        const press = () => {
          const down = th.getAttribute('aria-sort') !== 'descending';
          heads.forEach((h) => h.removeAttribute('aria-sort'));
          th.setAttribute('aria-sort', down ? 'descending' : 'ascending');
          const body = table.tBodies[0];
          const rows = [...body.rows];
          const key = (r: HTMLTableRowElement) => r.cells[Number(th.dataset.sort)]?.dataset.v ?? '';
          rows.sort((a, b) => {
            const x = key(a), y = key(b);
            if (col === 0) return down ? y.localeCompare(x) : x.localeCompare(y);
            // Rows with no figure go last either way.
            if (x === '' || y === '') return x === y ? 0 : x === '' ? 1 : -1;
            return down ? Number(y) - Number(x) : Number(x) - Number(y);
          });
          for (const r of rows) body.appendChild(r);
        };
        button.addEventListener('click', press);
        off.push(() => button.removeEventListener('click', press));
      });
    }
    return () => off.forEach((f) => f());
  }, [selector]);
  return null;
}
