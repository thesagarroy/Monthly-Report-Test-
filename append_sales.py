import json
import re

html_file = '29-03-2026 to 31-03-2026 Sales.html'
json_file = 'sales_data.json'

print(f"Reading {html_file}...")
with open(html_file, 'r', encoding='utf-8') as f:
    html_content = f.read()

# Find all table rows
rows = re.findall(r'<tr.*?>(.*?)</tr>', html_content, re.IGNORECASE | re.DOTALL)

with open(json_file, 'r', encoding='utf-8') as f:
    sales_data = json.load(f)

initial_count = len(sales_data)

# Regex to extract text from td or th
td_re = re.compile(r'<t[dh].*?>(.*?)</t[dh]>', re.IGNORECASE | re.DOTALL)
tag_re = re.compile(r'<[^>]+>')

def clean_text(text):
    return tag_re.sub('', text).strip()

new_records = 0
for row in rows:
    tds = td_re.findall(row)
    if len(tds) < 13:
        continue
    
    date_str = clean_text(tds[1]) if len(tds) > 1 else ""
    
    if re.match(r'\d{2}-\d{2}-\d{4}', date_str):
        try:
            customer = clean_text(tds[3])
            category = clean_text(tds[4])
            qty_str = clean_text(tds[6]).replace(',', '')
            
            amount_str = clean_text(tds[12]).replace(',', '').replace('₹', '').replace('Rs.', '').strip()
            
            if qty_str.replace('.', '', 1).isdigit():
                qty = float(qty_str)
            else:
                qty = 0
                
            if amount_str.replace('.', '', 1).isdigit():
                amount = float(amount_str)
            else:
                amount = 0.0

            if amount > 0 or qty > 0:
                sales_data.append({
                    "date": date_str,
                    "customer": customer,
                    "product": category,
                    "quantity": qty,
                    "amount": round(amount, 2)
                })
                new_records += 1
        except Exception as e:
            print("Error parsing row:", e)
            continue

print(f"Extracted {new_records} NEW sales records.")

# Give unique IDs to all items just in case
for idx, s in enumerate(sales_data):
    if "id" not in s:
        s["id"] = f"idx_sales_{idx}_auto"

with open(json_file, 'w', encoding='utf-8') as f:
    json.dump(sales_data, f, indent=4)
print(f"Saved {len(sales_data)} total records to {json_file} successfully.")
