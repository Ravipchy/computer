
with open(r'c:\Users\mohit\OneDrive\Desktop\computer\src\components\atc\StudentManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

open_braces = content.count('{')
close_braces = content.count('}')
open_divs = content.count('<div')
close_divs = content.count('</div')
open_parens = content.count('(')
close_parens = content.count(')')

print(f"Braces: {open_braces} / {close_braces}")
print(f"Divs: {open_divs} / {close_divs}")
print(f"Parens: {open_parens} / {close_parens}")
