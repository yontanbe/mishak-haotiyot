// מצב בדיקה אוטומטית (?qa=1): השמע מהיר פי 12 והתשובות הנכונות מסומנות ב-data-ok לבוט הבדיקה.
export const QA = typeof location !== 'undefined' && new URLSearchParams(location.search).has('qa');
export const ok = (cond) => (QA && cond ? ' data-ok="1"' : '');
