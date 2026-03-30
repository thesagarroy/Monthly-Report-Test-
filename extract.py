import re
import json

html = open(r'c:\Users\ARSR\Downloads\Expance Report 2026\March.html', 'r', encoding='utf-8').read()
rows = re.findall(r'<tr.*?>(.*?)</tr>', html)
data = []
for row in rows:
    cells = re.findall(r'<td.*?>(.*?)</td>', row)
    if len(cells) == 4:
        date = re.sub(r'<.*?>', '', cells[0]).strip()
        category = re.sub(r'<.*?>', '', cells[1]).strip()
        name = re.sub(r'<.*?>', '', cells[2]).strip()
        amount = re.sub(r'<.*?>', '', cells[3]).strip()
        if date and date != 'Date':
            try:
                # clean amount if any commas
                amount_val = float(amount.replace(',', ''))
                data.append({"date": date, "category": category, "name": name, "amount": amount_val})
            except:
                pass

with open(r'c:\Users\ARSR\Downloads\Expance Report 2026\data.json', 'w') as f:
    json.dump(data, f, indent=2)
print(f"Extracted {len(data)} records")
