import json
import re

html_file = 'March Sales.html'
json_file = 'sales_data.json'

print(f"Reading {html_file}...")
with open(html_file, 'r', encoding='utf-8') as f:
    html_content = f.read()

# Find all table rows
rows = re.findall(r'<tr.*?>(.*?)</tr>', html_content, re.IGNORECASE | re.DOTALL)

sales_data = []

# Regex to extract text from td or th
td_re = re.compile(r'<t[dh].*?>(.*?)</t[dh]>', re.IGNORECASE | re.DOTALL)
# Regex to strip tags
tag_re = re.compile(r'<[^>]+>')

for row in rows:
    tds = td_re.findall(row)
    if len(tds) < 14:
        continue
    
    # helper to clean text
    def clean_text(text):
        return tag_re.sub('', text).strip()

    date_str = clean_text(tds[2]) if len(tds) > 2 else ""
    
    if re.match(r'\d{2}-\d{2}-\d{4}', date_str):
        try:
            customer = clean_text(tds[4])
            category = clean_text(tds[5])
            qty_str = clean_text(tds[7]).replace(',', '')
            
            # The structure is:
            # 11: TOTAL AMOUNT WITHOUT GST
            # 12: ₹ (currency symbol)
            # 13: TOTAL AMOUNT
            
            amount_str = clean_text(tds[13]).replace(',', '').replace('₹', '').replace('Rs.', '').strip()
            
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
        except Exception as e:
            print("Error parsing row:", e)
            continue

print(f"Extracted {len(sales_data)} sales records.")

with open(json_file, 'w', encoding='utf-8') as f:
    json.dump(sales_data, f, indent=4)
print(f"Saved to {json_file} successfully.")
