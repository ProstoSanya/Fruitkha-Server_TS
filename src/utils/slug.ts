const ruUaMap: Record<string, string> = {
  а:'a', б:'b', в:'v', г:'g', ґ:'g', д:'d', е:'e', ё:'e', є:'ie', ж:'zh',
  з:'z', и:'i', і:'i', ї:'i', й:'i', к:'k', л:'l', м:'m', н:'n', о:'o',
  п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'h', ц:'ts', ч:'ch',
  ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya',
  А:'a', Б:'b', В:'v', Г:'g', Ґ:'g', Д:'d', Е:'e', Ё:'e', Є:'ie', Ж:'zh',
  З:'z', И:'i', І:'i', Ї:'i', Й:'i', К:'k', Л:'l', М:'m', Н:'n', О:'o',
  П:'p', Р:'r', С:'s', Т:'t', У:'u', Ф:'f', Х:'h', Ц:'ts', Ч:'ch',
  Ш:'sh', Щ:'sch', Ъ:'', Ы:'y', Ь:'', Э:'e', Ю:'yu', Я:'ya'
};

const toSlug = (input: string, maxLen = 120): string => {
  const translit = input.split('').map((ch) => ruUaMap[ch] ?? ch).join('');
  const normalized = translit
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const slug = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  const trimmed = slug.slice(0, maxLen);
  return trimmed || 'item';
};

export {toSlug};