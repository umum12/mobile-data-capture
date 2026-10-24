import re,json,sys
# Ubah semua ikon SVG (class mi) menjadi pembungkus: SVG cadangan + Material Symbols.
sh=open('Shared.html').read()
P=json.loads(re.search(r'const P = (\{.*?\});',sh,re.S).group(1))
MS={'refresh':'refresh','logout':'logout','description':'description','history':'history','expand':'expand_more','reset':'restart_alt','close':'close','info':'info','search':'search','edit':'edit','camera':'photo_camera','delete':'delete','check':'check','check_circle':'check_circle','warning':'warning','save':'save','volume_up':'volume_up','volume_off':'volume_off','qr':'qr_code_scanner','checklist':'checklist','edit_note':'edit_note','flash':'bolt','undo':'undo','check_outline':'check_circle','error':'error','add':'add'}
byPath={v:MS[k] for k,v in P.items()}
extra={'M12.3 3a9 9 0 1 0 8.7 11.4':'dark_mode','M12 7a5 5 0 1 0 0 10':'light_mode','M3 13h8V3H3v10z':'dashboard','M10 18h4v-2h-4v2z':'filter_list','M10 20v-6h4v6h5':'home','M3 18h18v-2H3v2zm0-5h18':'menu'}
pat=re.compile(r'<svg class="mi([^"]*)"([^>]*)>(<path[^>]*? d="([^"]+)"[^>]*/>)</svg>')
used=set()
def sub(m):
    d=m.group(4); n=byPath.get(d)
    if not n:
        for k,v in extra.items():
            if d.startswith(k): n=v
    if not n: print('UNKNOWN',d[:50],file=sys.stderr); return m.group(0)
    used.add(n)
    return '<span class="mi-w%s">%s<span class="ms" aria-hidden="true">%s</span></span>'%(m.group(1),m.group(0),n)
for f in ['index.html','History.html']:
    s=open(f).read()
    if 'class="mi-w' in s: print('skip',f); continue
    s2=pat.sub(sub,s); open(f,'w').write(s2); print(f,s.count('<svg class="mi'),'->',s2.count('mi-w'))
s=open('Shared.html').read()
if 'mi-w' not in s:
    old="""return { svg: function (n, cls) { return '<svg class="mi' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + (P[n] || '') + '"/></svg>'; } };"""
    new="""const MS = %s;
  return { svg: function (n, cls) { return '<span class="mi-w' + (cls ? ' ' + cls : '') + '"><svg class="mi' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + (P[n] || '') + '"/></svg><span class="ms" aria-hidden="true">' + (MS[n] || n) + '</span></span>'; } };"""%json.dumps(MS)
    assert old in s; open('Shared.html','w').write(s.replace(old,new)); print('shared ok')
used|=set(MS.values())|{'dark_mode','light_mode','dashboard','filter_list','home','menu','expand_more'}
open('ui/icon_names.txt','w').write(','.join(sorted(used)))
print(sorted(used))
